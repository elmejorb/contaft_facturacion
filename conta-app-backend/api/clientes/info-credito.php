<?php
/**
 * Información de crédito de un cliente para mostrar al seleccionarlo en NuevaVenta:
 *   - Cupo autorizado
 *   - Deuda actual (suma de saldos de las 3 fuentes: ventas + anteriores + FE)
 *   - Facturas vencidas: cantidad, días más vieja, total vencido
 *   - Severidad (verde / amarillo / naranja / rojo)
 *
 * GET ?id=123
 */
require_once '../config/database.php';
$db = (new Database())->getConnection();

$id = intval($_GET['id'] ?? 0);
if (!$id) { echo json_encode(['success' => false, 'message' => 'ID requerido']); exit; }

try {
    // Datos básicos del cliente
    $stmt = $db->prepare("SELECT CodigoClien, Razon_Social, Nit, CupoAutorizado FROM tblclientes WHERE CodigoClien = ?");
    $stmt->execute([$id]);
    $cliente = $stmt->fetch();
    if (!$cliente) { echo json_encode(['success' => false, 'message' => 'Cliente no encontrado']); exit; }

    $cupo = floatval($cliente['CupoAutorizado']);

    // Facturas pendientes de las 3 fuentes (ventas + anteriores + FE)
    $sqlFacturas = "
        SELECT Factura_N AS num, Fecha, Dias, Saldo, 'venta' AS origen FROM vw_facturas_cliente_saldos WHERE CodigoCli = ? AND Saldo > 0
        UNION ALL
        SELECT FacturaN, Fecha, Dias, Saldo, 'anterior' FROM vw_facturas_anteriores_cliente WHERE CodigoCli = ? AND Saldo > 0
        UNION ALL
        SELECT Factura_N, Fecha, Dias, Saldo, 'electronica' FROM vw_facturas_elec_cliente_saldos WHERE CodigoCli = ? AND Saldo > 0
    ";

    $stmt = $db->prepare($sqlFacturas);
    $stmt->execute([$id, $id, $id]);
    $facturas = $stmt->fetchAll();

    $hoy = new DateTime('today');
    $deudaTotal = 0;
    $vencidas = 0;
    $totalVencido = 0;
    $diasMasVieja = 0;
    $facturaMasVieja = null;

    foreach ($facturas as $f) {
        $saldo = floatval($f['Saldo']);
        $deudaTotal += $saldo;
        // dias_mora = (hoy - fecha) - dias_plazo
        $fecha = new DateTime(substr($f['Fecha'], 0, 10));
        $diasTranscurridos = (int)$hoy->diff($fecha)->format('%a');
        $diasMora = $diasTranscurridos - intval($f['Dias']);
        if ($diasMora > 0) {
            $vencidas++;
            $totalVencido += $saldo;
            if ($diasMora > $diasMasVieja) {
                $diasMasVieja = $diasMora;
                $facturaMasVieja = $f['num'];
            }
        }
    }

    $disponible = $cupo > 0 ? max($cupo - $deudaTotal, 0) : null;
    $porcentajeUsado = $cupo > 0 ? min(($deudaTotal / $cupo) * 100, 999) : 0;

    // Determinar severidad
    $severidad = 'ok';
    if ($diasMasVieja > 30) $severidad = 'rojo';
    elseif ($diasMasVieja > 15) $severidad = 'naranja';
    elseif ($vencidas > 0) $severidad = 'amarillo';
    if ($cupo > 0 && $deudaTotal >= $cupo) $severidad = 'rojo';

    echo json_encode([
        'success' => true,
        'cliente' => [
            'id' => intval($cliente['CodigoClien']),
            'razon_social' => $cliente['Razon_Social'],
            'nit' => $cliente['Nit'],
        ],
        'credito' => [
            'cupo' => $cupo,
            'deuda_total' => round($deudaTotal, 2),
            'disponible' => $disponible,
            'porcentaje_usado' => round($porcentajeUsado, 1),
            'tiene_cupo' => $cupo > 0,
        ],
        'vencimientos' => [
            'facturas_pendientes' => count($facturas),
            'facturas_vencidas' => $vencidas,
            'total_vencido' => round($totalVencido, 2),
            'dias_mas_vieja' => $diasMasVieja,
            'factura_mas_vieja' => $facturaMasVieja,
        ],
        'severidad' => $severidad,  // ok | amarillo | naranja | rojo
    ], JSON_UNESCAPED_UNICODE);
} catch (Exception $e) {
    echo json_encode(['success' => false, 'message' => $e->getMessage()]);
}
