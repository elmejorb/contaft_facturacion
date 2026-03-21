<?php
/**
 * CRUD Conteo de Inventario
 * GET              → listar conteos (historial)
 * GET ?id=X        → detalle de un conteo
 * POST action=crear    → crear nuevo conteo
 * POST action=guardar  → guardar cantidades contadas
 * POST action=cerrar   → cerrar conteo y ajustar inventario+kardex
 * POST action=cancelar → cancelar conteo abierto
 */

require_once '../config/database.php';

$database = new Database();
$db = $database->getConnection();
$method = $_SERVER['REQUEST_METHOD'];

try {
    if ($method === 'GET') {
        $id = $_GET['id'] ?? null;

        if ($id) {
            // Detalle de un conteo
            $stmt = $db->prepare("SELECT * FROM tblconteo_inventario WHERE Id_Conteo = :id");
            $stmt->execute([':id' => $id]);
            $conteo = $stmt->fetch();

            if (!$conteo) {
                http_response_code(404);
                echo json_encode(["success" => false, "message" => "Conteo no encontrado"]);
                exit;
            }

            $fechaConteo = $conteo['Fecha'];

            // Detalle con datos del artículo + movimientos durante el conteo
            $stmt2 = $db->prepare("
                SELECT d.*, a.Codigo, a.Nombres_Articulo, a.Precio_Costo, a.Existencia AS Existencia_Actual,
                       COALESCE(c.Categoria, 'VARIOS') as Categoria
                FROM tblconteo_detalle d
                INNER JOIN tblarticulos a ON d.Items = a.Items
                LEFT JOIN tblcategoria c ON a.Id_Categoria = c.Id_Categoria
                WHERE d.Id_Conteo = :id
                ORDER BY a.Nombres_Articulo
            ");
            $stmt2->execute([':id' => $id]);
            $detalle = $stmt2->fetchAll();

            // Calculate sales/purchases during count period
            $stmtVentas = $db->prepare("
                SELECT COALESCE(SUM(dv.Cantidad), 0) as vendido
                FROM tbldetalle_venta dv
                INNER JOIN tblventas v ON dv.Factura_N = v.Factura_N
                WHERE dv.Items = :items AND v.Fecha >= :fecha
            ");

            foreach ($detalle as &$item) {
                $item['Existencia_Sistema'] = floatval($item['Existencia_Sistema']);
                $item['Existencia_Actual'] = floatval($item['Existencia_Actual']);
                $item['Existencia_Contada'] = $item['Existencia_Contada'] !== null ? floatval($item['Existencia_Contada']) : null;
                $item['Diferencia'] = $item['Diferencia'] !== null ? floatval($item['Diferencia']) : null;
                $item['Precio_Costo'] = floatval($item['Precio_Costo']);

                // Movimientos durante el conteo (ventas)
                if ($conteo['Estado'] === 'Abierto') {
                    $stmtVentas->execute([':items' => $item['Items'], ':fecha' => $fechaConteo]);
                    $mov = $stmtVentas->fetch();
                    $item['Vendido_Durante'] = floatval($mov['vendido']);
                } else {
                    $item['Vendido_Durante'] = 0;
                }

                // Diferencia real = contada - (sistema_snapshot - vendido_durante)
                // Es decir: lo que contaste vs lo que debería haber considerando las ventas
                if ($item['Existencia_Contada'] !== null) {
                    $esperado = $item['Existencia_Sistema'] - $item['Vendido_Durante'];
                    $item['Existencia_Esperada'] = $esperado;
                    $item['Diferencia_Real'] = $item['Existencia_Contada'] - $esperado;
                } else {
                    $item['Existencia_Esperada'] = null;
                    $item['Diferencia_Real'] = null;
                }
            }

            echo json_encode([
                "success" => true,
                "conteo" => $conteo,
                "detalle" => $detalle
            ], JSON_UNESCAPED_UNICODE);
        } else {
            // Listado de conteos
            $stmt = $db->query("
                SELECT * FROM tblconteo_inventario ORDER BY Fecha DESC
            ");
            $conteos = $stmt->fetchAll();

            echo json_encode([
                "success" => true,
                "conteos" => $conteos,
                "total" => count($conteos)
            ], JSON_UNESCAPED_UNICODE);
        }

    } elseif ($method === 'POST') {
        $data = json_decode(file_get_contents("php://input"));
        $action = $data->action ?? '';

        switch ($action) {
            case 'crear':
                $usuario = $data->usuario ?? 'admin';
                $observacion = $data->observacion ?? '';
                $tipo = $data->tipo ?? 'Total';
                $filtroCategoria = $data->filtro_categoria ?? null;
                $filtroProveedor = $data->filtro_proveedor ?? null;

                // Verificar que no haya conteo abierto
                $stmt = $db->query("SELECT Id_Conteo FROM tblconteo_inventario WHERE Estado = 'Abierto' LIMIT 1");
                $abierto = $stmt->fetch();
                if ($abierto) {
                    http_response_code(409);
                    echo json_encode([
                        "success" => false,
                        "message" => "Ya existe un conteo abierto (ID: {$abierto['Id_Conteo']}). Ciérrelo o cancélelo primero."
                    ], JSON_UNESCAPED_UNICODE);
                    exit;
                }

                $db->beginTransaction();

                // Crear cabecera
                $stmt = $db->prepare("
                    INSERT INTO tblconteo_inventario (Fecha, Usuario, Observacion, Tipo, Filtro_Categoria, Filtro_Proveedor, Estado)
                    VALUES (NOW(), :usuario, :obs, :tipo, :cat, :prov, 'Abierto')
                ");
                $stmt->execute([
                    ':usuario' => $usuario,
                    ':obs' => $observacion,
                    ':tipo' => $tipo,
                    ':cat' => $filtroCategoria,
                    ':prov' => $filtroProveedor
                ]);
                $idConteo = $db->lastInsertId();

                // Crear detalle con artículos activos
                $where = "a.Estado = 1";
                $params = [];
                if ($filtroCategoria) {
                    $where .= " AND a.Id_Categoria = :cat";
                    $params[':cat'] = $filtroCategoria;
                }
                if ($filtroProveedor) {
                    $where .= " AND a.CodigoPro = :prov";
                    $params[':prov'] = $filtroProveedor;
                }

                $stmt = $db->prepare("
                    INSERT INTO tblconteo_detalle (Id_Conteo, Items, Existencia_Sistema)
                    SELECT $idConteo, a.Items, a.Existencia
                    FROM tblarticulos a
                    WHERE $where
                ");
                $stmt->execute($params);
                $totalItems = $stmt->rowCount();

                // Actualizar total
                $stmt = $db->prepare("UPDATE tblconteo_inventario SET Total_Items = :total WHERE Id_Conteo = :id");
                $stmt->execute([':total' => $totalItems, ':id' => $idConteo]);

                $db->commit();

                echo json_encode([
                    "success" => true,
                    "message" => "Conteo creado con $totalItems artículos",
                    "Id_Conteo" => intval($idConteo),
                    "Total_Items" => $totalItems
                ], JSON_UNESCAPED_UNICODE);
                break;

            case 'guardar':
                $idConteo = $data->id_conteo ?? null;
                $items = $data->items ?? [];

                if (!$idConteo || empty($items)) {
                    http_response_code(400);
                    echo json_encode(["success" => false, "message" => "ID de conteo e items requeridos"]);
                    exit;
                }

                // Verify conteo is open
                $stmt = $db->prepare("SELECT Estado FROM tblconteo_inventario WHERE Id_Conteo = :id");
                $stmt->execute([':id' => $idConteo]);
                $conteo = $stmt->fetch();
                if (!$conteo || $conteo['Estado'] !== 'Abierto') {
                    http_response_code(409);
                    echo json_encode(["success" => false, "message" => "El conteo no está abierto"]);
                    exit;
                }

                $db->beginTransaction();

                $stmtUpdate = $db->prepare("
                    UPDATE tblconteo_detalle
                    SET Existencia_Contada = :contada,
                        Diferencia = :contada - Existencia_Sistema,
                        Observacion = :obs
                    WHERE Id_Conteo = :id_conteo AND Items = :items
                ");

                foreach ($items as $item) {
                    if ($item->contada !== null && $item->contada !== '') {
                        $stmtUpdate->execute([
                            ':contada' => floatval($item->contada),
                            ':obs' => $item->observacion ?? '',
                            ':id_conteo' => $idConteo,
                            ':items' => $item->items
                        ]);
                    }
                }

                // Update counters
                $stmt = $db->prepare("
                    UPDATE tblconteo_inventario SET
                        Items_Contados = (SELECT COUNT(*) FROM tblconteo_detalle WHERE Id_Conteo = :id AND Existencia_Contada IS NOT NULL),
                        Items_Con_Diferencia = (SELECT COUNT(*) FROM tblconteo_detalle WHERE Id_Conteo = :id2 AND Diferencia != 0 AND Diferencia IS NOT NULL)
                    WHERE Id_Conteo = :id3
                ");
                $stmt->execute([':id' => $idConteo, ':id2' => $idConteo, ':id3' => $idConteo]);

                $db->commit();

                echo json_encode(["success" => true, "message" => "Cantidades guardadas"], JSON_UNESCAPED_UNICODE);
                break;

            case 'cerrar':
                $idConteo = $data->id_conteo ?? null;
                if (!$idConteo) {
                    http_response_code(400);
                    echo json_encode(["success" => false, "message" => "ID de conteo requerido"]);
                    exit;
                }

                // Verify open
                $stmt = $db->prepare("SELECT * FROM tblconteo_inventario WHERE Id_Conteo = :id AND Estado = 'Abierto'");
                $stmt->execute([':id' => $idConteo]);
                $conteo = $stmt->fetch();
                if (!$conteo) {
                    http_response_code(409);
                    echo json_encode(["success" => false, "message" => "El conteo no está abierto"]);
                    exit;
                }

                $db->beginTransaction();

                $fechaConteo = $conteo['Fecha'];

                // Get items with counted values
                $stmt = $db->prepare("
                    SELECT d.Items, d.Existencia_Sistema, d.Existencia_Contada, d.Diferencia,
                           a.Precio_Costo
                    FROM tblconteo_detalle d
                    INNER JOIN tblarticulos a ON d.Items = a.Items
                    WHERE d.Id_Conteo = :id AND d.Existencia_Contada IS NOT NULL
                ");
                $stmt->execute([':id' => $idConteo]);
                $detalles = $stmt->fetchAll();

                // Query for sales during count period
                $stmtVentas = $db->prepare("
                    SELECT COALESCE(SUM(dv.Cantidad), 0) as vendido
                    FROM tbldetalle_venta dv
                    INNER JOIN tblventas v ON dv.Factura_N = v.Factura_N
                    WHERE dv.Items = :items AND v.Fecha >= :fecha
                ");

                $mesActual = date('F', strtotime('now'));
                $meses = [
                    'January'=>'Enero','February'=>'Febrero','March'=>'Marzo','April'=>'Abril',
                    'May'=>'Mayo','June'=>'Junio','July'=>'Julio','August'=>'Agosto',
                    'September'=>'Septiembre','October'=>'Octubre','November'=>'Noviembre','December'=>'Diciembre'
                ];
                $mes = $meses[$mesActual] ?? $mesActual;

                $stmtKardex = $db->prepare("
                    INSERT INTO tblkardex (Fecha, Mes, Items, Detalle, C_D, Cant_Ent, Cost_Ent, Cant_Sal, Cost_Sal, Cant_Saldo, Cost_Saldo, Cost_Unit)
                    VALUES (NOW(), :mes, :items, :detalle, :cd, :cant_ent, :cost_ent, :cant_sal, :cost_sal, :cant_saldo, :cost_saldo, :cost_unit)
                ");

                $stmtArticulo = $db->prepare("UPDATE tblarticulos SET Existencia = :exist WHERE Items = :items");

                // Update diferencia_real in detalle
                $stmtUpdateDiff = $db->prepare("
                    UPDATE tblconteo_detalle SET Diferencia = :diff, Observacion = :obs
                    WHERE Id_Conteo = :id_conteo AND Items = :items
                ");

                $ajustados = 0;
                foreach ($detalles as $d) {
                    $contada = floatval($d['Existencia_Contada']);
                    $sistemaSnapshot = floatval($d['Existencia_Sistema']);
                    $costo = floatval($d['Precio_Costo']);

                    // Compensación: ventas durante el conteo
                    $stmtVentas->execute([':items' => $d['Items'], ':fecha' => $fechaConteo]);
                    $mov = $stmtVentas->fetch();
                    $vendidoDurante = floatval($mov['vendido']);

                    // Diferencia real = contada - (snapshot - vendido)
                    $esperado = $sistemaSnapshot - $vendidoDurante;
                    $diffReal = $contada - $esperado;

                    // Update the real difference in the detail table
                    $obsText = $vendidoDurante > 0
                        ? "Vendido durante conteo: {$vendidoDurante}. Esperado: {$esperado}"
                        : "";
                    $stmtUpdateDiff->execute([
                        ':diff' => $diffReal,
                        ':obs' => $obsText,
                        ':id_conteo' => $idConteo,
                        ':items' => $d['Items']
                    ]);

                    if (round($diffReal, 2) == 0) continue;

                    $detalle = "AJUSTE INV - Conteo #{$idConteo} - Snapshot: {$sistemaSnapshot}";
                    if ($vendidoDurante > 0) {
                        $detalle .= " | Vendido: {$vendidoDurante} | Esperado: {$esperado}";
                    }
                    $detalle .= " → Contado: {$contada} | Dif.Real: {$diffReal}";

                    if ($diffReal > 0) {
                        // Sobrante
                        $stmtKardex->execute([
                            ':mes' => $mes,
                            ':items' => $d['Items'],
                            ':detalle' => $detalle,
                            ':cd' => 1,
                            ':cant_ent' => abs($diffReal),
                            ':cost_ent' => abs($diffReal) * $costo,
                            ':cant_sal' => 0,
                            ':cost_sal' => 0,
                            ':cant_saldo' => $contada,
                            ':cost_saldo' => $contada * $costo,
                            ':cost_unit' => $costo
                        ]);
                    } else {
                        // Faltante
                        $stmtKardex->execute([
                            ':mes' => $mes,
                            ':items' => $d['Items'],
                            ':detalle' => $detalle,
                            ':cd' => 2,
                            ':cant_ent' => 0,
                            ':cost_ent' => 0,
                            ':cant_sal' => abs($diffReal),
                            ':cost_sal' => abs($diffReal) * $costo,
                            ':cant_saldo' => $contada,
                            ':cost_saldo' => $contada * $costo,
                            ':cost_unit' => $costo
                        ]);
                    }

                    // Update stock to counted value
                    $stmtArticulo->execute([':exist' => $contada, ':items' => $d['Items']]);
                    $ajustados++;
                }

                // Close conteo
                $stmt = $db->prepare("
                    UPDATE tblconteo_inventario
                    SET Estado = 'Cerrado', Fecha_Cierre = NOW(),
                        Items_Contados = (SELECT COUNT(*) FROM tblconteo_detalle WHERE Id_Conteo = :id AND Existencia_Contada IS NOT NULL),
                        Items_Con_Diferencia = (SELECT COUNT(*) FROM tblconteo_detalle WHERE Id_Conteo = :id2 AND Diferencia != 0 AND Diferencia IS NOT NULL)
                    WHERE Id_Conteo = :id3
                ");
                $stmt->execute([':id' => $idConteo, ':id2' => $idConteo, ':id3' => $idConteo]);

                $db->commit();

                echo json_encode([
                    "success" => true,
                    "message" => "Conteo cerrado. Se ajustaron $ajustados artículos.",
                    "ajustados" => $ajustados
                ], JSON_UNESCAPED_UNICODE);
                break;

            case 'cancelar':
                $idConteo = $data->id_conteo ?? null;
                if (!$idConteo) {
                    http_response_code(400);
                    echo json_encode(["success" => false, "message" => "ID de conteo requerido"]);
                    exit;
                }
                $stmt = $db->prepare("UPDATE tblconteo_inventario SET Estado = 'Cancelado' WHERE Id_Conteo = :id AND Estado = 'Abierto'");
                $stmt->execute([':id' => $idConteo]);
                if ($stmt->rowCount() === 0) {
                    echo json_encode(["success" => false, "message" => "No se pudo cancelar"]);
                } else {
                    echo json_encode(["success" => true, "message" => "Conteo cancelado"], JSON_UNESCAPED_UNICODE);
                }
                break;

            default:
                http_response_code(400);
                echo json_encode(["success" => false, "message" => "Acción no válida: $action"]);
        }
    } else {
        http_response_code(405);
        echo json_encode(["success" => false, "message" => "Método no permitido"]);
    }
} catch(Exception $e) {
    if ($db->inTransaction()) $db->rollBack();
    http_response_code(500);
    echo json_encode(["success" => false, "message" => $e->getMessage()]);
}
?>
