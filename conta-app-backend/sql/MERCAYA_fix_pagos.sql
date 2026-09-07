-- ============================================================
-- FIX PAGOS MercaYa · aplica SOLO lo necesario para desbloquear
-- el guardado de pagos. Es un extracto del actualizacion_completa.sql.
-- ============================================================
-- Idempotente (se puede correr varias veces sin problema).
-- No toca datos — solo agrega columnas faltantes y recrea la vista.
--
-- Cómo aplicar (en la PC del cliente):
--   cd C:\xampp\mysql\bin
--   mysql -u root -p conta_mercaya < MERCAYA_fix_pagos.sql
--
-- O desde phpMyAdmin: pestaña SQL → pegar todo → Continuar.
-- ============================================================

-- ── 1. Columnas faltantes en tblpagos ────────────────────────
SET @c1 = (SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'tblpagos' AND COLUMN_NAME = 'Nfact_electronica');
SET @sql = IF(@c1 = 0,
  "ALTER TABLE tblpagos ADD COLUMN Nfact_electronica VARCHAR(50) NULL DEFAULT '' AFTER NFactAnt",
  'SELECT 1');
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;

SET @c2 = (SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'tblpagos' AND COLUMN_NAME = 'id_usuario');
SET @sql = IF(@c2 = 0,
  "ALTER TABLE tblpagos ADD COLUMN id_usuario INT NULL",
  'SELECT 1');
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;

-- ── 2. Columnas faltantes en electronic_documents ────────────
SET @t = (SELECT COUNT(*) FROM information_schema.TABLES
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'electronic_documents');

SET @c3 = IF(@t = 1,
  (SELECT COUNT(*) FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'electronic_documents' AND COLUMN_NAME = 'EstadoFact'), 1);
SET @sql = IF(@c3 = 0,
  "ALTER TABLE electronic_documents ADD COLUMN EstadoFact INT(1) NOT NULL DEFAULT 1",
  'SELECT 1');
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;

SET @c4 = IF(@t = 1,
  (SELECT COUNT(*) FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'electronic_documents' AND COLUMN_NAME = 'email_sent'), 1);
SET @sql = IF(@c4 = 0,
  "ALTER TABLE electronic_documents ADD COLUMN email_sent TINYINT(1) DEFAULT 0, ADD COLUMN email_sent_at DATETIME NULL, ADD COLUMN email_recipient VARCHAR(500) NULL",
  'SELECT 1');
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;

-- ── 3. Recrear la vista vw_facturas_elec_cliente_saldos ──────
SET @sql = IF(@t = 1, "DROP VIEW IF EXISTS vw_facturas_elec_cliente_saldos", 'SELECT 1');
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;

SET @sql = IF(@t = 1, "
CREATE VIEW vw_facturas_elec_cliente_saldos AS
SELECT
    v.id AS DocID,
    CONCAT(v.prefix, v.number) AS Factura_N,
    v.cod_cliente AS CodigoCli,
    c.Razon_Social AS A_Nombre,
    v.fecha AS Fecha,
    v.payment_due_days AS Dias,
    v.fecha + INTERVAL v.payment_due_days DAY AS Fechav,
    v.total AS Total,
    COALESCE(p.TotalPagos, 0) AS TotalPagos,
    GREATEST(v.total - COALESCE(p.TotalPagos, 0), 0) AS Saldo,
    v.payment_form_id AS Tipo,
    v.EstadoFact AS EstadoFact,
    v.updated_at AS updated_at,
    CASE WHEN CURDATE() >= v.fecha + INTERVAL v.payment_due_days DAY
         THEN TO_DAYS(CURDATE()) - TO_DAYS(v.fecha + INTERVAL v.payment_due_days DAY)
         ELSE 0 END AS DiasVenc,
    CURDATE() > v.fecha + INTERVAL v.payment_due_days DAY AS Vencida
FROM electronic_documents v
JOIN tblclientes c ON c.CodigoClien = v.cod_cliente
LEFT JOIN (
    SELECT tp.Codigo AS CodigoCli,
           CAST(NULLIF(tp.Nfact_electronica, '') AS UNSIGNED) AS DocID,
           SUM(tp.ValorPago + COALESCE(tp.Descuento, 0)) AS TotalPagos
    FROM tblpagos tp
    WHERE tp.Estado = 'Valida'
      AND tp.ValorPago >= 0
      AND COALESCE(tp.Descuento, 0) >= 0
      AND tp.Nfact_electronica IS NOT NULL
    GROUP BY tp.Codigo, CAST(NULLIF(tp.Nfact_electronica, '') AS UNSIGNED)
) p ON p.CodigoCli = v.cod_cliente AND p.DocID = v.id
WHERE v.payment_form_id = 2 AND v.status = 'autorizado' AND v.type_document_id = 1
", 'SELECT 1');
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;

-- ── 4. Verificación final ────────────────────────────────────
SELECT 'Columnas tblpagos:' AS chk;
SELECT COLUMN_NAME FROM information_schema.COLUMNS
 WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'tblpagos'
   AND COLUMN_NAME IN ('Nfact_electronica','id_usuario');

SELECT 'Columnas electronic_documents:' AS chk;
SELECT COLUMN_NAME FROM information_schema.COLUMNS
 WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'electronic_documents'
   AND COLUMN_NAME IN ('EstadoFact','email_sent','email_sent_at','email_recipient');

SELECT 'Vista vw_facturas_elec_cliente_saldos:' AS chk;
SHOW TABLES LIKE 'vw_facturas_elec_cliente_saldos';
