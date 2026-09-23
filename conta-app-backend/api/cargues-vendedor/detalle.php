<?php
/**
 * Detalle de un cargue con líneas + info del vendedor.
 * GET ?id=X
 */
require_once '../config/database.php';
$database = new Database();
$db = $database->getConnection();

header('Content-Type: application/json; charset=utf-8');

try {
    $id = intval($_GET['id'] ?? 0);
    if ($id <= 0) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'id requerido'], JSON_UNESCAPED_UNICODE);
        exit;
    }

    $stmt = $db->prepare("
        SELECT c.*,
               v.codigo AS codigo_vendedor,
               v.nombre AS nombre_vendedor,
               v.telefono AS telefono_vendedor,
               (c.total_valor_cargue - c.total_valor_devuelto - c.total_valor_danado) AS valor_esperado,
               (c.dinero_recibido - (c.total_valor_cargue - c.total_valor_devuelto - c.total_valor_danado)) AS diferencia_caja
        FROM tbl_cargues_vendedor c
        LEFT JOIN tbl_vendedores_movil v ON v.id = c.id_vendedor_movil
        WHERE c.id = ?
    ");
    $stmt->execute([$id]);
    $cargue = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$cargue) {
        http_response_code(404);
        echo json_encode(['success' => false, 'message' => 'Cargue no encontrado'], JSON_UNESCAPED_UNICODE);
        exit;
    }

    $stmtD = $db->prepare("
        SELECT d.*,
               a.Nombres_Articulo AS nombre_articulo,
               a.Existencia AS stock_actual
        FROM tbl_cargues_vendedor_detalle d
        LEFT JOIN tblarticulos a ON a.Items = d.items
        WHERE d.id_cargue = ?
        ORDER BY a.Nombres_Articulo ASC
    ");
    $stmtD->execute([$id]);
    $detalle = $stmtD->fetchAll(PDO::FETCH_ASSOC);

    echo json_encode([
        'success' => true,
        'cargue' => $cargue,
        'detalle' => $detalle,
    ], JSON_UNESCAPED_UNICODE);
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => $e->getMessage()], JSON_UNESCAPED_UNICODE);
}
