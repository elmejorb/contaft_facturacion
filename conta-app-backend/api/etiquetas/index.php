<?php
/**
 * Etiquetas (clasificación de productos).
 *
 * GET                       → todas las etiquetas activas + conteo de productos por etiqueta
 * GET ?todas=1              → incluye inactivas
 *
 * POST {action:'crear', nombre, descripcion?, color?}
 * POST {action:'editar', id, nombre, descripcion?, color?, activa?}
 * POST {action:'eliminar', id}  → solo si no tiene productos asignados
 */
require_once '../config/database.php';
$db = (new Database())->getConnection();

try {
    if ($_SERVER['REQUEST_METHOD'] === 'GET') {
        $todas = isset($_GET['todas']);
        $where = $todas ? '' : 'WHERE e.Activa = 1';
        $stmt = $db->query("
            SELECT e.*, COALESCE(c.total, 0) AS productos_count
            FROM tbletiquetas e
            LEFT JOIN (
                SELECT Id_Etiqueta, COUNT(*) AS total FROM tblarticulos
                WHERE Id_Etiqueta IS NOT NULL GROUP BY Id_Etiqueta
            ) c ON e.Id_Etiqueta = c.Id_Etiqueta
            $where
            ORDER BY e.Nombre
        ");
        echo json_encode(['success' => true, 'etiquetas' => $stmt->fetchAll()], JSON_UNESCAPED_UNICODE);
        exit;
    }

    $data = json_decode(file_get_contents('php://input'), true);
    $action = $data['action'] ?? '';

    if ($action === 'crear') {
        $nombre = trim($data['nombre'] ?? '');
        $desc   = trim($data['descripcion'] ?? '') ?: null;
        $color  = $data['color'] ?? '#7c3aed';
        if (!$nombre) { echo json_encode(['success' => false, 'message' => 'Nombre requerido']); exit; }

        try {
            $db->prepare("INSERT INTO tbletiquetas (Nombre, Descripcion, Color) VALUES (?, ?, ?)")
               ->execute([$nombre, $desc, $color]);
            echo json_encode(['success' => true, 'id' => $db->lastInsertId(), 'message' => 'Etiqueta creada']);
        } catch (PDOException $e) {
            if ($e->getCode() === '23000') {
                echo json_encode(['success' => false, 'message' => 'Ya existe una etiqueta con ese nombre']);
            } else throw $e;
        }
        exit;
    }

    if ($action === 'editar') {
        $id     = intval($data['id'] ?? 0);
        $nombre = trim($data['nombre'] ?? '');
        $desc   = trim($data['descripcion'] ?? '') ?: null;
        $color  = $data['color'] ?? '#7c3aed';
        $activa = isset($data['activa']) ? (intval($data['activa']) ? 1 : 0) : 1;
        if (!$id || !$nombre) { echo json_encode(['success' => false, 'message' => 'ID y nombre requeridos']); exit; }

        try {
            $db->prepare("UPDATE tbletiquetas SET Nombre=?, Descripcion=?, Color=?, Activa=? WHERE Id_Etiqueta=?")
               ->execute([$nombre, $desc, $color, $activa, $id]);
            echo json_encode(['success' => true, 'message' => 'Etiqueta actualizada']);
        } catch (PDOException $e) {
            if ($e->getCode() === '23000') {
                echo json_encode(['success' => false, 'message' => 'Ya existe otra etiqueta con ese nombre']);
            } else throw $e;
        }
        exit;
    }

    if ($action === 'eliminar') {
        $id = intval($data['id'] ?? 0);
        if (!$id) { echo json_encode(['success' => false, 'message' => 'ID requerido']); exit; }

        $stmt = $db->prepare("SELECT COUNT(*) AS n FROM tblarticulos WHERE Id_Etiqueta = ?");
        $stmt->execute([$id]);
        $n = intval($stmt->fetch()['n']);
        if ($n > 0) {
            echo json_encode(['success' => false, 'message' => "No se puede eliminar. Tiene $n producto(s) asignado(s). Desactívala en su lugar o reasigna los productos a otra etiqueta."]);
            exit;
        }

        $db->prepare("DELETE FROM tbletiquetas WHERE Id_Etiqueta = ?")->execute([$id]);
        echo json_encode(['success' => true, 'message' => 'Etiqueta eliminada']);
        exit;
    }

    echo json_encode(['success' => false, 'message' => "Acción no válida: $action"]);
} catch (Exception $e) {
    echo json_encode(['success' => false, 'message' => $e->getMessage()]);
}
