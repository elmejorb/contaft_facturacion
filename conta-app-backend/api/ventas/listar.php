<?php
/**
 * Listado de ventas con filtros
 * GET ?mes=3&anio=2026&tipo=Contado&estado=Valida&cliente=130500
 * GET ?id=X → detalle de factura con items
 */

require_once '../config/database.php';

$database = new Database();
$db = $database->getConnection();

try {
    $id = $_GET['id'] ?? null;

    if ($id) {
        // Detalle de factura
        $stmt = $db->prepare("
            SELECT v.*, u.Nombre as NombreUsuario, m.nombre_medio as MedioPago
            FROM tblventas v
            LEFT JOIN tblusuarios u ON v.Id_Usuario = u.Id_Usuario
            LEFT JOIN tblmedios_pago m ON v.id_mediopago = m.id_mediopago
            WHERE v.Factura_N = :id
        ");
        $stmt->execute([':id' => $id]);
        $factura = $stmt->fetch();

        if (!$factura) {
            http_response_code(404);
            echo json_encode(["success" => false, "message" => "Factura no encontrada"]);
            exit;
        }

        // Items
        $stmt = $db->prepare("
            SELECT d.*, a.Codigo, a.Nombres_Articulo
            FROM tbldetalle_venta d
            LEFT JOIN tblarticulos a ON d.Items = a.Items
            WHERE d.Factura_N = :id
        ");
        $stmt->execute([':id' => $id]);
        $items = $stmt->fetchAll();

        foreach ($items as &$item) {
            $item['Cantidad'] = floatval($item['Cantidad']);
            $item['PrecioC'] = floatval($item['PrecioC']);
            $item['PrecioV'] = floatval($item['PrecioV']);
            $item['Subtotal'] = floatval($item['Subtotal']);
            $item['Descuento'] = floatval($item['Descuento']);
        }

        echo json_encode([
            "success" => true,
            "factura" => $factura,
            "items" => $items,
            "total_items" => count($items)
        ], JSON_UNESCAPED_UNICODE);

    } else {
        // Listado con filtros
        $mes = $_GET['mes'] ?? null;
        $anio = $_GET['anio'] ?? date('Y');
        $tipo = $_GET['tipo'] ?? null;
        $estado = $_GET['estado'] ?? 'Valida';
        $cliente = $_GET['cliente'] ?? null;
        $limit = $_GET['limit'] ?? 500;

        $where = "YEAR(v.Fecha) = :anio";
        $params = [':anio' => $anio];

        if ($mes) {
            $where .= " AND MONTH(v.Fecha) = :mes";
            $params[':mes'] = $mes;
        }
        if ($tipo) {
            $where .= " AND v.Tipo = :tipo";
            $params[':tipo'] = $tipo;
        }
        // 'Todas' o vacío = sin filtro de estado
        if ($estado && $estado !== 'Todas') {
            $where .= " AND v.EstadoFact = :estado";
            $params[':estado'] = $estado;
        }
        if ($cliente) {
            $where .= " AND v.CodigoCli = :cliente";
            $params[':cliente'] = $cliente;
        }
        $buscar = $_GET['buscar'] ?? null;
        if ($buscar) {
            $where .= " AND (v.Factura_N = :buscar_exact OR v.A_nombre LIKE :buscar_like OR v.Identificacion LIKE :buscar_like)";
            $params[':buscar_exact'] = intval($buscar);
            $params[':buscar_like'] = "%$buscar%";
        }

        $stmt = $db->prepare("
            SELECT v.Factura_N, v.Fecha, v.Tipo, v.CodigoCli, v.A_nombre, v.Identificacion,
                   v.Total, v.Saldo, v.EstadoFact, v.Descuento, v.Impuesto,
                   v.id_mediopago, v.Hora, v.Id_Usuario, v.enviada_dian, v.cufe,
                   COALESCE(m.nombre_medio, 'Efectivo') as MedioPago,
                   COALESCE(u.Nombre, '') as NombreUsuario,
                   (SELECT COUNT(*) FROM tbldetalle_venta d WHERE d.Factura_N = v.Factura_N) as Total_Items
            FROM tblventas v
            LEFT JOIN tblmedios_pago m ON v.id_mediopago = m.id_mediopago
            LEFT JOIN tblusuarios u ON v.Id_Usuario = u.Id_Usuario
            WHERE $where
            ORDER BY v.Factura_N DESC
            LIMIT " . intval($limit)
        );
        $stmt->execute($params);
        $ventas = $stmt->fetchAll();

        foreach ($ventas as &$v) {
            $v['Total'] = floatval($v['Total']);
            $v['Saldo'] = floatval($v['Saldo']);
            $v['Descuento'] = floatval($v['Descuento']);
            $v['Impuesto'] = floatval($v['Impuesto']);
            $v['Total_Items'] = intval($v['Total_Items']);
        }

        // Resumen
        $totalFacturas = count($ventas);
        $totalMonto = array_sum(array_column($ventas, 'Total'));
        $totalContado = array_sum(array_map(fn($v) => $v['Tipo'] === 'Contado' ? $v['Total'] : 0, $ventas));
        $totalCredito = array_sum(array_map(fn($v) => $v['Tipo'] !== 'Contado' ? $v['Total'] : 0, $ventas));

        // Años disponibles
        $stmtAnios = $db->query("SELECT DISTINCT YEAR(Fecha) as anio FROM tblventas ORDER BY anio DESC");
        $aniosDisp = array_column($stmtAnios->fetchAll(), 'anio');

        echo json_encode([
            "success" => true,
            "ventas" => $ventas,
            "total" => $totalFacturas,
            "anios_disponibles" => $aniosDisp,
            "resumen" => [
                "total_facturas" => $totalFacturas,
                "monto_total" => $totalMonto,
                "contado" => $totalContado,
                "credito" => $totalCredito
            ]
        ], JSON_UNESCAPED_UNICODE);
    }

} catch(Exception $e) {
    http_response_code(500);
    echo json_encode(["success" => false, "message" => $e->getMessage()]);
}
?>
