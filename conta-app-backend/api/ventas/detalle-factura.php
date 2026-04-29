<?php
/**
 * Detalle de factura + edición + devolución + anulación
 * GET ?id=N → datos completos de la factura
 * POST action=editar → editar cliente/fecha/tipo
 * POST action=devolucion → devolver productos
 * POST action=anular → anular factura completa
 */
require_once '../config/database.php';
$database = new Database();
$db = $database->getConnection();

try {
    if ($_SERVER['REQUEST_METHOD'] === 'GET') {
        $id = intval($_GET['id'] ?? 0);
        if (!$id) { echo json_encode(['success' => false, 'message' => 'ID requerido']); exit; }

        // Factura
        $stmt = $db->prepare("
            SELECT v.*, u.Nombre as NombreUsuario,
                   CASE v.id_mediopago WHEN 0 THEN 'Efectivo' WHEN 1 THEN 'Tarjeta' WHEN 2 THEN 'Bancolombia' WHEN 3 THEN 'Nequi' ELSE 'Otro' END as MedioPago
            FROM tblventas v
            LEFT JOIN tblusuarios u ON v.Id_Usuario = u.Id_Usuario
            WHERE v.Factura_N = ?
        ");
        $stmt->execute([$id]);
        $factura = $stmt->fetch();
        if (!$factura) { echo json_encode(['success' => false, 'message' => 'Factura no encontrada']); exit; }

        // Items con nombre del artículo
        $stmt2 = $db->prepare("
            SELECT d.*, a.Codigo, a.Nombres_Articulo, a.Existencia, a.Precio_Costo
            FROM tbldetalle_venta d
            LEFT JOIN tblarticulos a ON d.Items = a.Items
            WHERE d.Factura_N = ?
            ORDER BY d.Id_DetalleVenta
        ");
        $stmt2->execute([$id]);
        $items = $stmt2->fetchAll();

        // Pagos realizados a esta factura (busca por Fact_N y NFactAnt)
        $stmt3 = $db->prepare("SELECT * FROM tblpagos WHERE (Fact_N = ? OR NFactAnt = ?) AND Estado = 'Valida' ORDER BY Fecha");
        $stmt3->execute([$id, strval($id)]);
        $pagos = $stmt3->fetchAll();

        // Devoluciones
        $stmt4 = $db->prepare("
            SELECT dv.*, d.Items, a.Nombres_Articulo, d.PrecioV
            FROM tbldevolucion_ventas dv
            INNER JOIN tbldetalle_venta d ON dv.Id_DetalleVenta = d.Id_DetalleVenta
            LEFT JOIN tblarticulos a ON d.Items = a.Items
            WHERE d.Factura_N = ?
        ");
        $stmt4->execute([$id]);
        $devoluciones = $stmt4->fetchAll();

        // Puede editar si no tiene pagos ni devoluciones
        $puedeEditar = count($pagos) === 0 && count($devoluciones) === 0 && $factura['EstadoFact'] === 'Valida';

        echo json_encode([
            'success' => true,
            'factura' => $factura,
            'items' => $items,
            'pagos' => $pagos,
            'devoluciones' => $devoluciones,
            'puede_editar' => $puedeEditar,
            'total_pagos' => array_sum(array_column($pagos, 'ValorPago')),
            'total_devoluciones' => array_sum(array_column($devoluciones, 'valor_dev'))
        ], JSON_UNESCAPED_UNICODE);

    } elseif ($_SERVER['REQUEST_METHOD'] === 'POST') {
        $data = json_decode(file_get_contents('php://input'), true);
        $action = $data['action'] ?? '';
        $factN = intval($data['factura_n'] ?? 0);

        if ($action === 'editar') {
            // Verificar que se puede editar
            $stmt = $db->prepare("SELECT COUNT(*) as c FROM tblpagos WHERE Fact_N = ? AND Estado = 'Valida'");
            $stmt->execute([$factN]);
            if ($stmt->fetch()['c'] > 0) {
                echo json_encode(['success' => false, 'message' => 'No se puede editar: tiene pagos registrados']);
                exit;
            }

            $stmt = $db->prepare("
                UPDATE tblventas SET
                    CodigoCli = ?, A_nombre = ?, Identificacion = ?, Direccion = ?, Telefono = ?,
                    Tipo = ?, Dias = ?, Fecha = ?
                WHERE Factura_N = ? AND EstadoFact = 'Valida'
            ");
            $stmt->execute([
                $data['cliente_id'], $data['cliente_nombre'], $data['identificacion'],
                $data['direccion'], $data['telefono'],
                $data['tipo'], intval($data['dias'] ?? 0), $data['fecha'],
                $factN
            ]);

            // Si cambió a contado, poner saldo en 0
            if ($data['tipo'] === 'Contado') {
                $db->prepare("UPDATE tblventas SET Saldo = 0, pagada = '1' WHERE Factura_N = ?")->execute([$factN]);
            }

            echo json_encode(['success' => true, 'message' => 'Factura actualizada']);

        } elseif ($action === 'devolucion') {
            $items = $data['items'] ?? []; // [{id_detalle, cant_devolver}]
            if (empty($items)) { echo json_encode(['success' => false, 'message' => 'No hay items para devolver']); exit; }

            $db->beginTransaction();
            $totalDevuelto = 0;

            $meses = ['','Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];

            foreach ($items as $item) {
                $idDetalle = intval($item['id_detalle']);
                $cantDev = floatval($item['cant_devolver']);
                if ($cantDev <= 0) continue;

                // Get current detail
                $stmt = $db->prepare("SELECT * FROM tbldetalle_venta WHERE Id_DetalleVenta = ?");
                $stmt->execute([$idDetalle]);
                $det = $stmt->fetch();
                if (!$det || $det['Cantidad'] < $cantDev) {
                    $db->rollBack();
                    echo json_encode(['success' => false, 'message' => "Cantidad a devolver mayor que la disponible en item $idDetalle"]);
                    exit;
                }

                $nuevaCant = $det['Cantidad'] - $cantDev;
                $nuevoDev = $det['Dev'] + $cantDev;
                $nuevoSubtotal = $nuevaCant * $det['PrecioV'] - $det['Descuento'];
                if ($nuevoSubtotal < 0) $nuevoSubtotal = 0;
                $valorDev = $cantDev * $det['PrecioV'];

                // Update detalle_venta
                $db->prepare("UPDATE tbldetalle_venta SET Cantidad = ?, Dev = ?, Subtotal = ? WHERE Id_DetalleVenta = ?")
                   ->execute([$nuevaCant, $nuevoDev, $nuevoSubtotal, $idDetalle]);

                // Return stock
                $db->prepare("UPDATE tblarticulos SET Existencia = Existencia + ? WHERE Items = ?")
                   ->execute([$cantDev, $det['Items']]);

                // Insert devolucion record
                $db->prepare("INSERT INTO tbldevolucion_ventas (Id_DetalleVenta, valor_dev, caja, fecha_fact, fecha_mod, id_usuario) VALUES (?, ?, '1', CURDATE(), NOW(), 0)")
                   ->execute([$idDetalle, $valorDev]);

                // Kardex entry
                $stmtExist = $db->prepare("SELECT Existencia, Precio_Costo FROM tblarticulos WHERE Items = ?");
                $stmtExist->execute([$det['Items']]);
                $art = $stmtExist->fetch();
                $costoUnit = floatval($art['Precio_Costo']);
                $mesNombre = $meses[intval(date('n'))] ?? '';

                $db->prepare("INSERT INTO tblkardex (Fecha, Mes, Items, Detalle, C_D, Cant_Ent, Cost_Ent, Cant_Sal, Cost_Sal, Cant_Saldo, Cost_Saldo, Cost_Unit) VALUES (NOW(), ?, ?, ?, 1, ?, ?, 0, 0, ?, ?, ?)")
                   ->execute([$mesNombre, $det['Items'], "Dev. Fra. N° $factN", $cantDev, $cantDev * $costoUnit, floatval($art['Existencia']), floatval($art['Existencia']) * $costoUnit, $costoUnit]);

                $totalDevuelto += $valorDev;
            }

            // Recalculate factura total
            $stmt = $db->prepare("SELECT SUM(Subtotal) as nuevoTotal FROM tbldetalle_venta WHERE Factura_N = ?");
            $stmt->execute([$factN]);
            $nuevoTotal = floatval($stmt->fetch()['nuevoTotal']);

            // Update factura total and saldo
            $stmtFac = $db->prepare("SELECT Total, Saldo, Tipo FROM tblventas WHERE Factura_N = ?");
            $stmtFac->execute([$factN]);
            $fac = $stmtFac->fetch();

            $nuevoSaldo = $fac['Tipo'] !== 'Contado' ? max(floatval($fac['Saldo']) - $totalDevuelto, 0) : 0;

            $db->prepare("UPDATE tblventas SET Total = ?, Saldo = ? WHERE Factura_N = ?")
               ->execute([$nuevoTotal, $nuevoSaldo, $factN]);

            $db->commit();
            echo json_encode(['success' => true, 'message' => "Devolución procesada. Valor devuelto: $" . number_format($totalDevuelto, 0, ',', '.')]);

        } elseif ($action === 'anular') {
            // ===== Validación de autorización =====
            $usuarioId = intval($data['usuario_id'] ?? 0);
            $autorizadoPor = intval($data['autorizado_por'] ?? 0);
            $autorizadoNombre = trim($data['autorizado_por_nombre'] ?? '');

            // Get factura
            $stmt = $db->prepare("SELECT * FROM tblventas WHERE Factura_N = ?");
            $stmt->execute([$factN]);
            $fac = $stmt->fetch();
            if (!$fac || $fac['EstadoFact'] === 'Anulada') {
                echo json_encode(['success' => false, 'message' => 'Factura ya anulada o no encontrada']);
                exit;
            }

            // ===== Validación de caja abierta para anulación de venta de contado =====
            $esContado = ($fac['Tipo'] === 'Contado');
            $efectivoVenta = floatval($fac['efectivo'] ?? 0);
            $cajaAbiertaHoy = null;
            if ($esContado && $efectivoVenta > 0) {
                $stmt = $db->prepare("
                    SELECT s.Id_Sesion, s.Id_Caja, c.Nombre AS NombreCaja
                    FROM tblsesiones_caja s
                    INNER JOIN tblcajas c ON s.Id_Caja = c.Id_Caja
                    WHERE s.Estado = 'abierta' AND DATE(s.FechaApertura) = CURDATE()
                    ORDER BY s.FechaApertura DESC LIMIT 1
                ");
                $stmt->execute();
                $cajaAbiertaHoy = $stmt->fetch();
                if (!$cajaAbiertaHoy) {
                    echo json_encode([
                        'success' => false,
                        'requiere_caja_abierta' => true,
                        'message' => 'Para anular esta venta de contado debe haber una caja abierta hoy. El reembolso de $' . number_format($efectivoVenta, 0, ',', '.') . ' debe salir de una caja activa. Abra una caja primero.'
                    ]);
                    exit;
                }
            }

            // Si NO viene autorizado_por, validamos las reglas para vendedor:
            //   - Solo puede anular SU propia venta (Id_Usuario coincide)
            //   - Y solo si tiene una sesión de caja abierta y la venta fue hecha durante esa sesión
            // Si es admin (Id_TiposUsuario=1) → siempre puede sin autorización (a menos que la config exija)
            if (!$autorizadoPor && $usuarioId > 0) {
                $stmt = $db->prepare("SELECT Id_TiposUsuario FROM tblusuarios WHERE Id_Usuario = ?");
                $stmt->execute([$usuarioId]);
                $tipoU = intval($stmt->fetch()['Id_TiposUsuario'] ?? 0);

                if ($tipoU !== 1) {
                    // Es vendedor — verificar que sea SU venta y dentro de SU sesión abierta
                    if (intval($fac['Id_Usuario']) !== $usuarioId) {
                        echo json_encode([
                            'success' => false, 'requiere_autorizacion' => true,
                            'message' => 'Esta venta fue hecha por otro cajero. Requiere autorización del administrador.'
                        ]);
                        exit;
                    }
                    $stmt = $db->prepare("
                        SELECT Id_Sesion FROM tblsesiones_caja
                        WHERE Id_Usuario = ? AND Estado = 'abierta'
                          AND ? >= FechaApertura
                        ORDER BY FechaApertura DESC LIMIT 1
                    ");
                    $stmt->execute([$usuarioId, $fac['Fecha']]);
                    $sesion = $stmt->fetch();
                    if (!$sesion) {
                        echo json_encode([
                            'success' => false, 'requiere_autorizacion' => true,
                            'message' => 'La caja en la que se hizo la venta ya fue cerrada. Requiere autorización del administrador.'
                        ]);
                        exit;
                    }
                }
            }

            $db->beginTransaction();

            // Return all stock
            $stmt = $db->prepare("SELECT * FROM tbldetalle_venta WHERE Factura_N = ?");
            $stmt->execute([$factN]);
            $detalles = $stmt->fetchAll();

            $meses = ['','Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
            $mesNombre = $meses[intval(date('n'))] ?? '';

            foreach ($detalles as $det) {
                if ($det['Cantidad'] > 0) {
                    $db->prepare("UPDATE tblarticulos SET Existencia = Existencia + ? WHERE Items = ?")
                       ->execute([$det['Cantidad'], $det['Items']]);

                    $stmtExist = $db->prepare("SELECT Existencia, Precio_Costo FROM tblarticulos WHERE Items = ?");
                    $stmtExist->execute([$det['Items']]);
                    $art = $stmtExist->fetch();
                    $costoUnit = floatval($art['Precio_Costo']);

                    $db->prepare("INSERT INTO tblkardex (Fecha, Mes, Items, Detalle, C_D, Cant_Ent, Cost_Ent, Cant_Sal, Cost_Sal, Cant_Saldo, Cost_Saldo, Cost_Unit) VALUES (NOW(), ?, ?, ?, 1, ?, ?, 0, 0, ?, ?, ?)")
                       ->execute([$mesNombre, $det['Items'], "Anulación Fra. N° $factN", $det['Cantidad'], $det['Cantidad'] * $costoUnit, floatval($art['Existencia']), floatval($art['Existencia']) * $costoUnit, $costoUnit]);
                }
            }

            // Mark as anulada
            $db->prepare("UPDATE tblventas SET EstadoFact = 'Anulada', Saldo = 0 WHERE Factura_N = ?")
               ->execute([$factN]);

            // ===== Si era venta contado: registrar egreso automático en caja abierta =====
            $msgExtra = '';
            if ($esContado && $efectivoVenta > 0 && $cajaAbiertaHoy) {
                $descripcion = "Reembolso por anulación FV-$factN";
                if ($autorizadoPor && $autorizadoNombre) $descripcion .= " (autorizado por $autorizadoNombre)";

                $db->prepare("
                    INSERT INTO tblmov_caja (Id_Sesion, Id_Caja_Origen, Id_Usuario, Valor, Tipo, Descripcion)
                    VALUES (?, ?, ?, ?, 'gasto', ?)
                ")->execute([
                    $cajaAbiertaHoy['Id_Sesion'], $cajaAbiertaHoy['Id_Caja'],
                    $usuarioId, $efectivoVenta, $descripcion
                ]);
                // Acumular en la columna Anulaciones de la sesión (sale en el cuadre)
                $db->prepare("UPDATE tblsesiones_caja SET Anulaciones = Anulaciones + ? WHERE Id_Sesion = ?")
                   ->execute([$efectivoVenta, $cajaAbiertaHoy['Id_Sesion']]);

                $msgExtra = ". Egreso de $" . number_format($efectivoVenta, 0, ',', '.') . " registrado en " . $cajaAbiertaHoy['NombreCaja'];
            }

            $db->commit();
            echo json_encode([
                'success' => true,
                'message' => "Factura $factN anulada correctamente" . $msgExtra,
                'egreso_caja' => $efectivoVenta > 0 ? floatval($efectivoVenta) : null,
                'caja_egreso' => $cajaAbiertaHoy ? $cajaAbiertaHoy['NombreCaja'] : null,
            ]);
        }
    }
} catch (Exception $e) {
    if ($db->inTransaction()) $db->rollBack();
    echo json_encode(['success' => false, 'message' => $e->getMessage()]);
}
?>
