-- =====================================================================
-- CORRECCIÓN: FEs cuyo kardex se duplicó entre reintentos (bug v4.7.12)
-- =====================================================================
-- Cuando una FE se enviaba a DIAN con un prefix provisorio ("FCON-X") y
-- después DIAN la autorizaba con un prefix definitivo distinto ("FE-Y"),
-- el fix de 4.7.12 bajaba stock DOS veces porque la clave de idempotencia
-- era el detalle del kardex (que cambiaba entre intentos).
--
-- Fix en el código (v4.7.13+): el detalle incluye [#id_interno], que no
-- cambia entre reintentos — la idempotencia ya es confiable.
--
-- Este script repara la data histórica:
--   1. Marca las filas FCON (provisorias) como DUPLICADAS (preserva trazas).
--   2. Inserta una fila kardex C_D=1 (compensación) por cada duplicado.
--   3. Devuelve el stock de los artículos afectados.
--
-- IDEMPOTENTE: busca pares no marcados ya como DUPLICADO.
-- =====================================================================

-- 1) Auditoría — qué se va a corregir
SELECT 'Pares duplicados detectados:' AS seccion;
SELECT a.Id_kardex AS id_a, b.Id_kardex AS id_b,
       a.Items, SUBSTRING(a.Detalle,1,30) AS det_a, SUBSTRING(b.Detalle,1,30) AS det_b,
       a.Cant_Sal, DATE_FORMAT(a.Fecha,'%d/%m %H:%i') AS hora
FROM tblkardex a
JOIN tblkardex b ON a.Items = b.Items AND a.Id_kardex < b.Id_kardex
  AND DATE_FORMAT(a.Fecha,'%Y-%m-%d %H:%i') = DATE_FORMAT(b.Fecha,'%Y-%m-%d %H:%i')
  AND a.Cant_Sal = b.Cant_Sal AND a.Cant_Sal > 0 AND a.C_D=2 AND b.C_D=2
WHERE a.Detalle LIKE '%FCON-%' AND b.Detalle LIKE '%FE-%'
  AND a.Detalle NOT LIKE '%HIST%' AND b.Detalle NOT LIKE '%HIST%'
  AND a.Detalle NOT LIKE '%DUPLICADO%'
ORDER BY a.Id_kardex DESC;

-- 2) UPDATE: devolver stock al artículo por el total duplicado
UPDATE tblarticulos art
JOIN (
    SELECT a.Items, SUM(a.Cant_Sal) AS cant_duplicada
    FROM tblkardex a
    JOIN tblkardex b ON a.Items = b.Items AND a.Id_kardex < b.Id_kardex
      AND DATE_FORMAT(a.Fecha,'%Y-%m-%d %H:%i') = DATE_FORMAT(b.Fecha,'%Y-%m-%d %H:%i')
      AND a.Cant_Sal = b.Cant_Sal AND a.Cant_Sal > 0 AND a.C_D=2 AND b.C_D=2
    WHERE a.Detalle LIKE '%FCON-%' AND b.Detalle LIKE '%FE-%'
      AND a.Detalle NOT LIKE '%HIST%' AND b.Detalle NOT LIKE '%HIST%'
      AND a.Detalle NOT LIKE '%DUPLICADO%'
    GROUP BY a.Items
) dup ON dup.Items = art.Items
SET art.Existencia = art.Existencia + dup.cant_duplicada;

-- 3) INSERT fila kardex de compensación por cada duplicado detectado
INSERT INTO tblkardex (Fecha, Mes, Items, Detalle, C_D, Cant_Ent, Cost_Ent, Cant_Sal, Cost_Sal, Cant_Saldo, Cost_Saldo, Cost_Unit)
SELECT
  NOW(),
  ELT(MONTH(NOW()), 'Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'),
  a.Items,
  CONCAT('COMPENSACIÓN doble descuento (orig ids ', a.Id_kardex, '+', b.Id_kardex, ')'),
  1,
  a.Cant_Sal,
  a.Cost_Sal,
  0, 0,
  art.Existencia,                          -- Nuevo saldo (ya actualizado en el UPDATE)
  art.Existencia * COALESCE(art.Precio_Costo, 0),
  COALESCE(art.Precio_Costo, 0)
FROM tblkardex a
JOIN tblkardex b ON a.Items = b.Items AND a.Id_kardex < b.Id_kardex
  AND DATE_FORMAT(a.Fecha,'%Y-%m-%d %H:%i') = DATE_FORMAT(b.Fecha,'%Y-%m-%d %H:%i')
  AND a.Cant_Sal = b.Cant_Sal AND a.Cant_Sal > 0 AND a.C_D=2 AND b.C_D=2
JOIN tblarticulos art ON art.Items = a.Items
WHERE a.Detalle LIKE '%FCON-%' AND b.Detalle LIKE '%FE-%'
  AND a.Detalle NOT LIKE '%HIST%' AND b.Detalle NOT LIKE '%HIST%'
  AND a.Detalle NOT LIKE '%DUPLICADO%';

-- 4) Marcar las filas FCON originales con sufijo DUPLICADO (trazabilidad)
UPDATE tblkardex a
JOIN tblkardex b ON a.Items = b.Items AND a.Id_kardex < b.Id_kardex
  AND DATE_FORMAT(a.Fecha,'%Y-%m-%d %H:%i') = DATE_FORMAT(b.Fecha,'%Y-%m-%d %H:%i')
  AND a.Cant_Sal = b.Cant_Sal AND a.Cant_Sal > 0 AND a.C_D=2 AND b.C_D=2
  AND a.Detalle LIKE '%FCON-%' AND b.Detalle LIKE '%FE-%'
  AND a.Detalle NOT LIKE '%HIST%' AND b.Detalle NOT LIKE '%HIST%'
  AND a.Detalle NOT LIKE '%DUPLICADO%'
SET a.Detalle = CONCAT(a.Detalle, ' [DUPLICADO - COMPENSADO]');

-- 5) Verificación
SELECT 'Verificación — pares que aún estén sin corregir:' AS seccion;
SELECT COUNT(*) AS pendientes
FROM tblkardex a
JOIN tblkardex b ON a.Items = b.Items AND a.Id_kardex < b.Id_kardex
  AND DATE_FORMAT(a.Fecha,'%Y-%m-%d %H:%i') = DATE_FORMAT(b.Fecha,'%Y-%m-%d %H:%i')
  AND a.Cant_Sal = b.Cant_Sal AND a.Cant_Sal > 0 AND a.C_D=2 AND b.C_D=2
WHERE a.Detalle LIKE '%FCON-%' AND b.Detalle LIKE '%FE-%'
  AND a.Detalle NOT LIKE '%HIST%' AND b.Detalle NOT LIKE '%HIST%'
  AND a.Detalle NOT LIKE '%DUPLICADO%';
