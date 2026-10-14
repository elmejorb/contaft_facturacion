-- SEED DATA — versión SQLite nativa
-- Equivalente a _seed_data.sql pero con dialecto SQLite:
--   INSERT OR IGNORE (vs INSERT IGNORE)
--   DATE('now','localtime') (vs CURDATE())
--   concat con || (vs CONCAT())
--   todas las columnas NOT NULL con valor explícito

-- Empresa
INSERT INTO tbldatosempresa (Id_Empresa, Empresa, Propietario, Telefono, Direccion, Nit, Detalle, AgentesRet, Resolucion)
VALUES (1, 'EMPRESA DE PRUEBAS', 'TEST', '3001234567', 'CRA 1 # 1-1', '900123456', 'test', 'No', '-');

-- Tipo usuario
INSERT OR IGNORE INTO tbltiposusuario (Id_TiposUsuario, Nombre_TipoUsuario, Nivel)
VALUES (1, 'Administrador', 'admin');

-- Usuario admin
INSERT INTO tblusuarios (Id_Usuario, Usuario, Nombre, Indentificacion, contrasena, Nivel, Id_TiposUsuario, Id_Caja)
VALUES (1, 'admin', 'ADMIN TEST', 123, 'admin', 'admin', 1, 1);

-- Caja
INSERT INTO tblcajas (Id_Caja, Nombre, Tipo, Activa, Saldo)
VALUES (1, 'Caja Principal', 'punto_venta', 1, 0);

-- Sesión abierta hoy a las 08:00
INSERT INTO tblsesiones_caja (Id_Sesion, Id_Caja, Id_Usuario, FechaApertura, BaseInicial, Estado)
VALUES (1, 1, 1, DATE('now','localtime') || ' 08:00:00', 100000, 'abierta');

-- Cliente contado genérico — incluye Whatsapp '' porque SQLite respeta NOT NULL
INSERT INTO tblclientes (CodigoClien, Razon_Social, Nit, Nombres, Apellidos, Direccion, Telefonos, Identificacion, Whatsapp, Email, Direcion_R, Nombre_C, Apellidos_C, Telefonos_C, Direccion_C, Cargo_C, CupoAutorizado)
VALUES (130500, 'VENTAS AL CONTADO', '0', '-', '-', '-', '0', 0, '', '', '', '', '', '', '', '', 0);

-- Cliente real para FE
INSERT INTO tblclientes (CodigoClien, Razon_Social, Nit, Nombres, Apellidos, Direccion, Telefonos, Identificacion, Whatsapp, Email, Direcion_R, Nombre_C, Apellidos_C, Telefonos_C, Direccion_C, Cargo_C, CupoAutorizado)
VALUES (1001, 'CLIENTE TEST SAS', '901000001', 'CLIENTE', 'TEST SAS', 'CLL 1', '3100000001', 901000001, '', 'test@cliente.co', '', '', '', '', '', '', 500000);

-- Categoría
INSERT INTO tblcategoria (Id_Categoria, Categoria) VALUES (1, 'GENERAL');

-- Productos: 1 producto normal con IVA, 1 producto normal sin IVA, 1 servicio
INSERT INTO tblarticulos (Items, Codigo, Nombres_Articulo, Id_Categoria, Existencia, Existencia_minima, Precio_Costo, Iva, Precio_Venta, Servicio, Estado, unit_measure_id)
VALUES (1, 'TEST-001', 'PRODUCTO TEST 1', 1, 100, 0, 500, 0, 1000, 0, 1, 70);

INSERT INTO tblarticulos (Items, Codigo, Nombres_Articulo, Id_Categoria, Existencia, Existencia_minima, Precio_Costo, Iva, Precio_Venta, Servicio, Estado, unit_measure_id)
VALUES (2, 'TEST-002', 'PRODUCTO TEST 2', 1, 50, 0, 1200, 19, 2000, 0, 1, 70);

INSERT INTO tblarticulos (Items, Codigo, Nombres_Articulo, Id_Categoria, Existencia, Existencia_minima, Precio_Costo, Iva, Precio_Venta, Servicio, Estado, unit_measure_id)
VALUES (3, 'TEST-SERV', 'SERVICIO TEST', 1, 0, 0, 0, 0, 50000, 1, 1, 70);
