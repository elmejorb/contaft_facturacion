<?php
/**
 * CRUD de Vendedores Móviles (locales)
 * GET              → lista
 * GET ?id=N        → detalle
 * POST action=crear|editar|sincronizar|toggle_activo
 */
require_once '../config/database.php';
$database = new Database();
$db = $database->getConnection();

try {
    if ($_SERVER['REQUEST_METHOD'] === 'GET') {
        $id = intval($_GET['id'] ?? 0);
        $accion = trim($_GET['action'] ?? '');

        // Lista empleados de tblempleados que aún NO están habilitados como
        // vendedor móvil. Se usa desde la UI para "Habilitar empleado existente"
        // en vez de crearlos desde cero.
        if ($accion === 'empleados_disponibles') {
            $stmt = $db->query("
                SELECT e.CodigoEmp,
                       TRIM(CONCAT(COALESCE(e.Nombres,''), ' ', COALESCE(e.Apellidos,''))) AS nombre_completo,
                       e.Nombres, e.Apellidos, e.Cedula, e.Telefono, e.Cargo
                FROM tblempleados e
                WHERE e.CodigoEmp > 0
                  AND e.CodigoEmp NOT IN (
                      SELECT id_remoto FROM tbl_vendedores_movil WHERE id_remoto IS NOT NULL
                  )
                ORDER BY e.Nombres, e.Apellidos
            ");
            echo json_encode(['success' => true, 'empleados' => $stmt->fetchAll()], JSON_UNESCAPED_UNICODE);
            exit;
        }

        if ($id > 0) {
            $stmt = $db->prepare("SELECT * FROM tbl_vendedores_movil WHERE id = ?");
            $stmt->execute([$id]);
            $vendedor = $stmt->fetch();
            echo json_encode(['success' => true, 'vendedor' => $vendedor], JSON_UNESCAPED_UNICODE);
        } else {
            // Enriquecer con el nombre del empleado del que vino (id_remoto)
            $stmt = $db->query("
                SELECT v.*,
                       e.Cargo AS cargo_empleado,
                       TRIM(CONCAT(COALESCE(e.Nombres,''), ' ', COALESCE(e.Apellidos,''))) AS nombre_empleado_original
                FROM tbl_vendedores_movil v
                LEFT JOIN tblempleados e ON e.CodigoEmp = v.id_remoto
                ORDER BY v.codigo
            ");
            echo json_encode(['success' => true, 'vendedores' => $stmt->fetchAll()], JSON_UNESCAPED_UNICODE);
        }
        exit;
    }

    if ($_SERVER['REQUEST_METHOD'] === 'POST') {
        $data = json_decode(file_get_contents('php://input'), true);
        $action = $data['action'] ?? '';

        if ($action === 'crear') {
            $codigo = trim($data['codigo'] ?? '');
            $nombre = trim($data['nombre'] ?? '');
            $email = trim($data['email'] ?? '');
            $password = $data['password'] ?? '';

            if (!$codigo || !$nombre || !$email || !$password) {
                echo json_encode(['success' => false, 'message' => 'Código, nombre, email y contraseña son obligatorios'], JSON_UNESCAPED_UNICODE);
                exit;
            }

            // Verificar unicidad
            $stmt = $db->prepare("SELECT id FROM tbl_vendedores_movil WHERE codigo = ? OR email = ?");
            $stmt->execute([$codigo, $email]);
            if ($stmt->fetch()) {
                echo json_encode(['success' => false, 'message' => 'Ya existe un vendedor con ese código o email'], JSON_UNESCAPED_UNICODE);
                exit;
            }

            // id_remoto = CodigoEmp del empleado en tblempleados. Se envía cuando
            // el vendedor se crea a partir de un empleado existente, y se usa
            // como ancla para vincular ventas/movimientos con el empleado real.
            $codigoEmp = intval($data['codigo_emp'] ?? 0);
            $hash = password_hash($password, PASSWORD_BCRYPT);
            $stmt = $db->prepare("
                INSERT INTO tbl_vendedores_movil
                (id_remoto, codigo, nombre, email, password_hash, telefono, cedula, zona, can_edit_clients, activo, sincronizado, fecha_mod)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, NOW())
            ");
            $stmt->execute([
                $codigoEmp > 0 ? $codigoEmp : null,
                $codigo, $nombre, $email, $hash,
                $data['telefono'] ?? null,
                $data['cedula'] ?? null,
                $data['zona'] ?? null,
                intval($data['can_edit_clients'] ?? 1),
                intval($data['activo'] ?? 1),
            ]);

            echo json_encode(['success' => true, 'message' => 'Vendedor creado', 'id' => $db->lastInsertId()], JSON_UNESCAPED_UNICODE);
            exit;
        }

        if ($action === 'editar') {
            $id = intval($data['id'] ?? 0);
            if (!$id) {
                echo json_encode(['success' => false, 'message' => 'ID requerido'], JSON_UNESCAPED_UNICODE);
                exit;
            }

            $stmt = $db->prepare("
                UPDATE tbl_vendedores_movil SET
                    codigo = ?, nombre = ?, email = ?, telefono = ?, cedula = ?, zona = ?,
                    can_edit_clients = ?, activo = ?,
                    sincronizado = 0,
                    fecha_mod = NOW()
                WHERE id = ?
            ");
            $stmt->execute([
                $data['codigo'] ?? '',
                $data['nombre'] ?? '',
                $data['email'] ?? '',
                $data['telefono'] ?? null,
                $data['cedula'] ?? null,
                $data['zona'] ?? null,
                intval($data['can_edit_clients'] ?? 1),
                intval($data['activo'] ?? 1),
                $id,
            ]);

            // Si cambió contraseña
            if (!empty($data['password'])) {
                $hash = password_hash($data['password'], PASSWORD_BCRYPT);
                $db->prepare("UPDATE tbl_vendedores_movil SET password_hash = ?, sincronizado = 0 WHERE id = ?")
                   ->execute([$hash, $id]);
            }

            echo json_encode(['success' => true, 'message' => 'Vendedor actualizado'], JSON_UNESCAPED_UNICODE);
            exit;
        }

        if ($action === 'sincronizar') {
            // Leer config para URL y credenciales
            $config = $db->query("SELECT * FROM tbl_config_vendedores WHERE id = 1")->fetch();
            if (!$config || !$config['habilitado']) {
                echo json_encode(['success' => false, 'message' => 'Módulo no habilitado'], JSON_UNESCAPED_UNICODE);
                exit;
            }

            $apiUrl = rtrim($config['api_url'] ?? '', '/');
            $email = $config['api_email'] ?? '';
            $token = $config['api_token_empresa'] ?? '';

            if (!$apiUrl || !$email || !$token) {
                echo json_encode(['success' => false, 'message' => 'Faltan credenciales de API'], JSON_UNESCAPED_UNICODE);
                exit;
            }

            // Obtener vendedores pendientes
            $stmt = $db->query("SELECT * FROM tbl_vendedores_movil WHERE sincronizado = 0");
            $pendientes = $stmt->fetchAll();

            if (empty($pendientes)) {
                echo json_encode(['success' => true, 'message' => 'No hay vendedores pendientes de sincronizar', 'sincronizados' => 0], JSON_UNESCAPED_UNICODE);
                exit;
            }

            $registros = [];
            foreach ($pendientes as $v) {
                $registros[] = [
                    'id_vendedor_conta' => (int) $v['id'],
                    'codigo' => $v['codigo'],
                    'nombre' => $v['nombre'],
                    'email_vendedor' => $v['email'],
                    'password_hash' => $v['password_hash'],
                    'telefono' => $v['telefono'],
                    'cedula' => $v['cedula'],
                    'zona' => $v['zona'],
                    'can_edit_clients' => (bool) $v['can_edit_clients'],
                    'activo' => (bool) $v['activo'],
                ];
            }

            $payload = json_encode([
                'email' => $email,
                'token_api' => $token,
                'registros' => $registros,
            ]);

            $ch = curl_init($apiUrl . '/sync/vendedores/batch');
            curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
            curl_setopt($ch, CURLOPT_POST, true);
            curl_setopt($ch, CURLOPT_POSTFIELDS, $payload);
            curl_setopt($ch, CURLOPT_HTTPHEADER, ['Content-Type: application/json']);
            curl_setopt($ch, CURLOPT_TIMEOUT, 30);
            // XAMPP/Apache Windows a menudo no tiene curl.cainfo — sin esto,
            // cualquier llamada HTTPS al Lumen falla con HTTP 0.
            curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
            curl_setopt($ch, CURLOPT_SSL_VERIFYHOST, 0);
            $resp = curl_exec($ch);
            $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
            curl_close($ch);

            if ($httpCode !== 200 || !$resp) {
                echo json_encode(['success' => false, 'message' => 'Error sincronizando con la API remota (HTTP ' . $httpCode . ')'], JSON_UNESCAPED_UNICODE);
                exit;
            }

            $result = json_decode($resp, true);
            if (!empty($result['error'])) {
                echo json_encode(['success' => false, 'message' => $result['mensaje'] ?? 'Error en API remota'], JSON_UNESCAPED_UNICODE);
                exit;
            }

            // Marcar como sincronizados
            $ids = array_column($pendientes, 'id');
            $placeholders = implode(',', array_fill(0, count($ids), '?'));
            $db->prepare("UPDATE tbl_vendedores_movil SET sincronizado = 1 WHERE id IN ($placeholders)")
               ->execute($ids);

            echo json_encode([
                'success' => true,
                'message' => ($result['total_procesados'] ?? count($pendientes)) . ' vendedores sincronizados',
                'sincronizados' => $result['total_procesados'] ?? count($pendientes),
                'insertados' => $result['insertados'] ?? 0,
                'actualizados' => $result['actualizados'] ?? 0,
            ], JSON_UNESCAPED_UNICODE);
            exit;
        }

        if ($action === 'toggle_activo') {
            $id = intval($data['id'] ?? 0);
            $stmt = $db->prepare("UPDATE tbl_vendedores_movil SET activo = NOT activo, sincronizado = 0 WHERE id = ?");
            $stmt->execute([$id]);
            echo json_encode(['success' => true, 'message' => 'Estado actualizado'], JSON_UNESCAPED_UNICODE);
            exit;
        }
    }
} catch (Exception $e) {
    echo json_encode(['success' => false, 'message' => $e->getMessage()], JSON_UNESCAPED_UNICODE);
}
