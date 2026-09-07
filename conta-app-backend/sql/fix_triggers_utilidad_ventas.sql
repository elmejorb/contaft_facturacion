-- ============================================================
-- FIX: Sincronización de utilidad de ventas
-- ============================================================
-- Objetivo del cliente: subir SOLO el encabezado (tblventas) al
-- servidor, pero con la UTILIDAD ya calculada del detalle.
-- No queremos saturar el servidor con líneas de detalle.
--
-- Problema del diseño anterior:
--   • trigger tblventas AFTER INSERT dejaba utilidad = 0 porque
--     los detalles aún no existen al momento del INSERT.
--   • trigger tbldetalle_venta AFTER INSERT insertaba OTRO
--     registro 'venta_utilidad' en la cola, y lo hacía UNA VEZ
--     por línea (5 líneas → 5 registros basura, solo el último
--     con utilidad correcta).
--   • Sincronizador tenía que manejar dos filas por venta y
--     hacer merge en el servidor.
--
-- Solución:
--   • trigger tblventas AFTER INSERT/UPDATE calcula utilidad
--     desde detalles (será 0 al INSERT inicial, correcta al
--     UPDATE posterior).
--   • trigger tbldetalle_venta AFTER INSERT/UPDATE/DELETE hace
--     UPDATE del registro pendiente (sincronizado=0) más reciente
--     de tblventas en la cola, actualizando SOLO el campo
--     $.utilidad del JSON. NO inserta nada nuevo. NO se sube
--     ningún registro de detalle_venta ni de venta_utilidad.
--
-- Efecto para el sincronizador:
--   Ve UN registro tblventas por venta, con utilidad correcta.
--   Cero detalle_venta. Cero venta_utilidad.
--
-- Compatibilidad: DEFINER=CURRENT_USER para que funcione en
-- cualquier instalación (feedback_trigger_definer_ammi).
-- ============================================================

DELIMITER ;;

-- ============================================================
-- 1. Eliminar triggers viejos (para reemplazarlos)
-- ============================================================
DROP TRIGGER IF EXISTS trg_ventas_after_insert;;
DROP TRIGGER IF EXISTS trg_ventas_after_update;;
DROP TRIGGER IF EXISTS trg_ventas_after_delete;;
DROP TRIGGER IF EXISTS trg_detalle_venta_after_insert;;
DROP TRIGGER IF EXISTS trg_detalle_venta_after_update;;
DROP TRIGGER IF EXISTS trg_detalle_venta_after_delete;;

