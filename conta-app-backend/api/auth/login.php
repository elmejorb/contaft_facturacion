<?php
/**
 * Endpoint de autenticación
 * Valida usuarios contra la tabla tblusuarios usando codificación VB6
 */

require_once '../config/database.php';
require_once '../utils/passwordEncoder.php';

// Crear conexión a la base de datos
$database = new Database();
$db = $database->getConnection();

// Obtener datos del POST
$data = json_decode(file_get_contents("php://input"));

if (empty($data->username)) {
    http_response_code(400);
    echo json_encode([
        "success" => false,
        "message" => "Usuario es requerido"
    ]);
    exit();
}

if (!isset($data->password)) {
    http_response_code(400);
    echo json_encode([
        "success" => false,
        "message" => "Contraseña es requerida"
    ]);
    exit();
}

try {
    $username = $data->username;
    $passwordCodificada = $data->password;

    // Buscar el usuario en la tabla tblusuarios
    $query = "SELECT
                Id_Usuario,
                Usuario,
                contrasena,
                Id_TiposUsuario,
                Nombre
              FROM tblusuarios
              WHERE Usuario = :usuario";

    $stmt = $db->prepare($query);
    $stmt->bindParam(':usuario', $username);
    $stmt->execute();

    if ($stmt->rowCount() > 0) {
        $usuario = $stmt->fetch(PDO::FETCH_ASSOC);

        // Comparar la contraseña codificada
        if ($usuario['contrasena'] === $passwordCodificada) {
            // Generar token simple (en producción usa JWT)
            $token = bin2hex(random_bytes(32));

            // Determinar el rol del usuario
            $rol = "Usuario";
            switch ($usuario['Id_TiposUsuario']) {
                case 1:
                    $rol = "Administrador";
                    break;
                case 2:
                    $rol = "Vendedor";
                    break;
                case 3:
                    $rol = "Supervisor";
                    break;
            }

            // Get permisos del tipo de usuario
            $stmtPermisos = $db->prepare("SELECT permisos FROM tbltiposusuario WHERE Id_TiposUsuario = ?");
            $stmtPermisos->execute([$usuario['Id_TiposUsuario']]);
            $tipoData = $stmtPermisos->fetch();
            $permisos = $tipoData && $tipoData['permisos'] ? json_decode($tipoData['permisos'], true) : null;

            // Admin tiene todo por defecto
            if (!$permisos && $usuario['Id_TiposUsuario'] == 1) {
                $permisos = ['dashboard_completo','inventario','inventario_editar','inventario_diagnostico','inventario_conteo','categorias','clientes','clientes_editar','clientes_pagos','clientes_cartera','clientes_top','proveedores','proveedores_pagar','ventas','ventas_listado','ventas_tipo_pago','facturacion_electronica','compras','caja','caja_historial','pagos_listado','gastos','bancos','configuracion','usuarios','datos_empresa'];
            } elseif (!$permisos) {
                $permisos = ['ventas','ventas_listado','clientes','caja'];
            }

            http_response_code(200);
            echo json_encode([
                "success" => true,
                "token" => $token,
                "user" => [
                    "id" => $usuario['Id_Usuario'],
                    "username" => $usuario['Usuario'],
                    "nombre" => $usuario['Nombre'],
                    "role" => $rol,
                    "tipoUsuario" => $usuario['Id_TiposUsuario'],
                    "permisos" => $permisos
                ]
            ]);
        } else {
            http_response_code(401);
            echo json_encode([
                "success" => false,
                "message" => "Usuario o contraseña incorrectos"
            ]);
        }
    } else {
        http_response_code(401);
        echo json_encode([
            "success" => false,
            "message" => "Usuario o contraseña incorrectos"
        ]);
    }

} catch(Exception $e) {
    http_response_code(500);
    echo json_encode([
        "success" => false,
        "message" => "Error en el servidor: " . $e->getMessage()
    ]);
}
?>
