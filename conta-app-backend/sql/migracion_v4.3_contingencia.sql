-- ============================================================
-- Migración v4.3 — Modo contingencia DIAN
-- Permite emitir facturas electrónicas sin internet y reenviarlas luego.
-- ============================================================

-- 1. Columnas en tblventas
SET @col_exists = (SELECT COUNT(*) FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'tblventas' AND COLUMN_NAME = 'en_contingencia');
SET @sql = IF(@col_exists = 0,
    "ALTER TABLE tblventas ADD COLUMN en_contingencia TINYINT(1) DEFAULT 0, ADD COLUMN contingencia_fecha DATETIME NULL, ADD COLUMN contingencia_reenviada TINYINT(1) DEFAULT 0, ADD COLUMN contingencia_motivo VARCHAR(255) NULL",
    'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 2. Índice para consultas rápidas de pendientes
SET @idx_exists = (SELECT COUNT(*) FROM information_schema.STATISTICS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'tblventas' AND INDEX_NAME = 'idx_contingencia_pendientes');
SET @sql = IF(@idx_exists = 0,
    "ALTER TABLE tblventas ADD INDEX idx_contingencia_pendientes (en_contingencia, contingencia_reenviada)",
    'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SELECT 'Migración v4.3 Contingencia completada' AS m;
