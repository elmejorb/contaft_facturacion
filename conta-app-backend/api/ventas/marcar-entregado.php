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
        if (($det['entregado'] ?? 'S') === 'S') {
            $db->rollBack();
            echo json_encode(['success'=>false,'message'=>'Esta línea ya está entregada']); exit;
        }

        // Número DIAN de la FE para el detalle del kardex
        $stNum = $db->prepare("SELECT prefix, number FROM electronic_documents WHERE id = ?");
        $stNum->execute([$det['factura_n']]);
        $ed = $stNum->fetch();
        $refFE = $ed ? ($ed['prefix'] ?? 'FCON') . $ed['number'] : "FE-{$det['factura_n']}";
        $cant = floatval($det['invoiced_quantity']);

        // Descontar stock + kardex con fecha de entrega
        if ($det['Items'] && $cant > 0) {
            $db->prepare("UPDATE tblarticulos SET Existencia = Existencia - ? WHERE Items = ?")
               ->execute([$cant, $det['Items']]);

            $exi = $db->prepare("SELECT Existencia, Precio_Costo FROM tblarticulos WHERE Items = ?");
            $exi->execute([$det['Items']]);
            $a = $exi->fetch();
            if ($a) {
                $costo = floatval($a['Precio_Costo']);
                $existAct = floatval($a['Existencia']);
                $meses = ['','Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
                $mesNom = $meses[intval(date('n', strtotime($fechaEntrega)))] ?? '';
                $db->prepare("
                    INSERT INTO tblkardex (Fecha, Mes, Items, Detalle, C_D, Cant_Ent, Cost_Ent, Cant_Sal, Cost_Sal, Cant_Saldo, Cost_Saldo, Cost_Unit)
                    VALUES (?, ?, ?, ?, 2, 0, 0, ?, ?, ?, ?, ?)
                ")->execute([
                    $fechaEntrega, $mesNom, $det['Items'],
                    "Entrega FE $refFE (fabricación)",
                    $cant, $cant * $costo, $existAct, $existAct * $costo, $costo
                ]);
            }
        }

        // Marcar línea como entregada
        $db->prepare("UPDATE detalle_document_electronic SET entregado = 'S', fecha_entrega = ?, usuario_entrego = ? WHERE id_detalle_document = ?")
           ->execute([$fechaEntrega, $usuarioId ?: null, $idDetalle]);

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
        if (($det['Entregado'] ?? 'S') === 'S') {
            $db->rollBack();
            echo json_encode(['success'=>false,'message'=>'Esta línea ya está entregada']); exit;
        }

        $cant = floatval($det['Cantidad']);
        $factN = intval($det['Factura_N']);

        if ($det['Items'] && $cant > 0) {
            $db->prepare("UPDATE tblarticulos SET Existencia = Existencia - ? WHERE Items = ?")
               ->execute([$cant, $det['Items']]);

            $exi = $db->prepare("SELECT Existencia, Precio_Costo FROM tblarticulos WHERE Items = ?");
            $exi->execute([$det['Items']]);
            $a = $exi->fetch();
            if ($a) {
                $costo = floatval($a['Precio_Costo']);
                $existAct = floatval($a['Existencia']);
                $meses = ['','Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
                $mesNom = $meses[intval(date('n', strtotime($fechaEntrega)))] ?? '';
                $db->prepare("
                    INSERT INTO tblkardex (Fecha, Mes, Items, Detalle, C_D, Cant_Ent, Cost_Ent, Cant_Sal, Cost_Sal, Cant_Saldo, Cost_Saldo, Cost_Unit)
                    VALUES (?, ?, ?, ?, 2, 0, 0, ?, ?, ?, ?, ?)
                ")->execute([
                    $fechaEntrega, $mesNom, $det['Items'],
                    "Entrega Fra. N° $factN (fabricación)",
                    $cant, $cant * $costo, $existAct, $existAct * $costo, $costo
                ]);
            }
        }

        $db->prepare("UPDATE tbldetalle_venta SET Entregado = 'S', FechaEntrega = ?, UsuarioEntrego = ? WHERE Id_DetalleVenta = ?")
           ->execute([$fechaEntrega, $usuarioId ?: null, $idDetalle]);
    }

    $db->commit();
    echo json_encode([
        'success' => true,
        'message' => 'Línea marcada como entregada',
        'fecha_entrega' => $fechaEntrega,
    ], JSON_UNESCAPED_UNICODE);

} catch (Exception $e) {
    if ($db->inTransaction()) $db->rollBack();
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => $e->getMessage()]);
}
?>
