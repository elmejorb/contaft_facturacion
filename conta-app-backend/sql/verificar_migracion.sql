-- ================================================================
-- VERIFICACION DE MIGRACION Conta FT
-- ================================================================
-- Reporta con [OK] o [FALTA] cada elemento critico de la BD.
-- Uso: mysql -uroot -pPASS BD < verificar_migracion.sql
-- ================================================================

SELECT '=== TABLAS DE v4.1+ (deben existir) ===' AS ' ';

SELECT
    IF(EXISTS(SELECT 1 FROM information_schema.TABLES WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='tblcajas'), '[OK]', '[FALTA]') AS tblcajas,
    IF(EXISTS(SELECT 1 FROM information_schema.TABLES WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='tblsesiones_caja'), '[OK]', '[FALTA]') AS tblsesiones_caja,
    IF(EXISTS(SELECT 1 FROM information_schema.TABLES WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='tblmov_caja'), '[OK]', '[FALTA]') AS tblmov_caja,
    IF(EXISTS(SELECT 1 FROM information_schema.TABLES WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='tblcategorias_gasto'), '[OK]', '[FALTA]') AS tblcateg_gasto;

SELECT
    IF(EXISTS(SELECT 1 FROM information_schema.TABLES WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='tblfamilias_producto'), '[OK]', '[FALTA]') AS tblfamilias_producto,
    IF(EXISTS(SELECT 1 FROM information_schema.TABLES WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='tblretenciones'), '[OK]', '[FALTA]') AS tblretenciones,
    IF(EXISTS(SELECT 1 FROM information_schema.TABLES WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='tbletiquetas'), '[OK]', '[FALTA]') AS tbletiquetas,
    IF(EXISTS(SELECT 1 FROM information_schema.TABLES WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='tblproductos_lotes'), '[OK]', '[FALTA]') AS tblprod_lotes;

SELECT
    IF(EXISTS(SELECT 1 FROM information_schema.TABLES WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='electronic_documents'), '[OK]', '[FALTA]') AS electronic_documents,
    IF(EXISTS(SELECT 1 FROM information_schema.TABLES WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='detalle_document_electronic'), '[OK]', '[FALTA]') AS detalle_docs,
    IF(EXISTS(SELECT 1 FROM information_schema.TABLES WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='tblproducto_componentes'), '[OK]', '[FALTA]') AS componentes;

SELECT '=== INDICES CRITICOS DE PERFORMANCE ===' AS ' ';

SELECT
    IF(EXISTS(SELECT 1 FROM information_schema.STATISTICS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='tblventas' AND INDEX_NAME='idx_fecha'), '[OK]', '[FALTA]') AS ventas_idx_fecha,
    IF(EXISTS(SELECT 1 FROM information_schema.STATISTICS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='tblventas' AND INDEX_NAME='idx_cliente_fecha'), '[OK]', '[FALTA]') AS ventas_idx_cliente,
    IF(EXISTS(SELECT 1 FROM information_schema.STATISTICS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='tblventas' AND INDEX_NAME='idx_estado_fecha'), '[OK]', '[FALTA]') AS ventas_idx_estado,
    IF(EXISTS(SELECT 1 FROM information_schema.STATISTICS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='tbldetalle_venta' AND INDEX_NAME='idx_factura'), '[OK]', '[FALTA]') AS detalle_idx_fact,
    IF(EXISTS(SELECT 1 FROM information_schema.STATISTICS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='tblkardex' AND INDEX_NAME='idx_items_fecha'), '[OK]', '[FALTA]') AS kardex_idx_items;

SELECT '=== VISTAS DE CONSOLIDACION ===' AS ' ';

SELECT
    IF(EXISTS(SELECT 1 FROM information_schema.VIEWS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='vw_facturas_cliente_saldos'), '[OK]', '[FALTA]') AS saldos_clientes,
    IF(EXISTS(SELECT 1 FROM information_schema.VIEWS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='vw_productos_stock_bajo'), '[OK]', '[FALTA]') AS stock_bajo,
    IF(EXISTS(SELECT 1 FROM information_schema.VIEWS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='vw_lotes_por_vencer'), '[OK]', '[FALTA]') AS lotes_vencer,
    IF(EXISTS(SELECT 1 FROM information_schema.VIEWS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='vw_prov_cxp_aging'), '[OK]', '[FALTA]') AS cxp_proveedores;

SELECT '=== COLUMNAS NUEVAS (v4.3+) ===' AS ' ';

SELECT
    IF(EXISTS(SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='electronic_documents' AND COLUMN_NAME='customer_name'), '[OK]', '[FALTA]') AS ed_customer_name,
    IF(EXISTS(SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='electronic_documents' AND COLUMN_NAME='customer_email'), '[OK]', '[FALTA]') AS ed_customer_email,
    IF(EXISTS(SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='tblventas' AND COLUMN_NAME='en_contingencia'), '[OK]', '[FALTA]') AS v_contingencia,
    IF(EXISTS(SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='tblventas' AND COLUMN_NAME='cufe'), '[OK]', '[FALTA]') AS v_cufe;

SELECT '=== AUTO_INCREMENT en tablas legacy VB6 (v4.3.73) ===' AS ' ';

SELECT
    IF((SELECT AUTO_INCREMENT FROM information_schema.TABLES WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='tblkardex') IS NOT NULL, '[OK]', '[FALTA]') AS tblkardex_ai,
    IF((SELECT AUTO_INCREMENT FROM information_schema.TABLES WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='tblpedidos') IS NOT NULL, '[OK]', '[FALTA]') AS tblpedidos_ai,
    IF((SELECT AUTO_INCREMENT FROM information_schema.TABLES WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='tblcotizaciones') IS NOT NULL, '[OK]', '[FALTA]') AS tblcotiz_ai;

SELECT '=== DATOS SEED (deben existir) ===' AS ' ';

SELECT
    IFNULL((SELECT COUNT(*) FROM tblretenciones), 0) AS num_retenciones,
    IFNULL((SELECT COUNT(*) FROM tbletiquetas), 0) AS num_etiquetas,
    IFNULL((SELECT COUNT(*) FROM tipos_documentos), 0) AS num_tipos_doc,
    IFNULL((SELECT COUNT(*) FROM type_liabilities), 0) AS num_liab;

SELECT '=== TIPO DE DOC EN CLIENTES (v4.3.75 backfill) ===' AS ' ';

SELECT
    id_documento,
    (SELECT name FROM tipos_documentos WHERE id = c.id_documento) AS tipo,
    COUNT(*) AS clientes
FROM tblclientes c
GROUP BY id_documento
ORDER BY id_documento;

SELECT '=== TAMANO DE LA BD ===' AS ' ';

SELECT
    CONCAT(ROUND(SUM(data_length + index_length)/1048576, 1), ' MB') AS tamano_total,
    COUNT(*) AS num_tablas
FROM information_schema.TABLES
WHERE TABLE_SCHEMA = DATABASE();
