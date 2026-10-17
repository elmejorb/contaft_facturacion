<?php
/**
 * Factory de conexión a BD — introducido en 4.8.0 (ver PLAN-EXPANSION-MERCADO.md).
 *
 * Permite que el mismo backend corra contra MySQL o SQLite según un archivo
 * de configuración opcional. Es RETROCOMPATIBLE:
 *
 *   - Si NO existe config.json → se comporta como el database.php tradicional
 *     (MySQL con los defaults del cliente). Clientes existentes no notan nada.
 *   - Si existe config.json → lee driver + credenciales de ahí.
 *
 * UBICACIÓN del config.json en producción:
 *   Electron app: userData/config.json (resuelto por el main process al arrancar
 *                 y pasado al PHP vía env var CONTA_CONFIG_PATH).
 *   Apache tradicional (clientes legacy): junto a este archivo (api/config/config.json)
 *                 — opcional, solo si el admin lo coloca manualmente.
 *
 * Formato esperado:
 *   {
 *     "driver": "sqlite",
 *     "sqlite": { "path": "<ruta absoluta al archivo .db>" },
 *     "mysql":  { "host": "localhost", "database": "conta_demo",
 *                 "username": "root",  "password": "root" }
 *   }
 *
 * NUNCA se incluye en el build (ver "!api/config/config.json" en extraResources).
 */

/**
 * Resuelve la ruta del config.json en orden de prioridad:
 *   1. $_ENV['CONTA_CONFIG_PATH'] o getenv (lo pasa Electron main process)
 *   2. api/config/config.json junto a este archivo
 *   3. null → significa "modo legacy, usar MySQL hardcoded"
 */
function conta_config_path(): ?string {
    $envPath = $_ENV['CONTA_CONFIG_PATH'] ?? getenv('CONTA_CONFIG_PATH');
    if ($envPath && file_exists($envPath)) return $envPath;
    $local = __DIR__ . '/config.json';
    if (file_exists($local)) return $local;
    return null;
}

/**
 * Devuelve el array de config leído del JSON, o null si no hay config
 * (modo legacy — llamador debe usar los defaults MySQL hardcodeados).
 */
function conta_config_cargar(): ?array {
    $p = conta_config_path();
    if (!$p) return null;
    $raw = file_get_contents($p);
    $cfg = json_decode($raw, true);
    if (!$cfg || empty($cfg['driver'])) {
        error_log("[db_factory] config.json inválido en $p — fallback a modo legacy");
        return null;
    }
    return $cfg;
}

/**
 * Abre y devuelve una PDO configurada según $cfg.
 * $cfg debe venir de conta_config_cargar().
 */
function conta_abrir_pdo(array $cfg): PDO {
    $driver = $cfg['driver'];
    if ($driver === 'sqlite') {
        $path = $cfg['sqlite']['path'] ?? null;
        if (!$path) throw new RuntimeException("config.json: falta sqlite.path");
        // Crear directorio si no existe (primera corrida del cliente nuevo)
        $dir = dirname($path);
        if (!is_dir($dir)) @mkdir($dir, 0777, true);

        $pdo = new ContaSqlitePDO("sqlite:$path");
        $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
        $pdo->setAttribute(PDO::ATTR_DEFAULT_FETCH_MODE, PDO::FETCH_ASSOC);
        // Foreign keys: SQLite las ignora por default — hay que activarlas por conexión.
        $pdo->exec('PRAGMA foreign_keys = ON');
        // WAL: lecturas concurrentes con la escritura (más resiliente para la app en vivo).
        $pdo->exec('PRAGMA journal_mode = WAL');
        // synchronous=NORMAL + WAL: durabilidad buena sin fsync() por commit (más rápido).
        $pdo->exec('PRAGMA synchronous = NORMAL');
        // busy_timeout: esperar hasta 5s si otro proceso está escribiendo antes de dar error.
        $pdo->exec('PRAGMA busy_timeout = 5000');
        // Emular funciones MySQL comunes en SQLite (MONTH, YEAR, DAY, etc).
        // La MAYORÍA del backend se escribió para MySQL — esto evita rewrite
        // de cientos de queries y errores en runtime.
        conta_sqlite_registrar_funciones_mysql($pdo);
        return $pdo;
    }

    if ($driver === 'mysql') {
        $c = $cfg['mysql'];
        $pdo = new PDO(
            "mysql:host={$c['host']};dbname={$c['database']};charset=utf8mb4",
            $c['username'] ?? 'root',
            $c['password'] ?? ''
        );
        $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
        $pdo->setAttribute(PDO::ATTR_DEFAULT_FETCH_MODE, PDO::FETCH_ASSOC);
        return $pdo;
    }

    throw new RuntimeException("db_factory: driver desconocido '$driver'");
}

