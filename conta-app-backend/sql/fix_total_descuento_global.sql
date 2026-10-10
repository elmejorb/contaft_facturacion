-- ============================================================
-- Fix facturas con Total inflado por bug de descuento global
-- ============================================================
-- Causa: nueva.php guardaba Total = subtotal + IVA sin restarle
-- el descuento global (campo Descuento). Las facturas con
-- Descuento > 0 quedaron con Total mayor al real.
-- Corregido en 4.7.4. Este script arregla las ya existentes.
--
-- Afecta Total, ValorFact y Saldo en tblventas.
-- NO toca tblpagos (los pagos reales ya se registraron bien).
-- NO toca electronic_documents (la DIAN sí recibió el valor correcto).
--
-- EJECUTAR UNA SOLA VEZ POR BD. Idempotente mientras ninguna
-- venta nueva (post 4.7.4) tenga el problema.
-- ============================================================

-- 1. Diagnóstico: ver qué facturas se van a tocar
SELECT
    Fact_N,
    Fecha,
    Nombre_Cliente,
    Descuento,
    Total AS Total_Actual,
    (Total - Descuento) AS Total_Corregido,
    ValorFact AS ValorFact_Actual,
    Saldo AS Saldo_Actual,
    Tipo,
    Estado
FROM tblventas
WHERE Descuento > 0
  AND Total > 0
ORDER BY Fact_N DESC;

-- 2. Corrección (descomentar para aplicar)
-- UPDATE tblventas
-- SET
--     Total     = Total - Descuento,
--     ValorFact = GREATEST(ValorFact - Descuento, 0),
--     Saldo     = GREATEST(Saldo - Descuento, 0)
-- WHERE Descuento > 0
--   AND Total > 0;

-- 3. Verificar: debe mostrar 0 filas (ninguna factura con saldo negativo)
-- SELECT Fact_N, Total, ValorFact, Saldo FROM tblventas WHERE Saldo < 0 OR ValorFact < 0;
