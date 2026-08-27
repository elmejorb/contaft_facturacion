<?php
/**
 * POST /api/ordenes-compra/recibir
 * Convierte una OC 'Pendiente' en una compra real (tblpedidos), afectando
 * kardex y existencias. Marca la OC como 'Recibida' y vincula el pedido
 * generado en pedido_generado_n.
 *
 * Body: {
 *   id_oc, FacturaCompra_N, TipoPedido ('Contado'|'Credito'), Dias,
 *   Id_Usuario?, opcion_factura? (0=Nacional, 1=Importada),
 *   items_recibidos: [{ Items, Cantidad_Recibida }, ...] (por si difiere)
 * }
 *
 * Reglas:
 * - PrecioC, Iva, Descuento se toman del detalle de la OC (no se editan aquí).
 * - Si items_recibidos no se pasa, se asume que llega todo lo pedido.
 * - Actualiza tblarticulos.Existencia, Precio_Costo, Precio_CostoComp.
 * - Inserta en tblkardex.
 * - No genera egreso automático (V2) — el operador registra el pago aparte.
 */
require_once '../config/database.php';
$db = (new Database())->getConnection();

try {
    $data = json_decode(file_get_contents('php://input'), true);
    if (!$data) { echo json_encode(['success' => false, 'message' => 'Body inválido']); exit; }

    $idOc          = intval($data['id_oc'] ?? 0);
    $facturaCompra = trim($data['FacturaCompra_N'] ?? '');
    $tipoPedido    = trim($data['TipoPedido'] ?? 'Contado');
    $dias          = intval($data['Dias'] ?? 0);
    $idUsuario     = intval($data['Id_Usuario'] ?? 0) ?: null;
    $opcionFactura = intval($data['opcion_factura'] ?? 0);
    $itemsRecib    = $data['items_recibidos'] ?? null; // opcional

    if ($idOc <= 0 || $facturaCompra === '') {
        echo json_encode(['success' => false, 'message' => 'id_oc y FacturaCompra_N obligatorios']);
        exit;
    }

    $db->beginTransaction();

    // Cargar cabecera OC
    $stmt = $db->prepare("SELECT * FROM tbl_ordenes_compra WHERE id_oc = ? FOR UPDATE");
    $stmt->execute([$idOc]);
    $oc = $stmt->fetch();
    if (!$oc) throw new Exception('Orden no encontrada');
    if ($oc['Estado'] === 'Recibida' || $oc['Estado'] === 'Anulada') {
        throw new Exception("OC en estado {$oc['Estado']} — no se puede recibir");
    }

    // Cargar líneas OC
    $stmt = $db->prepare("SELECT * FROM tbl_detalle_orden_compra WHERE id_oc = ?");
    $stmt->execute([$idOc]);
    $lineas = $stmt->fetchAll();
    if (empty($lineas)) throw new Exception('La OC no tiene líneas');

    // Mapa de cantidades recibidas si vino ajuste
    $mapRecib = [];
    if (is_array($itemsRecib)) {
        foreach ($itemsRecib as $r) {
            if (isset($r['Items'])) $mapRecib[intval($r['Items'])] = floatval($r['Cantidad_Recibida'] ?? 0);
        }
    }

    // Recalcular totales según lo realmente recibido
    $subtotal = 0;
    $impuesto = 0;
    foreach ($lineas as &$l) {
        $items = intval($l['Items']);
        $cantPed = floatval($l['Cantidad']);
        $cantRec = isset($mapRecib[$items]) ? min($mapRecib[$items], $cantPed) : $cantPed;
        $l['Cantidad_Recibida_calc'] = $cantRec;
        $sub = $cantRec * floatval($l['PrecioC']) - floatval($l['Descuento']);
        $subtotal += $sub;
        $impuesto += $sub * floatval($l['Iva']) / 100;
    }
    unset($l);
    $descuento = floatval($oc['Descuento']);
    $flete     = floatval($oc['Flete']);
    $retencion = floatval($oc['Retencion']);
    $totalCompra = $subtotal + $impuesto - $descuento + $flete - $retencion;
    $saldo = $tipoPedido === 'Contado' ? 0 : $totalCompra;

    $fecha = date('Y-m-d');
    $mesNum = intval(date('n'));
    $anio = intval(date('Y'));
    $mesesEsp = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
    $mesNombre = $mesesEsp[$mesNum - 1];

    // 1) Insertar cabecera en tblpedidos (compra real)
    $stmt = $db->prepare("
        INSERT INTO tblpedidos (FacturaCompra_N, N_Mes, anio, Fecha, TipoPedido, Dias, CodigoPro,
            Impuesto, Descuento, Flete, Total, Saldo, EstadoPedido, Comentario, Retencion, opcion_factura)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Recibido', ?, ?, ?)
    ");
    $comentario = 'Recibido de ' . $oc['numero_oc'] . ' | ' . ($oc['Comentario'] ?? '');
    $stmt->execute([
        $facturaCompra, $mesNum, $anio, $fecha, $tipoPedido, $dias, intval($oc['CodigoPro']),
        $impuesto, $descuento, $flete, $totalCompra, $saldo,
        $comentario, $retencion, $opcionFactura,
    ]);
    $pedidoN = intval($db->lastInsertId());

    // 2) Insertar líneas en tbldetalle_pedido + actualizar stock + kardex
    $stmtLineaPed = $db->prepare("
        INSERT INTO tbldetalle_pedido
            (Pedido_N, Items, Cantidad, PrecioC, PrecioV, Impuesto, Subtotal,
             IvaPct, CostoSinIva, CostoConIva, FleteUnit, CostoFinal, CostoAnterior, CostoPromedio)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ");
    $stmtArt = $db->prepare("SELECT Existencia, Precio_Costo, Precio_Venta FROM tblarticulos WHERE Items = ?");
    $stmtUpdArt = $db->prepare("UPDATE tblarticulos SET Existencia = ?, Precio_Costo = ?, Precio_CostoComp = ? WHERE Items = ?");
    $stmtKardex = $db->prepare("
        INSERT INTO tblkardex (Fecha, Mes, Items, Detalle, C_D, Cant_Ent, Cost_Ent, Cant_Sal, Cost_Sal, Cant_Saldo, Cost_Saldo, Cost_Unit)
        VALUES (?, ?, ?, ?, 1, ?, ?, 0, 0, ?, ?, ?)
    ");
    $stmtUpdDetOC = $db->prepare("UPDATE tbl_detalle_orden_compra SET Cantidad_Recibida = ? WHERE id_oc = ? AND Items = ?");

    foreach ($lineas as $l) {
        $items    = intval($l['Items']);
        $cant     = floatval($l['Cantidad_Recibida_calc']);
        if ($cant <= 0) continue;
        $precioC  = floatval($l['PrecioC']);   // asumido CON IVA (patrón desktop)
        $ivaPct   = floatval($l['Iva']);
        $descLn   = floatval($l['Descuento']);
        $sub      = $cant * $precioC - $descLn;
        $ivaVal   = $precioC * $ivaPct / 100;
        $costoSinIva  = $ivaPct > 0 ? $precioC / (1 + $ivaPct / 100) : $precioC;
        $costoConIva  = $precioC;

        // Estado actual del artículo
        $stmtArt->execute([$items]);
        $art = $stmtArt->fetch();
        if (!$art) continue;
        $existenciaAct = floatval($art['Existencia']);
        $costoAct      = floatval($art['Precio_Costo']);
        $precioVenta   = floatval($art['Precio_Venta']);

        $nuevaExist    = $existenciaAct + $cant;
        // Promedio ponderado con IVA
        $costoPromedio = $nuevaExist > 0
            ? (($existenciaAct * $costoAct) + ($cant * $costoConIva)) / $nuevaExist
            : $costoConIva;

        // detalle_pedido
        $stmtLineaPed->execute([
            $pedidoN, $items, $cant, $costoConIva, $precioVenta, $ivaVal * $cant, $sub,
            $ivaPct, $costoSinIva, $costoConIva, 0, $costoConIva, $costoAct, $costoPromedio,
        ]);

        // artículo
        $stmtUpdArt->execute([$nuevaExist, $costoPromedio, $costoConIva, $items]);

        // kardex (sin IVA para consistencia con el resto)
        $stmtKardex->execute([
            $fecha, $mesNombre, $items,
            "Recibido de {$oc['numero_oc']} → Ped. $pedidoN Fac. $facturaCompra",
            $cant, $cant * $costoSinIva,
            $nuevaExist, $nuevaExist * ($ivaPct > 0 ? $costoPromedio / (1 + $ivaPct / 100) : $costoPromedio),
            $ivaPct > 0 ? $costoPromedio / (1 + $ivaPct / 100) : $costoPromedio,
        ]);

        // marcar cantidad recibida en la OC
        $stmtUpdDetOC->execute([$cant, $idOc, $items]);
    }

    // 3) Marcar OC como Recibida (o Parcial si algún ítem quedó < cantidad pedida)
    $stmt = $db->prepare("
        SELECT COUNT(*) FROM tbl_detalle_orden_compra
        WHERE id_oc = ? AND Cantidad_Recibida < Cantidad
    ");
    $stmt->execute([$idOc]);
    $incompletos = intval($stmt->fetchColumn());
    $nuevoEstado = $incompletos > 0 ? 'Parcial' : 'Recibida';

    $db->prepare("
        UPDATE tbl_ordenes_compra
        SET Estado = ?, pedido_generado_n = ?, FechaMod = NOW()
        WHERE id_oc = ?
    ")->execute([$nuevoEstado, $pedidoN, $idOc]);

    $db->commit();

    echo json_encode([
        'success'      => true,
        'pedido_n'     => $pedidoN,
        'oc_estado'    => $nuevoEstado,
        'total_compra' => $totalCompra,
    ], JSON_UNESCAPED_UNICODE);

} catch (Exception $e) {
    if ($db->inTransaction()) $db->rollBack();
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => $e->getMessage()]);
}
