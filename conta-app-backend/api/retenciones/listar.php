<?php
/**
 * Retenciones — CRUD de tipos globales
 * GET                      → todas las activas e inactivas
 * GET ?activas=1           → solo las activas (para usar en cliente/venta)
 * GET ?cliente=N           → retenciones que aplica el cliente N (usadas + disponibles)
 * POST {action,...}
 *   action=crear    {codigo, nombre, porcentaje, codigo_dian, activa}
 *   action=editar   {id, codigo, nombre, porcentaje, codigo_dian, activa}
 *   action=eliminar {id}   (solo si no tiene facturas históricas; si tiene, marcar inactiva)
 */
require_once '../config/database.php';

$db = (new Database())->getConnection();

try {
    if ($_SERVER['REQUEST_METHOD'] === 'GET') {
        if (isset($_GET['cliente'])) {
            $cli = intval($_GET['cliente']);
            $stmt = $db->prepare("SELECT Id_Retencion FROM tblcliente_retenciones WHERE CodigoClien = ?");
            $stmt->execute([$cli]);
            $ids = array_map('intval', array_column($stmt->fetchAll(), 'Id_Retencion'));

            $stmt = $db->prepare("SELECT retencion_modo FROM tblclientes WHERE CodigoClien = ?");
            $stmt->execute([$cli]);
            $cliData = $stmt->fetch();

            echo json_encode([
                'success' => true,
                'retenciones_aplicadas' => $ids,
                'modo' => $cliData['retencion_modo'] ?? 'gross_up'
            ], JSON_UNESCAPED_UNICODE);
            exit;
        }

        $where = "";
        if (isset($_GET['activas'])) $where = "WHERE Activa = 1";
        $stmt = $db->query("SELECT * FROM tblretenciones $where ORDER BY Activa DESC, Nombre ASC");
        $rows = $stmt->fetchAll();
        foreach ($rows as &$r) {
            $r['Porcentaje'] = floatval($r['Porcentaje']);
            $r['Activa'] = intval($r['Activa']);
        }
        echo json_encode(['success' => true, 'retenciones' => $rows], JSON_UNESCAPED_UNICODE);
        exit;
    }

    $data = json_decode(file_get_contents('php://input'), true);
    $action = $data['action'] ?? '';

    if ($action === 'crear' || $action === 'editar') {
        $codigo = strtoupper(trim($data['codigo'] ?? ''));
        $nombre = trim($data['nombre'] ?? '');
        $pct    = floatval($data['porcentaje'] ?? 0);
        $dian   = trim($data['codigo_dian'] ?? '') ?: null;
        $activa = !empty($data['activa']) ? 1 : 0;
        if (!$codigo || !$nombre || $pct < 0) { echo json_encode(['success' => false, 'message' => 'Datos inválidos']); exit; }

        if ($action === 'crear') {
            $db->prepare("INSERT INTO tblretenciones (Codigo, Nombre, Porcentaje, Codigo_Dian, Activa) VALUES (?, ?, ?, ?, ?)")
               ->execute([$codigo, $nombre, $pct, $dian, $activa]);
            echo json_encode(['success' => true, 'id' => $db->lastInsertId(), 'message' => 'Retención creada']);
        } else {
            $id = intval($data['id'] ?? 0);
            if (!$id) { echo json_encode(['success' => false, 'message' => 'ID requerido']); exit; }
            $db->prepare("UPDATE tblretenciones SET Codigo=?, Nombre=?, Porcentaje=?, Codigo_Dian=?, Activa=? WHERE Id_Retencion=?")
               ->execute([$codigo, $nombre, $pct, $dian, $activa, $id]);
            echo json_encode(['success' => true, 'message' => 'Retención actualizada']);
        }
        exit;
    }

    if ($action === 'eliminar') {
        $id = intval($data['id'] ?? 0);
        if (!$id) { echo json_encode(['success' => false, 'message' => 'ID requerido']); exit; }

        // Si tiene historial en ventas, solo inactivar
        $stmt = $db->prepare("SELECT COUNT(*) AS n FROM tblventa_retenciones WHERE Id_Retencion = ?");
        $stmt->execute([$id]);
        $n = intval($stmt->fetch()['n'] ?? 0);
        if ($n > 0) {
            $db->prepare("UPDATE tblretenciones SET Activa = 0 WHERE Id_Retencion = ?")->execute([$id]);
            echo json_encode(['success' => true, 'message' => "No se eliminó: tiene $n facturas históricas. Se marcó como inactiva."]);
        } else {
            $db->prepare("DELETE FROM tblretenciones WHERE Id_Retencion = ?")->execute([$id]);
            echo json_encode(['success' => true, 'message' => 'Retención eliminada']);
        }
        exit;
    }

    if ($action === 'set_cliente') {
        $cli = intval($data['cliente'] ?? 0);
        $ids = $data['retenciones'] ?? [];
        $modo = ($data['modo'] ?? 'gross_up') === 'informativo' ? 'informativo' : 'gross_up';
        if (!$cli) { echo json_encode(['success' => false, 'message' => 'Cliente requerido']); exit; }

        $db->beginTransaction();
        $db->prepare("UPDATE tblclientes SET retencion_modo = ? WHERE CodigoClien = ?")->execute([$modo, $cli]);
        $db->prepare("DELETE FROM tblcliente_retenciones WHERE CodigoClien = ?")->execute([$cli]);
        if (is_array($ids) && count($ids) > 0) {
            $ins = $db->prepare("INSERT INTO tblcliente_retenciones (CodigoClien, Id_Retencion) VALUES (?, ?)");
            foreach ($ids as $idRet) {
                $idRet = intval($idRet);
                if ($idRet > 0) $ins->execute([$cli, $idRet]);
            }
        }
        $db->commit();
        echo json_encode(['success' => true, 'message' => 'Retenciones del cliente actualizadas']);
        exit;
    }

    echo json_encode(['success' => false, 'message' => "Acción no válida: $action"]);
} catch (Exception $e) {
    if ($db->inTransaction()) $db->rollBack();
    echo json_encode(['success' => false, 'message' => $e->getMessage()]);
}
