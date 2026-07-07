<?php
/**
 * POST /api/facturas-recibidas/evento-emitir.php
 * Body JSON: {
 *   "factura_recibida_id": 123,
 *   "event_code": "030" | "031" | "032" | "033" | "034",
 *   "rejection_code": "...",         // required si event_code == 031
 *   "rejection_description": "...",  // required si event_code == 031
 *   "note": "..."                    // required si event_code == 034 (formato oficial DIAN)
 * }
 *
 * Aplica las reglas de flujo DIAN localmente antes de gastar el request a la
 * API remota — evita rechazos innecesarios y da buena UX:
 *   1. Idempotencia: no reenviar el mismo evento aprobado.
 *   2. LGC12: 033 y 031 requieren 032 previo aprobado.
 *   3. Exclusión mutua: sobre la misma factura no coexisten 033 y 031 aprobados.
 *
 * Luego arma el payload y hace POST a
 * https://api-electronica.innovacion-digital.com/public/api/eventos/acuse
 * (endpoint público, sin JWT). Guarda el resultado en eventos_factura_recibida.
 *
 * El company_id se obtiene con loginFE() — mismo mecanismo que ya usa
 * enviar.php del módulo de FE emitida, para no duplicar credenciales.
 */
ini_set('display_errors', 0);
error_reporting(E_ALL);
set_error_handler(function ($sev, $msg, $file, $line) {
    if (!(error_reporting() & $sev)) return false;
    throw new ErrorException($msg, 0, $sev, $file, $line);
});
register_shutdown_function(function () {
    $err = error_get_last();
    if ($err && in_array($err['type'], [E_ERROR, E_PARSE, E_CORE_ERROR, E_COMPILE_ERROR], true)) {
        if (!headers_sent()) {
            http_response_code(500);
            header('Content-Type: application/json; charset=utf-8');
        }
        echo json_encode([
            'success' => false,
            'message' => 'PHP fatal: ' . $err['message'],
            'file'    => basename($err['file']) . ':' . $err['line'],
        ]);
    }
});

require_once __DIR__ . '/../config/database.php';
header('Content-Type: application/json; charset=utf-8');

// Textos oficiales del anexo DIAN v1.9 sec 6.5.5.
// Regla AAH04 rechaza si el label no coincide con el código.
const EVENT_LABELS = [
    '030' => 'Acuse de recibo de Factura Electrónica de Venta',
    '031' => 'Reclamo de la Factura Electrónica de Venta',
    '032' => 'Recibo del bien y/o prestación del servicio',
    '033' => 'Aceptación expresa',
    // Ojo: DIAN exige "T" MAYÚSCULA para 034 — regla AAH04 sec 6.5.5.7.
    '034' => 'Aceptación Tácita',
];

$API_BASE = 'https://api-electronica.innovacion-digital.com/public';

/**
 * Login contra la API remota — devuelve token + company_id.
 * Reutiliza email_factelect + password_factelect de tbldatosempresa.
 */
function loginFacturadorElectronico(\PDO $db, string $apiBase): array {
    $stmt = $db->query("SELECT email_factelect, password_factelect FROM tbldatosempresa LIMIT 1");
    $emp = $stmt->fetch();
    $email = trim((string)($emp['email_factelect'] ?? ''));
    $pass  = trim((string)($emp['password_factelect'] ?? ''));
    if ($email === '' || $pass === '') {
        throw new \RuntimeException('Faltan credenciales de facturación electrónica en Datos de Empresa (email_factelect / password_factelect).');
    }
    $ch = curl_init("$apiBase/login");
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_POST           => true,
        CURLOPT_POSTFIELDS     => json_encode(['email' => $email, 'password' => $pass]),
        CURLOPT_HTTPHEADER     => ['Content-Type: application/json'],
        CURLOPT_SSL_VERIFYPEER => false,
        CURLOPT_TIMEOUT        => 20,
    ]);
    $raw = curl_exec($ch);
    $code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    $resp = json_decode($raw, true) ?: [];
    if ($code < 200 || $code >= 300 || empty($resp['token'])) {
        throw new \RuntimeException('No se pudo autenticar contra api-electronica: HTTP ' . $code);
    }
    // La respuesta trae id_empresa (o companies[0].id). Usamos el primero disponible.
    $companyId = intval($resp['id_empresa'] ?? ($resp['company_id'] ?? ($resp['companies'][0]['id'] ?? 0)));
    if ($companyId <= 0) {
        throw new \RuntimeException('Login OK pero no vino id_empresa/company_id en la respuesta');
    }
    return ['token' => $resp['token'], 'company_id' => $companyId];
}

