<?php
/**
 * Devuelve los datos de una venta POS en el shape que NuevaVenta espera para
 * precargar una nueva venta. Misma idea que facturacion-electronica/copiar.php
 * pero contra tblventas + tbldetalle_venta.
 *
 * GET ?id=N (donde N es Factura_N)
 *
 * No incluye número de factura — la nueva venta toma su propio consecutivo.
 * Sí incluye cliente, items con precios actuales del catálogo, tipo
 * (Contado/Crédito), días de plazo y observación referenciando la factura
 * original.
 */
require_once '../config/database.php';

$database = new Database();
$db = $database->getConnection();

try {
    $id = intval($_GET['id'] ?? 0);
    if (!$id) {
        echo json_encode(['success' => false, 'message' => 'Factura requerida']);
        exit;
    }

    // Header de la venta
    $stmt = $db->prepare("SELECT * FROM tblventas WHERE Factura_N = ?");
    $stmt->execute([$id]);
    $venta = $stmt->fetch();
    if (!$venta) {
        echo json_encode(['success' => false, 'message' => 'Factura no encontrada']);
        exit;
    }

    // Cliente local — mismo shape que NuevaVenta espera al cargar pedidos
    $cliente = null;
    if ($venta['CodigoCli']) {
        $stmt = $db->prepare("
            SELECT CodigoClien,
                   Razon_Social AS Nombre_Cliente,
                   Identificacion, Nit,
                   Telefonos AS Telefono,
                   Direccion, Email,
                   CupoAutorizado AS Cupo
            FROM tblclientes WHERE CodigoClien = ? LIMIT 1
        ");
        $stmt->execute([$venta['CodigoCli']]);
        $cliente = $stmt->fetch();
    }

    // Items — precios del catálogo actual, no los históricos de la factura.
    // Si un precio cambió desde la venta original, la copia refleja el nuevo.
    $stmt = $db->prepare("
        SELECT d.Items, d.Cantidad AS cantidad_pedido,
               COALESCE(a.Codigo, '') AS Codigo,
               COALESCE(NULLIF(d.DescripcionTemp, ''), a.Nombres_Articulo, '') AS Nombres_Articulo,
               COALESCE(a.Existencia, 0) AS Existencia,
               COALESCE(a.Precio_Costo, 0) AS Precio_Costo,
               COALESCE(a.Precio_Venta, d.PrecioV) AS Precio_Venta,
               COALESCE(a.Iva, 0) AS Iva,
               COALESCE(a.Servicio, 0) AS Servicio,
               d.DescripcionTemp
        FROM tbldetalle_venta d
        LEFT JOIN tblarticulos a ON d.Items = a.Items
        WHERE d.Factura_N = ?
        ORDER BY d.Id_DetalleVenta
    ");
    $stmt->execute([$id]);
    $items = $stmt->fetchAll();

    foreach ($items as &$it) {
        $it['items'] = intval($it['Items']);
        $it['Items'] = $it['items']; // alias
        $it['cantidad_pedido'] = floatval($it['cantidad_pedido']);
        $it['Existencia']      = floatval($it['Existencia']);
        $it['Precio_Costo']    = floatval($it['Precio_Costo']);
        $it['Precio_Venta']    = floatval($it['Precio_Venta']);
        $it['Iva']             = floatval($it['Iva']);
        // precio_unitario_pedido = 0 → NuevaVenta usa Precio_Venta del catálogo
        $it['precio_unitario_pedido'] = 0;
    }

    $formaPago = strcasecmp(trim($venta['Tipo'] ?? ''), 'Contado') === 0 ? 'contado' : 'credito';

    echo json_encode([
        'success' => true,
        'cliente' => $cliente,
        'forma_pago' => $formaPago,
        'numero_pedido' => "Factura {$venta['Factura_N']}",
        'observaciones' => "Copia de Factura N° {$venta['Factura_N']}",
        'items' => $items,
        // Sin tipo_documento — la nueva venta toma el default de configuración (POS)
    ], JSON_UNESCAPED_UNICODE);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => $e->getMessage()]);
}
?>
