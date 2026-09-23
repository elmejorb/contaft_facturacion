<?php
/**
 * Lista de cargues vendedor (local desktop, tbl_cargues_vendedor).
 * GET params:
 *   estado    → pendiente | aprobado | cerrado | rechazado | todos (def: todos)
 *   fecha_ini → YYYY-MM-DD (opcional)
 *   fecha_fin → YYYY-MM-DD (opcional)
 *   vendedor  → id_vendedor_movil (opcional)
 *   limit     → default 200
 */
require_once '../config/database.php';
$database = new Database();
$db = $database->getConnection();

header('Content-Type: application/json; charset=utf-8');

try {
    $estado    = $_GET['estado']    ?? 'todos';
    $fechaIni  = $_GET['fecha_ini'] ?? '';
    $fechaFin  = $_GET['fecha_fin'] ?? '';
    $vendedor  = $_GET['vendedor']  ?? '';
    $limit     = min(500, max(1, intval($_GET['limit'] ?? 200)));

    $where = ['1=1'];
    $params = [];

    if ($estado !== '' && $estado !== 'todos') {
        $where[] = 'c.estado = ?';
        $params[] = $estado;
    }
    if ($fechaIni !== '') { $where[] = 'c.fecha >= ?'; $params[] = $fechaIni; }
    if ($fechaFin !== '') { $where[] = 'c.fecha <= ?'; $params[] = $fechaFin; }
    if ($vendedor !== '') { $where[] = 'c.id_vendedor_movil = ?'; $params[] = intval($vendedor); }

    $sql = "
        SELECT
            c.id,
            c.id_vendedor_movil,
            v.codigo AS codigo_vendedor,
            v.nombre AS nombre_vendedor,
            c.id_cargue_hub,
            c.fecha,
            c.estado,
            c.total_valor_cargue,
            c.total_valor_devuelto,
            c.total_valor_danado,
            c.dinero_recibido,
            (c.total_valor_cargue - c.total_valor_devuelto - c.total_valor_danado) AS valor_esperado,
            (c.dinero_recibido - (c.total_valor_cargue - c.total_valor_devuelto - c.total_valor_danado)) AS diferencia_caja,
            c.notas_vendedor,
            c.notas_admin,
            c.aprobado_at,
            c.cerrado_at,
            c.created_at,
            (SELECT COUNT(*) FROM tbl_cargues_vendedor_detalle d WHERE d.id_cargue = c.id) AS lineas
        FROM tbl_cargues_vendedor c
        LEFT JOIN tbl_vendedores_movil v ON v.id = c.id_vendedor_movil
        WHERE " . implode(' AND ', $where) . "
        ORDER BY c.fecha DESC, c.id DESC
        LIMIT " . $limit;

    $stmt = $db->prepare($sql);
    $stmt->execute($params);
    $cargues = $stmt->fetchAll(PDO::FETCH_ASSOC);

    // Conteos por estado (para pills de UI)
    $stmtC = $db->query("
        SELECT estado, COUNT(*) AS n
        FROM tbl_cargues_vendedor
        WHERE fecha >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
        GROUP BY estado
    ");
    $conteosRows = $stmtC->fetchAll(PDO::FETCH_ASSOC);
    $conteos = ['pendiente' => 0, 'aprobado' => 0, 'cerrado' => 0, 'rechazado' => 0];
    foreach ($conteosRows as $r) {
        $conteos[$r['estado']] = intval($r['n']);
    }

    echo json_encode([
        'success' => true,
        'cargues' => $cargues,
        'conteos_30d' => $conteos,
    ], JSON_UNESCAPED_UNICODE);
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => $e->getMessage()], JSON_UNESCAPED_UNICODE);
}
