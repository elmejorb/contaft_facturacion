<?php
/**
 * Ejecutar scripts de mantenimiento de BD desde la app.
 *
 * GET  ?listar=1                 → lista scripts disponibles + descripción
 * POST { script: "auditar_bd" }  → ejecuta ese script y devuelve reporte
 *
 * Solo scripts en la whitelist (por nombre canónico, sin `.sql`).
 * Usa mysqli::multi_query como aplicar-sql.php ya establecido para
 * manejar PREPARE/EXECUTE/DELIMITER de los stored procedures.
 */

require_once '../config/database.php';
header('Content-Type: application/json; charset=utf-8');

// Whitelist de scripts permitidos. Solo estos pueden ejecutarse.
$SCRIPTS = [
    'auditar_bd' => [
        'archivo'    => 'auditar_bd.sql',
        'titulo'     => 'Auditar BD (solo lectura)',
        'descripcion'=> 'Recorre tabla por tabla y reporta qué falta (columnas, PKs, AUTO_INCREMENT, índices). No modifica nada.',
        'destructivo'=> false,
    ],
    'actualizacion_completa' => [
        'archivo'    => 'actualizacion_completa.sql',
        'titulo'     => 'Aplicar Actualización Completa',
        'descripcion'=> 'Aplica todas las migraciones idempotentes de esquema (tablas, columnas, vistas, defaults). Puede correrse varias veces sin daño.',
        'destructivo'=> false,
    ],
    'reparar_autoincrement' => [
        'archivo'    => 'reparar_autoincrement.sql',
        'titulo'     => 'Reparar PRIMARY KEYs y AUTO_INCREMENT',
        'descripcion'=> 'Agrega PRIMARY KEY y AUTO_INCREMENT a las tablas críticas que no lo tengan (típico de BDs migradas desde VB6). Aborta con reporte si hay duplicados.',
        'destructivo'=> false,
    ],
    'optimizar_indices' => [
        'archivo'    => 'optimizar_indices.sql',
        'titulo'     => 'Crear Índices de Performance',
        'descripcion'=> 'Crea índices en las columnas más consultadas (Fecha, CodigoCli, Items, etc.) para acelerar los listados. Recomendado en BDs grandes (>50k ventas).',
        'destructivo'=> false,
    ],
];

/**
 * Ubica el .sql en las rutas posibles (dev vs producción).
 */
function ubicarSQL(string $archivo): ?string {
    $candidatos = [
        __DIR__ . '/../../sql/' . $archivo,
        __DIR__ . '/../sql/' . $archivo,
    ];
    foreach ($candidatos as $c) {
        if (file_exists($c)) return $c;
    }
    return null;
}

/**
 * Preprocesa DELIMITER en el SQL — mysqli no lo entiende porque es una
 * directiva del cliente CLI, no del server. Convierte los bloques
 * `DELIMITER $$ ... $$` en statements normales terminados en `;`.
 * Esto permite que `multi_query` ejecute stored procedures completos.
 */
function preprocesarDelimiter(string $sql): string {
    $out = [];
    $delim = ';';
    $buffer = '';
    foreach (explode("\n", $sql) as $line) {
        $trim = trim($line);
        // Detectar cambio de delimitador
        if (preg_match('/^DELIMITER\s+(\S+)/i', $trim, $m)) {
            if (trim($buffer) !== '') {
                $out[] = rtrim($buffer, ";\n\r ") . ';';
                $buffer = '';
            }
            $delim = $m[1];
            continue;
        }
        $buffer .= $line . "\n";
        // Si el delimitador es distinto de ; y aparece al final, cerrar statement
        if ($delim !== ';') {
            $bTrim = rtrim($buffer);
            if (substr($bTrim, -strlen($delim)) === $delim) {
                $stmt = substr($bTrim, 0, -strlen($delim));
                $out[] = $stmt . ';';   // reemplaza $$ (o el que sea) por ;
                $buffer = '';
            }
        }
    }
    if (trim($buffer) !== '') $out[] = $buffer;
    return implode("\n", $out);
}

/**
 * Ejecuta un archivo SQL vía mysqli::multi_query recolectando:
 *  - filas de los SELECT (para reportes tipo auditoría)
 *  - errores por statement
 *  - conteo de statements OK
 */
