<?php
/**
 * Endpoint para crear un nuevo artículo
 */

require_once '../config/database.php';

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Método no permitido']);
    exit();
}

$database = new Database();
$db = $database->getConnection();

try {
    $input = json_decode(file_get_contents('php://input'), true);

    if (!$input || empty($input['Codigo']) || empty($input['Nombres_Articulo'])) {
        echo json_encode(['success' => false, 'message' => 'Código y nombre son obligatorios']);
        exit();
    }

    // Verificar que el código no exista
    $check = $db->prepare("SELECT COUNT(*) FROM tblarticulos WHERE Codigo = :codigo");
    $check->execute([':codigo' => $input['Codigo']]);
    if ($check->fetchColumn() > 0) {
        echo json_encode(['success' => false, 'message' => 'Ya existe un artículo con ese código']);
        exit();
    }

    // Obtener el siguiente Items
    $stmt = $db->query("SELECT COALESCE(MAX(Items), 0) + 1 as nextItems FROM tblarticulos");
    $nextItems = $stmt->fetch()['nextItems'];

    $existenciaInicial = floatval($input['Existencia'] ?? 0);
    $costoUnit = floatval($input['Precio_Costo'] ?? 0);

    $query = "INSERT INTO tblarticulos (
        Items, Codigo, Nombres_Articulo, Id_Categoria, Existencia, Existencia_minima,
        Precio_Costo, Precio_Venta, Precio_Venta2, Precio_Venta3, Precio_Minimo,
        Iva, CodigoPro, Estante, Estado, requiere_lote, Id_Etiqueta, FechaMod
    ) VALUES (
        :items, :codigo, :nombre, :categoria, :existencia, :existenciaMinima,
        :costo, :precio1, :precio2, :precio3, :precioMinimo,
        :iva, :proveedor, :estante, :estado, :requiereLote, :etiqueta, NOW()
    )";

    $stmt = $db->prepare($query);
    $stmt->execute([
        ':items' => $nextItems,
        ':codigo' => $input['Codigo'],
        ':nombre' => $input['Nombres_Articulo'],
        ':categoria' => $input['Id_Categoria'] ?? 0,
        ':existencia' => $existenciaInicial,
        ':existenciaMinima' => $input['Existencia_minima'] ?? 0,
        ':costo' => $costoUnit,
        ':precio1' => $input['Precio_Venta'] ?? 0,
        ':precio2' => $input['Precio_Venta2'] ?? 0,
        ':precio3' => $input['Precio_Venta3'] ?? 0,
        ':precioMinimo' => $input['Precio_Minimo'] ?? 0,
        ':iva' => $input['Iva'] ?? 0,
        ':proveedor' => $input['CodigoPro'] ?? 0,
        ':estante' => $input['Estante'] ?? '',
        ':estado' => $input['Estado'] ?? 1,
        ':requiereLote' => !empty($input['requiere_lote']) ? 1 : 0,
        ':etiqueta' => !empty($input['Id_Etiqueta']) ? intval($input['Id_Etiqueta']) : null,
    ]);

    // Si hay existencia inicial y existe la tabla kardex, registrar la carga inicial.
    if ($existenciaInicial > 0) {
        $tieneKardex = $db->query("SHOW TABLES LIKE 'tblkardex'")->fetch();
        if ($tieneKardex) {
            $costoTotal = $existenciaInicial * $costoUnit;
            $mesNombre = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'][intval(date('n'))-1];
            $kStmt = $db->prepare("
                INSERT INTO tblkardex
                  (Fecha, Mes, Items, Detalle, C_D, Cant_Ent, Cost_Ent, Cant_Sal, Cost_Sal, Cant_Saldo, Cost_Saldo, Cost_Unit)
                VALUES
                  (NOW(), :mes, :items, :detalle, 0, :cant, :costo_total, 0, 0, :saldo_cant, :saldo_costo, :costo_unit)
            ");
            $kStmt->execute([
                ':mes'         => $mesNombre,
                ':items'       => $nextItems,
                ':detalle'     => 'Carga inicial al crear el artículo',
                ':cant'        => $existenciaInicial,
                ':costo_total' => $costoTotal,
                ':saldo_cant'  => $existenciaInicial,
                ':saldo_costo' => $costoTotal,
                ':costo_unit'  => $costoUnit,
            ]);
        }
    }

    echo json_encode([
        'success' => true,
        'message' => 'Artículo creado correctamente',
        'items' => $nextItems
    ]);

} catch(Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Error al crear: ' . $e->getMessage()
    ]);
}
?>
