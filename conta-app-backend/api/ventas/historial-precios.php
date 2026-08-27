<?php
/**
 * Historial de precios de VENTA de un producto.
 *
 * Dado el `items` (código interno tblarticulos.Items), devuelve las últimas N
 * ventas de ese producto ordenadas por fecha DESC. Cada fila incluye:
 * fecha, factura, cliente, cantidad, precio unitario, y % variación vs venta
 * anterior + vs promedio histórico.
 *
 * Espejo del endpoint api/compras/historial-precios.php pero para ventas —
 * responde el patrón "¿a cómo le vendí este producto la última vez?".
 *
 * GET ?items=123
 * Response:
 *   {
 *     success: true,
 *     items: 123,
 *     articulo: { codigo, nombre },
 *     ventas: [
 *       { factura_n, fecha, cliente_id, cliente, cantidad, precio_unit, subtotal,
 *         delta_pct, delta_prom_pct },
 *       ...
 *     ],
 *     estadisticas: { promedio, minimo, maximo, total_ventas, primera_venta, ultima_venta }
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

    // Últimas 20 ventas del producto (excluir Anuladas y Cotizaciones/Abiertas).
    // Precio unitario efectivo = PrecioV - Descuento por línea proporcional.
    // Cliente puede ser 130500 (VENTAS AL CONTADO) — mostramos "Contado".
    $stmt = $db->prepare("
        SELECT
            v.Factura_N          AS factura_n,
            v.Fecha              AS fecha,
            v.CodigoCli          AS cliente_id,
            COALESCE(NULLIF(TRIM(v.A_nombre), ''), c.Razon_Social, 'Contado') AS cliente,
            d.Cantidad           AS cantidad,
            d.PrecioV            AS precio_unit,
            d.Descuento          AS descuento,
            d.Subtotal           AS subtotal
        FROM tbldetalle_venta d
        INNER JOIN tblventas v ON v.Factura_N = d.Factura_N
        LEFT JOIN tblclientes c ON c.CodigoClien = v.CodigoCli
        WHERE d.Items = :items
          AND (v.EstadoFact IS NULL OR v.EstadoFact = 'Valida')
        ORDER BY v.Fecha DESC, v.Factura_N DESC
        LIMIT 20
    ");
    $stmt->execute([':items' => $items]);
    $rows = $stmt->fetchAll();

    // Precio efectivo = PrecioV (unitario). El descuento por línea puede afectar
    // el precio "real" pero para comparar precios de venta usamos el precio de
    // lista que quedó registrado, no el descontado.
    $precios = array_map(function($r) { return floatval($r['precio_unit']); }, $rows);
    $preciosValidos = array_filter($precios, function($p) { return $p > 0; });
    $promedio = count($preciosValidos) > 0 ? array_sum($preciosValidos) / count($preciosValidos) : 0;
    $minimo = count($preciosValidos) > 0 ? min($preciosValidos) : 0;
    $maximo = count($preciosValidos) > 0 ? max($preciosValidos) : 0;

    $ventas = [];
    foreach ($rows as $idx => $r) {
        $precioAct = floatval($r['precio_unit']);
        $precioAnt = isset($rows[$idx + 1]) ? floatval($rows[$idx + 1]['precio_unit']) : null;
        $deltaPct = ($precioAnt && $precioAnt > 0) ? (($precioAct - $precioAnt) / $precioAnt) * 100 : null;
        $deltaPromPct = ($promedio > 0) ? (($precioAct - $promedio) / $promedio) * 100 : null;

        $ventas[] = [
            'factura_n'      => intval($r['factura_n']),
            'fecha'          => $r['fecha'],
            'cliente_id'     => intval($r['cliente_id']),
            'cliente'        => $r['cliente'],
            'cantidad'       => floatval($r['cantidad']),
            'precio_unit'    => $precioAct,
            'descuento'      => floatval($r['descuento']),
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
        'ventas' => $ventas,
        'estadisticas' => [
            'promedio'      => round($promedio, 2),
            'minimo'        => round($minimo, 2),
            'maximo'        => round($maximo, 2),
            'total_ventas'  => count($rows),
            'primera_venta' => count($rows) > 0 ? $rows[count($rows) - 1]['fecha'] : null,
            'ultima_venta'  => count($rows) > 0 ? $rows[0]['fecha'] : null,
        ],
    ], JSON_UNESCAPED_UNICODE);

} catch (Throwable $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => $e->getMessage()]);
}
