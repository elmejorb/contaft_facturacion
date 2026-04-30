<?php
/**
 * Informes de resumen contable
 *
 * GET ?tipo=cierre_mes&anio=YYYY&mes=MM
 *   → Cierre del mes: ingresos por ventas, gastos, pagos, utilidad bruta
 *
 * GET ?tipo=estado_resultados&desde=YYYY-MM-DD&hasta=YYYY-MM-DD
 *   → Estado de resultados por rango de fechas
 *
 * GET ?tipo=cuadre_caja&fecha=YYYY-MM-DD
 *   → Detalle del día: ventas por medio de pago, pagos cobrados, gastos
 *
 * GET ?tipo=top_productos&desde=YYYY-MM-DD&hasta=YYYY-MM-DD&limite=20
 *   → Productos más vendidos
 *
 * GET ?tipo=cartera
 *   → Clientes con saldo pendiente (cartera)
 */
require_once '../config/database.php';

$db = (new Database())->getConnection();
$tipo = $_GET['tipo'] ?? '';

try {
    if ($tipo === 'cierre_mes') {
        $anio = intval($_GET['anio'] ?? date('Y'));
        $mes  = intval($_GET['mes']  ?? date('n'));
        $where = "YEAR(Fecha) = $anio AND MONTH(Fecha) = $mes";

        // Ventas (contado + crédito) — incluyendo electronic_documents válidas
        $r = $db->query("
            SELECT
              SUM(CASE WHEN Tipo='Contado' AND id_mediopago=0 THEN Total ELSE 0 END) AS contado_efectivo,
              SUM(CASE WHEN Tipo='Contado' AND id_mediopago=1 THEN Total ELSE 0 END) AS contado_tarjeta,
              SUM(CASE WHEN Tipo='Contado' AND id_mediopago>=2 THEN Total ELSE 0 END) AS contado_transferencia,
              SUM(CASE WHEN Tipo='Crédito' THEN Total ELSE 0 END) AS credito,
              SUM(Total) AS ventas_total,
              COUNT(*) AS num_ventas
            FROM tblventas WHERE $where AND EstadoFact='Valida'
        ")->fetch();

        // Sumar electrónicas no duplicadas en tblventas
        $rEd = $db->query("
            SELECT
              SUM(CASE WHEN payment_form_id=1 AND payment_method_id=10 THEN total ELSE 0 END) AS fe_efectivo,
              SUM(CASE WHEN payment_form_id=1 AND payment_method_id=14 THEN total ELSE 0 END) AS fe_tarjeta,
              SUM(CASE WHEN payment_form_id=1 AND payment_method_id NOT IN (10,14) THEN total ELSE 0 END) AS fe_otros,
              SUM(CASE WHEN payment_form_id=2 THEN total ELSE 0 END) AS fe_credito,
              SUM(total) AS fe_total,
              COUNT(*) AS fe_count
            FROM electronic_documents
            WHERE YEAR(fecha)=$anio AND MONTH(fecha)=$mes
              AND status='autorizado' AND type_document_id=1
              AND cufe NOT IN (SELECT cufe FROM tblventas WHERE cufe IS NOT NULL AND cufe!='')
        ")->fetch();

        // Compras
        $rComp = $db->query("
            SELECT SUM(Total) AS compras_total, COUNT(*) AS num_compras,
              SUM(CASE WHEN TipoPedido='Crédito' THEN Total ELSE 0 END) AS compras_credito,
              SUM(CASE WHEN TipoPedido='Contado' THEN Total ELSE 0 END) AS compras_contado
            FROM tblpedidos WHERE $where
        ")->fetch();

        // Gastos
        $rGast = $db->query("
            SELECT SUM(Valor) AS gastos_total, COUNT(*) AS num_gastos
            FROM tblegresos
            WHERE $where AND Estado='Valida' AND CodigoPro = 0
        ")->fetch();

        // Pagos a proveedores
        $rPagProv = $db->query("
            SELECT SUM(Valor) AS pagos_proveedores, COUNT(*) AS num_pagos
            FROM tblegresos WHERE $where AND Estado='Valida' AND CodigoPro > 0
        ")->fetch();

        // Pagos de clientes (ingresos)
        $rPagCli = $db->query("
            SELECT SUM(ValorPago) AS pagos_clientes, COUNT(*) AS num_pagos
            FROM tblpagos WHERE YEAR(Fecha)=$anio AND MONTH(Fecha)=$mes AND Estado='Valida'
        ")->fetch();

        // Costo de ventas POS (tblventas/tbldetalle_venta — costo histórico)
        $rCosto = $db->query("
            SELECT SUM(d.Cantidad * d.PrecioC) AS costo_ventas
            FROM tbldetalle_venta d
            INNER JOIN tblventas v ON d.Factura_N = v.Factura_N
            WHERE YEAR(v.Fecha)=$anio AND MONTH(v.Fecha)=$mes AND v.EstadoFact='Valida'
        ")->fetch();

        // Costo de ventas FE (electronic_documents — solo las que NO duplican tblventas
        // para evitar contar costo dos veces). Usa PrecioCosto guardado en el detalle.
        $rCostoFE = $db->query("
            SELECT SUM(de.invoiced_quantity * de.PrecioCosto) AS costo_fe
            FROM detalle_document_electronic de
            INNER JOIN electronic_documents e ON de.factura_n = e.id
            WHERE YEAR(e.fecha)=$anio AND MONTH(e.fecha)=$mes
              AND e.status='autorizado' AND e.type_document_id=1
              AND e.cufe NOT IN (SELECT cufe FROM tblventas WHERE cufe IS NOT NULL AND cufe!='')
        ")->fetch();

        $ventas_total = floatval($r['ventas_total']) + floatval($rEd['fe_total']);
        $costo = floatval($rCosto['costo_ventas']) + floatval($rCostoFE['costo_fe']);
        $gastos = floatval($rGast['gastos_total']);
        $util_bruta = $ventas_total - $costo;
        $util_neta  = $util_bruta - $gastos;

        echo json_encode([
            'success' => true,
            'periodo' => sprintf('%04d-%02d', $anio, $mes),
            'ingresos' => [
                'ventas_pos' => [
                    'contado_efectivo'      => floatval($r['contado_efectivo']),
                    'contado_tarjeta'       => floatval($r['contado_tarjeta']),
                    'contado_transferencia' => floatval($r['contado_transferencia']),
                    'credito'               => floatval($r['credito']),
                    'total'                 => floatval($r['ventas_total']),
                    'num'                   => intval($r['num_ventas']),
                ],
                'ventas_fe' => [
                    'efectivo' => floatval($rEd['fe_efectivo']),
                    'tarjeta'  => floatval($rEd['fe_tarjeta']),
                    'otros'    => floatval($rEd['fe_otros']),
                    'credito'  => floatval($rEd['fe_credito']),
                    'total'    => floatval($rEd['fe_total']),
                    'num'      => intval($rEd['fe_count']),
                ],
                'pagos_clientes' => floatval($rPagCli['pagos_clientes']),
                'ventas_total'   => $ventas_total,
            ],
            'egresos' => [
                'compras' => [
                    'contado' => floatval($rComp['compras_contado']),
                    'credito' => floatval($rComp['compras_credito']),
                    'total'   => floatval($rComp['compras_total']),
                ],
                'gastos'             => $gastos,
                'pagos_proveedores'  => floatval($rPagProv['pagos_proveedores']),
                'costo_ventas'       => $costo,
            ],
            'utilidad' => [
                'bruta' => $util_bruta,
                'neta'  => $util_neta,
                'margen_neto_pct' => $ventas_total > 0 ? ($util_neta / $ventas_total * 100) : 0,
            ],
        ], JSON_UNESCAPED_UNICODE);
        exit;
    }

    if ($tipo === 'estado_resultados') {
        $desde = $_GET['desde'] ?? date('Y-m-01');
        $hasta = $_GET['hasta'] ?? date('Y-m-d');

        $r = $db->prepare("
            SELECT SUM(Total) AS ventas, COUNT(*) AS num
            FROM tblventas WHERE Fecha BETWEEN ? AND CONCAT(?, ' 23:59:59') AND EstadoFact='Valida'
        ");
        $r->execute([$desde, $hasta]);
        $rVen = $r->fetch();

        // Sumar también FE no duplicadas en tblventas
        $r = $db->prepare("
            SELECT SUM(total) AS ventas_fe, COUNT(*) AS num_fe
            FROM electronic_documents
            WHERE fecha BETWEEN ? AND CONCAT(?, ' 23:59:59')
              AND status='autorizado' AND type_document_id=1
              AND cufe NOT IN (SELECT cufe FROM tblventas WHERE cufe IS NOT NULL AND cufe!='')
        ");
        $r->execute([$desde, $hasta]);
        $rVenFE = $r->fetch();

        $r = $db->prepare("
            SELECT SUM(d.Cantidad * d.PrecioC) AS costo
            FROM tbldetalle_venta d INNER JOIN tblventas v ON d.Factura_N = v.Factura_N
            WHERE v.Fecha BETWEEN ? AND CONCAT(?, ' 23:59:59') AND v.EstadoFact='Valida'
        ");
        $r->execute([$desde, $hasta]);
        $rCos = $r->fetch();

        // Costo de FE no duplicadas
        $r = $db->prepare("
            SELECT SUM(de.invoiced_quantity * de.PrecioCosto) AS costo_fe
            FROM detalle_document_electronic de
            INNER JOIN electronic_documents e ON de.factura_n = e.id
            WHERE e.fecha BETWEEN ? AND CONCAT(?, ' 23:59:59')
              AND e.status='autorizado' AND e.type_document_id=1
              AND e.cufe NOT IN (SELECT cufe FROM tblventas WHERE cufe IS NOT NULL AND cufe!='')
        ");
        $r->execute([$desde, $hasta]);
        $rCosFE = $r->fetch();

        $r = $db->prepare("
            SELECT COALESCE(cg.Nombre, 'Sin categoría') AS Categoria, SUM(e.Valor) AS total
            FROM tblegresos e
            LEFT JOIN tblcategorias_gasto cg ON e.categoria_gasto = cg.Id_Categoria
            WHERE Fecha BETWEEN ? AND CONCAT(?, ' 23:59:59') AND Estado='Valida' AND CodigoPro=0
            GROUP BY cg.Nombre
            ORDER BY total DESC
        ");
        $r->execute([$desde, $hasta]);
        $gastosCat = $r->fetchAll();

        $totalGastos = array_sum(array_column($gastosCat, 'total'));
        $ventas = floatval($rVen['ventas']) + floatval($rVenFE['ventas_fe']);
        $costo = floatval($rCos['costo']) + floatval($rCosFE['costo_fe']);
        $utilBruta = $ventas - $costo;
        $utilNeta = $utilBruta - $totalGastos;

        echo json_encode([
            'success' => true,
            'rango' => ['desde' => $desde, 'hasta' => $hasta],
            'ventas' => $ventas,
            'num_ventas' => intval($rVen['num']),
            'costo_ventas' => $costo,
            'utilidad_bruta' => $utilBruta,
            'gastos_por_categoria' => $gastosCat,
            'gastos_total' => floatval($totalGastos),
            'utilidad_neta' => $utilNeta,
            'margen_bruto_pct' => $ventas > 0 ? ($utilBruta / $ventas * 100) : 0,
            'margen_neto_pct'  => $ventas > 0 ? ($utilNeta  / $ventas * 100) : 0,
        ], JSON_UNESCAPED_UNICODE);
        exit;
    }

    if ($tipo === 'cuadre_caja') {
        $fecha = $_GET['fecha'] ?? date('Y-m-d');

        $r = $db->prepare("
            SELECT
              v.Factura_N, v.Fecha, v.A_nombre, v.Total, v.Tipo,
              v.id_mediopago, v.efectivo, v.valorpagado1, v.EstadoFact,
              COALESCE(m.nombre_medio, 'Efectivo') AS medio_pago
            FROM tblventas v
            LEFT JOIN tblmedios_pago m ON m.id_mediopago = v.id_mediopago
            WHERE DATE(v.Fecha) = ?
            ORDER BY v.Fecha
        ");
        $r->execute([$fecha]);
        $ventas = $r->fetchAll();

        $r = $db->prepare("
            SELECT e.N_Comprobante, e.Fecha, COALESCE(p.RazonSocial, e.Orden) AS proveedor,
                   e.Concepto, e.Valor, e.NFacturaAnt, e.CodigoPro
            FROM tblegresos e
            LEFT JOIN tblproveedores p ON p.CodigoPro = e.CodigoPro
            WHERE DATE(e.Fecha) = ? AND e.Estado='Valida'
            ORDER BY e.N_Comprobante
        ");
        $r->execute([$fecha]);
        $egresos = $r->fetchAll();

        $r = $db->prepare("
            SELECT pa.RecCajaN, pa.Fecha, c.Razon_Social, pa.ValorPago, pa.NFactAnt
            FROM tblpagos pa
            LEFT JOIN tblclientes c ON c.CodigoClien = pa.Codigo
            WHERE DATE(pa.Fecha) = ? AND pa.Estado='Valida'
            ORDER BY pa.RecCajaN
        ");
        $r->execute([$fecha]);
        $pagos = $r->fetchAll();

        echo json_encode([
            'success' => true,
            'fecha' => $fecha,
            'ventas' => $ventas,
            'egresos' => $egresos,
            'pagos' => $pagos,
        ], JSON_UNESCAPED_UNICODE);
        exit;
    }

    if ($tipo === 'top_productos') {
        $desde = $_GET['desde'] ?? date('Y-m-01');
        $hasta = $_GET['hasta'] ?? date('Y-m-d');
        $limite = intval($_GET['limite'] ?? 30);

        $r = $db->prepare("
            SELECT a.Items, a.Codigo, a.Nombres_Articulo,
                   SUM(d.Cantidad) AS cant_total,
                   SUM(d.Cantidad * d.PrecioV) AS monto_ventas,
                   SUM(d.Cantidad * d.PrecioC) AS costo_total,
                   SUM(d.Cantidad * d.PrecioV) - SUM(d.Cantidad * d.PrecioC) AS utilidad,
                   COUNT(DISTINCT v.Factura_N) AS facturas
            FROM tbldetalle_venta d
            INNER JOIN tblventas v ON d.Factura_N = v.Factura_N
            INNER JOIN tblarticulos a ON d.Items = a.Items
            WHERE v.Fecha BETWEEN ? AND CONCAT(?, ' 23:59:59') AND v.EstadoFact='Valida'
            GROUP BY a.Items
            ORDER BY monto_ventas DESC
            LIMIT $limite
        ");
        $r->execute([$desde, $hasta]);
        $productos = $r->fetchAll();

        echo json_encode([
            'success' => true,
            'rango' => ['desde' => $desde, 'hasta' => $hasta],
            'productos' => $productos,
            'total' => count($productos),
        ], JSON_UNESCAPED_UNICODE);
        exit;
    }

    if ($tipo === 'cartera') {
        // Trae todas las facturas con saldo > 0, de tblventas y tblfacturasanteriores, junto con datos del cliente.
        $r = $db->query("
            SELECT c.CodigoClien, c.Razon_Social, c.Nit, c.Telefonos,
                   x.Factura_N, x.Fecha, x.Dias, x.Total, x.Saldo,
                   DATEDIFF(CURDATE(), DATE_ADD(x.Fecha, INTERVAL x.Dias DAY)) AS Dias_Vencidos
            FROM tblclientes c
            INNER JOIN (
                SELECT CodigoCli AS cod, Factura_N, Fecha, Dias, Total, Saldo
                  FROM tblventas WHERE Saldo > 0 AND EstadoFact='Valida'
                UNION ALL
                SELECT CodigoCli AS cod, FacturaN AS Factura_N, Fecha, Dias, Valor AS Total, Saldo
                  FROM tblfacturasanteriores WHERE Saldo > 0
            ) x ON c.CodigoClien = x.cod
            ORDER BY c.Razon_Social, x.Fecha
        ");
        $rows = $r->fetchAll();

        // Agrupar por cliente y calcular aging por factura
        $clientesMap = [];
        $totalGeneral = 0;
        $bucketGeneral = ['sin_vencer' => 0, 'd1_30' => 0, 'd31_60' => 0, 'mas_60' => 0];

        foreach ($rows as $row) {
            $cod = $row['CodigoClien'];
            if (!isset($clientesMap[$cod])) {
                $clientesMap[$cod] = [
                    'CodigoClien'  => $cod,
                    'Razon_Social' => $row['Razon_Social'],
                    'Nit'          => $row['Nit'],
                    'Telefonos'    => $row['Telefonos'],
                    'facturas'     => [],
                    'total_saldo'  => 0,
                    'sin_vencer'   => 0,
                    'd1_30'        => 0,
                    'd31_60'       => 0,
                    'mas_60'       => 0,
                ];
            }
            $saldo = floatval($row['Saldo']);
            $diasV = intval($row['Dias_Vencidos']);
            // Aging buckets
            $bucket = 'sin_vencer';
            if ($diasV >= 1 && $diasV <= 30)  $bucket = 'd1_30';
            elseif ($diasV >= 31 && $diasV <= 60) $bucket = 'd31_60';
            elseif ($diasV > 60) $bucket = 'mas_60';

            $clientesMap[$cod]['facturas'][] = [
                'Factura_N'     => $row['Factura_N'],
                'Fecha'         => $row['Fecha'],
                'Dias'          => intval($row['Dias']),
                'Dias_Vencidos' => max($diasV, 0),
                'Total'         => floatval($row['Total']),
                'Saldo'         => $saldo,
                'sin_vencer'    => $bucket === 'sin_vencer' ? $saldo : 0,
                'd1_30'         => $bucket === 'd1_30'      ? $saldo : 0,
                'd31_60'        => $bucket === 'd31_60'     ? $saldo : 0,
                'mas_60'        => $bucket === 'mas_60'     ? $saldo : 0,
            ];
            $clientesMap[$cod]['total_saldo'] += $saldo;
            $clientesMap[$cod][$bucket]      += $saldo;
            $totalGeneral                    += $saldo;
            $bucketGeneral[$bucket]          += $saldo;
        }

        // Ordenar clientes por nombre
        $clientes = array_values($clientesMap);
        usort($clientes, fn($a, $b) => strcmp($a['Razon_Social'], $b['Razon_Social']));

        // Total de tblventas + tblfacturasanteriores brutos (Monto Total = sum of Total facturas)
        $rTotal = $db->query("
            SELECT COALESCE(SUM(Total),0) AS monto_total FROM (
                SELECT Total FROM tblventas WHERE Saldo > 0 AND EstadoFact='Valida'
                UNION ALL
                SELECT Valor AS Total FROM tblfacturasanteriores WHERE Saldo > 0
            ) y
        ")->fetch();

        echo json_encode([
            'success' => true,
            'clientes' => $clientes,
            'cantidad_clientes' => count($clientes),
            'monto_total'   => floatval($rTotal['monto_total']),
            'total_cartera' => $totalGeneral,
            'sin_vencer'    => $bucketGeneral['sin_vencer'],
            'd1_30'         => $bucketGeneral['d1_30'],
            'd31_60'        => $bucketGeneral['d31_60'],
            'mas_60'        => $bucketGeneral['mas_60'],
        ], JSON_UNESCAPED_UNICODE);
        exit;
    }

    if ($tipo === 'ventas_listado') {
        $desde = $_GET['desde'] ?? date('Y-m-01');
        $hasta = $_GET['hasta'] ?? date('Y-m-d');
        $estado = $_GET['estado'] ?? 'Valida'; // Valida, Anulada, todos

        $where = "DATE(v.Fecha) BETWEEN ? AND ?";
        $params = [$desde, $hasta];
        if ($estado !== 'todos') { $where .= " AND v.EstadoFact = ?"; $params[] = $estado; }

        $r = $db->prepare("
            SELECT v.Factura_N, v.Fecha, v.A_nombre AS cliente, v.Identificacion AS nit,
                   v.Tipo, v.Total, v.Saldo, v.efectivo, v.valorpagado1, v.EstadoFact,
                   COALESCE(m.nombre_medio, 'Efectivo') AS medio_pago
            FROM tblventas v
            LEFT JOIN tblmedios_pago m ON m.id_mediopago = v.id_mediopago
            WHERE $where
            ORDER BY v.Fecha, v.Factura_N
        ");
        $r->execute($params);
        $ventas = $r->fetchAll();

        $resumen = [
            'cantidad' => count($ventas),
            'contado'  => 0, 'credito' => 0, 'anulada' => 0,
            'efectivo' => 0, 'tarjeta' => 0, 'transf'  => 0,
            'total_general' => 0, 'saldo_pendiente' => 0,
        ];
        foreach ($ventas as $v) {
            $t = floatval($v['Total']);
            $resumen['total_general'] += $t;
            if ($v['EstadoFact'] === 'Anulada') { $resumen['anulada'] += $t; continue; }
            $resumen['saldo_pendiente'] += floatval($v['Saldo']);
            if ($v['Tipo'] === 'Contado') $resumen['contado'] += $t; else $resumen['credito'] += $t;
            if ($v['medio_pago'] === 'Efectivo' || stripos($v['medio_pago'], 'efectivo') !== false) $resumen['efectivo'] += $t;
            elseif (stripos($v['medio_pago'], 'tarjeta') !== false) $resumen['tarjeta'] += $t;
            else $resumen['transf'] += $t;
        }

        echo json_encode([
            'success' => true,
            'rango' => ['desde' => $desde, 'hasta' => $hasta],
            'ventas' => $ventas,
            'resumen' => $resumen,
        ], JSON_UNESCAPED_UNICODE);
        exit;
    }

    if ($tipo === 'compras_listado') {
        $desde = $_GET['desde'] ?? date('Y-m-01');
        $hasta = $_GET['hasta'] ?? date('Y-m-d');

        $r = $db->prepare("
            SELECT p.Pedido_N, p.FacturaCompra_N, p.Fecha, p.TipoPedido, p.Dias,
                   p.Total, p.Saldo, p.Flete, p.Descuento,
                   COALESCE(pr.RazonSocial, '-') AS proveedor, pr.Nit,
                   (SELECT COUNT(*) FROM tbldetalle_pedido WHERE Pedido_N = p.Pedido_N) AS num_items
            FROM tblpedidos p
            LEFT JOIN tblproveedores pr ON pr.CodigoPro = p.CodigoPro
            WHERE DATE(p.Fecha) BETWEEN ? AND ?
            ORDER BY p.Fecha, p.Pedido_N
        ");
        $r->execute([$desde, $hasta]);
        $compras = $r->fetchAll();

        $resumen = [
            'cantidad' => count($compras),
            'contado' => 0, 'credito' => 0,
            'total_general' => 0, 'saldo_pendiente' => 0,
            'flete' => 0, 'descuento' => 0,
        ];
        foreach ($compras as $c) {
            $t = floatval($c['Total']);
            $resumen['total_general'] += $t;
            $resumen['saldo_pendiente'] += floatval($c['Saldo']);
            $resumen['flete'] += floatval($c['Flete']);
            $resumen['descuento'] += floatval($c['Descuento']);
            if ($c['TipoPedido'] === 'Contado') $resumen['contado'] += $t; else $resumen['credito'] += $t;
        }

        echo json_encode([
            'success' => true,
            'rango' => ['desde' => $desde, 'hasta' => $hasta],
            'compras' => $compras,
            'resumen' => $resumen,
        ], JSON_UNESCAPED_UNICODE);
        exit;
    }

    if ($tipo === 'inventario_valorizado') {
        $r = $db->query("
            SELECT a.Items, a.Codigo, a.Nombres_Articulo, a.Existencia,
                   a.Precio_Costo, a.Precio_Venta,
                   COALESCE(c.Categoria, 'Sin categoría') AS categoria,
                   (a.Existencia * a.Precio_Costo) AS valor_costo,
                   (a.Existencia * a.Precio_Venta) AS valor_venta,
                   ((a.Existencia * a.Precio_Venta) - (a.Existencia * a.Precio_Costo)) AS utilidad_potencial
            FROM tblarticulos a
            LEFT JOIN tblcategoria c ON a.Id_Categoria = c.Id_Categoria
            WHERE a.Estado = 1 AND a.Existencia > 0
            ORDER BY a.Nombres_Articulo
        ");
        $items = $r->fetchAll();

        $resumen = [
            'productos' => count($items),
            'unidades_total' => 0,
            'valor_costo' => 0,
            'valor_venta' => 0,
            'utilidad_potencial' => 0,
        ];
        foreach ($items as $it) {
            $resumen['unidades_total'] += floatval($it['Existencia']);
            $resumen['valor_costo'] += floatval($it['valor_costo']);
            $resumen['valor_venta'] += floatval($it['valor_venta']);
            $resumen['utilidad_potencial'] += floatval($it['utilidad_potencial']);
        }

        echo json_encode([
            'success' => true,
            'items' => $items,
            'resumen' => $resumen,
        ], JSON_UNESCAPED_UNICODE);
        exit;
    }

    if ($tipo === 'productos_agotados') {
        // Productos con existencia <= 0 o por debajo del mínimo
        $r = $db->query("
            SELECT a.Items, a.Codigo, a.Nombres_Articulo, a.Existencia,
                   COALESCE(a.Existencia_minima, 0) AS minimo,
                   a.Precio_Costo, a.Precio_Venta,
                   COALESCE(c.Categoria, 'Sin categoría') AS categoria,
                   COALESCE(pr.RazonSocial, '-') AS proveedor,
                   CASE
                     WHEN a.Existencia <= 0 THEN 'agotado'
                     WHEN COALESCE(a.Existencia_minima,0) > 0 AND a.Existencia < a.Existencia_minima THEN 'bajo_minimo'
                     ELSE 'ok'
                   END AS estado
            FROM tblarticulos a
            LEFT JOIN tblcategoria c ON a.Id_Categoria = c.Id_Categoria
            LEFT JOIN tblproveedores pr ON pr.CodigoPro = a.CodigoPro
            WHERE a.Estado = 1
              AND (a.Existencia <= 0
                   OR (COALESCE(a.Existencia_minima,0) > 0 AND a.Existencia < a.Existencia_minima))
            ORDER BY a.Existencia, a.Nombres_Articulo
        ");
        $items = $r->fetchAll();

        $resumen = [
            'total' => count($items),
            'agotados'    => count(array_filter($items, fn($i) => $i['estado'] === 'agotado')),
            'bajo_minimo' => count(array_filter($items, fn($i) => $i['estado'] === 'bajo_minimo')),
        ];

        echo json_encode(['success' => true, 'items' => $items, 'resumen' => $resumen], JSON_UNESCAPED_UNICODE);
        exit;
    }

    if ($tipo === 'gastos_listado') {
        $desde = $_GET['desde'] ?? date('Y-m-01');
        $hasta = $_GET['hasta'] ?? date('Y-m-d');

        // Gastos = egresos sin proveedor (CodigoPro = 0)
        $r = $db->prepare("
            SELECT e.Id_Egresos, e.N_Comprobante, e.Fecha, e.Concepto, e.Valor, e.TipoPago,
                   COALESCE(cg.Nombre, 'Sin categoría') AS categoria
            FROM tblegresos e
            LEFT JOIN tblcategorias_gasto cg ON cg.Id_Categoria = e.categoria_gasto
            WHERE DATE(e.Fecha) BETWEEN ? AND ?
              AND e.Estado = 'Valida' AND e.CodigoPro = 0
            ORDER BY e.Fecha, e.N_Comprobante
        ");
        $r->execute([$desde, $hasta]);
        $gastos = $r->fetchAll();

        // Resumen por categoría
        $porCat = [];
        $totalGeneral = 0;
        foreach ($gastos as $g) {
            $cat = $g['categoria'];
            if (!isset($porCat[$cat])) $porCat[$cat] = ['categoria' => $cat, 'cantidad' => 0, 'total' => 0];
            $porCat[$cat]['cantidad']++;
            $porCat[$cat]['total'] += floatval($g['Valor']);
            $totalGeneral += floatval($g['Valor']);
        }
        usort($porCat, fn($a, $b) => $b['total'] <=> $a['total']);

        echo json_encode([
            'success' => true,
            'rango' => ['desde' => $desde, 'hasta' => $hasta],
            'gastos' => $gastos,
            'por_categoria' => array_values($porCat),
            'total_general' => $totalGeneral,
        ], JSON_UNESCAPED_UNICODE);
        exit;
    }

    if ($tipo === 'top_clientes') {
        $desde = $_GET['desde'] ?? date('Y-m-01');
        $hasta = $_GET['hasta'] ?? date('Y-m-d');
        $limite = intval($_GET['limite'] ?? 30);

        $r = $db->prepare("
            SELECT c.CodigoClien, c.Razon_Social, c.Nit, c.Telefonos,
                   COUNT(v.Factura_N) AS num_facturas,
                   SUM(v.Total) AS monto_total,
                   AVG(v.Total) AS ticket_promedio,
                   SUM(v.Saldo) AS saldo_actual,
                   MAX(v.Fecha) AS ultima_compra
            FROM tblventas v
            INNER JOIN tblclientes c ON v.CodigoCli = c.CodigoClien
            WHERE DATE(v.Fecha) BETWEEN ? AND ?
              AND v.EstadoFact = 'Valida'
              AND v.CodigoCli != 130500
            GROUP BY c.CodigoClien
            ORDER BY monto_total DESC
            LIMIT $limite
        ");
        $r->execute([$desde, $hasta]);
        $clientes = $r->fetchAll();

        $totalGeneral = array_sum(array_map(fn($c) => floatval($c['monto_total']), $clientes));

        echo json_encode([
            'success' => true,
            'rango' => ['desde' => $desde, 'hasta' => $hasta],
            'clientes' => $clientes,
            'total_general' => $totalGeneral,
        ], JSON_UNESCAPED_UNICODE);
        exit;
    }

    if ($tipo === 'ventas_por_categoria') {
        $desde = $_GET['desde'] ?? date('Y-m-01');
        $hasta = $_GET['hasta'] ?? date('Y-m-d');

        $r = $db->prepare("
            SELECT COALESCE(c.Categoria, 'Sin categoría') AS categoria,
                   COUNT(DISTINCT v.Factura_N) AS num_facturas,
                   COUNT(DISTINCT a.Items) AS num_productos,
                   SUM(d.Cantidad) AS unidades,
                   SUM(d.Cantidad * d.PrecioV) AS monto_ventas,
                   SUM(d.Cantidad * d.PrecioC) AS costo,
                   SUM(d.Cantidad * d.PrecioV) - SUM(d.Cantidad * d.PrecioC) AS utilidad
            FROM tbldetalle_venta d
            INNER JOIN tblventas v ON d.Factura_N = v.Factura_N
            INNER JOIN tblarticulos a ON d.Items = a.Items
            LEFT JOIN tblcategoria c ON a.Id_Categoria = c.Id_Categoria
            WHERE DATE(v.Fecha) BETWEEN ? AND ? AND v.EstadoFact = 'Valida'
            GROUP BY a.Id_Categoria, c.Categoria
            ORDER BY monto_ventas DESC
        ");
        $r->execute([$desde, $hasta]);
        $categorias = $r->fetchAll();

        $totalMonto = array_sum(array_map(fn($c) => floatval($c['monto_ventas']), $categorias));

        echo json_encode([
            'success' => true,
            'rango' => ['desde' => $desde, 'hasta' => $hasta],
            'categorias' => $categorias,
            'total_general' => $totalMonto,
        ], JSON_UNESCAPED_UNICODE);
        exit;
    }

    if ($tipo === 'pagos_proveedores') {
        $desde = $_GET['desde'] ?? date('Y-m-01');
        $hasta = $_GET['hasta'] ?? date('Y-m-d');

        $r = $db->prepare("
            SELECT e.Id_Egresos, e.N_Comprobante, e.Fecha, e.NFacturaAnt, e.Concepto,
                   e.Valor, e.Descuento, e.TipoPago,
                   COALESCE(p.RazonSocial, e.Orden) AS proveedor, p.Nit
            FROM tblegresos e
            LEFT JOIN tblproveedores p ON p.CodigoPro = e.CodigoPro
            WHERE DATE(e.Fecha) BETWEEN ? AND ?
              AND e.Estado = 'Valida'
              AND e.CodigoPro > 0
            ORDER BY e.Fecha, e.N_Comprobante
        ");
        $r->execute([$desde, $hasta]);
        $pagos = $r->fetchAll();

        // Agrupar por proveedor
        $porProveedor = [];
        $totalGeneral = 0;
        foreach ($pagos as $p) {
            $prov = $p['proveedor'];
            if (!isset($porProveedor[$prov])) $porProveedor[$prov] = ['proveedor' => $prov, 'nit' => $p['Nit'] ?? '', 'cantidad' => 0, 'total' => 0];
            $porProveedor[$prov]['cantidad']++;
            $porProveedor[$prov]['total'] += floatval($p['Valor']);
            $totalGeneral += floatval($p['Valor']);
        }
        usort($porProveedor, fn($a, $b) => $b['total'] <=> $a['total']);

        echo json_encode([
            'success' => true,
            'rango' => ['desde' => $desde, 'hasta' => $hasta],
            'pagos' => $pagos,
            'por_proveedor' => array_values($porProveedor),
            'total_general' => $totalGeneral,
        ], JSON_UNESCAPED_UNICODE);
        exit;
    }

    if ($tipo === 'graficos') {
        $anio = intval($_GET['anio'] ?? date('Y'));

        // 1) Ventas por mes del año
        $r = $db->prepare("
            SELECT MONTH(Fecha) AS mes, SUM(Total) AS total, COUNT(*) AS cant
            FROM tblventas
            WHERE YEAR(Fecha) = ? AND EstadoFact = 'Valida'
            GROUP BY MONTH(Fecha)
            ORDER BY MONTH(Fecha)
        ");
        $r->execute([$anio]);
        $rowsVm = $r->fetchAll();
        $meses = ['','Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
        $ventasMes = [];
        for ($m = 1; $m <= 12; $m++) {
            $row = current(array_filter($rowsVm, fn($x) => intval($x['mes']) === $m));
            $ventasMes[] = ['mes' => $meses[$m], 'total' => $row ? floatval($row['total']) : 0, 'cant' => $row ? intval($row['cant']) : 0];
        }

        // 2) Top 10 productos del año
        $r = $db->prepare("
            SELECT a.Nombres_Articulo AS nombre, SUM(d.Cantidad * d.PrecioV) AS monto
            FROM tbldetalle_venta d
            INNER JOIN tblventas v ON d.Factura_N = v.Factura_N
            INNER JOIN tblarticulos a ON d.Items = a.Items
            WHERE YEAR(v.Fecha) = ? AND v.EstadoFact = 'Valida'
            GROUP BY a.Items
            ORDER BY monto DESC
            LIMIT 10
        ");
        $r->execute([$anio]);
        $topProductos = $r->fetchAll();

        // 3) Distribución de gastos por categoría del año
        $r = $db->prepare("
            SELECT COALESCE(cg.Nombre, 'Sin categoría') AS categoria, SUM(e.Valor) AS total
            FROM tblegresos e
            LEFT JOIN tblcategorias_gasto cg ON cg.Id_Categoria = e.categoria_gasto
            WHERE YEAR(e.Fecha) = ? AND e.Estado='Valida' AND e.CodigoPro=0
            GROUP BY cg.Nombre
            ORDER BY total DESC
        ");
        $r->execute([$anio]);
        $gastosCat = $r->fetchAll();

        // 4) Tendencia diaria últimos 30 días (con fechas reales)
        $r = $db->query("
            SELECT DATE(Fecha) AS dia, SUM(Total) AS total, COUNT(*) AS cant
            FROM tblventas
            WHERE Fecha >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
              AND EstadoFact = 'Valida'
            GROUP BY DATE(Fecha)
            ORDER BY DATE(Fecha)
        ");
        $tendencia30 = $r->fetchAll();

        echo json_encode([
            'success' => true,
            'anio' => $anio,
            'ventas_mes' => $ventasMes,
            'top_productos' => $topProductos,
            'gastos_categoria' => $gastosCat,
            'tendencia_30d' => $tendencia30,
        ], JSON_UNESCAPED_UNICODE);
        exit;
    }

    if ($tipo === 'proveedores_listado') {
        $r = $db->query("
            SELECT p.CodigoPro, p.RazonSocial, p.Nit, p.Telefonos, p.Direccion,
                   p.Nombres, p.Apellidos, p.Fecha_Iingreso AS Fecha_Ingreso,
                   COALESCE(s.saldo, 0) AS saldo_actual,
                   COALESCE(c.compras, 0) AS total_compras,
                   COALESCE(c.cantidad, 0) AS num_compras
            FROM tblproveedores p
            LEFT JOIN (
                SELECT CodigoProv, SUM(Saldo) AS saldo
                FROM (
                    SELECT CodigoProv, Saldo FROM tblfacturasanterioresproveedor WHERE Saldo > 0
                    UNION ALL
                    SELECT CodigoPro AS CodigoProv, Saldo FROM tblpedidos WHERE TipoPedido='Crédito' AND Saldo > 0
                ) x GROUP BY CodigoProv
            ) s ON p.CodigoPro = s.CodigoProv
            LEFT JOIN (
                SELECT CodigoProv, SUM(Valor) AS compras, COUNT(*) AS cantidad
                FROM (
                    SELECT CodigoProv, Valor FROM tblfacturasanterioresproveedor
                    UNION ALL
                    SELECT CodigoPro AS CodigoProv, Total AS Valor FROM tblpedidos
                ) y GROUP BY CodigoProv
            ) c ON p.CodigoPro = c.CodigoProv
            WHERE p.CodigoPro != 220500
            ORDER BY p.RazonSocial
        ");
        $proveedores = $r->fetchAll();
        $totalSaldo = array_sum(array_map(fn($p) => floatval($p['saldo_actual']), $proveedores));
        $totalCompras = array_sum(array_map(fn($p) => floatval($p['total_compras']), $proveedores));
        echo json_encode(['success' => true, 'proveedores' => $proveedores, 'total_saldo' => $totalSaldo, 'total_compras' => $totalCompras], JSON_UNESCAPED_UNICODE);
        exit;
    }

    if ($tipo === 'proveedores_saldos') {
        // Similar a cartera de clientes pero para proveedores
        $r = $db->query("
            SELECT p.CodigoPro, p.RazonSocial, p.Nit, p.Telefonos,
                   x.FacturaN, x.Fecha, x.Dias, x.Valor, x.Saldo,
                   DATEDIFF(CURDATE(), DATE_ADD(x.Fecha, INTERVAL x.Dias DAY)) AS Dias_Vencidos
            FROM tblproveedores p
            INNER JOIN (
                SELECT CodigoProv AS cod, FacturaN, Fecha, Dias, Valor, Saldo
                  FROM tblfacturasanterioresproveedor WHERE Saldo > 0
                UNION ALL
                SELECT CodigoPro AS cod, FacturaCompra_N AS FacturaN, Fecha, Dias, Total AS Valor, Saldo
                  FROM tblpedidos WHERE TipoPedido='Crédito' AND Saldo > 0
            ) x ON p.CodigoPro = x.cod
            ORDER BY p.RazonSocial, x.Fecha
        ");
        $rows = $r->fetchAll();

        $provMap = [];
        $totalGeneral = 0;
        $bucketGeneral = ['sin_vencer' => 0, 'd1_30' => 0, 'd31_60' => 0, 'mas_60' => 0];
        foreach ($rows as $row) {
            $cod = $row['CodigoPro'];
            if (!isset($provMap[$cod])) {
                $provMap[$cod] = ['CodigoPro' => $cod, 'RazonSocial' => $row['RazonSocial'], 'Nit' => $row['Nit'],
                                  'Telefonos' => $row['Telefonos'], 'facturas' => [], 'total_saldo' => 0,
                                  'sin_vencer' => 0, 'd1_30' => 0, 'd31_60' => 0, 'mas_60' => 0];
            }
            $saldo = floatval($row['Saldo']);
            $diasV = intval($row['Dias_Vencidos']);
            $bucket = 'sin_vencer';
            if ($diasV >= 1 && $diasV <= 30) $bucket = 'd1_30';
            elseif ($diasV >= 31 && $diasV <= 60) $bucket = 'd31_60';
            elseif ($diasV > 60) $bucket = 'mas_60';

            $provMap[$cod]['facturas'][] = [
                'FacturaN' => $row['FacturaN'], 'Fecha' => $row['Fecha'],
                'Dias' => intval($row['Dias']), 'Dias_Vencidos' => max($diasV, 0),
                'Valor' => floatval($row['Valor']), 'Saldo' => $saldo,
                'sin_vencer' => $bucket === 'sin_vencer' ? $saldo : 0,
                'd1_30'      => $bucket === 'd1_30'      ? $saldo : 0,
                'd31_60'     => $bucket === 'd31_60'     ? $saldo : 0,
                'mas_60'     => $bucket === 'mas_60'     ? $saldo : 0,
            ];
            $provMap[$cod]['total_saldo'] += $saldo;
            $provMap[$cod][$bucket]      += $saldo;
            $totalGeneral                += $saldo;
            $bucketGeneral[$bucket]      += $saldo;
        }

        $proveedores = array_values($provMap);
        usort($proveedores, fn($a, $b) => strcmp($a['RazonSocial'], $b['RazonSocial']));
        echo json_encode([
            'success' => true, 'proveedores' => $proveedores, 'cantidad' => count($proveedores),
            'total_general' => $totalGeneral, 'sin_vencer' => $bucketGeneral['sin_vencer'],
            'd1_30' => $bucketGeneral['d1_30'], 'd31_60' => $bucketGeneral['d31_60'], 'mas_60' => $bucketGeneral['mas_60'],
        ], JSON_UNESCAPED_UNICODE);
        exit;
    }

    if ($tipo === 'ventas_mensual') {
        $anio = intval($_GET['anio'] ?? date('Y'));

        $r = $db->prepare("
            SELECT MONTH(v.Fecha) AS mes,
                   COUNT(DISTINCT v.Factura_N) AS num_facturas,
                   SUM(CASE WHEN v.Tipo='Contado' THEN v.Total ELSE 0 END) AS contado,
                   SUM(CASE WHEN v.Tipo='Crédito' THEN v.Total ELSE 0 END) AS credito,
                   SUM(v.Total) AS total,
                   COALESCE(SUM(d.Cantidad * d.PrecioC), 0) AS costo
            FROM tblventas v
            LEFT JOIN tbldetalle_venta d ON d.Factura_N = v.Factura_N
            WHERE YEAR(v.Fecha) = ? AND v.EstadoFact='Valida'
            GROUP BY MONTH(v.Fecha)
            ORDER BY MONTH(v.Fecha)
        ");
        $r->execute([$anio]);
        $rows = $r->fetchAll();
        $meses = ['','Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
        $data = [];
        $totals = ['num_facturas' => 0, 'contado' => 0, 'credito' => 0, 'total' => 0, 'costo' => 0, 'utilidad' => 0];
        for ($m = 1; $m <= 12; $m++) {
            $row = current(array_filter($rows, fn($x) => intval($x['mes']) === $m));
            $util = $row ? (floatval($row['total']) - floatval($row['costo'])) : 0;
            $data[] = [
                'mes' => $m, 'mes_nombre' => $meses[$m],
                'num_facturas' => $row ? intval($row['num_facturas']) : 0,
                'contado' => $row ? floatval($row['contado']) : 0,
                'credito' => $row ? floatval($row['credito']) : 0,
                'total'   => $row ? floatval($row['total'])   : 0,
                'costo'   => $row ? floatval($row['costo'])   : 0,
                'utilidad'=> $util,
            ];
            if ($row) {
                $totals['num_facturas'] += intval($row['num_facturas']);
                $totals['contado']  += floatval($row['contado']);
                $totals['credito']  += floatval($row['credito']);
                $totals['total']    += floatval($row['total']);
                $totals['costo']    += floatval($row['costo']);
                $totals['utilidad'] += $util;
            }
        }
        echo json_encode(['success' => true, 'anio' => $anio, 'meses' => $data, 'totales' => $totals], JSON_UNESCAPED_UNICODE);
        exit;
    }

    if ($tipo === 'ventas_diario') {
        $desde = $_GET['desde'] ?? date('Y-m-01');
        $hasta = $_GET['hasta'] ?? date('Y-m-d');

        $r = $db->prepare("
            SELECT DATE(v.Fecha) AS dia,
                   COUNT(DISTINCT v.Factura_N) AS num_facturas,
                   SUM(CASE WHEN v.Tipo='Contado' THEN v.Total ELSE 0 END) AS contado,
                   SUM(CASE WHEN v.Tipo='Crédito' THEN v.Total ELSE 0 END) AS credito,
                   SUM(v.Total) AS total,
                   COALESCE(SUM(d.Cantidad * d.PrecioC), 0) AS costo
            FROM tblventas v
            LEFT JOIN tbldetalle_venta d ON d.Factura_N = v.Factura_N
            WHERE DATE(v.Fecha) BETWEEN ? AND ? AND v.EstadoFact='Valida'
            GROUP BY DATE(v.Fecha)
            ORDER BY DATE(v.Fecha)
        ");
        $r->execute([$desde, $hasta]);
        $rows = $r->fetchAll();

        $totals = ['num_facturas' => 0, 'contado' => 0, 'credito' => 0, 'total' => 0, 'costo' => 0, 'utilidad' => 0];
        $data = [];
        foreach ($rows as $row) {
            $util = floatval($row['total']) - floatval($row['costo']);
            $data[] = [
                'dia' => $row['dia'],
                'num_facturas' => intval($row['num_facturas']),
                'contado'  => floatval($row['contado']),
                'credito'  => floatval($row['credito']),
                'total'    => floatval($row['total']),
                'costo'    => floatval($row['costo']),
                'utilidad' => $util,
            ];
            $totals['num_facturas'] += intval($row['num_facturas']);
            $totals['contado']  += floatval($row['contado']);
            $totals['credito']  += floatval($row['credito']);
            $totals['total']    += floatval($row['total']);
            $totals['costo']    += floatval($row['costo']);
            $totals['utilidad'] += $util;
        }
        echo json_encode(['success' => true, 'rango' => ['desde' => $desde, 'hasta' => $hasta], 'dias' => $data, 'totales' => $totals], JSON_UNESCAPED_UNICODE);
        exit;
    }

    if ($tipo === 'iva') {
        $desde = $_GET['desde'] ?? date('Y-m-01');
        $hasta = $_GET['hasta'] ?? date('Y-m-d');

        // IVA generado en VENTAS
        $r = $db->prepare("
            SELECT
              SUM(CASE WHEN d.Iva > 0 THEN d.Cantidad * d.PrecioV ELSE 0 END) AS gravable,
              SUM(CASE WHEN d.Iva > 0 THEN (d.Cantidad * d.PrecioV) * (d.Iva / (100 + d.Iva)) ELSE 0 END) AS iva_ventas,
              SUM(CASE WHEN d.Iva = 0 OR d.Iva IS NULL THEN d.Cantidad * d.PrecioV ELSE 0 END) AS excluido,
              SUM(d.Cantidad * d.PrecioV) AS total_ventas,
              COUNT(DISTINCT v.Factura_N) AS num_facturas
            FROM tbldetalle_venta d
            INNER JOIN tblventas v ON d.Factura_N = v.Factura_N
            WHERE DATE(v.Fecha) BETWEEN ? AND ? AND v.EstadoFact='Valida'
        ");
        $r->execute([$desde, $hasta]);
        $vt = $r->fetch();

        // IVA pagado en COMPRAS
        $r = $db->prepare("
            SELECT
              SUM(p.Impuesto) AS iva_compras,
              SUM(p.Total) AS total_compras,
              COUNT(*) AS num_compras
            FROM tblpedidos p
            WHERE DATE(p.Fecha) BETWEEN ? AND ?
        ");
        $r->execute([$desde, $hasta]);
        $cp = $r->fetch();

        // Desglose por tarifa de IVA (% de tasa)
        $r = $db->prepare("
            SELECT d.Iva AS tasa,
                   SUM(d.Cantidad * d.PrecioV) AS base,
                   SUM((d.Cantidad * d.PrecioV) * (d.Iva / (100 + d.Iva))) AS iva
            FROM tbldetalle_venta d
            INNER JOIN tblventas v ON d.Factura_N = v.Factura_N
            WHERE DATE(v.Fecha) BETWEEN ? AND ? AND v.EstadoFact='Valida'
            GROUP BY d.Iva ORDER BY d.Iva
        ");
        $r->execute([$desde, $hasta]);
        $porTasa = $r->fetchAll();

        $ivaVentas = floatval($vt['iva_ventas']);
        $ivaCompras = floatval($cp['iva_compras']);
        echo json_encode([
            'success' => true,
            'rango' => ['desde' => $desde, 'hasta' => $hasta],
            'ventas' => [
                'gravable' => floatval($vt['gravable']),
                'iva' => $ivaVentas,
                'excluido' => floatval($vt['excluido']),
                'total' => floatval($vt['total_ventas']),
                'num_facturas' => intval($vt['num_facturas']),
            ],
            'compras' => [
                'iva' => $ivaCompras,
                'total' => floatval($cp['total_compras']),
                'num_compras' => intval($cp['num_compras']),
            ],
            'por_tasa' => $porTasa,
            'iva_a_pagar' => $ivaVentas - $ivaCompras,
        ], JSON_UNESCAPED_UNICODE);
        exit;
    }

    if ($tipo === 'facturas_vendedor') {
        $desde = $_GET['desde'] ?? date('Y-m-01');
        $hasta = $_GET['hasta'] ?? date('Y-m-d');

        $r = $db->prepare("
            SELECT v.Id_Usuario,
                   COALESCE(u.Nombre, CONCAT('Usuario #', v.Id_Usuario)) AS vendedor,
                   COUNT(DISTINCT v.Factura_N) AS num_facturas,
                   SUM(CASE WHEN v.Tipo='Contado' THEN v.Total ELSE 0 END) AS contado,
                   SUM(CASE WHEN v.Tipo='Crédito' THEN v.Total ELSE 0 END) AS credito,
                   SUM(v.Total) AS total,
                   AVG(v.Total) AS ticket_promedio
            FROM tblventas v
            LEFT JOIN tblusuarios u ON u.Id_Usuario = v.Id_Usuario
            WHERE DATE(v.Fecha) BETWEEN ? AND ? AND v.EstadoFact='Valida'
            GROUP BY v.Id_Usuario, u.Nombre
            ORDER BY total DESC
        ");
        $r->execute([$desde, $hasta]);
        $vendedores = $r->fetchAll();

        $totalGeneral = array_sum(array_map(fn($v) => floatval($v['total']), $vendedores));
        echo json_encode([
            'success' => true,
            'rango' => ['desde' => $desde, 'hasta' => $hasta],
            'vendedores' => $vendedores,
            'total_general' => $totalGeneral,
        ], JSON_UNESCAPED_UNICODE);
        exit;
    }

    echo json_encode(['success' => false, 'message' => "Tipo no válido: $tipo"]);
} catch (Exception $e) {
    echo json_encode(['success' => false, 'message' => $e->getMessage()]);
}
