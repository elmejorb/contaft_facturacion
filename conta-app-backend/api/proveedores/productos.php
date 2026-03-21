<?php
/**
 * Productos por proveedor con rotación en rango de fechas
 * GET ?proveedor=X&desde=2026-01-01&hasta=2026-03-19
 */

require_once '../config/database.php';

$database = new Database();
$db = $database->getConnection();

try {
    $provId = $_GET['proveedor'] ?? null;
    $desde = $_GET['desde'] ?? date('Y-m-01');
    $hasta = $_GET['hasta'] ?? date('Y-m-d');

    if (!$provId) {
        // Return list of suppliers for select
        $stmt = $db->query("
            SELECT p.CodigoPro, p.RazonSocial, COUNT(a.Items) as Total_Productos
            FROM tblproveedores p
            INNER JOIN tblarticulos a ON p.CodigoPro = a.CodigoPro AND a.Estado = 1
            GROUP BY p.CodigoPro, p.RazonSocial
            ORDER BY p.RazonSocial
        ");
        echo json_encode(["success" => true, "proveedores" => $stmt->fetchAll()], JSON_UNESCAPED_UNICODE);
        exit;
    }

    // Proveedor info
    $stmt = $db->prepare("SELECT CodigoPro, RazonSocial, Nit FROM tblproveedores WHERE CodigoPro = :id");
    $stmt->execute([':id' => $provId]);
    $prov = $stmt->fetch();

    // Products of this supplier
    $stmt = $db->prepare("
        SELECT a.Items, a.Codigo, a.Nombres_Articulo, a.Existencia, a.Existencia_minima,
               a.Precio_Costo, a.Precio_Venta,
               COALESCE(v.Cantidad_Vendida, 0) as Cantidad_Vendida,
               COALESCE(v.Veces_Vendido, 0) as Veces_Vendido,
               COALESCE(v.Monto_Vendido, 0) as Monto_Vendido
        FROM tblarticulos a
        LEFT JOIN (
            SELECT d.Items,
                   SUM(d.Cantidad) as Cantidad_Vendida,
                   COUNT(DISTINCT d.Factura_N) as Veces_Vendido,
                   SUM(d.Subtotal) as Monto_Vendido
            FROM tbldetalle_venta d
            INNER JOIN tblventas v ON d.Factura_N = v.Factura_N
            WHERE v.Fecha BETWEEN :desde AND :hasta
            GROUP BY d.Items
        ) v ON a.Items = v.Items
        WHERE a.CodigoPro = :prov AND a.Estado = 1
        ORDER BY Cantidad_Vendida DESC
    ");
    $stmt->execute([':prov' => $provId, ':desde' => $desde, ':hasta' => $hasta . ' 23:59:59']);
    $productos = $stmt->fetchAll();

    $dias = max(1, (strtotime($hasta) - strtotime($desde)) / 86400);

    foreach ($productos as &$p) {
        $p['Existencia'] = floatval($p['Existencia']);
        $p['Existencia_minima'] = floatval($p['Existencia_minima']);
        $p['Precio_Costo'] = floatval($p['Precio_Costo']);
        $p['Precio_Venta'] = floatval($p['Precio_Venta']);
        $p['Cantidad_Vendida'] = floatval($p['Cantidad_Vendida']);
        $p['Veces_Vendido'] = intval($p['Veces_Vendido']);
        $p['Monto_Vendido'] = floatval($p['Monto_Vendido']);
        // Rotación diaria
        $p['Rotacion_Diaria'] = round($p['Cantidad_Vendida'] / $dias, 2);
        // Días de stock
        $p['Dias_Stock'] = $p['Rotacion_Diaria'] > 0 ? round($p['Existencia'] / $p['Rotacion_Diaria'], 0) : 999;
        // Sugerido a pedir
        $p['Sugerido'] = $p['Rotacion_Diaria'] > 0 ? max(0, round(($p['Rotacion_Diaria'] * 30) - $p['Existencia'], 0)) : 0;
    }

    $totalProductos = count($productos);
    $totalVendidos = count(array_filter($productos, fn($p) => $p['Cantidad_Vendida'] > 0));
    $sinStock = count(array_filter($productos, fn($p) => $p['Existencia'] <= 0));

    echo json_encode([
        "success" => true,
        "proveedor" => $prov,
        "productos" => $productos,
        "dias_rango" => round($dias),
        "resumen" => [
            "total_productos" => $totalProductos,
            "con_ventas" => $totalVendidos,
            "sin_stock" => $sinStock,
            "total_vendido" => array_sum(array_column($productos, 'Cantidad_Vendida'))
        ]
    ], JSON_UNESCAPED_UNICODE);

} catch(Exception $e) {
    http_response_code(500);
    echo json_encode(["success" => false, "message" => $e->getMessage()]);
}
?>
