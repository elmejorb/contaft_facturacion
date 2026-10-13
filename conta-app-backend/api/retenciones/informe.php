<?php
/**
 * Informe de Retenciones Recibidas por el período (base para Formulario 350).
 *
 * GET ?desde=YYYY-MM-DD&hasta=YYYY-MM-DD
 *   → agrupa por tipo (ReteFuente/ReteIVA/ReteICA), lista detalle, totales.
 *
 * Fuente: tbl_retenciones_pago (abonos) + tbl_retenciones_factura (contado).
 */
require_once '../config/database.php';
$db = (new Database())->getConnection();

try {
    $desde = $_GET['desde'] ?? date('Y-m-01');
    $hasta = $_GET['hasta'] ?? date('Y-m-d');

    // Retenciones aplicadas a abonos (cartera / crédito)
    $stmt = $db->prepare("
        SELECT rp.Id_RetencionPago AS id, rp.concepto_label, rp.tipo_codigo, rp.base, rp.tarifa, rp.monto, rp.Fecha,
               p.RecCajaN AS recibo, p.Fact_N AS factura, p.Codigo AS cod_cliente,
               c.Razon_Social AS cliente_nombre, c.Nit AS cliente_nit,
               'abono' AS origen
        FROM tbl_retenciones_pago rp
        JOIN tblpagos p ON p.Id_Pagos = rp.Id_Pagos
        LEFT JOIN tblclientes c ON c.CodigoClien = p.Codigo
        WHERE DATE(rp.Fecha) BETWEEN ? AND ?
          AND COALESCE(p.Estado,'Valida') = 'Valida'
        ORDER BY rp.Fecha DESC
    ");
    $stmt->execute([$desde, $hasta]);
    $abonos = $stmt->fetchAll();

    // Retenciones aplicadas al facturar contado (FE o POS)
    $factura = [];
    try {
        $stmt = $db->prepare("
            SELECT rf.Id_RetencionFact AS id, rf.concepto_label, rf.tipo_codigo, rf.base, rf.tarifa, rf.monto, rf.Fecha,
                   rf.Factura_N AS factura, rf.FE_Id, 'contado' AS origen
            FROM tbl_retenciones_factura rf
            WHERE DATE(rf.Fecha) BETWEEN ? AND ?
            ORDER BY rf.Fecha DESC
        ");
        $stmt->execute([$desde, $hasta]);
        $factura = $stmt->fetchAll();
    } catch (Throwable $e) {}

    // Totales por tipo
    $totales = [
        '06' => ['label' => 'ReteFuente', 'total' => 0, 'count' => 0],
        '05' => ['label' => 'ReteIVA',    'total' => 0, 'count' => 0],
        '07' => ['label' => 'ReteICA',    'total' => 0, 'count' => 0],
    ];
    $todas = array_merge($abonos, $factura);
    foreach ($todas as $r) {
        $tc = $r['tipo_codigo'] ?? '06';
        if (!isset($totales[$tc])) $totales[$tc] = ['label' => "Tipo $tc", 'total' => 0, 'count' => 0];
        $totales[$tc]['total'] += floatval($r['monto']);
        $totales[$tc]['count'] += 1;
    }
    $totalGeneral = array_sum(array_column($totales, 'total'));

    // Agrupado por concepto (útil para el 350: cada concepto es una línea)
    $porConcepto = [];
    foreach ($todas as $r) {
        $k = $r['tipo_codigo'] . '|' . $r['concepto_label'];
        if (!isset($porConcepto[$k])) {
            $porConcepto[$k] = [
                'tipo_codigo'    => $r['tipo_codigo'],
                'concepto_label' => $r['concepto_label'],
                'cantidad'       => 0,
                'base_total'     => 0,
                'monto_total'    => 0,
            ];
        }
        $porConcepto[$k]['cantidad']++;
        $porConcepto[$k]['base_total']  += floatval($r['base']);
        $porConcepto[$k]['monto_total'] += floatval($r['monto']);
    }

    echo json_encode([
        'success'       => true,
        'periodo'       => ['desde' => $desde, 'hasta' => $hasta],
        'detalle'       => $todas,
        'totales'       => $totales,
        'total_general' => $totalGeneral,
        'por_concepto'  => array_values($porConcepto),
    ], JSON_UNESCAPED_UNICODE);
} catch (Throwable $e) {
    http_response_code(500);
    echo json_encode(['success'=>false,'message'=>$e->getMessage()]);
}
