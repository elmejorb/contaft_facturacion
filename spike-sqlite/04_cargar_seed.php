<?php
/**
 * Spike SQLite — Paso 4: cargar el seed de la suite de tests en la BD SQLite.
 *
 * Reutiliza el seed de MySQL (conta-app-backend/tests/fixtures/_seed_data.sql)
 * aplicando sobre la marcha los pocos reemplazos para hacerlo compatible con SQLite:
 *   - CURDATE()        → DATE('now','localtime')
 *   - NOW()            → DATETIME('now','localtime')
 *   - CONCAT(a, b)     → (a || b)
 *   - IF(c, a, b)      → iif(c, a, b)
 */
require_once __DIR__ . '/db_factory.php';

$SEED = __DIR__ . '/_seed_data_sqlite.sql';
if (!file_exists($SEED)) {
    fwrite(STDERR, "No se encontró el seed SQLite en $SEED\n");
    exit(1);
}

// Reset: borramos filas de las tablas que vamos a sembrar, para que el script sea idempotente.
require_once __DIR__ . '/db_factory.php';
$pdoReset = (new DatabaseFactory())->getConnection();
foreach (['tblarticulos','tblclientes','tbldatosempresa','tblusuarios','tblcajas','tblsesiones_caja','tblcategoria','tbltiposusuario'] as $t) {
    try { $pdoReset->exec("DELETE FROM $t"); } catch (Exception $e) {}
}

$sql = file_get_contents($SEED);

$pdo = (new DatabaseFactory())->getConnection();

// Quitar líneas de comentario `-- ...` antes de dividir por `;`
$lineas = preg_split('~\r?\n~', $sql);
$lineas = array_filter($lineas, fn($l) => !preg_match('~^\s*--~', $l));
$sql = implode("\n", $lineas);

$sentencias = preg_split('~;\s*~', $sql);
$ok = 0; $fail = 0;
$errores = [];

foreach ($sentencias as $stmt) {
    $stmt = trim($stmt);
    if ($stmt === '') continue;
    try {
        $pdo->exec($stmt);
        $ok++;
    } catch (PDOException $e) {
        $errores[] = "- " . substr($stmt, 0, 100) . "...\n  ERROR: " . substr($e->getMessage(), 0, 180);
        $fail++;
    }
}

echo "Seed cargado: $ok statements OK, $fail errores\n";
if ($errores) echo "\n--- Primeros errores ---\n" . implode("\n", array_slice($errores, 0, 10)) . "\n";

// Verificar que las tablas críticas tengan los datos esperados
$checks = [
    'tblarticulos'     => 3,
    'tblclientes'      => 2,
    'tbldatosempresa'  => 1,
    'tblusuarios'      => 1,
    'tblcajas'         => 1,
    'tblsesiones_caja' => 1,
];
echo "\n--- Verificación de filas insertadas ---\n";
foreach ($checks as $t => $esperado) {
    $n = (int)$pdo->query("SELECT COUNT(*) FROM $t")->fetchColumn();
    $marker = $n >= $esperado ? '✓' : '✗';
    echo "  $marker $t: $n filas (esperado ≥ $esperado)\n";
}
