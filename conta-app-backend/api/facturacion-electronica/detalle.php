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

    $sumBase = 0; $sumIva = 0;
    foreach ($items as &$i) {
        $i['invoiced_quantity'] = floatval($i['invoiced_quantity']);
        $i['line_extension_amount'] = floatval($i['line_extension_amount']);
        $i['price_amount'] = floatval($i['price_amount']);
        $i['discount_amount'] = floatval($i['discount_amount']);
        $i['tax_amount'] = floatval($i['tax_amount']);
        $i['taxable_amount'] = floatval($i['taxable_amount']);
        $i['tax_percent'] = floatval($i['tax_percent']);
        $sumBase += $i['line_extension_amount'];
        $sumIva  += $i['tax_amount'];
    }
    unset($i);

    // Recalculamos doc.total desde las líneas. Antes de 4.3.61 el campo
    // electronic_documents.total quedaba inflado con IvaIncluido=1, así
    // que la vista previa mostraba un total distinto al de DIAN.
    if ($sumBase > 0 || $sumIva > 0) {
        $doc['total'] = round($sumBase + $sumIva - floatval($doc['descuento'] ?? 0), 2);
    } else {
        $doc['total'] = floatval($doc['total']);
    }

    // Notas crédito/débito referenciadas a este documento
    $notas = [];
    if ($doc['cufe']) {
        $stmt3 = $db->prepare("
            SELECT e.id, e.prefix, e.number, e.type_document_id, td.name as tipo,
                   e.total, e.descuento, e.status, e.cufe, e.fecha, e.nota, e.invoice_cufe,
                   det.sum_base, det.sum_iva
            FROM electronic_documents e
            LEFT JOIN type_documents td ON e.type_document_id = td.id
            LEFT JOIN (
                SELECT factura_n,
                       SUM(line_extension_amount) AS sum_base,
                       SUM(tax_amount)            AS sum_iva
                FROM detalle_document_electronic
                GROUP BY factura_n
            ) det ON det.factura_n = e.id
            WHERE e.invoice_cufe = ? AND e.type_document_id IN (2, 3)
            ORDER BY e.id DESC
        ");
        $stmt3->execute([$doc['cufe']]);
        $notas = $stmt3->fetchAll();
        foreach ($notas as &$n) {
            $nBase = floatval($n['sum_base'] ?? 0);
            $nIva  = floatval($n['sum_iva']  ?? 0);
            $nDesc = floatval($n['descuento'] ?? 0);
            $n['total'] = ($nBase > 0 || $nIva > 0)
                ? round($nBase + $nIva - $nDesc, 2)
                : floatval($n['total']);
            unset($n['sum_base'], $n['sum_iva']);
        }
        unset($n);
    }

    // DIAN response
    $dianResponse = null;
    if ($doc['dian_response']) {
        $dianResponse = json_decode($doc['dian_response'], true);
    }

    // Empresa (para renderizar tirilla/preview con resolución, prefijo, rango DIAN)
    $stmtEmp = $db->query("SELECT Empresa, Nit, Direccion, Telefono, Regimen, Resolucion, FechaR, Rango, Rango2, Prefijo FROM tbldatosempresa LIMIT 1");
    $empresa = $stmtEmp->fetch() ?: [];

    echo json_encode([
        'success' => true,
        'documento' => $doc,
        'items' => $items,
        'notas' => $notas,
        'dian_response' => $dianResponse,
        'empresa' => $empresa,
    ], JSON_UNESCAPED_UNICODE);

} catch (Exception $e) {
    echo json_encode(['success' => false, 'message' => $e->getMessage()]);
}
?>