-- ============================================================
-- 2. TRIGGERS tblventas — registran el encabezado en la cola
--    con la utilidad calculada del detalle (0 si aún no hay
--    detalles; los triggers de detalle la corrigen después).
-- ============================================================
CREATE DEFINER=CURRENT_USER TRIGGER trg_ventas_after_insert
AFTER INSERT ON tblventas
FOR EACH ROW
BEGIN
    DECLARE v_utilidad DECIMAL(18,2) DEFAULT 0;

    -- Utilidad neta (sin IVA). En un AFTER INSERT sobre tblventas los
    -- detalles todavía no existen, así que casi siempre queda en 0.
    -- Los triggers de tbldetalle_venta la actualizarán después in-place.
    SELECT COALESCE(SUM(ROUND((d.PrecioV - d.PrecioC) / (1 + COALESCE(d.IVA, 0) / 100) * (d.Cantidad - COALESCE(d.Dev, 0)), 2)), 0)
    INTO v_utilidad
    FROM tbldetalle_venta d WHERE d.Factura_N = NEW.Factura_N;

    INSERT INTO tbl_cambios_sincronizar (tabla_nombre, registro_id, operacion, datos_json)
    VALUES (
        'tblventas',
        NEW.Factura_N,
        'INSERT',
        JSON_OBJECT(
            'Factura_N', NEW.Factura_N,
            'N_Mes', NEW.N_Mes,
            'anio', NEW.anio,
            'Fecha', NEW.Fecha,
            'Tipo', NEW.Tipo,
            'Dias', NEW.Dias,
            'CodigoCli', NEW.CodigoCli,
            'A_nombre', NEW.A_nombre,
            'Identificacion', NEW.Identificacion,
            'Direccion', NEW.Direccion,
            'Telefono', NEW.Telefono,
            'Impuesto', NEW.Impuesto,
            'Descuento', NEW.Descuento,
            'Flete', NEW.Flete,
            'Total', NEW.Total,
            'Saldo', NEW.Saldo,
            'EstadoPedido', NEW.EstadoPedido,
            'Comentario', NEW.Comentario,
            'EstadoFact', NEW.EstadoFact,
            'Pago', NEW.Pago,
            'Cambio', NEW.Cambio,
            'Hora', NEW.Hora,
            'Id_Usuario', NEW.Id_Usuario,
            'Abono', NEW.Abono,
            'pagada', NEW.pagada,
            'CodigoEmp', NEW.CodigoEmp,
            'id_mediopago', NEW.id_mediopago,
            'efectivo', NEW.efectivo,
            'valorpagado1', NEW.valorpagado1,
            'enviada_dian', NEW.enviada_dian,
            'fecha_envio_dian', NEW.fecha_envio_dian,
            'cufe', NEW.cufe,
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
        'tblventas',
        NEW.Factura_N,
        'UPDATE',
        JSON_OBJECT(
            'Factura_N', NEW.Factura_N,
            'N_Mes', NEW.N_Mes,
            'anio', NEW.anio,
            'Fecha', NEW.Fecha,
            'Tipo', NEW.Tipo,
            'Dias', NEW.Dias,
            'CodigoCli', NEW.CodigoCli,
            'A_nombre', NEW.A_nombre,
            'Identificacion', NEW.Identificacion,
            'Direccion', NEW.Direccion,
            'Telefono', NEW.Telefono,
            'Impuesto', NEW.Impuesto,
            'Descuento', NEW.Descuento,
            'Flete', NEW.Flete,
            'Total', NEW.Total,
            'Saldo', NEW.Saldo,
            'EstadoPedido', NEW.EstadoPedido,
            'Comentario', NEW.Comentario,
            'EstadoFact', NEW.EstadoFact,
            'Pago', NEW.Pago,
            'Cambio', NEW.Cambio,
            'Hora', NEW.Hora,
            'Id_Usuario', NEW.Id_Usuario,
            'Abono', NEW.Abono,
            'pagada', NEW.pagada,
            'CodigoEmp', NEW.CodigoEmp,
            'id_mediopago', NEW.id_mediopago,
            'efectivo', NEW.efectivo,
            'valorpagado1', NEW.valorpagado1,
            'enviada_dian', NEW.enviada_dian,
            'fecha_envio_dian', NEW.fecha_envio_dian,
            'cufe', NEW.cufe,
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
        'tblventas',
        OLD.Factura_N,
        'DELETE',
        JSON_OBJECT(
            'Factura_N', OLD.Factura_N,
            'Fecha', OLD.Fecha,
            'CodigoCli', OLD.CodigoCli,
            'Total', OLD.Total
        )
    );
END;;

-- ============================================================
-- 3. TRIGGERS tbldetalle_venta — actualizan la utilidad IN-PLACE
--    del registro pendiente de tblventas en la cola.
--    NO insertan nuevos registros. El detalle NUNCA se sube.
-- ============================================================
CREATE DEFINER=CURRENT_USER TRIGGER trg_detalle_venta_after_insert
AFTER INSERT ON tbldetalle_venta
FOR EACH ROW
BEGIN
    DECLARE v_utilidad DECIMAL(18,2) DEFAULT 0;

    -- Recalcular utilidad total de la venta
    SELECT COALESCE(SUM(ROUND((d.PrecioV - d.PrecioC) / (1 + COALESCE(d.IVA, 0) / 100) * (d.Cantidad - COALESCE(d.Dev, 0)), 2)), 0)
    INTO v_utilidad
    FROM tbldetalle_venta d WHERE d.Factura_N = NEW.Factura_N;

    -- Actualizar el JSON del registro pendiente más reciente de tblventas
    -- para esta factura. Si no hay pendiente (porque el sincronizador ya
    -- lo subió), NO hace nada — la utilidad correcta ya viajó.
    UPDATE tbl_cambios_sincronizar
       SET datos_json = JSON_SET(datos_json, '$.utilidad', v_utilidad)
     WHERE tabla_nombre = 'tblventas'
       AND registro_id  = CAST(NEW.Factura_N AS CHAR)
       AND sincronizado = 0
     ORDER BY id_cambio DESC
     LIMIT 1;
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
       AND registro_id  = CAST(NEW.Factura_N AS CHAR)
       AND sincronizado = 0
     ORDER BY id_cambio DESC
     LIMIT 1;
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
       AND registro_id  = CAST(OLD.Factura_N AS CHAR)
       AND sincronizado = 0
     ORDER BY id_cambio DESC
     LIMIT 1;
END;;

DELIMITER ;

-- ============================================================
-- 4. Limpiar cola: eliminar registros basura de 'venta_utilidad'
--    que quedaron del diseño anterior (no llegaron nunca a subir
--    utilidad al servidor de forma útil).
-- ============================================================
DELETE FROM tbl_cambios_sincronizar
 WHERE tabla_nombre = 'venta_utilidad'
   AND sincronizado = 0;

-- ============================================================
-- 5. BACKFILL: para ventas ya registradas en la cola con
--    utilidad = 0 y aún no sincronizadas, recalcular y actualizar
--    el JSON in-place.
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
   AND CAST(JSON_UNQUOTE(JSON_EXTRACT(c.datos_json, '$.utilidad')) AS DECIMAL(18,2)) = 0
   AND u.utilidad_real <> 0;

-- ============================================================
-- Verificación
-- ============================================================
SELECT 'Triggers activos:' AS info;
SELECT TRIGGER_NAME, EVENT_MANIPULATION, EVENT_OBJECT_TABLE
  FROM information_schema.TRIGGERS
 WHERE TRIGGER_SCHEMA = DATABASE()
   AND TRIGGER_NAME LIKE 'trg_%venta%'
 ORDER BY EVENT_OBJECT_TABLE, EVENT_MANIPULATION;

SELECT 'Cola pendiente de sincronizar por tabla:' AS info;
SELECT tabla_nombre, COUNT(*) AS pendientes
  FROM tbl_cambios_sincronizar
 WHERE sincronizado = 0
 GROUP BY tabla_nombre;
