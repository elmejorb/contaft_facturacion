-- =====================================================================
-- SEED — Empresa de prueba "Tienda La Esperanza"
-- =====================================================================
-- BD: conta_test_negocio
-- Propósito: simular un negocio que arranca de cero para probar todos
-- los movimientos (caja, ventas, compras, cobros, pagos, gastos,
-- anulaciones, devoluciones, cierre).
--
-- Login: contraseña "1234" para todos los usuarios.
-- =====================================================================
SET sql_mode = '';

-- 1. Datos de la empresa
INSERT INTO tbldatosempresa (Id_Empresa, Empresa, Propietario, Telefono, Direccion, Nit, Detalle, AgentesRet, Resolucion, Rango, Rango2, Regimen, IniciarFacturaEn, IvaIncluido, Prefijo, Status, email, usa_turnos)
VALUES (1, 'TIENDA LA ESPERANZA', 'Juan Pérez', '3001234567', 'Cra 5 No 10-20 Centro', '900.123.456-7', 'Negocio de prueba', 'No', 'No requerida', '1', '5000', 'Común', 1, 1, 'TLE', 1, 'tienda.esperanza@example.com', 0);

-- 2. Cajas
INSERT INTO tblcajas (Id_Caja, Nombre, Tipo, Activa, Saldo) VALUES
  (1, 'Caja Principal', 'principal', 1, 0),
  (2, 'Caja 1', 'punto_venta', 1, 0);

-- 3. Usuarios — contraseña "1234" en codificación VB6 binaria
-- '1'=0110001 '2'=0110010 '3'=0110011 '4'=0110100  →  '0110001011001001100110110100'
INSERT INTO tblusuarios (Id_Usuario, Usuario, Nombre, Indentificacion, contrasena, Id_TiposUsuario, Id_Caja) VALUES
  (1, 'root',    'Administrador General', 1001, '0110001011001001100110110100', 1, NULL),
  (2, 'maria',   'María Rodríguez',       2002, '0110001011001001100110110100', 2, 2),
  (3, 'carlos',  'Carlos Gómez',          3003, '0110001011001001100110110100', 2, 1);

-- 4. Categorías de producto
INSERT INTO tblcategoria (Id_Categoria, Categoria) VALUES
  (1, 'Bebidas'), (2, 'Alimentos'), (3, 'Aseo'), (4, 'Papelería'), (5, 'Varios');

-- 5. Categorías de gasto
INSERT INTO tblcategorias_gasto (Nombre, Activa) VALUES
  ('Servicios públicos', 1),
  ('Arrendamiento',      1),
  ('Transporte',         1),
  ('Insumos oficina',    1),
  ('Otros',              1);

-- 6. Cliente genérico (obligatorio: id 130500)
INSERT INTO tblclientes (CodigoClien, Razon_Social, Nit, Identificacion, Telefonos, Direccion, CupoAutorizado, Fecha_Ingreso, id_documento)
VALUES (130500, 'VENTAS AL CONTADO', '0', 0, '0', '-', 0, NOW(), 2);

-- 7. Clientes de prueba
INSERT INTO tblclientes (CodigoClien, Razon_Social, Nit, Identificacion, Telefonos, Direccion, CupoAutorizado, Fecha_Ingreso, Email, id_documento) VALUES
  (1001, 'COMERCIAL DEL VALLE S.A.S.', '901234567-1', 901234567, '6041234567',  'Av. 6N #25-50 Cali',     5000000, NOW(), 'contacto@cdvalle.com', 1),
  (1002, 'SUPERMERCADO LA 14',         '900876543-2', 900876543, '6027654321',  'Cl 14 #80-30 Bogotá',    3000000, NOW(), 'compras@la14.com',     1),
  (1003, 'PEDRO MARTÍNEZ',              '8001234',    8001234,    '3105551234',  'Mz 4 Cs 12 Bario Sur',  500000,  NOW(), 'pedro@gmail.com',      2),
  (1004, 'ANA LÓPEZ',                   '52123456',   52123456,   '3157771122',  'Cl 50 #25-15',          0,       NOW(), 'ana@hotmail.com',      2),
  (1005, 'DISTRIBUIDORA RÁPIDA LTDA.',  '900555666-3',900555666,  '6041112222',  'Calle 8 #15-30',        2000000, NOW(), 'ventas@drapida.com',   1);

-- 8. Proveedores
INSERT INTO tblproveedores (CodigoPro, RazonSocial, Nit, Direccion, Telefonos, Empresa, Fecha_Iingreso) VALUES
  (1, 'COCA-COLA FEMSA',           '800123456-1', 'Av. Industrial Bogotá', '6017654000', 'COCA-COLA FEMSA',     NOW()),
  (2, 'POSTOBÓN S.A.',             '890900110-2', 'Cl 30 #15 Medellín',    '6043334444', 'POSTOBÓN',             NOW()),
  (3, 'COLOMBINA S.A.',            '890301884-3', 'Zona Franca Cali',      '6028889999', 'COLOMBINA',            NOW());

