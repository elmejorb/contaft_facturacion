-- ============================================================
-- SYNC 02 · APLICAR triggers de sincronización con utilidad
-- ============================================================
-- Idempotente y seguro:
--   1. Crea tbl_cambios_sincronizar si no existe.
--   2. Elimina cualquier trigger viejo relacionado (si había).
--   3. Crea los 6 triggers correctos con DEFINER=CURRENT_USER
--      para que funcionen sin importar el usuario del servidor
--      (evita el bug histórico de "root@localhost doesn't exist").
--   4. Limpia registros basura 'venta_utilidad' pendientes de
--      subir (residuo del diseño anterior).
--   5. Backfill: para ventas que ya estaban en la cola con
--      utilidad=0, recalcula desde detalle y actualiza el JSON.
--
-- Diseño de la sincronización:
--   • Al insertar venta → 1 registro tblventas en la cola.
--   • Al insertar/editar/borrar líneas → SE ACTUALIZA el JSON
--     del registro pendiente para incluir la utilidad correcta.
--     NUNCA se inserta registro de tbldetalle_venta ni
--     'venta_utilidad'. La cola solo contiene tblventas.
--
-- Fórmula utilidad (sin IVA, contablemente correcta):
--   SUM((PrecioV − PrecioC) / (1 + IVA/100) × (Cantidad − Dev))
--
-- Correr desde PC del cliente:
--   mysql -u USUARIO -p BD_CLIENTE < SYNC_02_aplicar.sql
-- ============================================================

