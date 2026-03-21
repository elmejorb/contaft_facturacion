<?php
/**
 * Endpoint para obtener productos más vendidos
 */

require_once '../config/database.php';

$database = new Database();
$db = $database->getConnection();

// Obtener período (dia, semana, mes)
$periodo = isset($_GET['periodo']) ? $_GET['periodo'] : 'semana';

try {
    // Determinar rango de fechas
    $fechaInicio = '';
    switch ($periodo) {
        case 'dia':
            $fechaInicio = 'DATE_SUB(NOW(), INTERVAL 1 DAY)';
            break;
        case 'semana':
            $fechaInicio = 'DATE_SUB(NOW(), INTERVAL 7 DAY)';
            break;
        case 'mes':
            $fechaInicio = 'DATE_SUB(NOW(), INTERVAL 30 DAY)';
            break;
        default:
            $fechaInicio = 'DATE_SUB(NOW(), INTERVAL 7 DAY)';
    }

    $query = "SELECT
                a.Items,
                a.Codigo,
                a.Nombres_Articulo as Descripcion,
                SUM(vd.Cantidad) as TotalVendido,
                SUM(vd.Total) as ValorTotal
              FROM tblArticulos a
              INNER JOIN tblventasdetalle vd ON a.Items = vd.Items
              INNER JOIN tblventas v ON vd.Factura_N = v.Factura_N
              WHERE v.EstadoFact = 'Valida'
                AND v.Fecha >= $fechaInicio
              GROUP BY a.Items, a.Codigo, a.Nombres_Articulo
              ORDER BY TotalVendido DESC
              LIMIT 10";

    $stmt = $db->prepare($query);
    $stmt->execute();

    $productos = $stmt->fetchAll();

    // Formatear números
    foreach ($productos as &$producto) {
        $producto['TotalVendido'] = floatval($producto['TotalVendido']);
        $producto['ValorTotal'] = floatval($producto['ValorTotal']);
    }

    http_response_code(200);
    echo json_encode([
        "success" => true,
        "productos" => $productos,
        "periodo" => $periodo
    ]);

} catch(Exception $e) {
    http_response_code(500);
    echo json_encode([
        "success" => false,
        "message" => "Error al obtener productos más vendidos: " . $e->getMessage()
    ]);
}
?>
