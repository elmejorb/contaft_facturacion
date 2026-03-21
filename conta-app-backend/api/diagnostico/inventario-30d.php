<?php
/**
 * Endpoint para obtener diagnóstico del inventario (30 días)
 * Lee de la vista vw_diagnostico_inventario_30d
 */

require_once '../config/database.php';

$database = new Database();
$db = $database->getConnection();

try {
    // Leer directamente de la vista
    $query = "SELECT * FROM vw_diagnostico_inventario_30d ORDER BY Nombres_Articulo";

    $stmt = $db->prepare($query);
    $stmt->execute();

    $diagnostico = $stmt->fetchAll();

    // Formatear números
    foreach ($diagnostico as &$item) {
        $item['Existencia'] = floatval($item['Existencia']);
        $item['Precio_Costo'] = floatval($item['Precio_Costo']);
        $item['Precio_Venta'] = floatval($item['Precio_Venta']);
        $item['Margen_Porc'] = floatval($item['Margen_Porc']);
        $item['Capital_Invertido'] = floatval($item['Capital_Invertido']);
        $item['Veces_Vendido_30d'] = intval($item['Veces_Vendido_30d'] ?? 0);
        $item['Unidades_Vendidas_30d'] = floatval($item['Unidades_Vendidas_30d'] ?? 0);
    }

    http_response_code(200);
    echo json_encode([
        "success" => true,
        "diagnostico" => $diagnostico,
        "total" => count($diagnostico)
    ], JSON_UNESCAPED_UNICODE);

} catch(Exception $e) {
    http_response_code(500);
    echo json_encode([
        "success" => false,
        "message" => "Error al obtener diagnóstico: " . $e->getMessage()
    ]);
}
?>
