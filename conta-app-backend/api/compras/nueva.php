<?php
/**
 * Compras / Pedidos
 * GET ?buscar=texto → buscar artículos
 * GET ?proveedores=1 → listar proveedores
 * GET ?listar=1&anio=2026&mes=0 → listar compras
 * GET ?detalle=Pedido_N → detalle de compra
 * POST → crear o editar compra
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
                       COALESCE(a.requiere_lote, 0) AS requiere_lote,
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

        // Listar compras
        if (isset($_GET['listar'])) {
            $anio = intval($_GET['anio'] ?? date('Y'));
            $mes = intval($_GET['mes'] ?? 0);
            $where = "WHERE p.anio = $anio";
            if ($mes > 0) $where .= " AND p.N_Mes = $mes";

            $stmt = $db->query("
                SELECT p.*, pr.RazonSocial as Proveedor, pr.Nit as ProvNit,
                    (SELECT COUNT(*) FROM tbldetalle_pedido d WHERE d.Pedido_N = p.Pedido_N) as Items
                FROM tblpedidos p
                LEFT JOIN tblproveedores pr ON p.CodigoPro = pr.CodigoPro
                $where
                ORDER BY p.Pedido_N DESC
            ");
            $compras = $stmt->fetchAll();
            foreach ($compras as &$c) {
                $c['Total'] = floatval($c['Total']);
                $c['Saldo'] = floatval($c['Saldo']);
                $c['Flete'] = floatval($c['Flete']);
                $c['Descuento'] = floatval($c['Descuento']);
                $c['Retencion'] = floatval($c['Retencion']);
                $c['Impuesto'] = floatval($c['Impuesto']);
            }
            echo json_encode(['success' => true, 'compras' => $compras, 'total' => count($compras)], JSON_UNESCAPED_UNICODE);
            exit;
        }

        // Detalle de compra (para editar)
        if (isset($_GET['detalle'])) {
            $pedidoN = intval($_GET['detalle']);
            // Header
            $stmt = $db->prepare("
                SELECT p.*, pr.RazonSocial, pr.Nit as ProvNit
                FROM tblpedidos p
                LEFT JOIN tblproveedores pr ON p.CodigoPro = pr.CodigoPro
                WHERE p.Pedido_N = ?
            ");
            $stmt->execute([$pedidoN]);
            $header = $stmt->fetch();
            if (!$header) { echo json_encode(['success' => false, 'message' => 'Compra no encontrada']); exit; }

            // Detail
            $stmt = $db->prepare("
                SELECT d.*, a.Codigo, a.Nombres_Articulo, a.Existencia, a.Precio_Venta as PrecioVentaActual
                FROM tbldetalle_pedido d
                INNER JOIN tblarticulos a ON d.Items = a.Items
                WHERE d.Pedido_N = ?
            ");
            $stmt->execute([$pedidoN]);
            $detalle = $stmt->fetchAll();
            foreach ($detalle as &$d) {
                $d['Cantidad'] = floatval($d['Cantidad']);
                $d['PrecioC'] = floatval($d['PrecioC']);
                $d['PrecioV'] = floatval($d['PrecioV']);
                $d['Impuesto'] = floatval($d['Impuesto']);
                $d['Subtotal'] = floatval($d['Subtotal']);
                $d['IvaPct'] = floatval($d['IvaPct'] ?? 0);
                $d['CostoSinIva'] = floatval($d['CostoSinIva'] ?? $d['PrecioC']);
                $d['CostoConIva'] = floatval($d['CostoConIva'] ?? $d['PrecioC']);
                $d['FleteUnit'] = floatval($d['FleteUnit'] ?? 0);
                $d['CostoFinal'] = floatval($d['CostoFinal'] ?? $d['PrecioC']);
                $d['CostoAnterior'] = floatval($d['CostoAnterior'] ?? 0);
                $d['CostoPromedio'] = floatval($d['CostoPromedio'] ?? $d['PrecioC']);
                $d['Existencia'] = floatval($d['Existencia']);
            }

            $header['Total'] = floatval($header['Total']);
            $header['Saldo'] = floatval($header['Saldo']);
            $header['Flete'] = floatval($header['Flete']);
            $header['Descuento'] = floatval($header['Descuento']);
            $header['Retencion'] = floatval($header['Retencion']);
            $header['Impuesto'] = floatval($header['Impuesto']);

            echo json_encode(['success' => true, 'compra' => $header, 'detalle' => $detalle], JSON_UNESCAPED_UNICODE);
            exit;
        }

        // Next pedido number
        $stmt = $db->query("SELECT COALESCE(MAX(Pedido_N), 0) + 1 as next FROM tblpedidos");
        echo json_encode(['success' => true, 'next_pedido' => $stmt->fetch()['next']]);
        exit;
    }

    // ========================================
    // POST: Crear o Editar compra
    // ========================================
    $data = json_decode(file_get_contents('php://input'), true);
    if (!$data || empty($data['items'])) {
        echo json_encode(['success' => false, 'message' => 'No hay productos']);
        exit;
    }

    $db->beginTransaction();

    $esEdicion = isset($data['pedido_n']) && intval($data['pedido_n']) > 0;
    $pedidoN = $esEdicion ? intval($data['pedido_n']) : 0;

    $tipoPedido = $data['tipo'] ?? 'Crédito';
    $dias = intval($data['dias'] ?? 30);
    $codigoPro = intval($data['proveedor_id'] ?? 0);
    $facturaCompra = trim($data['factura_compra'] ?? '');
    if ($facturaCompra === '') {
        echo json_encode(['success' => false, 'message' => 'El N° de factura del proveedor es obligatorio']);
        exit;
    }
    $flete = floatval($data['flete'] ?? 0);
    $descuento = floatval($data['descuento'] ?? 0);
    $retencion = floatval($data['retencion'] ?? 0);
    $comentario = $data['comentario'] ?? '-';
    $opcionFactura = intval($data['opcion_factura'] ?? 0);
    $fecha = $data['fecha'] ?? date('Y-m-d');

    $meses = ['','Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
    $mesNum = intval(date('n', strtotime($fecha)));
    $mesNombre = $meses[$mesNum] ?? '';
    $anio = intval(date('Y', strtotime($fecha)));

    // Calculate totals
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

    if ($esEdicion) {
        // ========================================
        // EDICIÓN: Procesar diferencias
        // ========================================

        // Get original details
        $stmtOrig = $db->prepare("SELECT Id_DetallePedido, Items, Cantidad, PrecioC, PrecioV FROM tbldetalle_pedido WHERE Pedido_N = ?");
        $stmtOrig->execute([$pedidoN]);
        $originales = [];
        while ($row = $stmtOrig->fetch()) {
            $originales[$row['Id_DetallePedido']] = [
                'Items' => intval($row['Items']),
                'Cantidad' => floatval($row['Cantidad']),
                'PrecioC' => floatval($row['PrecioC']),
                'PrecioV' => floatval($row['PrecioV'])
            ];
        }

        $idsEnGrid = []; // Track which detail IDs are still in the grid

        foreach ($data['items'] as $i => $item) {
            $itemId = intval($item['items']);
            $cant = floatval($item['cantidad']);
            $factor = floatval($item['factor'] ?? 1);
            $cantReal = $cant * $factor; // Cantidad en unidad base
            $costoSinIva = floatval($item['costo_sin_iva']);
            // Si compra por presentación, el costo por unidad base = costo / factor
            $costoSinIvaBase = $factor > 1 ? $costoSinIva / $factor : $costoSinIva;
            $ivaPct = floatval($item['iva_pct'] ?? 0);
            $ivaVal = $costoSinIva * ($ivaPct / 100);
            $costoConIva = $costoSinIva + $ivaVal;
            $fleteUnit = $fleteMap[$i] ?? 0;
            $costoFinal = $costoSinIvaBase + ($factor > 1 ? $fleteUnit / $factor : $fleteUnit);
            $precioVenta = floatval($item['precio_venta'] ?? 0);
            $subtotal = $cant * $costoConIva;
            $idDetalle = intval($item['id_detalle'] ?? 0);

            // Get current article state
            $stmtArt = $db->prepare("SELECT Existencia, Precio_Costo FROM tblarticulos WHERE Items = ?");
            $stmtArt->execute([$itemId]);
            $artActual = $stmtArt->fetch();
            $existActual = floatval($artActual['Existencia']);
            $costoActual = floatval($artActual['Precio_Costo']);

            if ($idDetalle === 0) {
                // ---- PRODUCTO NUEVO (no existía en la compra original) ----
                $nuevaExist = $existActual + $cantReal;
                $costoPromedio = $nuevaExist > 0
                    ? round(($existActual * $costoActual + $cant * $costoFinal) / $nuevaExist, 4)
                    : $costoFinal;

                // Insert detail
                $db->prepare("
                    INSERT INTO tbldetalle_pedido (Pedido_N, Items, Cantidad, PrecioC, PrecioV, Impuesto, Subtotal,
                        IvaPct, CostoSinIva, CostoConIva, FleteUnit, CostoFinal, CostoAnterior, CostoPromedio)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ")->execute([
                    $pedidoN, $itemId, $cant, $costoFinal, $precioVenta, $ivaVal * $cant, $subtotal,
                    $ivaPct, $costoSinIva, $costoConIva, $fleteUnit, $costoFinal, $costoActual, $costoPromedio
                ]);

                // Update stock
                $db->prepare("UPDATE tblarticulos SET Existencia = ?, Precio_Costo = ?, Precio_CostoComp = ? WHERE Items = ?")
                   ->execute([$nuevaExist, $costoPromedio, $costoConIva, $itemId]);

                // Kardex: entrada
                $db->prepare("
                    INSERT INTO tblkardex (Fecha, Mes, Items, Detalle, C_D, Cant_Ent, Cost_Ent, Cant_Sal, Cost_Sal, Cant_Saldo, Cost_Saldo, Cost_Unit)
                    VALUES (?, ?, ?, ?, 1, ?, ?, 0, 0, ?, ?, ?)
                ")->execute([
                    $fecha, $mesNombre, $itemId, "Compra Adic. Ped. $pedidoN Fac. $facturaCompra",
                    $cant, $cant * $costoFinal, $nuevaExist, $nuevaExist * $costoPromedio, $costoPromedio
                ]);

            } else {
                // ---- PRODUCTO EXISTENTE: verificar cambios ----
                $idsEnGrid[] = $idDetalle;

                if (isset($originales[$idDetalle])) {
                    $orig = $originales[$idDetalle];
                    $cantOriginal = $orig['Cantidad'];
                    $diferencia = $cant - $cantOriginal;

                    if ($diferencia != 0) {
                        // Cantidad cambió → ajustar inventario
                        $nuevaExist = $existActual + $diferencia;
                        $costoPromedio = $nuevaExist > 0
                            ? round(($existActual * $costoActual + $diferencia * $costoFinal) / $nuevaExist, 4)
                            : $costoFinal;

                        $db->prepare("UPDATE tblarticulos SET Existencia = ?, Precio_Costo = ?, Precio_CostoComp = ? WHERE Items = ?")
                           ->execute([$nuevaExist, $costoPromedio, $costoConIva, $itemId]);

                        if ($diferencia > 0) {
                            // Entrada adicional
                            $db->prepare("
                                INSERT INTO tblkardex (Fecha, Mes, Items, Detalle, C_D, Cant_Ent, Cost_Ent, Cant_Sal, Cost_Sal, Cant_Saldo, Cost_Saldo, Cost_Unit)
                                VALUES (?, ?, ?, ?, 1, ?, ?, 0, 0, ?, ?, ?)
                            ")->execute([
                                $fecha, $mesNombre, $itemId, "Ajuste Mod. Ped. $pedidoN (+)",
                                abs($diferencia), abs($diferencia) * $costoFinal, $nuevaExist, $nuevaExist * $costoPromedio, $costoPromedio
                            ]);
                        } else {
                            // Salida por reducción
                            $db->prepare("
                                INSERT INTO tblkardex (Fecha, Mes, Items, Detalle, C_D, Cant_Ent, Cost_Ent, Cant_Sal, Cost_Sal, Cant_Saldo, Cost_Saldo, Cost_Unit)
                                VALUES (?, ?, ?, ?, 2, 0, 0, ?, ?, ?, ?, ?)
                            ")->execute([
                                $fecha, $mesNombre, $itemId, "Ajuste Mod. Ped. $pedidoN (-)",
                                abs($diferencia), abs($diferencia) * $costoFinal, $nuevaExist, $nuevaExist * $costoPromedio, $costoPromedio
                            ]);
                        }
                    } else {
                        // Solo actualizar precios si cambiaron
                        $db->prepare("UPDATE tblarticulos SET Precio_Costo = ?, Precio_CostoComp = ?, Precio_Venta = ? WHERE Items = ?")
                           ->execute([$costoFinal, $costoConIva, $precioVenta > 0 ? $precioVenta : $artActual['Precio_Venta'], $itemId]);
                    }

                    // Update detail record
                    $db->prepare("
                        UPDATE tbldetalle_pedido SET Cantidad = ?, PrecioC = ?, PrecioV = ?, Impuesto = ?, Subtotal = ?,
                            IvaPct = ?, CostoSinIva = ?, CostoConIva = ?, FleteUnit = ?, CostoFinal = ?, CostoPromedio = ?
                        WHERE Id_DetallePedido = ?
                    ")->execute([
                        $cant, $costoFinal, $precioVenta, $ivaVal * $cant, $subtotal,
                        $ivaPct, $costoSinIva, $costoConIva, $fleteUnit, $costoFinal,
                        round(($existActual * $costoActual + $diferencia * $costoFinal) / max($existActual + $diferencia, 1), 4),
                        $idDetalle
                    ]);
                }
            }
        }

        // ---- PRODUCTOS ELIMINADOS: los que estaban en original pero ya no en grid ----
        foreach ($originales as $origId => $orig) {
            if (!in_array($origId, $idsEnGrid)) {
                $itemId = $orig['Items'];
                $cantElim = $orig['Cantidad'];
                $costElim = $orig['PrecioC'];

                // Restar del inventario
                $db->prepare("UPDATE tblarticulos SET Existencia = Existencia - ? WHERE Items = ?")
                   ->execute([$cantElim, $itemId]);

                // Kardex: salida por eliminación
                $stmtArt2 = $db->prepare("SELECT Existencia, Precio_Costo FROM tblarticulos WHERE Items = ?");
                $stmtArt2->execute([$itemId]);
                $artPost = $stmtArt2->fetch();
                $db->prepare("
                    INSERT INTO tblkardex (Fecha, Mes, Items, Detalle, C_D, Cant_Ent, Cost_Ent, Cant_Sal, Cost_Sal, Cant_Saldo, Cost_Saldo, Cost_Unit)
                    VALUES (?, ?, ?, ?, 2, 0, 0, ?, ?, ?, ?, ?)
                ")->execute([
                    $fecha, $mesNombre, $itemId, "Elim. de Ped. $pedidoN Fac. $facturaCompra",
                    $cantElim, $cantElim * $costElim,
                    floatval($artPost['Existencia']), floatval($artPost['Existencia']) * floatval($artPost['Precio_Costo']),
                    floatval($artPost['Precio_Costo'])
                ]);

                // Delete detail line
                $db->prepare("DELETE FROM tbldetalle_pedido WHERE Id_DetallePedido = ?")->execute([$origId]);
            }
        }

        // Update header
        $db->prepare("
            UPDATE tblpedidos SET FacturaCompra_N = ?, Fecha = ?, N_Mes = ?, anio = ?,
                TipoPedido = ?, Dias = ?, CodigoPro = ?, Impuesto = ?, Descuento = ?,
                Retencion = ?, Flete = ?, Total = ?, Saldo = ?, Comentario = ?, opcion_factura = ?
            WHERE Pedido_N = ?
        ")->execute([
            $facturaCompra, $fecha, $mesNum, $anio,
            $tipoPedido, $dias, $codigoPro, $totalImpuesto, $descuento,
            $retencion, $flete, $totalCompra, $saldo, $comentario, $opcionFactura,
            $pedidoN
        ]);

        $db->commit();
        echo json_encode([
            'success' => true,
            'message' => "Compra #$pedidoN actualizada exitosamente",
            'Pedido_N' => $pedidoN,
            'Total' => $totalCompra
        ], JSON_UNESCAPED_UNICODE);

    } else {
        // ========================================
        // NUEVA COMPRA
        // ========================================

        // Insert pedido header
        $stmt = $db->prepare("
            INSERT INTO tblpedidos (FacturaCompra_N, N_Mes, anio, Fecha, TipoPedido, Dias, CodigoPro,
                Impuesto, Descuento, Flete, Total, Saldo, EstadoPedido, Comentario, Retencion, opcion_factura)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Recibido', ?, ?, ?)
        ");
        $stmt->execute([
            $facturaCompra, $mesNum, $anio, $fecha, $tipoPedido, $dias, $codigoPro,
            $totalImpuesto, $descuento, $flete, $totalCompra, $saldo,
            $comentario, $retencion, $opcionFactura
        ]);
        $pedidoN = $db->lastInsertId();

        // Insert details + update stock + kardex
        foreach ($data['items'] as $i => $item) {
            $itemId = intval($item['items']);
            $cant = floatval($item['cantidad']);
            $costoSinIva = floatval($item['costo_sin_iva']);
            $ivaPct = floatval($item['iva_pct'] ?? 0);
            $ivaVal = $costoSinIva * ($ivaPct / 100);
            $costoConIva = $costoSinIva + $ivaVal;
            $fleteUnit = $fleteMap[$i] ?? 0;
            $costoFinal = $costoSinIva + $fleteUnit;
            $precioVenta = floatval($item['precio_venta'] ?? 0);
            $subtotal = $cant * $costoConIva;

            // Get current stock and cost
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
            $db->prepare("
                INSERT INTO tbldetalle_pedido (Pedido_N, Items, Cantidad, PrecioC, PrecioV, Impuesto, Subtotal,
                    IvaPct, CostoSinIva, CostoConIva, FleteUnit, CostoFinal, CostoAnterior, CostoPromedio)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ")->execute([
                $pedidoN, $itemId, $cant, $costoFinal, $precioVenta, $ivaVal * $cant, $subtotal,
                $ivaPct, $costoSinIva, $costoConIva, $fleteUnit, $costoFinal, $costoAnt, $costoPromedio
            ]);

            // Update stock and cost
            $updateFields = "Existencia = ?, Precio_Costo = ?, Precio_CostoComp = ?, CodigoPro = ?, Flete = ?";
            $updateParams = [$nuevaExist, $costoPromedio, $costoConIva, $codigoPro, $fleteUnit];
            // Update sale price only if provided and > 0
            if ($precioVenta > 0) {
                $updateFields .= ", Precio_Venta = ?";
                $updateParams[] = $precioVenta;
            }
            $updateParams[] = $itemId;
            $db->prepare("UPDATE tblarticulos SET $updateFields WHERE Items = ?")->execute($updateParams);

            // Kardex entry
            $db->prepare("
                INSERT INTO tblkardex (Fecha, Mes, Items, Detalle, C_D, Cant_Ent, Cost_Ent, Cant_Sal, Cost_Sal, Cant_Saldo, Cost_Saldo, Cost_Unit)
                VALUES (?, ?, ?, ?, 1, ?, ?, 0, 0, ?, ?, ?)
            ")->execute([
                $fecha, $mesNombre, $itemId, "Compra Ped. N° $pedidoN Fac. $facturaCompra",
                $cant, $cant * $costoFinal, $nuevaExist, $nuevaExist * $costoPromedio, $costoPromedio
            ]);
        }

        $db->commit();
        echo json_encode([
            'success' => true,
            'message' => "Compra #$pedidoN registrada. Factura: $facturaCompra",
            'Pedido_N' => $pedidoN,
            'Total' => $totalCompra
        ], JSON_UNESCAPED_UNICODE);
    }

} catch (Exception $e) {
    if ($db->inTransaction()) $db->rollBack();
    echo json_encode(['success' => false, 'message' => $e->getMessage()]);
}
?>
