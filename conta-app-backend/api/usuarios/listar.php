<?php
require_once '../config/database.php';
$database = new Database();
$db = $database->getConnection();

try {
    if ($_SERVER['REQUEST_METHOD'] === 'GET') {
        $action = $_GET['action'] ?? 'list';

        if ($action === 'tipos') {
            $stmt = $db->query("SELECT * FROM tbltiposusuario ORDER BY Id_TiposUsuario");
            echo json_encode(['success' => true, 'tipos' => $stmt->fetchAll()], JSON_UNESCAPED_UNICODE);
            exit;
        }

        $stmt = $db->query("
            SELECT u.Id_Usuario, u.Usuario, u.Nombre, u.Indentificacion, u.Id_TiposUsuario, u.Id_Caja,
                   t.Nombre_TipoUsuario, c.Nombre AS NombreCaja
            FROM tblusuarios u
            LEFT JOIN tbltiposusuario t ON u.Id_TiposUsuario = t.Id_TiposUsuario
            LEFT JOIN tblcajas c ON u.Id_Caja = c.Id_Caja
            ORDER BY u.Id_Usuario
        ");
        $usuarios = $stmt->fetchAll();

        $tipos = $db->query("SELECT * FROM tbltiposusuario ORDER BY Id_TiposUsuario")->fetchAll();
        $cajas = $db->query("SELECT Id_Caja, Nombre FROM tblcajas WHERE Activa = 1 ORDER BY Id_Caja")->fetchAll();

        echo json_encode(['success' => true, 'usuarios' => $usuarios, 'tipos' => $tipos, 'cajas' => $cajas], JSON_UNESCAPED_UNICODE);

    } elseif ($_SERVER['REQUEST_METHOD'] === 'POST') {
        $data = json_decode(file_get_contents('php://input'), true);
        $action = $data['action'] ?? 'create';

        if ($action === 'create') {
            // Encode password with VB6 compatible encoding
            $pass = $data['contrasena'] ?? '';
            $encoded = '';
            for ($i = 0; $i < strlen($pass); $i++) {
                $encoded .= str_pad(decbin(ord($pass[$i])), 7, '0', STR_PAD_LEFT);
            }

            $stmt = $db->prepare("INSERT INTO tblusuarios (Usuario, Nombre, Indentificacion, contrasena, Id_TiposUsuario, Id_Caja) VALUES (?, ?, ?, ?, ?, ?)");
            $stmt->execute([
                $data['Usuario'], $data['Nombre'],
                intval($data['Indentificacion'] ?? 0),
                $encoded, intval($data['Id_TiposUsuario'] ?? 2),
                !empty($data['Id_Caja']) ? intval($data['Id_Caja']) : null,
            ]);
            echo json_encode(['success' => true, 'message' => 'Usuario creado', 'id' => $db->lastInsertId()]);

        } elseif ($action === 'update') {
            $id = intval($data['Id_Usuario']);
            $stmt = $db->prepare("UPDATE tblusuarios SET Usuario = ?, Nombre = ?, Indentificacion = ?, Id_TiposUsuario = ?, Id_Caja = ? WHERE Id_Usuario = ?");
            $stmt->execute([
                $data['Usuario'], $data['Nombre'],
                intval($data['Indentificacion'] ?? 0),
                intval($data['Id_TiposUsuario'] ?? 2),
                !empty($data['Id_Caja']) ? intval($data['Id_Caja']) : null,
                $id
            ]);
            echo json_encode(['success' => true, 'message' => 'Usuario actualizado']);

        } elseif ($action === 'cambiar-pass') {
            $id = intval($data['Id_Usuario']);
            $pass = $data['contrasena'] ?? '';
            $encoded = '';
            for ($i = 0; $i < strlen($pass); $i++) {
                $encoded .= str_pad(decbin(ord($pass[$i])), 7, '0', STR_PAD_LEFT);
            }
            $db->prepare("UPDATE tblusuarios SET contrasena = ? WHERE Id_Usuario = ?")->execute([$encoded, $id]);
            echo json_encode(['success' => true, 'message' => 'Contraseña actualizada']);

        } elseif ($action === 'delete') {
            $id = intval($data['Id_Usuario']);
            if ($id === 1) { echo json_encode(['success' => false, 'message' => 'No se puede eliminar el usuario root']); exit; }
            $db->prepare("DELETE FROM tblusuarios WHERE Id_Usuario = ?")->execute([$id]);
            echo json_encode(['success' => true, 'message' => 'Usuario eliminado']);
        }
    }
} catch (Exception $e) {
    echo json_encode(['success' => false, 'message' => $e->getMessage()]);
}
?>
