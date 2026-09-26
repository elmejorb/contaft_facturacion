<?php
/**
 * Consulta a la DIAN de datos de adquiriente (comprador) por documento.
 *
 * Proxy hacia api-electronica.innovacion-digital.com que a su vez firma
 * la petición SOAP GetAcquirer con el certificado de la empresa.
 *
 * Solo aplica para clientes con Facturación Electrónica activa
 * (necesita `company_id` que sale del login con email_factelect + password_factelect).
 *
 * POST body: { identification_type, identification_number }
 *
 * Códigos identification_type soportados (según DIAN):
 *   11=Registro civil  12=Tarjeta identidad  13=Cédula ciudadanía
 *   21=Tarjeta extranjería  22=Cédula extranjería  31=NIT
 *   41=Pasaporte  42=Doc. extranjero  47=PEP  48=PPT  50=NIT otro país  91=NUIP
 *
 * Respuesta 200: { success:true, name, email, identification_type, identification_number, dian_code }
 * Respuesta 404: { success:false, message: "Documento no encontrado en RUT/RADIAN" }
 * Respuesta 500: { success:false, message: "..." }
 */
require_once '../config/database.php';
header('Content-Type: application/json; charset=utf-8');

const API_DIAN = 'https://api-electronica.innovacion-digital.com/public/api/consulta-adquiriente';
const API_LOGIN = 'https://api-electronica.innovacion-digital.com/public/login';

/**
 * Extrae el nombre útil de la razón social larga que devuelve DIAN.
 *
 * DIAN registra en un solo string legal la razón social + todos los nombres
 * abreviados y alternos autorizados, separados por texto libre en español (no
 * hay separador estructurado). Recortamos en la primera de estas señales:
 *   - " Y PODRÁ UTILIZAR ..."       (introduce nombres alternos)
 *   - " PODRÁ UTILIZAR ..."
 *   - " DENOMINACIÓN ABREVIADA ..." (a veces sin "Y podrá")
 *   - ". LA COOPERATIVA ..."         (frase legal de cooperativas)
 *   - "SIGUIENTES NOMBRES ..."       (lista de alias)
 * Fallback: si nada matchea y el nombre supera 100 caracteres, cortar y "…".
 *
 * Idempotente y case-insensitive (tolera tildes con/sin).
 */
function limpiarRazonSocialDIAN(string $name): string {
    $name = trim(preg_replace('/\s+/u', ' ', $name));
    if ($name === '') return $name;

    // Patrones ordenados de más específico a más genérico.
    $patrones = [
        '/\s+Y\s+PODR[ÁA]\s+UTILIZAR\b.*$/iu',
        '/\s+PODR[ÁA]\s+UTILIZAR\b.*$/iu',
        '/\s+DENOMINACI[ÓO]N\s+ABREVIADA\b.*$/iu',
        '/\.\s+LA\s+COOPERATIVA\b.*$/iu',
        '/\s+SIGUIENTES\s+NOMBRES\b.*$/iu',
    ];
    foreach ($patrones as $p) {
        $recortado = preg_replace($p, '', $name);
        if ($recortado !== null && $recortado !== $name) {
            // Solo quitamos separadores obvios; el punto final se conserva
            // porque puede ser parte de una abreviatura legítima (S.A., LTDA.).
            $name = trim(rtrim($recortado, ",; \t"));
            break;
        }
    }

    // Fallback duro: si aun así queda largo, cortar en el primer punto y
    // limitar a 100 caracteres (evita meter párrafos en tblclientes.Nombre_Cliente).
    if (mb_strlen($name) > 100) {
        $pos = mb_strpos($name, '. ');
        if ($pos !== false && $pos <= 100) {
            $name = mb_substr($name, 0, $pos);
        } else {
            $name = mb_substr($name, 0, 100) . '…';
        }
    }
    return trim($name);
}

function httpJson(string $url, string $method, ?array $body = null, ?string $bearer = null): array {
    $ch = curl_init($url);
    $headers = ['Content-Type: application/json', 'Accept: application/json'];
    if ($bearer) $headers[] = 'Authorization: Bearer ' . $bearer;
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_TIMEOUT        => 20,
        CURLOPT_CUSTOMREQUEST  => $method,
        CURLOPT_HTTPHEADER     => $headers,
        CURLOPT_POSTFIELDS     => $body ? json_encode($body) : null,
        CURLOPT_SSL_VERIFYPEER => false,
    ]);
    $res = curl_exec($ch);
    $code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $err = curl_error($ch);
    curl_close($ch);
    if ($err) return ['_error' => $err, '_code' => 0];
    $decoded = json_decode($res, true);
    return ['_code' => $code, 'data' => $decoded, 'raw' => $res];
}

