<?php
/**
 * Configuración de la base de datos
 */

// Zona horaria — debe coincidir con la de Colombia para que las fechas
// generadas en PHP (date(), strtotime(), etc.) cuadren con NOW() de MySQL.
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

class Database {
    private $host = "localhost";
    private $db_name = "conta_test_negocio";
    private $username = "root";
    private $password = "root";
    public $conn;

    public function getConnection() {
        $this->conn = null;

        try {
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
?>
