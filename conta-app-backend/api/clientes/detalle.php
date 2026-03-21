<?php
/**
 * Detalle completo de un cliente: ventas, productos más comprados, gráfico mensual
 * GET ?id=X&anio=2025
 */

require_once '../config/database.php';

$database = new Database();
$db = $database->getConnection();

$id = $_GET['id'] ?? null;
$anio = $_GET['anio'] ?? date('Y');

if (!$id) {
    http_response_code(400);
    echo json_encode(["success" => false, "message" => "ID de cliente requerido"]);
    exit;
}

try {
    // Datos del cliente
    $stmt = $db->prepare("SELECT * FROM tblclientes WHERE CodigoClien = :id");
    $stmt->execute([':id' => $id]);
    $cliente = $stmt->fetch();

    if (!$cliente) {
        http_response_code(404);
        echo json_encode(["success" => false, "message" => "Cliente no encontrado"]);
        exit;
    }

    // Ventas del año
    $stmt = $db->prepare("
        SELECT v.Factura_N, v.Fecha, v.Total, v.Saldo, v.EstadoFact, v.pagada,
               v.N_Mes, v.Tipo
        FROM tblventas v
        WHERE v.CodigoCli = :id AND YEAR(v.Fecha) = :anio
        ORDER BY v.Fecha DESC
    ");
    $stmt->execute([':id' => $id, ':anio' => $anio]);
    $ventas = $stmt->fetchAll();

    foreach ($ventas as &$v) {
        $v['Total'] = floatval($v['Total']);
        $v['Saldo'] = floatval($v['Saldo']);
    }

    // Resumen del año
    $stmt = $db->prepare("
        SELECT COUNT(*) as total_facturas,
               COALESCE(SUM(Total), 0) as monto_total,
               COALESCE(SUM(Saldo), 0) as saldo_pendiente
        FROM tblventas
        WHERE CodigoCli = :id AND YEAR(Fecha) = :anio
    ");
    $stmt->execute([':id' => $id, ':anio' => $anio]);
    $resumenAnio = $stmt->fetch();
    $resumenAnio['monto_total'] = floatval($resumenAnio['monto_total']);
    $resumenAnio['saldo_pendiente'] = floatval($resumenAnio['saldo_pendiente']);

    // Top productos más comprados (últimos 12 meses)
    $stmt = $db->prepare("
        SELECT a.Nombres_Articulo, a.Codigo,
               SUM(d.Cantidad) as total_cantidad,
               COUNT(DISTINCT d.Factura_N) as veces_comprado,
               SUM(d.Subtotal) as monto_total,
               ROUND(AVG(d.PrecioV), 0) as precio_promedio
        FROM tbldetalle_venta d
        INNER JOIN tblventas v ON d.Factura_N = v.Factura_N
        INNER JOIN tblarticulos a ON d.Items = a.Items
        WHERE v.CodigoCli = :id AND v.Fecha >= DATE_SUB(CURDATE(), INTERVAL 12 MONTH)
        GROUP BY a.Items, a.Nombres_Articulo, a.Codigo
        ORDER BY total_cantidad DESC
        LIMIT 20
    ");
    $stmt->execute([':id' => $id]);
    $topProductos = $stmt->fetchAll();

    foreach ($topProductos as &$p) {
        $p['total_cantidad'] = floatval($p['total_cantidad']);
        $p['monto_total'] = floatval($p['monto_total']);
        $p['precio_promedio'] = floatval($p['precio_promedio']);
        $p['veces_comprado'] = intval($p['veces_comprado']);
    }

    // Gráfico: ventas por mes del año
    $stmt = $db->prepare("
        SELECT MONTH(Fecha) as mes,
               COUNT(*) as facturas,
               COALESCE(SUM(Total), 0) as monto
        FROM tblventas
        WHERE CodigoCli = :id AND YEAR(Fecha) = :anio
        GROUP BY MONTH(Fecha)
        ORDER BY mes
    ");
    $stmt->execute([':id' => $id, ':anio' => $anio]);
    $ventasMes = $stmt->fetchAll();

    // Fill all 12 months
    $meses = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
    $grafico = [];
    $ventasPorMes = [];
    foreach ($ventasMes as $vm) {
        $ventasPorMes[intval($vm['mes'])] = $vm;
    }
    for ($i = 1; $i <= 12; $i++) {
        $grafico[] = [
            'mes' => $i,
            'nombre' => $meses[$i - 1],
            'facturas' => intval($ventasPorMes[$i]['facturas'] ?? 0),
            'monto' => floatval($ventasPorMes[$i]['monto'] ?? 0),
        ];
    }

    // Años disponibles
    $stmt = $db->prepare("SELECT DISTINCT YEAR(Fecha) as anio FROM tblventas WHERE CodigoCli = :id ORDER BY anio DESC");
    $stmt->execute([':id' => $id]);
    $aniosDisp = array_column($stmt->fetchAll(), 'anio');

    echo json_encode([
        "success" => true,
        "cliente" => [
            "CodigoClien" => $cliente['CodigoClien'],
            "Razon_Social" => $cliente['Razon_Social'],
            "Nit" => $cliente['Nit'],
            "Telefonos" => $cliente['Telefonos'],
            "Email" => $cliente['Email'],
        ],
        "anio" => intval($anio),
        "anios_disponibles" => $aniosDisp,
        "resumen" => $resumenAnio,
        "ventas" => $ventas,
        "top_productos" => $topProductos,
        "grafico" => $grafico
    ], JSON_UNESCAPED_UNICODE);

} catch(Exception $e) {
    http_response_code(500);
    echo json_encode(["success" => false, "message" => $e->getMessage()]);
}
?>
