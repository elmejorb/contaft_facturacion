<?php
/**
 * Estado y operaciones de caja
 * GET                  → estado actual de la caja (abierta/cerrada) + resumen del día
 * GET ?historial=1     → historial de cajas cerradas
 * POST action=abrir    → abrir caja con base
 * POST action=cerrar   → cerrar caja con conteo
 * POST action=modificar_base → modificar base de caja abierta
 */
require_once '../config/database.php';
$database = new Database();
$db = $database->getConnection();

try {
    if ($_SERVER['REQUEST_METHOD'] === 'GET') {
        if (isset($_GET['historial'])) {
            // Historial de cajas
            $stmt = $db->query("
                SELECT c.*, u.Nombre as NombreUsuario
                FROM tblcontrolcaja c
                LEFT JOIN tblusuarios u ON c.Id_Usuario = u.Id_Usuario
                ORDER BY c.Cod_ControlCaja DESC
                LIMIT 50
            ");
            echo json_encode(['success' => true, 'cajas' => $stmt->fetchAll()], JSON_UNESCAPED_UNICODE);
            exit;
        }

        // Estado actual: buscar caja abierta (Estado = 1)
        $stmt = $db->query("SELECT * FROM tblcontrolcaja WHERE Estado = 1 ORDER BY Cod_ControlCaja DESC LIMIT 1");
        $cajaAbierta = $stmt->fetch();

        if (!$cajaAbierta) {
            echo json_encode(['success' => true, 'abierta' => false, 'caja' => null, 'resumen' => null]);
            exit;
        }

        $fechaCaja = date('Y-m-d', strtotime($cajaAbierta['Fecha']));
        $base = floatval($cajaAbierta['Base']);

        // Calcular resumen del día desde la apertura
        // Ventas al contado (efectivo)
        $stmt = $db->prepare("SELECT COALESCE(SUM(efectivo), 0) as efectivo, COALESCE(SUM(valorpagado1), 0) as transferencia, COALESCE(SUM(Total), 0) as total, COUNT(*) as cantidad FROM tblventas WHERE DATE(Fecha) = ? AND EstadoFact = 'Valida' AND Tipo = 'Contado'");
        $stmt->execute([$fechaCaja]);
        $ventasContado = $stmt->fetch();

        // Ventas a crédito
        $stmt = $db->prepare("SELECT COALESCE(SUM(Total), 0) as total, COUNT(*) as cantidad FROM tblventas WHERE DATE(Fecha) = ? AND EstadoFact = 'Valida' AND Tipo != 'Contado'");
        $stmt->execute([$fechaCaja]);
        $ventasCredito = $stmt->fetch();

        // Ventas por medio de pago
        $stmt = $db->prepare("
            SELECT COALESCE(m.nombre_medio, 'Efectivo') as medio, COALESCE(SUM(v.Total), 0) as total
            FROM tblventas v
            LEFT JOIN tblmedios_pago m ON v.id_mediopago = m.id_mediopago
            WHERE DATE(v.Fecha) = ? AND v.EstadoFact = 'Valida' AND v.Tipo = 'Contado'
            GROUP BY v.id_mediopago, m.nombre_medio
        ");
        $stmt->execute([$fechaCaja]);
        $ventasPorMedio = $stmt->fetchAll();

        // Pagos recibidos de clientes
        $stmt = $db->prepare("
            SELECT COALESCE(SUM(CASE WHEN p.id_mediopago = 0 THEN p.ValorPago ELSE 0 END), 0) as efectivo,
                   COALESCE(SUM(CASE WHEN p.id_mediopago > 0 THEN p.ValorPago ELSE 0 END), 0) as transferencia,
                   COALESCE(SUM(p.ValorPago), 0) as total,
                   COUNT(*) as cantidad
            FROM tblpagos p
            WHERE DATE(p.Fecha) = ? AND p.Estado = 'Valida'
        ");
        $stmt->execute([$fechaCaja]);
        $pagos = $stmt->fetch();

        // Egresos (pagos a proveedores + gastos)
        $stmt = $db->prepare("SELECT COALESCE(SUM(Valor), 0) as total, COUNT(*) as cantidad FROM tblegresos WHERE DATE(Fecha) = ? AND Estado = 'Valida'");
        $stmt->execute([$fechaCaja]);
        $egresos = $stmt->fetch();

        // Devoluciones / Anulaciones de ventas
        $stmt = $db->prepare("SELECT COALESCE(SUM(Total), 0) as total, COUNT(*) as cantidad FROM tblventas WHERE DATE(Fecha) = ? AND EstadoFact = 'Anulada'");
        $stmt->execute([$fechaCaja]);
        $anulaciones = $stmt->fetch();

        // Pagos anulados
        $stmt = $db->prepare("SELECT COALESCE(SUM(ValorPago), 0) as total, COUNT(*) as cantidad FROM tblpagos WHERE DATE(Fecha) = ? AND Estado = 'Anulada'");
        $stmt->execute([$fechaCaja]);
        $pagosAnulados = $stmt->fetch();

        // Total en efectivo = Base + Ventas contado efectivo + Pagos efectivo - Egresos - Devoluciones
        $totalEfectivo = $base
            + floatval($ventasContado['efectivo'])
            + floatval($pagos['efectivo'])
            - floatval($egresos['total'])
            - floatval($anulaciones['total'])
            - floatval($pagosAnulados['total']);

        // Total venta del día
        $totalVentaDia = floatval($ventasContado['total']) + floatval($ventasCredito['total']);

        echo json_encode([
            'success' => true,
            'abierta' => true,
            'caja' => $cajaAbierta,
            'resumen' => [
                'fecha' => $fechaCaja,
                'base' => $base,
                'ventas_contado_efectivo' => floatval($ventasContado['efectivo']),
                'ventas_contado_transferencia' => floatval($ventasContado['transferencia']),
                'ventas_contado_total' => floatval($ventasContado['total']),
                'ventas_contado_cantidad' => intval($ventasContado['cantidad']),
                'ventas_credito' => floatval($ventasCredito['total']),
                'ventas_credito_cantidad' => intval($ventasCredito['cantidad']),
                'ventas_por_medio' => $ventasPorMedio,
                'pagos_efectivo' => floatval($pagos['efectivo']),
                'pagos_transferencia' => floatval($pagos['transferencia']),
                'pagos_total' => floatval($pagos['total']),
                'pagos_cantidad' => intval($pagos['cantidad']),
                'egresos' => floatval($egresos['total']),
                'egresos_cantidad' => intval($egresos['cantidad']),
                'anulaciones' => floatval($anulaciones['total']),
                'anulaciones_cantidad' => intval($anulaciones['cantidad']),
                'pagos_anulados' => floatval($pagosAnulados['total']),
                'total_efectivo' => $totalEfectivo,
                'total_venta_dia' => $totalVentaDia
            ]
        ], JSON_UNESCAPED_UNICODE);

    } elseif ($_SERVER['REQUEST_METHOD'] === 'POST') {
        $data = json_decode(file_get_contents('php://input'), true);
        $action = $data['action'] ?? '';

        if ($action === 'abrir') {
            // Verificar que no haya caja abierta
            $stmt = $db->query("SELECT Cod_ControlCaja FROM tblcontrolcaja WHERE Estado = 1 LIMIT 1");
            $cajaExistente = $stmt->fetch();

            $base = floatval($data['base'] ?? 0);
            $usuario = intval($data['usuario'] ?? 0);
            $hoy = date('Y-m-d');

            if ($cajaExistente) {
                // Ya hay caja abierta — actualizar la base (como en VB6)
                $db->prepare("UPDATE tblcontrolcaja SET Base = ? WHERE Cod_ControlCaja = ?")
                   ->execute([$base, $cajaExistente['Cod_ControlCaja']]);
                echo json_encode(['success' => true, 'message' => 'Base actualizada a $' . number_format($base, 0, ',', '.'), 'id' => $cajaExistente['Cod_ControlCaja']]);
                exit;
            }

            // Buscar si ya existe registro para hoy (cerrado) — reabrir
            $stmt = $db->prepare("SELECT Cod_ControlCaja FROM tblcontrolcaja WHERE DATE(Fecha) = ? AND Estado = 0 LIMIT 1");
            $stmt->execute([$hoy]);
            $cajaHoy = $stmt->fetch();

            if ($cajaHoy) {
                $db->prepare("UPDATE tblcontrolcaja SET Base = ?, Estado = 1, FechaCierre = NULL WHERE Cod_ControlCaja = ?")
                   ->execute([$base, $cajaHoy['Cod_ControlCaja']]);
                echo json_encode(['success' => true, 'message' => 'Caja reabierta con base de $' . number_format($base, 0, ',', '.'), 'id' => $cajaHoy['Cod_ControlCaja']]);
                exit;
            }

            // Crear nueva
            $stmt = $db->prepare("INSERT INTO tblcontrolcaja (Fecha, Base, Estado, Id_Usuario) VALUES (NOW(), ?, 1, ?)");
            $stmt->execute([$base, $usuario]);
            echo json_encode(['success' => true, 'message' => 'Caja abierta con base de $' . number_format($base, 0, ',', '.'), 'id' => $db->lastInsertId()]);

        } elseif ($action === 'cerrar') {
            $stmt = $db->query("SELECT * FROM tblcontrolcaja WHERE Estado = 1 ORDER BY Cod_ControlCaja DESC LIMIT 1");
            $caja = $stmt->fetch();
            if (!$caja) { echo json_encode(['success' => false, 'message' => 'No hay caja abierta']); exit; }

            $conteo = floatval($data['conteo'] ?? 0);
            $billetes = floatval($data['billetes'] ?? 0);
            $monedas = floatval($data['monedas'] ?? 0);
            $cheques = floatval($data['cheques'] ?? 0);

            // Get the current totals (same as GET above)
            $fechaCaja = date('Y-m-d', strtotime($caja['Fecha']));
            $base = floatval($caja['Base']);

            $stmt = $db->prepare("SELECT COALESCE(SUM(efectivo), 0) as ef, COALESCE(SUM(valorpagado1), 0) as tr, COALESCE(SUM(Total), 0) as t FROM tblventas WHERE DATE(Fecha) = ? AND EstadoFact = 'Valida' AND Tipo = 'Contado'");
            $stmt->execute([$fechaCaja]);
            $vc = $stmt->fetch();

            $stmt = $db->prepare("SELECT COALESCE(SUM(Total), 0) as t FROM tblventas WHERE DATE(Fecha) = ? AND EstadoFact = 'Valida' AND Tipo != 'Contado'");
            $stmt->execute([$fechaCaja]);
            $vcr = $stmt->fetch();

            $stmt = $db->prepare("SELECT COALESCE(SUM(CASE WHEN id_mediopago = 0 THEN ValorPago ELSE 0 END), 0) as ef, COALESCE(SUM(ValorPago), 0) as t FROM tblpagos WHERE DATE(Fecha) = ? AND Estado = 'Valida'");
            $stmt->execute([$fechaCaja]);
            $pg = $stmt->fetch();

            $stmt = $db->prepare("SELECT COALESCE(SUM(Valor), 0) as t FROM tblegresos WHERE DATE(Fecha) = ? AND Estado = 'Valida'");
            $stmt->execute([$fechaCaja]);
            $eg = $stmt->fetch();

            $totalEfectivo = $base + floatval($vc['ef']) + floatval($pg['ef']) - floatval($eg['t']);
            $diferencia = $conteo - $totalEfectivo;

            $db->prepare("
                UPDATE tblcontrolcaja SET
                    ValorInicalCaja = ?, Villetes = ?, Monedas = ?, Cheques = ?,
                    ValorTotal = ?, SaldoEnLibros = ?, Diferencia = ?,
                    VContado = ?, VCredito = ?, Pagos = ?, Egresos = ?,
                    Estado = 0, FechaCierre = NOW()
                WHERE Cod_ControlCaja = ?
            ")->execute([
                $base, $billetes, $monedas, $cheques,
                $conteo, $totalEfectivo, $diferencia,
                floatval($vc['t']), floatval($vcr['t']), floatval($pg['t']), floatval($eg['t']),
                $caja['Cod_ControlCaja']
            ]);

            $msg = $diferencia == 0 ? 'Caja cerrada. Cuadre perfecto.'
                : ($diferencia > 0 ? 'Caja cerrada. Sobrante: $' . number_format($diferencia, 0, ',', '.')
                : 'Caja cerrada. Faltante: $' . number_format(abs($diferencia), 0, ',', '.'));

            echo json_encode([
                'success' => true,
                'message' => $msg,
                'diferencia' => $diferencia,
                'total_efectivo_sistema' => $totalEfectivo,
                'conteo' => $conteo
            ], JSON_UNESCAPED_UNICODE);

        } elseif ($action === 'modificar_base') {
            $stmt = $db->query("SELECT * FROM tblcontrolcaja WHERE Estado = 1 ORDER BY Cod_ControlCaja DESC LIMIT 1");
            $caja = $stmt->fetch();
            if (!$caja) { echo json_encode(['success' => false, 'message' => 'No hay caja abierta']); exit; }

            $nuevaBase = floatval($data['base'] ?? 0);
            $db->prepare("UPDATE tblcontrolcaja SET Base = ? WHERE Cod_ControlCaja = ?")->execute([$nuevaBase, $caja['Cod_ControlCaja']]);
            echo json_encode(['success' => true, 'message' => 'Base actualizada a $' . number_format($nuevaBase, 0, ',', '.')]);
        }
    }
} catch (Exception $e) {
    echo json_encode(['success' => false, 'message' => $e->getMessage()]);
}
?>
