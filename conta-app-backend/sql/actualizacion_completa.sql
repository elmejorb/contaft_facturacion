-- ================================================================
-- ACTUALIZACIÓN COMPLETA Conta FT — versión consolidada
-- Aplica TODAS las migraciones desde v4.1 hasta la última en orden.
-- 100% idempotente: se puede ejecutar varias veces sin romper nada.
--
-- USO:
--   mysql -u root -p nombre_de_la_base < actualizacion_completa.sql
-- o desde phpMyAdmin: Importar este archivo seleccionando la BD.
-- ================================================================

-- ================================================================
-- v4.1 — Kardex AUTO_INCREMENT, Pedido_N AUTO_INCREMENT,
--        Conteo Inventario, Cajas, Categorías Gasto, Bancos,
--        Detalle compras IVA/flete, Vistas diagnóstico/auditoría,
--        Permisos por tipo de usuario
-- ================================================================

-- 1. Corregir tblkardex: AUTO_INCREMENT
DELETE FROM tblkardex WHERE Id_kardex = 0;
ALTER TABLE tblkardex MODIFY Id_kardex INT(11) NOT NULL AUTO_INCREMENT;

-- 1b. Corregir tblpedidos: Pedido_N debe ser AUTO_INCREMENT
SET @next_pedido = IFNULL((SELECT MAX(Pedido_N) FROM tblpedidos WHERE Pedido_N > 0), 0) + 1;
UPDATE tbldetalle_pedido SET Pedido_N = @next_pedido WHERE Pedido_N = 0;
UPDATE tblpedidos        SET Pedido_N = @next_pedido WHERE Pedido_N = 0;

SET @is_autoinc = (SELECT COUNT(*) FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'tblpedidos'
      AND COLUMN_NAME = 'Pedido_N' AND EXTRA LIKE '%auto_increment%');
