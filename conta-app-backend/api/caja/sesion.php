<?php
/**
 * Sesiones de caja - Nuevo modelo multi-cajero
 * GET                      → estado: sesión activa del usuario o caja
 * GET ?historial=1&caja=N  → historial de sesiones de una caja
 * GET ?cajas=1             → listar cajas disponibles
 * POST action=abrir        → abrir sesión
 * POST action=cerrar       → cerrar sesión con conteo
 * POST action=retiro       → retiro parcial
 * POST action=deposito     → depositar en caja principal
 */
require_once '../config/database.php';
$database = new Database();
$db = $database->getConnection();

try {
    if ($_SERVER['REQUEST_METHOD'] === 'GET') {

        // Listar cajas
        if (isset($_GET['cajas'])) {
            $stmt = $db->query("
                SELECT c.*,
                    (SELECT COUNT(*) FROM tblsesiones_caja s WHERE s.Id_Caja = c.Id_Caja AND s.Estado = 'abierta') as sesiones_abiertas,
                    (SELECT u.Nombre FROM tblsesiones_caja s LEFT JOIN tblusuarios u ON s.Id_Usuario = u.Id_Usuario WHERE s.Id_Caja = c.Id_Caja AND s.Estado = 'abierta' LIMIT 1) as cajero_actual
                FROM tblcajas c WHERE c.Activa = 1 ORDER BY c.Id_Caja
            ");
            $cajas = $stmt->fetchAll();

            // Calcular base sugerida de cada caja (lo que quedó residual de la última sesión cerrada)
            // residual = ConteoFinal - sumaTraslados (de la última sesión cerrada)
            $stmtRes = $db->prepare("
                SELECT s.Id_Sesion, s.ConteoFinal,
                    COALESCE((SELECT SUM(Valor) FROM tblmov_caja WHERE Id_Sesion = s.Id_Sesion AND Tipo = 'traslado'), 0) AS trasladado,
                    s.FechaCierre
                FROM tblsesiones_caja s
                WHERE s.Id_Caja = ? AND s.Estado = 'cerrada'
                ORDER BY s.FechaCierre DESC LIMIT 1
            ");
            foreach ($cajas as &$c) {
                $stmtRes->execute([$c['Id_Caja']]);
                $r = $stmtRes->fetch();
                if ($r) {
                    $residual = floatval($r['ConteoFinal']) - floatval($r['trasladado']);
                    $c['base_sugerida'] = $residual > 0 ? $residual : 0;
                    $c['ultimo_cierre'] = $r['FechaCierre'];
                } else {
                    $c['base_sugerida'] = 0;
                    $c['ultimo_cierre'] = null;
                }
            }
            echo json_encode(['success' => true, 'cajas' => $cajas], JSON_UNESCAPED_UNICODE);
            exit;
        }

        // Historial
        if (isset($_GET['historial'])) {
            $cajaId = $_GET['caja'] ?? null;
            $where = "1=1";
            $params = [];
            if ($cajaId) { $where .= " AND s.Id_Caja = ?"; $params[] = $cajaId; }

            $stmt = $db->prepare("
                SELECT s.*, c.Nombre as NombreCaja, u.Nombre as NombreUsuario
                FROM tblsesiones_caja s
                LEFT JOIN tblcajas c ON s.Id_Caja = c.Id_Caja
                LEFT JOIN tblusuarios u ON s.Id_Usuario = u.Id_Usuario
                WHERE $where
                ORDER BY s.Id_Sesion DESC LIMIT 50
            ");
            $stmt->execute($params);
            echo json_encode(['success' => true, 'sesiones' => $stmt->fetchAll()], JSON_UNESCAPED_UNICODE);
            exit;
        }

        // Estado actual: buscar sesión abierta
        $cajaId = $_GET['caja'] ?? null;
        $usuarioId = $_GET['usuario'] ?? null;

        $where = "s.Estado = 'abierta'";
        $params = [];
        if ($cajaId) { $where .= " AND s.Id_Caja = ?"; $params[] = $cajaId; }
        if ($usuarioId) { $where .= " AND s.Id_Usuario = ?"; $params[] = $usuarioId; }

        $stmt = $db->prepare("
            SELECT s.*, c.Nombre as NombreCaja, u.Nombre as NombreUsuario
            FROM tblsesiones_caja s
            LEFT JOIN tblcajas c ON s.Id_Caja = c.Id_Caja
            LEFT JOIN tblusuarios u ON s.Id_Usuario = u.Id_Usuario
            WHERE $where
            ORDER BY s.Id_Sesion DESC LIMIT 1
        ");
        $stmt->execute($params);
        $sesion = $stmt->fetch();

        if (!$sesion) {
            echo json_encode(['success' => true, 'abierta' => false, 'sesion' => null, 'resumen' => null]);
            exit;
        }

        // Calcular resumen desde la apertura
        $fechaApertura = $sesion['FechaApertura'];
        $base = floatval($sesion['BaseInicial']);

        // Ventas contado
        $stmt = $db->prepare("SELECT COALESCE(SUM(efectivo),0) as ef, COALESCE(SUM(valorpagado1),0) as tr, COALESCE(SUM(Total),0) as t, COUNT(*) as c FROM tblventas WHERE Fecha >= ? AND EstadoFact = 'Valida' AND Tipo = 'Contado'");
        $stmt->execute([$fechaApertura]);
        $vc = $stmt->fetch();

        // Ventas crédito
        $stmt = $db->prepare("SELECT COALESCE(SUM(Total),0) as t, COUNT(*) as c FROM tblventas WHERE Fecha >= ? AND EstadoFact = 'Valida' AND Tipo != 'Contado'");
        $stmt->execute([$fechaApertura]);
        $vcr = $stmt->fetch();

        // Ventas por medio de pago
        $stmt = $db->prepare("SELECT COALESCE(m.nombre_medio,'Efectivo') as medio, v.id_mediopago, COALESCE(SUM(v.Total),0) as total, COALESCE(SUM(v.efectivo),0) as efectivo, COALESCE(SUM(v.valorpagado1),0) as transferencia FROM tblventas v LEFT JOIN tblmedios_pago m ON v.id_mediopago = m.id_mediopago WHERE v.Fecha >= ? AND v.EstadoFact = 'Valida' AND v.Tipo = 'Contado' GROUP BY v.id_mediopago, m.nombre_medio");
        $stmt->execute([$fechaApertura]);
        $ventasMedio = $stmt->fetchAll();

        // Pagos clientes
        $stmt = $db->prepare("SELECT COALESCE(SUM(CASE WHEN id_mediopago=0 THEN ValorPago ELSE 0 END),0) as ef, COALESCE(SUM(CASE WHEN id_mediopago>0 THEN ValorPago ELSE 0 END),0) as tr, COALESCE(SUM(ValorPago),0) as t, COUNT(*) as c FROM tblpagos WHERE Fecha >= ? AND Estado = 'Valida'");
        $stmt->execute([$fechaApertura]);
        $pg = $stmt->fetch();

        // Egresos
        $stmt = $db->prepare("SELECT COALESCE(SUM(Valor),0) as t, COUNT(*) as c FROM tblegresos WHERE Fecha >= ? AND Estado = 'Valida'");
        $stmt->execute([$fechaApertura]);
        $eg = $stmt->fetch();

        // Anulaciones
        $stmt = $db->prepare("SELECT COALESCE(SUM(Total),0) as t, COUNT(*) as c FROM tblventas WHERE Fecha >= ? AND EstadoFact = 'Anulada'");
        $stmt->execute([$fechaApertura]);
        $an = $stmt->fetch();

        // Retiros parciales de esta sesión
        $stmt = $db->prepare("SELECT COALESCE(SUM(Valor),0) as t FROM tblmov_caja WHERE Id_Sesion = ? AND Tipo = 'retiro_parcial'");
        $stmt->execute([$sesion['Id_Sesion']]);
        $retiros = floatval($stmt->fetch()['t']);

        // Movimientos de caja de esta sesión
        $stmt = $db->prepare("SELECT * FROM tblmov_caja WHERE Id_Sesion = ? ORDER BY Fecha DESC");
        $stmt->execute([$sesion['Id_Sesion']]);
        $movimientos = $stmt->fetchAll();

        $totalEfectivo = $base + floatval($vc['ef']) + floatval($pg['ef']) - floatval($eg['t']) - floatval($an['t']) - $retiros;
        $totalVentaDia = floatval($vc['t']) + floatval($vcr['t']);

        echo json_encode([
            'success' => true,
            'abierta' => true,
            'sesion' => $sesion,
            'resumen' => [
                'fecha_apertura' => $fechaApertura,
                'base' => $base,
                'ventas_contado_efectivo' => floatval($vc['ef']),
                'ventas_contado_transferencia' => floatval($vc['tr']),
                'ventas_contado_total' => floatval($vc['t']),
                'ventas_contado_cantidad' => intval($vc['c']),
                'ventas_credito' => floatval($vcr['t']),
                'ventas_credito_cantidad' => intval($vcr['c']),
                'ventas_por_medio' => $ventasMedio,
                'pagos_efectivo' => floatval($pg['ef']),
                'pagos_transferencia' => floatval($pg['tr']),
                'pagos_total' => floatval($pg['t']),
                'pagos_cantidad' => intval($pg['c']),
                'egresos' => floatval($eg['t']),
                'egresos_cantidad' => intval($eg['c']),
                'anulaciones' => floatval($an['t']),
                'anulaciones_cantidad' => intval($an['c']),
                'retiros_parciales' => $retiros,
                'total_efectivo' => $totalEfectivo,
                'total_venta_dia' => $totalVentaDia,
                'movimientos' => $movimientos
            ]
        ], JSON_UNESCAPED_UNICODE);

    } elseif ($_SERVER['REQUEST_METHOD'] === 'POST') {
        $data = json_decode(file_get_contents('php://input'), true);
        $action = $data['action'] ?? '';

        if ($action === 'abrir') {
            $cajaId = intval($data['caja_id'] ?? 1);
            $usuarioId = intval($data['usuario_id'] ?? 0);
            $base = floatval($data['base'] ?? 0);

            // Verificar que la caja no tenga sesión abierta
            $stmt = $db->prepare("SELECT Id_Sesion, Id_Usuario FROM tblsesiones_caja WHERE Id_Caja = ? AND Estado = 'abierta' LIMIT 1");
            $stmt->execute([$cajaId]);
            $existente = $stmt->fetch();
            if ($existente) {
                $stmt2 = $db->prepare("SELECT Nombre FROM tblusuarios WHERE Id_Usuario = ?");
                $stmt2->execute([$existente['Id_Usuario']]);
                $usr = $stmt2->fetch();
                echo json_encode(['success' => false, 'message' => 'Esta caja ya está abierta por ' . ($usr['Nombre'] ?? 'otro usuario')]);
                exit;
            }

            $stmt = $db->prepare("INSERT INTO tblsesiones_caja (Id_Caja, Id_Usuario, FechaApertura, BaseInicial, Estado) VALUES (?, ?, NOW(), ?, 'abierta')");
            $stmt->execute([$cajaId, $usuarioId, $base]);

            $stmt = $db->prepare("SELECT Nombre FROM tblcajas WHERE Id_Caja = ?");
            $stmt->execute([$cajaId]);
            $nombreCaja = $stmt->fetch()['Nombre'] ?? 'Caja';

            echo json_encode(['success' => true, 'message' => "$nombreCaja abierta con base " . number_format($base, 0, ',', '.'), 'id_sesion' => $db->lastInsertId()]);

        } elseif ($action === 'cerrar') {
            $sesionId = intval($data['sesion_id'] ?? 0);
            $conteo = floatval($data['conteo'] ?? 0);
            $observacion = $data['observacion'] ?? '';

            $stmt = $db->prepare("SELECT * FROM tblsesiones_caja WHERE Id_Sesion = ? AND Estado = 'abierta'");
            $stmt->execute([$sesionId]);
            $sesion = $stmt->fetch();
            if (!$sesion) { echo json_encode(['success' => false, 'message' => 'Sesión no encontrada o ya cerrada']); exit; }

            // Recalculate totals
            $fa = $sesion['FechaApertura'];
            $base = floatval($sesion['BaseInicial']);

            $stmt = $db->prepare("SELECT COALESCE(SUM(efectivo),0) as ef, COALESCE(SUM(valorpagado1),0) as tr, COALESCE(SUM(Total),0) as t FROM tblventas WHERE Fecha >= ? AND EstadoFact = 'Valida' AND Tipo = 'Contado'");
            $stmt->execute([$fa]); $vc = $stmt->fetch();

            $stmt = $db->prepare("SELECT COALESCE(SUM(Total),0) as t FROM tblventas WHERE Fecha >= ? AND EstadoFact = 'Valida' AND Tipo != 'Contado'");
            $stmt->execute([$fa]); $vcr = $stmt->fetch();

            $stmt = $db->prepare("SELECT COALESCE(SUM(CASE WHEN id_mediopago=0 THEN ValorPago ELSE 0 END),0) as ef, COALESCE(SUM(CASE WHEN id_mediopago>0 THEN ValorPago ELSE 0 END),0) as tr, COALESCE(SUM(ValorPago),0) as t FROM tblpagos WHERE Fecha >= ? AND Estado = 'Valida'");
            $stmt->execute([$fa]); $pg = $stmt->fetch();

            $stmt = $db->prepare("SELECT COALESCE(SUM(Valor),0) as t FROM tblegresos WHERE Fecha >= ? AND Estado = 'Valida'");
            $stmt->execute([$fa]); $eg = $stmt->fetch();

            $stmt = $db->prepare("SELECT COALESCE(SUM(Total),0) as t FROM tblventas WHERE Fecha >= ? AND EstadoFact = 'Anulada'");
            $stmt->execute([$fa]); $an = $stmt->fetch();

            $stmt = $db->prepare("SELECT COALESCE(SUM(Valor),0) as t FROM tblmov_caja WHERE Id_Sesion = ? AND Tipo = 'retiro_parcial'");
            $stmt->execute([$sesionId]); $ret = floatval($stmt->fetch()['t']);

            $totalEf = $base + floatval($vc['ef']) + floatval($pg['ef']) - floatval($eg['t']) - floatval($an['t']) - $ret;
            $diferencia = $conteo - $totalEf;

            $db->prepare("UPDATE tblsesiones_caja SET FechaCierre = NOW(), VentasContadoEfectivo = ?, VentasContadoTransf = ?, VentasCredito = ?, PagosEfectivo = ?, PagosTransf = ?, Egresos = ?, Anulaciones = ?, RetirosParciales = ?, TotalEfectivoSistema = ?, ConteoFinal = ?, DiferenciaFinal = ?, Estado = 'cerrada', Observacion = ? WHERE Id_Sesion = ?")
               ->execute([floatval($vc['ef']), floatval($vc['tr']), floatval($vcr['t']), floatval($pg['ef']), floatval($pg['tr']), floatval($eg['t']), floatval($an['t']), $ret, $totalEf, $conteo, $diferencia, $observacion, $sesionId]);

            // Trasladar según opción
            $opcionTraslado = $data['opcion_traslado'] ?? 'ganancias';
            $stmt = $db->query("SELECT Id_Caja FROM tblcajas WHERE Tipo = 'principal' AND Activa = 1 LIMIT 1");
            $cajaPrincipal = $stmt->fetch();
            $trasladado = 0;

            if ($cajaPrincipal && $opcionTraslado !== 'nada' && $conteo > 0) {
                if ($opcionTraslado === 'todo') {
                    $trasladado = $conteo;
                } elseif ($opcionTraslado === 'ganancias') {
                    $trasladado = max($conteo - $base, 0);
                }

                if ($trasladado > 0) {
                    $descTraslado = $opcionTraslado === 'todo'
                        ? "Cierre total de caja - Sesión #$sesionId"
                        : "Ganancias del día - Sesión #$sesionId (Base $" . number_format($base, 0, ',', '.') . " queda en caja)";

                    $db->prepare("INSERT INTO tblmov_caja (Id_Sesion, Id_Caja_Origen, Id_Caja_Destino, Id_Usuario, Valor, Tipo, Descripcion) VALUES (?, ?, ?, ?, ?, 'traslado', ?)")
                       ->execute([$sesionId, $sesion['Id_Caja'], $cajaPrincipal['Id_Caja'], intval($data['usuario_id'] ?? 0), $trasladado, $descTraslado]);
                    $db->prepare("UPDATE tblcajas SET Saldo = Saldo + ? WHERE Id_Caja = ?")->execute([$trasladado, $cajaPrincipal['Id_Caja']]);
                }
            }

            $msgBase = $diferencia == 0 ? 'Cuadre perfecto.'
                : ($diferencia > 0 ? 'Sobrante: $' . number_format($diferencia, 0, ',', '.')
                : 'Faltante: $' . number_format(abs($diferencia), 0, ',', '.'));

            $msgTraslado = $trasladado > 0
                ? ' Trasladado a Principal: $' . number_format($trasladado, 0, ',', '.')
                : ($opcionTraslado === 'nada' ? ' Sin traslado.' : '');

            echo json_encode([
                'success' => true,
                'message' => "Caja cerrada. $msgBase.$msgTraslado",
                'diferencia' => $diferencia,
                'trasladado' => $trasladado,
                'opcion' => $opcionTraslado
            ], JSON_UNESCAPED_UNICODE);

        } elseif ($action === 'retiro') {
            $sesionId = intval($data['sesion_id'] ?? 0);
            $valor = floatval($data['valor'] ?? 0);
            $descripcion = $data['descripcion'] ?? 'Retiro parcial';
            $usuarioId = intval($data['usuario_id'] ?? 0);

            if ($valor <= 0) { echo json_encode(['success' => false, 'message' => 'Valor debe ser mayor a 0']); exit; }

            $stmt = $db->prepare("SELECT Id_Caja FROM tblsesiones_caja WHERE Id_Sesion = ? AND Estado = 'abierta'");
            $stmt->execute([$sesionId]);
            $sesion = $stmt->fetch();
            if (!$sesion) { echo json_encode(['success' => false, 'message' => 'No hay sesión abierta']); exit; }

            // Find caja principal
            $stmt = $db->query("SELECT Id_Caja FROM tblcajas WHERE Tipo = 'principal' AND Activa = 1 LIMIT 1");
            $cajaPrincipal = $stmt->fetch();
            $destino = $cajaPrincipal ? $cajaPrincipal['Id_Caja'] : null;

            $db->prepare("INSERT INTO tblmov_caja (Id_Sesion, Id_Caja_Origen, Id_Caja_Destino, Id_Usuario, Valor, Tipo, Descripcion) VALUES (?, ?, ?, ?, ?, 'retiro_parcial', ?)")
               ->execute([$sesionId, $sesion['Id_Caja'], $destino, $usuarioId, $valor, $descripcion]);

            // Update caja principal saldo
            if ($destino) {
                $db->prepare("UPDATE tblcajas SET Saldo = Saldo + ? WHERE Id_Caja = ?")->execute([$valor, $destino]);
            }

            echo json_encode(['success' => true, 'message' => 'Retiro de $' . number_format($valor, 0, ',', '.') . ' registrado'], JSON_UNESCAPED_UNICODE);

        } elseif ($action === 'crear_caja') {
            $nombre = $data['nombre'] ?? '';
            $tipo = $data['tipo'] ?? 'punto_venta';
            if (!$nombre) { echo json_encode(['success' => false, 'message' => 'Nombre requerido']); exit; }
            $db->prepare("INSERT INTO tblcajas (Nombre, Tipo) VALUES (?, ?)")->execute([$nombre, $tipo]);
            echo json_encode(['success' => true, 'message' => "Caja '$nombre' creada", 'id' => $db->lastInsertId()]);
        }
    }
} catch (Exception $e) {
    echo json_encode(['success' => false, 'message' => $e->getMessage()]);
}
?>
