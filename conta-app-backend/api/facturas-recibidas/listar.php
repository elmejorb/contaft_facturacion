<?php
/**
 * GET /api/facturas-recibidas/listar.php[?anio=2026&mes=7&emisor_nit=...]
 *
 * Devuelve las facturas recibidas del período, cada una con:
 *   - cabecera (emisor, número, total, fecha)
 *   - eventos aplicados (array de códigos 030/031/032/033/034)
 *   - flags de conveniencia (tiene_030, tiene_032, etc.) para que el frontend
 *     decida qué botones habilitar sin recalcular
 *
 * Se recomienda paginar por anio+mes para no traer todo el histórico.
 */
require_once __DIR__ . '/../config/database.php';
header('Content-Type: application/json; charset=utf-8');

try {
    $db = (new Database())->getConnection();

    $anio      = intval($_GET['anio'] ?? date('Y'));
    $mes       = intval($_GET['mes']  ?? 0);   // 0 = todo el año
    $emisorNit = trim((string)($_GET['emisor_nit'] ?? ''));
    $busqueda  = trim((string)($_GET['q'] ?? ''));

    $where  = ['YEAR(f.fecha_emision) = :anio'];
    $params = [':anio' => $anio];
    if ($mes > 0) {
        $where[] = 'MONTH(f.fecha_emision) = :mes';
        $params[':mes'] = $mes;
    }
    if ($emisorNit !== '') {
        $where[] = 'f.emisor_nit = :nit';
        $params[':nit'] = $emisorNit;
    }
    if ($busqueda !== '') {
        $where[] = '(f.emisor_nombre LIKE :q OR f.numero LIKE :q OR f.cufe LIKE :q)';
        $params[':q'] = "%$busqueda%";
    }
    $whereSql = implode(' AND ', $where);

    // Cargar cabeceras + eventos agregados en un solo query
    $sql = "
        SELECT f.*,
               GROUP_CONCAT(DISTINCT CASE WHEN e.estado = 'aprobado' THEN e.event_code END ORDER BY e.event_code) AS eventos_aprobados,
               SUM(CASE WHEN e.event_code = '030' AND e.estado = 'aprobado' THEN 1 ELSE 0 END) > 0 AS tiene_030,
               SUM(CASE WHEN e.event_code = '032' AND e.estado = 'aprobado' THEN 1 ELSE 0 END) > 0 AS tiene_032,
               SUM(CASE WHEN e.event_code = '033' AND e.estado = 'aprobado' THEN 1 ELSE 0 END) > 0 AS tiene_033,
               SUM(CASE WHEN e.event_code = '034' AND e.estado = 'aprobado' THEN 1 ELSE 0 END) > 0 AS tiene_034,
               SUM(CASE WHEN e.event_code = '031' AND e.estado = 'aprobado' THEN 1 ELSE 0 END) > 0 AS tiene_031,
               MAX(e.enviado_at) AS ultimo_evento_at
        FROM facturas_recibidas f
        LEFT JOIN eventos_factura_recibida e ON e.factura_recibida_id = f.id
        WHERE $whereSql
        GROUP BY f.id
        ORDER BY f.fecha_emision DESC, f.id DESC
    ";
    $stmt = $db->prepare($sql);
    $stmt->execute($params);
    $rows = $stmt->fetchAll();

    // Normalizar tipos (MySQL devuelve todo como string)
    foreach ($rows as &$r) {
        $r['subtotal']   = floatval($r['subtotal']);
        $r['total_iva']  = floatval($r['total_iva']);
        $r['total']      = floatval($r['total']);
        $r['tiene_030']  = (bool) intval($r['tiene_030']);
        $r['tiene_031']  = (bool) intval($r['tiene_031']);
        $r['tiene_032']  = (bool) intval($r['tiene_032']);
        $r['tiene_033']  = (bool) intval($r['tiene_033']);
        $r['tiene_034']  = (bool) intval($r['tiene_034']);
        // Comodidad: array de códigos aplicados
        $r['eventos_aprobados_arr'] = $r['eventos_aprobados']
            ? array_values(array_filter(explode(',', $r['eventos_aprobados'])))
            : [];
    }
    unset($r);

    // Años disponibles para el dropdown de filtro
    $anios = $db->query("SELECT DISTINCT YEAR(fecha_emision) AS a FROM facturas_recibidas WHERE fecha_emision IS NOT NULL ORDER BY a DESC")
        ->fetchAll(\PDO::FETCH_COLUMN);

    // Resumen del período
    $resumen = [
        'total_facturas' => count($rows),
        'total_monto'    => array_sum(array_column($rows, 'total')),
        'sin_acuse'      => count(array_filter($rows, fn($r) => !$r['tiene_030'])),
    ];

    echo json_encode([
        'success' => true,
        'facturas' => $rows,
        'anios'    => $anios,
        'resumen'  => $resumen,
    ], JSON_UNESCAPED_UNICODE);

} catch (\Throwable $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => $e->getMessage()]);
}
