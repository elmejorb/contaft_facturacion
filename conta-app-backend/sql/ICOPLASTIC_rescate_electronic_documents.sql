-- ============================================================
-- RESCATE electronic_documents · Cliente Icoplastic
-- ============================================================
-- Bug detectado:
--   La tabla electronic_documents fue creada sin PRIMARY KEY ni
--   AUTO_INCREMENT sobre `id`. Todas las 6 FE quedaron con id=0.
--   Cada UPDATE del CUFE al autorizar (WHERE id=0) afectaba a
--   TODAS las filas — solo sobrevivio el CUFE de la ultima FE.
--
-- Consecuencias visibles:
--   - Al imprimir el PDF: "ID Requerido" (el frontend manda ?id=0
--     y pdf.php interpreta 0 como falsy).
--   - number=6 en las 6 filas (mismo consecutivo repetido).
--   - CUFE de la ultima FE (FEC6) repetido en las 6 filas.
--
-- Este script:
--   1. Corrige number, CUFE y (opcional) resolution_id por fecha+total.
--   2. Reasigna id 1..6 en orden de fecha ascendente.
--   3. Agrega PRIMARY KEY + AUTO_INCREMENT sobre `id`.
--   4. Deja AUTO_INCREMENT=7 para las proximas FE.
--
-- Idempotente: si ya se aplico (id>0, hay PK y AUTO_INCREMENT), no
-- hace nada. Se puede correr varias veces sin dano.
--
-- Como aplicar:
--   phpMyAdmin -> BD del cliente -> SQL -> pegar todo -> Continuar
--   o mysql -u root -p conta_icoplasticft < ICOPLASTIC_rescate_electronic_documents.sql
--
-- ANTES DE APLICAR: exportar la tabla electronic_documents por
-- seguridad (backup).
-- ============================================================

-- --------------------------------------------------------
-- PASO 0. Solo actuar si detectamos el bug (id=0 en alguna fila)
-- --------------------------------------------------------
SET @bug_presente = (SELECT COUNT(*) FROM electronic_documents WHERE id = 0);
SELECT CASE WHEN @bug_presente > 0
            THEN CONCAT('Detectadas ', @bug_presente, ' fila(s) con id=0. Aplicando rescate...')
            ELSE 'Sin filas con id=0. Rescate no necesario (idempotente OK).'
       END AS estado;

-- --------------------------------------------------------
-- PASO 1. Restaurar number y CUFE correctos por (fecha, total)
-- --------------------------------------------------------
-- Datos reales confirmados por el usuario contra el portal DIAN.

UPDATE electronic_documents
   SET number = 1,
       cufe = 'f06819b84ab9f007552590578a6fb1ac0f1d8b73ed10a416b0d03a0837d64d08d045e04fcc777cd14f98e30514ea1766'
 WHERE fecha = '2026-08-08' AND total = 32400.00 AND id = 0;

UPDATE electronic_documents
   SET number = 2,
       cufe = '3a86bd1ffac3eab5666dfec27c255868ce85be9cb218a6f0e2728f4e6a7948ec6542b984cefe6ed93ed15d377d32d90a'
 WHERE fecha = '2026-08-09' AND total = 288600.00 AND id = 0;

UPDATE electronic_documents
   SET number = 3,
       cufe = '1a003676394be9d04113e22320c7713141c824e8686748f5b8808844a252357a1c3611cd1439d3c2937fd00ea91120bf'
 WHERE fecha = '2026-08-22' AND total = 27000.00 AND id = 0;

UPDATE electronic_documents
   SET number = 4,
       cufe = 'd8e37f28e418efde268dc8fd5d8ede282eba1665af8c1a38a3964a69ab5abb76d2e105ae3da3ef668c39900c3560cab6'
 WHERE fecha = '2026-08-24' AND total = 63000.00 AND id = 0;

UPDATE electronic_documents
   SET number = 5,
       cufe = '06d8804ba44aca1fb5fa8a1846f512309a2cdee2ec363e6b5d585a1ac8bf2623738167bd8bee57559e657975e26cd1ca'
 WHERE fecha = '2026-09-06' AND total = 40500.00 AND id = 0;

UPDATE electronic_documents
   SET number = 6,
       cufe = 'cce004806537ed977cf8f2382563dbcd5a2c6fa6d419c82725760ff16c46479e45d622a4858fd70bc3545f95ba3091cd'
 WHERE fecha = '2026-09-07' AND total = 1600.00 AND id = 0;

-- --------------------------------------------------------
-- PASO 2. Reasignar id 1..6 usando el mismo number (id=number)
-- --------------------------------------------------------
-- Se hace via CTE para evitar colisiones intermedias. MariaDB 10.4+
-- soporta CTE; si tu instancia es mas vieja, ver comentario abajo.

UPDATE electronic_documents SET id = number WHERE id = 0;

-- --------------------------------------------------------
-- PASO 3. Agregar PRIMARY KEY + AUTO_INCREMENT (idempotente)
-- --------------------------------------------------------
SET @tiene_pk = (SELECT COUNT(*) FROM information_schema.TABLE_CONSTRAINTS
                  WHERE TABLE_SCHEMA = DATABASE()
                    AND TABLE_NAME = 'electronic_documents'
                    AND CONSTRAINT_TYPE = 'PRIMARY KEY');

