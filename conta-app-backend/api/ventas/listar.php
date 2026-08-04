<?php
/**
 * Listado de ventas con filtros
 * GET ?mes=3&anio=2026&tipo=Contado&estado=Valida&cliente=130500
 * GET ?id=X → detalle de factura con items
 */

require_once '../config/database.php';

$database = new Database();
$db = $database->getConnection();

try {
    $id = $_GET['id'] ?? null;

    if ($id) {
        // Detalle de factura
        $stmt = $db->prepare("
            SELECT v.*, u.Nombre as NombreUsuario, m.nombre_medio as MedioPago
            FROM tblventas v
            LEFT JOIN tblusuarios u ON v.Id_Usuario = u.Id_Usuario
            LEFT JOIN tblmedios_pago m ON v.id_mediopago = m.id_mediopago
            WHERE v.Factura_N = :id
        ");
        $stmt->execute([':id' => $id]);
        $factura = $stmt->fetch();

        if (!$factura) {
            http_response_code(404);
            echo json_encode(["success" => false, "message" => "Factura no encontrada"]);
            exit;
        }

        // Items. Si la línea es servicio con descripción editada
        // (DescripcionTemp), ese texto reemplaza al nombre del catálogo.
        $stmt = $db->prepare("
            SELECT d.*, a.Codigo,
                   COALESCE(NULLIF(d.DescripcionTemp, ''), a.Nombres_Articulo) AS Nombres_Articulo
            FROM tbldetalle_venta d
            LEFT JOIN tblarticulos a ON d.Items = a.Items
            WHERE d.Factura_N = :id
        ");
        $stmt->execute([':id' => $id]);
        $items = $stmt->fetchAll();

        foreach ($items as &$item) {
            $item['Cantidad'] = floatval($item['Cantidad']);
            $item['PrecioC'] = floatval($item['PrecioC']);
            $item['PrecioV'] = floatval($item['PrecioV']);
            $item['Subtotal'] = floatval($item['Subtotal']);
            $item['Descuento'] = floatval($item['Descuento']);
        }

        echo json_encode([
            "success" => true,
            "factura" => $factura,
            "items" => $items,
            "total_items" => count($items)
        ], JSON_UNESCAPED_UNICODE);

    } else {
        // Listado con filtros
        $mes = $_GET['mes'] ?? null;
        $dia = $_GET['dia'] ?? null;   // opcional — restringe a un día específico
        $anio = $_GET['anio'] ?? date('Y');
        $tipo = $_GET['tipo'] ?? null;
        $estado = $_GET['estado'] ?? 'Valida';
        $cliente = $_GET['cliente'] ?? null;
        $limit = max(50, min(intval($_GET['limit'] ?? 500), 5000));
        // Toggle de rendimiento — el frontend lo controla desde config del PC.
        // En equipos lentos (Celeron), el JOIN con vw_facturas_cliente_saldos
        // agrega ~30ms porque la vista suma pagos con REGEXP sobre tblpagos.
        // Cuando `con_saldo=0`, no hacemos ese JOIN — el saldo se consulta en
        // el módulo Cartera si el usuario lo necesita puntualmente.
        $conSaldo = ($_GET['con_saldo'] ?? '1') === '1';

        // Rango de fechas en lugar de YEAR()/MONTH()/DAY() para que MySQL
        // pueda USAR el índice idx_fecha. Con funciones sobre la columna,
        // el índice queda inhabilitado y se hace full table scan
        // (crítico en BDs con >50k ventas — se demoraba varios segundos).
        $anioI = intval($anio);
        if ($dia && $mes) {
            $fechaIni = sprintf('%04d-%02d-%02d', $anioI, intval($mes), intval($dia));
            $fechaFin = date('Y-m-d', strtotime($fechaIni . ' +1 day'));
        } elseif ($mes) {
            $fechaIni = sprintf('%04d-%02d-01', $anioI, intval($mes));
            $fechaFin = date('Y-m-d', strtotime($fechaIni . ' +1 month'));
        } else {
            $fechaIni = sprintf('%04d-01-01', $anioI);
            $fechaFin = sprintf('%04d-01-01', $anioI + 1);
        }
        $where = "v.Fecha >= :fecha_ini AND v.Fecha < :fecha_fin";
        $params = [':fecha_ini' => $fechaIni, ':fecha_fin' => $fechaFin];
        if ($tipo) {
            $where .= " AND v.Tipo = :tipo";
            $params[':tipo'] = $tipo;
        }
        // 'Todas' o vacío = sin filtro de estado
        if ($estado && $estado !== 'Todas') {
            $where .= " AND v.EstadoFact = :estado";
            $params[':estado'] = $estado;
        }
        if ($cliente) {
            $where .= " AND v.CodigoCli = :cliente";
            $params[':cliente'] = $cliente;
        }
        $buscar = $_GET['buscar'] ?? null;
        if ($buscar) {
            $where .= " AND (v.Factura_N = :buscar_exact OR v.A_nombre LIKE :buscar_like OR v.Identificacion LIKE :buscar_like)";
            $params[':buscar_exact'] = intval($buscar);
            $params[':buscar_like'] = "%$buscar%";
        }

        // Query dinámica según modo de rendimiento:
        //   con_saldo=1 → incluye JOIN a vw_facturas_cliente_saldos (más caro)
        //   con_saldo=0 → omite el JOIN, saldo=0 en el frontend. Ideal para
        //                 PCs lentos; el usuario consulta cartera en el
        //                 módulo dedicado si necesita el saldo real.
        //
        // El conteo de items por factura ANTES era una subquery correlacionada
        // (una por fila) → se cambió a JOIN agregado (una sola query).
        $selectSaldo = $conSaldo ? "COALESCE(s.Saldo, 0) AS Saldo" : "0 AS Saldo";
        $joinSaldo   = $conSaldo ? "LEFT JOIN vw_facturas_cliente_saldos s ON s.Factura_N = v.Factura_N" : "";

        $stmt = $db->prepare("
            SELECT v.Factura_N, v.Fecha, v.Tipo, v.CodigoCli, v.A_nombre, v.Identificacion,
                   v.Total, $selectSaldo,
                   v.EstadoFact, v.Descuento, v.Impuesto,
                   v.id_mediopago, v.Hora, v.Id_Usuario, v.enviada_dian, v.cufe,
                   COALESCE(m.nombre_medio, 'Efectivo') as MedioPago,
                   COALESCE(items.n, 0) as Total_Items
            FROM tblventas v
            LEFT JOIN tblmedios_pago m ON v.id_mediopago = m.id_mediopago
            $joinSaldo
            LEFT JOIN (
                SELECT Factura_N, COUNT(*) as n
                FROM tbldetalle_venta
                WHERE Factura_N IN (
                    SELECT v2.Factura_N FROM tblventas v2 WHERE " . str_replace('v.', 'v2.', $where) . "
                )
                GROUP BY Factura_N
            ) items ON items.Factura_N = v.Factura_N
            WHERE $where
            ORDER BY v.Factura_N DESC
            LIMIT $limit
        ");
        // Params se duplican porque $where aparece dos veces (subquery + WHERE final).
        $stmt->execute(array_merge($params, $params));
        $ventas = $stmt->fetchAll();

        foreach ($ventas as &$v) {
            $v['Total'] = floatval($v['Total']);
            $v['Saldo'] = floatval($v['Saldo']);
            $v['Descuento'] = floatval($v['Descuento']);
            $v['Impuesto'] = floatval($v['Impuesto']);
            $v['Total_Items'] = intval($v['Total_Items']);
        }

        // Resumen
        $totalFacturas = count($ventas);
        $totalMonto = array_sum(array_column($ventas, 'Total'));
        $totalContado = array_sum(array_map(fn($v) => $v['Tipo'] === 'Contado' ? $v['Total'] : 0, $ventas));
        $totalCredito = array_sum(array_map(fn($v) => $v['Tipo'] !== 'Contado' ? $v['Total'] : 0, $ventas));

        // Años disponibles.
        // ANTES: SELECT DISTINCT YEAR(Fecha) FROM tblventas — no usa el índice
        // idx_fecha porque YEAR(x) es función sobre columna → full table scan.
        // En 85k ventas y Celeron tomaba 1-3s.
        // AHORA: solo pedimos min y max de Fecha (O(1) con índice idx_fecha) y
        // generamos el rango de años en PHP. También filtramos fechas basura
        // (< 2000 o > año actual + 1) que aparecen en BDs legacy VB6.
        $rangoFecha = $db->query("SELECT MIN(Fecha) as fmin, MAX(Fecha) as fmax FROM tblventas")->fetch();
        $anioMin = max(2000, intval(substr($rangoFecha['fmin'] ?? '2020', 0, 4)));
        $anioMax = min(intval(date('Y')) + 1, intval(substr($rangoFecha['fmax'] ?? date('Y'), 0, 4)));
        $aniosDisp = [];
        for ($y = $anioMax; $y >= $anioMin; $y--) $aniosDisp[] = $y;

        echo json_encode([
            "success" => true,
            "ventas" => $ventas,
            "total" => $totalFacturas,
            "anios_disponibles" => $aniosDisp,
            "resumen" => [
                "total_facturas" => $totalFacturas,
                "monto_total" => $totalMonto,
                "contado" => $totalContado,
                "credito" => $totalCredito
            ]
        ], JSON_UNESCAPED_UNICODE);
    }

} catch(Exception $e) {
    http_response_code(500);
    echo json_encode(["success" => false, "message" => $e->getMessage()]);
}
?>
