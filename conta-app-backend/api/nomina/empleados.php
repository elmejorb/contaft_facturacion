<?php
/**
 * Nómina — CRUD empleados
 * GET  ?q=&estado=     → lista (opcional filtro texto + estado)
 * GET  ?id=N           → detalle de un empleado
 * POST { action: 'crear'|'actualizar'|'retirar', ... }
 */
require_once '../config/database.php';
$database = new Database();
$db = $database->getConnection();

try {
    if ($_SERVER['REQUEST_METHOD'] === 'GET') {
        if (isset($_GET['id'])) {
            $stmt = $db->prepare("SELECT * FROM tbl_empleados WHERE Id_Empleado = ?");
            $stmt->execute([intval($_GET['id'])]);
            $emp = $stmt->fetch();
            if (!$emp) { echo json_encode(['success' => false, 'message' => 'Empleado no encontrado']); exit; }

            // Saldo acumulado actual del empleado (lo que debe a la empresa).
            // Es el Saldo_Acum del último movimiento activo. 0 si no tiene movs.
            $stmtS = $db->prepare("SELECT COALESCE(Saldo_Acum, 0) FROM tbl_mov_empleado
                                   WHERE Id_Empleado = ? AND Estado = 'activo'
                                   ORDER BY Id_Mov DESC LIMIT 1");
            $stmtS->execute([$emp['Id_Empleado']]);
            $emp['saldo_actual'] = floatval($stmtS->fetchColumn());
            echo json_encode(['success' => true, 'empleado' => $emp]);
            exit;
        }

        $q = trim($_GET['q'] ?? '');
        $estado = $_GET['estado'] ?? 'activo'; // activo | retirado | todos
        $where = '1=1';
        $params = [];
        if ($estado !== 'todos') { $where .= ' AND Estado = ?'; $params[] = $estado; }
        if ($q !== '') {
            $where .= ' AND (Nombre LIKE ? OR Identificacion LIKE ? OR Cargo LIKE ?)';
            $like = "%$q%"; $params[] = $like; $params[] = $like; $params[] = $like;
        }
        $stmt = $db->prepare("
            SELECT e.*,
                COALESCE((SELECT Saldo_Acum FROM tbl_mov_empleado
                          WHERE Id_Empleado = e.Id_Empleado AND Estado = 'activo'
                          ORDER BY Id_Mov DESC LIMIT 1), 0) AS saldo_actual
            FROM tbl_empleados e
            WHERE $where
            ORDER BY e.Nombre
        ");
        $stmt->execute($params);
        $empleados = $stmt->fetchAll();
        echo json_encode(['success' => true, 'empleados' => $empleados]);
        exit;
    }

    if ($_SERVER['REQUEST_METHOD'] === 'POST') {
        $data = json_decode(file_get_contents('php://input'), true);
        $action = $data['action'] ?? '';

        if ($action === 'crear') {
            $nombre = trim($data['nombre'] ?? '');
            if ($nombre === '') { echo json_encode(['success' => false, 'message' => 'El nombre es obligatorio']); exit; }
            $stmt = $db->prepare("
                INSERT INTO tbl_empleados
                    (Nombre, Identificacion, Cargo, Salario, Tipo_Pago,
                     Fecha_Ingreso, Telefono, Direccion, Email, Observacion, Estado)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'activo')
            ");
            $stmt->execute([
                $nombre,
                trim($data['identificacion'] ?? ''),
                trim($data['cargo'] ?? ''),
                floatval($data['salario'] ?? 0),
                $data['tipo_pago'] ?? 'quincenal',
                !empty($data['fecha_ingreso']) ? $data['fecha_ingreso'] : null,
                trim($data['telefono'] ?? ''),
                trim($data['direccion'] ?? ''),
                trim($data['email'] ?? ''),
                trim($data['observacion'] ?? ''),
            ]);
            echo json_encode(['success' => true, 'id' => $db->lastInsertId(), 'message' => 'Empleado creado']);
            exit;
        }

        if ($action === 'actualizar') {
            $id = intval($data['id'] ?? 0);
            if (!$id) { echo json_encode(['success' => false, 'message' => 'Falta id']); exit; }
            $stmt = $db->prepare("
                UPDATE tbl_empleados SET
                    Nombre = ?, Identificacion = ?, Cargo = ?, Salario = ?, Tipo_Pago = ?,
                    Fecha_Ingreso = ?, Telefono = ?, Direccion = ?, Email = ?, Observacion = ?
                WHERE Id_Empleado = ?
            ");
            $stmt->execute([
                trim($data['nombre'] ?? ''),
                trim($data['identificacion'] ?? ''),
                trim($data['cargo'] ?? ''),
                floatval($data['salario'] ?? 0),
                $data['tipo_pago'] ?? 'quincenal',
                !empty($data['fecha_ingreso']) ? $data['fecha_ingreso'] : null,
                trim($data['telefono'] ?? ''),
                trim($data['direccion'] ?? ''),
                trim($data['email'] ?? ''),
                trim($data['observacion'] ?? ''),
                $id,
            ]);
            echo json_encode(['success' => true, 'message' => 'Empleado actualizado']);
            exit;
        }

        if ($action === 'retirar') {
            $id = intval($data['id'] ?? 0);
            if (!$id) { echo json_encode(['success' => false, 'message' => 'Falta id']); exit; }
            // Verificar que no tenga saldo pendiente
            $stmt = $db->prepare("SELECT COALESCE(Saldo_Acum, 0) FROM tbl_mov_empleado
                                  WHERE Id_Empleado = ? AND Estado = 'activo'
                                  ORDER BY Id_Mov DESC LIMIT 1");
            $stmt->execute([$id]);
            $saldo = floatval($stmt->fetchColumn());
            if ($saldo > 0) {
                echo json_encode(['success' => false, 'message' => "No se puede retirar: tiene saldo pendiente de \$$saldo"]);
                exit;
            }
            $stmt = $db->prepare("UPDATE tbl_empleados SET Estado='retirado', Fecha_Retiro=CURDATE() WHERE Id_Empleado=?");
            $stmt->execute([$id]);
            echo json_encode(['success' => true, 'message' => 'Empleado retirado']);
            exit;
        }

        if ($action === 'reactivar') {
            $id = intval($data['id'] ?? 0);
            if (!$id) { echo json_encode(['success' => false, 'message' => 'Falta id']); exit; }
            $stmt = $db->prepare("UPDATE tbl_empleados SET Estado='activo', Fecha_Retiro=NULL WHERE Id_Empleado=?");
            $stmt->execute([$id]);
            echo json_encode(['success' => true, 'message' => 'Empleado reactivado']);
            exit;
        }

        echo json_encode(['success' => false, 'message' => 'Acción no reconocida']);
        exit;
    }

    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Método no permitido']);
} catch (Throwable $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => $e->getMessage()]);
}