SET @sql = IF(@is_autoinc = 0,
    "ALTER TABLE tblpedidos MODIFY Pedido_N INT(11) NOT NULL AUTO_INCREMENT",
    'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 2. Conteo de Inventario
CREATE TABLE IF NOT EXISTS tblconteo_inventario (
    Id_Conteo INT AUTO_INCREMENT PRIMARY KEY,
    Fecha DATETIME NOT NULL,
    Usuario VARCHAR(50) NOT NULL,
    Observacion VARCHAR(255) DEFAULT '',
    Tipo VARCHAR(20) DEFAULT 'Total',
    Filtro_Categoria INT DEFAULT NULL,
    Filtro_Proveedor INT DEFAULT NULL,
    Total_Items INT DEFAULT 0,
    Items_Contados INT DEFAULT 0,
    Items_Con_Diferencia INT DEFAULT 0,
    Estado ENUM('Abierto','Cerrado','Cancelado') DEFAULT 'Abierto',
    Fecha_Cierre DATETIME DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS tblconteo_detalle (
    Id_Detalle INT AUTO_INCREMENT PRIMARY KEY,
    Id_Conteo INT NOT NULL,
    Items INT NOT NULL,
    Existencia_Sistema FLOAT NOT NULL DEFAULT 0,
    Existencia_Contada FLOAT DEFAULT NULL,
    Diferencia FLOAT DEFAULT NULL,
    Observacion VARCHAR(100) DEFAULT '',
    UNIQUE KEY uk_conteo_item (Id_Conteo, Items),
    KEY idx_conteo (Id_Conteo),
    KEY idx_items (Items)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 3. Sistema de Cajas
CREATE TABLE IF NOT EXISTS tblcajas (
    Id_Caja INT AUTO_INCREMENT PRIMARY KEY,
    Nombre VARCHAR(50) NOT NULL,
    Tipo ENUM('punto_venta','principal') DEFAULT 'punto_venta',
    Activa TINYINT(1) DEFAULT 1,
    Saldo DECIMAL(19,4) DEFAULT 0,
    FechaCreacion DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS tblsesiones_caja (
    Id_Sesion INT AUTO_INCREMENT PRIMARY KEY,
    Id_Caja INT NOT NULL,
    Id_Usuario INT NOT NULL,
    FechaApertura DATETIME NOT NULL,
    FechaCierre DATETIME DEFAULT NULL,
    BaseInicial DECIMAL(19,4) DEFAULT 0,
    VentasContadoEfectivo DECIMAL(19,4) DEFAULT 0,
    VentasContadoTransf DECIMAL(19,4) DEFAULT 0,
    VentasCredito DECIMAL(19,4) DEFAULT 0,
    PagosEfectivo DECIMAL(19,4) DEFAULT 0,
    PagosTransf DECIMAL(19,4) DEFAULT 0,
    Egresos DECIMAL(19,4) DEFAULT 0,
    Anulaciones DECIMAL(19,4) DEFAULT 0,
    RetirosParciales DECIMAL(19,4) DEFAULT 0,
    TotalEfectivoSistema DECIMAL(19,4) DEFAULT 0,
    ConteoFinal DECIMAL(19,4) DEFAULT 0,
    DiferenciaFinal DECIMAL(19,4) DEFAULT 0,
    Estado ENUM('abierta','cerrada') DEFAULT 'abierta',
    Observacion VARCHAR(255) DEFAULT '',
    KEY idx_caja (Id_Caja),
    KEY idx_usuario (Id_Usuario),
    KEY idx_estado (Estado)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS tblmov_caja (
    Id_Mov INT AUTO_INCREMENT PRIMARY KEY,
    Id_Sesion INT DEFAULT NULL,
    Id_Caja_Origen INT DEFAULT NULL,
    Id_Caja_Destino INT DEFAULT NULL,
    Id_Usuario INT NOT NULL,
    Fecha DATETIME DEFAULT CURRENT_TIMESTAMP,
    Valor DECIMAL(19,4) NOT NULL,
    Tipo ENUM('retiro_parcial','traslado','deposito','gasto') NOT NULL,
    Descripcion VARCHAR(255) DEFAULT '',
    KEY idx_sesion (Id_Sesion)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

INSERT INTO tblcajas (Nombre, Tipo, Activa)
SELECT 'Caja 1', 'punto_venta', 1
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM tblcajas WHERE Nombre = 'Caja 1');

INSERT INTO tblcajas (Nombre, Tipo, Activa)
SELECT 'Caja Principal', 'principal', 1
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM tblcajas WHERE Tipo = 'principal');

-- 4. Categorías de Gastos
CREATE TABLE IF NOT EXISTS tblcategorias_gasto (
    Id_Categoria INT AUTO_INCREMENT PRIMARY KEY,
    Nombre VARCHAR(50) NOT NULL,
    Activa TINYINT(1) DEFAULT 1
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

INSERT INTO tblcategorias_gasto (Nombre)
SELECT t.Nombre FROM (
    SELECT 'Servicios Públicos' AS Nombre UNION ALL
    SELECT 'Arriendo' UNION ALL SELECT 'Nómina' UNION ALL
    SELECT 'Transporte' UNION ALL SELECT 'Mantenimiento' UNION ALL
    SELECT 'Papelería' UNION ALL SELECT 'Alimentación' UNION ALL
    SELECT 'Aseo' UNION ALL SELECT 'Impuestos' UNION ALL SELECT 'Otros'
) t WHERE NOT EXISTS (SELECT 1 FROM tblcategorias_gasto LIMIT 1);

SET @col_exists = (SELECT COUNT(*) FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'tblegresos' AND COLUMN_NAME = 'categoria_gasto');
SET @sql = IF(@col_exists = 0,
    "ALTER TABLE tblegresos ADD COLUMN categoria_gasto VARCHAR(50) DEFAULT 'Otros'",
    'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 5. Bancos (movimientos)
CREATE TABLE IF NOT EXISTS tblmov_banco (
    Id_Mov INT AUTO_INCREMENT PRIMARY KEY,
    Id_Cuenta INT NOT NULL,
    Fecha DATETIME DEFAULT CURRENT_TIMESTAMP,
    Tipo ENUM('ingreso','egreso','traslado_entrada','traslado_salida') NOT NULL,
    Valor DECIMAL(19,4) NOT NULL,
    Descripcion VARCHAR(255) DEFAULT '',
    Referencia VARCHAR(50) DEFAULT '',
    Id_Usuario INT DEFAULT 0,
    Id_Caja_Origen INT DEFAULT NULL,
    Id_Caja_Destino INT DEFAULT NULL,
    KEY idx_cuenta (Id_Cuenta),
    KEY idx_fecha (Fecha)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

SET @col_exists = (SELECT COUNT(*) FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'tblbancos' AND COLUMN_NAME = 'Saldo');
SET @sql = IF(@col_exists = 0, "ALTER TABLE tblbancos ADD COLUMN Saldo DECIMAL(19,4) DEFAULT 0", 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @col_exists = (SELECT COUNT(*) FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'tblbancos' AND COLUMN_NAME = 'Banco');
SET @sql = IF(@col_exists = 0, "ALTER TABLE tblbancos ADD COLUMN Banco VARCHAR(50) DEFAULT ''", 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @col_exists = (SELECT COUNT(*) FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'tblbancos' AND COLUMN_NAME = 'TipoCuenta');
SET @sql = IF(@col_exists = 0, "ALTER TABLE tblbancos ADD COLUMN TipoCuenta VARCHAR(20) DEFAULT 'ahorros'", 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @col_exists = (SELECT COUNT(*) FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'tblbancos' AND COLUMN_NAME = 'Activa');
SET @sql = IF(@col_exists = 0, "ALTER TABLE tblbancos ADD COLUMN Activa TINYINT(1) DEFAULT 1", 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 6. Detalle de compras: IVA, flete, costos
SET @col_exists = (SELECT COUNT(*) FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'tbldetalle_pedido' AND COLUMN_NAME = 'IvaPct');
SET @sql = IF(@col_exists = 0, "ALTER TABLE tbldetalle_pedido ADD COLUMN IvaPct FLOAT DEFAULT 0, ADD COLUMN CostoSinIva DECIMAL(19,4) DEFAULT 0, ADD COLUMN CostoConIva DECIMAL(19,4) DEFAULT 0, ADD COLUMN FleteUnit DECIMAL(19,4) DEFAULT 0, ADD COLUMN CostoFinal DECIMAL(19,4) DEFAULT 0, ADD COLUMN CostoAnterior DECIMAL(19,4) DEFAULT 0, ADD COLUMN CostoPromedio DECIMAL(19,4) DEFAULT 0", 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 7. Vistas: Diagnóstico e Inventario
DROP VIEW IF EXISTS vw_item_ventas_30d;
CREATE VIEW vw_item_ventas_30d AS
SELECT
    d.Items,
    COALESCE(SUM(d.Cantidad), 0) AS Unidades_Vendidas_30d,
    COUNT(DISTINCT d.Factura_N) AS Veces_Vendido_30d
FROM tbldetalle_venta d
INNER JOIN tblventas v ON d.Factura_N = v.Factura_N
WHERE v.Fecha >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
GROUP BY d.Items;

DROP VIEW IF EXISTS vw_diagnostico_inventario_30d;
CREATE VIEW vw_diagnostico_inventario_30d AS
SELECT
    a.Items, a.Nombres_Articulo, a.Existencia, a.Precio_Costo, a.Precio_Venta,
    CASE WHEN a.Precio_Costo <= 0 THEN 0 WHEN a.Precio_Venta <= 0 THEN 0
        ELSE ROUND(((a.Precio_Venta - a.Precio_Costo) / a.Precio_Venta) * 100, 2) END AS Margen_Porc,
    COALESCE(v.Unidades_Vendidas_30d, 0) AS Unidades_Vendidas_30d,
    COALESCE(v.Veces_Vendido_30d, 0) AS Veces_Vendido_30d,
    ROUND(a.Existencia * a.Precio_Costo, 0) AS Capital_Invertido,
    CASE
        WHEN a.Precio_Costo <= 0 THEN 'Costo inválido'
        WHEN a.Precio_Venta <= a.Precio_Costo THEN 'Precio por debajo del costo'
        WHEN ((a.Precio_Venta - a.Precio_Costo) / a.Precio_Venta) * 100 > 80 THEN 'Margen sospechoso'
        WHEN COALESCE(v.Veces_Vendido_30d, 0) >= 10 AND ((a.Precio_Venta - a.Precio_Costo) / a.Precio_Venta) * 100 >= 20 THEN 'Alta rotación / Buen margen'
        WHEN COALESCE(v.Veces_Vendido_30d, 0) >= 10 THEN 'Alta rotación / Margen bajo'
        WHEN COALESCE(v.Veces_Vendido_30d, 0) BETWEEN 3 AND 9 AND ((a.Precio_Venta - a.Precio_Costo) / a.Precio_Venta) * 100 >= 20 THEN 'Rotación media / Margen aceptable'
        WHEN COALESCE(v.Veces_Vendido_30d, 0) BETWEEN 3 AND 9 THEN 'Rotación media / Margen bajo'
        WHEN COALESCE(v.Veces_Vendido_30d, 0) BETWEEN 1 AND 2 AND ((a.Precio_Venta - a.Precio_Costo) / a.Precio_Venta) * 100 >= 20 THEN 'Baja rotación / Margen aceptable'
        WHEN COALESCE(v.Veces_Vendido_30d, 0) BETWEEN 1 AND 2 THEN 'Baja rotación / Margen insuficiente'
        ELSE 'Revisar'
    END AS Diagnostico
FROM tblarticulos a
LEFT JOIN vw_item_ventas_30d v ON a.Items = v.Items
WHERE a.Estado = 1;

DROP VIEW IF EXISTS vw_item_ventas_90d;
CREATE VIEW vw_item_ventas_90d AS
SELECT
    d.Items,
    COALESCE(SUM(d.Cantidad), 0) AS Unidades_Vendidas_90d,
    COUNT(DISTINCT d.Factura_N) AS Veces_Vendido_90d,
    COALESCE(SUM(d.Subtotal), 0) AS Total_Vendido_90d,
    MAX(v.Fecha) AS Ultima_Venta
FROM tbldetalle_venta d
INNER JOIN tblventas v ON d.Factura_N = v.Factura_N
WHERE v.Fecha >= DATE_SUB(CURDATE(), INTERVAL 90 DAY)
GROUP BY d.Items;

DROP VIEW IF EXISTS vw_auditoria_inventario_90d;
CREATE VIEW vw_auditoria_inventario_90d AS
SELECT
    a.Items, a.Codigo, a.Nombres_Articulo, a.Existencia, a.Precio_Costo, a.Precio_Venta,
    CASE WHEN a.Precio_Costo <= 0 THEN 0 WHEN a.Precio_Venta <= 0 THEN 0
        ELSE ROUND(((a.Precio_Venta - a.Precio_Costo) / a.Precio_Venta) * 100, 2) END AS Margen_Porc,
    COALESCE(v.Unidades_Vendidas_90d, 0) AS Unidades_Vendidas_90d,
    COALESCE(v.Veces_Vendido_90d, 0) AS Veces_Vendido_90d,
    COALESCE(v.Total_Vendido_90d, 0) AS Total_Vendido_90d,
    v.Ultima_Venta,
    ROUND(a.Existencia * a.Precio_Costo, 0) AS Capital_Invertido,
    CASE WHEN COALESCE(v.Unidades_Vendidas_90d, 0) > 0
         THEN ROUND(a.Existencia / (COALESCE(v.Unidades_Vendidas_90d, 0) / 90), 0)
         ELSE 999 END AS Dias_Stock,
    COALESCE(c.Categoria, 'VARIOS') AS Categoria,
    COALESCE(p.RazonSocial, '') AS Proveedor,
    CASE
        WHEN a.Existencia < 0 THEN 'Stock negativo'
        WHEN a.Precio_Costo <= 0 THEN 'Costo inválido'
        WHEN a.Precio_Venta <= a.Precio_Costo THEN 'Precio bajo costo'
        WHEN ((a.Precio_Venta - a.Precio_Costo) / a.Precio_Venta) * 100 > 80 THEN 'Margen sospechoso'
        WHEN a.Existencia > 0 AND COALESCE(v.Veces_Vendido_90d, 0) = 0 THEN 'Capital muerto'
        WHEN a.Existencia > 0 AND COALESCE(v.Unidades_Vendidas_90d, 0) > 0
             AND (a.Existencia / (COALESCE(v.Unidades_Vendidas_90d, 0) / 90)) > 180 THEN 'Sobre-stock'
        WHEN COALESCE(v.Veces_Vendido_90d, 0) >= 15 AND ((a.Precio_Venta - a.Precio_Costo) / a.Precio_Venta) * 100 >= 20 THEN 'Excelente'
        WHEN COALESCE(v.Veces_Vendido_90d, 0) >= 15 THEN 'Alta rotación / Margen bajo'
        WHEN COALESCE(v.Veces_Vendido_90d, 0) >= 5 THEN 'Rotación normal'
        WHEN COALESCE(v.Veces_Vendido_90d, 0) >= 1 THEN 'Baja rotación'
        ELSE 'Sin movimiento'
    END AS Auditoria
FROM tblarticulos a
LEFT JOIN vw_item_ventas_90d v ON a.Items = v.Items
LEFT JOIN tblcategoria c ON a.Id_Categoria = c.Id_Categoria
LEFT JOIN tblproveedores p ON a.CodigoPro = p.CodigoPro
WHERE a.Estado = 1;

-- 8. Permisos por tipo de usuario
SET @col_exists = (SELECT COUNT(*) FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'tbltiposusuario' AND COLUMN_NAME = 'permisos');
SET @sql = IF(@col_exists = 0,
    "ALTER TABLE tbltiposusuario ADD COLUMN permisos TEXT DEFAULT NULL",
    'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- ================================================================
-- v4.2 — Familias de Productos + Distribución + Stock mínimo
-- ================================================================

CREATE TABLE IF NOT EXISTS tblfamilias_producto (
    Id_Familia    INT AUTO_INCREMENT PRIMARY KEY,
    Nombre        VARCHAR(100) NOT NULL,
    Descripcion   VARCHAR(255) DEFAULT NULL,
    Activa        TINYINT(1) DEFAULT 1,
    Fecha_Creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    KEY idx_activa (Activa)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS tblfamilia_items (
    Id_Familia_Item INT AUTO_INCREMENT PRIMARY KEY,
    Id_Familia      INT NOT NULL,
    Items           INT NOT NULL,
    Factor          DECIMAL(12,4) NOT NULL DEFAULT 1,
    Es_Base         TINYINT(1) DEFAULT 0,
    UNIQUE KEY uk_items (Items),
    KEY idx_familia (Id_Familia),
    CONSTRAINT fk_fi_familia FOREIGN KEY (Id_Familia) REFERENCES tblfamilias_producto (Id_Familia) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS tblmovimientos_distribucion (
    Id_Mov          INT AUTO_INCREMENT PRIMARY KEY,
    Fecha           DATETIME DEFAULT CURRENT_TIMESTAMP,
    Id_Usuario      INT DEFAULT 0,
    Items_Origen    INT NOT NULL,
    Items_Destino   INT NOT NULL,
    Cant_Origen     DECIMAL(12,4) NOT NULL,
    Cant_Destino    DECIMAL(12,4) NOT NULL,
    Factor_Origen   DECIMAL(12,4) NOT NULL,
    Factor_Destino  DECIMAL(12,4) NOT NULL,
    Motivo          ENUM('automatico','manual') DEFAULT 'automatico',
    Factura_N       INT DEFAULT NULL,
    Comentario      VARCHAR(255) DEFAULT NULL,
    KEY idx_fecha (Fecha),
    KEY idx_factura (Factura_N),
    KEY idx_origen (Items_Origen),
    KEY idx_destino (Items_Destino)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

DROP VIEW IF EXISTS vw_productos_stock_bajo;
CREATE VIEW vw_productos_stock_bajo AS
SELECT
    a.Items, a.Codigo, a.Nombres_Articulo,
    a.Existencia, a.Existencia_minima AS Stock_Minimo, a.Precio_Venta,
    COALESCE(fi.Id_Familia, 0) AS Id_Familia,
    COALESCE(f.Nombre, '')      AS Familia_Nombre
FROM tblarticulos a
LEFT JOIN tblfamilia_items fi ON a.Items = fi.Items
LEFT JOIN tblfamilias_producto f ON fi.Id_Familia = f.Id_Familia
WHERE a.Estado = 1
  AND a.Existencia_minima > 0
  AND a.Existencia < a.Existencia_minima;

-- ================================================================
-- v4.3 — Modo contingencia DIAN (FE sin internet)
-- ================================================================

SET @col_exists = (SELECT COUNT(*) FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'tblventas' AND COLUMN_NAME = 'en_contingencia');
SET @sql = IF(@col_exists = 0,
    "ALTER TABLE tblventas ADD COLUMN en_contingencia TINYINT(1) DEFAULT 0, ADD COLUMN contingencia_fecha DATETIME NULL, ADD COLUMN contingencia_reenviada TINYINT(1) DEFAULT 0, ADD COLUMN contingencia_motivo VARCHAR(255) NULL",
    'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @idx_exists = (SELECT COUNT(*) FROM information_schema.STATISTICS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'tblventas' AND INDEX_NAME = 'idx_contingencia_pendientes');
SET @sql = IF(@idx_exists = 0,
    "ALTER TABLE tblventas ADD INDEX idx_contingencia_pendientes (en_contingencia, contingencia_reenviada)",
    'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- ================================================================
-- v4.4 — Retenciones (ReteFuente, ReteICA, ReteIVA)
-- ================================================================

CREATE TABLE IF NOT EXISTS tblretenciones (
    Id_Retencion    INT AUTO_INCREMENT PRIMARY KEY,
    Codigo          VARCHAR(20) NOT NULL,
    Nombre          VARCHAR(120) NOT NULL,
    Porcentaje      DECIMAL(7,4) NOT NULL DEFAULT 0,
    Codigo_Dian     VARCHAR(5) DEFAULT NULL,
    Activa          TINYINT(1) DEFAULT 1,
    Fecha_Creacion  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uk_codigo (Codigo),
    KEY idx_activa (Activa)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Si la tabla ya existía sin UNIQUE, agregarlo (idempotente)
SET @uk_exists = (SELECT COUNT(*) FROM information_schema.STATISTICS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'tblretenciones' AND INDEX_NAME = 'uk_codigo');
SET @sql = IF(@uk_exists = 0,
    "ALTER TABLE tblretenciones ADD UNIQUE KEY uk_codigo (Codigo)",
    'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

CREATE TABLE IF NOT EXISTS tblcliente_retenciones (
    Id              INT AUTO_INCREMENT PRIMARY KEY,
    CodigoClien     INT NOT NULL,
    Id_Retencion    INT NOT NULL,
    UNIQUE KEY uk_cli_ret (CodigoClien, Id_Retencion),
    KEY idx_cliente (CodigoClien),
    CONSTRAINT fk_cliret_ret FOREIGN KEY (Id_Retencion) REFERENCES tblretenciones (Id_Retencion) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

SET @col_exists = (SELECT COUNT(*) FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'tblclientes' AND COLUMN_NAME = 'retencion_modo');
SET @sql = IF(@col_exists = 0,
    "ALTER TABLE tblclientes ADD COLUMN retencion_modo ENUM('informativo','gross_up') DEFAULT 'gross_up'",
    'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

CREATE TABLE IF NOT EXISTS tblventa_retenciones (
    Id              INT AUTO_INCREMENT PRIMARY KEY,
    Factura_N       INT NOT NULL,
    Id_Retencion    INT DEFAULT NULL,
    Codigo          VARCHAR(20),
    Nombre          VARCHAR(120),
    Porcentaje      DECIMAL(7,4),
    Base            DECIMAL(19,4),
    Valor           DECIMAL(19,4),
    Modo            ENUM('informativo','gross_up') DEFAULT 'informativo',
    Fecha           TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    KEY idx_factura (Factura_N),
    KEY idx_retencion (Id_Retencion)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

INSERT IGNORE INTO tblretenciones (Codigo, Nombre, Porcentaje, Codigo_Dian, Activa) VALUES
    ('RETEFUENTE_SERV_DECL',   'ReteFuente servicios (declarante)',     4.0000, '06', 1),
    ('RETEFUENTE_SERV_NODECL', 'ReteFuente servicios (no declarante)',  6.0000, '06', 0),
    ('RETEFUENTE_COMPRAS',     'ReteFuente compras generales',          2.5000, '06', 0),
    ('RETEICA_PLANETARICA',    'ReteICA Planeta Rica servicios',        0.9660, '07', 0),
    ('RETEIVA',                'ReteIVA (15% del IVA)',                 15.0000,'05', 0);

-- ================================================================
-- v4.5 — Lotes (vencimientos) + Notas de Artículo (Daño/Cambio/Vencimiento/Otro)
-- ================================================================

CREATE TABLE IF NOT EXISTS tblnotas_articulo (
    Id_Nota         INT AUTO_INCREMENT PRIMARY KEY,
    Fecha           TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    Items           INT NOT NULL,
    Tipo            ENUM('Entrada','Salida') NOT NULL,
    Concepto        VARCHAR(30) NOT NULL,
    Descripcion     VARCHAR(500) DEFAULT NULL,
    Cantidad        DECIMAL(12,4) NOT NULL,
    Valor_Unitario  DECIMAL(19,4) DEFAULT 0,
    Id_Usuario      INT DEFAULT 0,
    Id_Lote         INT DEFAULT NULL,
    KEY idx_items (Items),
    KEY idx_fecha (Fecha),
    KEY idx_concepto (Concepto)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS tblproductos_lotes (
    Id_Lote           INT AUTO_INCREMENT PRIMARY KEY,
    Items             INT NOT NULL,
    Numero_Lote       VARCHAR(50) DEFAULT NULL,
    Fecha_Vencimiento DATE NOT NULL,
    Fecha_Ingreso     TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    Cantidad_Inicial  DECIMAL(12,4) NOT NULL,
    Cantidad_Actual   DECIMAL(12,4) NOT NULL,
    Estado            ENUM('activo','agotado','dado_de_baja') DEFAULT 'activo',
    Pedido_N          INT DEFAULT NULL,
    Comentario        VARCHAR(255) DEFAULT NULL,
    KEY idx_items_estado (Items, Estado),
    KEY idx_vencimiento (Fecha_Vencimiento)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

SET @col_exists = (SELECT COUNT(*) FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'tblarticulos' AND COLUMN_NAME = 'requiere_lote');
SET @sql = IF(@col_exists = 0,
    "ALTER TABLE tblarticulos ADD COLUMN requiere_lote TINYINT(1) DEFAULT 0",
    'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

DROP VIEW IF EXISTS vw_lotes_por_vencer;
CREATE VIEW vw_lotes_por_vencer AS
SELECT
    l.Id_Lote, l.Items, l.Numero_Lote, l.Fecha_Vencimiento, l.Fecha_Ingreso,
    l.Cantidad_Inicial, l.Cantidad_Actual,
    DATEDIFF(l.Fecha_Vencimiento, CURDATE()) AS dias_restantes,
    a.Codigo, a.Nombres_Articulo, a.Precio_Costo, a.Precio_Venta,
    (l.Cantidad_Actual * a.Precio_Costo) AS valor_costo
FROM tblproductos_lotes l
INNER JOIN tblarticulos a ON l.Items = a.Items
WHERE l.Estado = 'activo' AND l.Cantidad_Actual > 0;

-- ================================================================
-- VERIFICACIÓN FINAL
-- ================================================================
SELECT '✓ Actualización completa Conta FT aplicada' AS resultado;
SELECT
    (SELECT COUNT(*) FROM tblcajas)                       AS cajas,
    (SELECT COUNT(*) FROM tblcategorias_gasto)            AS categ_gasto,
    (SELECT COUNT(*) FROM tblfamilias_producto)           AS familias,
    (SELECT COUNT(*) FROM tblretenciones)                 AS retenciones,
    (SELECT COUNT(*) FROM tblproductos_lotes)             AS lotes,
    (SELECT COUNT(*) FROM tblnotas_articulo)              AS notas_articulo,
    (SELECT COUNT(*) FROM information_schema.VIEWS
        WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME IN ('vw_diagnostico_inventario_30d','vw_auditoria_inventario_90d','vw_productos_stock_bajo','vw_lotes_por_vencer'))
    AS vistas_creadas;
