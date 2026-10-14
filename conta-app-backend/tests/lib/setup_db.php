<?php
/**
 * Resetea la BD de pruebas (conta_test) desde el dump base.
 *
 * Se corre antes de cada test individual. Garantiza que cada test
 * arranca de un estado conocido y reproducible.
 */
function resetTestDatabase() {
    $base = __DIR__ . '/../fixtures/conta_test_base.sql';
    if (!file_exists($base)) {
        throw new RuntimeException("Falta fixture base en $base. Correr tools/regenerar_fixture.php primero.");
    }

    $mysqlBin = 'C:/xampp/mysql/bin/mysql.exe';
    if (!file_exists($mysqlBin)) $mysqlBin = 'mysql'; // fallback a PATH

    // DROP + CREATE + load desde dump
    $cmd = "\"$mysqlBin\" -uroot -proot -e \"DROP DATABASE IF EXISTS conta_test; CREATE DATABASE conta_test CHARACTER SET utf8mb4;\" 2>&1";
    exec($cmd, $out, $rc);
    if ($rc !== 0) throw new RuntimeException("No pude recrear conta_test: " . implode("\n", $out));

    $cmd = "\"$mysqlBin\" -uroot -proot conta_test < \"$base\" 2>&1";
    exec($cmd, $out2, $rc2);
    if ($rc2 !== 0) throw new RuntimeException("No pude cargar fixture: " . implode("\n", $out2));
}

/**
 * Switcha el backend a usar la BD de pruebas.
 *
 * Como no queremos tocar database.php en producción, mantenemos
 * una copia dedicada en tests/fixtures/database_test.php que el
 * runner copia encima durante la ejecución y restaura al terminar.
 */
function switchBackendToTestDb() {
    $src = __DIR__ . '/../fixtures/database_test.php';
    $dst = 'C:/WebServer/Apache24/htdocs/conta-app-backend/api/config/database.php';
    $backup = $dst . '.backup_during_test';

    if (!file_exists($backup)) copy($dst, $backup);
    copy($src, $dst);
}

function restoreBackendDatabase() {
    $dst = 'C:/WebServer/Apache24/htdocs/conta-app-backend/api/config/database.php';
    $backup = $dst . '.backup_during_test';
    if (file_exists($backup)) {
        copy($backup, $dst);
        unlink($backup);
    }
}
