<?php
/**
 * Script de DIAGNÓSTICO de una BD SQLite de cliente.
 *
 * Uso en la máquina del cliente:
 *   1. Pedirle que abra CMD y ejecute:
 *      cd /d "C:\Users\<USUARIO>\AppData\Local\Programs\Conta FT 4.3\resources"
 *      php-portable\php.exe -c php-portable\php.ini backend\tools\diagnostico_sqlite_cliente.php
 *
 *   2. Copia TODO el output y me lo pega al chat.
 *
 * Qué reporta:
 *   - Versión SQLite + ruta de la BD.
 *   - Qué tablas, vistas, índices tiene (vs los que debería tener).
 *   - Si existe usuario root/admin y qué estado tiene.
 *   - Qué funciones MySQL-shim están disponibles.
 *   - Pruebas de queries típicas que fallan en SQLite mal configurado.
 *
 * No modifica NADA. Solo lee. Seguro de correr en producción.
 */

// Localizar la BD del cliente. El main.js la pone en app.getPath('userData')
// que en Windows depende del `name` del package.json (NO del productName).
// En la 4.8.x el name es "dashboard-facturacion", pero el productName es
// "Conta FT 4.3". Buscamos en ambas por si el valor cambió entre versiones.
$appdata = getenv('APPDATA') ?: '';
$posiblesRutas = [
    "$appdata\\dashboard-facturacion\\conta.db",
    "$appdata\\Conta FT 4.3\\conta.db",
    "$appdata/dashboard-facturacion/conta.db",
    "$appdata/Conta FT 4.3/conta.db",
];

$dbPath = null;
foreach ($posiblesRutas as $r) {
    if (file_exists($r)) { $dbPath = $r; break; }
}

echo "============================================================\n";
echo "  DIAGNÓSTICO SQLite — Conta FT\n";
echo "============================================================\n";
echo "Fecha: " . date('Y-m-d H:i:s') . "\n";
echo "PHP:   " . PHP_VERSION . "\n";

if (!$dbPath) {
    echo "\n[ERROR] No se encontró conta.db en:\n";
    foreach ($posiblesRutas as $r) echo "  - $r\n";
    echo "\nEsto significa que el bootstrap de la BD NUNCA corrió en este cliente.\n";
    echo "¿La app arrancó al menos una vez? ¿Qué dice el config.json?\n";
    exit(1);
}

echo "BD:    $dbPath\n";
echo "       Tamaño: " . number_format(filesize($dbPath) / 1024, 1) . " KB\n";
echo "       Modificado: " . date('Y-m-d H:i:s', filemtime($dbPath)) . "\n";

try {
    $pdo = new PDO("sqlite:$dbPath");
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
} catch (Exception $e) {
    echo "\n[ERROR] No se pudo abrir la BD: " . $e->getMessage() . "\n";
    exit(1);
}

// Registrar los mismos shims MySQL que usa el backend real.
// db_factory.php vive dentro del backend que corre con la app. Buscamos en
// rutas comunes porque este script puede ejecutarse desde Downloads, Desktop,
// la carpeta del repo, o cualquier lado. En producción el backend lo carga
// automáticamente por auto_prepend_file.
$programFiles  = getenv('ProgramFiles')   ?: 'C:\\Program Files';
$programFiles32 = getenv('ProgramFiles(x86)') ?: 'C:\\Program Files (x86)';
$localPrograms = ($userProfile = getenv('USERPROFILE')) ? "$userProfile\\AppData\\Local\\Programs" : '';
$dbFactoryPaths = [
    __DIR__ . '/../api/config/db_factory.php',          // ejecutado desde conta-app-backend/tools
    dirname(__DIR__) . '/api/config/db_factory.php',    // en el repo del dev
    "$localPrograms\\Conta FT 4.3\\resources\\backend\\api\\config\\db_factory.php",
    "$programFiles\\Conta FT 4.3\\resources\\backend\\api\\config\\db_factory.php",
    "$programFiles32\\Conta FT 4.3\\resources\\backend\\api\\config\\db_factory.php",
];
$shimsCargados = false;
$shimsPathUsado = null;
foreach ($dbFactoryPaths as $p) {
    if (file_exists($p)) {
        require_once $p;
        if (function_exists('conta_sqlite_registrar_funciones_mysql')) {
            conta_sqlite_registrar_funciones_mysql($pdo);
            $shimsCargados = true;
            $shimsPathUsado = $p;
            break;
        }
    }
}

$ver = $pdo->query("SELECT sqlite_version()")->fetchColumn();
echo "SQLite: v$ver\n\n";

