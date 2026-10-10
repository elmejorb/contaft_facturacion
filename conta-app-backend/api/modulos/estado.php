<?php
/**
 * Módulos opcionales — habilitación por root
 *
 * GET  → lista estado de los módulos
 * POST { action: 'activar', modulo: 'nomina', usuario: 'root' }
 *   → ejecuta el SQL del módulo y marca Activo=1
 * POST { action: 'desactivar', modulo: 'nomina', usuario: 'root' }
 *   → marca Activo=0 (NO borra tablas — datos quedan intactos)
 *
 * Cada módulo tiene un archivo SQL asociado en ../sql/.
 * Solo el usuario 'root' puede activar/desactivar módulos.
 */
require_once '../config/database.php';
$db = (new Database())->getConnection();

// SQL asociado a cada módulo. Se busca en ../sql/.
$MODULO_SQL = [
    'nomina' => 'modulo_nomina.sql',
];

try {
    // Guard: si la tabla aún no existe (BD sin migración), devolver estado vacío
    // en vez de crashear.
    $existe = $db->query("SELECT COUNT(*) FROM information_schema.TABLES
        WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='tbl_modulos_activos'")->fetchColumn();
    if (intval($existe) === 0) {
        echo json_encode([
            'success' => true,
            'modulos' => [],
            'warning' => 'Tabla tbl_modulos_activos no existe. Corre actualizacion_completa.sql primero.',
        ]);
        exit;
    }

    if ($_SERVER['REQUEST_METHOD'] === 'GET') {
        $stmt = $db->query("SELECT Nombre, Activo, Descripcion, Fecha_Activacion FROM tbl_modulos_activos ORDER BY Nombre");
        $modulos = $stmt->fetchAll();
        echo json_encode(['success' => true, 'modulos' => $modulos]);
        exit;
    }

    if ($_SERVER['REQUEST_METHOD'] === 'POST') {
        $data = json_decode(file_get_contents('php://input'), true);
        $action = $data['action'] ?? '';
        $modulo = trim($data['modulo'] ?? '');
        $usuario = trim($data['usuario'] ?? '');

        // Solo root puede activar/desactivar módulos.
        if ($usuario !== 'root') {
            http_response_code(403);
            echo json_encode(['success' => false, 'message' => 'Solo el usuario root puede activar/desactivar módulos.']);
            exit;
        }

        if (!isset($MODULO_SQL[$modulo])) {
            echo json_encode(['success' => false, 'message' => "Módulo '$modulo' no reconocido."]);
            exit;
        }

        if ($action === 'activar') {
            $sqlFile = __DIR__ . '/../../sql/' . $MODULO_SQL[$modulo];
            if (!file_exists($sqlFile)) {
                echo json_encode(['success' => false, 'message' => "No se encontró el archivo SQL del módulo: {$MODULO_SQL[$modulo]}"]);
                exit;
            }

            $sql = file_get_contents($sqlFile);
            if (!$sql) {
                echo json_encode(['success' => false, 'message' => 'No se pudo leer el archivo SQL.']);
                exit;
            }

            // Ejecutar el SQL. El archivo es idempotente (CREATE TABLE IF NOT EXISTS
            // + guards de columna con INFORMATION_SCHEMA), así que correrlo múltiples
            // veces no causa daño.
            try {
                $db->exec($sql);
            } catch (Throwable $e) {
                echo json_encode(['success' => false, 'message' => 'Error ejecutando SQL del módulo: ' . $e->getMessage()]);
                exit;
            }

            $db->prepare("UPDATE tbl_modulos_activos SET Activo=1, Fecha_Activacion=NOW() WHERE Nombre=?")
               ->execute([$modulo]);

            echo json_encode(['success' => true, 'message' => "Módulo '$modulo' activado. Tablas creadas correctamente."]);
            exit;
        }

        if ($action === 'desactivar') {
            // Solo marca inactivo — NO borra tablas ni datos. El módulo puede
            // volverse a activar sin perder nada.
            $db->prepare("UPDATE tbl_modulos_activos SET Activo=0 WHERE Nombre=?")
               ->execute([$modulo]);
            echo json_encode(['success' => true, 'message' => "Módulo '$modulo' desactivado. Los datos se conservan."]);
            exit;
        }

        echo json_encode(['success' => false, 'message' => 'Acción no reconocida.']);
        exit;
    }

    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Método no permitido.']);
} catch (Throwable $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => $e->getMessage()]);
}
