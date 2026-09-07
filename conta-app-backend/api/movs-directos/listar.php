<?php
/**
 * GET /api/movs-directos/listar
 * Params opcionales: tipo (entrada|salida), motivo, fecha_desde, fecha_hasta,
 *                    items, estado, limit
 *
 * Devuelve movimientos + info del artículo + usuario para mostrar en la tabla.
 */
require_once '../config/database.php';
$db = (new Database())->getConnection();

try {
    $where = ["1=1"];
    $params = [];
    if (!empty($_GET['tipo'])) { $where[] = 'm.tipo = ?'; $params[] = $_GET['tipo']; }
    if (!empty($_GET['motivo'])) { $where[] = 'm.motivo = ?'; $params[] = $_GET['motivo']; }
    if (!empty($_GET['fecha_desde'])) { $where[] = 'm.fecha >= ?'; $params[] = $_GET['fecha_desde']; }
    if (!empty($_GET['fecha_hasta'])) { $where[] = 'm.fecha <= ?'; $params[] = $_GET['fecha_hasta']; }
    if (!empty($_GET['items'])) { $where[] = 'm.Items = ?'; $params[] = intval($_GET['items']); }
    // estado default = Valida (Anulada solo si lo piden explícito)
    $estado = $_GET['estado'] ?? 'Valida';
    if ($estado !== 'Todas') { $where[] = 'm.Estado = ?'; $params[] = $estado; }
    $limit = min(500, intval($_GET['limit'] ?? 200));
    $whereStr = implode(' AND ', $where);

    $stmt = $db->prepare("
        SELECT m.id_mov, m.numero_mov, m.tipo, m.motivo, m.fecha,
               m.Items, m.Cantidad, m.Costo_Unitario, m.Costo_Total,
               m.Concepto, m.Estado, m.FechaCreacion,
               a.Codigo AS articulo_codigo, a.Nombres_Articulo AS articulo_nombre,
               a.Existencia AS existencia_actual,
               u.Nombre AS usuario_nombre
          FROM tbl_movs_directos m
          LEFT JOIN tblarticulos a ON a.Items = m.Items
          LEFT JOIN tblusuarios u ON u.Id_Usuario = m.Id_Usuario
         WHERE $whereStr
         ORDER BY m.fecha DESC, m.id_mov DESC
         LIMIT $limit
    ");
    $stmt->execute($params);
    $movs = $stmt->fetchAll();

    foreach ($movs as &$m) {
        $m['Cantidad']       = floatval($m['Cantidad']);
        $m['Costo_Unitario'] = floatval($m['Costo_Unitario']);
        $m['Costo_Total']    = floatval($m['Costo_Total']);
        $m['existencia_actual'] = floatval($m['existencia_actual'] ?? 0);
    }

    // Resumen por tipo (para chips arriba de la tabla)
    $stmtR = $db->prepare("
        SELECT tipo, COUNT(*) AS n, COALESCE(SUM(Costo_Total),0) AS monto
          FROM tbl_movs_directos m
         WHERE $whereStr
         GROUP BY tipo
    ");
    $stmtR->execute($params);
    $resumen = ['entrada' => ['n'=>0,'monto'=>0], 'salida' => ['n'=>0,'monto'=>0]];
    foreach ($stmtR->fetchAll() as $r) {
        $resumen[$r['tipo']] = ['n' => intval($r['n']), 'monto' => floatval($r['monto'])];
    }

    echo json_encode([
        'success' => true,
        'movimientos' => $movs,
        'resumen' => $resumen,
        'total' => count($movs),
    ], JSON_UNESCAPED_UNICODE);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => $e->getMessage()]);
}
