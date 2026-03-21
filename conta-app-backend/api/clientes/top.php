<?php
/**
 * Top Clientes por año
 * GET ?anio=2026
 */

require_once '../config/database.php';

$database = new Database();
$db = $database->getConnection();

try {
    $anio = $_GET['anio'] ?? date('Y');

    // Años disponibles
    $stmt = $db->query("SELECT DISTINCT YEAR(Fecha) as anio FROM tblventas ORDER BY anio DESC");
    $anios = array_column($stmt->fetchAll(), 'anio');

    // Top clientes
    $stmt = $db->prepare("
        SELECT c.CodigoClien, c.Razon_Social, c.Nit, c.Telefonos,
               COUNT(v.Factura_N) as Total_Facturas,
               SUM(v.Total) as Monto_Total,
               AVG(v.Total) as Promedio_Factura,
               MIN(v.Fecha) as Primera_Compra,
               MAX(v.Fecha) as Ultima_Compra
        FROM tblventas v
        INNER JOIN tblclientes c ON v.CodigoCli = c.CodigoClien
        WHERE YEAR(v.Fecha) = :anio
        GROUP BY c.CodigoClien, c.Razon_Social, c.Nit, c.Telefonos
        ORDER BY Monto_Total DESC
    ");
    $stmt->execute([':anio' => $anio]);
    $clientes = $stmt->fetchAll();

    $totalVentas = 0;
    foreach ($clientes as &$c) {
        $c['Monto_Total'] = floatval($c['Monto_Total']);
        $c['Promedio_Factura'] = floatval($c['Promedio_Factura']);
        $c['Total_Facturas'] = intval($c['Total_Facturas']);
        $totalVentas += $c['Monto_Total'];
    }

    // Calcular porcentaje
    foreach ($clientes as &$c) {
        $c['Porcentaje'] = $totalVentas > 0 ? round(($c['Monto_Total'] / $totalVentas) * 100, 2) : 0;
    }

    echo json_encode([
        "success" => true,
        "anio" => intval($anio),
        "anios_disponibles" => $anios,
        "clientes" => $clientes,
        "total" => count($clientes),
        "total_ventas" => $totalVentas
    ], JSON_UNESCAPED_UNICODE);

} catch(Exception $e) {
    http_response_code(500);
    echo json_encode(["success" => false, "message" => $e->getMessage()]);
}
?>
