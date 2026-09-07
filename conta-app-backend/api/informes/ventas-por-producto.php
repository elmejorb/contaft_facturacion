<?php
/**
 * GET /api/informes/ventas-por-producto
 *
 * Devuelve todas las facturas donde se vendió UN producto específico en un
 * rango de fechas. Con totales al pie: cantidad total, monto bruto, costo
 * total, utilidad y % margen.
 *
 * Params:
 *   items      int  — Items del artículo (obligatorio)
 *   desde      YYYY-MM-DD
 *   hasta      YYYY-MM-DD
 *   estado     Valida|Anulada|Todas (default Valida — excluye anuladas)
 */
require_once '../config/database.php';
$db = (new Database())->getConnection();

try {
    $items = intval($_GET['items'] ?? 0);
    if ($items <= 0) { echo json_encode(['success' => false, 'message' => 'items es obligatorio']); exit; }
    $desde = $_GET['desde'] ?? date('Y-m-01');
    $hasta = $_GET['hasta'] ?? date('Y-m-d');
    $estado = $_GET['estado'] ?? 'Valida';

    // Datos del artículo
    $stmt = $db->prepare("SELECT Items, Codigo, Nombres_Articulo, Precio_Venta, Iva
                            FROM tblarticulos WHERE Items = ? LIMIT 1");
    $stmt->execute([$items]);
    $art = $stmt->fetch();
    if (!$art) { echo json_encode(['success' => false, 'message' => 'Artículo no encontrado']); exit; }

    // Filtro estado
    $whereEstado = '';
    $params = [':items' => $items, ':desde' => $desde, ':hasta' => $hasta];
    if ($estado !== 'Todas') {
        $whereEstado = ' AND v.EstadoFact = :estado';
        $params[':estado'] = $estado;
    }

    // Detalle por factura — cada línea es una venta del producto
    $stmt = $db->prepare("
        SELECT v.Factura_N,
               v.Fecha,
               v.Tipo AS TipoPedido,
               v.EstadoFact,
               COALESCE(v.A_nombre, cl.Razon_Social, 'VENTAS AL CONTADO') AS Cliente,
               v.Identificacion AS ClienteNit,
               d.Cantidad,
               d.PrecioV AS PrecioUnitario,
               d.PrecioC AS CostoUnitario,
               d.IVA AS IvaPct,
               d.Descuento,
               d.Subtotal,
               (COALESCE(d.PrecioV, 0) - COALESCE(d.PrecioC, 0)) * COALESCE(d.Cantidad, 0) AS Utilidad,
               COALESCE(d.DescripcionTemp, '') AS DescripcionTemp
          FROM tbldetalle_venta d
          INNER JOIN tblventas v ON v.Factura_N = d.Factura_N
          LEFT JOIN tblclientes cl ON cl.CodigoClien = v.CodigoCli
         WHERE d.Items = :items
           AND v.Fecha BETWEEN :desde AND CONCAT(:hasta, ' 23:59:59')
           $whereEstado
         ORDER BY v.Fecha ASC, v.Factura_N ASC
    ");
    $stmt->execute($params);
    $lineas = $stmt->fetchAll();

    // Formatear + acumular totales
    $totCant = $totBruto = $totCosto = $totUtil = 0;
    foreach ($lineas as &$l) {
        $l['Cantidad']       = floatval($l['Cantidad']);
        $l['PrecioUnitario'] = floatval($l['PrecioUnitario']);
        $l['CostoUnitario']  = floatval($l['CostoUnitario']);
        $l['IvaPct']         = floatval($l['IvaPct']);
        $l['Descuento']      = floatval($l['Descuento']);
        $l['Subtotal']       = floatval($l['Subtotal']);
        $l['Utilidad']       = floatval($l['Utilidad']);

        // Solo cuenta al total las NO anuladas si el filtro es 'Todas'
        if ($estado === 'Todas' && $l['EstadoFact'] === 'Anulada') continue;
        $totCant  += $l['Cantidad'];
        $totBruto += $l['Subtotal'];
        $totCosto += $l['CostoUnitario'] * $l['Cantidad'];
        $totUtil  += $l['Utilidad'];
    }
    $margen = $totBruto > 0 ? ($totUtil / $totBruto) * 100 : 0;

    echo json_encode([
        'success'  => true,
        'articulo' => [
            'Items'  => intval($art['Items']),
            'Codigo' => $art['Codigo'],
            'Nombre' => $art['Nombres_Articulo'],
            'IvaPct' => floatval($art['Iva']),
        ],
        'rango' => ['desde' => $desde, 'hasta' => $hasta],
        'ventas' => $lineas,
        'totales' => [
            'facturas'    => count($lineas),
            'cantidad'    => $totCant,
            'monto_bruto' => $totBruto,
            'costo_total' => $totCosto,
            'utilidad'    => $totUtil,
            'margen_pct'  => round($margen, 2),
        ],
    ], JSON_UNESCAPED_UNICODE);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => $e->getMessage()]);
}
