<?php
/**
 * Panel "Sugerencias del día" — Inicio.
 *
 * Devuelve un array de sugerencias accionables para el usuario, calculadas
 * a partir de reglas + queries sobre la BD del cliente. NO usa IA por ahora
 * (Fase 1: templates hardcoded). En Fase 2 se puede agregar LLM opcional
 * para hacer los textos más naturales.
 *
 * Cada sugerencia tiene:
 *   {
 *     id: string,           // identificador único (para React key + filtrado)
 *     categoria: string,    // 'cartera' | 'inventario' | 'ventas' | 'clientes' | 'compras'
 *     nivel: string,        // 'urgente' | 'alerta' | 'info'   → color del card
 *     icono: string,        // nombre lucide-react (Wallet, Package, Cake, TrendingUp, etc.)
 *     titulo: string,       // encabezado corto
 *     mensaje: string,      // texto descriptivo
 *     dato: string|null,    // dato destacado (ej. "$ 2.435.000")
 *     accion: {
 *       label: string,      // texto del link
 *       destino: string,    // vista a la que navega (matches con onNavigate del frontend)
 *     }|null
 *   }
 *
 * Regla: solo se devuelve una sugerencia si aplica (no forzamos textos vacíos).
 * Si no hay ninguna urgente/alerta, incluir siempre 2 informativas (ventas, top).
 */

require_once '../config/database.php';
$database = new Database();
$db = $database->getConnection();

