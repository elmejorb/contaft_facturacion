<?php
/**
 * Buscar productos NO asignados todavía a ninguna familia (para agregar a una).
 * GET ?q=texto&exclude_familia=N
 *   exclude_familia: excluye productos que YA están en alguna familia (default).
 *   Si se pasa exclude_familia=0, devuelve todos (útil para edición).
 */
require_once '../config/database.php';

$db = (new Database())->getConnection();

$q = trim($_GET['q'] ?? '');
$excludeFam = isset($_GET['exclude_familia']) ? intval($_GET['exclude_familia']) : 1;
if (strlen($q) < 2) { echo json_encode(['success' => true, 'articulos' => []]); exit; }

try {
    $sql = "
        SELECT a.Items, a.Codigo, a.Nombres_Articulo, a.Existencia, a.Precio_Venta, a.Precio_Costo, a.Iva
        FROM tblarticulos a
        WHERE a.Estado = 1
          AND (a.Codigo LIKE :q OR a.Nombres_Articulo LIKE :q)
    ";
    if ($excludeFam) {
        $sql .= " AND NOT EXISTS (SELECT 1 FROM tblfamilia_items fi WHERE fi.Items = a.Items)";
    }
    $sql .= " ORDER BY a.Nombres_Articulo LIMIT 20";
    $stmt = $db->prepare($sql);
    $stmt->execute([':q' => "%$q%"]);
    echo json_encode(['success' => true, 'articulos' => $stmt->fetchAll()], JSON_UNESCAPED_UNICODE);
} catch (Exception $e) {
    echo json_encode(['success' => false, 'message' => $e->getMessage()]);
}
