<?php
require_once '../config/database.php';
$database = new Database();
$db = $database->getConnection();
$method = $_SERVER['REQUEST_METHOD'];

try {
    if ($method === 'GET') {
        $id = isset($_GET['id']) ? intval($_GET['id']) : 0;
        if ($id > 0) {
            // Cargar una factura abierta con detalle
            $stmt = $db->prepare("SELECT * FROM facturasv_abiertas WHERE id_fac_ab = ?");
            $stmt->execute([$id]);
            $fac = $stmt->fetch();
            if (!$fac) { echo json_encode(['success' => false, 'message' => 'No encontrada']); exit; }

            $stmt2 = $db->prepare("
                SELECT d.*, a.Codigo, a.Nombres_Articulo, a.Existencia, a.Precio_Costo, a.Iva
                FROM detalle_fact_abietas d
                INNER JOIN tblarticulos a ON d.item_pro = a.Items
                WHERE d.id_fac_ab = ?
            ");
            $stmt2->execute([$id]);
            $detalle = $stmt2->fetchAll();

            echo json_encode(['success' => true, 'factura' => $fac, 'detalle' => $detalle], JSON_UNESCAPED_UNICODE);
        } else {
            // Listar todas
            $stmt = $db->query("SELECT f.*, c.Razon_Social as NombreCliente FROM facturasv_abiertas f LEFT JOIN tblclientes c ON f.codigo_cli = c.CodigoClien ORDER BY f.fecha_hora_creado DESC");
            echo json_encode(['success' => true, 'facturas' => $stmt->fetchAll()], JSON_UNESCAPED_UNICODE);
        }
    } elseif ($method === 'POST') {
        $data = json_decode(file_get_contents('php://input'), true);
        $action = $data['action'] ?? 'create';

        if ($action === 'delete') {
            $id = intval($data['id']);
            $db->beginTransaction();
            $db->prepare("DELETE FROM detalle_fact_abietas WHERE id_fac_ab = ?")->execute([$id]);
            $db->prepare("DELETE FROM facturasv_abiertas WHERE id_fac_ab = ?")->execute([$id]);
            $db->commit();
            echo json_encode(['success' => true, 'message' => 'Factura abierta eliminada']);
        } else {
            $id = intval($data['id'] ?? 0);
            $fecha = date('Y-m-d');
            $termino = $data['termino'] ?? 'Contado';
            $dias = intval($data['dias'] ?? 0);
            $codigo_cli = intval($data['codigo_cli'] ?? 130500);
            $identificacion = $data['identificacion_cli'] ?? '0';
            $nombres = $data['nombres_cli'] ?? 'VENTAS AL CONTADO';
            $lista_precio = intval($data['lista_precio'] ?? 0);
            $total = floatval($data['total_factura'] ?? 0);
            $items = $data['items'] ?? [];

            $db->beginTransaction();

            if ($id > 0) {
                $stmt = $db->prepare("UPDATE facturasv_abiertas SET fecha=?, termino=?, dias=?, codigo_cli=?, identificacion_cli=?, nombres_cli=?, lista_precio=?, total_factura=? WHERE id_fac_ab=?");
                $stmt->execute([$fecha, $termino, $dias, $codigo_cli, $identificacion, $nombres, $lista_precio, $total, $id]);
                $db->prepare("DELETE FROM detalle_fact_abietas WHERE id_fac_ab = ?")->execute([$id]);
            } else {
                $stmt = $db->prepare("INSERT INTO facturasv_abiertas (fecha, termino, dias, codigo_cli, identificacion_cli, nombres_cli, lista_precio, total_factura, fecha_hora_creado) VALUES (?,?,?,?,?,?,?,?,NOW())");
                $stmt->execute([$fecha, $termino, $dias, $codigo_cli, $identificacion, $nombres, $lista_precio, $total]);
                $id = $db->lastInsertId();
            }

            foreach ($items as $item) {
                $stmt = $db->prepare("INSERT INTO detalle_fact_abietas (id_fac_ab, item_pro, cant_pro, precio_v, descuento) VALUES (?,?,?,?,?)");
                $stmt->execute([$id, $item['items'], $item['cantidad'], $item['precio'], $item['descuento'] ?? 0]);
            }

            $db->commit();
            echo json_encode(['success' => true, 'message' => 'Factura abierta guardada', 'id' => $id]);
        }
    }
} catch (Exception $e) {
    if ($db->inTransaction()) $db->rollBack();
    echo json_encode(['success' => false, 'message' => $e->getMessage()]);
}
?>