/**
 * Devuelve el driver que estamos usando ('sqlite', 'mysql', o 'legacy').
 * Útil para endpoints que necesiten usar funciones distintas según el driver
 * (ej. DATE_FORMAT vs strftime en los informes).
 */
function conta_driver_actual(): string {
    $cfg = conta_config_cargar();
    return $cfg['driver'] ?? 'legacy';
}

/**
 * Devuelve los nombres de las columnas de una tabla, funciona en MySQL y SQLite.
 * Reemplaza al patrón MySQL-only:
 *   "SELECT COLUMN_NAME FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='X'"
 */
function conta_columnas_tabla(PDO $db, string $tabla): array {
    $driver = $db->getAttribute(PDO::ATTR_DRIVER_NAME);
    if ($driver === 'sqlite') {
        $rows = $db->query("PRAGMA table_info(\"$tabla\")")->fetchAll(PDO::FETCH_ASSOC);
        return array_column($rows, 'name');
    }
    // MySQL (default): usa information_schema
    $stmt = $db->prepare("SELECT COLUMN_NAME FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME=?");
    $stmt->execute([$tabla]);
    return $stmt->fetchAll(PDO::FETCH_COLUMN);
}

/**
 * Chequea si una columna existe. Portable MySQL+SQLite.
 * Reemplaza al patrón:
 *   "SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='X' AND COLUMN_NAME='Y'"
 */
function conta_tiene_columna(PDO $db, string $tabla, string $columna): bool {
    return in_array($columna, conta_columnas_tabla($db, $tabla), true);
}

/**
 * Lista todas las tablas del schema actual. Portable MySQL+SQLite.
 */
function conta_tablas_schema(PDO $db): array {
    $driver = $db->getAttribute(PDO::ATTR_DRIVER_NAME);
    if ($driver === 'sqlite') {
        return $db->query("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'")->fetchAll(PDO::FETCH_COLUMN);
    }
    return $db->query("SELECT TABLE_NAME FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE()")->fetchAll(PDO::FETCH_COLUMN);
}

/**
 * PDO extendida para SQLite que reescribe sintaxis MySQL-only ANTES de
 * ejecutar. Cubre lo que `sqliteCreateFunction` no puede: `INTERVAL N UNIT`
 * (que no es una función, es una expresión sintáctica).
 *
 * Transformaciones:
 *   - DATE_SUB(X, INTERVAL N DAY)   → date(X, '-N days')
 *   - DATE_ADD(X, INTERVAL N DAY)   → date(X, '+N days')
 *   - DATE_SUB(X, INTERVAL N MONTH) → date(X, '-N months')
 *   - DATE_ADD(X, INTERVAL N MONTH) → date(X, '+N months')
 *   - DATE_SUB(X, INTERVAL N YEAR)  → date(X, '-N years')
 *   - DATE_ADD(X, INTERVAL N YEAR)  → date(X, '+N years')
 *
 * Las funciones MONTH/YEAR/DAY/NOW/CURDATE/DATE_FORMAT son emuladas vía
 * sqliteCreateFunction (ver conta_sqlite_registrar_funciones_mysql).
 */
