<?php
/**
 * Informe de producción diaria (modo Fabricación v4.7)
 * Agrupa entradas al inventario (kardex con Cant_Ent > 0) por día para
 * medir cuánto se fabricó. Útil para pagar a costureras por prenda.
 *
 * GET ?desde=YYYY-MM-DD&hasta=YYYY-MM-DD (opcional, default: hoy)
 *     &articulo=Items  (opcional, filtra por producto)
 *     &agrupar=articulo|usuario|fecha  (default: articulo)
 */
require_once '../config/database.php';

$db = (new Database())->getConnection();

try {
    $desde = $_GET['desde'] ?? date('Y-m-d');
    $hasta = $_GET['hasta'] ?? date('Y-m-d');
    $articulo = intval($_GET['articulo'] ?? 0);
    $agrupar = $_GET['agrupar'] ?? 'articulo';

    $where = "DATE(k.Fecha) BETWEEN ? AND ? AND k.Cant_Ent > 0";
    $params = [$desde, $hasta];
    if ($articulo > 0) {
        $where .= " AND k.Items = ?";
        $params[] = $articulo;
    }

    // Detalle: todas las entradas del rango
    $stmt = $db->prepare("
        SELECT k.Id_kardex AS id, k.Fecha, k.Items,
               a.Codigo, a.Nombres_Articulo AS articulo,
               k.Cant_Ent AS cantidad, k.Cost_Ent AS costo_total, k.Cost_Unit AS costo_unit,
               k.Detalle AS motivo
        FROM tblkardex k
        LEFT JOIN tblarticulos a ON a.Items = k.Items
        WHERE $where
        ORDER BY k.Fecha DESC
    ");
    $stmt->execute($params);
    $detalle = $stmt->fetchAll();

    // Agregado según `agrupar`
    $resumen = [];
    foreach ($detalle as $d) {
        $key = $agrupar === 'fecha'   ? substr($d['Fecha'], 0, 10)
             : ($agrupar === 'usuario' ? ($d['motivo'] ?? '')
             : ($d['Codigo'] ?? '-'));
        if (!isset($resumen[$key])) {
            $resumen[$key] = [
                'clave' => $key,
                'descripcion' => $agrupar === 'articulo' ? ($d['articulo'] ?? '-') : $key,
                'cantidad' => 0,
                'costo_total' => 0,
                'num_entradas' => 0,
            ];
        }
        $resumen[$key]['cantidad'] += floatval($d['cantidad']);
        $resumen[$key]['costo_total'] += floatval($d['costo_total']);
        $resumen[$key]['num_entradas']++;
    }
    $resumen = array_values($resumen);
    usort($resumen, fn($a,$b) => $b['cantidad'] <=> $a['cantidad']);

    echo json_encode([
        'success' => true,
        'rango' => ['desde' => $desde, 'hasta' => $hasta],
        'agrupar' => $agrupar,
        'resumen' => $resumen,
        'detalle' => $detalle,
        'totales' => [
            'num_entradas' => count($detalle),
            'cantidad_total' => array_sum(array_column($detalle, 'cantidad')),
            'costo_total' => array_sum(array_map('floatval', array_column($detalle, 'costo_total'))),
        ],
    ], JSON_UNESCAPED_UNICODE);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => $e->getMessage()]);
}
?>
