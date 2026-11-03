<?php
/**
 * Sirve el archivo del logo de la empresa — resuelve el path desde tbldatosempresa.Logo.
 *
 * Problema que resuelve: en modo embedded (PHP builtin con docRoot=api/) el
 * logo vive en `backend/uploads/` que queda FUERA del docRoot, así que el URL
 * directo `http://127.0.0.1:8089/uploads/logo.png` da 404. Este endpoint SÍ está
 * dentro del docRoot (api/empresa/) y puede leer el archivo desde donde esté y
 * servirlo con el content-type correcto.
 *
 * En modo legacy (Apache + XAMPP) también funciona — el endpoint sirve igual.
 */

require_once '../config/database.php';

try {
    $database = new Database();
    $db = $database->getConnection();
    $empresa = $db->query("SELECT Logo FROM tbldatosempresa LIMIT 1")->fetch();

    if (!$empresa || empty($empresa['Logo'])) {
        http_response_code(404);
        exit('Sin logo configurado');
    }

    // backendRoot = <...>/conta-app-backend/ (en legacy) o <...>/backend/ (en embedded)
    $backendRoot = realpath(__DIR__ . '/../..');
    $relLogo = str_replace(['\\', '/'], DIRECTORY_SEPARATOR, $empresa['Logo']);
    $abs = $backendRoot . DIRECTORY_SEPARATOR . $relLogo;

    // Candidatos: tal cual (desde backendRoot) o dentro de api/ si el user lo subió ahí
    $candidatos = [
        $abs,
        $backendRoot . DIRECTORY_SEPARATOR . 'api' . DIRECTORY_SEPARATOR . $relLogo,
    ];
    $archivo = null;
    foreach ($candidatos as $c) {
        if (is_file($c)) { $archivo = $c; break; }
    }
    if (!$archivo) {
        http_response_code(404);
        exit('Archivo de logo no encontrado');
    }

    // Content-type por extensión
    $ext = strtolower(pathinfo($archivo, PATHINFO_EXTENSION));
    $mime = match ($ext) {
        'png'          => 'image/png',
        'jpg', 'jpeg'  => 'image/jpeg',
        'gif'          => 'image/gif',
        'svg'          => 'image/svg+xml',
        'webp'         => 'image/webp',
        default        => 'application/octet-stream',
    };

    // Cache público 1h — el logo cambia poco pero no queremos cache eterno
    header("Access-Control-Allow-Origin: *");
    header("Content-Type: $mime");
    header('Content-Length: ' . filesize($archivo));
    header('Cache-Control: public, max-age=3600');
    header('ETag: "' . md5_file($archivo) . '"');

    readfile($archivo);
    exit;

} catch (Throwable $e) {
    http_response_code(500);
    exit('Error: ' . $e->getMessage());
}
