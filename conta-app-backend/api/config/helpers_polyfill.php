<?php
/**
 * Polyfill de helpers de BD que originalmente viven en db_factory.php.
 *
 * Problema que resuelve: database.php del cliente legacy nunca se actualiza
 * (skipPaths del syncBackend), por lo que `require_once 'database.php'` NO
 * carga db_factory.php y las funciones conta_* quedan undefined. Un endpoint
 * nuevo que las use revienta en todos los clientes legacy con XAMPP.
 *
 * Este archivo:
 *   - Es sincronizado por el syncBackend (no está en skipPaths).
 *   - Define las funciones solo si no existen ya (idempotente).
 *   - No tiene dependencias — usa information_schema puro.
 *
 * Uso: `require_once __DIR__ . '/../config/helpers_polyfill.php';` justo
 * después de `require_once '../config/database.php';` en el endpoint.
 */

if (!function_exists('conta_tiene_tabla')) {
    function conta_tiene_tabla(PDO $db, string $tabla): bool {
        $stmt = $db->prepare("
            SELECT COUNT(*) FROM information_schema.TABLES
            WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?
        ");
        $stmt->execute([$tabla]);
        return ((int) $stmt->fetchColumn()) > 0;
    }
}

if (!function_exists('conta_tiene_columna')) {
    function conta_tiene_columna(PDO $db, string $tabla, string $columna): bool {
        $stmt = $db->prepare("
            SELECT COUNT(*) FROM information_schema.COLUMNS
            WHERE TABLE_SCHEMA = DATABASE()
              AND TABLE_NAME = ? AND COLUMN_NAME = ?
        ");
        $stmt->execute([$tabla, $columna]);
        return ((int) $stmt->fetchColumn()) > 0;
    }
}

if (!function_exists('conta_columnas_tabla')) {
    function conta_columnas_tabla(PDO $db, string $tabla): array {
        $stmt = $db->prepare("
            SELECT COLUMN_NAME FROM information_schema.COLUMNS
            WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?
        ");
        $stmt->execute([$tabla]);
        return array_column($stmt->fetchAll(PDO::FETCH_ASSOC), 'COLUMN_NAME');
    }
}
