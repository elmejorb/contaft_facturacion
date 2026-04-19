-- ============================================================
-- Migración v4.2 — Familias de Productos + Distribución + Stock mínimo
-- ============================================================

-- 1. Familias de productos (agrupa SKUs que son distintas unidades del mismo producto)
CREATE TABLE IF NOT EXISTS tblfamilias_producto (
    Id_Familia    INT AUTO_INCREMENT PRIMARY KEY,
    Nombre        VARCHAR(100) NOT NULL,
    Descripcion   VARCHAR(255) DEFAULT NULL,
    Activa        TINYINT(1) DEFAULT 1,
    Fecha_Creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    KEY idx_activa (Activa)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 2. Items de la familia: qué producto pertenece, con qué factor respecto a la unidad base
CREATE TABLE IF NOT EXISTS tblfamilia_items (
    Id_Familia_Item INT AUTO_INCREMENT PRIMARY KEY,
    Id_Familia      INT NOT NULL,
    Items           INT NOT NULL,
    Factor          DECIMAL(12,4) NOT NULL DEFAULT 1, -- cuántas unidades base contiene este SKU (1=base)
    Es_Base         TINYINT(1) DEFAULT 0,
    UNIQUE KEY uk_items (Items),        -- un producto solo puede estar en una familia
    KEY idx_familia (Id_Familia),
    CONSTRAINT fk_fi_familia FOREIGN KEY (Id_Familia) REFERENCES tblfamilias_producto (Id_Familia) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 3. Movimientos de distribución (fraccionamiento de unidad mayor → menor)
CREATE TABLE IF NOT EXISTS tblmovimientos_distribucion (
    Id_Mov          INT AUTO_INCREMENT PRIMARY KEY,
    Fecha           DATETIME DEFAULT CURRENT_TIMESTAMP,
    Id_Usuario      INT DEFAULT 0,
    Items_Origen    INT NOT NULL,
    Items_Destino   INT NOT NULL,
    Cant_Origen     DECIMAL(12,4) NOT NULL,      -- unidades de origen consumidas (ej. 2 bultos)
    Cant_Destino    DECIMAL(12,4) NOT NULL,      -- unidades de destino generadas (ej. 100 kilos)
    Factor_Origen   DECIMAL(12,4) NOT NULL,
    Factor_Destino  DECIMAL(12,4) NOT NULL,
    Motivo          ENUM('automatico','manual') DEFAULT 'automatico',
    Factura_N       INT DEFAULT NULL,            -- factura asociada si motivo=automatico
    Comentario      VARCHAR(255) DEFAULT NULL,
    KEY idx_fecha (Fecha),
    KEY idx_factura (Factura_N),
    KEY idx_origen (Items_Origen),
    KEY idx_destino (Items_Destino)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 4. Vista: productos bajo stock mínimo (usa Existencia_minima ya existente en tblarticulos)
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

-- 6. Verificación
SELECT 'Migración v4.2 Familias completada' AS mensaje;
SELECT
    (SELECT COUNT(*) FROM tblfamilias_producto)      AS familias,
    (SELECT COUNT(*) FROM tblfamilia_items)          AS items_en_familias,
    (SELECT COUNT(*) FROM tblmovimientos_distribucion) AS distribuciones;
