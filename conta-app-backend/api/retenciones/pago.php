<?php
/**
 * Retenciones aplicadas a un ABONO/PAGO de cliente.
 *
 *   GET  ?id_pago=X             → lista retenciones de ese pago
 *   POST { action: aplicar, id_pago, retenciones: [{...}] }
 *          → inserta en bloque las retenciones de un pago recién creado.
 *            Las validaciones (base > 0, tarifa 0-100) se hacen aquí.
 *
 * El flujo típico: tblpagos se crea con el monto NETO que el cliente pagó
 * (saldo - retenciones). Luego se llama a este endpoint para registrar las
 * retenciones aplicadas asociadas al mismo pago. El total abonado efectivo
 * (lo que efectivamente cerró el saldo) = monto_pago + sum(retenciones).
 */
require_once '../config/database.php';
$db = (new Database())->getConnection();

try {
    if ($_SERVER['REQUEST_METHOD'] === 'GET') {
        $idPago = intval($_GET['id_pago'] ?? 0);
        if (!$idPago) { echo json_encode(['success'=>false,'message'=>'id_pago requerido']); exit; }
        $items = $db->prepare("SELECT * FROM tbl_retenciones_pago WHERE Id_Pagos = ? ORDER BY Id_RetencionPago");
        $items->execute([$idPago]);
        $rows = $items->fetchAll();
        $total = 0;
        foreach ($rows as $r) $total += floatval($r['monto']);
        echo json_encode(['success'=>true,'retenciones'=>$rows,'total'=>$total]);
        exit;
    }

    if ($_SERVER['REQUEST_METHOD'] === 'POST') {
        $data = json_decode(file_get_contents('php://input'), true);
        $action = $data['action'] ?? '';

        if ($action === 'aplicar') {
            $idPago = intval($data['id_pago'] ?? 0);
            $rets   = $data['retenciones'] ?? [];
            if (!$idPago) { echo json_encode(['success'=>false,'message'=>'id_pago requerido']); exit; }
            if (!is_array($rets) || empty($rets)) { echo json_encode(['success'=>true,'message'=>'Sin retenciones a aplicar','count'=>0]); exit; }

            // Validar que el pago existe
            $chk = $db->prepare("SELECT COUNT(*) FROM tblpagos WHERE Id_Pagos = ?");
            $chk->execute([$idPago]);
            if (intval($chk->fetchColumn()) === 0) {
                echo json_encode(['success'=>false,'message'=>'Pago no encontrado']); exit;
            }

            $db->beginTransaction();
            try {
                $stmt = $db->prepare("
                    INSERT INTO tbl_retenciones_pago
                    (Id_Pagos, concepto_label, concepto_ref_id, impuesto_ref_id, tipo_codigo, base_kind, base, tarifa, monto)
                    VALUES (?,?,?,?,?,?,?,?,?)
                ");
                $totalMonto = 0;
                $insertados = 0;
                foreach ($rets as $r) {
                    $concepto    = trim((string)($r['concepto_label'] ?? $r['concepto'] ?? ''));
                    $conceptoRef = isset($r['concepto_ref_id']) ? intval($r['concepto_ref_id']) : null;
                    $impuestoRef = isset($r['impuesto_ref_id']) ? intval($r['impuesto_ref_id']) : null;
                    $tipo        = trim((string)($r['tipo_codigo'] ?? '06'));
                    $baseKind    = trim((string)($r['base_kind'] ?? 'subtotal'));
                    $base        = floatval($r['base'] ?? 0);
                    $tarifa      = floatval($r['tarifa'] ?? 0);
                    $monto       = floatval($r['monto'] ?? 0);

                    if ($concepto === '' || $monto <= 0) continue; // Saltar filas vacías
                    if ($tarifa < 0 || $tarifa > 100) continue;
                    if (!in_array($baseKind, ['subtotal','iva','total','custom'], true)) $baseKind = 'subtotal';

                    $stmt->execute([$idPago, $concepto, $conceptoRef, $impuestoRef, $tipo, $baseKind, $base, $tarifa, $monto]);
                    $totalMonto += $monto;
                    $insertados++;
                }
                $db->commit();
                echo json_encode([
                    'success'=>true,
                    'message'=>"$insertados retenciones registradas",
                    'count'=>$insertados,
                    'total_retenido'=>$totalMonto
                ]);
            } catch (Throwable $e) {
                $db->rollBack();
                throw $e;
            }
            exit;
        }

        echo json_encode(['success'=>false,'message'=>'Acción no reconocida']);
        exit;
    }
} catch (Throwable $e) {
    http_response_code(500);
    echo json_encode(['success'=>false,'message'=>$e->getMessage()]);
}
