-- ============================================================
-- Migración v4.5 — Lotes (vencimientos) + Notas de Artículo
-- ============================================================

-- 1. Notas de Artículo (entradas/salidas de inventario por concepto: Daño, Cambio, Vencimiento, Otro)
CREATE TABLE IF NOT EXISTS tblnotas_articulo (
    Id_Nota         INT AUTO_INCREMENT PRIMARY KEY,
    Fecha           TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    Items           INT NOT NULL,
    Tipo            ENUM('Entrada','Salida') NOT NULL,
    Concepto        VARCHAR(30) NOT NULL,                 -- Daño, Cambio, Vencimiento, Otro
    Descripcion     VARCHAR(500) DEFAULT NULL,
    Cantidad        DECIMAL(12,4) NOT NULL,
    Valor_Unitario  DECIMAL(19,4) DEFAULT 0,
    Id_Usuario      INT DEFAULT 0,
    Id_Lote         INT DEFAULT NULL,                     -- vínculo opcional a un lote específico
    KEY idx_items (Items),
    KEY idx_fecha (Fecha),
    KEY idx_concepto (Concepto)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 2. Lotes / Fechas de vencimiento por producto
CREATE TABLE IF NOT EXISTS tblproductos_lotes (
    Id_Lote           INT AUTO_INCREMENT PRIMARY KEY,
    Items             INT NOT NULL,
    Numero_Lote       VARCHAR(50) DEFAULT NULL,            -- opcional, código del fabricante
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

-- 3. Flag en productos: solo perecederos requieren lote
SET @col_exists = (SELECT COUNT(*) FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'tblarticulos' AND COLUMN_NAME = 'requiere_lote');
SET @sql = IF(@col_exists = 0,
    "ALTER TABLE tblarticulos ADD COLUMN requiere_lote TINYINT(1) DEFAULT 0",
    'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 4. Vista: lotes próximos a vencer (próximos 90 días + ya vencidos con stock)
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

SELECT 'Migración v4.5 (Lotes y Notas de Artículo) completada' AS m;
