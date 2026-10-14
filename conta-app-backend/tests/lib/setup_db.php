<?php
/**
 * Resetea la BD de pruebas antes de cada test.
 *
 * Soporta dos drivers:
 *   - mysql  (default) → BD conta_test en MySQL local
 *   - sqlite           → archivo conta_test.db en fixtures/
 *
 * El driver se elige con la variable de entorno TEST_DB_DRIVER o el flag
 * --driver=X del runner.
 */

function conta_test_driver(): string {
    return $_ENV['TEST_DB_DRIVER'] ?? getenv('TEST_DB_DRIVER') ?: 'mysql';
}

function resetTestDatabase() {
    if (conta_test_driver() === 'sqlite') {
        resetTestDatabaseSqlite();
    } else {
        resetTestDatabaseMysql();
    }
}

function resetTestDatabaseMysql() {
    $base = __DIR__ . '/../fixtures/conta_test_base.sql';
    if (!file_exists($base)) {
        throw new RuntimeException("Falta fixture base en $base.");
    }

    $mysqlBin = 'C:/xampp/mysql/bin/mysql.exe';
    if (!file_exists($mysqlBin)) $mysqlBin = 'mysql';

    $cmd = "\"$mysqlBin\" -uroot -proot -e \"DROP DATABASE IF EXISTS conta_test; CREATE DATABASE conta_test CHARACTER SET utf8mb4;\" 2>&1";
    exec($cmd, $out, $rc);
    if ($rc !== 0) throw new RuntimeException("No pude recrear conta_test: " . implode("\n", $out));

    $cmd = "\"$mysqlBin\" -uroot -proot conta_test < \"$base\" 2>&1";
    exec($cmd, $out2, $rc2);
    if ($rc2 !== 0) throw new RuntimeException("No pude cargar fixture: " . implode("\n", $out2));
}

function resetTestDatabaseSqlite() {
    $schema = __DIR__ . '/../fixtures/schema_sqlite.sql';
    $seed   = __DIR__ . '/../fixtures/_seed_data_sqlite.sql';
    $dbPath = __DIR__ . '/../fixtures/conta_test.db';

    if (!file_exists($schema)) throw new RuntimeException("Falta schema SQLite en $schema");
    if (!file_exists($seed))   throw new RuntimeException("Falta seed SQLite en $seed");

    // Si la BD NO existe, la creamos desde cero cargando schema + catálogo DIAN.
    // Si YA existe (ejecuciones subsiguientes de la suite), solo limpiamos tablas
    // transaccionales — NO podemos borrar el archivo porque Apache lo tiene abierto
    // y Windows mantiene el lock. DELETE+seed es más rápido además.
    $esNueva = !file_exists($dbPath);

    $pdo = new PDO("sqlite:$dbPath");
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    $pdo->exec('PRAGMA journal_mode = WAL');
    $pdo->exec('PRAGMA busy_timeout = 5000');
    $pdo->exec('PRAGMA foreign_keys = OFF'); // off durante bulk ops

    if ($esNueva) {
        // Cargar schema completo + catálogo DIAN (una vez)
        foreach (preg_split('~;\s*(?:\n|$)~', file_get_contents($schema)) as $stmt) {
            $stmt = trim($stmt);
            if ($stmt === '' || strpos($stmt, '--') === 0) continue;
            try { $pdo->exec($stmt); } catch (Exception $e) { /* índices FULLTEXT fallan — no bloquea */ }
        }
        $dianCatalog = __DIR__ . '/../fixtures/_dian_catalog.sql';
        if (file_exists($dianCatalog)) {
            $dianSql = file_get_contents($dianCatalog);
            $dianSql = preg_replace('~/\*![0-9]+ .*? \*/;?~m', '', $dianSql);
            $dianSql = preg_replace('~^SET\s+[^;]+;~mi', '', $dianSql);
            $dianSql = preg_replace('~^(LOCK|UNLOCK)\s+TABLES[^;]*;~mi', '', $dianSql);
            $dianSql = preg_replace('~`([^`]+)`~', '"$1"', $dianSql);
            foreach (preg_split('~;\s*(?:\n|$)~', $dianSql) as $stmt) {
                $stmt = trim($stmt);
                if ($stmt === '' || strpos($stmt, '--') === 0) continue;
                try { $pdo->exec($stmt); } catch (Exception $e) { /* ignorar: dialecto o duplicados */ }
            }
        }
    } else {
        // DELETE de TODAS las tablas excepto los catálogos DIAN que no cambian.
        // Lo hacemos leyendo sqlite_master para no hardcodear la lista.
        $tablas = $pdo->query("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'")
                      ->fetchAll(PDO::FETCH_COLUMN);
        $preservar = ['type_documents', 'type_item_identifications', 'type_liabilities',
                      'type_organizations', 'type_regimes', 'unit_measures', 'municipalities',
                      'payment_methods', 'taxes', 'countries', 'departments'];
        foreach ($tablas as $t) {
            if (in_array($t, $preservar)) continue;
            try { $pdo->exec("DELETE FROM \"$t\""); } catch (Exception $e) { /* vista o tabla sin PK */ }
        }
    }

    // Cargar seed SIEMPRE (es el estado inicial que cada test espera)
    $seedSql = file_get_contents($seed);
    $seedSql = implode("\n", array_filter(preg_split('~\r?\n~', $seedSql), fn($l) => !preg_match('~^\s*--~', $l)));
    foreach (preg_split('~;\s*~', $seedSql) as $stmt) {
        $stmt = trim($stmt);
        if ($stmt === '') continue;
        $pdo->exec($stmt);
    }

    $pdo->exec('PRAGMA foreign_keys = ON');
}

/**
 * Switcha el backend productivo a usar la BD de pruebas.
 * En MySQL: copia database_test.php sobre api/config/database.php.
 * En SQLite: escribe api/config/config.json apuntando al archivo .db de fixtures.
 */
function switchBackendToTestDb() {
    if (conta_test_driver() === 'sqlite') {
        $cfgDst = 'C:/WebServer/Apache24/htdocs/conta-app-backend/api/config/config.json';
        // Ruta absoluta sin realpath — el archivo .db puede no existir aún en este punto
        // (resetTestDatabase lo crea después). Usamos la carpeta canónica directa.
        $dbPath = str_replace('\\', '/', realpath(__DIR__ . '/../fixtures')) . '/conta_test.db';
        $cfg = [
            'driver' => 'sqlite',
            'sqlite' => ['path' => $dbPath],
            'mysql'  => ['host' => 'localhost', 'database' => 'conta_demo', 'username' => 'root', 'password' => 'root'],
        ];
        file_put_contents($cfgDst, json_encode($cfg, JSON_PRETTY_PRINT));
        return;
    }

    // MySQL mode: copiar database_test.php encima
    $src = __DIR__ . '/../fixtures/database_test.php';
    $dst = 'C:/WebServer/Apache24/htdocs/conta-app-backend/api/config/database.php';
    $backup = $dst . '.backup_during_test';
    if (!file_exists($backup)) copy($dst, $backup);
    copy($src, $dst);
}

function restoreBackendDatabase() {
    // Modo SQLite: borrar config.json que escribimos
    $cfgDst = 'C:/WebServer/Apache24/htdocs/conta-app-backend/api/config/config.json';
    if (file_exists($cfgDst)) @unlink($cfgDst);

    // Modo MySQL: restaurar database.php desde backup
    $dst = 'C:/WebServer/Apache24/htdocs/conta-app-backend/api/config/database.php';
    $backup = $dst . '.backup_during_test';
    if (file_exists($backup)) {
        copy($backup, $dst);
        unlink($backup);
    }
}
