<?php
/**
 * Familias de Productos — crear/editar/eliminar familia + gestión de items
 * POST {action, ...}
 *   action=crear         {nombre, descripcion}
 *   action=editar        {id, nombre, descripcion, activa}
 *   action=eliminar      {id}                             (CASCADE borra items)
 *   action=agregar_item  {id_familia, items, factor, es_base}
 *   action=editar_item   {id_familia_item, factor, es_base}
 *   action=remover_item  {id_familia_item}
 */
require_once '../config/database.php';

$db = (new Database())->getConnection();
$data = json_decode(file_get_contents('php://input'), true);
$action = $data['action'] ?? '';

try {
    if ($action === 'crear') {
        $nombre = trim($data['nombre'] ?? '');
        $desc   = trim($data['descripcion'] ?? '');
        if (!$nombre) { echo json_encode(['success' => false, 'message' => 'Nombre requerido']); exit; }
        $db->prepare("INSERT INTO tblfamilias_producto (Nombre, Descripcion) VALUES (?, ?)")
           ->execute([$nombre, $desc ?: null]);
        echo json_encode(['success' => true, 'id' => $db->lastInsertId(), 'message' => 'Familia creada']);
        exit;
    }

    if ($action === 'editar') {
        $id     = intval($data['id'] ?? 0);
        $nombre = trim($data['nombre'] ?? '');
        $desc   = trim($data['descripcion'] ?? '');
        $activa = isset($data['activa']) ? intval((bool)$data['activa']) : 1;
        if (!$id || !$nombre) { echo json_encode(['success' => false, 'message' => 'ID y nombre requeridos']); exit; }
        $db->prepare("UPDATE tblfamilias_producto SET Nombre = ?, Descripcion = ?, Activa = ? WHERE Id_Familia = ?")
           ->execute([$nombre, $desc ?: null, $activa, $id]);
        echo json_encode(['success' => true, 'message' => 'Familia actualizada']);
        exit;
    }

    if ($action === 'eliminar') {
        $id = intval($data['id'] ?? 0);
        if (!$id) { echo json_encode(['success' => false, 'message' => 'ID requerido']); exit; }
        $db->prepare("DELETE FROM tblfamilias_producto WHERE Id_Familia = ?")->execute([$id]);
        echo json_encode(['success' => true, 'message' => 'Familia eliminada']);
        exit;
    }

    if ($action === 'agregar_item') {
        $idFam  = intval($data['id_familia'] ?? 0);
        $items  = intval($data['items'] ?? 0);
        $factor = floatval($data['factor'] ?? 1);
        $esBase = !empty($data['es_base']) ? 1 : 0;
        if (!$idFam || !$items || $factor <= 0) { echo json_encode(['success' => false, 'message' => 'Datos inválidos']); exit; }

        // Verificar que el producto no esté ya en otra familia
        $stmt = $db->prepare("SELECT f.Nombre FROM tblfamilia_items fi INNER JOIN tblfamilias_producto f ON fi.Id_Familia = f.Id_Familia WHERE fi.Items = ?");
        $stmt->execute([$items]);
        $existente = $stmt->fetch();
        if ($existente) {
            echo json_encode(['success' => false, 'message' => "Este producto ya pertenece a la familia '{$existente['Nombre']}'"]);
            exit;
        }

        $db->beginTransaction();
        // Si se marca como base, desmarcar las otras
        if ($esBase) {
            $db->prepare("UPDATE tblfamilia_items SET Es_Base = 0 WHERE Id_Familia = ?")->execute([$idFam]);
        }
        $db->prepare("INSERT INTO tblfamilia_items (Id_Familia, Items, Factor, Es_Base) VALUES (?, ?, ?, ?)")
           ->execute([$idFam, $items, $factor, $esBase]);
        $db->commit();
        echo json_encode(['success' => true, 'id' => $db->lastInsertId(), 'message' => 'Producto agregado a la familia']);
        exit;
    }

    if ($action === 'editar_item') {
        $id     = intval($data['id_familia_item'] ?? 0);
        $factor = floatval($data['factor'] ?? 1);
        $esBase = !empty($data['es_base']) ? 1 : 0;
        if (!$id || $factor <= 0) { echo json_encode(['success' => false, 'message' => 'Datos inválidos']); exit; }

        $stmt = $db->prepare("SELECT Id_Familia FROM tblfamilia_items WHERE Id_Familia_Item = ?");
        $stmt->execute([$id]);
        $row = $stmt->fetch();
        if (!$row) { echo json_encode(['success' => false, 'message' => 'Item no encontrado']); exit; }

        $db->beginTransaction();
        if ($esBase) {
            $db->prepare("UPDATE tblfamilia_items SET Es_Base = 0 WHERE Id_Familia = ?")->execute([$row['Id_Familia']]);
        }
        $db->prepare("UPDATE tblfamilia_items SET Factor = ?, Es_Base = ? WHERE Id_Familia_Item = ?")
           ->execute([$factor, $esBase, $id]);
        $db->commit();
        echo json_encode(['success' => true, 'message' => 'Item actualizado']);
        exit;
    }

    if ($action === 'remover_item') {
        $id = intval($data['id_familia_item'] ?? 0);
        if (!$id) { echo json_encode(['success' => false, 'message' => 'ID requerido']); exit; }
        $db->prepare("DELETE FROM tblfamilia_items WHERE Id_Familia_Item = ?")->execute([$id]);
        echo json_encode(['success' => true, 'message' => 'Producto removido de la familia']);
        exit;
    }

    echo json_encode(['success' => false, 'message' => "Acción no válida: $action"]);
} catch (Exception $e) {
    if ($db->inTransaction()) $db->rollBack();
    echo json_encode(['success' => false, 'message' => $e->getMessage()]);
}
