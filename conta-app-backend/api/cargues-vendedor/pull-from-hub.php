<?php
/**
 * Pull cargues nuevos del hub Lumen → espeja en tbl_cargues_vendedor.
 * GET | POST — sin body.
 *
 * Lógica:
 *   1. Lee config: api_url, api_email, api_token_empresa
 *   2. POST {api_url}/sync/cargues/pendientes-desktop
 *      → devuelve cargues con sincronizado_desktop=0 y los marca en el hub
 *   3. Por cada cargue:
 *      - Resolver id_vendedor_movil local por codigo_vendedor
 *      - INSERT/UPDATE tbl_cargues_vendedor (match por id_cargue_hub)
 *      - Reemplazar detalle (borrar existente + insertar nuevo)
 *   4. Devolver conteos
 */
require_once '../config/database.php';
$database = new Database();
$db = $database->getConnection();

header('Content-Type: application/json; charset=utf-8');

try {
    $config = $db->query("SELECT * FROM tbl_config_vendedores WHERE id = 1")->fetch();
    if (!$config || !$config['habilitado']) {
        echo json_encode(['success' => false, 'message' => 'Módulo no habilitado'], JSON_UNESCAPED_UNICODE);
        exit;
    }

    $apiUrl = rtrim($config['api_url'] ?? '', '/');
    $email  = $config['api_email'] ?? '';
    $token  = $config['api_token_empresa'] ?? '';

    if (!$apiUrl || !$email || !$token) {
        echo json_encode(['success' => false, 'message' => 'Faltan credenciales de API'], JSON_UNESCAPED_UNICODE);
        exit;
    }

    $payload = json_encode(['email' => $email, 'token_api' => $token]);
    $ch = curl_init($apiUrl . '/sync/cargues/pendientes-desktop');
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_TIMEOUT, 30);
    curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
    curl_setopt($ch, CURLOPT_SSL_VERIFYHOST, 0);
    curl_setopt($ch, CURLOPT_POST, true);
    curl_setopt($ch, CURLOPT_HTTPHEADER, ['Content-Type: application/json']);
    curl_setopt($ch, CURLOPT_POSTFIELDS, $payload);
    $resp = curl_exec($ch);
    $code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);

    if ($code !== 200 || !$resp) {
        echo json_encode(['success' => false, 'message' => "Error conectando al hub (HTTP $code)"], JSON_UNESCAPED_UNICODE);
        exit;
    }

    $data = json_decode($resp, true);
    if (!empty($data['error'])) {
        echo json_encode(['success' => false, 'message' => $data['mensaje'] ?? 'Error del hub'], JSON_UNESCAPED_UNICODE);
        exit;
    }

    $cargues = $data['cargues'] ?? [];
    $insertados = 0;
    $actualizados = 0;
    $ignorados = 0;

    $db->beginTransaction();
    try {
        foreach ($cargues as $c) {
            $idHub = intval($c['id_hub'] ?? 0);
            if ($idHub <= 0) { $ignorados++; continue; }

            // Resolver vendedor local por código
            $codigoV = trim($c['codigo_vendedor'] ?? '');
            if ($codigoV === '') { $ignorados++; continue; }
            $stmtV = $db->prepare("SELECT id FROM tbl_vendedores_movil WHERE codigo = ? LIMIT 1");
            $stmtV->execute([$codigoV]);
            $vRow = $stmtV->fetch();
            if (!$vRow) { $ignorados++; continue; }
            $idVendedorLocal = intval($vRow['id']);

            // ¿Ya existe local?
            $stmtE = $db->prepare("SELECT id FROM tbl_cargues_vendedor WHERE id_cargue_hub = ? LIMIT 1");
            $stmtE->execute([$idHub]);
            $existe = $stmtE->fetch();

            $estado = $c['estado'] ?? 'pendiente';

            if ($existe) {
                $stmtU = $db->prepare("
                    UPDATE tbl_cargues_vendedor SET
                        estado = ?,
                        total_valor_cargue = ?,
                        total_valor_devuelto = ?,
                        total_valor_danado = ?,
                        dinero_recibido = ?,
                        notas_vendedor = ?,
                        notas_admin = ?,
                        aprobado_at = ?,
                        cerrado_at = ?,
                        updated_at = NOW()
                    WHERE id = ?
                ");
                $stmtU->execute([
                    $estado,
                    $c['total_valor_cargue'] ?? 0,
                    $c['total_valor_devuelto'] ?? 0,
                    $c['total_valor_danado'] ?? 0,
                    $c['dinero_recibido'] ?? 0,
                    $c['notas_vendedor'] ?? null,
                    $c['notas_admin'] ?? null,
                    $c['aprobado_at'] ?? null,
                    $c['cerrado_at'] ?? null,
                    $existe['id'],
                ]);
                $idLocal = intval($existe['id']);
                $actualizados++;
            } else {
                $stmtI = $db->prepare("
                    INSERT INTO tbl_cargues_vendedor
                        (id_vendedor_movil, id_cargue_hub, fecha, estado,
                         total_valor_cargue, total_valor_devuelto, total_valor_danado, dinero_recibido,
                         notas_vendedor, notas_admin, aprobado_at, cerrado_at, created_at, updated_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
                ");
                $stmtI->execute([
                    $idVendedorLocal,
                    $idHub,
                    $c['fecha'] ?? date('Y-m-d'),
                    $estado,
                    $c['total_valor_cargue'] ?? 0,
                    $c['total_valor_devuelto'] ?? 0,
                    $c['total_valor_danado'] ?? 0,
                    $c['dinero_recibido'] ?? 0,
                    $c['notas_vendedor'] ?? null,
                    $c['notas_admin'] ?? null,
                    $c['aprobado_at'] ?? null,
                    $c['cerrado_at'] ?? null,
                ]);
                $idLocal = intval($db->lastInsertId());
                $insertados++;
            }

            // Reemplazar detalle
            $db->prepare("DELETE FROM tbl_cargues_vendedor_detalle WHERE id_cargue = ?")
               ->execute([$idLocal]);

            $items = $c['items'] ?? [];
            if (!empty($items)) {
                $stmtDet = $db->prepare("
                    INSERT INTO tbl_cargues_vendedor_detalle
                        (id_cargue, items, cant_cargue, cant_devuelta, cant_danada,
                         precio_venta_unitario, precio_costo_unitario)
                    VALUES (?, ?, ?, ?, ?, ?, ?)
                ");
                foreach ($items as $it) {
                    $stmtDet->execute([
                        $idLocal,
                        intval($it['items'] ?? 0),
                        $it['cant_cargue'] ?? 0,
                        $it['cant_devuelta'] ?? 0,
                        $it['cant_danada'] ?? 0,
                        $it['precio_venta_unitario'] ?? 0,
                        $it['precio_costo_unitario'] ?? 0,
                    ]);
                }
            }
        }

        $db->commit();
    } catch (Exception $e) {
        $db->rollBack();
        throw $e;
    }

    $partes = [];
    if ($insertados > 0)   $partes[] = "$insertados nuevos";
    if ($actualizados > 0) $partes[] = "$actualizados actualizados";
    if ($ignorados > 0)    $partes[] = "$ignorados ignorados (vendedor no mapeado)";
    $msg = empty($partes) ? 'Sin cargues nuevos del hub' : 'Pull cargues: ' . implode(', ', $partes);

    echo json_encode([
        'success' => true,
        'message' => $msg,
        'insertados' => $insertados,
        'actualizados' => $actualizados,
        'ignorados' => $ignorados,
    ], JSON_UNESCAPED_UNICODE);
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => $e->getMessage()], JSON_UNESCAPED_UNICODE);
}
