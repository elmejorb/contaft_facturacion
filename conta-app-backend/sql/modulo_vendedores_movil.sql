-- ================================================================
-- MIGRACIÓN — MÓDULO VENDEDORES MÓVILES
-- ================================================================
-- ESTADO: En pruebas (no incluido en actualizacion_completa.sql).
-- APLICAR SOLO cuando un cliente específico contrate / active la opción.
--
-- Este archivo cubre los dos lados del módulo:
--   1) BD principal del cliente (Conta FT desktop) — columnas GPS en tblclientes
--   2) BD del hub Lumen (conta_movil) — columnas de tracking en cliente_ediciones_log
--
-- USO:
--   -- Desktop del cliente:
--   mysql -u root -p <nombre_bd_cliente> < modulo_vendedores_movil.sql
--
--   -- Hub Lumen (servidor remoto):
--   Ejecutar manualmente el bloque "LADO LUMEN" más abajo en la BD del hub.
--
-- IDEMPOTENTE: se puede correr varias veces sin romper nada.
-- ================================================================


-- ================================================================
-- LADO DESKTOP — Columnas GPS en tblclientes
-- ================================================================
-- El vendedor móvil captura latitud/longitud cuando visita al cliente.
-- Esas coordenadas se sincronizan al desktop vía pull.php para que el
-- dueño del negocio pueda ver dónde queda cada cliente.

SET @col_lat = (SELECT COUNT(*) FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'tblclientes' AND COLUMN_NAME = 'latitud');
SET @sql = IF(@col_lat = 0,
  'ALTER TABLE tblclientes ADD COLUMN latitud DECIMAL(10,7) NULL DEFAULT NULL',
  'SELECT 1');
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;

SET @col_lng = (SELECT COUNT(*) FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'tblclientes' AND COLUMN_NAME = 'longitud');
SET @sql = IF(@col_lng = 0,
  'ALTER TABLE tblclientes ADD COLUMN longitud DECIMAL(10,7) NULL DEFAULT NULL',
  'SELECT 1');
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;

SET @col_pgps = (SELECT COUNT(*) FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'tblclientes' AND COLUMN_NAME = 'precision_gps_metros');
SET @sql = IF(@col_pgps = 0,
  'ALTER TABLE tblclientes ADD COLUMN precision_gps_metros DECIMAL(8,2) NULL DEFAULT NULL',
  'SELECT 1');
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;

SET @col_gpsat = (SELECT COUNT(*) FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'tblclientes' AND COLUMN_NAME = 'gps_capturado_at');
SET @sql = IF(@col_gpsat = 0,
  'ALTER TABLE tblclientes ADD COLUMN gps_capturado_at DATETIME NULL DEFAULT NULL',
  'SELECT 1');
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;

-- Columnas de modos en tbl_config_vendedores (qué puede hacer el vendedor
-- desde la app móvil: solo pedidos, factura POS, factura electrónica).
SET @col_mp = (SELECT COUNT(*) FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'tbl_config_vendedores' AND COLUMN_NAME = 'modo_pedidos');
SET @sql = IF(@col_mp = 0,
  'ALTER TABLE tbl_config_vendedores ADD COLUMN modo_pedidos TINYINT(1) NOT NULL DEFAULT 1',
  'SELECT 1');
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;

SET @col_mfp = (SELECT COUNT(*) FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'tbl_config_vendedores' AND COLUMN_NAME = 'modo_factura_pos');
SET @sql = IF(@col_mfp = 0,
  'ALTER TABLE tbl_config_vendedores ADD COLUMN modo_factura_pos TINYINT(1) NOT NULL DEFAULT 0',
  'SELECT 1');
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;

SET @col_mfe = (SELECT COUNT(*) FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'tbl_config_vendedores' AND COLUMN_NAME = 'modo_factura_electronica');
SET @sql = IF(@col_mfe = 0,
  'ALTER TABLE tbl_config_vendedores ADD COLUMN modo_factura_electronica TINYINT(1) NOT NULL DEFAULT 0',
  'SELECT 1');
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;

SELECT '✓ Migración módulo móvil aplicada (lado desktop)' AS resultado;


-- ================================================================
-- LADO LUMEN (hub remoto, BD conta_movil) — NO se ejecuta desde aquí
-- ================================================================
-- Las siguientes sentencias deben correrse MANUALMENTE en la BD Lumen
-- del hub remoto (no en la BD del cliente). Se incluyen como referencia.
--
-- ALTER TABLE cliente_ediciones_log
--   ADD COLUMN sincronizado_desktop TINYINT(1) NOT NULL DEFAULT 0 AFTER fuente,
--   ADD COLUMN fecha_sync_desktop DATETIME NULL DEFAULT NULL AFTER sincronizado_desktop,
--   ADD INDEX idx_ediciones_pendientes (sincronizado_desktop, id_empresa, id);
--
-- ALTER TABLE empresas
--   ADD COLUMN modo_pedidos TINYINT(1) NOT NULL DEFAULT 1,
--   ADD COLUMN modo_factura_pos TINYINT(1) NOT NULL DEFAULT 0,
--   ADD COLUMN modo_factura_electronica TINYINT(1) NOT NULL DEFAULT 0;
--
-- Estos modos los configura cada cliente desde su Conta FT desktop y
-- se propagan al hub vía POST /sync/empresa/modos.


-- ================================================================
-- CHECKLIST DE DESPLIEGUE COMPLETO PARA ACTIVAR EL MÓDULO
-- ================================================================
-- Cuando un cliente contrate el módulo de vendedores móviles, ejecutar:
--
-- [ ] 1. (Hub Lumen) Aplicar el ALTER TABLE de arriba a conta_movil.
-- [ ] 2. (Hub Lumen) Registrar la empresa del cliente en `empresas` con
--        su token_api único.
-- [ ] 3. (Desktop) Ejecutar este archivo sobre la BD del cliente.
-- [ ] 4. (Desktop) En Conta FT → Configuración → Vendedores Móviles:
--        - Encender "Habilitar módulo de vendedores móviles"
--        - Pegar URL del hub, email de la empresa y token_api
--        - Probar conexión
--        - Hacer "⬆️ Subir al hub" para enviar catálogos+clientes
-- [ ] 5. (App móvil) Crear vendedores en Conta FT y hacer push para que
--        existan en Lumen con credenciales (email + clave).
-- [ ] 6. (App móvil) Cada vendedor instala la app y entra con su email
--        + clave demo1234 (o la que se le haya asignado).
--
-- Tras esto, el desktop hará pull automático cada N minutos (config
-- sync_intervalo_pull_min) y traerá pedidos + clientes nuevos +
-- ediciones de clientes automáticamente.