try {
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        echo json_encode(['success' => false, 'message' => 'Método no permitido']); exit;
    }

    $in = json_decode(file_get_contents('php://input'), true) ?: [];
    $tipo    = trim((string)($in['identification_type'] ?? ''));
    $numero  = trim((string)($in['identification_number'] ?? ''));
    // Override opcional (útil para testing o cuando el cliente ya sabe su company_id)
    $companyIdOverride = intval($in['company_id'] ?? 0);

    if ($tipo === '' || $numero === '') {
        echo json_encode(['success' => false, 'message' => 'Faltan identification_type e identification_number']);
        exit;
    }
    if (!in_array($tipo, ['11','12','13','21','22','31','41','42','47','48','50','91'], true)) {
        echo json_encode(['success' => false, 'message' => "Tipo de documento no soportado: $tipo"]);
        exit;
    }

    // Obtener company_id de la empresa haciendo login con las credenciales FE.
    // Se cachea por 6 horas en tbldatosempresa.fe_company_id para no
    // hacer login en cada consulta — el token de la API no lo necesitamos
    // porque el endpoint consulta-adquiriente es público (sin auth).
    $db = (new Database())->getConnection();

    // Asegurar columna cache (idempotente)
    $stmt = $db->query("SELECT COUNT(*) FROM information_schema.COLUMNS
        WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='tbldatosempresa' AND COLUMN_NAME='fe_company_id'");
    if (!intval($stmt->fetchColumn())) {
        $db->exec("ALTER TABLE tbldatosempresa
            ADD COLUMN fe_company_id INT NULL,
            ADD COLUMN fe_company_id_at DATETIME NULL");
    }

    $stmt = $db->query("SELECT fe_company_id, fe_company_id_at, email_factelect, password_factelect FROM tbldatosempresa LIMIT 1");
    $emp = $stmt->fetch();

    $companyId = intval($emp['fe_company_id'] ?? 0);
    $cacheValido = $companyId > 0
        && !empty($emp['fe_company_id_at'])
        && (time() - strtotime($emp['fe_company_id_at'])) < 6 * 3600;

    // Override desde el body tiene prioridad sobre el cache/login
    if ($companyIdOverride > 0) {
        $companyId = $companyIdOverride;
        $cacheValido = true;
    }

    if (!$cacheValido) {
        // Login para obtener company_id
        if (empty($emp['email_factelect']) || empty($emp['password_factelect'])) {
            echo json_encode(['success' => false, 'message' => 'Configure email y contraseña de FE en Datos de Empresa antes de consultar la DIAN']);
            exit;
        }
        $login = httpJson(API_LOGIN, 'POST', ['email' => $emp['email_factelect'], 'password' => $emp['password_factelect']]);
        if (empty($login['data']['token']) || empty($login['data']['id_empresa'])) {
            echo json_encode(['success' => false, 'message' => 'No se pudo autenticar con la API FE. Verifique las credenciales.', 'detalle' => $login['data'] ?? null]);
            exit;
        }
        $companyId = intval($login['data']['id_empresa']);
        $db->prepare("UPDATE tbldatosempresa SET fe_company_id = ?, fe_company_id_at = NOW()")->execute([$companyId]);
    }

    // Llamar al endpoint público de consulta
    $body = [
        'company_id' => $companyId,
        'identification_type' => $tipo,
        'identification_number' => $numero,
    ];
    $res = httpJson(API_DIAN, 'POST', $body);

    if (!empty($res['_error'])) {
        http_response_code(502);
        echo json_encode(['success' => false, 'message' => 'Error de conexión con la DIAN: ' . $res['_error']]);
        exit;
    }

    // Sanitizar name — DIAN devuelve la razón social + todos los nombres
    // autorizados en un solo string (ej. COLANTA NIT 890904478 devuelve
    // "COOPERATIVA COLANTA Y PODRÁ UTILIZAR LA DENOMINACIÓN ABREVIADA
    // COLANTA. LA COOPERATIVA PODRÁ UTILIZAR ADEMÁS LOS SIGUIENTES
    // NOMBRES: ..."). Nos quedamos solo con el primer nombre útil.
    if (!empty($res['data']) && is_array($res['data']) && !empty($res['data']['name'])) {
        $res['data']['name'] = limpiarRazonSocialDIAN($res['data']['name']);
        $res['raw'] = json_encode($res['data'], JSON_UNESCAPED_UNICODE);
    }

    // Propagar la respuesta (200/404/500) al frontend
    http_response_code($res['_code'] ?: 500);
    echo $res['raw'] ?: json_encode(['success' => false, 'message' => 'Respuesta vacía del proveedor']);

} catch (\Throwable $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => $e->getMessage()]);
}
