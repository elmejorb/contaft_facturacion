-- ================================================================
-- OPTIMIZACIÓN DE ÍNDICES — Conta FT
-- ================================================================
-- Acelera las consultas más pesadas del sistema en BDs con muchos
-- movimientos (>50k ventas, >100k kardex).
--
-- Uso:
--   mysql -uroot -p conta_XXXX < optimizar_indices.sql
--
-- Idempotente: solo crea índices que no existan. Puede correrse en
-- cualquier BD, tantas veces como sea necesario.
-- ================================================================

-- Helper: crea un índice solo si:
--  1) La tabla existe
--  2) Todas las columnas del índice existen
--  3) El índice no existe ya
-- Así el script es robusto en BDs legacy donde algunos nombres varían
-- (ej. tblproveedores.Nit vs .ProvNit según la versión).
DELIMITER $$
DROP PROCEDURE IF EXISTS crearIdx$$
CREATE PROCEDURE crearIdx(IN t VARCHAR(64), IN idx VARCHAR(64), IN cols VARCHAR(200))
proc: BEGIN
    DECLARE tbl_existe INT DEFAULT 0;
    DECLARE idx_existe INT DEFAULT 0;
    DECLARE cols_todas_existen INT DEFAULT 1;
    DECLARE col_actual VARCHAR(64);
    DECLARE resto VARCHAR(200);
    DECLARE pos INT;

    SELECT COUNT(*) INTO tbl_existe FROM information_schema.TABLES
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = t;
    IF tbl_existe = 0 THEN LEAVE proc; END IF;

    SELECT COUNT(*) INTO idx_existe FROM information_schema.STATISTICS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = t AND INDEX_NAME = idx;
    IF idx_existe > 0 THEN LEAVE proc; END IF;

    -- Split de `cols` por coma y validar cada columna
    SET resto = REPLACE(cols, ' ', '');
    validar_cols: LOOP
        SET pos = LOCATE(',', resto);
        IF pos = 0 THEN
            SET col_actual = resto;
            SET resto = '';
        ELSE
            SET col_actual = SUBSTRING(resto, 1, pos - 1);
            SET resto = SUBSTRING(resto, pos + 1);
        END IF;
        IF col_actual = '' THEN LEAVE validar_cols; END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.COLUMNS
                       WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME=t AND COLUMN_NAME=col_actual) THEN
            SET cols_todas_existen = 0;
            LEAVE validar_cols;
        END IF;
        IF resto = '' THEN LEAVE validar_cols; END IF;
    END LOOP;

    IF cols_todas_existen = 1 THEN
        SET @sql = CONCAT('CREATE INDEX ', idx, ' ON ', t, ' (', cols, ')');
        PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;
        SELECT CONCAT('  + ', t, '.', idx, ' creado') AS resultado;
    END IF;
END$$
DELIMITER ;

-- ================================================================
-- VENTAS — la tabla más consultada
-- ================================================================
CALL crearIdx('tblventas', 'idx_fecha',           'Fecha');
CALL crearIdx('tblventas', 'idx_estado_fecha',    'EstadoFact, Fecha');
CALL crearIdx('tblventas', 'idx_cliente_fecha',   'CodigoCli, Fecha');
CALL crearIdx('tblventas', 'idx_tipo',            'Tipo, EstadoFact');
CALL crearIdx('tblventas', 'idx_id_usuario',      'Id_Usuario');
CALL crearIdx('tblventas', 'idx_cufe',            'cufe');

-- Detalle de venta — se lee por Factura_N e Items
CALL crearIdx('tbldetalle_venta', 'idx_factura', 'Factura_N');
CALL crearIdx('tbldetalle_venta', 'idx_items',   'Items');

-- ================================================================
-- PAGOS — cartera de clientes y cuadre de caja
-- ================================================================
CALL crearIdx('tblpagos', 'idx_fecha',       'Fecha');
CALL crearIdx('tblpagos', 'idx_codigo',      'Codigo');
CALL crearIdx('tblpagos', 'idx_fact',        'Fact_N');
CALL crearIdx('tblpagos', 'idx_estado',      'Estado, Fecha');
CALL crearIdx('tblpagos', 'idx_id_usuario',  'id_usuario');

