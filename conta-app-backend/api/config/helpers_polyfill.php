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

// Portable MySQL/SQLite: en SQLite no existe `information_schema`, hay que
// usar `sqlite_master` para tablas y `pragma_table_info` para columnas. Caso
// real Abastos la Mona (4.8.18): inventario y otros módulos devolvían
// "Error al cargar los articulos" porque los helpers hacían query MySQL-only.

if (!function_exists('conta_tiene_tabla')) {
    function conta_tiene_tabla(PDO $db, string $tabla): bool {
        if ($db->getAttribute(PDO::ATTR_DRIVER_NAME) === 'sqlite') {
            $stmt = $db->prepare("SELECT COUNT(*) FROM sqlite_master WHERE type='table' AND name = ?");
        } else {
            $stmt = $db->prepare("SELECT COUNT(*) FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?");
        }
        $stmt->execute([$tabla]);
        return ((int) $stmt->fetchColumn()) > 0;
    }
}

if (!function_exists('conta_tiene_columna')) {
    function conta_tiene_columna(PDO $db, string $tabla, string $columna): bool {
        if ($db->getAttribute(PDO::ATTR_DRIVER_NAME) === 'sqlite') {
            $stmt = $db->prepare("SELECT COUNT(*) FROM pragma_table_info(?) WHERE name = ?");
            $stmt->execute([$tabla, $columna]);
        } else {
            $stmt = $db->prepare("SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?");
            $stmt->execute([$tabla, $columna]);
        }
        return ((int) $stmt->fetchColumn()) > 0;
    }
}

if (!function_exists('conta_columnas_tabla')) {
    function conta_columnas_tabla(PDO $db, string $tabla): array {
        if ($db->getAttribute(PDO::ATTR_DRIVER_NAME) === 'sqlite') {
            $stmt = $db->prepare("SELECT name FROM pragma_table_info(?)");
            $stmt->execute([$tabla]);
            return array_column($stmt->fetchAll(PDO::FETCH_ASSOC), 'name');
        }
        $stmt = $db->prepare("SELECT COLUMN_NAME FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?");
        $stmt->execute([$tabla]);
        return array_column($stmt->fetchAll(PDO::FETCH_ASSOC), 'COLUMN_NAME');
    }
}

if (!function_exists('conta_tablas_schema')) {
    function conta_tablas_schema(PDO $db): array {
        $driver = $db->getAttribute(PDO::ATTR_DRIVER_NAME);
        if ($driver === 'sqlite') {
            return $db->query("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'")->fetchAll(PDO::FETCH_COLUMN);
        }
        return $db->query("SELECT TABLE_NAME FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE()")->fetchAll(PDO::FETCH_COLUMN);
    }
}
