<?php
/**
 * Historial de precios de compra de un producto.
 *
 * Dado el `items` (código interno del producto, tblarticulos.Items), devuelve
 * las últimas N compras de ese producto ordenadas por fecha DESC. Cada fila
 * incluye: fecha, factura, proveedor, cantidad, costo unitario (con IVA), y
 * el % de variación vs la compra anterior + vs el promedio histórico.
 *
 * Uso: al agregar un producto a una nueva compra, el usuario puede consultar
 * "¿a cómo lo compré la última vez?" y detectar subidas de precio anómalas.
 *
 * GET ?items=123
 * Response:
 *   {
 *     success: true,
 *     items: 123,
 *     articulo: "GALLETAS OREO 12X100G",
 *     compras: [
 *       { pedido_n, fecha, factura, proveedor, cantidad, costo_unit, subtotal,
 *         delta_pct: 5.2,   // % vs compra anterior (positivo = más caro)
 *         delta_prom_pct: 3.1  // % vs promedio histórico
 *       },
 *       ...
 *     ],
 *     estadisticas: { promedio, minimo, maximo, primera_compra, ultima_compra }
 *   }
 */

require_once '../config/database.php';

$database = new Database();
$db = $database->getConnection();

try {
    $items = intval($_GET['items'] ?? 0);
    if ($items <= 0) {
        echo json_encode(['success' => false, 'message' => 'items requerido']);
        exit;
    }

    // Nombre del artículo
    $stmtArt = $db->prepare("SELECT Codigo, Nombres_Articulo FROM tblarticulos WHERE Items = ?");
    $stmtArt->execute([$items]);
    $art = $stmtArt->fetch();
    if (!$art) {
        echo json_encode(['success' => false, 'message' => 'Artículo no encontrado']);
        exit;
    }

    // Historial: últimas 20 compras (excluyendo anuladas).
    // CostoFinal = PrecioC más flete unitario prorrateado. Usamos PrecioC como
    // fallback cuando CostoFinal está en 0 (compras viejas anteriores a que
    // se agregaran esas columnas).
    $stmt = $db->prepare("
        SELECT
            p.Pedido_N AS pedido_n,
            p.Fecha AS fecha,
            p.FacturaCompra_N AS factura,
            p.CodigoPro AS codigo_pro,
            COALESCE(pv.RazonSocial, 'Sin proveedor') AS proveedor,
            d.Cantidad AS cantidad,
            CASE WHEN d.CostoFinal > 0 THEN d.CostoFinal ELSE d.PrecioC END AS costo_unit,
            d.Subtotal AS subtotal,
            d.PrecioC AS precio_c,
            d.CostoFinal AS costo_final,
            d.FleteUnit AS flete_unit
        FROM tbldetalle_pedido d
        INNER JOIN tblpedidos p ON p.Pedido_N = d.Pedido_N
        LEFT JOIN tblproveedores pv ON pv.CodigoPro = p.CodigoPro
        WHERE d.Items = :items
          AND (p.EstadoPedido IS NULL OR p.EstadoPedido != 'Anulada')
        ORDER BY p.Fecha DESC
        LIMIT 20
    ");
    $stmt->execute([':items' => $items]);
    $rows = $stmt->fetchAll();

    // Enriquecer con deltas
    // (a) delta_pct: variación vs compra INMEDIATAMENTE ANTERIOR (la de más abajo en el orden DESC)
    // (b) delta_prom_pct: variación vs promedio histórico simple
    $costos = array_map(function($r) { return floatval($r['costo_unit']); }, $rows);
    $costosValidos = array_filter($costos, function($c) { return $c > 0; });
    $promedio = count($costosValidos) > 0 ? array_sum($costosValidos) / count($costosValidos) : 0;
    $minimo = count($costosValidos) > 0 ? min($costosValidos) : 0;
    $maximo = count($costosValidos) > 0 ? max($costosValidos) : 0;

    $compras = [];
    foreach ($rows as $idx => $r) {
        $costoAct = floatval($r['costo_unit']);
        // Compra anterior en el tiempo = la SIGUIENTE en el array (porque DESC)
        $costoAnt = isset($rows[$idx + 1]) ? floatval($rows[$idx + 1]['costo_unit']) : null;
        $deltaPct = ($costoAnt && $costoAnt > 0) ? (($costoAct - $costoAnt) / $costoAnt) * 100 : null;
        $deltaPromPct = ($promedio > 0) ? (($costoAct - $promedio) / $promedio) * 100 : null;

        $compras[] = [
            'pedido_n'       => intval($r['pedido_n']),
            'fecha'          => $r['fecha'],
            'factura'        => $r['factura'],
            'codigo_pro'     => intval($r['codigo_pro']),
            'proveedor'      => $r['proveedor'],
            'cantidad'       => floatval($r['cantidad']),
            'costo_unit'     => $costoAct,
            'subtotal'       => floatval($r['subtotal']),
            'delta_pct'      => $deltaPct !== null ? round($deltaPct, 2) : null,
            'delta_prom_pct' => $deltaPromPct !== null ? round($deltaPromPct, 2) : null,
        ];
    }

    echo json_encode([
        'success' => true,
        'items' => $items,
        'articulo' => [
            'codigo' => $art['Codigo'],
            'nombre' => $art['Nombres_Articulo'],
        ],
        'compras' => $compras,
        'estadisticas' => [
            'promedio' => round($promedio, 2),
            'minimo'   => round($minimo, 2),
            'maximo'   => round($maximo, 2),
            'total_compras' => count($rows),
            'primera_compra' => count($rows) > 0 ? $rows[count($rows) - 1]['fecha'] : null,
            'ultima_compra'  => count($rows) > 0 ? $rows[0]['fecha'] : null,
        ],
    ], JSON_UNESCAPED_UNICODE);

} catch (Throwable $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => $e->getMessage()]);
}