-- ================================================================
-- KARDEX — la tabla más grande (>200k filas típico)
-- ================================================================
CALL crearIdx('tblkardex', 'idx_items',        'Items');
CALL crearIdx('tblkardex', 'idx_fecha',        'Fecha');
CALL crearIdx('tblkardex', 'idx_items_fecha',  'Items, Fecha');

-- ================================================================
-- ARTÍCULOS — búsqueda por código, categoría, estado
-- ================================================================
CALL crearIdx('tblarticulos', 'idx_codigo',       'Codigo');
CALL crearIdx('tblarticulos', 'idx_estado',       'Estado');
CALL crearIdx('tblarticulos', 'idx_categoria',    'Id_Categoria');
CALL crearIdx('tblarticulos', 'idx_proveedor',    'CodigoPro');
CALL crearIdx('tblarticulos', 'idx_servicio',     'Servicio');

-- ================================================================
-- CLIENTES — búsqueda por NIT y por vendedor
-- ================================================================
CALL crearIdx('tblclientes', 'idx_nit',          'Nit');
CALL crearIdx('tblclientes', 'idx_razon',        'Razon_Social');

-- ================================================================
-- PROVEEDORES — búsqueda por NIT
-- ================================================================
-- Nombre de columna varía por versión: BDs viejas la llaman `ProvNit`,
-- BDs nuevas la llaman `Nit`. El helper detecta y aplica solo la que existe.
CALL crearIdx('tblproveedores', 'idx_nit',       'Nit');
CALL crearIdx('tblproveedores', 'idx_provnit',   'ProvNit');

-- ================================================================
-- COMPRAS (tblpedidos) — listado por fecha, filtrar por proveedor
-- ================================================================
CALL crearIdx('tblpedidos', 'idx_fecha',      'Fecha');
CALL crearIdx('tblpedidos', 'idx_anio_mes',   'anio, N_Mes');
CALL crearIdx('tblpedidos', 'idx_proveedor',  'Codigo');
CALL crearIdx('tblpedidos', 'idx_estado',     'EstadoFact, Fecha');

CALL crearIdx('tbldetalle_pedido', 'idx_pedido', 'Pedido_N');
CALL crearIdx('tbldetalle_pedido', 'idx_items',  'Items');

-- ================================================================
-- EGRESOS — cuadre de caja y gastos
-- ================================================================
CALL crearIdx('tblegresos', 'idx_fecha',       'Fecha');
CALL crearIdx('tblegresos', 'idx_estado',      'Estado, Fecha');
CALL crearIdx('tblegresos', 'idx_id_usuario',  'id_usuario');

-- ================================================================
-- FE — si la tabla existe
-- ================================================================
CALL crearIdx('electronic_documents',         'idx_created_at',       'created_at');
CALL crearIdx('electronic_documents',         'idx_cod_cliente',      'cod_cliente');
CALL crearIdx('electronic_documents',         'idx_status',           'status');
CALL crearIdx('electronic_documents',         'idx_type_payment',     'type_document_id, payment_form_id');
CALL crearIdx('detalle_document_electronic',  'idx_items',            'items');

-- ================================================================
-- MOVIMIENTOS DE CAJA
-- ================================================================
CALL crearIdx('tblmov_caja',       'idx_sesion',      'Id_Sesion');
CALL crearIdx('tblmov_caja',       'idx_tipo_fecha',  'Tipo, Fecha');
CALL crearIdx('tblsesiones_caja',  'idx_estado',      'Estado');
CALL crearIdx('tblsesiones_caja',  'idx_id_caja',     'Id_Caja, Estado');

-- ================================================================
-- LIMPIEZA
-- ================================================================
DROP PROCEDURE IF EXISTS crearIdx;

-- Actualizar estadísticas (para que el optimizador use los índices nuevos)
ANALYZE TABLE tblventas, tbldetalle_venta, tblpagos, tblkardex, tblarticulos,
              tblclientes, tblproveedores, tblpedidos, tbldetalle_pedido,
              tblegresos, tblmov_caja, tblsesiones_caja;

SELECT '✓ Optimización completa. Reinicia la app para ver la mejora.' AS resultado;
