-- ============================================================
-- Migración v4.9 — Id_Usuario en tblegresos para multi-cajero
-- Sin esta columna, los egresos no se asocian a un cajero específico
-- y se contaban en el cuadre de todos los cajeros con caja abierta.
-- ============================================================

SET @col_exists = (SELECT COUNT(*) FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'tblegresos' AND COLUMN_NAME = 'id_usuario');
SET @sql = IF(@col_exists = 0,
    "ALTER TABLE tblegresos ADD COLUMN id_usuario INT DEFAULT NULL, ADD KEY idx_usuario (id_usuario)",
    'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SELECT 'Migración v4.9 (id_usuario en tblegresos) completada' AS m;
