<?php
/**
 * Pagos de cliente
 * GET  ?cliente=X                → facturas pendientes + historial pagos
 * POST action=pagar              → registrar pagos (uno o varios)
 * GET  ?cliente=X&historial=1    → solo historial de pagos
 */

require_once '../config/database.php';
require_once '../config/saldo_helper.php';

$database = new Database();
$db = $database->getConnection();
$method = $_SERVER['REQUEST_METHOD'];

try {
    if ($method === 'GET') {
        $clienteId = $_GET['cliente'] ?? null;
        if (!$clienteId) {
            http_response_code(400);
            echo json_encode(["success" => false, "message" => "ID de cliente requerido"]);
            exit;
        }

        // Facturas con saldo pendiente — usa las vistas (saldo dinámico),
        // une POS + FE + facturas anteriores. Las vistas ya filtran anuladas
        // y solo traen las que tienen Saldo > 0.
        $tieneFE = $db->query("SHOW TABLES LIKE 'electronic_documents'")->fetch();
        $tieneFA = $db->query("SHOW TABLES LIKE 'tblfacturasanteriores'")->fetch();

        $sql = "
            SELECT Factura_N, Fecha, Total, Saldo, Dias, Tipo, 'venta' AS Origen
            FROM vw_facturas_cliente_saldos
            WHERE CodigoCli = :id AND Saldo > 0
        ";
        if ($tieneFE) {
            $sql .= "
            UNION ALL
            SELECT Factura_N, Fecha, Total, Saldo, Dias,
                   CASE WHEN Tipo = 1 THEN 'Contado' ELSE 'Crédito' END AS Tipo,
                   'electronica' AS Origen
            FROM vw_facturas_elec_cliente_saldos
            WHERE CodigoCli = :id_fe AND Saldo > 0
            ";
        }
        if ($tieneFA) {
            $sql .= "
            UNION ALL
            SELECT FacturaN AS Factura_N, Fecha, Total, Saldo, Dias,
                   'Crédito' AS Tipo, 'anterior' AS Origen
            FROM vw_facturas_anteriores_cliente
            WHERE CodigoCli = :id_fa AND Saldo > 0
            ";
        }
        $sql .= " ORDER BY Fecha ASC";

        $params = [':id' => $clienteId];
        if ($tieneFE) $params[':id_fe'] = $clienteId;
        if ($tieneFA) $params[':id_fa'] = $clienteId;

        $stmt = $db->prepare($sql);
        $stmt->execute($params);
        $pendientes = $stmt->fetchAll();
        foreach ($pendientes as &$f) {
            $f['Total'] = floatval($f['Total']);
            $f['Saldo'] = floatval($f['Saldo']);
            $fechaFact = new DateTime($f['Fecha']);
            $hoy = new DateTime();
            $f['Dias_Vencida'] = $hoy->diff($fechaFact)->days;
        }

        // Historial de pagos
        $stmt = $db->prepare("
            SELECT p.Id_Pagos, p.RecCajaN, p.Fact_N, p.NFactAnt, p.ValorPago, p.Fecha,
                   p.DetallePago, p.ValorFact, p.SaldoAct, p.Descuento, p.Retencion,
                   p.Estado, p.id_mediopago,
                   COALESCE(m.nombre_medio, 'Efectivo') as MedioPago
            FROM tblpagos p
            LEFT JOIN tblmedios_pago m ON p.id_mediopago = m.id_mediopago
            WHERE p.Codigo = :id AND p.Estado = 'Valida'
            ORDER BY p.Fecha DESC
            LIMIT 100
        ");
        $stmt->execute([':id' => $clienteId]);
        $historial = $stmt->fetchAll();
        foreach ($historial as &$h) {
            $h['ValorPago'] = floatval($h['ValorPago']);
            $h['ValorFact'] = floatval($h['ValorFact']);
            $h['SaldoAct'] = floatval($h['SaldoAct']);
        }

        // Medios de pago
        $medios = $db->query("SELECT id_mediopago, nombre_medio FROM tblmedios_pago ORDER BY id_mediopago")->fetchAll();

        // Resumen
        $totalPendiente = array_sum(array_column($pendientes, 'Saldo'));
        $facturasPendientes = count($pendientes);

        echo json_encode([
            "success" => true,
            "pendientes" => $pendientes,
            "historial" => $historial,
            "medios_pago" => $medios,
            "resumen" => [
                "total_pendiente" => $totalPendiente,
                "facturas_pendientes" => $facturasPendientes
            ]
        ], JSON_UNESCAPED_UNICODE);

    } elseif ($method === 'POST') {
        $data = json_decode(file_get_contents("php://input"));
        $action = $data->action ?? '';

        if ($action === 'pagar') {
            $clienteId = $data->cliente ?? null;
            $pagos = $data->pagos ?? []; // array of { factura_n, valor, descuento }
            $medioPago = $data->medio_pago ?? 0;
            $usuario = $data->usuario ?? 'admin';
            $idUsuario = intval($data->id_usuario ?? 0) ?: null;

            if (!$clienteId || empty($pagos)) {
                http_response_code(400);
                echo json_encode(["success" => false, "message" => "Cliente y pagos requeridos"]);
                exit;
            }

            // Fecha del pago — siempre con hora completa para que el cuadre por
            // sesión filtre correctamente. Si el frontend envía solo YYYY-MM-DD,
            // se le concatena la hora actual.
            $fechaInput = $data->fecha ?? null;
            if (!$fechaInput) {
                $fechaPago = date('Y-m-d H:i:s');
            } else {
                $fechaPago = substr($fechaInput, 0, 10) . ' ' . date('H:i:s');
            }

            $db->beginTransaction();

            // Next RecCajaN
            $stmt = $db->query("SELECT COALESCE(MAX(RecCajaN), 0) + 1 as next_rec FROM tblpagos");
            $recCaja = $stmt->fetch()['next_rec'];

            $stmtInsert = $db->prepare("
                INSERT INTO tblpagos (RecCajaN, Codigo, Fact_N, ValorPago, Fecha, DetallePago,
                    ValorFact, SaldoAct, Descuento, Retencion, Estado, Afectada, id_mediopago, NFactAnt, Nfact_electronica, FechaMod, id_usuario)
                VALUES (:rec, :codigo, :fact_n, :valor, :fecha, :detalle, :valor_fact, :saldo_act,
                    :descuento, 0, 'Valida', '1110', :medio, '', '', NOW(), :id_user)
            ");

            // El UPDATE delta (Saldo = Saldo - :pago) compone errores si el
            // cache estaba desincronizado. Ahora usamos recalcularSaldoFactura()
            // después de insertar el pago — recalcula desde tblpagos.

            $totalPagado = 0;
            $facturasAfectadas = 0;

            // INSERT ampliado que también acepta NFactAnt cuando se paga una
            // factura anterior (número "AT-..." migrado desde el sistema viejo).
            // El Fact_N va como 0 en esos casos porque no existe en tblventas.
            $stmtInsertAnt = $db->prepare("
                INSERT INTO tblpagos (RecCajaN, Codigo, Fact_N, ValorPago, Fecha, DetallePago,
                    ValorFact, SaldoAct, Descuento, Retencion, Estado, Afectada, id_mediopago, NFactAnt, Nfact_electronica, FechaMod, id_usuario)
                VALUES (:rec, :codigo, 0, :valor, :fecha, :detalle, :valor_fact, :saldo_act,
                    :descuento, 0, 'Valida', '1110', :medio, :nfact_ant, '', NOW(), :id_user)
            ");
            $stmtUpdateAnt = $db->prepare("
                UPDATE tblfacturasanteriores
                SET Saldo = Saldo - :pago
                WHERE ID_FactAnteriores = :id
            ");

            $totalPagado = 0;
            $facturasAfectadas = 0;

            foreach ($pagos as $pago) {
                $factN = $pago->factura_n;
                $valor = floatval($pago->valor);
                $descuento = floatval($pago->descuento ?? 0);

                // Rechazar negativos explícitamente. Un pago con ValorPago<0
                // o Descuento<0 inserta una fila que envenena la vista de saldos.
                if ($valor < 0 || $descuento < 0) {
                    $db->rollBack();
                    http_response_code(400);
                    echo json_encode(["success" => false, "message" => "El valor del pago o descuento no puede ser negativo (factura {$factN})"]);
                    exit;
                }
                if ($valor == 0 && $descuento == 0) continue;

                $valorTotal = $valor + $descuento;

                // Detectar si es factura anterior (prefijo "AT-") o normal.
                // Las anteriores viven en tblfacturasanteriores y usan NFactAnt
                // en tblpagos (Fact_N queda en 0 porque no existen en tblventas).
                $esAnterior = is_string($factN) && stripos($factN, 'AT-') === 0;

                if ($esAnterior) {
                    // Buscar la factura anterior por (FacturaN, CodigoCli)
                    $stmtBusca = $db->prepare("
                        SELECT ID_FactAnteriores, Valor, Saldo
                        FROM tblfacturasanteriores
                        WHERE FacturaN = :fact AND CodigoCli = :cli
                        LIMIT 1
                    ");
                    $stmtBusca->execute([':fact' => $factN, ':cli' => $clienteId]);
                    $facAnt = $stmtBusca->fetch();
                    if (!$facAnt) continue;

                    $saldoActual = floatval($facAnt['Saldo']);
                    $valorFact = floatval($facAnt['Valor']);
                    if ($saldoActual <= 0.001) continue;

                    if ($valorTotal > $saldoActual) $valorTotal = $saldoActual;
                    if ($valor > $saldoActual - $descuento) $valor = max($saldoActual - $descuento, 0);

                    $nuevoSaldo = $saldoActual - $valorTotal;
                    $esPagoFinal = $saldoActual > 0.001 && $nuevoSaldo <= 0.001;
                    $detalle = ($esPagoFinal ? "Pago Final" : "Abono") . " de factura anterior Nº {$factN}";

                    $stmtInsertAnt->execute([
                        ':rec' => $recCaja,
                        ':codigo' => $clienteId,
                        ':valor' => $valor,
                        ':fecha' => $fechaPago,
                        ':detalle' => $detalle,
                        ':valor_fact' => $valorFact,
                        ':saldo_act' => max($nuevoSaldo, 0),
                        ':descuento' => $descuento,
                        ':medio' => $medioPago,
                        ':nfact_ant' => $factN,
                        ':id_user' => $idUsuario,
                    ]);

                    // Actualizar el saldo cacheado en tblfacturasanteriores.
                    // La vista vw_facturas_anteriores_cliente recalcula desde
                    // tblpagos.NFactAnt, así que este UPDATE es redundante pero
                    // mantiene el cache consistente si algún reporte lee directo.
                    $stmtUpdateAnt->execute([
                        ':pago' => $valorTotal,
                        ':id' => intval($facAnt['ID_FactAnteriores']),
                    ]);

                    $totalPagado += $valor;
                    $facturasAfectadas++;
                    continue;
                }

                // === Factura NORMAL (tblventas) ===
                // Saldo desde la VISTA (fuente de verdad calculada desde tblpagos).
                $stmt = $db->prepare("
                    SELECT v.Total, COALESCE(s.Saldo, v.Total) AS Saldo
                    FROM tblventas v
                    LEFT JOIN vw_facturas_cliente_saldos s ON s.Factura_N = v.Factura_N
                    WHERE v.Factura_N = :fact
                ");
                $stmt->execute([':fact' => $factN]);
                $factura = $stmt->fetch();
                if (!$factura) continue;

                $saldoActual = floatval($factura['Saldo']);
                $valorFact = floatval($factura['Total']);
                if ($saldoActual <= 0.001) continue;

                if ($valorTotal > $saldoActual) $valorTotal = $saldoActual;
                if ($valor > $saldoActual - $descuento) $valor = max($saldoActual - $descuento, 0);

                $nuevoSaldo = $saldoActual - $valorTotal;
                $esPagoFinal = $saldoActual > 0.001 && $nuevoSaldo <= 0.001;

                $detalle = ($esPagoFinal ? "Pago Final" : "Abono") . " de factura Nº {$factN}";

                $stmtInsert->execute([
                    ':rec' => $recCaja,
                    ':codigo' => $clienteId,
                    ':fact_n' => intval($factN),
                    ':valor' => $valor,
                    ':fecha' => $fechaPago,
                    ':detalle' => $detalle,
                    ':valor_fact' => $valorFact,
                    ':saldo_act' => max($nuevoSaldo, 0),
                    ':descuento' => $descuento,
                    ':medio' => $medioPago,
                    ':id_user' => $idUsuario,
                ]);

                // Recalcular Saldo desde la fuente de verdad (tblpagos).
                recalcularSaldoFactura($db, intval($factN));

                $totalPagado += $valor;
                $facturasAfectadas++;
            }

            $db->commit();

            // Saldo TOTAL del cliente tras el pago (todas sus facturas pendientes,
            // de POS + FE + anteriores), leído de las vistas de verdad. El recibo
            // lo muestra para que el cliente sepa cuánto le queda debiendo en TOTAL,
            // no solo de la factura que acaba de abonar.
            $tieneFE = $db->query("SHOW TABLES LIKE 'electronic_documents'")->fetch();
            $tieneFA = $db->query("SHOW TABLES LIKE 'tblfacturasanteriores'")->fetch();
            $sqlSaldo = "SELECT COALESCE(SUM(Saldo),0) AS s FROM vw_facturas_cliente_saldos WHERE CodigoCli = :id AND Saldo > 0";
            $paramsSaldo = [':id' => $clienteId];
            if ($tieneFE) {
                $sqlSaldo .= " UNION ALL SELECT COALESCE(SUM(Saldo),0) AS s FROM vw_facturas_elec_cliente_saldos WHERE CodigoCli = :id_fe AND Saldo > 0";
                $paramsSaldo[':id_fe'] = $clienteId;
            }
            if ($tieneFA) {
                $sqlSaldo .= " UNION ALL SELECT COALESCE(SUM(Saldo),0) AS s FROM vw_facturas_anteriores_cliente WHERE CodigoCli = :id_fa AND Saldo > 0";
                $paramsSaldo[':id_fa'] = $clienteId;
            }
            $stmtSaldo = $db->prepare("SELECT COALESCE(SUM(s),0) AS total FROM ($sqlSaldo) x");
            $stmtSaldo->execute($paramsSaldo);
            $saldoCliente = floatval($stmtSaldo->fetchColumn() ?: 0);

            echo json_encode([
                "success" => true,
                "message" => "Pago registrado. Recibo #$recCaja. $facturasAfectadas factura(s) afectada(s).",
                "recibo" => $recCaja,
                "total_pagado" => $totalPagado,
                "facturas_afectadas" => $facturasAfectadas,
                "saldo_cliente" => $saldoCliente
            ], JSON_UNESCAPED_UNICODE);
        } elseif ($action === 'anular') {
            $idPago = $data->id_pago ?? null;
            if (!$idPago) {
                http_response_code(400);
                echo json_encode(["success" => false, "message" => "ID de pago requerido"]);
                exit;
            }

            // Get pago info
            $stmt = $db->prepare("SELECT * FROM tblpagos WHERE Id_Pagos = :id AND Estado = 'Valida'");
            $stmt->execute([':id' => $idPago]);
            $pago = $stmt->fetch();
            if (!$pago) {
                http_response_code(404);
                echo json_encode(["success" => false, "message" => "Pago no encontrado o ya anulado"]);
                exit;
            }

            $db->beginTransaction();

            // Mark as annulled
            $stmt = $db->prepare("UPDATE tblpagos SET Estado = 'Anulada', FechaMod = NOW() WHERE Id_Pagos = :id");
            $stmt->execute([':id' => $idPago]);

            // Reverse: restaurar saldo de la factura.
            // Si el pago era de factura anterior (NFactAnt con prefijo "AT-"),
            // devolver el valor al Saldo cacheado en tblfacturasanteriores.
            // Si era de factura normal, recalcularSaldoFactura hace el trabajo.
            $nFactAnt = $pago['NFactAnt'] ?? '';
            $factN = $pago['Fact_N'] ?? 0;
            $esAnterior = is_string($nFactAnt) && stripos($nFactAnt, 'AT-') === 0;

            if ($esAnterior) {
                // Sumar de vuelta el valor + descuento al Saldo de la factura anterior
                $totalRevertir = floatval($pago['ValorPago']) + floatval($pago['Descuento']);
                $db->prepare("
                    UPDATE tblfacturasanteriores
                    SET Saldo = Saldo + :val
                    WHERE FacturaN = :fact AND CodigoCli = :cli
                ")->execute([
                    ':val' => $totalRevertir,
                    ':fact' => $nFactAnt,
                    ':cli' => intval($pago['Codigo']),
                ]);
                $facturaLabel = $nFactAnt;
            } elseif ($factN && $factN != '0') {
                recalcularSaldoFactura($db, intval($factN));
                $facturaLabel = $factN;
            } else {
                $facturaLabel = '(desconocida)';
            }

            $db->commit();

            echo json_encode([
                "success" => true,
                "message" => "Pago #{$pago['RecCajaN']} anulado. Saldo de factura $facturaLabel restaurado."
            ], JSON_UNESCAPED_UNICODE);

        } elseif ($action === 'editar') {
            $idPago = $data->id_pago ?? null;
            $nuevoValor = $data->nuevo_valor ?? null;
            $nuevoMedio = $data->nuevo_medio ?? null;

            if (!$idPago || $nuevoValor === null) {
                http_response_code(400);
                echo json_encode(["success" => false, "message" => "ID de pago y nuevo valor requeridos"]);
                exit;
            }

            // Get pago info
            $stmt = $db->prepare("SELECT * FROM tblpagos WHERE Id_Pagos = :id AND Estado = 'Valida'");
            $stmt->execute([':id' => $idPago]);
            $pago = $stmt->fetch();
            if (!$pago) {
                http_response_code(404);
                echo json_encode(["success" => false, "message" => "Pago no encontrado o anulado"]);
                exit;
            }

            // Check same day
            $fechaPago = date('Y-m-d', strtotime($pago['Fecha']));
            $hoy = date('Y-m-d');
            if ($fechaPago !== $hoy) {
                http_response_code(409);
                echo json_encode([
                    "success" => false,
                    "message" => "Solo se puede editar pagos del mismo día. Este pago es del $fechaPago. Anúlelo y cree uno nuevo."
                ], JSON_UNESCAPED_UNICODE);
                exit;
            }

            $db->beginTransaction();

            $valorAnterior = floatval($pago['ValorPago']) + floatval($pago['Descuento']);
            $nuevoValorFloat = floatval($nuevoValor);
            $diferencia = $nuevoValorFloat - $valorAnterior;

            $factN = $pago['NFactAnt'] ?: $pago['Fact_N'];

            // Update pago
            $updates = "ValorPago = :valor, FechaMod = NOW()";
            $params = [':valor' => $nuevoValorFloat, ':id' => $idPago];

            if ($nuevoMedio !== null) {
                $updates .= ", id_mediopago = :medio";
                $params[':medio'] = $nuevoMedio;
            }

            // Update saldo_act
            $nuevoSaldoAct = floatval($pago['SaldoAct']) - $diferencia;
            $updates .= ", SaldoAct = :saldo_act";
            $params[':saldo_act'] = max($nuevoSaldoAct, 0);

            // Update detalle — solo es "Pago Final" si arranca con saldo positivo
            // real y el pago lo cierra. Si SaldoAct venía corrupto en 0/negativo,
            // hasta un abono pequeño se etiquetaba mal (caso recibo #42).
            $saldoActPrevio = floatval($pago['SaldoAct']);
            $esPagoFinal = $saldoActPrevio > 0.001 && $nuevoSaldoAct <= 0.001;
            $detalle = ($esPagoFinal ? "Pago Final" : "Abono") . " de factura Nº $factN (editado)";
            $updates .= ", DetallePago = :detalle";
            $params[':detalle'] = $detalle;

            $stmt = $db->prepare("UPDATE tblpagos SET $updates WHERE Id_Pagos = :id");
            $stmt->execute($params);

            // Recalcular saldo desde tblpagos. El pago editado ya tiene el
            // nuevo ValorPago, así que el helper lo lee directo y persiste
            // un saldo cuadrado, sin depender del valor cacheado anterior.
            if ($factN && $factN != '0') {
                recalcularSaldoFactura($db, intval($factN));
            }

            $db->commit();

            echo json_encode([
                "success" => true,
                "message" => "Pago editado correctamente."
            ], JSON_UNESCAPED_UNICODE);

        } else {
            http_response_code(400);
            echo json_encode(["success" => false, "message" => "Acción no válida"]);
        }
    }
} catch(Exception $e) {
    if ($db->inTransaction()) $db->rollBack();
    http_response_code(500);
    echo json_encode(["success" => false, "message" => $e->getMessage()]);
}
?>
