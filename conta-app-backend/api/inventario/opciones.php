<?php
/**
 * Devuelve categorías y proveedores para selects
 */
require_once '../config/database.php';

$database = new Database();
$db = $database->getConnection();

try {
    $stmt = $db->query("SELECT Id_Categoria, Categoria FROM tblcategoria ORDER BY Categoria");
    $categorias = $stmt->fetchAll();

    $stmt2 = $db->query("SELECT CodigoPro, RazonSocial FROM tblproveedores ORDER BY RazonSocial");
    $proveedores = $stmt2->fetchAll();

    echo json_encode([
        'success' => true,
        'categorias' => $categorias,
        'proveedores' => $proveedores
    ]);
} catch(Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => $e->getMessage()]);
}
?>
