<?php
/**
 * Eliminar documentos electrónicos rechazados por DIAN.
 *
 * Solo se permite eliminar filas con `status` que NO sea 'autorizado'/'enviado'
 * y SIN `cufe`. Documentos autorizados son inmutables ante DIAN — para esos
 * se debe emitir nota crédito desde el flujo normal.
 *
 * POST { id: N }              → eliminar uno
 * POST { ids: [N, M, ...] }   → eliminar varios (acción masiva)
 * POST { eliminar_todos_rechazados: true } → barrer toda la lista de rechazados
 */
require_once '../config/database.php';
require_once __DIR__ . "/../config/helpers_polyfill.php";

header('Content-Type: application/json; charset=utf-8');

$db = (new Database())->getConnection();

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    echo json_encode(['success' => false, 'message' => 'Método no permitido']);
    exit;
}

$data = json_decode(file_get_contents('php://input'), true) ?: [];

// Construir lista de IDs a eliminar según el modo
$ids = [];
if (!empty($data['id'])) {
    $ids = [intval($data['id'])];
} elseif (!empty($data['ids']) && is_array($data['ids'])) {
    $ids = array_map('intval', $data['ids']);
} elseif (!empty($data['eliminar_todos_rechazados'])) {
    // SELECT directo aplicando las mismas reglas de seguridad
    $rows = $db->query("
        SELECT id FROM electronic_documents
        WHERE (cufe IS NULL OR cufe = '')
          AND status IN ('rechazado', 'error')
    ")->fetchAll(PDO::FETCH_COLUMN);
    $ids = array_map('intval', $rows);
}

if (empty($ids)) {
    echo json_encode(['success' => false, 'message' => 'No hay documentos para eliminar']);
    exit;
}

// Filtro de seguridad: solo borramos los que cumplen las reglas. Si el
// frontend manda un id de un documento autorizado, lo ignoramos en silencio.
$placeholders = implode(',', array_fill(0, count($ids), '?'));
$stmt = $db->prepare("
    SELECT id, status, cufe, CONCAT(IFNULL(prefix,''), number) AS doc_n
    FROM electronic_documents
    WHERE id IN ($placeholders)
");
$stmt->execute($ids);
$elegibles = [];
$protegidos = [];
foreach ($stmt->fetchAll() as $row) {
    $tieneCufe = !empty($row['cufe']);
    $statusOk = in_array($row['status'], ['rechazado', 'error'], true);
    if (!$tieneCufe && $statusOk) {
        $elegibles[] = intval($row['id']);
    } else {
        $protegidos[] = $row['doc_n'];
    }
}

if (empty($elegibles)) {
    echo json_encode([
        'success' => false,
        'message' => 'Ninguno de los documentos seleccionados se puede eliminar (autorizados ante DIAN o ya enviados con CUFE)',
        'protegidos' => $protegidos,
    ]);
    exit;
}

$db->beginTransaction();
try {
    $ph = implode(',', array_fill(0, count($elegibles), '?'));

    // 0. Abonos iniciales de esos documentos → 'Anulada' (no se borran: libro
    // inmutable). Si no, el abono de una FE que nunca se autorizó quedaba
    // huérfano y seguía sumando en caja.
    $stmtAb = $db->prepare("
        UPDATE tblpagos SET Estado = 'Anulada'
        WHERE DetallePago LIKE 'Abono inicial FE%'
          AND Estado IN ('Valida', 'Pendiente')
          AND (Nfact_electronica = ? OR Nfact_electronica LIKE ?)
          AND Codigo = (SELECT cod_cliente FROM electronic_documents WHERE id = ?)
    ");
    foreach ($elegibles as $idEl) {
        $stmtAb->execute([(string)$idEl, '%-' . $idEl, $idEl]);
    }

    // 1. Borrar detalle. El typo anterior ("tbldetalle_documento_electronico")
    // nunca matcheaba la tabla real (`detalle_document_electronic`), así que
    // el DELETE no corría y las líneas quedaban huérfanas tras borrar el
    // encabezado — caso real detectado en conta_innovacion.
    if (conta_tiene_tabla($db, "detalle_document_electronic")) {
        $db->prepare("DELETE FROM detalle_document_electronic WHERE factura_n IN ($ph)")
           ->execute($elegibles);
    }

    // 2. Borrar el encabezado.
    $stmtDel = $db->prepare("DELETE FROM electronic_documents WHERE id IN ($ph)");
    $stmtDel->execute($elegibles);
    $borrados = $stmtDel->rowCount();

    $db->commit();

    echo json_encode([
        'success'    => true,
        'borrados'   => $borrados,
        'protegidos' => $protegidos,
        'message'    => "$borrados documento(s) rechazado(s) eliminado(s)" .
                        (count($protegidos) > 0 ? '. ' . count($protegidos) . ' protegido(s) (autorizados ante DIAN)' : ''),
    ]);
} catch (Exception $e) {
    $db->rollBack();
    echo json_encode(['success' => false, 'message' => 'Error al eliminar: ' . $e->getMessage()]);
}