class ContaSqlitePDO extends PDO {
    private static function rewrite(string $sql): string {
        // INTERVAL con unidades: cubre las unidades reales usadas en el backend.
        // El segundo argumento puede ser un literal (7) o una columna (f.Dias) —
        // en ambos casos lo pasamos a SQLite como '-' || N || ' days' para que
        // el motor haga la concatenación en runtime.
        $units = ['DAY' => 'days', 'MONTH' => 'months', 'YEAR' => 'years',
                  'HOUR' => 'hours', 'MINUTE' => 'minutes', 'SECOND' => 'seconds'];
        foreach ($units as $mysqlU => $sqliteU) {
            // DATE_SUB(expr, INTERVAL N UNIT) → date(expr, ('-' || N || ' units'))
            $sql = preg_replace_callback(
                "~\bDATE_SUB\s*\(\s*([^,]+?)\s*,\s*INTERVAL\s+(.+?)\s+$mysqlU\s*\)~i",
                fn($m) => "date({$m[1]}, ('-' || ({$m[2]}) || ' $sqliteU'))",
                $sql
            );
            $sql = preg_replace_callback(
                "~\bDATE_ADD\s*\(\s*([^,]+?)\s*,\s*INTERVAL\s+(.+?)\s+$mysqlU\s*\)~i",
                fn($m) => "date({$m[1]}, ('+' || ({$m[2]}) || ' $sqliteU'))",
                $sql
            );
        }
        return $sql;
    }

    public function prepare($query, $options = []): PDOStatement|false {
        return parent::prepare(self::rewrite($query), $options);
    }

    public function query($query, $fetchMode = null, ...$fetchModeArgs): PDOStatement|false {
        $query = self::rewrite($query);
        return $fetchMode === null
            ? parent::query($query)
            : parent::query($query, $fetchMode, ...$fetchModeArgs);
    }

    public function exec($statement): int|false {
        return parent::exec(self::rewrite($statement));
    }
}

/**
 * Registra en SQLite las funciones MySQL más usadas por el backend.
 * Hace falta porque SQLite no tiene MONTH/YEAR/DAY/DATE_FORMAT/NOW/CURDATE
 * nativos — devolvía "no such function". Al emularlas acá, cientos de
 * queries que fueron escritas para MySQL funcionan sin cambios.
 */
