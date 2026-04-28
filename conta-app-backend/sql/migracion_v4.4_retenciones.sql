-- ============================================================
-- Migración v4.4 — Retenciones (Fase 1: local + gross-up)
-- ============================================================

-- 1. Tipos de retención configurables globalmente (% cambia por reforma tributaria)
CREATE TABLE IF NOT EXISTS tblretenciones (
    Id_Retencion    INT AUTO_INCREMENT PRIMARY KEY,
    Codigo          VARCHAR(20) NOT NULL,           -- 'RETEFUENTE_SERV_DECL', 'RETEICA', 'RETEIVA'
    Nombre          VARCHAR(120) NOT NULL,
    Porcentaje      DECIMAL(7,4) NOT NULL DEFAULT 0,-- 4.0000, 0.9660, 15.0000
    Codigo_Dian     VARCHAR(5) DEFAULT NULL,        -- '05', '06', '07' (para fase 2 XML)
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

-- 2. Qué retenciones aplica cada cliente (multi-select)
CREATE TABLE IF NOT EXISTS tblcliente_retenciones (
    Id              INT AUTO_INCREMENT PRIMARY KEY,
    CodigoClien     INT NOT NULL,
    Id_Retencion    INT NOT NULL,
    UNIQUE KEY uk_cli_ret (CodigoClien, Id_Retencion),
    KEY idx_cliente (CodigoClien),
    CONSTRAINT fk_cliret_ret FOREIGN KEY (Id_Retencion) REFERENCES tblretenciones (Id_Retencion) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 3. Modo de retención por cliente (informativo / gross_up)
SET @col_exists = (SELECT COUNT(*) FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'tblclientes' AND COLUMN_NAME = 'retencion_modo');
SET @sql = IF(@col_exists = 0,
    "ALTER TABLE tblclientes ADD COLUMN retencion_modo ENUM('informativo','gross_up') DEFAULT 'gross_up'",
    'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 4. Retenciones aplicadas a cada factura (snapshot: nombre y % al momento de emitir)
CREATE TABLE IF NOT EXISTS tblventa_retenciones (
    Id              INT AUTO_INCREMENT PRIMARY KEY,
    Factura_N       INT NOT NULL,
    Id_Retencion    INT DEFAULT NULL,               -- puede ser NULL si la retención fue eliminada
    Codigo          VARCHAR(20),
    Nombre          VARCHAR(120),
    Porcentaje      DECIMAL(7,4),
    Base            DECIMAL(19,4),                  -- sobre qué se aplicó
    Valor           DECIMAL(19,4),                  -- valor retenido
    Modo            ENUM('informativo','gross_up') DEFAULT 'informativo',
    Fecha           TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    KEY idx_factura (Factura_N),
    KEY idx_retencion (Id_Retencion)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 5. Seed: retenciones típicas en Colombia (ajustables en UI luego)
INSERT IGNORE INTO tblretenciones (Codigo, Nombre, Porcentaje, Codigo_Dian, Activa) VALUES
    ('RETEFUENTE_SERV_DECL',   'ReteFuente servicios (declarante)',     4.0000, '06', 1),
    ('RETEFUENTE_SERV_NODECL', 'ReteFuente servicios (no declarante)',  6.0000, '06', 0),
    ('RETEFUENTE_COMPRAS',     'ReteFuente compras generales',          2.5000, '06', 0),
    ('RETEICA_PLANETARICA',    'ReteICA Planeta Rica servicios',        0.9660, '07', 0),
    ('RETEIVA',                'ReteIVA (15% del IVA)',                 15.0000,'05', 0);

SELECT 'Migración v4.4 Retenciones completada' AS m;
SELECT COUNT(*) AS retenciones_seed FROM tblretenciones;
