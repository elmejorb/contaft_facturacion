<?php
/**
 * Endpoint para obtener resumen del dashboard principal.
 * Consolida POS (tblventas) + FE (electronic_documents) de forma transparente.
 */

require_once '../config/database.php';

$database = new Database();
$db = $database->getConnection();

// ¿La BD tiene módulo FE? Si no, solo lee tblventas.
$tieneFE = conta_tiene_tabla($db, 'electronic_documents');

// Helper: suma (count, total) de POS + FE para un filtro de fecha dado.
// $wherePos filtra tblventas; $whereFE filtra electronic_documents.
function sumarVentas($db, $tieneFE, $wherePos, $whereFE) {
    $pos = $db->query("SELECT COUNT(*) c, COALESCE(SUM(Total),0) t FROM tblventas WHERE $wherePos AND EstadoFact='Valida'")->fetch();
    $cant = intval($pos['c']);
    $total = floatval($pos['t']);
    if ($tieneFE) {
        $fe = $db->query("SELECT COUNT(*) c, COALESCE(SUM(total),0) t FROM electronic_documents WHERE $whereFE AND status='autorizado' AND type_document_id=1")->fetch();
        $cant += intval($fe['c']);
        $total += floatval($fe['t']);
    }
    return ['cantidad' => $cant, 'total' => $total];
}

