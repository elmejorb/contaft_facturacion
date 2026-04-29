<?php
/**
 * Productos compuestos (recetas / BOM).
 *
 * GET ?items=N → componentes del producto N
 * GET ?listar=1 → todos los productos compuestos con su capacidad de armado
 *
 * POST {action: 'agregar', items_padre, items_componente, cantidad, comentario?}
 *   → agrega o actualiza un componente. Marca el padre como tiene_componentes=1.
 *
 * POST {action: 'eliminar', id_componente}
 *   → elimina un componente. Si era el último, marca tiene_componentes=0.
 *
 * POST {action: 'actualizar', id_componente, cantidad, comentario?}
 *   → cambia cantidad o comentario de un componente.
 *
 * POST {action: 'recalcular_costo', items_padre}
 *   → suma costos de los componentes y actualiza Precio_Costo del padre.
 */
require_once '../config/database.php';
$db = (new Database())->getConnection();

try {
    if ($_SERVER['REQUEST_METHOD'] === 'GET') {
        if (isset($_GET['listar'])) {
            $stmt = $db->query("SELECT * FROM vw_capacidad_compuestos ORDER BY Producto");
            echo json_encode(['success' => true, 'compuestos' => $stmt->fetchAll()], JSON_UNESCAPED_UNICODE);
            exit;
        }

        $items = intval($_GET['items'] ?? 0);
        if (!$items) { echo json_encode(['success' => false, 'message' => 'items requerido']); exit; }

        $stmt = $db->prepare("SELECT * FROM vw_componentes_detalle WHERE Items_Padre = ? ORDER BY Nombre_Componente");
        $stmt->execute([$items]);
        $componentes = $stmt->fetchAll();

        $costoTotal = 0;
        foreach ($componentes as $c) $costoTotal += floatval($c['Costo_Aporte']);

        echo json_encode([
            'success' => true,
            'componentes' => $componentes,
            'costo_total' => $costoTotal,
        ], JSON_UNESCAPED_UNICODE);
        exit;
    }

    $data = json_decode(file_get_contents('php://input'), true);
    $action = $data['action'] ?? '';

    if ($action === 'agregar') {
        $padre  = intval($data['items_padre'] ?? 0);
        $comp   = intval($data['items_componente'] ?? 0);
        $cant   = floatval($data['cantidad'] ?? 0);
        $coment = trim($data['comentario'] ?? '') ?: null;

        if (!$padre || !$comp || $cant <= 0) {
            echo json_encode(['success' => false, 'message' => 'Datos inválidos']); exit;
        }
        if ($padre === $comp) {
            echo json_encode(['success' => false, 'message' => 'Un producto no puede ser su propio componente']); exit;
        }

        // Verificar que el componente no sea a su vez compuesto que incluya al padre (loop)
        $stmt = $db->prepare("SELECT 1 FROM tblproducto_componentes WHERE Items_Padre = ? AND Items_Componente = ?");
        $stmt->execute([$comp, $padre]);
        if ($stmt->fetch()) {
            echo json_encode(['success' => false, 'message' => 'Bucle detectado: el componente seleccionado ya usa este producto como su componente']); exit;
        }

        // INSERT...ON DUPLICATE KEY UPDATE → si ya existe, actualiza la cantidad
        $db->prepare("
            INSERT INTO tblproducto_componentes (Items_Padre, Items_Componente, Cantidad, Comentario)
            VALUES (?, ?, ?, ?)
            ON DUPLICATE KEY UPDATE Cantidad = VALUES(Cantidad), Comentario = VALUES(Comentario)
        ")->execute([$padre, $comp, $cant, $coment]);

        // Marcar padre como compuesto
        $db->prepare("UPDATE tblarticulos SET tiene_componentes = 1 WHERE Items = ?")->execute([$padre]);

        echo json_encode(['success' => true, 'message' => 'Componente agregado']);
        exit;
    }

    if ($action === 'eliminar') {
        $id = intval($data['id_componente'] ?? 0);
        if (!$id) { echo json_encode(['success' => false, 'message' => 'ID requerido']); exit; }

        // Capturar el padre antes de borrar
        $stmt = $db->prepare("SELECT Items_Padre FROM tblproducto_componentes WHERE Id_Componente = ?");
        $stmt->execute([$id]);
        $row = $stmt->fetch();
        if (!$row) { echo json_encode(['success' => false, 'message' => 'Componente no encontrado']); exit; }
        $padre = intval($row['Items_Padre']);

        $db->prepare("DELETE FROM tblproducto_componentes WHERE Id_Componente = ?")->execute([$id]);

        // Si quedaron 0 componentes, desmarcar el padre
        $stmt = $db->prepare("SELECT COUNT(*) AS n FROM tblproducto_componentes WHERE Items_Padre = ?");
        $stmt->execute([$padre]);
        if (intval($stmt->fetch()['n']) === 0) {
            $db->prepare("UPDATE tblarticulos SET tiene_componentes = 0 WHERE Items = ?")->execute([$padre]);
        }

        echo json_encode(['success' => true, 'message' => 'Componente eliminado']);
        exit;
    }

    if ($action === 'actualizar') {
        $id     = intval($data['id_componente'] ?? 0);
        $cant   = floatval($data['cantidad'] ?? 0);
        $coment = isset($data['comentario']) ? (trim($data['comentario']) ?: null) : null;

        if (!$id || $cant <= 0) { echo json_encode(['success' => false, 'message' => 'Datos inválidos']); exit; }

        $db->prepare("UPDATE tblproducto_componentes SET Cantidad = ?, Comentario = ? WHERE Id_Componente = ?")
           ->execute([$cant, $coment, $id]);

        echo json_encode(['success' => true, 'message' => 'Componente actualizado']);
        exit;
    }

    if ($action === 'recalcular_costo') {
        $padre = intval($data['items_padre'] ?? 0);
        if (!$padre) { echo json_encode(['success' => false, 'message' => 'items_padre requerido']); exit; }

        $stmt = $db->prepare("
            SELECT COALESCE(SUM(c.Cantidad * a.Precio_Costo), 0) AS total
            FROM tblproducto_componentes c
            INNER JOIN tblarticulos a ON c.Items_Componente = a.Items
            WHERE c.Items_Padre = ?
        ");
        $stmt->execute([$padre]);
        $costoTotal = floatval($stmt->fetch()['total']);

        $db->prepare("UPDATE tblarticulos SET Precio_Costo = ? WHERE Items = ?")->execute([$costoTotal, $padre]);

        echo json_encode([
            'success' => true,
            'costo_calculado' => $costoTotal,
            'message' => 'Costo del producto actualizado a ' . number_format($costoTotal, 2)
        ]);
        exit;
    }

    echo json_encode(['success' => false, 'message' => "Acción no válida: $action"]);
} catch (Exception $e) {
    echo json_encode(['success' => false, 'message' => $e->getMessage()]);
}
