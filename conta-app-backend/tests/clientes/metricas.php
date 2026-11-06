<?php
/**
 * Métricas de integridad de una BD de cliente (MySQL o SQLite) → JSON.
 *
 * La usa scripts/test-clientes.mjs para comparar ANTES/DESPUÉS de migrar y
 * MySQL vs SQLite. Lee SOLO tablas base (no vistas) para que el mismo cálculo
 * valga en los dos motores. Toda métrica se guarda redondeada para comparar
 * sin ruido de coma flotante.
 *
 * Uso:
 *   php metricas.php --mysql=<bd>             (root/root@127.0.0.1)
 *   php metricas.php --sqlite=<ruta.db>
 */

$opts = getopt('', ['mysql:', 'sqlite:']);
try {
    if (!empty($opts['mysql'])) {
        $db = new PDO('mysql:host=127.0.0.1;dbname=' . $opts['mysql'] . ';charset=utf8mb4', 'root', 'root');
        $motor = 'mysql';
    } elseif (!empty($opts['sqlite'])) {
        $db = new PDO('sqlite:' . $opts['sqlite']);
        $motor = 'sqlite';
    } else {
        fwrite(STDERR, "Uso: php metricas.php --mysql=<bd> | --sqlite=<ruta>\n");
        exit(2);
    }
    $db->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    $db->setAttribute(PDO::ATTR_DEFAULT_FETCH_MODE, PDO::FETCH_ASSOC);
} catch (Throwable $e) {
    fwrite(STDERR, 'Conexión: ' . $e->getMessage() . "\n");
    exit(2);
}

function tabla_existe(PDO $db, string $motor, string $t): bool {
    if ($motor === 'sqlite') {
        $st = $db->prepare("SELECT COUNT(*) FROM sqlite_master WHERE type='table' AND name = ?");
    } else {
        $st = $db->prepare("SELECT COUNT(*) FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND TABLE_TYPE = 'BASE TABLE'");
    }
    $st->execute([$t]);
    return intval($st->fetchColumn()) > 0;
}
function columnas(PDO $db, string $motor, string $t): array {
    if ($motor === 'sqlite') return array_column($db->query("PRAGMA table_info(\"$t\")")->fetchAll(), 'name');
    $st = $db->prepare("SELECT COLUMN_NAME FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?");
    $st->execute([$t]);
    return $st->fetchAll(PDO::FETCH_COLUMN);
}
function num($v, $dec = 2) { return round(floatval($v ?? 0), $dec); }
function uno(PDO $db, string $sql, array $p = []) { $s = $db->prepare($sql); $s->execute($p); return $s->fetch(); }

$m = ['motor' => $motor];

// --- Ventas POS (tblventas) ---------------------------------------------------
if (tabla_existe($db, $motor, 'tblventas')) {
    $r = uno($db, "SELECT COUNT(*) n, SUM(Total) t FROM tblventas");
    $m['ventas_todas'] = ['n' => intval($r['n']), 'total' => num($r['t'])];
    $r = uno($db, "SELECT COUNT(*) n, SUM(Total) t, SUM(Saldo) s FROM tblventas WHERE EstadoFact = 'Valida'");
    $m['ventas_validas'] = ['n' => intval($r['n']), 'total' => num($r['t'])];
    $m['saldo_cacheado_pos'] = num($r['s']);
}
if (tabla_existe($db, $motor, 'tbldetalle_venta')) {
    $r = uno($db, "SELECT COUNT(*) n, SUM(Cantidad) c, SUM(Subtotal) s FROM tbldetalle_venta");
    $m['detalle_venta'] = ['n' => intval($r['n']), 'cant' => num($r['c'], 3), 'subtotal' => num($r['s'])];
}

// --- Facturación electrónica ---------------------------------------------------
$tieneFE = tabla_existe($db, $motor, 'electronic_documents');
if ($tieneFE) {
    $rows = $db->query("SELECT status, COUNT(*) n, SUM(total) t FROM electronic_documents GROUP BY status ORDER BY status")->fetchAll();
    $m['fe_por_estado'] = [];
    foreach ($rows as $r) $m['fe_por_estado'][(string)$r['status']] = ['n' => intval($r['n']), 'total' => num($r['t'])];
}

// --- Inventario: existencia por producto (huella) -------------------------------
if (tabla_existe($db, $motor, 'tblarticulos')) {
    $rows = $db->query("SELECT Items, Existencia FROM tblarticulos ORDER BY Items")->fetchAll();
    $huella = '';
    $sum = 0;
    foreach ($rows as $r) { $e = num($r['Existencia'], 3); $sum += $e; $huella .= $r['Items'] . ':' . $e . ';'; }
    $m['inventario'] = ['productos' => count($rows), 'existencia_total' => round($sum, 3), 'huella' => sha1($huella)];
}
if (tabla_existe($db, $motor, 'tblkardex')) {
    $r = uno($db, "SELECT COUNT(*) n, SUM(Cant_Ent) e, SUM(Cant_Sal) s FROM tblkardex");
    $m['kardex'] = ['n' => intval($r['n']), 'entradas' => num($r['e'], 3), 'salidas' => num($r['s'], 3)];
}

