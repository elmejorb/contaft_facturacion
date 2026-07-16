<?php
/**
 * Módulo de Financiaciones
 *
 * GET  /?listar=1&anio=X&mes=Y&estado=Activa  → listado de financiaciones
 * GET  /?detalle=<id_financiacion>            → cabecera + cuotas + pagos
 * POST { action: 'crear', ...datos, cuotas }  → registra financiación + cronograma
 * POST { action: 'pagar', id_cuota, valor, medio_pago, id_usuario }
 *   → registra pago (parcial o total), actualiza saldo de la cuota y estado
 *     de la financiación completa si todas las cuotas quedan pagadas
 * POST { action: 'anular_pago', id_financpago }
 *   → marca el pago como Anulada y recalcula saldo/estado de la cuota
 * POST { action: 'anular', id_financiacion }
 *   → marca la financiación como Anulada (solo si no tiene pagos válidos)
 *
 * Convención: nunca se borran filas — kardex contable, todos los cambios
 * quedan trazables. Anular = marcar Estado='Anulada' y recalcular saldos.
 */

require_once '../config/database.php';
$database = new Database();
$db = $database->getConnection();
$method = $_SERVER['REQUEST_METHOD'];

try {
    // ================================================================
    // GET
    // ================================================================
    if ($method === 'GET') {

        // Listar financiaciones con búsqueda + filtros
        if (isset($_GET['listar'])) {
            $anio = intval($_GET['anio'] ?? date('Y'));
            $mes = intval($_GET['mes'] ?? 0);
            $estado = $_GET['estado'] ?? '';
            $busq = trim($_GET['q'] ?? '');

            $where = "YEAR(f.Fecha) = :anio";
            $params = [':anio' => $anio];
            if ($mes > 0) { $where .= " AND MONTH(f.Fecha) = :mes"; $params[':mes'] = $mes; }
            if ($estado)  { $where .= " AND f.Estado = :estado";    $params[':estado'] = $estado; }
            if ($busq !== '') {
                $where .= " AND (c.Razon_Social LIKE :q OR c.Nit LIKE :q OR f.Consecutivo LIKE :q OR f.Descripcion LIKE :q)";
                $params[':q'] = "%$busq%";
            }

            $stmt = $db->prepare("
                SELECT f.*, c.Razon_Social AS cliente_nombre, c.Nit AS cliente_nit,
                       u.Nombre AS vendedor_nombre,
                       (SELECT COUNT(*) FROM tblfinanciacion_cuotas WHERE Id_Financiacion=f.Id_Financiacion) AS total_cuotas,
                       (SELECT COUNT(*) FROM tblfinanciacion_cuotas WHERE Id_Financiacion=f.Id_Financiacion AND Estado='Pagada') AS cuotas_pagadas,
                       (SELECT COALESCE(SUM(Saldo),0) FROM tblfinanciacion_cuotas WHERE Id_Financiacion=f.Id_Financiacion) AS saldo_pendiente,
                       (SELECT MIN(FechaVencimiento) FROM tblfinanciacion_cuotas WHERE Id_Financiacion=f.Id_Financiacion AND Estado <> 'Pagada') AS proxima_cuota
                FROM tblfinanciaciones f
                LEFT JOIN tblclientes c ON c.CodigoClien = f.Codigo
                LEFT JOIN tblusuarios u ON u.Id_Usuario  = f.Id_Usuario
                WHERE $where
                ORDER BY f.Id_Financiacion DESC
                LIMIT 500
            ");
            $stmt->execute($params);
            $rows = $stmt->fetchAll();
            foreach ($rows as &$r) {
                foreach (['MontoTotal','CuotaInicial','MontoFinanciado','saldo_pendiente'] as $k) {
                    $r[$k] = floatval($r[$k]);
                }
                // Marca en mora si al menos una cuota está vencida (fecha < hoy) sin pagar
                // dias_mora = antigüedad de la cuota MÁS vieja vencida (para bucketing 30/60/90+)
                $stmtMora = $db->prepare("SELECT COUNT(*) AS c,
                        COALESCE(MAX(DATEDIFF(CURDATE(), FechaVencimiento)),0) AS dias
                    FROM tblfinanciacion_cuotas
                    WHERE Id_Financiacion = ? AND Estado <> 'Pagada' AND FechaVencimiento < CURDATE()");
                $stmtMora->execute([$r['Id_Financiacion']]);
                $m = $stmtMora->fetch();
                $r['cuotas_vencidas'] = intval($m['c']);
                $r['dias_mora'] = intval($m['dias']);
            }

            $anios = $db->query("SELECT DISTINCT YEAR(Fecha) AS a FROM tblfinanciaciones ORDER BY a DESC")
                        ->fetchAll(PDO::FETCH_COLUMN);

            echo json_encode(['success' => true, 'financiaciones' => $rows, 'anios' => $anios], JSON_UNESCAPED_UNICODE);
            exit;
        }

        // Detalle de una financiación
        if (isset($_GET['detalle'])) {
            $id = intval($_GET['detalle']);
            $stmt = $db->prepare("
                SELECT f.*, c.Razon_Social AS cliente_nombre, c.Nit AS cliente_nit,
                       c.Telefonos AS cliente_telefono, c.Direccion AS cliente_direccion,
                       u.Nombre AS vendedor_nombre
                FROM tblfinanciaciones f
                LEFT JOIN tblclientes c ON c.CodigoClien = f.Codigo
                LEFT JOIN tblusuarios u ON u.Id_Usuario  = f.Id_Usuario
                WHERE f.Id_Financiacion = ?
            ");
            $stmt->execute([$id]);
            $financ = $stmt->fetch();
            if (!$financ) { echo json_encode(['success' => false, 'message' => 'No encontrada']); exit; }

            $stmt = $db->prepare("SELECT * FROM tblfinanciacion_cuotas
                                  WHERE Id_Financiacion = ? ORDER BY NumCuota");
            $stmt->execute([$id]);
            $cuotas = $stmt->fetchAll();

            $stmt = $db->prepare("SELECT * FROM tblfinanciacion_pagos
                                  WHERE Id_Financiacion = ? AND Estado = 'Valida'
                                  ORDER BY Fecha DESC, Id_FinancPago DESC");
            $stmt->execute([$id]);
            $pagos = $stmt->fetchAll();

            echo json_encode(['success' => true, 'financiacion' => $financ, 'cuotas' => $cuotas, 'pagos' => $pagos], JSON_UNESCAPED_UNICODE);
            exit;
        }

        echo json_encode(['success' => false, 'message' => 'Endpoint no reconocido']);
        exit;
    }

    // ================================================================
    // POST
    // ================================================================
    $data = json_decode(file_get_contents('php://input'), true) ?: [];
    $action = $data['action'] ?? '';

    // ---- CREAR financiación con su cronograma ----
    if ($action === 'crear') {
        $codigo = intval($data['codigo'] ?? 0);
        if (!$codigo) { echo json_encode(['success' => false, 'message' => 'Cliente requerido']); exit; }

        $cuotas = $data['cuotas'] ?? [];
        if (!is_array($cuotas) || count($cuotas) === 0) {
            echo json_encode(['success' => false, 'message' => 'Se requiere al menos 1 cuota']); exit;
        }
        $sumaCuotas = 0;
        foreach ($cuotas as $c) { $sumaCuotas += floatval($c['valor'] ?? 0); }
        $montoFinanciado = floatval($data['monto_financiado'] ?? 0);
        if ($montoFinanciado <= 0) { $montoFinanciado = $sumaCuotas; }
        // Validar que la suma cuadra (tolerancia de $1 por redondeo)
        if (abs($sumaCuotas - $montoFinanciado) > 1) {
            echo json_encode([
                'success' => false,
                'message' => "La suma de cuotas ($sumaCuotas) no coincide con el monto a financiar ($montoFinanciado)"
            ]);
            exit;
        }

        $db->beginTransaction();

        // Consecutivo interno F-XXX (por si no viene del frontend)
        $consecutivo = trim($data['consecutivo'] ?? '');
        if ($consecutivo === '') {
            $next = intval($db->query("SELECT COALESCE(MAX(Id_Financiacion), 0) + 1 FROM tblfinanciaciones")->fetchColumn());
            $consecutivo = 'F-' . str_pad($next, 4, '0', STR_PAD_LEFT);
        }

        $stmt = $db->prepare("
            INSERT INTO tblfinanciaciones
              (Consecutivo, Fecha, Codigo, Descripcion, MontoTotal, CuotaInicial, MontoFinanciado,
               NumCuotas, FrecuenciaDias, FechaPrimeraCuota, Factura_N, Id_Usuario, Comentario)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ");
        $stmt->execute([
            $consecutivo,
            $data['fecha'] ?? date('Y-m-d'),
            $codigo,
            $data['descripcion'] ?? '',
            floatval($data['monto_total']       ?? $montoFinanciado),
            floatval($data['cuota_inicial']     ?? 0),
            $montoFinanciado,
            count($cuotas),
            intval($data['frecuencia_dias']     ?? 30),
            $cuotas[0]['fecha']                 ?? null,
            !empty($data['factura_n']) ? intval($data['factura_n']) : null,
            !empty($data['id_usuario']) ? intval($data['id_usuario']) : null,
            $data['comentario'] ?? null,
        ]);
        $idFinanc = intval($db->lastInsertId());

        $stmtCuota = $db->prepare("
            INSERT INTO tblfinanciacion_cuotas
              (Id_Financiacion, NumCuota, FechaVencimiento, ValorCuota, ValorPagado, Saldo, Estado)
            VALUES (?, ?, ?, ?, 0, ?, 'Pendiente')
        ");
        foreach ($cuotas as $i => $c) {
            $val = floatval($c['valor'] ?? 0);
            $stmtCuota->execute([
                $idFinanc,
                intval($c['numero'] ?? ($i + 1)),
                $c['fecha'],
                $val,
                $val,   // Saldo inicial = ValorCuota
            ]);
        }

        $db->commit();
        echo json_encode(['success' => true, 'id_financiacion' => $idFinanc, 'consecutivo' => $consecutivo]);
        exit;
    }

    // ---- REGISTRAR pago de una cuota ----
    // Recibe el pago de capital (valor) y opcionalmente el interés de mora
    // (interes_mora) — se guardan como filas separadas en tblfinanciacion_pagos
    // con `EsInteresMora`, de modo que el interés NO afecta el saldo de capital.
    if ($action === 'pagar') {
        $idCuota  = intval($data['id_cuota'] ?? 0);
        $valor    = floatval($data['valor'] ?? 0);           // abono a capital
        $interes  = floatval($data['interes_mora'] ?? 0);    // interés de mora (aparte)
        $medio    = intval($data['medio_pago'] ?? 0);
        $usu      = !empty($data['id_usuario']) ? intval($data['id_usuario']) : null;
        $fechaP   = $data['fecha'] ?? date('Y-m-d');

        if (!$idCuota || ($valor <= 0 && $interes <= 0)) {
            echo json_encode(['success' => false, 'message' => 'Cuota y valor requeridos']); exit;
        }

        $stmt = $db->prepare("SELECT * FROM tblfinanciacion_cuotas WHERE Id_Cuota = ?");
        $stmt->execute([$idCuota]);
        $cuota = $stmt->fetch();
        if (!$cuota) { echo json_encode(['success' => false, 'message' => 'Cuota no encontrada']); exit; }
        if ($cuota['Estado'] === 'Pagada' && $valor > 0) {
            echo json_encode(['success' => false, 'message' => 'La cuota ya está pagada']); exit;
        }
        if ($valor > floatval($cuota['Saldo']) + 0.01) {
            echo json_encode(['success' => false,
                'message' => 'El pago excede el saldo pendiente de la cuota (' . $cuota['Saldo'] . ')']);
            exit;
        }

        $db->beginTransaction();
        $ins = $db->prepare("
            INSERT INTO tblfinanciacion_pagos
              (Id_Cuota, Id_Financiacion, Fecha, Valor, id_mediopago, Id_Usuario, EsInteresMora, Estado)
            VALUES (?, ?, ?, ?, ?, ?, ?, 'Valida')
        ");
        if ($valor > 0) {
            $ins->execute([$idCuota, intval($cuota['Id_Financiacion']), $fechaP, $valor, $medio, $usu, 0]);
        }
        if ($interes > 0) {
            $ins->execute([$idCuota, intval($cuota['Id_Financiacion']), $fechaP, $interes, $medio, $usu, 1]);
        }

        // Recalcular la cuota (solo cuenta pagos de capital)
        recalcularCuota($db, $idCuota);
        // Y el estado global de la financiación
        recalcularFinanciacion($db, intval($cuota['Id_Financiacion']));

        $db->commit();
        $total = $valor + $interes;
        $detalle = $interes > 0
            ? " (capital $ " . number_format($valor,0,',','.') . " + mora $ " . number_format($interes,0,',','.') . ")"
            : "";
        echo json_encode(['success' => true,
            'message' => "Pago registrado por $ " . number_format($total,0,',','.') . $detalle]);
        exit;
    }

    // ---- ANULAR pago individual ----
    if ($action === 'anular_pago') {
        $idPago = intval($data['id_financpago'] ?? 0);
        if (!$idPago) { echo json_encode(['success' => false, 'message' => 'ID requerido']); exit; }

        $stmt = $db->prepare("SELECT * FROM tblfinanciacion_pagos WHERE Id_FinancPago = ?");
        $stmt->execute([$idPago]);
        $p = $stmt->fetch();
        if (!$p || $p['Estado'] !== 'Valida') {
            echo json_encode(['success' => false, 'message' => 'Pago no encontrado o ya anulado']); exit;
        }

        $db->beginTransaction();
        $db->prepare("UPDATE tblfinanciacion_pagos SET Estado='Anulada' WHERE Id_FinancPago = ?")->execute([$idPago]);
        recalcularCuota($db, intval($p['Id_Cuota']));
        recalcularFinanciacion($db, intval($p['Id_Financiacion']));
        $db->commit();
        echo json_encode(['success' => true, 'message' => 'Pago anulado']);
        exit;
    }

    // ---- ANULAR financiación completa ----
    if ($action === 'anular') {
        $id = intval($data['id_financiacion'] ?? 0);
        if (!$id) { echo json_encode(['success' => false, 'message' => 'ID requerido']); exit; }
        $tienePagos = intval($db->query("SELECT COUNT(*) FROM tblfinanciacion_pagos
            WHERE Id_Financiacion = $id AND Estado = 'Valida'")->fetchColumn());
        if ($tienePagos > 0) {
            echo json_encode(['success' => false,
                'message' => 'No se puede anular: hay pagos registrados. Anule primero los pagos.']);
            exit;
        }
        $db->prepare("UPDATE tblfinanciaciones SET Estado='Anulada' WHERE Id_Financiacion = ?")->execute([$id]);
        echo json_encode(['success' => true, 'message' => 'Financiación anulada']);
        exit;
    }

    echo json_encode(['success' => false, 'message' => "Acción no soportada: $action"]);

} catch (\Throwable $e) {
    if ($db->inTransaction()) $db->rollBack();
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => $e->getMessage()]);
}

/* ============================================================
 * Helpers
 * ============================================================ */

/**
 * Recalcula ValorPagado, Saldo y Estado de una cuota basándose en la suma
 * de tblfinanciacion_pagos válidos. Fuente de verdad = pagos, no delta.
 */
function recalcularCuota(PDO $db, int $idCuota): void {
    // Solo cuentan pagos de CAPITAL (EsInteresMora=0). Los intereses de mora
    // se guardan como pagos aparte y NO reducen el saldo de la cuota.
    $stmt = $db->prepare("
        SELECT ValorCuota,
               (SELECT COALESCE(SUM(Valor),0) FROM tblfinanciacion_pagos
                WHERE Id_Cuota = ? AND Estado='Valida' AND EsInteresMora = 0) AS pagado,
               (SELECT MAX(Fecha) FROM tblfinanciacion_pagos
                WHERE Id_Cuota = ? AND Estado='Valida') AS ultimo_pago
        FROM tblfinanciacion_cuotas WHERE Id_Cuota = ?
    ");
    $stmt->execute([$idCuota, $idCuota, $idCuota]);
    $r = $stmt->fetch();
    if (!$r) return;
    $valor  = floatval($r['ValorCuota']);
    $pagado = floatval($r['pagado']);
    $saldo  = max($valor - $pagado, 0);
    $estado = ($pagado <= 0.01) ? 'Pendiente' : ($saldo <= 0.01 ? 'Pagada' : 'Parcial');
    $db->prepare("UPDATE tblfinanciacion_cuotas
                  SET ValorPagado = ?, Saldo = ?, Estado = ?, FechaUltimoPago = ?
                  WHERE Id_Cuota = ?")
       ->execute([$pagado, $saldo, $estado, $r['ultimo_pago'], $idCuota]);
}

/**
 * Estado global de la financiación: Pagada si todas las cuotas quedaron
 * en 'Pagada', Activa en cualquier otro caso (no toca Anulada).
 */
function recalcularFinanciacion(PDO $db, int $idFinanc): void {
    $stmt = $db->prepare("SELECT Estado FROM tblfinanciaciones WHERE Id_Financiacion = ?");
    $stmt->execute([$idFinanc]);
    $estadoActual = $stmt->fetchColumn();
    if ($estadoActual === 'Anulada') return;

    $stmt = $db->prepare("
        SELECT COUNT(*) AS total,
               SUM(CASE WHEN Estado='Pagada' THEN 1 ELSE 0 END) AS pagadas
        FROM tblfinanciacion_cuotas WHERE Id_Financiacion = ?
    ");
    $stmt->execute([$idFinanc]);
    $r = $stmt->fetch();
    $nuevoEstado = ($r['total'] > 0 && $r['pagadas'] == $r['total']) ? 'Pagada' : 'Activa';
    $db->prepare("UPDATE tblfinanciaciones SET Estado = ? WHERE Id_Financiacion = ?")
       ->execute([$nuevoEstado, $idFinanc]);
}