// ── 1. Contar objetos del schema ──────────────────────────────────
echo "──────────────────────────────────────────────────────────────\n";
echo "  1. SCHEMA — qué objetos existen vs los esperados\n";
echo "──────────────────────────────────────────────────────────────\n";
$nTab = (int) $pdo->query("SELECT COUNT(*) FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'")->fetchColumn();
$nVis = (int) $pdo->query("SELECT COUNT(*) FROM sqlite_master WHERE type='view'")->fetchColumn();
$nIdx = (int) $pdo->query("SELECT COUNT(*) FROM sqlite_master WHERE type='index' AND sql IS NOT NULL")->fetchColumn();

printf("  Tablas:  %3d  (esperadas: 101) %s\n", $nTab, $nTab >= 101 ? "OK" : "FALTAN " . (101 - $nTab));
printf("  Vistas:  %3d  (esperadas:  18) %s\n", $nVis, $nVis >= 18  ? "OK" : "FALTAN " . (18  - $nVis));
printf("  Indices: %3d  (esperados: 149) %s\n", $nIdx, $nIdx >= 149 ? "OK" : "FALTAN " . (149 - $nIdx));

// Tablas críticas que deberían existir (nombres reales del schema)
$tablasCriticas = [
    'tblusuarios', 'tbldatosempresa', 'tblcajas', 'tbltiposusuario',
    'tblarticulos', 'tblclientes', 'tblproveedores', 'tblventas',
    'tbldetalle_venta', 'tblpedidos', 'tbldetalle_pedido', 'tblkardex',
    'tblegresos', 'tblpagos', 'tblsesiones_caja', 'tblmov_caja',
    'electronic_documents',
];
$falta = [];
foreach ($tablasCriticas as $t) {
    $exists = (int) $pdo->query("SELECT COUNT(*) FROM sqlite_master WHERE type='table' AND name='$t'")->fetchColumn();
    if (!$exists) $falta[] = $t;
}
if ($falta) {
    echo "\n  TABLAS CRÍTICAS FALTANTES: " . implode(', ', $falta) . "\n";
} else {
    echo "\n  Todas las tablas críticas existen.\n";
}

// Vistas críticas
$vistasCriticas = [
    'vw_facturas_cliente_saldos', 'vw_facturas_elec_cliente_saldos',
    'vw_prov_cxp_aging', 'vw_productos_stock_bajo', 'vw_lotes_por_vencer',
    'vw_item_ventas_30d', 'vw_item_ventas_90d',
    'vw_auditoria_inventario_90d', 'vw_diagnostico_inventario_30d',
];
$faltaV = [];
foreach ($vistasCriticas as $v) {
    $exists = (int) $pdo->query("SELECT COUNT(*) FROM sqlite_master WHERE type='view' AND name='$v'")->fetchColumn();
    if (!$exists) $faltaV[] = $v;
}
if ($faltaV) {
    echo "\n  VISTAS CRÍTICAS FALTANTES: " . count($faltaV) . "/" . count($vistasCriticas) . "\n";
    foreach ($faltaV as $v) echo "    - $v\n";
}

// ── 2. Datos operativos ───────────────────────────────────────────
echo "\n──────────────────────────────────────────────────────────────\n";
echo "  2. DATOS OPERATIVOS — ¿la empresa está sembrada?\n";
echo "──────────────────────────────────────────────────────────────\n";
$chequeos = [
    'tblusuarios'     => "Usuarios registrados",
    'tbldatosempresa' => "Filas de empresa (debería tener 1)",
    'tblcajas'        => "Cajas configuradas",
    'tblclientes'     => "Clientes",
    'tblarticulos'    => "Artículos / productos",
    'tblventas'       => "Ventas emitidas",
    'tblpedidos'      => "Compras / pedidos",
    'tblegresos'      => "Egresos registrados",
    'tblkardex'       => "Movimientos de kardex",
];
foreach ($chequeos as $t => $label) {
    try {
        $n = (int) $pdo->query("SELECT COUNT(*) FROM $t")->fetchColumn();
        printf("  %-55s %6d\n", "$label ($t):", $n);
    } catch (Exception $e) {
        printf("  %-55s TABLA NO EXISTE\n", "$label ($t):");
    }
}

// Usuario root
echo "\n  Usuario root:\n";
try {
    $r = $pdo->query("SELECT Id_Usuario, Usuario, substr(contrasena,1,15) || '...' AS contrasena_preview, Id_TiposUsuario FROM tblusuarios WHERE Usuario='root'")->fetch(PDO::FETCH_ASSOC);
    if ($r) {
        echo "    EXISTE — Id=" . $r['Id_Usuario'] . ", tipo=" . $r['Id_TiposUsuario'] . "\n";
        echo "    contrasena preview: " . $r['contrasena_preview'] . "\n";
    } else {
        echo "    NO EXISTE — cliente no puede loguearse como root\n";
    }
} catch (Exception $e) {
    echo "    ERROR: " . $e->getMessage() . "\n";
}

