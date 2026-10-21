-- Fix: líneas con Entregado='S' pero CantidadEntregada = 0 y FechaEntrega NULL.
--
-- CAUSA: nueva.php insertaba el detalle sin rellenar CantidadEntregada ni
-- FechaEntrega, dejando la línea en "falso pendiente" aunque la venta
-- estaba realmente entregada al momento de facturar.
--
-- Bug reportado por: Manos Creativas (dbcontars419102026.sql, 60 líneas
-- entre 2026-10-14 y 2026-10-19). La factura 7589 (BLUSA CANDELARIA T 06)
-- es un ejemplo típico: Entregado='S', CantidadEntregada=0, FechaEntrega NULL.
--
-- SEGURIDAD:
--   - Idempotente: solo toca filas donde falta el tracking.
--   - No modifica stock, kardex ni totales — es puramente visual.
--   - Usa la fecha de la factura como FechaEntrega (fallback a NOW()
--     si por alguna razón no hay fecha en tblventas).
--   - NO corrige las líneas con Entregado='N' (son pendientes legítimos).

UPDATE tbldetalle_venta d
INNER JOIN tblventas v ON v.Factura_N = d.Factura_N
SET
    d.CantidadEntregada = d.Cantidad,
    d.FechaEntrega = COALESCE(v.Fecha, NOW())
WHERE d.Entregado = 'S'
  AND d.Factura_N > 0
  AND (d.CantidadEntregada = 0 OR d.CantidadEntregada IS NULL)
  AND d.FechaEntrega IS NULL
  AND d.Cantidad > 0;

-- Reporte: cuántas filas quedaron inconsistentes aún (debería ser 0).
SELECT 'LINEAS_INCONSISTENTES_RESTANTES' AS verificacion, COUNT(*) AS n
FROM tbldetalle_venta
WHERE Entregado = 'S' AND Factura_N > 0
  AND CantidadEntregada < Cantidad
  AND FechaEntrega IS NULL;
