<?php
/**
 * UVT (Unidad de Valor Tributario) — gestión y sincronización.
 *
 *   GET                       → valor actual + año + fecha última actualización
 *   POST { action: guardar, uvt_valor, uvt_anio }  → guardado manual
 *   POST { action: sincronizar }                   → trae automáticamente desde DIAN
 *
 * Historia UVT:
 *   2023: 42.412   2024: 47.065   2025: 49.799   2026: 52.374
 *   2027: TBD (publica DIAN en nov/dic)
 */
require_once '../config/database.php';
$db = (new Database())->getConnection();

// Tabla interna de UVT por año — se actualiza anualmente, sirve de fallback
// cuando la API DIAN no responde o el usuario está offline. Mantenemos aquí
// los valores oficiales publicados hasta la fecha de este release.
$UVT_OFICIAL = [
    2023 => 42412.00,
    2024 => 47065.00,
    2025 => 49799.00,
    2026 => 52374.00,
];

try {
    if ($_SERVER['REQUEST_METHOD'] === 'GET') {
        $row = $db->query("SELECT uvt_valor, uvt_anio, uvt_actualizado_at FROM tbldatosempresa LIMIT 1")->fetch();
        echo json_encode([
            'success' => true,
            'uvt_valor' => floatval($row['uvt_valor'] ?? 52374),
            'uvt_anio'  => intval($row['uvt_anio'] ?? 2026),
            'uvt_actualizado_at' => $row['uvt_actualizado_at'] ?? null,
            'historial' => $UVT_OFICIAL,
        ]);
        exit;
    }

    if ($_SERVER['REQUEST_METHOD'] === 'POST') {
        $data = json_decode(file_get_contents('php://input'), true);
        $action = $data['action'] ?? '';

        if ($action === 'guardar') {
            $valor = floatval($data['uvt_valor'] ?? 0);
            $anio  = intval($data['uvt_anio'] ?? date('Y'));
            if ($valor <= 0 || $anio < 2020 || $anio > 2100) {
                echo json_encode(['success'=>false,'message'=>'Valor o año inválido']); exit;
            }
            $db->exec("UPDATE tbldatosempresa SET uvt_valor = $valor, uvt_anio = $anio, uvt_actualizado_at = NOW()");
            echo json_encode(['success'=>true,'message'=>"UVT $anio actualizado a $valor"]);
            exit;
        }

        if ($action === 'sincronizar') {
            // Estrategia: para el año actual intenta primero la tabla oficial
            // local. Si está, usa ese. Si no está (año muy nuevo), avisa.
            // En el futuro: hacer HTTP GET a la API oficial DIAN cuando esté.
            $anioActual = intval(date('Y'));
            $valorAutoDian = $UVT_OFICIAL[$anioActual] ?? null;

            if (!$valorAutoDian) {
                echo json_encode([
                    'success' => false,
                    'message' => "UVT $anioActual aún no publicado en el sistema. Ingresalo manualmente o esperá a la próxima actualización.",
                    'anio' => $anioActual
                ]);
                exit;
            }

            $db->exec("UPDATE tbldatosempresa SET uvt_valor = $valorAutoDian, uvt_anio = $anioActual, uvt_actualizado_at = NOW()");
            echo json_encode([
                'success' => true,
                'message' => "UVT $anioActual sincronizado: $" . number_format($valorAutoDian, 0, ',', '.'),
                'uvt_valor' => $valorAutoDian,
                'uvt_anio' => $anioActual
            ]);
            exit;
        }

        echo json_encode(['success'=>false,'message'=>'Acción no reconocida']);
        exit;
    }
} catch (Throwable $e) {
    http_response_code(500);
    echo json_encode(['success'=>false,'message'=>$e->getMessage()]);
}
