<?php
/**
 * CRUD de Categorías
 * GET    → listar categorías (con conteo de artículos)
 * POST   → crear categoría
 * PUT    → actualizar categoría
 * DELETE → eliminar categoría
 */

require_once '../config/database.php';

$database = new Database();
$db = $database->getConnection();
$method = $_SERVER['REQUEST_METHOD'];

try {
    switch ($method) {
        case 'GET':
            $stmt = $db->query("
                SELECT c.Id_Categoria, c.Categoria,
                       COUNT(a.Items) as Total_Articulos
                FROM tblcategoria c
                LEFT JOIN tblarticulos a ON c.Id_Categoria = a.Id_Categoria AND a.Estado = 1
                GROUP BY c.Id_Categoria, c.Categoria
                ORDER BY c.Categoria
            ");
            $categorias = $stmt->fetchAll();
            foreach ($categorias as &$cat) {
                $cat['Total_Articulos'] = intval($cat['Total_Articulos']);
            }
            echo json_encode([
                "success" => true,
                "categorias" => $categorias,
                "total" => count($categorias)
            ], JSON_UNESCAPED_UNICODE);
            break;

        case 'POST':
            $data = json_decode(file_get_contents("php://input"));
            if (empty($data->Categoria)) {
                http_response_code(400);
                echo json_encode(["success" => false, "message" => "El nombre de la categoría es requerido"]);
                exit;
            }
            // Get next ID
            $stmt = $db->query("SELECT COALESCE(MAX(Id_Categoria), 0) + 1 as next_id FROM tblcategoria");
            $nextId = $stmt->fetch()['next_id'];

            $stmt = $db->prepare("INSERT INTO tblcategoria (Id_Categoria, Categoria) VALUES (:id, :nombre)");
            $stmt->execute([':id' => $nextId, ':nombre' => trim($data->Categoria)]);
            echo json_encode([
                "success" => true,
                "message" => "Categoría creada",
                "Id_Categoria" => $nextId
            ], JSON_UNESCAPED_UNICODE);
            break;

        case 'PUT':
            $data = json_decode(file_get_contents("php://input"));
            if (empty($data->Id_Categoria) || empty($data->Categoria)) {
                http_response_code(400);
                echo json_encode(["success" => false, "message" => "ID y nombre son requeridos"]);
                exit;
            }
            $stmt = $db->prepare("UPDATE tblcategoria SET Categoria = :nombre WHERE Id_Categoria = :id");
            $stmt->execute([':nombre' => trim($data->Categoria), ':id' => $data->Id_Categoria]);
            echo json_encode(["success" => true, "message" => "Categoría actualizada"], JSON_UNESCAPED_UNICODE);
            break;

        case 'DELETE':
            $id = $_GET['id'] ?? null;
            if (!$id) {
                http_response_code(400);
                echo json_encode(["success" => false, "message" => "ID requerido"]);
                exit;
            }
            // Check if has products
            $stmt = $db->prepare("SELECT COUNT(*) as total FROM tblarticulos WHERE Id_Categoria = :id AND Estado = 1");
            $stmt->execute([':id' => $id]);
            $count = $stmt->fetch()['total'];
            if ($count > 0) {
                http_response_code(409);
                echo json_encode([
                    "success" => false,
                    "message" => "No se puede eliminar: tiene $count artículos activos asociados"
                ], JSON_UNESCAPED_UNICODE);
                exit;
            }
            $stmt = $db->prepare("DELETE FROM tblcategoria WHERE Id_Categoria = :id");
            $stmt->execute([':id' => $id]);
            echo json_encode(["success" => true, "message" => "Categoría eliminada"], JSON_UNESCAPED_UNICODE);
            break;

        default:
            http_response_code(405);
            echo json_encode(["success" => false, "message" => "Método no permitido"]);
    }
} catch(Exception $e) {
    http_response_code(500);
    echo json_encode(["success" => false, "message" => $e->getMessage()]);
}
?>
