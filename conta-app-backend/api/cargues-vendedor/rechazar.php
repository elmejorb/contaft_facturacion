<?php
/**
 * Rechaza un cargue pendiente localmente y lo empuja al hub.
 * POST body: { id: int, notas_admin: string }
 */
require_once '../config/database.php';
$database = new Database();
$db = $database->getConnection();

header('Content-Type: application/json; charset=utf-8');

try {
    $data = json_decode(file_get_contents('php://input'), true);
    $id = intval($data['id'] ?? 0);
    $notasAdmin = trim($data['notas_admin'] ?? '');

    if ($id <= 0) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'id requerido'], JSON_UNESCAPED_UNICODE);
        exit;
    }
    if ($notasAdmin === '') {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Motivo del rechazo requerido'], JSON_UNESCAPED_UNICODE);
        exit;
    }

    $stmt = $db->prepare("SELECT * FROM tbl_cargues_vendedor WHERE id = ?");
    $stmt->execute([$id]);
    $cargue = $stmt->fetch(PDO::FETCH_ASSOC);
    if (!$cargue) {
        http_response_code(404);
        echo json_encode(['success' => false, 'message' => 'Cargue no encontrado'], JSON_UNESCAPED_UNICODE);
        exit;
    }
    if ($cargue['estado'] !== 'pendiente') {
        http_response_code(409);
        echo json_encode(['success' => false, 'message' => "No se puede rechazar (estado actual: {$cargue['estado']})"], JSON_UNESCAPED_UNICODE);
        exit;
    }
    if (!$cargue['id_cargue_hub']) {
        echo json_encode(['success' => false, 'message' => 'Cargue sin id_cargue_hub'], JSON_UNESCAPED_UNICODE);
        exit;
    }

    $config = $db->query("SELECT * FROM tbl_config_vendedores WHERE id = 1")->fetch();
    $apiUrl = rtrim($config['api_url'] ?? '', '/');
    $email  = $config['api_email'] ?? '';
    $token  = $config['api_token_empresa'] ?? '';

    $payload = json_encode([
        'email' => $email,
        'token_api' => $token,
        'id_hub' => intval($cargue['id_cargue_hub']),
        'id_cargue_desktop' => $id,
        'notas_admin' => $notasAdmin,
    ]);
    $ch = curl_init($apiUrl . '/sync/cargues/rechazar');
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_TIMEOUT, 20);
    curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
    curl_setopt($ch, CURLOPT_SSL_VERIFYHOST, 0);
    curl_setopt($ch, CURLOPT_POST, true);
    curl_setopt($ch, CURLOPT_HTTPHEADER, ['Content-Type: application/json']);
    curl_setopt($ch, CURLOPT_POSTFIELDS, $payload);
    $resp = curl_exec($ch);
    $code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);

    if ($code !== 200 || !$resp) {
        echo json_encode(['success' => false, 'message' => "Error notificando al hub (HTTP $code)"], JSON_UNESCAPED_UNICODE);
        exit;
    }
    $dataHub = json_decode($resp, true);
    if (!empty($dataHub['error'])) {
        echo json_encode(['success' => false, 'message' => $dataHub['mensaje'] ?? 'Hub rechazó operación'], JSON_UNESCAPED_UNICODE);
        exit;
    }

    $db->prepare("
        UPDATE tbl_cargues_vendedor SET
            estado = 'rechazado',
            notas_admin = ?,
            updated_at = NOW()
        WHERE id = ?
    ")->execute([$notasAdmin, $id]);

    echo json_encode([
        'success' => true,
        'message' => 'Cargue rechazado. El vendedor podrá crear uno nuevo.',
    ], JSON_UNESCAPED_UNICODE);
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => $e->getMessage()], JSON_UNESCAPED_UNICODE);
}
