-- ================================================================
-- DIAGNOSTICO DE ENTORNO — Conta FT
-- ================================================================
-- Reporte de configuracion MySQL y tamaño de la BD para detectar
-- cuellos de botella en clientes que reportan lentitud.
--
-- Uso: mysql -uroot -pPASS BD < diagnostico_entorno.sql
-- ================================================================

SELECT '======= INFO MYSQL =======' AS ' ';

SELECT
    (SELECT VERSION())            AS version,
    @@innodb_buffer_pool_size / 1048576  AS buffer_pool_mb,
    @@innodb_log_file_size / 1048576     AS log_file_mb,
    @@max_connections             AS max_conexiones,
    @@key_buffer_size / 1048576   AS key_buffer_mb,
    @@tmp_table_size / 1048576    AS tmp_table_mb;

SELECT
    CASE
        WHEN @@innodb_buffer_pool_size < 268435456 THEN '[PROBLEMA] Buffer <256MB — MUY chico para BDs grandes'
        WHEN @@innodb_buffer_pool_size < 536870912 THEN '[OK] Buffer 256-512MB — aceptable'
        ELSE '[OK] Buffer suficiente (>=512MB)'
    END AS diagnostico_buffer;

SELECT '======= TAMANO DE LA BD =======' AS ' ';

SELECT
    CONCAT(ROUND(SUM(data_length + index_length)/1048576, 1), ' MB') AS tamano_total,
    COUNT(*) AS num_tablas,
    (SELECT TABLE_ROWS FROM information_schema.TABLES
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'tblventas') AS aprox_ventas,
    (SELECT TABLE_ROWS FROM information_schema.TABLES
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'tbldetalle_venta') AS aprox_detalle,
    (SELECT TABLE_ROWS FROM information_schema.TABLES
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'tblkardex') AS aprox_kardex
FROM information_schema.TABLES
WHERE TABLE_SCHEMA = DATABASE();

SELECT '======= TABLAS MAS GRANDES =======' AS ' ';

SELECT
    TABLE_NAME AS tabla,
    TABLE_ROWS AS filas_aprox,
    ROUND(DATA_LENGTH/1048576, 1) AS mb_data,
    ROUND(INDEX_LENGTH/1048576, 1) AS mb_indices
FROM information_schema.TABLES
WHERE TABLE_SCHEMA = DATABASE()
ORDER BY DATA_LENGTH + INDEX_LENGTH DESC
LIMIT 5;

SELECT '======= BENCHMARK DE QUERIES DEL SISTEMA =======' AS ' ';

SET profiling = 1;

-- Envolvemos cada query con COUNT o LIMIT 0 para que no ensucien el output.
-- Solo nos interesa MEDIR el tiempo — no ver los datos.

-- Query 1: Listado ventas mes actual (la más pesada)
SELECT COUNT(*) INTO @dummy1 FROM (
    SELECT v.Factura_N FROM tblventas v
    WHERE v.Fecha >= DATE_FORMAT(CURDATE(), '%Y-%m-01')
      AND v.Fecha < DATE_FORMAT(CURDATE() + INTERVAL 1 MONTH, '%Y-%m-01')
      AND v.EstadoFact = 'Valida'
    ORDER BY v.Factura_N DESC
    LIMIT 500
) t;

-- Query 2: Count ventas ultimos 30 dias
SELECT COUNT(*) INTO @dummy2 FROM tblventas
WHERE Fecha >= DATE_SUB(CURDATE(), INTERVAL 30 DAY);

-- Query 3: Kardex de un producto (típico del detalle de artículo)
SELECT COUNT(*) INTO @dummy3 FROM (
    SELECT Id_kardex FROM tblkardex
    WHERE Items = (SELECT Items FROM tblarticulos WHERE Estado = 1 LIMIT 1)
    ORDER BY Id_kardex DESC
    LIMIT 100
) t;

-- Query 4: Detalle de una factura (pesado si el índice NFactAnt no existe)
SELECT COUNT(*) INTO @dummy4 FROM tblpagos
WHERE (Fact_N = (SELECT Factura_N FROM tblventas ORDER BY Factura_N DESC LIMIT 1)
       OR NFactAnt = CAST((SELECT Factura_N FROM tblventas ORDER BY Factura_N DESC LIMIT 1) AS CHAR))
  AND Estado = 'Valida';

SELECT
    Query_ID AS q,
    ROUND(Duration*1000, 1) AS ms,
    CASE Query_ID
        WHEN 1 THEN 'Listado ventas mes actual'
        WHEN 2 THEN 'Count ventas 30 dias'
        WHEN 3 THEN 'Kardex de un producto'
        WHEN 4 THEN 'Pagos de una factura (OR NFactAnt)'
        ELSE '-'
    END AS descripcion,
    CASE
        WHEN Duration*1000 < 50 THEN '[OK] rapido'
        WHEN Duration*1000 < 200 THEN '[OK] aceptable'
        WHEN Duration*1000 < 1000 THEN '[LENTO] revisar buffer o indices'
        ELSE '[CRITICO] falta indice o buffer muy chico'
    END AS diagnostico
FROM information_schema.PROFILING
WHERE Query_ID <= 4
GROUP BY Query_ID
ORDER BY Query_ID;

SELECT '======= INDICES CRITICOS =======' AS ' ';

SELECT
    IF(EXISTS(SELECT 1 FROM information_schema.STATISTICS
              WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='tblventas' AND INDEX_NAME='idx_fecha'),
       '[OK]', '[FALTA]') AS ventas_idx_fecha,
    IF(EXISTS(SELECT 1 FROM information_schema.STATISTICS
              WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='tblpagos' AND INDEX_NAME='idx_nfactant'),
       '[OK]', '[FALTA]') AS pagos_idx_nfactant,
    IF(EXISTS(SELECT 1 FROM information_schema.STATISTICS
              WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='tblkardex' AND INDEX_NAME='idx_items_fecha'),
       '[OK]', '[FALTA]') AS kardex_idx_items;

SELECT '======= DIAGNOSTICO FINAL =======' AS ' ';

SELECT
    'Si alguna query dice [LENTO] o [CRITICO], correr optimizar_entorno_xampp.bat + optimizar_indices.sql' AS accion_1,
    'Si algun indice dice [FALTA], correr migrar_cliente.bat' AS accion_2,
    'Si buffer <256MB, ejecutar optimizar_entorno_xampp.bat como Administrador' AS accion_3;
