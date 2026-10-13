-- =====================================================================
-- CORRECCION: FE y NC del flujo NUEVO que no afectaron inventario
-- (bug v4.6+ hasta v4.7.11)
-- =====================================================================
-- Desde v4.6 las FE que se emiten PURAS en electronic_documents (sin tener
-- una Fra POS espejo en tblventas con el mismo CUFE) dejaron de hacer:
--   - Al EMITIR una FE: insertar kardex de salida.
--   - Al emitir una NC: insertar kardex de entrada.
--
-- Las FE que SÍ tienen Fra POS espejo (vinculadas por CUFE) están bien —
-- el movimiento ya está en el flujo POS tradicional. Este script NO las toca.
--
-- IMPORTANTE — SOLO AGREGA FILAS AL KARDEX, NO MODIFICA tblarticulos.Existencia:
--
-- Muchos clientes ya compensaron el bug con ajustes manuales de inventario.
-- Si corremos UPDATE sobre Existencia, el stock quedaría doblemente bajado
-- (una vez por ajuste manual y otra por este script) y aparecerían negativos
-- "fantasmas". Por eso este script SOLO inserta filas históricas en kardex
-- para que los libros contables (informes de ventas, COGS, auditoría) queden
-- completos, mientras el stock físico que el cliente ya tenía cuadrado por
-- sus ajustes manuales NO se mueve.
--
-- CORTE POR AJUSTE MANUAL: aún así, si un producto tuvo un ajuste manual el
-- día X, las FEs anteriores no se insertan en kardex para no sumar al desvío
-- aparente. Solo se agregan filas de FEs POSTERIORES al último ajuste manual
-- del producto (o todas si el producto nunca tuvo ajustes manuales).
--
-- IDEMPOTENTE: si una FE o NC ya tiene su fila de kardex, no se duplica.
-- Se puede correr varias veces sin daño.
--
-- Las filas se etiquetan en tblkardex.Detalle como:
--     Venta FE: "Venta FE Nº <prefix>-<number> (REPO HISTÓRICO)"
--     NC:       "NC <prefix><number> — anula <feprefix><fenumber> (REVERSO HISTÓRICO)"
-- =====================================================================

-- Patrones de "ajuste manual" que marcan cortes de confianza por item.
-- Usamos vista derivada: ult_ajuste(item, fecha_corte)
-- Un ítem sin ajuste manual queda sin cutoff (fecha_corte = 1900-01-01).

-- -------- 1A) AUDITORÍA FE puras sin kardex (POST corte) ------------------
SELECT 'FEs PURAS del flujo nuevo sin kardex de salida — van a bajarse:' AS seccion;
SELECT
    fe.id AS fe_id,
    CONCAT(fe.prefix, fe.number) AS fe_label,
    DATE(fe.created_at) AS fecha_fe,
    COALESCE(DATE(ult.fecha_corte), '—') AS cutoff_ajuste,
    d.items AS item,
    a.Nombres_Articulo AS articulo,
    ABS(d.invoiced_quantity) AS cantidad,
    a.Existencia AS stock_actual,
    (a.Existencia - ABS(d.invoiced_quantity)) AS stock_tras_baja
FROM electronic_documents fe
LEFT JOIN tblventas v ON v.cufe = fe.cufe
JOIN detalle_document_electronic d ON d.factura_n = fe.id
JOIN tblarticulos a ON a.Items = d.items
LEFT JOIN (
    SELECT Items, MAX(Fecha) AS fecha_corte FROM tblkardex
    WHERE Detalle LIKE 'Ajuste manual%' OR Detalle LIKE 'Nota de %'
    GROUP BY Items
) ult ON ult.Items = d.items
WHERE fe.type_document_id = 1
  AND fe.status IN ('autorizado','aprobado','anulado')
  AND v.Factura_N IS NULL
  AND COALESCE(a.Servicio,'N') != 'S'
  AND fe.created_at > COALESCE(ult.fecha_corte, '1900-01-01')
  AND NOT EXISTS (
      SELECT 1 FROM tblkardex k
      WHERE k.Items = d.items AND k.C_D = 2
        AND k.Detalle LIKE CONCAT('%Venta FE%', fe.prefix, '%', fe.number, '%')
  )
ORDER BY fe.id DESC;

