<?php
/**
 * Consulta IA — filtrado semántico de listados con lenguaje natural.
 *
 * Recibe una lista de registros (ej. clientes de cartera) y una pregunta en
 * lenguaje natural. Usa Groq (Llama 3.3 70B) para devolver los IDs que
 * matchean la intención del usuario. El frontend filtra la tabla mostrando
 * solo esos IDs.
 *
 * Por qué este enfoque:
 *   - El LLM NO genera SQL (cero riesgo de inyección)
 *   - El LLM NO alucina datos: solo devuelve IDs que le pasamos
 *   - Groq responde en 300-800ms — sensación instantánea
 *   - Barato: ~500-1500 tokens por consulta, gratis con tier de Groq
 *
 * POST body:
 *   {
 *     modulo: 'cartera' | 'inventario' | 'clientes' | ...  (contexto)
 *     pregunta: string,           // pregunta del usuario
 *     datos: [{id, ...campos}]    // registros disponibles (resumen)
 *     campo_id: 'CodigoClien'     // opcional, default 'id'
 *   }
 *
 * Response:
 *   { success: true, ids: [1,2,3], explicacion: '...' }
 *   { success: false, message: '...' }
 */

require_once '../config/database.php';

const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';
const GROQ_MODEL = 'llama-3.3-70b-versatile';

