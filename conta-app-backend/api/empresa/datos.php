<?php
require_once '../config/database.php';
$database = new Database();
$db = $database->getConnection();

try {
    if ($_SERVER['REQUEST_METHOD'] === 'GET') {
        $stmt = $db->query("SELECT * FROM tbldatosempresa LIMIT 1");
        $empresa = $stmt->fetch();

        // Logo: si tbldatosempresa.Logo guarda un path relativo (`uploads/logo.png`)
        // y el archivo existe, devolvemos URL pública para que el frontend la
        // muestre. La URL se construye dinámicamente para funcionar tanto en
        // conta-app-backend como en conta-app-api u otras instalaciones.
        $logoUrl = null;
        if ($empresa && !empty($empresa['Logo'])) {
            $backendRoot = realpath(__DIR__ . '/../..');
            $abs = $backendRoot . DIRECTORY_SEPARATOR . str_replace('/', DIRECTORY_SEPARATOR, $empresa['Logo']);
            if (file_exists($abs)) {
                $scheme = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') ? 'https' : 'http';
                $host = $_SERVER['HTTP_HOST'] ?? 'localhost';
                $appName = basename($backendRoot);
                $logoUrl = "$scheme://$host/$appName/" . str_replace('\\', '/', $empresa['Logo']);
            }
        }
        if ($empresa !== false) $empresa['Logo_url'] = $logoUrl;

        echo json_encode(['success' => true, 'empresa' => $empresa], JSON_UNESCAPED_UNICODE);

    } elseif ($_SERVER['REQUEST_METHOD'] === 'POST') {
        $data = json_decode(file_get_contents('php://input'), true);

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
