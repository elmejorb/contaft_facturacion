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

    // Leer existencia actual antes del UPDATE para detectar cambios manuales
    $stmtCur = $db->prepare("SELECT Existencia, Precio_Costo FROM tblarticulos WHERE Items = ?");
    $stmtCur->execute([$input['Items']]);
    $articuloActual = $stmtCur->fetch();
    $existActual    = floatval($articuloActual['Existencia'] ?? 0);
    $existNueva     = isset($input['Existencia']) ? floatval($input['Existencia']) : $existActual;
    $costoUnit      = floatval($input['Precio_Costo'] ?? $articuloActual['Precio_Costo'] ?? 0);

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
        Existencia = :existencia,
        Existencia_minima = :existenciaMinima,
        CodigoPro = :proveedor,
        Estado = :estado,
        requiere_lote = :requiereLote,
        Servicio = :servicio,
        Id_Etiqueta = :etiqueta,
        FechaMod = NOW()
    WHERE Items = :items";

    $stmt = $db->prepare($query);
    $stmt->execute([
        ':codigo' => $input['Codigo'],
        ':nombre' => $input['Nombres_Articulo'],
        ':categoria' => $input['Id_Categoria'] ?? 0,
        ':costo' => $costoUnit,
        ':precio1' => $input['Precio_Venta'] ?? 0,
        ':precio2' => $input['Precio_Venta2'] ?? 0,
        ':precio3' => $input['Precio_Venta3'] ?? 0,
        ':precioMinimo' => $input['Precio_Minimo'] ?? 0,
        ':iva' => $input['Iva'] ?? 0,
        ':existencia' => $existNueva,
        ':existenciaMinima' => $input['Existencia_minima'] ?? 0,
        ':proveedor' => $input['CodigoPro'] ?? 0,
        ':estado' => $input['Estado'] ?? 1,
        ':requiereLote' => !empty($input['requiere_lote']) ? 1 : 0,
        ':servicio' => !empty($input['Servicio']) ? 1 : 0,
        ':etiqueta' => !empty($input['Id_Etiqueta']) ? intval($input['Id_Etiqueta']) : null,
        ':items' => $input['Items'],
    ]);

    // Si la existencia cambió manualmente, registrar la diferencia en el kardex
    // como entrada (suma) o salida (resta) — preserva el libro inmutable.
    $diferencia = $existNueva - $existActual;
    if (abs($diferencia) > 0.0001) {
        $tieneKardex = $db->query("SHOW TABLES LIKE 'tblkardex'")->fetch();
        if ($tieneKardex) {
            $mesNombre = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'][intval(date('n'))-1];
            $costoDiff = abs($diferencia) * $costoUnit;
            $costoSaldo = $existNueva * $costoUnit;
            $detalle = $diferencia > 0
                ? sprintf('Ajuste manual (suma): +%g unidades', $diferencia)
                : sprintf('Ajuste manual (resta): %g unidades', $diferencia);
            $kStmt = $db->prepare("
                INSERT INTO tblkardex
                  (Fecha, Mes, Items, Detalle, C_D, Cant_Ent, Cost_Ent, Cant_Sal, Cost_Sal, Cant_Saldo, Cost_Saldo, Cost_Unit)
                VALUES
                  (NOW(), :mes, :items, :detalle, 0, :cant_ent, :cost_ent, :cant_sal, :cost_sal, :saldo_cant, :saldo_costo, :costo_unit)
            ");
            $kStmt->execute([
                ':mes'         => $mesNombre,
                ':items'       => $input['Items'],
                ':detalle'     => $detalle,
                ':cant_ent'    => $diferencia > 0 ? abs($diferencia) : 0,
                ':cost_ent'    => $diferencia > 0 ? $costoDiff : 0,
                ':cant_sal'    => $diferencia < 0 ? abs($diferencia) : 0,
                ':cost_sal'    => $diferencia < 0 ? $costoDiff : 0,
                ':saldo_cant'  => $existNueva,
                ':saldo_costo' => $costoSaldo,
                ':costo_unit'  => $costoUnit,
            ]);
        }
    }

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
