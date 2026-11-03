<?php
/**
 * Endpoint único del logo:
 *   GET    → devuelve el binario del logo con content-type correcto.
 *   POST   → sube un nuevo logo (JSON {logo_base64:"data:image/png;base64,..."}).
 *            Actualiza tbldatosempresa.Logo con la ruta relativa que queda.
 *   DELETE → borra el archivo y limpia tbldatosempresa.Logo.
 *
 * El archivo del logo vive en `backend/uploads/` (fuera del docRoot cuando el
 * PHP builtin sirve con docRoot=api/), por eso el GET lee y sirve en vez de
 * dejarlo como estático: así funciona en embedded Y en legacy (Apache/XAMPP).
 */

require_once '../config/database.php';

try {
    $database = new Database();
    $db = $database->getConnection();
    $method = $_SERVER['REQUEST_METHOD'];

    // backendRoot = <...>/conta-app-backend/ (legacy) o <...>/backend/ (embedded)
    $backendRoot = realpath(__DIR__ . '/../..');
    $uploadsDir  = $backendRoot . DIRECTORY_SEPARATOR . 'uploads';

    if ($method === 'GET') {
        $empresa = $db->query("SELECT Logo FROM tbldatosempresa LIMIT 1")->fetch();
        if (!$empresa || empty($empresa['Logo'])) {
            http_response_code(404);
            exit('Sin logo configurado');
        }
        $relLogo = str_replace(['\\', '/'], DIRECTORY_SEPARATOR, $empresa['Logo']);
        $candidatos = [
            $backendRoot . DIRECTORY_SEPARATOR . $relLogo,
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
        $ext = strtolower(pathinfo($archivo, PATHINFO_EXTENSION));
        $mime = match ($ext) {
            'png'          => 'image/png',
            'jpg', 'jpeg'  => 'image/jpeg',
            'gif'          => 'image/gif',
            'svg'          => 'image/svg+xml',
            'webp'         => 'image/webp',
            default        => 'application/octet-stream',
        };
        header("Access-Control-Allow-Origin: *");
        header("Content-Type: $mime");
        header('Content-Length: ' . filesize($archivo));
        header('Cache-Control: public, max-age=3600');
        header('ETag: "' . md5_file($archivo) . '"');
        readfile($archivo);
        exit;
    }

    // Para POST/DELETE devolvemos JSON.
    header('Content-Type: application/json; charset=utf-8');
    header("Access-Control-Allow-Origin: *");
    header("Access-Control-Allow-Methods: GET, POST, DELETE, OPTIONS");
    header("Access-Control-Allow-Headers: Content-Type");

    if ($method === 'OPTIONS') {
        http_response_code(204);
        exit;
    }

    if ($method === 'POST') {
        $raw = file_get_contents('php://input');
        $data = json_decode($raw, true);
        if (!is_array($data) || empty($data['logo_base64'])) {
            echo json_encode(['success' => false, 'message' => 'Falta logo_base64']);
            exit;
        }
        $b64 = $data['logo_base64'];
        // data:image/png;base64,....
        $ext = 'png';
        if (preg_match('#^data:image/([a-zA-Z0-9+.-]+);base64,(.+)$#', $b64, $m)) {
            $ext = strtolower($m[1]);
            $b64 = $m[2];
            if ($ext === 'jpeg') $ext = 'jpg';
            if ($ext === 'svg+xml') $ext = 'svg';
        }
        $permitidos = ['png', 'jpg', 'gif', 'svg', 'webp'];
        if (!in_array($ext, $permitidos, true)) {
            echo json_encode(['success' => false, 'message' => "Formato no soportado: $ext"]);
            exit;
        }
        $bin = base64_decode($b64, true);
        if ($bin === false) {
            echo json_encode(['success' => false, 'message' => 'base64 inválido']);
            exit;
        }
        // Limite blando ~5 MB
        if (strlen($bin) > 5 * 1024 * 1024) {
            echo json_encode(['success' => false, 'message' => 'Archivo >5 MB']);
            exit;
        }
        if (!is_dir($uploadsDir)) {
            @mkdir($uploadsDir, 0775, true);
        }
        if (!is_dir($uploadsDir) || !is_writable($uploadsDir)) {
            echo json_encode(['success' => false, 'message' => 'uploads/ no es escribible: ' . $uploadsDir]);
            exit;
        }
        // Nombre fijo logo.<ext>; borrar otras extensiones previas para no
        // dejar archivos huérfanos de cambios de formato.
        foreach ($permitidos as $e) {
            $vieja = $uploadsDir . DIRECTORY_SEPARATOR . 'logo.' . $e;
            if (is_file($vieja)) @unlink($vieja);
        }
        $nombre = 'logo.' . $ext;
        $destino = $uploadsDir . DIRECTORY_SEPARATOR . $nombre;
        if (@file_put_contents($destino, $bin) === false) {
            echo json_encode(['success' => false, 'message' => 'No se pudo escribir ' . $destino]);
            exit;
        }
        // Guardar ruta relativa en la BD (los endpoints de impresión y GET la leen).
        $rel = 'uploads/' . $nombre;
        $db->prepare("UPDATE tbldatosempresa SET Logo = ? WHERE Id_Empresa = 1")->execute([$rel]);

        // URL pública (misma lógica que datos.php)
        $scheme = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') ? 'https' : 'http';
        $host = $_SERVER['HTTP_HOST'] ?? 'localhost';
        $esEmbedded = strpos($host, ':8089') !== false;
        $cb = time();
        if ($esEmbedded) {
            $url = "$scheme://$host/empresa/logo.php?v=$cb";
        } else {
            $appName = basename($backendRoot);
            $url = "$scheme://$host/$appName/api/empresa/logo.php?v=$cb";
        }
        echo json_encode(['success' => true, 'url' => $url, 'ruta' => $rel]);
        exit;
    }

    if ($method === 'DELETE') {
        $empresa = $db->query("SELECT Logo FROM tbldatosempresa LIMIT 1")->fetch();
        if ($empresa && !empty($empresa['Logo'])) {
            $relLogo = str_replace(['\\', '/'], DIRECTORY_SEPARATOR, $empresa['Logo']);
            $candidatos = [
                $backendRoot . DIRECTORY_SEPARATOR . $relLogo,
                $backendRoot . DIRECTORY_SEPARATOR . 'api' . DIRECTORY_SEPARATOR . $relLogo,
            ];
            foreach ($candidatos as $c) {
                if (is_file($c)) @unlink($c);
            }
        }
        $db->prepare("UPDATE tbldatosempresa SET Logo = NULL WHERE Id_Empresa = 1")->execute();
        echo json_encode(['success' => true]);
        exit;
    }

    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Método no permitido']);

} catch (Throwable $e) {
    if (!headers_sent()) {
        header('Content-Type: application/json; charset=utf-8');
    }
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => $e->getMessage()]);
}
