<?php
/**
 * Endpoint para obtener el kardex (historial de movimientos) de un producto
 * Soporta filtros por mes o rango de fechas
 */

require_once '../config/database.php';

$database = new Database();
$db = $database->getConnection();

// Obtener parámetros
$items = isset($_GET['items']) ? $_GET['items'] : null;
$mes = isset($_GET['mes']) ? intval($_GET['mes']) : null;
$anio = isset($_GET['anio']) ? intval($_GET['anio']) : null;
$fecha_inicio = isset($_GET['fecha_inicio']) ? $_GET['fecha_inicio'] : null;
$fecha_fin = isset($_GET['fecha_fin']) ? $_GET['fecha_fin'] : null;

if (!$items) {
    http_response_code(400);
    echo json_encode([
        "success" => false,
        "message" => "El parámetro 'items' es requerido"
    ]);
    exit;
}

try {
    // Query base para el kardex desde la tabla tblKardex
    $query = "
        SELECT
            Fecha,
            Detalle,
            Cant_Ent AS Cantidad_Entrada,
            Cost_Ent AS Costo_Entrada,
            Cant_Sal AS Cantidad_Salida,
            Cost_Sal AS Costo_Salida,
            Cant_Saldo AS Cantidad_Saldo,
            Cost_Saldo AS Costo_Saldo,
            Cost_Unit AS Costo_Unitario
        FROM tblKardex
        WHERE Items = :items
    ";

    // Aplicar filtros de fecha
    if ($mes && $anio) {
        $query .= " AND MONTH(Fecha) = :mes AND YEAR(Fecha) = :anio";
    } elseif ($fecha_inicio && $fecha_fin) {
        $query .= " AND Fecha BETWEEN :fecha_inicio AND :fecha_fin";
    }

    $query .= " ORDER BY Id_kardex ASC";

    $stmt = $db->prepare($query);
    $stmt->bindParam(':items', $items);

    if ($mes && $anio) {
        $stmt->bindParam(':mes', $mes, PDO::PARAM_INT);
        $stmt->bindParam(':anio', $anio, PDO::PARAM_INT);
    } elseif ($fecha_inicio && $fecha_fin) {
        $stmt->bindParam(':fecha_inicio', $fecha_inicio);
        $stmt->bindParam(':fecha_fin', $fecha_fin);
    }

    $stmt->execute();
    $kardex = $stmt->fetchAll();

    // Formatear números
    foreach ($kardex as &$mov) {
        $mov['Cantidad_Entrada'] = floatval($mov['Cantidad_Entrada'] ?? 0);
        $mov['Costo_Entrada'] = floatval($mov['Costo_Entrada'] ?? 0);
        $mov['Cantidad_Salida'] = floatval($mov['Cantidad_Salida'] ?? 0);
        $mov['Costo_Salida'] = floatval($mov['Costo_Salida'] ?? 0);
        $mov['Cantidad_Saldo'] = floatval($mov['Cantidad_Saldo'] ?? 0);
        $mov['Costo_Saldo'] = floatval($mov['Costo_Saldo'] ?? 0);
        $mov['Costo_Unitario'] = floatval($mov['Costo_Unitario'] ?? 0);
    }

    http_response_code(200);
    echo json_encode([
        "success" => true,
        "kardex" => $kardex,
        "total" => count($kardex),
        "periodo" => [
            "mes" => $mes,
            "anio" => $anio,
            "fecha_inicio" => $fecha_inicio,
            "fecha_fin" => $fecha_fin
        ]
    ], JSON_UNESCAPED_UNICODE);

} catch(Exception $e) {
    http_response_code(500);
    echo json_encode([
        "success" => false,
        "message" => "Error al obtener kardex: " . $e->getMessage()
    ]);
}
?>
