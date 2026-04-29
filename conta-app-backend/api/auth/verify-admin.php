<?php
/**
 * Verifica credenciales de un usuario administrador para autorizar acciones sensibles
 * (devoluciones, anulaciones, override de cupo, etc.) sin cambiar la sesión actual.
 *
 * POST { username, password (ya codificada en cliente) }
 *   → { success: true, admin: { id, username, nombre } }   si OK
 *   → { success: false, message: "..." }                    si falla
 */
require_once '../config/database.php';
$db = (new Database())->getConnection();

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Método no permitido']);
    exit;
}

try {
    $data = json_decode(file_get_contents('php://input'), true);
    $username = trim($data['username'] ?? '');
    $passwordCodificada = $data['password'] ?? '';

    if (!$username || !$passwordCodificada) {
        echo json_encode(['success' => false, 'message' => 'Usuario y contraseña requeridos']);
        exit;
    }

    $stmt = $db->prepare("
        SELECT Id_Usuario, Usuario, Nombre, contrasena, Id_TiposUsuario
        FROM tblusuarios
        WHERE Usuario = :usuario
    ");
    $stmt->execute([':usuario' => $username]);
    $u = $stmt->fetch();

    if (!$u) {
        echo json_encode(['success' => false, 'message' => 'Usuario no encontrado']);
        exit;
    }

    if ($u['contrasena'] !== $passwordCodificada) {
        echo json_encode(['success' => false, 'message' => 'Contraseña incorrecta']);
        exit;
    }

    // Solo admin puede autorizar (Id_TiposUsuario = 1)
    if (intval($u['Id_TiposUsuario']) !== 1) {
        echo json_encode(['success' => false, 'message' => 'El usuario no tiene permisos de administrador']);
        exit;
    }

    echo json_encode([
        'success' => true,
        'admin' => [
            'id' => intval($u['Id_Usuario']),
            'username' => $u['Usuario'],
            'nombre' => $u['Nombre'],
        ],
        'message' => 'Autorizado por ' . $u['Nombre'],
    ], JSON_UNESCAPED_UNICODE);
} catch (Exception $e) {
    echo json_encode(['success' => false, 'message' => $e->getMessage()]);
}