// Resolver API key: primero busca en tbldatosempresa.groq_api_key (por cliente),
// luego cae al secrets.php global del servidor.
function resolverApiKey($db): ?string {
    try {
        $col = $db->query("SELECT COUNT(*) FROM information_schema.COLUMNS
            WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='tbldatosempresa' AND COLUMN_NAME='groq_api_key'")->fetchColumn();
        if (intval($col) > 0) {
            $key = $db->query("SELECT groq_api_key FROM tbldatosempresa LIMIT 1")->fetchColumn();
            if ($key && trim($key) !== '') return trim($key);
        }
    } catch (Throwable $e) { /* silencio */ }
    // Fallback: archivo secrets.php del servidor
    $secretsPath = __DIR__ . '/../config/secrets.php';
    if (file_exists($secretsPath)) {
        $secrets = require $secretsPath;
        if (is_array($secrets) && !empty($secrets['groq_api_key'])) return $secrets['groq_api_key'];
    }
    return null;
}

// Prompts del sistema — uno por módulo para que el LLM entienda el contexto
function promptSistema(string $modulo, array $datos): string {
    $campos = !empty($datos) ? implode(', ', array_keys((array)$datos[0])) : '(ninguno)';
    $ejemplo = !empty($datos) ? json_encode($datos[0], JSON_UNESCAPED_UNICODE) : '{}';

    $contextosPorModulo = [
        'cartera' => 'Estás ayudando a filtrar una lista de clientes con saldo pendiente (cartera). ' .
                     'Los datos incluyen días de mora, monto adeudado, comportamiento de pago, etc. ' .
                     'Ayuda al usuario a encontrar clientes que match su pregunta.',
        'inventario' => 'Estás ayudando a filtrar productos del inventario. ' .
                        'Los datos incluyen stock, precio, código, familia, etc.',
        'clientes' => 'Estás ayudando a filtrar la lista de clientes. ' .
                      'Los datos incluyen ventas totales, cupo, teléfono, ciudad, etc.',
        'ventas' => 'Estás ayudando a filtrar facturas de venta. ' .
                    'Los datos incluyen total, fecha, cliente, tipo (contado/crédito), estado.',
    ];
    $contexto = $contextosPorModulo[$modulo] ?? 'Estás ayudando a filtrar una tabla de datos.';

    return <<<PROMPT
Eres un asistente que ayuda a filtrar tablas de datos. $contexto

Los registros tienen estos campos: $campos

Ejemplo de un registro:
$ejemplo

REGLAS ESTRICTAS:
1. Debes devolver ÚNICAMENTE JSON válido con este formato exacto:
   {"ids": [...], "explicacion": "..."}
2. "ids" es un array con los valores del campo `id` de los registros que matchean.
3. "explicacion" es una frase corta en español que describe cómo interpretaste la pregunta.
4. Si el usuario pide "los N más X", devuelve exactamente N ids ordenados por el criterio.
5. Si el usuario pide algo ambiguo o no relacionado con los datos, devuelve {"ids": [], "explicacion": "No entendí la pregunta"}.
6. NO inventes ids que no estén en los datos.
7. NO agregues texto fuera del JSON. NO uses backticks ni "json" antes del JSON.
8. Máximo 100 ids en la respuesta (si son más, tomar los primeros según el criterio).

Responde solo con el JSON.
PROMPT;
}

// Llamada HTTP a Groq
function llamarGroq(string $apiKey, string $sistema, string $pregunta, array $datos): array {
    // Serializar los datos de forma compacta
    $datosJson = json_encode($datos, JSON_UNESCAPED_UNICODE);

    $mensajeUsuario = "PREGUNTA DEL USUARIO: $pregunta\n\nDATOS DISPONIBLES:\n$datosJson";

    $payload = [
        'model' => GROQ_MODEL,
        'messages' => [
            ['role' => 'system', 'content' => $sistema],
            ['role' => 'user', 'content' => $mensajeUsuario],
        ],
        'temperature' => 0.1,
        'max_tokens' => 2000,
        'response_format' => ['type' => 'json_object'],
    ];

    $ch = curl_init(GROQ_URL);
    curl_setopt_array($ch, [
        CURLOPT_POST => true,
        CURLOPT_HTTPHEADER => [
            'Content-Type: application/json',
            'Authorization: Bearer ' . $apiKey,
        ],
        CURLOPT_POSTFIELDS => json_encode($payload),
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_TIMEOUT => 25,
        CURLOPT_SSL_VERIFYPEER => false,
    ]);
    $t0 = microtime(true);
    $raw = curl_exec($ch);
    $code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $err = curl_error($ch);
    $tiempo = round((microtime(true) - $t0) * 1000);
    curl_close($ch);

    if ($err || $code !== 200) {
        return [
            'ok' => false,
            'error' => $err ?: "HTTP $code",
            'raw' => substr($raw ?: '', 0, 500),
        ];
    }

    $decoded = json_decode($raw, true);
    $contenido = $decoded['choices'][0]['message']['content'] ?? '';
    $parsed = json_decode($contenido, true);
    if (!$parsed || !isset($parsed['ids'])) {
        return [
            'ok' => false,
            'error' => 'Respuesta del LLM no tiene el formato esperado',
            'raw' => $contenido,
        ];
    }

    return [
        'ok' => true,
        'ids' => array_values($parsed['ids']),
        'explicacion' => $parsed['explicacion'] ?? '',
        'tiempo_ms' => $tiempo,
        'tokens' => $decoded['usage']['total_tokens'] ?? null,
    ];
}

// ============================================================
// MAIN
// ============================================================
$database = new Database();
$db = $database->getConnection();

try {
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        echo json_encode(['success' => false, 'message' => 'Método no permitido']);
        exit;
    }

    $body = json_decode(file_get_contents('php://input'), true);
    $modulo = trim($body['modulo'] ?? 'generico');
    $pregunta = trim($body['pregunta'] ?? '');
    $datos = $body['datos'] ?? [];

    if ($pregunta === '') { echo json_encode(['success' => false, 'message' => 'Falta la pregunta']); exit; }
    if (!is_array($datos) || count($datos) === 0) {
        echo json_encode(['success' => false, 'message' => 'No hay datos para consultar']); exit;
    }
    // Límite razonable: no enviar más de 500 registros al LLM por consulta
    if (count($datos) > 500) $datos = array_slice($datos, 0, 500);

    $apiKey = resolverApiKey($db);
    if (!$apiKey) {
        echo json_encode([
            'success' => false,
            'message' => 'API key de Groq no configurada. Contacta al administrador.',
        ]);
        exit;
    }

    $sistema = promptSistema($modulo, $datos);
    $resultado = llamarGroq($apiKey, $sistema, $pregunta, $datos);

    if (!$resultado['ok']) {
        echo json_encode([
            'success' => false,
            'message' => 'Error consultando IA: ' . ($resultado['error'] ?? 'desconocido'),
            'detalle' => $resultado['raw'] ?? null,
        ]);
        exit;
    }

    echo json_encode([
        'success' => true,
        'ids' => $resultado['ids'],
        'explicacion' => $resultado['explicacion'],
        'tiempo_ms' => $resultado['tiempo_ms'],
        'tokens' => $resultado['tokens'],
    ], JSON_UNESCAPED_UNICODE);

} catch (Throwable $e) {
    echo json_encode(['success' => false, 'message' => $e->getMessage()]);
}
