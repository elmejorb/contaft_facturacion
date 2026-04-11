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
        $facturaN = $data['factura_n'] ?? '';
        $fecha = $data['fecha'] ?? date('Y-m-d');
        $valor = floatval($data['valor'] ?? 0);
        $saldo = floatval($data['saldo'] ?? $valor);
        $dias = intval($data['dias'] ?? 30);

        if (!$clienteId || !$facturaN || $valor <= 0) {
            echo json_encode(['success' => false, 'message' => 'Cliente, número de factura y valor son requeridos']);
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
