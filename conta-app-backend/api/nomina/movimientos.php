<?php
/**
 * Nómina — Movimientos del kardex de empleados
 * GET  ?empleado=N          → kardex completo del empleado
 * GET  ?empleado=N&pendientes=1 → solo movimientos activos con saldo > 0 (préstamos/anticipos vigentes)
 * POST { action: 'anticipo', empleado_id, valor, observacion, origen_pago, id_caja, id_banco, usuario_id }
 * POST { action: 'prestamo', empleado_id, valor, cuota_mensual, observacion, origen_pago, ... }
 * POST { action: 'cargo', empleado_id, valor, observacion, usuario_id }     — se descuenta en próxima nómina sin salida de caja
 * POST { action: 'abono', empleado_id, valor, id_mov_origen, observacion, id_caja, usuario_id } — empleado paga directo
 * POST { action: 'anular', id_mov, usuario_id }
 *
 * Reglas:
 *   - anticipo/prestamo: generan egreso en tblegresos (origen_pago decide de dónde sale la plata)
 *   - cargo: NO genera egreso (es una deuda imputada, ej. dañó inventario)
 *   - abono: genera INGRESO en caja (el empleado paga)
 *   - desc_nomina: se crea desde nomina/liquidar.php, no aquí
 */
require_once '../config/database.php';
$database = new Database();
$db = $database->getConnection();

