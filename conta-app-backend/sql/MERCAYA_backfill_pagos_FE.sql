-- ============================================================
-- BACKFILL: reasignar pagos huérfanos de FE
-- ============================================================
-- Bug histórico: cuando el cliente pagaba una factura electrónica
-- desde la ficha del cliente, el pago se guardaba en tblpagos
-- SIN vincular a la FE (Fact_N=0, NFactAnt=NULL, Nfact_electronica='').
-- El sistema decía "guardado" pero la FE seguía apareciendo con
-- saldo pendiente porque la vista NUNCA los sumaba.
--
-- Este script recupera esos pagos huérfanos:
--   1. Detecta pagos donde DetallePago contiene "factura electrónica Nº <PREFIX><num>"
--   2. Extrae el prefijo y número
--   3. Busca la FE en electronic_documents del mismo cliente
--   4. Actualiza tblpagos.Nfact_electronica con el ID del documento
--
-- Idempotente: si se corre varias veces, no duplica nada — solo
-- toca filas donde Nfact_electronica está vacío.
--
-- ANTES DE APLICAR: haz backup de tblpagos por si hay que revertir.
--
-- Aplicar:
--   mysql -u root -p conta_mercaya < MERCAYA_backfill_pagos_FE.sql
-- ============================================================

-- Ver qué se va a actualizar (SIN modificar nada)
SELECT '=== Pagos huérfanos que van a ser reasignados ===' AS info;
SELECT tp.Id_Pagos,
       tp.Codigo,
       tp.DetallePago,
       -- Extraer parte alfabética y numérica desde DetallePago
       -- La última palabra del DetallePago tiene el identificador FCON160
       REGEXP_SUBSTR(SUBSTRING_INDEX(tp.DetallePago, ' ', -1), '^[A-Za-z]+') AS prefijo_extraido,
       CAST(REGEXP_SUBSTR(SUBSTRING_INDEX(tp.DetallePago, ' ', -1), '[0-9]+$') AS UNSIGNED) AS numero_extraido,
       ed.id AS docid_encontrado
  FROM tblpagos tp
  LEFT JOIN electronic_documents ed
    ON ed.cod_cliente = tp.Codigo
   AND ed.prefix = REGEXP_SUBSTR(SUBSTRING_INDEX(tp.DetallePago, ' ', -1), '^[A-Za-z]+')
   AND ed.number = CAST(REGEXP_SUBSTR(SUBSTRING_INDEX(tp.DetallePago, ' ', -1), '[0-9]+$') AS UNSIGNED)
 WHERE tp.DetallePago LIKE '%factura electr%'
   AND (tp.Nfact_electronica IS NULL OR tp.Nfact_electronica = '')
   AND (tp.Fact_N IS NULL OR tp.Fact_N = 0)
   AND (tp.NFactAnt IS NULL OR tp.NFactAnt = '')
   AND tp.Estado = 'Valida'
 LIMIT 100;

-- ============================================================
-- Aplicar el UPDATE — solo pagos donde SÍ se pudo emparejar
-- ============================================================
UPDATE tblpagos tp
  JOIN electronic_documents ed
    ON ed.cod_cliente = tp.Codigo
   AND ed.prefix = REGEXP_SUBSTR(SUBSTRING_INDEX(tp.DetallePago, ' ', -1), '^[A-Za-z]+')
   AND ed.number = CAST(REGEXP_SUBSTR(SUBSTRING_INDEX(tp.DetallePago, ' ', -1), '[0-9]+$') AS UNSIGNED)
   SET tp.Nfact_electronica = CAST(ed.id AS CHAR)
 WHERE tp.DetallePago LIKE '%factura electr%'
   AND (tp.Nfact_electronica IS NULL OR tp.Nfact_electronica = '')
   AND (tp.Fact_N IS NULL OR tp.Fact_N = 0)
   AND (tp.NFactAnt IS NULL OR tp.NFactAnt = '')
   AND tp.Estado = 'Valida';

-- Reporte final
SELECT '=== Estado tras el backfill ===' AS info;
SELECT
  CASE
    WHEN Fact_N > 0 THEN 'A. Factura NORMAL'
    WHEN NFactAnt IS NOT NULL AND NFactAnt != '' THEN 'B. Factura ANTERIOR'
    WHEN Nfact_electronica IS NOT NULL AND Nfact_electronica != '' THEN 'C. Factura ELECTRONICA'
    ELSE 'D. HUERFANO'
  END AS tipo,
  COUNT(*) AS cantidad
FROM tblpagos
GROUP BY tipo;

SELECT '=== Pagos que quedaron huérfanos (posibles casos raros) ===' AS info;
SELECT Id_Pagos, Codigo, DetallePago
  FROM tblpagos
 WHERE DetallePago LIKE '%factura electr%'
   AND (Nfact_electronica IS NULL OR Nfact_electronica = '')
   AND (Fact_N IS NULL OR Fact_N = 0)
   AND (NFactAnt IS NULL OR NFactAnt = '')
 LIMIT 20;
