<?php
/**
 * Sirve el contenido de CHANGELOG.md para mostrarlo dentro del software.
 * Solo lectura. El archivo viaja con el bundle del backend.
 */
header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json; charset=UTF-8");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

try {
    $path = __DIR__ . '/../../CHANGELOG.md';
    if (!file_exists($path)) {
        echo json_encode(['success' => false, 'message' => 'CHANGELOG.md no encontrado en el backend']);
        exit;
    }
    $content = file_get_contents($path);
    if ($content === false) {
        echo json_encode(['success' => false, 'message' => 'No se pudo leer CHANGELOG.md']);
        exit;
    }
    echo json_encode([
        'success'  => true,
        'markdown' => $content,
        'updated'  => date('Y-m-d H:i:s', filemtime($path)),
    ], JSON_UNESCAPED_UNICODE);
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => $e->getMessage()]);
}
