<?php
/**
 * Spike SQLite — Paso 1: convertir schema MySQL a SQLite.
 *
 * Hace los reemplazos mecánicos conocidos (AUTO_INCREMENT, ENUM, backticks,
 * ENGINE/CHARSET, DEFAULT CURRENT_TIMESTAMP ON UPDATE, etc.) sobre el dump
 * del template actual. Reporta qué patrones MySQL-only se encontraron
 * en cada tabla.
 *
 * NO toca el backend. Entrada: conta-app-backend/sql/conta_template_limpio.sql
 * Salida:  spike-sqlite/conta_sqlite_candidate.sql + conversion_report.txt
 */

$INPUT  = __DIR__ . '/../conta-app-backend/sql/conta_template_limpio.sql';
$OUTPUT = __DIR__ . '/conta_sqlite_candidate.sql';
$REPORT = __DIR__ . '/conversion_report.txt';

if (!file_exists($INPUT)) {
    fwrite(STDERR, "No encontré el input en $INPUT\n");
    exit(1);
}

$sql = file_get_contents($INPUT);
$originalBytes = strlen($sql);

echo "[SPIKE] Leyendo $INPUT (" . number_format($originalBytes) . " bytes)\n";

// ---------------------------------------------------------------
// Reemplazos MECÁNICOS (seguros, no cambian semántica importante)
// ---------------------------------------------------------------
$log = [];
$log[] = "=== Reemplazos mecánicos aplicados ===";

function logReplace(&$log, $sql, $patron, $reemplazo, $nombre) {
    $antes = preg_match_all($patron, $sql);
    $sql = preg_replace($patron, $reemplazo, $sql);
    $log[] = sprintf("  %-45s %d ocurrencias", $nombre, $antes);
    return $sql;
}

// 1. Comentarios y pragmas MySQL que SQLite ignora o rechaza
$sql = logReplace($log, $sql, '~/\*![0-9]+ .*? \*/;?~m', '', '/*!...*/ pragmas MySQL');
$sql = logReplace($log, $sql, '~^SET\s+(SQL_MODE|FOREIGN_KEY_CHECKS|UNIQUE_CHECKS|AUTOCOMMIT|CHARACTER_SET_CLIENT|CHARACTER_SET_RESULTS|CHARACTER_SET_CONNECTION|time_zone|NAMES|@saved_[a-z_]+|@old_[a-z_]+)[^;]*;~mi', '', 'SET session (SQL_MODE, @saved_, @old_)');
$sql = logReplace($log, $sql, '~^SET\s+character_set_client[^;]*;~mi', '', 'SET character_set_client');
$sql = logReplace($log, $sql, '~^START TRANSACTION;~m', 'BEGIN;', 'START TRANSACTION → BEGIN');
$sql = logReplace($log, $sql, '~`([^`]+)`~', '"$1"', 'backticks → comillas dobles');
$sql = logReplace($log, $sql, '~\s+COMMENT\s+\'(?:[^\']|\\\\\')*\'~i', '', 'COMMENT en columna/tabla');

// 2. ENGINE / CHARSET / COLLATE sobrantes del CREATE TABLE
$sql = logReplace($log, $sql, '~\s+ENGINE\s*=\s*\w+~i', '', 'ENGINE=InnoDB');
$sql = logReplace($log, $sql, '~\s+DEFAULT\s+CHARSET\s*=\s*\w+~i', '', 'DEFAULT CHARSET=utf8mb4');
$sql = logReplace($log, $sql, '~\s+COLLATE\s*=\s*[\w_]+~i', '', 'COLLATE= tabla');
$sql = logReplace($log, $sql, '~\s+COLLATE\s+[\w_]+~i', '', 'COLLATE columna');
$sql = logReplace($log, $sql, '~\s+CHARACTER\s+SET\s+\w+~i', '', 'CHARACTER SET');
$sql = logReplace($log, $sql, '~\s+ROW_FORMAT\s*=\s*\w+~i', '', 'ROW_FORMAT=DYNAMIC');
$sql = logReplace($log, $sql, '~\s+AUTO_INCREMENT\s*=\s*\d+~i', '', 'AUTO_INCREMENT=N (tabla)');

