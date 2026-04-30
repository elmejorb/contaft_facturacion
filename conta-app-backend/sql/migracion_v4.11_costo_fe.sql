-- =====================================================================
-- v4.11 — Costo de productos en facturas electrónicas
-- =====================================================================
-- Razón: hasta ahora detalle_document_electronic NO guardaba el costo
-- del producto. El cierre de mes solo calculaba costo de tbldetalle_venta
-- (POS), inflando la utilidad cuando había FE puras.
--
-- Cambios:
--  1. Agregar columna PrecioCosto a detalle_document_electronic
--  2. Backfill de filas existentes con tblarticulos.Precio_Costo (actual,
--     porque el costo histórico no se guardó). Nuevas FE guardarán el
--     costo correcto al insertar.
-- =====================================================================

-- 1. Agregar columna si no existe
SET @col_exists = (
    SELECT COUNT(*) FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'detalle_document_electronic'
      AND COLUMN_NAME = 'PrecioCosto'
);
SET @sql = IF(@col_exists = 0,
    'ALTER TABLE detalle_document_electronic ADD COLUMN PrecioCosto DECIMAL(19,4) DEFAULT NULL AFTER price_amount',
    'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 2. Backfill: rellenar PrecioCosto donde sea NULL usando el costo actual
--    del artículo en tblarticulos. Para FE que tienen su contraparte en
--    tbldetalle_venta (mismo factura_n y items), se prefiere ese costo
--    histórico — más exacto.
UPDATE detalle_document_electronic de
LEFT JOIN tbldetalle_venta dv
    ON dv.Factura_N = de.factura_n AND dv.Items = de.items
LEFT JOIN tblarticulos a ON a.Items = de.items
SET de.PrecioCosto = COALESCE(dv.PrecioC, a.Precio_Costo, 0)
WHERE de.PrecioCosto IS NULL;
