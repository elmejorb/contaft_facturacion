-- =====================================================================
-- Migración v5.5 — Mover comportamiento de cartera a tblclientes
-- =====================================================================
-- Refactor: el comportamiento y castigo de cartera vivían en una tabla
-- aparte (`tbl_clientes_comportamiento`). Causaba complicaciones:
--   - 2 fetches + merge en el frontend
--   - Race conditions cuando los datos se desincronizaban
--
-- Ahora viven directo en `tblclientes`. Más simple, sin merge, filtro SQL nativo.
-- La tabla vieja `tbl_clientes_comportamiento` se mantiene como histórico (no se
-- borra para preservar la trazabilidad de cuándo se castigó cada cliente).
--
-- Idempotente. Solo agrega columnas si no existen y migra datos sin duplicar.
-- =====================================================================
SET sql_mode = '';

-- 1. Agregar columnas a tblclientes (idempotente)
SET @col = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='tblclientes' AND COLUMN_NAME='comportamiento');
SET @sql = IF(@col=0, "ALTER TABLE tblclientes ADD COLUMN comportamiento ENUM('sin_datos','excelente','puntual','regular','moroso','critico') DEFAULT 'sin_datos'", 'SELECT 1');
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;

SET @col = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='tblclientes' AND COLUMN_NAME='dias_mora_promedio');
SET @sql = IF(@col=0, "ALTER TABLE tblclientes ADD COLUMN dias_mora_promedio INT NULL", 'SELECT 1');
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;

SET @col = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='tblclientes' AND COLUMN_NAME='cartera_castigada');
SET @sql = IF(@col=0, "ALTER TABLE tblclientes ADD COLUMN cartera_castigada TINYINT(1) DEFAULT 0", 'SELECT 1');
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;

SET @col = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='tblclientes' AND COLUMN_NAME='fecha_castigo');
SET @sql = IF(@col=0, "ALTER TABLE tblclientes ADD COLUMN fecha_castigo DATETIME NULL", 'SELECT 1');
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;

SET @col = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='tblclientes' AND COLUMN_NAME='motivo_castigo');
SET @sql = IF(@col=0, "ALTER TABLE tblclientes ADD COLUMN motivo_castigo ENUM('cliente_perdido','empresa_cerrada','no_localizable','acuerdo_fallido','otro') NULL", 'SELECT 1');
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;

SET @col = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='tblclientes' AND COLUMN_NAME='motivo_detalle');
SET @sql = IF(@col=0, "ALTER TABLE tblclientes ADD COLUMN motivo_detalle VARCHAR(255) NULL", 'SELECT 1');
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;

SET @col = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='tblclientes' AND COLUMN_NAME='id_usuario_castigo');
SET @sql = IF(@col=0, "ALTER TABLE tblclientes ADD COLUMN id_usuario_castigo INT NULL", 'SELECT 1');
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;

SET @col = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='tblclientes' AND COLUMN_NAME='nota_cobranza');
SET @sql = IF(@col=0, "ALTER TABLE tblclientes ADD COLUMN nota_cobranza TEXT NULL", 'SELECT 1');
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;

-- 2. Migrar datos desde tbl_clientes_comportamiento si existe
SET @t = (SELECT COUNT(*) FROM information_schema.TABLES WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='tbl_clientes_comportamiento');
SET @sql = IF(@t=1, "
UPDATE tblclientes c
INNER JOIN tbl_clientes_comportamiento cc ON cc.CodigoClien = c.CodigoClien
SET
  c.comportamiento = COALESCE(cc.comportamiento, c.comportamiento),
  c.dias_mora_promedio = COALESCE(cc.dias_mora_promedio, c.dias_mora_promedio),
  c.cartera_castigada = COALESCE(cc.cartera_castigada, c.cartera_castigada),
  c.fecha_castigo = COALESCE(cc.fecha_castigo, c.fecha_castigo),
  c.motivo_castigo = COALESCE(cc.motivo_castigo, c.motivo_castigo),
  c.motivo_detalle = COALESCE(cc.motivo_detalle, c.motivo_detalle),
  c.id_usuario_castigo = COALESCE(cc.id_usuario_castigo, c.id_usuario_castigo),
  c.nota_cobranza = COALESCE(cc.nota_cobranza, c.nota_cobranza)
", 'SELECT 1');
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;

-- 3. Índices para queries rápidas
SET @idx = (SELECT COUNT(*) FROM information_schema.STATISTICS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='tblclientes' AND INDEX_NAME='idx_cartera_castigada');
SET @sql = IF(@idx=0, "ALTER TABLE tblclientes ADD INDEX idx_cartera_castigada (cartera_castigada)", 'SELECT 1');
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;

SET @idx = (SELECT COUNT(*) FROM information_schema.STATISTICS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='tblclientes' AND INDEX_NAME='idx_comportamiento');
SET @sql = IF(@idx=0, "ALTER TABLE tblclientes ADD INDEX idx_comportamiento (comportamiento)", 'SELECT 1');
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;

SELECT '✓ v5.5 — comportamiento+castigo migrado a tblclientes' AS resultado,
  (SELECT COUNT(*) FROM tblclientes WHERE cartera_castigada = 1) AS castigados_actuales;