-- -------- 1B) AUDITORÍA NC sin kardex ------------------
SELECT 'NCs sin kardex de entrada — van a subirse:' AS seccion;
SELECT
    nc.id AS nc_id,
    CONCAT(nc.prefix, nc.number) AS nc_label,
    DATE(nc.created_at) AS fecha,
    fe.id AS fe_id,
    CONCAT(fe.prefix, fe.number) AS fe_label,
    d.items AS item,
    a.Nombres_Articulo AS articulo,
    ABS(d.invoiced_quantity) AS cantidad,
    a.Existencia AS stock_actual,
    (a.Existencia + ABS(d.invoiced_quantity)) AS stock_tras_revert
FROM electronic_documents nc
JOIN electronic_documents fe ON fe.cufe = nc.invoice_cufe
JOIN detalle_document_electronic d ON d.factura_n = nc.id
JOIN tblarticulos a ON a.Items = d.items
WHERE nc.type_document_id = 2
  AND nc.status IN ('autorizado','aprobado')
  AND COALESCE(a.Servicio,'N') != 'S'
  AND NOT EXISTS (
      SELECT 1 FROM tblkardex k
      WHERE k.Items = d.items AND k.C_D = 1
        AND k.Detalle LIKE CONCAT('NC ', nc.prefix, nc.number, '%')
  )
ORDER BY nc.id DESC;

-- -------- 2A) BAJA DE STOCK por FE PURAS — DESHABILITADO ------------------
-- NO modificamos tblarticulos.Existencia por FEs pasadas porque muchos
-- clientes ya compensaron esos desvíos con ajustes manuales de inventario.
-- Solo insertamos las filas de kardex abajo (paso 2B) para completar los
-- libros contables sin alterar el stock que el cliente ya cuadró.
-- A partir de v4.7.12 el código del endpoint sí baja stock al emitir FE.

-- -------- 2B) FILAS DE KARDEX de SALIDA (REPO HISTÓRICO) — mismo cutoff ------------------
INSERT INTO tblkardex (Fecha, Mes, Items, Detalle, C_D, Cant_Ent, Cost_Ent, Cant_Sal, Cost_Sal, Cant_Saldo, Cost_Saldo, Cost_Unit)
SELECT
    NOW() AS Fecha,
    ELT(MONTH(NOW()), 'Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre') AS Mes,
    d.items AS Items,
    CONCAT('Venta FE Nº ', fe.prefix, '-', fe.number, ' (REPO HISTÓRICO)') AS Detalle,
    2 AS C_D,
    0 AS Cant_Ent,
    0 AS Cost_Ent,
    ABS(d.invoiced_quantity) AS Cant_Sal,
    ABS(d.invoiced_quantity) * COALESCE(a.Precio_Costo, 0) AS Cost_Sal,
    a.Existencia AS Cant_Saldo,
    a.Existencia * COALESCE(a.Precio_Costo, 0) AS Cost_Saldo,
    COALESCE(a.Precio_Costo, 0) AS Cost_Unit
FROM electronic_documents fe
LEFT JOIN tblventas v ON v.cufe = fe.cufe
JOIN detalle_document_electronic d ON d.factura_n = fe.id
JOIN tblarticulos a ON a.Items = d.items
LEFT JOIN (
    SELECT Items, MAX(Fecha) AS fecha_corte FROM tblkardex
    WHERE Detalle LIKE 'Ajuste manual%' OR Detalle LIKE 'Nota de %'
    GROUP BY Items
) ult ON ult.Items = d.items
WHERE fe.type_document_id = 1
  AND fe.status IN ('autorizado','aprobado','anulado')
  AND v.Factura_N IS NULL
  AND COALESCE(a.Servicio,'N') != 'S'
  AND fe.created_at > COALESCE(ult.fecha_corte, '1900-01-01')
  AND NOT EXISTS (
      SELECT 1 FROM tblkardex k
      WHERE k.Items = d.items AND k.C_D = 2
        AND k.Detalle LIKE CONCAT('%Venta FE%', fe.prefix, '%', fe.number, '%')
  );

