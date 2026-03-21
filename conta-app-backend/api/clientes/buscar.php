<?php
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

require_once '../config/database.php';

try {
    $database = new Database();
    $pdo = $database->getConnection();

    if (isset($_GET['identificacion'])) {
        $identificacion = $_GET['identificacion'];
        $stmt = $pdo->prepare("
            SELECT CodigoClien, Nit as Identificacion, Razon_Social as Nombre_Cliente,
                   Telefonos as Telefono, Direccion, Email, CupoAutorizado as Cupo
            FROM tblclientes WHERE Nit = :id LIMIT 1
        ");
        $stmt->execute(['id' => $identificacion]);
        $cliente = $stmt->fetch(PDO::FETCH_ASSOC);
        echo json_encode($cliente ? ['success' => true, 'data' => $cliente] : ['success' => false, 'message' => 'No encontrado']);
    }
    else if (isset($_GET['q'])) {
        $q = '%' . $_GET['q'] . '%';
        $stmt = $pdo->prepare("
            SELECT CodigoClien, Nit as Identificacion, Razon_Social as Nombre_Cliente,
                   Telefonos as Telefono, Direccion, Email, CupoAutorizado as Cupo
            FROM tblclientes
            WHERE Nit LIKE :q OR Razon_Social LIKE :q2
            ORDER BY Razon_Social LIMIT 20
        ");
        $stmt->execute(['q' => $q, 'q2' => $q]);
        $clientes = $stmt->fetchAll(PDO::FETCH_ASSOC);
        echo json_encode(['success' => true, 'clientes' => $clientes], JSON_UNESCAPED_UNICODE);
    }
    else {
        echo json_encode(['success' => false, 'message' => 'Parámetros requeridos']);
    }

} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Error de base de datos: ' . $e->getMessage()
    ]);
}
?>
