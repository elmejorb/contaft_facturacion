<?php
/**
 * GET /api/facturas-recibidas/xml.php?id=X
 *
 * Descarga el XML original firmado (o el ZIP subido por el usuario).
 * Se sirve como attachment con el nombre original que tenía cuando llegó.
 * Útil para adjuntar en soporte o reprocesar si el parseo quedó mal.
 */
require_once __DIR__ . '/../config/database.php';

try {
    $id = intval($_GET['id'] ?? 0);
    if ($id <= 0) {
        http_response_code(422);
        header('Content-Type: application/json');
        echo json_encode(['success' => false, 'message' => 'ID requerido']);
        exit;
    }

    $db = (new Database())->getConnection();
    $stmt = $db->prepare("SELECT xml_path, archivo_original_nombre FROM facturas_recibidas WHERE id = ?");
    $stmt->execute([$id]);
    $row = $stmt->fetch();
    if (!$row || empty($row['xml_path'])) {
        http_response_code(404);
        header('Content-Type: application/json');
        echo json_encode(['success' => false, 'message' => 'Factura o archivo no encontrado']);
        exit;
    }

    $backendRoot = realpath(__DIR__ . '/../..');
    $abs = $backendRoot . DIRECTORY_SEPARATOR . str_replace('/', DIRECTORY_SEPARATOR, $row['xml_path']);
    if (!file_exists($abs)) {
        http_response_code(404);
        header('Content-Type: application/json');
        echo json_encode(['success' => false, 'message' => 'Archivo físico no existe en el servidor']);
        exit;
    }

    $filename = $row['archivo_original_nombre'] ?: basename($abs);
    $ext = strtolower(pathinfo($filename, PATHINFO_EXTENSION));
    $mime = ($ext === 'zip') ? 'application/zip' : 'application/xml';

    header("Content-Type: $mime");
    header('Content-Length: ' . filesize($abs));
    header('Content-Disposition: attachment; filename="' . rawurlencode($filename) . '"');
    header('Cache-Control: no-store');
    readfile($abs);
    exit;

} catch (\Throwable $e) {
    http_response_code(500);
    header('Content-Type: application/json');
    echo json_encode(['success' => false, 'message' => $e->getMessage()]);
}
