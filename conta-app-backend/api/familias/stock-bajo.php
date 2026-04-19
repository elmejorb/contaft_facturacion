<?php
/**
 * Productos con stock debajo del mínimo configurado.
 * GET → lista de productos que alcanzaron o superaron el umbral de alerta.
 */
require_once '../config/database.php';

$db = (new Database())->getConnection();

try {
    $stmt = $db->query("SELECT * FROM vw_productos_stock_bajo ORDER BY (Stock_Minimo - Existencia) DESC");
    $rows = $stmt->fetchAll();
    echo json_encode([
        'success' => true,
        'total' => count($rows),
        'productos' => $rows,
    ], JSON_UNESCAPED_UNICODE);
} catch (Exception $e) {
    echo json_encode(['success' => false, 'message' => $e->getMessage()]);
}
