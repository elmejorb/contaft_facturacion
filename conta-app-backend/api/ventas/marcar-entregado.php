<?php
/**
 * Marcar línea pendiente como ENTREGADA (modo Fabricación v4.7)
 * Descuenta inventario con la fecha de entrega indicada + asiento kardex.
 *
 * POST {
 *   origen: 'POS' | 'FE',
 *   id_detalle: int,         // tbldetalle_venta.Id_DetallePedido | detalle_document_electronic.id_detalle_document
 *   fecha_entrega: 'YYYY-MM-DD HH:mm:ss',  // editable por el user (default hoy)
 *   usuario_id: int
 * }
 */
require_once '../config/database.php';

$db = (new Database())->getConnection();

try {
    $data = json_decode(file_get_contents('php://input'), true);
    $origen = $data['origen'] ?? 'POS';
    $idDetalle = intval($data['id_detalle'] ?? 0);
    $fechaEntrega = $data['fecha_entrega'] ?? date('Y-m-d H:i:s');
    $usuarioId = intval($data['usuario_id'] ?? 0);
    // v4.7.1: cantidad parcial a entregar en este movimiento.
    // Si no viene, se interpreta como "entregar TODO lo pendiente".
    $cantidadAEntregarInput = isset($data['cantidad_a_entregar']) ? floatval($data['cantidad_a_entregar']) : null;

    if (!$idDetalle) {
        echo json_encode(['success' => false, 'message' => 'id_detalle requerido']);
        exit;
    }

    // Validar formato fecha
    if (!preg_match('/^\d{4}-\d{2}-\d{2}( \d{2}:\d{2}:\d{2})?$/', $fechaEntrega)) {
        $fechaEntrega = date('Y-m-d H:i:s');
    } elseif (strlen($fechaEntrega) === 10) {
        $fechaEntrega .= ' ' . date('H:i:s');
    }

    $db->beginTransaction();

    if ($origen === 'FE') {
        // ---- FE ----
        $stmt = $db->prepare("
            SELECT d.*, a.Codigo, a.Nombres_Articulo, a.Precio_Costo, a.Existencia
            FROM detalle_document_electronic d
            LEFT JOIN tblarticulos a ON a.Items = d.items
            WHERE d.id_detalle_document = ?
        ");
        $stmt->execute([$idDetalle]);
        $det = $stmt->fetch();
        if (!$det) { $db->rollBack(); echo json_encode(['success'=>false,'message'=>'Línea FE no encontrada']); exit; }

        $cantTotal     = floatval($det['invoiced_quantity']);
        $cantYaEntregada = floatval($det['cantidad_entregada'] ?? 0);
        $cantFaltante  = $cantTotal - $cantYaEntregada;
        if ($cantFaltante <= 0) {
            $db->rollBack();
            echo json_encode(['success'=>false,'message'=>'Esta línea ya está entregada completamente']); exit;
        }
        // Cantidad a entregar: default = todo lo faltante. Si viene parámetro,
        // tope al faltante (no se puede entregar más de lo que falta).
        $cantAEntregar = $cantidadAEntregarInput !== null
            ? min(max($cantidadAEntregarInput, 0), $cantFaltante)
            : $cantFaltante;
        if ($cantAEntregar <= 0) {
            $db->rollBack();
            echo json_encode(['success'=>false,'message'=>'La cantidad a entregar debe ser mayor que 0']); exit;
        }
        $nuevaCantEntregada = $cantYaEntregada + $cantAEntregar;
        $completaEntrega    = $nuevaCantEntregada >= $cantTotal;

        $stNum = $db->prepare("SELECT prefix, number FROM electronic_documents WHERE id = ?");
        $stNum->execute([$det['factura_n']]);
        $ed = $stNum->fetch();
        $refFE = $ed ? ($ed['prefix'] ?? 'FCON') . $ed['number'] : "FE-{$det['factura_n']}";

        if ($det['Items'] && $cantAEntregar > 0) {
            $db->prepare("UPDATE tblarticulos SET Existencia = Existencia - ? WHERE Items = ?")
               ->execute([$cantAEntregar, $det['Items']]);

            $exi = $db->prepare("SELECT Existencia, Precio_Costo FROM tblarticulos WHERE Items = ?");
            $exi->execute([$det['Items']]);
            $a = $exi->fetch();
            if ($a) {
                $costo = floatval($a['Precio_Costo']);
                $existAct = floatval($a['Existencia']);
                $meses = ['','Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
                $mesNom = $meses[intval(date('n', strtotime($fechaEntrega)))] ?? '';
                $notaDet = $completaEntrega
                    ? "Entrega FE $refFE (completa)"
                    : "Entrega parcial FE $refFE ($cantAEntregar de $cantTotal)";
                $db->prepare("
                    INSERT INTO tblkardex (Fecha, Mes, Items, Detalle, C_D, Cant_Ent, Cost_Ent, Cant_Sal, Cost_Sal, Cant_Saldo, Cost_Saldo, Cost_Unit)
                    VALUES (?, ?, ?, ?, 2, 0, 0, ?, ?, ?, ?, ?)
                ")->execute([
                    $fechaEntrega, $mesNom, $det['Items'], $notaDet,
                    $cantAEntregar, $cantAEntregar * $costo, $existAct, $existAct * $costo, $costo
                ]);
            }
        }

        // Actualizar línea: acumular cantidad_entregada, marcar entregado si completa
        $nuevoEntregado = $completaEntrega ? 'S' : 'N';
        $db->prepare("UPDATE detalle_document_electronic SET entregado = ?, cantidad_entregada = ?, fecha_entrega = ?, usuario_entrego = ? WHERE id_detalle_document = ?")
           ->execute([$nuevoEntregado, $nuevaCantEntregada, $fechaEntrega, $usuarioId ?: null, $idDetalle]);

    } else {
        // ---- POS ----
        $stmt = $db->prepare("
            SELECT d.*, a.Codigo, a.Nombres_Articulo, a.Precio_Costo
            FROM tbldetalle_venta d
            LEFT JOIN tblarticulos a ON a.Items = d.Items
            WHERE d.Id_DetalleVenta = ?
        ");
        $stmt->execute([$idDetalle]);
        $det = $stmt->fetch();
        if (!$det) { $db->rollBack(); echo json_encode(['success'=>false,'message'=>'Línea POS no encontrada']); exit; }

        $cantTotal       = floatval($det['Cantidad']);
        $cantYaEntregada = floatval($det['CantidadEntregada'] ?? 0);
        $cantFaltante    = $cantTotal - $cantYaEntregada;
        if ($cantFaltante <= 0) {
            $db->rollBack();
            echo json_encode(['success'=>false,'message'=>'Esta línea ya está entregada completamente']); exit;
        }
        $cantAEntregar = $cantidadAEntregarInput !== null
            ? min(max($cantidadAEntregarInput, 0), $cantFaltante)
            : $cantFaltante;
        if ($cantAEntregar <= 0) {
            $db->rollBack();
            echo json_encode(['success'=>false,'message'=>'La cantidad a entregar debe ser mayor que 0']); exit;
        }
        $nuevaCantEntregada = $cantYaEntregada + $cantAEntregar;
        $completaEntrega    = $nuevaCantEntregada >= $cantTotal;
        $factN = intval($det['Factura_N']);

        if ($det['Items'] && $cantAEntregar > 0) {
            $db->prepare("UPDATE tblarticulos SET Existencia = Existencia - ? WHERE Items = ?")
               ->execute([$cantAEntregar, $det['Items']]);

            $exi = $db->prepare("SELECT Existencia, Precio_Costo FROM tblarticulos WHERE Items = ?");
            $exi->execute([$det['Items']]);
            $a = $exi->fetch();
            if ($a) {
                $costo = floatval($a['Precio_Costo']);
                $existAct = floatval($a['Existencia']);
                $meses = ['','Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
                $mesNom = $meses[intval(date('n', strtotime($fechaEntrega)))] ?? '';
                $notaDet = $completaEntrega
                    ? "Entrega Fra. N° $factN (completa)"
                    : "Entrega parcial Fra. N° $factN ($cantAEntregar de $cantTotal)";
                $db->prepare("
                    INSERT INTO tblkardex (Fecha, Mes, Items, Detalle, C_D, Cant_Ent, Cost_Ent, Cant_Sal, Cost_Sal, Cant_Saldo, Cost_Saldo, Cost_Unit)
                    VALUES (?, ?, ?, ?, 2, 0, 0, ?, ?, ?, ?, ?)
                ")->execute([
                    $fechaEntrega, $mesNom, $det['Items'], $notaDet,
                    $cantAEntregar, $cantAEntregar * $costo, $existAct, $existAct * $costo, $costo
                ]);
            }
        }

        $nuevoEntregado = $completaEntrega ? 'S' : 'N';
        $db->prepare("UPDATE tbldetalle_venta SET Entregado = ?, CantidadEntregada = ?, FechaEntrega = ?, UsuarioEntrego = ? WHERE Id_DetalleVenta = ?")
           ->execute([$nuevoEntregado, $nuevaCantEntregada, $fechaEntrega, $usuarioId ?: null, $idDetalle]);
    }

    $db->commit();
    echo json_encode([
        'success' => true,
        'message' => isset($completaEntrega) && $completaEntrega
            ? 'Entrega completada'
            : "Entrega parcial registrada ($cantAEntregar unidades)",
        'fecha_entrega' => $fechaEntrega,
        'cantidad_entregada_hoy' => $cantAEntregar ?? 0,
        'cantidad_total_entregada' => $nuevaCantEntregada ?? 0,
        'completa' => $completaEntrega ?? false,
    ], JSON_UNESCAPED_UNICODE);

} catch (Exception $e) {
    if ($db->inTransaction()) $db->rollBack();
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => $e->getMessage()]);
}
?>
