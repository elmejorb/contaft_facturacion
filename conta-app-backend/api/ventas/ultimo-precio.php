<?php
/**
 * Último precio al que se le vendió un producto a un cliente específico.
 *
 * Se usa cuando el cliente tiene tblclientes.UltimoPrecio=1 activo: al agregar
 * un producto en NuevaVenta, en vez de la lista de precios normal, se consulta
 * este endpoint para reusar el precio de la última venta al mismo cliente.
 *
 * GET ?items=X&cliente=Y
 * Response:
 *   { success: true, precio: 3800, factura_n: 123, fecha: "2026-08-05 14:22:00" }
 *   { success: true, precio: null }   // sin ventas previas al cliente
 *
 * Si el producto NUNCA se le ha vendido a ese cliente, precio=null y el
 * frontend cae al precio de lista normal.
 *
 * Excluye ventas anuladas. Toma el PrecioV (unitario, antes de descuento).
 */

require_once '../config/database.php';

$database = new Database();
$db = $database->getConnection();

try {
    $items   = intval($_GET['items']   ?? 0);
    $cliente = intval($_GET['cliente'] ?? 0);

    if ($items <= 0 || $cliente <= 0) {
        echo json_encode(['success' => false, 'message' => 'items y cliente requeridos']);
        exit;
    }

    // Última venta VÁLIDA del producto a ese cliente. Ordenada por fecha DESC,
    // luego Factura_N DESC como tiebreak para ventas del mismo día.
    $stmt = $db->prepare("
        SELECT v.Factura_N, v.Fecha, d.PrecioV
        FROM tbldetalle_venta d
        INNER JOIN tblventas v ON v.Factura_N = d.Factura_N
        WHERE d.Items = :items
          AND v.CodigoCli = :cliente
          AND (v.EstadoFact IS NULL OR v.EstadoFact = 'Valida')
        ORDER BY v.Fecha DESC, v.Factura_N DESC
        LIMIT 1
    ");
    $stmt->execute([':items' => $items, ':cliente' => $cliente]);
    $row = $stmt->fetch();

    if (!$row) {
        echo json_encode(['success' => true, 'precio' => null]);
        exit;
    }

    echo json_encode([
        'success'   => true,
        'precio'    => floatval($row['PrecioV']),
        'factura_n' => intval($row['Factura_N']),
        'fecha'     => $row['Fecha'],
    ], JSON_UNESCAPED_UNICODE);

} catch (Throwable $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => $e->getMessage()]);
}
