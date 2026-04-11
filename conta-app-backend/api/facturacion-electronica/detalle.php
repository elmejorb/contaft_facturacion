<?php
/**
 * Detalle de documento electrónico
 * GET ?id=N
 */
require_once '../config/database.php';
$database = new Database();
$db = $database->getConnection();

try {
    $id = intval($_GET['id'] ?? 0);
    if (!$id) { echo json_encode(['success' => false, 'message' => 'ID requerido']); exit; }

    // Documento
    $stmt = $db->prepare("
        SELECT e.*, td.name as tipo_documento, td.code as tipo_code,
               c.Razon_Social, c.Nit, c.Direccion, c.Telefonos, c.Email
        FROM electronic_documents e
        LEFT JOIN type_documents td ON e.type_document_id = td.id
        LEFT JOIN tblclientes c ON e.cod_cliente = c.CodigoClien
        WHERE e.id = ?
    ");
    $stmt->execute([$id]);
    $doc = $stmt->fetch();

    if (!$doc) { echo json_encode(['success' => false, 'message' => 'Documento no encontrado']); exit; }

    // Items
    $stmt2 = $db->prepare("
        SELECT d.*, a.Codigo, a.Nombres_Articulo
        FROM detalle_document_electronic d
        LEFT JOIN tblarticulos a ON d.items = a.Items
        WHERE d.factura_n = ?
        ORDER BY d.id_detalle_document
    ");
    $stmt2->execute([$id]);
    $items = $stmt2->fetchAll();

    foreach ($items as &$i) {
        $i['invoiced_quantity'] = floatval($i['invoiced_quantity']);
        $i['line_extension_amount'] = floatval($i['line_extension_amount']);
        $i['price_amount'] = floatval($i['price_amount']);
        $i['discount_amount'] = floatval($i['discount_amount']);
        $i['tax_amount'] = floatval($i['tax_amount']);
        $i['taxable_amount'] = floatval($i['taxable_amount']);
        $i['tax_percent'] = floatval($i['tax_percent']);
    }

    // Notas crédito/débito referenciadas a este documento
    $notas = [];
    if ($doc['cufe']) {
        $stmt3 = $db->prepare("
            SELECT e.id, e.prefix, e.number, e.type_document_id, td.name as tipo,
                   e.total, e.status, e.cufe, e.fecha, e.nota, e.invoice_cufe
            FROM electronic_documents e
            LEFT JOIN type_documents td ON e.type_document_id = td.id
            WHERE e.invoice_cufe = ? AND e.type_document_id IN (2, 3)
            ORDER BY e.id DESC
        ");
        $stmt3->execute([$doc['cufe']]);
        $notas = $stmt3->fetchAll();
        foreach ($notas as &$n) $n['total'] = floatval($n['total']);
    }

    // DIAN response
    $dianResponse = null;
    if ($doc['dian_response']) {
        $dianResponse = json_decode($doc['dian_response'], true);
    }

    echo json_encode([
        'success' => true,
        'documento' => $doc,
        'items' => $items,
        'notas' => $notas,
        'dian_response' => $dianResponse
    ], JSON_UNESCAPED_UNICODE);

} catch (Exception $e) {
    echo json_encode(['success' => false, 'message' => $e->getMessage()]);
}
?>
