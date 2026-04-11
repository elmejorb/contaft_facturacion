<?php
/**
 * Cuentas bancarias + movimientos + traslados
 * GET                      → listar cuentas con saldo
 * GET ?cuenta=N&desde=&hasta= → movimientos de una cuenta
 * POST action=crear_cuenta → crear cuenta
 * POST action=editar_cuenta → editar
 * POST action=ingreso     → ingreso a cuenta
 * POST action=egreso      → egreso de cuenta
 * POST action=traslado    → traslado caja↔banco o banco↔banco
 */
require_once '../config/database.php';
$database = new Database();
$db = $database->getConnection();

try {
    if ($_SERVER['REQUEST_METHOD'] === 'GET') {
        if (isset($_GET['cuenta'])) {
            $cuentaId = intval($_GET['cuenta']);
            $desde = $_GET['desde'] ?? date('Y-m-01');
            $hasta = $_GET['hasta'] ?? date('Y-m-d');

            $stmt = $db->prepare("SELECT * FROM tblbancos WHERE idBancos = ?");
            $stmt->execute([$cuentaId]);
            $cuenta = $stmt->fetch();

            $stmt2 = $db->prepare("
                SELECT m.*, u.Nombre as NombreUsuario
                FROM tblmov_banco m
                LEFT JOIN tblusuarios u ON m.Id_Usuario = u.Id_Usuario
                WHERE m.idBancos = ? AND DATE(m.Fecha) BETWEEN ? AND ?
                ORDER BY m.Fecha DESC
            ");
            $stmt2->execute([$cuentaId, $desde, $hasta]);
            $movimientos = $stmt2->fetchAll();

            foreach ($movimientos as &$m) $m['Valor'] = floatval($m['Valor']);

            $ingresos = array_sum(array_map(fn($m) => in_array($m['Tipo'], ['ingreso','traslado_entrada']) ? $m['Valor'] : 0, $movimientos));
            $egresos = array_sum(array_map(fn($m) => in_array($m['Tipo'], ['egreso','traslado_salida']) ? $m['Valor'] : 0, $movimientos));

            echo json_encode([
                'success' => true,
                'cuenta' => $cuenta,
                'movimientos' => $movimientos,
                'resumen' => ['ingresos' => $ingresos, 'egresos' => $egresos]
            ], JSON_UNESCAPED_UNICODE);
            exit;
        }

        // Listar cuentas
        $stmt = $db->query("SELECT * FROM tblbancos ORDER BY idBancos");
        $cuentas = $stmt->fetchAll();
        foreach ($cuentas as &$c) $c['Saldo'] = floatval($c['Saldo']);

        $totalSaldo = array_sum(array_column($cuentas, 'Saldo'));

        // Cajas para traslados
        $cajas = $db->query("SELECT Id_Caja, Nombre, Tipo, Saldo FROM tblcajas WHERE Activa = 1")->fetchAll();

        echo json_encode(['success' => true, 'cuentas' => $cuentas, 'cajas' => $cajas, 'total_saldo' => $totalSaldo], JSON_UNESCAPED_UNICODE);

    } else {
        $data = json_decode(file_get_contents('php://input'), true);
        $action = $data['action'] ?? '';

        if ($action === 'crear_cuenta') {
            $nombre = $data['nombre'] ?? '';
            $banco = $data['banco'] ?? '';
            $numero = $data['numero_cuenta'] ?? '';
            $tipo = $data['tipo_cuenta'] ?? 'ahorros';
            if (!$nombre || !$banco) { echo json_encode(['success' => false, 'message' => 'Nombre y banco requeridos']); exit; }
            $db->prepare("INSERT INTO tblbancos (NomCuenta, Banco, NumCuenta, TipoCuenta) VALUES (?, ?, ?, ?)")
               ->execute([$nombre, $banco, $numero, $tipo]);
            echo json_encode(['success' => true, 'message' => "Cuenta '$nombre' creada"]);

        } elseif ($action === 'editar_cuenta') {
            $id = intval($data['id'] ?? 0);
            $db->prepare("UPDATE tblbancos SET NomCuenta = ?, Banco = ?, NumCuenta = ?, TipoCuenta = ? WHERE idBancos = ?")
               ->execute([$data['nombre'], $data['banco'], $data['numero_cuenta'] ?? '', $data['tipo_cuenta'] ?? 'ahorros', $id]);
            echo json_encode(['success' => true, 'message' => 'Cuenta actualizada']);

        } elseif ($action === 'ingreso' || $action === 'egreso') {
            $cuentaId = intval($data['cuenta_id'] ?? 0);
            $valor = floatval($data['valor'] ?? 0);
            $desc = $data['descripcion'] ?? '';
            $ref = $data['referencia'] ?? '';
            if (!$cuentaId || $valor <= 0) { echo json_encode(['success' => false, 'message' => 'Cuenta y valor requeridos']); exit; }

            $db->beginTransaction();
            $db->prepare("INSERT INTO tblmov_banco (idBancos, Tipo, Valor, Descripcion, Referencia) VALUES (?, ?, ?, ?, ?)")
               ->execute([$cuentaId, $action, $valor, $desc, $ref]);

            $signo = $action === 'ingreso' ? '+' : '-';
            $db->prepare("UPDATE tblbancos SET Saldo = Saldo $signo ? WHERE idBancos = ?")->execute([$valor, $cuentaId]);
            $db->commit();

            echo json_encode(['success' => true, 'message' => ucfirst($action) . ' de $' . number_format($valor, 0, ',', '.') . ' registrado'], JSON_UNESCAPED_UNICODE);

        } elseif ($action === 'traslado') {
            $origen_tipo = $data['origen_tipo'] ?? ''; // caja o banco
            $origen_id = intval($data['origen_id'] ?? 0);
            $destino_tipo = $data['destino_tipo'] ?? '';
            $destino_id = intval($data['destino_id'] ?? 0);
            $valor = floatval($data['valor'] ?? 0);
            $desc = $data['descripcion'] ?? 'Traslado';

            if ($valor <= 0) { echo json_encode(['success' => false, 'message' => 'Valor requerido']); exit; }

            $db->beginTransaction();

            // Restar del origen
            if ($origen_tipo === 'caja') {
                $db->prepare("UPDATE tblcajas SET Saldo = Saldo - ? WHERE Id_Caja = ?")->execute([$valor, $origen_id]);
                $sesion = $db->prepare("SELECT Id_Sesion FROM tblsesiones_caja WHERE Id_Caja = ? AND Estado = 'abierta' LIMIT 1");
                $sesion->execute([$origen_id]);
                $s = $sesion->fetch();
                $db->prepare("INSERT INTO tblmov_caja (Id_Sesion, Id_Caja_Origen, Id_Usuario, Valor, Tipo, Descripcion) VALUES (?, ?, 0, ?, 'traslado', ?)")
                   ->execute([$s ? $s['Id_Sesion'] : null, $origen_id, $valor, $desc]);
            } else {
                $db->prepare("UPDATE tblbancos SET Saldo = Saldo - ? WHERE idBancos = ?")->execute([$valor, $origen_id]);
                $db->prepare("INSERT INTO tblmov_banco (idBancos, Tipo, Valor, Descripcion) VALUES (?, 'traslado_salida', ?, ?)")
                   ->execute([$origen_id, $valor, $desc]);
            }

            // Sumar al destino
            if ($destino_tipo === 'caja') {
                $db->prepare("UPDATE tblcajas SET Saldo = Saldo + ? WHERE Id_Caja = ?")->execute([$valor, $destino_id]);
                $db->prepare("INSERT INTO tblmov_caja (Id_Caja_Destino, Id_Usuario, Valor, Tipo, Descripcion) VALUES (?, 0, ?, 'deposito', ?)")
                   ->execute([$destino_id, $valor, $desc]);
            } else {
                $db->prepare("UPDATE tblbancos SET Saldo = Saldo + ? WHERE idBancos = ?")->execute([$valor, $destino_id]);
                $db->prepare("INSERT INTO tblmov_banco (idBancos, Tipo, Valor, Descripcion) VALUES (?, 'traslado_entrada', ?, ?)")
                   ->execute([$destino_id, $valor, $desc]);
            }

            $db->commit();
            echo json_encode(['success' => true, 'message' => 'Traslado de $' . number_format($valor, 0, ',', '.') . ' realizado'], JSON_UNESCAPED_UNICODE);
        }
    }
} catch (Exception $e) {
    if ($db->inTransaction()) $db->rollBack();
    echo json_encode(['success' => false, 'message' => $e->getMessage()]);
}
?>
