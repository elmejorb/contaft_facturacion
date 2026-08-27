<?php
/**
 * GET /api/ordenes-compra/listar
 * Params opcionales: estado, proveedor, fecha_desde, fecha_hasta, limit
 */
require_once '../config/database.php';
$db = (new Database())->getConnection();

try {
    $where = ["1=1"];
    $params = [];

    if (!empty($_GET['estado'])) {
        $where[] = "oc.Estado = ?";
        $params[] = $_GET['estado'];
    }
    if (!empty($_GET['proveedor'])) {
        $where[] = "oc.CodigoPro = ?";
        $params[] = intval($_GET['proveedor']);
    }
    if (!empty($_GET['fecha_desde'])) {
        $where[] = "oc.fecha >= ?";
        $params[] = $_GET['fecha_desde'];
    }
    if (!empty($_GET['fecha_hasta'])) {
        $where[] = "oc.fecha <= ?";
        $params[] = $_GET['fecha_hasta'];
    }

    $limit = min(500, intval($_GET['limit'] ?? 200));
    $whereStr = implode(' AND ', $where);

    $stmt = $db->prepare("
        SELECT
            oc.id_oc, oc.numero_oc, oc.fecha, oc.fecha_entrega,
            oc.CodigoPro, p.RazonSocial AS proveedor,
            oc.Total, oc.Impuesto, oc.Descuento, oc.Flete, oc.Retencion,
            oc.Estado, oc.pedido_generado_n, oc.Comentario,
            oc.FechaCreacion, oc.FechaMod,
            (SELECT COUNT(*) FROM tbl_detalle_orden_compra d WHERE d.id_oc = oc.id_oc) AS lineas
        FROM tbl_ordenes_compra oc
        LEFT JOIN tblproveedores p ON p.CodigoPro = oc.CodigoPro
        WHERE $whereStr
        ORDER BY oc.fecha DESC, oc.id_oc DESC
        LIMIT $limit
    ");
    $stmt->execute($params);
    $ordenes = $stmt->fetchAll();

    foreach ($ordenes as &$o) {
        $o['Total']      = floatval($o['Total']);
        $o['Impuesto']   = floatval($o['Impuesto']);
        $o['Descuento']  = floatval($o['Descuento']);
        $o['Flete']      = floatval($o['Flete']);
        $o['Retencion']  = floatval($o['Retencion']);
        $o['lineas']     = intval($o['lineas']);
    }

    // Resumen por estado
    $stmt = $db->prepare("
        SELECT Estado, COUNT(*) AS n, COALESCE(SUM(Total),0) AS monto
        FROM tbl_ordenes_compra
        WHERE $whereStr
        GROUP BY Estado
    ");
    $stmt->execute($params);
    $resumen = [];
    foreach ($stmt->fetchAll() as $r) {
        $resumen[$r['Estado']] = ['n' => intval($r['n']), 'monto' => floatval($r['monto'])];
    }

    echo json_encode([
        'success' => true,
        'ordenes' => $ordenes,
        'resumen' => $resumen,
        'total'   => count($ordenes),
    ], JSON_UNESCAPED_UNICODE);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => $e->getMessage()]);
}
