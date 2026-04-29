<?php
/**
 * CRUD Proveedores + cartera
 * GET           → listar proveedores con saldo
 * GET ?id=X     → detalle de un proveedor (facturas + pagos)
 * POST          → crear proveedor
 * PUT           → actualizar proveedor
 */

require_once '../config/database.php';

$database = new Database();
$db = $database->getConnection();
$method = $_SERVER['REQUEST_METHOD'];

try {
    switch ($method) {
        case 'GET':
            $id = $_GET['id'] ?? null;

            if ($id) {
                // Detalle: proveedor + facturas pendientes + egresos
                $stmt = $db->prepare("SELECT * FROM tblproveedores WHERE CodigoPro = :id");
                $stmt->execute([':id' => $id]);
                $prov = $stmt->fetch();
                if (!$prov) {
                    http_response_code(404);
                    echo json_encode(["success" => false, "message" => "Proveedor no encontrado"]);
                    exit;
                }

                // Facturas pendientes: suma saldos iniciales + pedidos a crédito con saldo
                $stmt = $db->prepare("
                    SELECT ID_FactAnterioresP, FacturaN, Fecha, Dias, Valor, Saldo, Origen,
                           DATEDIFF(CURDATE(), Fecha) as Dias_Mora
                    FROM (
                        SELECT ID_FactAnterioresP, FacturaN, Fecha, Dias, Valor, Saldo,
                               'anterior' AS Origen, CodigoProv
                        FROM tblfacturasanterioresproveedor
                        WHERE Saldo > 0
                        UNION ALL
                        SELECT Pedido_N AS ID_FactAnterioresP, FacturaCompra_N AS FacturaN,
                               Fecha, Dias, Total AS Valor, Saldo, 'pedido' AS Origen, CodigoPro AS CodigoProv
                        FROM tblpedidos
                        WHERE TipoPedido = 'Crédito' AND Saldo > 0
                    ) x
                    WHERE CodigoProv = :id
                    ORDER BY Fecha
                ");
                $stmt->execute([':id' => $id]);
                $pendientes = $stmt->fetchAll();
                foreach ($pendientes as &$f) {
                    $f['Valor'] = floatval($f['Valor']);
                    $f['Saldo'] = floatval($f['Saldo']);
                    $f['Dias_Mora'] = intval($f['Dias_Mora']);
                }

                // Todas las facturas del año (ambas fuentes)
                $anio = $_GET['anio'] ?? date('Y');
                $stmt = $db->prepare("
                    SELECT ID_FactAnterioresP, FacturaN, Fecha, Dias, Valor, Saldo, Origen
                    FROM (
                        SELECT ID_FactAnterioresP, FacturaN, Fecha, Dias, Valor, Saldo,
                               'anterior' AS Origen, CodigoProv
                        FROM tblfacturasanterioresproveedor
                        UNION ALL
                        SELECT Pedido_N AS ID_FactAnterioresP, FacturaCompra_N AS FacturaN,
                               Fecha, Dias, Total AS Valor, Saldo, 'pedido' AS Origen, CodigoPro AS CodigoProv
                        FROM tblpedidos
                    ) x
                    WHERE CodigoProv = :id AND YEAR(Fecha) = :anio
                    ORDER BY Fecha DESC
                ");
                $stmt->execute([':id' => $id, ':anio' => $anio]);
                $facturas = $stmt->fetchAll();
                foreach ($facturas as &$f) {
                    $f['Valor'] = floatval($f['Valor']);
                    $f['Saldo'] = floatval($f['Saldo']);
                }

                // Egresos (pagos)
                $stmt = $db->prepare("
                    SELECT Id_Egresos, N_Comprobante, Fecha, Concepto, Valor, Descuento,
                           Estado, NFacturaAnt, ValorFact, Saldoact, TipoPago
                    FROM tblegresos
                    WHERE CodigoPro = :id AND Estado = 'Valida'
                    ORDER BY Fecha DESC
                    LIMIT 100
                ");
                $stmt->execute([':id' => $id]);
                $egresos = $stmt->fetchAll();
                foreach ($egresos as &$e) {
                    $e['Valor'] = floatval($e['Valor']);
                    $e['Descuento'] = floatval($e['Descuento']);
                    $e['ValorFact'] = floatval($e['ValorFact']);
                    $e['Saldoact'] = floatval($e['Saldoact']);
                }

                // Años disponibles (ambas fuentes)
                $stmt = $db->prepare("
                    SELECT DISTINCT YEAR(Fecha) as anio FROM (
                        SELECT Fecha, CodigoProv FROM tblfacturasanterioresproveedor
                        UNION ALL
                        SELECT Fecha, CodigoPro AS CodigoProv FROM tblpedidos
                    ) x WHERE CodigoProv = :id ORDER BY anio DESC
                ");
                $stmt->execute([':id' => $id]);
                $aniosDisp = array_column($stmt->fetchAll(), 'anio');

                $totalPendiente = array_sum(array_column($pendientes, 'Saldo'));

                echo json_encode([
                    "success" => true,
                    "proveedor" => $prov,
                    "pendientes" => $pendientes,
                    "facturas" => $facturas,
                    "egresos" => $egresos,
                    "anios_disponibles" => $aniosDisp,
                    "total_pendiente" => $totalPendiente
                ], JSON_UNESCAPED_UNICODE);

            } else {
                // Listado con saldos — suma facturas anteriores (saldos iniciales) + pedidos en sistema
                $stmt = $db->query("
                    SELECT p.CodigoPro, p.RazonSocial, p.Nit, p.Telefonos, p.Direccion,
                           COALESCE(sld.Facturas_Pendientes, 0) as Facturas_Pendientes,
                           COALESCE(sld.Saldo_Total, 0)         as Saldo_Total,
                           COALESCE(sld.Dias_Mayor, 0)          as Dias_Mayor_Vencimiento,
                           COALESCE(tot.Total_Compras, 0)       as Total_Compras,
                           COALESCE(tot.Monto_Compras, 0)       as Monto_Compras
                    FROM tblproveedores p
                    LEFT JOIN (
                        -- Saldos pendientes: une facturas anteriores + pedidos a crédito con saldo
                        SELECT CodigoProv,
                               COUNT(*) as Facturas_Pendientes,
                               SUM(Saldo) as Saldo_Total,
                               DATEDIFF(CURDATE(), MIN(Fecha)) as Dias_Mayor
                        FROM (
                            SELECT CodigoProv, Saldo, Fecha FROM tblfacturasanterioresproveedor WHERE Saldo > 0
                            UNION ALL
                            SELECT CodigoPro AS CodigoProv, Saldo, Fecha FROM tblpedidos WHERE TipoPedido = 'Crédito' AND Saldo > 0
                        ) x
                        GROUP BY CodigoProv
                    ) sld ON p.CodigoPro = sld.CodigoProv
                    LEFT JOIN (
                        -- Totales de compras: incluye saldos iniciales + pedidos (cualquier tipo)
                        SELECT CodigoProv,
                               COUNT(*) as Total_Compras,
                               SUM(Valor) as Monto_Compras
                        FROM (
                            SELECT CodigoProv, Valor FROM tblfacturasanterioresproveedor
                            UNION ALL
                            SELECT CodigoPro AS CodigoProv, Total AS Valor FROM tblpedidos
                        ) y
                        GROUP BY CodigoProv
                    ) tot ON p.CodigoPro = tot.CodigoProv
                    ORDER BY p.RazonSocial
                ");
                $proveedores = $stmt->fetchAll();

                foreach ($proveedores as &$p) {
                    $p['Saldo_Total'] = floatval($p['Saldo_Total']);
                    $p['Monto_Compras'] = floatval($p['Monto_Compras']);
                    $p['Facturas_Pendientes'] = intval($p['Facturas_Pendientes']);
                    $p['Total_Compras'] = intval($p['Total_Compras']);
                    $p['Dias_Mayor_Vencimiento'] = intval($p['Dias_Mayor_Vencimiento']);
                }

                $totalSaldo = array_sum(array_column($proveedores, 'Saldo_Total'));
                $conSaldo = count(array_filter($proveedores, fn($p) => $p['Saldo_Total'] > 0));

                echo json_encode([
                    "success" => true,
                    "proveedores" => $proveedores,
                    "total" => count($proveedores),
                    "resumen" => [
                        "total" => count($proveedores),
                        "con_saldo" => $conSaldo,
                        "total_deuda" => $totalSaldo,
                        "monto_compras" => array_sum(array_column($proveedores, 'Monto_Compras'))
                    ]
                ], JSON_UNESCAPED_UNICODE);
            }
            break;

        case 'POST':
            $data = json_decode(file_get_contents("php://input"));

            // Pago a proveedor
            if (isset($data->action) && $data->action === 'pagar') {
                $provId = $data->proveedor ?? null;
                $pagos = $data->pagos ?? [];
                $tipoPago = $data->tipo_pago ?? 2;
                $idUsuario = intval($data->id_usuario ?? 0) ?: null;

                if (!$provId || empty($pagos)) {
                    http_response_code(400);
                    echo json_encode(["success" => false, "message" => "Proveedor y pagos requeridos"]);
                    exit;
                }

                $db->beginTransaction();

                $stmt = $db->query("SELECT COALESCE(MAX(N_Comprobante), 0) + 1 as next FROM tblegresos");
                $nComprobante = $stmt->fetch()['next'];

                // Get proveedor info
                $stmt = $db->prepare("SELECT RazonSocial, Nit FROM tblproveedores WHERE CodigoPro = :id");
                $stmt->execute([':id' => $provId]);
                $prov = $stmt->fetch();

                $stmtInsert = $db->prepare("
                    INSERT INTO tblegresos (N_Comprobante, Fecha, Orden, Concepto, Valor, Descuento,
                        Estado, Cuentas, FactN, CodigoPro, NFacturaAnt, ValorFact, Saldoact, Cedula, TipoPago, id_usuario)
                    VALUES (:comp, NOW(), :orden, :concepto, :valor, :desc, 'Valida', '1110', '0',
                        :prov, :nfact, :valfact, :saldo, :cedula, :tipo, :id_user)
                ");

                $stmtUpdAnt    = $db->prepare("UPDATE tblfacturasanterioresproveedor SET Saldo = Saldo - :pago WHERE ID_FactAnterioresP = :id");
                $stmtUpdPedido = $db->prepare("UPDATE tblpedidos SET Saldo = Saldo - :pago WHERE Pedido_N = :id");

                $totalPagado = 0;
                $facturasAfectadas = 0;
                $facturasNums = [];

                foreach ($pagos as $pago) {
                    $factId = intval($pago->fact_id);
                    $origen = $pago->origen ?? 'anterior';
                    $valor = floatval($pago->valor);
                    $descuento = floatval($pago->descuento ?? 0);
                    if ($valor <= 0 && $descuento <= 0) continue;

                    // Leer saldo y N° de factura según origen
                    if ($origen === 'pedido') {
                        $st = $db->prepare("SELECT FacturaCompra_N AS FacturaN, Total AS Valor, Saldo FROM tblpedidos WHERE Pedido_N = :id");
                    } else {
                        $st = $db->prepare("SELECT FacturaN, Valor, Saldo FROM tblfacturasanterioresproveedor WHERE ID_FactAnterioresP = :id");
                    }
                    $st->execute([':id' => $factId]);
                    $fact = $st->fetch();
                    if (!$fact) continue;

                    $valorTotal = $valor + $descuento;
                    $saldoActual = floatval($fact['Saldo']);
                    if ($valorTotal > $saldoActual) $valorTotal = $saldoActual;

                    $nuevoSaldo = $saldoActual - $valorTotal;
                    $esPagoFinal = $nuevoSaldo <= 0;
                    $concepto = ($esPagoFinal ? "Pago Final" : "Abono") . " Factura {$fact['FacturaN']}";

                    $stmtInsert->execute([
                        ':comp' => $nComprobante,
                        ':orden' => $prov['RazonSocial'],
                        ':concepto' => $concepto,
                        ':valor' => $valor,
                        ':desc' => $descuento,
                        ':prov' => $provId,
                        ':nfact' => $fact['FacturaN'],
                        ':valfact' => floatval($fact['Valor']),
                        ':saldo' => max($nuevoSaldo, 0),
                        ':cedula' => $prov['Nit'],
                        ':tipo' => $tipoPago,
                        ':id_user' => $idUsuario,
                    ]);

                    if ($origen === 'pedido') $stmtUpdPedido->execute([':pago' => $valorTotal, ':id' => $factId]);
                    else                      $stmtUpdAnt->execute([':pago' => $valorTotal, ':id' => $factId]);

                    $totalPagado += $valor;
                    $facturasAfectadas++;
                    $facturasNums[] = $fact['FacturaN'];
                }

                $db->commit();

                echo json_encode([
                    "success" => true,
                    "message" => "Egreso #$nComprobante registrado. $facturasAfectadas factura(s).",
                    "comprobante" => $nComprobante,
                    "total_pagado" => $totalPagado,
                    "facturas_afectadas" => $facturasAfectadas,
                    "facturas_nums" => $facturasNums
                ], JSON_UNESCAPED_UNICODE);
                break;
            }

            // Crear proveedor
            if (empty($data->RazonSocial)) {
                http_response_code(400);
                echo json_encode(["success" => false, "message" => "Razón social es requerida"]);
                exit;
            }
            $stmt = $db->query("SELECT COALESCE(MAX(CodigoPro), 220500) + 1 as next_id FROM tblproveedores");
            $nextId = $stmt->fetch()['next_id'];

            $stmt = $db->prepare("
                INSERT INTO tblproveedores (CodigoPro, RazonSocial, Nit, Telefonos, Direccion, Nombres, Apellidos, Fecha_Iingreso)
                VALUES (:id, :razon, :nit, :tel, :dir, :nom, :ape, NOW())
            ");
            $stmt->execute([
                ':id' => $nextId, ':razon' => trim($data->RazonSocial),
                ':nit' => $data->Nit ?? '', ':tel' => $data->Telefonos ?? '',
                ':dir' => $data->Direccion ?? '', ':nom' => $data->Nombres ?? '', ':ape' => $data->Apellidos ?? ''
            ]);
            echo json_encode(["success" => true, "message" => "Proveedor creado", "CodigoPro" => $nextId], JSON_UNESCAPED_UNICODE);
            break;

        case 'PUT':
            $data = json_decode(file_get_contents("php://input"));
            if (empty($data->CodigoPro)) {
                http_response_code(400);
                echo json_encode(["success" => false, "message" => "ID requerido"]);
                exit;
            }
            if (intval($data->CodigoPro) === 220500) {
                http_response_code(403);
                echo json_encode(["success" => false, "message" => "El proveedor genérico COMPRAS AL CONTADO es del sistema y no puede modificarse."]);
                exit;
            }
            $stmt = $db->prepare("
                UPDATE tblproveedores SET RazonSocial = :razon, Nit = :nit, Telefonos = :tel,
                    Direccion = :dir, Nombres = :nom, Apellidos = :ape, FechaMod = NOW()
                WHERE CodigoPro = :id
            ");
            $stmt->execute([
                ':id' => $data->CodigoPro, ':razon' => trim($data->RazonSocial ?? ''),
                ':nit' => $data->Nit ?? '', ':tel' => $data->Telefonos ?? '',
                ':dir' => $data->Direccion ?? '', ':nom' => $data->Nombres ?? '', ':ape' => $data->Apellidos ?? ''
            ]);
            echo json_encode(["success" => true, "message" => "Proveedor actualizado"], JSON_UNESCAPED_UNICODE);
            break;
    }
} catch(Exception $e) {
    if ($db->inTransaction()) $db->rollBack();
    http_response_code(500);
    echo json_encode(["success" => false, "message" => $e->getMessage()]);
}
?>
