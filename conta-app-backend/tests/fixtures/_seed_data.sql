-- =====================================================================
-- SEED DATA para suite de pruebas de integración
-- =====================================================================
-- Columnas basadas en el schema REAL de conta_innovacion v4.7.14.
-- Datos mínimos para que los endpoints puedan funcionar.
--
-- Desactivamos strict mode para que columnas NOT NULL sin default
-- (ej. Whatsapp en tblclientes, columnas nuevas de migraciones) se
-- llenen con '' / 0 automáticamente — así este seed no se rompe cada
-- vez que agregamos una columna nueva al schema.
-- =====================================================================
SET @@SESSION.sql_mode = '';

-- Empresa
INSERT INTO tbldatosempresa (Id_Empresa, Empresa, Propietario, Telefono, Direccion, Nit, Detalle, AgentesRet, Resolucion)
VALUES (1, 'EMPRESA DE PRUEBAS', 'TEST', '3001234567', 'CRA 1 # 1-1', '900123456', 'test', 'No', '-');

-- Tipo usuario
INSERT IGNORE INTO tbltiposusuario (Id_TiposUsuario, Nombre_TipoUsuario, Nivel) VALUES (1, 'Administrador', 'admin');

-- Usuario admin (id=1)
INSERT INTO tblusuarios (Id_Usuario, Usuario, Nombre, Indentificacion, contrasena, Nivel, Id_TiposUsuario, Id_Caja)
VALUES (1, 'admin', 'ADMIN TEST', 123, 'admin', 'admin', 1, 1);

-- Caja (id=1)
INSERT INTO tblcajas (Id_Caja, Nombre, Tipo, Activa, Saldo)
VALUES (1, 'Caja Principal', 'punto_venta', 1, 0);

-- Sesión abierta hoy a las 08:00 — para que todas las ventas/gastos de test entren al cuadre.
INSERT INTO tblsesiones_caja (Id_Sesion, Id_Caja, Id_Usuario, FechaApertura, BaseInicial, Estado)
VALUES (1, 1, 1, CONCAT(CURDATE(), ' 08:00:00'), 100000, 'abierta');

-- Cliente contado genérico (id=130500) — convención del sistema
INSERT INTO tblclientes (CodigoClien, Razon_Social, Nit, Nombres, Apellidos, Direccion, Telefonos, Identificacion)
VALUES (130500, 'VENTAS AL CONTADO', '0', '-', '-', '-', '0', 0);

-- Cliente real para FE (CodigoClien=1001)
INSERT INTO tblclientes (CodigoClien, Razon_Social, Nit, Nombres, Apellidos, Direccion, Telefonos, Identificacion)
VALUES (1001, 'CLIENTE TEST SAS', '901000001', 'CLIENTE', 'TEST SAS', 'CLL 1', '3100000001', 901000001);

-- Categoría productos
INSERT INTO tblcategoria (Id_Categoria, Categoria) VALUES (1, 'GENERAL');

-- Producto 1 (id=1): stock 100, precio $1,000, SIN IVA
INSERT INTO tblarticulos (Items, Codigo, Nombres_Articulo, Id_Categoria, Existencia, Existencia_minima, Precio_Costo, Iva, Precio_Venta, Servicio, Estado, unit_measure_id)
VALUES (1, 'TEST-001', 'PRODUCTO TEST 1', 1, 100, 0, 500, 0, 1000, 'N', 1, 70);

-- Producto 2 (id=2): stock 50, precio $2,000 con IVA 19
INSERT INTO tblarticulos (Items, Codigo, Nombres_Articulo, Id_Categoria, Existencia, Existencia_minima, Precio_Costo, Iva, Precio_Venta, Servicio, Estado, unit_measure_id)
VALUES (2, 'TEST-002', 'PRODUCTO TEST 2', 1, 50, 0, 1200, 19, 2000, 'N', 1, 70);

-- Servicio (id=3): sin stock, no mueve kardex
INSERT INTO tblarticulos (Items, Codigo, Nombres_Articulo, Id_Categoria, Existencia, Existencia_minima, Precio_Costo, Iva, Precio_Venta, Servicio, Estado, unit_measure_id)
VALUES (3, 'TEST-SERV', 'SERVICIO TEST', 1, 0, 0, 0, 0, 50000, 'S', 1, 70);
