-- ================================================================
-- AUDITAR BD Conta FT — Diagnóstico sin modificar
-- ================================================================
-- Recorre tabla por tabla verificando estructura esperada y reporta
-- qué falta. NO MODIFICA NADA. Solo lectura.
--
-- Para APLICAR las correcciones use `migrar_cliente.bat` que corre
-- este auditor + los scripts de actualización/reparación/índices.
--
-- Uso:
--   mysql -uroot -p conta_XXXX < auditar_bd.sql
-- ================================================================

DELIMITER $$
DROP PROCEDURE IF EXISTS auditarBD$$
CREATE PROCEDURE auditarBD()
BEGIN
    DECLARE total_problemas INT DEFAULT 0;
    DECLARE msg VARCHAR(500);

    -- Tabla temporal con los hallazgos
    DROP TEMPORARY TABLE IF EXISTS _audit_result;
    CREATE TEMPORARY TABLE _audit_result (
        seccion VARCHAR(30),
        tabla VARCHAR(64),
        detalle VARCHAR(200),
        severidad VARCHAR(10)  -- OK, WARN, ERROR
    );

    -- ============================================================
    -- 1) TABLAS CRÍTICAS que deben existir
    -- ============================================================
    INSERT INTO _audit_result
    SELECT 'TABLAS', esperada,
           IF(t.TABLE_NAME IS NULL, CONCAT('❌ FALTA tabla ', esperada), CONCAT('✓ Existe')),
           IF(t.TABLE_NAME IS NULL, 'ERROR', 'OK')
    FROM (
        SELECT 'tblarticulos' AS esperada UNION ALL
        SELECT 'tblventas' UNION ALL
        SELECT 'tbldetalle_venta' UNION ALL
        SELECT 'tblclientes' UNION ALL
        SELECT 'tblproveedores' UNION ALL
        SELECT 'tblpedidos' UNION ALL
        SELECT 'tbldetalle_pedido' UNION ALL
        SELECT 'tblpagos' UNION ALL
        SELECT 'tblegresos' UNION ALL
        SELECT 'tblkardex' UNION ALL
        SELECT 'tblcategoria' UNION ALL
        SELECT 'tblusuarios' UNION ALL
        SELECT 'tblbancos' UNION ALL
        SELECT 'tblcajas' UNION ALL
        SELECT 'tblsesiones_caja' UNION ALL
        SELECT 'tblmov_caja' UNION ALL
        SELECT 'tblfacturasanterioresproveedor' UNION ALL
        SELECT 'tblcotizaciones' UNION ALL
        SELECT 'detalle_cotizacion' UNION ALL
        SELECT 'tbldatosempresa' UNION ALL
        SELECT 'tblretenciones' UNION ALL
        SELECT 'tblcategorias_gasto' UNION ALL
        SELECT 'tblproductos_lotes' UNION ALL
        SELECT 'tblnotas_articulo' UNION ALL
        SELECT 'tblfinanciaciones' UNION ALL
        SELECT 'tblfinanciacion_cuotas' UNION ALL
        SELECT 'tblfinanciacion_pagos'
    ) esperadas
    LEFT JOIN information_schema.TABLES t
      ON t.TABLE_SCHEMA = DATABASE() AND t.TABLE_NAME = esperadas.esperada;

    -- ============================================================
    -- 2) COLUMNAS ESPERADAS por tabla (las que actualiza el consolidado)
    -- ============================================================
    -- tblventas: campos de FE y anulaciones
    INSERT INTO _audit_result
    SELECT 'COLUMNAS', 'tblventas', CONCAT('❌ FALTA columna ', esperada),  'WARN'
    FROM (SELECT 'enviada_dian' AS esperada UNION SELECT 'cufe' UNION SELECT 'id_mediopago'
          UNION SELECT 'Hora' UNION SELECT 'Id_Usuario') e
    WHERE NOT EXISTS (SELECT 1 FROM information_schema.COLUMNS
                      WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='tblventas' AND COLUMN_NAME=e.esperada);

    -- tblarticulos
    INSERT INTO _audit_result
    SELECT 'COLUMNAS', 'tblarticulos', CONCAT('❌ FALTA columna ', esperada), 'WARN'
    FROM (SELECT 'Servicio' AS esperada UNION SELECT 'requiere_lote'
          UNION SELECT 'Id_Etiqueta' UNION SELECT 'tiene_componentes'
          UNION SELECT 'unit_measure_id' UNION SELECT 'Estante'
          UNION SELECT 'Existencia_minima') e
    WHERE NOT EXISTS (SELECT 1 FROM information_schema.COLUMNS
                      WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='tblarticulos' AND COLUMN_NAME=e.esperada);

    -- tblpagos
    INSERT INTO _audit_result
    SELECT 'COLUMNAS', 'tblpagos', CONCAT('❌ FALTA columna ', esperada), 'WARN'
    FROM (SELECT 'id_mediopago' AS esperada UNION SELECT 'id_usuario'
          UNION SELECT 'Descuento') e
    WHERE NOT EXISTS (SELECT 1 FROM information_schema.COLUMNS
                      WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='tblpagos' AND COLUMN_NAME=e.esperada);

    -- tblegresos — la columna de categoría puede llamarse `Categoria` (legacy)
    -- o `categoria_gasto` (nueva); solo reportar si NINGUNA existe.
    INSERT INTO _audit_result
    SELECT 'COLUMNAS', 'tblegresos', CONCAT('❌ FALTA columna ', esperada), 'WARN'
    FROM (SELECT 'id_mediopago' AS esperada UNION SELECT 'id_usuario'
          UNION SELECT 'Estado') e
    WHERE NOT EXISTS (SELECT 1 FROM information_schema.COLUMNS
                      WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='tblegresos' AND COLUMN_NAME=e.esperada);
    INSERT INTO _audit_result
    SELECT 'COLUMNAS', 'tblegresos', '❌ FALTA columna de categoría (Categoria o categoria_gasto)', 'WARN'
    FROM DUAL
    WHERE NOT EXISTS (SELECT 1 FROM information_schema.COLUMNS
                      WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='tblegresos'
                        AND COLUMN_NAME IN ('Categoria','categoria_gasto'));

    -- tbldetalle_pedido
    INSERT INTO _audit_result
    SELECT 'COLUMNAS', 'tbldetalle_pedido', CONCAT('❌ FALTA columna ', esperada), 'WARN'
    FROM (SELECT 'CostoSinIva' AS esperada UNION SELECT 'CostoConIva'
          UNION SELECT 'FleteUnit' UNION SELECT 'CostoFinal'
          UNION SELECT 'CostoAnterior' UNION SELECT 'CostoPromedio' UNION SELECT 'IvaPct') e
    WHERE NOT EXISTS (SELECT 1 FROM information_schema.COLUMNS
                      WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='tbldetalle_pedido' AND COLUMN_NAME=e.esperada);

    -- tblusuarios
    INSERT INTO _audit_result
    SELECT 'COLUMNAS', 'tblusuarios', CONCAT('❌ FALTA columna ', esperada), 'WARN'
    FROM (SELECT 'Id_Caja' AS esperada) e
    WHERE NOT EXISTS (SELECT 1 FROM information_schema.COLUMNS
                      WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='tblusuarios' AND COLUMN_NAME=e.esperada);

    -- tbldatosempresa
    INSERT INTO _audit_result
    SELECT 'COLUMNAS', 'tbldatosempresa', CONCAT('❌ FALTA columna ', esperada), 'WARN'
    FROM (SELECT 'email' AS esperada UNION SELECT 'api_token' UNION SELECT 'Prefijo'
          UNION SELECT 'email_factelect' UNION SELECT 'password_factelect'
          UNION SELECT 'modulo_financiaciones' UNION SELECT 'tasa_mora_mensual') e
    WHERE NOT EXISTS (SELECT 1 FROM information_schema.COLUMNS
                      WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='tbldatosempresa' AND COLUMN_NAME=e.esperada);

    -- tblnotas_articulo
    INSERT INTO _audit_result
    SELECT 'COLUMNAS', 'tblnotas_articulo', CONCAT('❌ FALTA columna ', esperada), 'WARN'
    FROM (SELECT 'Estado' AS esperada UNION SELECT 'Anulada_Por'
          UNION SELECT 'Motivo_Anulacion') e
    WHERE NOT EXISTS (SELECT 1 FROM information_schema.COLUMNS
                      WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='tblnotas_articulo' AND COLUMN_NAME=e.esperada);

    -- ============================================================
    -- 3) PRIMARY KEYS que deben existir
    -- ============================================================
    INSERT INTO _audit_result
    SELECT 'PK', tabla, CONCAT('❌ FALTA PRIMARY KEY en ', tabla), 'ERROR'
    FROM (SELECT 'tblventas' AS tabla UNION SELECT 'tblarticulos' UNION SELECT 'tblclientes'
          UNION SELECT 'tblproveedores' UNION SELECT 'tblpedidos'
          UNION SELECT 'tbldetalle_venta' UNION SELECT 'tbldetalle_pedido'
          UNION SELECT 'tblpagos' UNION SELECT 'tblegresos' UNION SELECT 'tblkardex'
          UNION SELECT 'tblcategoria' UNION SELECT 'tblusuarios' UNION SELECT 'tblbancos'
          UNION SELECT 'tblcotizaciones' UNION SELECT 'detalle_cotizacion') t
    WHERE EXISTS (SELECT 1 FROM information_schema.TABLES
                  WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME=t.tabla)
      AND NOT EXISTS (SELECT 1 FROM information_schema.STATISTICS
                      WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME=t.tabla AND INDEX_NAME='PRIMARY');

    -- ============================================================
    -- 4) AUTO_INCREMENT donde debería estar
    -- ============================================================
    INSERT INTO _audit_result
    SELECT 'AUTO_INC', tabla, CONCAT('⚠ Sin AUTO_INCREMENT en ', tabla, '.', col), 'WARN'
    FROM (
        SELECT 'tblventas' AS tabla, 'Factura_N' AS col UNION ALL
        SELECT 'tblarticulos', 'Items' UNION ALL
        SELECT 'tblclientes', 'CodigoClien' UNION ALL
        SELECT 'tblproveedores', 'CodigoPro' UNION ALL
        SELECT 'tblpedidos', 'Pedido_N' UNION ALL
        SELECT 'tbldetalle_venta', 'Id_DetalleVenta' UNION ALL
        SELECT 'tbldetalle_pedido', 'Id_DetallePedido' UNION ALL
        SELECT 'tblpagos', 'Id_Pagos' UNION ALL
        SELECT 'tblegresos', 'Id_Egresos' UNION ALL
        SELECT 'tblkardex', 'Id_kardex' UNION ALL
        SELECT 'tblcategoria', 'Id_Categoria' UNION ALL
        SELECT 'tblusuarios', 'Id_Usuario' UNION ALL
        SELECT 'tblbancos', 'idBancos'
    ) t
    WHERE EXISTS (SELECT 1 FROM information_schema.COLUMNS
                  WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME=t.tabla AND COLUMN_NAME=t.col
                    AND EXTRA NOT LIKE '%auto_increment%');

    -- ============================================================
    -- 5) ÍNDICES CRÍTICOS de performance
    -- ============================================================
    INSERT INTO _audit_result
    SELECT 'INDICE', tabla, CONCAT('⚠ Falta índice: ', tabla, '.', idx, ' (', cols, ')'), 'WARN'
    FROM (
        SELECT 'tblventas' AS tabla, 'idx_fecha' AS idx, 'Fecha' AS cols UNION ALL
        SELECT 'tblventas', 'idx_cliente_fecha', 'CodigoCli, Fecha' UNION ALL
        SELECT 'tbldetalle_venta', 'idx_factura', 'Factura_N' UNION ALL
        SELECT 'tbldetalle_venta', 'idx_items', 'Items' UNION ALL
        SELECT 'tblpagos', 'idx_codigo', 'Codigo' UNION ALL
        SELECT 'tblpagos', 'idx_fecha', 'Fecha' UNION ALL
        SELECT 'tblkardex', 'idx_items_fecha', 'Items, Fecha' UNION ALL
        SELECT 'tblarticulos', 'idx_codigo', 'Codigo' UNION ALL
        SELECT 'tblarticulos', 'idx_estado', 'Estado'
    ) i
    WHERE EXISTS (SELECT 1 FROM information_schema.TABLES
                  WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME=i.tabla)
      AND NOT EXISTS (SELECT 1 FROM information_schema.STATISTICS
                      WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME=i.tabla AND INDEX_NAME=i.idx);

    -- ============================================================
    -- REPORTE
    -- ============================================================
    SELECT '════════════════════════════════════════════════' AS reporte;
    SELECT CONCAT('   AUDITORÍA DE BD: ', DATABASE()) AS reporte;
    SELECT '════════════════════════════════════════════════' AS reporte;

    SELECT
        CONCAT('  Tablas críticas ...... ',
            (SELECT COUNT(*) FROM _audit_result WHERE seccion='TABLAS' AND severidad='ERROR'),
            ' faltantes')  AS resumen
    UNION ALL SELECT
        CONCAT('  Columnas nuevas ...... ',
            (SELECT COUNT(*) FROM _audit_result WHERE seccion='COLUMNAS'),
            ' faltantes')
    UNION ALL SELECT
        CONCAT('  PRIMARY KEYs ......... ',
            (SELECT COUNT(*) FROM _audit_result WHERE seccion='PK'),
            ' faltantes')
    UNION ALL SELECT
        CONCAT('  AUTO_INCREMENT ....... ',
            (SELECT COUNT(*) FROM _audit_result WHERE seccion='AUTO_INC'),
            ' pendientes')
    UNION ALL SELECT
        CONCAT('  Índices de perf. ..... ',
            (SELECT COUNT(*) FROM _audit_result WHERE seccion='INDICE'),
            ' pendientes');

    SELECT '════════════════════════════════════════════════' AS reporte;
    SELECT '  DETALLE DE HALLAZGOS' AS reporte;
    SELECT '════════════════════════════════════════════════' AS reporte;

    -- Solo mostrar los que tienen problemas (severidad != OK)
    SELECT seccion, tabla, detalle
    FROM _audit_result
    WHERE severidad <> 'OK'
    ORDER BY FIELD(severidad,'ERROR','WARN'), seccion, tabla;

    SELECT '════════════════════════════════════════════════' AS reporte;
    SELECT
        IF ((SELECT COUNT(*) FROM _audit_result WHERE severidad <> 'OK') = 0,
            '✓ BD al día — no requiere migración',
            CONCAT('⚠ ', (SELECT COUNT(*) FROM _audit_result WHERE severidad <> 'OK'),
                   ' items pendientes. Ejecute `migrar_cliente.bat` para aplicar.')) AS resultado;

    DROP TEMPORARY TABLE IF EXISTS _audit_result;
END$$
DELIMITER ;

CALL auditarBD();
DROP PROCEDURE IF EXISTS auditarBD;