function conta_sqlite_registrar_funciones_mysql(PDO $pdo): void {
    // Parse una fecha/datetime SQL de MySQL. Devuelve timestamp o false.
    $parseDate = function($value) {
        if ($value === null || $value === '') return false;
        if (is_numeric($value)) return (int)$value;
        $ts = strtotime($value);
        return $ts === false ? false : $ts;
    };

    $pdo->sqliteCreateFunction('MONTH', function($value) use ($parseDate) {
        $ts = $parseDate($value);
        return $ts === false ? null : (int) date('n', $ts);
    }, 1);

    $pdo->sqliteCreateFunction('YEAR', function($value) use ($parseDate) {
        $ts = $parseDate($value);
        return $ts === false ? null : (int) date('Y', $ts);
    }, 1);

    $pdo->sqliteCreateFunction('DAY', function($value) use ($parseDate) {
        $ts = $parseDate($value);
        return $ts === false ? null : (int) date('j', $ts);
    }, 1);

    $pdo->sqliteCreateFunction('DAYOFMONTH', function($value) use ($parseDate) {
        $ts = $parseDate($value);
        return $ts === false ? null : (int) date('j', $ts);
    }, 1);

    $pdo->sqliteCreateFunction('HOUR', function($value) use ($parseDate) {
        $ts = $parseDate($value);
        return $ts === false ? null : (int) date('G', $ts);
    }, 1);

    $pdo->sqliteCreateFunction('MINUTE', function($value) use ($parseDate) {
        $ts = $parseDate($value);
        return $ts === false ? null : (int) date('i', $ts);
    }, 1);

    $pdo->sqliteCreateFunction('NOW', function() {
        return date('Y-m-d H:i:s');
    }, 0);

    $pdo->sqliteCreateFunction('CURDATE', function() {
        return date('Y-m-d');
    }, 0);

    $pdo->sqliteCreateFunction('CURRENT_DATE', function() {
        return date('Y-m-d');
    }, 0);

    $pdo->sqliteCreateFunction('DATEDIFF', function($a, $b) use ($parseDate) {
        $ta = $parseDate($a); $tb = $parseDate($b);
        if ($ta === false || $tb === false) return null;
        // MySQL DATEDIFF: días entre a y b, puede ser negativo.
        return (int) floor(($ta - $tb) / 86400);
    }, 2);

    $pdo->sqliteCreateFunction('MONTHNAME', function($value) use ($parseDate) {
        $ts = $parseDate($value);
        if ($ts === false) return null;
        $m = ['', 'Enero','Febrero','Marzo','Abril','Mayo','Junio',
              'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
        return $m[(int) date('n', $ts)] ?? null;
    }, 1);

    $pdo->sqliteCreateFunction('DAYNAME', function($value) use ($parseDate) {
        $ts = $parseDate($value);
        if ($ts === false) return null;
        $d = ['Lunes','Martes','Miércoles','Jueves','Viernes','Sábado','Domingo'];
        return $d[(int) date('N', $ts) - 1] ?? null;
    }, 1);

    $pdo->sqliteCreateFunction('QUARTER', function($value) use ($parseDate) {
        $ts = $parseDate($value);
        return $ts === false ? null : (int) ceil(((int) date('n', $ts)) / 3);
    }, 1);

    $pdo->sqliteCreateFunction('UNIX_TIMESTAMP', function($value = null) use ($parseDate) {
        if ($value === null) return time();
        $ts = $parseDate($value);
        return $ts === false ? null : $ts;
    }, -1);

    // DATE_FORMAT(fecha, formato_mysql) → equivalente a strftime pero con
    // tokens MySQL (%Y, %m, %d, %H, %i, %s). Tokens frecuentes mapeados.
    $pdo->sqliteCreateFunction('DATE_FORMAT', function($value, $fmt) use ($parseDate) {
        $ts = $parseDate($value);
        if ($ts === false) return null;
        $mapa = ['%Y' => 'Y', '%y' => 'y', '%m' => 'm', '%c' => 'n',
                 '%d' => 'd', '%e' => 'j', '%H' => 'H', '%k' => 'G',
                 '%i' => 'i', '%s' => 's', '%S' => 's', '%M' => 'F',
                 '%b' => 'M', '%W' => 'l', '%a' => 'D', '%p' => 'A',
                 '%r' => 'h:i:s A', '%T' => 'H:i:s'];
        $out = '';
        $i = 0; $len = strlen($fmt);
        while ($i < $len) {
            if ($fmt[$i] === '%' && $i + 1 < $len) {
                $tok = substr($fmt, $i, 2);
                $out .= date($mapa[$tok] ?? '%', $ts);
                $i += 2;
            } else {
                $out .= $fmt[$i];
                $i++;
            }
        }
        return $out;
    }, 2);

    // IF() de MySQL: IF(cond, a, b) — en SQLite se usa CASE pero muchos lugares
    // tienen IF() literal; lo emulamos como función escalar.
    $pdo->sqliteCreateFunction('IF', function($cond, $a, $b) {
        return $cond ? $a : $b;
    }, 3);

    // IFNULL ya es nativo de SQLite, no hace falta registrarlo.
    // COALESCE ya es nativo de SQLite, no hace falta registrarlo.
}

/**
 * Chequea si una tabla existe. Portable MySQL+SQLite.
 */
function conta_tiene_tabla(PDO $db, string $tabla): bool {
    $driver = $db->getAttribute(PDO::ATTR_DRIVER_NAME);
    if ($driver === 'sqlite') {
        $stmt = $db->prepare("SELECT 1 FROM sqlite_master WHERE type='table' AND name = ?");
        $stmt->execute([$tabla]);
        return (bool)$stmt->fetchColumn();
    }
    $stmt = $db->prepare("SELECT 1 FROM information_schema.TABLES WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME=?");
    $stmt->execute([$tabla]);
    return (bool)$stmt->fetchColumn();
}
