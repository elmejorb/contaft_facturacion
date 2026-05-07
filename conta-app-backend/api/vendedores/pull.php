<?php
/**
 * Pull de ventas desde la API remota
 * GET (sin parámetros) → ejecuta pull incremental
 * POST action=pull     → ejecuta pull incremental
 *
 * Lógica:
 *  1. Leer config: api_url, api_token_empresa, ultimo_pull_id
 *  2. GET {api_url}/sync/ventas/pendientes?after_id={ultimo_pull_id}&per_page=100
 *  3. Por cada venta:
 *     - Si tiene cufe → INSERT/UPDATE electronic_documents (origen='movil')
 *     - Si NO tiene cufe → INSERT/UPDATE tbl_pedidos_vendedor
 *  4. UPDATE tbl_config_vendedores con nuevo ultimo_pull_id
 */
require_once '../config/database.php';
$database = new Database();
$db = $database->getConnection();

try {
    // Leer configuración
    $config = $db->query("SELECT * FROM tbl_config_vendedores WHERE id = 1")->fetch();
    if (!$config || !$config['habilitado']) {
        echo json_encode(['success' => false, 'message' => 'Módulo no habilitado'], JSON_UNESCAPED_UNICODE);
        exit;
    }

    $apiUrl = rtrim($config['api_url'] ?? '', '/');
    $email = $config['api_email'] ?? '';
    $token = $config['api_token_empresa'] ?? '';
    $ultimoPullId = intval($config['ultimo_pull_id'] ?? 0);

    if (!$apiUrl || !$email || !$token) {
        echo json_encode(['success' => false, 'message' => 'Faltan credenciales de API'], JSON_UNESCAPED_UNICODE);
        exit;
    }

    $url = $apiUrl . '/sync/ventas/pendientes?after_id=' . $ultimoPullId . '&per_page=100&email=' . urlencode($email) . '&token_api=' . urlencode($token);

    $ch = curl_init($url);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_TIMEOUT, 30);
    $resp = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);

    if ($httpCode !== 200 || !$resp) {
        echo json_encode(['success' => false, 'message' => 'Error conectando con API remota (HTTP ' . $httpCode . ')'], JSON_UNESCAPED_UNICODE);
        exit;
    }

    $data = json_decode($resp, true);
    if (empty($data) || !empty($data['error'])) {
        echo json_encode(['success' => false, 'message' => $data['mensaje'] ?? 'Respuesta inválida de la API'], JSON_UNESCAPED_UNICODE);
        exit;
    }

    $ventas = $data['ventas'] ?? [];
    $pedidosNuevos = 0;
    $feNuevas = 0;
    $maxId = $ultimoPullId;

    if (empty($ventas)) {
        echo json_encode([
            'success' => true,
            'message' => 'No hay ventas nuevas',
            'pedidos_nuevos' => 0,
            'fe_nuevas' => 0,
            'ultimo_pull_id' => $ultimoPullId,
        ], JSON_UNESCAPED_UNICODE);
        exit;
    }

    $db->beginTransaction();
    try {
        foreach ($ventas as $v) {
            $idRemoto = intval($v['id_venta'] ?? 0);
            if ($idRemoto > $maxId) {
                $maxId = $idRemoto;
            }

            $tieneCufe = !empty($v['cufe']);

            if ($tieneCufe) {
                // Factura Electrónica autorizada por DIAN
                $stmt = $db->prepare("
                    SELECT id FROM electronic_documents
                    WHERE cufe = ?
                ");
                $stmt->execute([$v['cufe']]);
                $existe = $stmt->fetch();

                $fecha = !empty($v['fecha_venta']) ? $v['fecha_venta'] . ' 00:00:00' : date('Y-m-d H:i:s');

                if ($existe) {
                    $db->prepare("
                        UPDATE electronic_documents SET
                            fecha = ?, customer_identification = ?, total = ?, status = ?,
                            origen = 'movil', id_vendedor_remoto = ?, nombre_vendedor = ?
                        WHERE cufe = ?
                    ")->execute([
                        $fecha,
                        $v['nit_cliente'] ?? '',
                        $v['total'] ?? 0,
                        $v['estado_dian'] ?? 'autorizado',
                        $v['id_vendedor_mobile'] ?? null,
                        $v['nombre_vendedor'] ?? '',
                        $v['cufe'],
                    ]);
                } else {
                    $db->prepare("
                        INSERT INTO electronic_documents
                        (fecha, cod_cliente, customer_identification, total, cufe, status,
                         origen, id_vendedor_remoto, nombre_vendedor, created_at)
                        VALUES (?, ?, ?, ?, ?, ?, 'movil', ?, ?, NOW())
                    ")->execute([
                        $fecha,
                        $v['id_cliente'] ?? 0,
                        $v['nit_cliente'] ?? '',
                        $v['total'] ?? 0,
                        $v['cufe'],
                        $v['estado_dian'] ?? 'autorizado',
                        $v['id_vendedor_mobile'] ?? null,
                        $v['nombre_vendedor'] ?? '',
                    ]);
                }
                $feNuevas++;
            } else {
                // Pedido sin FE
                $stmt = $db->prepare("SELECT id FROM tbl_pedidos_vendedor WHERE id_remoto = ?");
                $stmt->execute([$idRemoto]);
                $existe = $stmt->fetch();

                $itemsJson = !empty($v['detalles']) ? json_encode($v['detalles'], JSON_UNESCAPED_UNICODE) : '[]';

                if ($existe) {
                    $db->prepare("
                        UPDATE tbl_pedidos_vendedor SET
                            numero_pedido = ?, id_cliente_remoto = ?, nombre_cliente = ?,
                            nit_cliente = ?, id_vendedor_remoto = ?, nombre_vendedor = ?,
                            fecha = ?, subtotal = ?, impuestos = ?, total = ?,
                            forma_pago = ?, observaciones = ?, estado = ?, items_json = ?,
                            fecha_mod = NOW()
                        WHERE id_remoto = ?
                    ")->execute([
                        $v['numero_factura'] ?? '',
                        $v['id_cliente'] ?? null,
                        $v['nombre_cliente'] ?? '',
                        $v['nit_cliente'] ?? '',
                        $v['id_vendedor_mobile'] ?? null,
                        $v['nombre_vendedor'] ?? '',
                        $v['fecha_venta'] ?? null,
                        $v['subtotal'] ?? 0,
                        $v['total_impuestos'] ?? 0,
                        $v['total'] ?? 0,
                        $v['forma_pago'] ?? 'contado',
                        $v['observaciones'] ?? '',
                        ($v['estado'] ?? 'pendiente') === 'registrada' ? 'pendiente' : ($v['estado'] ?? 'pendiente'),
                        $itemsJson,
                        $idRemoto,
                    ]);
                } else {
                    $db->prepare("
                        INSERT INTO tbl_pedidos_vendedor
                        (id_remoto, numero_pedido, id_cliente_remoto, nombre_cliente, nit_cliente,
                         id_vendedor_remoto, nombre_vendedor, fecha, subtotal, impuestos, total,
                         forma_pago, observaciones, estado, items_json, fecha_descarga, fecha_mod)
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
                    ")->execute([
                        $idRemoto,
                        $v['numero_factura'] ?? '',
                        $v['id_cliente'] ?? null,
                        $v['nombre_cliente'] ?? '',
                        $v['nit_cliente'] ?? '',
                        $v['id_vendedor_mobile'] ?? null,
                        $v['nombre_vendedor'] ?? '',
                        $v['fecha_venta'] ?? null,
                        $v['subtotal'] ?? 0,
                        $v['total_impuestos'] ?? 0,
                        $v['total'] ?? 0,
                        $v['forma_pago'] ?? 'contado',
                        $v['observaciones'] ?? '',
                        ($v['estado'] ?? 'pendiente') === 'registrada' ? 'pendiente' : ($v['estado'] ?? 'pendiente'),
                        $itemsJson,
                    ]);
                    $pedidosNuevos++;
                }
            }
        }

        // Actualizar último pull
        $db->prepare("
            UPDATE tbl_config_vendedores
            SET ultimo_pull_id = ?, ultimo_pull_ventas = NOW(), fecha_mod = NOW()
            WHERE id = 1
        ")->execute([$maxId]);

        $db->commit();

        echo json_encode([
            'success' => true,
            'message' => 'Pull completado: ' . $pedidosNuevos . ' pedidos nuevos, ' . $feNuevas . ' FE nuevas',
            'pedidos_nuevos' => $pedidosNuevos,
            'fe_nuevas' => $feNuevas,
            'ultimo_pull_id' => $maxId,
        ], JSON_UNESCAPED_UNICODE);

    } catch (Exception $e) {
        $db->rollBack();
        echo json_encode(['success' => false, 'message' => 'Error en pull: ' . $e->getMessage()], JSON_UNESCAPED_UNICODE);
    }

} catch (Exception $e) {
    echo json_encode(['success' => false, 'message' => $e->getMessage()], JSON_UNESCAPED_UNICODE);
}
