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

// SQL asociado a cada módulo. Se busca en ../sql/. `null` = módulo cuyas
// tablas ya viven en el schema base y no requiere migración extra para
// habilitarse (solo marcar Activo=1).
$MODULO_SQL = [
    'nomina'         => 'modulo_nomina.sql',
    'financiaciones' => null,
];

try {
    // Guard: si la tabla aún no existe (BD sin migración), devolver estado vacío
    // en vez de crashear.
    if (!conta_tiene_tabla($db, 'tbl_modulos_activos')) {
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
        // Reflejar el flag legacy tbldatosempresa.modulo_financiaciones por si
        // alguien lo cambió desde la UI vieja o quedó desincronizado.
        try {
            $flag = intval($db->query("SELECT modulo_financiaciones FROM tbldatosempresa LIMIT 1")->fetchColumn());
            foreach ($modulos as &$m) {
                if ($m['Nombre'] === 'financiaciones' && intval($m['Activo']) !== $flag) {
                    $m['Activo'] = $flag;
                }
            }
            unset($m);
        } catch (Throwable $e) { /* columna puede no existir en BDs viejas */ }
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
            // Módulos sin SQL asociado (null) solo requieren flip del flag:
            // sus tablas ya están creadas en el schema base.
            if ($MODULO_SQL[$modulo] !== null) {
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
                try { $db->exec($sql); }
                catch (Throwable $e) {
                    echo json_encode(['success' => false, 'message' => 'Error ejecutando SQL del módulo: ' . $e->getMessage()]);
                    exit;
                }
            }

            // Upsert — si el módulo todavía no existe en la tabla (BD vieja
            // sin la fila del consolidado), lo insertamos.
            $stmt = $db->prepare("SELECT COUNT(*) FROM tbl_modulos_activos WHERE Nombre=?");
            $stmt->execute([$modulo]);
            if (intval($stmt->fetchColumn()) === 0) {
                $db->prepare("INSERT INTO tbl_modulos_activos (Nombre, Activo, Fecha_Activacion) VALUES (?, 1, CURRENT_TIMESTAMP)")
                   ->execute([$modulo]);
            } else {
                $db->prepare("UPDATE tbl_modulos_activos SET Activo=1, Fecha_Activacion=CURRENT_TIMESTAMP WHERE Nombre=?")
                   ->execute([$modulo]);
            }

            // Sincronizar flag legacy (financiaciones vive también en tbldatosempresa)
            if ($modulo === 'financiaciones') {
                try { $db->exec("UPDATE tbldatosempresa SET modulo_financiaciones=1"); }
                catch (Throwable $e) { /* columna opcional */ }
            }
            echo json_encode(['success' => true, 'message' => "Módulo '$modulo' activado."]);
            exit;
        }

        if ($action === 'desactivar') {
            // Solo marca inactivo — NO borra tablas ni datos. El módulo puede
            // volverse a activar sin perder nada.
            $db->prepare("UPDATE tbl_modulos_activos SET Activo=0 WHERE Nombre=?")
               ->execute([$modulo]);
            if ($modulo === 'financiaciones') {
                try { $db->exec("UPDATE tbldatosempresa SET modulo_financiaciones=0"); }
                catch (Throwable $e) { /* columna opcional */ }
            }
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
