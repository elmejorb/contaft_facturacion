<?php
/**
 * Logo de la empresa (almacenamiento en disco + ruta en tbldatosempresa.Logo)
 *
 *  POST   { "logo_base64": "data:image/png;base64,..." }  → guarda en uploads/ y persiste path
 *  DELETE                                                  → borra archivo y limpia BD
 *  GET                                                     → devuelve { path, url, exists }
 *
 * El archivo se guarda en  conta-app-backend/uploads/logo.{ext}  y se sirve
 * como URL relativa  uploads/logo.{ext}  para que Apache lo sirva directo. El
 * PHP del PDF (TCPDF) resuelve la ruta absoluta del filesystem con __DIR__.
 */
require_once '../config/database.php';
header('Content-Type: application/json; charset=utf-8');

try {
    $db = (new Database())->getConnection();

    // Asegurar columna Logo (idempotente — SHOW COLUMNS para evitar warnings de
    // ALTER cuando ya existe). Conta FT corre sobre MariaDB 10.4+.
    $colExists = false;
    try {
        $stmt = $db->query("SHOW COLUMNS FROM tbldatosempresa LIKE 'Logo'");
        $colExists = (bool)$stmt->fetch();
    } catch (Exception $e) {}
    if (!$colExists) {
        try { $db->exec("ALTER TABLE tbldatosempresa ADD COLUMN Logo VARCHAR(255) DEFAULT NULL"); } catch (Exception $e) {}
    }

    // __DIR__ = api/empresa  → subir 2 niveles para llegar a conta-app-backend
    $backendRoot = realpath(__DIR__ . '/../..');
    $uploadDir   = $backendRoot . DIRECTORY_SEPARATOR . 'uploads';
    if (!is_dir($uploadDir)) @mkdir($uploadDir, 0777, true);

    // Helper: resuelve URL pública desde la ruta relativa guardada en BD.
    // Detecta el host y el nombre de la app desde el request, para que la
    // misma versión funcione en cualquier despliegue (conta-app-backend,
    // conta-app-api u otro) sin recompilar.
    $publicUrl = function($rel) {
        if (!$rel) return null;
        $scheme = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') ? 'https' : 'http';
        $host = $_SERVER['HTTP_HOST'] ?? 'localhost';
        // __DIR__ = .../api/empresa → subir 2 niveles a la raíz de la app,
        // basename() da su nombre de carpeta (conta-app-backend / conta-app-api).
        $appName = basename(dirname(__DIR__, 2));
        return "$scheme://$host/$appName/" . str_replace('\\', '/', $rel);
    };

    $method = $_SERVER['REQUEST_METHOD'];

    if ($method === 'POST') {
        $data = json_decode(file_get_contents('php://input'), true) ?: [];
        $b64  = trim((string)($data['logo_base64'] ?? ''));
        if ($b64 === '') {
            echo json_encode(['success' => false, 'message' => 'logo_base64 requerido']);
            exit;
        }
        // Acepta formatos: data:image/png;base64,XXX  o  XXX directo
        $ext = 'png';
        $payload = $b64;
        if (preg_match('/^data:image\/([a-zA-Z0-9.+-]+);base64,(.+)$/', $b64, $m)) {
            $ext = strtolower($m[1]) === 'jpeg' ? 'jpg' : strtolower($m[1]);
            // Solo dejamos extensiones que TCPDF maneja bien.
            if (!in_array($ext, ['png','jpg','gif'])) $ext = 'png';
            $payload = $m[2];
        }
        $bin = base64_decode($payload, true);
        if ($bin === false || strlen($bin) < 50) {
            echo json_encode(['success' => false, 'message' => 'Base64 inválido o imagen demasiado pequeña']);
            exit;
        }

        // Borrar logos previos con otra extensión (no acumular basura)
        foreach (['png','jpg','gif'] as $e) {
            $f = $uploadDir . DIRECTORY_SEPARATOR . "logo.$e";
            if (file_exists($f) && $e !== $ext) @unlink($f);
        }

        $abs = $uploadDir . DIRECTORY_SEPARATOR . "logo.$ext";
        $rel = "uploads/logo.$ext";
        if (file_put_contents($abs, $bin) === false) {
            echo json_encode(['success' => false, 'message' => 'No se pudo escribir el archivo del logo']);
            exit;
        }

        $db->prepare("UPDATE tbldatosempresa SET Logo = ?")->execute([$rel]);

        echo json_encode([
            'success' => true,
            'path'    => $rel,
            'url'     => $publicUrl($rel),
            'message' => 'Logo guardado',
        ]);
        exit;
    }

    if ($method === 'DELETE') {
        // Borra cualquier extensión del logo
        foreach (['png','jpg','gif'] as $e) {
            $f = $uploadDir . DIRECTORY_SEPARATOR . "logo.$e";
            if (file_exists($f)) @unlink($f);
        }
        $db->exec("UPDATE tbldatosempresa SET Logo = NULL");
        echo json_encode(['success' => true, 'message' => 'Logo eliminado']);
        exit;
    }

    // GET
    $row = $db->query("SELECT Logo FROM tbldatosempresa LIMIT 1")->fetch();
    $rel = $row['Logo'] ?? null;
    $abs = $rel ? ($backendRoot . DIRECTORY_SEPARATOR . str_replace('/', DIRECTORY_SEPARATOR, $rel)) : null;
    $exists = $abs && file_exists($abs);
    echo json_encode([
        'success' => true,
        'path'    => $rel,
        'url'     => $exists ? $publicUrl($rel) : null,
        'exists'  => $exists,
    ]);

} catch (Exception $e) {
    echo json_encode(['success' => false, 'message' => $e->getMessage()]);
}
