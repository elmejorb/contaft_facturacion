<?php
/**
 * Runner de la suite de pruebas.
 *
 * Uso:
 *   php tests/run.php                         (todas las pruebas)
 *   php tests/run.php test_fe_no_duplica      (una sola, por slug del archivo)
 *
 * Rotación:
 *   1. Switcha el backend al database.php de pruebas (apunta a conta_test).
 *   2. Para cada test case:
 *      a. Resetea conta_test desde fixtures/conta_test_base.sql.
 *      b. Instancia la clase y ejecuta ->run().
 *      c. Reporta pass/fail.
 *   3. Al terminar, restaura database.php original. Pase lo que pase,
 *      esto se corre en un try/finally para no dejar prod apuntando a test.
 */
require_once __DIR__ . '/lib/TestCase.php';
require_once __DIR__ . '/lib/setup_db.php';

// Parsing de argumentos: --driver=sqlite|mysql + opcionalmente un filtro de slug
$filtro = '';
$driver = null;
foreach (array_slice($argv, 1) as $arg) {
    if (preg_match('~^--driver=(\w+)$~', $arg, $m)) {
        $driver = $m[1];
    } elseif (strpos($arg, '--') !== 0) {
        $filtro = $arg;
    }
}
if ($driver) {
    putenv("TEST_DB_DRIVER=$driver");
    $_ENV['TEST_DB_DRIVER'] = $driver;
}
$driverActivo = $_ENV['TEST_DB_DRIVER'] ?? getenv('TEST_DB_DRIVER') ?: 'mysql';

$casesDir = __DIR__ . '/cases';
$archivos = glob("$casesDir/test_*.php");
if ($filtro) {
    $archivos = array_filter($archivos, fn($f) => strpos(basename($f, '.php'), $filtro) !== false);
}

if (!$archivos) {
    echo "No se encontraron tests" . ($filtro ? " que matcheen '$filtro'" : '') . ".\n";
    exit(1);
}

echo str_repeat('=', 72) . "\n";
echo "SUITE DE PRUEBAS — Conta FT backend (" . count($archivos) . " casos) [driver=$driverActivo]\n";
echo str_repeat('=', 72) . "\n\n";

try {
    switchBackendToTestDb();

    $totalPass = $totalFail = 0;
    $fallos = [];
    foreach ($archivos as $archivo) {
        $slug = basename($archivo, '.php');
        echo "▶ $slug ... ";

        try {
            resetTestDatabase();
            require_once $archivo;
            // Convertir snake_case a CamelCase para el nombre de la clase
            $cls = str_replace(' ', '', ucwords(str_replace('_', ' ', $slug)));
            if (!class_exists($cls)) {
                echo "SKIP (clase '$cls' no definida en $archivo)\n";
                continue;
            }
            $t = new $cls();
            $t->setUp();
            $t->run();

            if ($t->failed === 0 && $t->passed > 0) {
                echo "PASS ({$t->passed} aserciones)\n";
                $totalPass += $t->passed;
            } else {
                echo "FAIL\n";
                foreach ($t->results as $r) {
                    if (!$r['ok']) echo "    ✗ " . $r['msg'] . "\n";
                }
                $totalPass += $t->passed;
                $totalFail += $t->failed;
                $fallos[] = $slug;
            }
        } catch (Throwable $e) {
            echo "ERROR: " . $e->getMessage() . "\n";
            echo "    en " . $e->getFile() . ":" . $e->getLine() . "\n";
            $totalFail++;
            $fallos[] = $slug;
        }
    }
} finally {
    restoreBackendDatabase();
}

echo "\n" . str_repeat('-', 72) . "\n";
echo "RESUMEN: $totalPass aserciones OK, $totalFail fallidas\n";
if ($fallos) {
    echo "Fallaron: " . implode(', ', $fallos) . "\n";
    exit(1);
}
echo "Todo bien.\n";
exit(0);
