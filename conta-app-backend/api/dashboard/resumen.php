<?php
/**
 * Endpoint para obtener resumen del dashboard principal
 * Ventas del día, mes, cuentas por cobrar, productos, clientes
 */

require_once '../config/database.php';

$database = new Database();
$db = $database->getConnection();

try {
    // Ventas del día
    $stmt = $db->query("SELECT COUNT(*) as cantidad, COALESCE(SUM(Total),0) as total FROM tblventas WHERE DATE(Fecha) = CURDATE()");
    $ventasHoy = $stmt->fetch();

    // Ventas del mes actual
    $stmt = $db->query("SELECT COUNT(*) as cantidad, COALESCE(SUM(Total),0) as total FROM tblventas WHERE MONTH(Fecha) = MONTH(CURDATE()) AND YEAR(Fecha) = YEAR(CURDATE())");
    $ventasMes = $stmt->fetch();

    // Ventas del mes anterior (para comparación)
    $stmt = $db->query("
        SELECT COUNT(*) as cantidad, COALESCE(SUM(Total),0) as total
        FROM tblventas
        WHERE MONTH(Fecha) = MONTH(DATE_SUB(CURDATE(), INTERVAL 1 MONTH))
        AND YEAR(Fecha) = YEAR(DATE_SUB(CURDATE(), INTERVAL 1 MONTH))
    ");
    $ventasMesAnterior = $stmt->fetch();

    // Cuentas por cobrar (saldo pendiente)
    $stmt = $db->query("SELECT COALESCE(SUM(Saldo),0) as total, COUNT(*) as cantidad FROM tblventas WHERE Saldo > 0");
    $cuentasPorCobrar = $stmt->fetch();

    // Pagos recibidos hoy
    $stmt = $db->query("SELECT COALESCE(SUM(ValorPago),0) as total, COUNT(*) as cantidad FROM tblpagos WHERE DATE(Fecha) = CURDATE()");
    $pagosHoy = $stmt->fetch();

    // Pagos recibidos del mes
    $stmt = $db->query("SELECT COALESCE(SUM(ValorPago),0) as total, COUNT(*) as cantidad FROM tblpagos WHERE MONTH(Fecha) = MONTH(CURDATE()) AND YEAR(Fecha) = YEAR(CURDATE())");
    $pagosMes = $stmt->fetch();

    // Total productos activos
    $stmt = $db->query("SELECT COUNT(*) as total FROM tblarticulos WHERE Estado = 1");
    $productos = $stmt->fetch();

    // Productos sin stock
    $stmt = $db->query("SELECT COUNT(*) as total FROM tblarticulos WHERE Estado = 1 AND Existencia <= 0");
    $sinStock = $stmt->fetch();

    // Valor del inventario
    $stmt = $db->query("SELECT COALESCE(SUM(Existencia * Precio_Costo),0) as total FROM tblarticulos WHERE Estado = 1");
    $valorInventario = $stmt->fetch();

    // Top 5 productos más vendidos del mes
    $stmt = $db->query("
        SELECT d.Items as Codigo, a.Nombres_Articulo as Descripcion, SUM(d.Cantidad) as CantidadVendida, SUM(d.Subtotal) as TotalVendido
        FROM tbldetalle_venta d
        INNER JOIN tblventas v ON d.Factura_N = v.Factura_N
        LEFT JOIN tblarticulos a ON d.Items = a.Items
        WHERE MONTH(v.Fecha) = MONTH(CURDATE()) AND YEAR(v.Fecha) = YEAR(CURDATE())
        GROUP BY d.Items, a.Nombres_Articulo
        ORDER BY CantidadVendida DESC
        LIMIT 5
    ");
    $topProductos = $stmt->fetchAll();

    // Ventas últimos 7 días
    $stmt = $db->query("
        SELECT DATE(Fecha) as fecha, COUNT(*) as cantidad, COALESCE(SUM(Total),0) as total
        FROM tblventas
        WHERE Fecha >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)
        GROUP BY DATE(Fecha)
        ORDER BY fecha ASC
    ");
    $ventasSemana = $stmt->fetchAll();

    // Datos de la empresa
    $stmt = $db->query("SELECT Empresa, Propietario, Nit FROM tbldatosempresa LIMIT 1");
    $empresa = $stmt->fetch();

    // Clientes activos del mes
    $stmt = $db->query("SELECT COUNT(DISTINCT CodigoCli) as total FROM tblventas WHERE MONTH(Fecha) = MONTH(CURDATE()) AND YEAR(Fecha) = YEAR(CURDATE())");
    $clientesMes = $stmt->fetch();

    http_response_code(200);
    echo json_encode([
        "success" => true,
        "resumen" => [
            "ventasHoy" => [
                "cantidad" => intval($ventasHoy['cantidad']),
                "total" => floatval($ventasHoy['total'])
            ],
            "ventasMes" => [
                "cantidad" => intval($ventasMes['cantidad']),
                "total" => floatval($ventasMes['total'])
            ],
            "ventasMesAnterior" => [
                "cantidad" => intval($ventasMesAnterior['cantidad']),
                "total" => floatval($ventasMesAnterior['total'])
            ],
            "cuentasPorCobrar" => [
                "cantidad" => intval($cuentasPorCobrar['cantidad']),
                "total" => floatval($cuentasPorCobrar['total'])
            ],
            "pagosHoy" => [
                "cantidad" => intval($pagosHoy['cantidad']),
                "total" => floatval($pagosHoy['total'])
            ],
            "pagosMes" => [
                "cantidad" => intval($pagosMes['cantidad']),
                "total" => floatval($pagosMes['total'])
            ],
            "productos" => [
                "activos" => intval($productos['total']),
                "sinStock" => intval($sinStock['total']),
                "valorInventario" => floatval($valorInventario['total'])
            ],
            "clientesMes" => intval($clientesMes['total']),
            "topProductos" => $topProductos,
            "ventasSemana" => $ventasSemana,
            "empresa" => $empresa
        ]
    ]);

} catch(Exception $e) {
    http_response_code(500);
    echo json_encode([
        "success" => false,
        "message" => "Error: " . $e->getMessage()
    ]);
}
?>
