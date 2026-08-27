<?php
/**
 * DELETE /api/facturas-recibidas/eliminar.php?id=X
 * o POST { "action": "delete", "id": X }
 *
 * Bloqueado si la factura ya tiene algún evento APROBADO — esos eventos
 * quedaron registrados en DIAN y borrar la factura local pierde trazabilidad.
 * Si el usuario necesita "limpiar" un ingreso equivocado (por ejemplo, subió
 * un ZIP que no era), esto solo aplica ANTES de emitir cualquier evento.
 *
 * Elimina también las líneas (CASCADE lógico) y el archivo físico del XML.
 */
require_once __DIR__ . '/../config/database.php';
header('Content-Type: application/json; charset=utf-8');

try {
    $method = $_SERVER['REQUEST_METHOD'];
    $id = 0;
    if ($method === 'DELETE') {
        $id = intval($_GET['id'] ?? 0);
    } elseif ($method === 'POST') {
        $data = json_decode(file_get_contents('php://input'), true) ?: [];
        if (($data['action'] ?? '') === 'delete') $id = intval($data['id'] ?? 0);
    }
    if ($id <= 0) {
        http_response_code(422);
        echo json_encode(['success' => false, 'message' => 'ID requerido']);
        exit;
    }

    $db = (new Database())->getConnection();

    // Verificar que no tenga eventos aprobados
    $stmt = $db->prepare("
        SELECT COUNT(*) FROM eventos_factura_recibida
        WHERE factura_recibida_id = ? AND estado = 'aprobado'
    ");
    $stmt->execute([$id]);
    $eventosAprobados = intval($stmt->fetchColumn());
    if ($eventosAprobados > 0) {
        http_response_code(409);
        echo json_encode([
            'success' => false,
            'message' => "No se puede eliminar: la factura tiene $eventosAprobados evento(s) DIAN aprobado(s). Perdería trazabilidad."
        ]);
        exit;
    }

    // Ubicar el archivo físico para borrarlo también
    $stmt = $db->prepare("SELECT xml_path FROM facturas_recibidas WHERE id = ?");
    $stmt->execute([$id]);
    $row = $stmt->fetch();
    if (!$row) {
        http_response_code(404);
        echo json_encode(['success' => false, 'message' => 'Factura no encontrada']);
        exit;
    }

    $db->beginTransaction();
    try {
        $db->prepare("DELETE FROM eventos_factura_recibida WHERE factura_recibida_id = ?")->execute([$id]);
        $db->prepare("DELETE FROM detalle_factura_recibida WHERE factura_recibida_id = ?")->execute([$id]);
        $db->prepare("DELETE FROM facturas_recibidas WHERE id = ?")->execute([$id]);
        $db->commit();
    } catch (\Throwable $e) {
        $db->rollBack();
        throw $e;
    }

    // Borrar archivo físico best-effort (no aborta si falla — la BD ya se limpió)
    if (!empty($row['xml_path'])) {
        $backendRoot = realpath(__DIR__ . '/../..');
        $abs = $backendRoot . DIRECTORY_SEPARATOR . str_replace('/', DIRECTORY_SEPARATOR, $row['xml_path']);
        if (file_exists($abs)) @unlink($abs);
    }

    echo json_encode(['success' => true, 'message' => 'Factura recibida eliminada']);

} catch (\Throwable $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => $e->getMessage()]);
}
