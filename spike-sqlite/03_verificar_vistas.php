<?php
/**
 * Spike SQLite — Paso 3: verificar que las vistas realmente funcionen.
 *
 * Cargar la vista con CREATE no es lo mismo que SQLite entienda su query al
 * ejecutarla. Ejecutamos SELECT * FROM cada vista LIMIT 1 y vemos qué funciones
 * MySQL no portables aparecen.
 *
 * Las vistas se evalúan "lazy" en SQLite — recién al hacer SELECT se parsea
 * la query interna.
 */
$DB     = __DIR__ . '/conta.db';
$REPORT = __DIR__ . '/views_check_report.txt';

$pdo = new PDO('sqlite:' . $DB);
$pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

$views = $pdo->query("SELECT name FROM sqlite_master WHERE type='view' ORDER BY name")->fetchAll(PDO::FETCH_COLUMN);

$log = [];
$log[] = "=== Verificación funcional de las " . count($views) . " vistas ===";
$ok = 0; $fail = 0;
$errorsPorPatron = [];

foreach ($views as $v) {
    try {
        $pdo->query("SELECT * FROM \"$v\" LIMIT 1")->fetchAll();
        $log[] = "  ✓ $v";
        $ok++;
    } catch (PDOException $e) {
        $msg = $e->getMessage();
        $patron = 'desconocido';
        if (preg_match('~no such function:\s*(\w+)~i', $msg, $m)) $patron = "función MySQL ausente: {$m[1]}";
        elseif (strpos($msg, 'no such column') !== false) $patron = 'columna inexistente';
        elseif (strpos($msg, 'misuse') !== false) $patron = 'misuse de aggregate';
        elseif (strpos($msg, 'syntax') !== false) $patron = 'syntax error';
        $errorsPorPatron[$patron] = ($errorsPorPatron[$patron] ?? 0) + 1;
        $log[] = "  ✗ $v → " . substr($msg, 0, 180);
        $fail++;
    }
}

$log[] = "";
$log[] = "=== Resumen ===";
$log[] = "Vistas que funcionan: $ok / " . count($views);
$log[] = "Vistas que fallan al ejecutar: $fail";
$log[] = "";
$log[] = "=== Errores por tipo ===";
foreach ($errorsPorPatron as $p => $n) {
    $log[] = sprintf("  %-50s %d vistas", $p, $n);
}

file_put_contents($REPORT, implode("\n", $log));
echo implode("\n", $log) . "\n";
