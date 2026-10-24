<?php
/**
 * Lista todos los backups de clientes. Solo admin.
 *
 * GET /backups-contaft/listar.php?admin_token=XXX
 *
 * Respuesta: { success: true, backups: [{ cliente_key, empresa, size_bytes, saved_at, version, ... }, ...] }
 */

// Token admin — leído desde admin_token.txt al lado de este archivo.
// Ese archivo NO entra al repo (ver .gitignore). Si no existe o esta vacio,
// el endpoint queda inoperable (fail-closed).
$ADMIN_TOKEN = trim(@file_get_contents(__DIR__ . '/admin_token.txt'));
if (!$ADMIN_TOKEN || strlen($ADMIN_TOKEN) < 32) {
    http_response_code(500);
    header('Content-Type: application/json');
    echo json_encode(['success' => false, 'message' => 'Admin no configurado en el servidor']);
    exit;
}

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *'); // Para la UI standalone

$token = $_GET['admin_token'] ?? $_SERVER['HTTP_X_ADMIN_TOKEN'] ?? '';
if (!hash_equals($ADMIN_TOKEN, $token)) {
    http_response_code(401);
    echo json_encode(['success' => false, 'message' => 'Admin token requerido']);
    exit;
}

$dataDir = __DIR__ . '/data';
$backups = [];

foreach (glob("$dataDir/*.meta.json") as $metaFile) {
    $meta = json_decode(file_get_contents($metaFile), true);
    if (!$meta) continue;
    $dbFile = str_replace('.meta.json', '.db.gz', $metaFile);
    $backups[] = [
        'cliente_key' => $meta['cliente_key'] ?? basename($metaFile, '.meta.json'),
        'empresa'     => $meta['empresa'] ?? 'desconocida',
        'nombre_app'  => $meta['nombre_app'] ?? '',
        'version'     => $meta['version'] ?? '',
        'size_bytes'  => file_exists($dbFile) ? filesize($dbFile) : 0,
        'saved_at'    => $meta['saved_at'] ?? '',
        'saved_ts'    => $meta['saved_ts'] ?? 0,
        'ip'          => $meta['ip'] ?? null,
        'crm_data'    => $meta['crm_data'] ?? null,
        'archivo'     => basename($dbFile),
    ];
}

// Más recientes arriba
usort($backups, fn($a, $b) => ($b['saved_ts'] ?? 0) - ($a['saved_ts'] ?? 0));

echo json_encode([
    'success' => true,
    'total'   => count($backups),
    'suma_bytes' => array_sum(array_column($backups, 'size_bytes')),
    'backups' => $backups,
], JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
