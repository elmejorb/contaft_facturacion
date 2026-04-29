<?php
/**
 * Endpoint para actualizar un artículo del inventario
 */

require_once '../config/database.php';

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

if ($_SERVER['REQUEST_METHOD'] !== 'PUT' && $_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Método no permitido']);
    exit();
}

$database = new Database();
$db = $database->getConnection();

try {
    $input = json_decode(file_get_contents('php://input'), true);

    if (!$input || !isset($input['Items'])) {
        echo json_encode(['success' => false, 'message' => 'Datos inválidos']);
        exit();
    }

    $query = "UPDATE tblarticulos SET
        Codigo = :codigo,
        Nombres_Articulo = :nombre,
        Id_Categoria = :categoria,
        Precio_Costo = :costo,
        Precio_Venta = :precio1,
        Precio_Venta2 = :precio2,
        Precio_Venta3 = :precio3,
        Precio_Minimo = :precioMinimo,
        Iva = :iva,
        Existencia_minima = :existenciaMinima,
        CodigoPro = :proveedor,
        Estado = :estado,
        requiere_lote = :requiereLote,
        Id_Etiqueta = :etiqueta,
        FechaMod = NOW()
    WHERE Items = :items";

    $stmt = $db->prepare($query);
    $stmt->execute([
        ':codigo' => $input['Codigo'],
        ':nombre' => $input['Nombres_Articulo'],
        ':categoria' => $input['Id_Categoria'] ?? 0,
        ':costo' => $input['Precio_Costo'] ?? 0,
        ':precio1' => $input['Precio_Venta'] ?? 0,
        ':precio2' => $input['Precio_Venta2'] ?? 0,
        ':precio3' => $input['Precio_Venta3'] ?? 0,
        ':precioMinimo' => $input['Precio_Minimo'] ?? 0,
        ':iva' => $input['Iva'] ?? 0,
        ':existenciaMinima' => $input['Existencia_minima'] ?? 0,
        ':proveedor' => $input['CodigoPro'] ?? 0,
        ':estado' => $input['Estado'] ?? 1,
        ':requiereLote' => !empty($input['requiere_lote']) ? 1 : 0,
        ':etiqueta' => !empty($input['Id_Etiqueta']) ? intval($input['Id_Etiqueta']) : null,
        ':items' => $input['Items'],
    ]);

    echo json_encode([
        'success' => true,
        'message' => 'Artículo actualizado correctamente'
    ]);

} catch(Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Error al actualizar: ' . $e->getMessage()
    ]);
}
?>