-- 9. PRODUCTOS — 20 artículos con costo y precio configurados
-- Precios incluyen IVA (convención del sistema).
-- IVA: 0% para alimentos básicos, 19% para bebidas y algunos otros.
INSERT INTO tblarticulos
  (Items, Codigo, Nombres_Articulo, Id_Categoria, Existencia, Existencia_minima, Precio_Costo, Iva, Precio_Venta, Precio_Venta2, Precio_Venta3, Precio_Minimo, Estado, unit_measure_id) VALUES
  -- Bebidas (IVA 19%)
  (1,  'BEB001', 'Coca-Cola 350ml',         1,  50, 10, 1500, 19,  2500, 2400, 2300, 2000, 1, 70),
  (2,  'BEB002', 'Pepsi 350ml',             1,  40, 10, 1400, 19,  2300, 2200, 2100, 1900, 1, 70),
  (3,  'BEB003', 'Agua Cristal 600ml',      1,  60, 15, 800,  0,   1500, 1400, 1300, 1200, 1, 70),
  (4,  'BEB004', 'Jugo Hit 250ml',          1,  30, 10, 1200, 19,  2000, 1900, 1800, 1600, 1, 70),
  (5,  'BEB005', 'Cerveza Águila 330ml',    1,  48, 12, 2000, 19,  3500, 3300, 3100, 2800, 1, 70),
  -- Alimentos (IVA 0%)
  (6,  'ALI001', 'Arroz Diana 500g',        2,  40, 10, 2200, 0,   3500, 3400, 3300, 3000, 1, 70),
  (7,  'ALI002', 'Aceite Premier 1L',       2,  25, 8,  6500, 0,   9500, 9300, 9100, 8500, 1, 70),
  (8,  'ALI003', 'Pasta Doria 500g',        2,  30, 10, 2800, 0,   4200, 4100, 4000, 3700, 1, 70),
  (9,  'ALI004', 'Atún Van Camps 170g',     2,  20, 5,  4500, 0,   6800, 6600, 6400, 6000, 1, 70),
  (10, 'ALI005', 'Leche Alquería 1L',       2,  35, 10, 3200, 0,   4800, 4700, 4600, 4300, 1, 70),
  -- Aseo (IVA 19%)
  (11, 'ASE001', 'Detergente Fab 1kg',      3,  20, 5,  6800, 19, 11000, 10800, 10600, 9500, 1, 70),
  (12, 'ASE002', 'Jabón Rey en Barra 300g', 3,  30, 8,  3200, 19,  5500, 5300, 5100, 4700, 1, 70),
  (13, 'ASE003', 'Papel higiénico 4 rollos',3,  40, 10, 4500, 19,  7500, 7300, 7100, 6500, 1, 70),
  (14, 'ASE004', 'Cloro Clorox 1L',         3,  25, 8,  3500, 19,  5800, 5600, 5400, 5000, 1, 70),
  -- Papelería (IVA 19%)
  (15, 'PAP001', 'Cuaderno 100h',           4,  30, 10, 3000, 19,  5500, 5300, 5100, 4500, 1, 70),
  (16, 'PAP002', 'Esfero Bic Negro',        4, 100, 20, 600,  19,  1200, 1100, 1000, 900,  1, 70),
  -- Varios
  (17, 'VAR001', 'Pilas AA x 2 Duracell',   5,  15, 5,  5000, 19,  8500, 8200, 8000, 7500, 1, 70),
  (18, 'VAR002', 'Bombillo LED 9W',         5,  20, 5,  6500, 19, 12000, 11500, 11000, 10000, 1, 70),
  (19, 'VAR003', 'Cigarrillos Marlboro paq',5,  20, 10, 7500, 19, 11000, 10800, 10600, 10000, 1, 70),
  (20, 'DUL001', 'Chocolatina Jet',         2, 100, 30, 800,  19,  1500, 1400, 1300, 1200, 1, 70);

-- 10. Verificación
SELECT '✓ Seed empresa de prueba aplicado' AS resultado;
SELECT
  (SELECT COUNT(*) FROM tbldatosempresa) AS empresa,
  (SELECT COUNT(*) FROM tblcajas)        AS cajas,
  (SELECT COUNT(*) FROM tblusuarios)     AS usuarios,
  (SELECT COUNT(*) FROM tblarticulos)    AS productos,
  (SELECT COUNT(*) FROM tblclientes)     AS clientes,
  (SELECT COUNT(*) FROM tblproveedores)  AS proveedores,
  (SELECT SUM(Existencia * Precio_Costo) FROM tblarticulos) AS valor_inventario_inicial;

SELECT 'Usuarios — contraseña: 1234' AS login;
SELECT u.Usuario, u.Nombre, t.Nombre_TipoUsuario AS rol, c.Nombre AS caja_asignada
FROM tblusuarios u
LEFT JOIN tbltiposusuario t ON u.Id_TiposUsuario = t.Id_TiposUsuario
LEFT JOIN tblcajas c ON u.Id_Caja = c.Id_Caja
ORDER BY u.Id_Usuario;
