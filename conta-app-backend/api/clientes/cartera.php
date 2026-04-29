<?php
/**
 * Cartera - Clientes con saldos pendientes
 *
 * Une 3 fuentes (sin duplicar):
 *   - vw_facturas_cliente_saldos       (ventas POS / contado-crédito en tblventas)
 *   - vw_facturas_anteriores_cliente   (saldos migrados pre-sistema)
 *   - vw_facturas_elec_cliente_saldos  (facturas electrónicas crédito en electronic_documents)
 */

require_once '../config/database.php';

$database = new Database();
$db = $database->getConnection();

try {
    // CTE de todas las facturas pendientes (3 fuentes unidas)
    $sqlFacturas = "
        SELECT CodigoCli, Factura_N, Fecha, Dias, Total, Saldo, 'venta' AS Origen FROM vw_facturas_cliente_saldos WHERE Saldo > 0
        UNION ALL
        SELECT CodigoCli, FacturaN AS Factura_N, Fecha, Dias, Total, Saldo, 'anterior' FROM vw_facturas_anteriores_cliente WHERE Saldo > 0
        UNION ALL
        SELECT CodigoCli, Factura_N, Fecha, Dias, Total, Saldo, 'electronica' FROM vw_facturas_elec_cliente_saldos WHERE Saldo > 0
    ";

    $stmt = $db->query("
        SELECT c.CodigoClien, c.Razon_Social, c.Nit, c.Telefonos, c.CupoAutorizado,
               COUNT(*) as Facturas_Pendientes,
               SUM(f.Saldo) as Saldo_Total,
               MIN(f.Fecha) as Factura_Mas_Antigua,
               DATEDIFF(CURDATE(), MIN(f.Fecha)) as Dias_Mayor_Vencimiento
        FROM tblclientes c
        INNER JOIN ($sqlFacturas) f ON c.CodigoClien = f.CodigoCli
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
    unset($c);

    $totalSaldo = array_sum(array_column($clientes, 'Saldo_Total'));
    $totalClientes = count($clientes);
    $vencidos = array_filter($clientes, fn($c) => $c['Dias_Mayor_Vencimiento'] > 30);
    $totalVencidos = count($vencidos);
    $saldoVencido = array_sum(array_column($vencidos, 'Saldo_Total'));

    // Detallado: incluir facturas individuales por cliente (de las 3 fuentes)
    $detallado = $_GET['detallado'] ?? null;
    if ($detallado) {
        $stmtFact = $db->query("
            SELECT CodigoCli, Factura_N, Fecha, Dias, Total, Saldo, Origen,
                   DATEDIFF(CURDATE(), Fecha) AS Dias_Mora
            FROM ($sqlFacturas) f
            ORDER BY CodigoCli, Fecha
        ");
        $todasFacturas = $stmtFact->fetchAll();
        $facturasPorCliente = [];
        foreach ($todasFacturas as $f) {
            $cod = $f['CodigoCli'];
            if (!isset($facturasPorCliente[$cod])) $facturasPorCliente[$cod] = [];
            $facturasPorCliente[$cod][] = [
                'Factura_N' => $f['Factura_N'],
                'Fecha' => $f['Fecha'],
                'Dias_Plazo' => intval($f['Dias']),
                'Total' => floatval($f['Total']),
                'Saldo' => floatval($f['Saldo']),
                'Dias_Mora' => intval($f['Dias_Mora']),
                'Origen' => $f['Origen'],
            ];
        }
        foreach ($clientes as &$c) {
            $c['Facturas'] = $facturasPorCliente[$c['CodigoClien']] ?? [];
        }
        unset($c);
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
