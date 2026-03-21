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

    echo json_encode([
        'success' => true,
        'liabilities' => $liabilities,
        'organizations' => $organizations,
        'regimes' => $regimes,
        'municipalities' => $municipalities
    ], JSON_UNESCAPED_UNICODE);
} catch(Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => $e->getMessage()]);
}
?>
