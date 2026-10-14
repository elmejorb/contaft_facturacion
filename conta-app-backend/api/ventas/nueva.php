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
        // Fix defensivo: detectar columnas de conversion agregadas en 4.3.95.
        // Clientes que no corrieron actualizacion_completa no las tienen y el
        // SELECT crashea con "Unknown column FactorConversion".
        $colStmt = $db->query("SELECT COLUMN_NAME FROM information_schema.COLUMNS
            WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'tblarticulos'");
        $artCols = array_column($colStmt->fetchAll(PDO::FETCH_ASSOC), 'COLUMN_NAME');
        $selFactor    = in_array('FactorConversion', $artCols)   ? 'COALESCE(a.FactorConversion, 1)' : '1';
        $selNombreEmp = in_array('NombreEmpaque', $artCols)      ? 'a.NombreEmpaque'                 : 'NULL';
        $selVenderEmp = in_array('VenderComoEmpaque', $artCols)  ? 'COALESCE(a.VenderComoEmpaque, 0)' : '0';
        $selComprarEmp= in_array('ComprarComoEmpaque', $artCols) ? 'COALESCE(a.ComprarComoEmpaque, 0)' : '0';
        $selPrecioEmp = in_array('Precio_Venta_Empaque', $artCols) ? 'a.Precio_Venta_Empaque'         : 'NULL';

        // Búsqueda EXACTA por código (input de código + Enter, escáner de barras, etc.)
        // No usa LIKE para evitar falsos positivos como "1" trayendo cualquier producto con "1" en el código.
        if (isset($_GET['codigo'])) {
            $cod = trim($_GET['codigo'] ?? '');
            if ($cod === '') { echo json_encode(["success" => true, "articulos" => []]); exit; }
            $stmt = $db->prepare("
                SELECT a.Items, a.Codigo, a.Nombres_Articulo, a.Existencia, a.Precio_Costo,
                       a.Precio_Venta, a.Precio_Venta2, a.Precio_Venta3, a.Iva, a.Precio_Minimo,
                       COALESCE(a.Servicio, 0) AS Servicio,
                       a.Id_Etiqueta,
                       $selFactor AS factor_conversion,
                       $selNombreEmp AS nombre_empaque,
                       $selVenderEmp AS vender_como_empaque,
                       $selComprarEmp AS comprar_como_empaque,
                       $selPrecioEmp AS precio_venta_empaque,
                       COALESCE(c.Categoria, 'VARIOS') as Categoria
                FROM tblarticulos a
                LEFT JOIN tblcategoria c ON a.Id_Categoria = c.Id_Categoria
                WHERE a.Estado = 1 AND a.Codigo = :cod
                LIMIT 1
            ");
            $stmt->execute([':cod' => $cod]);
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

        $buscar = $_GET['buscar'] ?? '';
        if (strlen($buscar) < 1) {
            echo json_encode(["success" => true, "articulos" => []]);
            exit;
        }

        $stmt = $db->prepare("
            SELECT a.Items, a.Codigo, a.Nombres_Articulo, a.Existencia, a.Precio_Costo,
                   a.Precio_Venta, a.Precio_Venta2, a.Precio_Venta3, a.Iva, a.Precio_Minimo,
                   COALESCE(a.Servicio, 0) AS Servicio,
                   a.Id_Etiqueta,
                   $selFactor AS factor_conversion,
                   $selNombreEmp AS nombre_empaque,
                   $selVenderEmp AS vender_como_empaque,
                   $selComprarEmp AS comprar_como_empaque,
                   $selPrecioEmp AS precio_venta_empaque,
                   COALESCE(c.Categoria, 'VARIOS') as Categoria
            FROM tblarticulos a
            LEFT JOIN tblcategoria c ON a.Id_Categoria = c.Id_Categoria
            WHERE a.Estado = 1 AND (a.Codigo LIKE :cod OR a.Nombres_Articulo LIKE :nom)
            ORDER BY
                CASE
                    WHEN a.Codigo LIKE :pref_cod THEN 0
                    WHEN a.Nombres_Articulo LIKE :pref_nom THEN 1
                    ELSE 2
                END,
                a.Nombres_Articulo
            LIMIT 20
        ");
        $buscarLike = "%$buscar%";
        $buscarPref = "$buscar%";
        $stmt->execute([
            ':cod' => $buscarLike, ':nom' => $buscarLike,
            ':pref_cod' => $buscarPref, ':pref_nom' => $buscarPref
        ]);
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
    // tipo_documento: 'pos' (default) | 'electronica' | 'soporte' | 'cotizacion'
    // POS → tblventas (consecutivo propio). FE/DS → electronic_documents
    // (consecutivo DIAN propio). Son flujos SEPARADOS: una FE no gasta
    // Factura_N de POS, igual que en el sistema VB6 original.
    $tipoDocumento = $data->tipo_documento ?? 'pos';
    $esFE = in_array($tipoDocumento, ['electronica', 'soporte'], true);
    $esCotizacion = $tipoDocumento === 'cotizacion';

    // Guardarraíl: si no hay sesión de caja abierta para el vendedor, bloquear
    // la venta. Sin esto, cuando el cajero cerraba la caja desde otra pestaña y
    // volvía a Nueva Venta (que no re-chequea), la venta se guardaba igual pero
    // su Fecha quedaba FUERA del rango de cualquier caja → cuadre con faltante.
    // Las cotizaciones se permiten siempre (no afectan caja ni inventario).
    if (!$esCotizacion && intval($vendedor) > 0) {
        $stmtSes = $db->prepare("SELECT COUNT(*) FROM tblsesiones_caja
                                 WHERE Id_Usuario = ? AND Estado = 'abierta'");
        $stmtSes->execute([intval($vendedor)]);
        if (intval($stmtSes->fetchColumn()) === 0) {
            http_response_code(400);
            echo json_encode([
                'success' => false,
                'code' => 'CAJA_CERRADA',
                'message' => 'La caja está cerrada. Abre caja antes de registrar la venta.',
            ]);
            exit;
        }
    }

    // Régimen + IvaIncluido. Si NO es Responsable de IVA → IVA=0 siempre.
    // IvaIncluido=1 (default) → el precio del catálogo YA incluye IVA, hay
    // que extraerlo para no inflar el Total (bug previo: sumaba IVA encima
    // del bruto, una factura de $887.000 quedaba como $979.530).
    $stmtEmp = $db->query("SELECT Regimen, IvaIncluido FROM tbldatosempresa LIMIT 1");
    $empresaCfg = $stmtEmp->fetch();
    $empresaRegimen = strtolower((string)($empresaCfg['Regimen'] ?? ''));
    $esResponsableIVA = (strpos($empresaRegimen, 'común') !== false)
        || (strpos($empresaRegimen, 'comun') !== false)
        || (strpos($empresaRegimen, 'responsable') !== false);
    $ivaIncluidoCfg = intval($empresaCfg['IvaIncluido'] ?? 1) === 1;

    // Calculate totals
    // Mantenemos `subtotal` como suma de los brutos por línea (cant×precio-desc),
    // que es el SUBTOTAL clásico que muestra el sistema y que los informes
    // existentes asumen. Para el IVA y el TOTAL final sí respetamos
    // IvaIncluido: cuando el precio ya tiene IVA dentro, $totalIva se calcula
    // separando ese IVA del bruto (no se suma encima).
    $subtotal = 0;
    $totalIva = 0;
    $totalDescuento = $descuentoGlobal;

    foreach ($data->items as $item) {
        $cant = floatval($item->cantidad);
        $precio = floatval($item->precio);
        $desc = floatval($item->descuento ?? 0);
        $iva = $esResponsableIVA ? floatval($item->iva ?? 0) : 0;
        $lineAmount = ($cant * $precio) - $desc;
        if ($ivaIncluidoCfg && $iva > 0) {
            // Precio con IVA dentro: el IVA se extrae del bruto, NO se agrega.
            $lineaIva = round($lineAmount * ($iva / (100 + $iva)), 2);
        } else {
            $lineaIva = $iva > 0 ? round($lineAmount * ($iva / 100), 2) : 0;
        }
        $subtotal += $lineAmount;
        $totalIva += $lineaIva;
        $totalDescuento += $desc;
    }

    // Total a pagar: cuando IvaIncluido=1 el IVA ya está dentro del subtotal,
    // así que el total ES el subtotal. Cuando IvaIncluido=0 el IVA se agrega
    // al subtotal para llegar al total. En ambos casos restamos el descuento
    // global (bug reportado: factura 7486 guardó $210.000 cuando correspondía
    // $200.000 — el descuento global se guardaba en Descuento pero nunca se
    // restaba del Total).
    $totalBruto = $ivaIncluidoCfg ? $subtotal : ($subtotal + $totalIva);
    $total = max($totalBruto - $descuentoGlobal, 0);

    // Guardarraíl: en crédito el abono debe ser ESTRICTAMENTE menor que el total.
    // Si es igual, la venta es contado (no crédito con abono). Si es mayor, es
    // error de digitación. Bug reportado: usuaria digitó $24.500.000 en factura
    // de $116.700 (le sobraron 3 ceros) → pago fantasma de $24.5M en tblpagos.
    if ($tipo !== 'Contado' && $abono > 0 && $abono >= $total && $total > 0) {
        http_response_code(400);
        echo json_encode([
            'success' => false,
            'message' => "El abono ($abono) debe ser MENOR que el total ($total). Si va a pagar completo, cambie el término a Contado.",
        ]);
        exit;
    }

    $saldo = $tipo === 'Contado' ? 0 : max($total - $abono, 0);
    $pagada = $tipo === 'Contado' ? '1' : ($saldo <= 0 ? '1' : '');
    $pago = $tipo === 'Contado' ? ($efectivo + $valorPagado) : $abono;
    $cambio = $tipo === 'Contado' ? max(($efectivo + $valorPagado) - $total, 0) : 0;

    // Fecha de la venta. Default = NOW() (timestamp con fecha+hora actuales).
    // Si el frontend manda una fecha custom (toggle "Permitir cambiar la fecha
    // de la venta" en Reglas de Venta), validamos formato YYYY-MM-DD y la
    // combinamos con la hora actual. N_Mes y anio se derivan de esa fecha
    // para que los informes mensuales/anuales clasifiquen correctamente.
    $fechaCustom = isset($data->fecha) && $data->fecha
        ? trim((string)$data->fecha)
        : null;
    $fechaParaInsert = 'NOW()';
    $fechaParams = [];
    if ($fechaCustom !== null && preg_match('/^\d{4}-\d{2}-\d{2}$/', $fechaCustom)) {
        // Combinamos la fecha custom con la hora actual para mantener trazabilidad
        $fechaTimestamp = $fechaCustom . ' ' . date('H:i:s');
        $fechaParaInsert = ':fecha_custom';
        $fechaParams[':fecha_custom'] = $fechaTimestamp;
        $mesActual = intval(date('n', strtotime($fechaCustom)));
        $anioVenta = intval(date('Y', strtotime($fechaCustom)));
    } else {
        $mesActual = intval(date('n'));
        $anioVenta = intval(date('Y'));
    }
    $hora = date('H:i');

    // ============================================================
    // ROUTING FE/DS — si es Factura Electrónica o Documento Soporte,
    // va DIRECTO a electronic_documents (no toca tblventas). Es el
    // mismo modelo del sistema VB6 original: FE y POS en tablas
    // separadas, con consecutivos propios. Al terminar hace commit
    // y return; el flujo POS de abajo NO se ejecuta.
    // ============================================================
    if ($esFE) {
        // Fecha para FE: electronic_documents.fecha es DATE (no DATETIME).
        $fechaFE = $fechaCustom ?: date('Y-m-d');

        // Metadata de pago (DIAN):
        //   payment_form_id: 1=Contado, 2=Crédito
        //   payment_method_id: catálogo DIAN (10=Efectivo, 14=Tarjeta, 30=Transferencia)
        $payForm = ($tipo === 'Contado') ? 1 : 2;
        $payDueDays = ($payForm === 2) ? intval($dias) : 0;
        $payMethod = ($medioPago === 1) ? 14 : (($medioPago >= 2) ? 30 : 10);

        // type_document_id: 1 = Factura Electrónica, 11 = Doc. Soporte Electrónico
        $typeDocId = ($tipoDocumento === 'soporte') ? 11 : 1;
        $prefijo = ($tipoDocumento === 'soporte') ? 'DS' : 'FCON';

        // Insertar con number provisional 0; status='borrador'. Si choca con
        // otro borrador en (prefix, 0) movemos los existentes a 9e9+id.
        // Mismo mecanismo que ya usa enviar.php antes de enviar a DIAN.
        $db->prepare("
            UPDATE electronic_documents
            SET number = 9000000000 + id
            WHERE prefix = ? AND number = 0 AND status IN ('borrador', 'pendiente', 'rechazado')
        ")->execute([$prefijo]);

        $saldoFE = $tipo === 'Contado' ? 0 : max($total - $abono, 0);
        $pagadaFE = $tipo === 'Contado' ? 'S' : ($saldoFE <= 0 ? 'S' : 'N');

        // Columna 'saldo' no está en todas las BDs (existe en distrisalsa, no
        // en innovacion). Chequeo defensivo para INSERT compatible.
        $tieneSaldo = (int)$db->query("SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='electronic_documents' AND COLUMN_NAME='saldo'")->fetchColumn() > 0;
        $colSaldo = $tieneSaldo ? ', saldo' : '';
        $valSaldo = $tieneSaldo ? ', ?' : '';

        $stmtFE = $db->prepare("
            INSERT INTO electronic_documents
            (fecha, cod_cliente, customer_identification, customer_name,
             type_document_id, prefix, number, status, payment_due_days, descuento, total,
             payment_form_id, payment_method_id, id_usuario, abono, codigoEmp,
             id_mediopago, efectivo, valorpagado1, pagada, nota, EstadoFact $colSaldo)
            VALUES (?, ?, ?, ?, ?, ?, 0, 'borrador', ?, ?, ?, ?, ?, ?, ?, 0, ?, ?, ?, ?, ?, 1 $valSaldo)
        ");
        $paramsFE = [
            $fechaFE, $clienteId, $clienteIdent, $clienteNombre,
            $typeDocId, $prefijo, $payDueDays, $totalDescuento, $total,
            $payForm, $payMethod, $vendedor, $abono,
            $medioPago, $efectivo, $valorPagado, $pagadaFE, $comentario
        ];
        if ($tieneSaldo) $paramsFE[] = $saldoFE;
        $stmtFE->execute($paramsFE);
        $docElecId = (int)$db->lastInsertId();

        // Loop items: SOLO detalle_document_electronic.
        //
        // REGLA (v4.7.14 — igual que el sistema VB6 original):
        // una FE en borrador NO toca inventario ni kardex. El stock se
        // descuenta únicamente cuando DIAN autoriza la factura, dentro de
        // facturacion-electronica/enviar.php (case 'factura'). Si la FE
        // queda en contingencia o es rechazada, el inventario sigue intacto.
        //
        // Bug previo (v4.6–v4.7.13): acá se bajaba stock + kardex al crear
        // el borrador, y enviar.php volvía a bajarlo al autorizar DIAN =>
        // doble descuento por cada FE autorizada (32 pares detectados en
        // Nutrigranos). Fix: eliminar la bajada local y dejar un solo
        // responsable (enviar.php).
        //
        // Columna 'entregado' defensiva — solo existe desde v4.7. Si no está
        // (BD sin migrar) el INSERT se ejecuta sin ella y la columna queda
        // en su default.
        $tieneEntregadoFE = (int)$db->query("SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='detalle_document_electronic' AND COLUMN_NAME='entregado'")->fetchColumn() > 0;
        $colEntregadoFE = $tieneEntregadoFE ? ', entregado' : '';
        $valEntregadoFE = $tieneEntregadoFE ? ', ?' : '';
        $stmtDetFE = $db->prepare("
            INSERT INTO detalle_document_electronic
            (factura_n, items, unit_measure_id, invoiced_quantity, line_extension_amount,
             free_of_charge_indicator, description, type_item_identification_id,
             price_amount, PrecioCosto, discount_amount, base_quantity,
             tax_id, tax_amount, taxable_amount, tax_percent $colEntregadoFE)
            VALUES (?, ?, ?, ?, ?, 0, ?, 3, ?, ?, ?, ?, 1, ?, ?, ? $valEntregadoFE)
        ");
        // Referencia textual para el abono inicial (si aplica). Antes se usaba
        // también como detalle del kardex, pero el kardex ya no se inserta aquí.
        $refKardex = "$prefijo-$docElecId";

        foreach ($data->items as $item) {
            $itemId = intval($item->items);
            $cant = floatval($item->cantidad);
            $precioV = floatval($item->precio);
            $precioC = floatval($item->precio_costo);
            $desc = floatval($item->descuento ?? 0);
            $iva = $esResponsableIVA ? floatval($item->iva ?? 0) : 0;
            $esServicio = !empty($item->es_servicio);
            if ($esServicio) {
                $srv = $db->prepare("SELECT COALESCE(Servicio, 0) FROM tblarticulos WHERE Items = ?");
                $srv->execute([$itemId]);
                if (intval($srv->fetchColumn()) === 0) $esServicio = false;
            }
            $lineAmount = ($cant * $precioV) - $desc;
            // IVA siempre incluido en el precio (regla del sistema): se extrae.
            $lineaIva = $iva > 0 ? round($lineAmount * ($iva / (100 + $iva)), 2) : 0;
            $baseAmount = $lineAmount - $lineaIva;

            // Nombre del artículo para description
            $nomSt = $db->prepare("SELECT Nombres_Articulo, unit_measure_id FROM tblarticulos WHERE Items = ?");
            $nomSt->execute([$itemId]);
            $art = $nomSt->fetch() ?: ['Nombres_Articulo' => 'Producto', 'unit_measure_id' => 70];
            $descripcion = $esServicio && !empty($item->descripcion_temp)
                ? $item->descripcion_temp
                : ($art['Nombres_Articulo'] ?? 'Producto');
            $unitMeasure = intval($art['unit_measure_id'] ?? 70);

            $entregadoFE = (isset($item->entregado) && $item->entregado === 'N') ? 'N' : 'S';
            $paramsDetFE = [
                $docElecId, $itemId, $unitMeasure,
                number_format($cant, 2, '.', ''), number_format($baseAmount, 2, '.', ''),
                $descripcion,
                number_format($precioV, 2, '.', ''),
                number_format($precioC, 4, '.', ''),
                number_format($desc, 2, '.', ''),
                number_format($cant, 2, '.', ''),
                number_format($lineaIva, 2, '.', ''),
                number_format($baseAmount, 2, '.', ''),
                number_format($iva, 2, '.', '')
            ];
            if ($tieneEntregadoFE) $paramsDetFE[] = $entregadoFE;
            $stmtDetFE->execute($paramsDetFE);
            // (No se toca tblarticulos ni tblkardex aquí — ver bloque superior.)
        }

        // Abono inicial en FE a crédito → tblpagos con Nfact_electronica
        // (NO Fact_N, para que no colisione con una venta POS del mismo número)
        if ($tipo !== 'Contado' && $abono > 0) {
            $rec = (int)$db->query("SELECT COALESCE(MAX(RecCajaN), 0) + 1 FROM tblpagos")->fetchColumn();
            $abonoMedio = isset($data->abono_medio_pago) && $data->abono_medio_pago !== null
                ? intval($data->abono_medio_pago)
                : $medioPago;
            $db->prepare("
                INSERT INTO tblpagos (RecCajaN, Codigo, Fact_N, ValorPago, Fecha, DetallePago,
                    ValorFact, SaldoAct, Descuento, Retencion, Estado, Afectada, id_mediopago,
                    NFactAnt, Nfact_electronica, FechaMod, id_usuario)
                VALUES (?, ?, NULL, ?, NOW(), ?, ?, ?, 0, 0, 'Valida', '1110', ?, '', ?, NOW(), ?)
            ")->execute([
                $rec, $clienteId, $abono,
                "Abono inicial FE $refKardex",
                $total, max($total - $abono, 0),
                $abonoMedio, $refKardex, $vendedor
            ]);
        }

        $db->commit();

        echo json_encode([
            "success" => true,
            "message" => "Documento FE #$docElecId creado (borrador, pendiente DIAN)",
            "origen" => "FE",
            "doc_elec_id" => $docElecId,
            "prefix" => $prefijo,
            "Total" => $total,
            "Cambio" => $cambio
        ], JSON_UNESCAPED_UNICODE);
        exit;
    }
    // ============================================================
    // FIN ROUTING FE — a partir de aquí, flujo POS clásico (tblventas)
    // ============================================================

    // Insert factura (sin Factura_N — AUTO_INCREMENT lo genera)
    $stmt = $db->prepare("
        INSERT INTO tblventas (N_Mes, anio, Fecha, Tipo, Dias, CodigoCli, A_nombre,
            Identificacion, Direccion, Telefono, Impuesto, Descuento, Total, Saldo,
            EstadoPedido, Comentario, EstadoFact, Pago, Cambio, Hora, Id_Usuario,
            Abono, pagada, CodigoEmp, id_mediopago, efectivo, valorpagado1)
        VALUES (:mes, :anio, $fechaParaInsert, :tipo, :dias, :cli, :nombre, :ident, :dir, :tel,
            :imp, :desc, :total, :saldo, 'Recibido', :com, 'Valida', :pago, :cambio, :hora,
            :usuario, :abono, :pagada, 0, :medio, :efectivo, :valorpagado)
    ");
    $params = [
        ':mes' => $mesActual, ':anio' => $anioVenta,
        ':tipo' => $tipo, ':dias' => $dias, ':cli' => $clienteId,
        ':nombre' => $clienteNombre, ':ident' => $clienteIdent,
        ':dir' => $clienteDir, ':tel' => $clienteTel,
        ':imp' => $totalIva, ':desc' => $totalDescuento, ':total' => $total,
        ':saldo' => $saldo, ':com' => $comentario, ':pago' => $pago,
        ':cambio' => $cambio, ':hora' => $hora, ':usuario' => $vendedor,
        ':abono' => $abono, ':pagada' => $pagada, ':medio' => $medioPago,
        ':efectivo' => $efectivo, ':valorpagado' => $valorPagado,
    ];
    $stmt->execute(array_merge($params, $fechaParams));

    $factN = $db->lastInsertId();

    // Insert detail + update stock + kardex.
    // Entregado: 'S' default (descuenta inventario como siempre). En modo
    // Fabricación (v4.7), el frontend puede mandar 'N' por línea → la línea
    // se guarda como pendiente, NO descuenta stock ni mueve kardex hasta
    // que se marque como entregada después desde DetalleFacturaModal.
    $stmtDetalle = $db->prepare("
        INSERT INTO tbldetalle_venta (Factura_N, Items, Cantidad, PrecioC, PrecioV, Impuesto, Subtotal, IVA, Descuento, Entregado, DescripcionTemp)
        VALUES (:fact, :items, :cant, :pc, :pv, :imp, :sub, :iva, :desc, :entregado, :desc_temp)
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
        $iva = $esResponsableIVA ? floatval($item->iva ?? 0) : 0;
        // Servicio: el item NO descuenta inventario ni mueve kardex. Permite
        // editar el concepto por venta (DescripcionTemp).
        //
        // DEFENSA CRUZADA (v4.3.66): si el frontend manda es_servicio=1 pero
        // el catálogo dice tblarticulos.Servicio=0, prevalece el catálogo.
        // Evita que un flujo raro del cliente (versión vieja, cache stale,
        // pedido móvil malformado) marque un producto como servicio y deje
        // el stock desincronizado. Caso real: 5 ventas de Ammi (jul-2026)
        // corregidas manualmente por este mismo síntoma.
        $esServicio = !empty($item->es_servicio);
        if ($esServicio) {
            $stmtSrv = $db->prepare("SELECT COALESCE(Servicio, 0) FROM tblarticulos WHERE Items = ?");
            $stmtSrv->execute([$itemId]);
            $servicioCatalogo = intval($stmtSrv->fetchColumn());
            if ($servicioCatalogo === 0) {
                $esServicio = false;  // catálogo manda — es producto, descuenta
            }
        }
        $descTemp = $esServicio ? (string)($item->descripcion_temp ?? '') : null;
        // Modo Fabricación: línea pendiente de producir — NO descuenta stock
        // ni mueve kardex. Se marca con Entregado='N' y se desbloquea cuando
        // el usuario la marque entregada desde DetalleFacturaModal.
        $entregadoLinea = (isset($item->entregado) && $item->entregado === 'N') ? 'N' : 'S';
        $lineaSubtotal = ($cant * $precioV) - $desc;
        // Misma fórmula que arriba: respeta IvaIncluido para que el monto del
        // IMPUESTO no se infle cuando el precio ya trae IVA dentro.
        if ($ivaIncluidoCfg && $iva > 0) {
            $lineaIva = round($lineaSubtotal * ($iva / (100 + $iva)), 2);
        } else {
            $lineaIva = $iva > 0 ? round($lineaSubtotal * ($iva / 100), 2) : 0;
        }

        $stmtDetalle->execute([
            ':fact' => $factN, ':items' => $itemId, ':cant' => $cant,
            ':pc' => $precioC, ':pv' => $precioV, ':imp' => $lineaIva,
            ':sub' => $lineaSubtotal, ':iva' => $iva, ':desc' => $desc,
            ':entregado' => $entregadoLinea,
            ':desc_temp' => $descTemp,
        ]);

        // Servicios: saltar TODO el bloque de stock/kardex/componentes. Solo
        // se registra el detalle y se pasa al siguiente item.
        if ($esServicio) continue;

        // Línea pendiente (fabricación): no descuenta stock ni kardex.
        if ($entregadoLinea === 'N') continue;

        // ¿El producto tiene componentes? Si sí, descontar componentes en vez del padre.
        $stmtComp = $db->prepare("
            SELECT a.Codigo AS codigo_padre, a.Nombres_Articulo AS nombre_padre, a.tiene_componentes
            FROM tblarticulos a WHERE a.Items = ?
        ");
        $stmtComp->execute([$itemId]);
        $artPadre = $stmtComp->fetch();
        $tieneComp = $artPadre && intval($artPadre['tiene_componentes']) === 1;

        if ($tieneComp) {
            // Cargar receta
            $stmtR = $db->prepare("
                SELECT c.Items_Componente, c.Cantidad, h.Codigo, h.Nombres_Articulo, h.Existencia, h.Precio_Costo
                FROM tblproducto_componentes c
                INNER JOIN tblarticulos h ON c.Items_Componente = h.Items
                WHERE c.Items_Padre = ?
            ");
            $stmtR->execute([$itemId]);
            $componentes = $stmtR->fetchAll();

            foreach ($componentes as $cmp) {
                $cantConsumir = $cant * floatval($cmp['Cantidad']);
                $costoUnitC = floatval($cmp['Precio_Costo']);

                // Descontar existencia del componente
                $stmtStock->execute([':cant' => $cantConsumir, ':items' => intval($cmp['Items_Componente'])]);

                // Saldo nuevo
                $stmtExistC = $db->prepare("SELECT Existencia FROM tblarticulos WHERE Items = :id");
                $stmtExistC->execute([':id' => intval($cmp['Items_Componente'])]);
                $rowC = $stmtExistC->fetch();
                $existC = $rowC ? floatval($rowC['Existencia']) : 0;

                $stmtKardex->execute([
                    ':mes' => $mesNombre, ':items' => intval($cmp['Items_Componente']),
                    ':det' => "Consumo por venta de {$artPadre['codigo_padre']} - Fra. N° $factN",
                    ':cant' => $cantConsumir, ':cost_sal' => $cantConsumir * $costoUnitC,
                    ':saldo_cant' => $existC, ':saldo_cost' => $existC * $costoUnitC,
                    ':cost_unit' => $costoUnitC,
                ]);
            }

            // Registrar venta del padre en kardex (informativo, sin tocar existencia del padre)
            $stmtExistP = $db->prepare("SELECT Existencia, Precio_Costo FROM tblarticulos WHERE Items = :id");
            $stmtExistP->execute([':id' => $itemId]);
            $artP = $stmtExistP->fetch();
            $costoP = $artP ? floatval($artP['Precio_Costo']) : 0;
            $existP = $artP ? floatval($artP['Existencia']) : 0;
            $stmtKardex->execute([
                ':mes' => $mesNombre, ':items' => $itemId,
                ':det' => "Venta Fra. N° $factN (compuesto - desc. componentes)",
                ':cant' => 0, ':cost_sal' => 0,
                ':saldo_cant' => $existP, ':saldo_cost' => $existP * $costoP,
                ':cost_unit' => $costoP,
            ]);
        } else {
            // Comportamiento normal: descontar existencia del producto vendido
            $stmtStock->execute([':cant' => $cant, ':items' => $itemId]);

            $stmtExist = $db->prepare("SELECT Existencia, Precio_Costo FROM tblarticulos WHERE Items = :id");
            $stmtExist->execute([':id' => $itemId]);
            $artActual = $stmtExist->fetch();
            // Si el fetch devuelve false (Items no existe en tblarticulos) NO
            // rompemos la venta — se ignora el asiento de kardex. Esto pasa con
            // ítems legacy o registros huérfanos que no deberían estar ahí.
            if ($artActual) {
                $costoUnit = floatval($artActual['Precio_Costo']);
                $existActual = floatval($artActual['Existencia']);
                $stmtKardex->execute([
                    ':mes' => $mesNombre, ':items' => $itemId,
                    ':det' => "Venta Fra. N° $factN",
                    ':cant' => $cant, ':cost_sal' => $cant * $costoUnit,
                    ':saldo_cant' => $existActual, ':saldo_cost' => $existActual * $costoUnit,
                    ':cost_unit' => $costoUnit
                ]);
            }
        }
    }

    // Si es venta a crédito con abono inicial > 0, registrar también en
    // tblpagos para que el módulo de Cartera/Pagar y la vista de saldos vea
    // el abono. Antes solo se guardaba en tblventas.Abono y el saldo cacheado,
    // pero la vista vw_saldos_por_factura calcula sobre tblpagos → mostraba
    // saldo completo y permitía cobrar el abono de nuevo.
    if ($tipo !== 'Contado' && $abono > 0) {
        $stmtRecCaja = $db->query("SELECT COALESCE(MAX(RecCajaN), 0) + 1 AS next_rec FROM tblpagos");
        $recCajaN = intval($stmtRecCaja->fetch()['next_rec']);

        // Medio de pago del abono: si viene abono_medio_pago (v4.7.2) se usa
        // ese; si no, cae al medio general de la factura (compat con payloads
        // viejos). Antes el abono siempre entraba como "Efectivo" independiente
        // de cómo lo pagara el cliente.
        $abonoMedio = isset($data->abono_medio_pago) && $data->abono_medio_pago !== null
            ? intval($data->abono_medio_pago)
            : $medioPago;

        $stmtAbonoPago = $db->prepare("
            INSERT INTO tblpagos (RecCajaN, Codigo, Fact_N, ValorPago, Fecha, DetallePago,
                ValorFact, SaldoAct, Descuento, Retencion, Estado, Afectada, id_mediopago,
                NFactAnt, Nfact_electronica, FechaMod, id_usuario)
            VALUES (:rec, :codigo, :fact_n, :valor, NOW(), :detalle,
                :valor_fact, :saldo_act, 0, 0, 'Valida', '1110', :medio,
                '', '', NOW(), :id_user)
        ");
        $stmtAbonoPago->execute([
            ':rec'        => $recCajaN,
            ':codigo'     => $clienteId,
            ':fact_n'     => $factN,
            ':valor'      => $abono,
            ':detalle'    => "Abono inicial al crear factura N° $factN",
            ':valor_fact' => $total,
            ':saldo_act'  => max($total - $abono, 0),
            ':medio'      => $abonoMedio,
            ':id_user'    => $vendedor,
        ]);
    }

    // Guardar retenciones aplicadas a esta factura (snapshot)
    if (!empty($data->retenciones) && is_array($data->retenciones)) {
        $stmtRet = $db->prepare("
            INSERT INTO tblventa_retenciones (Factura_N, Id_Retencion, Codigo, Nombre, Porcentaje, Base, Valor, Modo)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        ");
        foreach ($data->retenciones as $ret) {
            $stmtRet->execute([
                $factN,
                intval($ret->id_retencion ?? 0) ?: null,
                $ret->codigo ?? '',
                $ret->nombre ?? '',
                floatval($ret->porcentaje ?? 0),
                floatval($ret->base ?? 0),
                floatval($ret->valor ?? 0),
                ($ret->modo ?? 'informativo') === 'gross_up' ? 'gross_up' : 'informativo',
            ]);
        }
    }

    $db->commit();

    echo json_encode([
        "success" => true,
        "message" => "Factura #$factN creada exitosamente",
        "origen" => "POS",
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
