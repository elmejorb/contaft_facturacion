-- =====================================================================
-- MIGRACIONES SQLite — se aplican SIEMPRE al arranque (idempotentes).
-- =====================================================================
--
-- Equivalente a actualizacion_completa.sql pero para SQLite. Agrega
-- columnas que fueron creciendo en el schema MySQL vía ALTER TABLE y que
-- no estaban en el schema_sqlite_cliente.sql base.
--
-- Idempotencia: SQLite NO soporta `ADD COLUMN IF NOT EXISTS`. El loader
-- del bootstrap captura el error "duplicate column" y lo ignora.
-- Las ALTER sueltas (sin IF NOT EXISTS) son el estilo correcto acá.
--
-- Cada vez que un endpoint falla con "no such column: X", agregarlo acá
-- con su tipo y default, y re-correr.
-- =====================================================================

-- tblegresos: columnas de vínculo (viene de actualizacion_completa.sql)
ALTER TABLE tblegresos ADD COLUMN vinculado_a VARCHAR(20) DEFAULT NULL;
ALTER TABLE tblegresos ADD COLUMN id_vinculo INTEGER DEFAULT NULL;

-- tbldatosempresa: Modo Fabricación v4.7 + UVT (valor fiscal anual)
ALTER TABLE tbldatosempresa ADD COLUMN dias_estimados_entrega INTEGER NOT NULL DEFAULT 7;
ALTER TABLE tbldatosempresa ADD COLUMN uvt_valor NUMERIC DEFAULT NULL;
ALTER TABLE tbldatosempresa ADD COLUMN uvt_anio INTEGER DEFAULT NULL;
ALTER TABLE tbldatosempresa ADD COLUMN uvt_actualizado_at datetime DEFAULT NULL;

-- tblarticulos: Módulo de empaques (ventas por unidad vs por empaque)
ALTER TABLE tblarticulos ADD COLUMN FactorConversion NUMERIC DEFAULT 1;
ALTER TABLE tblarticulos ADD COLUMN NombreEmpaque VARCHAR(50) DEFAULT NULL;
ALTER TABLE tblarticulos ADD COLUMN VenderComoEmpaque INTEGER DEFAULT 0;
ALTER TABLE tblarticulos ADD COLUMN ComprarComoEmpaque INTEGER DEFAULT 0;
ALTER TABLE tblarticulos ADD COLUMN Precio_Venta_Empaque NUMERIC DEFAULT 0;
ALTER TABLE tblarticulos ADD COLUMN nombre_empaque VARCHAR(50) DEFAULT NULL;
ALTER TABLE tblarticulos ADD COLUMN Id_Bodega INTEGER DEFAULT NULL;

-- tblretenciones: tipos de retención DIAN
ALTER TABLE tblretenciones ADD COLUMN es_retencion INTEGER DEFAULT 1;
ALTER TABLE tblretenciones ADD COLUMN tipo_codigo VARCHAR(20) DEFAULT NULL;

-- detalle_document_electronic: Modo Fabricación v4.7 — flag entregado por línea FE
ALTER TABLE detalle_document_electronic ADD COLUMN entregado INTEGER DEFAULT 0;
ALTER TABLE detalle_document_electronic ADD COLUMN fecha_entrega datetime DEFAULT NULL;
ALTER TABLE detalle_document_electronic ADD COLUMN usuario_entrego INTEGER DEFAULT NULL;
ALTER TABLE detalle_document_electronic ADD COLUMN cantidad_entregada NUMERIC DEFAULT 0;

-- tbldetalle_venta: Modo Fabricación v4.7 — flag entregado por línea POS
ALTER TABLE tbldetalle_venta ADD COLUMN Entregado VARCHAR(1) DEFAULT 'S';
ALTER TABLE tbldetalle_venta ADD COLUMN CantidadEntregada NUMERIC NOT NULL DEFAULT 0;
ALTER TABLE tbldetalle_venta ADD COLUMN FechaEntrega datetime DEFAULT NULL;
ALTER TABLE tbldetalle_venta ADD COLUMN fecha_entrega date DEFAULT NULL;
ALTER TABLE tbldetalle_venta ADD COLUMN UsuarioEntrego INTEGER DEFAULT NULL;
