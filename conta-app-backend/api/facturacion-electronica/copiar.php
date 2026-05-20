<?php
/**
 * Devuelve los datos de un documento electrónico en el shape que NuevaVenta
 * espera para precargar una venta (similar a vendedores/pedidos.php?cargar_venta=1).
 *
 * GET ?id=N
 *
 * No incluye número de factura — la nueva venta obtiene un consecutivo propio
 * al guardarse. Sí incluye cliente, items con precios actuales del catálogo,
 * tipo (Contado/Crédito), días de plazo y observaciones referenciando la
 * factura original.
 */
require_once '../config/database.php';

$database = new Database();
$db = $database->getConnection();

try {
    $id = intval($_GET['id'] ?? 0);
    if (!$id) {
        echo json_encode(['success' => false, 'message' => 'ID requerido']);
        exit;
    }

    // Documento electrónico
    $stmt = $db->prepare("SELECT * FROM electronic_documents WHERE id = ?");
    $stmt->execute([$id]);
    $doc = $stmt->fetch();
    if (!$doc) {
        echo json_encode(['success' => false, 'message' => 'Documento no encontrado']);
        exit;
    }

    // Cliente local (con shape que NuevaVenta espera)
    $cliente = null;
    if ($doc['cod_cliente']) {
        $stmt = $db->prepare("
            SELECT CodigoClien,
                   Razon_Social AS Nombre_Cliente,
                   Identificacion, Nit,
                   Telefonos AS Telefono,
                   Direccion, Email,
                   CupoAutorizado AS Cupo
            FROM tblclientes WHERE CodigoClien = ? LIMIT 1
        ");
        $stmt->execute([$doc['cod_cliente']]);
        $cliente = $stmt->fetch();
    }

    // Items de la FE original — usamos el precio del catálogo (no el de la FE).
    // El precio de la FE original puede incluir un gross-up de retención
    // (Total = Base / (1 - %ret)), si lo reusáramos NuevaVenta volvería a
    // aplicar la retención y se duplicaría. El precio del catálogo es el
    // precio "base" sin retención, así que al recalcular el gross-up el
    // total termina igualito que la FE original.
    $stmt = $db->prepare("
        SELECT d.items, d.invoiced_quantity AS cantidad_pedido,
               COALESCE(a.Codigo, '') AS Codigo,
               COALESCE(a.Nombres_Articulo, d.description, '') AS Nombres_Articulo,
               COALESCE(a.Existencia, 0) AS Existencia,
               COALESCE(a.Precio_Costo, 0) AS Precio_Costo,
               COALESCE(a.Precio_Venta, d.price_amount) AS Precio_Venta,
               COALESCE(a.Iva, d.tax_percent) AS Iva
        FROM detalle_document_electronic d
        LEFT JOIN tblarticulos a ON d.items = a.Items
        WHERE d.factura_n = ?
        ORDER BY d.id_detalle_document
    ");
    $stmt->execute([$id]);
    $items = $stmt->fetchAll();

    foreach ($items as &$it) {
        $it['items'] = intval($it['items']);
        $it['Items'] = $it['items']; // alias usado por NuevaVenta
        $it['cantidad_pedido'] = floatval($it['cantidad_pedido']);
        $it['Existencia'] = floatval($it['Existencia']);
        $it['Precio_Costo'] = floatval($it['Precio_Costo']);
        $it['Precio_Venta'] = floatval($it['Precio_Venta']);
        $it['Iva'] = floatval($it['Iva']);
        // precio_unitario_pedido = 0 → NuevaVenta usa Precio_Venta del catálogo
        // (que es el precio sin gross-up de retención)
        $it['precio_unitario_pedido'] = 0;
    }

    // Tipo de pago: payment_form_id = 1 contado, 2 crédito
    $formaPago = intval($doc['payment_form_id']) === 1 ? 'contado' : 'credito';

    echo json_encode([
        'success' => true,
        'cliente' => $cliente,
        'forma_pago' => $formaPago,
        'numero_pedido' => "FE-{$doc['prefix']}{$doc['number']}", // referencia visible
        'observaciones' => "Copia de FE-{$doc['prefix']}{$doc['number']}",
        'items' => $items,
        // Indica a NuevaVenta que el origen es una FE — debe preseleccionar
        // 'Factura Electrónica' en el selector de tipo de documento
        'tipo_documento' => 'electronica',
    ], JSON_UNESCAPED_UNICODE);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => $e->getMessage()]);
}
?>
