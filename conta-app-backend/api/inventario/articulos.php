<?php
/**
 * Endpoint para obtener artículos del inventario
 */

require_once '../config/database.php';

// Crear conexión a la base de datos
$database = new Database();
$db = $database->getConnection();

// Obtener parámetros de la URL
$buscarPor = isset($_GET['buscarPor']) ? $_GET['buscarPor'] : 'Descripcion';
$ordenarPor = isset($_GET['ordenarPor']) ? $_GET['ordenarPor'] : 'Codigo';
$orden = isset($_GET['orden']) ? $_GET['orden'] : 'ASC';
$estado = isset($_GET['estado']) ? $_GET['estado'] : 'Activos';

// Validar parámetros
$camposPermitidos = ['Codigo', 'Descripcion', 'Existencia', 'Precio1', 'Categoria', 'Proveedor'];
if (!in_array($buscarPor, $camposPermitidos)) {
    $buscarPor = 'Descripcion';
}
if (!in_array($ordenarPor, $camposPermitidos)) {
    $ordenarPor = 'Codigo';
}
if (!in_array($orden, ['ASC', 'DESC'])) {
    $orden = 'ASC';
}

try {
    // Mapear nombres de frontend a nombres reales de la base de datos
    $columnMap = [
        'Descripcion' => 'Nombres_Articulo',
        'Codigo' => 'Codigo',
        'Existencia' => 'Existencia',
        'Precio1' => 'Precio_Venta',
        'Categoria' => 'Id_Categoria',
        'Proveedor' => 'CodigoPro'
    ];

    // Convertir el ordenamiento
    $ordenarPorReal = isset($columnMap[$ordenarPor]) ? $columnMap[$ordenarPor] : 'Codigo';

    // Construir la consulta SQL con LEFT JOIN para obtener nombres de categoría y proveedor
    $query = "SELECT
                a.Items,
                a.Codigo,
                a.Nombres_Articulo as Descripcion,
                a.Existencia,
                a.Precio_Costo as Costo,
                a.Precio_Venta as Precio1,
                a.Precio_Venta2 as Precio2,
                a.Precio_Venta3 as Precio3,
                a.Precio_Minimo as PrecioMinimo,
                COALESCE(c.Categoria, 'VARIOS') as Categoria,
                '' as Marca,
                COALESCE(p.RazonSocial, '') as Proveedor,
                CASE WHEN a.Estado = 1 THEN 'Activo' ELSE 'Inactivo' END as Estado,
                a.Iva,
                a.Id_Categoria as Id_Categoria,
                a.CodigoPro as CodigoPro,
                a.Estante,
                a.Existencia_minima,
                a.Id_Etiqueta,
                COALESCE(e.Nombre, '') as Etiqueta,
                COALESCE(e.Color, '') as Etiqueta_Color
              FROM tblArticulos a
              LEFT JOIN tblcategoria c ON a.Id_Categoria = c.Id_Categoria
              LEFT JOIN tblproveedores p ON a.CodigoPro = p.CodigoPro
              LEFT JOIN tbletiquetas e ON a.Id_Etiqueta = e.Id_Etiqueta;";

    // Filtrar por estado si es necesario
    if ($estado === 'Activos') {
        $query .= " WHERE a.Estado = 1";
    }

    // Agregar ordenamiento
    $query .= " ORDER BY a.$ordenarPorReal $orden";

    // Ejecutar la consulta
    $stmt = $db->prepare($query);
    $stmt->execute();

    $articulos = $stmt->fetchAll();

    // Formatear números
    foreach ($articulos as &$articulo) {
        $articulo['Existencia'] = floatval($articulo['Existencia']);
        $articulo['Costo'] = floatval($articulo['Costo']);
        $articulo['Precio1'] = floatval($articulo['Precio1']);
        $articulo['Precio2'] = floatval($articulo['Precio2']);
        $articulo['Precio3'] = floatval($articulo['Precio3']);
        $articulo['PrecioMinimo'] = floatval($articulo['PrecioMinimo']);
        $articulo['Iva'] = intval($articulo['Iva']);
    }

    http_response_code(200);
    echo json_encode([
        "success" => true,
        "articulos" => $articulos,
        "total" => count($articulos)
    ]);

} catch(Exception $e) {
    http_response_code(500);
    echo json_encode([
        "success" => false,
        "message" => "Error al obtener artículos: " . $e->getMessage()
    ]);
}
?>
