<?php
/**
 * Configuración del módulo Vendedores Móviles
 * GET                      → config + conteos
 * POST action=guardar      → guardar config
 * POST action=probar       → probar conexión con API remota
 * POST action=pull_ahora   → ejecutar pull inmediato
 */
require_once '../config/database.php';
$database = new Database();
$db = $database->getConnection();

try {
    if ($_SERVER['REQUEST_METHOD'] === 'GET') {
        $stmt = $db->query("SELECT * FROM tbl_config_vendedores WHERE id = 1");
        $config = $stmt->fetch();

        $pendientes = $db->query("SELECT COUNT(*) FROM tbl_pedidos_vendedor WHERE estado = 'pendiente'")->fetchColumn();
        $fe_vendedores = $db->query("SELECT COUNT(*) FROM electronic_documents WHERE origen = 'movil'")->fetchColumn();

        echo json_encode([
            'success' => true,
            'config' => $config,
            'pedidos_pendientes' => (int) $pendientes,
            'fe_vendedores' => (int) $fe_vendedores,
        ], JSON_UNESCAPED_UNICODE);
        exit;
    }

    if ($_SERVER['REQUEST_METHOD'] === 'POST') {
        $data = json_decode(file_get_contents('php://input'), true);
        $action = $data['action'] ?? '';

        if ($action === 'guardar') {
            $stmt = $db->prepare("
                UPDATE tbl_config_vendedores SET
                    habilitado = ?,
                    api_url = ?,
                    api_email = ?,
                    api_token_empresa = ?,
                    sync_intervalo_pull_min = ?,
                    fecha_mod = NOW()
                WHERE id = 1
            ");
            $stmt->execute([
                intval($data['habilitado'] ?? 0),
                $data['api_url'] ?? '',
                $data['api_email'] ?? '',
                $data['api_token_empresa'] ?? '',
                intval($data['sync_intervalo_pull_min'] ?? 15),
            ]);
            echo json_encode(['success' => true, 'message' => 'Configuración guardada'], JSON_UNESCAPED_UNICODE);
            exit;
        }

        if ($action === 'probar') {
            $apiUrl = rtrim($data['api_url'] ?? '', '/');
            $email = $data['api_email'] ?? '';
            $token = $data['api_token_empresa'] ?? '';

            if (!$apiUrl || !$email || !$token) {
                echo json_encode(['success' => false, 'message' => 'Faltan datos de conexión'], JSON_UNESCAPED_UNICODE);
                exit;
            }

            $ch = curl_init($apiUrl . '/health');
            curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
            curl_setopt($ch, CURLOPT_TIMEOUT, 10);
            $resp = curl_exec($ch);
            $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
            curl_close($ch);

            if ($httpCode === 200 && $resp) {
                echo json_encode(['success' => true, 'message' => 'Conexión exitosa con la API'], JSON_UNESCAPED_UNICODE);
            } else {
                echo json_encode(['success' => false, 'message' => 'No se pudo conectar con la API (HTTP ' . $httpCode . ')'], JSON_UNESCAPED_UNICODE);
            }
            exit;
        }

        if ($action === 'pull_ahora') {
            // Ejecutar pull inmediato incluyendo el archivo pull.php
            ob_start();
            include 'pull.php';
            $output = ob_get_clean();
            // pull.php ya hace echo json_encode, capturamos y reenviamos
            echo $output;
            exit;
        }
    }
} catch (Exception $e) {
    echo json_encode(['success' => false, 'message' => $e->getMessage()], JSON_UNESCAPED_UNICODE);
}
