<?php
/**
 * CRUD de bodegas + traslados de producto entre bodegas.
 *
 * GET /api/bodegas/                    → lista de bodegas (con conteo de productos)
 * POST action=crear                     → crear bodega
 * POST action=editar                    → editar bodega existente
 * POST action=eliminar                  → eliminar (solo si no tiene productos y no es principal)
 * POST action=marcar_principal          → cambiar cuál es la Principal
 * POST action=trasladar                 → mover producto entero de una bodega a otra
 * GET  ?traslados=1                     → historial de traslados
 */
require_once '../config/database.php';
$db = (new Database())->getConnection();
header('Content-Type: application/json; charset=utf-8');

try {
    if ($_SERVER['REQUEST_METHOD'] === 'GET') {
        if (!empty($_GET['traslados'])) {
            // Historial (últimos 200)
            $stmt = $db->query("
                SELECT t.*,
                       bo.Nombre AS Origen_Nombre,
                       bd.Nombre AS Destino_Nombre,
                       a.Codigo, a.Nombres_Articulo,
                       u.Nombre AS NombreUsuario
                FROM tbl_traslados_bodega t
                LEFT JOIN tblbodegas bo ON bo.Id_Bodega = t.Id_Bodega_Origen
                LEFT JOIN tblbodegas bd ON bd.Id_Bodega = t.Id_Bodega_Destino
                LEFT JOIN tblarticulos a ON a.Items = t.Items
                LEFT JOIN tblusuarios u ON u.Id_Usuario = t.Id_Usuario
                ORDER BY t.Id_Traslado DESC
                LIMIT 200
            ");
            echo json_encode(['success' => true, 'traslados' => $stmt->fetchAll(PDO::FETCH_ASSOC)], JSON_UNESCAPED_UNICODE);
            exit;
        }

        // Lista de bodegas con conteo de productos
        $stmt = $db->query("
            SELECT b.*,
                   (SELECT COUNT(*) FROM tblarticulos a WHERE a.Id_Bodega = b.Id_Bodega) AS productos
            FROM tblbodegas b
            ORDER BY b.Principal DESC, b.Nombre ASC
        ");
        echo json_encode(['success' => true, 'bodegas' => $stmt->fetchAll(PDO::FETCH_ASSOC)], JSON_UNESCAPED_UNICODE);
        exit;
    }

    if ($_SERVER['REQUEST_METHOD'] === 'POST') {
        $data = json_decode(file_get_contents('php://input'), true);
        $action = $data['action'] ?? '';

        if ($action === 'crear') {
            $nombre = trim($data['nombre'] ?? '');
            if ($nombre === '') { echo json_encode(['success' => false, 'message' => 'El nombre es obligatorio']); exit; }
            $direccion = trim($data['direccion'] ?? '') ?: null;
            $telefono  = trim($data['telefono']  ?? '') ?: null;
            $activa    = isset($data['activa']) ? (int)$data['activa'] : 1;

            $stmt = $db->prepare("INSERT INTO tblbodegas (Nombre, Direccion, Telefono, Principal, Activa) VALUES (?, ?, ?, 0, ?)");
            try {
                $stmt->execute([$nombre, $direccion, $telefono, $activa]);
                echo json_encode(['success' => true, 'id' => $db->lastInsertId(), 'message' => 'Bodega creada']);
            } catch (PDOException $e) {
                if ($e->getCode() === '23000') {
                    echo json_encode(['success' => false, 'message' => "Ya existe una bodega con el nombre \"$nombre\""]);
                } else throw $e;
            }
            exit;
        }

        if ($action === 'editar') {
            $id = intval($data['id'] ?? 0);
            if ($id <= 0) { echo json_encode(['success' => false, 'message' => 'id requerido']); exit; }
            $nombre = trim($data['nombre'] ?? '');
            if ($nombre === '') { echo json_encode(['success' => false, 'message' => 'El nombre es obligatorio']); exit; }
            $direccion = trim($data['direccion'] ?? '') ?: null;
            $telefono  = trim($data['telefono']  ?? '') ?: null;
            $activa    = isset($data['activa']) ? (int)$data['activa'] : 1;

            $stmt = $db->prepare("UPDATE tblbodegas SET Nombre = ?, Direccion = ?, Telefono = ?, Activa = ? WHERE Id_Bodega = ?");
            $stmt->execute([$nombre, $direccion, $telefono, $activa, $id]);
            echo json_encode(['success' => true, 'message' => 'Bodega actualizada']);
            exit;
        }

        if ($action === 'eliminar') {
            $id = intval($data['id'] ?? 0);
            if ($id <= 0) { echo json_encode(['success' => false, 'message' => 'id requerido']); exit; }
            // Guarda-rail 1: no borrar la principal
            $row = $db->query("SELECT Principal FROM tblbodegas WHERE Id_Bodega = $id")->fetch(PDO::FETCH_ASSOC);
            if (!$row) { echo json_encode(['success' => false, 'message' => 'Bodega no encontrada']); exit; }
            if ($row['Principal']) { echo json_encode(['success' => false, 'message' => 'No se puede eliminar la Bodega Principal. Marca otra como principal primero.']); exit; }
            // Guarda-rail 2: no borrar si tiene productos
            $n = (int)$db->query("SELECT COUNT(*) FROM tblarticulos WHERE Id_Bodega = $id")->fetchColumn();
            if ($n > 0) { echo json_encode(['success' => false, 'message' => "No se puede eliminar: $n productos están asignados a esta bodega. Traslada esos productos antes."]); exit; }

            $db->prepare("DELETE FROM tblbodegas WHERE Id_Bodega = ?")->execute([$id]);
            echo json_encode(['success' => true, 'message' => 'Bodega eliminada']);
            exit;
        }

        if ($action === 'marcar_principal') {
            $id = intval($data['id'] ?? 0);
            if ($id <= 0) { echo json_encode(['success' => false, 'message' => 'id requerido']); exit; }
            $db->beginTransaction();
            $db->exec("UPDATE tblbodegas SET Principal = 0");
            $db->prepare("UPDATE tblbodegas SET Principal = 1, Activa = 1 WHERE Id_Bodega = ?")->execute([$id]);
            $db->commit();
            echo json_encode(['success' => true, 'message' => 'Bodega marcada como principal']);
            exit;
        }

        if ($action === 'trasladar') {
            $items    = intval($data['items'] ?? 0);
            $destino  = intval($data['id_bodega_destino'] ?? 0);
            $coment   = trim($data['comentario'] ?? '') ?: null;
            $idUser   = intval($data['id_usuario'] ?? 0) ?: null;
            if ($items <= 0 || $destino <= 0) { echo json_encode(['success' => false, 'message' => 'items y bodega destino requeridos']); exit; }

            // Verificar producto y bodega origen actual
            $art = $db->query("SELECT Items, Codigo, Nombres_Articulo, Existencia, Id_Bodega FROM tblarticulos WHERE Items = $items")->fetch(PDO::FETCH_ASSOC);
            if (!$art) { echo json_encode(['success' => false, 'message' => 'Producto no encontrado']); exit; }
            $origen = (int)$art['Id_Bodega'];
            if ($origen === $destino) { echo json_encode(['success' => false, 'message' => 'El producto ya está en esa bodega']); exit; }

            // Verificar bodega destino existe y está activa
            $bod = $db->query("SELECT Id_Bodega, Nombre, Activa FROM tblbodegas WHERE Id_Bodega = $destino")->fetch(PDO::FETCH_ASSOC);
            if (!$bod) { echo json_encode(['success' => false, 'message' => 'Bodega destino no existe']); exit; }
            if (!$bod['Activa']) { echo json_encode(['success' => false, 'message' => 'La bodega destino está inactiva']); exit; }

            // Ejecutar traslado + registrar historial en una transacción
            $db->beginTransaction();
            $db->prepare("UPDATE tblarticulos SET Id_Bodega = ? WHERE Items = ?")->execute([$destino, $items]);
            $db->prepare("
                INSERT INTO tbl_traslados_bodega
                    (Id_Bodega_Origen, Id_Bodega_Destino, Items, Cantidad, Comentario, Id_Usuario)
                VALUES (?, ?, ?, ?, ?, ?)
            ")->execute([$origen, $destino, $items, $art['Existencia'], $coment, $idUser]);
            $db->commit();

            echo json_encode([
                'success' => true,
                'message' => "\"{$art['Nombres_Articulo']}\" trasladado a \"{$bod['Nombre']}\"",
                'origen' => $origen, 'destino' => $destino,
            ]);
            exit;
        }

        echo json_encode(['success' => false, 'message' => 'Acción desconocida']);
        exit;
    }

    echo json_encode(['success' => false, 'message' => 'Método no soportado']);
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => $e->getMessage()]);
}
