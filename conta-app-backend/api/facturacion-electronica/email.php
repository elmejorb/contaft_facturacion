<?php
/**
 * Enviar factura electrónica por email
 * POST { cufe, email, force_resend }
 */
require_once '../config/database.php';

$API_BASE = 'https://api-electronica.innovacion-digital.com/public';

function apiRequest($url, $method, $data = null, $token = null) {
    $ch = curl_init($url);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_TIMEOUT, 60);
    curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
    $headers = ['Content-Type: application/json'];
    if ($token) $headers[] = "Authorization: Bearer $token";
    curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);
    if ($method === 'POST') {
        curl_setopt($ch, CURLOPT_POST, true);
        if ($data) curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($data));
    }
    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    return ['code' => $httpCode, 'body' => json_decode($response, true) ?: $response];
}

$database = new Database();
$db = $database->getConnection();

try {
    $data = json_decode(file_get_contents('php://input'), true);
    $cufe = $data['cufe'] ?? '';
    $email = $data['email'] ?? '';
    $forceResend = $data['force_resend'] ?? false;

    if (!$cufe) { echo json_encode(['success' => false, 'message' => 'CUFE requerido']); exit; }

    // Get document
    $stmt = $db->prepare("SELECT e.*, c.Email as cliente_email FROM electronic_documents e LEFT JOIN tblclientes c ON e.cod_cliente = c.CodigoClien WHERE e.cufe = ?");
    $stmt->execute([$cufe]);
    $doc = $stmt->fetch();

    if (!$doc) { echo json_encode(['success' => false, 'message' => 'Documento no encontrado']); exit; }

    // Email destination — sanitizar: quitar espacios, tabs, non-breaking spaces y tomar solo el primero si hay varios
    $emailDest = $email ?: $doc['cliente_email'] ?: '';
    $emailDest = preg_replace('/[\s\x{00A0}]+/u', '', $emailDest);      // quita todos los whitespace
    $partes = preg_split('/[;,]/', $emailDest);
    $emailDest = trim($partes[0] ?? '');
    if (!$emailDest) { echo json_encode(['success' => false, 'message' => 'El cliente no tiene correo electrónico registrado']); exit; }
    if (!filter_var($emailDest, FILTER_VALIDATE_EMAIL)) {
        echo json_encode(['success' => false, 'message' => "El correo '$emailDest' no tiene un formato válido. Corrija el email en los datos del cliente."]);
        exit;
    }

    // Login to FE API
    $stmt = $db->query("SELECT email_factelect, password_factelect FROM tbldatosempresa LIMIT 1");
    $emp = $stmt->fetch();
    $loginResult = apiRequest("$API_BASE/login", 'POST', ['email' => $emp['email_factelect'], 'password' => $emp['password_factelect']]);

    if (!isset($loginResult['body']['token'])) {
        echo json_encode(['success' => false, 'message' => 'Error al autenticar con la API']);
        exit;
    }
    $token = $loginResult['body']['token'];

    // Send email via API
    $emailData = [
        'company_id' => $loginResult['body']['id_empresa'] ?? 1,
        'cufe' => $cufe,
        'email' => $emailDest,
        'force_resend' => $forceResend
    ];

    $result = apiRequest("$API_BASE/api/email/send-complete", 'POST', $emailData, $token);

    if ($result['code'] === 200) {
        // Update local DB
        $db->prepare("UPDATE electronic_documents SET email_sent = 1, email_sent_at = NOW() WHERE cufe = ?")
           ->execute([$cufe]);

        echo json_encode([
            'success' => true,
            'message' => "Correo enviado exitosamente a $emailDest"
        ], JSON_UNESCAPED_UNICODE);
    } else {
        $errorMsg = is_array($result['body']) ? ($result['body']['message'] ?? 'Error al enviar') : 'Error HTTP ' . $result['code'];
        echo json_encode(['success' => false, 'message' => $errorMsg, 'code' => $result['code']]);
    }

} catch (Exception $e) {
    echo json_encode(['success' => false, 'message' => $e->getMessage()]);
}
?>
