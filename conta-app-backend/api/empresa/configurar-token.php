<?php
/**
 * Endpoint para configurar el api_token de suscripción durante la
 * instalación inicial del cliente.
 *
 * POST con JSON: { "api_token": "..." }
 *
 * Verifica que el token tenga el formato esperado (mínimo 32 caracteres
 * alfanuméricos) y lo guarda en tbldatosempresa.api_token.
 *
 * El SubscriptionGate de la app llama a este endpoint cuando el cliente
 * tiene la columna api_token vacía/NULL y el instalador la rellena con
 * el token entregado por Innovación Digital.
 */
require_once '../config/database.php';

$db = (new Database())->getConnection();

try {
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        http_response_code(405);
        echo json_encode(['success' => false, 'message' => 'Método no permitido']);
        exit;
    }

    $data = json_decode(file_get_contents('php://input'), true);
    $token = trim((string) ($data['api_token'] ?? ''));

    if ($token === '') {
        echo json_encode(['success' => false, 'message' => 'El token está vacío']);
        exit;
    }
    if (strlen($token) < 32 || !preg_match('/^[a-zA-Z0-9]+$/', $token)) {
        echo json_encode(['success' => false, 'message' => 'Formato de token inválido (debe ser una cadena alfanumérica de al menos 32 caracteres)']);
        exit;
    }

    // Verificar que la columna api_token exista
    $col = $db->query("SHOW COLUMNS FROM tbldatosempresa LIKE 'api_token'")->fetch();
    if (!$col) {
        echo json_encode(['success' => false, 'message' => 'La columna api_token no existe — aplica actualizacion_completa.sql primero']);
        exit;
    }

    $stmt = $db->prepare("UPDATE tbldatosempresa SET api_token = ? WHERE Id_Empresa = 1");
    $stmt->execute([$token]);

    echo json_encode(['success' => true, 'message' => 'Token guardado correctamente']);
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => $e->getMessage()]);
}
