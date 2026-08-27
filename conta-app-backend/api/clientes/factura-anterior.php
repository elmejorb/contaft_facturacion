<?php
/**
 * Facturas anteriores de clientes
 * POST action=crear → agregar factura anterior
 * POST action=eliminar → eliminar
 */
require_once '../config/database.php';
$database = new Database();
$db = $database->getConnection();

try {
    $data = json_decode(file_get_contents('php://input'), true);
    $action = $data['action'] ?? 'crear';

    if ($action === 'crear') {
        $clienteId = intval($data['cliente_id'] ?? 0);
        // Prefijo automático "AT-" (Anterior). El usuario digita solo el número.
        $numeroCrudo = trim($data['factura_n'] ?? '');
        $numeroCrudo = preg_replace('/^AT-/i', '', $numeroCrudo);
        $facturaN = $numeroCrudo === '' ? '' : 'AT-' . $numeroCrudo;

        $fecha = $data['fecha'] ?? date('Y-m-d');
        $valor = floatval($data['valor'] ?? 0);
        $saldo = floatval($data['saldo'] ?? $valor);
        $dias = intval($data['dias'] ?? 30);

        if (!$clienteId || $facturaN === 'AT-' || $facturaN === '' || $valor <= 0) {
            echo json_encode(['success' => false, 'message' => 'Cliente, número de factura y valor son requeridos']);
            exit;
        }
        if ($saldo > $valor) {
            echo json_encode(['success' => false, 'message' => 'El saldo pendiente no puede ser mayor al valor total']);
            exit;
        }

        // No permitir duplicar Nº factura para el mismo cliente (sí se permite
        // el mismo número entre distintos clientes). Así al aplicar un pago con
        // NFactAnt no hay ambigüedad de a cuál factura pertenece.
        $stmtDup = $db->prepare("
            SELECT ID_FactAnteriores FROM tblfacturasanteriores
            WHERE CodigoCli = ? AND FacturaN = ? LIMIT 1
        ");
        $stmtDup->execute([$clienteId, $facturaN]);
        if ($stmtDup->fetch()) {
            echo json_encode([
                'success' => false,
                'message' => "El cliente ya tiene una factura anterior con número $facturaN. Verifica el número o elimina la existente antes de crear una nueva."
            ]);
            exit;
        }

        $db->prepare("INSERT INTO tblfacturasanteriores (FacturaN, Fecha, Dias, Valor, Saldo, CodigoCli, FechaMod) VALUES (?, ?, ?, ?, ?, ?, NOW())")
           ->execute([$facturaN, $fecha, $dias, $valor, $saldo, $clienteId]);

        echo json_encode(['success' => true, 'message' => "Factura anterior $facturaN agregada con saldo \$" . number_format($saldo, 0, ',', '.')], JSON_UNESCAPED_UNICODE);

    } elseif ($action === 'eliminar') {
        $id = intval($data['id'] ?? 0);
        if (!$id) { echo json_encode(['success' => false, 'message' => 'ID requerido']); exit; }
        $db->prepare("DELETE FROM tblfacturasanteriores WHERE ID_FactAnteriores = ?")->execute([$id]);
        echo json_encode(['success' => true, 'message' => 'Factura anterior eliminada']);
    }
} catch (Exception $e) {
    echo json_encode(['success' => false, 'message' => $e->getMessage()]);
}
?>
