-- ============================================================
-- Migración v4.10 — Asignación de Caja a Usuarios
-- Cada vendedor puede tener una caja asignada (NULL = puede usar cualquiera)
-- ============================================================

SET @col_exists = (SELECT COUNT(*) FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'tblusuarios' AND COLUMN_NAME = 'Id_Caja');
SET @sql = IF(@col_exists = 0,
    "ALTER TABLE tblusuarios ADD COLUMN Id_Caja INT DEFAULT NULL, ADD KEY idx_caja (Id_Caja)",
    'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SELECT 'Migración v4.10 (Id_Caja en tblusuarios) completada' AS m;
