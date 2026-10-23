<?php
/**
 * Endpoint para obtener artículos del inventario (Versión flexible)
 * Se adapta automáticamente a los nombres de columnas de la tabla
 */

require_once '../config/database.php';

// Crear conexión a la base de datos
$database = new Database();
$db = $database->getConnection();

try {
    // Primero obtener todas las columnas sin filtros
    // Sintaxis portable (MySQL + SQLite). LIMIT N, M era MySQL-only.
    $query = "SELECT * FROM tblArticulos LIMIT 1000 OFFSET 0";

    $stmt = $db->prepare($query);
    $stmt->execute();

    $articulos = $stmt->fetchAll(PDO::FETCH_ASSOC);

    http_response_code(200);
    echo json_encode([
        "success" => true,
        "articulos" => $articulos,
        "total" => count($articulos)
    ], JSON_UNESCAPED_UNICODE);

} catch(Exception $e) {
    http_response_code(500);
    echo json_encode([
        "success" => false,
        "message" => "Error al obtener artículos: " . $e->getMessage()
    ]);
}
?>
