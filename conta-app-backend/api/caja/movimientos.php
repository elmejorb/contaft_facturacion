<?php
/**
 * Movimientos y historial de caja
 * GET                          → movimientos de caja principal + sesiones recientes
 * GET ?sesion=N                → detalle de una sesión específica
 * GET ?caja=N&desde=&hasta=    → movimientos filtrados
 * POST action=ingreso          → registrar ingreso a caja
 * POST action=egreso           → registrar egreso/gasto de caja
 * POST action=nota             → agregar nota a una sesión
 */
require_once '../config/database.php';
$database = new Database();
$db = $database->getConnection();

try {
    if ($_SERVER['REQUEST_METHOD'] === 'GET') {

        // Detalle de sesión
        if (isset($_GET['sesion'])) {
            $id = intval($_GET['sesion']);
            $stmt = $db->prepare("
                SELECT s.*, c.Nombre as NombreCaja, u.Nombre as NombreUsuario
                FROM tblsesiones_caja s
                LEFT JOIN tblcajas c ON s.Id_Caja = c.Id_Caja
                LEFT JOIN tblusuarios u ON s.Id_Usuario = u.Id_Usuario
                WHERE s.Id_Sesion = ?
            ");
            $stmt->execute([$id]);
            $sesion = $stmt->fetch();

            // Movimientos de la sesión
            $stmt2 = $db->prepare("SELECT m.*, u.Nombre as NombreUsuario, co.Nombre as CajaOrigen, cd.Nombre as CajaDestino FROM tblmov_caja m LEFT JOIN tblusuarios u ON m.Id_Usuario = u.Id_Usuario LEFT JOIN tblcajas co ON m.Id_Caja_Origen = co.Id_Caja LEFT JOIN tblcajas cd ON m.Id_Caja_Destino = cd.Id_Caja WHERE m.Id_Sesion = ? ORDER BY m.Fecha DESC");
            $stmt2->execute([$id]);
            $movimientos = $stmt2->fetchAll();

            // Ventas de esa sesión
            $fa = $sesion['FechaApertura'];
            $fc = $sesion['FechaCierre'] ?: date('Y-m-d H:i:s');
            $stmt3 = $db->prepare("SELECT Factura_N, Fecha, A_nombre, Tipo, Total, Saldo, id_mediopago, efectivo, valorpagado1 FROM tblventas WHERE Fecha BETWEEN ? AND ? AND EstadoFact = 'Valida' ORDER BY Factura_N");
            $stmt3->execute([$fa, $fc]);
            $ventas = $stmt3->fetchAll();

            // Pagos recibidos
            $stmt4 = $db->prepare("SELECT p.*, COALESCE(m.nombre_medio, 'Efectivo') as MedioPago FROM tblpagos p LEFT JOIN tblmedios_pago m ON p.id_mediopago = m.id_mediopago WHERE p.Fecha BETWEEN ? AND ? AND p.Estado = 'Valida' ORDER BY p.Id_Pagos");
            $stmt4->execute([$fa, $fc]);
            $pagos = $stmt4->fetchAll();

            echo json_encode([
                'success' => true,
                'sesion' => $sesion,
                'movimientos' => $movimientos,
                'ventas' => $ventas,
                'pagos' => $pagos
            ], JSON_UNESCAPED_UNICODE);
            exit;
        }

        // Historial general
        $cajaId = $_GET['caja'] ?? null;
        $desde = $_GET['desde'] ?? date('Y-m-01');
        $hasta = $_GET['hasta'] ?? date('Y-m-d');

        // Sesiones del período
        $where = "DATE(s.FechaApertura) BETWEEN ? AND ?";
        $params = [$desde, $hasta];
        if ($cajaId) { $where .= " AND s.Id_Caja = ?"; $params[] = $cajaId; }

        $stmt = $db->prepare("
            SELECT s.*, c.Nombre as NombreCaja, u.Nombre as NombreUsuario
            FROM tblsesiones_caja s
            LEFT JOIN tblcajas c ON s.Id_Caja = c.Id_Caja
            LEFT JOIN tblusuarios u ON s.Id_Usuario = u.Id_Usuario
            WHERE $where
            ORDER BY s.Id_Sesion DESC
        ");
        $stmt->execute($params);
        $sesiones = $stmt->fetchAll();

        // Movimientos de caja principal del período
        $stmt2 = $db->prepare("
            SELECT m.*, u.Nombre as NombreUsuario, co.Nombre as CajaOrigen, cd.Nombre as CajaDestino
            FROM tblmov_caja m
            LEFT JOIN tblusuarios u ON m.Id_Usuario = u.Id_Usuario
            LEFT JOIN tblcajas co ON m.Id_Caja_Origen = co.Id_Caja
            LEFT JOIN tblcajas cd ON m.Id_Caja_Destino = cd.Id_Caja
            WHERE DATE(m.Fecha) BETWEEN ? AND ?
            ORDER BY m.Fecha DESC
        ");
        $stmt2->execute([$desde, $hasta]);
        $movimientos = $stmt2->fetchAll();

        // Cajas
        $cajas = $db->query("SELECT * FROM tblcajas WHERE Activa = 1 ORDER BY Id_Caja")->fetchAll();

        // Resumen del período
        $totalVentas = 0; $totalPagos = 0; $totalEgresos = 0; $totalRetiros = 0;
        foreach ($sesiones as $s) {
            $totalVentas += floatval($s['VentasContadoEfectivo']) + floatval($s['VentasContadoTransf']);
            $totalPagos += floatval($s['PagosEfectivo']) + floatval($s['PagosTransf']);
            $totalEgresos += floatval($s['Egresos']);
            $totalRetiros += floatval($s['RetirosParciales']);
        }

        echo json_encode([
            'success' => true,
            'sesiones' => $sesiones,
            'movimientos' => $movimientos,
            'cajas' => $cajas,
            'resumen' => [
                'total_sesiones' => count($sesiones),
                'total_ventas' => $totalVentas,
                'total_pagos' => $totalPagos,
                'total_egresos' => $totalEgresos,
                'total_retiros' => $totalRetiros
            ]
        ], JSON_UNESCAPED_UNICODE);

    } elseif ($_SERVER['REQUEST_METHOD'] === 'POST') {
        $data = json_decode(file_get_contents('php://input'), true);
        $action = $data['action'] ?? '';

        if ($action === 'ingreso' || $action === 'egreso') {
            $cajaId = intval($data['caja_id'] ?? 0);
            $valor = floatval($data['valor'] ?? 0);
            $descripcion = $data['descripcion'] ?? '';
            $usuarioId = intval($data['usuario_id'] ?? 0);

            if ($valor <= 0) { echo json_encode(['success' => false, 'message' => 'Valor requerido']); exit; }
            if (!$descripcion) { echo json_encode(['success' => false, 'message' => 'Descripción requerida']); exit; }

            // Find active session for this caja (if any)
            $stmt = $db->prepare("SELECT Id_Sesion FROM tblsesiones_caja WHERE Id_Caja = ? AND Estado = 'abierta' LIMIT 1");
            $stmt->execute([$cajaId]);
            $sesion = $stmt->fetch();
            $sesionId = $sesion ? $sesion['Id_Sesion'] : null;

            if ($action === 'ingreso') {
                $db->prepare("INSERT INTO tblmov_caja (Id_Sesion, Id_Caja_Destino, Id_Usuario, Valor, Tipo, Descripcion) VALUES (?, ?, ?, ?, 'deposito', ?)")
                   ->execute([$sesionId, $cajaId, $usuarioId, $valor, $descripcion]);
                $db->prepare("UPDATE tblcajas SET Saldo = Saldo + ? WHERE Id_Caja = ?")->execute([$valor, $cajaId]);
                echo json_encode(['success' => true, 'message' => 'Ingreso de $' . number_format($valor, 0, ',', '.') . ' registrado'], JSON_UNESCAPED_UNICODE);
            } else {
                $db->prepare("INSERT INTO tblmov_caja (Id_Sesion, Id_Caja_Origen, Id_Usuario, Valor, Tipo, Descripcion) VALUES (?, ?, ?, ?, 'gasto', ?)")
                   ->execute([$sesionId, $cajaId, $usuarioId, $valor, $descripcion]);
                $db->prepare("UPDATE tblcajas SET Saldo = Saldo - ? WHERE Id_Caja = ?")->execute([$valor, $cajaId]);
                echo json_encode(['success' => true, 'message' => 'Egreso de $' . number_format($valor, 0, ',', '.') . ' registrado'], JSON_UNESCAPED_UNICODE);
            }

        } elseif ($action === 'trasladar') {
            // Trasladar manual de una sesión cerrada a caja principal
            $sesionId = intval($data['sesion_id'] ?? 0);
            $valor = floatval($data['valor'] ?? 0);
            $usuarioId = intval($data['usuario_id'] ?? 0);

            if (!$sesionId || $valor <= 0) { echo json_encode(['success' => false, 'message' => 'Sesión y valor requeridos']); exit; }

            $stmt = $db->prepare("SELECT s.*, c.Nombre as NombreCaja FROM tblsesiones_caja s LEFT JOIN tblcajas c ON s.Id_Caja = c.Id_Caja WHERE s.Id_Sesion = ? AND s.Estado = 'cerrada'");
            $stmt->execute([$sesionId]);
            $sesion = $stmt->fetch();
            if (!$sesion) { echo json_encode(['success' => false, 'message' => 'Sesión no encontrada o no está cerrada']); exit; }

            $stmt = $db->query("SELECT Id_Caja FROM tblcajas WHERE Tipo = 'principal' AND Activa = 1 LIMIT 1");
            $cajaPrincipal = $stmt->fetch();
            if (!$cajaPrincipal) { echo json_encode(['success' => false, 'message' => 'No hay caja principal configurada']); exit; }

            $db->prepare("INSERT INTO tblmov_caja (Id_Sesion, Id_Caja_Origen, Id_Caja_Destino, Id_Usuario, Valor, Tipo, Descripcion) VALUES (?, ?, ?, ?, ?, 'traslado', ?)")
               ->execute([$sesionId, $sesion['Id_Caja'], $cajaPrincipal['Id_Caja'], $usuarioId, $valor, "Traslado manual - {$sesion['NombreCaja']} Sesión #$sesionId"]);
            $db->prepare("UPDATE tblcajas SET Saldo = Saldo + ? WHERE Id_Caja = ?")->execute([$valor, $cajaPrincipal['Id_Caja']]);

            echo json_encode(['success' => true, 'message' => 'Trasladado $' . number_format($valor, 0, ',', '.') . ' a Caja Principal'], JSON_UNESCAPED_UNICODE);

        } elseif ($action === 'nota') {
            $sesionId = intval($data['sesion_id'] ?? 0);
            $observacion = $data['observacion'] ?? '';
            if (!$sesionId || !$observacion) { echo json_encode(['success' => false, 'message' => 'Sesión y observación requeridas']); exit; }
            $db->prepare("UPDATE tblsesiones_caja SET Observacion = ? WHERE Id_Sesion = ?")->execute([$observacion, $sesionId]);
            echo json_encode(['success' => true, 'message' => 'Nota guardada']);
        }
    }
} catch (Exception $e) {
    echo json_encode(['success' => false, 'message' => $e->getMessage()]);
}
?>