try {
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        http_response_code(405);
        echo json_encode(['success' => false, 'message' => 'Método no permitido']);
        exit;
    }
    $in = json_decode(file_get_contents('php://input'), true) ?: [];
    $facturaId = intval($in['factura_recibida_id'] ?? 0);
    $eventCode = trim((string)($in['event_code'] ?? ''));
    $rejCode   = trim((string)($in['rejection_code'] ?? ''));
    $rejDesc   = trim((string)($in['rejection_description'] ?? ''));
    $note      = trim((string)($in['note'] ?? ''));

    if ($facturaId <= 0) {
        http_response_code(422);
        echo json_encode(['success' => false, 'message' => 'factura_recibida_id requerido']);
        exit;
    }
    if (!array_key_exists($eventCode, EVENT_LABELS)) {
        http_response_code(422);
        echo json_encode(['success' => false, 'message' => 'event_code inválido (usa 030/031/032/033/034)']);
        exit;
    }
    if ($eventCode === '031' && ($rejCode === '' || $rejDesc === '')) {
        http_response_code(422);
        echo json_encode(['success' => false, 'message' => 'Reclamo (031) requiere código y descripción']);
        exit;
    }
    if ($eventCode === '034' && $note === '') {
        http_response_code(422);
        echo json_encode(['success' => false, 'message' => 'Aceptación Tácita (034) requiere el texto oficial en `note`']);
        exit;
    }

    $db = (new Database())->getConnection();

    // Cargar factura recibida
    $stmt = $db->prepare("SELECT * FROM facturas_recibidas WHERE id = ?");
    $stmt->execute([$facturaId]);
    $factura = $stmt->fetch();
    if (!$factura) {
        http_response_code(404);
        echo json_encode(['success' => false, 'message' => 'Factura recibida no encontrada']);
        exit;
    }

    // Reglas de flujo local (antes de gastar el request remoto)
    $stmt = $db->prepare("
        SELECT event_code FROM eventos_factura_recibida
        WHERE factura_recibida_id = ? AND estado = 'aprobado'
    ");
    $stmt->execute([$facturaId]);
    $aprobados = array_column($stmt->fetchAll(), 'event_code');

    // 1) Idempotencia
    if (in_array($eventCode, $aprobados, true)) {
        http_response_code(409);
        echo json_encode([
            'success' => false,
            'message' => "El evento $eventCode ya fue aprobado sobre esta factura",
            'regla'   => 'idempotencia',
        ]);
        exit;
    }
    // 2) LGC12: 033 y 031 requieren 032 previo
    if (in_array($eventCode, ['033', '031'], true) && !in_array('032', $aprobados, true)) {
        http_response_code(422);
        echo json_encode([
            'success' => false,
            'message' => "Regla LGC12: el evento $eventCode requiere que el evento 032 (Recibo del bien) esté aprobado antes",
            'regla'   => 'LGC12',
        ]);
        exit;
    }
    // 3) Exclusión mutua 033 ↔ 031
    if ($eventCode === '033' && in_array('031', $aprobados, true)) {
        http_response_code(422);
        echo json_encode(['success' => false, 'message' => 'La factura ya fue reclamada (031). No se puede aceptar.', 'regla' => 'exclusion_mutua']);
        exit;
    }
    if ($eventCode === '031' && in_array('033', $aprobados, true)) {
        http_response_code(422);
        echo json_encode(['success' => false, 'message' => 'La factura ya fue aceptada (033). No se puede reclamar.', 'regla' => 'exclusion_mutua']);
        exit;
    }

    // Login para saber el company_id de la API remota
    $login = loginFacturadorElectronico($db, $API_BASE);

    // Payload para el endpoint remoto
    $payload = [
        'company_id'                 => $login['company_id'],
        'event_code'                 => $eventCode,
        'invoice_cufe'               => $factura['cufe'],
        'invoice_number'             => trim(($factura['prefijo'] ?? '') . ($factura['numero'] ?? '')),
        'invoice_issue_date'         => $factura['fecha_emision'],
        'invoice_payable_amount'     => (float) $factura['total'],
        'invoice_document_type_code' => $factura['document_type_code'] ?: '01',
        'issuer_nit'                 => preg_replace('/\D/', '', (string) $factura['emisor_nit']),
        'issuer_name'                => $factura['emisor_nombre'],
        'issuer_organization_type'   => $factura['emisor_organization_type'] ?: '1',
    ];
    if ($factura['emisor_dv']) $payload['issuer_dv'] = $factura['emisor_dv'];
    if ($eventCode === '031') {
        $payload['rejection_code']        = $rejCode;
        $payload['rejection_description'] = $rejDesc;
    }
    if ($eventCode === '034') {
        $payload['note'] = $note;
    }

    // Registrar en BD ANTES de enviar — para trazabilidad si la API cae
    $usuarioId = intval($in['usuario_id'] ?? 0) ?: null;
    $stmtIns = $db->prepare("
        INSERT INTO eventos_factura_recibida
        (factura_recibida_id, event_code, event_label,
         rejection_code, rejection_description, note,
         estado, usuario_id, created_at)
        VALUES (?, ?, ?, ?, ?, ?, 'pendiente', ?, NOW())
    ");
    $stmtIns->execute([
        $facturaId, $eventCode, EVENT_LABELS[$eventCode],
        $rejCode ?: null, $rejDesc ?: null, $note ?: null,
        $usuarioId,
    ]);
    $eventoLocalId = (int) $db->lastInsertId();

    // POST al endpoint público de acuse. Nota: sin Authorization: Bearer
    // porque el endpoint está fuera del middleware auth de la API.
    $ch = curl_init("$API_BASE/api/eventos/acuse");
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_POST           => true,
        CURLOPT_POSTFIELDS     => json_encode($payload),
        CURLOPT_HTTPHEADER     => ['Content-Type: application/json', 'Accept: application/json'],
        CURLOPT_SSL_VERIFYPEER => false,
        CURLOPT_TIMEOUT        => 120,   // firma + envío SOAP a DIAN
    ]);
    $rawResp  = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $curlErr  = curl_error($ch);
    curl_close($ch);
    $resp = json_decode($rawResp, true) ?: [];

    $ok           = ($httpCode >= 200 && $httpCode < 300) && !empty($resp['success']);
    $cudeEvento   = $resp['cude_evento']  ?? null;
    $dianStatus   = $resp['dian_status']  ?? null;
    $dianMessage  = $resp['dian_message'] ?? ($resp['message'] ?? ($resp['error'] ?? null));
    $eventIdRem   = intval($resp['event_id'] ?? 0) ?: null;

    // Actualizar el registro local con el resultado
    $stmtUpd = $db->prepare("
        UPDATE eventos_factura_recibida
        SET cude_evento = ?, event_id_remoto = ?,
            dian_status = ?, dian_message = ?, api_response = ?,
            estado = ?, enviado_at = NOW()
        WHERE id = ?
    ");
    $stmtUpd->execute([
        $cudeEvento, $eventIdRem, $dianStatus, $dianMessage, $rawResp,
        $ok ? 'aprobado' : 'rechazado',
        $eventoLocalId,
    ]);

    if (!$ok) {
        http_response_code($httpCode >= 400 && $httpCode < 600 ? $httpCode : 502);
        echo json_encode([
            'success'     => false,
            'evento_id'   => $eventoLocalId,
            'event_code'  => $eventCode,
            'http_code'   => $httpCode,
            'message'     => $resp['error'] ?? $resp['message'] ?? "Fallo HTTP $httpCode",
            'dian_status' => $dianStatus,
            'dian_message'=> $dianMessage,
            'response_dian' => $resp['response_dian'] ?? null,
            'curl_error'  => $curlErr ?: null,
        ], JSON_UNESCAPED_UNICODE);
        exit;
    }

    echo json_encode([
        'success'     => true,
        'evento_id'   => $eventoLocalId,
        'event_code'  => $eventCode,
        'event_label' => EVENT_LABELS[$eventCode],
        'cude_evento' => $cudeEvento,
        'dian_status' => $dianStatus,
        'message'     => $resp['message'] ?? "Evento $eventCode registrado en DIAN",
    ], JSON_UNESCAPED_UNICODE);

} catch (\Throwable $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => $e->getMessage()]);
}
