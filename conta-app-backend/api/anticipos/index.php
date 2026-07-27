<?php
/**
 * Anticipos de clientes — dinero que el cliente entrega hoy para usar en
 * compras futuras. Se registra como ingreso en caja/banco y contablemente
 * es un pasivo (deuda del negocio con el cliente).
 *
 * GET  ?listar=1&anio=&mes=&estado=&q=            → listado con filtros
 * GET  ?por_cliente=CodigoCli                     → anticipos de un cliente + saldo total
 * GET  ?detalle=Id_Anticipo                       → cabecera + movimientos + cliente
 * GET  ?saldo=CodigoCli                           → solo saldo disponible del cliente (rápido, uso en Nueva Venta)
 *
 * POST { action:'crear',    codigo_cli, valor, id_mediopago, concepto?, fecha?, id_usuario? }
 * POST { action:'aplicar',  id_anticipo, factura_n, valor, concepto?, id_usuario? }
 * POST { action:'devolver', id_anticipo, valor?, id_mediopago, concepto?, id_usuario? }
 * POST { action:'anular',   id_anticipo, motivo?, id_usuario? }
 */
require_once '../config/database.php';
$db = (new Database())->getConnection();

/**
 * Recalcula el Estado del anticipo a partir del Saldo:
 *   - Saldo == Valor  → Vigente
 *   - 0 < Saldo < Valor → Vigente (con consumo parcial)
 *   - Saldo == 0        → Aplicado
 * NO cambia Devuelto/Anulado (esos son terminales, se ponen aparte).
 */
function recalcularEstadoAnticipo(PDO $db, int $idAnt): void {
    $stmt = $db->prepare("SELECT Valor, Saldo, Estado FROM tblanticipos_cliente WHERE Id_Anticipo=?");
    $stmt->execute([$idAnt]);
    $a = $stmt->fetch();
    if (!$a) return;
    if (in_array($a['Estado'], ['Devuelto', 'Anulado'], true)) return; // terminal
    $saldo = floatval($a['Saldo']);
    $nuevo = $saldo <= 0.01 ? 'Aplicado' : 'Vigente';
    if ($nuevo !== $a['Estado']) {
        $db->prepare("UPDATE tblanticipos_cliente SET Estado=?, FechaMod=NOW() WHERE Id_Anticipo=?")
           ->execute([$nuevo, $idAnt]);
    }
}

