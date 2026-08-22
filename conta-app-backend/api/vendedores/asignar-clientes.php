<?php
/**
 * Asignar clientes a un vendedor móvil.
 *
 * GET  ?id_vendedor=N        → lista los codvb6 ya asignados al vendedor
 *                              (consulta Lumen tabla mobile_vendedor_clientes)
 * POST { id_vendedor: N,      → reemplaza las asignaciones del vendedor
 *        codvb6: [...] }        con la lista dada
 *
 * El desktop es solo puente: la fuente de verdad es Lumen porque desde
 * ahí es que el vendedor móvil consulta sus clientes al iniciar sesión.
 */
require_once '../config/database.php';
header('Content-Type: application/json; charset=utf-8');

$db = (new Database())->getConnection();

try {
    // Config Lumen
    $cfg = $db->query("SELECT api_url, api_email, api_token_empresa FROM tbl_config_vendedores WHERE id = 1")->fetch();
    if (!$cfg || !$cfg['api_url']) {
        echo json_encode(['success' => false, 'message' => 'Módulo Vendedores Móviles no configurado'], JSON_UNESCAPED_UNICODE);
        exit;
    }
    $apiUrl = rtrim($cfg['api_url'], '/');
    $email  = $cfg['api_email'];
    $token  = $cfg['api_token_empresa'];

    if ($_SERVER['REQUEST_METHOD'] === 'GET') {
        $idVend = intval($_GET['id_vendedor'] ?? 0);
        if ($idVend <= 0) {
            echo json_encode(['success' => false, 'message' => 'id_vendedor requerido'], JSON_UNESCAPED_UNICODE);
            exit;
        }

        $url = $apiUrl . '/sync/vendedor-clientes/asignados?email=' . urlencode($email)
             . '&token_api=' . urlencode($token) . '&id_vendedor_conta=' . $idVend;
        $ch = curl_init($url);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_TIMEOUT, 30);
        curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
        curl_setopt($ch, CURLOPT_SSL_VERIFYHOST, 0);
        $resp = curl_exec($ch);
        $http = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);

        if ($http !== 200 || !$resp) {
            echo json_encode(['success' => false, 'message' => "Error consultando nube (HTTP $http)"], JSON_UNESCAPED_UNICODE);
            exit;
        }

        $body = json_decode($resp, true);
        $codvb6 = array_map('intval', $body['codvb6'] ?? []);

        // También devolvemos la lista de todos los clientes del desktop para
        // que la UI arme "asignados" vs "disponibles" sin llamada extra.
        $clientes = $db->query("
            SELECT CodigoClien, Razon_Social, Nit, Identificacion, Telefonos, Direccion, CupoAutorizado
            FROM tblclientes
            ORDER BY Razon_Social
        ")->fetchAll();

        echo json_encode([
            'success'   => true,
            'asignados' => $codvb6,
            'clientes'  => $clientes,
        ], JSON_UNESCAPED_UNICODE);
        exit;
    }

    if ($_SERVER['REQUEST_METHOD'] === 'POST') {
        $data = json_decode(file_get_contents('php://input'), true);
        $idVend = intval($data['id_vendedor'] ?? 0);
        $codvb6 = $data['codvb6'] ?? [];

        if ($idVend <= 0 || !is_array($codvb6)) {
            echo json_encode(['success' => false, 'message' => 'id_vendedor y codvb6[] son obligatorios'], JSON_UNESCAPED_UNICODE);
            exit;
        }

        $payload = json_encode([
            'email'              => $email,
            'token_api'          => $token,
            'id_vendedor_conta'  => $idVend,
            'codvb6'             => array_map('intval', $codvb6),
        ]);

        $ch = curl_init($apiUrl . '/sync/vendedor-clientes/asignar');
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_POST, true);
        curl_setopt($ch, CURLOPT_POSTFIELDS, $payload);
        curl_setopt($ch, CURLOPT_HTTPHEADER, ['Content-Type: application/json']);
        curl_setopt($ch, CURLOPT_TIMEOUT, 60);
        curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
        curl_setopt($ch, CURLOPT_SSL_VERIFYHOST, 0);
        $resp = curl_exec($ch);
        $http = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);

        if ($http !== 200 || !$resp) {
            echo json_encode(['success' => false, 'message' => "Error guardando en nube (HTTP $http)"], JSON_UNESCAPED_UNICODE);
            exit;
        }

        $body = json_decode($resp, true);
        echo json_encode([
            'success'     => empty($body['error']),
            'message'     => $body['mensaje'] ?? 'Asignación guardada',
            'asignados'   => intval($body['asignados'] ?? 0),
            'solicitados' => intval($body['solicitados'] ?? 0),
        ], JSON_UNESCAPED_UNICODE);
        exit;
    }
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => $e->getMessage()], JSON_UNESCAPED_UNICODE);
}
