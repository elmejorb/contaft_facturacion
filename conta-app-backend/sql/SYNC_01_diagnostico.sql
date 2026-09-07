-- ============================================================
-- SYNC 01 · DIAGNÓSTICO (solo lee, NO modifica nada)
-- ============================================================
-- Correr ESTE primero en la BD del cliente para saber en qué
-- estado está antes de aplicar el fix. Reporta:
--   1. Si la tabla cola tbl_cambios_sincronizar existe
--   2. Qué triggers existen actualmente
--   3. Qué columnas tiene tblventas y tbldetalle_venta
--   4. Si hay registros pendientes en la cola y de qué tipo
--   5. Versión del servidor MySQL/MariaDB
--
-- Cómo correr desde PC del cliente con XAMPP o similar:
--   mysql -u USUARIO -p BD_CLIENTE < SYNC_01_diagnostico.sql
-- ============================================================

SELECT '=== 1. Info general ===' AS info;
SELECT VERSION() AS servidor, DATABASE() AS bd_conectada, CURRENT_USER() AS usuario_actual, NOW() AS momento;

SELECT '=== 2. ¿Existe la tabla cola tbl_cambios_sincronizar? ===' AS info;
SELECT
  CASE WHEN COUNT(*) > 0 THEN '✓ SI existe' ELSE '✗ NO existe — se creará al aplicar' END AS estado
  FROM information_schema.TABLES
 WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'tbl_cambios_sincronizar';

SELECT '=== 3. Triggers actuales en la BD ===' AS info;
SELECT TRIGGER_NAME, EVENT_MANIPULATION, EVENT_OBJECT_TABLE, DEFINER
  FROM information_schema.TRIGGERS
 WHERE TRIGGER_SCHEMA = DATABASE()
 ORDER BY EVENT_OBJECT_TABLE, EVENT_MANIPULATION;

SELECT '=== 4. Columnas críticas en tblventas ===' AS info;
SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE
  FROM information_schema.COLUMNS
 WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'tblventas'
   AND COLUMN_NAME IN ('Factura_N','CodigoCli','Total','Saldo','Fecha','Tipo',
                       'EstadoFact','id_mediopago','efectivo','valorpagado1',
                       'enviada_dian','fecha_envio_dian','cufe','pagada','Abono')
 ORDER BY ORDINAL_POSITION;

SELECT '=== 5. Columnas críticas en tbldetalle_venta ===' AS info;
SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE
  FROM information_schema.COLUMNS
 WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'tbldetalle_venta'
   AND COLUMN_NAME IN ('Id_DetalleVenta','Factura_N','Items','Cantidad',
                       'PrecioC','PrecioV','IVA','Impuesto','Subtotal','Dev','Descuento')
 ORDER BY ORDINAL_POSITION;

SELECT '=== 6. Si la cola existe: registros pendientes por tabla ===' AS info;
SELECT
  CASE
    WHEN (SELECT COUNT(*) FROM information_schema.TABLES
           WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'tbl_cambios_sincronizar') = 0
    THEN 'Cola no existe — saltar este paso'
    ELSE 'Ver siguiente resultado'
  END AS nota;

-- Query condicional que corre solo si la tabla existe (protegido con IF())
SET @sql := IF(
  (SELECT COUNT(*) FROM information_schema.TABLES
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'tbl_cambios_sincronizar') > 0,
  'SELECT tabla_nombre, sincronizado, COUNT(*) AS cantidad
     FROM tbl_cambios_sincronizar
    GROUP BY tabla_nombre, sincronizado
    ORDER BY tabla_nombre, sincronizado',
  'SELECT ''(cola no existe)'' AS resultado'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SELECT '=== 7. Conteo de ventas (para dimensionar backfill) ===' AS info;
SELECT COUNT(*) AS total_ventas,
       MIN(Fecha) AS venta_mas_antigua,
       MAX(Fecha) AS venta_mas_nueva
  FROM tblventas;

SELECT '=== DIAGNÓSTICO COMPLETO ===' AS info;
SELECT 'Revise los resultados antes de aplicar SYNC_02_aplicar.sql' AS accion;
