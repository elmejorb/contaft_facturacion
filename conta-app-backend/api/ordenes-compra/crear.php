<?php
/**
 * POST /api/ordenes-compra/crear
 * Crea una nueva orden de compra (estado 'Pendiente').
 *
 * Body: {
 *   CodigoPro, fecha, fecha_entrega?, Descuento?, Flete?, Retencion?,
 *   Comentario?, Id_Usuario?,
 *   items: [{ Items, Cantidad, PrecioC, Iva, Descuento? }, ...]
 * }
 *
 * NO toca kardex ni existencias — la OC representa mercancía PEDIDA
 * pero aún no recibida. Cuando llegue, se llama a recibir.php.
 */
require_once '../config/database.php';
$db = (new Database())->getConnection();

try {
    $data = json_decode(file_get_contents('php://input'), true);
    if (!$data) { echo json_encode(['success' => false, 'message' => 'Body inválido']); exit; }

    $CodigoPro = intval($data['CodigoPro'] ?? 0);
    $items     = $data['items'] ?? [];
    if ($CodigoPro <= 0 || empty($items)) {
        echo json_encode(['success' => false, 'message' => 'Proveedor e items son obligatorios']);
        exit;
    }

    $fecha         = $data['fecha']         ?? date('Y-m-d');
    $fecha_entrega = $data['fecha_entrega'] ?? null;
    $descuento     = floatval($data['Descuento'] ?? 0);
    $flete         = floatval($data['Flete']     ?? 0);
    $retencion     = floatval($data['Retencion'] ?? 0);
    $comentario    = trim($data['Comentario']   ?? '');
    $idUsuario     = intval($data['Id_Usuario']  ?? 0) ?: null;

    $db->beginTransaction();

    // Numeración OC-000001 correlativa
    $stmt = $db->query("SELECT COALESCE(MAX(id_oc), 0) + 1 AS next FROM tbl_ordenes_compra");
    $nextId = intval($stmt->fetch()['next']);
    $numero_oc = 'OC-' . str_pad($nextId, 6, '0', STR_PAD_LEFT);

    // Calcular totales de items
    $subtotal = 0;
    $impuesto = 0;
    foreach ($items as $it) {
        $cant   = floatval($it['Cantidad'] ?? 0);
        $precio = floatval($it['PrecioC']  ?? 0);
        $iva    = floatval($it['Iva']      ?? 0);
        $desc   = floatval($it['Descuento'] ?? 0);
        if ($cant <= 0 || $precio < 0) continue;
        $sub    = $cant * $precio - $desc;
        $subtotal += $sub;
        $impuesto += $sub * $iva / 100;
    }
    $total = $subtotal + $impuesto - $descuento + $flete - $retencion;

    // Insertar cabecera
    $stmt = $db->prepare("
        INSERT INTO tbl_ordenes_compra
        (numero_oc, fecha, fecha_entrega, CodigoPro, Impuesto, Descuento, Flete, Retencion, Total,
         Estado, Comentario, Id_Usuario)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'Pendiente', ?, ?)
    ");
    $stmt->execute([$numero_oc, $fecha, $fecha_entrega, $CodigoPro,
                    $impuesto, $descuento, $flete, $retencion, $total,
                    $comentario, $idUsuario]);
    $idOc = intval($db->lastInsertId());

    // Insertar líneas
    $stmtLinea = $db->prepare("
        INSERT INTO tbl_detalle_orden_compra
        (id_oc, Items, Cantidad, PrecioC, Iva, Descuento, Subtotal)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    ");
    foreach ($items as $it) {
        $cant   = floatval($it['Cantidad'] ?? 0);
        $precio = floatval($it['PrecioC']  ?? 0);
        if ($cant <= 0 || $precio < 0) continue;
        $iva    = floatval($it['Iva']      ?? 0);
        $desc   = floatval($it['Descuento'] ?? 0);
        $sub    = $cant * $precio - $desc;
        $stmtLinea->execute([$idOc, intval($it['Items'] ?? 0), $cant, $precio, $iva, $desc, $sub]);
    }

    $db->commit();

    echo json_encode([
        'success'    => true,
        'id_oc'      => $idOc,
        'numero_oc'  => $numero_oc,
        'total'      => $total,
    ], JSON_UNESCAPED_UNICODE);

} catch (Exception $e) {
    if ($db->inTransaction()) $db->rollBack();
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => $e->getMessage()]);
}
