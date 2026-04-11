<?php
/**
 * Cartera - Clientes con saldos pendientes
 */

require_once '../config/database.php';

$database = new Database();
$db = $database->getConnection();

try {
    // Ventas con saldo + facturas anteriores con saldo
    $stmt = $db->query("
        SELECT CodigoClien, Razon_Social, Nit, Telefonos, CupoAutorizado,
               Facturas_Pendientes, Saldo_Total, Factura_Mas_Antigua, Dias_Mayor_Vencimiento
        FROM (
            SELECT c.CodigoClien, c.Razon_Social, c.Nit, c.Telefonos, c.CupoAutorizado,
                   COUNT(*) as Facturas_Pendientes,
                   SUM(saldo) as Saldo_Total,
                   MIN(fecha) as Factura_Mas_Antigua,
                   DATEDIFF(CURDATE(), MIN(fecha)) as Dias_Mayor_Vencimiento
            FROM tblclientes c
            INNER JOIN (
                SELECT CodigoCli as cod, Factura_N, Fecha as fecha, Saldo as saldo FROM tblventas WHERE Saldo > 0
                UNION ALL
                SELECT CodigoCli as cod, FacturaN, Fecha as fecha, Saldo as saldo FROM tblfacturasanteriores WHERE Saldo > 0
            ) f ON c.CodigoClien = f.cod
            GROUP BY c.CodigoClien, c.Razon_Social, c.Nit, c.Telefonos, c.CupoAutorizado
        ) t
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
