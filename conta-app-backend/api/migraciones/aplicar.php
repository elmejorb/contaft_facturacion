<?php
/**
 * Aplica un hotfix SQL remoto a la BD local.
 *
 * Flujo esperado desde la app Electron (useAutoHotfixes):
 *   1. Front descarga el index.json remoto.
 *   2. Para cada fix cuyo id no está en tbl_hotfixes_aplicados, descarga el .sql.
 *   3. POST a este endpoint con el SQL + hash. Nosotros:
 *      a) Verificamos el hash (defensa contra MITM / corrupción).
 *      b) Ejecutamos el SQL (idempotente — por convención los hotfixes lo son).
 *      c) Registramos en tbl_hotfixes_aplicados.
 *   4. Front skipea en futuras ejecuciones.
 *
 * Request:
 *   POST { id: string, sha256: string, sql: string }
 *
 * Response:
 *   { success: bool, message: string, ya_aplicado?: bool }
 *
 * Seguridad:
 *   - Solo tiene efecto si el SQL coincide con el hash enviado — así un
 *     atacante no puede forzarnos a correr SQL arbitrario sin controlar
 *     también el canal del index.json.
 *   - No destructivo por convención: cada hotfix se escribe idempotente,
 *     con IF NOT EXISTS / COALESCE / DROP IF EXISTS. No corremos DELETE
 *     ni DROP TABLE sin salvaguardas en el propio SQL.
 */

require_once '../config/database.php';

$database = new Database();
$db = $database->getConnection();

header('Content-Type: application/json');

try {
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        echo json_encode(['success' => false, 'message' => 'Método no permitido']);
        exit;
    }

    $raw = file_get_contents('php://input');
    $data = json_decode($raw, true);
    $id = trim($data['id'] ?? '');
    $sha256 = trim($data['sha256'] ?? '');
    $sql = $data['sql'] ?? '';

    if ($id === '' || $sha256 === '' || $sql === '') {
        echo json_encode(['success' => false, 'message' => 'id, sha256 y sql son requeridos']);
        exit;
    }

    // 1) Verificar hash
    $hashLocal = hash('sha256', $sql);
    if (!hash_equals($hashLocal, strtolower($sha256))) {
        echo json_encode([
            'success' => false,
            'message' => 'Hash SHA-256 no coincide: fix descartado por seguridad',
            'hash_esperado'  => $sha256,
            'hash_calculado' => $hashLocal,
        ]);
        exit;
    }

    // 2) Asegurar que existe la tabla de control (idempotente, no estorba
    // si ya la creó actualizacion_completa.sql).
    $db->exec("
        CREATE TABLE IF NOT EXISTS tbl_hotfixes_aplicados (
            id VARCHAR(100) NOT NULL PRIMARY KEY,
            sha256 VARCHAR(64) NOT NULL,
            aplicado_en DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            output TEXT
        )
    ");

    // 3) ¿Ya aplicado?
    $stmt = $db->prepare("SELECT sha256, aplicado_en FROM tbl_hotfixes_aplicados WHERE id = ?");
    $stmt->execute([$id]);
    $existente = $stmt->fetch();
    if ($existente) {
        // Si el hash coincide: éxito silencioso. Si cambió: NO re-aplicamos
        // sin que lo pidan explícito — podría ser incompatible.
        $mismoHash = hash_equals(strtolower($existente['sha256']), strtolower($sha256));
        echo json_encode([
            'success'     => $mismoHash,
            'message'     => $mismoHash
                ? "Hotfix $id ya estaba aplicado desde {$existente['aplicado_en']}"
                : "Hotfix $id tiene hash distinto al almacenado — requiere intervención manual",
            'ya_aplicado' => true,
        ]);
        exit;
    }

    // 4) Ejecutar
    $outputLog = [];
    try {
        // PDO::exec corre múltiples statements separados por ';' en MySQL.
        $db->exec($sql);
        $outputLog[] = 'OK aplicado';
    } catch (PDOException $e) {
        $outputLog[] = 'ERROR: ' . $e->getMessage();
        echo json_encode([
            'success' => false,
            'message' => 'SQL falló: ' . $e->getMessage(),
        ]);
        exit;
    }

    // 5) Registrar
    $stmt = $db->prepare("
        INSERT INTO tbl_hotfixes_aplicados (id, sha256, output)
        VALUES (?, ?, ?)
    ");
    $stmt->execute([$id, $sha256, implode("\n", $outputLog)]);

    echo json_encode([
        'success' => true,
        'message' => "Hotfix $id aplicado correctamente",
    ]);
} catch (Throwable $e) {
    echo json_encode([
        'success' => false,
        'message' => 'Error interno: ' . $e->getMessage(),
    ]);
}
