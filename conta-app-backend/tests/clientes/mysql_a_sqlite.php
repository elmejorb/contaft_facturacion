<?php
/**
 * Convierte una BD MySQL de cliente a SQLite usando EXACTAMENTE el mismo
 * esquema que recibe un cliente embebido (electron/main.js bootstrap):
 *   schema_sqlite_cliente.sql + dian_catalog_sqlite.sql + migraciones_sqlite.sql
 * y luego copia los datos de cada tabla que exista en ambos motores
 * (columnas comunes). Las tablas solo-MySQL se reportan.
 *
 * Uso: php mysql_a_sqlite.php --mysql=<bd> --sqlite=<ruta.db>
 * Salida: JSON {tablas_copiadas, filas, solo_mysql[], ajustes_not_null, errores[]}
 * Exit != 0 si alguna fila no se pudo copiar (la prueba debe fallar).
 */

$o = getopt('', ['mysql:', 'sqlite:']);
if (empty($o['mysql']) || empty($o['sqlite'])) { fwrite(STDERR, "Uso: --mysql=<bd> --sqlite=<ruta>\n"); exit(2); }

$SQL_DIR = realpath(__DIR__ . '/../../sql');
$ruta = $o['sqlite'];
@unlink($ruta); @unlink("$ruta-wal"); @unlink("$ruta-shm");

$my = new PDO('mysql:host=127.0.0.1;dbname=' . $o['mysql'] . ';charset=utf8mb4', 'root', 'root', [
    PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION, PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
    PDO::MYSQL_ATTR_USE_BUFFERED_QUERY => false,
]);
$sq = new PDO("sqlite:$ruta", null, null, [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION, PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC]);
$sq->exec('PRAGMA foreign_keys = OFF');
$sq->exec('PRAGMA synchronous = OFF');

// --- 1. Mismo cargador que main.js (bootstrap embebido) -------------------------
function cargar(PDO $pdo, string $path) {
    $sql = file_get_contents($path);
    $lineas = preg_split('~\r?\n~', $sql);
    $lineas = array_filter($lineas, fn($l) => !preg_match('~^\s*--~', $l));
    $sql = implode("\n", $lineas);
    $sql = preg_replace('~/\*![0-9]+ .*? \*/;?~m', '', $sql);
    $sql = preg_replace('~^SET\s+[^;]+;~mi', '', $sql);
    $sql = preg_replace('~^(LOCK|UNLOCK)\s+TABLES[^;]*;~mi', '', $sql);
    $sql = preg_replace('~`([^`]+)`~', '"$1"', $sql);
    foreach (explode(';', $sql) as $stmt) {
        $stmt = trim($stmt);
        if ($stmt === '') continue;
        try { $pdo->exec($stmt); } catch (Exception $e) { /* igual que main.js */ }
    }
}
cargar($sq, "$SQL_DIR/schema_sqlite_cliente.sql");
cargar($sq, "$SQL_DIR/dian_catalog_sqlite.sql");
// migraciones_sqlite.sql: igual que aplicarMigracionesSqlite()
$sql = implode("\n", array_filter(preg_split('~\r?\n~', file_get_contents("$SQL_DIR/migraciones_sqlite.sql")), fn($l) => !preg_match('~^\s*--~', $l)));
foreach (explode(';', $sql) as $stmt) {
    $stmt = trim($stmt);
    if ($stmt === '') continue;
    try { $sq->exec($stmt); } catch (Exception $e) { /* duplicate column, etc. */ }
}

// --- 2. Copiar datos ---------------------------------------------------------------
$tablasSqlite = [];
foreach ($sq->query("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'") as $r) {
    // table_xinfo incluye columnas generadas (hidden 2/3); table_info no.
    $info = $sq->query('PRAGMA table_xinfo("' . $r['name'] . '")')->fetchAll();
    $tablasSqlite[strtolower($r['name'])] = ['name' => $r['name'], 'cols' => $info];
}
$tablasMysql = $my->query("SELECT TABLE_NAME FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_TYPE = 'BASE TABLE'")->fetchAll(PDO::FETCH_COLUMN);

