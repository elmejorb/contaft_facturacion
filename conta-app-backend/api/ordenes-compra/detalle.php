<?php
/**
 * GET /api/ordenes-compra/detalle?id=X
 * Devuelve cabecera + items + datos del proveedor.
 */
require_once '../config/database.php';
$db = (new Database())->getConnection();

try {
    $id = intval($_GET['id'] ?? 0);
    if ($id <= 0) {
        echo json_encode(['success' => false, 'message' => 'id requerido']);
        exit;
    }

    $stmt = $db->prepare("
        SELECT oc.*,
               p.RazonSocial AS proveedor_nombre,
               p.Nit AS proveedor_nit,
               p.Telefonos AS proveedor_tel,
               p.Direccion AS proveedor_direccion,
               p.Email AS proveedor_email,
               u.Nombre AS usuario_nombre
        FROM tbl_ordenes_compra oc
        LEFT JOIN tblproveedores p ON p.CodigoPro = oc.CodigoPro
        LEFT JOIN tblusuarios u ON u.Id_Usuario = oc.Id_Usuario
        WHERE oc.id_oc = ?
    ");
    $stmt->execute([$id]);
    $orden = $stmt->fetch();

    if (!$orden) {
        http_response_code(404);
        echo json_encode(['success' => false, 'message' => 'Orden no encontrada']);
        exit;
    }

    $stmt = $db->prepare("
        SELECT d.*,
               a.Codigo AS articulo_codigo,
               a.Nombres_Articulo AS articulo_nombre,
               a.Existencia AS existencia_actual
        FROM tbl_detalle_orden_compra d
        LEFT JOIN tblarticulos a ON a.Items = d.Items
        WHERE d.id_oc = ?
        ORDER BY d.id
    ");
    $stmt->execute([$id]);
    $items = $stmt->fetchAll();

    foreach ($items as &$it) {
        $it['Cantidad']          = floatval($it['Cantidad']);
        $it['Cantidad_Recibida'] = floatval($it['Cantidad_Recibida']);
        $it['PrecioC']           = floatval($it['PrecioC']);
        $it['Iva']               = floatval($it['Iva']);
        $it['Descuento']         = floatval($it['Descuento']);
        $it['Subtotal']          = floatval($it['Subtotal']);
        $it['existencia_actual'] = floatval($it['existencia_actual'] ?? 0);
    }

    echo json_encode([
        'success' => true,
        'orden'   => $orden,
        'items'   => $items,
    ], JSON_UNESCAPED_UNICODE);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => $e->getMessage()]);
}