try {
    $sugerencias = [];

    // ============================================================
    // 1. CARTERA VENCIDA (>60 días) — 🔴 urgente
    // ============================================================
    $stmt = $db->query("
        SELECT
            COUNT(*) AS n_facturas,
            COUNT(DISTINCT CodigoCli) AS n_clientes,
            COALESCE(SUM(Saldo), 0) AS monto_total
        FROM vw_facturas_cliente_saldos
        WHERE Saldo > 0
          AND DiasVenc > 60
    ");
    $row = $stmt->fetch();
    if ($row && intval($row['n_clientes']) > 0) {
        $nCli = intval($row['n_clientes']);
        $monto = floatval($row['monto_total']);
        $sugerencias[] = [
            'id' => 'cartera_vencida_60',
            'categoria' => 'cartera',
            'nivel' => 'urgente',
            'icono' => 'AlertCircle',
            'titulo' => 'Cartera vencida',
            'mensaje' => "$nCli " . ($nCli === 1 ? 'cliente lleva' : 'clientes llevan') . " más de 60 días de mora",
            'dato' => '$ ' . number_format($monto, 0, ',', '.'),
            'accion' => [
                'label' => 'Ver cartera',
                'destino' => 'cuentas-cobrar',
                'filtros' => ['mora_min_dias' => 60, 'solo_vencidos' => true],
            ],
        ];
    }

    // ============================================================
    // 2. FACTURAS QUE VENCEN EN 7 DÍAS — 💵 alerta (proactivo)
    // ============================================================
    $stmt = $db->query("
        SELECT
            COUNT(*) AS n_facturas,
            COALESCE(SUM(Saldo), 0) AS monto_total
        FROM vw_facturas_cliente_saldos
        WHERE Saldo > 0
          AND DiasVenc <= 0
          AND Fechav BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL 7 DAY)
    ");
    $row = $stmt->fetch();
    if ($row && intval($row['n_facturas']) > 0) {
        $n = intval($row['n_facturas']);
        $monto = floatval($row['monto_total']);
        $sugerencias[] = [
            'id' => 'facturas_por_vencer_7d',
            'categoria' => 'cartera',
            'nivel' => 'alerta',
            'icono' => 'CalendarClock',
            'titulo' => 'Vencen esta semana',
            'mensaje' => "$n " . ($n === 1 ? 'factura vence' : 'facturas vencen') . " en los próximos 7 días",
            'dato' => '$ ' . number_format($monto, 0, ',', '.'),
            'accion' => [
                'label' => 'Ver cartera',
                'destino' => 'cuentas-cobrar',
                'filtros' => ['vencen_dias' => 7],
            ],
        ];
    }

    // ============================================================
    // 3. STOCK CRÍTICO CON ROTACIÓN — 📦 alerta
    // ============================================================
    // Cruzamos productos bajo stock mínimo con los que sí se han vendido en
    // los últimos 30 días. La vista vw_productos_stock_bajo NO trae ventas
    // (para no pesar), así que las agregamos aquí con JOIN a tbldetalle_venta
    // ya indexado por Factura_N + Items. Query rápido con idx_items en
    // tbldetalle_venta.
    $tieneVistaStockBajo = $db->query("SELECT COUNT(*) FROM information_schema.VIEWS
        WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'vw_productos_stock_bajo'")->fetchColumn();
    if (intval($tieneVistaStockBajo) > 0) {
        $stmt = $db->query("
            SELECT COUNT(*) AS n FROM (
                SELECT sb.Items
                FROM vw_productos_stock_bajo sb
                JOIN tbldetalle_venta d ON d.Items = sb.Items
                JOIN tblventas v ON v.Factura_N = d.Factura_N
                WHERE v.Fecha >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
                  AND v.EstadoFact = 'Valida'
                GROUP BY sb.Items
                HAVING SUM(d.Cantidad) >= 3
            ) t
        ");
        $row = $stmt->fetch();
        if ($row && intval($row['n']) > 0) {
            $n = intval($row['n']);
            $sugerencias[] = [
                'id' => 'stock_critico',
                'categoria' => 'inventario',
                'nivel' => 'alerta',
                'icono' => 'PackageX',
                'titulo' => 'Stock crítico',
                'mensaje' => "$n " . ($n === 1 ? 'producto está' : 'productos están') . " por agotarse y tienen buena rotación",
                'dato' => 'Riesgo de venta perdida',
                'accion' => [
                    'label' => 'Ver stock bajo',
                    'destino' => 'stock-bajo',
                    'filtros' => ['con_rotacion' => true],
                ],
            ];
        }
    }

    // ============================================================
    // 4. CUMPLEAÑOS DE CLIENTE HOY — 🎂 info (solo si aplica)
    // ============================================================
    // Solo clientes con FechaCumple llena. WhatsApp/Telefono solo si es válido.
    $stmt = $db->query("
        SELECT
            CodigoClien, Razon_Social, Whatsapp, Telefonos
        FROM tblclientes
        WHERE FechaCumple IS NOT NULL
          AND FechaCumple <> '0000-00-00'
          AND DAY(FechaCumple) = DAY(CURDATE())
          AND MONTH(FechaCumple) = MONTH(CURDATE())
          AND Razon_Social IS NOT NULL
          AND Razon_Social <> ''
        LIMIT 3
    ");
    $cumples = $stmt->fetchAll();
    if (count($cumples) > 0) {
        // Elegir el primer cumpleaños que tenga nombre para mostrar como principal
        $primero = $cumples[0];
        $wa = trim($primero['Whatsapp'] ?? '');
        $tel = trim($primero['Telefonos'] ?? '');
        // Validar que sea número (mínimo 7 dígitos, solo números y espacios)
        $waValido = preg_match('/^[\d\s]{7,}$/', $wa) === 1 ? preg_replace('/\s+/', '', $wa) : null;
        $telValido = preg_match('/^[\d\s]{7,}$/', $tel) === 1 ? preg_replace('/\s+/', '', $tel) : null;
        $numero = $waValido ?: $telValido;

        $n = count($cumples);
        $sugerencias[] = [
            'id' => 'cumpleanos_hoy',
            'categoria' => 'clientes',
            'nivel' => 'info',
            'icono' => 'Cake',
            'titulo' => $n === 1 ? 'Cumpleaños hoy' : "$n cumpleaños hoy",
            'mensaje' => trim($primero['Razon_Social']) . ($n > 1 ? " y " . ($n - 1) . " más" : ''),
            'dato' => $numero ? "Tel: $numero" : null,
            // Si tiene número válido, ofrecer link WhatsApp; si no, ir al cliente
            'accion' => $numero
                ? ['label' => 'Enviar WhatsApp', 'destino' => 'whatsapp:' . $numero]
                : ['label' => 'Ver cliente', 'destino' => 'cliente:' . $primero['CodigoClien']],
        ];
    }

    // ============================================================
    // 5. VENTAS SEMANA vs PROMEDIO 4 SEMANAS ANTERIORES — 📈 info (siempre)
    // ============================================================
    $stmt = $db->query("
        SELECT
            COALESCE(SUM(CASE WHEN Fecha >= DATE_SUB(CURDATE(), INTERVAL 7 DAY) AND Fecha <= CURDATE() THEN Total ELSE 0 END), 0) AS semana_actual,
            COALESCE(SUM(CASE WHEN Fecha >= DATE_SUB(CURDATE(), INTERVAL 35 DAY) AND Fecha < DATE_SUB(CURDATE(), INTERVAL 7 DAY) THEN Total ELSE 0 END), 0) AS cuatro_semanas_previas
        FROM tblventas
        WHERE EstadoFact = 'Valida'
    ");
    $row = $stmt->fetch();
    if ($row) {
        $semana = floatval($row['semana_actual']);
        $promedio = floatval($row['cuatro_semanas_previas']) / 4;
        if ($promedio > 0) {
            $delta = round((($semana - $promedio) / $promedio) * 100);
            $arriba = $delta >= 0;
            $sugerencias[] = [
                'id' => 'ventas_semana',
                'categoria' => 'ventas',
                'nivel' => 'info',
                'icono' => $arriba ? 'TrendingUp' : 'TrendingDown',
                'titulo' => 'Ventas de la semana',
                'mensaje' => ($arriba ? '+' : '') . $delta . '% vs promedio de 4 semanas previas',
                'dato' => '$ ' . number_format($semana, 0, ',', '.'),
                'accion' => ['label' => 'Ver informe', 'destino' => 'informes-hub'],
            ];
        }
    }

    // ============================================================
    // 6. PRODUCTO MÁS VENDIDO ESTA SEMANA — 🏆 info (siempre)
    // ============================================================
    $stmt = $db->query("
        SELECT
            a.Codigo, a.Nombres_Articulo,
            SUM(d.Cantidad) AS cant_vendida,
            COUNT(DISTINCT v.Factura_N) AS n_facturas
        FROM tbldetalle_venta d
        JOIN tblventas v ON d.Factura_N = v.Factura_N
        JOIN tblarticulos a ON d.Items = a.Items
        WHERE v.Fecha >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)
          AND v.Fecha <= CURDATE()
          AND v.EstadoFact = 'Valida'
          AND a.Nombres_Articulo IS NOT NULL
        GROUP BY a.Items, a.Codigo, a.Nombres_Articulo
        ORDER BY cant_vendida DESC
        LIMIT 1
    ");
    $row = $stmt->fetch();
    if ($row && floatval($row['cant_vendida']) > 0) {
        $nombre = trim($row['Nombres_Articulo']);
        // Truncar nombre largo para que quepa en el card
        $nombreCorto = mb_strlen($nombre) > 35 ? mb_substr($nombre, 0, 32) . '...' : $nombre;
        $sugerencias[] = [
            'id' => 'top_producto',
            'categoria' => 'ventas',
            'nivel' => 'info',
            'icono' => 'Trophy',
            'titulo' => 'Top producto (7 días)',
            'mensaje' => $nombreCorto,
            'dato' => intval($row['cant_vendida']) . ' unids · ' . intval($row['n_facturas']) . ' ' . (intval($row['n_facturas']) === 1 ? 'venta' : 'ventas'),
            'accion' => [
                'label' => 'Ver detalle',
                'destino' => 'inventario',
                'filtros' => ['codigo' => $row['Codigo']],
            ],
        ];
    }

    // Contar sugerencias por nivel para el header del panel
    $conteo = ['urgente' => 0, 'alerta' => 0, 'info' => 0];
    foreach ($sugerencias as $s) {
        $conteo[$s['nivel']]++;
    }

    echo json_encode([
        'success' => true,
        'sugerencias' => $sugerencias,
        'total' => count($sugerencias),
        'conteo' => $conteo,
        'generado_en' => date('Y-m-d H:i:s'),
    ], JSON_UNESCAPED_UNICODE);

} catch (Exception $e) {
    echo json_encode([
        'success' => false,
        'message' => $e->getMessage(),
        'sugerencias' => [],
    ]);
}
