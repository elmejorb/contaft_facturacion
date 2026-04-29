-- ============================================================
-- Migración v4.8 — FacturaCompra_N a VARCHAR
-- El N° de factura de proveedor puede ser alfanumérico (ej. AB-12345),
-- antes era INT y MySQL truncaba/rechazaba valores no numéricos.
-- ============================================================

SET @col_type = (SELECT COLUMN_TYPE FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'tblpedidos' AND COLUMN_NAME = 'FacturaCompra_N');
SET @sql = IF(@col_type LIKE 'int%',
    'ALTER TABLE tblpedidos MODIFY COLUMN FacturaCompra_N VARCHAR(50) DEFAULT NULL',
    'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SELECT 'Migración v4.8 (FacturaCompra_N → VARCHAR) completada' AS m;
