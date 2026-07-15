<?php
/**
 * Aplicador automático de actualizacion_completa.sql
 *
 * Se llama en cada login del cliente. Compara la versión de la app
 * (viene en el request) con `tbldatosempresa.version_sql_aplicada`.
 * Si no coincide, ejecuta el .sql consolidado via `mysqli::multi_query`
 * (PDO no maneja bien los PREPARE/EXECUTE server-side del .sql) y
 * actualiza la versión.
 *
 * El .sql es idempotente por diseño (usa checks en information_schema
 * antes de cada ALTER), así que reejecutar no rompe nada. Aún así
 * evitamos correrlo en cada login guardando la versión aplicada.
 *
 * POST { version: "4.3.64" }
 *   → { success, aplicado, mensaje, statements_ejecutados }
 */

require_once '../config/database.php';
header('Content-Type: application/json; charset=utf-8');

// Reflection para leer host/user/pass/dbname del Database (evita duplicar).
$dbConf = new ReflectionClass('Database');
$defaults = $dbConf->getDefaultProperties();

$host = $defaults['host'];
$user = $defaults['username'];
$pass = $defaults['password'];
$name = $defaults['db_name'];

try {
    $raw = file_get_contents('php://input');
    $data = json_decode($raw, true) ?: [];
    $versionApp = trim($data['version'] ?? '');

    if ($versionApp === '') {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'version requerida']);
        exit;
    }

    // mysqli manejará el multi_query (PREPARE/EXECUTE dentro del .sql
    // son statements server-side que PDO no libera correctamente).
    $mysqli = new mysqli($host, $user, $pass, $name);
    if ($mysqli->connect_errno) {
        throw new Exception("Conexión fallida: " . $mysqli->connect_error);
    }
    $mysqli->set_charset('utf8mb4');

    // 1) Bootstrap: asegurar que existe la columna que trackea la versión.
    $check = $mysqli->query(
        "SELECT COUNT(*) AS n FROM information_schema.COLUMNS
          WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'tbldatosempresa'
            AND COLUMN_NAME = 'version_sql_aplicada'"
    );
    $existe = intval($check->fetch_assoc()['n'] ?? 0);
    $check->free();
    if (!$existe) {
        $mysqli->query("ALTER TABLE tbldatosempresa ADD COLUMN version_sql_aplicada VARCHAR(20) NULL");
    }

    // 2) Versión ya aplicada
    $q = $mysqli->query("SELECT version_sql_aplicada FROM tbldatosempresa LIMIT 1");
    $row = $q->fetch_assoc();
    $q->free();
    $versionGuardada = trim((string) ($row['version_sql_aplicada'] ?? ''));

    if ($versionGuardada === $versionApp) {
        echo json_encode([
            'success' => true,
            'aplicado' => false,
            'mensaje' => "BD ya está en versión $versionApp",
            'version_guardada' => $versionGuardada,
        ]);
        exit;
    }

    // 3) Ubicar el .sql
    $candidatos = [
        __DIR__ . '/../../sql/actualizacion_completa.sql',
        __DIR__ . '/../sql/actualizacion_completa.sql',
    ];
    $sqlPath = null;
    foreach ($candidatos as $c) {
        if (file_exists($c)) { $sqlPath = $c; break; }
    }
    if (!$sqlPath) {
        echo json_encode([
            'success' => false,
            'mensaje' => 'No se encontró actualizacion_completa.sql',
            'buscado_en' => $candidatos,
        ]);
        exit;
    }
    $sqlTexto = file_get_contents($sqlPath);
    if (!$sqlTexto) {
        echo json_encode(['success' => false, 'mensaje' => 'SQL vacío']);
        exit;
    }

    // 4) mysqli::multi_query soporta PREPARE/EXECUTE/DEALLOCATE nativamente
    //    y libera cursores automáticamente si consumimos cada resultset.
    $statementsOk = 0;
    $errores = [];
    if ($mysqli->multi_query($sqlTexto)) {
        do {
            $statementsOk++;
            // Consumir el resultset para liberar el cursor. Los SELECT
            // de verificación (`SELECT '✓ ...' AS resultado`) devuelven
            // filas; hay que leerlas y liberarlas para que la siguiente
            // llamada a more_results() funcione.
            if ($result = $mysqli->store_result()) {
                $result->free();
            }
            // Si un statement individual falló, mysqli->error tiene el
            // mensaje pero more_results() sigue procesando los otros.
            if ($mysqli->errno) {
                $errores[] = ['sqlstate' => $mysqli->sqlstate, 'error' => $mysqli->error];
                $mysqli->errno = 0;   // limpiar para seguir
            }
        } while ($mysqli->more_results() && $mysqli->next_result());
        // Último error si quedó pendiente
        if ($mysqli->errno) {
            $errores[] = ['sqlstate' => $mysqli->sqlstate, 'error' => $mysqli->error];
        }
    } else {
        $errores[] = ['sqlstate' => $mysqli->sqlstate, 'error' => $mysqli->error];
    }

    // 5) Marcar versión aplicada. Como el SQL es idempotente, aunque haya
    //    errores parciales marcamos la versión — así no reintentamos en
    //    cada login. El desarrollador ve los errores en Network para
    //    investigar.
    $stmt = $mysqli->prepare("UPDATE tbldatosempresa SET version_sql_aplicada = ?");
    $stmt->bind_param('s', $versionApp);
    $stmt->execute();
    $stmt->close();

    $mysqli->close();

    echo json_encode([
        'success' => true,
        'aplicado' => true,
        'mensaje' => "BD actualizada a $versionApp",
        'version_anterior' => $versionGuardada,
        'statements_ok' => $statementsOk,
        'statements_fallidos' => count($errores),
        'errores' => $errores,
    ], JSON_UNESCAPED_UNICODE);

} catch (\Throwable $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'mensaje' => 'Error aplicando SQL: ' . $e->getMessage(),
        'linea' => $e->getLine(),
    ], JSON_UNESCAPED_UNICODE);
}
