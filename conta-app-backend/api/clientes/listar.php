<?php
/**
 * CRUD Clientes
 * GET           → listar todos los clientes
 * GET ?id=X     → un cliente por ID
 * POST          → crear cliente
 * PUT           → actualizar cliente
 * DELETE ?id=X  → eliminar cliente
 */

require_once '../config/database.php';

$database = new Database();
$db = $database->getConnection();
$method = $_SERVER['REQUEST_METHOD'];

try {
    switch ($method) {
        case 'GET':
            $id = $_GET['id'] ?? null;

            if ($id) {
                $stmt = $db->prepare("SELECT * FROM tblclientes WHERE CodigoClien = :id");
                $stmt->execute([':id' => $id]);
                $cliente = $stmt->fetch();
                if (!$cliente) {
                    http_response_code(404);
                    echo json_encode(["success" => false, "message" => "Cliente no encontrado"]);
                    exit;
                }
                echo json_encode(["success" => true, "cliente" => $cliente], JSON_UNESCAPED_UNICODE);
            } else {
                // Stats: total ventas y saldo por cliente
                $stmt = $db->query("
                    SELECT c.CodigoClien, c.Razon_Social, c.Nit, c.Identificacion,
                           c.Telefonos, c.Direccion, c.Email, c.Whatsapp,
                           c.CupoAutorizado, c.Fecha_Ingreso, c.FechaCumple,
                           c.Nombres, c.Apellidos, c.Direcion_R,
                           c.Nombre_C, c.Apellidos_C, c.Telefonos_C, c.Direccion_C, c.Cargo_C,
                           c.Termino, c.FacVenc, c.Preciocosto,
                           c.id_documento, c.id_municipio, c.id_type_liability, c.id_type_organization, c.id_type_regime,
                           COALESCE(v.Total_Ventas, 0) as Total_Ventas,
                           COALESCE(v.Monto_Ventas, 0) as Monto_Ventas,
                           COALESCE(v.Ultima_Compra, '') as Ultima_Compra
                    FROM tblclientes c
                    LEFT JOIN (
                        SELECT CodigoCli,
                               COUNT(*) as Total_Ventas,
                               SUM(Total) as Monto_Ventas,
                               MAX(Fecha) as Ultima_Compra
                        FROM tblventas
                        GROUP BY CodigoCli
                    ) v ON c.CodigoClien = v.CodigoCli
                    ORDER BY c.Razon_Social
                ");
                $clientes = $stmt->fetchAll();

                foreach ($clientes as &$c) {
                    $c['CupoAutorizado'] = floatval($c['CupoAutorizado']);
                    $c['Total_Ventas'] = intval($c['Total_Ventas']);
                    $c['Monto_Ventas'] = floatval($c['Monto_Ventas']);
                }

                // Resumen
                $totalClientes = count($clientes);
                $conVentas = count(array_filter($clientes, fn($c) => $c['Total_Ventas'] > 0));
                $montoTotal = array_sum(array_column($clientes, 'Monto_Ventas'));

                echo json_encode([
                    "success" => true,
                    "clientes" => $clientes,
                    "total" => $totalClientes,
                    "resumen" => [
                        "total" => $totalClientes,
                        "con_ventas" => $conVentas,
                        "sin_ventas" => $totalClientes - $conVentas,
                        "monto_total" => $montoTotal
                    ]
                ], JSON_UNESCAPED_UNICODE);
            }
            break;

        case 'POST':
            $data = json_decode(file_get_contents("php://input"));
            if (empty($data->Razon_Social)) {
                http_response_code(400);
                echo json_encode(["success" => false, "message" => "Razón social es requerida"]);
                exit;
            }

            // Next ID
            $stmt = $db->query("SELECT COALESCE(MAX(CodigoClien), 130500) + 1 as next_id FROM tblclientes");
            $nextId = $stmt->fetch()['next_id'];

            $stmt = $db->prepare("
                INSERT INTO tblclientes (CodigoClien, Razon_Social, Nit, Identificacion, Telefonos, Direccion,
                    Email, Whatsapp, CupoAutorizado, Fecha_Ingreso, FechaCumple,
                    Nombres, Apellidos, Direcion_R, Nombre_C, Apellidos_C, Telefonos_C, Direccion_C, Cargo_C,
                    Termino, FacVenc, Preciocosto, id_documento, id_municipio, id_type_liability, id_type_organization, id_type_regime)
                VALUES (:id, :razon, :nit, :ident, :tel, :dir, :email, :whats, :cupo, NOW(), :cumple,
                    :nombres, :apellidos, :dir_r, :nom_c, :ape_c, :tel_c, :dir_c, :cargo_c,
                    :termino, :facvenc, :preciocosto, :id_doc, :id_mun, :id_liab, :id_org, :id_reg)
            ");
            $stmt->execute([
                ':id' => $nextId,
                ':razon' => trim($data->Razon_Social),
                ':nit' => $data->Nit ?? '',
                ':ident' => !empty($data->Identificacion) ? intval(preg_replace('/[^0-9]/', '', $data->Identificacion)) : 0,
                ':tel' => $data->Telefonos ?? '',
                ':dir' => $data->Direccion ?? '',
                ':email' => $data->Email ?? '',
                ':whats' => $data->Whatsapp ?? '',
                ':cupo' => floatval($data->CupoAutorizado ?? 0),
                ':cumple' => !empty($data->FechaCumple) && $data->FechaCumple !== '' ? $data->FechaCumple : '0000-00-00',
                ':nombres' => $data->Nombres ?? '',
                ':apellidos' => $data->Apellidos ?? '',
                ':dir_r' => $data->Direcion_R ?? '',
                ':nom_c' => $data->Nombre_C ?? '',
                ':ape_c' => $data->Apellidos_C ?? '',
                ':tel_c' => $data->Telefonos_C ?? '',
                ':dir_c' => $data->Direccion_C ?? '',
                ':cargo_c' => $data->Cargo_C ?? '',
                ':termino' => $data->Termino ?? 0,
                ':facvenc' => $data->FacVenc ?? 0,
                ':preciocosto' => $data->Preciocosto ?? 0,
                ':id_doc' => $data->id_documento ?? 2,
                ':id_mun' => $data->id_municipio ?? null,
                ':id_liab' => $data->id_type_liability ?? null,
                ':id_org' => $data->id_type_organization ?? null,
                ':id_reg' => $data->id_type_regime ?? null,
            ]);

            echo json_encode([
                "success" => true,
                "message" => "Cliente creado",
                "CodigoClien" => $nextId
            ], JSON_UNESCAPED_UNICODE);
            break;

        case 'PUT':
            $data = json_decode(file_get_contents("php://input"));
            if (empty($data->CodigoClien)) {
                http_response_code(400);
                echo json_encode(["success" => false, "message" => "ID requerido"]);
                exit;
            }
            if (intval($data->CodigoClien) === 130500) {
                http_response_code(403);
                echo json_encode(["success" => false, "message" => "El cliente genérico VENTAS AL CONTADO es del sistema y no puede modificarse."]);
                exit;
            }

            $stmt = $db->prepare("
                UPDATE tblclientes SET
                    Razon_Social = :razon, Nit = :nit, Identificacion = :ident,
                    Telefonos = :tel, Direccion = :dir, Email = :email, Whatsapp = :whats,
                    CupoAutorizado = :cupo, FechaCumple = :cumple,
                    Nombres = :nombres, Apellidos = :apellidos, Direcion_R = :dir_r,
                    Nombre_C = :nom_c, Apellidos_C = :ape_c, Telefonos_C = :tel_c,
                    Direccion_C = :dir_c, Cargo_C = :cargo_c,
                    Termino = :termino, FacVenc = :facvenc, Preciocosto = :preciocosto,
                    id_documento = :id_doc, id_municipio = :id_mun,
                    id_type_liability = :id_liab, id_type_organization = :id_org, id_type_regime = :id_reg,
                    FechaMod = NOW()
                WHERE CodigoClien = :id
            ");
            $stmt->execute([
                ':id' => $data->CodigoClien,
                ':razon' => trim($data->Razon_Social ?? ''),
                ':nit' => $data->Nit ?? '',
                ':ident' => !empty($data->Identificacion) ? intval(preg_replace('/[^0-9]/', '', $data->Identificacion)) : 0,
                ':tel' => $data->Telefonos ?? '',
                ':dir' => $data->Direccion ?? '',
                ':email' => $data->Email ?? '',
                ':whats' => $data->Whatsapp ?? '',
                ':cupo' => floatval($data->CupoAutorizado ?? 0),
                ':cumple' => !empty($data->FechaCumple) && $data->FechaCumple !== '' ? $data->FechaCumple : '0000-00-00',
                ':nombres' => $data->Nombres ?? '',
                ':apellidos' => $data->Apellidos ?? '',
                ':dir_r' => $data->Direcion_R ?? '',
                ':nom_c' => $data->Nombre_C ?? '',
                ':ape_c' => $data->Apellidos_C ?? '',
                ':tel_c' => $data->Telefonos_C ?? '',
                ':dir_c' => $data->Direccion_C ?? '',
                ':cargo_c' => $data->Cargo_C ?? '',
                ':termino' => $data->Termino ?? 0,
                ':facvenc' => $data->FacVenc ?? 0,
                ':preciocosto' => $data->Preciocosto ?? 0,
                ':id_doc' => $data->id_documento ?? 2,
                ':id_mun' => $data->id_municipio ?? null,
                ':id_liab' => $data->id_type_liability ?? null,
                ':id_org' => $data->id_type_organization ?? null,
                ':id_reg' => $data->id_type_regime ?? null,
            ]);

            echo json_encode(["success" => true, "message" => "Cliente actualizado"], JSON_UNESCAPED_UNICODE);
            break;

        case 'DELETE':
            $id = $_GET['id'] ?? null;
            if (!$id) {
                http_response_code(400);
                echo json_encode(["success" => false, "message" => "ID requerido"]);
                exit;
            }
            if (intval($id) === 130500) {
                http_response_code(403);
                echo json_encode(["success" => false, "message" => "El cliente genérico VENTAS AL CONTADO es del sistema y no puede eliminarse."]);
                exit;
            }
            // Check if has invoices
            $stmt = $db->prepare("SELECT COUNT(*) as total FROM tblventas WHERE CodigoCli = :id");
            $stmt->execute([':id' => $id]);
            $count = $stmt->fetch()['total'];
            if ($count > 0) {
                http_response_code(409);
                echo json_encode([
                    "success" => false,
                    "message" => "No se puede eliminar: tiene $count facturas asociadas"
                ], JSON_UNESCAPED_UNICODE);
                exit;
            }
            $stmt = $db->prepare("DELETE FROM tblclientes WHERE CodigoClien = :id");
            $stmt->execute([':id' => $id]);
            echo json_encode(["success" => true, "message" => "Cliente eliminado"], JSON_UNESCAPED_UNICODE);
            break;

        default:
            http_response_code(405);
            echo json_encode(["success" => false, "message" => "Método no permitido"]);
    }
} catch(Exception $e) {
    http_response_code(500);
    echo json_encode(["success" => false, "message" => $e->getMessage()]);
}
?>
