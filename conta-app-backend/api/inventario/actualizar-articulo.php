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

    // Detectar columnas presentes en tblarticulos. Los campos de conversion
    // (FactorConversion, NombreEmpaque, VenderComoEmpaque, ComprarComoEmpaque)
    // se agregaron en 4.3.95 — clientes que NO han corrido actualizacion_completa
    // no las tienen. Sin este chequeo el UPDATE crashea con "Unknown column"
    // y el frontend muestra "error de conexion" al guardar.
    $colStmt = $db->query("SELECT COLUMN_NAME FROM information_schema.COLUMNS
        WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'tblarticulos'");
    $cols = array_column($colStmt->fetchAll(PDO::FETCH_ASSOC), 'COLUMN_NAME');
    $tieneFactor = in_array('FactorConversion', $cols);
    $tieneNombreEmp = in_array('NombreEmpaque', $cols);
    $tieneVenderEmp = in_array('VenderComoEmpaque', $cols);
    $tieneComprarEmp = in_array('ComprarComoEmpaque', $cols);
    $tienePrecioEmp = in_array('Precio_Venta_Empaque', $cols);
    $tieneBodega = in_array('Id_Bodega', $cols);

    // Notas defensivas:
    //   - `Servicio` y `requiere_lote`: `!empty()` funciona bien para 0/1
    //     numérico y string; se preserva.
    //   - `Estante`: faltaba en versiones anteriores → cambios se perdían.
    //   - `Id_Etiqueta`: null si viene 0 o vacío (no hay etiqueta 0).
    //   - Los coalesce `?? valor_actual` evitan resets accidentales cuando el
    //     frontend NO envía el campo (ej. flujos de bulk edit parcial).
    $sets = [
        'Codigo = :codigo',
        'Nombres_Articulo = :nombre',
        'Id_Categoria = :categoria',
        'Precio_Costo = :costo',
        'Precio_Venta = :precio1',
        'Precio_Venta2 = :precio2',
        'Precio_Venta3 = :precio3',
        'Precio_Minimo = :precioMinimo',
        'Iva = :iva',
        'Existencia = :existencia',
        'Existencia_minima = :existenciaMinima',
        'CodigoPro = :proveedor',
        'Estante = :estante',
        'Estado = :estado',
        'requiere_lote = :requiereLote',
        'Servicio = :servicio',
        'Id_Etiqueta = :etiqueta',
    ];
    $params = [
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
        ':estante' => $input['Estante'] ?? '',
        ':estado' => $input['Estado'] ?? 1,
        ':requiereLote' => !empty($input['requiere_lote']) ? 1 : 0,
        ':servicio' => !empty($input['Servicio']) ? 1 : 0,
        ':etiqueta' => !empty($input['Id_Etiqueta']) ? intval($input['Id_Etiqueta']) : null,
        ':items' => $input['Items'],
    ];
    if ($tieneFactor) {
        $sets[] = 'FactorConversion = :factorConv';
        $params[':factorConv'] = max(1, intval($input['FactorConversion'] ?? $input['Unidades'] ?? 1));
    }
    if ($tieneNombreEmp) {
        $sets[] = 'NombreEmpaque = :nombreEmpaque';
        $params[':nombreEmpaque'] = trim($input['NombreEmpaque'] ?? $input['nombre_empaque'] ?? '') ?: null;
    }
    if ($tieneVenderEmp) {
        $sets[] = 'VenderComoEmpaque = :venderEmp';
        $params[':venderEmp'] = !empty($input['VenderComoEmpaque']) ? 1 : 0;
    }
    if ($tieneComprarEmp) {
        $sets[] = 'ComprarComoEmpaque = :comprarEmp';
        $params[':comprarEmp'] = !empty($input['ComprarComoEmpaque']) ? 1 : 0;
    }
    if ($tienePrecioEmp) {
        $sets[] = 'Precio_Venta_Empaque = :precioEmp';
        // Vacio o 0 → NULL (deja que se calcule Precio_Venta × Factor)
        $val = $input['Precio_Venta_Empaque'] ?? null;
        $params[':precioEmp'] = ($val === null || $val === '' || floatval($val) <= 0) ? null : floatval($val);
    }
    if ($tieneBodega && isset($input['Id_Bodega'])) {
        $sets[] = 'Id_Bodega = :idBodega';
        $params[':idBodega'] = max(1, intval($input['Id_Bodega']));
    }
    $sets[] = 'FechaMod = NOW()';

    $query = 'UPDATE tblarticulos SET ' . implode(', ', $sets) . ' WHERE Items = :items';
    $stmt = $db->prepare($query);
    $stmt->execute($params);

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
