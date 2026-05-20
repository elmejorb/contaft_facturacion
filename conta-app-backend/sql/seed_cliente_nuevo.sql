-- =====================================================================
-- SEED — Cliente nuevo de Conta FT (datos mínimos estándar)
-- =====================================================================
-- Aplicar DESPUÉS de:
--   1. Cargar estructura_conta_ft.sql
--   2. Aplicar actualizacion_completa.sql (crea cajas, categorías de
--      gasto, retenciones por defecto, etc. — todo lo idempotente)
--
-- Este script solo agrega lo que la migración NO crea:
--   - Datos de empresa (placeholder editable)
--   - Usuario administrador inicial
--   - Cliente genérico para ventas al contado
--   - Tipos de usuario (catálogo)
--
-- Login inicial:
--   Usuario:    root
--   Contraseña: 1234
-- (El cliente debe cambiar la contraseña en el primer acceso.)
-- =====================================================================
SET sql_mode = '';

-- 1. Datos de la empresa (PLACEHOLDER — el cliente edita en Configuración → Datos Empresa)
INSERT IGNORE INTO tbldatosempresa
  (Id_Empresa, Empresa, Propietario, Telefono, Direccion, Nit, Detalle,
   AgentesRet, Resolucion, Rango, Rango2, Regimen, IniciarFacturaEn,
   IvaIncluido, Prefijo, Status, email)
VALUES
  (1, 'NOMBRE DE LA EMPRESA', 'Propietario', '0000000', 'Dirección',
   '000000000-0', 'Detalle del negocio',
   'No', 'No requerida', '1', '5000', 'Común', 1,
   1, NULL, 1, 'correo@empresa.com');

-- 2. Tipos de usuario (catálogo estándar)
INSERT IGNORE INTO tbltiposusuario (Id_TiposUsuario, Nombre_TipoUsuario) VALUES
  (1, 'Administrador'),
  (2, 'Cajero');

-- 3. Usuario administrador inicial — contraseña "1234" en codificación VB6
INSERT IGNORE INTO tblusuarios
  (Id_Usuario, Usuario, Nombre, Indentificacion, contrasena, Id_TiposUsuario, Id_Caja)
VALUES
  (1, 'root', 'Administrador', 1001, '0110001011001001100110110100', 1, NULL);

-- 4. Cliente genérico (OBLIGATORIO — usado para ventas al contado sin cliente identificado)
INSERT IGNORE INTO tblclientes
  (CodigoClien, Razon_Social, Nit, Identificacion, Telefonos, Direccion,
   CupoAutorizado, Fecha_Ingreso)
VALUES
  (130500, 'VENTAS AL CONTADO', '0', 0, '0', '-', 0, NOW());

-- 5. Medios de pago estándar
INSERT IGNORE INTO tblmedios_pago (id_mediopago, nombre_medio) VALUES
  (0, 'Efectivo'),
  (1, 'Tarjeta'),
  (2, 'Transferencia'),
  (3, 'Otro');

-- ============================================================
-- Verificación final
-- ============================================================
SELECT '✓ Seed cliente nuevo aplicado' AS resultado;

SELECT
  (SELECT Empresa FROM tbldatosempresa LIMIT 1)               AS empresa,
  (SELECT COUNT(*) FROM tblcajas)                             AS cajas,
  (SELECT COUNT(*) FROM tblusuarios)                          AS usuarios,
  (SELECT COUNT(*) FROM tblcategorias_gasto)                  AS categ_gasto,
  (SELECT COUNT(*) FROM tblclientes WHERE CodigoClien=130500) AS cliente_generico,
  (SELECT COUNT(*) FROM tblarticulos)                         AS productos,
  (SELECT COUNT(*) FROM tblventas)                            AS ventas;

SELECT '═══════════════════════════════════════════════════════' AS info;
SELECT 'LOGIN INICIAL:  Usuario: root  /  Contraseña: 1234' AS credenciales;
SELECT 'PRIMER PASO: Configuración → Datos Empresa → editar datos reales' AS siguiente;
SELECT '═══════════════════════════════════════════════════════' AS info;
