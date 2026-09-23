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

-- ================================================================
-- CARGUES DE VENDEDORES (Sprint 1 — panaderías / distribuidoras)
-- ================================================================
-- El vendedor registra en la APK los productos que va a llevar hoy en su
-- ruta. Queda 'pendiente'. Admin lo aprueba desde Desktop → descuenta stock
-- + kardex. Vendedor factura durante el día. Al final registra devueltos +
-- dañados + dinero recibido → 'cerrado'. Desktop cuadra.
--
-- Estados: pendiente → aprobado → cerrado (o rechazado desde admin).
--
-- Diseño self-service del vendedor: el vendedor propone, el admin aprueba.
-- Compatible con el ritmo real de una panadería (vendedor sale rápido en la
-- mañana sin depender del admin).

SET @tab_car = (SELECT COUNT(*) FROM information_schema.TABLES
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'tbl_cargues_vendedor');
SET @sql = IF(@tab_car = 0,
    'CREATE TABLE tbl_cargues_vendedor (
        id INT AUTO_INCREMENT PRIMARY KEY,
        id_vendedor_movil INT NOT NULL COMMENT "FK a tbl_vendedores_movil.id (id local desktop)",
        id_cargue_hub INT NULL COMMENT "id de la fila espejo en el hub Lumen — para sync",
        fecha DATE NOT NULL,
        estado VARCHAR(20) NOT NULL DEFAULT "pendiente" COMMENT "pendiente | aprobado | cerrado | rechazado",
        total_valor_cargue DECIMAL(19,4) NOT NULL DEFAULT 0,
        total_valor_devuelto DECIMAL(19,4) NOT NULL DEFAULT 0,
        total_valor_danado DECIMAL(19,4) NOT NULL DEFAULT 0,
        dinero_recibido DECIMAL(19,4) NOT NULL DEFAULT 0,
        notas_vendedor TEXT NULL,
        notas_admin TEXT NULL,
        aprobado_por INT NULL COMMENT "Id_Usuario que aprobó",
        aprobado_at DATETIME NULL,
        cerrado_at DATETIME NULL,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_vendedor_fecha (id_vendedor_movil, fecha),
        INDEX idx_estado (estado),
        INDEX idx_hub (id_cargue_hub)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci',
    'SELECT 1');
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;

SET @tab_det = (SELECT COUNT(*) FROM information_schema.TABLES
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'tbl_cargues_vendedor_detalle');
SET @sql = IF(@tab_det = 0,
    'CREATE TABLE tbl_cargues_vendedor_detalle (
        id INT AUTO_INCREMENT PRIMARY KEY,
        id_cargue INT NOT NULL,
        items INT NOT NULL COMMENT "FK a tblarticulos.Items",
        cant_cargue DECIMAL(19,4) NOT NULL DEFAULT 0 COMMENT "Cantidad entregada al vendedor",
        cant_devuelta DECIMAL(19,4) NOT NULL DEFAULT 0 COMMENT "Cantidad devuelta al cerrar",
        cant_danada DECIMAL(19,4) NOT NULL DEFAULT 0 COMMENT "Cantidad reportada como dañada",
        precio_venta_unitario DECIMAL(19,4) NOT NULL DEFAULT 0 COMMENT "Snapshot del precio al momento del cargue",
        precio_costo_unitario DECIMAL(19,4) NOT NULL DEFAULT 0 COMMENT "Snapshot del costo",
        INDEX idx_cargue (id_cargue),
        INDEX idx_items (items),
        CONSTRAINT fk_cargue_detalle FOREIGN KEY (id_cargue) REFERENCES tbl_cargues_vendedor(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci',
    'SELECT 1');
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;

SELECT '✓ Migración módulo móvil aplicada (lado desktop, incluye cargues)' AS resultado;


-- ================================================================
-- LADO LUMEN (hub remoto, BD conta_movil) — NO se ejecuta desde aquí
-- ================================================================
-- Las siguientes sentencias corren sobre la BD LUMEN del hub remoto
-- (u408713046_contaft_movil en Hostinger), NO sobre la BD del cliente.
-- Todos los ALTER son idempotentes (IF NOT EXISTS — MariaDB 10.0.2+).
--
-- Copiar este bloque y ejecutarlo cuando se hace un deploy del hub:
-- ================================================================
--
-- ALTER TABLE cliente_ediciones_log
--     ADD COLUMN IF NOT EXISTS sincronizado_desktop TINYINT(1) NOT NULL DEFAULT 0 AFTER fuente,
--     ADD COLUMN IF NOT EXISTS fecha_sync_desktop DATETIME NULL DEFAULT NULL AFTER sincronizado_desktop;
--
-- -- El índice necesita chequeo aparte (IF NOT EXISTS no aplica a ADD INDEX)
-- SET @idx := (SELECT COUNT(*) FROM information_schema.STATISTICS
--     WHERE TABLE_SCHEMA = DATABASE()
--       AND TABLE_NAME = 'cliente_ediciones_log'
--       AND INDEX_NAME = 'idx_ediciones_pendientes');
-- SET @sql := IF(@idx = 0,
--     'ALTER TABLE cliente_ediciones_log ADD INDEX idx_ediciones_pendientes (sincronizado_desktop, id_empresa, id)',
--     'SELECT 1');
-- PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
--
-- ALTER TABLE empresas
--     ADD COLUMN IF NOT EXISTS modo_pedidos TINYINT(1) NOT NULL DEFAULT 1,
--     ADD COLUMN IF NOT EXISTS modo_factura_pos TINYINT(1) NOT NULL DEFAULT 0,
--     ADD COLUMN IF NOT EXISTS modo_factura_electronica TINYINT(1) NOT NULL DEFAULT 0;
--
-- Alternativa: `php artisan migrate` en el server Hostinger — ejecuta
-- automáticamente las migraciones Laravel de AppMobilFacturacion/api/database/migrations/
-- incluyendo la 006 que crea sincronizado_desktop.
--
-- Estos modos (modo_pedidos, modo_factura_pos, modo_factura_electronica)
-- los configura cada cliente desde su Conta FT desktop y se propagan al
-- hub vía POST /sync/empresa/modos.


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
