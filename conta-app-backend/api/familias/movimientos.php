<?php
/**
 * Historial de movimientos de distribución.
 * GET ?desde=YYYY-MM-DD&hasta=YYYY-MM-DD&motivo=automatico|manual&items=N
 */
require_once '../config/database.php';

$db = (new Database())->getConnection();

try {
    $desde  = $_GET['desde']  ?? date('Y-m-01');
    $hasta  = $_GET['hasta']  ?? date('Y-m-d');
    $motivo = $_GET['motivo'] ?? '';
    $items  = intval($_GET['items'] ?? 0);

    $where  = "WHERE DATE(m.Fecha) BETWEEN ? AND ?";
    $params = [$desde, $hasta];
    if ($motivo === 'automatico' || $motivo === 'manual') {
        $where .= " AND m.Motivo = ?";
        $params[] = $motivo;
    }
    if ($items) {
        $where .= " AND (m.Items_Origen = ? OR m.Items_Destino = ?)";
        $params[] = $items; $params[] = $items;
    }

    $stmt = $db->prepare("
        SELECT m.*,
               ao.Codigo AS cod_origen,  ao.Nombres_Articulo AS nom_origen,
               ad.Codigo AS cod_destino, ad.Nombres_Articulo AS nom_destino
        FROM tblmovimientos_distribucion m
        LEFT JOIN tblarticulos ao ON m.Items_Origen = ao.Items
        LEFT JOIN tblarticulos ad ON m.Items_Destino = ad.Items
        $where
        ORDER BY m.Fecha DESC
        LIMIT 500
    ");
    $stmt->execute($params);
    echo json_encode(['success' => true, 'movimientos' => $stmt->fetchAll()], JSON_UNESCAPED_UNICODE);
} catch (Exception $e) {
    echo json_encode(['success' => false, 'message' => $e->getMessage()]);
}
