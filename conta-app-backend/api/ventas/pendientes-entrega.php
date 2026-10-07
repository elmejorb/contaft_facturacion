<?php
/**
 * Pendientes por entregar (modo Fabricación v4.7)
 * UNION de líneas pendientes de POS (tbldetalle_venta.Entregado='N')
 * + FE (detalle_document_electronic.entregado='N'), solo de facturas
 * con EstadoFact='Valida' (las anuladas se omiten automáticamente).
 *
 * GET ?desde=YYYY-MM-DD&hasta=YYYY-MM-DD (opcional, default: últimos 90 días)
 */
require_once '../config/database.php';

$db = (new Database())->getConnection();

try {
    $desde = $_GET['desde'] ?? date('Y-m-d', strtotime('-90 days'));
    $hasta = $_GET['hasta'] ?? date('Y-m-d');

    $diasEstimados = (int)($db->query("SELECT COALESCE(dias_estimados_entrega, 7) FROM tbldatosempresa LIMIT 1")->fetchColumn() ?: 7);

    // POS: tbldetalle_venta — mostrar líneas donde falta por entregar
    //   cantidad_faltante = Cantidad - CantidadEntregada
    // Incluye tanto Entregado='N' (pendiente total) como Entregado='S' con
    // backfill (no debería pasar). El criterio REAL es cantidad_faltante > 0.
    $sqlPos = "
        SELECT 'POS' AS origen,
               v.Factura_N AS numero,
               v.Factura_N AS id_doc,
               NULL AS doc_elec_id,
               v.Fecha,
               v.CodigoCli,
               v.A_nombre AS cliente,
               a.Codigo AS codigo_art,
               a.Nombres_Articulo AS articulo,
               d.Items AS items,
               d.Cantidad AS cantidad,
               COALESCE(d.CantidadEntregada, 0) AS cantidad_entregada,
               (d.Cantidad - COALESCE(d.CantidadEntregada, 0)) AS cantidad_faltante,
               d.PrecioV AS precio,
               (d.Cantidad - COALESCE(d.CantidadEntregada, 0)) * d.PrecioV AS subtotal,
               d.Id_DetalleVenta AS id_detalle,
               DATEDIFF(CURDATE(), DATE(v.Fecha)) AS dias_transcurridos
        FROM tbldetalle_venta d
        INNER JOIN tblventas v ON v.Factura_N = d.Factura_N
        LEFT JOIN tblarticulos a ON a.Items = d.Items
        WHERE d.Entregado = 'N'
          AND (d.Cantidad - COALESCE(d.CantidadEntregada, 0)) > 0
          AND v.EstadoFact = 'Valida'
          AND DATE(v.Fecha) BETWEEN ? AND ?
    ";

    // FE: detalle_document_electronic (solo si existe)
    $tieneFE = (int)$db->query("SELECT COUNT(*) FROM information_schema.COLUMNS
        WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='detalle_document_electronic' AND COLUMN_NAME='entregado'")->fetchColumn() > 0;

    $rows = [];
    $stmt = $db->prepare($sqlPos);
    $stmt->execute([$desde, $hasta]);
    $rows = array_merge($rows, $stmt->fetchAll());

    if ($tieneFE) {
        $sqlFe = "
            SELECT 'FE' AS origen,
                   CONCAT(COALESCE(e.prefix,'FCON'), e.number) AS numero,
                   e.id AS id_doc,
                   e.id AS doc_elec_id,
                   e.fecha AS Fecha,
                   e.cod_cliente AS CodigoCli,
                   COALESCE(e.customer_name, c.Razon_Social, 'Comprador') AS cliente,
                   a.Codigo AS codigo_art,
                   COALESCE(a.Nombres_Articulo, d.description) AS articulo,
                   d.items AS items,
                   d.invoiced_quantity AS cantidad,
                   COALESCE(d.cantidad_entregada, 0) AS cantidad_entregada,
                   (d.invoiced_quantity - COALESCE(d.cantidad_entregada, 0)) AS cantidad_faltante,
                   d.price_amount AS precio,
                   (d.invoiced_quantity - COALESCE(d.cantidad_entregada, 0)) * d.price_amount AS subtotal,
                   d.id_detalle_document AS id_detalle,
                   DATEDIFF(CURDATE(), e.fecha) AS dias_transcurridos
            FROM detalle_document_electronic d
            INNER JOIN electronic_documents e ON e.id = d.factura_n
            LEFT JOIN tblarticulos a ON a.Items = d.items
            LEFT JOIN tblclientes c ON c.CodigoClien = e.cod_cliente
            WHERE d.entregado = 'N'
              AND (d.invoiced_quantity - COALESCE(d.cantidad_entregada, 0)) > 0
              AND e.status = 'autorizado'
              AND e.type_document_id = 1
              AND e.fecha BETWEEN ? AND ?
        ";
        $stmt = $db->prepare($sqlFe);
        $stmt->execute([$desde, $hasta]);
        $rows = array_merge($rows, $stmt->fetchAll());
    }

    // Agregar semáforo
    foreach ($rows as &$r) {
        $dias = intval($r['dias_transcurridos']);
        $r['dias_transcurridos'] = $dias;
        $r['dias_restantes']     = $diasEstimados - $dias;
        if ($dias < $diasEstimados)      $r['semaforo'] = 'verde';
        elseif ($dias <= $diasEstimados + 1) $r['semaforo'] = 'amarillo';
        else                             $r['semaforo'] = 'rojo';
    }

    // Ordenar: más urgente primero (rojo primero, luego amarillo, luego verde);
    // dentro de cada grupo, el más viejo primero.
    $orden = ['rojo' => 0, 'amarillo' => 1, 'verde' => 2];
    usort($rows, function($a,$b) use ($orden) {
        $o = $orden[$a['semaforo']] - $orden[$b['semaforo']];
        if ($o !== 0) return $o;
        return $b['dias_transcurridos'] - $a['dias_transcurridos'];
    });

    echo json_encode([
        'success' => true,
        'dias_estimados' => $diasEstimados,
        'rango' => ['desde' => $desde, 'hasta' => $hasta],
        'pendientes' => $rows,
        'total' => count($rows),
        'resumen' => [
            'rojo'    => count(array_filter($rows, fn($r) => $r['semaforo'] === 'rojo')),
            'amarillo'=> count(array_filter($rows, fn($r) => $r['semaforo'] === 'amarillo')),
            'verde'   => count(array_filter($rows, fn($r) => $r['semaforo'] === 'verde')),
        ],
    ], JSON_UNESCAPED_UNICODE);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => $e->getMessage()]);
}
?>
