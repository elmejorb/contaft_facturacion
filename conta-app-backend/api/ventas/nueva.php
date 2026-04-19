<?php
/**
 * Crear nueva factura de venta
 * POST { tipo, dias, cliente, medio_pago, vendedor, items[], descuento_global }
 *
 * Buscar artículos para agregar:
 * GET ?buscar=texto → busca por código o nombre
 */

require_once '../config/database.php';

$database = new Database();
$db = $database->getConnection();
$method = $_SERVER['REQUEST_METHOD'];

try {
    if ($method === 'GET') {
        $buscar = $_GET['buscar'] ?? '';
        if (strlen($buscar) < 1) {
            echo json_encode(["success" => true, "articulos" => []]);
            exit;
        }

        $stmt = $db->prepare("
            SELECT a.Items, a.Codigo, a.Nombres_Articulo, a.Existencia, a.Precio_Costo,
                   a.Precio_Venta, a.Precio_Venta2, a.Precio_Venta3, a.Iva, a.Precio_Minimo,
                   COALESCE(c.Categoria, 'VARIOS') as Categoria
            FROM tblarticulos a
            LEFT JOIN tblcategoria c ON a.Id_Categoria = c.Id_Categoria
            WHERE a.Estado = 1 AND (a.Codigo LIKE :cod OR a.Nombres_Articulo LIKE :nom)
            ORDER BY a.Nombres_Articulo
            LIMIT 20
        ");
        $buscarLike = "%$buscar%";
        $stmt->execute([':cod' => $buscarLike, ':nom' => $buscarLike]);
        $articulos = $stmt->fetchAll();

        foreach ($articulos as &$a) {
            $a['Existencia']   = floatval($a['Existencia']);
            $a['Precio_Costo'] = floatval($a['Precio_Costo']);
            $a['Precio_Venta'] = floatval($a['Precio_Venta']);
            $a['Precio_Venta2']= floatval($a['Precio_Venta2']);
            $a['Precio_Venta3']= floatval($a['Precio_Venta3']);
            $a['Precio_Minimo']= floatval($a['Precio_Minimo']);
            $a['Iva']          = floatval($a['Iva']);
        }

        echo json_encode(["success" => true, "articulos" => $articulos], JSON_UNESCAPED_UNICODE);
        exit;
    }

    // POST: Crear factura
    $data = json_decode(file_get_contents("php://input"));

    if (!$data || empty($data->items)) {
        http_response_code(400);
        echo json_encode(["success" => false, "message" => "No hay productos en la factura"]);
        exit;
    }

    $db->beginTransaction();

    $tipo = $data->tipo ?? 'Contado';
    $dias = $data->dias ?? 0;
    $clienteId = $data->cliente_id ?? 130500;
    $clienteNombre = $data->cliente_nombre ?? 'VENTAS AL CONTADO';
    $clienteIdent = $data->cliente_identificacion ?? '0';
    $clienteDir = $data->cliente_direccion ?? '-';
    $clienteTel = $data->cliente_telefono ?? '0';
    $medioPago = $data->medio_pago ?? 0;
    $vendedor = $data->vendedor ?? 0;
    $descuentoGlobal = floatval($data->descuento_global ?? 0);
    $comentario = $data->comentario ?? '-';
    $efectivo = floatval($data->efectivo ?? 0);
    $valorPagado = floatval($data->valor_pagado ?? 0);
    $abono = floatval($data->abono ?? 0);

    // Calculate totals
    $subtotal = 0;
    $totalIva = 0;
    $totalDescuento = $descuentoGlobal;

    foreach ($data->items as $item) {
        $cant = floatval($item->cantidad);
        $precio = floatval($item->precio);
        $desc = floatval($item->descuento ?? 0);
        $iva = floatval($item->iva ?? 0);
        $lineaSubtotal = ($cant * $precio) - $desc;
        $lineaIva = $lineaSubtotal * ($iva / 100);
        $subtotal += $lineaSubtotal;
        $totalIva += $lineaIva;
        $totalDescuento += $desc;
    }

    $total = $subtotal + $totalIva;
    $saldo = $tipo === 'Contado' ? 0 : max($total - $abono, 0);
    $pagada = $tipo === 'Contado' ? '1' : ($saldo <= 0 ? '1' : '');
    $pago = $tipo === 'Contado' ? ($efectivo + $valorPagado) : $abono;
    $cambio = $tipo === 'Contado' ? max(($efectivo + $valorPagado) - $total, 0) : 0;

    $mesActual = date('n');
    $hora = date('H:i');

    // Insert factura (sin Factura_N — AUTO_INCREMENT lo genera)
    $stmt = $db->prepare("
        INSERT INTO tblventas (N_Mes, anio, Fecha, Tipo, Dias, CodigoCli, A_nombre,
            Identificacion, Direccion, Telefono, Impuesto, Descuento, Total, Saldo,
            EstadoPedido, Comentario, EstadoFact, Pago, Cambio, Hora, Id_Usuario,
            Abono, pagada, CodigoEmp, id_mediopago, efectivo, valorpagado1)
        VALUES (:mes, :anio, NOW(), :tipo, :dias, :cli, :nombre, :ident, :dir, :tel,
            :imp, :desc, :total, :saldo, 'Recibido', :com, 'Valida', :pago, :cambio, :hora,
            :usuario, :abono, :pagada, 0, :medio, :efectivo, :valorpagado)
    ");
    $stmt->execute([
        ':mes' => $mesActual, ':anio' => date('Y'),
        ':tipo' => $tipo, ':dias' => $dias, ':cli' => $clienteId,
        ':nombre' => $clienteNombre, ':ident' => $clienteIdent,
        ':dir' => $clienteDir, ':tel' => $clienteTel,
        ':imp' => $totalIva, ':desc' => $totalDescuento, ':total' => $total,
        ':saldo' => $saldo, ':com' => $comentario, ':pago' => $pago,
        ':cambio' => $cambio, ':hora' => $hora, ':usuario' => $vendedor,
        ':abono' => $abono, ':pagada' => $pagada, ':medio' => $medioPago,
        ':efectivo' => $efectivo, ':valorpagado' => $valorPagado
    ]);

    $factN = $db->lastInsertId();

    // Insert detail + update stock + kardex
    $stmtDetalle = $db->prepare("
        INSERT INTO tbldetalle_venta (Factura_N, Items, Cantidad, PrecioC, PrecioV, Impuesto, Subtotal, IVA, Descuento, Entregado)
        VALUES (:fact, :items, :cant, :pc, :pv, :imp, :sub, :iva, :desc, 'S')
    ");

    $stmtStock = $db->prepare("UPDATE tblarticulos SET Existencia = Existencia - :cant WHERE Items = :items");

    $meses = ['','Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
    $mesNombre = $meses[$mesActual] ?? '';

    $stmtKardex = $db->prepare("
        INSERT INTO tblkardex (Fecha, Mes, Items, Detalle, C_D, Cant_Ent, Cost_Ent, Cant_Sal, Cost_Sal, Cant_Saldo, Cost_Saldo, Cost_Unit)
        VALUES (NOW(), :mes, :items, :det, 2, 0, 0, :cant, :cost_sal, :saldo_cant, :saldo_cost, :cost_unit)
    ");

    foreach ($data->items as $item) {
        $itemId = intval($item->items);
        $cant = floatval($item->cantidad);
        $precioC = floatval($item->precio_costo);
        $precioV = floatval($item->precio);
        $desc = floatval($item->descuento ?? 0);
        $iva = floatval($item->iva ?? 0);
        $lineaSubtotal = ($cant * $precioV) - $desc;
        $lineaIva = $lineaSubtotal * ($iva / 100);

        $stmtDetalle->execute([
            ':fact' => $factN, ':items' => $itemId, ':cant' => $cant,
            ':pc' => $precioC, ':pv' => $precioV, ':imp' => $lineaIva,
            ':sub' => $lineaSubtotal, ':iva' => $iva, ':desc' => $desc
        ]);

        // Descontar inventario
        $stmtStock->execute([':cant' => $cant, ':items' => $itemId]);

        // Get new stock for kardex
        $stmtExist = $db->prepare("SELECT Existencia, Precio_Costo FROM tblarticulos WHERE Items = :id");
        $stmtExist->execute([':id' => $itemId]);
        $artActual = $stmtExist->fetch();
        $nuevaExist = floatval($artActual['Existencia']);
        $costoUnit = floatval($artActual['Precio_Costo']);

        $stmtKardex->execute([
            ':mes' => $mesNombre, ':items' => $itemId,
            ':det' => "Venta Fra. N° $factN",
            ':cant' => $cant, ':cost_sal' => $cant * $costoUnit,
            ':saldo_cant' => floatval($artActual['Existencia']), ':saldo_cost' => floatval($artActual['Existencia']) * $costoUnit,
            ':cost_unit' => $costoUnit
        ]);
    }

    $db->commit();

    echo json_encode([
        "success" => true,
        "message" => "Factura #$factN creada exitosamente",
        "Factura_N" => $factN,
        "Total" => $total,
        "Cambio" => $cambio
    ], JSON_UNESCAPED_UNICODE);

} catch(Exception $e) {
    if ($db->inTransaction()) $db->rollBack();
    http_response_code(500);
    echo json_encode(["success" => false, "message" => $e->getMessage()]);
}
?>
