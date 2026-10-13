<?php
/**
 * Catálogo de Conceptos de Retención en la Fuente (DIAN).
 *
 *   GET                     → listar todos + info UVT
 *   POST   { action: crear, concepto, base_uvt, tarifa, tipo_codigo, activo }
 *   POST   { action: editar, id, concepto, base_uvt, tarifa, tipo_codigo, activo }
 *   POST   { action: eliminar, id }
 *   POST   { action: toggle, id }  → prende/apaga activo
 */
require_once '../config/database.php';
$db = (new Database())->getConnection();

try {
    if ($_SERVER['REQUEST_METHOD'] === 'GET') {
        $items = $db->query("
            SELECT Id_Concepto, concepto, base_uvt, tarifa, tipo_codigo, activo, Fecha_Creacion
            FROM tbl_conceptos_retefuente
            ORDER BY activo DESC, concepto ASC
        ")->fetchAll();

        $uvt = $db->query("SELECT uvt_valor, uvt_anio, uvt_actualizado_at FROM tbldatosempresa LIMIT 1")->fetch();

        echo json_encode([
            'success'   => true,
            'conceptos' => $items,
            'uvt'       => $uvt ?: ['uvt_valor' => 52374.00, 'uvt_anio' => 2026, 'uvt_actualizado_at' => null],
        ], JSON_UNESCAPED_UNICODE);
        exit;
    }

    if ($_SERVER['REQUEST_METHOD'] === 'POST') {
        $data = json_decode(file_get_contents('php://input'), true);
        $action = $data['action'] ?? '';

        if ($action === 'crear') {
            $concepto = trim((string)($data['concepto'] ?? ''));
            $baseUvt  = floatval($data['base_uvt'] ?? 0);
            $tarifa   = floatval($data['tarifa'] ?? 0);
            $tipo     = trim((string)($data['tipo_codigo'] ?? '06'));
            $activo   = intval($data['activo'] ?? 1);

            if ($concepto === '') { echo json_encode(['success'=>false,'message'=>'Concepto requerido']); exit; }
            if ($tarifa < 0 || $tarifa > 100) { echo json_encode(['success'=>false,'message'=>'Tarifa entre 0 y 100']); exit; }
            if (!in_array($tipo, ['05','06','07'], true)) { echo json_encode(['success'=>false,'message'=>'tipo_codigo inválido (05/06/07)']); exit; }

            $stmt = $db->prepare("INSERT INTO tbl_conceptos_retefuente (concepto, base_uvt, tarifa, tipo_codigo, activo) VALUES (?,?,?,?,?)");
            try { $stmt->execute([$concepto, $baseUvt, $tarifa, $tipo, $activo]); }
            catch (Throwable $e) {
                if (strpos($e->getMessage(), 'Duplicate') !== false) {
                    echo json_encode(['success'=>false,'message'=>'Ya existe un concepto con ese nombre']); exit;
                }
                throw $e;
            }
            echo json_encode(['success'=>true, 'id' => $db->lastInsertId(), 'message' => 'Concepto creado']);
            exit;
        }

        if ($action === 'editar') {
            $id = intval($data['id'] ?? 0);
            if (!$id) { echo json_encode(['success'=>false,'message'=>'id requerido']); exit; }
            $concepto = trim((string)($data['concepto'] ?? ''));
            $baseUvt  = floatval($data['base_uvt'] ?? 0);
            $tarifa   = floatval($data['tarifa'] ?? 0);
            $tipo     = trim((string)($data['tipo_codigo'] ?? '06'));
            $activo   = intval($data['activo'] ?? 1);

            $db->prepare("UPDATE tbl_conceptos_retefuente SET concepto=?, base_uvt=?, tarifa=?, tipo_codigo=?, activo=? WHERE Id_Concepto=?")
               ->execute([$concepto, $baseUvt, $tarifa, $tipo, $activo, $id]);
            echo json_encode(['success'=>true, 'message'=>'Concepto actualizado']);
            exit;
        }

        if ($action === 'toggle') {
            $id = intval($data['id'] ?? 0);
            if (!$id) { echo json_encode(['success'=>false,'message'=>'id requerido']); exit; }
            $db->prepare("UPDATE tbl_conceptos_retefuente SET activo = 1 - activo WHERE Id_Concepto=?")->execute([$id]);
            echo json_encode(['success'=>true]);
            exit;
        }

        if ($action === 'eliminar') {
            $id = intval($data['id'] ?? 0);
            if (!$id) { echo json_encode(['success'=>false,'message'=>'id requerido']); exit; }
            // No eliminar: desactivar para preservar históricos
            $db->prepare("UPDATE tbl_conceptos_retefuente SET activo=0 WHERE Id_Concepto=?")->execute([$id]);
            echo json_encode(['success'=>true, 'message'=>'Concepto desactivado (histórico preservado)']);
            exit;
        }

        echo json_encode(['success'=>false,'message'=>'Acción no reconocida']);
        exit;
    }

    http_response_code(405);
    echo json_encode(['success'=>false,'message'=>'Método no permitido']);
} catch (Throwable $e) {
    http_response_code(500);
    echo json_encode(['success'=>false,'message'=>$e->getMessage()]);
}
