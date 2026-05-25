-- ============================================================
-- Resincronización de tblventas.Saldo desde la fuente real (tblpagos).
--
-- Recalcula el cache `tblventas.Saldo` y `pagada` para todas las facturas
-- a crédito válidas, leyendo SUM(ValorPago + Descuento) de pagos legítimos
-- (Estado='Valida', ValorPago > 0).
--
-- Aplicar cuando se detecta que algún cliente tiene saldo cacheado
-- desincronizado con la realidad (ej. saldo negativo en informes).
--
-- USO:
--   mysql -u root -p <base_de_datos> < resync_saldos_clientes.sql
--
-- Idempotente: tras correr una vez, futuras corridas no cambian nada.
-- A partir de v4.3.41+ el backend usa recalcularSaldoFactura() después
-- de cada operación de pago, así que el saldo se auto-cura solo —
-- este script ya no será necesario.
-- ============================================================

UPDATE tblventas v
LEFT JOIN (
  SELECT Fact_N,
         SUM(ValorPago + COALESCE(Descuento, 0)) AS pagado
  FROM tblpagos
  WHERE COALESCE(Estado, 'Valida') = 'Valida'
    AND ValorPago > 0
    AND Fact_N IS NOT NULL AND Fact_N > 0
  GROUP BY Fact_N
) p ON p.Fact_N = v.Factura_N
SET v.Saldo  = GREATEST(v.Total - COALESCE(p.pagado, 0), 0),
    v.pagada = IF(v.Total - COALESCE(p.pagado, 0) <= 0.001, '1', '')
WHERE v.Tipo = 'Crédito'
  AND v.EstadoFact = 'Valida';

-- Verificación: cuántas facturas seguían desincronizadas antes del fix
SELECT
  COUNT(*) AS facturas_credito_validas,
  SUM(CASE WHEN Saldo < 0 THEN 1 ELSE 0 END) AS con_saldo_negativo_residual,
  SUM(CASE WHEN Saldo > 0 THEN 1 ELSE 0 END) AS con_saldo_positivo,
  SUM(Saldo) AS saldo_total
FROM tblventas
WHERE Tipo = 'Crédito' AND EstadoFact = 'Valida';
