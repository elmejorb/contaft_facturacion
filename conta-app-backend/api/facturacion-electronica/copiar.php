<?php
/**
 * Devuelve los datos de un documento electrónico en el shape que NuevaVenta
 * espera para precargar una venta (similar a vendedores/pedidos.php?cargar_venta=1).
 *
 * GET ?id=N
 *
 * No incluye número de factura — la nueva venta obtiene un consecutivo propio
 * al guardarse. Sí incluye cliente, items con precios actuales del catálogo,
 * tipo (Contado/Crédito), días de plazo y la nota original.
 *
 * Casos manejados:
 *  - cod_cliente > 0: se lee de tblclientes (incluye Preciocosto/UltimoPrecio
 *    para que los toggles del cliente sigan funcionando en la copia).
 *  - cod_cliente = 0 (comprador ocasional): se lee snapshot de tblventas
 *    (A_nombre, Identificacion, Direccion, Telefono) y se devuelve como
 *    nombre_cliente/nit_cliente para que NuevaVenta rellene el cliente
 *    ocasional. Sin esto, la copia deja "VENTAS AL CONTADO" por default y
 *    la FE sale con datos incorrectos a DIAN.
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

    // Snapshot del comprador guardado en tblventas al momento de facturar
    // (útil tanto para ocasionales como para completar campos que hayan
    // cambiado en el maestro después de la venta).
    $ventaSnap = null;
    if (!empty($doc['number'])) {
        $stmt = $db->prepare("
            SELECT CodigoCli, A_nombre, Identificacion, Direccion, Telefono
            FROM tblventas WHERE Factura_N = ? LIMIT 1
        ");
        $stmt->execute([$doc['number']]);
        $ventaSnap = $stmt->fetch();
    }

    // Cliente local (con shape que NuevaVenta espera)
    $cliente = null;
    $nombreOcasional = null;
    $nitOcasional = null;
    if ($doc['cod_cliente']) {
        // Devolvemos `Nit AS Identificacion` (mismo criterio que api/clientes/buscar.php)
        // porque el frontend espera el NIT en la key `Identificacion`, y el NIT real
        // del cliente vive SIEMPRE en la columna `Nit`. La columna `Identificacion`
        // de tblclientes es para datos del contacto/persona, NO para el NIT.
        // Sin esto el copiar de FE devolv�a Identificacion=0 y la validaci�n AAF14
        // rechazaba la venta antes de llegar a DIAN.
        $stmt = $db->prepare("
            SELECT CodigoClien,
                   Razon_Social AS Nombre_Cliente,
                   Nit AS Identificacion,
                   Nit,
                   Telefonos AS Telefono,
                   Direccion, Email,
                   CupoAutorizado AS Cupo,
                   Preciocosto, UltimoPrecio
            FROM tblclientes WHERE CodigoClien = ? LIMIT 1
        ");
        $stmt->execute([$doc['cod_cliente']]);
        $cliente = $stmt->fetch();
    } else if ($ventaSnap) {
        // Comprador ocasional — no está en tblclientes. Devolvemos los datos
        // snapshot para que NuevaVenta rellene el cliente en modo ocasional.
        $nombreOcasional = $ventaSnap['A_nombre'];
        $nitOcasional = $ventaSnap['Identificacion'];
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
               COALESCE(a.Iva, d.tax_percent) AS Iva,
               COALESCE(a.Servicio, 0) AS Servicio
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
        $it['Servicio'] = intval($it['Servicio']);
        // precio_unitario_pedido = 0 → NuevaVenta usa Precio_Venta del catálogo
        // (que es el precio sin gross-up de retención)
        $it['precio_unitario_pedido'] = 0;
    }

    // Tipo de pago: payment_form_id = 1 contado, 2 crédito
    $formaPago = intval($doc['payment_form_id']) === 1 ? 'contado' : 'credito';

    // Nota original del documento — el usuario la escribió una vez y quiere
    // conservarla en la copia. La referencia "Copia de FE-XX" se pega delante
    // para que quede rastro, sin borrar la nota real.
    $notaOriginal = trim($doc['nota'] ?? '');
    $observaciones = "Copia de FE-{$doc['prefix']}{$doc['number']}";
    if ($notaOriginal !== '') {
        $observaciones .= " | " . $notaOriginal;
    }

    echo json_encode([
        'success' => true,
        'cliente' => $cliente,
        // Comprador ocasional — solo si no hay cliente en tblclientes
        'nombre_cliente' => $nombreOcasional,
        'nit_cliente'    => $nitOcasional,
        'forma_pago' => $formaPago,
        'dias' => intval($doc['payment_due_days'] ?? 0),
        'numero_pedido' => "FE-{$doc['prefix']}{$doc['number']}", // referencia visible
        'observaciones' => $observaciones,
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