SET @sql = IF(@tiene_pk = 0,
  'ALTER TABLE electronic_documents ADD PRIMARY KEY (id)',
  'SELECT ''PK ya existe'' AS msg');
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;

-- AUTO_INCREMENT: MODIFY es idempotente (no falla si ya es AI).
ALTER TABLE electronic_documents
      MODIFY id BIGINT(20) UNSIGNED NOT NULL AUTO_INCREMENT;

-- Dejar el proximo id en 7 (o el maximo actual + 1)
SET @next_id = (SELECT COALESCE(MAX(id), 0) + 1 FROM electronic_documents);
SET @sql = CONCAT('ALTER TABLE electronic_documents AUTO_INCREMENT = ', @next_id);
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;

-- --------------------------------------------------------
-- PASO 4. Rescate de detalle_document_electronic
-- --------------------------------------------------------
-- El mismo bug afecto al detalle: las 14 filas tienen factura_n=0,
-- entonces el PDF (WHERE d.factura_n = ?) no encuentra ningun item
-- y el total sale $0.00. Los datos estan completos — solo hay que
-- re-vincular cada fila con su cabecera.
--
-- Reconstruccion validada matematicamente contra los totales reales:
--   FEC1 (id=1, $32.400)  = detalle id 1
--   FEC2 (id=2, $288.600) = detalles id 3,4,5,6,7,8,9,10,12
--   FEC3 (id=3, $27.000)  = detalle id 11
--   FEC4 (id=4, $63.000)  = detalle id 2
--   FEC5 (id=5, $40.500)  = detalle id 13
--   FEC6 (id=6, $1.600)   = detalle id 14
-- Suma detalles = 453.100 = suma cabeceras. Match exacto.

SET @bug_detalle = (SELECT COUNT(*) FROM detalle_document_electronic WHERE factura_n = 0);
SELECT CASE WHEN @bug_detalle > 0
            THEN CONCAT('Detectadas ', @bug_detalle, ' fila(s) de detalle con factura_n=0. Aplicando rescate...')
            ELSE 'Detalle ya vinculado. Rescate no necesario (idempotente OK).'
       END AS estado_detalle;

UPDATE detalle_document_electronic SET factura_n = 1 WHERE id_detalle_document = 1  AND factura_n = 0;
UPDATE detalle_document_electronic SET factura_n = 4 WHERE id_detalle_document = 2  AND factura_n = 0;
UPDATE detalle_document_electronic SET factura_n = 2 WHERE id_detalle_document = 3  AND factura_n = 0;
UPDATE detalle_document_electronic SET factura_n = 2 WHERE id_detalle_document = 4  AND factura_n = 0;
UPDATE detalle_document_electronic SET factura_n = 2 WHERE id_detalle_document = 5  AND factura_n = 0;
UPDATE detalle_document_electronic SET factura_n = 2 WHERE id_detalle_document = 6  AND factura_n = 0;
UPDATE detalle_document_electronic SET factura_n = 2 WHERE id_detalle_document = 7  AND factura_n = 0;
UPDATE detalle_document_electronic SET factura_n = 2 WHERE id_detalle_document = 8  AND factura_n = 0;
UPDATE detalle_document_electronic SET factura_n = 2 WHERE id_detalle_document = 9  AND factura_n = 0;
UPDATE detalle_document_electronic SET factura_n = 2 WHERE id_detalle_document = 10 AND factura_n = 0;
UPDATE detalle_document_electronic SET factura_n = 3 WHERE id_detalle_document = 11 AND factura_n = 0;
UPDATE detalle_document_electronic SET factura_n = 2 WHERE id_detalle_document = 12 AND factura_n = 0;
UPDATE detalle_document_electronic SET factura_n = 5 WHERE id_detalle_document = 13 AND factura_n = 0;
UPDATE detalle_document_electronic SET factura_n = 6 WHERE id_detalle_document = 14 AND factura_n = 0;

-- --------------------------------------------------------
-- PASO 5. Reporte final — deberia mostrar 6 filas con id 1..6,
--         numbers 1..6 y CUFE distinto en cada una.
-- --------------------------------------------------------
SELECT 'Estado final:' AS chk;
SELECT id, fecha, prefix, number, LEFT(cufe, 20) AS cufe_ini, total, status
  FROM electronic_documents
 ORDER BY id;

SELECT COUNT(*) AS total_filas,
       COUNT(DISTINCT id) AS ids_unicos,
       COUNT(DISTINCT cufe) AS cufes_unicos,
       COUNT(DISTINCT number) AS numbers_unicos
  FROM electronic_documents;
-- Debe dar: 6, 6, 6, 6.

-- Verificar match cabecera vs suma de detalles.
SELECT 'Match cabecera vs detalle:' AS chk;
SELECT ed.id, ed.number, ed.total AS total_cabecera,
       COALESCE(SUM(d.line_extension_amount), 0) AS suma_detalle,
       ed.total - COALESCE(SUM(d.line_extension_amount), 0) AS diferencia
  FROM electronic_documents ed
  LEFT JOIN detalle_document_electronic d ON d.factura_n = ed.id
 GROUP BY ed.id, ed.number, ed.total
 ORDER BY ed.id;
-- La columna diferencia debe ser 0.00 en las 6 filas.

SHOW CREATE TABLE electronic_documents\G
-- Debe mostrar `id` con AUTO_INCREMENT y PRIMARY KEY.