function registrarMov($db, $empleadoId, $tipo, $valor, $opts = []) {
    // Lee saldo anterior
    $stmtS = $db->prepare("SELECT COALESCE(Saldo_Acum, 0) FROM tbl_mov_empleado
                           WHERE Id_Empleado = ? AND Estado = 'activo'
                           ORDER BY Id_Mov DESC LIMIT 1");
    $stmtS->execute([$empleadoId]);
    $saldoPrev = floatval($stmtS->fetchColumn());
    $saldoNuevo = $saldoPrev + $valor; // valor con signo

    $stmt = $db->prepare("
        INSERT INTO tbl_mov_empleado
            (Id_Empleado, Fecha, Tipo, Valor, Saldo_Acum, Cuota_Mensual,
             Observacion, Vinculado_Tipo, Vinculado_Id, Id_Egreso, Id_Nomina,
             Id_Mov_Origen, Id_Usuario, Estado)
        VALUES (?, CURRENT_TIMESTAMP, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'activo')
    ");
    $stmt->execute([
        $empleadoId, $tipo, $valor, $saldoNuevo,
        $opts['cuota_mensual'] ?? 0,
        $opts['observacion'] ?? null,
        $opts['vinculado_tipo'] ?? null,
        $opts['vinculado_id'] ?? null,
        $opts['id_egreso'] ?? null,
        $opts['id_nomina'] ?? null,
        $opts['id_mov_origen'] ?? null,
        $opts['usuario_id'] ?? null,
    ]);
    return $db->lastInsertId();
}

function generarEgresoCaja($db, $empleadoId, $empleadoNombre, $valor, $concepto, $origenPago, $idCaja, $idBanco, $idUsuario) {
    // Egreso en tblegresos. Lo marcamos como vinculado_a='empleado' + id_vinculo=empleado.id
    // para que el cuadre lo distinga de egresos operativos.
    $tipoPago = 0; // 0 = efectivo (caja), >0 = banco
    if ($origenPago === 'banco' && $idBanco) $tipoPago = intval($idBanco);

    // Siguiente N_Comprobante
    $stmtN = $db->query("SELECT COALESCE(MAX(N_Comprobante),0) + 1 FROM tblegresos");
    $nComp = intval($stmtN->fetchColumn());

    $stmt = $db->prepare("
        INSERT INTO tblegresos
            (N_Comprobante, Fecha, Concepto, Valor, Estado, TipoPago,
             id_usuario, vinculado_a, id_vinculo)
        VALUES (?, CURRENT_TIMESTAMP, ?, ?, 'Valida', ?, ?, 'empleado', ?)
    ");
    $stmt->execute([
        $nComp, $concepto, $valor, $tipoPago, $idUsuario, $empleadoId,
    ]);
    return $db->lastInsertId();
}

try {
    if ($_SERVER['REQUEST_METHOD'] === 'GET') {
        $empleadoId = intval($_GET['empleado'] ?? 0);
        if (!$empleadoId) { echo json_encode(['success' => false, 'message' => 'Falta empleado']); exit; }

        if (!empty($_GET['pendientes'])) {
            // Movimientos tipo anticipo/prestamo/cargo que aún tienen saldo pendiente
            // (es decir: para cada mov sumar sus abonos/desc_nomina y ver si quedó > 0)
            $stmt = $db->prepare("
                SELECT m.*,
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
            $stmt->execute([$empleadoId]);
            echo json_encode(['success' => true, 'pendientes' => $stmt->fetchAll()]);
            exit;
        }

        $stmt = $db->prepare("
            SELECT * FROM tbl_mov_empleado
            WHERE Id_Empleado = ?
            ORDER BY Fecha DESC, Id_Mov DESC
        ");
        $stmt->execute([$empleadoId]);
        echo json_encode(['success' => true, 'movimientos' => $stmt->fetchAll()]);
        exit;
    }

    if ($_SERVER['REQUEST_METHOD'] === 'POST') {
        $data = json_decode(file_get_contents('php://input'), true);
        $action = $data['action'] ?? '';

        if (in_array($action, ['anticipo','prestamo'])) {
            $empleadoId = intval($data['empleado_id'] ?? 0);
            $valor = floatval($data['valor'] ?? 0);
            if (!$empleadoId || $valor <= 0) {
                echo json_encode(['success' => false, 'message' => 'Datos incompletos']); exit;
            }

            // Datos del empleado
            $stmt = $db->prepare("SELECT * FROM tbl_empleados WHERE Id_Empleado=? AND Estado='activo'");
            $stmt->execute([$empleadoId]);
            $emp = $stmt->fetch();
            if (!$emp) { echo json_encode(['success' => false, 'message' => 'Empleado no encontrado o retirado']); exit; }

            $origenPago = $data['origen_pago'] ?? 'caja_operativa';
            $idCaja = intval($data['id_caja'] ?? 0) ?: null;
            $idBanco = intval($data['id_banco'] ?? 0) ?: null;
            $usuarioId = intval($data['usuario_id'] ?? 0) ?: null;
            $cuotaMensual = $action === 'prestamo' ? floatval($data['cuota_mensual'] ?? 0) : 0;
            $obs = trim($data['observacion'] ?? '');

            $concepto = ($action === 'anticipo' ? 'Anticipo de nómina' : 'Préstamo a empleado')
                      . ' — ' . $emp['Nombre'] . ($obs ? " ($obs)" : '');

            $db->beginTransaction();
            try {
                // 1) Egreso en caja
                $idEgreso = generarEgresoCaja($db, $empleadoId, $emp['Nombre'], $valor, $concepto, $origenPago, $idCaja, $idBanco, $usuarioId);

                // 2) Movimiento en kardex empleado (valor + = aumenta deuda)
                $idMov = registrarMov($db, $empleadoId, $action, $valor, [
                    'cuota_mensual' => $cuotaMensual,
                    'observacion' => $obs,
                    'vinculado_tipo' => 'egreso',
                    'vinculado_id' => $idEgreso,
                    'id_egreso' => $idEgreso,
                    'usuario_id' => $usuarioId,
                ]);

                // 3) Si fue a caja operativa, registrar movimiento en tblmov_caja (si existe la sesión)
                if ($origenPago === 'caja_operativa' && $idCaja) {
                    $stmtSes = $db->prepare("SELECT Id_Sesion FROM tblsesiones_caja WHERE Id_Caja=? AND Estado='abierta' LIMIT 1");
                    $stmtSes->execute([$idCaja]);
                    $idSesion = intval($stmtSes->fetchColumn());
                    if ($idSesion) {
                        $stmtMc = $db->prepare("
                            INSERT INTO tblmov_caja (Fecha, Id_Sesion, Tipo, Descripcion, Valor, id_usuario)
                            VALUES (CURRENT_TIMESTAMP, ?, 'gasto', ?, ?, ?)
                        ");
                        $stmtMc->execute([$idSesion, $concepto, $valor, $usuarioId]);
                    }
                }

                $db->commit();
                echo json_encode([
                    'success' => true,
                    'id_mov' => $idMov, 'id_egreso' => $idEgreso,
                    'message' => ucfirst($action) . ' registrado',
                ]);
            } catch (Throwable $e) {
                $db->rollBack();
                throw $e;
            }
            exit;
        }

        if ($action === 'cargo') {
            // Cargo imputado al empleado SIN salida de caja (ej. dañó inventario)
            $empleadoId = intval($data['empleado_id'] ?? 0);
            $valor = floatval($data['valor'] ?? 0);
            if (!$empleadoId || $valor <= 0) {
                echo json_encode(['success' => false, 'message' => 'Datos incompletos']); exit;
            }
            $idMov = registrarMov($db, $empleadoId, 'cargo', $valor, [
                'observacion' => trim($data['observacion'] ?? ''),
                'usuario_id' => intval($data['usuario_id'] ?? 0) ?: null,
            ]);
            echo json_encode(['success' => true, 'id_mov' => $idMov, 'message' => 'Cargo registrado']);
            exit;
        }

        if ($action === 'abono') {
            // Empleado paga de su bolsillo (ingresa plata a caja)
            $empleadoId = intval($data['empleado_id'] ?? 0);
            $valor = floatval($data['valor'] ?? 0);
            $idMovOrigen = intval($data['id_mov_origen'] ?? 0) ?: null;
            if (!$empleadoId || $valor <= 0) {
                echo json_encode(['success' => false, 'message' => 'Datos incompletos']); exit;
            }

            $idCaja = intval($data['id_caja'] ?? 0) ?: null;
            $usuarioId = intval($data['usuario_id'] ?? 0) ?: null;
            $obs = trim($data['observacion'] ?? '');

            $db->beginTransaction();
            try {
                // Movimiento negativo (reduce deuda)
                $idMov = registrarMov($db, $empleadoId, 'abono', -$valor, [
                    'observacion' => $obs,
                    'id_mov_origen' => $idMovOrigen,
                    'usuario_id' => $usuarioId,
                ]);

                // Opcional: registrar ingreso en caja operativa si está abierta
                if ($idCaja) {
                    $stmtSes = $db->prepare("SELECT Id_Sesion FROM tblsesiones_caja WHERE Id_Caja=? AND Estado='abierta' LIMIT 1");
                    $stmtSes->execute([$idCaja]);
                    $idSesion = intval($stmtSes->fetchColumn());
                    if ($idSesion) {
                        $stmtMc = $db->prepare("
                            INSERT INTO tblmov_caja (Fecha, Id_Sesion, Tipo, Descripcion, Valor, id_usuario)
                            VALUES (CURRENT_TIMESTAMP, ?, 'deposito', ?, ?, ?)
                        ");
                        $stmtMc->execute([$idSesion, "Abono empleado — $obs", $valor, $usuarioId]);
                    }
                }

                $db->commit();
                echo json_encode(['success' => true, 'id_mov' => $idMov, 'message' => 'Abono registrado']);
            } catch (Throwable $e) { $db->rollBack(); throw $e; }
            exit;
        }

        if ($action === 'anular') {
            $idMov = intval($data['id_mov'] ?? 0);
            if (!$idMov) { echo json_encode(['success' => false, 'message' => 'Falta id_mov']); exit; }

            $db->beginTransaction();
            try {
                // Marcar mov como anulado + recalcular saldo acumulado del empleado
                $stmt = $db->prepare("SELECT Id_Empleado, Valor, Id_Egreso FROM tbl_mov_empleado WHERE Id_Mov=? AND Estado='activo'");
                $stmt->execute([$idMov]);
                $mov = $stmt->fetch();
                if (!$mov) { throw new Exception('Movimiento no encontrado o ya anulado'); }

                $db->prepare("UPDATE tbl_mov_empleado SET Estado='anulado' WHERE Id_Mov=?")->execute([$idMov]);
                if ($mov['Id_Egreso']) {
                    $db->prepare("UPDATE tblegresos SET Estado='Anulada' WHERE Id_Egresos=?")->execute([$mov['Id_Egreso']]);
                }

                // Recalcular Saldo_Acum de los movimientos POSTERIORES del mismo empleado
                $stmtPost = $db->prepare("
                    SELECT Id_Mov, Valor FROM tbl_mov_empleado
                    WHERE Id_Empleado = ? AND Estado = 'activo'
                    ORDER BY Id_Mov
                ");
                $stmtPost->execute([$mov['Id_Empleado']]);
                $saldo = 0;
                foreach ($stmtPost->fetchAll() as $m) {
                    $saldo += floatval($m['Valor']);
                    $db->prepare("UPDATE tbl_mov_empleado SET Saldo_Acum=? WHERE Id_Mov=?")
                       ->execute([$saldo, $m['Id_Mov']]);
                }

                $db->commit();
                echo json_encode(['success' => true, 'message' => 'Movimiento anulado']);
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