try {
    // ================================================================
    // GET
    // ================================================================
    if ($_SERVER['REQUEST_METHOD'] === 'GET') {

        // Saldo disponible de un cliente (uso ligero desde Nueva Venta)
        if (isset($_GET['saldo'])) {
            $cod = intval($_GET['saldo']);
            $stmt = $db->prepare("SELECT COALESCE(SUM(Saldo),0) AS saldo
                                  FROM tblanticipos_cliente
                                  WHERE CodigoCli=? AND Estado='Vigente'");
            $stmt->execute([$cod]);
            $s = floatval($stmt->fetchColumn());
            echo json_encode(['success' => true, 'codigo_cli' => $cod, 'saldo_disponible' => $s]);
            exit;
        }

        // Anticipos de un cliente + saldo total (uso desde Cartera / Nueva Venta)
        if (isset($_GET['por_cliente'])) {
            $cod = intval($_GET['por_cliente']);
            $stmt = $db->prepare("
                SELECT a.*, c.Razon_Social AS cliente_nombre, u.Nombre AS usuario_nombre
                FROM tblanticipos_cliente a
                LEFT JOIN tblclientes c ON c.CodigoClien = a.CodigoCli
                LEFT JOIN tblusuarios u ON u.Id_Usuario  = a.Id_Usuario
                WHERE a.CodigoCli = ?
                ORDER BY a.Id_Anticipo DESC
            ");
            $stmt->execute([$cod]);
            $rows = $stmt->fetchAll();
            foreach ($rows as &$r) {
                $r['Valor'] = floatval($r['Valor']);
                $r['Saldo'] = floatval($r['Saldo']);
            }
            $saldoTotal = 0;
            foreach ($rows as $r) if ($r['Estado'] === 'Vigente') $saldoTotal += $r['Saldo'];
            echo json_encode(['success' => true, 'anticipos' => $rows, 'saldo_total' => $saldoTotal], JSON_UNESCAPED_UNICODE);
            exit;
        }

        // Detalle: cabecera + movimientos
        if (isset($_GET['detalle'])) {
            $id = intval($_GET['detalle']);
            $stmt = $db->prepare("
                SELECT a.*, c.Razon_Social AS cliente_nombre, COALESCE(c.Nit, c.Identificacion) AS cliente_nit,
                       c.Telefonos AS cliente_telefono, u.Nombre AS usuario_nombre
                FROM tblanticipos_cliente a
                LEFT JOIN tblclientes c ON c.CodigoClien = a.CodigoCli
                LEFT JOIN tblusuarios u ON u.Id_Usuario  = a.Id_Usuario
                WHERE a.Id_Anticipo = ?
            ");
            $stmt->execute([$id]);
            $ant = $stmt->fetch();
            if (!$ant) { echo json_encode(['success' => false, 'message' => 'Anticipo no encontrado']); exit; }

            $stmt = $db->prepare("
                SELECT m.*, u.Nombre AS usuario_nombre
                FROM tblanticipo_movs m
                LEFT JOIN tblusuarios u ON u.Id_Usuario = m.Id_Usuario
                WHERE m.Id_Anticipo = ?
                ORDER BY m.Id_Mov DESC
            ");
            $stmt->execute([$id]);
            $movs = $stmt->fetchAll();
            foreach ($movs as &$m) $m['Valor'] = floatval($m['Valor']);

            echo json_encode(['success' => true, 'anticipo' => $ant, 'movimientos' => $movs], JSON_UNESCAPED_UNICODE);
            exit;
        }

        // Listado con filtros
        if (isset($_GET['listar'])) {
            $anio   = intval($_GET['anio'] ?? date('Y'));
            $mes    = intval($_GET['mes'] ?? 0);
            $estado = $_GET['estado'] ?? '';
            $q      = trim($_GET['q'] ?? '');

            $where = "YEAR(a.Fecha) = :anio";
            $params = [':anio' => $anio];
            if ($mes > 0) { $where .= " AND MONTH(a.Fecha) = :mes"; $params[':mes'] = $mes; }
            if ($estado)  { $where .= " AND a.Estado = :estado";    $params[':estado'] = $estado; }
            if ($q !== '') {
                $where .= " AND (c.Nombre_Cliente LIKE :q OR c.Identificacion LIKE :q OR a.Consecutivo LIKE :q)";
                $params[':q'] = "%$q%";
            }

            $stmt = $db->prepare("
                SELECT a.*, c.Razon_Social AS cliente_nombre, COALESCE(c.Nit, c.Identificacion) AS cliente_nit,
                       u.Nombre AS usuario_nombre
                FROM tblanticipos_cliente a
                LEFT JOIN tblclientes c ON c.CodigoClien = a.CodigoCli
                LEFT JOIN tblusuarios u ON u.Id_Usuario  = a.Id_Usuario
                WHERE $where
                ORDER BY a.Id_Anticipo DESC
                LIMIT 500
            ");
            $stmt->execute($params);
            $rows = $stmt->fetchAll();
            foreach ($rows as &$r) {
                $r['Valor'] = floatval($r['Valor']);
                $r['Saldo'] = floatval($r['Saldo']);
            }

            $anios = $db->query("SELECT DISTINCT YEAR(Fecha) AS a FROM tblanticipos_cliente ORDER BY a DESC")
                        ->fetchAll(PDO::FETCH_COLUMN);

            echo json_encode(['success' => true, 'anticipos' => $rows, 'anios' => $anios], JSON_UNESCAPED_UNICODE);
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

    // ---- CREAR anticipo ----
    if ($action === 'crear') {
        $codigoCli = intval($data['codigo_cli'] ?? 0);
        $valor     = floatval($data['valor'] ?? 0);
        $medio     = intval($data['id_mediopago'] ?? 0);
        $concepto  = trim($data['concepto'] ?? '');
        $fecha     = $data['fecha'] ?? date('Y-m-d');
        $usu       = !empty($data['id_usuario']) ? intval($data['id_usuario']) : null;

        if (!$codigoCli) { echo json_encode(['success' => false, 'message' => 'Cliente requerido']); exit; }
        if ($valor <= 0) { echo json_encode(['success' => false, 'message' => 'Valor debe ser mayor a 0']); exit; }

        // Consecutivo ANT-XXXX
        $next = intval($db->query("SELECT COALESCE(MAX(Id_Anticipo),0)+1 FROM tblanticipos_cliente")->fetchColumn());
        $cons = 'ANT-' . str_pad($next, 4, '0', STR_PAD_LEFT);

        $db->prepare("
            INSERT INTO tblanticipos_cliente
              (Consecutivo, Fecha, CodigoCli, Valor, Saldo, id_mediopago, Concepto, Id_Usuario, Estado)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'Vigente')
        ")->execute([$cons, $fecha, $codigoCli, $valor, $valor, $medio, $concepto ?: null, $usu]);

        $idAnt = intval($db->lastInsertId());
        echo json_encode([
            'success' => true,
            'id_anticipo' => $idAnt,
            'consecutivo' => $cons,
            'message' => "Anticipo $cons registrado por $ " . number_format($valor, 0, ',', '.'),
        ]);
        exit;
    }

    // ---- APLICAR anticipo en una venta (consume saldo) ----
    if ($action === 'aplicar') {
        $idAnt    = intval($data['id_anticipo'] ?? 0);
        $factN    = intval($data['factura_n'] ?? 0);
        $valor    = floatval($data['valor'] ?? 0);
        $concepto = trim($data['concepto'] ?? '');
        $usu      = !empty($data['id_usuario']) ? intval($data['id_usuario']) : null;

        if (!$idAnt || $valor <= 0) { echo json_encode(['success' => false, 'message' => 'Datos inválidos']); exit; }

        $stmt = $db->prepare("SELECT Saldo, Estado FROM tblanticipos_cliente WHERE Id_Anticipo=?");
        $stmt->execute([$idAnt]);
        $a = $stmt->fetch();
        if (!$a) { echo json_encode(['success' => false, 'message' => 'Anticipo no encontrado']); exit; }
        if ($a['Estado'] !== 'Vigente') {
            echo json_encode(['success' => false, 'message' => 'Anticipo no está vigente (estado: ' . $a['Estado'] . ')']); exit;
        }
        $saldo = floatval($a['Saldo']);
        if ($valor > $saldo + 0.01) {
            echo json_encode(['success' => false, 'message' => 'Valor a aplicar (' . $valor . ') supera el saldo (' . $saldo . ')']); exit;
        }

        $db->beginTransaction();
        // 1) Descontar del saldo del anticipo
        $db->prepare("UPDATE tblanticipos_cliente SET Saldo = Saldo - ?, FechaMod=NOW() WHERE Id_Anticipo=?")
           ->execute([$valor, $idAnt]);
        // 2) Registrar el movimiento
        $db->prepare("
            INSERT INTO tblanticipo_movs (Id_Anticipo, Fecha, Tipo, Valor, Factura_N, Concepto, Id_Usuario, Estado)
            VALUES (?, ?, 'Aplicacion', ?, ?, ?, ?, 'Valida')
        ")->execute([$idAnt, date('Y-m-d'), $valor, $factN ?: null, $concepto ?: null, $usu]);
        // 3) Recalcular estado
        recalcularEstadoAnticipo($db, $idAnt);
        $db->commit();

        echo json_encode(['success' => true, 'message' => "Aplicado $ " . number_format($valor, 0, ',', '.')]);
        exit;
    }

    // ---- DEVOLVER anticipo (parcial o total) ----
    // Egresa físicamente el dinero al cliente (caja/banco).
    if ($action === 'devolver') {
        $idAnt = intval($data['id_anticipo'] ?? 0);
        $valor = floatval($data['valor'] ?? 0);       // si viene 0 → devolver todo el saldo
        $medio = intval($data['id_mediopago'] ?? 0);
        $conc  = trim($data['concepto'] ?? '');
        $usu   = !empty($data['id_usuario']) ? intval($data['id_usuario']) : null;

        $stmt = $db->prepare("SELECT Saldo, Estado FROM tblanticipos_cliente WHERE Id_Anticipo=?");
        $stmt->execute([$idAnt]);
        $a = $stmt->fetch();
        if (!$a) { echo json_encode(['success' => false, 'message' => 'Anticipo no encontrado']); exit; }
        if ($a['Estado'] !== 'Vigente') {
            echo json_encode(['success' => false, 'message' => 'Anticipo no vigente']); exit;
        }
        $saldo = floatval($a['Saldo']);
        if ($valor <= 0) $valor = $saldo;
        if ($valor > $saldo + 0.01) {
            echo json_encode(['success' => false, 'message' => 'Valor a devolver supera el saldo']); exit;
        }

        $db->beginTransaction();
        $db->prepare("UPDATE tblanticipos_cliente SET Saldo = Saldo - ?, FechaMod=NOW() WHERE Id_Anticipo=?")
           ->execute([$valor, $idAnt]);
        $db->prepare("
            INSERT INTO tblanticipo_movs (Id_Anticipo, Fecha, Tipo, Valor, Concepto, id_mediopago, Id_Usuario, Estado)
            VALUES (?, ?, 'Devolucion', ?, ?, ?, ?, 'Valida')
        ")->execute([$idAnt, date('Y-m-d'), $valor, $conc ?: null, $medio, $usu]);

        // Si devolvió todo, el estado pasa a Devuelto (terminal)
        $stmt = $db->prepare("SELECT Saldo FROM tblanticipos_cliente WHERE Id_Anticipo=?");
        $stmt->execute([$idAnt]);
        $saldoNuevo = floatval($stmt->fetchColumn());
        if ($saldoNuevo <= 0.01) {
            $db->prepare("UPDATE tblanticipos_cliente SET Estado='Devuelto', FechaMod=NOW() WHERE Id_Anticipo=?")
               ->execute([$idAnt]);
        }
        $db->commit();

        echo json_encode(['success' => true, 'message' => "Devuelto $ " . number_format($valor,0,',','.')]);
        exit;
    }

    // ---- ANULAR el anticipo completo (solo si nunca se aplicó) ----
    if ($action === 'anular') {
        $idAnt  = intval($data['id_anticipo'] ?? 0);
        $motivo = trim($data['motivo'] ?? '');
        $usu    = !empty($data['id_usuario']) ? intval($data['id_usuario']) : null;

        $stmt = $db->prepare("SELECT Valor, Saldo, Estado FROM tblanticipos_cliente WHERE Id_Anticipo=?");
        $stmt->execute([$idAnt]);
        $a = $stmt->fetch();
        if (!$a) { echo json_encode(['success' => false, 'message' => 'No encontrado']); exit; }
        if ($a['Estado'] !== 'Vigente') {
            echo json_encode(['success' => false, 'message' => 'Solo se anulan anticipos vigentes']); exit;
        }
        if (floatval($a['Saldo']) < floatval($a['Valor'])) {
            echo json_encode(['success' => false, 'message' => 'Anticipo con consumo — use "devolver saldo restante" en su lugar']); exit;
        }

        $db->beginTransaction();
        $db->prepare("UPDATE tblanticipos_cliente SET Estado='Anulado', Saldo=0, FechaMod=NOW() WHERE Id_Anticipo=?")
           ->execute([$idAnt]);
        $db->prepare("
            INSERT INTO tblanticipo_movs (Id_Anticipo, Fecha, Tipo, Valor, Concepto, Id_Usuario, Estado)
            VALUES (?, ?, 'Reverso', ?, ?, ?, 'Valida')
        ")->execute([$idAnt, date('Y-m-d'), floatval($a['Valor']), $motivo ?: 'Anulación', $usu]);
        $db->commit();

        echo json_encode(['success' => true, 'message' => 'Anticipo anulado']);
        exit;
    }

    echo json_encode(['success' => false, 'message' => "Acción no soportada: $action"]);

} catch (\Throwable $e) {
    if ($db->inTransaction()) $db->rollBack();
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => $e->getMessage()]);
}
