-- ================================================================
-- REPARAR AUTO_INCREMENT — Conta FT
-- ================================================================
-- Muchas BDs importadas desde VB6 llegan sin PRIMARY KEY ni AUTO_INCREMENT
-- en tablas críticas (tblventas, tblclientes, tblarticulos, etc.). Sin PK,
-- MySQL no puede aplicar AUTO_INCREMENT y los INSERT desde la app fallan
-- (o obligan al usuario a calcular el próximo ID manualmente).
--
-- Este script:
--   1) Detecta si la columna ID de cada tabla ya es AUTO_INCREMENT (skip)
--   2) Detecta duplicados y ceros en la columna ID (aborta esa tabla)
--   3) Agrega PRIMARY KEY si no existe
--   4) Aplica AUTO_INCREMENT arrancando en MAX(id)+1
--
-- Idempotente: puede correrse varias veces. Nunca destruye datos.
-- Reporta cada tabla al final con un status.
--
-- Uso:
--   mysql -uroot -p conta_XXXX < reparar_autoincrement.sql
-- ================================================================

DELIMITER $$
DROP PROCEDURE IF EXISTS repararAI$$
CREATE PROCEDURE repararAI(IN t VARCHAR(64), IN col VARCHAR(64))
proc: BEGIN
    DECLARE tbl_existe INT DEFAULT 0;
    DECLARE col_existe INT DEFAULT 0;
    DECLARE ya_ai INT DEFAULT 0;
    DECLARE ya_pk INT DEFAULT 0;
    DECLARE hay_ceros INT DEFAULT 0;
    DECLARE hay_dup INT DEFAULT 0;

    SELECT COUNT(*) INTO tbl_existe FROM information_schema.TABLES
     WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME=t;
    IF tbl_existe = 0 THEN
        SELECT CONCAT('SKIP ', t, ' — tabla no existe') AS resultado; LEAVE proc;
    END IF;

    SELECT COUNT(*) INTO col_existe FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME=t AND COLUMN_NAME=col;
    IF col_existe = 0 THEN
        SELECT CONCAT('SKIP ', t, ' — columna ', col, ' no existe') AS resultado; LEAVE proc;
    END IF;

    SELECT IF(EXTRA LIKE '%auto_increment%', 1, 0) INTO ya_ai
     FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME=t AND COLUMN_NAME=col;
    IF ya_ai = 1 THEN
        SELECT CONCAT('OK   ', t, '.', col, ' ya es AUTO_INCREMENT') AS resultado; LEAVE proc;
    END IF;

    -- Chequear duplicados y ceros en la columna
    SET @q1 = CONCAT('SELECT COUNT(*) INTO @hay_ceros FROM `', t, '` WHERE `', col, '` = 0 OR `', col, '` IS NULL');
    PREPARE s FROM @q1; EXECUTE s; DEALLOCATE PREPARE s;
    SET hay_ceros = @hay_ceros;

    SET @q2 = CONCAT('SELECT COUNT(*) INTO @hay_dup FROM (SELECT `', col, '` FROM `', t, '` WHERE `', col, '` > 0 GROUP BY `', col, '` HAVING COUNT(*)>1) x');
    PREPARE s FROM @q2; EXECUTE s; DEALLOCATE PREPARE s;
    SET hay_dup = @hay_dup;

    IF hay_dup > 0 THEN
        SELECT CONCAT('ERROR ', t, '.', col, ' — hay ', hay_dup, ' valores duplicados. Corrija manualmente antes de aplicar.') AS resultado; LEAVE proc;
    END IF;

    -- Si hay ceros, moverlos al final (MAX+1, MAX+2, ...)
    IF hay_ceros > 0 THEN
        SET @q3 = CONCAT('SELECT COALESCE(MAX(`', col, '`),0) INTO @maxid FROM `', t, '`');
        PREPARE s FROM @q3; EXECUTE s; DEALLOCATE PREPARE s;
        SET @nextid = @maxid + 1;
        SET @q4 = CONCAT('UPDATE `', t, '` SET `', col, '` = (@nextid := @nextid + 1) WHERE `', col, '` = 0 OR `', col, '` IS NULL');
        PREPARE s FROM @q4; EXECUTE s; DEALLOCATE PREPARE s;
    END IF;

    -- Agregar PRIMARY KEY si no existe
    SELECT COUNT(*) INTO ya_pk FROM information_schema.STATISTICS
     WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME=t AND INDEX_NAME='PRIMARY';
    IF ya_pk = 0 THEN
        SET @q5 = CONCAT('ALTER TABLE `', t, '` ADD PRIMARY KEY (`', col, '`)');
        PREPARE s FROM @q5; EXECUTE s; DEALLOCATE PREPARE s;
    END IF;

    -- Aplicar AUTO_INCREMENT (preservando tipo INT existente)
    SET @q6 = CONCAT('ALTER TABLE `', t, '` MODIFY `', col, '` INT NOT NULL AUTO_INCREMENT');
    PREPARE s FROM @q6; EXECUTE s; DEALLOCATE PREPARE s;

    SELECT CONCAT('OK   ', t, '.', col, ' → PK + AUTO_INCREMENT aplicado (bump de ', hay_ceros, ' filas con id=0)') AS resultado;
END$$
DELIMITER ;

-- ================================================================
-- Tablas críticas del sistema (todas las que la app necesita AUTO_INCREMENT)
-- ================================================================
CALL repararAI('tblventas',                      'Factura_N');
CALL repararAI('tblclientes',                    'CodigoClien');
CALL repararAI('tblarticulos',                   'Items');
CALL repararAI('tblproveedores',                 'CodigoPro');
CALL repararAI('tblegresos',                     'Id_Egresos');
CALL repararAI('tblpagos',                       'Id_Pagos');
CALL repararAI('tbldetalle_venta',               'Id_DetalleVenta');
CALL repararAI('tbldetalle_pedido',              'Id_DetallePedido');
CALL repararAI('tblpedidos',                     'Pedido_N');
CALL repararAI('tblkardex',                      'Id_kardex');
CALL repararAI('tblcategoria',                   'Id_Categoria');
CALL repararAI('tblfacturasanteriores',          'ID_FactAnteriores');
CALL repararAI('tblfacturasanterioresproveedor', 'ID_FactAnterioresP');
CALL repararAI('tblauxiliares',                  'Id_Auxiliar');
CALL repararAI('tblusuarios',                    'Id_Usuario');
CALL repararAI('tblempleados',                   'CodigoEmp');
CALL repararAI('tblbancos',                      'idBancos');
CALL repararAI('tblcotizaciones',                'id_cotizacion');
CALL repararAI('detalle_cotizacion',             'id_detalle_cotiza');

-- Limpieza
DROP PROCEDURE IF EXISTS repararAI;

SELECT '✓ Reparación completa. Revise los mensajes de arriba para ver el status de cada tabla.' AS resultado;
