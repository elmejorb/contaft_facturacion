<?php
/**
 * Endpoint de upload de backup para Conta FT desktop.
 *
 * El cliente (Electron) comprime su conta.db SQLite con gzip y lo postea
 * acá. Guardamos 1 copia por cliente (sobreescribe la anterior) para no
 * saturar el disco. Ver también listar.php para el panel admin.
 *
 * URL: https://innovacion-digital.com/backups-contaft/upload.php
 * Método: POST (multipart/form-data)
 *
 * Headers:
 *   X-API-Token: <api_token del cliente, 64 chars hex>
 *
 * Form fields:
 *   cliente_id: int   — del JWT de entitlements del cliente
 *   nombre_app: str   — "Conta FT 4.3" (fijo), para distinguir si en el futuro suben otras apps
 *   version:    str   — versión del cliente (ej. "4.8.5"), log
 *   backup:     file  — el .db.gz
 *
 * Respuesta:
 *   { success: true,  cliente_id, empresa, size_bytes, saved_at }
 *   { success: false, message }
 */

header('Content-Type: application/json');

// Config
$BASE_DIR = __DIR__;
$DATA_DIR = "$BASE_DIR/data";
$LOGS_DIR = "$BASE_DIR/logs";
// El CRM recibe el token en la URL, no en body: GET /consulta-vencimiento/{token}
$CRM_VERIFY_URL_BASE = 'https://crm.innovacion-digital.com/api/public/api/v1/consulta-vencimiento';
$MAX_UPLOAD_MB = 50; // Tope por seguridad; una BD compresa típica es 1-5 MB
$CACHE_TOKEN_TTL = 3600; // 1 h — evita martillar al CRM

function respond(int $code, array $body): void {
    http_response_code($code);
    echo json_encode($body, JSON_UNESCAPED_UNICODE);
    exit;
}

function log_line(string $msg): void {
    global $LOGS_DIR;
    $f = $LOGS_DIR . '/upload-' . date('Y-m-d') . '.log';
    @file_put_contents($f, '[' . date('H:i:s') . '] ' . $msg . "\n", FILE_APPEND);
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    respond(405, ['success' => false, 'message' => 'Solo POST permitido']);
}

// Lee token (acepta header o form field)
$token = $_SERVER['HTTP_X_API_TOKEN'] ?? ($_POST['api_token'] ?? '');
$token = trim($token);
if (!preg_match('/^[a-f0-9]{32,128}$/i', $token)) {
    respond(400, ['success' => false, 'message' => 'Token invalido o faltante']);
}

$nombreApp  = $_POST['nombre_app'] ?? 'Conta FT 4.3';
$versionApp = $_POST['version']    ?? 'desconocida';

if (!isset($_FILES['backup']) || $_FILES['backup']['error'] !== UPLOAD_ERR_OK) {
    $err = $_FILES['backup']['error'] ?? 'no-file';
    respond(400, ['success' => false, 'message' => "Archivo backup requerido (error=$err)"]);
}

$upFile = $_FILES['backup'];
if ($upFile['size'] > $MAX_UPLOAD_MB * 1024 * 1024) {
    respond(413, ['success' => false, 'message' => "Archivo excede $MAX_UPLOAD_MB MB"]);
}
if ($upFile['size'] < 100) {
    respond(400, ['success' => false, 'message' => 'Archivo demasiado pequeño o vacio']);
}

// Verifica el token contra el CRM (con caché corto en /tmp para evitar
// pegarle en cada upload si el cliente retentra).
$cacheKey = "/tmp/contaft_tkn_" . hash('sha256', $token);
$usarCache = file_exists($cacheKey) && (time() - filemtime($cacheKey) < $CACHE_TOKEN_TTL);
if ($usarCache) {
    $crmResponse = json_decode(file_get_contents($cacheKey), true);
} else {
    $ch = curl_init("$CRM_VERIFY_URL_BASE/" . urlencode($token));
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_TIMEOUT        => 15,
    ]);
    $crmRaw  = curl_exec($ch);
    $crmHttp = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    if ($crmHttp !== 200) {
        log_line("TOKEN REJECT http=$crmHttp");
        respond(401, ['success' => false, 'message' => "CRM rechazó el token (http=$crmHttp)"]);
    }
    $crmResponse = json_decode($crmRaw, true);
    @file_put_contents($cacheKey, $crmRaw);
}

// Respuesta del CRM: { success: true, data: { tiene_suscripcion, empresa, ... } }
$crmData = (is_array($crmResponse) && isset($crmResponse['data'])) ? $crmResponse['data'] : [];
if (empty($crmData['tiene_suscripcion'])) {
    log_line("TOKEN SIN-SUSCRIPCION");
    respond(401, ['success' => false, 'message' => 'Cliente sin suscripción activa']);
}
$empresaReal = $crmData['empresa'] ?? 'desconocida';

// Identificador estable derivado del token (16 hex chars del SHA-256).
// No depende del nombre de empresa (puede cambiar) ni requiere que el CRM
// devuelva cliente_id. Si el token se reemite, queda un backup huerfano
// que un cron de limpieza puede borrar luego.
$clienteKey = substr(hash('sha256', $token), 0, 16);
$safeNombreApp = preg_replace('/[^a-zA-Z0-9._-]/', '_', $nombreApp);
$destino = "$DATA_DIR/{$clienteKey}_{$safeNombreApp}.db.gz";
if (!move_uploaded_file($upFile['tmp_name'], $destino)) {
    log_line("MOVE ERROR key=$clienteKey destino=$destino");
    respond(500, ['success' => false, 'message' => 'No se pudo guardar el archivo']);
}
chmod($destino, 0644);
$sizeBytes = filesize($destino);

// Meta JSON para el panel admin
$metaPath = "$DATA_DIR/{$clienteKey}_{$safeNombreApp}.meta.json";
$meta = [
    'cliente_key' => $clienteKey,
    'empresa'     => $empresaReal,
    'nombre_app'  => $nombreApp,
    'version'     => $versionApp,
    'size_bytes'  => $sizeBytes,
    'saved_at'    => date('Y-m-d H:i:s'),
    'saved_ts'    => time(),
    'ip'          => $_SERVER['REMOTE_ADDR'] ?? null,
    'crm_data'    => $crmData,
];
file_put_contents($metaPath, json_encode($meta, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));

log_line("UPLOAD empresa=\"$empresaReal\" key=$clienteKey size=" . number_format($sizeBytes) . " ver=$versionApp");

respond(200, [
    'success'     => true,
    'empresa'     => $empresaReal,
    'cliente_key' => $clienteKey,
    'size_bytes'  => $sizeBytes,
    'saved_at'    => $meta['saved_at'],
]);
