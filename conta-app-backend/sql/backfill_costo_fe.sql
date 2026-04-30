-- =====================================================================
-- BACKFILL — Precio de costo en detalle_document_electronic
-- =====================================================================
-- Propósito: rellenar la columna PrecioCosto en filas viejas que no la
-- tenían guardada, para que cierre de mes y estado de resultados
-- calculen bien la utilidad histórica.
--
-- Estrategia (en orden de prioridad):
--   1. Si la FE tiene espejo en tbldetalle_venta (mismo factura_n + items):
--      usa PrecioC histórico (exacto, costo en el momento de la venta).
--   2. Si no, usa Precio_Costo actual de tblarticulos (aproximación).
--   3. Si el artículo no existe en tblarticulos: deja en 0.
--
-- Es idempotente: solo toca filas con PrecioCosto NULL. Re-ejecutarlo
-- no daña nada.
-- =====================================================================

-- 0. Asegurar que la columna exista (por si se corre antes de v4.11)
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

-- 1. ESTADO ANTES
SELECT 'ANTES DEL BACKFILL' AS reporte;
SELECT
    COUNT(*) AS total_filas,
    SUM(CASE WHEN PrecioCosto IS NULL THEN 1 ELSE 0 END) AS filas_sin_costo,
    SUM(CASE WHEN PrecioCosto IS NOT NULL THEN 1 ELSE 0 END) AS filas_con_costo,
    ROUND(SUM(invoiced_quantity * COALESCE(PrecioCosto, 0)), 2) AS costo_total_actual
FROM detalle_document_electronic;

-- 2. BACKFILL
UPDATE detalle_document_electronic de
LEFT JOIN tbldetalle_venta dv
    ON dv.Factura_N = de.factura_n AND dv.Items = de.items
LEFT JOIN tblarticulos a ON a.Items = de.items
SET de.PrecioCosto = COALESCE(dv.PrecioC, a.Precio_Costo, 0)
WHERE de.PrecioCosto IS NULL;

-- 3. ESTADO DESPUÉS
SELECT 'DESPUÉS DEL BACKFILL' AS reporte;
SELECT
    COUNT(*) AS total_filas,
    SUM(CASE WHEN PrecioCosto IS NULL THEN 1 ELSE 0 END) AS filas_sin_costo,
    SUM(CASE WHEN PrecioCosto > 0 THEN 1 ELSE 0 END) AS filas_con_costo_valido,
    SUM(CASE WHEN PrecioCosto = 0 THEN 1 ELSE 0 END) AS filas_costo_cero,
    ROUND(SUM(invoiced_quantity * COALESCE(PrecioCosto, 0)), 2) AS costo_total_nuevo
FROM detalle_document_electronic;

-- 4. DIAGNÓSTICO — ítems que quedaron en costo 0 (productos eliminados o sin costo)
SELECT 'ITEMS SIN COSTO (revisar manualmente)' AS reporte;
SELECT
    de.factura_n,
    de.items,
    de.description,
    de.invoiced_quantity,
    de.line_extension_amount AS valor_venta,
    CASE
        WHEN a.Items IS NULL THEN 'Articulo no existe en tblarticulos'
        WHEN a.Precio_Costo IS NULL OR a.Precio_Costo = 0 THEN 'Articulo sin costo configurado'
        ELSE 'Sin venta espejo en tbldetalle_venta'
    END AS razon
FROM detalle_document_electronic de
LEFT JOIN tblarticulos a ON a.Items = de.items
WHERE de.PrecioCosto = 0 OR de.PrecioCosto IS NULL
LIMIT 50;

-- 5. DETALLE POR PERIODO (utilidad bruta de las FE por mes — orientativo)
-- Se calcula ventas y costo por separado para evitar multiplicación por nº de líneas.
SELECT 'IMPACTO POR PERIODO' AS reporte;
SELECT
    v.periodo,
    v.facturas_fe,
    v.ventas_fe,
    c.costo_fe,
    (v.ventas_fe - c.costo_fe) AS utilidad_bruta_fe,
    CONCAT(ROUND(((v.ventas_fe - c.costo_fe) / NULLIF(v.ventas_fe, 0)) * 100, 2), '%') AS margen
FROM (
    SELECT DATE_FORMAT(e.fecha, '%Y-%m') AS periodo,
           COUNT(*) AS facturas_fe,
           ROUND(SUM(e.total), 0) AS ventas_fe
    FROM electronic_documents e
    WHERE e.status = 'autorizado' AND e.type_document_id = 1
      AND e.cufe NOT IN (SELECT cufe FROM tblventas WHERE cufe IS NOT NULL AND cufe != '')
    GROUP BY DATE_FORMAT(e.fecha, '%Y-%m')
) v
LEFT JOIN (
    SELECT DATE_FORMAT(e.fecha, '%Y-%m') AS periodo,
           ROUND(SUM(de.invoiced_quantity * de.PrecioCosto), 0) AS costo_fe
    FROM electronic_documents e
    INNER JOIN detalle_document_electronic de ON de.factura_n = e.id
    WHERE e.status = 'autorizado' AND e.type_document_id = 1
      AND e.cufe NOT IN (SELECT cufe FROM tblventas WHERE cufe IS NOT NULL AND cufe != '')
    GROUP BY DATE_FORMAT(e.fecha, '%Y-%m')
) c ON c.periodo = v.periodo
ORDER BY v.periodo DESC
LIMIT 24;
