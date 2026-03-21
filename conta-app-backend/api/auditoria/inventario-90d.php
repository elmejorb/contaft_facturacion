<?php
/**
 * Endpoint para auditoría de inventario (90 días)
 */

require_once '../config/database.php';

$database = new Database();
$db = $database->getConnection();

try {
    $stmt = $db->query("SELECT * FROM vw_auditoria_inventario_90d ORDER BY Capital_Invertido DESC");
    $auditoria = $stmt->fetchAll();

    foreach ($auditoria as &$item) {
        $item['Existencia'] = floatval($item['Existencia']);
        $item['Precio_Costo'] = floatval($item['Precio_Costo']);
        $item['Precio_Venta'] = floatval($item['Precio_Venta']);
        $item['Margen_Porc'] = floatval($item['Margen_Porc']);
        $item['Capital_Invertido'] = floatval($item['Capital_Invertido']);
        $item['Unidades_Vendidas_90d'] = floatval($item['Unidades_Vendidas_90d']);
        $item['Veces_Vendido_90d'] = intval($item['Veces_Vendido_90d']);
        $item['Total_Vendido_90d'] = floatval($item['Total_Vendido_90d']);
        $item['Dias_Stock'] = intval($item['Dias_Stock']);
    }

    echo json_encode([
        'success' => true,
        'auditoria' => $auditoria,
        'total' => count($auditoria)
    ], JSON_UNESCAPED_UNICODE);

} catch(Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => $e->getMessage()]);
}
?>
