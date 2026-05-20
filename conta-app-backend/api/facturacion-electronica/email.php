<?php
/**
 * Enviar factura electrónica por email a uno o varios destinatarios.
 *
 * POST {
 *   cufe: string,                  // requerido
 *   email: string,                 // opcional — si no, usa tblclientes.Email del doc
 *                                  // soporta "a@x.com, b@y.com; c@z.com"
 *   force_resend: bool,            // default false; salta el check de "ya enviado"
 *   update_cliente_email: bool     // si true, guarda los correos validados en
 *                                  // tblclientes.Email para próximas FE
 * }
 *
 * Responde con success=true si AL MENOS UNO se envió. Incluye `enviados[]` y
 * `fallidos[]` para que el frontend muestre el desglose.
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

/**
 * Parsea y valida una lista de correos separados por coma o punto y coma.
 * Devuelve ['validos' => [...], 'invalidos' => [...]].
 */
function parsearCorreos(string $raw): array {
    // Quitar todos los whitespace (espacios, tabs, non-breaking space)
    $limpio = preg_replace('/[\s\x{00A0}]+/u', '', $raw);
    if ($limpio === '') return ['validos' => [], 'invalidos' => []];
    $partes = preg_split('/[;,]/', $limpio);
    $validos = [];
    $invalidos = [];
    $vistos = [];
    foreach ($partes as $p) {
        $p = trim($p);
        if ($p === '') continue;
        // Evitar duplicados (case-insensitive)
        $key = strtolower($p);
        if (isset($vistos[$key])) continue;
        $vistos[$key] = true;
        if (filter_var($p, FILTER_VALIDATE_EMAIL)) {
            $validos[] = $p;
        } else {
            $invalidos[] = $p;
        }
    }
    return ['validos' => $validos, 'invalidos' => $invalidos];
}

$database = new Database();
$db = $database->getConnection();

