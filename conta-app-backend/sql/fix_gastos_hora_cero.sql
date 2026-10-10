-- ============================================================
-- Fix retroactivo: gastos registrados con Fecha a las 00:00:00
-- ============================================================
-- Causa: el endpoint gastos.php guardaba Fecha='YYYY-MM-DD' (sin hora),
-- MySQL lo completaba como '00:00:00'. Esos gastos quedaban "antes" de la
-- apertura de la caja del día → no aparecían en el cuadre.
-- Corregido en 4.7.5 (gastos.php combina fecha custom con la hora actual).
--
-- Este script arregla los gastos ya grabados con 00:00:00. Les pone 12:00:00
-- del mismo día — así quedan dentro del día calendario y SÍ aparecen en el
-- cuadre de cualquier caja que haya abierto esa fecha.
--
-- NO toca ventas ni pagos, solo tblegresos.
-- Idempotente: correrlo varias veces no acumula daño.
-- ============================================================

-- 1) Diagnóstico: cuántos gastos están afectados y por mes
SELECT 'Gastos con hora 00:00 por mes' AS info,
       YEAR(Fecha) AS anio, MONTH(Fecha) AS mes,
       COUNT(*) AS cantidad, SUM(Valor) AS monto_total
  FROM tblegresos
 WHERE TIME(Fecha) = '00:00:00'
   AND Estado = 'Valida'
   AND FactN = '-1'   -- solo gastos manuales (no pagos a proveedores)
 GROUP BY YEAR(Fecha), MONTH(Fecha)
 ORDER BY anio DESC, mes DESC;

-- 2) Diagnóstico: últimos 20 gastos afectados (ver detalle)
SELECT Id_Egresos, Fecha, N_Comprobante, Concepto, Valor
  FROM tblegresos
 WHERE TIME(Fecha) = '00:00:00'
   AND Estado = 'Valida'
   AND FactN = '-1'
 ORDER BY Id_Egresos DESC
 LIMIT 20;

-- 3) Corrección: ponerles hora 12:00:00 (mediodía del mismo día)
--    Comentado por defecto — descomentar para aplicar.
-- UPDATE tblegresos
--    SET Fecha = CONCAT(DATE(Fecha), ' 12:00:00')
--  WHERE TIME(Fecha) = '00:00:00'
--    AND Estado = 'Valida'
--    AND FactN = '-1';

-- 4) Verificar: debe mostrar 0 filas
-- SELECT COUNT(*) AS pendientes
--   FROM tblegresos
--  WHERE TIME(Fecha) = '00:00:00' AND Estado='Valida' AND FactN='-1';
