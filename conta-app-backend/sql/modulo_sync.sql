-- ============================================================
-- Módulo Sincronización online — SQL idempotente
-- ============================================================
-- Patrón Outbox: cuando se guarda una entidad (venta, cliente, pago, etc.),
-- un trigger local inserta un marcador en `tbl_sync_outbox`. El SincroWorker
-- del Electron main process lee la cola cada N segundos, hace POST al SaaS
-- y marca enviado=1. Si falla, aumenta el contador de retries con backoff.
--
-- Ventajas sobre triggers HTTP directos:
--   * Si cae internet, la cola queda en MySQL. No se pierde nada.
--   * Si cierran el app en medio del envío, al reabrir sigue procesando.
--   * Los triggers solo INSERT local (nunca fallan).
--
-- NO destruye nada. Idempotente — se puede correr varias veces.
-- ============================================================

CREATE TABLE IF NOT EXISTS tbl_sync_outbox (
  Id_Outbox       BIGINT NOT NULL AUTO_INCREMENT,
  Entidad         VARCHAR(30) NOT NULL,   -- 'venta' | 'cliente' | 'pago' | 'compra' | 'gasto'
  Id_Entidad      VARCHAR(50) NOT NULL,   -- PK de la entidad (ej. Factura_N, CodigoClien)
  Operacion       VARCHAR(10) NOT NULL DEFAULT 'upsert',  -- upsert | delete | anular
  Payload         TEXT NULL,              -- opcional: snapshot JSON del momento (si no, el worker lo arma al enviar)
  Enviado         TINYINT(1) NOT NULL DEFAULT 0,
  Intentos        INT NOT NULL DEFAULT 0,
  Ultimo_Error    VARCHAR(500) NULL,
  Fecha_Creacion  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  Fecha_Envio     DATETIME NULL,
  Prox_Reintento  DATETIME NULL,          -- NULL = reintento inmediato; set por backoff
  PRIMARY KEY (Id_Outbox),
  KEY idx_pending (Enviado, Prox_Reintento),
  KEY idx_entidad (Entidad, Id_Entidad)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE IF NOT EXISTS tbl_sync_estado (
  Id              INT NOT NULL DEFAULT 1,
  Last_Sync_At    DATETIME NULL,          -- última vez que el worker consumió exitoso
  Last_Error_At   DATETIME NULL,
  Last_Error      VARCHAR(500) NULL,
  Pendientes_Cnt  INT NOT NULL DEFAULT 0, -- cache, el worker lo actualiza
  PRIMARY KEY (Id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

INSERT IGNORE INTO tbl_sync_estado (Id) VALUES (1);

-- ============================================================
-- Triggers de encolado
-- ============================================================
-- Simples: solo INSERT en outbox. No bloquean la operación principal.
-- Si un trigger falla, no es crítico — el worker tiene reconciliación.
--
-- DELIMITER no funciona con "mysql < archivo.sql" en Windows, usamos
-- DROP + CREATE sin DELIMITER (los triggers son 1 línea).

-- Ventas (tblventas) ----------------------------------------
DROP TRIGGER IF EXISTS trg_sync_venta_insert;
CREATE TRIGGER trg_sync_venta_insert AFTER INSERT ON tblventas
FOR EACH ROW INSERT INTO tbl_sync_outbox (Entidad, Id_Entidad, Operacion)
  VALUES ('venta', NEW.Factura_N, 'upsert');

DROP TRIGGER IF EXISTS trg_sync_venta_update;
CREATE TRIGGER trg_sync_venta_update AFTER UPDATE ON tblventas
FOR EACH ROW INSERT INTO tbl_sync_outbox (Entidad, Id_Entidad, Operacion)
  VALUES ('venta', NEW.Factura_N, IF(NEW.EstadoFact='Anulada', 'anular', 'upsert'));

-- Clientes (tblclientes) ------------------------------------
DROP TRIGGER IF EXISTS trg_sync_cliente_insert;
CREATE TRIGGER trg_sync_cliente_insert AFTER INSERT ON tblclientes
FOR EACH ROW INSERT INTO tbl_sync_outbox (Entidad, Id_Entidad, Operacion)
  VALUES ('cliente', NEW.CodigoClien, 'upsert');

DROP TRIGGER IF EXISTS trg_sync_cliente_update;
CREATE TRIGGER trg_sync_cliente_update AFTER UPDATE ON tblclientes
FOR EACH ROW INSERT INTO tbl_sync_outbox (Entidad, Id_Entidad, Operacion)
  VALUES ('cliente', NEW.CodigoClien, 'upsert');

-- Proveedores (tblproveedores) ------------------------------
DROP TRIGGER IF EXISTS trg_sync_proveedor_insert;
CREATE TRIGGER trg_sync_proveedor_insert AFTER INSERT ON tblproveedores
FOR EACH ROW INSERT INTO tbl_sync_outbox (Entidad, Id_Entidad, Operacion)
  VALUES ('proveedor', NEW.CodigoPro, 'upsert');

DROP TRIGGER IF EXISTS trg_sync_proveedor_update;
CREATE TRIGGER trg_sync_proveedor_update AFTER UPDATE ON tblproveedores
FOR EACH ROW INSERT INTO tbl_sync_outbox (Entidad, Id_Entidad, Operacion)
  VALUES ('proveedor', NEW.CodigoPro, 'upsert');

-- Pagos de clientes (tblpagos) ------------------------------
DROP TRIGGER IF EXISTS trg_sync_pago_insert;
CREATE TRIGGER trg_sync_pago_insert AFTER INSERT ON tblpagos
FOR EACH ROW INSERT INTO tbl_sync_outbox (Entidad, Id_Entidad, Operacion)
  VALUES ('pago', NEW.Id_Pagos, 'upsert');

DROP TRIGGER IF EXISTS trg_sync_pago_update;
CREATE TRIGGER trg_sync_pago_update AFTER UPDATE ON tblpagos
FOR EACH ROW INSERT INTO tbl_sync_outbox (Entidad, Id_Entidad, Operacion)
  VALUES ('pago', NEW.Id_Pagos, IF(NEW.Estado='Anulada', 'anular', 'upsert'));

-- Compras (tblpedidos) --------------------------------------
DROP TRIGGER IF EXISTS trg_sync_compra_insert;
CREATE TRIGGER trg_sync_compra_insert AFTER INSERT ON tblpedidos
FOR EACH ROW INSERT INTO tbl_sync_outbox (Entidad, Id_Entidad, Operacion)
  VALUES ('compra', NEW.Pedido_N, 'upsert');

DROP TRIGGER IF EXISTS trg_sync_compra_update;
CREATE TRIGGER trg_sync_compra_update AFTER UPDATE ON tblpedidos
FOR EACH ROW INSERT INTO tbl_sync_outbox (Entidad, Id_Entidad, Operacion)
  VALUES ('compra', NEW.Pedido_N, 'upsert');

-- Gastos / Egresos (tblegresos) -----------------------------
DROP TRIGGER IF EXISTS trg_sync_gasto_insert;
CREATE TRIGGER trg_sync_gasto_insert AFTER INSERT ON tblegresos
FOR EACH ROW INSERT INTO tbl_sync_outbox (Entidad, Id_Entidad, Operacion)
  VALUES ('gasto', NEW.Id_Egresos, 'upsert');

DROP TRIGGER IF EXISTS trg_sync_gasto_update;
CREATE TRIGGER trg_sync_gasto_update AFTER UPDATE ON tblegresos
FOR EACH ROW INSERT INTO tbl_sync_outbox (Entidad, Id_Entidad, Operacion)
  VALUES ('gasto', NEW.Id_Egresos, IF(NEW.Estado='Anulada', 'anular', 'upsert'));

-- Productos / Inventario (tblarticulos) ---------------------
DROP TRIGGER IF EXISTS trg_sync_articulo_insert;
CREATE TRIGGER trg_sync_articulo_insert AFTER INSERT ON tblarticulos
FOR EACH ROW INSERT INTO tbl_sync_outbox (Entidad, Id_Entidad, Operacion)
  VALUES ('articulo', NEW.Items, 'upsert');

DROP TRIGGER IF EXISTS trg_sync_articulo_update;
CREATE TRIGGER trg_sync_articulo_update AFTER UPDATE ON tblarticulos
FOR EACH ROW INSERT INTO tbl_sync_outbox (Entidad, Id_Entidad, Operacion)
  VALUES ('articulo', NEW.Items, 'upsert');
