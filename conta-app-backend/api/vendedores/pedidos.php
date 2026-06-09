<?php
/**
 * Pedidos de vendedores
 * GET ?pagina=N&estado=X&vendedor=Y&fecha_desde=Z   → lista paginada
 * GET ?id=N                                         → detalle
 * POST action=convertir                             → convertir a venta local
 * POST action=anular                                → anular pedido
 */
require_once '../config/database.php';
$database = new Database();
$db = $database->getConnection();

try {
    if ($_SERVER['REQUEST_METHOD'] === 'GET') {
        // ===== cargar_venta (precargar en pantalla de ventas) =====
        if (isset($_GET['cargar_venta'])) {
            $id = intval($_GET['id'] ?? 0);
            try {
                $stmt = $db->prepare("SELECT * FROM tbl_pedidos_vendedor WHERE id = ? AND estado = 'pendiente'");
                $stmt->execute([$id]);
                $pedido = $stmt->fetch();

                if (!$pedido) {
                    echo json_encode(['success' => false, 'message' => 'Pedido no encontrado o ya procesado'], JSON_UNESCAPED_UNICODE);
                    exit;
                }

                // Buscar cliente local por NIT o nombre; si no existe, crearlo
                $cliente = null;
                $colsCliente = "CodigoClien, Razon_Social AS Nombre_Cliente, Nit, Identificacion, Telefonos AS Telefono, Direccion, CupoAutorizado AS Cupo, Email";
                if (!empty($pedido['nit_cliente'])) {
                    $stmtC = $db->prepare("SELECT $colsCliente FROM tblclientes WHERE Identificacion = ? OR Nit = ? LIMIT 1");
                    $stmtC->execute([$pedido['nit_cliente'], $pedido['nit_cliente']]);
                    $cliente = $stmtC->fetch();
                }
                if (!$cliente && !empty($pedido['nombre_cliente'])) {
                    $stmtC = $db->prepare("SELECT $colsCliente FROM tblclientes WHERE Razon_Social LIKE ? OR Nombre_C LIKE ? LIMIT 1");
                    $stmtC->execute(['%' . $pedido['nombre_cliente'] . '%', '%' . $pedido['nombre_cliente'] . '%']);
                    $cliente = $stmtC->fetch();
                }

                // Crear cliente automáticamente si no existe
                if (!$cliente && !empty($pedido['nombre_cliente'])) {
                    $stmtNext = $db->query("SELECT COALESCE(MAX(CodigoClien), 130500) + 1 as next_id FROM tblclientes");
                    $nextId = $stmtNext->fetch()['next_id'];
                    $nit = $pedido['nit_cliente'] ?? '';
                    $ident = !empty($nit) ? intval(preg_replace('/[^0-9]/', '', $nit)) : 0;
                    $db->prepare("
                        INSERT INTO tblclientes
                        (CodigoClien, Razon_Social, Nit, Identificacion, Telefonos, Direccion,
                         Email, Whatsapp, CupoAutorizado, Fecha_Ingreso,
                         Nombres, Apellidos, Direcion_R, Nombre_C, Apellidos_C, Telefonos_C, Direccion_C, Cargo_C,
                         Termino, FacVenc, Preciocosto, id_documento, id_municipio, id_type_liability, id_type_organization, id_type_regime)
                        VALUES
                        (?, ?, ?, ?, '', '', '', '', 0, NOW(),
                         '', '', '', '', '', '', '', '',
                         0, 0, 0, 2, null, null, null, null)
                    ")->execute([
                        $nextId,
                        $pedido['nombre_cliente'],
                        $nit,
                        $ident,
                    ]);
                    $cliente = [
                        'CodigoClien'    => $nextId,
                        'Nombre_Cliente' => $pedido['nombre_cliente'],
                        'Nit'            => $nit,
                        'Identificacion' => $ident,
                        'Telefono'       => '',
                        'Direccion'      => '',
                        'Cupo'           => 0,
                        'Email'          => '',
                    ];
                }

                // Preparar items con datos completos de tblarticulos
                $itemsRaw = json_decode($pedido['items_json'] ?? '[]', true);
                $items = [];
                foreach ($itemsRaw as $it) {
                    $stmtP = $db->prepare("SELECT Items, Codigo, Nombres_Articulo, Existencia, Precio_Costo, Precio_Venta, Precio_Venta2, Precio_Venta3, Iva FROM tblarticulos WHERE Items = ? LIMIT 1");
                    $stmtP->execute([$it['id_producto'] ?? 0]);
                    $prod = $stmtP->fetch();
                    if ($prod) {
                        $items[] = [
                            'Items'           => (int) $prod['Items'],
                            'Codigo'          => $prod['Codigo'],
                            'Nombres_Articulo'=> $prod['Nombres_Articulo'],
                            'Existencia'      => (float) $prod['Existencia'],
                            'Precio_Costo'    => (float) $prod['Precio_Costo'],
                            'Precio_Venta'    => (float) $prod['Precio_Venta'],
                            'Precio_Venta2'   => (float) ($prod['Precio_Venta2'] ?? $prod['Precio_Venta']),
                            'Precio_Venta3'   => (float) ($prod['Precio_Venta3'] ?? $prod['Precio_Venta']),
                            'Iva'             => (float) $prod['Iva'],
                            'cantidad_pedido' => (float) ($it['cantidad'] ?? 0),
                            'precio_unitario_pedido' => (float) ($it['precio_unitario'] ?? 0),
                        ];
                    }
                }

                echo json_encode([
                    'success'       => true,
                    'pedido_id'     => (int) $pedido['id'],
                    'numero_pedido' => $pedido['numero_pedido'],
                    'cliente'       => $cliente,
                    'nombre_cliente'=> $pedido['nombre_cliente'],
                    'nit_cliente'   => $pedido['nit_cliente'],
                    'items'         => $items,
                    'forma_pago'    => $pedido['forma_pago'],
                    'observaciones' => $pedido['observaciones'],
                ], JSON_UNESCAPED_UNICODE);
            } catch (Exception $e) {
                echo json_encode(['success' => false, 'message' => $e->getMessage()], JSON_UNESCAPED_UNICODE);
            }
            exit;
        }

        $id = intval($_GET['id'] ?? 0);

        if ($id > 0) {
            $stmt = $db->prepare("SELECT * FROM tbl_pedidos_vendedor WHERE id = ?");
            $stmt->execute([$id]);
            $pedido = $stmt->fetch();
            if ($pedido) {
                $pedido['items'] = json_decode($pedido['items_json'] ?? '[]', true);
            }
            echo json_encode(['success' => true, 'pedido' => $pedido], JSON_UNESCAPED_UNICODE);
            exit;
        }

        // Lista unificada: tbl_pedidos_vendedor (pedidos sin CUFE) +
        // electronic_documents con origen='movil' (facturas electrónicas).
        // Filtros opcionales: estado, vendedor (id), fecha_desde/hasta.
        // Devuelve cada fila con campo `tipo` = 'pedido' | 'factura'.
        $estado     = trim($_GET['estado']      ?? '');
        $vendedor   = trim($_GET['vendedor']    ?? ''); // ahora es CÓDIGO (V005, etc.)
        $fechaDesde = trim($_GET['fecha_desde'] ?? '');
        $fechaHasta = trim($_GET['fecha_hasta'] ?? '');

        // Resolver código de vendedor → (id_remoto, nombre). Si id_remoto está
        // mapeado lo usamos; si no, caemos a nombre_vendedor (single source of
        // truth porque ambas tablas guardan el nombre tal cual del push).
        $vendIdRemoto = null;
        $vendNombre   = null;
        if ($vendedor !== '') {
            $stmtV = $db->prepare("SELECT id_remoto, nombre FROM tbl_vendedores_movil WHERE codigo = ? LIMIT 1");
            $stmtV->execute([$vendedor]);
            $vRow = $stmtV->fetch();
            if ($vRow) {
                $vendIdRemoto = $vRow['id_remoto'] !== null ? intval($vRow['id_remoto']) : null;
                $vendNombre   = $vRow['nombre'];
            }
        }

        // --- Pedidos (sin CUFE) ---
        $wherePed = ["1=1"];
        $paramsPed = [];
        if ($estado !== '')     { $wherePed[] = "estado = ?";              $paramsPed[] = $estado; }
        if ($vendedor !== '') {
            if ($vendIdRemoto !== null) {
                $wherePed[] = "id_vendedor_remoto = ?";
                $paramsPed[] = $vendIdRemoto;
            } elseif ($vendNombre !== null) {
                $wherePed[] = "nombre_vendedor = ?";
                $paramsPed[] = $vendNombre;
            } else {
                // Código no encontrado: no devolver nada
                $wherePed[] = "1=0";
            }
        }
        if ($fechaDesde !== '') { $wherePed[] = "fecha >= ?";              $paramsPed[] = $fechaDesde; }
        if ($fechaHasta !== '') { $wherePed[] = "fecha <= ?";              $paramsPed[] = $fechaHasta; }
        $whereStrPed = implode(' AND ', $wherePed);

        $stmt = $db->prepare("SELECT *, 'pedido' AS tipo
            FROM tbl_pedidos_vendedor
            WHERE $whereStrPed
            ORDER BY fecha DESC, id DESC");
        $stmt->execute($paramsPed);
        $pedidos = $stmt->fetchAll();
        foreach ($pedidos as &$p) {
            $p['items'] = json_decode($p['items_json'] ?? '[]', true);
        }
        unset($p);

        // --- Facturas electrónicas con origen='movil' ---
        // Solo si NO se está filtrando por estado != enviado (los pedidos
        // tienen 'pendiente'/'procesado'/'anulado' que no aplican a FE).
        $facturas = [];
        $incluirFE = ($estado === '' || $estado === 'enviado' || $estado === 'autorizado');
        if ($incluirFE) {
            $whereFE = ["origen = 'movil'"];
            $paramsFE = [];
            if ($vendedor !== '') {
                if ($vendIdRemoto !== null) {
                    $whereFE[] = "ed.id_vendedor_remoto = ?";
                    $paramsFE[] = $vendIdRemoto;
                } elseif ($vendNombre !== null) {
                    $whereFE[] = "ed.nombre_vendedor = ?";
                    $paramsFE[] = $vendNombre;
                } else {
                    $whereFE[] = "1=0";
                }
            }
            if ($fechaDesde !== '') { $whereFE[] = "ed.fecha >= ?";          $paramsFE[] = $fechaDesde; }
            if ($fechaHasta !== '') { $whereFE[] = "ed.fecha <= ?";          $paramsFE[] = $fechaHasta; }
            $whereStrFE = implode(' AND ', $whereFE);

            // Mapear columnas a la misma estructura que pedidos para que el
            // frontend pueda renderizarlas sin diferenciar.
            $stmt = $db->prepare("SELECT
                    ed.id,
                    CONCAT(IFNULL(ed.prefix,''), ed.number) AS numero_pedido,
                    ed.cod_cliente AS id_cliente_remoto,
                    cl.Razon_Social AS nombre_cliente,
                    ed.customer_identification AS nit_cliente,
                    ed.id_vendedor_remoto,
                    ed.nombre_vendedor,
                    ed.fecha,
                    NULL AS subtotal,
                    NULL AS impuestos,
                    ed.total,
                    CASE
                        WHEN ed.payment_form_id = 1 THEN 'contado'
                        WHEN ed.payment_form_id = 2 THEN 'credito'
                        ELSE 'otro'
                    END AS forma_pago,
                    NULL AS observaciones,
                    ed.status AS estado,
                    ed.cufe,
                    'factura' AS tipo
                FROM electronic_documents ed
                LEFT JOIN tblclientes cl ON cl.CodigoClien = ed.cod_cliente
                WHERE $whereStrFE
                ORDER BY ed.fecha DESC, ed.id DESC");
            $stmt->execute($paramsFE);
            $facturas = $stmt->fetchAll();
        }

        // Combinar y ordenar por fecha DESC
        $todo = array_merge($pedidos, $facturas);
        usort($todo, function($a, $b) {
            $fa = $a['fecha'] ?? '';
            $fb = $b['fecha'] ?? '';
            if ($fa === $fb) {
                return intval($b['id'] ?? 0) - intval($a['id'] ?? 0);
            }
            return strcmp($fb, $fa);
        });

        // Resumen para cuadre por vendedor
        $resumen = [];
        foreach ($todo as $r) {
            $vendId   = intval($r['id_vendedor_remoto'] ?? 0);
            $vendName = $r['nombre_vendedor'] ?? 'Sin asignar';
            $key = $vendId . '|' . $vendName;
            if (!isset($resumen[$key])) {
                $resumen[$key] = [
                    'id_vendedor'   => $vendId,
                    'nombre_vendedor' => $vendName,
                    'pedidos'       => 0,
                    'facturas'      => 0,
                    'total_contado' => 0,
                    'total_credito' => 0,
                    'total_otro'    => 0,
                    'total_general' => 0,
                ];
            }
            $monto = floatval($r['total'] ?? 0);
            $fp = strtolower($r['forma_pago'] ?? 'otro');
            if ($r['tipo'] === 'pedido') $resumen[$key]['pedidos']++; else $resumen[$key]['facturas']++;
            if ($fp === 'contado')      $resumen[$key]['total_contado'] += $monto;
            elseif ($fp === 'credito')  $resumen[$key]['total_credito'] += $monto;
            else                        $resumen[$key]['total_otro']    += $monto;
            $resumen[$key]['total_general'] += $monto;
        }
        $resumenLista = array_values($resumen);
        usort($resumenLista, function($a, $b) {
            return strcmp($a['nombre_vendedor'], $b['nombre_vendedor']);
        });

        echo json_encode([
            'success'      => true,
            'pedidos'      => $todo,        // mezcla pedidos + facturas
            'resumen'      => $resumenLista, // cuadre por vendedor
            'total_filas'  => count($todo),
        ], JSON_UNESCAPED_UNICODE);
        exit;
    }

    if ($_SERVER['REQUEST_METHOD'] === 'POST') {
        $data = json_decode(file_get_contents('php://input'), true);
        $action = $data['action'] ?? '';

        if ($action === 'convertir') {
            $id = intval($data['id'] ?? 0);
            $usuarioId = intval($data['usuario_id'] ?? 0);

            $stmt = $db->prepare("SELECT * FROM tbl_pedidos_vendedor WHERE id = ? AND estado = 'pendiente'");
            $stmt->execute([$id]);
            $pedido = $stmt->fetch();

            if (!$pedido) {
                echo json_encode(['success' => false, 'message' => 'Pedido no encontrado o ya procesado'], JSON_UNESCAPED_UNICODE);
                exit;
            }

                // Si el frontend envía items ajustados, usarlos; si no, usar los del pedido
                $itemsAjustados = $data['items'] ?? null;
                if ($itemsAjustados && is_array($itemsAjustados) && count($itemsAjustados) > 0) {
                    $items = $itemsAjustados;
                } else {
                    $items = json_decode($pedido['items_json'] ?? '[]', true);
                }
                if (empty($items)) {
                    echo json_encode(['success' => false, 'message' => 'El pedido no tiene items']);
                    exit;
                }

                $db->beginTransaction();
                try {
                    // Recalcular totales si vienen items ajustados
                    $subtotal = 0;
                    $impuestos = 0;
                    $total = 0;
                    foreach ($items as $it) {
                        $cant = floatval($it['cantidad'] ?? 0);
                        if ($cant <= 0) continue;
                        $precio = floatval($it['precio_unitario'] ?? 0);
                        $st = $cant * $precio;
                        $ivaPct = floatval($it['porcentaje_iva'] ?? 19);
                        $iva = $st * ($ivaPct / 100);
                        $subtotal += $st;
                        $impuestos += $iva;
                        $total += $st + $iva;
                    }

                    $fecha = $pedido['fecha'] ?? date('Y-m-d');
                    $hora = date('H:i:s');
                    $descuento = 0;
                    $formaPago = strtolower($pedido['forma_pago'] ?? 'contado');
                    $esContado = $formaPago === 'contado';
                    $efectivo = $esContado ? $total : 0;
                    $transferencia = 0;
                    $cambio = 0;
                    $saldo = $esContado ? 0 : $total;
                    $pagada = $esContado ? 'S' : 'N';

                    $stmt = $db->prepare("
                        INSERT INTO tblventas
                        (Fecha, Hora, CodigoCli, A_nombre, Identificacion, Total, Impuesto, Descuento,
                         Tipo, EstadoFact, efectivo, valorpagado1, Cambio, Comentario, Id_Usuario,
                         id_mediopago, pagada, CodigoEmp, Saldo, Pago)
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'Valida', ?, ?, ?, ?, ?, 0, ?, 1, ?, ?)
                    ");
                    $stmt->execute([
                        $fecha . ' ' . $hora, $hora,
                        $pedido['id_cliente_remoto'] ?? 0,
                        $pedido['nombre_cliente'] ?? 'Cliente general',
                        $pedido['nit_cliente'] ?? '',
                        $total, $impuestos, $descuento,
                        $esContado ? 'Contado' : 'Credito',
                        $efectivo, $transferencia, $cambio,
                        'Convertido desde pedido móvil #' . $pedido['id_remoto'],
                        $usuarioId,
                        $pagada,
                        $saldo,
                        $formaPago,
                    ]);
                    $ventaId = $db->lastInsertId();

                    // Insertar detalles
                    foreach ($items as $item) {
                        $cantidad = floatval($item['cantidad'] ?? 0);
                        if ($cantidad <= 0) continue;
                        $precio = floatval($item['precio_unitario'] ?? 0);
                        $subt = $cantidad * $precio;
                        $ivaPct = floatval($item['porcentaje_iva'] ?? 19);
                        $iva = $subt * ($ivaPct / 100);

                        $db->prepare("
                            INSERT INTO tbldetalle_venta
                            (Factura_N, Items, Cantidad, PrecioV, PrecioC, Impuesto, Subtotal, IVA, Descuento, Entregado)
                            VALUES (?, ?, ?, ?, 0, ?, ?, ?, 0, 'S')
                        ")->execute([
                            $ventaId,
                            $item['id_producto'] ?? 0,
                            $cantidad,
                            $precio,
                            $iva,
                            $subt,
                            intval($ivaPct),
                        ]);

                        // Descontar stock
                        $db->prepare("UPDATE tblarticulos SET Existencia = Existencia - ? WHERE Items = ?")
                           ->execute([$cantidad, $item['id_producto']]);
                    }

                    // Actualizar pedido
                    $db->prepare("
                        UPDATE tbl_pedidos_vendedor
                        SET estado = 'procesado', convertido_factura_n = ?, fecha_mod = NOW()
                        WHERE id = ?
                    ")->execute([$ventaId, $id]);

                    $db->commit();

                    echo json_encode([
                        'success' => true,
                        'message' => 'Pedido convertido a venta #' . $ventaId,
                        'factura_n' => $ventaId,
                        'venta_id' => $ventaId,
                    ], JSON_UNESCAPED_UNICODE);

            } catch (Exception $e) {
                $db->rollBack();
                echo json_encode(['success' => false, 'message' => 'Error convirtiendo pedido: ' . $e->getMessage()], JSON_UNESCAPED_UNICODE);
            }
            exit;
        }

        if ($action === 'anular') {
            $id = intval($data['id'] ?? 0);
            $stmt = $db->prepare("UPDATE tbl_pedidos_vendedor SET estado = 'anulado', fecha_mod = NOW() WHERE id = ?");
            $stmt->execute([$id]);
            echo json_encode(['success' => true, 'message' => 'Pedido anulado'], JSON_UNESCAPED_UNICODE);
            exit;
        }

        if ($action === 'marcar_procesado') {
            $id = intval($data['id'] ?? 0);
            $facturaN = intval($data['factura_n'] ?? 0);
            $db->prepare("UPDATE tbl_pedidos_vendedor SET estado = 'procesado', convertido_factura_n = ?, fecha_mod = NOW() WHERE id = ?")
               ->execute([$facturaN, $id]);
            echo json_encode(['success' => true, 'message' => 'Pedido marcado como procesado'], JSON_UNESCAPED_UNICODE);
            exit;
        }
    }
} catch (Exception $e) {
    echo json_encode(['success' => false, 'message' => $e->getMessage()], JSON_UNESCAPED_UNICODE);
}
