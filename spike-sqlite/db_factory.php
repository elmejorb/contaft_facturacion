<?php
/**
 * Factory de BD — prototipo para la Fase 1 del plan.
 *
 * Lee la config desde un `config.json` que vive junto al archivo (o la ruta
 * que se le pase). Según el driver, abre PDO contra MySQL o SQLite.
 *
 * Formato del config.json:
 * {
 *   "driver": "sqlite",      // o "mysql"
 *   "sqlite": {
 *     "path": "C:/.../conta.db"
 *   },
 *   "mysql": {
 *     "host": "localhost",
 *     "database": "conta_demo",
 *     "username": "root",
 *     "password": "root"
 *   }
 * }
 *
 * Al desplegar en producción, este archivo reemplaza al database.php actual
 * y el config.json queda en userData (nunca en el repo).
 */
class DatabaseFactory {
    private $config;

    public function __construct($configPath = null) {
        $configPath = $configPath ?: __DIR__ . '/config.json';
        if (!file_exists($configPath)) {
            throw new RuntimeException("No se encontró config.json en $configPath");
        }
        $this->config = json_decode(file_get_contents($configPath), true);
        if (!$this->config || empty($this->config['driver'])) {
            throw new RuntimeException("config.json inválido o sin 'driver'");
        }
    }

    public function getConnection() {
        $driver = $this->config['driver'];
        if ($driver === 'sqlite') {
            $path = $this->config['sqlite']['path'] ?? null;
            if (!$path) throw new RuntimeException("Falta sqlite.path en config.json");
            $pdo = new PDO("sqlite:$path");
            $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
            $pdo->setAttribute(PDO::ATTR_DEFAULT_FETCH_MODE, PDO::FETCH_ASSOC);
            // SQLite requiere PRAGMA foreign_keys=ON por conexión (default es OFF).
            $pdo->exec('PRAGMA foreign_keys = ON');
            // WAL mejora concurrencia: lecturas en paralelo con la escritura.
            $pdo->exec('PRAGMA journal_mode = WAL');
            // synchronous NORMAL + WAL: durable sin fsync() por commit (más rápido, igual seguro)
            $pdo->exec('PRAGMA synchronous = NORMAL');
            // SQLite acepta valores no-tipo (ej. '0' en vez de 0) sin strict — mantener así.
            return $pdo;
        }
        if ($driver === 'mysql') {
            $c = $this->config['mysql'];
            $pdo = new PDO(
                "mysql:host={$c['host']};dbname={$c['database']};charset=utf8mb4",
                $c['username'], $c['password']
            );
            $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
            $pdo->setAttribute(PDO::ATTR_DEFAULT_FETCH_MODE, PDO::FETCH_ASSOC);
            return $pdo;
        }
        throw new RuntimeException("Driver desconocido: $driver");
    }

    public function getDriver() {
        return $this->config['driver'];
    }
}

// Compatibilidad: una clase Database con la misma interfaz que api/config/database.php
// para que el resto del backend siga funcionando sin cambios al leer este archivo.
class Database {
    public $conn;
    public function getConnection() {
        $factory = new DatabaseFactory();
        $this->conn = $factory->getConnection();
        return $this->conn;
    }
}
