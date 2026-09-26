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

    // Detectar columnas / tablas opcionales para tolerar BDs viejas que aun
    // no corrieron actualizacion_completa. Sin este chequeo el SELECT crashea
    // con "Unknown column" o "Table doesn't exist" y el listado queda en
    // "Error al cargar los articulos".
    $colStmt = $db->query("SELECT COLUMN_NAME FROM information_schema.COLUMNS
        WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'tblarticulos'");
    $artCols = array_column($colStmt->fetchAll(PDO::FETCH_ASSOC), 'COLUMN_NAME');
    $tblStmt = $db->query("SELECT TABLE_NAME FROM information_schema.TABLES
        WHERE TABLE_SCHEMA = DATABASE()");
    $tblExists = array_column($tblStmt->fetchAll(PDO::FETCH_ASSOC), 'TABLE_NAME');

    $selFactor    = in_array('FactorConversion', $artCols)   ? 'COALESCE(a.FactorConversion, 1)' : '1';
    $selNombreEmp = in_array('NombreEmpaque', $artCols)      ? 'a.NombreEmpaque'                 : 'NULL';
    $selVenderEmp = in_array('VenderComoEmpaque', $artCols)  ? 'COALESCE(a.VenderComoEmpaque, 0)' : '0';
    $selComprarEmp= in_array('ComprarComoEmpaque', $artCols) ? 'COALESCE(a.ComprarComoEmpaque, 0)' : '0';
    $selPrecioEmp = in_array('Precio_Venta_Empaque', $artCols) ? 'a.Precio_Venta_Empaque'         : 'NULL';
    $selIdEtiq    = in_array('Id_Etiqueta', $artCols)        ? 'a.Id_Etiqueta' : 'NULL';
    $selEstante   = in_array('Estante', $artCols)            ? 'a.Estante' : "''";
    $selExMin     = in_array('Existencia_minima', $artCols)  ? 'a.Existencia_minima' : '0';
    $selReqLote   = in_array('requiere_lote', $artCols)      ? 'COALESCE(a.requiere_lote, 0)' : '0';
    $selServicio  = in_array('Servicio', $artCols)           ? 'COALESCE(a.Servicio, 0)' : '0';
    $joinProv     = in_array('tblproveedores', $tblExists) ? 'LEFT JOIN tblproveedores p ON a.CodigoPro = p.CodigoPro' : '';
    $selProv      = in_array('tblproveedores', $tblExists) ? "COALESCE(p.RazonSocial, '')" : "''";
    $joinEtiq     = in_array('tbletiquetas', $tblExists) ? 'LEFT JOIN tbletiquetas e ON a.Id_Etiqueta = e.Id_Etiqueta' : '';
    $selEtiq      = in_array('tbletiquetas', $tblExists) ? "COALESCE(e.Nombre, '')" : "''";
    $selEtiqColor = in_array('tbletiquetas', $tblExists) ? "COALESCE(e.Color, '')" : "''";
    // Bodegas — defensivo: si el cliente no ha corrido actualizacion_completa,
    // no rompemos el listado; devolvemos Id_Bodega=1 (Principal) y nombre vacío.
    $hasBodegas   = in_array('tblbodegas', $tblExists) && in_array('Id_Bodega', $artCols);
    $joinBodega   = $hasBodegas ? 'LEFT JOIN tblbodegas b ON a.Id_Bodega = b.Id_Bodega' : '';
    $selIdBodega  = $hasBodegas ? 'COALESCE(a.Id_Bodega, 1)' : '1';
    $selBodegaNom = $hasBodegas ? "COALESCE(b.Nombre, '')" : "''";

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
                $selProv as Proveedor,
                CASE WHEN a.Estado = 1 THEN 'Activo' ELSE 'Inactivo' END as Estado,
                a.Iva,
                a.Id_Categoria as Id_Categoria,
                a.CodigoPro as CodigoPro,
                $selEstante as Estante,
                $selExMin as Existencia_minima,
                $selReqLote AS requiere_lote,
                $selServicio AS Servicio,
                $selIdEtiq as Id_Etiqueta,
                $selEtiq as Etiqueta,
                $selEtiqColor as Etiqueta_Color,
                $selFactor AS FactorConversion,
                $selNombreEmp AS NombreEmpaque,
                $selVenderEmp AS VenderComoEmpaque,
                $selComprarEmp AS ComprarComoEmpaque,
                $selPrecioEmp AS Precio_Venta_Empaque,
                $selIdBodega AS Id_Bodega,
                $selBodegaNom AS Nombre_Bodega
              FROM tblArticulos a
              LEFT JOIN tblcategoria c ON a.Id_Categoria = c.Id_Categoria
              $joinProv
              $joinEtiq
              $joinBodega";

    // Filtro por Items (traer un solo producto — usado por Editar Producto
    // desde Nueva Compra sin salir de la pantalla).
    $itemsFilter = isset($_GET['items']) ? intval($_GET['items']) : 0;
    $bodegaFilter = isset($_GET['bodega']) ? intval($_GET['bodega']) : 0;
    $params = [];
    $wheres = [];
    if ($itemsFilter > 0) {
        $wheres[] = 'a.Items = :items';
        $params[':items'] = $itemsFilter;
    } elseif ($estado === 'Activos') {
        $wheres[] = 'a.Estado = 1';
    } elseif ($estado === 'Inactivos') {
        $wheres[] = 'a.Estado = 0';
    }
    if ($bodegaFilter > 0 && $hasBodegas) {
        $wheres[] = 'a.Id_Bodega = :bodega';
        $params[':bodega'] = $bodegaFilter;
    }
    if ($wheres) $query .= ' WHERE ' . implode(' AND ', $wheres);

    // Agregar ordenamiento
    $query .= " ORDER BY a.$ordenarPorReal $orden";

    // Ejecutar la consulta
    $stmt = $db->prepare($query);
    $stmt->execute($params);

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
        $articulo['Id_Bodega'] = intval($articulo['Id_Bodega'] ?? 1);
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
