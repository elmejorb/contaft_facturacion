<?php
/**
 * Informe por vendedor — pedidos + facturas.
 * GET ?desde=YYYY-MM-DD&hasta=YYYY-MM-DD[&vendedor_id=N]
 *
 * Devuelve:
 *   - resumen[]: por cada vendedor, cuántos pedidos, cuántas facturas, montos
 *     desglosados por forma de pago (contado/crédito) y estado.
 *   - detalle: cuando se filtra vendedor_id → lista completa de pedidos +
 *     facturas de ese vendedor en el rango.
 *   - totales: sumas globales.
 */
require_once '../config/database.php';

$database = new Database();
$db = $database->getConnection();

try {
    $desde = trim($_GET['desde'] ?? date('Y-m-01'));   // default: mes actual
    $hasta = trim($_GET['hasta'] ?? date('Y-m-d'));
    $vendedorId = intval($_GET['vendedor_id'] ?? 0);

    // ------------------------------------------------------------------
    // 1. Vendedores base — todos los que estén en tbl_vendedores_movil
    //    (con conteos que se llenan más abajo)
    // ------------------------------------------------------------------
    $vendedores = $db->query("
        SELECT vm.id, vm.codigo, vm.nombre, vm.zona, vm.email,
               vm.id_remoto AS codigo_emp,
               vm.activo,
               TRIM(CONCAT(COALESCE(e.Nombres,''), ' ', COALESCE(e.Apellidos,''))) AS empleado_nombre
        FROM tbl_vendedores_movil vm
        LEFT JOIN tblempleados e ON e.CodigoEmp = vm.id_remoto
        ORDER BY vm.codigo
    ")->fetchAll();

    // ------------------------------------------------------------------
    // 2. Agregados de pedidos por vendedor en el rango
    // ------------------------------------------------------------------
    $stmt = $db->prepare("
        SELECT id_vendedor_remoto AS id_vend,
               COUNT(*) AS pedidos_total,
               SUM(CASE WHEN estado = 'pendiente' THEN 1 ELSE 0 END) AS pedidos_pendientes,
               SUM(CASE WHEN estado = 'procesado' THEN 1 ELSE 0 END) AS pedidos_procesados,
               SUM(CASE WHEN estado = 'anulado'   THEN 1 ELSE 0 END) AS pedidos_anulados,
               SUM(CASE WHEN forma_pago = 'contado' THEN total ELSE 0 END) AS monto_contado,
               SUM(CASE WHEN forma_pago = 'credito' THEN total ELSE 0 END) AS monto_credito,
               SUM(total) AS monto_total
        FROM tbl_pedidos_vendedor
        WHERE fecha BETWEEN ? AND ?
        GROUP BY id_vendedor_remoto
    ");
    $stmt->execute([$desde, $hasta]);
    $pedidosPorVend = [];
    foreach ($stmt->fetchAll() as $row) {
        $pedidosPorVend[(int)$row['id_vend']] = $row;
    }

    // ------------------------------------------------------------------
    // 3. Agregados de facturas (tblventas) — ligadas por convertido_factura_n
    //    del pedido → vendedor.
    // ------------------------------------------------------------------
    $stmt = $db->prepare("
        SELECT p.id_vendedor_remoto AS id_vend,
               COUNT(v.Factura_N) AS facturas_total,
               SUM(CASE WHEN v.Tipo = 'Contado' THEN v.Total ELSE 0 END) AS fact_contado,
               SUM(CASE WHEN v.Tipo = 'Crédito' OR v.Tipo = 'Credito' THEN v.Total ELSE 0 END) AS fact_credito,
               SUM(v.Total) AS fact_total
        FROM tblventas v
        INNER JOIN tbl_pedidos_vendedor p ON p.convertido_factura_n = v.Factura_N
        WHERE DATE(v.Fecha) BETWEEN ? AND ?
          AND v.EstadoFact = 'Valida'
        GROUP BY p.id_vendedor_remoto
    ");
    $stmt->execute([$desde, $hasta]);
    $facturasPorVend = [];
    foreach ($stmt->fetchAll() as $row) {
        $facturasPorVend[(int)$row['id_vend']] = $row;
    }

    // ------------------------------------------------------------------
    // 4. Combinar en resumen[]
    // ------------------------------------------------------------------
    $resumen = [];
    $tot = ['pedidos' => 0, 'facturas' => 0, 'contado' => 0, 'credito' => 0, 'total' => 0];

    foreach ($vendedores as $v) {
        $vid = (int)$v['id'];
        $p = $pedidosPorVend[$vid] ?? null;
        $f = $facturasPorVend[$vid] ?? null;

        $pedTotal    = intval($p['pedidos_total'] ?? 0);
        $pedPend     = intval($p['pedidos_pendientes'] ?? 0);
        $pedProc     = intval($p['pedidos_procesados'] ?? 0);
        $pedAnul     = intval($p['pedidos_anulados'] ?? 0);
        $factTotal   = intval($f['facturas_total'] ?? 0);
        $montoTotal  = floatval($p['monto_total'] ?? 0);
        $montoContado = floatval($p['monto_contado'] ?? 0);
        $montoCredito = floatval($p['monto_credito'] ?? 0);

        // Si no hay actividad y no se filtra vendedor específico, omitir para
        // no llenar la tabla con vendedores sin movimiento.
        if ($pedTotal === 0 && $factTotal === 0 && $vendedorId === 0) continue;
        if ($vendedorId > 0 && $vid !== $vendedorId) continue;

        $resumen[] = [
            'id_vendedor'    => $vid,
            'codigo'         => $v['codigo'],
            'nombre'         => $v['nombre'],
            'zona'           => $v['zona'],
            'empleado_nombre'=> $v['empleado_nombre'] ?: null,
            'codigo_emp'     => $v['codigo_emp'] ? intval($v['codigo_emp']) : null,
            'activo'         => (bool)$v['activo'],
            'pedidos_total'      => $pedTotal,
            'pedidos_pendientes' => $pedPend,
            'pedidos_procesados' => $pedProc,
            'pedidos_anulados'   => $pedAnul,
            'facturas_total'     => $factTotal,
            'monto_contado'      => $montoContado,
            'monto_credito'      => $montoCredito,
            'monto_total'        => $montoTotal,
            'facturado_total'    => floatval($f['fact_total'] ?? 0),
            'facturado_contado'  => floatval($f['fact_contado'] ?? 0),
            'facturado_credito'  => floatval($f['fact_credito'] ?? 0),
        ];

        $tot['pedidos']  += $pedTotal;
        $tot['facturas'] += $factTotal;
        $tot['contado']  += $montoContado;
        $tot['credito']  += $montoCredito;
        $tot['total']    += $montoTotal;
    }

    // Ordenar por monto vendido DESC (los top vendedores primero)
    usort($resumen, function($a, $b) {
        return ($b['monto_total'] ?? 0) <=> ($a['monto_total'] ?? 0);
    });

    // ------------------------------------------------------------------
    // 5. Detalle: si se filtra vendedor_id, devolver también sus pedidos y
    //    facturas para drill-down en la UI.
    // ------------------------------------------------------------------
    $detallePedidos = [];
    $detalleFacturas = [];
    if ($vendedorId > 0) {
        $stmt = $db->prepare("
            SELECT id, numero_pedido, fecha, nombre_cliente, total, forma_pago,
                   estado, convertido_factura_n
            FROM tbl_pedidos_vendedor
            WHERE id_vendedor_remoto = ?
              AND fecha BETWEEN ? AND ?
            ORDER BY fecha DESC, id DESC
        ");
        $stmt->execute([$vendedorId, $desde, $hasta]);
        $detallePedidos = $stmt->fetchAll();

        $stmt = $db->prepare("
            SELECT v.Factura_N, DATE(v.Fecha) AS fecha, v.A_nombre AS cliente, v.Total,
                   v.Tipo, v.EstadoFact, p.numero_pedido
            FROM tblventas v
            INNER JOIN tbl_pedidos_vendedor p ON p.convertido_factura_n = v.Factura_N
            WHERE p.id_vendedor_remoto = ?
              AND DATE(v.Fecha) BETWEEN ? AND ?
            ORDER BY v.Fecha DESC, v.Factura_N DESC
        ");
        $stmt->execute([$vendedorId, $desde, $hasta]);
        $detalleFacturas = $stmt->fetchAll();
    }

    echo json_encode([
        'success'  => true,
        'desde'    => $desde,
        'hasta'    => $hasta,
        'resumen'  => $resumen,
        'totales'  => $tot,
        'detalle_pedidos'  => $detallePedidos,
        'detalle_facturas' => $detalleFacturas,
    ], JSON_UNESCAPED_UNICODE);
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => $e->getMessage()], JSON_UNESCAPED_UNICODE);
}