// 3. Tipos: convertir a los que SQLite entiende nativos
$sql = logReplace($log, $sql, '~\btinyint\s*\(\s*\d+\s*\)~i', 'INTEGER', 'tinyint(N) → INTEGER');
$sql = logReplace($log, $sql, '~\bsmallint\s*\(\s*\d+\s*\)~i', 'INTEGER', 'smallint(N) → INTEGER');
$sql = logReplace($log, $sql, '~\bmediumint\s*\(\s*\d+\s*\)~i', 'INTEGER', 'mediumint(N) → INTEGER');
$sql = logReplace($log, $sql, '~\bbigint\s*\(\s*\d+\s*\)~i', 'INTEGER', 'bigint(N) → INTEGER');
$sql = logReplace($log, $sql, '~\bint\s*\(\s*\d+\s*\)~i', 'INTEGER', 'int(N) → INTEGER');
$sql = logReplace($log, $sql, '~\bfloat\s*\(\s*\d+\s*,\s*\d+\s*\)~i', 'REAL', 'float(p,s) → REAL');
$sql = logReplace($log, $sql, '~\bdouble\s*\(\s*\d+\s*,\s*\d+\s*\)~i', 'REAL', 'double(p,s) → REAL');
$sql = logReplace($log, $sql, '~\bdecimal\s*\(\s*\d+\s*,\s*\d+\s*\)~i', 'NUMERIC', 'decimal(p,s) → NUMERIC');
$sql = logReplace($log, $sql, '~\bnumeric\s*\(\s*\d+\s*,\s*\d+\s*\)~i', 'NUMERIC', 'numeric(p,s) → NUMERIC');

// 4. AUTO_INCREMENT en columna
$sql = logReplace($log, $sql, '~\bAUTO_INCREMENT\b~i', 'AUTOINCREMENT', 'AUTO_INCREMENT (col)');

// 5. ENUM / SET → TEXT (SQLite no tiene ENUM, se maneja con CHECK en app)
$sql = logReplace($log, $sql, '~\benum\s*\([^)]*\)~i', 'TEXT', 'enum(...) → TEXT');
$sql = logReplace($log, $sql, '~\bset\s*\([^)]*\)~i', 'TEXT', 'set(...) → TEXT');

// 6. TIMESTAMP / DATETIME con DEFAULT CURRENT_TIMESTAMP ON UPDATE → SQLite no soporta ON UPDATE
$sql = logReplace($log, $sql, '~\s+ON\s+UPDATE\s+CURRENT_TIMESTAMP(\(\))?~i', '', 'ON UPDATE CURRENT_TIMESTAMP');
// current_timestamp() con paréntesis — SQLite acepta CURRENT_TIMESTAMP sin ()
$sql = logReplace($log, $sql, '~\bcurrent_timestamp\(\)~i', 'CURRENT_TIMESTAMP', 'current_timestamp() → CURRENT_TIMESTAMP');

