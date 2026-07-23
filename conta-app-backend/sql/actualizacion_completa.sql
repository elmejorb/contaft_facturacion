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

-- 1. Corregir tblkardex: PRIMARY KEY, AUTO_INCREMENT y tamaño del Detalle
-- En BDs legacy (VB6) Id_kardex viene sin PK ni auto_increment; MySQL exige
-- que la columna AUTO_INCREMENT sea KEY, por eso se aplica en 2 pasos:
--   a) Asegurar PRIMARY KEY sobre Id_kardex si no existe
--   b) Convertir Id_kardex a AUTO_INCREMENT
DELETE FROM tblkardex WHERE Id_kardex = 0;

SET @has_pk = (SELECT COUNT(*) FROM information_schema.STATISTICS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'tblkardex' AND INDEX_NAME = 'PRIMARY');
SET @sql = IF(@has_pk = 0, "ALTER TABLE tblkardex ADD PRIMARY KEY (Id_kardex)", 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

ALTER TABLE tblkardex MODIFY Id_kardex INT(11) NOT NULL AUTO_INCREMENT;
ALTER TABLE tblkardex MODIFY Detalle VARCHAR(260) NULL DEFAULT NULL;

-- 1b. Corregir tblpedidos: Pedido_N debe ser AUTO_INCREMENT
SET @next_pedido = IFNULL((SELECT MAX(Pedido_N) FROM tblpedidos WHERE Pedido_N > 0), 0) + 1;
UPDATE tbldetalle_pedido SET Pedido_N = @next_pedido WHERE Pedido_N = 0;
UPDATE tblpedidos        SET Pedido_N = @next_pedido WHERE Pedido_N = 0;

-- BDs legacy: tblpedidos puede venir sin PK. Igual que tblkardex, MySQL
-- exige que la columna AUTO_INCREMENT sea KEY.
SET @has_pk = (SELECT COUNT(*) FROM information_schema.STATISTICS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'tblpedidos' AND INDEX_NAME = 'PRIMARY');
SET @sql = IF(@has_pk = 0, "ALTER TABLE tblpedidos ADD PRIMARY KEY (Pedido_N)", 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

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
-- v4.6 — Productos compuestos / Recetas (BOM)
-- ================================================================

CREATE TABLE IF NOT EXISTS tblproducto_componentes (
    Id_Componente     INT AUTO_INCREMENT PRIMARY KEY,
    Items_Padre       INT NOT NULL,
    Items_Componente  INT NOT NULL,
    Cantidad          DECIMAL(12,4) NOT NULL DEFAULT 1,
    Comentario        VARCHAR(150) DEFAULT NULL,
    Fecha_Creacion    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uk_padre_componente (Items_Padre, Items_Componente),
    KEY idx_padre (Items_Padre),
    KEY idx_componente (Items_Componente)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

SET @col_exists = (SELECT COUNT(*) FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'tblarticulos' AND COLUMN_NAME = 'tiene_componentes');
SET @sql = IF(@col_exists = 0,
    "ALTER TABLE tblarticulos ADD COLUMN tiene_componentes TINYINT(1) DEFAULT 0",
    'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

DROP VIEW IF EXISTS vw_componentes_detalle;
CREATE VIEW vw_componentes_detalle AS
SELECT
    c.Id_Componente, c.Items_Padre, c.Items_Componente, c.Cantidad, c.Comentario,
    p.Codigo AS Codigo_Padre, p.Nombres_Articulo AS Nombre_Padre,
    p.Precio_Costo AS Costo_Padre_Actual, p.Precio_Venta AS Precio_Venta_Padre,
    h.Codigo AS Codigo_Componente, h.Nombres_Articulo AS Nombre_Componente,
    h.Existencia AS Stock_Componente, h.Precio_Costo AS Costo_Unit_Componente,
    (c.Cantidad * h.Precio_Costo) AS Costo_Aporte
FROM tblproducto_componentes c
INNER JOIN tblarticulos p ON c.Items_Padre = p.Items
INNER JOIN tblarticulos h ON c.Items_Componente = h.Items;

DROP VIEW IF EXISTS vw_capacidad_compuestos;
CREATE VIEW vw_capacidad_compuestos AS
SELECT
    c.Items_Padre, p.Codigo, p.Nombres_Articulo AS Producto,
    MIN(CASE WHEN c.Cantidad > 0 THEN FLOOR(h.Existencia / c.Cantidad) ELSE 0 END) AS Unidades_Posibles,
    SUM(c.Cantidad * h.Precio_Costo) AS Costo_Total_Receta,
    p.Precio_Venta, COUNT(*) AS Num_Componentes
FROM tblproducto_componentes c
INNER JOIN tblarticulos p ON c.Items_Padre = p.Items
INNER JOIN tblarticulos h ON c.Items_Componente = h.Items
GROUP BY c.Items_Padre, p.Codigo, p.Nombres_Articulo, p.Precio_Venta;

-- ================================================================
-- v4.7 — Etiquetas (clasificación de productos)
-- ================================================================

-- Compatibilidad: renombrar tabla/columna si vienen del nombre anterior (Bodegas)
SET @old_exists = (SELECT COUNT(*) FROM information_schema.TABLES
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'tblbodegas');
SET @new_exists = (SELECT COUNT(*) FROM information_schema.TABLES
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'tbletiquetas');
SET @sql = IF(@old_exists = 1 AND @new_exists = 0, 'RENAME TABLE tblbodegas TO tbletiquetas', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- Renombrar PK Id_Bodega → Id_Etiqueta dentro de tbletiquetas si quedó así
SET @pk_old = (SELECT COUNT(*) FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'tbletiquetas' AND COLUMN_NAME = 'Id_Bodega');
SET @pk_new = (SELECT COUNT(*) FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'tbletiquetas' AND COLUMN_NAME = 'Id_Etiqueta');
SET @sql = IF(@pk_old = 1 AND @pk_new = 0,
    'ALTER TABLE tbletiquetas CHANGE COLUMN Id_Bodega Id_Etiqueta INT(11) NOT NULL AUTO_INCREMENT',
    'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @old_col = (SELECT COUNT(*) FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'tblarticulos' AND COLUMN_NAME = 'Id_Bodega');
SET @new_col = (SELECT COUNT(*) FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'tblarticulos' AND COLUMN_NAME = 'Id_Etiqueta');
SET @sql = IF(@old_col = 1 AND @new_col = 0,
    'ALTER TABLE tblarticulos CHANGE COLUMN Id_Bodega Id_Etiqueta INT DEFAULT NULL',
    'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

CREATE TABLE IF NOT EXISTS tbletiquetas (
    Id_Etiqueta     INT AUTO_INCREMENT PRIMARY KEY,
    Nombre          VARCHAR(80) NOT NULL,
    Descripcion     VARCHAR(255) DEFAULT NULL,
    Color           VARCHAR(7) DEFAULT '#7c3aed',
    Activa          TINYINT(1) DEFAULT 1,
    Fecha_Creacion  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uk_nombre (Nombre),
    KEY idx_activa (Activa)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

SET @uk_exists = (SELECT COUNT(*) FROM information_schema.STATISTICS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'tbletiquetas' AND INDEX_NAME = 'uk_nombre');
SET @sql = IF(@uk_exists = 0,
    "ALTER TABLE tbletiquetas ADD UNIQUE KEY uk_nombre (Nombre)",
    'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @col_exists = (SELECT COUNT(*) FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'tblarticulos' AND COLUMN_NAME = 'Id_Etiqueta');
SET @sql = IF(@col_exists = 0,
    "ALTER TABLE tblarticulos ADD COLUMN Id_Etiqueta INT DEFAULT NULL, ADD KEY idx_etiqueta (Id_Etiqueta)",
    'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

INSERT IGNORE INTO tbletiquetas (Nombre, Descripcion, Color) VALUES
    ('Insumos', 'Materias primas e ingredientes para producción', '#d97706'),
    ('Producto Terminado', 'Productos elaborados listos para vender', '#16a34a'),
    ('Reventa', 'Productos que se compran y se venden sin transformación', '#2563eb');

-- ================================================================
-- v4.8 — FacturaCompra_N a VARCHAR (alfanumérico)
-- ================================================================

SET @col_type = (SELECT COLUMN_TYPE FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'tblpedidos' AND COLUMN_NAME = 'FacturaCompra_N');
SET @sql = IF(@col_type LIKE 'int%',
    'ALTER TABLE tblpedidos MODIFY COLUMN FacturaCompra_N VARCHAR(50) DEFAULT NULL',
    'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- ================================================================
-- v4.10 — Id_Caja en tblusuarios (asignación cajero-caja)
-- ================================================================
SET @col_exists = (SELECT COUNT(*) FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'tblusuarios' AND COLUMN_NAME = 'Id_Caja');
SET @sql = IF(@col_exists = 0,
    "ALTER TABLE tblusuarios ADD COLUMN Id_Caja INT DEFAULT NULL, ADD KEY idx_caja (Id_Caja)",
    'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- ================================================================
-- v4.9 — Id_Usuario en tblegresos (para cuadre multi-cajero)
-- ================================================================
SET @col_exists = (SELECT COUNT(*) FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'tblegresos' AND COLUMN_NAME = 'id_usuario');
SET @sql = IF(@col_exists = 0,
    "ALTER TABLE tblegresos ADD COLUMN id_usuario INT DEFAULT NULL, ADD KEY idx_usuario (id_usuario)",
    'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- ================================================================
-- v4.3.72 — Tablas de Facturación Electrónica (esqueleto)
-- Se crean vacías incluso en clientes que NO usan FE. Motivo: varios
-- endpoints (caja/sesion.php, informes) hacen SELECT/SUM sobre
-- electronic_documents y detalle_document_electronic para consolidar
-- totales del día. Sin las tablas, los queries fallan y rompen la UI
-- (ej. caja aparecía "Cerrada" aunque hubiera sesión abierta).
-- Idempotentes — no destruyen datos existentes.
-- ================================================================
CREATE TABLE IF NOT EXISTS electronic_documents (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  origen VARCHAR(20) DEFAULT 'local',
  id_vendedor_remoto INT NULL,
  nombre_vendedor VARCHAR(150) NULL,
  fecha DATE NOT NULL,
  cod_cliente INT NOT NULL DEFAULT 0,
  customer_identification VARCHAR(255) NULL,
  type_document_id BIGINT UNSIGNED NOT NULL DEFAULT 1,
  resolution_id BIGINT UNSIGNED NULL,
  prefix VARCHAR(255) NULL,
  number BIGINT UNSIGNED NOT NULL DEFAULT 0,
  status VARCHAR(255) NOT NULL DEFAULT 'enviado',
  payment_due_days INT NULL,
  descuento DECIMAL(19,4) NOT NULL DEFAULT 0.0000,
  total DECIMAL(15,2) NULL,
  payment_form_id BIGINT UNSIGNED NULL,
  payment_method_id BIGINT UNSIGNED NULL,
  dian_response LONGTEXT NULL,
  cufe VARCHAR(255) NULL,
  invoice_cufe VARCHAR(255) NULL,
  sent_at TIMESTAMP NULL,
  id_usuario INT NOT NULL DEFAULT 0,
  abono DECIMAL(19,4) NOT NULL DEFAULT 0.0000,
  codigoEmp INT NOT NULL DEFAULT 0,
  id_mediopago INT NOT NULL DEFAULT 0,
  efectivo DECIMAL(19,4) NOT NULL DEFAULT 0.0000,
  valorpagado1 DECIMAL(19,4) NOT NULL DEFAULT 0.0000,
  pagada VARCHAR(1) NOT NULL DEFAULT 'N',
  nota TEXT NULL,
  EstadoFact INT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  email_sent TINYINT(1) DEFAULT 0,
  email_sent_at DATETIME NULL,
  email_recipient VARCHAR(500) NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_prefix_number (prefix, number),
  KEY idx_type_document_id (type_document_id),
  KEY idx_resolution_id (resolution_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS detalle_document_electronic (
  id_detalle_document INT NOT NULL AUTO_INCREMENT,
  factura_n INT NULL,
  items INT NULL COMMENT 'Relación con tblarticulos.Items',
  unit_measure_id BIGINT UNSIGNED NULL,
  invoiced_quantity DECIMAL(19,2) NULL,
  line_extension_amount DECIMAL(19,2) NULL,
  free_of_charge_indicator TINYINT(1) DEFAULT 0,
  description VARCHAR(255) NULL,
  type_item_identification_id INT NULL,
  price_amount DECIMAL(19,2) NULL,
  PrecioCosto DECIMAL(19,4) NULL,
  discount_amount DECIMAL(19,2) DEFAULT 0.00,
  base_quantity DECIMAL(19,2) NULL,
  tax_id INT NULL,
  tax_amount DECIMAL(19,2) NULL,
  taxable_amount DECIMAL(19,2) NULL,
  tax_percent DECIMAL(5,2) NULL,
  created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id_detalle_document),
  KEY idx_factura_n (factura_n),
  KEY idx_items (items),
  KEY idx_unit_measure_id (unit_measure_id),
  KEY idx_type_item_identification_id (type_item_identification_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ================================================================
-- v4.11 — PrecioCosto en detalle_document_electronic
-- (para que cierre_mes / estado_resultados calcule bien la utilidad
-- cuando hay FE puras que no duplican tblventas)
-- Solo si la tabla de FE existe (clientes sin módulo FE la omiten).
-- ================================================================
SET @tbl_exists = (SELECT COUNT(*) FROM information_schema.TABLES
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'detalle_document_electronic');
SET @col_exists = IF(@tbl_exists = 0, 1, (SELECT COUNT(*) FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'detalle_document_electronic' AND COLUMN_NAME = 'PrecioCosto'));
SET @sql = IF(@tbl_exists = 1 AND @col_exists = 0,
    'ALTER TABLE detalle_document_electronic ADD COLUMN PrecioCosto DECIMAL(19,4) DEFAULT NULL AFTER price_amount',
    'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- Backfill: prioriza PrecioC histórico de tbldetalle_venta (cuando hay
-- venta POS espejo), o cae al Precio_Costo actual del artículo.
SET @sql = IF(@tbl_exists = 1,
    'UPDATE detalle_document_electronic de LEFT JOIN tbldetalle_venta dv ON dv.Factura_N = de.factura_n AND dv.Items = de.items LEFT JOIN tblarticulos a ON a.Items = de.items SET de.PrecioCosto = COALESCE(dv.PrecioC, a.Precio_Costo, 0) WHERE de.PrecioCosto IS NULL',
    'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- ================================================================
-- v4.12 — id_usuario en tblpagos (cobros de cliente filtrados por cajero)
-- Necesario para el cuadre multi-cajero
-- ================================================================
SET @col_exists = (SELECT COUNT(*) FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'tblpagos' AND COLUMN_NAME = 'id_usuario');
SET @sql = IF(@col_exists = 0,
    "ALTER TABLE tblpagos ADD COLUMN id_usuario INT DEFAULT NULL, ADD KEY idx_usuario (id_usuario)",
    'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- ================================================================
-- v4.13 — Extender ENUM tblmov_caja.Tipo para soportar compras y pagos
-- a proveedores (necesario para que esos movimientos descuenten caja)
-- ================================================================
ALTER TABLE tblmov_caja MODIFY COLUMN Tipo
    ENUM('retiro_parcial','traslado','deposito','gasto','compra','pago_proveedor','cobro_cliente') NOT NULL;

-- ================================================================
-- v4.14 — AUTO_INCREMENT en tblbancos.idBancos
-- (permite crear cuentas bancarias sin especificar ID manual)
-- ================================================================
-- tblbancos.idBancos: PK + AUTO_INCREMENT (BDs legacy sin PK).
SET @has_pk = (SELECT COUNT(*) FROM information_schema.STATISTICS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'tblbancos' AND INDEX_NAME = 'PRIMARY');
SET @sql = IF(@has_pk = 0, "ALTER TABLE tblbancos ADD PRIMARY KEY (idBancos)", 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @is_autoinc_bancos = (SELECT COUNT(*) FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'tblbancos'
      AND COLUMN_NAME = 'idBancos' AND EXTRA LIKE '%auto_increment%');
SET @sql = IF(@is_autoinc_bancos = 0,
    "ALTER TABLE tblbancos MODIFY COLUMN idBancos INT NOT NULL AUTO_INCREMENT",
    'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- ================================================================
-- v5.1 — Módulo Vendedores Móviles
-- ================================================================

CREATE TABLE IF NOT EXISTS tbl_config_vendedores (
    id INT PRIMARY KEY DEFAULT 1,
    habilitado TINYINT(1) DEFAULT 0,
    api_url VARCHAR(300) DEFAULT 'https://conta-basic.innovacion-digital.com/api-conta/public',
    api_email VARCHAR(150) DEFAULT '',
    api_token_empresa VARCHAR(255) DEFAULT '',
    sync_intervalo_pull_min INT DEFAULT 15,
    ultimo_pull_ventas DATETIME NULL,
    ultimo_pull_id INT DEFAULT 0,
    fecha_mod DATETIME DEFAULT NOW()
);
INSERT IGNORE INTO tbl_config_vendedores (id) VALUES (1);

CREATE TABLE IF NOT EXISTS tbl_vendedores_movil (
    id INT AUTO_INCREMENT PRIMARY KEY,
    id_remoto INT NULL,
    codigo VARCHAR(20) NOT NULL,
    nombre VARCHAR(150) NOT NULL,
    email VARCHAR(150) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    telefono VARCHAR(30),
    cedula VARCHAR(30),
    zona VARCHAR(100),
    can_edit_clients TINYINT(1) DEFAULT 1,
    activo TINYINT(1) DEFAULT 1,
    sincronizado TINYINT(1) DEFAULT 0,
    fecha_mod DATETIME DEFAULT NOW(),
    UNIQUE KEY uk_codigo (codigo),
    UNIQUE KEY uk_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS tbl_pedidos_vendedor (
    id INT AUTO_INCREMENT PRIMARY KEY,
    id_remoto INT NOT NULL,
    numero_pedido VARCHAR(30),
    id_cliente_remoto INT,
    nombre_cliente VARCHAR(200),
    nit_cliente VARCHAR(30),
    id_vendedor_remoto INT,
    nombre_vendedor VARCHAR(150),
    fecha DATE,
    subtotal DECIMAL(14,2) DEFAULT 0,
    impuestos DECIMAL(14,2) DEFAULT 0,
    total DECIMAL(14,2) DEFAULT 0,
    forma_pago VARCHAR(30),
    observaciones TEXT,
    estado VARCHAR(30) DEFAULT 'pendiente',
    items_json LONGTEXT,
    convertido_factura_n INT NULL,
    fecha_descarga DATETIME DEFAULT NOW(),
    fecha_mod DATETIME DEFAULT NOW(),
    UNIQUE KEY uk_remoto (id_remoto)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

SET @tbl_exists = (SELECT COUNT(*) FROM information_schema.TABLES
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'electronic_documents');
SET @col_exists = IF(@tbl_exists = 0, 1, (SELECT COUNT(*) FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'electronic_documents' AND COLUMN_NAME = 'origen'));
SET @sql = IF(@tbl_exists = 1 AND @col_exists = 0,
    "ALTER TABLE electronic_documents ADD COLUMN origen VARCHAR(20) DEFAULT 'local' AFTER id, ADD COLUMN id_vendedor_remoto INT NULL AFTER origen, ADD COLUMN nombre_vendedor VARCHAR(150) NULL AFTER id_vendedor_remoto",
    'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- ================================================================
-- v5.3 — Comportamiento de cartera del cliente
-- Tabla aparte (no toca tblclientes) para clasificar puntualidad
-- y castigar carteras incobrables sin perder historial.
-- ================================================================
CREATE TABLE IF NOT EXISTS tbl_clientes_comportamiento (
    id INT AUTO_INCREMENT PRIMARY KEY,
    CodigoClien INT NOT NULL UNIQUE,
    comportamiento ENUM('sin_datos','excelente','puntual','regular','moroso','critico') DEFAULT 'sin_datos',
    dias_mora_promedio INT NULL,
    facturas_evaluadas INT DEFAULT 0,
    comportamiento_calculado_at DATETIME NULL,
    cartera_castigada TINYINT(1) DEFAULT 0,
    fecha_castigo DATETIME NULL,
    motivo_castigo ENUM('cliente_perdido','empresa_cerrada','no_localizable','acuerdo_fallido','otro') NULL,
    motivo_detalle VARCHAR(255) NULL,
    id_usuario_castigo INT NULL,
    nota_cobranza TEXT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    KEY idx_comportamiento (comportamiento),
    KEY idx_castigada (cartera_castigada),
    KEY idx_fecha_castigo (fecha_castigo)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ================================================================
-- v5.4 — Fix vistas de saldos + data fix de pagos legacy
-- Bugs detectados:
--   (a) pagos.php guardaba Fact_N=0 y el numero real en NFactAnt
--       → vw_facturas_cliente_saldos (busca por Fact_N) no detectaba pagos
--   (b) vw_facturas_anteriores_cliente solo buscaba por NFactAnt
--       → ignora pagos legacy que tienen el numero en Fact_N
--
-- Fix v5.4:
--   1. Data-fix retroactivo: mover NFactAnt → Fact_N donde aplique
--   2. Recrear ambas vistas con detección dual (Fact_N OR NFactAnt)
-- ================================================================

-- 1. Data fix: pagos con Fact_N=0 y NFactAnt numérico apuntando a tblventas
UPDATE tblpagos
SET Fact_N = CAST(NFactAnt AS UNSIGNED), NFactAnt = ''
WHERE COALESCE(Fact_N, 0) = 0
  AND NFactAnt IS NOT NULL
  AND NFactAnt <> ''
  AND NFactAnt REGEXP '^[0-9]+$'
  AND CAST(NFactAnt AS UNSIGNED) IN (SELECT Factura_N FROM tblventas);

-- 2a. Recrear vw_facturas_cliente_saldos (módulo nuevo, tblventas)
-- IMPORTANTE: en BDs legacy la columna Tipo tiene encoding latin1 ("Cr_dito"
-- con bytes raros). Usamos Tipo != 'Contado' para ser robustos al encoding.
--
-- v4.3.63 — Descuentos en pagos: `tblpagos.Descuento` es la rebaja que el
-- vendedor otorga junto con el abono (ej. "Te descuento $15.000"). Antes la
-- vista sumaba solo `ValorPago`, dejando el descuento sin restarse del saldo
-- y mostrando saldo fantasma. Ahora se suman ambos: la factura queda en $0
-- cuando (abonos + descuentos) igualan el Total. Caso AMMI Fact 932: Yonis
-- Guerra con Total 160.000, pagos 145.000 + desc 15.000 aparecía con saldo
-- 15.000 en cartera aunque el cache de tblventas ya estaba en 0.
DROP VIEW IF EXISTS vw_facturas_cliente_saldos;
CREATE VIEW vw_facturas_cliente_saldos AS
SELECT
    v.Factura_N, v.CodigoCli, c.Razon_Social AS A_Nombre,
    v.Fecha, v.Dias, v.Fecha + INTERVAL v.Dias DAY AS Fechav,
    v.Total,
    COALESCE(p.TotalPagos, 0) AS TotalPagos,
    GREATEST(v.Total - COALESCE(p.TotalPagos, 0), 0) AS Saldo,
    v.Tipo, v.EstadoFact, v.FechaMod,
    CASE WHEN CURDATE() >= v.Fecha + INTERVAL v.Dias DAY
         THEN TO_DAYS(CURDATE()) - TO_DAYS(v.Fecha + INTERVAL v.Dias DAY)
         ELSE 0 END AS DiasVenc,
    CURDATE() > v.Fecha + INTERVAL v.Dias DAY AS Vencida
FROM tblventas v
JOIN tblclientes c ON c.CodigoClien = v.CodigoCli
LEFT JOIN (
    SELECT
        COALESCE(NULLIF(tp.Fact_N, 0),
                 CASE WHEN tp.NFactAnt REGEXP '^[0-9]+$' THEN CAST(tp.NFactAnt AS UNSIGNED) END) AS Fact_N,
        SUM(tp.ValorPago + COALESCE(tp.Descuento, 0)) AS TotalPagos
    FROM tblpagos tp
    WHERE COALESCE(tp.Estado, 'Valida') = 'Valida'
      AND tp.ValorPago >= 0
      AND COALESCE(tp.Descuento, 0) >= 0  -- defensivo: ignora reversos mal hechos (negativos) que envenenan el SUM
    GROUP BY COALESCE(NULLIF(tp.Fact_N, 0),
             CASE WHEN tp.NFactAnt REGEXP '^[0-9]+$' THEN CAST(tp.NFactAnt AS UNSIGNED) END)
) p ON p.Fact_N = v.Factura_N
WHERE v.Tipo IS NOT NULL AND v.Tipo <> 'Contado' AND v.EstadoFact = 'Valida';

-- 2b. Recrear vw_facturas_anteriores_cliente (módulo VB6 legacy)
SET @t = (SELECT COUNT(*) FROM information_schema.TABLES
          WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'tblfacturasanteriores');

SET @sql = IF(@t = 1, "DROP VIEW IF EXISTS vw_facturas_anteriores_cliente", 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = IF(@t = 1, "
CREATE VIEW vw_facturas_anteriores_cliente AS
SELECT
    fa.CodigoCli, fa.FacturaN, fa.Fecha, fa.Dias,
    fa.Fecha + INTERVAL fa.Dias DAY AS Fechav,
    fa.Valor AS Total,
    COALESCE(p.TotalPagos, 0) AS TotalPagos,
    GREATEST(fa.Valor - COALESCE(p.TotalPagos, 0), 0) AS Saldo,
    CASE WHEN CURDATE() >= fa.Fecha + INTERVAL fa.Dias DAY
         THEN TO_DAYS(CURDATE()) - TO_DAYS(fa.Fecha + INTERVAL fa.Dias DAY)
         ELSE 0 END AS DiasVenc,
    CURDATE() > fa.Fecha + INTERVAL fa.Dias DAY AS Vencida
FROM tblfacturasanteriores fa
LEFT JOIN (
    SELECT tp.Codigo AS CodigoCli,
           COALESCE(NULLIF(tp.NFactAnt, ''), CAST(tp.Fact_N AS CHAR)) AS FacturaN,
           SUM(tp.ValorPago + COALESCE(tp.Descuento, 0)) AS TotalPagos
    FROM tblpagos tp
    WHERE COALESCE(tp.Estado, 'Valida') = 'Valida'
      AND tp.ValorPago >= 0
      AND COALESCE(tp.Descuento, 0) >= 0  -- defensivo: ignora reversos mal hechos (negativos)
      AND ((tp.NFactAnt IS NOT NULL AND tp.NFactAnt <> '') OR tp.Fact_N IS NOT NULL)
    GROUP BY tp.Codigo, COALESCE(NULLIF(tp.NFactAnt, ''), CAST(tp.Fact_N AS CHAR))
) p ON p.CodigoCli = fa.CodigoCli AND p.FacturaN = fa.FacturaN
", 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 2c. Recrear vw_facturas_elec_cliente_saldos (módulo FE — electronic_documents)
-- Solo se crea si existe la tabla electronic_documents (FE habilitada).
SET @t = (SELECT COUNT(*) FROM information_schema.TABLES
          WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'electronic_documents');

SET @sql = IF(@t = 1, "DROP VIEW IF EXISTS vw_facturas_elec_cliente_saldos", 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = IF(@t = 1, "
CREATE VIEW vw_facturas_elec_cliente_saldos AS
SELECT
    v.id AS DocID,
    CONCAT(v.prefix, v.number) AS Factura_N,
    v.cod_cliente AS CodigoCli,
    c.Razon_Social AS A_Nombre,
    v.fecha AS Fecha,
    v.payment_due_days AS Dias,
    v.fecha + INTERVAL v.payment_due_days DAY AS Fechav,
    v.total AS Total,
    COALESCE(p.TotalPagos, 0) AS TotalPagos,
    GREATEST(v.total - COALESCE(p.TotalPagos, 0), 0) AS Saldo,
    v.payment_form_id AS Tipo,
    v.EstadoFact AS EstadoFact,
    v.updated_at AS updated_at,
    CASE WHEN CURDATE() >= v.fecha + INTERVAL v.payment_due_days DAY
         THEN TO_DAYS(CURDATE()) - TO_DAYS(v.fecha + INTERVAL v.payment_due_days DAY)
         ELSE 0 END AS DiasVenc,
    CURDATE() > v.fecha + INTERVAL v.payment_due_days DAY AS Vencida
FROM electronic_documents v
JOIN tblclientes c ON c.CodigoClien = v.cod_cliente
LEFT JOIN (
    SELECT tp.Codigo AS CodigoCli,
           CAST(NULLIF(tp.Nfact_electronica, '') AS UNSIGNED) AS DocID,
           SUM(tp.ValorPago + COALESCE(tp.Descuento, 0)) AS TotalPagos
    FROM tblpagos tp
    WHERE tp.Estado = 'Valida'
      AND tp.ValorPago >= 0
      AND COALESCE(tp.Descuento, 0) >= 0  -- defensivo: ignora reversos mal hechos (negativos)
      AND tp.Nfact_electronica IS NOT NULL
    GROUP BY tp.Codigo, CAST(NULLIF(tp.Nfact_electronica, '') AS UNSIGNED)
) p ON p.CodigoCli = v.cod_cliente AND p.DocID = v.id
WHERE v.payment_form_id = 2 AND v.status = 'autorizado' AND v.type_document_id = 1
", 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- ================================================================
-- v5.5 — Comportamiento + castigo en tblclientes (refactor)
-- Antes vivía en tbl_clientes_comportamiento, ahora directo en
-- tblclientes para simplificar: 1 fetch, sin merge, filtro SQL nativo.
-- La tabla vieja se conserva como histórico.
-- ================================================================
SET @col = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='tblclientes' AND COLUMN_NAME='comportamiento');
SET @sql = IF(@col=0, "ALTER TABLE tblclientes ADD COLUMN comportamiento ENUM('sin_datos','excelente','puntual','regular','moroso','critico') DEFAULT 'sin_datos'", 'SELECT 1');
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;

SET @col = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='tblclientes' AND COLUMN_NAME='dias_mora_promedio');
SET @sql = IF(@col=0, "ALTER TABLE tblclientes ADD COLUMN dias_mora_promedio INT NULL", 'SELECT 1');
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;

SET @col = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='tblclientes' AND COLUMN_NAME='cartera_castigada');
SET @sql = IF(@col=0, "ALTER TABLE tblclientes ADD COLUMN cartera_castigada TINYINT(1) DEFAULT 0", 'SELECT 1');
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;

SET @col = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='tblclientes' AND COLUMN_NAME='fecha_castigo');
SET @sql = IF(@col=0, "ALTER TABLE tblclientes ADD COLUMN fecha_castigo DATETIME NULL", 'SELECT 1');
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;

SET @col = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='tblclientes' AND COLUMN_NAME='motivo_castigo');
SET @sql = IF(@col=0, "ALTER TABLE tblclientes ADD COLUMN motivo_castigo ENUM('cliente_perdido','empresa_cerrada','no_localizable','acuerdo_fallido','otro') NULL", 'SELECT 1');
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;

SET @col = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='tblclientes' AND COLUMN_NAME='motivo_detalle');
SET @sql = IF(@col=0, "ALTER TABLE tblclientes ADD COLUMN motivo_detalle VARCHAR(255) NULL", 'SELECT 1');
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;

SET @col = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='tblclientes' AND COLUMN_NAME='id_usuario_castigo');
SET @sql = IF(@col=0, "ALTER TABLE tblclientes ADD COLUMN id_usuario_castigo INT NULL", 'SELECT 1');
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;

SET @col = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='tblclientes' AND COLUMN_NAME='nota_cobranza');
SET @sql = IF(@col=0, "ALTER TABLE tblclientes ADD COLUMN nota_cobranza TEXT NULL", 'SELECT 1');
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;

-- Migrar datos desde tbl_clientes_comportamiento si existe (idempotente)
SET @t = (SELECT COUNT(*) FROM information_schema.TABLES WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='tbl_clientes_comportamiento');
SET @sql = IF(@t=1, "
UPDATE tblclientes c
INNER JOIN tbl_clientes_comportamiento cc ON cc.CodigoClien = c.CodigoClien
SET
  c.comportamiento = COALESCE(cc.comportamiento, c.comportamiento),
  c.dias_mora_promedio = COALESCE(cc.dias_mora_promedio, c.dias_mora_promedio),
  c.cartera_castigada = COALESCE(cc.cartera_castigada, c.cartera_castigada),
  c.fecha_castigo = COALESCE(cc.fecha_castigo, c.fecha_castigo),
  c.motivo_castigo = COALESCE(cc.motivo_castigo, c.motivo_castigo),
  c.motivo_detalle = COALESCE(cc.motivo_detalle, c.motivo_detalle),
  c.id_usuario_castigo = COALESCE(cc.id_usuario_castigo, c.id_usuario_castigo),
  c.nota_cobranza = COALESCE(cc.nota_cobranza, c.nota_cobranza)
", 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @idx = (SELECT COUNT(*) FROM information_schema.STATISTICS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='tblclientes' AND INDEX_NAME='idx_cartera_castigada');
SET @sql = IF(@idx=0, "ALTER TABLE tblclientes ADD INDEX idx_cartera_castigada (cartera_castigada)", 'SELECT 1');
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;

-- ================================================================
-- v5.6 — Vistas de proveedores (saldos, aging, facturas anteriores,
--        pedidos crédito). Antes solo se creaban en algunas BDs;
--        ahora se versionan en el SQL consolidado.
--
-- Nota técnica: la expresión `Fecha + INTERVAL Dias DAY` se mantiene
-- en el SELECT pero NO en el GROUP BY (es funcionalmente dependiente
-- de Fecha y Dias). Esto evita un bug del dumper MariaDB→MySQL
-- (XAMPP) que serializa `INTERVAL n DAY` como `INTERVAL n AS \`day\``
-- y rompe la importación en el destino.
-- ================================================================

-- email_recipient: lista de correos a los que se envió la FE (separados por coma).
-- Necesario para que el envío múltiple guarde el detalle completo.
-- Solo aplica si la tabla existe — clientes sin facturación electrónica no la tienen.
SET @tb = (SELECT COUNT(*) FROM information_schema.TABLES WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='electronic_documents');
SET @col = IF(@tb=1,
    (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='electronic_documents' AND COLUMN_NAME='email_recipient'),
    1);
SET @sql = IF(@tb=1 AND @col=0, "ALTER TABLE electronic_documents ADD COLUMN email_recipient VARCHAR(500) NULL", 'SELECT 1');
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;

-- Defaults para columnas NOT NULL de electronic_documents.
-- Sin estos defaults, INSERTs desde enviar.php fallan con
-- "Field 'X' doesn't have a default value" en BDs creadas con esquema
-- viejo de Conta FT (caso INVERSIONES EBENEZER, 4.3.56).
SET @tb = (SELECT COUNT(*) FROM information_schema.TABLES WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='electronic_documents');
SET @sql = IF(@tb=1, "
  ALTER TABLE electronic_documents
    MODIFY descuento DECIMAL(19,4) NOT NULL DEFAULT 0.0000,
    MODIFY abono DECIMAL(19,4) NOT NULL DEFAULT 0.0000,
    MODIFY efectivo DECIMAL(19,4) NOT NULL DEFAULT 0.0000,
    MODIFY valorpagado1 DECIMAL(19,4) NOT NULL DEFAULT 0.0000,
    MODIFY codigoEmp INT(11) NOT NULL DEFAULT 0,
    MODIFY id_mediopago INT(11) NOT NULL DEFAULT 0
", 'SELECT 1');
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;

-- detalle_document_electronic.id_detalle_document debe ser AUTO_INCREMENT.
-- BDs viejas la tienen como PK normal sin auto-incremento → INSERT desde
-- enviar.php (que no envía id) falla. Solo aplica si la tabla existe.
SET @tb = (SELECT COUNT(*) FROM information_schema.TABLES WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='detalle_document_electronic');
SET @is_ai = IFNULL((SELECT IF(EXTRA LIKE '%auto_increment%', 1, 0) FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='detalle_document_electronic' AND COLUMN_NAME='id_detalle_document'), 0);
-- Bumpear filas con id=0 antes del ALTER (si existen) para no romper la PK
SET @sql = IF(@tb=1 AND @is_ai=0, "
  UPDATE detalle_document_electronic
  SET id_detalle_document = (SELECT next_id FROM (SELECT IFNULL(MAX(id_detalle_document),0)+1 AS next_id FROM detalle_document_electronic WHERE id_detalle_document > 0) t)
  WHERE id_detalle_document = 0
", 'SELECT 1');
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;
-- Asegurar PRIMARY KEY antes de auto_increment (BDs legacy la tienen sin PK)
SET @has_pk = IF(@tb=1,
    (SELECT COUNT(*) FROM information_schema.STATISTICS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'detalle_document_electronic' AND INDEX_NAME = 'PRIMARY'),
    1);
SET @sql = IF(@tb=1 AND @is_ai=0 AND @has_pk=0,
    "ALTER TABLE detalle_document_electronic ADD PRIMARY KEY (id_detalle_document)",
    'SELECT 1');
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;
SET @sql = IF(@tb=1 AND @is_ai=0,
  "ALTER TABLE detalle_document_electronic MODIFY id_detalle_document INT(11) NOT NULL AUTO_INCREMENT",
  'SELECT 1');
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;

DROP VIEW IF EXISTS vw_prov_facturas_anteriores_saldos;
CREATE VIEW vw_prov_facturas_anteriores_saldos AS
SELECT
  f.FacturaN                                              AS FacturaN,
  f.CodigoProv                                            AS CodigoPro,
  p.RazonSocial                                           AS RazonSocial,
  f.Fecha                                                 AS Fecha,
  f.Dias                                                  AS Dias,
  f.Fecha + INTERVAL f.Dias DAY                           AS Fechav,
  SUM(f.Valor)                                            AS Total,
  COALESCE(pag.TotalPagos, 0)                             AS TotalPagos,
  GREATEST(SUM(f.Valor) - COALESCE(pag.TotalPagos, 0), 0) AS Saldo
FROM tblfacturasanterioresproveedor f
INNER JOIN tblproveedores p ON p.CodigoPro = f.CodigoProv
LEFT JOIN (
  SELECT t.CodigoPro, t.NFacturaAnt, SUM(t.Valor) AS TotalPagos
  FROM tblegresos t
  WHERE t.Estado = 'Valida' AND t.NFacturaAnt IS NOT NULL
  GROUP BY t.CodigoPro, t.NFacturaAnt
) pag ON pag.CodigoPro = f.CodigoProv
       AND pag.NFacturaAnt = f.FacturaN
GROUP BY f.FacturaN, f.CodigoProv, p.RazonSocial, f.Fecha, f.Dias;

-- Vista de pedidos crédito con saldo REAL calculado desde tblegresos.
-- Reemplaza la lectura del cache `tblpedidos.Saldo` que suele estar
-- desincronizado en BDs legacy (misma lógica que usa el software VB6).
DROP VIEW IF EXISTS vw_prov_pedidos_credito_saldos;
CREATE VIEW vw_prov_pedidos_credito_saldos AS
SELECT
  b.FacturaCompra_N                 AS FacturaN,
  b.CodigoPro                       AS CodigoPro,
  p.RazonSocial                     AS RazonSocial,
  b.Fecha                           AS Fecha,
  b.Dias                            AS Dias,
  b.Fecha + INTERVAL b.Dias DAY     AS Fechav,
  b.Total                           AS Total,
  COALESCE(pag.TotalPagos, 0)       AS TotalPagos,
  GREATEST(b.Total - COALESCE(pag.TotalPagos, 0), 0) AS Saldo,
  b.TipoPedido,
  b.EstadoPedido,
  b.Pedido_N
FROM tblpedidos b
INNER JOIN tblproveedores p ON p.CodigoPro = b.CodigoPro
LEFT JOIN (
  SELECT CodigoPro, CAST(FactN AS UNSIGNED) AS FactN_cast, SUM(Valor) AS TotalPagos
  FROM tblegresos
  WHERE Estado = 'Valida' AND FactN IS NOT NULL
  GROUP BY CodigoPro, CAST(FactN AS UNSIGNED)
) pag ON pag.CodigoPro = b.CodigoPro
       AND pag.FactN_cast = b.Pedido_N
WHERE b.TipoPedido <> 'Contado'
  AND b.EstadoPedido = 'Recibido';

-- Aging unificado: facturas anteriores + pedidos crédito, solo con Saldo>0
DROP VIEW IF EXISTS vw_prov_cxp_aging;
CREATE VIEW vw_prov_cxp_aging AS
SELECT
  x.CodigoPro, x.RazonSocial, x.FacturaN, x.Fecha, x.Dias, x.Fechav,
  x.Total, x.TotalPagos, x.Saldo,
  CASE WHEN CURDATE() >= x.Fechav THEN DATEDIFF(CURDATE(), x.Fechav) ELSE 0 END AS DiasVenc,
  (CURDATE() > x.Fechav) AS Vencida,
  x.Origen
FROM (
  SELECT FacturaN, CodigoPro, RazonSocial, Fecha, Dias, Fechav, Total, TotalPagos, Saldo,
         'FacturasAnteriores' AS Origen
  FROM vw_prov_facturas_anteriores_saldos WHERE Saldo > 0
  UNION ALL
  SELECT FacturaN, CodigoPro, RazonSocial, Fecha, Dias, Fechav, Total, TotalPagos, Saldo,
         'PedidosCredito' AS Origen
  FROM vw_prov_pedidos_credito_saldos WHERE Saldo > 0
) x;

-- Saldo actual por proveedor (agregado)
DROP VIEW IF EXISTS vw_proveedores_saldo_actual;
CREATE VIEW vw_proveedores_saldo_actual AS
SELECT
  CodigoPro, RazonSocial,
  SUM(CASE WHEN Origen = 'FacturasAnteriores' THEN Saldo ELSE 0 END) AS SaldoAnterior,
  SUM(CASE WHEN Origen = 'PedidosCredito'     THEN Saldo ELSE 0 END) AS SaldoPedidos,
  SUM(Saldo) AS SaldoActual
FROM vw_prov_cxp_aging
GROUP BY CodigoPro, RazonSocial;

-- ================================================================
-- v4.3.63 — Backfill electronic_documents: payment_form_id,
-- payment_method_id, payment_due_days
--
-- Estos 3 campos quedaban en NULL en versiones anteriores porque el
-- INSERT del enviar.php no los persistía, aunque se calculaban para el
-- JSON hacia DIAN. Sin esto:
--   - El listado no puede mostrar Contado/Crédito.
--   - La consulta de eventos DIAN (aplica solo a créditos) no se activa.
--   - No hay forma de saber el plazo de pago desde la factura local.
--
-- Backfill idempotente: solo actualiza filas donde el campo está NULL,
-- vinculando por CUFE con tblventas (que sí tiene Tipo, Dias, id_mediopago).
-- ================================================================
-- Solo aplica en BDs con FE habilitada. Clientes sin FE no tienen
-- `electronic_documents` — se salta con IF sobre @tb.
SET @tb = (SELECT COUNT(*) FROM information_schema.TABLES WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='electronic_documents');

SET @sql = IF(@tb=1,
  "UPDATE electronic_documents e JOIN tblventas v ON v.cufe = e.cufe
   SET e.payment_form_id = CASE WHEN v.Tipo = 'Contado' THEN 1 ELSE 2 END
   WHERE e.payment_form_id IS NULL AND e.type_document_id = 1 AND e.cufe <> ''",
  'SELECT 1');
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;

SET @sql = IF(@tb=1,
  "UPDATE electronic_documents e JOIN tblventas v ON v.cufe = e.cufe
   SET e.payment_due_days = COALESCE(v.Dias, 0)
   WHERE e.payment_due_days IS NULL AND e.type_document_id = 1 AND e.cufe <> ''
     AND e.payment_form_id = 2",
  'SELECT 1');
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;

SET @sql = IF(@tb=1,
  "UPDATE electronic_documents e JOIN tblventas v ON v.cufe = e.cufe
   SET e.payment_method_id = CASE
       WHEN v.id_mediopago = 1  THEN 14
       WHEN v.id_mediopago >= 2 THEN 30
       ELSE                          10
   END
   WHERE e.payment_method_id IS NULL AND e.type_document_id = 1 AND e.cufe <> ''",
  'SELECT 1');
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;

-- ================================================================
-- v4.3.63 — Cotizaciones: AUTO_INCREMENT en PK (fix bug 1364)
-- En BDs viejas tblcotizaciones.id_cotizacion y detalle_cotizacion.
-- id_detalle_cotiza están como NOT NULL sin AUTO_INCREMENT, lo que
-- impide hacer INSERT desde el módulo de cotizaciones.
-- Aplicamos AUTO_INCREMENT idempotentemente — solo si no lo tienen ya.
-- ================================================================
-- tblcotizaciones: asegurar PK antes de AUTO_INCREMENT (BDs legacy sin PK)
SET @has_pk = (SELECT COUNT(*) FROM information_schema.STATISTICS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'tblcotizaciones' AND INDEX_NAME = 'PRIMARY');
SET @sql = IF(@has_pk = 0, "ALTER TABLE tblcotizaciones ADD PRIMARY KEY (id_cotizacion)", 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @is_autoinc = (SELECT COUNT(*) FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'tblcotizaciones'
      AND COLUMN_NAME = 'id_cotizacion' AND EXTRA LIKE '%auto_increment%');
SET @sql = IF(@is_autoinc = 0,
    'ALTER TABLE tblcotizaciones MODIFY id_cotizacion INT(11) NOT NULL AUTO_INCREMENT',
    'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- detalle_cotizacion: mismo patrón
SET @has_pk = (SELECT COUNT(*) FROM information_schema.STATISTICS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'detalle_cotizacion' AND INDEX_NAME = 'PRIMARY');
SET @sql = IF(@has_pk = 0, "ALTER TABLE detalle_cotizacion ADD PRIMARY KEY (id_detalle_cotiza)", 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @is_autoinc = (SELECT COUNT(*) FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'detalle_cotizacion'
      AND COLUMN_NAME = 'id_detalle_cotiza' AND EXTRA LIKE '%auto_increment%');
SET @sql = IF(@is_autoinc = 0,
    'ALTER TABLE detalle_cotizacion MODIFY id_detalle_cotiza INT(11) NOT NULL AUTO_INCREMENT',
    'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- NOTA — El módulo Vendedores Móviles aún está EN PRUEBAS y su SQL NO se
-- distribuye en este archivo a clientes en producción. Las migraciones
-- necesarias para activar ese módulo (columnas GPS en tblclientes y
-- migration Lumen) están en `modulo_vendedores_movil.sql` aparte, y solo
-- se aplican cuando un cliente específico contrata la opción.

-- ================================================================
-- v4.3.63 — Facturas Recibidas + Eventos DIAN de acuse
--
-- El cliente RECIBE facturas electrónicas de sus proveedores (por
-- correo, en ZIP). Debe emitir eventos DIAN sobre ellas dentro de
-- 3 días hábiles (030 acuse) para cumplir norma. Este módulo maneja:
--   - Persistir la FE recibida (cabecera + líneas)
--   - Historial de eventos aplicados (030/031/032/033/034)
--   - Vincular con tblcompras cuando se registra la compra contable
--
-- Reglas DIAN implementadas:
--   - Idempotencia por CUFE — UNIQUE key en facturas_recibidas
--   - No reenviar el mismo evento aprobado — UNIQUE compuesto
-- ================================================================
CREATE TABLE IF NOT EXISTS facturas_recibidas (
    id                       INT AUTO_INCREMENT PRIMARY KEY,
    cufe                     VARCHAR(200) NOT NULL,
    tipo_documento           VARCHAR(20)  NOT NULL DEFAULT 'invoice',    -- invoice / credit-note / debit-note
    document_type_code       VARCHAR(4)   DEFAULT '01',                  -- 01=FE, 91=NC, 92=ND
    numero                   VARCHAR(50)  NULL,
    prefijo                  VARCHAR(10)  NULL,
    fecha_emision            DATE         NULL,
    fecha_recepcion          DATETIME     DEFAULT CURRENT_TIMESTAMP,
    emisor_nit               VARCHAR(30)  NULL,
    emisor_dv                VARCHAR(2)   NULL,
    emisor_nombre            VARCHAR(200) NULL,
    emisor_organization_type VARCHAR(2)   DEFAULT '1',                    -- 1=Jurídica, 2=Natural
    receptor_nit             VARCHAR(30)  NULL,
    receptor_nombre          VARCHAR(200) NULL,
    subtotal                 DECIMAL(15,2) DEFAULT 0,
    total_iva                DECIMAL(15,2) DEFAULT 0,
    total                    DECIMAL(15,2) DEFAULT 0,
    moneda                   VARCHAR(3)   DEFAULT 'COP',
    archivo_original_nombre  VARCHAR(255) NULL,
    xml_filename             VARCHAR(255) NULL,
    xml_path                 VARCHAR(500) NULL,
    compra_id                INT          NULL,                            -- FK a tblcompras (opcional)
    created_at               TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uq_cufe (cufe),
    KEY idx_fecha_emision (fecha_emision),
    KEY idx_compra (compra_id),
    KEY idx_emisor (emisor_nit)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE IF NOT EXISTS detalle_factura_recibida (
    id                   INT AUTO_INCREMENT PRIMARY KEY,
    factura_recibida_id  INT NOT NULL,
    linea_num            INT DEFAULT 1,
    codigo               VARCHAR(60)  NULL,
    descripcion          VARCHAR(500) NULL,
    unidad_medida        VARCHAR(20)  NULL,
    cantidad             DECIMAL(15,3) DEFAULT 1,
    precio_unitario      DECIMAL(15,2) DEFAULT 0,
    descuento            DECIMAL(15,2) DEFAULT 0,
    iva_pct              DECIMAL(5,2)  DEFAULT 0,
    iva_monto            DECIMAL(15,2) DEFAULT 0,
    subtotal             DECIMAL(15,2) DEFAULT 0,
    total_linea          DECIMAL(15,2) DEFAULT 0,
    KEY idx_factura (factura_recibida_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE IF NOT EXISTS eventos_factura_recibida (
    id                    INT AUTO_INCREMENT PRIMARY KEY,
    factura_recibida_id   INT NOT NULL,
    event_code            VARCHAR(4) NOT NULL,        -- 030 / 031 / 032 / 033 / 034
    event_label           VARCHAR(120) NULL,
    cude_evento           VARCHAR(200) NULL,          -- CUDE devuelto por la API
    event_id_remoto       INT NULL,                   -- ID en electronic_document_events (API Lumen)
    dian_status           VARCHAR(10) NULL,           -- '00' = aceptado
    dian_message          TEXT NULL,
    rejection_code        VARCHAR(10)  NULL,          -- solo 031
    rejection_description VARCHAR(500) NULL,          -- solo 031
    note                  TEXT NULL,                  -- solo 034 (declaración jurada)
    api_response          LONGTEXT NULL,              -- JSON completo de la API (debug)
    estado                ENUM('pendiente','aprobado','rechazado') DEFAULT 'pendiente',
    enviado_at            DATETIME NULL,
    usuario_id            INT NULL,
    created_at            TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    -- Marker generado: solo tiene valor cuando el evento fue APROBADO. En
    -- combinación con el UNIQUE de abajo, esto permite:
    --   * UN solo evento aprobado por (factura, code)  → previene duplicar
    --     aprobados que ya son título valor en DIAN.
    --   * VARIOS pendientes/rechazados por (factura, code)  → permite
    --     reintentar sin chocar con intentos anteriores fallidos.
    -- MySQL trata múltiples NULL como distintos en un UNIQUE.
    aprobado_marker       VARCHAR(4) GENERATED ALWAYS AS
        (CASE WHEN estado = 'aprobado' THEN event_code ELSE NULL END) STORED,
    KEY idx_factura (factura_recibida_id),
    KEY idx_estado (estado),
    UNIQUE KEY uq_solo_aprobado (factura_recibida_id, aprobado_marker)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- Fix retroactivo: BDs que ya tienen la tabla con el UNIQUE viejo
-- `uq_evento_aprobado (factura_recibida_id, event_code, estado)` deben
-- migrar al nuevo UNIQUE parcial. Idempotente.
SET @has_bad_uq = (SELECT COUNT(*) FROM information_schema.STATISTICS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME  = 'eventos_factura_recibida'
      AND INDEX_NAME  = 'uq_evento_aprobado');
SET @sql = IF(@has_bad_uq > 0,
    'ALTER TABLE eventos_factura_recibida DROP INDEX uq_evento_aprobado',
    'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @has_marker = (SELECT COUNT(*) FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME  = 'eventos_factura_recibida'
      AND COLUMN_NAME = 'aprobado_marker');
SET @sql = IF(@has_marker = 0,
    "ALTER TABLE eventos_factura_recibida ADD COLUMN aprobado_marker VARCHAR(4) GENERATED ALWAYS AS (CASE WHEN estado = 'aprobado' THEN event_code ELSE NULL END) STORED",
    'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @has_new_uq = (SELECT COUNT(*) FROM information_schema.STATISTICS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME  = 'eventos_factura_recibida'
      AND INDEX_NAME  = 'uq_solo_aprobado');
SET @sql = IF(@has_new_uq = 0,
    'ALTER TABLE eventos_factura_recibida ADD UNIQUE KEY uq_solo_aprobado (factura_recibida_id, aprobado_marker)',
    'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- FK opcional a tblcompras si aún no existe la relación (idempotente).
-- No la creamos como constraint dura porque compra_id puede ser NULL hasta
-- que el usuario decide convertir la FE recibida en compra contable.

-- ================================================================
-- v4.3.64 — DescripcionTemp de tbldetalle_venta a VARCHAR(500)
-- Conceptos largos (servicios profesionales de FE) rompían con el
-- VARCHAR(100) original: "SQLSTATE[22001] Data too long".
-- Idempotente: MODIFY es seguro correrlo N veces.
-- ================================================================
ALTER TABLE tbldetalle_venta MODIFY COLUMN DescripcionTemp VARCHAR(500) NULL;

-- ================================================================
-- v4.3.64 — id_mediopago en tblegresos
-- Los pagos de compras al contado ahora registran el medio de pago
-- (Efectivo/Tarjeta/Bancolombia/Nequi) igual que ventas. Los códigos
-- coinciden con tblmedios_pago (0=Efectivo, 1=Tarjeta, 2=Bancolombia, 3=Nequi).
-- Solo el medio_pago = 0 (efectivo) descuenta de tblcajas.
-- ================================================================
SET @col_exists = (SELECT COUNT(*) FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'tblegresos' AND COLUMN_NAME = 'id_mediopago');
SET @sql = IF(@col_exists = 0,
    "ALTER TABLE tblegresos ADD COLUMN id_mediopago INT NOT NULL DEFAULT 0, ADD KEY idx_egr_medio (id_mediopago)",
    'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- ================================================================
-- v4.3.70 — Módulo de Financiaciones (opcional, activado por empresa)
--
-- Sistema simple de crédito con cuotas para negocios como venta de motos:
-- - Registrar financiación de una venta con cronograma de cuotas
-- - Cuotas de valor variable, fechas editables
-- - Registrar pagos parciales o totales; el pago va a tblpagos también
--
-- El módulo NO se muestra por default. Se activa por empresa vía
-- tbldatosempresa.modulo_financiaciones = 1. Todo el resto del sistema
-- ignora las tablas nuevas si el módulo no está activo.
-- ================================================================

-- Flag en tbldatosempresa
SET @col_exists = (SELECT COUNT(*) FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'tbldatosempresa'
      AND COLUMN_NAME = 'modulo_financiaciones');
SET @sql = IF(@col_exists = 0,
    "ALTER TABLE tbldatosempresa ADD COLUMN modulo_financiaciones TINYINT(1) NOT NULL DEFAULT 0",
    'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- Contrato de financiación (1 fila por venta financiada)
CREATE TABLE IF NOT EXISTS tblfinanciaciones (
    Id_Financiacion INT AUTO_INCREMENT PRIMARY KEY,
    Consecutivo     VARCHAR(20) NULL COMMENT 'Ej. F-001 o consecutivo por resolución',
    Fecha           DATE NOT NULL,
    Codigo          INT NOT NULL COMMENT 'CodigoClien del cliente',
    Descripcion     VARCHAR(300) NULL COMMENT 'Ej. Moto Hero NKD 125 Placa XXX',
    MontoTotal      DECIMAL(15,2) NOT NULL DEFAULT 0,
    CuotaInicial    DECIMAL(15,2) NOT NULL DEFAULT 0,
    MontoFinanciado DECIMAL(15,2) NOT NULL DEFAULT 0,
    NumCuotas       INT NOT NULL DEFAULT 1,
    FrecuenciaDias  INT NOT NULL DEFAULT 30,
    FechaPrimeraCuota DATE NULL,
    Factura_N       INT NULL COMMENT 'Vínculo opcional con tblventas.Factura_N',
    Id_Usuario      INT NULL COMMENT 'Vendedor',
    Estado          VARCHAR(15) NOT NULL DEFAULT 'Activa' COMMENT 'Activa | Pagada | Anulada',
    Comentario      TEXT NULL,
    FechaCreacion   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FechaMod        TIMESTAMP NULL ON UPDATE CURRENT_TIMESTAMP,
    KEY idx_cliente (Codigo),
    KEY idx_estado (Estado),
    KEY idx_fecha (Fecha)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Cuotas del cronograma (N filas por contrato)
CREATE TABLE IF NOT EXISTS tblfinanciacion_cuotas (
    Id_Cuota        INT AUTO_INCREMENT PRIMARY KEY,
    Id_Financiacion INT NOT NULL,
    NumCuota        INT NOT NULL,
    FechaVencimiento DATE NOT NULL,
    ValorCuota      DECIMAL(15,2) NOT NULL DEFAULT 0,
    ValorPagado     DECIMAL(15,2) NOT NULL DEFAULT 0,
    Saldo           DECIMAL(15,2) NOT NULL DEFAULT 0 COMMENT 'ValorCuota - ValorPagado',
    Estado          VARCHAR(15) NOT NULL DEFAULT 'Pendiente' COMMENT 'Pendiente | Parcial | Pagada',
    FechaUltimoPago DATE NULL,
    KEY idx_financ (Id_Financiacion),
    KEY idx_vencimiento (FechaVencimiento),
    KEY idx_estado (Estado)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Vínculo pago ↔ cuota (permite pagos parciales y múltiples pagos por cuota)
CREATE TABLE IF NOT EXISTS tblfinanciacion_pagos (
    Id_FinancPago   INT AUTO_INCREMENT PRIMARY KEY,
    Id_Cuota        INT NOT NULL,
    Id_Financiacion INT NOT NULL,
    Id_Pagos        INT NULL COMMENT 'FK opcional a tblpagos para trazabilidad contable',
    Fecha           DATE NOT NULL,
    Valor           DECIMAL(15,2) NOT NULL,
    id_mediopago    INT NOT NULL DEFAULT 0 COMMENT '0=Efectivo 1=Tarjeta 2=Bancolombia 3=Nequi',
    Id_Usuario      INT NULL,
    Estado          VARCHAR(10) NOT NULL DEFAULT 'Valida' COMMENT 'Valida | Anulada',
    FechaCreacion   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    KEY idx_cuota (Id_Cuota),
    KEY idx_financ (Id_Financiacion),
    KEY idx_fecha (Fecha)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Tasa de interés de mora (% mensual sobre valor de cuota vencida).
-- Se calcula on-the-fly: interes = valor_cuota × (tasa/100) × (dias_mora/30)
-- El valor 0 significa "no cobrar mora" y es el default para no impactar
-- clientes que no manejan intereses.
SET @col_exists = (SELECT COUNT(*) FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'tbldatosempresa'
      AND COLUMN_NAME = 'tasa_mora_mensual');
SET @sql = IF(@col_exists = 0,
    "ALTER TABLE tbldatosempresa ADD COLUMN tasa_mora_mensual DECIMAL(5,2) NOT NULL DEFAULT 0 COMMENT '% mensual sobre cuota vencida'",
    'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- Marca el pago de una cuota como "interés de mora" (concepto separado)
-- para que no reduzca el saldo del capital.
SET @col_exists = (SELECT COUNT(*) FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'tblfinanciacion_pagos'
      AND COLUMN_NAME = 'EsInteresMora');
SET @sql = IF(@col_exists = 0,
    "ALTER TABLE tblfinanciacion_pagos ADD COLUMN EsInteresMora TINYINT(1) NOT NULL DEFAULT 0 COMMENT '1=pago de interes de mora, 0=abono a capital'",
    'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- v4.3.71 — Credenciales de correo FE en tbldatosempresa (para clientes sin FE)
-- api/empresa/datos.php hace UPDATE incluyendo estas columnas sin verificar.
-- En clientes sin módulo FE no existen y rompen "Guardar datos de la empresa".
SET @col = (SELECT COUNT(*) FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'tbldatosempresa' AND COLUMN_NAME = 'email_factelect');
SET @sql = IF(@col = 0,
    "ALTER TABLE tbldatosempresa ADD COLUMN email_factelect VARCHAR(150) NULL",
    'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @col = (SELECT COUNT(*) FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'tbldatosempresa' AND COLUMN_NAME = 'password_factelect');
SET @sql = IF(@col = 0,
    "ALTER TABLE tbldatosempresa ADD COLUMN password_factelect VARCHAR(255) NULL",
    'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- v4.3.71 — Flags de FE en tblventas para compatibilidad con clientes sin FE
-- El SELECT del listado de ventas lee siempre `enviada_dian` y `cufe`; en BDs
-- viejas (o clientes sin módulo FE) no existen y rompen la consulta.
-- Se crean con default 0/NULL para no cambiar el comportamiento.
SET @col = (SELECT COUNT(*) FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'tblventas' AND COLUMN_NAME = 'enviada_dian');
SET @sql = IF(@col = 0,
    "ALTER TABLE tblventas ADD COLUMN enviada_dian TINYINT(1) NOT NULL DEFAULT 0",
    'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @col = (SELECT COUNT(*) FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'tblventas' AND COLUMN_NAME = 'cufe');
SET @sql = IF(@col = 0,
    "ALTER TABLE tblventas ADD COLUMN cufe VARCHAR(255) DEFAULT NULL",
    'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- v4.3.71 — Anulación de Notas de Artículo (soft-delete, respeta kardex inmutable)
-- Ya no se hace DELETE al eliminar: se marca Estado='Anulada' y se compensa
-- el kardex con un asiento REVERSO. Así queda la huella de la nota original.
SET @col_exists = (SELECT COUNT(*) FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'tblnotas_articulo'
      AND COLUMN_NAME = 'Estado');
SET @sql = IF(@col_exists = 0,
    "ALTER TABLE tblnotas_articulo
        ADD COLUMN Estado VARCHAR(10) NOT NULL DEFAULT 'Valida' COMMENT 'Valida | Anulada',
        ADD COLUMN Anulada_Por INT NULL COMMENT 'Id_Usuario que anuló',
        ADD COLUMN Fecha_Anulacion DATETIME NULL,
        ADD COLUMN Motivo_Anulacion VARCHAR(200) NULL",
    'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

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