-- -------- 3A) SUBE DE STOCK por NCs ------------------
UPDATE tblarticulos a
JOIN (
    SELECT d.items AS item_id, SUM(ABS(d.invoiced_quantity)) AS cant_total
    FROM electronic_documents nc
    JOIN detalle_document_electronic d ON d.factura_n = nc.id
    JOIN tblarticulos a2 ON a2.Items = d.items
    WHERE nc.type_document_id = 2
      AND nc.status IN ('autorizado','aprobado')
      AND COALESCE(a2.Servicio,'N') != 'S'
      AND NOT EXISTS (
          SELECT 1 FROM tblkardex k
          WHERE k.Items = d.items AND k.C_D = 1
            AND k.Detalle LIKE CONCAT('NC ', nc.prefix, nc.number, '%')
      )
    GROUP BY d.items
) AS pend ON pend.item_id = a.Items
SET a.Existencia = a.Existencia + pend.cant_total;

-- -------- 3B) FILAS DE KARDEX de ENTRADA (REVERSO HISTÓRICO) ------------------
INSERT INTO tblkardex (Fecha, Mes, Items, Detalle, C_D, Cant_Ent, Cost_Ent, Cant_Sal, Cost_Sal, Cant_Saldo, Cost_Saldo, Cost_Unit)
SELECT
    NOW() AS Fecha,
    ELT(MONTH(NOW()), 'Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre') AS Mes,
    d.items AS Items,
    CONCAT('NC ', nc.prefix, nc.number, ' — anula ', fe.prefix, fe.number, ' (REVERSO HISTÓRICO)') AS Detalle,
    1 AS C_D,
    ABS(d.invoiced_quantity) AS Cant_Ent,
    ABS(d.invoiced_quantity) * COALESCE(a.Precio_Costo, 0) AS Cost_Ent,
    0 AS Cant_Sal,
    0 AS Cost_Sal,
    a.Existencia AS Cant_Saldo,
    a.Existencia * COALESCE(a.Precio_Costo, 0) AS Cost_Saldo,
    COALESCE(a.Precio_Costo, 0) AS Cost_Unit
FROM electronic_documents nc
JOIN electronic_documents fe ON fe.cufe = nc.invoice_cufe
JOIN detalle_document_electronic d ON d.factura_n = nc.id
JOIN tblarticulos a ON a.Items = d.items
WHERE nc.type_document_id = 2
  AND nc.status IN ('autorizado','aprobado')
  AND COALESCE(a.Servicio,'N') != 'S'
  AND NOT EXISTS (
      SELECT 1 FROM tblkardex k
      WHERE k.Items = d.items AND k.C_D = 1
        AND k.Detalle LIKE CONCAT('NC ', nc.prefix, nc.number, '%')
  );

-- -------- 4) VERIFICACIÓN ------------------
SELECT 'Pendientes (deben ser 0):' AS seccion;
SELECT 'FE pura sin kardex de salida (POST cutoff ajuste manual)' AS tipo, COUNT(DISTINCT fe.id) AS pendientes
FROM electronic_documents fe
LEFT JOIN tblventas v ON v.cufe = fe.cufe
JOIN detalle_document_electronic d ON d.factura_n = fe.id
JOIN tblarticulos a ON a.Items = d.items
LEFT JOIN (
    SELECT Items, MAX(Fecha) AS fecha_corte FROM tblkardex
    WHERE Detalle LIKE 'Ajuste manual%' OR Detalle LIKE 'Nota de %'
    GROUP BY Items
) ult ON ult.Items = d.items
WHERE fe.type_document_id = 1
  AND fe.status IN ('autorizado','aprobado','anulado')
  AND v.Factura_N IS NULL
  AND COALESCE(a.Servicio,'N') != 'S'
  AND fe.created_at > COALESCE(ult.fecha_corte, '1900-01-01')
  AND NOT EXISTS (
      SELECT 1 FROM tblkardex k
      WHERE k.Items = d.items AND k.C_D = 2
        AND k.Detalle LIKE CONCAT('%Venta FE%', fe.prefix, '%', fe.number, '%')
  )
UNION ALL
SELECT 'NC sin kardex de entrada',  COUNT(DISTINCT nc.id)
FROM electronic_documents nc
JOIN detalle_document_electronic d ON d.factura_n = nc.id
JOIN tblarticulos a ON a.Items = d.items
WHERE nc.type_document_id = 2
  AND nc.status IN ('autorizado','aprobado')
  AND COALESCE(a.Servicio,'N') != 'S'
  AND NOT EXISTS (
      SELECT 1 FROM tblkardex k
      WHERE k.Items = d.items AND k.C_D = 1
        AND k.Detalle LIKE CONCAT('NC ', nc.prefix, nc.number, '%')
  );
