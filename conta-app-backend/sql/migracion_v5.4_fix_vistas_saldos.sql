-- =====================================================================
-- Migración v5.4 — Fix vistas de saldos (legacy NFactAnt)
-- =====================================================================
-- Bug: la vista vw_facturas_anteriores_cliente buscaba pagos por
-- tblpagos.NFactAnt, pero en BDs heredadas de VB6 ese campo está vacío
-- y los pagos se guardan en tblpagos.Fact_N. Resultado: los saldos de
-- facturas anteriores nunca se descontaban → cliente seguía apareciendo
-- con saldo aunque hubiera pagado.
--
-- Fix: la vista ahora reconoce pagos por NFactAnt OR por Fact_N
-- (como string para coincidir con tblfacturasanteriores.FacturaN).
-- =====================================================================

-- Solo recrea si la tabla tblfacturasanteriores existe (clientes con cartera vieja)
SET @t = (SELECT COUNT(*) FROM information_schema.TABLES
          WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'tblfacturasanteriores');

SET @sql = IF(@t = 1,
  "DROP VIEW IF EXISTS vw_facturas_anteriores_cliente",
  'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = IF(@t = 1, "
CREATE VIEW vw_facturas_anteriores_cliente AS
SELECT
    fa.CodigoCli,
    fa.FacturaN,
    fa.Fecha,
    fa.Dias,
    fa.Fecha + INTERVAL fa.Dias DAY AS Fechav,
    fa.Valor AS Total,
    COALESCE(p.TotalPagos, 0) AS TotalPagos,
    GREATEST(fa.Valor - COALESCE(p.TotalPagos, 0), 0) AS Saldo,
    CASE WHEN CURDATE() >= fa.Fecha + INTERVAL fa.Dias DAY
         THEN TO_DAYS(CURDATE()) - TO_DAYS(fa.Fecha + INTERVAL fa.Dias DAY)
         ELSE 0 END AS DiasVenc,
    CURDATE() > fa.Fecha + INTERVAL fa.Dias DAY AS Vencida
FROM tblfacturasanteriores fa
LEFT JOIN (
    -- Suma pagos: detecta tanto por NFactAnt (sistema viejo) como por Fact_N (legacy VB6)
    SELECT
        tp.Codigo AS CodigoCli,
        COALESCE(NULLIF(tp.NFactAnt, ''), CAST(tp.Fact_N AS CHAR)) AS FacturaN,
        SUM(tp.ValorPago) AS TotalPagos
    FROM tblpagos tp
    WHERE COALESCE(tp.Estado, 'Valida') = 'Valida'
      AND (
        (tp.NFactAnt IS NOT NULL AND tp.NFactAnt <> '')
        OR tp.Fact_N IS NOT NULL
      )
    GROUP BY tp.Codigo, COALESCE(NULLIF(tp.NFactAnt, ''), CAST(tp.Fact_N AS CHAR))
) p ON p.CodigoCli = fa.CodigoCli AND p.FacturaN = fa.FacturaN
", 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SELECT '✓ v5.4 — vw_facturas_anteriores_cliente recreada (pagos detectados por NFactAnt OR Fact_N)' AS resultado;
