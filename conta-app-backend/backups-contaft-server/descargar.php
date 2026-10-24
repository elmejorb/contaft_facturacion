<?php
/**
 * Descarga un backup de cliente. Solo admin.
 *
 * GET /backups-contaft/descargar.php?admin_token=XXX&archivo=NOMBRE
 *
 * Devuelve el .db.gz como attachment con el nombre original del cliente.
 */

$ADMIN_TOKEN = trim(@file_get_contents(__DIR__ . '/admin_token.txt'));
if (!$ADMIN_TOKEN || strlen($ADMIN_TOKEN) < 32) {
    http_response_code(500);
    header('Content-Type: application/json');
    echo json_encode(['success' => false, 'message' => 'Admin no configurado en el servidor']);
    exit;
}

$token = $_GET['admin_token'] ?? $_SERVER['HTTP_X_ADMIN_TOKEN'] ?? '';
if (!hash_equals($ADMIN_TOKEN, $token)) {
    http_response_code(401);
    header('Content-Type: application/json');
    echo json_encode(['success' => false, 'message' => 'Admin token requerido']);
    exit;
}

$archivo = $_GET['archivo'] ?? '';
// Defensa path traversal: solo nombre básico, sin / \ ..
if (!preg_match('/^[a-f0-9]{16}_[A-Za-z0-9._-]+\.db\.gz$/', $archivo)) {
    http_response_code(400);
    header('Content-Type: application/json');
    echo json_encode(['success' => false, 'message' => 'Nombre de archivo inválido']);
    exit;
}

$ruta = __DIR__ . '/data/' . $archivo;
if (!file_exists($ruta)) {
    http_response_code(404);
    header('Content-Type: application/json');
    echo json_encode(['success' => false, 'message' => 'Archivo no encontrado']);
    exit;
}

// Nombre amigable: usar la empresa del meta si existe
$metaRuta = str_replace('.db.gz', '.meta.json', $ruta);
$downloadName = $archivo;
if (file_exists($metaRuta)) {
    $meta = json_decode(file_get_contents($metaRuta), true);
    if (!empty($meta['empresa'])) {
        $empresa = preg_replace('/[^A-Za-z0-9 _.-]/', '', $meta['empresa']);
        $downloadName = "$empresa " . date('Y-m-d', $meta['saved_ts'] ?? time()) . '.db.gz';
    }
}

header('Content-Type: application/gzip');
header('Content-Length: ' . filesize($ruta));
header('Content-Disposition: attachment; filename="' . $downloadName . '"');
header('Cache-Control: no-store');
readfile($ruta);
