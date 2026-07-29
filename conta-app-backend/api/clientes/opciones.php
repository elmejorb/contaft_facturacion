<?php
/**
 * Opciones para selects de clientes (datos fiscales)
 */
require_once '../config/database.php';

$database = new Database();
$db = $database->getConnection();

try {
    $liabilities = $db->query("SELECT id, code, name FROM type_liabilities ORDER BY id")->fetchAll();
    $organizations = $db->query("SELECT id, code, name FROM type_organizations ORDER BY id")->fetchAll();
    $regimes = $db->query("SELECT id, code, name FROM type_regimes ORDER BY id")->fetchAll();
    $municipalities = $db->query("SELECT id, code, name FROM municipalities ORDER BY name")->fetchAll();
    // Catálogo de tipos de documento (NIT, CC, CE, Pasaporte, DIEX).
    // El JOIN de facturación electrónica lee de aquí para mapear id_documento
    // → code DIAN. Si falta este catálogo la FE sale como Cédula por default.
    $documentTypes = $db->query("SELECT id, code, name FROM tipos_documentos ORDER BY id")->fetchAll();

    echo json_encode([
        'success' => true,
        'liabilities' => $liabilities,
        'organizations' => $organizations,
        'regimes' => $regimes,
        'municipalities' => $municipalities,
        'document_types' => $documentTypes,
    ], JSON_UNESCAPED_UNICODE);
} catch(Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => $e->getMessage()]);
}
?>
