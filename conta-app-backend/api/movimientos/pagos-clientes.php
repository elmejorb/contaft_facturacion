<?php
/**
 * Listado de pagos de clientes
 * GET ?mes=3&anio=2026&medio=0
 */
require_once '../config/database.php';
$database = new Database();
$db = $database->getConnection();

try {
    $anio = $_GET['anio'] ?? date('Y');
    $mes = $_GET['mes'] ?? null;
    $medio = $_GET['medio'] ?? null;
    $estado = $_GET['estado'] ?? 'Valida';

    $where = "YEAR(p.Fecha) = :anio";
    $params = [':anio' => $anio];

    if ($mes) { $where .= " AND MONTH(p.Fecha) = :mes"; $params[':mes'] = $mes; }
    if ($medio !== null && $medio !== '') { $where .= " AND p.id_mediopago = :medio"; $params[':medio'] = $medio; }
    if ($estado) { $where .= " AND p.Estado = :estado"; $params[':estado'] = $estado; }

    $stmt = $db->prepare("
        SELECT p.*, c.Razon_Social as NombreCliente,
               COALESCE(m.nombre_medio, 'Efectivo') as MedioPago
        FROM tblpagos p
        LEFT JOIN tblclientes c ON p.Codigo = c.CodigoClien
        LEFT JOIN tblmedios_pago m ON p.id_mediopago = m.id_mediopago
        WHERE $where
        ORDER BY p.Id_Pagos DESC
        LIMIT 500
    ");
    $stmt->execute($params);
    $pagos = $stmt->fetchAll();

    foreach ($pagos as &$p) {
        $p['ValorPago'] = floatval($p['ValorPago']);
        $p['ValorFact'] = floatval($p['ValorFact']);
        $p['SaldoAct'] = floatval($p['SaldoAct']);
        $p['Descuento'] = floatval($p['Descuento']);
    }

    $totalEfectivo = array_sum(array_map(fn($p) => $p['id_mediopago'] == 0 ? $p['ValorPago'] : 0, $pagos));
    $totalTransf = array_sum(array_map(fn($p) => $p['id_mediopago'] > 0 ? $p['ValorPago'] : 0, $pagos));
    $totalGeneral = array_sum(array_column($pagos, 'ValorPago'));

    $anios = $db->query("SELECT DISTINCT YEAR(Fecha) as a FROM tblpagos ORDER BY a DESC")->fetchAll(PDO::FETCH_COLUMN);
    $medios = $db->query("SELECT * FROM tblmedios_pago ORDER BY id_mediopago")->fetchAll();

    echo json_encode([
        'success' => true,
        'pagos' => $pagos,
        'total' => count($pagos),
        'anios' => $anios,
        'medios' => $medios,
        'resumen' => [
            'total_pagos' => count($pagos),
            'total_efectivo' => $totalEfectivo,
            'total_transferencia' => $totalTransf,
            'total_general' => $totalGeneral
        ]
    ], JSON_UNESCAPED_UNICODE);

} catch (Exception $e) {
    echo json_encode(['success' => false, 'message' => $e->getMessage()]);
}
?>
