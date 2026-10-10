-- ============================================================
-- Módulo Nómina — SQL idempotente (en pruebas)
-- ============================================================
-- Mientras el módulo esté en pruebas vive en este archivo separado.
-- Al estabilizarse se copia a actualizacion_completa.sql.
--
-- Contiene:
--   tbl_empleados        — datos del empleado
--   tbl_mov_empleado     — auxiliar/kardex del empleado (anticipos, préstamos, abonos, cargos)
--   tbl_nomina           — liquidaciones de periodo
--   tbl_nomina_detalle   — desglose de deducciones aplicadas en cada liquidación
--
-- Convención de signo en tbl_mov_empleado:
--   Valor + = empleado DEBE a la empresa (anticipo, préstamo, cargo)
--   Valor - = empleado paga/cancela (desc_nomina, abono directo)
--   Saldo_Acum = saldo del empleado DESPUÉS del movimiento (lo que debe a la empresa).
-- ============================================================

-- ---------- tbl_empleados ----------
CREATE TABLE IF NOT EXISTS tbl_empleados (
  Id_Empleado     INT(11) NOT NULL AUTO_INCREMENT,
  Nombre          VARCHAR(100) NOT NULL,
  Identificacion  VARCHAR(30) DEFAULT NULL,
  Cargo           VARCHAR(80) DEFAULT NULL,
  Salario         DECIMAL(19,4) NOT NULL DEFAULT 0,
  Tipo_Pago       VARCHAR(15) NOT NULL DEFAULT 'quincenal', -- semanal | quincenal | mensual
  Fecha_Ingreso   DATE DEFAULT NULL,
  Telefono        VARCHAR(30) DEFAULT NULL,
  Direccion       VARCHAR(120) DEFAULT NULL,
  Email           VARCHAR(80) DEFAULT NULL,
  Observacion     TEXT DEFAULT NULL,
  Estado          VARCHAR(15) NOT NULL DEFAULT 'activo', -- activo | retirado
  Fecha_Retiro    DATE DEFAULT NULL,
  Created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  Updated_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (Id_Empleado),
  KEY idx_estado (Estado),
  KEY idx_identificacion (Identificacion)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- ---------- tbl_mov_empleado ----------
-- El libro auxiliar del empleado. Cada fila es un movimiento que afecta
-- su cuenta corriente. Saldo_Acum se guarda precalculado por rendimiento
-- (mismo patrón que tblkardex de artículos).
CREATE TABLE IF NOT EXISTS tbl_mov_empleado (
  Id_Mov          INT(11) NOT NULL AUTO_INCREMENT,
  Id_Empleado     INT(11) NOT NULL,
  Fecha           DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  Tipo            VARCHAR(20) NOT NULL, -- anticipo | prestamo | cargo | abono | desc_nomina
  Valor           DECIMAL(19,4) NOT NULL, -- positivo = +deuda al empleado; negativo = cancela deuda
  Saldo_Acum      DECIMAL(19,4) NOT NULL DEFAULT 0, -- saldo del empleado después de este mov
  Cuota_Mensual   DECIMAL(19,4) DEFAULT 0, -- solo prestamos: valor a descontar en cada periodo
  Observacion     VARCHAR(200) DEFAULT NULL,
  Vinculado_Tipo  VARCHAR(20) DEFAULT NULL, -- egreso | nomina | prestamo
  Vinculado_Id    INT(11) DEFAULT NULL,
  Id_Egreso       INT(11) DEFAULT NULL, -- si generó egreso en tblegresos
  Id_Nomina       INT(11) DEFAULT NULL, -- si fue descuento de nómina, referencia a tbl_nomina
  Id_Mov_Origen   INT(11) DEFAULT NULL, -- si es desc_nomina/abono: apunta al mov de anticipo/prestamo que paga
  Id_Usuario      INT(11) DEFAULT NULL,
  Estado          VARCHAR(15) NOT NULL DEFAULT 'activo', -- activo | anulado
  Created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (Id_Mov),
  KEY idx_empleado_fecha (Id_Empleado, Fecha),
  KEY idx_tipo (Tipo),
  KEY idx_estado (Estado),
  KEY idx_mov_origen (Id_Mov_Origen),
  CONSTRAINT fk_mov_empleado FOREIGN KEY (Id_Empleado) REFERENCES tbl_empleados(Id_Empleado) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- ---------- tbl_nomina ----------
-- Liquidación de un periodo específico. Un empleado puede tener varias
-- liquidaciones (una por periodo). NO duplica la info del kardex: solo
-- guarda el snapshot del periodo (devengado, deducido, neto).
CREATE TABLE IF NOT EXISTS tbl_nomina (
  Id_Nomina         INT(11) NOT NULL AUTO_INCREMENT,
  Id_Empleado       INT(11) NOT NULL,
  Periodo_Inicio    DATE NOT NULL,
  Periodo_Fin       DATE NOT NULL,
  Tipo_Periodo      VARCHAR(15) NOT NULL DEFAULT 'quincenal',
  Salario_Base      DECIMAL(19,4) NOT NULL DEFAULT 0,
  Horas_Extras      DECIMAL(19,4) NOT NULL DEFAULT 0,
  Bonificaciones    DECIMAL(19,4) NOT NULL DEFAULT 0,
  Otros_Ingresos    DECIMAL(19,4) NOT NULL DEFAULT 0,
  Total_Devengado   DECIMAL(19,4) NOT NULL DEFAULT 0,
  Total_Deducciones DECIMAL(19,4) NOT NULL DEFAULT 0,
  Neto              DECIMAL(19,4) NOT NULL DEFAULT 0,
  Origen_Pago       VARCHAR(20) NOT NULL DEFAULT 'caja_general', -- caja_general | banco
  Id_Banco          INT(11) DEFAULT NULL,
  Id_Egreso         INT(11) DEFAULT NULL, -- referencia al egreso generado en tblegresos
  Fecha_Pago        DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  Observacion       TEXT DEFAULT NULL,
  Id_Usuario        INT(11) DEFAULT NULL,
  Estado            VARCHAR(15) NOT NULL DEFAULT 'pagada', -- pagada | anulada
  Created_at        DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (Id_Nomina),
  KEY idx_empleado_periodo (Id_Empleado, Periodo_Inicio, Periodo_Fin),
  KEY idx_estado (Estado),
  KEY idx_fecha_pago (Fecha_Pago),
  CONSTRAINT fk_nomina_empleado FOREIGN KEY (Id_Empleado) REFERENCES tbl_empleados(Id_Empleado) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- ---------- tbl_nomina_detalle ----------
-- Desglose de deducciones aplicadas en cada liquidación. Permite imprimir
-- el desprendible con "Anticipo del 8/10 -$10.000, Cuota préstamo -$50.000".
CREATE TABLE IF NOT EXISTS tbl_nomina_detalle (
  Id_Detalle      INT(11) NOT NULL AUTO_INCREMENT,
  Id_Nomina       INT(11) NOT NULL,
  Tipo            VARCHAR(20) NOT NULL, -- anticipo | cuota_prestamo | cargo | otros
  Id_Mov_Origen   INT(11) DEFAULT NULL, -- el mov del kardex que generó la deuda
  Concepto        VARCHAR(200) NOT NULL,
  Valor_Deducido  DECIMAL(19,4) NOT NULL,
  PRIMARY KEY (Id_Detalle),
  KEY idx_nomina (Id_Nomina),
  CONSTRAINT fk_nomdet_nomina FOREIGN KEY (Id_Nomina) REFERENCES tbl_nomina(Id_Nomina) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- ---------- Extensiones a tblegresos ----------
-- Para marcar egresos vinculados a empleado (anticipos, préstamos, pagos de nómina).
-- Si las columnas ya existen (idempotente) MySQL ignora los ADD con error silencioso
-- via el patrón de INFORMATION_SCHEMA.
SET @col_exists := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
                    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'tblegresos'
                      AND COLUMN_NAME = 'vinculado_a');
SET @sql := IF(@col_exists = 0,
  'ALTER TABLE tblegresos ADD COLUMN vinculado_a VARCHAR(20) DEFAULT NULL AFTER Estado',
  'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @col_exists := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
                    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'tblegresos'
                      AND COLUMN_NAME = 'id_vinculo');
SET @sql := IF(@col_exists = 0,
  'ALTER TABLE tblegresos ADD COLUMN id_vinculo INT(11) DEFAULT NULL AFTER vinculado_a',
  'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @idx_exists := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS
                    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'tblegresos'
                      AND INDEX_NAME = 'idx_vinculado');
SET @sql := IF(@idx_exists = 0,
  'ALTER TABLE tblegresos ADD INDEX idx_vinculado (vinculado_a, id_vinculo)',
  'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