// 7. KEY / INDEX dentro de CREATE TABLE — SQLite no acepta índices inline (salvo PK/UNIQUE)
//    + Fusionar AUTOINCREMENT con PRIMARY KEY (SQLite exige `col INTEGER PRIMARY KEY AUTOINCREMENT` inline)
//    Los índices se extraen a CREATE INDEX separados
$extraIndices = [];
$autoincFusionados = 0;
$sql = preg_replace_callback(
    '~CREATE\s+TABLE\s+"([^"]+)"\s*\((.*?)\)\s*;~si',
    function($m) use (&$extraIndices, &$log, &$autoincFusionados) {
        $tabla = $m[1];
        $cuerpo = $m[2];
        $lineasOrig = preg_split('/,(?![^(]*\))/', $cuerpo);

        // Primer paso: detectar la PK para fusionarla con AUTOINCREMENT
        $pkCols = null;
        foreach ($lineasOrig as $linea) {
            $t = trim($linea);
            if (preg_match('~^PRIMARY\s+KEY\s*\(([^)]+)\)~i', $t, $mp)) {
                $pkCols = preg_split('~\s*,\s*~', trim($mp[1]));
                $pkCols = array_map(fn($c) => trim($c, '" '), $pkCols);
                break;
            }
        }

        $lineasFiltradas = [];
        $pkFusionada = false;
        foreach ($lineasOrig as $linea) {
            $t = trim($linea);

            // KEY / UNIQUE KEY / FULLTEXT KEY → extraer o descartar
            if (preg_match('~^KEY\s+"([^"]+)"\s*\(([^)]+)\)~i', $t, $mk)) {
                $extraIndices[] = "CREATE INDEX IF NOT EXISTS \"idx_{$tabla}_{$mk[1]}\" ON \"$tabla\" ({$mk[2]});";
                continue;
            }
            if (preg_match('~^UNIQUE\s+KEY\s+"([^"]+)"\s*\(([^)]+)\)~i', $t, $mu)) {
                $extraIndices[] = "CREATE UNIQUE INDEX IF NOT EXISTS \"uq_{$tabla}_{$mu[1]}\" ON \"$tabla\" ({$mu[2]});";
                continue;
            }
            if (preg_match('~^FULLTEXT\s+KEY~i', $t)) continue;

            // Columna con AUTOINCREMENT: si es la PK de 1 sola columna, fusionamos
            if (!$pkFusionada && $pkCols && count($pkCols) === 1 &&
                preg_match('~^"([^"]+)"\s+INTEGER\b~i', $t, $mcol) &&
                stripos($t, 'AUTOINCREMENT') !== false &&
                $mcol[1] === $pkCols[0]
            ) {
                // Reescribir la línea: col INTEGER PRIMARY KEY AUTOINCREMENT (preserva NOT NULL y DEFAULT)
                $lineasFiltradas[] = "  \"{$mcol[1]}\" INTEGER PRIMARY KEY AUTOINCREMENT";
                $pkFusionada = true;
                $autoincFusionados++;
                continue;
            }
            // Si llegamos a la línea PRIMARY KEY y ya la fusionamos, saltamos
            if ($pkFusionada && preg_match('~^PRIMARY\s+KEY\b~i', $t)) continue;

            $lineasFiltradas[] = $linea;
        }
        return "CREATE TABLE \"$tabla\" (" . implode(',', $lineasFiltradas) . ");";
    },
    $sql
);
$log[] = sprintf("  %-45s %d PKs fusionadas con AUTOINCREMENT", 'PRIMARY KEY + AUTOINCREMENT', $autoincFusionados);
if ($extraIndices) {
    $log[] = sprintf("  %-45s %d índices extraídos a CREATE INDEX", 'KEY inline → CREATE INDEX', count($extraIndices));
    $sql .= "\n\n-- Índices extraídos de los CREATE TABLE\n" . implode("\n", $extraIndices) . "\n";
}

// ---------------------------------------------------------------
// Detección de patrones que NO podemos convertir automáticamente
// ---------------------------------------------------------------
$log[] = "";
$log[] = "=== Patrones MySQL-only detectados (requieren revisión manual) ===";

$detecciones = [
    'TRIGGER'       => '~CREATE\s+(?:DEFINER=[^\s]+\s+)?TRIGGER~i',
    'PROCEDURE'     => '~CREATE\s+(?:DEFINER=[^\s]+\s+)?PROCEDURE~i',
    'FUNCTION'      => '~CREATE\s+(?:DEFINER=[^\s]+\s+)?FUNCTION~i',
    'VIEW_WITH_IF'  => '~CREATE\s+(?:ALGORITHM=\w+\s+)?(?:DEFINER=[^\s]+\s+)?(?:SQL\s+SECURITY\s+\w+\s+)?VIEW~i',
    'EVENT'         => '~CREATE\s+(?:DEFINER=[^\s]+\s+)?EVENT~i',
    'LOCK_TABLES'   => '~^LOCK\s+TABLES~mi',
    'UNLOCK'        => '~^UNLOCK\s+TABLES~mi',
    'FULLTEXT'      => '~FULLTEXT\b~i',
    'GENERATED_AS'  => '~GENERATED\s+ALWAYS\s+AS~i',
    'DELIMITER'     => '~^DELIMITER~mi',
];

foreach ($detecciones as $nombre => $patron) {
    $n = preg_match_all($patron, $sql);
    $log[] = sprintf("  %-25s %d apariciones", $nombre, $n);
}

// Lista de tablas que terminaron en el output
preg_match_all('~CREATE\s+TABLE\s+"([^"]+)"~i', $sql, $tablasMatch);
$log[] = "";
$log[] = "=== Tablas en el output final ===";
$log[] = "Total: " . count($tablasMatch[1]);

file_put_contents($OUTPUT, $sql);
file_put_contents($REPORT, implode("\n", $log));

echo "[SPIKE] Escrito $OUTPUT (" . number_format(strlen($sql)) . " bytes)\n";
echo "[SPIKE] Reporte en $REPORT\n";
echo "\n";
echo "--- RESUMEN ---\n";
echo implode("\n", array_slice($log, 0, 50)) . "\n";
