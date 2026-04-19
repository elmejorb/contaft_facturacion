<?php
/**
 * Familias de Productos — listar
 * GET                  → todas las familias con sus items
 * GET ?id=N            → una familia con sus items
 * GET ?items=N         → familia a la que pertenece el producto (o null)
 * GET ?search=texto    → buscar familias por nombre
 */
require_once '../config/database.php';

$db = (new Database())->getConnection();

try {
    if (isset($_GET['items'])) {
        $items = intval($_GET['items']);
        $stmt = $db->prepare("
            SELECT f.Id_Familia, f.Nombre, f.Descripcion, f.Activa,
                   fi.Items, fi.Factor, fi.Es_Base
            FROM tblfamilia_items fi
            INNER JOIN tblfamilias_producto f ON fi.Id_Familia = f.Id_Familia
            WHERE fi.Items = ?
        ");
        $stmt->execute([$items]);
        $row = $stmt->fetch();
        echo json_encode(['success' => true, 'familia' => $row ?: null], JSON_UNESCAPED_UNICODE);
        exit;
    }

    if (isset($_GET['id'])) {
        $id = intval($_GET['id']);
        $stmt = $db->prepare("SELECT * FROM tblfamilias_producto WHERE Id_Familia = ?");
        $stmt->execute([$id]);
        $familia = $stmt->fetch();
        if (!$familia) { echo json_encode(['success' => false, 'message' => 'Familia no encontrada']); exit; }

        $stmt = $db->prepare("
            SELECT fi.Id_Familia_Item, fi.Items, fi.Factor, fi.Es_Base,
                   a.Codigo, a.Nombres_Articulo, a.Existencia, a.Precio_Venta,
                   COALESCE(a.Existencia_minima, 0) AS Stock_Minimo
            FROM tblfamilia_items fi
            INNER JOIN tblarticulos a ON fi.Items = a.Items
            WHERE fi.Id_Familia = ?
            ORDER BY fi.Factor DESC
        ");
        $stmt->execute([$id]);
        $familia['items'] = $stmt->fetchAll();

        echo json_encode(['success' => true, 'familia' => $familia], JSON_UNESCAPED_UNICODE);
        exit;
    }

    $search = $_GET['search'] ?? '';
    $where = "WHERE 1=1";
    $params = [];
    if ($search) { $where .= " AND f.Nombre LIKE ?"; $params[] = "%$search%"; }

    $stmt = $db->prepare("
        SELECT f.Id_Familia, f.Nombre, f.Descripcion, f.Activa, f.Fecha_Creacion,
               COUNT(fi.Id_Familia_Item) AS total_items,
               COALESCE(SUM(a.Existencia), 0) AS existencia_total
        FROM tblfamilias_producto f
        LEFT JOIN tblfamilia_items fi ON f.Id_Familia = fi.Id_Familia
        LEFT JOIN tblarticulos a ON fi.Items = a.Items
        $where
        GROUP BY f.Id_Familia
        ORDER BY f.Nombre
    ");
    $stmt->execute($params);
    $familias = $stmt->fetchAll();

    echo json_encode(['success' => true, 'familias' => $familias], JSON_UNESCAPED_UNICODE);
} catch (Exception $e) {
    echo json_encode(['success' => false, 'message' => $e->getMessage()]);
}
