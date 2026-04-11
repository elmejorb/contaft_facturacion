-- ============================================================
-- MIGRACIÓN Conta FT 4.1
-- Ejecutar sobre la base de datos del cliente
-- Fecha: 2026-04-10
-- ============================================================

-- ============================================================
-- 1. CORREGIR tblkardex: AUTO_INCREMENT
-- ============================================================
DELETE FROM tblkardex WHERE Id_kardex = 0;
ALTER TABLE tblkardex MODIFY Id_kardex INT(11) NOT NULL AUTO_INCREMENT;

-- ============================================================
-- 2. TABLAS NUEVAS: Conteo de Inventario
-- ============================================================
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

-- ============================================================
-- 3. TABLAS NUEVAS: Sistema de Cajas
-- ============================================================
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

-- Insertar cajas por defecto si no existen
INSERT INTO tblcajas (Nombre, Tipo, Activa)
SELECT 'Caja 1', 'punto_venta', 1
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM tblcajas WHERE Nombre = 'Caja 1');

INSERT INTO tblcajas (Nombre, Tipo, Activa)
SELECT 'Caja Principal', 'principal', 1
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM tblcajas WHERE Tipo = 'principal');

-- ============================================================
-- 4. TABLAS NUEVAS: Categorías de Gastos
-- ============================================================
CREATE TABLE IF NOT EXISTS tblcategorias_gasto (
    Id_Categoria INT AUTO_INCREMENT PRIMARY KEY,
    Nombre VARCHAR(50) NOT NULL,
    Activa TINYINT(1) DEFAULT 1
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Insertar categorías por defecto
INSERT INTO tblcategorias_gasto (Nombre)
SELECT t.Nombre FROM (
    SELECT 'Servicios Públicos' AS Nombre UNION ALL
    SELECT 'Arriendo' UNION ALL SELECT 'Nómina' UNION ALL
    SELECT 'Transporte' UNION ALL SELECT 'Mantenimiento' UNION ALL
    SELECT 'Papelería' UNION ALL SELECT 'Alimentación' UNION ALL
    SELECT 'Aseo' UNION ALL SELECT 'Impuestos' UNION ALL SELECT 'Otros'
) t WHERE NOT EXISTS (SELECT 1 FROM tblcategorias_gasto LIMIT 1);

-- Agregar columna categoria_gasto a tblegresos si no existe
SET @col_exists = (SELECT COUNT(*) FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'tblegresos' AND COLUMN_NAME = 'categoria_gasto');
SET @sql = IF(@col_exists = 0,
    "ALTER TABLE tblegresos ADD COLUMN categoria_gasto VARCHAR(50) DEFAULT 'Otros'",
    'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- ============================================================
-- 5. TABLAS NUEVAS: Bancos (movimientos)
-- ============================================================
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

-- Agregar columnas a tblbancos si no existen
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

-- ============================================================
-- 6. COLUMNAS NUEVAS: Detalle de compras
-- ============================================================
SET @col_exists = (SELECT COUNT(*) FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'tbldetalle_pedido' AND COLUMN_NAME = 'IvaPct');
SET @sql = IF(@col_exists = 0, "ALTER TABLE tbldetalle_pedido ADD COLUMN IvaPct FLOAT DEFAULT 0, ADD COLUMN CostoSinIva DECIMAL(19,4) DEFAULT 0, ADD COLUMN CostoConIva DECIMAL(19,4) DEFAULT 0, ADD COLUMN FleteUnit DECIMAL(19,4) DEFAULT 0, ADD COLUMN CostoFinal DECIMAL(19,4) DEFAULT 0, ADD COLUMN CostoAnterior DECIMAL(19,4) DEFAULT 0, ADD COLUMN CostoPromedio DECIMAL(19,4) DEFAULT 0", 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- ============================================================
-- 7. VISTAS MySQL: Diagnóstico e Inventario
-- ============================================================
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

-- ============================================================
-- 8. HABILITAR pdo_mysql (recordatorio manual)
-- ============================================================
-- En C:\WebServer\PHP\php.ini descomentar:
-- extension=pdo_mysql

-- ============================================================
-- 9. VERIFICACIÓN
-- ============================================================
SELECT 'Migración completada' AS mensaje;
SELECT
    (SELECT COUNT(*) FROM tblconteo_inventario) AS conteos,
    (SELECT COUNT(*) FROM tblcajas) AS cajas,
    (SELECT COUNT(*) FROM tblcategorias_gasto) AS categorias_gasto,
    (SELECT COUNT(*) FROM vw_diagnostico_inventario_30d) AS diagnostico_30d,
    (SELECT COUNT(*) FROM vw_auditoria_inventario_90d) AS auditoria_90d;
