<?php
/**
 * Presentaciones de producto (conversión de unidades)
 * GET ?items=N         → listar presentaciones de un producto
 * POST action=crear    → crear presentación
 * POST action=editar   → editar presentación
 * POST action=eliminar → desactivar presentación
 */
require_once '../config/database.php';
$database = new Database();
$db = $database->getConnection();

try {
    if ($_SERVER['REQUEST_METHOD'] === 'GET') {
        $items = intval($_GET['items'] ?? 0);

        if ($items) {
            // Presentaciones de un producto
            $stmt = $db->prepare("SELECT * FROM tblpresentaciones WHERE Items = ? ORDER BY Factor");
            $stmt->execute([$items]);
            $presentaciones = $stmt->fetchAll();

            // Datos del producto
            $stmt2 = $db->prepare("SELECT Items, Codigo, Nombres_Articulo, Existencia, Precio_Venta, unidad_base FROM tblarticulos WHERE Items = ?");
            $stmt2->execute([$items]);
            $producto = $stmt2->fetch();

            echo json_encode([
                'success' => true,
                'producto' => $producto,
                'presentaciones' => $presentaciones
            ], JSON_UNESCAPED_UNICODE);
        } else {
            // Todos los productos con presentaciones
            $stmt = $db->query("
                SELECT a.Items, a.Codigo, a.Nombres_Articulo, a.unidad_base,
                       COUNT(p.Id_Presentacion) as total_presentaciones
                FROM tblarticulos a
                INNER JOIN tblpresentaciones p ON a.Items = p.Items AND p.Activa = 1
                WHERE a.Estado = 1
                GROUP BY a.Items
                ORDER BY a.Nombres_Articulo
            ");
            echo json_encode(['success' => true, 'productos' => $stmt->fetchAll()], JSON_UNESCAPED_UNICODE);
        }

    } else {
        $data = json_decode(file_get_contents('php://input'), true);
        $action = $data['action'] ?? '';

        if ($action === 'crear') {
            $items = intval($data['items'] ?? 0);
            $nombre = trim($data['nombre'] ?? '');
            $factor = floatval($data['factor'] ?? 1);
            $precio = floatval($data['precio_venta'] ?? 0);
            $codigoBarras = $data['codigo_barras'] ?? null;

            if (!$items || !$nombre || $factor <= 0) {
                echo json_encode(['success' => false, 'message' => 'Producto, nombre y factor son requeridos']);
                exit;
            }

            $db->prepare("INSERT INTO tblpresentaciones (Items, Nombre, Factor, Precio_Venta, Codigo_Barras) VALUES (?, ?, ?, ?, ?)")
               ->execute([$items, $nombre, $factor, $precio, $codigoBarras]);

            echo json_encode(['success' => true, 'message' => "Presentación '$nombre' creada", 'id' => $db->lastInsertId()]);

        } elseif ($action === 'editar') {
            $id = intval($data['id'] ?? 0);
            $db->prepare("UPDATE tblpresentaciones SET Nombre = ?, Factor = ?, Precio_Venta = ?, Codigo_Barras = ? WHERE Id_Presentacion = ?")
               ->execute([$data['nombre'], floatval($data['factor']), floatval($data['precio_venta'] ?? 0), $data['codigo_barras'] ?? null, $id]);
            echo json_encode(['success' => true, 'message' => 'Presentación actualizada']);

        } elseif ($action === 'eliminar') {
            $id = intval($data['id'] ?? 0);
            $db->prepare("UPDATE tblpresentaciones SET Activa = 0 WHERE Id_Presentacion = ?")->execute([$id]);
            echo json_encode(['success' => true, 'message' => 'Presentación desactivada']);

        } elseif ($action === 'actualizar_unidad_base') {
            $items = intval($data['items'] ?? 0);
            $unidad = $data['unidad_base'] ?? 'Unidad';
            $db->prepare("UPDATE tblarticulos SET unidad_base = ? WHERE Items = ?")->execute([$unidad, $items]);
            echo json_encode(['success' => true, 'message' => 'Unidad base actualizada']);
        }
    }
} catch (Exception $e) {
    echo json_encode(['success' => false, 'message' => $e->getMessage()]);
}
?>
