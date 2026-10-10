<?php
/**
 * Nómina — Liquidar nómina de periodo
 * GET  ?empleado=N              → precalcula propuesta de liquidación (lee saldos y propone descuentos)
 * GET  ?listar=1&desde=&hasta=  → lista liquidaciones del periodo
 * GET  ?id=N                    → detalle completo de una liquidación (para desprendible)
 * POST { action: 'liquidar', empleado_id, periodo_inicio, periodo_fin, tipo_periodo,
 *        salario_base, horas_extras, bonificaciones, otros_ingresos,
 *        deducciones: [{tipo, id_mov_origen, concepto, valor}, ...],
 *        origen_pago, id_banco, observacion, usuario_id }
 * POST { action: 'anular', id_nomina, usuario_id }
 */
require_once '../config/database.php';
$database = new Database();
$db = $database->getConnection();

function registrarMovKardex($db, $empleadoId, $tipo, $valor, $opts = []) {
    $stmtS = $db->prepare("SELECT COALESCE(Saldo_Acum, 0) FROM tbl_mov_empleado
                           WHERE Id_Empleado = ? AND Estado = 'activo'
                           ORDER BY Id_Mov DESC LIMIT 1");
    $stmtS->execute([$empleadoId]);
    $saldoPrev = floatval($stmtS->fetchColumn());
    $saldoNuevo = $saldoPrev + $valor;
    $stmt = $db->prepare("
        INSERT INTO tbl_mov_empleado
            (Id_Empleado, Fecha, Tipo, Valor, Saldo_Acum, Observacion,
             Vinculado_Tipo, Vinculado_Id, Id_Nomina, Id_Mov_Origen, Id_Usuario, Estado)
        VALUES (?, NOW(), ?, ?, ?, ?, 'nomina', ?, ?, ?, ?, 'activo')
    ");
    $stmt->execute([
        $empleadoId, $tipo, $valor, $saldoNuevo,
        $opts['observacion'] ?? null,
        $opts['id_nomina'] ?? null,
        $opts['id_nomina'] ?? null,
        $opts['id_mov_origen'] ?? null,
        $opts['usuario_id'] ?? null,
    ]);
    return $db->lastInsertId();
}

try {
    if ($_SERVER['REQUEST_METHOD'] === 'GET') {
        if (!empty($_GET['listar'])) {
            $desde = $_GET['desde'] ?? date('Y-m-01');
            $hasta = $_GET['hasta'] ?? date('Y-m-d');
            $stmt = $db->prepare("
                SELECT n.*, e.Nombre AS NombreEmpleado, e.Identificacion
                FROM tbl_nomina n
                LEFT JOIN tbl_empleados e ON e.Id_Empleado = n.Id_Empleado
                WHERE DATE(n.Fecha_Pago) BETWEEN ? AND ?
                ORDER BY n.Fecha_Pago DESC
            ");
            $stmt->execute([$desde, $hasta]);
            echo json_encode(['success' => true, 'nominas' => $stmt->fetchAll()]);
            exit;
        }

        if (isset($_GET['id'])) {
            $id = intval($_GET['id']);
            $stmt = $db->prepare("
                SELECT n.*, e.Nombre AS NombreEmpleado, e.Identificacion, e.Cargo
                FROM tbl_nomina n
                LEFT JOIN tbl_empleados e ON e.Id_Empleado = n.Id_Empleado
                WHERE n.Id_Nomina = ?
            ");
            $stmt->execute([$id]);
            $nom = $stmt->fetch();
            if (!$nom) { echo json_encode(['success' => false, 'message' => 'Liquidación no encontrada']); exit; }
            $stmtD = $db->prepare("SELECT * FROM tbl_nomina_detalle WHERE Id_Nomina = ?");
            $stmtD->execute([$id]);
            $nom['detalle'] = $stmtD->fetchAll();
            echo json_encode(['success' => true, 'nomina' => $nom]);
            exit;
        }

        // GET ?empleado=N → propuesta de liquidación
        $empleadoId = intval($_GET['empleado'] ?? 0);
        if (!$empleadoId) { echo json_encode(['success' => false, 'message' => 'Falta empleado']); exit; }

        $stmtE = $db->prepare("SELECT * FROM tbl_empleados WHERE Id_Empleado=?");
        $stmtE->execute([$empleadoId]);
        $emp = $stmtE->fetch();
        if (!$emp) { echo json_encode(['success' => false, 'message' => 'Empleado no encontrado']); exit; }

        // Calcular salario del periodo según tipo_pago
        $salarioPeriodo = floatval($emp['Salario']);
        if ($emp['Tipo_Pago'] === 'quincenal') $salarioPeriodo = $salarioPeriodo / 2;
        elseif ($emp['Tipo_Pago'] === 'semanal') $salarioPeriodo = $salarioPeriodo / 4;
        // mensual → salario completo

        // Deducciones propuestas: anticipos pendientes (todos) + cuota de cada préstamo
        $stmtD = $db->prepare("
            SELECT m.Id_Mov, m.Fecha, m.Tipo, m.Valor, m.Cuota_Mensual, m.Observacion,
                m.Valor - COALESCE((
                    SELECT SUM(ABS(a.Valor))
                    FROM tbl_mov_empleado a
                    WHERE a.Id_Mov_Origen = m.Id_Mov AND a.Estado = 'activo'
                ), 0) AS saldo_pendiente
            FROM tbl_mov_empleado m
            WHERE m.Id_Empleado = ?
              AND m.Estado = 'activo'
              AND m.Tipo IN ('anticipo','prestamo','cargo')
            HAVING saldo_pendiente > 0
            ORDER BY m.Fecha
        ");
        $stmtD->execute([$empleadoId]);
        $pendientes = $stmtD->fetchAll();

        $deducciones = [];
        foreach ($pendientes as $p) {
            $saldo = floatval($p['saldo_pendiente']);
            if ($p['Tipo'] === 'prestamo' && floatval($p['Cuota_Mensual']) > 0) {
                $sugerido = min(floatval($p['Cuota_Mensual']), $saldo);
            } else {
                // anticipo y cargo: descontar todo lo pendiente
                $sugerido = $saldo;
            }
            $deducciones[] = [
                'tipo' => $p['Tipo'] === 'prestamo' ? 'cuota_prestamo' : $p['Tipo'],
                'id_mov_origen' => intval($p['Id_Mov']),
                'concepto' => ($p['Tipo'] === 'anticipo' ? 'Anticipo del ' : ($p['Tipo'] === 'prestamo' ? 'Cuota préstamo del ' : 'Cargo del '))
                              . date('d/m/Y', strtotime($p['Fecha']))
                              . ($p['Observacion'] ? ' — ' . $p['Observacion'] : ''),
                'valor' => $sugerido,
                'saldo_pendiente' => $saldo,
            ];
        }

        echo json_encode([
            'success' => true,
            'empleado' => $emp,
            'propuesta' => [
                'salario_base' => $salarioPeriodo,
                'deducciones' => $deducciones,
            ],
        ]);
        exit;
    }

    if ($_SERVER['REQUEST_METHOD'] === 'POST') {
        $data = json_decode(file_get_contents('php://input'), true);
        $action = $data['action'] ?? '';

        if ($action === 'liquidar') {
            $empleadoId = intval($data['empleado_id'] ?? 0);
            if (!$empleadoId) { echo json_encode(['success' => false, 'message' => 'Falta empleado']); exit; }

            $stmtE = $db->prepare("SELECT * FROM tbl_empleados WHERE Id_Empleado=? AND Estado='activo'");
            $stmtE->execute([$empleadoId]);
            $emp = $stmtE->fetch();
            if (!$emp) { echo json_encode(['success' => false, 'message' => 'Empleado no encontrado o retirado']); exit; }

            $salarioBase    = floatval($data['salario_base'] ?? 0);
            $horasExtras    = floatval($data['horas_extras'] ?? 0);
            $bonificaciones = floatval($data['bonificaciones'] ?? 0);
            $otrosIngresos  = floatval($data['otros_ingresos'] ?? 0);
            $totalDevengado = $salarioBase + $horasExtras + $bonificaciones + $otrosIngresos;

            $deducciones = is_array($data['deducciones'] ?? null) ? $data['deducciones'] : [];
            $totalDeducciones = 0;
            foreach ($deducciones as $d) $totalDeducciones += floatval($d['valor'] ?? 0);
            $neto = $totalDevengado - $totalDeducciones;
            if ($neto < 0) { echo json_encode(['success' => false, 'message' => 'El neto no puede ser negativo']); exit; }

            $origenPago = $data['origen_pago'] ?? 'caja_general'; // caja_general | banco
            $idBanco = intval($data['id_banco'] ?? 0) ?: null;
            $usuarioId = intval($data['usuario_id'] ?? 0) ?: null;

            $db->beginTransaction();
            try {
                // 1) Insertar liquidación
                $stmt = $db->prepare("
                    INSERT INTO tbl_nomina
                        (Id_Empleado, Periodo_Inicio, Periodo_Fin, Tipo_Periodo,
                         Salario_Base, Horas_Extras, Bonificaciones, Otros_Ingresos,
                         Total_Devengado, Total_Deducciones, Neto,
                         Origen_Pago, Id_Banco, Fecha_Pago, Observacion, Id_Usuario, Estado)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), ?, ?, 'pagada')
                ");
                $stmt->execute([
                    $empleadoId,
                    $data['periodo_inicio'] ?? date('Y-m-01'),
                    $data['periodo_fin'] ?? date('Y-m-d'),
                    $data['tipo_periodo'] ?? $emp['Tipo_Pago'],
                    $salarioBase, $horasExtras, $bonificaciones, $otrosIngresos,
                    $totalDevengado, $totalDeducciones, $neto,
                    $origenPago, $idBanco,
                    trim($data['observacion'] ?? ''),
                    $usuarioId,
                ]);
                $idNomina = $db->lastInsertId();

                // 2) Insertar detalle de deducciones + crear mov de desc_nomina en el kardex
                foreach ($deducciones as $d) {
                    $valor = floatval($d['valor'] ?? 0);
                    if ($valor <= 0) continue;
                    $idMovOrigen = intval($d['id_mov_origen'] ?? 0) ?: null;
                    $concepto = trim($d['concepto'] ?? '');
                    $tipo = $d['tipo'] ?? 'otros';

                    $stmtD = $db->prepare("
                        INSERT INTO tbl_nomina_detalle (Id_Nomina, Tipo, Id_Mov_Origen, Concepto, Valor_Deducido)
                        VALUES (?, ?, ?, ?, ?)
                    ");
                    $stmtD->execute([$idNomina, $tipo, $idMovOrigen, $concepto, $valor]);

                    // Movimiento negativo en kardex (cancela saldo)
                    registrarMovKardex($db, $empleadoId, 'desc_nomina', -$valor, [
                        'observacion' => $concepto,
                        'id_nomina' => $idNomina,
                        'id_mov_origen' => $idMovOrigen,
                        'usuario_id' => $usuarioId,
                    ]);
                }

                // 3) Generar egreso en tblegresos por el neto
                if ($neto > 0) {
                    $stmtN = $db->query("SELECT COALESCE(MAX(N_Comprobante),0) + 1 FROM tblegresos");
                    $nComp = intval($stmtN->fetchColumn());
                    $tipoPago = ($origenPago === 'banco' && $idBanco) ? intval($idBanco) : 0;
                    $concepto = 'Pago nómina — ' . $emp['Nombre'] . ' — ' .
                                date('d/m', strtotime($data['periodo_inicio'])) . ' al ' . date('d/m/Y', strtotime($data['periodo_fin']));
                    $stmt = $db->prepare("
                        INSERT INTO tblegresos
                            (N_Comprobante, Fecha, Concepto, Valor, Estado, TipoPago,
                             id_usuario, vinculado_a, id_vinculo)
                        VALUES (?, NOW(), ?, ?, 'Valida', ?, ?, 'nomina', ?)
                    ");
                    $stmt->execute([$nComp, $concepto, $neto, $tipoPago, $usuarioId, $idNomina]);
                    $idEgreso = $db->lastInsertId();
                    $db->prepare("UPDATE tbl_nomina SET Id_Egreso=? WHERE Id_Nomina=?")->execute([$idEgreso, $idNomina]);
                }

                $db->commit();
                echo json_encode([
                    'success' => true,
                    'id_nomina' => $idNomina,
                    'neto' => $neto,
                    'message' => 'Nómina liquidada',
                ]);
            } catch (Throwable $e) { $db->rollBack(); throw $e; }
            exit;
        }

        if ($action === 'anular') {
            $idNomina = intval($data['id_nomina'] ?? 0);
            if (!$idNomina) { echo json_encode(['success' => false, 'message' => 'Falta id_nomina']); exit; }

            $db->beginTransaction();
            try {
                $stmt = $db->prepare("SELECT Id_Empleado, Id_Egreso FROM tbl_nomina WHERE Id_Nomina=? AND Estado='pagada'");
                $stmt->execute([$idNomina]);
                $nom = $stmt->fetch();
                if (!$nom) { throw new Exception('Liquidación no encontrada o ya anulada'); }

                // Anular liquidación + egreso + movs del kardex vinculados
                $db->prepare("UPDATE tbl_nomina SET Estado='anulada' WHERE Id_Nomina=?")->execute([$idNomina]);
                if ($nom['Id_Egreso']) {
                    $db->prepare("UPDATE tblegresos SET Estado='Anulada' WHERE Id_Egresos=?")->execute([$nom['Id_Egreso']]);
                }
                $db->prepare("UPDATE tbl_mov_empleado SET Estado='anulado' WHERE Id_Nomina=?")->execute([$idNomina]);

                // Recalcular Saldo_Acum
                $stmtPost = $db->prepare("
                    SELECT Id_Mov, Valor FROM tbl_mov_empleado
                    WHERE Id_Empleado = ? AND Estado = 'activo'
                    ORDER BY Id_Mov
                ");
                $stmtPost->execute([$nom['Id_Empleado']]);
                $saldo = 0;
                foreach ($stmtPost->fetchAll() as $m) {
                    $saldo += floatval($m['Valor']);
                    $db->prepare("UPDATE tbl_mov_empleado SET Saldo_Acum=? WHERE Id_Mov=?")
                       ->execute([$saldo, $m['Id_Mov']]);
                }

                $db->commit();
                echo json_encode(['success' => true, 'message' => 'Nómina anulada']);
            } catch (Throwable $e) { $db->rollBack(); throw $e; }
            exit;
        }

        echo json_encode(['success' => false, 'message' => 'Acción no reconocida']);
        exit;
    }

    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Método no permitido']);
} catch (Throwable $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => $e->getMessage()]);
}
