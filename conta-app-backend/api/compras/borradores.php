<?php
/**
 * Borradores de compra — persisten en BD (tbl_borradores_compra) para que
 * el cliente pueda armar una compra grande, cerrar la app, y retomarla al
 * día siguiente sin depender de localStorage (que puede ser limpiado por
 * antivirus u optimizadores del sistema).
 *
 * GET  ?listar=1                       → lista todos los borradores
 * POST { action:"guardar", ...datos }  → crea o actualiza (si viene id)
 * POST { action:"cargar",   id }       → devuelve el borrador completo
 * POST { action:"eliminar", id }       → borra el borrador
 *
 * La tabla se autocrea si no existe (idempotente) — sin necesidad de
 * ejecutar migracion previa. Los borradores NO tocan tblpedidos ni
 * tblkardex — es solo un almacen JSON.
 */
require_once '../config/database.php';
header('Content-Type: application/json; charset=utf-8');

$database = new Database();
$db = $database->getConnection();

// Auto-crear tabla si no existe. Idempotente.
$db->exec("CREATE TABLE IF NOT EXISTS tbl_borradores_compra (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(120) DEFAULT NULL,
    id_usuario INT DEFAULT NULL,
    tipo VARCHAR(15) DEFAULT 'Credito',
    dias INT DEFAULT 30,
    fecha DATE DEFAULT NULL,
    factura_compra VARCHAR(50) DEFAULT NULL,
    cod_proveedor INT DEFAULT 0,
    proveedor_nombre VARCHAR(150) DEFAULT NULL,
    proveedor_nit VARCHAR(50) DEFAULT NULL,
    opcion_iva INT DEFAULT 0,
    flete DECIMAL(19,4) DEFAULT 0,
    descuento DECIMAL(19,4) DEFAULT 0,
    retencion DECIMAL(19,4) DEFAULT 0,
    total DECIMAL(19,4) DEFAULT 0,
    lineas_json LONGTEXT NOT NULL,
    lineas_count INT DEFAULT 0,
    fecha_creacion DATETIME DEFAULT CURRENT_TIMESTAMP,
    fecha_modificacion DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    KEY idx_usuario (id_usuario),
    KEY idx_fecha_mod (fecha_modificacion)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");

try {
    $method = $_SERVER['REQUEST_METHOD'];

    if ($method === 'GET' && isset($_GET['listar'])) {
        $idUsuario = intval($_GET['id_usuario'] ?? 0);
        $where = $idUsuario > 0 ? 'WHERE id_usuario = ?' : '';
        $params = $idUsuario > 0 ? [$idUsuario] : [];
        $stmt = $db->prepare("
            SELECT id, nombre, tipo, dias, fecha, factura_compra,
                   cod_proveedor, proveedor_nombre, proveedor_nit,
                   total, lineas_count, fecha_creacion, fecha_modificacion
              FROM tbl_borradores_compra
              $where
             ORDER BY fecha_modificacion DESC
             LIMIT 100
        ");
        $stmt->execute($params);
        echo json_encode([
            'success' => true,
            'borradores' => $stmt->fetchAll(PDO::FETCH_ASSOC)
        ], JSON_UNESCAPED_UNICODE);
        exit;
    }

    if ($method !== 'POST') {
        http_response_code(405);
        echo json_encode(['success' => false, 'message' => 'Metodo no permitido']);
        exit;
    }

    $data = json_decode(file_get_contents('php://input'), true) ?: [];
    $action = $data['action'] ?? '';

    if ($action === 'cargar') {
        $id = intval($data['id'] ?? 0);
        if (!$id) { echo json_encode(['success' => false, 'message' => 'id requerido']); exit; }
        $stmt = $db->prepare("SELECT * FROM tbl_borradores_compra WHERE id = ?");
        $stmt->execute([$id]);
        $b = $stmt->fetch(PDO::FETCH_ASSOC);
        if (!$b) { echo json_encode(['success' => false, 'message' => 'Borrador no encontrado']); exit; }
        $b['lineas'] = json_decode($b['lineas_json'] ?? '[]', true) ?: [];
        unset($b['lineas_json']);
        echo json_encode(['success' => true, 'borrador' => $b], JSON_UNESCAPED_UNICODE);
        exit;
    }

    if ($action === 'eliminar') {
        $id = intval($data['id'] ?? 0);
        if (!$id) { echo json_encode(['success' => false, 'message' => 'id requerido']); exit; }
        $db->prepare("DELETE FROM tbl_borradores_compra WHERE id = ?")->execute([$id]);
        echo json_encode(['success' => true, 'message' => 'Borrador eliminado']);
        exit;
    }

    if ($action === 'guardar') {
        $id            = intval($data['id'] ?? 0);
        $nombre        = trim((string)($data['nombre'] ?? ''));
        $idUsuario     = intval($data['id_usuario'] ?? 0) ?: null;
        $tipo          = $data['tipo'] ?? 'Credito';
        $dias          = intval($data['dias'] ?? 0);
        $fecha         = $data['fecha'] ?? date('Y-m-d');
        $facturaCompra = trim((string)($data['factura_compra'] ?? ''));
        $codProv       = intval($data['cod_proveedor'] ?? 0);
        $provNombre    = trim((string)($data['proveedor_nombre'] ?? ''));
        $provNit       = trim((string)($data['proveedor_nit'] ?? ''));
        $opcionIva     = intval($data['opcion_iva'] ?? 0);
        $flete         = floatval($data['flete'] ?? 0);
        $descuento     = floatval($data['descuento'] ?? 0);
        $retencion     = floatval($data['retencion'] ?? 0);
        $total         = floatval($data['total'] ?? 0);
        $lineas        = $data['lineas'] ?? [];
        $lineasJson    = json_encode($lineas, JSON_UNESCAPED_UNICODE);
        $lineasCount   = is_array($lineas) ? count($lineas) : 0;

        // Nombre por defecto util para identificarlo en la lista
        if ($nombre === '') {
            $nombre = ($provNombre !== '' ? $provNombre : 'Compra sin proveedor')
                    . ' · ' . $lineasCount . ' línea(s) · ' . date('d/m H:i');
        }

        if ($id > 0) {
            // Actualizar borrador existente
            $stmt = $db->prepare("
                UPDATE tbl_borradores_compra SET
                    nombre = ?, tipo = ?, dias = ?, fecha = ?, factura_compra = ?,
                    cod_proveedor = ?, proveedor_nombre = ?, proveedor_nit = ?,
                    opcion_iva = ?, flete = ?, descuento = ?, retencion = ?,
                    total = ?, lineas_json = ?, lineas_count = ?
                WHERE id = ?
            ");
            $stmt->execute([
                $nombre, $tipo, $dias, $fecha, $facturaCompra,
                $codProv, $provNombre, $provNit,
                $opcionIva, $flete, $descuento, $retencion,
                $total, $lineasJson, $lineasCount, $id
            ]);
            echo json_encode(['success' => true, 'id' => $id, 'message' => 'Borrador actualizado']);
        } else {
            // Nuevo borrador
            $stmt = $db->prepare("
                INSERT INTO tbl_borradores_compra
                    (nombre, id_usuario, tipo, dias, fecha, factura_compra,
                     cod_proveedor, proveedor_nombre, proveedor_nit,
                     opcion_iva, flete, descuento, retencion,
                     total, lineas_json, lineas_count)
                VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
            ");
            $stmt->execute([
                $nombre, $idUsuario, $tipo, $dias, $fecha, $facturaCompra,
                $codProv, $provNombre, $provNit,
                $opcionIva, $flete, $descuento, $retencion,
                $total, $lineasJson, $lineasCount
            ]);
            echo json_encode(['success' => true, 'id' => intval($db->lastInsertId()), 'message' => 'Borrador guardado']);
        }
        exit;
    }

    echo json_encode(['success' => false, 'message' => "Accion desconocida: $action"]);
} catch (\Throwable $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => $e->getMessage()]);
}
