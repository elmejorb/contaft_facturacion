<?php
/**
 * Cumpleaños de clientes
 * GET              → clientes con cumpleaños este mes
 * GET ?rango=7     → cumpleaños en los próximos N días
 * GET ?mes=4       → cumpleaños de un mes específico
 */

require_once '../config/database.php';

$database = new Database();
$db = $database->getConnection();

try {
    $rango = $_GET['rango'] ?? null;
    $mes = $_GET['mes'] ?? null;

    if ($rango) {
        // Próximos N días
        $stmt = $db->prepare("
            SELECT CodigoClien, Razon_Social, Telefonos, Email, Whatsapp, FechaCumple,
                   DATEDIFF(
                       DATE(CONCAT(YEAR(CURDATE()), '-', MONTH(FechaCumple), '-', DAY(FechaCumple))),
                       CURDATE()
                   ) as Dias_Para_Cumple
            FROM tblclientes
            WHERE FechaCumple IS NOT NULL
              AND FechaCumple != '0000-00-00 00:00:00'
              AND FechaCumple != '1899-12-30 00:00:00'
              AND DATEDIFF(
                    DATE(CONCAT(YEAR(CURDATE()), '-', MONTH(FechaCumple), '-', DAY(FechaCumple))),
                    CURDATE()
                  ) BETWEEN 0 AND :rango
            ORDER BY Dias_Para_Cumple ASC
        ");
        $stmt->execute([':rango' => intval($rango)]);
    } elseif ($mes) {
        $stmt = $db->prepare("
            SELECT CodigoClien, Razon_Social, Telefonos, Email, Whatsapp, FechaCumple,
                   DAY(FechaCumple) as Dia
            FROM tblclientes
            WHERE FechaCumple IS NOT NULL
              AND FechaCumple != '0000-00-00 00:00:00'
              AND FechaCumple != '1899-12-30 00:00:00'
              AND MONTH(FechaCumple) = :mes
            ORDER BY DAY(FechaCumple)
        ");
        $stmt->execute([':mes' => intval($mes)]);
    } else {
        // Este mes
        $stmt = $db->query("
            SELECT CodigoClien, Razon_Social, Telefonos, Email, Whatsapp, FechaCumple,
                   DAY(FechaCumple) as Dia,
                   DATEDIFF(
                       DATE(CONCAT(YEAR(CURDATE()), '-', MONTH(FechaCumple), '-', DAY(FechaCumple))),
                       CURDATE()
                   ) as Dias_Para_Cumple
            FROM tblclientes
            WHERE FechaCumple IS NOT NULL
              AND FechaCumple != '0000-00-00 00:00:00'
              AND FechaCumple != '1899-12-30 00:00:00'
              AND MONTH(FechaCumple) = MONTH(CURDATE())
            ORDER BY DAY(FechaCumple)
        ");
    }

    $clientes = $stmt->fetchAll();

    // Hoy
    $hoy = [];
    $proximos = [];
    foreach ($clientes as &$c) {
        $diasPara = $c['Dias_Para_Cumple'] ?? null;
        if ($diasPara !== null) $c['Dias_Para_Cumple'] = intval($diasPara);
        $cumpleMes = intval(date('m', strtotime($c['FechaCumple'])));
        $cumpleDia = intval(date('d', strtotime($c['FechaCumple'])));
        $hoyMes = intval(date('m'));
        $hoyDia = intval(date('d'));
        if ($cumpleMes == $hoyMes && $cumpleDia == $hoyDia) {
            $hoy[] = $c;
        }
    }

    echo json_encode([
        "success" => true,
        "clientes" => $clientes,
        "total" => count($clientes),
        "cumple_hoy" => $hoy,
        "total_hoy" => count($hoy)
    ], JSON_UNESCAPED_UNICODE);

} catch(Exception $e) {
    http_response_code(500);
    echo json_encode(["success" => false, "message" => $e->getMessage()]);
}
?>
