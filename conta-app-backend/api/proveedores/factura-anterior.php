<?php
/**
 * Facturas anteriores de proveedores
 *
 * Permite registrar saldos que se le deben a un proveedor por facturas
 * previas al uso del sistema (migración desde otro software o cartera
 * heredada). Estas facturas aparecen luego en el módulo de Cuentas por
 * Pagar / Cartera de proveedores para aplicar abonos parciales o totales.
 *
 * POST action=crear    → agregar factura anterior
 * POST action=eliminar → eliminar (solo si aún no tiene abonos aplicados)
 *
 * Tabla: tblfacturasanterioresproveedor
 *   ID_FactAnterioresP int PK auto_increment
 *   FacturaN           varchar(50)
 *   Fecha              datetime
 *   Dias               int (plazo en días)
 *   Valor              decimal (total original)
 *   Saldo              decimal (pendiente actual)
 *   CodigoProv         int (FK a tblproveedores.CodigoPro)
 */
require_once '../config/database.php';
$database = new Database();
$db = $database->getConnection();

try {
    $data = json_decode(file_get_contents('php://input'), true);
    $action = $data['action'] ?? 'crear';

    if ($action === 'crear') {
        $provId = intval($data['proveedor_id'] ?? 0);
        // El usuario digita solo el número; el sistema pone el prefijo "AT-"
        // (de "Anterior"). Así queda claro en el histórico que no es una
        // factura del sistema sino una migrada.
        $numeroCrudo = trim($data['factura_n'] ?? '');
        $numeroCrudo = preg_replace('/^AT-/i', '', $numeroCrudo); // Por si el usuario ya lo pegó con el prefijo
        $facturaN = $numeroCrudo === '' ? '' : 'AT-' . $numeroCrudo;

        $fecha = $data['fecha'] ?? date('Y-m-d');
        $valor = floatval($data['valor'] ?? 0);
        $saldo = floatval($data['saldo'] ?? $valor);
        $dias = intval($data['dias'] ?? 30);

        if (!$provId || $facturaN === 'AT-' || $facturaN === '' || $valor <= 0) {
            echo json_encode(['success' => false, 'message' => 'Proveedor, número de factura y valor son requeridos']);
            exit;
        }
        if ($saldo > $valor) {
            echo json_encode(['success' => false, 'message' => 'El saldo pendiente no puede ser mayor al valor total']);
            exit;
        }

        // Verificar que el proveedor exista
        $stmtCheck = $db->prepare("SELECT CodigoPro FROM tblproveedores WHERE CodigoPro = ?");
        $stmtCheck->execute([$provId]);
        if (!$stmtCheck->fetch()) {
            echo json_encode(['success' => false, 'message' => 'Proveedor no encontrado']);
            exit;
        }

        // No permitir duplicar Nº factura para el mismo proveedor.
        // Sí se permite el mismo número entre distintos proveedores (proveedor
        // A y B pueden tener su factura "100" cada uno). El check es por par
        // (CodigoProv, FacturaN) — así al aplicar un pago con NFacturaAnt no
        // hay ambigüedad de a cuál factura pertenece.
        $stmtDup = $db->prepare("
            SELECT ID_FactAnterioresP FROM tblfacturasanterioresproveedor
            WHERE CodigoProv = ? AND FacturaN = ? LIMIT 1
        ");
        $stmtDup->execute([$provId, $facturaN]);
        if ($stmtDup->fetch()) {
            echo json_encode([
                'success' => false,
                'message' => "El proveedor ya tiene una factura anterior con número $facturaN. Verifica el número o elimina la existente antes de crear una nueva."
            ]);
            exit;
        }

        $db->prepare("
            INSERT INTO tblfacturasanterioresproveedor
                (FacturaN, Fecha, Dias, Valor, Saldo, CodigoProv)
            VALUES (?, ?, ?, ?, ?, ?)
        ")->execute([$facturaN, $fecha, $dias, $valor, $saldo, $provId]);

        echo json_encode([
            'success' => true,
            'message' => "Factura anterior $facturaN agregada al proveedor con saldo \$" . number_format($saldo, 0, ',', '.')
        ], JSON_UNESCAPED_UNICODE);

    } elseif ($action === 'eliminar') {
        $id = intval($data['id'] ?? 0);
        if (!$id) {
            echo json_encode(['success' => false, 'message' => 'ID requerido']);
            exit;
        }

        // Antes de borrar: verificar si tiene pagos aplicados en tblegresos con NFacturaAnt = FacturaN.
        // Si tiene → no permitir borrar (deja rastro contable inválido).
        $stmtCheck = $db->prepare("
            SELECT f.FacturaN, f.Valor, f.Saldo,
                   (SELECT COUNT(*) FROM tblegresos e
                    WHERE e.NFacturaAnt = f.FacturaN AND e.CodigoPro = f.CodigoProv AND e.Estado = 'Valida') AS pagos_aplicados
            FROM tblfacturasanterioresproveedor f
            WHERE f.ID_FactAnterioresP = ?
        ");
        $stmtCheck->execute([$id]);
        $row = $stmtCheck->fetch();
        if (!$row) {
            echo json_encode(['success' => false, 'message' => 'Factura anterior no encontrada']);
            exit;
        }
        if (intval($row['pagos_aplicados']) > 0) {
            echo json_encode([
                'success' => false,
                'message' => 'No se puede eliminar: la factura ya tiene ' . $row['pagos_aplicados'] . ' pago(s) aplicado(s). Primero anula esos pagos.'
            ]);
            exit;
        }

        $db->prepare("DELETE FROM tblfacturasanterioresproveedor WHERE ID_FactAnterioresP = ?")->execute([$id]);
        echo json_encode(['success' => true, 'message' => 'Factura anterior eliminada']);

    } else {
        echo json_encode(['success' => false, 'message' => 'Acción no válida']);
    }
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => $e->getMessage()]);
}
