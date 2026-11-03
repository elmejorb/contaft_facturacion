<?php
require_once '../config/database.php';
$database = new Database();
$db = $database->getConnection();

try {
    if ($_SERVER['REQUEST_METHOD'] === 'GET') {
        $stmt = $db->query("SELECT * FROM tbldatosempresa LIMIT 1");
        $empresa = $stmt->fetch();

        // Logo: antes construíamos URL directa al archivo estático
        // (`$host/<appName>/uploads/logo.png`). Eso funcionaba en modo legacy
        // (Apache sirve toda la carpeta conta-app-backend/) pero FALLABA en
        // embedded (PHP builtin tiene docRoot = api/, y uploads/ queda fuera).
        //
        // Fix: delegar a `empresa/logo.php` que vive DENTRO de api/ y por tanto
        // es accesible en ambos modos. Ese endpoint lee el archivo desde donde
        // esté y lo sirve con content-type correcto.
        $logoUrl = null;
        if ($empresa && !empty($empresa['Logo'])) {
            $backendRoot = realpath(__DIR__ . '/../..');
            $abs = $backendRoot . DIRECTORY_SEPARATOR . str_replace('/', DIRECTORY_SEPARATOR, $empresa['Logo']);
            $absApi = $backendRoot . DIRECTORY_SEPARATOR . 'api' . DIRECTORY_SEPARATOR . str_replace('/', DIRECTORY_SEPARATOR, $empresa['Logo']);
            if (file_exists($abs) || file_exists($absApi)) {
                $scheme = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') ? 'https' : 'http';
                $host = $_SERVER['HTTP_HOST'] ?? 'localhost';
                $esEmbedded = strpos($host, ':8089') !== false;
                // Cache-buster: cambia cuando cambia el archivo del logo
                $cb = max(@filemtime($abs) ?: 0, @filemtime($absApi) ?: 0);
                if ($esEmbedded) {
                    // docRoot = api/, URL directa al endpoint
                    $logoUrl = "$scheme://$host/empresa/logo.php?v=$cb";
                } else {
                    // Apache sirve /conta-app-backend/, el endpoint vive en /api/empresa/
                    $appName = basename($backendRoot);
                    $logoUrl = "$scheme://$host/$appName/api/empresa/logo.php?v=$cb";
                }
            }
        }
        if ($empresa !== false) $empresa['Logo_url'] = $logoUrl;

        echo json_encode(['success' => true, 'empresa' => $empresa], JSON_UNESCAPED_UNICODE);

    } elseif ($_SERVER['REQUEST_METHOD'] === 'POST') {
        $data = json_decode(file_get_contents('php://input'), true);

        // Normalizar NIT: guardamos solo digitos base (sin puntos, sin guion,
        // sin DV). El DV se recalcula en cada impresion / envio a DIAN.
        $nitRaw = $data['Nit'] ?? '';
        if (strpos($nitRaw, '-') !== false) $nitRaw = explode('-', $nitRaw)[0];
        $data['Nit'] = preg_replace('/[^0-9]/', '', $nitRaw);

        $stmt = $db->prepare("
            UPDATE tbldatosempresa SET
                Empresa = ?, Propietario = ?, Nit = ?, Direccion = ?, Telefono = ?,
                Detalle = ?, Regimen = ?, AgentesRet = ?, IvaIncluido = ?,
                Resolucion = ?, FechaR = ?, Rango = ?, Rango2 = ?, IniciarFacturaEn = ?,
                Prefijo = ?,
                Porcentajes = ?, email = ?, api_token = ?,
                email_factelect = ?, password_factelect = ?
            WHERE Id_Empresa = 1
        ");
        $stmt->execute([
            $data['Empresa'] ?? '', $data['Propietario'] ?? '', $data['Nit'] ?? '',
            $data['Direccion'] ?? '', $data['Telefono'] ?? '',
            $data['Detalle'] ?? '', $data['Regimen'] ?? 'Común',
            $data['AgentesRet'] ?? 'No', intval($data['IvaIncluido'] ?? 1),
            $data['Resolucion'] ?? '0', $data['FechaR'] ?? null,
            $data['Rango'] ?? '1', $data['Rango2'] ?? '20000',
            intval($data['IniciarFacturaEn'] ?? 1),
            $data['Prefijo'] ?? null,
            $data['Porcentajes'] ?? 'No', $data['email'] ?? '',
            $data['api_token'] ?? '', $data['email_factelect'] ?? '',
            $data['password_factelect'] ?? ''
        ]);

        echo json_encode(['success' => true, 'message' => 'Datos actualizados correctamente']);
    }
} catch (Exception $e) {
    echo json_encode(['success' => false, 'message' => $e->getMessage()]);
}
?>
