<?php
/**
 * Endpoint para obtener proveedores
 */

require_once '../config/database.php';

// Crear conexión a la base de datos
$database = new Database();
$db = $database->getConnection();

try {
    $query = "SELECT
                Id_Proveedor,
                Nombres_Proveedor as Proveedor
              FROM tblproveedores
              ORDER BY Nombres_Proveedor";

    $stmt = $db->prepare($query);
    $stmt->execute();

    $proveedores = $stmt->fetchAll();

    http_response_code(200);
    echo json_encode([
        "success" => true,
        "proveedores" => $proveedores,
        "total" => count($proveedores)
    ]);

} catch(Exception $e) {
    http_response_code(500);
    echo json_encode([
        "success" => false,
        "message" => "Error al obtener proveedores: " . $e->getMessage()
    ]);
}
?>
