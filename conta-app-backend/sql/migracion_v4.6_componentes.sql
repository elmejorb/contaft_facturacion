-- ============================================================
-- Migración v4.6 — Productos compuestos / Recetas
-- Un producto padre se descompone en N componentes con cantidad cada uno.
-- Al venderse el padre, se descuentan los componentes (no el padre).
-- ============================================================

-- 1. Componentes de cada producto (BOM / receta)
CREATE TABLE IF NOT EXISTS tblproducto_componentes (
    Id_Componente     INT AUTO_INCREMENT PRIMARY KEY,
    Items_Padre       INT NOT NULL,                       -- producto compuesto (ej. PIZZA HAWAIANA)
    Items_Componente  INT NOT NULL,                       -- ingrediente (ej. QUESO MOZARELLA)
    Cantidad          DECIMAL(12,4) NOT NULL DEFAULT 1,   -- cuánto del componente por 1 unidad del padre
    Comentario        VARCHAR(150) DEFAULT NULL,          -- "200g picado", "al gusto", etc.
    Fecha_Creacion    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uk_padre_componente (Items_Padre, Items_Componente),
    KEY idx_padre (Items_Padre),
    KEY idx_componente (Items_Componente)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 2. Flag en tblarticulos para identificar productos compuestos rápido
SET @col_exists = (SELECT COUNT(*) FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'tblarticulos' AND COLUMN_NAME = 'tiene_componentes');
SET @sql = IF(@col_exists = 0,
    "ALTER TABLE tblarticulos ADD COLUMN tiene_componentes TINYINT(1) DEFAULT 0",
    'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 3. Vista útil: receta detallada con datos de cada componente
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

-- 4. Vista: cuántas unidades del producto compuesto se pueden "armar" con el stock actual
DROP VIEW IF EXISTS vw_capacidad_compuestos;
CREATE VIEW vw_capacidad_compuestos AS
SELECT
    c.Items_Padre,
    p.Codigo AS Codigo,
    p.Nombres_Articulo AS Producto,
    MIN(CASE WHEN c.Cantidad > 0 THEN FLOOR(h.Existencia / c.Cantidad) ELSE 0 END) AS Unidades_Posibles,
    SUM(c.Cantidad * h.Precio_Costo) AS Costo_Total_Receta,
    p.Precio_Venta,
    COUNT(*) AS Num_Componentes
FROM tblproducto_componentes c
INNER JOIN tblarticulos p ON c.Items_Padre = p.Items
INNER JOIN tblarticulos h ON c.Items_Componente = h.Items
GROUP BY c.Items_Padre, p.Codigo, p.Nombres_Articulo, p.Precio_Venta;

SELECT 'Migración v4.6 (Productos compuestos) completada' AS m;
