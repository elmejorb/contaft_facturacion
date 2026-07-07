<?php
/**
 * GET /api/facturas-recibidas/detalle.php?id=X
 *
 * Devuelve el detalle completo de una factura recibida:
 *  - cabecera
 *  - líneas del detalle
 *  - timeline de eventos (todos, incluyendo rechazados)
 */
require_once __DIR__ . '/../config/database.php';
header('Content-Type: application/json; charset=utf-8');

try {
    $id = intval($_GET['id'] ?? 0);
    if ($id <= 0) {
        http_response_code(422);
        echo json_encode(['success' => false, 'message' => 'ID requerido']);
        exit;
    }

    $db = (new Database())->getConnection();

    $stmt = $db->prepare("SELECT * FROM facturas_recibidas WHERE id = ?");
    $stmt->execute([$id]);
    $factura = $stmt->fetch();
    if (!$factura) {
        http_response_code(404);
        echo json_encode(['success' => false, 'message' => 'Factura no encontrada']);
        exit;
    }
    // Cast numérico para el frontend
    $factura['subtotal']  = floatval($factura['subtotal']);
    $factura['total_iva'] = floatval($factura['total_iva']);
    $factura['total']     = floatval($factura['total']);

    $stmt = $db->prepare("
        SELECT * FROM detalle_factura_recibida
        WHERE factura_recibida_id = ?
        ORDER BY linea_num
    ");
    $stmt->execute([$id]);
    $lineas = $stmt->fetchAll();
    foreach ($lineas as &$l) {
        $l['cantidad']        = floatval($l['cantidad']);
        $l['precio_unitario'] = floatval($l['precio_unitario']);
        $l['descuento']       = floatval($l['descuento']);
        $l['iva_pct']         = floatval($l['iva_pct']);
        $l['iva_monto']       = floatval($l['iva_monto']);
        $l['subtotal']        = floatval($l['subtotal']);
        $l['total_linea']     = floatval($l['total_linea']);
    }
    unset($l);

    $stmt = $db->prepare("
        SELECT * FROM eventos_factura_recibida
        WHERE factura_recibida_id = ?
        ORDER BY id DESC
    ");
    $stmt->execute([$id]);
    $eventos = $stmt->fetchAll();

    // Flags de reglas DIAN para el frontend (misma lógica que listar.php)
    $codigosAprobados = array_values(array_unique(array_map(
        fn($e) => $e['event_code'],
        array_filter($eventos, fn($e) => $e['estado'] === 'aprobado')
    )));

    echo json_encode([
        'success' => true,
        'factura' => $factura,
        'lineas'  => $lineas,
        'eventos' => $eventos,
        'estado_eventos' => [
            'aprobados' => $codigosAprobados,
            'tiene_030' => in_array('030', $codigosAprobados, true),
            'tiene_031' => in_array('031', $codigosAprobados, true),
            'tiene_032' => in_array('032', $codigosAprobados, true),
            'tiene_033' => in_array('033', $codigosAprobados, true),
            'tiene_034' => in_array('034', $codigosAprobados, true),
        ],
    ], JSON_UNESCAPED_UNICODE);

} catch (\Throwable $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => $e->getMessage()]);
}
