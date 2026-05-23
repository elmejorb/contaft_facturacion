-- ============================================================
-- Fix puntual: pedido 15 duplicado en conta_nutrigranos2
--
-- El pedido 15 es duplicado exacto del pedido 14 (misma factura
-- 183055, mismo proveedor, mismos items, mismas cantidades). Se
-- generó por un bug del flujo de edición de compras: al guardar
-- la edición, en lugar de UPDATE del pedido 14 se creó pedido 15.
--
-- Efectos a revertir:
--   - Inventario incrementado 2 veces para 7 productos
--   - Saldo del proveedor inflado ($20.477.389 cuando debe ser 0)
--   - Detalle y header del pedido 15
--
-- Lo que se conserva:
--   - Pedido 14 (es el correcto, físicamente recibido)
--   - Pago al proveedor (1 egreso de $10.238.694 por factura 183055)
--   - Kardex del pedido 15 (se agregan entradas de SALIDA en reverso
--     en lugar de borrarlas — regla de kardex inmutable)
--
-- Idempotente: si el pedido 15 ya no existe, el script no hace nada.
-- ============================================================

START TRANSACTION;

-- 1. Validar que existe el pedido 15 y NO hay pedidos posteriores con esos items
SET @existe_p15 = (SELECT COUNT(*) FROM tblpedidos WHERE Pedido_N = 15);
SET @hay_posteriores = (
  SELECT COUNT(*) FROM tbldetalle_pedido
  WHERE Items IN (SELECT Items FROM tbldetalle_pedido WHERE Pedido_N = 15)
    AND Pedido_N > 15
);

SELECT
  IF(@existe_p15 = 0, '⚠ Pedido 15 no existe — nada que hacer.',
     IF(@hay_posteriores > 0,
        '⚠ ABORTADO: hay compras posteriores al pedido 15 con esos items. Recálculo necesita revisión manual.',
        '✓ OK: pedido 15 existe y no hay compras posteriores. Procediendo.'))
  AS validacion;

-- Si hay posteriores o no existe, abortar
SET @procede = (@existe_p15 > 0 AND @hay_posteriores = 0);

-- 2. Restar Existencia de los productos (revertir el doble conteo)
UPDATE tblarticulos a
INNER JOIN tbldetalle_pedido d ON d.Items = a.Items AND d.Pedido_N = 15
SET a.Existencia = a.Existencia - d.Cantidad
WHERE @procede = 1;

-- 3. Insertar kardex de SALIDA por reverso (preserva trazabilidad, no borra
--    las entradas originales del pedido 15)
INSERT INTO tblkardex (Fecha, Mes, Items, Detalle, C_D, Cant_Ent, Cost_Ent, Cant_Sal, Cost_Sal, Cant_Saldo, Cost_Saldo, Cost_Unit)
SELECT NOW(), 'Mayo', d.Items,
       'REVERSO Ped. 15 — duplicado de Ped. 14 (fix automático)',
       2, 0, 0, d.Cantidad, d.Cantidad * d.CostoFinal,
       a.Existencia, a.Existencia * a.Precio_Costo, a.Precio_Costo
FROM tbldetalle_pedido d
INNER JOIN tblarticulos a ON a.Items = d.Items
WHERE d.Pedido_N = 15 AND @procede = 1;

-- 4. Eliminar detalle y header del pedido 15
DELETE FROM tbldetalle_pedido WHERE Pedido_N = 15 AND @procede = 1;
DELETE FROM tblpedidos WHERE Pedido_N = 15 AND @procede = 1;

-- 5. Recalcular Saldo del pedido 14 según egresos reales con misma factura
UPDATE tblpedidos p
SET p.Saldo = GREATEST(p.Total - (
  SELECT COALESCE(SUM(e.Valor), 0)
  FROM tblegresos e
  WHERE e.CodigoPro = p.CodigoPro
    AND e.NFacturaAnt = p.FacturaCompra_N
    AND e.Estado = 'Valida'
), 0)
WHERE p.Pedido_N = 14 AND @procede = 1;

COMMIT;

-- ============================================================
-- VERIFICACIÓN POST-FIX
-- ============================================================
SELECT '=== Pedido 14 (debe ser único y con saldo correcto) ===' AS info;
SELECT Pedido_N, FacturaCompra_N, Total, Saldo, EstadoPedido
FROM tblpedidos WHERE FacturaCompra_N = '183055';

SELECT '=== Productos afectados (existencia normalizada) ===' AS info;
SELECT Items, Codigo, Existencia, Precio_Costo
FROM tblarticulos
WHERE Items IN (1,3,9,13,52,53,54)
ORDER BY Items;

SELECT '=== Saldo del proveedor (debe ser 0 o cercano a 0) ===' AS info;
SELECT * FROM vw_proveedores_saldo_actual WHERE CodigoPro = 220505;

SELECT '=== Kardex de reverso registrado ===' AS info;
SELECT Id_kardex, Fecha, Items, Detalle, Cant_Sal, Cant_Saldo
FROM tblkardex
WHERE Detalle LIKE '%REVERSO Ped. 15%'
ORDER BY Id_kardex;
