<?php
/**
 * Listado de documentos electrónicos
 * GET ?anio=2026&mes=3&tipo=1
 */
require_once '../config/database.php';
$database = new Database();
$db = $database->getConnection();

try {
    $anio = $_GET['anio'] ?? date('Y');
    $mes = $_GET['mes'] ?? null;
    $tipo = $_GET['tipo'] ?? null; // 1=Factura, 2=Nota Crédito, 3=Nota Débito

    $where = "YEAR(e.fecha) = :anio";
    $params = [':anio' => $anio];

    if ($mes) {
        $where .= " AND MONTH(e.fecha) = :mes";
        $params[':mes'] = $mes;
    }
    if ($tipo) {
        $where .= " AND e.type_document_id = :tipo";
        $params[':tipo'] = $tipo;
    }

    $stmt = $db->prepare("
        SELECT e.id, e.fecha, e.cod_cliente, e.customer_identification,
               e.type_document_id, td.name as tipo_documento,
               e.prefix, e.number, e.status, e.total, e.cufe, e.invoice_cufe,
               e.sent_at, e.nota, e.EstadoFact, e.email_sent,
               c.Razon_Social as cliente_nombre
        FROM electronic_documents e
        LEFT JOIN type_documents td ON e.type_document_id = td.id
        LEFT JOIN tblclientes c ON e.cod_cliente = c.CodigoClien
        WHERE $where
        ORDER BY e.id DESC
    ");
    $stmt->execute($params);
    $docs = $stmt->fetchAll();

    foreach ($docs as &$d) {
        $d['total'] = floatval($d['total']);
    }

    // Resumen
    $totalDocs = count($docs);
    $autorizados = count(array_filter($docs, fn($d) => $d['status'] === 'autorizado'));
    $rechazados = count(array_filter($docs, fn($d) => $d['status'] === 'rechazado'));
    $anulados = count(array_filter($docs, fn($d) => $d['status'] === 'anulada'));

    // Also check tblventas with CUFE for docs not in electronic_documents
    $stmt2 = $db->prepare("
        SELECT Factura_N, Fecha, A_nombre, Identificacion, Total, cufe, enviada_dian, fecha_envio_dian
        FROM tblventas
        WHERE enviada_dian = 1 AND YEAR(Fecha) = :anio
        " . ($mes ? " AND MONTH(Fecha) = :mes" : "") . "
        ORDER BY Factura_N DESC
    ");
    $params2 = [':anio' => $anio];
    if ($mes) $params2[':mes'] = $mes;
    $stmt2->execute($params2);
    $ventasDian = $stmt2->fetchAll();

    // Años disponibles
    $stmtAnios = $db->query("SELECT DISTINCT YEAR(fecha) as anio FROM electronic_documents UNION SELECT DISTINCT YEAR(Fecha) FROM tblventas WHERE enviada_dian = 1 ORDER BY anio DESC");
    $anios = array_column($stmtAnios->fetchAll(), 'anio');

    echo json_encode([
        'success' => true,
        'documentos' => $docs,
        'ventas_dian' => $ventasDian,
        'anios' => $anios,
        'resumen' => [
            'total' => $totalDocs,
            'autorizados' => $autorizados,
            'rechazados' => $rechazados,
            'anulados' => $anulados
        ]
    ], JSON_UNESCAPED_UNICODE);

} catch (Exception $e) {
    echo json_encode(['success' => false, 'message' => $e->getMessage()]);
}
?>
