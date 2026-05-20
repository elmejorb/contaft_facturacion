-- =====================================================================
-- LIMPIAR BD para usar como plantilla de cliente nuevo
-- =====================================================================
-- Aplicar sobre una COPIA de una BD funcional (ej: dbammiaccesorios).
-- Borra todos los datos transaccionales y operativos, deja solo la
-- estructura, los catálogos estándar y los registros mínimos.
--
-- ⚠️ NUNCA aplicar sobre la BD del cliente real — solo sobre una copia.
--
-- Uso recomendado:
--   1. mysql -u root -p -e "CREATE DATABASE conta_template;"
--   2. mysqldump -u root -p dbammiaccesorios | mysql -u root -p conta_template
--   3. mysql -u root -p conta_template < limpiar_para_cliente_nuevo.sql
--   4. mysqldump -u root -p conta_template > conta_template_limpio.sql
--      ← este archivo es el que importas en el cliente nuevo
-- =====================================================================
SET FOREIGN_KEY_CHECKS = 0;
SET sql_mode = '';

-- Procedure helper: TRUNCATE solo si la tabla existe
DROP PROCEDURE IF EXISTS sp_truncate_if_exists;
DELIMITER //
CREATE PROCEDURE sp_truncate_if_exists(IN tname VARCHAR(64))
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = tname) THEN
    SET @sql = CONCAT('TRUNCATE TABLE ', tname);
    PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
  END IF;
END //
DELIMITER ;

-- 1. VENTAS Y FACTURACIÓN
CALL sp_truncate_if_exists('tbldetalle_venta');
CALL sp_truncate_if_exists('tblventas');
CALL sp_truncate_if_exists('tbldevolucion_ventas');
CALL sp_truncate_if_exists('electronic_documents');
CALL sp_truncate_if_exists('detalle_document_electronic');

-- 2. COMPRAS
CALL sp_truncate_if_exists('tbldetalle_pedido');
CALL sp_truncate_if_exists('tblpedidos');

-- 3. CAJA (sesiones, movimientos, cierres)
CALL sp_truncate_if_exists('tblmov_caja');
CALL sp_truncate_if_exists('tblsesiones_caja');
CALL sp_truncate_if_exists('tblcierre_caja');
CALL sp_truncate_if_exists('tblapertura_caja');

-- Resetear saldos de cajas si la tabla tiene esa columna
SET @hay_col = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'tblcajas' AND COLUMN_NAME = 'Saldo');
SET @sql = IF(@hay_col = 1, 'UPDATE tblcajas SET Saldo = 0', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 4. PAGOS Y GASTOS
CALL sp_truncate_if_exists('tblpagos');
CALL sp_truncate_if_exists('tblegresos');
CALL sp_truncate_if_exists('tblpagos_proveedor');
CALL sp_truncate_if_exists('tblpagosproveedor');

-- 5. CARTERA (cuentas por cobrar/pagar)
CALL sp_truncate_if_exists('tblcuentasxcobrar');
CALL sp_truncate_if_exists('tblcuentasxpagar');

-- 6. INVENTARIO
CALL sp_truncate_if_exists('tblarticulos');
CALL sp_truncate_if_exists('tblkardex');
CALL sp_truncate_if_exists('tblproductos_lotes');
CALL sp_truncate_if_exists('tblnotas_articulo');
CALL sp_truncate_if_exists('tblconteos_inventario');
CALL sp_truncate_if_exists('tblcomponentes_articulo');

-- 7. CLIENTES (mantener solo el genérico) y PROVEEDORES
DELETE FROM tblclientes WHERE CodigoClien <> 130500;
CALL sp_truncate_if_exists('tblproveedores');

-- 8. BANCOS (limpiar movimientos pero conservar cuentas, resetear saldos)
CALL sp_truncate_if_exists('tblmov_bancos');
SET @hay_saldo = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'tblbancos' AND COLUMN_NAME = 'Saldo');
SET @sql = IF(@hay_saldo = 1, 'UPDATE tblbancos SET Saldo = 0', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 9. SINCRONIZACIÓN
CALL sp_truncate_if_exists('tbl_cambios_sincronizar');

-- 10. VENDEDORES MÓVILES
CALL sp_truncate_if_exists('tbl_pedidos_vendedor');
CALL sp_truncate_if_exists('tbl_vendedores_movil');

-- 11. USUARIOS — mantener solo "root", resetear contraseña a 1234
DELETE FROM tblusuarios WHERE Usuario <> 'root';
INSERT IGNORE INTO tblusuarios
  (Id_Usuario, Usuario, Nombre, Indentificacion, contrasena, Id_TiposUsuario)
VALUES
  (1, 'root', 'Administrador', 1001, '0110001011001001100110110100', 1);
UPDATE tblusuarios SET contrasena = '0110001011001001100110110100' WHERE Usuario = 'root';

-- 12. EMPRESA — resetear a placeholder
UPDATE tbldatosempresa SET
  Empresa       = 'NOMBRE DE LA EMPRESA',
  Propietario   = 'Propietario',
  Telefono      = '0000000',
  Direccion     = 'Dirección',
  Nit           = '000000000-0',
  Detalle       = 'Detalle del negocio',
  email         = 'correo@empresa.com',
  Resolucion    = 'No requerida',
  IniciarFacturaEn = 1,
  Prefijo       = NULL
WHERE Id_Empresa = 1;

-- Si la columna api_token existe (módulo CRM), limpiarlo
SET @hay_token = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'tbldatosempresa' AND COLUMN_NAME = 'api_token');
SET @sql = IF(@hay_token = 1, 'UPDATE tbldatosempresa SET api_token = NULL WHERE Id_Empresa = 1', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 13. CONFIGURACIÓN VENDEDORES — resetear toggle a OFF
SET @t = (SELECT COUNT(*) FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'tbl_config_vendedores');
SET @sql = IF(@t = 1, "UPDATE tbl_config_vendedores SET habilitado = 0, api_email = '', api_token_empresa = '', ultimo_pull_id = 0, ultimo_pull_ventas = NULL WHERE id = 1", 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- Limpiar el procedimiento auxiliar
DROP PROCEDURE IF EXISTS sp_truncate_if_exists;

SET FOREIGN_KEY_CHECKS = 1;

-- ============================================================
-- VERIFICACIÓN FINAL — solo cuenta tablas que sí existen
-- ============================================================
SELECT '✓ BD limpiada — lista para usar como plantilla de cliente nuevo' AS resultado;
SELECT
  (SELECT Empresa FROM tbldatosempresa LIMIT 1)             AS empresa,
  (SELECT COUNT(*) FROM tblusuarios)                        AS usuarios,
  (SELECT COUNT(*) FROM tblclientes)                        AS clientes,
  (SELECT COUNT(*) FROM tblarticulos)                       AS productos,
  (SELECT COUNT(*) FROM tblventas)                          AS ventas,
  (SELECT COUNT(*) FROM tblpagos)                           AS pagos,
  (SELECT COUNT(*) FROM tblegresos)                         AS gastos,
  (SELECT COUNT(*) FROM tblproveedores)                     AS proveedores;

SELECT 'IMPORTANTE: Aplicar actualizacion_completa.sql DESPUÉS de importar esta plantilla' AS nota;
SELECT 'LOGIN INICIAL: root / 1234' AS credenciales;
SELECT 'Editar empresa en: Configuración → Datos Empresa' AS siguiente_paso;