-- ============================================================
-- 1. Crear tabla cola si no existe
-- ============================================================
CREATE TABLE IF NOT EXISTS tbl_cambios_sincronizar (
  id_cambio INT NOT NULL AUTO_INCREMENT,
  tabla_nombre VARCHAR(50) NOT NULL,
  registro_id VARCHAR(100) NOT NULL,
  operacion ENUM('INSERT','UPDATE','DELETE') NOT NULL,
  datos_json TEXT DEFAULT NULL,
  sincronizado TINYINT(4) DEFAULT 0,
  intentos_sincronizacion INT DEFAULT 0,
  ultimo_error TEXT DEFAULT NULL,
  fecha_cambio DATETIME DEFAULT CURRENT_TIMESTAMP,
  fecha_sincronizado DATETIME DEFAULT NULL,
  PRIMARY KEY (id_cambio),
  KEY idx_sincronizado (sincronizado),
  KEY idx_tabla (tabla_nombre),
  KEY idx_fecha (fecha_cambio),
  KEY idx_tabla_registro (tabla_nombre, registro_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- ============================================================
-- 2. Eliminar triggers viejos si existen
-- ============================================================
DROP TRIGGER IF EXISTS trg_ventas_after_insert;
DROP TRIGGER IF EXISTS trg_ventas_after_update;
DROP TRIGGER IF EXISTS trg_ventas_after_delete;
DROP TRIGGER IF EXISTS trg_detalle_venta_after_insert;
DROP TRIGGER IF EXISTS trg_detalle_venta_after_update;
DROP TRIGGER IF EXISTS trg_detalle_venta_after_delete;

-- ============================================================
-- 3. Crear triggers correctos
-- ============================================================
DELIMITER ;;

CREATE DEFINER=CURRENT_USER TRIGGER trg_ventas_after_insert
AFTER INSERT ON tblventas
FOR EACH ROW
BEGIN
    DECLARE v_utilidad DECIMAL(18,2) DEFAULT 0;
    SELECT COALESCE(SUM(ROUND((d.PrecioV - d.PrecioC) / (1 + COALESCE(d.IVA, 0) / 100) * (d.Cantidad - COALESCE(d.Dev, 0)), 2)), 0)
    INTO v_utilidad
    FROM tbldetalle_venta d WHERE d.Factura_N = NEW.Factura_N;
    INSERT INTO tbl_cambios_sincronizar (tabla_nombre, registro_id, operacion, datos_json)
    VALUES (
        'tblventas', NEW.Factura_N, 'INSERT',
        JSON_OBJECT(
            'Factura_N', NEW.Factura_N, 'N_Mes', NEW.N_Mes, 'anio', NEW.anio,
            'Fecha', NEW.Fecha, 'Tipo', NEW.Tipo, 'Dias', NEW.Dias,
            'CodigoCli', NEW.CodigoCli, 'A_nombre', NEW.A_nombre,
            'Identificacion', NEW.Identificacion, 'Direccion', NEW.Direccion,
            'Telefono', NEW.Telefono, 'Impuesto', NEW.Impuesto,
            'Descuento', NEW.Descuento, 'Total', NEW.Total, 'Saldo', NEW.Saldo,
            'EstadoPedido', NEW.EstadoPedido, 'Comentario', NEW.Comentario,
            'EstadoFact', NEW.EstadoFact, 'Hora', NEW.Hora,
            'Id_Usuario', NEW.Id_Usuario, 'Abono', NEW.Abono, 'pagada', NEW.pagada,
            'CodigoEmp', NEW.CodigoEmp, 'id_mediopago', NEW.id_mediopago,
            'efectivo', NEW.efectivo, 'valorpagado1', NEW.valorpagado1,
            'enviada_dian', NEW.enviada_dian, 'cufe', NEW.cufe,
            'utilidad', v_utilidad
        )
    );
END;;

CREATE DEFINER=CURRENT_USER TRIGGER trg_ventas_after_update
AFTER UPDATE ON tblventas
FOR EACH ROW
BEGIN
    DECLARE v_utilidad DECIMAL(18,2) DEFAULT 0;
    SELECT COALESCE(SUM(ROUND((d.PrecioV - d.PrecioC) / (1 + COALESCE(d.IVA, 0) / 100) * (d.Cantidad - COALESCE(d.Dev, 0)), 2)), 0)
    INTO v_utilidad
    FROM tbldetalle_venta d WHERE d.Factura_N = NEW.Factura_N;
    INSERT INTO tbl_cambios_sincronizar (tabla_nombre, registro_id, operacion, datos_json)
    VALUES (
        'tblventas', NEW.Factura_N, 'UPDATE',
        JSON_OBJECT(
            'Factura_N', NEW.Factura_N, 'N_Mes', NEW.N_Mes, 'anio', NEW.anio,
            'Fecha', NEW.Fecha, 'Tipo', NEW.Tipo, 'Dias', NEW.Dias,
            'CodigoCli', NEW.CodigoCli, 'A_nombre', NEW.A_nombre,
            'Identificacion', NEW.Identificacion, 'Direccion', NEW.Direccion,
            'Telefono', NEW.Telefono, 'Impuesto', NEW.Impuesto,
            'Descuento', NEW.Descuento, 'Total', NEW.Total, 'Saldo', NEW.Saldo,
            'EstadoPedido', NEW.EstadoPedido, 'Comentario', NEW.Comentario,
            'EstadoFact', NEW.EstadoFact, 'Hora', NEW.Hora,
            'Id_Usuario', NEW.Id_Usuario, 'Abono', NEW.Abono, 'pagada', NEW.pagada,
            'CodigoEmp', NEW.CodigoEmp, 'id_mediopago', NEW.id_mediopago,
            'efectivo', NEW.efectivo, 'valorpagado1', NEW.valorpagado1,
            'enviada_dian', NEW.enviada_dian, 'cufe', NEW.cufe,
            'utilidad', v_utilidad
        )
    );
END;;

CREATE DEFINER=CURRENT_USER TRIGGER trg_ventas_after_delete
AFTER DELETE ON tblventas
FOR EACH ROW
BEGIN
    INSERT INTO tbl_cambios_sincronizar (tabla_nombre, registro_id, operacion, datos_json)
    VALUES (
        'tblventas', OLD.Factura_N, 'DELETE',
        JSON_OBJECT('Factura_N', OLD.Factura_N, 'Fecha', OLD.Fecha,
                    'CodigoCli', OLD.CodigoCli, 'Total', OLD.Total)
    );
END;;

-- ── Detalle: SOLO actualiza el JSON del registro pendiente en la cola.
--    NUNCA inserta un registro nuevo. La cola no ve tbldetalle_venta.
CREATE DEFINER=CURRENT_USER TRIGGER trg_detalle_venta_after_insert
AFTER INSERT ON tbldetalle_venta
FOR EACH ROW
BEGIN
    DECLARE v_utilidad DECIMAL(18,2) DEFAULT 0;
    SELECT COALESCE(SUM(ROUND((d.PrecioV - d.PrecioC) / (1 + COALESCE(d.IVA, 0) / 100) * (d.Cantidad - COALESCE(d.Dev, 0)), 2)), 0)
    INTO v_utilidad
    FROM tbldetalle_venta d WHERE d.Factura_N = NEW.Factura_N;
    UPDATE tbl_cambios_sincronizar
       SET datos_json = JSON_SET(datos_json, '$.utilidad', v_utilidad)
     WHERE tabla_nombre = 'tblventas'
       AND registro_id = CAST(NEW.Factura_N AS CHAR)
       AND sincronizado = 0
     ORDER BY id_cambio DESC LIMIT 1;
END;;

CREATE DEFINER=CURRENT_USER TRIGGER trg_detalle_venta_after_update
AFTER UPDATE ON tbldetalle_venta
FOR EACH ROW
BEGIN
    DECLARE v_utilidad DECIMAL(18,2) DEFAULT 0;
    SELECT COALESCE(SUM(ROUND((d.PrecioV - d.PrecioC) / (1 + COALESCE(d.IVA, 0) / 100) * (d.Cantidad - COALESCE(d.Dev, 0)), 2)), 0)
    INTO v_utilidad
    FROM tbldetalle_venta d WHERE d.Factura_N = NEW.Factura_N;
    UPDATE tbl_cambios_sincronizar
       SET datos_json = JSON_SET(datos_json, '$.utilidad', v_utilidad)
     WHERE tabla_nombre = 'tblventas'
       AND registro_id = CAST(NEW.Factura_N AS CHAR)
       AND sincronizado = 0
     ORDER BY id_cambio DESC LIMIT 1;
END;;

CREATE DEFINER=CURRENT_USER TRIGGER trg_detalle_venta_after_delete
AFTER DELETE ON tbldetalle_venta
FOR EACH ROW
BEGIN
    DECLARE v_utilidad DECIMAL(18,2) DEFAULT 0;
    SELECT COALESCE(SUM(ROUND((d.PrecioV - d.PrecioC) / (1 + COALESCE(d.IVA, 0) / 100) * (d.Cantidad - COALESCE(d.Dev, 0)), 2)), 0)
    INTO v_utilidad
    FROM tbldetalle_venta d WHERE d.Factura_N = OLD.Factura_N;
    UPDATE tbl_cambios_sincronizar
       SET datos_json = JSON_SET(datos_json, '$.utilidad', v_utilidad)
     WHERE tabla_nombre = 'tblventas'
       AND registro_id = CAST(OLD.Factura_N AS CHAR)
       AND sincronizado = 0
     ORDER BY id_cambio DESC LIMIT 1;
END;;

DELIMITER ;

-- ============================================================
-- 4. Limpiar registros basura del diseño anterior
--    ('venta_utilidad' era una tabla_nombre falsa; el nuevo
--     modelo ya no la usa).
-- ============================================================
DELETE FROM tbl_cambios_sincronizar
 WHERE tabla_nombre = 'venta_utilidad'
   AND sincronizado = 0;

-- También basura de tbldetalle_venta si algún trigger viejo la registraba
DELETE FROM tbl_cambios_sincronizar
 WHERE tabla_nombre = 'tbldetalle_venta'
   AND sincronizado = 0;

-- ============================================================
-- 5. Backfill retroactivo: actualizar el JSON de ventas pendientes
--    que quedaron con utilidad=0 pero cuya utilidad real es > 0.
-- ============================================================
UPDATE tbl_cambios_sincronizar c
  JOIN (
    SELECT d.Factura_N,
           COALESCE(SUM(ROUND((d.PrecioV - d.PrecioC) / (1 + COALESCE(d.IVA, 0) / 100) * (d.Cantidad - COALESCE(d.Dev, 0)), 2)), 0) AS utilidad_real
      FROM tbldetalle_venta d
     GROUP BY d.Factura_N
  ) u ON u.Factura_N = CAST(c.registro_id AS UNSIGNED)
   SET c.datos_json = JSON_SET(c.datos_json, '$.utilidad', u.utilidad_real)
 WHERE c.tabla_nombre = 'tblventas'
   AND c.sincronizado = 0
   AND u.utilidad_real <> 0;

-- ============================================================
-- 6. Reporte final
-- ============================================================
SELECT '=== TRIGGERS INSTALADOS ===' AS info;
SELECT TRIGGER_NAME, EVENT_MANIPULATION, EVENT_OBJECT_TABLE
  FROM information_schema.TRIGGERS
 WHERE TRIGGER_SCHEMA = DATABASE()
   AND TRIGGER_NAME LIKE 'trg_%venta%'
 ORDER BY EVENT_OBJECT_TABLE, EVENT_MANIPULATION;

SELECT '=== COLA PENDIENTE DE SINCRONIZAR ===' AS info;
SELECT tabla_nombre, COUNT(*) AS pendientes
  FROM tbl_cambios_sincronizar
 WHERE sincronizado = 0
 GROUP BY tabla_nombre;

SELECT '=== FIN — Todo listo ===' AS info;
