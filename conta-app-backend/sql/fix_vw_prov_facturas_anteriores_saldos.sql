-- ============================================================
-- Fix puntual: vw_prov_facturas_anteriores_saldos
--
-- Problema: la versión vieja de la vista tenía el GROUP BY así:
--   ... GROUP BY ..., f.Fecha + INTERVAL f.Dias DAY
-- Al hacer mysqldump (MariaDB) la expresión se serializa como
--   INTERVAL f.Dias AS `day`
-- (interpreta `day` como alias en lugar de la unidad). El import
-- en XAMPP MySQL falla con "syntax error near 'AS `day`'".
--
-- Solución: quitar la expresión de GROUP BY. Es funcionalmente
-- dependiente de f.Fecha y f.Dias (que ya están agrupadas), así
-- que el resultado no cambia.
--
-- USO:
--   mysql -u root -p <base_de_datos> < fix_vw_prov_facturas_anteriores_saldos.sql
--
-- Idempotente. Aplicar antes de hacer dump para distribuir.
-- ============================================================

DROP VIEW IF EXISTS vw_prov_facturas_anteriores_saldos;

CREATE VIEW vw_prov_facturas_anteriores_saldos AS
SELECT
  f.FacturaN                                              AS FacturaN,
  f.CodigoProv                                            AS CodigoPro,
  p.RazonSocial                                           AS RazonSocial,
  f.Fecha                                                 AS Fecha,
  f.Dias                                                  AS Dias,
  f.Fecha + INTERVAL f.Dias DAY                           AS Fechav,
  SUM(f.Valor)                                            AS Total,
  COALESCE(pag.TotalPagos, 0)                             AS TotalPagos,
  GREATEST(SUM(f.Valor) - COALESCE(pag.TotalPagos, 0), 0) AS Saldo
FROM tblfacturasanterioresproveedor f
INNER JOIN tblproveedores p ON p.CodigoPro = f.CodigoProv
LEFT JOIN (
  SELECT t.CodigoPro, t.NFacturaAnt, SUM(t.Valor) AS TotalPagos
  FROM tblegresos t
  WHERE t.Estado = 'Valida' AND t.NFacturaAnt IS NOT NULL
  GROUP BY t.CodigoPro, t.NFacturaAnt
) pag ON pag.CodigoPro = f.CodigoProv
       AND pag.NFacturaAnt = f.FacturaN
GROUP BY f.FacturaN, f.CodigoProv, p.RazonSocial, f.Fecha, f.Dias;

SELECT '✓ Vista vw_prov_facturas_anteriores_saldos recreada con GROUP BY limpio' AS resultado;
