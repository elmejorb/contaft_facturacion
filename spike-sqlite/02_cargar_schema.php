<?php
/**
 * Spike SQLite — Paso 2: cargar el schema convertido a SQLite y listar errores.
 *
 * Antes de cargar hace un segundo pass de limpieza para quitar bloques que el
 * convertidor mecánico no supo manejar (procedures, delimiters, etc.) — los
 * reportamos aparte en el informe final.
 *
 * Salida: spike-sqlite/conta.db + schema_load_report.txt
 */

$INPUT  = __DIR__ . '/conta_sqlite_candidate.sql';
$DB     = __DIR__ . '/conta.db';
$REPORT = __DIR__ . '/schema_load_report.txt';

if (!file_exists($INPUT)) {
    fwrite(STDERR, "No encontré el candidato en $INPUT. Correr 01_convertir_schema.php primero.\n");
    exit(1);
}

$sql = file_get_contents($INPUT);

// ----- Segundo pass de limpieza (bloques que no se pueden cargar) -----

$log = [];
$log[] = "=== Segundo pass de limpieza ===";

// 1. Remover PROCEDURE / FUNCTION / TRIGGER / EVENT con todo su DELIMITER
//    Los stored procedures hay que portarlos a PHP (lo hacemos en Fase 1).
$removed = preg_match_all('~DELIMITER\s+;;.*?DELIMITER\s+;~s', $sql, $procs);
$sql = preg_replace('~DELIMITER\s+;;.*?DELIMITER\s+;~s', '', $sql);
$log[] = "  Bloques DELIMITER (procedures/triggers): $removed removidos";

// 2. Remover LOCK/UNLOCK (SQLite no los necesita)
$lockCount = preg_match_all('~^(?:LOCK|UNLOCK)\s+TABLES[^;]*;~m', $sql);
$sql = preg_replace('~^(?:LOCK|UNLOCK)\s+TABLES[^;]*;~m', '', $sql);
$log[] = "  LOCK/UNLOCK TABLES: $lockCount removidos";

// 3. Views: convertirlas de "CREATE ALGORITHM=... DEFINER=... VIEW" a "CREATE VIEW"
$sql = preg_replace('~CREATE\s+(?:ALGORITHM=\w+\s+)?(?:DEFINER=[^\s]+\s+)?(?:SQL\s+SECURITY\s+\w+\s+)?VIEW~i',
                    'CREATE VIEW', $sql);
$log[] = "  CREATE VIEW: cláusulas MySQL-only quitadas";

// 4. CONSTRAINT FOREIGN KEY → SQLite las acepta pero requiere PRAGMA foreign_keys=ON
//    No las removemos: las dejamos y activamos el pragma en la conexión.

// ----- Cargar en SQLite tabla por tabla capturando errores -----

if (file_exists($DB)) unlink($DB);
$pdo = new PDO('sqlite:' . $DB);
$pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
$pdo->exec('PRAGMA foreign_keys = ON');
$pdo->exec('PRAGMA journal_mode = WAL');

// Dividir por sentencias (naive — por `;` al final de línea)
$sentencias = preg_split('~;\s*(?:\n|$)~', $sql);

$ok = 0;
$errorPorPatron = [];
$erroresDetalle = [];
$tablasFallidas = [];
$tablasOk = [];

foreach ($sentencias as $stmt) {
    $stmt = trim($stmt);
    if ($stmt === '' || strpos($stmt, '--') === 0) continue;

    // Identificar qué objeto crea
    $objeto = '';
    if (preg_match('~CREATE\s+(?:UNIQUE\s+)?INDEX\s+(?:IF\s+NOT\s+EXISTS\s+)?"?([^"\s(]+)"?~i', $stmt, $m)) {
        $objeto = 'INDEX ' . $m[1];
    } elseif (preg_match('~CREATE\s+TABLE\s+"?([^"\s(]+)"?~i', $stmt, $m)) {
        $objeto = 'TABLE ' . $m[1];
    } elseif (preg_match('~CREATE\s+VIEW\s+"?([^"\s(]+)"?~i', $stmt, $m)) {
        $objeto = 'VIEW ' . $m[1];
    } else {
        $objeto = 'OTRO: ' . substr($stmt, 0, 40);
    }

    try {
        $pdo->exec($stmt . ';');
        $ok++;
        if (strpos($objeto, 'TABLE ') === 0) $tablasOk[] = substr($objeto, 6);
    } catch (PDOException $e) {
        $msg = $e->getMessage();
        $patron = 'desconocido';
        if (strpos($msg, 'has no column') !== false) $patron = 'FK a columna inexistente';
        elseif (strpos($msg, 'syntax error') !== false) $patron = 'syntax error';
        elseif (strpos($msg, 'duplicate column') !== false) $patron = 'duplicate column';
        elseif (strpos($msg, 'no such table') !== false) $patron = 'no such table (orden FK)';
        elseif (strpos($msg, 'misuse') !== false) $patron = 'misuse de aggregate';
        elseif (strpos($msg, 'not unique') !== false) $patron = 'nombre duplicado';
        $errorPorPatron[$patron] = ($errorPorPatron[$patron] ?? 0) + 1;
        $erroresDetalle[] = "FALLÓ $objeto: " . substr($msg, 0, 150);
        if (strpos($objeto, 'TABLE ') === 0) $tablasFallidas[] = substr($objeto, 6);
    }
}

$log[] = "";
$log[] = "=== Resultado de la carga ===";
$log[] = "Sentencias ejecutadas OK: $ok";
$log[] = "Tablas creadas: " . count($tablasOk) . " / Tablas fallidas: " . count($tablasFallidas);
$log[] = "";
$log[] = "=== Errores por tipo ===";
foreach ($errorPorPatron as $p => $n) {
    $log[] = sprintf("  %-30s %d", $p, $n);
}
$log[] = "";
$log[] = "=== Detalle de errores (primeros 30) ===";
foreach (array_slice($erroresDetalle, 0, 30) as $e) {
    $log[] = "  · $e";
}
if (count($erroresDetalle) > 30) {
    $log[] = "  (... " . (count($erroresDetalle) - 30) . " errores más)";
}
$log[] = "";
$log[] = "=== Verificación: tablas que importan al día a día ===";
$criticas = ['tblventas', 'tbldetalle_venta', 'tblkardex', 'tblarticulos', 'tblclientes',
             'tblproveedores', 'tblpagos', 'tblegresos', 'tblcajas', 'tblsesiones_caja',
             'tblpedidos', 'tbldetalle_pedido', 'tbldatosempresa', 'tblusuarios',
             'electronic_documents', 'detalle_document_electronic'];
foreach ($criticas as $t) {
    $existe = (bool)$pdo->query("SELECT name FROM sqlite_master WHERE type='table' AND name='$t'")->fetchColumn();
    $log[] = sprintf("  %-35s %s", $t, $existe ? 'OK' : 'FALTA');
}

file_put_contents($REPORT, implode("\n", $log));

echo "[SPIKE] BD en $DB (" . number_format(filesize($DB)) . " bytes)\n";
echo "[SPIKE] Reporte en $REPORT\n\n";
echo implode("\n", array_slice($log, 0, 80)) . "\n";
