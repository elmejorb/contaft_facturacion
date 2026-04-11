<?php
/**
 * Listado de pagos a proveedores (egresos)
 * GET ?mes=3&anio=2026
 */
require_once '../config/database.php';
$database = new Database();
$db = $database->getConnection();

try {
    $anio = $_GET['anio'] ?? date('Y');
    $mes = $_GET['mes'] ?? null;
    $estado = $_GET['estado'] ?? 'Valida';

    $where = "YEAR(e.Fecha) = :anio";
    $params = [':anio' => $anio];

    if ($mes) { $where .= " AND MONTH(e.Fecha) = :mes"; $params[':mes'] = $mes; }
    if ($estado) { $where .= " AND e.Estado = :estado"; $params[':estado'] = $estado; }

    $stmt = $db->prepare("
        SELECT e.*, p.RazonSocial as NombreProveedor
        FROM tblegresos e
        LEFT JOIN tblproveedores p ON e.CodigoPro = p.CodigoPro
        WHERE $where
        ORDER BY e.Id_Egresos DESC
        LIMIT 500
    ");
    $stmt->execute($params);
    $egresos = $stmt->fetchAll();

    foreach ($egresos as &$eg) {
        $eg['Valor'] = floatval($eg['Valor']);
        $eg['Descuento'] = floatval($eg['Descuento']);
        $eg['ValorFact'] = floatval($eg['ValorFact']);
        $eg['Saldoact'] = floatval($eg['Saldoact']);
    }

    $totalGeneral = array_sum(array_column($egresos, 'Valor'));
    $anios = $db->query("SELECT DISTINCT YEAR(Fecha) as a FROM tblegresos ORDER BY a DESC")->fetchAll(PDO::FETCH_COLUMN);

    echo json_encode([
        'success' => true,
        'egresos' => $egresos,
        'total' => count($egresos),
        'anios' => $anios,
        'resumen' => [
            'total_egresos' => count($egresos),
            'total_general' => $totalGeneral
        ]
    ], JSON_UNESCAPED_UNICODE);

} catch (Exception $e) {
    echo json_encode(['success' => false, 'message' => $e->getMessage()]);
}
?>
