-- =====================================================================
-- SEED SQLite — Cliente nuevo de Conta FT (datos mínimos estándar)
-- =====================================================================
-- Versión SQLite del seed_cliente_nuevo.sql (que es MySQL).
-- Lo carga bootstrapSqliteDb() después del schema + catálogo DIAN.
--
-- Login inicial:
--   Usuario:    root
--   Contraseña: 1234
-- (El cliente debe cambiar la contraseña en el primer acceso.)
-- =====================================================================

-- 1. Datos de la empresa (PLACEHOLDER — el cliente edita en Configuración → Datos Empresa)
-- Régimen Simplificado por default (= No Responsable de IVA).
-- Perfil típico del cliente nuevo que descarga: pequeño comerciante que
-- NO cobra IVA. Si es Responsable de IVA, cambia a 'Común' en
-- Configuración → Datos Empresa.
INSERT OR IGNORE INTO tbldatosempresa
  (Id_Empresa, Empresa, Propietario, Telefono, Direccion, Nit, Detalle,
   AgentesRet, Resolucion, Rango, Rango2, Regimen, IniciarFacturaEn,
   IvaIncluido, Prefijo, Status, email)
VALUES
  (1, 'NOMBRE DE LA EMPRESA', 'Propietario', '0000000', 'Dirección',
   '000000000-0', 'Detalle del negocio',
   'No', 'No requerida', '1', '5000', 'Simplificado', 1,
   1, NULL, 1, 'correo@empresa.com');

-- 2. Tipos de usuario (catálogo estándar)
INSERT OR IGNORE INTO tbltiposusuario (Id_TiposUsuario, Nombre_TipoUsuario) VALUES
  (1, 'Administrador'),
  (2, 'Cajero');

-- 3. Usuario administrador inicial — contraseña "1234" en codificación VB6
INSERT OR IGNORE INTO tblusuarios
  (Id_Usuario, Usuario, Nombre, Indentificacion, contrasena, Id_TiposUsuario, Id_Caja)
VALUES
  (1, 'root', 'Administrador', 1001, '0110001011001001100110110100', 1, NULL);

-- 4. Cliente genérico CONSUMIDOR FINAL (OBLIGATORIO):
--    - Flujo POS: cliente default para ventas sin identificar.
--    - Flujo FE: adquirente genérico que exige la DIAN (NIT 222222222).
--    Es un solo registro que cubre ambos casos.
--    id_documento = 13 (Cédula de Ciudadanía, catálogo DIAN).
--    Whatsapp y Fecha_Ingreso son NOT NULL por schema.
INSERT OR IGNORE INTO tblclientes
  (CodigoClien, Razon_Social, Nit, Identificacion, Telefonos, Direccion,
   CupoAutorizado, Fecha_Ingreso, Whatsapp, id_documento)
VALUES
  (130500, 'CONSUMIDOR FINAL', '222222222', 222222222, '0', '-', 0, datetime('now'), '', 13);

-- 5. Medios de pago estándar
INSERT OR IGNORE INTO tblmedios_pago (id_mediopago, nombre_medio) VALUES
  (0, 'Efectivo'),
  (1, 'Tarjeta'),
  (2, 'Transferencia'),
  (3, 'Otro');

-- 6. Cajas (lo que actualizacion_completa.sql hace en MySQL para clientes legacy;
--    en SQLite lo hacemos acá porque ese script no corre).
INSERT OR IGNORE INTO tblcajas (Id_Caja, Nombre, Tipo, Activa) VALUES
  (1, 'Caja 1', 'punto_venta', 1),
  (2, 'Caja Principal', 'principal', 1);

-- 7. Categorías de Gastos predefinidas
INSERT OR IGNORE INTO tblcategorias_gasto (Nombre) VALUES
  ('Servicios Públicos'),
  ('Arriendo'),
  ('Nómina'),
  ('Transporte'),
  ('Mantenimiento'),
  ('Papelería'),
  ('Alimentación'),
  ('Aseo'),
  ('Impuestos'),
  ('Otros');

-- 8. Retenciones DIAN estándar
INSERT OR IGNORE INTO tblretenciones (Codigo, Nombre, Porcentaje, Codigo_Dian, Activa) VALUES
  ('RETEFUENTE_SERV_DECL',   'ReteFuente servicios (declarante)',     4.0000, '06', 1),
  ('RETEFUENTE_SERV_NODECL', 'ReteFuente servicios (no declarante)',  6.0000, '06', 0),
  ('RETEFUENTE_COMPRAS',     'ReteFuente compras generales',          2.5000, '06', 0),
  ('RETEICA_PLANETARICA',    'ReteICA Planeta Rica servicios',        0.9660, '07', 0),
  ('RETEIVA',                'ReteIVA (15% del IVA)',                 15.0000,'05', 0);

-- 9. Etiquetas de productos (familias de clasificación)
INSERT OR IGNORE INTO tbletiquetas (Nombre, Descripcion, Color) VALUES
  ('Insumos', 'Materias primas e ingredientes para producción', '#d97706'),
  ('Producto Terminado', 'Productos elaborados listos para vender', '#16a34a'),
  ('Reventa', 'Productos que se compran y se venden sin transformación', '#2563eb');
