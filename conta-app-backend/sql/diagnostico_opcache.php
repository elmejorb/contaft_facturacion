<?php
// Diagnóstico del estado de OpCache y config PHP relevante para performance.
// Uso: php diagnostico_opcache.php

echo "======= INFO PHP =======" . PHP_EOL;
echo "  version:                " . PHP_VERSION . PHP_EOL;
echo "  memory_limit:           " . ini_get('memory_limit') . PHP_EOL;
echo "  max_execution_time:     " . ini_get('max_execution_time') . "s" . PHP_EOL;
echo "  post_max_size:          " . ini_get('post_max_size') . PHP_EOL;
echo PHP_EOL;

echo "======= OPCACHE =======" . PHP_EOL;
$enabled = ini_get('opcache.enable');
if (!extension_loaded('Zend OPcache') && !function_exists('opcache_get_status')) {
    echo "  [PROBLEMA] Extension OpCache NO CARGADA en php.ini" . PHP_EOL;
    echo "             Cada request de Conta FT recompila TODO el backend." . PHP_EOL;
    echo "             En un Celeron, esto anade 500-2000ms POR REQUEST." . PHP_EOL;
    echo "             Fix: correr optimizar_entorno_xampp.bat" . PHP_EOL;
} elseif (!$enabled) {
    echo "  [PROBLEMA] Extension cargada pero opcache.enable = 0" . PHP_EOL;
    echo "             Editar php.ini y poner: opcache.enable=1" . PHP_EOL;
} else {
    echo "  [OK] OpCache ACTIVO" . PHP_EOL;
    echo "  memory_consumption:     " . ini_get('opcache.memory_consumption') . " MB" . PHP_EOL;
    echo "  max_accelerated_files:  " . ini_get('opcache.max_accelerated_files') . PHP_EOL;
    echo "  validate_timestamps:    " . ini_get('opcache.validate_timestamps') . PHP_EOL;

    if (function_exists('opcache_get_status')) {
        $status = @opcache_get_status(false);
        if ($status && isset($status['memory_usage'])) {
            $usedMB = round($status['memory_usage']['used_memory'] / 1048576, 1);
            $freeMB = round($status['memory_usage']['free_memory'] / 1048576, 1);
            $hitRate = isset($status['opcache_statistics']['opcache_hit_rate'])
                ? round($status['opcache_statistics']['opcache_hit_rate'], 1) . "%"
                : 'n/d';
            echo "  memoria usada:          $usedMB MB" . PHP_EOL;
            echo "  memoria libre:          $freeMB MB" . PHP_EOL;
            echo "  hit_rate:               $hitRate" . PHP_EOL;
        }
    }
}
echo PHP_EOL;

echo "======= WINDOWS DEFENDER =======" . PHP_EOL;
if (stripos(PHP_OS, 'WIN') === 0) {
    // Preguntar a PowerShell si hay exclusiones para carpetas de Apache/XAMPP
    $cmd = 'powershell -NoProfile -Command "(Get-MpPreference).ExclusionPath -join \';\'"';
    @exec($cmd, $out, $rc);
    $exclusiones = is_array($out) ? implode(';', $out) : '';
    if ($rc === 0) {
        $tieneApache = stripos($exclusiones, 'apache') !== false ||
                       stripos($exclusiones, 'htdocs') !== false ||
                       stripos($exclusiones, 'webserver') !== false ||
                       stripos($exclusiones, 'xampp') !== false;
        $tieneProc = false;
        $cmd2 = 'powershell -NoProfile -Command "(Get-MpPreference).ExclusionProcess -join \';\'"';
        @exec($cmd2, $out2, $rc2);
        $procs = is_array($out2) ? implode(';', $out2) : '';
        if (stripos($procs, 'httpd') !== false || stripos($procs, 'mysqld') !== false) $tieneProc = true;

        if ($tieneApache || $tieneProc) {
            echo "  [OK] Exclusiones de Windows Defender detectadas" . PHP_EOL;
        } else {
            echo "  [WARN] SIN exclusiones — Defender puede escanear cada request PHP" . PHP_EOL;
            echo "         En Celeron esto anade 100-300ms por request" . PHP_EOL;
            echo "         Fix: correr optimizar_entorno_xampp.bat como Admin" . PHP_EOL;
        }
    } else {
        echo "  [n/d] No se pudo consultar Defender (necesita PowerShell)" . PHP_EOL;
    }
} else {
    echo "  [SKIP] No es Windows" . PHP_EOL;
}
