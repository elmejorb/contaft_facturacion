-- ============================================================================
-- FIX: Ajustar Existencia del producto ALITAS EN BOLSA MARINADAS PURO POLLO
--      tras error de digitación en el Conteo #2 (2026-08-06).
-- ============================================================================
--
-- CONTEXTO
--   Al cerrar el Conteo #2, se digitó "28.175" en la casilla de conteo del
--   producto Items=201236 (ALITAS EN BOLSA MARINADAS PURO POLLO X K).
--   El sistema interpretó ese valor como 28 unidades con 175 milésimas.
--   El snapshot era 15566, por lo que quedó con una "salida" de 15537.825
--   unidades y una pérdida en libros de $-153.824.467.
--
--   El resto del conteo está sano: sin ese error, el inventario cerraba con
--   un sobrante de $1.456.572 (normal en conteo físico grande).
--
--   Este script ajusta la existencia del ALITAS al valor real y registra el
--   ajuste en el kardex (regla de inmutabilidad del proyecto — nunca borrar
--   filas del kardex, solo agregar el ajuste inverso).
--
-- ANTES DE CORRER
--   1. Confirmar con el cliente cuántas unidades contaron REALMENTE del ALITAS.
--   2. Reemplazar el valor `@cantidad_correcta` de abajo.
--   3. Ejecutar todo el bloque.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- PASO 0 — Estado actual (antes del ajuste)
-- ----------------------------------------------------------------------------
SELECT Items, Codigo, Nombres_Articulo, Existencia, Precio_Costo,
       ROUND(Existencia * Precio_Costo, 2) AS valor_actual
FROM tblarticulos
WHERE Items = 201236;
-- Debería mostrar Existencia = 28.175 (el valor incorrecto).


-- ----------------------------------------------------------------------------
-- PASO 1 — Definir la cantidad correcta
-- ----------------------------------------------------------------------------
-- ⬇️ CAMBIA este número por el que el cliente confirme que contó realmente.
-- Ejemplo: si contaron 28175 unidades → SET @cantidad_correcta := 28175;
--          si contaron 20000 unidades → SET @cantidad_correcta := 20000;
SET @cantidad_correcta := 28175;   -- ← EDITAR ANTES DE EJECUTAR

-- Variables auxiliares (no tocar)
SET @items := 201236;
SET @existencia_actual := (SELECT Existencia FROM tblarticulos WHERE Items = @items);
SET @costo_unit := (SELECT Precio_Costo FROM tblarticulos WHERE Items = @items);
SET @diferencia := @cantidad_correcta - @existencia_actual;
SET @valor_diferencia := @diferencia * @costo_unit;

-- Verificación previa (nada se toca todavía)
SELECT
    @items AS Items,
    @existencia_actual AS existencia_actual,
    @cantidad_correcta AS cantidad_correcta,
    @diferencia AS diferencia_a_ingresar,
    @costo_unit AS costo_unit,
    @valor_diferencia AS valor_del_ajuste;
-- Revisa que diferencia_a_ingresar sea POSITIVA (entrada) y del orden esperado.


-- ----------------------------------------------------------------------------
-- PASO 2 — Registrar ajuste en el kardex + actualizar existencia
-- ----------------------------------------------------------------------------
-- INSERT kardex: entrada (C_D=1) por la diferencia. El detalle deja claro que
-- es una corrección del conteo, para trazabilidad en auditoría.
INSERT INTO tblkardex (
    Fecha, Mes, Items, Detalle, C_D,
    Cant_Ent, Cost_Ent,
    Cant_Sal, Cost_Sal,
    Cant_Saldo, Cost_Saldo, Cost_Unit
)
SELECT
    NOW(),
    ELT(MONTH(NOW()),'Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'),
    @items,
    CONCAT('AJUSTE - Corrección conteo #2 (typo decimal): existía 15566, se digitó "28.175" (leído como 28.175 decimal), se corrige a ', @cantidad_correcta),
    1,
    @diferencia,
    @diferencia * @costo_unit,
    0,
    0,
    @cantidad_correcta,
    @cantidad_correcta * @costo_unit,
    @costo_unit;

-- UPDATE existencia
UPDATE tblarticulos
SET Existencia = @cantidad_correcta
WHERE Items = @items;


-- ----------------------------------------------------------------------------
-- PASO 3 — Verificar el resultado
-- ----------------------------------------------------------------------------
SELECT Items, Codigo, Nombres_Articulo, Existencia, Precio_Costo,
       ROUND(Existencia * Precio_Costo, 2) AS valor_nuevo
FROM tblarticulos
WHERE Items = @items;

-- Últimas 3 líneas de kardex del producto
SELECT Id_kardex, Fecha, LEFT(Detalle, 100) AS detalle,
       C_D, Cant_Ent, Cost_Ent, Cant_Sal, Cost_Sal, Cant_Saldo
FROM tblkardex
WHERE Items = @items
ORDER BY Id_kardex DESC
LIMIT 3;

-- ----------------------------------------------------------------------------
-- ROLLBACK (si algo salió mal)
-- ----------------------------------------------------------------------------
-- Copia y corre estas 3 líneas SOLO si necesitas revertir:
-- UPDATE tblarticulos SET Existencia = 28.175 WHERE Items = 201236;
-- DELETE FROM tblkardex WHERE Items = 201236 AND Detalle LIKE 'AJUSTE - Corrección conteo #2%';
