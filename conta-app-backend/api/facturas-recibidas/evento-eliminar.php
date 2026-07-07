<?php
/**
 * DELETE /api/facturas-recibidas/evento-eliminar.php?id=X
 * o POST { "action": "delete_evento", "id": X }
 * o POST { "action": "limpiar_no_aprobados", "factura_recibida_id": Y }
 *
 * Elimina eventos rechazados o pendientes — no toca los APROBADOS (esos
 * ya están en DIAN y borrarlos localmente pierde trazabilidad).
 *
 * Casos de uso:
 *  1. Un rechazo específico que ya no sirve (dian_message="Server Error"
 *     de intentos donde la API remota crasheó).
 *  2. Limpiar TODOS los rechazados/pendientes de una factura de un golpe
 *     una vez ya tienes el aprobado.
 */
require_once __DIR__ . '/../config/database.php';
header('Content-Type: application/json; charset=utf-8');

try {
    $db = (new Database())->getConnection();
    $method = $_SERVER['REQUEST_METHOD'];

    // Caso 1: borrar un evento específico por id (rechazado/pendiente)
    $eventoId = 0;
    if ($method === 'DELETE') {
        $eventoId = intval($_GET['id'] ?? 0);
    } elseif ($method === 'POST') {
        $data = json_decode(file_get_contents('php://input'), true) ?: [];
        if (($data['action'] ?? '') === 'delete_evento') {
            $eventoId = intval($data['id'] ?? 0);
        }
        // Caso 2: limpieza en bloque de no-aprobados de una factura
        if (($data['action'] ?? '') === 'limpiar_no_aprobados') {
            $facturaId = intval($data['factura_recibida_id'] ?? 0);
            if ($facturaId <= 0) {
                http_response_code(422);
                echo json_encode(['success' => false, 'message' => 'factura_recibida_id requerido']);
                exit;
            }
            $stmt = $db->prepare("
                DELETE FROM eventos_factura_recibida
                WHERE factura_recibida_id = ? AND estado IN ('rechazado','pendiente')
            ");
            $stmt->execute([$facturaId]);
            echo json_encode([
                'success' => true,
                'eliminados' => $stmt->rowCount(),
                'message'   => 'Rechazados y pendientes eliminados. Los aprobados se conservan.',
            ]);
            exit;
        }
    }

    if ($eventoId <= 0) {
        http_response_code(422);
        echo json_encode(['success' => false, 'message' => 'ID de evento requerido']);
        exit;
    }

    // Verificar estado antes de borrar — nunca eliminar aprobados
    $stmt = $db->prepare("SELECT estado, event_code FROM eventos_factura_recibida WHERE id = ?");
    $stmt->execute([$eventoId]);
    $ev = $stmt->fetch();
    if (!$ev) {
        http_response_code(404);
        echo json_encode(['success' => false, 'message' => 'Evento no encontrado']);
        exit;
    }
    if ($ev['estado'] === 'aprobado') {
        http_response_code(409);
        echo json_encode([
            'success' => false,
            'message' => "No se puede eliminar el evento {$ev['event_code']} porque ya fue aprobado por DIAN. Perdería trazabilidad.",
        ]);
        exit;
    }

    $db->prepare("DELETE FROM eventos_factura_recibida WHERE id = ?")->execute([$eventoId]);

    echo json_encode(['success' => true, 'message' => 'Evento eliminado']);

} catch (\Throwable $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => $e->getMessage()]);
}
