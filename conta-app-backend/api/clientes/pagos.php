<?php
/**
 * Pagos de cliente
 * GET  ?cliente=X                → facturas pendientes + historial pagos
 * POST action=pagar              → registrar pagos (uno o varios)
 * GET  ?cliente=X&historial=1    → solo historial de pagos
 */

require_once '../config/database.php';

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

        // Facturas con saldo pendiente
        $stmt = $db->prepare("
            SELECT Factura_N, Fecha, Total, Saldo, Dias, Tipo
            FROM tblventas
            WHERE CodigoCli = :id AND Saldo > 0
            ORDER BY Fecha ASC
        ");
        $stmt->execute([':id' => $clienteId]);
        $pendientes = $stmt->fetchAll();
        foreach ($pendientes as &$f) {
            $f['Total'] = floatval($f['Total']);
            $f['Saldo'] = floatval($f['Saldo']);
            // Días vencida
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
                VALUES (:rec, :codigo, 0, :valor, :fecha, :detalle, :valor_fact, :saldo_act,
                    :descuento, 0, 'Valida', '1110', :medio, :nfact_ant, '', NOW(), :id_user)
            ");

            $stmtUpdateVenta = $db->prepare("
                UPDATE tblventas SET Saldo = Saldo - :pago, pagada = IF(Saldo - :pago2 <= 0, '1', '') WHERE Factura_N = :fact
            ");

            $totalPagado = 0;
            $facturasAfectadas = 0;

            foreach ($pagos as $pago) {
                $factN = $pago->factura_n;
                $valor = floatval($pago->valor);
                $descuento = floatval($pago->descuento ?? 0);

                if ($valor <= 0 && $descuento <= 0) continue;

                $valorTotal = $valor + $descuento;

                // Get current invoice data
                $stmt = $db->prepare("SELECT Total, Saldo FROM tblventas WHERE Factura_N = :fact");
                $stmt->execute([':fact' => $factN]);
                $factura = $stmt->fetch();
                if (!$factura) continue;

                $saldoActual = floatval($factura['Saldo']);
                $valorFact = floatval($factura['Total']);

                // Don't overpay
                if ($valorTotal > $saldoActual) $valorTotal = $saldoActual;
                if ($valor > $saldoActual - $descuento) $valor = $saldoActual - $descuento;

                $nuevoSaldo = $saldoActual - $valorTotal;
                $esPagoFinal = $nuevoSaldo <= 0;

                $detalle = ($esPagoFinal ? "Pago Final" : "Abono") . " de factura Nº {$factN}";

                $stmtInsert->execute([
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

                // Update invoice balance
                $stmtUpdateVenta->execute([
                    ':pago' => $valorTotal,
                    ':pago2' => $valorTotal,
                    ':fact' => $factN
                ]);

                $totalPagado += $valor;
                $facturasAfectadas++;
            }

            $db->commit();

            echo json_encode([
                "success" => true,
                "message" => "Pago registrado. Recibo #$recCaja. $facturasAfectadas factura(s) afectada(s).",
                "recibo" => $recCaja,
                "total_pagado" => $totalPagado,
                "facturas_afectadas" => $facturasAfectadas
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

            // Reverse: add back to invoice saldo
            $factN = $pago['NFactAnt'] ?: $pago['Fact_N'];
            $valorRevertir = floatval($pago['ValorPago']) + floatval($pago['Descuento']);

            if ($factN && $factN != '0') {
                $stmt = $db->prepare("UPDATE tblventas SET Saldo = Saldo + :valor, pagada = '' WHERE Factura_N = :fact");
                $stmt->execute([':valor' => $valorRevertir, ':fact' => $factN]);
            }

            $db->commit();

            echo json_encode([
                "success" => true,
                "message" => "Pago #{$pago['RecCajaN']} anulado. Saldo de factura $factN restaurado."
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

            // Update detalle
            $esPagoFinal = $nuevoSaldoAct <= 0;
            $detalle = ($esPagoFinal ? "Pago Final" : "Abono") . " de factura Nº $factN (editado)";
            $updates .= ", DetallePago = :detalle";
            $params[':detalle'] = $detalle;

            $stmt = $db->prepare("UPDATE tblpagos SET $updates WHERE Id_Pagos = :id");
            $stmt->execute($params);

            // Update invoice saldo
            if ($factN && $factN != '0') {
                $stmt = $db->prepare("UPDATE tblventas SET Saldo = Saldo - :diff, pagada = IF(Saldo - :diff2 <= 0, '1', '') WHERE Factura_N = :fact");
                $stmt->execute([':diff' => $diferencia, ':diff2' => $diferencia, ':fact' => $factN]);
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
