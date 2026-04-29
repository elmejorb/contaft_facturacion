-- ============================================================
-- Migración v4.7 — Etiquetas (clasificación de productos)
-- NO maneja stock por etiqueta; es solo una categoría/etiqueta para
-- separar productos (Insumos, Producto Terminado, Reventa, etc.)
-- ============================================================

-- Compatibilidad: si alguna versión previa creó tblbodegas, renombrarla
SET @old_exists = (SELECT COUNT(*) FROM information_schema.TABLES
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'tblbodegas');
SET @new_exists = (SELECT COUNT(*) FROM information_schema.TABLES
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'tbletiquetas');
SET @sql = IF(@old_exists = 1 AND @new_exists = 0, 'RENAME TABLE tblbodegas TO tbletiquetas', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- Compatibilidad: renombrar PK Id_Bodega → Id_Etiqueta dentro de tbletiquetas si quedó así
SET @pk_old = (SELECT COUNT(*) FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'tbletiquetas' AND COLUMN_NAME = 'Id_Bodega');
SET @pk_new = (SELECT COUNT(*) FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'tbletiquetas' AND COLUMN_NAME = 'Id_Etiqueta');
SET @sql = IF(@pk_old = 1 AND @pk_new = 0,
    'ALTER TABLE tbletiquetas CHANGE COLUMN Id_Bodega Id_Etiqueta INT(11) NOT NULL AUTO_INCREMENT',
    'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- Compatibilidad: renombrar columna Id_Bodega → Id_Etiqueta si aplica
SET @old_col = (SELECT COUNT(*) FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'tblarticulos' AND COLUMN_NAME = 'Id_Bodega');
SET @new_col = (SELECT COUNT(*) FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'tblarticulos' AND COLUMN_NAME = 'Id_Etiqueta');
SET @sql = IF(@old_col = 1 AND @new_col = 0,
    'ALTER TABLE tblarticulos CHANGE COLUMN Id_Bodega Id_Etiqueta INT DEFAULT NULL',
    'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- Crear tabla tbletiquetas si no existe
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

-- Columna Id_Etiqueta en tblarticulos (si no existe)
SET @col_exists = (SELECT COUNT(*) FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'tblarticulos' AND COLUMN_NAME = 'Id_Etiqueta');
SET @sql = IF(@col_exists = 0,
    "ALTER TABLE tblarticulos ADD COLUMN Id_Etiqueta INT DEFAULT NULL, ADD KEY idx_etiqueta (Id_Etiqueta)",
    'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- Seed: 3 etiquetas comunes para arrancar
INSERT IGNORE INTO tbletiquetas (Nombre, Descripcion, Color) VALUES
    ('Insumos', 'Materias primas e ingredientes para producción', '#d97706'),
    ('Producto Terminado', 'Productos elaborados listos para vender', '#16a34a'),
    ('Reventa', 'Productos que se compran y se venden sin transformación', '#2563eb');

SELECT 'Migración v4.7 (Etiquetas) completada' AS m;
