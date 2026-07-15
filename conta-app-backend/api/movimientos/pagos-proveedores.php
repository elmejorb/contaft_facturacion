<?php
/**
 * Listado y anulación de pagos a proveedores (egresos).
 *
 *   GET  ?mes=3&anio=2026&estado=Valida   → listado del período
 *   POST { action:'anular', id: <Id_Egresos> } → anula el egreso y revierte
 *     - Estado del egreso → 'Anulada'
 *     - Saldo de tblpedidos (si el egreso venía de una compra a crédito):
 *         se recalcula desde tblegresos activos, respetando la regla
 *         de kardex inmutable: NO se borra el egreso, solo se marca.
 *     - Movimiento de caja: si el egreso era efectivo (id_mediopago=0)
 *         y hay caja abierta, se crea movimiento inverso y se devuelve
 *         el saldo. Si la caja de origen ya está cerrada, se registra
 *         el reverso en la caja activa (asiento opuesto).
 */
require_once '../config/database.php';
$database = new Database();
$db = $database->getConnection();

header('Content-Type: application/json; charset=utf-8');

try {
    $method = $_SERVER['REQUEST_METHOD'] ?? 'GET';

    // ==============================================================
    // POST — action: anular
    // ==============================================================
    if ($method === 'POST') {
        $raw = file_get_contents('php://input');
        $data = json_decode($raw, true) ?: [];
        $action = $data['action'] ?? '';

        if ($action !== 'anular') {
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => "Acción no soportada: $action"]);
            exit;
        }

        $id = intval($data['id'] ?? 0);
        $idUsuario = intval($data['id_usuario'] ?? 0) ?: null;
        if (!$id) {
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => 'ID de egreso requerido']);
            exit;
        }

        $stmt = $db->prepare("SELECT * FROM tblegresos WHERE Id_Egresos = ?");
        $stmt->execute([$id]);
        $egreso = $stmt->fetch();
        if (!$egreso) {
            http_response_code(404);
            echo json_encode(['success' => false, 'message' => 'Egreso no encontrado']);
            exit;
        }
        if ($egreso['Estado'] === 'Anulada') {
            echo json_encode(['success' => false, 'message' => 'El egreso ya está anulado']);
            exit;
        }

        $db->beginTransaction();

        // 1) Marcar el egreso como anulado (kardex inmutable: NO se borra)
        $db->prepare("UPDATE tblegresos SET Estado = 'Anulada' WHERE Id_Egresos = ?")
           ->execute([$id]);

        $valor      = floatval($egreso['Valor']);
        $mediopago  = intval($egreso['id_mediopago'] ?? 0);

        // Regla de negocio: al anular el egreso, la COMPRA queda intacta
        // (Saldo original, sigue en Cuentas por Pagar como venía). El egreso
        // queda con Estado='Anulada' y NO se cuenta en reportes. Si el pago
        // fue efectivo, se devuelve el dinero a la caja abierta actual.
        //
        // NO recalcular tblpedidos.Saldo — versiones previas del endpoint
        // hacían eso y confundían al usuario porque la compra "revivía".

        // 2) Si el pago fue por caja (efectivo), reintegrar el efectivo:
        //    prefer la caja abierta del usuario actual; si no hay, la del
        //    Id_Usuario original del egreso. Nunca modificamos una caja cerrada.
        $cajaMsg = '';
        if ($mediopago === 0 && $valor > 0) {
            $usuarioAnula = $idUsuario ?: intval($egreso['id_usuario'] ?? 0);
            $sesion = null;
            if ($usuarioAnula) {
                $s = $db->prepare("SELECT Id_Sesion, Id_Caja FROM tblsesiones_caja WHERE Id_Usuario = ? AND Estado = 'abierta' LIMIT 1");
                $s->execute([$usuarioAnula]);
                $sesion = $s->fetch();
            }
            if ($sesion) {
                $desc = "Reverso anulación egreso #" . $egreso['N_Comprobante'] . " — " . ($egreso['Concepto'] ?? '');
                $db->prepare("
                    INSERT INTO tblmov_caja (Id_Sesion, Id_Caja_Origen, Id_Usuario, Valor, Tipo, Descripcion)
                    VALUES (?, ?, ?, ?, 'anulacion_egreso', ?)
                ")->execute([
                    intval($sesion['Id_Sesion']),
                    intval($sesion['Id_Caja']),
                    $usuarioAnula,
                    $valor,
                    $desc
                ]);
                $db->prepare("UPDATE tblcajas SET Saldo = Saldo + ? WHERE Id_Caja = ?")
                   ->execute([$valor, intval($sesion['Id_Caja'])]);
                $cajaMsg = ". Se devolvió $" . number_format($valor, 0, ',', '.') . " a caja abierta.";
            } else {
                // No hay caja abierta: no revertimos el saldo (respeta caja cerrada)
                // pero dejamos el egreso anulado igual. El usuario debería abrir caja
                // primero si quiere que el efectivo vuelva.
                $cajaMsg = ". ⚠ No hay caja abierta — el efectivo NO se reintegró.";
            }
        }

        $db->commit();

        echo json_encode([
            'success' => true,
            'message' => "Egreso #{$egreso['N_Comprobante']} anulado" . $cajaMsg
        ], JSON_UNESCAPED_UNICODE);
        exit;
    }

    // ==============================================================
    // GET — listado (comportamiento original)
    // ==============================================================
    $anio = $_GET['anio'] ?? date('Y');
    $mes = $_GET['mes'] ?? null;
    $estado = $_GET['estado'] ?? 'Valida';

    // Filtro base: excluir gastos operativos. Los gastos usan FactN = '-1'
    // como marca (ver movimientos/gastos.php L17) para separarlos de los
    // pagos reales a proveedores (que llevan la factura del proveedor en
    // FactN). Sin este filtro el listado mostraba una mezcla de ambos
    // (compra papelería y aseo aparecían como "Pago a Proveedor").
    $where = "YEAR(e.Fecha) = :anio AND e.FactN <> '-1'";
    $params = [':anio' => $anio];

    if ($mes) { $where .= " AND MONTH(e.Fecha) = :mes"; $params[':mes'] = $mes; }
    if ($estado) { $where .= " AND e.Estado = :estado"; $params[':estado'] = $estado; }

    $stmt = $db->prepare("
        SELECT e.*,
               p.RazonSocial as NombreProveedor,
               p.Nit         as ProvNit,
               p.Telefonos   as ProvTelefono,
               m.nombre_medio as MedioPago
        FROM tblegresos e
        LEFT JOIN tblproveedores p ON e.CodigoPro = p.CodigoPro
        LEFT JOIN tblmedios_pago m ON e.id_mediopago = m.id_mediopago
        WHERE $where
        ORDER BY e.Id_Egresos DESC
        LIMIT 500
    ");
    $stmt->execute($params);
    $egresos = $stmt->fetchAll();

    foreach ($egresos as &$eg) {
        $eg['Valor'] = floatval($eg['Valor']);
        $eg['Descuento'] = floatval($eg['Descuento']);
        $eg['ValorFact'] = floatval($eg['ValorFact']);
        $eg['Saldoact'] = floatval($eg['Saldoact']);
        // Fallback: si no hay match con tblmedios_pago
        if (empty($eg['MedioPago'])) {
            $eg['MedioPago'] = intval($eg['id_mediopago'] ?? 0) === 0 ? 'Efectivo' : 'Transferencia';
        }
    }

    $totalGeneral = array_sum(array_column($egresos, 'Valor'));
    $anios = $db->query("SELECT DISTINCT YEAR(Fecha) as a FROM tblegresos ORDER BY a DESC")->fetchAll(PDO::FETCH_COLUMN);
    $medios = $db->query("SELECT id_mediopago, nombre_medio FROM tblmedios_pago ORDER BY id_mediopago")->fetchAll();

    echo json_encode([
        'success' => true,
        'egresos' => $egresos,
        'total'   => count($egresos),
        'anios'   => $anios,
        'medios'  => $medios,
        'resumen' => [
            'total_egresos' => count($egresos),
            'total_general' => $totalGeneral
        ]
    ], JSON_UNESCAPED_UNICODE);

} catch (Exception $e) {
    if ($db->inTransaction()) $db->rollBack();
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => $e->getMessage()]);
}
?>
