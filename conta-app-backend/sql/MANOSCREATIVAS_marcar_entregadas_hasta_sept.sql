-- ============================================================
-- Manos Creativas — Marcar como ENTREGADAS todas las líneas pendientes
-- de ventas hechas hasta septiembre 2026 (inclusive).
-- ============================================================
-- Contexto: antes de la v4.7 el campo Entregado quedaba vacío/N para muchas
-- líneas aunque sí se hubieran entregado físicamente. Al imprimir con el
-- nuevo flujo salían como "POR ENTREGAR" cuando ya no lo están.
--
-- Este script marca S + CantidadEntregada = Cantidad + FechaEntrega = fecha
-- de la venta, SOLO para líneas de facturas con fecha < 2026-10-01.
-- Las facturas de octubre y posteriores NO se tocan.
--
-- Correr una sola vez contra la BD de Manos Creativas. Idempotente.
-- ============================================================

-- 1) DIAGNÓSTICO: cuántas líneas se van a tocar, por mes
SELECT 'ANTES — Líneas N por mes (fecha de la venta)' AS info,
       YEAR(v.Fecha) AS anio, MONTH(v.Fecha) AS mes,
       COUNT(*) AS lineas, SUM(d.Cantidad) AS cant_total
  FROM tbldetalle_venta d
  JOIN tblventas v ON v.Factura_N = d.Factura_N
 WHERE COALESCE(d.Entregado, 'N') <> 'S'
   AND v.Fecha < '2026-10-01'
 GROUP BY YEAR(v.Fecha), MONTH(v.Fecha)
 ORDER BY anio DESC, mes DESC;

-- 2) DIAGNÓSTICO: últimas 20 facturas afectadas (verificar visualmente)
-- Código y nombre vienen de tblarticulos. tbldetalle_venta solo guarda Items.
SELECT d.Factura_N, v.Fecha, a.Codigo, a.Nombres_Articulo,
       d.Cantidad, d.Entregado, d.CantidadEntregada
  FROM tbldetalle_venta d
  JOIN tblventas v    ON v.Factura_N = d.Factura_N
  LEFT JOIN tblarticulos a ON a.Items = d.Items
 WHERE COALESCE(d.Entregado, 'N') <> 'S'
   AND v.Fecha < '2026-10-01'
 ORDER BY v.Fecha DESC
 LIMIT 20;

-- ============================================================
-- 3) CORRECCIÓN (descomentar las 7 líneas del UPDATE para aplicar)
-- ============================================================
-- Marca entregadas completas con la fecha de la venta como fecha de entrega
-- retroactiva. UsuarioEntrego queda NULL — no fue un usuario específico.
--
-- UPDATE tbldetalle_venta d
--   JOIN tblventas v ON v.Factura_N = d.Factura_N
--    SET d.Entregado         = 'S',
--        d.CantidadEntregada = d.Cantidad,
--        d.FechaEntrega      = COALESCE(d.FechaEntrega, v.Fecha)
--  WHERE COALESCE(d.Entregado, 'N') <> 'S'
--    AND v.Fecha < '2026-10-01';

-- 4) VERIFICACIÓN POST-UPDATE: debe devolver 0 filas
-- SELECT COUNT(*) AS pendientes_hasta_septiembre
--   FROM tbldetalle_venta d
--   JOIN tblventas v ON v.Factura_N = d.Factura_N
--  WHERE COALESCE(d.Entregado, 'N') <> 'S'
--    AND v.Fecha < '2026-10-01';

-- 5) VERIFICAR que octubre QUEDÓ INTACTO: las N de octubre siguen en N
-- SELECT 'Octubre — líneas N (deben quedar igual)' AS info,
--        COUNT(*) AS pendientes_octubre
--   FROM tbldetalle_venta d
--   JOIN tblventas v ON v.Factura_N = d.Factura_N
--  WHERE COALESCE(d.Entregado, 'N') <> 'S'
--    AND v.Fecha >= '2026-10-01';
