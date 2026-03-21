<?php
/**
 * Compras / Pedidos
 * GET ?buscar=texto → buscar artículos
 * GET ?proveedores=1 → listar proveedores
 * POST → crear compra
 */
require_once '../config/database.php';
$database = new Database();
$db = $database->getConnection();

try {
    if ($_SERVER['REQUEST_METHOD'] === 'GET') {
        // Buscar artículos
        if (isset($_GET['buscar'])) {
            $q = $_GET['buscar'];
            $stmt = $db->prepare("
                SELECT a.Items, a.Codigo, a.Nombres_Articulo, a.Existencia, a.Precio_Costo,
                       a.Precio_CostoComp, a.Precio_Venta, a.Iva, a.Flete,
                       COALESCE(c.Categoria, 'VARIOS') as Categoria
                FROM tblarticulos a
                LEFT JOIN tblcategoria c ON a.Id_Categoria = c.Id_Categoria
                WHERE a.Estado = 1 AND (a.Codigo LIKE :cod OR a.Nombres_Articulo LIKE :nom)
                ORDER BY a.Nombres_Articulo LIMIT 20
            ");
            $like = "%$q%";
            $stmt->execute([':cod' => $like, ':nom' => $like]);
            $arts = $stmt->fetchAll();
            foreach ($arts as &$a) {
                $a['Existencia'] = floatval($a['Existencia']);
                $a['Precio_Costo'] = floatval($a['Precio_Costo']);
                $a['Precio_CostoComp'] = floatval($a['Precio_CostoComp']);
                $a['Precio_Venta'] = floatval($a['Precio_Venta']);
                $a['Iva'] = floatval($a['Iva']);
                $a['Flete'] = floatval($a['Flete']);
            }
            echo json_encode(['success' => true, 'articulos' => $arts], JSON_UNESCAPED_UNICODE);
            exit;
        }

        // Listar proveedores
        if (isset($_GET['proveedores'])) {
            $stmt = $db->query("SELECT CodigoPro, RazonSocial, Nit FROM tblproveedores ORDER BY RazonSocial");
            echo json_encode(['success' => true, 'proveedores' => $stmt->fetchAll()], JSON_UNESCAPED_UNICODE);
            exit;
        }

        // Next pedido number
        $stmt = $db->query("SELECT COALESCE(MAX(Pedido_N), 0) + 1 as next FROM tblpedidos");
        echo json_encode(['success' => true, 'next_pedido' => $stmt->fetch()['next']]);
        exit;
    }

    // POST: Crear compra
    $data = json_decode(file_get_contents('php://input'), true);
    if (!$data || empty($data['items'])) {
        echo json_encode(['success' => false, 'message' => 'No hay productos']);
        exit;
    }

    $db->beginTransaction();

    $tipoPedido = $data['tipo'] ?? 'Crédito';
    $dias = intval($data['dias'] ?? 30);
    $codigoPro = intval($data['proveedor_id'] ?? 0);
    $facturaCompra = $data['factura_compra'] ?? '';
    $flete = floatval($data['flete'] ?? 0);
    $descuento = floatval($data['descuento'] ?? 0);
    $retencion = floatval($data['retencion'] ?? 0);
    $comentario = $data['comentario'] ?? '-';
    $opcionFactura = intval($data['opcion_factura'] ?? 0); // 0=sin IVA guardar con IVA, 1=con IVA

    // Calculate total
    $totalItems = 0;
    $totalImpuesto = 0;
    foreach ($data['items'] as $item) {
        $cant = floatval($item['cantidad']);
        $costoSinIva = floatval($item['costo_sin_iva']);
        $ivaPct = floatval($item['iva_pct'] ?? 0);
        $ivaVal = $costoSinIva * ($ivaPct / 100);
        $subtotal = $cant * ($costoSinIva + $ivaVal);
        $totalItems += $subtotal;
        $totalImpuesto += $cant * $ivaVal;
    }
    $totalCompra = $totalItems + $flete - $descuento;
    $saldo = $tipoPedido === 'Contado' ? 0 : $totalCompra;

    // Distribute flete proportionally
    $fleteMap = [];
    if ($flete > 0 && $totalItems > 0) {
        foreach ($data['items'] as $i => $item) {
            $cant = floatval($item['cantidad']);
            $costoSinIva = floatval($item['costo_sin_iva']);
            $ivaPct = floatval($item['iva_pct'] ?? 0);
            $subtotal = $cant * ($costoSinIva * (1 + $ivaPct / 100));
            $proporcion = $subtotal / $totalItems;
            $fleteItem = ($flete * $proporcion) / $cant;
            $fleteMap[$i] = round($fleteItem, 4);
        }
    }

    // Insert pedido header
    $stmt = $db->prepare("
        INSERT INTO tblpedidos (FacturaCompra_N, N_Mes, anio, Fecha, TipoPedido, Dias, CodigoPro,
            Impuesto, Descuento, Flete, Total, Saldo, EstadoPedido, Comentario, Retencion, opcion_factura)
        VALUES (?, ?, ?, NOW(), ?, ?, ?, ?, ?, ?, ?, ?, 'Recibido', ?, ?, ?)
    ");
    $stmt->execute([
        $facturaCompra, date('n'), date('Y'), $tipoPedido, $dias, $codigoPro,
        $totalImpuesto, $descuento, $flete, $totalCompra, $saldo,
        $comentario, $retencion, $opcionFactura
    ]);
    $pedidoN = $db->lastInsertId();

    // Insert details + update stock + kardex
    $meses = ['','Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
    $mesNombre = $meses[intval(date('n'))] ?? '';

    foreach ($data['items'] as $i => $item) {
        $itemId = intval($item['items']);
        $cant = floatval($item['cantidad']);
        $costoSinIva = floatval($item['costo_sin_iva']);
        $ivaPct = floatval($item['iva_pct'] ?? 0);
        $ivaVal = $costoSinIva * ($ivaPct / 100);
        $costoConIva = $costoSinIva + $ivaVal;
        $fleteUnit = $fleteMap[$i] ?? 0;
        $costoFinal = $costoSinIva + $fleteUnit; // Costo sin IVA + flete (para guardar como Precio_Costo)
        $precioVenta = floatval($item['precio_venta'] ?? 0);
        $subtotal = $cant * $costoConIva;

        // Get current stock and cost for averaging
        $stmtArt = $db->prepare("SELECT Existencia, Precio_Costo FROM tblarticulos WHERE Items = ?");
        $stmtArt->execute([$itemId]);
        $artActual = $stmtArt->fetch();
        $existAnt = floatval($artActual['Existencia']);
        $costoAnt = floatval($artActual['Precio_Costo']);

        // Weighted average cost
        $nuevaExist = $existAnt + $cant;
        $costoPromedio = $nuevaExist > 0
            ? round(($existAnt * $costoAnt + $cant * $costoFinal) / $nuevaExist, 4)
            : $costoFinal;

        // Insert detail
        $stmtDet = $db->prepare("
            INSERT INTO tbldetalle_pedido (Pedido_N, Items, Cantidad, PrecioC, PrecioV, Impuesto, Subtotal,
                IvaPct, CostoSinIva, CostoConIva, FleteUnit, CostoFinal, CostoAnterior, CostoPromedio)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ");
        $stmtDet->execute([
            $pedidoN, $itemId, $cant, $costoFinal, $precioVenta, $ivaVal * $cant, $subtotal,
            $ivaPct, $costoSinIva, $costoConIva, $fleteUnit, $costoFinal, $costoAnt, $costoPromedio
        ]);

        // Update stock and cost
        $db->prepare("UPDATE tblarticulos SET Existencia = ?, Precio_Costo = ?, Precio_CostoComp = ? WHERE Items = ?")
           ->execute([$nuevaExist, $costoPromedio, $costoConIva, $itemId]);

        // Kardex entry (entrada)
        $db->prepare("
            INSERT INTO tblkardex (Fecha, Mes, Items, Detalle, C_D, Cant_Ent, Cost_Ent, Cant_Sal, Cost_Sal, Cant_Saldo, Cost_Saldo, Cost_Unit)
            VALUES (NOW(), ?, ?, ?, 1, ?, ?, 0, 0, ?, ?, ?)
        ")->execute([
            $mesNombre, $itemId, "Compra Ped. N° $pedidoN Fac. $facturaCompra",
            $cant, $cant * $costoFinal, $nuevaExist, $nuevaExist * $costoPromedio, $costoPromedio
        ]);
    }

    // If credit, create/update provider invoice record
    if ($tipoPedido !== 'Contado' && $saldo > 0) {
        $db->prepare("
            INSERT INTO tblfacturasanterioresproveedor (FacturaN, Fecha, Dias, Descuento, IVA, Subtotal, Valor, Saldo, CodigoProv)
            VALUES (?, NOW(), ?, ?, ?, ?, ?, ?, ?)
        ")->execute([
            $facturaCompra, $dias, $descuento, $totalImpuesto,
            $totalItems, $totalCompra, $saldo, $codigoPro
        ]);
    }

    $db->commit();

    echo json_encode([
        'success' => true,
        'message' => "Compra #$pedidoN registrada. Factura: $facturaCompra",
        'Pedido_N' => $pedidoN,
        'Total' => $totalCompra
    ], JSON_UNESCAPED_UNICODE);

} catch (Exception $e) {
    if ($db->inTransaction()) $db->rollBack();
    echo json_encode(['success' => false, 'message' => $e->getMessage()]);
}
?>
