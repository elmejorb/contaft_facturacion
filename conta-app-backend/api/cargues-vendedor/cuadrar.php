<?php
/**
 * Cuadre final del admin — solo local (marca notas y no cambia estado más allá de 'cerrado').
 * POST body: { id: int, notas_admin_final: string }
 *
 * Requiere que el cargue esté en estado 'cerrado' (el vendedor ya cerró en APK).
 * NO regresa al hub — es un registro contable interno.
 */
require_once '../config/database.php';
$database = new Database();
$db = $database->getConnection();

header('Content-Type: application/json; charset=utf-8');

try {
    $data = json_decode(file_get_contents('php://input'), true);
    $id = intval($data['id'] ?? 0);
    $notas = trim($data['notas_admin_final'] ?? '');

    if ($id <= 0) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'id requerido'], JSON_UNESCAPED_UNICODE);
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
    if ($cargue['estado'] !== 'cerrado') {
        http_response_code(409);
        echo json_encode(['success' => false, 'message' => "El cargue no está cerrado (actual: {$cargue['estado']})"], JSON_UNESCAPED_UNICODE);
        exit;
    }

    $notasCombinadas = trim(($cargue['notas_admin'] ?? '') . "\n[CUADRE ADMIN] " . $notas);

    $db->prepare("
        UPDATE tbl_cargues_vendedor SET
            notas_admin = ?,
            updated_at = NOW()
        WHERE id = ?
    ")->execute([$notasCombinadas, $id]);

    echo json_encode([
        'success' => true,
        'message' => 'Cuadre registrado',
    ], JSON_UNESCAPED_UNICODE);
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => $e->getMessage()], JSON_UNESCAPED_UNICODE);
}
