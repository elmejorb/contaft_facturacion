<?php
require_once '../config/database.php';
$database = new Database();
$db = $database->getConnection();
$method = $_SERVER['REQUEST_METHOD'];

try {
    if ($method === 'GET') {
        $id = isset($_GET['id']) ? intval($_GET['id']) : 0;
        if ($id > 0) {
            $stmt = $db->prepare("SELECT * FROM tblcotizaciones WHERE id_cotizacion = ?");
            $stmt->execute([$id]);
            $cotiz = $stmt->fetch();
            if (!$cotiz) { echo json_encode(['success' => false, 'message' => 'No encontrada']); exit; }

            $stmt2 = $db->prepare("
                SELECT d.*, a.Codigo, a.Nombres_Articulo, a.Existencia, a.Precio_Costo, a.Iva
                FROM detalle_cotizacion d
                INNER JOIN tblarticulos a ON d.item_pro = a.Items
                WHERE d.id_cotizacion = ?
            ");
            $stmt2->execute([$id]);
            echo json_encode(['success' => true, 'cotizacion' => $cotiz, 'detalle' => $stmt2->fetchAll()], JSON_UNESCAPED_UNICODE);
        } else {
            $stmt = $db->query("SELECT c.*, cl.Razon_Social as NombreCliente FROM tblcotizaciones c LEFT JOIN tblclientes cl ON c.codigo_cli = cl.CodigoClien ORDER BY c.fecha_hora_creado DESC");
            echo json_encode(['success' => true, 'cotizaciones' => $stmt->fetchAll()], JSON_UNESCAPED_UNICODE);
        }
    } elseif ($method === 'POST') {
        $data = json_decode(file_get_contents('php://input'), true);
        $action = $data['action'] ?? 'create';

        if ($action === 'delete') {
            $id = intval($data['id']);
            $db->beginTransaction();
            $db->prepare("DELETE FROM detalle_cotizacion WHERE id_cotizacion = ?")->execute([$id]);
            $db->prepare("DELETE FROM tblcotizaciones WHERE id_cotizacion = ?")->execute([$id]);
            $db->commit();
            echo json_encode(['success' => true, 'message' => 'Cotización eliminada']);
        } elseif ($action === 'to-sale') {
            // Convertir cotización a venta — solo devuelve los datos para cargar en NuevaVenta
            $id = intval($data['id']);
            $stmt = $db->prepare("SELECT * FROM tblcotizaciones WHERE id_cotizacion = ?");
            $stmt->execute([$id]);
            $cotiz = $stmt->fetch();

            $stmt2 = $db->prepare("
                SELECT d.*, a.Codigo, a.Nombres_Articulo, a.Existencia, a.Precio_Costo, a.Iva
                FROM detalle_cotizacion d
                INNER JOIN tblarticulos a ON d.item_pro = a.Items
                WHERE d.id_cotizacion = ?
            ");
            $stmt2->execute([$id]);
            echo json_encode(['success' => true, 'cotizacion' => $cotiz, 'detalle' => $stmt2->fetchAll()], JSON_UNESCAPED_UNICODE);
        } else {
            $id = intval($data['id'] ?? 0);
            $fecha = date('Y-m-d');
            $termino = intval($data['termino'] ?? 0);
            $dias = intval($data['dias'] ?? 0);
            $codigo_cli = intval($data['codigo_cli'] ?? 130500);
            $nombre = $data['nombre_cliente'] ?? 'VENTAS AL CONTADO';
            $telefono = $data['telefono_cli'] ?? '0';
            $total = floatval($data['total_factura'] ?? 0);
            $items = $data['items'] ?? [];

            $db->beginTransaction();

            if ($id > 0) {
                $stmt = $db->prepare("UPDATE tblcotizaciones SET fecha=?, termino=?, dias=?, codigo_cli=?, nombre_cliente=?, telefono_cli=?, total_factura=? WHERE id_cotizacion=?");
                $stmt->execute([$fecha, $termino, $dias, $codigo_cli, $nombre, $telefono, $total, $id]);
                $db->prepare("DELETE FROM detalle_cotizacion WHERE id_cotizacion = ?")->execute([$id]);
            } else {
                $stmt = $db->prepare("INSERT INTO tblcotizaciones (fecha, termino, dias, codigo_cli, nombre_cliente, telefono_cli, total_factura, fecha_hora_creado) VALUES (?,?,?,?,?,?,?,NOW())");
                $stmt->execute([$fecha, $termino, $dias, $codigo_cli, $nombre, $telefono, $total]);
                $id = $db->lastInsertId();
            }

            foreach ($items as $item) {
                $stmt = $db->prepare("INSERT INTO detalle_cotizacion (id_cotizacion, item_pro, cant_pro, precio_v, descuento) VALUES (?,?,?,?,?)");
                $stmt->execute([$id, $item['items'], $item['cantidad'], $item['precio'], $item['descuento'] ?? 0]);
            }

            $db->commit();
            echo json_encode(['success' => true, 'message' => 'Cotización guardada', 'id' => $id]);
        }
    }
} catch (Exception $e) {
    if ($db->inTransaction()) $db->rollBack();
    echo json_encode(['success' => false, 'message' => $e->getMessage()]);
}
?>
