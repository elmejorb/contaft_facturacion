<?php
/**
 * Cartera - Clientes con saldos pendientes
 */

require_once '../config/database.php';

$database = new Database();
$db = $database->getConnection();

try {
    $stmt = $db->query("
        SELECT c.CodigoClien, c.Razon_Social, c.Nit, c.Telefonos, c.CupoAutorizado,
               COUNT(v.Factura_N) as Facturas_Pendientes,
               SUM(v.Saldo) as Saldo_Total,
               MIN(v.Fecha) as Factura_Mas_Antigua,
               DATEDIFF(CURDATE(), MIN(v.Fecha)) as Dias_Mayor_Vencimiento
        FROM tblclientes c
        INNER JOIN tblventas v ON c.CodigoClien = v.CodigoCli
        WHERE v.Saldo > 0
        GROUP BY c.CodigoClien, c.Razon_Social, c.Nit, c.Telefonos, c.CupoAutorizado
        ORDER BY Saldo_Total DESC
    ");
    $clientes = $stmt->fetchAll();

    foreach ($clientes as &$c) {
        $c['Saldo_Total'] = floatval($c['Saldo_Total']);
        $c['CupoAutorizado'] = floatval($c['CupoAutorizado']);
        $c['Facturas_Pendientes'] = intval($c['Facturas_Pendientes']);
        $c['Dias_Mayor_Vencimiento'] = intval($c['Dias_Mayor_Vencimiento']);
    }

    $totalSaldo = array_sum(array_column($clientes, 'Saldo_Total'));
    $totalClientes = count($clientes);
    $vencidos = array_filter($clientes, fn($c) => $c['Dias_Mayor_Vencimiento'] > 30);
    $totalVencidos = count($vencidos);
    $saldoVencido = array_sum(array_column($vencidos, 'Saldo_Total'));

    // Detallado: incluir facturas individuales por cliente
    $detallado = $_GET['detallado'] ?? null;
    $facturasPorCliente = [];

    if ($detallado) {
        $stmtFact = $db->query("
            SELECT v.CodigoCli, v.Factura_N, v.Fecha, v.Dias, v.Total, v.Saldo,
                   DATEDIFF(CURDATE(), v.Fecha) as Dias_Mora
            FROM tblventas v
            WHERE v.Saldo > 0
            ORDER BY v.CodigoCli, v.Fecha
        ");
        $todasFacturas = $stmtFact->fetchAll();
        foreach ($todasFacturas as $f) {
            $cod = $f['CodigoCli'];
            if (!isset($facturasPorCliente[$cod])) $facturasPorCliente[$cod] = [];
            $facturasPorCliente[$cod][] = [
                'Factura_N' => $f['Factura_N'],
                'Fecha' => $f['Fecha'],
                'Dias_Plazo' => intval($f['Dias']),
                'Total' => floatval($f['Total']),
                'Saldo' => floatval($f['Saldo']),
                'Dias_Mora' => intval($f['Dias_Mora'])
            ];
        }

        foreach ($clientes as &$c) {
            $c['Facturas'] = $facturasPorCliente[$c['CodigoClien']] ?? [];
        }
    }

    echo json_encode([
        "success" => true,
        "clientes" => $clientes,
        "resumen" => [
            "total_clientes" => $totalClientes,
            "total_saldo" => $totalSaldo,
            "total_vencidos" => $totalVencidos,
            "saldo_vencido" => $saldoVencido
        ]
    ], JSON_UNESCAPED_UNICODE);

} catch(Exception $e) {
    http_response_code(500);
    echo json_encode(["success" => false, "message" => $e->getMessage()]);
}
?>