// ── 3. Prueba de shims MySQL ──────────────────────────────────────
echo "\n──────────────────────────────────────────────────────────────\n";
echo "  3. SHIMS MySQL — qué funciones funcionan en SQLite\n";
echo "──────────────────────────────────────────────────────────────\n";
if ($shimsCargados) {
    echo "  Shims cargados desde: $shimsPathUsado\n\n";
} else {
    echo "  Shims NO CARGADOS por el script — db_factory.php no se encontro.\n";
    echo "  OJO: en producción, cuando el backend corre dentro de la app, SI los\n";
    echo "  carga automaticamente (via auto_prepend_file). Esta prueba solo es\n";
    echo "  util corriendola desde dentro del repo del backend. Los FALTA de\n";
    echo "  abajo NO reflejan problemas reales si el cliente puede operar la app.\n\n";
}

$shimsAProbar = ['YEAR', 'MONTH', 'DAY', 'NOW', 'CURDATE', 'DATE_FORMAT',
                 'DATEDIFF', 'CONCAT', 'CONCAT_WS', 'FIELD', 'LEAST',
                 'GREATEST', 'REGEXP', 'SUBSTRING', 'IF'];
foreach ($shimsAProbar as $fn) {
    try {
        if ($fn === 'DATE_FORMAT') $sql = "SELECT DATE_FORMAT('2026-10-23', '%Y-%m') AS r";
        else if ($fn === 'CONCAT')  $sql = "SELECT CONCAT('a','b','c') AS r";
        else if ($fn === 'CONCAT_WS') $sql = "SELECT CONCAT_WS('-','x','y','z') AS r";
        else if ($fn === 'FIELD')   $sql = "SELECT FIELD('b','a','b','c') AS r";
        else if ($fn === 'LEAST')   $sql = "SELECT LEAST(3,1,2) AS r";
        else if ($fn === 'GREATEST')$sql = "SELECT GREATEST(1,3,2) AS r";
        else if ($fn === 'REGEXP')  $sql = "SELECT 'abc123' REGEXP '[0-9]+' AS r";
        else if ($fn === 'SUBSTRING') $sql = "SELECT SUBSTRING('hola mundo', 6, 5) AS r";
        else if ($fn === 'IF')      $sql = "SELECT IF(1=1, 'si', 'no') AS r";
        else if ($fn === 'NOW' || $fn === 'CURDATE') $sql = "SELECT $fn() AS r";
        else if ($fn === 'DATEDIFF') $sql = "SELECT DATEDIFF('2026-10-23','2026-10-20') AS r";
        else                        $sql = "SELECT $fn('2026-10-23') AS r";

        $r = $pdo->query($sql)->fetchColumn();
        printf("  %-13s OK  → %s\n", $fn, $r);
    } catch (Exception $e) {
        $err = str_replace("SQLSTATE[HY000]: General error: 1 ", "", $e->getMessage());
        printf("  %-13s FALTA  (%s)\n", $fn, substr($err, 0, 60));
    }
}

// ── 4. Checar queries típicas que fallan ──────────────────────────
echo "\n──────────────────────────────────────────────────────────────\n";
echo "  4. QUERIES CRÍTICAS — ¿fallan los informes?\n";
echo "──────────────────────────────────────────────────────────────\n";
$pruebas = [
    "Informe resumen (CONCAT + YEAR)" =>
        "SELECT CONCAT(YEAR(Fecha),'-',printf('%02d',MONTH(Fecha))) AS mes FROM tblventas LIMIT 1",
    "Vista facturas por cliente" =>
        "SELECT COUNT(*) FROM vw_facturas_cliente_saldos",
    "Vista productos stock bajo" =>
        "SELECT COUNT(*) FROM vw_productos_stock_bajo",
    "Vista cxp aging" =>
        "SELECT COUNT(*) FROM vw_prov_cxp_aging",
    "Datediff cartera" =>
        "SELECT DATEDIFF(CURDATE(), Fecha) FROM tblventas LIMIT 1",
    "LIMIT portable" =>
        "SELECT 1 FROM tblarticulos LIMIT 1 OFFSET 0",
];
foreach ($pruebas as $label => $sql) {
    try {
        $pdo->query($sql)->fetchAll();
        printf("  %-45s OK\n", $label);
    } catch (Exception $e) {
        $err = str_replace("SQLSTATE[HY000]: General error: 1 ", "", $e->getMessage());
        printf("  %-45s FALLA  (%s)\n", $label, substr($err, 0, 50));
    }
}

echo "\n============================================================\n";
echo "  FIN DEL DIAGNÓSTICO\n";
echo "============================================================\n";
echo "\nSi el output es largo, copiá TODO (desde '=== DIAGNÓSTICO' hasta '=== FIN')\n";
echo "y pegalo en el chat. Con eso sé exactamente qué le falta a esta BD.\n";
