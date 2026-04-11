<?php
/**
 * Detalle de producto: compras, ventas, devoluciones, estadísticas, clientes
 * GET ?items=N&anio=2026
 */
require_once '../config/database.php';
$database = new Database();
$db = $database->getConnection();

try {
    $items = intval($_GET['items'] ?? 0);
    $anio = $_GET['anio'] ?? date('Y');
    $mes = $_GET['mes'] ?? null;
    if (!$items) { echo json_encode(['success' => false, 'message' => 'Items requerido']); exit; }

    $filtroMesVentas = $mes ? " AND MONTH(v.Fecha) = $mes" : "";
    $filtroMesPedidos = $mes ? " AND MONTH(pe.Fecha) = $mes" : "";

    // Datos del producto
    $stmt = $db->prepare("SELECT a.*, COALESCE(c.Categoria, 'VARIOS') as Categoria, COALESCE(p.RazonSocial, '') as Proveedor FROM tblarticulos a LEFT JOIN tblcategoria c ON a.Id_Categoria = c.Id_Categoria LEFT JOIN tblproveedores p ON a.CodigoPro = p.CodigoPro WHERE a.Items = ?");
    $stmt->execute([$items]);
    $producto = $stmt->fetch();
    if (!$producto) { echo json_encode(['success' => false, 'message' => 'Producto no encontrado']); exit; }

    // Compras del año
    $stmt = $db->prepare("
        SELECT dp.Pedido_N, dp.Cantidad, dp.PrecioC, dp.Subtotal,
               pe.Fecha, pe.FacturaCompra_N, pr.RazonSocial as Proveedor
        FROM tbldetalle_pedido dp
        INNER JOIN tblpedidos pe ON dp.Pedido_N = pe.Pedido_N
        LEFT JOIN tblproveedores pr ON pe.CodigoPro = pr.CodigoPro
        WHERE dp.Items = ? AND YEAR(pe.Fecha) = ? $filtroMesPedidos
        ORDER BY pe.Fecha DESC
    ");
    $stmt->execute([$items, $anio]);
    $compras = $stmt->fetchAll();
    $totalCompras = array_sum(array_column($compras, 'Cantidad'));

    // Ventas del año
    $stmt = $db->prepare("
        SELECT dv.Factura_N, dv.Cantidad, dv.PrecioV, dv.Subtotal, dv.Dev,
               v.Fecha, v.A_nombre as Cliente, v.Tipo
        FROM tbldetalle_venta dv
        INNER JOIN tblventas v ON dv.Factura_N = v.Factura_N
        WHERE dv.Items = ? AND YEAR(v.Fecha) = ? AND v.EstadoFact = 'Valida' $filtroMesVentas
        ORDER BY v.Fecha DESC
    ");
    $stmt->execute([$items, $anio]);
    $ventas = $stmt->fetchAll();
    $totalVentas = array_sum(array_column($ventas, 'Cantidad'));
    $totalVentasMonto = array_sum(array_column($ventas, 'Subtotal'));

    // Devoluciones
    $stmt = $db->prepare("
        SELECT dv.Factura_N, dv.Dev, dv.PrecioV, v.Fecha, v.A_nombre as Cliente,
               dev.valor_dev, dev.fecha_mod
        FROM tbldetalle_venta dv
        INNER JOIN tblventas v ON dv.Factura_N = v.Factura_N
        LEFT JOIN tbldevolucion_ventas dev ON dev.Id_DetalleVenta = dv.Id_DetalleVenta
        WHERE dv.Items = ? AND dv.Dev > 0 AND YEAR(v.Fecha) = ? $filtroMesVentas
        ORDER BY v.Fecha DESC
    ");
    $stmt->execute([$items, $anio]);
    $devoluciones = $stmt->fetchAll();
    $totalDev = array_sum(array_column($devoluciones, 'Dev'));

    // Estadísticas por mes
    $stmt = $db->prepare("
        SELECT MONTH(v.Fecha) as mes,
               SUM(dv.Cantidad) as cantidad,
               SUM(dv.Subtotal) as monto,
               COUNT(DISTINCT dv.Factura_N) as facturas
        FROM tbldetalle_venta dv
        INNER JOIN tblventas v ON dv.Factura_N = v.Factura_N
        WHERE dv.Items = ? AND YEAR(v.Fecha) = ? AND v.EstadoFact = 'Valida'
        GROUP BY MONTH(v.Fecha)
        ORDER BY mes
    ");
    $stmt->execute([$items, $anio]);
    $estadisticasRaw = $stmt->fetchAll();

    $meses = ['','Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
    $estadisticas = [];
    $estMap = [];
    foreach ($estadisticasRaw as $e) $estMap[intval($e['mes'])] = $e;
    for ($i = 1; $i <= 12; $i++) {
        $estadisticas[] = [
            'mes' => $i,
            'nombre' => $meses[$i],
            'cantidad' => floatval($estMap[$i]['cantidad'] ?? 0),
            'monto' => floatval($estMap[$i]['monto'] ?? 0),
            'facturas' => intval($estMap[$i]['facturas'] ?? 0)
        ];
    }

    // Top clientes que compran este producto
    $stmt = $db->prepare("
        SELECT v.CodigoCli, v.A_nombre as Cliente,
               SUM(dv.Cantidad) as total_cantidad,
               SUM(dv.Subtotal) as total_monto,
               COUNT(DISTINCT dv.Factura_N) as veces_comprado,
               MAX(v.Fecha) as ultima_compra
        FROM tbldetalle_venta dv
        INNER JOIN tblventas v ON dv.Factura_N = v.Factura_N
        WHERE dv.Items = ? AND YEAR(v.Fecha) = ? AND v.EstadoFact = 'Valida' $filtroMesVentas
        GROUP BY v.CodigoCli, v.A_nombre
        ORDER BY total_cantidad DESC
        LIMIT 20
    ");
    $stmt->execute([$items, $anio]);
    $clientes = $stmt->fetchAll();

    // Años disponibles
    $stmt = $db->prepare("SELECT DISTINCT YEAR(v.Fecha) as a FROM tbldetalle_venta dv INNER JOIN tblventas v ON dv.Factura_N = v.Factura_N WHERE dv.Items = ? ORDER BY a DESC");
    $stmt->execute([$items]);
    $anios = array_column($stmt->fetchAll(), 'a');

    echo json_encode([
        'success' => true,
        'producto' => $producto,
        'compras' => $compras,
        'ventas' => $ventas,
        'devoluciones' => $devoluciones,
        'estadisticas' => $estadisticas,
        'clientes' => $clientes,
        'anios' => $anios,
        'resumen' => [
            'total_compras' => $totalCompras,
            'total_ventas' => $totalVentas,
            'total_ventas_monto' => $totalVentasMonto,
            'total_devoluciones' => $totalDev
        ]
    ], JSON_UNESCAPED_UNICODE);

} catch (Exception $e) {
    echo json_encode(['success' => false, 'message' => $e->getMessage()]);
}
?>