function ejecutarSQL(mysqli $mysqli, string $sqlTexto): array {
    $sqlTexto = preprocesarDelimiter($sqlTexto);
    $statementsOk = 0;
    $errores = [];
    $reportes = [];   // filas de SELECT resultantes

    if ($mysqli->multi_query($sqlTexto)) {
        do {
            $statementsOk++;
            if ($result = $mysqli->store_result()) {
                // Recolectar filas del resultset para devolver al frontend
                $filas = [];
                while ($row = $result->fetch_assoc()) $filas[] = $row;
                if (!empty($filas)) $reportes[] = $filas;
                $result->free();
            }
            if ($mysqli->errno) {
                $errores[] = ['sqlstate' => $mysqli->sqlstate, 'error' => $mysqli->error];
                $mysqli->errno = 0;
            }
        } while ($mysqli->more_results() && $mysqli->next_result());
        if ($mysqli->errno) {
            $errores[] = ['sqlstate' => $mysqli->sqlstate, 'error' => $mysqli->error];
        }
    } else {
        $errores[] = ['sqlstate' => $mysqli->sqlstate, 'error' => $mysqli->error];
    }

    return [
        'statements_ok' => $statementsOk,
        'errores'       => $errores,
        'reportes'      => $reportes,
    ];
}

// --- Ruteo ------------------------------------------------------
try {
    // GET ?listar=1 → catálogo de scripts
    if ($_SERVER['REQUEST_METHOD'] === 'GET' && isset($_GET['listar'])) {
        $lista = [];
        foreach ($SCRIPTS as $key => $meta) {
            $lista[] = [
                'id'          => $key,
                'titulo'      => $meta['titulo'],
                'descripcion' => $meta['descripcion'],
                'archivo'     => $meta['archivo'],
                'existe'      => ubicarSQL($meta['archivo']) !== null,
            ];
        }
        echo json_encode(['success' => true, 'scripts' => $lista], JSON_UNESCAPED_UNICODE);
        exit;
    }

    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        http_response_code(405);
        echo json_encode(['success' => false, 'message' => 'Método no permitido']);
        exit;
    }

    $data = json_decode(file_get_contents('php://input'), true) ?: [];
    $scriptId = $data['script'] ?? '';

    if (!isset($SCRIPTS[$scriptId])) {
        echo json_encode(['success' => false, 'message' => 'Script no autorizado: ' . $scriptId]);
        exit;
    }

    $meta = $SCRIPTS[$scriptId];
    $sqlPath = ubicarSQL($meta['archivo']);
    if (!$sqlPath) {
        echo json_encode([
            'success' => false,
            'message' => "No se encontró el archivo {$meta['archivo']}",
        ]);
        exit;
    }
    $sqlTexto = file_get_contents($sqlPath);
    if (!$sqlTexto) {
        echo json_encode(['success' => false, 'message' => 'Archivo vacío']);
        exit;
    }

    // Conexión mysqli (usa reflection sobre Database para reutilizar credenciales)
    $dbConf = new ReflectionClass('Database');
    $defaults = $dbConf->getDefaultProperties();
    $mysqli = new mysqli($defaults['host'], $defaults['username'], $defaults['password'], $defaults['db_name']);
    if ($mysqli->connect_errno) {
        throw new Exception('Conexión fallida: ' . $mysqli->connect_error);
    }
    $mysqli->set_charset('utf8mb4');

    $inicio = microtime(true);
    $res = ejecutarSQL($mysqli, $sqlTexto);
    $duracion = round(microtime(true) - $inicio, 2);

    $mysqli->close();

    echo json_encode([
        'success'            => true,
        'script'             => $scriptId,
        'titulo'             => $meta['titulo'],
        'archivo'            => $meta['archivo'],
        'duracion_seg'       => $duracion,
        'statements_ok'      => $res['statements_ok'],
        'statements_fallidos'=> count($res['errores']),
        'errores'            => $res['errores'],
        'reportes'           => $res['reportes'],
    ], JSON_UNESCAPED_UNICODE);

} catch (\Throwable $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Error: ' . $e->getMessage(),
    ], JSON_UNESCAPED_UNICODE);
}