// --- Pagos de clientes ---------------------------------------------------------
if (tabla_existe($db, $motor, 'tblpagos')) {
    $r = uno($db, "SELECT COUNT(*) n, SUM(ValorPago) t FROM tblpagos");
    $m['pagos_todos'] = ['n' => intval($r['n']), 'total' => num($r['t'])];
    $r = uno($db, "SELECT COUNT(*) n, SUM(ValorPago) t FROM tblpagos WHERE COALESCE(Estado, 'Valida') = 'Valida'");
    $m['pagos_validos'] = ['n' => intval($r['n']), 'total' => num($r['t'])];

    // Cartera POS calculada desde tblpagos (no desde el Saldo cacheado ni vistas)
    if (tabla_existe($db, $motor, 'tblventas')) {
        $r = uno($db, "
            SELECT SUM(CASE WHEN v.Total - COALESCE(p.pagado, 0) > 0 THEN v.Total - COALESCE(p.pagado, 0) ELSE 0 END) s
            FROM tblventas v
            LEFT JOIN (SELECT Fact_N, SUM(ValorPago + COALESCE(Descuento, 0)) pagado
                       FROM tblpagos WHERE COALESCE(Estado, 'Valida') = 'Valida' AND ValorPago > 0 AND Fact_N > 0
                       GROUP BY Fact_N) p ON p.Fact_N = v.Factura_N
            WHERE v.EstadoFact = 'Valida' AND v.Tipo <> 'Contado'");
        $m['cartera_pos'] = num($r['s']);
    }
    // Cartera FE: igual que vw_facturas_elec_cliente_saldos (enlace por id numérico)
    if ($tieneFE && in_array('Nfact_electronica', columnas($db, $motor, 'tblpagos'), true)) {
        $docs = $db->query("SELECT id, cod_cliente, total FROM electronic_documents
                            WHERE payment_form_id = 2 AND status = 'autorizado' AND type_document_id = 1")->fetchAll();
        $pag = [];
        foreach ($db->query("SELECT Codigo, Nfact_electronica, ValorPago, Descuento FROM tblpagos
                             WHERE Estado = 'Valida' AND ValorPago >= 0 AND Nfact_electronica IS NOT NULL") as $p) {
            $id = ctype_digit((string)$p['Nfact_electronica']) ? intval($p['Nfact_electronica']) : 0; // = CAST AS UNSIGNED
            $k = $p['Codigo'] . '|' . $id;
            $pag[$k] = ($pag[$k] ?? 0) + floatval($p['ValorPago']) + floatval($p['Descuento'] ?? 0);
        }
        $s = 0;
        foreach ($docs as $d) $s += max(floatval($d['total']) - ($pag[$d['cod_cliente'] . '|' . $d['id']] ?? 0), 0);
        $m['cartera_fe'] = num($s);
    }
}

// Conteo + suma de una columna, tolerante a esquemas legacy (la columna puede
// no existir en BDs viejas: entonces solo se cuenta).
function agregado(PDO $db, string $motor, string $t, string $col): ?array {
    if (!tabla_existe($db, $motor, $t)) return null;
    $tiene = in_array(strtolower($col), array_map('strtolower', columnas($db, $motor, $t)), true);
    $r = uno($db, "SELECT COUNT(*) n" . ($tiene ? ", SUM($col) t" : '') . " FROM $t");
    $out = ['n' => intval($r['n'])];
    if ($tiene) $out['total'] = num($r['t']);
    return $out;
}

// --- Caja ------------------------------------------------------------------------
if ($a = agregado($db, $motor, 'tblcajas', 'Saldo'))      $m['cajas'] = $a;
if ($a = agregado($db, $motor, 'tblmov_caja', 'Valor'))   $m['mov_caja'] = $a;
if (tabla_existe($db, $motor, 'tblsesiones_caja')) {
    $m['sesiones_caja'] = intval(uno($db, "SELECT COUNT(*) n FROM tblsesiones_caja")['n']);
}

// --- Egresos / compras ------------------------------------------------------------
if ($a = agregado($db, $motor, 'tblegresos', 'Valor'))    $m['egresos'] = $a;
if ($a = agregado($db, $motor, 'tblpedidos', 'Total'))    $m['compras'] = $a;
if (tabla_existe($db, $motor, 'tblclientes')) {
    $m['clientes'] = intval(uno($db, "SELECT COUNT(*) n FROM tblclientes")['n']);
}

echo json_encode($m, JSON_UNESCAPED_UNICODE | JSON_PRESERVE_ZERO_FRACTION) . "\n";
