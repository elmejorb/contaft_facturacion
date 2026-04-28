<?php
require_once '../config/database.php';
$database = new Database();
$db = $database->getConnection();

try {
    $anio = $_GET['anio'] ?? date('Y');
    $mes = $_GET['mes'] ?? null;
    $dia = $_GET['dia'] ?? null;
    $medio = $_GET['medio'] ?? null;
    $tipo = $_GET['tipo'] ?? null; // Contado | Crédito | null (todos)

    // Resumen por tipo de pago
    $whereResumen = "v.EstadoFact = 'Valida' AND YEAR(v.Fecha) = :anio";
    $paramsResumen = [':anio' => $anio];
    if ($mes) {
        $whereResumen .= " AND MONTH(v.Fecha) = :mes";
        $paramsResumen[':mes'] = $mes;
    }
    if ($dia) {
        $whereResumen .= " AND DAY(v.Fecha) = :dia";
        $paramsResumen[':dia'] = $dia;
    }
    if ($tipo) {
        $whereResumen .= " AND v.Tipo = :tipo";
        $paramsResumen[':tipo'] = $tipo;
    }

    $stmt = $db->prepare("
        SELECT
            COALESCE(m.nombre_medio, 'Efectivo') as MedioPago,
            v.id_mediopago,
            COUNT(*) as facturas,
            SUM(v.Total) as total,
            SUM(v.efectivo) as total_efectivo,
            SUM(v.valorpagado1) as total_transferencia
        FROM tblventas v
        LEFT JOIN tblmedios_pago m ON v.id_mediopago = m.id_mediopago
        WHERE $whereResumen
        GROUP BY v.id_mediopago, m.nombre_medio
        ORDER BY total DESC
    ");
    $stmt->execute($paramsResumen);
    $resumen = $stmt->fetchAll();

    // Detalle de facturas filtrado
    $whereDetalle = "v.EstadoFact = 'Valida' AND YEAR(v.Fecha) = :anio";
    $paramsDetalle = [':anio' => $anio];
    if ($mes) {
        $whereDetalle .= " AND MONTH(v.Fecha) = :mes";
        $paramsDetalle[':mes'] = $mes;
    }
    if ($dia) {
        $whereDetalle .= " AND DAY(v.Fecha) = :dia";
        $paramsDetalle[':dia'] = $dia;
    }
    if ($medio !== null && $medio !== '') {
        $whereDetalle .= " AND v.id_mediopago = :medio";
        $paramsDetalle[':medio'] = intval($medio);
    }
    if ($tipo) {
        $whereDetalle .= " AND v.Tipo = :tipo";
        $paramsDetalle[':tipo'] = $tipo;
    }

    $stmt2 = $db->prepare("
        SELECT v.Factura_N, v.Fecha, v.Hora, v.A_nombre, v.Tipo, v.Total, v.Saldo,
               v.efectivo, v.valorpagado1, v.id_mediopago,
               COALESCE(m.nombre_medio, 'Efectivo') as MedioPago
        FROM tblventas v
        LEFT JOIN tblmedios_pago m ON v.id_mediopago = m.id_mediopago
        WHERE $whereDetalle
        ORDER BY v.Factura_N DESC
        LIMIT 500
    ");
    $stmt2->execute($paramsDetalle);
    $facturas = $stmt2->fetchAll();

    // Resumen mensual por tipo de pago
    $whereMensual = "v.EstadoFact = 'Valida' AND YEAR(v.Fecha) = :anio";
    $paramsMensual = [':anio' => $anio];
    if ($tipo) {
        $whereMensual .= " AND v.Tipo = :tipo";
        $paramsMensual[':tipo'] = $tipo;
    }
    $stmtMensual = $db->prepare("
        SELECT
            MONTH(v.Fecha) as mes,
            COALESCE(m.nombre_medio, 'Efectivo') as MedioPago,
            v.id_mediopago,
            COUNT(*) as facturas,
            SUM(v.Total) as total
        FROM tblventas v
        LEFT JOIN tblmedios_pago m ON v.id_mediopago = m.id_mediopago
        WHERE $whereMensual
        GROUP BY MONTH(v.Fecha), v.id_mediopago, m.nombre_medio
        ORDER BY mes, v.id_mediopago
    ");
    $stmtMensual->execute($paramsMensual);
    $mensual = $stmtMensual->fetchAll();

    // Medios de pago disponibles
    $stmtMedios = $db->query("SELECT * FROM tblmedios_pago ORDER BY id_mediopago");
    $medios = $stmtMedios->fetchAll();

    // Años disponibles
    $stmtAnios = $db->query("SELECT DISTINCT YEAR(Fecha) as anio FROM tblventas ORDER BY anio DESC");
    $anios = $stmtAnios->fetchAll(PDO::FETCH_COLUMN);

    echo json_encode([
        'success' => true,
        'resumen' => $resumen,
        'facturas' => $facturas,
        'mensual' => $mensual,
        'medios' => $medios,
        'anios' => $anios,
        'total_general' => array_sum(array_column($resumen, 'total'))
    ], JSON_UNESCAPED_UNICODE);

} catch (Exception $e) {
    echo json_encode(['success' => false, 'message' => $e->getMessage()]);
}
?>
