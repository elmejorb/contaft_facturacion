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

-- =====================================================================
-- 4.8.19 — Brechas MySQL→SQLite detectadas por `npm run test:clientes`
-- (bases reales de Nutrigranos y AhorraMas): tablas y columnas que los
-- clientes MySQL usan y el esquema embebido no tenía. Sin ellas, en modo
-- embebido fallaban bodegas, conceptos de retefuente, módulos activos,
-- movimientos directos, devoluciones (INSERT con id_usuario) y config de
-- vendedores.
-- =====================================================================
CREATE TABLE IF NOT EXISTS tblbodegas (
  Id_Bodega INTEGER PRIMARY KEY AUTOINCREMENT,
  Nombre VARCHAR(80) NOT NULL UNIQUE,
  Direccion VARCHAR(200) DEFAULT NULL,
  Telefono VARCHAR(50) DEFAULT NULL,
  Principal INTEGER NOT NULL DEFAULT 0,
  Activa INTEGER NOT NULL DEFAULT 1,
  FechaMod datetime DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS tbl_conceptos_retefuente (
  Id_Concepto INTEGER PRIMARY KEY AUTOINCREMENT,
  concepto VARCHAR(255) NOT NULL UNIQUE,
  base_uvt NUMERIC NOT NULL DEFAULT 0,
  tarifa NUMERIC NOT NULL DEFAULT 0,
  tipo_codigo VARCHAR(5) NOT NULL DEFAULT '06',
  activo INTEGER NOT NULL DEFAULT 1,
  Fecha_Creacion datetime NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS tbl_modulos_activos (
  Nombre VARCHAR(50) NOT NULL PRIMARY KEY,
  Activo INTEGER NOT NULL DEFAULT 0,
  Descripcion VARCHAR(200) DEFAULT NULL,
  Fecha_Activacion datetime DEFAULT NULL
);

CREATE TABLE IF NOT EXISTS tbl_movs_directos (
  id_mov INTEGER PRIMARY KEY AUTOINCREMENT,
  numero_mov VARCHAR(20) DEFAULT NULL UNIQUE,
  tipo VARCHAR(10) NOT NULL CHECK (tipo IN ('entrada','salida')),
  motivo VARCHAR(50) NOT NULL,
  fecha date NOT NULL,
  Items INTEGER NOT NULL,
  Cantidad NUMERIC NOT NULL,
  Costo_Unitario NUMERIC DEFAULT 0,
  Costo_Total NUMERIC DEFAULT 0,
  Concepto VARCHAR(500) DEFAULT NULL,
  Id_Usuario INTEGER DEFAULT NULL,
  Estado VARCHAR(10) NOT NULL DEFAULT 'Valida' CHECK (Estado IN ('Valida','Anulada')),
  FechaCreacion datetime DEFAULT CURRENT_TIMESTAMP,
  FechaMod datetime DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_movs_directos_fecha ON tbl_movs_directos (fecha);
CREATE INDEX IF NOT EXISTS idx_movs_directos_items ON tbl_movs_directos (Items);

ALTER TABLE tbldevolucion_ventas ADD COLUMN id_usuario INTEGER NOT NULL DEFAULT 0;

ALTER TABLE tbl_config_vendedores ADD COLUMN modo_pedidos INTEGER NOT NULL DEFAULT 1;
ALTER TABLE tbl_config_vendedores ADD COLUMN modo_factura_pos INTEGER NOT NULL DEFAULT 0;
ALTER TABLE tbl_config_vendedores ADD COLUMN modo_factura_electronica INTEGER NOT NULL DEFAULT 0;

-- Exclusión mutua de eventos DIAN aprobados (LGC12): en MySQL es columna
-- generada STORED + UNIQUE(factura_recibida_id, aprobado_marker). SQLite
-- solo permite agregar generadas VIRTUAL por ALTER; NULL no choca en UNIQUE,
-- igual que en MySQL.
ALTER TABLE eventos_factura_recibida ADD COLUMN aprobado_marker VARCHAR(4) GENERATED ALWAYS AS (CASE WHEN estado = 'aprobado' THEN event_code ELSE NULL END) VIRTUAL;
CREATE UNIQUE INDEX IF NOT EXISTS uq_solo_aprobado ON eventos_factura_recibida (factura_recibida_id, aprobado_marker);
