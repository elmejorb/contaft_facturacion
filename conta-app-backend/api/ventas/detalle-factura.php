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

        // Items con nombre del artículo. Si la línea tiene DescripcionTemp
        // (servicio con concepto editado), ese texto reemplaza al nombre
        // del catálogo en la impresión y reimpresión.
        $stmt2 = $db->prepare("
            SELECT d.*, a.Codigo,
                   COALESCE(NULLIF(d.DescripcionTemp, ''), a.Nombres_Articulo) AS Nombres_Articulo,
                   a.Existencia, a.Precio_Costo,
                   COALESCE(a.Servicio, 0) AS Servicio
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
            // Leer estado ACTUAL de la factura antes de modificar. Necesitamos
            // Tipo/Total/id_mediopago previos para detectar los cambios y decidir
            // qué hacer con tblpagos y con los campos efectivo/valorpagado1.
            $stmtCurr = $db->prepare("SELECT Tipo, Total, id_mediopago FROM tblventas WHERE Factura_N = ?");
            $stmtCurr->execute([$factN]);
            $curr = $stmtCurr->fetch();
            $tipoAnterior = $curr['Tipo'] ?? '';
            $totalFactura = floatval($curr['Total'] ?? 0);
            $medioAnterior = intval($curr['id_mediopago'] ?? 0);

            $nuevoTipo = $data['tipo'];
            $nuevoMedio = intval($data['id_mediopago'] ?? 0);

            // Chequeo "no editar si tiene pagos" — pero excluye los pagos
            // AUTOMÁTICOS creados por este mismo flujo al convertir a Contado
            // (DetallePago LIKE 'Pago total al convertir%'). Esos sí se pueden
            // anular porque no fueron cobros manuales reales del cliente.
            $stmt = $db->prepare("
                SELECT COUNT(*) as c FROM tblpagos
                WHERE Fact_N = ? AND Estado = 'Valida'
                  AND DetallePago NOT LIKE 'Pago total al convertir%'
                  AND DetallePago NOT LIKE 'Backfill:%'
            ");
            $stmt->execute([$factN]);
            if ($stmt->fetch()['c'] > 0) {
                echo json_encode(['success' => false, 'message' => 'No se puede editar: tiene pagos manuales registrados']);
                exit;
            }

            // Calcular campos efectivo / valorpagado1 según el nuevo Tipo y medio.
            // Regla: id_mediopago=0 → efectivo; id_mediopago>0 → valorpagado1.
            $efectivoNuevo = 0.0;
            $valorpagado1Nuevo = 0.0;
            if ($nuevoTipo === 'Contado') {
                if ($nuevoMedio === 0) $efectivoNuevo = $totalFactura;
                else                    $valorpagado1Nuevo = $totalFactura;
            }

            // UPDATE consolidado incluyendo campos de caja
            $stmt = $db->prepare("
                UPDATE tblventas SET
                    CodigoCli = ?, A_nombre = ?, Identificacion = ?, Direccion = ?, Telefono = ?,
                    Tipo = ?, Dias = ?, Fecha = ?,
                    id_mediopago = ?, efectivo = ?, valorpagado1 = ?
                WHERE Factura_N = ? AND EstadoFact = 'Valida'
            ");
            $stmt->execute([
                $data['cliente_id'], $data['cliente_nombre'], $data['identificacion'],
                $data['direccion'], $data['telefono'],
                $nuevoTipo, intval($data['dias'] ?? 0), $data['fecha'],
                $nuevoMedio, $efectivoNuevo, $valorpagado1Nuevo,
                $factN
            ]);

            // Saldo/pagada según Tipo
            if ($nuevoTipo === 'Contado') {
                $db->prepare("UPDATE tblventas SET Saldo = 0, pagada = '1' WHERE Factura_N = ?")->execute([$factN]);
            } else {
                // Volvió a Crédito: restaurar Saldo = Total y pagada = ''
                $db->prepare("UPDATE tblventas SET Saldo = ?, pagada = '' WHERE Factura_N = ?")->execute([$totalFactura, $factN]);
            }

            // Detectar tipos de cambio
            $convertidaAContado    = ($tipoAnterior !== 'Contado' && $nuevoTipo === 'Contado');
            $revertidaACredito     = ($tipoAnterior === 'Contado' && $nuevoTipo !== 'Contado');
            $cambioSoloMedioPago   = ($tipoAnterior === 'Contado' && $nuevoTipo === 'Contado' && $medioAnterior !== $nuevoMedio);

            // === CASO 1: Crédito → Contado ===
            // Registrar el cobro en tblpagos con Fecha=NOW() para que aparezca
            // en la caja del día en que se hace el cambio.
            if ($convertidaAContado && $totalFactura > 0) {
                $idUsuario = intval($data['id_usuario'] ?? 0);

                $stmtRec = $db->query("SELECT COALESCE(MAX(RecCajaN), 0) + 1 AS n FROM tblpagos");
                $recN = intval($stmtRec->fetch()['n']);

                $stmtPago = $db->prepare("
                    INSERT INTO tblpagos (RecCajaN, Codigo, Fact_N, ValorPago, Fecha, DetallePago,
                        ValorFact, SaldoAct, Descuento, Retencion, Estado, Afectada, id_mediopago,
                        NFactAnt, Nfact_electronica, FechaMod, id_usuario)
                    VALUES (:rec, :codigo, :fact_n, :valor, NOW(), :detalle,
                        :valor_fact, 0, 0, 0, 'Valida', '1110', :medio,
                        '', '', NOW(), :id_user)
                ");
                $stmtPago->execute([
                    ':rec'        => $recN,
                    ':codigo'     => intval($data['cliente_id'] ?? 0),
                    ':fact_n'     => $factN,
                    ':valor'      => $totalFactura,
                    ':detalle'    => "Pago total al convertir a Contado - Fra $factN",
                    ':valor_fact' => $totalFactura,
                    ':medio'      => $nuevoMedio,
                    ':id_user'    => $idUsuario,
                ]);
            }

            // === CASO 2: Contado → Crédito ===
            // Anular el pago automático que se había creado (si existe). No lo
            // borramos — regla contable de inmutabilidad — sino que lo marcamos
            // Anulada para que deje de sumar en caja.
            if ($revertidaACredito) {
                $db->prepare("
                    UPDATE tblpagos SET Estado = 'Anulada', FechaMod = NOW()
                    WHERE Fact_N = ? AND Estado = 'Valida'
                      AND DetallePago LIKE 'Pago total al convertir%'
                ")->execute([$factN]);
            }

            // === CASO 3: Contado → Contado, cambio de medio de pago ===
            // Si existe un pago automático previo (del caso 1 anterior),
            // actualizar su id_mediopago para que la caja lo sume por el nuevo
            // medio. Solo se toca el registro automático, no cobros manuales.
            if ($cambioSoloMedioPago) {
                $db->prepare("
                    UPDATE tblpagos SET id_mediopago = ?, FechaMod = NOW()
                    WHERE Fact_N = ? AND Estado = 'Valida'
                      AND DetallePago LIKE 'Pago total al convertir%'
                ")->execute([$nuevoMedio, $factN]);
            }

            $msg = $convertidaAContado ? 'Factura actualizada y cobro registrado en caja'
                : ($revertidaACredito ? 'Factura revertida a Crédito y cobro anulado'
                : ($cambioSoloMedioPago ? 'Medio de pago actualizado'
                : 'Factura actualizada'));
            echo json_encode(['success' => true, 'message' => $msg]);

        } elseif ($action === 'devolucion') {
            $items = $data['items'] ?? []; // [{id_detalle, cant_devolver}]
            if (empty($items)) { echo json_encode(['success' => false, 'message' => 'No hay items para devolver']); exit; }

            $idUsuario = intval($data['id_usuario'] ?? 0);

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

                // valorDev includes IVA to match how tblventas.Total was calculated
                $ivaRate = floatval($det['IVA'] ?? 0);
                $subtotalDev = $cantDev * floatval($det['PrecioV']);
                $valorDev = $subtotalDev * (1 + $ivaRate / 100);

                // Also recalculate Impuesto for the remaining quantity
                $nuevaImpuesto = $nuevoSubtotal * ($ivaRate / 100);

                // Update detalle_venta (including Impuesto so nuevoTotal calculation is accurate)
                $db->prepare("UPDATE tbldetalle_venta SET Cantidad = ?, Dev = ?, Subtotal = ?, Impuesto = ? WHERE Id_DetalleVenta = ?")
                   ->execute([$nuevaCant, $nuevoDev, $nuevoSubtotal, $nuevaImpuesto, $idDetalle]);

                // Return stock
                $db->prepare("UPDATE tblarticulos SET Existencia = Existencia + ? WHERE Items = ?")
                   ->execute([$cantDev, $det['Items']]);

                // Insert devolucion record
                $db->prepare("INSERT INTO tbldevolucion_ventas (Id_DetalleVenta, valor_dev, caja, fecha_fact, fecha_mod, id_usuario) VALUES (?, ?, '1', CURDATE(), NOW(), ?)")
                   ->execute([$idDetalle, $valorDev, $idUsuario]);

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
            $stmt = $db->prepare("SELECT SUM(Subtotal) as nuevoSubtotal, SUM(Impuesto) as nuevoIva FROM tbldetalle_venta WHERE Factura_N = ?");
            $stmt->execute([$factN]);
            $totales = $stmt->fetch();
            $nuevoTotal = floatval($totales['nuevoSubtotal']) + floatval($totales['nuevoIva']);

            // Actualizar Total primero (con Saldo provisional = nuevoTotal).
            // Luego recalcularSaldoFactura() lo persiste correctamente desde
            // tblpagos (fuente de verdad), sin depender del Saldo cacheado
            // previo — que podía estar desincronizado por bugs históricos
            // y llevar a un nuevoSaldo erróneo.
            $stmtFac = $db->prepare("SELECT Tipo FROM tblventas WHERE Factura_N = ?");
            $stmtFac->execute([$factN]);
            $fac = $stmtFac->fetch();

            $db->prepare("UPDATE tblventas SET Total = ? WHERE Factura_N = ?")
               ->execute([$nuevoTotal, $factN]);
            if ($fac['Tipo'] !== 'Contado') {
                require_once '../config/saldo_helper.php';
                recalcularSaldoFactura($db, intval($factN));
            } else {
                $db->prepare("UPDATE tblventas SET Saldo = 0 WHERE Factura_N = ?")->execute([$factN]);
            }

            // ===== Si era venta contado: registrar egreso automático en caja abierta =====
            if ($fac['Tipo'] === 'Contado' && $totalDevuelto > 0) {
                // Buscar caja del usuario
                $stmtCaja = $db->prepare("SELECT Id_Sesion, Id_Caja FROM tblsesiones_caja WHERE Estado = 'abierta' AND Id_Usuario = ? ORDER BY Id_Sesion DESC LIMIT 1");
                $stmtCaja->execute([$idUsuario]);
                $cajaAbierta = $stmtCaja->fetch();
                
                if (!$cajaAbierta) {
                    $db->rollBack();
                    echo json_encode([
                        'success' => false,
                        'message' => 'Para procesar esta devolución en efectivo, debe tener una caja abierta asignada a su usuario.'
                    ]);
                    exit;
                }

                $descripcion = "Reembolso por devolución parcial FV-$factN";
                $db->prepare("
                    INSERT INTO tblmov_caja (Id_Sesion, Id_Caja_Origen, Id_Usuario, Valor, Tipo, Descripcion)
                    VALUES (?, ?, ?, ?, 'gasto', ?)
                ")->execute([
                    $cajaAbierta['Id_Sesion'], $cajaAbierta['Id_Caja'],
                    $idUsuario, $totalDevuelto, $descripcion
                ]);
            }

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
                    WHERE s.Estado = 'abierta' AND DATE(s.FechaApertura) = CURDATE() AND s.Id_Usuario = ?
                    ORDER BY s.FechaApertura DESC LIMIT 1
                ");
                $stmt->execute([$usuarioId]);
                $cajaAbiertaHoy = $stmt->fetch();
                
                if (!$cajaAbiertaHoy) {
                    echo json_encode([
                        'success' => false,
                        'requiere_caja_abierta' => true,
                        'message' => 'Para anular esta venta de contado debe tener una caja abierta asignada a su usuario. El reembolso de $' . number_format($efectivoVenta, 0, ',', '.') . ' debe salir de su caja activa. Abra una caja primero.'
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
                    // Si el Items ya no existe en tblarticulos (ítem huérfano/legacy)
                    // saltamos el asiento de kardex — la anulación sigue adelante.
                    if (!$art) continue;

                    $costoUnit = floatval($art['Precio_Costo']);
                    $existActual = floatval($art['Existencia']);
                    $db->prepare("INSERT INTO tblkardex (Fecha, Mes, Items, Detalle, C_D, Cant_Ent, Cost_Ent, Cant_Sal, Cost_Sal, Cant_Saldo, Cost_Saldo, Cost_Unit) VALUES (NOW(), ?, ?, ?, 1, ?, ?, 0, 0, ?, ?, ?)")
                       ->execute([$mesNombre, $det['Items'], "Anulación Fra. N° $factN", $det['Cantidad'], $det['Cantidad'] * $costoUnit, $existActual, $existActual * $costoUnit, $costoUnit]);
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
