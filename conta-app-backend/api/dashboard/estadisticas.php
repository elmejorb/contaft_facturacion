<?php
/**
 * Endpoint para obtener estadísticas del dashboard
 */

require_once '../config/database.php';

$database = new Database();
$db = $database->getConnection();

try {
    // Total de productos
    $queryTotal = "SELECT COUNT(*) as total FROM tblArticulos";
    $stmtTotal = $db->prepare($queryTotal);
    $stmtTotal->execute();
    $totalProductos = $stmtTotal->fetch()['total'];

    // Productos activos
    $queryActivos = "SELECT COUNT(*) as total FROM tblArticulos WHERE Estado = 1";
    $stmtActivos = $db->prepare($queryActivos);
    $stmtActivos->execute();
    $productosActivos = $stmtActivos->fetch()['total'];

    // Productos con stock bajo (existencia <= 5)
    $queryStockBajo = "SELECT COUNT(*) as total FROM tblArticulos WHERE Existencia > 0 AND Existencia <= 5 AND Estado = 1";
    $stmtStockBajo = $db->prepare($queryStockBajo);
    $stmtStockBajo->execute();
    $productosStockBajo = $stmtStockBajo->fetch()['total'];

    // Valor total del inventario
    $queryValor = "SELECT SUM(Existencia * Precio_Costo) as valor FROM tblArticulos WHERE Estado = 1";
    $stmtValor = $db->prepare($queryValor);
    $stmtValor->execute();
    $valorInventario = $stmtValor->fetch()['valor'] ?? 0;

    http_response_code(200);
    echo json_encode([
        "success" => true,
        "estadisticas" => [
            "totalProductos" => intval($totalProductos),
            "productosActivos" => intval($productosActivos),
            "productosStockBajo" => intval($productosStockBajo),
            "valorInventario" => floatval($valorInventario)
        ]
    ]);

} catch(Exception $e) {
    http_response_code(500);
    echo json_encode([
        "success" => false,
        "message" => "Error al obtener estadísticas: " . $e->getMessage()
    ]);
}
?>
