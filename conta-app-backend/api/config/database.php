<?php
/**
 * Configuración de la base de datos.
 *
 * Desde 4.8.0: si existe config.json (via env var CONTA_CONFIG_PATH o junto
 * a este archivo) la conexión se abre a través de db_factory.php y respeta
 * driver=mysql|sqlite. Si NO existe, el comportamiento es idéntico al de
 * siempre: MySQL con los defaults declarados abajo.
 *
 * Clientes existentes NO notan ningún cambio: ninguno tiene config.json a
 * menos que el instalador o un admin lo haya puesto explícitamente.
 */

// Zona horaria — debe coincidir con la de Colombia para que las fechas
// generadas en PHP (date(), strtotime(), etc.) cuadren con CURRENT_TIMESTAMP de MySQL.
date_default_timezone_set('America/Bogota');

header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");
header("Content-Type: application/json; charset=UTF-8");

// Manejar solicitudes OPTIONS (preflight)
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

require_once __DIR__ . '/db_factory.php';

class Database {
    // Defaults de modo LEGACY — se usan solo cuando NO hay config.json.
    // Son los mismos valores que vivían hardcodeados hasta 4.7.14.
    private $host = "localhost";
    private $db_name = "conta_demo";
    private $username = "root";
    private $password = "root";
    public $conn;

    public function getConnection() {
        $this->conn = null;

        try {
            // Si existe config.json → modo nuevo (factory elige driver y abre PDO).
            $cfg = conta_config_cargar();
            if ($cfg !== null) {
                $this->conn = conta_abrir_pdo($cfg);
                return $this->conn;
            }

            // Modo LEGACY — sin config.json, usa los defaults MySQL de siempre.
            // Idéntico comportamiento al de 4.7.14 y anteriores.
            $this->conn = new PDO(
                "mysql:host=" . $this->host . ";dbname=" . $this->db_name . ";charset=utf8mb4",
                $this->username,
                $this->password
            );
            $this->conn->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
            $this->conn->setAttribute(PDO::ATTR_DEFAULT_FETCH_MODE, PDO::FETCH_ASSOC);
        } catch(PDOException $e) {
            echo json_encode([
                "success" => false,
                "message" => "Error de conexión: " . $e->getMessage()
            ]);
            exit();
        }

        return $this->conn;
    }
}
