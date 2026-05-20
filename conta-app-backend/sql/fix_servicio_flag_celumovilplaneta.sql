-- ============================================================
-- Fix puntual: productos marcados como Servicio=1 por error
-- BD: conta_celumovilplaneta
-- Fecha: 2026-05-19
--
-- Problema: los Items 1, 2, 3, 6, 7 estaban con Servicio=1, así
-- que sus ventas registraban kardex pero NO decrementaban
-- tblarticulos.Existencia. Cant_Saldo del kardex también quedó
-- congelado (copia de Existencia actual, que nunca se movió).
--
-- Solución:
--   1. Servicio = 0 (corrige el flag para que futuras ventas sí descuenten)
--   2. Recalcula Cant_Saldo de las filas existentes del kardex (running total
--      desde el saldo previo). NO se borran filas — kardex inmutable.
--   3. Actualiza Existencia con el saldo final.
--
-- Items 194 (SERVICIO TECNICO) se preserva con Servicio=1.
-- ============================================================

START TRANSACTION;

-- Paso 1: corregir el flag Servicio
UPDATE tblarticulos
SET Servicio = 0
WHERE Items IN (1, 2, 3, 6, 7);

-- Paso 2: recalcular Cant_Saldo del kardex para cada producto afectado.
-- Saldo previo = Existencia_cacheada (ya que nunca se movió por el bug),
-- luego se acumulan entradas y salidas en orden cronológico.
-- Usamos variables de sesión por compatibilidad con MariaDB.
SET @items_to_fix = '1,2,3,6,7';

-- Items 1 (VIDRIOS) — saldo previo 570
SET @saldo := 570;
UPDATE tblkardex
SET Cant_Saldo = (@saldo := @saldo + COALESCE(Cant_Ent,0) - COALESCE(Cant_Sal,0))
WHERE Items = 1
ORDER BY Id_kardex ASC;

-- Items 2 (SILICONA) — saldo previo 715
SET @saldo := 715;
UPDATE tblkardex
SET Cant_Saldo = (@saldo := @saldo + COALESCE(Cant_Ent,0) - COALESCE(Cant_Sal,0))
WHERE Items = 2
ORDER BY Id_kardex ASC;

-- Items 3 (WASECASE) — saldo previo 10, sin movimientos en kardex
-- (no hace falta UPDATE de kardex)

-- Items 6 (CABLE V8) — saldo previo 15
SET @saldo := 15;
UPDATE tblkardex
SET Cant_Saldo = (@saldo := @saldo + COALESCE(Cant_Ent,0) - COALESCE(Cant_Sal,0))
WHERE Items = 6
ORDER BY Id_kardex ASC;

-- Items 7 (CABLE TIPO C) — saldo previo 18
SET @saldo := 18;
UPDATE tblkardex
SET Cant_Saldo = (@saldo := @saldo + COALESCE(Cant_Ent,0) - COALESCE(Cant_Sal,0))
WHERE Items = 7
ORDER BY Id_kardex ASC;

-- Paso 3: actualizar Existencia con el último saldo del kardex
UPDATE tblarticulos a
SET a.Existencia = COALESCE((
  SELECT k.Cant_Saldo
  FROM tblkardex k
  WHERE k.Items = a.Items
  ORDER BY k.Id_kardex DESC
  LIMIT 1
), a.Existencia)
WHERE a.Items IN (1, 2, 6, 7);
-- Items 3 no se toca: no tiene kardex, se queda en 10.

COMMIT;

-- Verificación
SELECT a.Items, a.Codigo, a.Nombres_Articulo, a.Servicio, a.Existencia,
       (SELECT COALESCE(SUM(Cant_Ent),0) FROM tblkardex k WHERE k.Items=a.Items) AS Total_Ent,
       (SELECT COALESCE(SUM(Cant_Sal),0) FROM tblkardex k WHERE k.Items=a.Items) AS Total_Sal,
       (SELECT k.Cant_Saldo FROM tblkardex k WHERE k.Items=a.Items ORDER BY k.Id_kardex DESC LIMIT 1) AS Ultimo_Saldo_Kardex
FROM tblarticulos a
WHERE a.Items IN (1,2,3,6,7,194);