try {
    $ventasHoy = sumarVentas($db, $tieneFE,
        "DATE(Fecha) = CURRENT_DATE",
        "DATE(fecha) = CURRENT_DATE"
    );
    $ventasMes = sumarVentas($db, $tieneFE,
        "MONTH(Fecha) = MONTH(CURRENT_DATE) AND YEAR(Fecha) = YEAR(CURRENT_DATE)",
        "MONTH(fecha) = MONTH(CURRENT_DATE) AND YEAR(fecha) = YEAR(CURRENT_DATE)"
    );
    $ventasMesAnterior = sumarVentas($db, $tieneFE,
        "MONTH(Fecha) = MONTH(DATE_SUB(CURRENT_DATE, INTERVAL 1 MONTH)) AND YEAR(Fecha) = YEAR(DATE_SUB(CURRENT_DATE, INTERVAL 1 MONTH))",
        "MONTH(fecha) = MONTH(DATE_SUB(CURRENT_DATE, INTERVAL 1 MONTH)) AND YEAR(fecha) = YEAR(DATE_SUB(CURRENT_DATE, INTERVAL 1 MONTH))"
    );

    // Cuentas por cobrar — ya calcula desde tblpagos (vista dinámica)
    $stmt = $db->query("
        SELECT COALESCE(SUM(Saldo), 0) AS total, COUNT(*) AS cantidad
        FROM vw_facturas_cliente_saldos
        WHERE Saldo > 0
    ");
    $cuentasPorCobrar = $stmt->fetch();

    // Pagos recibidos (POS + FE comparten tblpagos)
    $pagosHoy = $db->query("SELECT COALESCE(SUM(ValorPago),0) as total, COUNT(*) as cantidad FROM tblpagos WHERE DATE(Fecha) = CURRENT_DATE AND Estado='Valida'")->fetch();
    $pagosMes = $db->query("SELECT COALESCE(SUM(ValorPago),0) as total, COUNT(*) as cantidad FROM tblpagos WHERE MONTH(Fecha) = MONTH(CURRENT_DATE) AND YEAR(Fecha) = YEAR(CURRENT_DATE) AND Estado='Valida'")->fetch();

    // Productos
    $productos = $db->query("SELECT COUNT(*) as total FROM tblarticulos WHERE Estado = 1")->fetch();
    $sinStock = $db->query("SELECT COUNT(*) as total FROM tblarticulos WHERE Estado = 1 AND Existencia <= 0")->fetch();
    $valorInventario = $db->query("SELECT COALESCE(SUM(Existencia * Precio_Costo),0) as total FROM tblarticulos WHERE Estado = 1")->fetch();

    // Top 5 productos del mes — UNION detalle POS + detalle FE autorizada
    $topQuery = "
        SELECT Items as Codigo, Nombres_Articulo as Descripcion, SUM(Cantidad) as CantidadVendida, SUM(Subtotal) as TotalVendido
        FROM (
            SELECT d.Items, a.Nombres_Articulo, d.Cantidad, d.Subtotal
            FROM tbldetalle_venta d
            INNER JOIN tblventas v ON d.Factura_N = v.Factura_N
            LEFT JOIN tblarticulos a ON d.Items = a.Items
            WHERE MONTH(v.Fecha) = MONTH(CURRENT_DATE) AND YEAR(v.Fecha) = YEAR(CURRENT_DATE)
              AND v.EstadoFact='Valida'
    ";
    if ($tieneFE) {
        $topQuery .= "
            UNION ALL
            SELECT dd.items, a.Nombres_Articulo, dd.invoiced_quantity AS Cantidad,
                   dd.line_extension_amount AS Subtotal
            FROM detalle_document_electronic dd
            INNER JOIN electronic_documents e ON e.id = dd.factura_n
            LEFT JOIN tblarticulos a ON dd.items = a.Items
            WHERE MONTH(e.fecha) = MONTH(CURRENT_DATE) AND YEAR(e.fecha) = YEAR(CURRENT_DATE)
              AND e.status='autorizado' AND e.type_document_id=1
        ";
    }
    $topQuery .= ") x GROUP BY Items, Nombres_Articulo ORDER BY CantidadVendida DESC LIMIT 5";
    $topProductos = $db->query($topQuery)->fetchAll();

    // Ventas últimos 7 días — UNION POS + FE
    $semQuery = "
        SELECT fecha, SUM(cantidad) AS cantidad, SUM(total) AS total FROM (
            SELECT DATE(Fecha) as fecha, COUNT(*) as cantidad, COALESCE(SUM(Total),0) as total
            FROM tblventas
            WHERE Fecha >= DATE_SUB(CURRENT_DATE, INTERVAL 7 DAY) AND EstadoFact='Valida'
            GROUP BY DATE(Fecha)
    ";
    if ($tieneFE) {
        $semQuery .= "
            UNION ALL
            SELECT DATE(fecha) as fecha, COUNT(*) as cantidad, COALESCE(SUM(total),0) as total
            FROM electronic_documents
            WHERE fecha >= DATE_SUB(CURRENT_DATE, INTERVAL 7 DAY) AND status='autorizado' AND type_document_id=1
            GROUP BY DATE(fecha)
        ";
    }
    $semQuery .= ") y GROUP BY fecha ORDER BY fecha ASC";
    $ventasSemana = $db->query($semQuery)->fetchAll();

    $empresa = $db->query("SELECT Empresa, Propietario, Nit FROM tbldatosempresa LIMIT 1")->fetch();

    // Clientes activos del mes — distinct de POS + FE
    $cliQuery = "SELECT CodigoCli AS cli FROM tblventas WHERE MONTH(Fecha) = MONTH(CURRENT_DATE) AND YEAR(Fecha) = YEAR(CURRENT_DATE) AND EstadoFact='Valida'";
    if ($tieneFE) {
        $cliQuery .= " UNION SELECT cod_cliente AS cli FROM electronic_documents WHERE MONTH(fecha) = MONTH(CURRENT_DATE) AND YEAR(fecha) = YEAR(CURRENT_DATE) AND status='autorizado' AND type_document_id=1";
    }
    $clientesMes = $db->query("SELECT COUNT(DISTINCT cli) AS total FROM ($cliQuery) z")->fetch();

    http_response_code(200);
    echo json_encode([
        "success" => true,
        "resumen" => [
            "ventasHoy" => $ventasHoy,
            "ventasMes" => $ventasMes,
            "ventasMesAnterior" => $ventasMesAnterior,
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
