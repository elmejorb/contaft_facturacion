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

        $pdo = new PDO("sqlite:$path");
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