$res = ['tablas_copiadas' => 0, 'filas' => 0, 'solo_mysql' => [], 'ajustes_not_null' => 0, 'columnas_omitidas' => [], 'errores' => []];

foreach ($tablasMysql as $tm) {
    $k = strtolower($tm);
    if (!isset($tablasSqlite[$k])) {
        $n = intval($my->query("SELECT COUNT(*) FROM `$tm`")->fetchColumn());
        if ($n > 0) $res['solo_mysql'][] = "$tm ($n filas)";
        continue;
    }
    $ts = $tablasSqlite[$k]['name'];
    $infoMy = $my->query("SELECT COLUMN_NAME, EXTRA FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = " . $my->quote($tm))->fetchAll();
    $colsSq = [];
    foreach ($tablasSqlite[$k]['cols'] as $c) $colsSq[strtolower($c['name'])] = $c;
    $comunes = [];
    $omitidas = [];
    foreach ($infoMy as $ci) {
        $c = $ci['COLUMN_NAME'];
        if (!isset($colsSq[strtolower($c)])) { $omitidas[] = $c; continue; }
        // Columnas generadas (MySQL GENERATED / SQLite hidden 2-3): existen en
        // ambos lados pero no se copian — se calculan solas.
        if (stripos((string)$ci['EXTRA'], 'GENERATED') !== false || intval($colsSq[strtolower($c)]['hidden'] ?? 0) >= 2) continue;
        $comunes[] = $c;
    }
    if ($omitidas) $res['columnas_omitidas'][$tm] = array_values($omitidas);
    if (!$comunes) continue;

    $sq->exec("DELETE FROM \"$ts\""); // reemplaza lo sembrado por el catálogo/seed
    $ph = implode(',', array_fill(0, count($comunes), '?'));
    $ins = $sq->prepare("INSERT INTO \"$ts\" (\"" . implode('","', array_map(fn($c) => $colsSq[strtolower($c)]['name'], $comunes)) . "\") VALUES ($ph)");
    $sel = $my->query('SELECT `' . implode('`,`', $comunes) . "` FROM `$tm`");
    $sq->beginTransaction();
    $n = 0;
    while ($row = $sel->fetch()) {
        $vals = [];
        foreach ($comunes as $c) {
            $v = $row[$c];
            $def = $colsSq[strtolower($c)];
            if ($v === null && intval($def['notnull']) === 1 && $def['dflt_value'] === null && intval($def['pk']) === 0) {
                // MySQL aceptó NULL (sql_mode laxo) pero SQLite exige valor: mismo
                // relleno que haría MySQL no estricto ('' para texto, 0 para número).
                $v = preg_match('~int|real|double|float|dec|num~i', (string)$def['type']) ? 0 : '';
                $res['ajustes_not_null']++;
            }
            $vals[] = $v;
        }
        try { $ins->execute($vals); $n++; }
        catch (Exception $e) {
            if (count($res['errores']) < 20) $res['errores'][] = "$tm: " . $e->getMessage();
            $res['filas_fallidas'] = ($res['filas_fallidas'] ?? 0) + 1;
        }
    }
    $sel->closeCursor();
    $sq->commit();
    $res['tablas_copiadas']++;
    $res['filas'] += $n;
}
$sq->exec('PRAGMA foreign_keys = ON');
// Igual que la app al arrancar: DEFAULT CURRENT_TIMESTAMP → hora de Colombia.
require_once __DIR__ . '/../../api/config/sqlite_hora_local.php';
$res['triggers_hora_local'] = conta_sqlite_triggers_hora_local($sq);
echo json_encode($res, JSON_UNESCAPED_UNICODE) . "\n";
exit(empty($res['filas_fallidas']) ? 0 : 1);
