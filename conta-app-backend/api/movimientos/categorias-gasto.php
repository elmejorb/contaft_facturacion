<?php
/**
 * CRUD Categorías de gasto
 * GET          → listar
 * POST crear   → crear nueva
 * POST editar  → editar nombre
 * POST eliminar → desactivar
 */
require_once '../config/database.php';
$database = new Database();
$db = $database->getConnection();

try {
    if ($_SERVER['REQUEST_METHOD'] === 'GET') {
        $stmt = $db->query("SELECT * FROM tblcategorias_gasto ORDER BY Nombre");
        echo json_encode(['success' => true, 'categorias' => $stmt->fetchAll()], JSON_UNESCAPED_UNICODE);
    } else {
        $data = json_decode(file_get_contents('php://input'), true);
        $action = $data['action'] ?? '';

        if ($action === 'crear') {
            $nombre = trim($data['nombre'] ?? '');
            if (!$nombre) { echo json_encode(['success' => false, 'message' => 'Nombre requerido']); exit; }
            $db->prepare("INSERT INTO tblcategorias_gasto (Nombre) VALUES (?)")->execute([$nombre]);
            echo json_encode(['success' => true, 'message' => "Categoría '$nombre' creada"]);

        } elseif ($action === 'editar') {
            $id = intval($data['id'] ?? 0);
            $nombre = trim($data['nombre'] ?? '');
            if (!$id || !$nombre) { echo json_encode(['success' => false, 'message' => 'ID y nombre requeridos']); exit; }
            $db->prepare("UPDATE tblcategorias_gasto SET Nombre = ? WHERE Id_Categoria = ?")->execute([$nombre, $id]);
            echo json_encode(['success' => true, 'message' => 'Categoría actualizada']);

        } elseif ($action === 'eliminar') {
            $id = intval($data['id'] ?? 0);
            $db->prepare("UPDATE tblcategorias_gasto SET Activa = 0 WHERE Id_Categoria = ?")->execute([$id]);
            echo json_encode(['success' => true, 'message' => 'Categoría desactivada']);

        } elseif ($action === 'activar') {
            $id = intval($data['id'] ?? 0);
            $db->prepare("UPDATE tblcategorias_gasto SET Activa = 1 WHERE Id_Categoria = ?")->execute([$id]);
            echo json_encode(['success' => true, 'message' => 'Categoría activada']);
        }
    }
} catch (Exception $e) {
    echo json_encode(['success' => false, 'message' => $e->getMessage()]);
}
?>
