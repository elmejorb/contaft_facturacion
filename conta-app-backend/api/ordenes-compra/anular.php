<?php
/**
 * POST /api/ordenes-compra/anular
 * Anula una OC. Reglas:
 *  - Si estaba 'Pendiente' → simplemente marca Estado='Anulada'.
 *  - Si estaba 'Recibida' o 'Parcial' → NO se anula desde aquí (el operador
 *    debe primero anular el pedido de compra generado por vías normales).
 *    Devuelve error explicativo.
 *
 * Body: { id_oc, motivo? }
 *
 * Regla kardex inmutable: nunca borramos filas. Si la OC ya movió stock,
 * el reverso se hace desde el módulo de Compras (que ya sabe generar los
 * asientos opuestos correctamente).
 */
require_once '../config/database.php';
$db = (new Database())->getConnection();

try {
    $data = json_decode(file_get_contents('php://input'), true);
    if (!$data) { echo json_encode(['success' => false, 'message' => 'Body inválido']); exit; }

    $idOc = intval($data['id_oc'] ?? 0);
    $motivo = trim($data['motivo'] ?? '');
    if ($idOc <= 0) {
        echo json_encode(['success' => false, 'message' => 'id_oc requerido']);
        exit;
    }

    $stmt = $db->prepare("SELECT id_oc, numero_oc, Estado, pedido_generado_n, Comentario FROM tbl_ordenes_compra WHERE id_oc = ?");
    $stmt->execute([$idOc]);
    $oc = $stmt->fetch();
    if (!$oc) {
        http_response_code(404);
        echo json_encode(['success' => false, 'message' => 'OC no encontrada']);
        exit;
    }

    if ($oc['Estado'] === 'Anulada') {
        echo json_encode(['success' => false, 'message' => 'La OC ya está anulada']);
        exit;
    }
    if (in_array($oc['Estado'], ['Recibida', 'Parcial'], true)) {
        echo json_encode([
            'success' => false,
            'message' => "La OC ya generó el pedido #{$oc['pedido_generado_n']}. " .
                         "Anula ese pedido de compra primero desde el módulo de Compras."
        ]);
        exit;
    }

    $nuevoCom = trim(($oc['Comentario'] ?? '') . ($motivo !== '' ? " | Anulada: $motivo" : ' | Anulada'));

    $db->prepare("UPDATE tbl_ordenes_compra SET Estado = 'Anulada', Comentario = ?, FechaMod = NOW() WHERE id_oc = ?")
       ->execute([$nuevoCom, $idOc]);

    echo json_encode([
        'success'   => true,
        'id_oc'     => $idOc,
        'numero_oc' => $oc['numero_oc'],
        'estado'    => 'Anulada',
    ], JSON_UNESCAPED_UNICODE);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => $e->getMessage()]);
}
