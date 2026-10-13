<?php
/**
 * Informe de Ingresos Totales por período (día o mes).
 *
 * GET ?desde=YYYY-MM-DD&hasta=YYYY-MM-DD&agrupacion=dia|mes
 *
 * Devuelve, por cada período (día o mes):
 *   - ventas_contado        → tblventas (Tipo='Contado' + EstadoFact='Valida') +
 *                              electronic_documents (type=1, status autorizado,
 *                              payment_form_id=1) sin Fra POS espejo
 *   - ventas_credito        → ídem pero Tipo='Credito' / payment_form_id=2
 *   - pagos_cartera         → tblpagos (Estado='Valida')
 *   - retenciones_recibidas → tbl_retenciones_pago (sumadas al pago)
 *   - total_ingreso_real    → contado + pagos cartera + retenciones (dinero
 *                              que entró o quedó a favor del impuesto)
 *   - total_devengado       → contado + credito (base para IVA/DIAN)
 *
 * No duplica FE vinculada por CUFE a tblventas — en ese caso tomamos la POS.
 */
require_once '../config/database.php';
$db = (new Database())->getConnection();

try {
    $desde = $_GET['desde'] ?? date('Y-m-01');
    $hasta = $_GET['hasta'] ?? date('Y-m-d');
    $agr   = $_GET['agrupacion'] ?? 'dia';
    if (!in_array($agr, ['dia','mes'], true)) $agr = 'dia';

    $fmtGrupo = $agr === 'mes' ? "DATE_FORMAT(?, '%Y-%m')" : "DATE(?)";
    // Para subqueries, cada una usa su propia expresión. Usamos sprintf
    // dinámico para armar la expresión por tabla.
    $grpVentas = $agr === 'mes' ? "DATE_FORMAT(v.Fecha, '%Y-%m')" : "DATE(v.Fecha)";
    $grpPagos  = $agr === 'mes' ? "DATE_FORMAT(p.Fecha, '%Y-%m')" : "DATE(p.Fecha)";
    $grpFE     = $agr === 'mes' ? "DATE_FORMAT(e.created_at, '%Y-%m')" : "DATE(e.created_at)";
    $grpRet    = $agr === 'mes' ? "DATE_FORMAT(rp.Fecha, '%Y-%m')" : "DATE(rp.Fecha)";

    // Detectar tabla electronic_documents (puede no existir en BDs viejas)
    $tieneFE = intval($db->query("SELECT COUNT(*) FROM information_schema.TABLES WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='electronic_documents'")->fetchColumn()) > 0;

    // 1) Ventas POS (tblventas Valida)
    $sql = "
        SELECT $grpVentas AS periodo,
               COALESCE(SUM(CASE WHEN v.Tipo = 'Contado' THEN v.Total ELSE 0 END), 0) AS v_contado,
               COALESCE(SUM(CASE WHEN v.Tipo != 'Contado' THEN v.Total ELSE 0 END), 0) AS v_credito,
               COUNT(*) AS n_ventas
        FROM tblventas v
        WHERE v.EstadoFact = 'Valida'
          AND DATE(v.Fecha) BETWEEN ? AND ?
        GROUP BY periodo
    ";
    $stmt = $db->prepare($sql);
    $stmt->execute([$desde, $hasta]);
    $ventas = [];
    foreach ($stmt->fetchAll() as $r) {
        $ventas[$r['periodo']] = [
            'v_contado' => floatval($r['v_contado']),
            'v_credito' => floatval($r['v_credito']),
            'n_ventas'  => intval($r['n_ventas']),
        ];
    }

    // 2) Ventas FE puras (sin Fra POS espejo) — v4.6+
    if ($tieneFE) {
        $sql = "
            SELECT $grpFE AS periodo,
                   COALESCE(SUM(CASE WHEN e.payment_form_id = 1 THEN e.total ELSE 0 END), 0) AS v_contado,
                   COALESCE(SUM(CASE WHEN e.payment_form_id = 2 THEN e.total ELSE 0 END), 0) AS v_credito,
                   COUNT(*) AS n_ventas
            FROM electronic_documents e
            LEFT JOIN tblventas v ON v.cufe = e.cufe
            WHERE e.type_document_id = 1
              AND e.status IN ('autorizado','aprobado')
              AND v.Factura_N IS NULL
              AND DATE(e.created_at) BETWEEN ? AND ?
            GROUP BY periodo
        ";
        $stmt = $db->prepare($sql);
        $stmt->execute([$desde, $hasta]);
        foreach ($stmt->fetchAll() as $r) {
            $p = $r['periodo'];
            if (!isset($ventas[$p])) $ventas[$p] = ['v_contado'=>0,'v_credito'=>0,'n_ventas'=>0];
            $ventas[$p]['v_contado'] += floatval($r['v_contado']);
            $ventas[$p]['v_credito'] += floatval($r['v_credito']);
            $ventas[$p]['n_ventas']  += intval($r['n_ventas']);
        }
    }

    // 3) Pagos de cartera (abonos)
    $sql = "
        SELECT $grpPagos AS periodo,
               COALESCE(SUM(p.ValorPago), 0) AS pagos,
               COUNT(*) AS n_pagos
        FROM tblpagos p
        WHERE p.Estado = 'Valida'
          AND p.ValorPago > 0
          AND DATE(p.Fecha) BETWEEN ? AND ?
        GROUP BY periodo
    ";
    $stmt = $db->prepare($sql);
    $stmt->execute([$desde, $hasta]);
    $pagosMap = [];
    foreach ($stmt->fetchAll() as $r) {
        $pagosMap[$r['periodo']] = ['pagos' => floatval($r['pagos']), 'n_pagos' => intval($r['n_pagos'])];
    }

    // 4) Retenciones recibidas
    $retsMap = [];
    try {
        $sql = "
            SELECT $grpRet AS periodo, COALESCE(SUM(rp.monto),0) AS ret, COUNT(*) AS n_ret
            FROM tbl_retenciones_pago rp
            JOIN tblpagos p ON p.Id_Pagos = rp.Id_Pagos
            WHERE COALESCE(p.Estado,'Valida')='Valida'
              AND DATE(rp.Fecha) BETWEEN ? AND ?
            GROUP BY periodo
        ";
        $stmt = $db->prepare($sql);
        $stmt->execute([$desde, $hasta]);
        foreach ($stmt->fetchAll() as $r) {
            $retsMap[$r['periodo']] = ['ret' => floatval($r['ret']), 'n_ret' => intval($r['n_ret'])];
        }
    } catch (Throwable $e) {}

    // Unir todas las claves (periodos)
    $periodos = array_unique(array_merge(array_keys($ventas), array_keys($pagosMap), array_keys($retsMap)));
    sort($periodos);

    $filas = [];
    $tot = [
        'v_contado' => 0, 'v_credito' => 0, 'pagos' => 0, 'retenciones' => 0,
        'ingreso_real' => 0, 'devengado' => 0, 'n_ventas' => 0, 'n_pagos' => 0, 'n_ret' => 0,
    ];
    foreach ($periodos as $p) {
        $vc = $ventas[$p]['v_contado'] ?? 0;
        $vk = $ventas[$p]['v_credito'] ?? 0;
        $pg = $pagosMap[$p]['pagos'] ?? 0;
        $rt = $retsMap[$p]['ret'] ?? 0;
        $nV = $ventas[$p]['n_ventas'] ?? 0;
        $nP = $pagosMap[$p]['n_pagos'] ?? 0;
        $nR = $retsMap[$p]['n_ret'] ?? 0;
        $ingresoReal = $vc + $pg + $rt;  // Dinero efectivo + retenciones a favor
        $devengado   = $vc + $vk;         // Base para DIAN/IVA

        $filas[] = [
            'periodo'       => $p,
            'v_contado'     => $vc,
            'v_credito'     => $vk,
            'pagos_cartera' => $pg,
            'retenciones'   => $rt,
            'ingreso_real'  => $ingresoReal,
            'devengado'     => $devengado,
            'n_ventas'      => $nV,
            'n_pagos'       => $nP,
            'n_ret'         => $nR,
        ];
        $tot['v_contado']    += $vc;
        $tot['v_credito']    += $vk;
        $tot['pagos']        += $pg;
        $tot['retenciones']  += $rt;
        $tot['ingreso_real'] += $ingresoReal;
        $tot['devengado']    += $devengado;
        $tot['n_ventas']     += $nV;
        $tot['n_pagos']      += $nP;
        $tot['n_ret']        += $nR;
    }

    echo json_encode([
        'success'     => true,
        'periodo'     => ['desde' => $desde, 'hasta' => $hasta, 'agrupacion' => $agr],
        'filas'       => $filas,
        'totales'     => $tot,
    ], JSON_UNESCAPED_UNICODE);
} catch (Throwable $e) {
    http_response_code(500);
    echo json_encode(['success'=>false,'message'=>$e->getMessage()]);
}
