<?php
/**
 * Catálogo UNIFICADO de retenciones para usar en el modal de pago y
 * finalización de FE contado.
 *
 * Combina:
 *   - tblretenciones  (ReteIVA 15%/100%, ReteICA, Otras) → impuestos declarables
 *   - tbl_conceptos_retefuente (41 conceptos DIAN con base UVT)
 *
 * El frontend usa `_source` ('imp' | 'ref') para discriminar origen.
 * Para unificar IDs en el SearchSelect:
 *   - impuestos → id directo
 *   - conceptos → id + REF_OFFSET (manejado en frontend)
 */
require_once '../config/database.php';
$db = (new Database())->getConnection();

try {
    $items = [];

    // 1) Impuestos marcados como retención
    $stmt = $db->query("
        SELECT Id_Retencion AS id, Codigo, Nombre AS concepto, Porcentaje AS tarifa,
               COALESCE(tipo_codigo, '06') AS tipo_codigo, Activa AS activo
        FROM tblretenciones
        WHERE Activa = 1 AND COALESCE(es_retencion,1) = 1
        ORDER BY Nombre
    ");
    foreach ($stmt->fetchAll() as $r) {
        $items[] = [
            '_source'     => 'imp',
            'id'          => intval($r['id']),
            'concepto'    => $r['concepto'] . ($r['Codigo'] ? ' (' . $r['Codigo'] . ')' : ''),
            'tarifa'      => floatval($r['tarifa']),
            'tipo_codigo' => $r['tipo_codigo'],
            'base_uvt'    => 0,
            'activo'      => intval($r['activo']),
        ];
    }

    // 2) Conceptos ReteFuente
    $stmt = $db->query("
        SELECT Id_Concepto AS id, concepto, base_uvt, tarifa, tipo_codigo, activo
        FROM tbl_conceptos_retefuente
        WHERE activo = 1
        ORDER BY concepto
    ");
    foreach ($stmt->fetchAll() as $r) {
        $items[] = [
            '_source'     => 'ref',
            'id'          => intval($r['id']),
            'concepto'    => $r['concepto'],
            'tarifa'      => floatval($r['tarifa']),
            'tipo_codigo' => $r['tipo_codigo'],
            'base_uvt'    => floatval($r['base_uvt']),
            'activo'      => intval($r['activo']),
        ];
    }

    // UVT para calcular base mínima en pesos
    $uvt = $db->query("SELECT uvt_valor, uvt_anio FROM tbldatosempresa LIMIT 1")->fetch();

    echo json_encode([
        'success' => true,
        'items'   => $items,
        'uvt'     => [
            'valor' => floatval($uvt['uvt_valor'] ?? 52374),
            'anio'  => intval($uvt['uvt_anio'] ?? 2026),
        ],
    ], JSON_UNESCAPED_UNICODE);
} catch (Throwable $e) {
    http_response_code(500);
    echo json_encode(['success'=>false,'message'=>$e->getMessage()]);
}