try {
    $data = json_decode(file_get_contents('php://input'), true);
    $cufe = $data['cufe'] ?? '';
    $emailParam = $data['email'] ?? '';
    $forceResend = $data['force_resend'] ?? false;
    $updateClienteEmail = $data['update_cliente_email'] ?? false;

    if (!$cufe) { echo json_encode(['success' => false, 'message' => 'CUFE requerido']); exit; }

    // Documento + email del cliente
    $stmt = $db->prepare("SELECT e.*, c.Email AS cliente_email FROM electronic_documents e LEFT JOIN tblclientes c ON e.cod_cliente = c.CodigoClien WHERE e.cufe = ?");
    $stmt->execute([$cufe]);
    $doc = $stmt->fetch();
    if (!$doc) { echo json_encode(['success' => false, 'message' => 'Documento no encontrado']); exit; }

    // Parsear el campo recibido (o el del cliente si no se envió)
    $fuente = $emailParam !== '' ? $emailParam : ($doc['cliente_email'] ?? '');
    $parsed = parsearCorreos($fuente);

    if (count($parsed['validos']) === 0) {
        $msg = count($parsed['invalidos']) > 0
            ? 'Ningún correo tiene formato válido. Inválidos: ' . implode(', ', $parsed['invalidos'])
            : 'No se proporcionaron correos. Registre al menos uno.';
        echo json_encode(['success' => false, 'message' => $msg, 'invalidos' => $parsed['invalidos']]);
        exit;
    }

    // Login una sola vez al provider FE
    $stmt = $db->query("SELECT email_factelect, password_factelect FROM tbldatosempresa LIMIT 1");
    $emp = $stmt->fetch();
    $loginResult = apiRequest("$API_BASE/login", 'POST', ['email' => $emp['email_factelect'], 'password' => $emp['password_factelect']]);
    if (!isset($loginResult['body']['token'])) {
        echo json_encode(['success' => false, 'message' => 'Error al autenticar con la API FE']);
        exit;
    }
    $token = $loginResult['body']['token'];
    $companyId = $loginResult['body']['id_empresa'] ?? 1;

    // Preparar archivo de log por CUFE — útil para auditoría y debugging
    $logsDir = __DIR__ . '/logs';
    if (!is_dir($logsDir)) @mkdir($logsDir, 0755, true);
    $cufeSafe = preg_replace('/[^a-zA-Z0-9]/', '', $cufe);
    $logFile = $logsDir . '/email_' . substr($cufeSafe, 0, 32) . '.log';
    $logHandle = @fopen($logFile, 'a');
    $logWrite = function($entry) use ($logHandle) {
        if ($logHandle) {
            fwrite($logHandle, '[' . date('Y-m-d H:i:s') . '] ' . json_encode($entry, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT) . "\n\n");
        }
    };
    $logWrite([
        'event' => 'inicio_envio',
        'cufe' => $cufe,
        'force_resend' => $forceResend,
        'destinatarios_validos' => $parsed['validos'],
        'destinatarios_invalidos' => $parsed['invalidos'],
        'update_cliente' => $updateClienteEmail,
    ]);

    // Enviar a cada destinatario válido
    $enviados = [];
    $fallidos = [];
    foreach ($parsed['validos'] as $idx => $dest) {
        $payload = [
            'company_id' => $companyId,
            'cufe' => $cufe,
            'email' => $dest,
            'force_resend' => $forceResend,
        ];
        $logWrite([
            'event' => 'request_a_dian_api',
            'iteracion' => $idx + 1,
            'destinatario' => $dest,
            'url' => "$API_BASE/api/email/send-complete",
            'payload' => $payload,
        ]);
        $result = apiRequest("$API_BASE/api/email/send-complete", 'POST', $payload, $token);
        $logWrite([
            'event' => 'response_de_dian_api',
            'iteracion' => $idx + 1,
            'destinatario' => $dest,
            'http_code' => $result['code'],
            'body' => $result['body'],
        ]);
        if ($result['code'] === 200) {
            $enviados[] = $dest;
        } else {
            $errMsg = is_array($result['body']) ? ($result['body']['message'] ?? "HTTP {$result['code']}") : "HTTP {$result['code']}";
            $fallidos[] = ['email' => $dest, 'error' => $errMsg, 'code' => $result['code']];
        }
    }

    // Si al menos uno se envió, marcar el doc como enviado.
    // email_recipient es opcional — agregamos la columna si no existe (idempotente).
    if (count($enviados) > 0) {
        $listaTxt = implode(', ', $enviados);

        // Asegurar columna email_recipient (silencioso si ya existe)
        try {
            $colExists = $db->query("SELECT COUNT(*) FROM information_schema.columns WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='electronic_documents' AND COLUMN_NAME='email_recipient'")->fetchColumn();
            if (intval($colExists) === 0) {
                $db->exec("ALTER TABLE electronic_documents ADD COLUMN email_recipient VARCHAR(500) NULL");
                $logWrite(['event' => 'schema_fix', 'message' => 'Columna email_recipient agregada']);
            }
            $db->prepare("UPDATE electronic_documents SET email_sent = 1, email_sent_at = NOW(), email_recipient = ? WHERE cufe = ?")
               ->execute([$listaTxt, $cufe]);
        } catch (Exception $exCol) {
            // Fallback: actualizar solo lo que sí existe
            $db->prepare("UPDATE electronic_documents SET email_sent = 1, email_sent_at = NOW() WHERE cufe = ?")
               ->execute([$cufe]);
            $logWrite(['event' => 'schema_error', 'message' => $exCol->getMessage()]);
        }

        // Actualizar el campo Email del cliente si lo pidió
        if ($updateClienteEmail && !empty($doc['cod_cliente'])) {
            $nuevoEmail = implode(', ', $parsed['validos']);
            $db->prepare("UPDATE tblclientes SET Email = ? WHERE CodigoClien = ?")
               ->execute([$nuevoEmail, $doc['cod_cliente']]);
            $logWrite(['event' => 'cliente_email_actualizado', 'cliente_id' => $doc['cod_cliente'], 'nuevo_email' => $nuevoEmail]);
        }
    }

    $logWrite([
        'event' => 'finalizado',
        'enviados' => $enviados,
        'fallidos' => $fallidos,
    ]);
    if ($logHandle) fclose($logHandle);

    // Mensaje final
    $totalOk = count($enviados);
    $totalFail = count($fallidos);
    $msg = '';
    if ($totalOk > 0 && $totalFail === 0) {
        $msg = $totalOk === 1
            ? "Correo enviado a {$enviados[0]}"
            : "Correo enviado a {$totalOk} destinatarios";
    } elseif ($totalOk > 0 && $totalFail > 0) {
        $msg = "Enviado a {$totalOk}, falló en {$totalFail}";
    } else {
        $msg = "No se pudo enviar a ningún destinatario";
    }
    if (count($parsed['invalidos']) > 0) {
        $msg .= ' — formato inválido (ignorados): ' . implode(', ', $parsed['invalidos']);
    }

    echo json_encode([
        'success' => $totalOk > 0,
        'message' => $msg,
        'enviados' => $enviados,
        'fallidos' => $fallidos,
        'invalidos' => $parsed['invalidos'],
        'code' => $totalOk > 0 ? 200 : ($fallidos[0]['code'] ?? 500),
    ], JSON_UNESCAPED_UNICODE);

} catch (Exception $e) {
    echo json_encode(['success' => false, 'message' => $e->getMessage()]);
}
?>
