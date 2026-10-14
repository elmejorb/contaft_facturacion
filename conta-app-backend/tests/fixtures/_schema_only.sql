-- MariaDB dump 10.19  Distrib 10.4.32-MariaDB, for Win64 (AMD64)
--
-- Host: localhost    Database: conta_innovacion
-- ------------------------------------------------------
-- Server version	11.4.4-MariaDB

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Table structure for table `_migra46_fe_a_anular`
--

DROP TABLE IF EXISTS `_migra46_fe_a_anular`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `_migra46_fe_a_anular` (
  `Factura_N` int(11) NOT NULL DEFAULT 0,
  `cufe` varchar(200) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci DEFAULT NULL,
  `Total` decimal(19,4) DEFAULT NULL,
  `CodigoCli` int(11) DEFAULT NULL,
  `Fecha` datetime DEFAULT NULL,
  `ed_id` bigint(20) unsigned NOT NULL DEFAULT 0,
  `nfe_numero` varchar(275) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `countries`
--

DROP TABLE IF EXISTS `countries`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `countries` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `code` varchar(255) NOT NULL,
  `name` varchar(255) NOT NULL,
  `iso_code` varchar(255) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=67 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `departments`
--

DROP TABLE IF EXISTS `departments`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `departments` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `country_id` bigint(20) unsigned NOT NULL,
  `code` varchar(255) NOT NULL,
  `name` varchar(255) NOT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `departments_country_id_foreign` (`country_id`)
) ENGINE=InnoDB AUTO_INCREMENT=34 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `detalle_cotizacion`
--

DROP TABLE IF EXISTS `detalle_cotizacion`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `detalle_cotizacion` (
  `id_detalle_cotiza` int(11) NOT NULL AUTO_INCREMENT,
  `item_pro` int(11) NOT NULL,
  `cant_pro` float NOT NULL,
  `precio_v` double NOT NULL,
  `descuento` double NOT NULL,
  `id_cotizacion` int(11) NOT NULL,
  PRIMARY KEY (`id_detalle_cotiza`)
) ENGINE=InnoDB AUTO_INCREMENT=31 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `detalle_document_electronic`
--

DROP TABLE IF EXISTS `detalle_document_electronic`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `detalle_document_electronic` (
  `id_detalle_document` int(11) NOT NULL AUTO_INCREMENT,
  `factura_n` int(11) DEFAULT NULL,
  `items` int(11) DEFAULT NULL COMMENT 'Relación con tblarticulos.Items',
  `unit_measure_id` bigint(20) unsigned DEFAULT NULL COMMENT 'Relación con unit_measures.id',
  `invoiced_quantity` decimal(19,2) DEFAULT NULL,
  `line_extension_amount` decimal(19,2) DEFAULT NULL,
  `free_of_charge_indicator` tinyint(1) DEFAULT 0,
  `description` varchar(255) DEFAULT NULL,
  `type_item_identification_id` int(11) DEFAULT NULL,
  `price_amount` decimal(19,2) DEFAULT NULL,
  `PrecioCosto` decimal(19,4) DEFAULT NULL,
  `discount_amount` decimal(19,2) DEFAULT 0.00,
  `base_quantity` decimal(19,2) DEFAULT NULL,
  `tax_id` int(11) DEFAULT NULL,
  `tax_amount` decimal(19,2) DEFAULT NULL,
  `taxable_amount` decimal(19,2) DEFAULT NULL,
  `tax_percent` decimal(5,2) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NULL DEFAULT NULL ON UPDATE current_timestamp(),
  `entregado` varchar(1) DEFAULT 'S',
  `fecha_entrega` datetime DEFAULT NULL,
  `usuario_entrego` int(11) DEFAULT NULL,
  `cantidad_entregada` decimal(19,2) NOT NULL DEFAULT 0.00,
  PRIMARY KEY (`id_detalle_document`),
  KEY `factura_n` (`factura_n`),
  KEY `items` (`items`),
  KEY `unit_measure_id` (`unit_measure_id`),
  KEY `type_item_identification_id` (`type_item_identification_id`),
  CONSTRAINT `detalle_document_electronic_ibfk_1` FOREIGN KEY (`items`) REFERENCES `tblarticulos` (`Items`),
  CONSTRAINT `detalle_document_electronic_ibfk_2` FOREIGN KEY (`unit_measure_id`) REFERENCES `unit_measures` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=112 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `detalle_fact_abietas`
--

DROP TABLE IF EXISTS `detalle_fact_abietas`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `detalle_fact_abietas` (
  `id_detalle_ab` int(11) NOT NULL AUTO_INCREMENT,
  `id_fac_ab` int(11) NOT NULL,
  `item_pro` int(11) NOT NULL,
  `cant_pro` float NOT NULL,
  `precio_v` double NOT NULL,
  `descuento` double NOT NULL,
  PRIMARY KEY (`id_detalle_ab`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `detalle_factura_recibida`
--

DROP TABLE IF EXISTS `detalle_factura_recibida`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `detalle_factura_recibida` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `factura_recibida_id` int(11) NOT NULL,
  `linea_num` int(11) DEFAULT 1,
  `codigo` varchar(60) DEFAULT NULL,
  `descripcion` varchar(500) DEFAULT NULL,
  `unidad_medida` varchar(20) DEFAULT NULL,
  `cantidad` decimal(15,3) DEFAULT 1.000,
  `precio_unitario` decimal(15,2) DEFAULT 0.00,
  `descuento` decimal(15,2) DEFAULT 0.00,
  `iva_pct` decimal(5,2) DEFAULT 0.00,
  `iva_monto` decimal(15,2) DEFAULT 0.00,
  `subtotal` decimal(15,2) DEFAULT 0.00,
  `total_linea` decimal(15,2) DEFAULT 0.00,
  PRIMARY KEY (`id`),
  KEY `idx_factura` (`factura_recibida_id`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `electronic_documents`
--

DROP TABLE IF EXISTS `electronic_documents`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `electronic_documents` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `origen` varchar(20) DEFAULT 'local',
  `id_vendedor_remoto` int(11) DEFAULT NULL,
  `nombre_vendedor` varchar(150) DEFAULT NULL,
  `fecha` date NOT NULL,
  `cod_cliente` int(11) NOT NULL,
  `customer_identification` varchar(255) DEFAULT NULL,
  `type_document_id` bigint(20) unsigned NOT NULL,
  `resolution_id` bigint(20) unsigned DEFAULT NULL,
  `prefix` varchar(255) DEFAULT NULL,
  `number` bigint(20) unsigned NOT NULL,
  `status` varchar(255) NOT NULL DEFAULT 'enviado',
  `payment_due_days` int(11) DEFAULT NULL,
  `descuento` decimal(19,4) NOT NULL DEFAULT 0.0000,
  `total` decimal(15,2) DEFAULT NULL,
  `payment_form_id` bigint(20) unsigned DEFAULT NULL,
  `payment_method_id` bigint(20) unsigned DEFAULT NULL,
  `dian_response` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`dian_response`)),
  `cufe` varchar(255) DEFAULT NULL,
  `invoice_cufe` varchar(255) DEFAULT NULL COMMENT 'CUFE de la factura referenciada en notas crédito o débito',
  `sent_at` timestamp NULL DEFAULT NULL,
  `id_usuario` int(11) NOT NULL,
  `abono` decimal(19,4) NOT NULL DEFAULT 0.0000,
  `codigoEmp` int(11) NOT NULL DEFAULT 0,
  `id_mediopago` int(11) NOT NULL DEFAULT 0,
  `efectivo` decimal(19,4) NOT NULL DEFAULT 0.0000,
  `valorpagado1` decimal(19,4) NOT NULL DEFAULT 0.0000,
  `pagada` varchar(1) NOT NULL DEFAULT 'N',
  `nota` text DEFAULT NULL,
  `EstadoFact` int(1) NOT NULL DEFAULT 1,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `email_sent` tinyint(1) DEFAULT 0,
  `email_sent_at` datetime DEFAULT NULL,
  `email_status` varchar(50) DEFAULT NULL,
  `email_recipient` varchar(500) DEFAULT NULL,
  `customer_name` varchar(200) DEFAULT NULL,
  `customer_email` varchar(150) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_prefix_number` (`prefix`,`number`),
  KEY `electronic_documents_type_document_id_foreign` (`type_document_id`),
  KEY `electronic_documents_resolution_id_foreign` (`resolution_id`)
) ENGINE=InnoDB AUTO_INCREMENT=113 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `eventos_factura_recibida`
--

DROP TABLE IF EXISTS `eventos_factura_recibida`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `eventos_factura_recibida` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `factura_recibida_id` int(11) NOT NULL,
  `event_code` varchar(4) NOT NULL,
  `event_label` varchar(120) DEFAULT NULL,
  `cude_evento` varchar(200) DEFAULT NULL,
  `event_id_remoto` int(11) DEFAULT NULL,
  `dian_status` varchar(10) DEFAULT NULL,
  `dian_message` text DEFAULT NULL,
  `rejection_code` varchar(10) DEFAULT NULL,
  `rejection_description` varchar(500) DEFAULT NULL,
  `note` text DEFAULT NULL,
  `api_response` longtext DEFAULT NULL,
  `estado` enum('pendiente','aprobado','rechazado') DEFAULT 'pendiente',
  `enviado_at` datetime DEFAULT NULL,
  `usuario_id` int(11) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `aprobado_marker` varchar(4) GENERATED ALWAYS AS (case when `estado` = 'aprobado' then `event_code` else NULL end) STORED,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_solo_aprobado` (`factura_recibida_id`,`aprobado_marker`),
  KEY `idx_factura` (`factura_recibida_id`),
  KEY `idx_estado` (`estado`)
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `facturas_recibidas`
--

DROP TABLE IF EXISTS `facturas_recibidas`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `facturas_recibidas` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `cufe` varchar(200) NOT NULL,
  `tipo_documento` varchar(20) NOT NULL DEFAULT 'invoice',
  `document_type_code` varchar(4) DEFAULT '01',
  `numero` varchar(50) DEFAULT NULL,
  `prefijo` varchar(10) DEFAULT NULL,
  `fecha_emision` date DEFAULT NULL,
  `fecha_recepcion` datetime DEFAULT current_timestamp(),
  `emisor_nit` varchar(30) DEFAULT NULL,
  `emisor_dv` varchar(2) DEFAULT NULL,
  `emisor_nombre` varchar(200) DEFAULT NULL,
  `emisor_organization_type` varchar(2) DEFAULT '1',
  `receptor_nit` varchar(30) DEFAULT NULL,
  `receptor_nombre` varchar(200) DEFAULT NULL,
  `subtotal` decimal(15,2) DEFAULT 0.00,
  `total_iva` decimal(15,2) DEFAULT 0.00,
  `total` decimal(15,2) DEFAULT 0.00,
  `moneda` varchar(3) DEFAULT 'COP',
  `archivo_original_nombre` varchar(255) DEFAULT NULL,
  `xml_filename` varchar(255) DEFAULT NULL,
  `xml_path` varchar(500) DEFAULT NULL,
  `compra_id` int(11) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_cufe` (`cufe`),
  KEY `idx_fecha_emision` (`fecha_emision`),
  KEY `idx_compra` (`compra_id`),
  KEY `idx_emisor` (`emisor_nit`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `facturasv_abiertas`
--

DROP TABLE IF EXISTS `facturasv_abiertas`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `facturasv_abiertas` (
  `id_fac_ab` int(11) NOT NULL AUTO_INCREMENT,
  `fecha` date NOT NULL,
  `termino` varchar(15) NOT NULL,
  `dias` int(11) NOT NULL,
  `codigo_cli` int(11) NOT NULL,
  `identificacion_cli` varchar(15) NOT NULL,
  `nombres_cli` varchar(55) NOT NULL,
  `lista_precio` int(11) NOT NULL,
  `total_factura` double NOT NULL,
  `fecha_hora_creado` datetime NOT NULL,
  PRIMARY KEY (`id_fac_ab`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `municipalities`
--

DROP TABLE IF EXISTS `municipalities`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `municipalities` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `country_id` bigint(20) unsigned NOT NULL,
  `department_id` bigint(20) unsigned NOT NULL,
  `code` varchar(255) NOT NULL,
  `name` varchar(255) NOT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `municipalities_country_id_foreign` (`country_id`),
  KEY `municipalities_department_id_foreign` (`department_id`)
) ENGINE=InnoDB AUTO_INCREMENT=1123 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `payment_methods`
--

DROP TABLE IF EXISTS `payment_methods`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `payment_methods` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `code` varchar(2) NOT NULL,
  `name` varchar(255) NOT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=76 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `taxes`
--

DROP TABLE IF EXISTS `taxes`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `taxes` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(255) NOT NULL,
  `code` varchar(255) NOT NULL,
  `description` varchar(255) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `tbl_clientes_comportamiento`
--

DROP TABLE IF EXISTS `tbl_clientes_comportamiento`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `tbl_clientes_comportamiento` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `CodigoClien` int(11) NOT NULL,
  `comportamiento` enum('sin_datos','excelente','puntual','regular','moroso','critico') DEFAULT 'sin_datos',
  `dias_mora_promedio` int(11) DEFAULT NULL,
  `facturas_evaluadas` int(11) DEFAULT 0,
  `comportamiento_calculado_at` datetime DEFAULT NULL,
  `cartera_castigada` tinyint(1) DEFAULT 0,
  `fecha_castigo` datetime DEFAULT NULL,
  `motivo_castigo` enum('cliente_perdido','empresa_cerrada','no_localizable','acuerdo_fallido','otro') DEFAULT NULL,
  `motivo_detalle` varchar(255) DEFAULT NULL,
  `id_usuario_castigo` int(11) DEFAULT NULL,
  `nota_cobranza` text DEFAULT NULL,
  `created_at` datetime DEFAULT current_timestamp(),
  `updated_at` datetime DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `CodigoClien` (`CodigoClien`),
  KEY `idx_comportamiento` (`comportamiento`),
  KEY `idx_castigada` (`cartera_castigada`),
  KEY `idx_fecha_castigo` (`fecha_castigo`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `tbl_conceptos_retefuente`
--

DROP TABLE IF EXISTS `tbl_conceptos_retefuente`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `tbl_conceptos_retefuente` (
  `Id_Concepto` int(11) NOT NULL AUTO_INCREMENT,
  `concepto` varchar(255) NOT NULL,
  `base_uvt` decimal(10,2) NOT NULL DEFAULT 0.00 COMMENT 'Base m├¡nima en UVTs para aplicar la retenci├│n',
  `tarifa` decimal(5,2) NOT NULL DEFAULT 0.00 COMMENT 'Porcentaje a retener',
  `tipo_codigo` varchar(5) NOT NULL DEFAULT '06' COMMENT '06=ReteFuente, 05=ReteIVA, 07=ReteICA',
  `activo` tinyint(1) NOT NULL DEFAULT 1,
  `Fecha_Creacion` datetime NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`Id_Concepto`),
  UNIQUE KEY `uk_concepto` (`concepto`)
) ENGINE=InnoDB AUTO_INCREMENT=42 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `tbl_config_vendedores`
--

DROP TABLE IF EXISTS `tbl_config_vendedores`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `tbl_config_vendedores` (
  `id` int(11) NOT NULL DEFAULT 1,
  `habilitado` tinyint(1) DEFAULT 0,
  `api_url` varchar(300) DEFAULT 'https://conta-basic.innovacion-digital.com/api-conta/public',
  `api_email` varchar(150) DEFAULT '',
  `api_token_empresa` varchar(255) DEFAULT '',
  `sync_intervalo_pull_min` int(11) DEFAULT 15,
  `ultimo_pull_ventas` datetime DEFAULT NULL,
  `ultimo_pull_id` int(11) DEFAULT 0,
  `fecha_mod` datetime DEFAULT current_timestamp(),
  `modo_pedidos` tinyint(1) NOT NULL DEFAULT 1,
  `modo_factura_pos` tinyint(1) NOT NULL DEFAULT 0,
  `modo_factura_electronica` tinyint(1) NOT NULL DEFAULT 0,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `tbl_detalle_orden_compra`
--

DROP TABLE IF EXISTS `tbl_detalle_orden_compra`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `tbl_detalle_orden_compra` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `id_oc` int(11) NOT NULL,
  `Items` int(11) NOT NULL COMMENT 'FK tblarticulos.Items',
  `Cantidad` decimal(14,4) NOT NULL,
  `Cantidad_Recibida` decimal(14,4) DEFAULT 0.0000 COMMENT 'Para recepción parcial (V2)',
  `PrecioC` decimal(19,4) NOT NULL COMMENT 'Precio de compra unitario',
  `Iva` decimal(5,2) DEFAULT 0.00,
  `Descuento` decimal(19,4) DEFAULT 0.0000,
  `Subtotal` decimal(19,4) DEFAULT 0.0000,
  PRIMARY KEY (`id`),
  KEY `idx_oc` (`id_oc`),
  KEY `idx_items` (`Items`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `tbl_empleados`
--

DROP TABLE IF EXISTS `tbl_empleados`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `tbl_empleados` (
  `Id_Empleado` int(11) NOT NULL AUTO_INCREMENT,
  `Nombre` varchar(100) NOT NULL,
  `Identificacion` varchar(30) DEFAULT NULL,
  `Cargo` varchar(80) DEFAULT NULL,
  `Salario` decimal(19,4) NOT NULL DEFAULT 0.0000,
  `Tipo_Pago` varchar(15) NOT NULL DEFAULT 'quincenal',
  `Fecha_Ingreso` date DEFAULT NULL,
  `Telefono` varchar(30) DEFAULT NULL,
  `Direccion` varchar(120) DEFAULT NULL,
  `Email` varchar(80) DEFAULT NULL,
  `Observacion` text DEFAULT NULL,
  `Estado` varchar(15) NOT NULL DEFAULT 'activo',
  `Fecha_Retiro` date DEFAULT NULL,
  `Created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `Updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`Id_Empleado`),
  KEY `idx_estado` (`Estado`),
  KEY `idx_identificacion` (`Identificacion`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `tbl_modulos_activos`
--

DROP TABLE IF EXISTS `tbl_modulos_activos`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `tbl_modulos_activos` (
  `Nombre` varchar(50) NOT NULL,
  `Activo` tinyint(1) NOT NULL DEFAULT 0,
  `Descripcion` varchar(200) DEFAULT NULL,
  `Fecha_Activacion` datetime DEFAULT NULL,
  PRIMARY KEY (`Nombre`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `tbl_mov_empleado`
--

DROP TABLE IF EXISTS `tbl_mov_empleado`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `tbl_mov_empleado` (
  `Id_Mov` int(11) NOT NULL AUTO_INCREMENT,
  `Id_Empleado` int(11) NOT NULL,
  `Fecha` datetime NOT NULL DEFAULT current_timestamp(),
  `Tipo` varchar(20) NOT NULL,
  `Valor` decimal(19,4) NOT NULL,
  `Saldo_Acum` decimal(19,4) NOT NULL DEFAULT 0.0000,
  `Cuota_Mensual` decimal(19,4) DEFAULT 0.0000,
  `Observacion` varchar(200) DEFAULT NULL,
  `Vinculado_Tipo` varchar(20) DEFAULT NULL,
  `Vinculado_Id` int(11) DEFAULT NULL,
  `Id_Egreso` int(11) DEFAULT NULL,
  `Id_Nomina` int(11) DEFAULT NULL,
  `Id_Mov_Origen` int(11) DEFAULT NULL,
  `Id_Usuario` int(11) DEFAULT NULL,
  `Estado` varchar(15) NOT NULL DEFAULT 'activo',
  `Created_at` datetime NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`Id_Mov`),
  KEY `idx_empleado_fecha` (`Id_Empleado`,`Fecha`),
  KEY `idx_tipo` (`Tipo`),
  KEY `idx_estado` (`Estado`),
  KEY `idx_mov_origen` (`Id_Mov_Origen`),
  CONSTRAINT `fk_mov_empleado` FOREIGN KEY (`Id_Empleado`) REFERENCES `tbl_empleados` (`Id_Empleado`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `tbl_movs_directos`
--

DROP TABLE IF EXISTS `tbl_movs_directos`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `tbl_movs_directos` (
  `id_mov` int(11) NOT NULL AUTO_INCREMENT,
  `numero_mov` varchar(20) DEFAULT NULL COMMENT 'MD-000001 correlativo',
  `tipo` enum('entrada','salida') NOT NULL,
  `motivo` varchar(50) NOT NULL COMMENT 'ajuste_positivo, regalo_proveedor, devolucion_cliente, traslado, produccion, reingreso, otro | vencido, danado, robo, autoconsumo, regalo_cliente, traslado_salida, correccion, otro',
  `fecha` date NOT NULL,
  `Items` int(11) NOT NULL COMMENT 'FK tblarticulos.Items',
  `Cantidad` decimal(14,4) NOT NULL,
  `Costo_Unitario` decimal(19,4) DEFAULT 0.0000 COMMENT 'CON IVA; 0 = usa costo actual del artículo',
  `Costo_Total` decimal(19,4) DEFAULT 0.0000 COMMENT 'Cantidad × Costo_Unitario efectivo',
  `Concepto` varchar(500) DEFAULT NULL COMMENT 'Texto libre visible en kardex',
  `Id_Usuario` int(11) DEFAULT NULL,
  `Estado` enum('Valida','Anulada') NOT NULL DEFAULT 'Valida',
  `FechaCreacion` datetime DEFAULT current_timestamp(),
  `FechaMod` datetime DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id_mov`),
  UNIQUE KEY `numero_mov` (`numero_mov`),
  KEY `idx_tipo` (`tipo`),
  KEY `idx_fecha` (`fecha`),
  KEY `idx_items` (`Items`),
  KEY `idx_estado` (`Estado`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `tbl_nomina`
--

DROP TABLE IF EXISTS `tbl_nomina`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `tbl_nomina` (
  `Id_Nomina` int(11) NOT NULL AUTO_INCREMENT,
  `Id_Empleado` int(11) NOT NULL,
  `Periodo_Inicio` date NOT NULL,
  `Periodo_Fin` date NOT NULL,
  `Tipo_Periodo` varchar(15) NOT NULL DEFAULT 'quincenal',
  `Salario_Base` decimal(19,4) NOT NULL DEFAULT 0.0000,
  `Horas_Extras` decimal(19,4) NOT NULL DEFAULT 0.0000,
  `Bonificaciones` decimal(19,4) NOT NULL DEFAULT 0.0000,
  `Otros_Ingresos` decimal(19,4) NOT NULL DEFAULT 0.0000,
  `Total_Devengado` decimal(19,4) NOT NULL DEFAULT 0.0000,
  `Total_Deducciones` decimal(19,4) NOT NULL DEFAULT 0.0000,
  `Neto` decimal(19,4) NOT NULL DEFAULT 0.0000,
  `Origen_Pago` varchar(20) NOT NULL DEFAULT 'caja_general',
  `Id_Banco` int(11) DEFAULT NULL,
  `Id_Egreso` int(11) DEFAULT NULL,
  `Fecha_Pago` datetime NOT NULL DEFAULT current_timestamp(),
  `Observacion` text DEFAULT NULL,
  `Id_Usuario` int(11) DEFAULT NULL,
  `Estado` varchar(15) NOT NULL DEFAULT 'pagada',
  `Created_at` datetime NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`Id_Nomina`),
  KEY `idx_empleado_periodo` (`Id_Empleado`,`Periodo_Inicio`,`Periodo_Fin`),
  KEY `idx_estado` (`Estado`),
  KEY `idx_fecha_pago` (`Fecha_Pago`),
  CONSTRAINT `fk_nomina_empleado` FOREIGN KEY (`Id_Empleado`) REFERENCES `tbl_empleados` (`Id_Empleado`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `tbl_nomina_detalle`
--

DROP TABLE IF EXISTS `tbl_nomina_detalle`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `tbl_nomina_detalle` (
  `Id_Detalle` int(11) NOT NULL AUTO_INCREMENT,
  `Id_Nomina` int(11) NOT NULL,
  `Tipo` varchar(20) NOT NULL,
  `Id_Mov_Origen` int(11) DEFAULT NULL,
  `Concepto` varchar(200) NOT NULL,
  `Valor_Deducido` decimal(19,4) NOT NULL,
  PRIMARY KEY (`Id_Detalle`),
  KEY `idx_nomina` (`Id_Nomina`),
  CONSTRAINT `fk_nomdet_nomina` FOREIGN KEY (`Id_Nomina`) REFERENCES `tbl_nomina` (`Id_Nomina`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `tbl_ordenes_compra`
--

DROP TABLE IF EXISTS `tbl_ordenes_compra`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `tbl_ordenes_compra` (
  `id_oc` int(11) NOT NULL AUTO_INCREMENT,
  `numero_oc` varchar(20) DEFAULT NULL,
  `fecha` date NOT NULL,
  `fecha_entrega` date DEFAULT NULL,
  `CodigoPro` int(11) NOT NULL,
  `Impuesto` decimal(19,4) DEFAULT 0.0000,
  `Descuento` decimal(19,4) DEFAULT 0.0000,
  `Flete` decimal(19,4) DEFAULT 0.0000,
  `Retencion` decimal(19,4) DEFAULT 0.0000,
  `Total` decimal(19,4) DEFAULT 0.0000,
  `Estado` enum('Pendiente','Parcial','Recibida','Anulada') NOT NULL DEFAULT 'Pendiente',
  `pedido_generado_n` int(11) DEFAULT NULL COMMENT 'FK a tblpedidos.Pedido_N cuando se recibe la mercancía',
  `Comentario` text DEFAULT NULL,
  `Id_Usuario` int(11) DEFAULT NULL,
  `FechaCreacion` datetime DEFAULT current_timestamp(),
  `FechaMod` datetime DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id_oc`),
  UNIQUE KEY `numero_oc` (`numero_oc`),
  KEY `idx_estado` (`Estado`),
  KEY `idx_proveedor` (`CodigoPro`),
  KEY `idx_fecha` (`fecha`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `tbl_pedidos_vendedor`
--

DROP TABLE IF EXISTS `tbl_pedidos_vendedor`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `tbl_pedidos_vendedor` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `id_remoto` int(11) NOT NULL,
  `numero_pedido` varchar(30) DEFAULT NULL,
  `id_cliente_remoto` int(11) DEFAULT NULL,
  `nombre_cliente` varchar(200) DEFAULT NULL,
  `nit_cliente` varchar(30) DEFAULT NULL,
  `id_vendedor_remoto` int(11) DEFAULT NULL,
  `nombre_vendedor` varchar(150) DEFAULT NULL,
  `fecha` date DEFAULT NULL,
  `subtotal` decimal(14,2) DEFAULT 0.00,
  `impuestos` decimal(14,2) DEFAULT 0.00,
  `total` decimal(14,2) DEFAULT 0.00,
  `forma_pago` varchar(30) DEFAULT NULL,
  `observaciones` text DEFAULT NULL,
  `estado` varchar(30) DEFAULT 'pendiente',
  `items_json` longtext DEFAULT NULL,
  `convertido_factura_n` int(11) DEFAULT NULL,
  `fecha_descarga` datetime DEFAULT current_timestamp(),
  `fecha_mod` datetime DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_remoto` (`id_remoto`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `tbl_retenciones_factura`
--

DROP TABLE IF EXISTS `tbl_retenciones_factura`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `tbl_retenciones_factura` (
  `Id_RetencionFact` int(11) NOT NULL AUTO_INCREMENT,
  `Factura_N` int(11) DEFAULT NULL COMMENT 'FK a tblventas (POS/legacy)',
  `FE_Id` int(11) DEFAULT NULL COMMENT 'FK a electronic_documents.id (flujo nuevo)',
  `concepto_label` varchar(255) NOT NULL,
  `concepto_ref_id` int(11) DEFAULT NULL,
  `impuesto_ref_id` int(11) DEFAULT NULL,
  `tipo_codigo` varchar(5) NOT NULL DEFAULT '06',
  `base_kind` varchar(10) NOT NULL DEFAULT 'subtotal',
  `base` decimal(15,2) NOT NULL DEFAULT 0.00,
  `tarifa` decimal(5,2) NOT NULL DEFAULT 0.00,
  `monto` decimal(15,2) NOT NULL DEFAULT 0.00,
  `Fecha` datetime NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`Id_RetencionFact`),
  KEY `idx_factpos` (`Factura_N`),
  KEY `idx_factfe` (`FE_Id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `tbl_retenciones_pago`
--

DROP TABLE IF EXISTS `tbl_retenciones_pago`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `tbl_retenciones_pago` (
  `Id_RetencionPago` int(11) NOT NULL AUTO_INCREMENT,
  `Id_Pagos` int(11) NOT NULL COMMENT 'FK a tblpagos',
  `concepto_label` varchar(255) NOT NULL COMMENT 'Nombre descriptivo (snapshot)',
  `concepto_ref_id` int(11) DEFAULT NULL COMMENT 'FK a tbl_conceptos_retefuente si aplica',
  `impuesto_ref_id` int(11) DEFAULT NULL COMMENT 'FK a tblretenciones si aplica',
  `tipo_codigo` varchar(5) NOT NULL DEFAULT '06',
  `base_kind` varchar(10) NOT NULL DEFAULT 'subtotal' COMMENT 'subtotal|iva|total|custom',
  `base` decimal(15,2) NOT NULL DEFAULT 0.00,
  `tarifa` decimal(5,2) NOT NULL DEFAULT 0.00,
  `monto` decimal(15,2) NOT NULL DEFAULT 0.00,
  `Fecha` datetime NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`Id_RetencionPago`),
  KEY `idx_pago` (`Id_Pagos`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `tbl_sync_estado`
--

DROP TABLE IF EXISTS `tbl_sync_estado`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `tbl_sync_estado` (
  `Id` int(11) NOT NULL DEFAULT 1,
  `Last_Sync_At` datetime DEFAULT NULL,
  `Last_Error_At` datetime DEFAULT NULL,
  `Last_Error` varchar(500) DEFAULT NULL,
  `Pendientes_Cnt` int(11) NOT NULL DEFAULT 0,
  PRIMARY KEY (`Id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `tbl_sync_outbox`
--

DROP TABLE IF EXISTS `tbl_sync_outbox`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `tbl_sync_outbox` (
  `Id_Outbox` bigint(20) NOT NULL AUTO_INCREMENT,
  `Entidad` varchar(30) NOT NULL,
  `Id_Entidad` varchar(50) NOT NULL,
  `Operacion` varchar(10) NOT NULL DEFAULT 'upsert',
  `Payload` text DEFAULT NULL,
  `Enviado` tinyint(1) NOT NULL DEFAULT 0,
  `Intentos` int(11) NOT NULL DEFAULT 0,
  `Ultimo_Error` varchar(500) DEFAULT NULL,
  `Fecha_Creacion` datetime NOT NULL DEFAULT current_timestamp(),
  `Fecha_Envio` datetime DEFAULT NULL,
  `Prox_Reintento` datetime DEFAULT NULL,
  PRIMARY KEY (`Id_Outbox`),
  KEY `idx_pending` (`Enviado`,`Prox_Reintento`),
  KEY `idx_entidad` (`Entidad`,`Id_Entidad`)
) ENGINE=InnoDB AUTO_INCREMENT=14 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `tbl_traslados_bodega`
--

DROP TABLE IF EXISTS `tbl_traslados_bodega`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `tbl_traslados_bodega` (
  `Id_Traslado` int(11) NOT NULL AUTO_INCREMENT,
  `Fecha` datetime NOT NULL DEFAULT current_timestamp(),
  `Id_Bodega_Origen` int(11) NOT NULL,
  `Id_Bodega_Destino` int(11) NOT NULL,
  `Items` int(11) NOT NULL COMMENT 'FK tblarticulos.Items ÔÇö producto trasladado',
  `Cantidad` decimal(19,4) NOT NULL COMMENT 'Existencia al momento del traslado (snapshot informativo)',
  `Comentario` varchar(300) DEFAULT NULL,
  `Id_Usuario` int(11) DEFAULT NULL,
  PRIMARY KEY (`Id_Traslado`),
  KEY `idx_items` (`Items`),
  KEY `idx_bodegas` (`Id_Bodega_Origen`,`Id_Bodega_Destino`),
  KEY `idx_fecha` (`Fecha`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `tbl_vendedores_movil`
--

DROP TABLE IF EXISTS `tbl_vendedores_movil`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `tbl_vendedores_movil` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `id_remoto` int(11) DEFAULT NULL,
  `codigo` varchar(20) NOT NULL,
  `nombre` varchar(150) NOT NULL,
  `email` varchar(150) NOT NULL,
  `password_hash` varchar(255) NOT NULL,
  `telefono` varchar(30) DEFAULT NULL,
  `cedula` varchar(30) DEFAULT NULL,
  `zona` varchar(100) DEFAULT NULL,
  `can_edit_clients` tinyint(1) DEFAULT 1,
  `activo` tinyint(1) DEFAULT 1,
  `sincronizado` tinyint(1) DEFAULT 0,
  `fecha_mod` datetime DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_codigo` (`codigo`),
  UNIQUE KEY `uk_email` (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `tblanticipo_movs`
--

DROP TABLE IF EXISTS `tblanticipo_movs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `tblanticipo_movs` (
  `Id_Mov` int(11) NOT NULL AUTO_INCREMENT,
  `Id_Anticipo` int(11) NOT NULL,
  `Fecha` date NOT NULL,
  `Tipo` varchar(15) NOT NULL COMMENT 'Aplicacion | Devolucion | Reverso',
  `Valor` decimal(15,2) NOT NULL COMMENT 'Valor consumido (Aplicacion) o devuelto (Devolucion)',
  `Factura_N` int(11) DEFAULT NULL COMMENT 'Factura de venta donde se aplicó (si Tipo=Aplicacion)',
  `Concepto` varchar(200) DEFAULT NULL,
  `id_mediopago` int(11) DEFAULT NULL COMMENT 'Solo para Devolucion — cómo se le devolvió al cliente',
  `Id_Usuario` int(11) DEFAULT NULL,
  `Estado` varchar(10) NOT NULL DEFAULT 'Valida' COMMENT 'Valida | Anulada',
  `FechaCreacion` timestamp NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`Id_Mov`),
  KEY `idx_anticipo` (`Id_Anticipo`),
  KEY `idx_factura` (`Factura_N`),
  KEY `idx_fecha` (`Fecha`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `tblanticipos_cliente`
--

DROP TABLE IF EXISTS `tblanticipos_cliente`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `tblanticipos_cliente` (
  `Id_Anticipo` int(11) NOT NULL AUTO_INCREMENT,
  `Consecutivo` varchar(20) DEFAULT NULL COMMENT 'ANT-XXXX autogenerado',
  `Fecha` date NOT NULL,
  `CodigoCli` int(11) NOT NULL COMMENT 'CodigoClien del cliente',
  `Valor` decimal(15,2) NOT NULL COMMENT 'Monto original entregado',
  `Saldo` decimal(15,2) NOT NULL COMMENT 'Cuánto queda disponible',
  `id_mediopago` int(11) NOT NULL DEFAULT 0 COMMENT '0=Efectivo 1=Tarjeta 2=Bancolombia 3=Nequi',
  `Concepto` varchar(200) DEFAULT NULL,
  `Id_Usuario` int(11) DEFAULT NULL,
  `Estado` varchar(15) NOT NULL DEFAULT 'Vigente' COMMENT 'Vigente | Aplicado | Devuelto | Anulado',
  `FechaCreacion` timestamp NULL DEFAULT current_timestamp(),
  `FechaMod` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`Id_Anticipo`),
  KEY `idx_cliente` (`CodigoCli`),
  KEY `idx_estado` (`Estado`),
  KEY `idx_fecha` (`Fecha`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `tblarticulos`
--

DROP TABLE IF EXISTS `tblarticulos`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `tblarticulos` (
  `Items` int(11) NOT NULL,
  `Codigo` varchar(25) DEFAULT NULL,
  `CodigoB` varchar(15) DEFAULT NULL,
  `Nombres_Articulo` varchar(150) DEFAULT NULL,
  `Id_Categoria` int(11) DEFAULT NULL,
  `Id_Referencia` int(11) DEFAULT NULL,
  `Existencia` float DEFAULT NULL,
  `Existencia_minima` float DEFAULT NULL,
  `Precio_Costo` decimal(19,4) DEFAULT NULL,
  `Precio_CostoComp` decimal(19,4) DEFAULT NULL,
  `Iva` float DEFAULT NULL,
  `Precio_Venta` decimal(19,4) DEFAULT NULL,
  `Precio_Venta_Empaque` decimal(19,4) DEFAULT NULL,
  `Precio_Venta2` decimal(19,4) DEFAULT NULL,
  `Precio_Venta3` decimal(19,4) DEFAULT NULL,
  `Fecha_Vencimiento` datetime DEFAULT NULL,
  `CodigoPro` int(11) DEFAULT NULL,
  `Estante` varchar(10) DEFAULT NULL,
  `Flete` decimal(19,4) DEFAULT NULL,
  `ArticuloDe` varchar(10) DEFAULT NULL,
  `Ganancia` int(11) DEFAULT NULL,
  `Sindescuento` tinyint(1) DEFAULT NULL,
  `Precio_Minimo` decimal(19,4) DEFAULT NULL,
  `PlanSepare` int(11) DEFAULT NULL,
  `Servicio` int(11) DEFAULT NULL,
  `Unidades` int(11) DEFAULT NULL,
  `nombre_empaque` varchar(30) DEFAULT NULL COMMENT 'Ej: Caja x100, Blister x10',
  `CuponDesc` int(11) DEFAULT NULL,
  `Estado` int(11) DEFAULT NULL,
  `FechaElim` datetime DEFAULT NULL,
  `FechaMod` datetime DEFAULT NULL,
  `unit_measure_id` int(11) DEFAULT 70,
  `free_of_charge_indicator` tinyint(1) DEFAULT 0,
  `unidad_base` varchar(20) DEFAULT 'Unidad',
  `requiere_lote` tinyint(1) DEFAULT 0,
  `tiene_componentes` tinyint(1) DEFAULT 0,
  `Id_Etiqueta` int(11) DEFAULT NULL,
  `FactorConversion` int(11) NOT NULL DEFAULT 1 COMMENT 'Unidades por empaque. 1=sin conversion',
  `NombreEmpaque` varchar(30) DEFAULT 'CAJA',
  `VenderComoEmpaque` tinyint(1) NOT NULL DEFAULT 0,
  `ComprarComoEmpaque` tinyint(1) NOT NULL DEFAULT 0,
  `Id_Bodega` int(11) NOT NULL DEFAULT 1 COMMENT 'FK tblbodegas ÔÇö bodega actual del producto (modelo mono-bodega)',
  PRIMARY KEY (`Items`),
  KEY `Codigo` (`Codigo`),
  KEY `Nombres_Articulo` (`Nombres_Articulo`),
  KEY `idx_codigo` (`Codigo`),
  KEY `idx_items` (`Items`),
  KEY `idx_categoria` (`Id_Categoria`),
  KEY `idx_referencia` (`Id_Referencia`),
  KEY `idx_estado` (`Estado`),
  KEY `idx_codigopro` (`CodigoPro`),
  KEY `idx_nombre_articulo` (`Nombres_Articulo`(30)),
  KEY `idx_etiqueta` (`Id_Etiqueta`),
  KEY `idx_id_bodega` (`Id_Bodega`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3 COLLATE=utf8mb3_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `tblarticulos2`
--

DROP TABLE IF EXISTS `tblarticulos2`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `tblarticulos2` (
  `Items` int(11) NOT NULL,
  `Codigo` varchar(25) DEFAULT NULL,
  `CodigoB` varchar(15) DEFAULT NULL,
  `Nombres_Articulo` varchar(150) DEFAULT NULL,
  `Id_Categoria` int(11) DEFAULT NULL,
  `Id_Referencia` int(11) DEFAULT NULL,
  `Existencia` float DEFAULT NULL,
  `Existencia_minima` float DEFAULT NULL,
  `Precio_Costo` decimal(19,4) DEFAULT NULL,
  `Precio_CostoComp` decimal(19,4) DEFAULT NULL,
  `Iva` float DEFAULT NULL,
  `Precio_Venta` decimal(19,4) DEFAULT NULL,
  `Precio_Venta2` decimal(19,4) DEFAULT NULL,
  `Precio_Venta3` decimal(19,4) DEFAULT NULL,
  `Fecha_Vencimiento` datetime DEFAULT NULL,
  `CodigoPro` int(11) DEFAULT NULL,
  `Estante` varchar(10) DEFAULT NULL,
  `Flete` decimal(19,4) DEFAULT NULL,
  `ArticuloDe` varchar(10) DEFAULT NULL,
  `Ganancia` int(11) DEFAULT NULL,
  `Sindescuento` tinyint(1) DEFAULT NULL,
  `Precio_Minimo` decimal(19,4) DEFAULT NULL,
  `PlanSepare` int(11) DEFAULT NULL,
  `Servicio` int(11) DEFAULT NULL,
  `Unidades` int(11) DEFAULT NULL,
  `CuponDesc` int(11) DEFAULT NULL,
  `Estado` int(11) DEFAULT NULL,
  `FechaElim` datetime DEFAULT NULL,
  `FechaMod` datetime DEFAULT NULL,
  `unit_measure_id` int(11) DEFAULT 70,
  `free_of_charge_indicator` tinyint(1) DEFAULT 0,
  PRIMARY KEY (`Items`),
  KEY `Codigo` (`Codigo`),
  KEY `Nombres_Articulo` (`Nombres_Articulo`),
  KEY `idx_codigo` (`Codigo`),
  KEY `idx_items` (`Items`),
  KEY `idx_categoria` (`Id_Categoria`),
  KEY `idx_referencia` (`Id_Referencia`),
  KEY `idx_estado` (`Estado`),
  KEY `idx_codigopro` (`CodigoPro`),
  KEY `idx_nombre_articulo` (`Nombres_Articulo`(30))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3 COLLATE=utf8mb3_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `tblauxiliarbanco`
--

DROP TABLE IF EXISTS `tblauxiliarbanco`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `tblauxiliarbanco` (
  `idAuxiliarBanco` int(11) NOT NULL,
  `FechaCreacion` datetime DEFAULT NULL,
  `idBancos` int(11) NOT NULL,
  `Detalle` varchar(100) NOT NULL,
  `Valor` decimal(19,4) NOT NULL,
  `NRecivo` int(11) DEFAULT NULL,
  `NFactura` int(11) DEFAULT NULL,
  `TipoMov` int(11) DEFAULT NULL,
  `NRemision` int(11) DEFAULT NULL
) ENGINE=MyISAM DEFAULT CHARSET=utf8mb3 COLLATE=utf8mb3_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `tblauxiliares`
--

DROP TABLE IF EXISTS `tblauxiliares`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `tblauxiliares` (
  `Id_Auxiliar` int(11) NOT NULL DEFAULT 0,
  `Año` int(11) DEFAULT 0,
  `Fecha` timestamp NOT NULL DEFAULT current_timestamp(),
  `Mes` varchar(15) DEFAULT 'Enero',
  `Cuenta` varchar(50) DEFAULT '000',
  `Detalle` varchar(150) DEFAULT '-',
  `C_D` int(11) DEFAULT 0,
  `Debe` decimal(19,4) DEFAULT 0.0000,
  `Haber` decimal(19,4) DEFAULT 0.0000,
  `Saldo` decimal(19,4) DEFAULT 0.0000,
  PRIMARY KEY (`Id_Auxiliar`),
  KEY `Id_Auxiliar` (`Id_Auxiliar`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3 COLLATE=utf8mb3_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `tblbancos`
--

DROP TABLE IF EXISTS `tblbancos`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `tblbancos` (
  `idBancos` int(11) NOT NULL AUTO_INCREMENT,
  `FechaCreacion` datetime DEFAULT NULL,
  `NumCuenta` varchar(50) NOT NULL,
  `NomCuenta` varchar(45) NOT NULL,
  `Predeterminada` int(11) DEFAULT NULL,
  `Saldo` decimal(19,4) DEFAULT 0.0000,
  `Banco` varchar(50) DEFAULT '',
  `TipoCuenta` varchar(20) DEFAULT 'ahorros',
  `Activa` tinyint(1) DEFAULT 1,
  PRIMARY KEY (`idBancos`)
) ENGINE=MyISAM AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb3 COLLATE=utf8mb3_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `tblbodegas`
--

DROP TABLE IF EXISTS `tblbodegas`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `tblbodegas` (
  `Id_Bodega` int(11) NOT NULL AUTO_INCREMENT,
  `Nombre` varchar(80) NOT NULL,
  `Direccion` varchar(200) DEFAULT NULL,
  `Telefono` varchar(50) DEFAULT NULL,
  `Principal` tinyint(1) NOT NULL DEFAULT 0 COMMENT '1 = bodega principal (default de nuevos productos)',
  `Activa` tinyint(1) NOT NULL DEFAULT 1,
  `FechaMod` datetime DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`Id_Bodega`),
  UNIQUE KEY `uq_nombre` (`Nombre`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `tblcajas`
--

DROP TABLE IF EXISTS `tblcajas`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `tblcajas` (
  `Id_Caja` int(11) NOT NULL AUTO_INCREMENT,
  `Nombre` varchar(50) NOT NULL,
  `Tipo` enum('punto_venta','principal') DEFAULT 'punto_venta',
  `Activa` tinyint(1) DEFAULT 1,
  `Saldo` decimal(19,4) DEFAULT 0.0000,
  `FechaCreacion` datetime DEFAULT current_timestamp(),
  PRIMARY KEY (`Id_Caja`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `tblcategoria`
--

DROP TABLE IF EXISTS `tblcategoria`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `tblcategoria` (
  `Categoria` varchar(100) DEFAULT NULL,
  `Id_Categoria` int(11) NOT NULL,
  PRIMARY KEY (`Id_Categoria`)
) ENGINE=MyISAM DEFAULT CHARSET=utf8mb3 COLLATE=utf8mb3_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `tblcategorias_gasto`
--

DROP TABLE IF EXISTS `tblcategorias_gasto`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `tblcategorias_gasto` (
  `Id_Categoria` int(11) NOT NULL AUTO_INCREMENT,
  `Nombre` varchar(50) NOT NULL,
  `Activa` tinyint(1) DEFAULT 1,
  PRIMARY KEY (`Id_Categoria`)
) ENGINE=InnoDB AUTO_INCREMENT=11 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `tblcliente_retenciones`
--

DROP TABLE IF EXISTS `tblcliente_retenciones`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `tblcliente_retenciones` (
  `Id` int(11) NOT NULL AUTO_INCREMENT,
  `CodigoClien` int(11) NOT NULL,
  `Id_Retencion` int(11) NOT NULL,
  PRIMARY KEY (`Id`),
  UNIQUE KEY `uk_cli_ret` (`CodigoClien`,`Id_Retencion`),
  KEY `idx_cliente` (`CodigoClien`),
  KEY `fk_cliret_ret` (`Id_Retencion`),
  CONSTRAINT `fk_cliret_ret` FOREIGN KEY (`Id_Retencion`) REFERENCES `tblretenciones` (`Id_Retencion`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `tblclientes`
--

DROP TABLE IF EXISTS `tblclientes`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `tblclientes` (
  `CodigoClien` int(11) NOT NULL,
  `Razon_Social` varchar(80) DEFAULT NULL,
  `Nit` varchar(15) DEFAULT NULL,
  `Direcion_R` varchar(50) DEFAULT NULL,
  `Nombres` varchar(20) DEFAULT NULL,
  `Apellidos` varchar(20) DEFAULT NULL,
  `Identificacion` int(11) DEFAULT NULL,
  `Telefonos` varchar(100) DEFAULT NULL,
  `Direccion` varchar(50) DEFAULT NULL,
  `Nombre_C` varchar(50) DEFAULT NULL,
  `Apellidos_C` varchar(50) DEFAULT NULL,
  `Telefonos_C` varchar(50) DEFAULT NULL,
  `Direccion_C` varchar(50) DEFAULT NULL,
  `Cargo_C` varchar(50) DEFAULT NULL,
  `Fecha_Ingreso` datetime DEFAULT NULL,
  `CupoAutorizado` decimal(19,4) DEFAULT NULL,
  `Preciocosto` tinyint(1) DEFAULT NULL,
  `CodigoEmp` int(11) DEFAULT NULL,
  `FechaCumple` datetime DEFAULT NULL,
  `Email` varchar(50) DEFAULT NULL,
  `Whatsapp` varchar(25) NOT NULL,
  `Termino` int(11) DEFAULT NULL,
  `FacVenc` int(11) DEFAULT NULL,
  `FechaMod` datetime DEFAULT NULL,
  `id_documento` int(11) NOT NULL DEFAULT 2,
  `id_municipio` bigint(20) unsigned DEFAULT NULL,
  `id_type_liability` bigint(20) unsigned DEFAULT NULL,
  `id_type_organization` bigint(20) unsigned DEFAULT NULL,
  `id_type_regime` bigint(20) unsigned DEFAULT NULL,
  `retencion_modo` enum('informativo','gross_up') DEFAULT 'gross_up',
  `comportamiento` enum('sin_datos','excelente','puntual','regular','moroso','critico') DEFAULT 'sin_datos',
  `dias_mora_promedio` int(11) DEFAULT NULL,
  `cartera_castigada` tinyint(1) DEFAULT 0,
  `fecha_castigo` datetime DEFAULT NULL,
  `motivo_castigo` enum('cliente_perdido','empresa_cerrada','no_localizable','acuerdo_fallido','otro') DEFAULT NULL,
  `motivo_detalle` varchar(255) DEFAULT NULL,
  `id_usuario_castigo` int(11) DEFAULT NULL,
  `nota_cobranza` text DEFAULT NULL,
  `UltimoPrecio` tinyint(1) DEFAULT 0,
  PRIMARY KEY (`CodigoClien`),
  KEY `idx_cartera_castigada` (`cartera_castigada`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3 COLLATE=utf8mb3_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `tblcomprobantediario`
--

DROP TABLE IF EXISTS `tblcomprobantediario`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `tblcomprobantediario` (
  `N_Comprobante` int(11) NOT NULL DEFAULT 0,
  `Fecha` datetime DEFAULT NULL,
  `FacturaInicial` int(11) DEFAULT 0,
  `FacturaFinal` int(11) DEFAULT 0,
  `Acumulado` decimal(19,4) DEFAULT 0.0000,
  PRIMARY KEY (`N_Comprobante`)
) ENGINE=MyISAM DEFAULT CHARSET=utf8mb3 COLLATE=utf8mb3_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `tblconteo_detalle`
--

DROP TABLE IF EXISTS `tblconteo_detalle`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `tblconteo_detalle` (
  `Id_Detalle` int(11) NOT NULL AUTO_INCREMENT,
  `Id_Conteo` int(11) NOT NULL,
  `Items` int(11) NOT NULL,
  `Existencia_Sistema` float NOT NULL DEFAULT 0,
  `Existencia_Contada` float DEFAULT NULL,
  `Diferencia` float DEFAULT NULL,
  `Observacion` varchar(100) DEFAULT '',
  PRIMARY KEY (`Id_Detalle`),
  UNIQUE KEY `uk_conteo_item` (`Id_Conteo`,`Items`),
  KEY `idx_conteo` (`Id_Conteo`),
  KEY `idx_items` (`Items`)
) ENGINE=InnoDB AUTO_INCREMENT=54 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `tblconteo_inventario`
--

DROP TABLE IF EXISTS `tblconteo_inventario`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `tblconteo_inventario` (
  `Id_Conteo` int(11) NOT NULL AUTO_INCREMENT,
  `Fecha` datetime NOT NULL,
  `Usuario` varchar(50) NOT NULL,
  `Observacion` varchar(255) DEFAULT '',
  `Tipo` varchar(20) DEFAULT 'Total',
  `Filtro_Categoria` int(11) DEFAULT NULL,
  `Filtro_Proveedor` int(11) DEFAULT NULL,
  `Total_Items` int(11) DEFAULT 0,
  `Items_Contados` int(11) DEFAULT 0,
  `Items_Con_Diferencia` int(11) DEFAULT 0,
  `Estado` enum('Abierto','Cerrado','Cancelado') DEFAULT 'Abierto',
  `Fecha_Cierre` datetime DEFAULT NULL,
  PRIMARY KEY (`Id_Conteo`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `tblconteodeinventario`
--

DROP TABLE IF EXISTS `tblconteodeinventario`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `tblconteodeinventario` (
  `Cod_ConteoInv` int(11) NOT NULL,
  `FechaYHoraInicio` datetime DEFAULT NULL,
  `FechaYhoraFinalizar` datetime DEFAULT NULL,
  `EnConteo` tinyint(1) DEFAULT NULL
) ENGINE=MyISAM DEFAULT CHARSET=utf8mb3 COLLATE=utf8mb3_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `tblcontrolcaja`
--

DROP TABLE IF EXISTS `tblcontrolcaja`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `tblcontrolcaja` (
  `Cod_ControlCaja` int(11) NOT NULL AUTO_INCREMENT,
  `Fecha` timestamp NOT NULL DEFAULT current_timestamp(),
  `ValorInicalCaja` decimal(19,4) DEFAULT 0.0000,
  `Villetes` decimal(19,4) DEFAULT 0.0000,
  `Monedas` decimal(19,4) DEFAULT 0.0000,
  `Cheques` decimal(19,4) DEFAULT 0.0000,
  `ValorTotal` decimal(19,4) DEFAULT 0.0000,
  `SaldoEnLibros` decimal(19,4) DEFAULT 0.0000,
  `Diferencia` decimal(19,4) DEFAULT 0.0000,
  `Base` decimal(19,4) DEFAULT 0.0000,
  `Estado` tinyint(1) DEFAULT NULL,
  `VContado` decimal(19,4) DEFAULT 0.0000,
  `VCredito` decimal(19,4) DEFAULT 0.0000,
  `Pagos` decimal(19,4) DEFAULT 0.0000,
  `Egresos` decimal(19,4) DEFAULT 0.0000,
  `VInventario` decimal(19,4) DEFAULT 0.0000,
  `Id_Usuario` int(11) DEFAULT NULL,
  `FechaCierre` datetime DEFAULT NULL,
  PRIMARY KEY (`Cod_ControlCaja`)
) ENGINE=InnoDB AUTO_INCREMENT=10 DEFAULT CHARSET=utf8mb3 COLLATE=utf8mb3_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `tblcotizaciones`
--

DROP TABLE IF EXISTS `tblcotizaciones`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `tblcotizaciones` (
  `id_cotizacion` int(11) NOT NULL AUTO_INCREMENT,
  `codigo_cli` int(11) NOT NULL,
  `nombre_cliente` varchar(50) NOT NULL,
  `telefono_cli` varchar(25) NOT NULL,
  `fecha` date NOT NULL,
  `termino` int(11) NOT NULL,
  `dias` int(11) NOT NULL,
  `total_factura` double NOT NULL,
  `fecha_hora_creado` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id_cotizacion`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `tblcuadrecaja`
--

DROP TABLE IF EXISTS `tblcuadrecaja`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `tblcuadrecaja` (
  `Id_CuadreCaja` int(11) NOT NULL AUTO_INCREMENT,
  `Fecha` datetime DEFAULT NULL,
  `FacturaN` int(11) DEFAULT 0,
  `TipoDoc` varchar(20) DEFAULT NULL,
  `Descripcion` varchar(80) DEFAULT NULL,
  `Valor` decimal(19,4) DEFAULT 0.0000,
  PRIMARY KEY (`Id_CuadreCaja`),
  KEY `Id_CuadreCaja` (`Id_CuadreCaja`)
) ENGINE=MyISAM DEFAULT CHARSET=utf8mb3 COLLATE=utf8mb3_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `tblcuentas`
--

DROP TABLE IF EXISTS `tblcuentas`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `tblcuentas` (
  `N_Cuenta` varchar(20) NOT NULL,
  `Cuenta` varchar(50) DEFAULT NULL,
  `Parciales` decimal(19,4) DEFAULT NULL,
  `Debe` decimal(19,4) DEFAULT NULL,
  `Haber` decimal(19,4) DEFAULT NULL,
  `Saldo` decimal(19,4) DEFAULT NULL,
  `FechaMod` datetime DEFAULT NULL,
  PRIMARY KEY (`N_Cuenta`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3 COLLATE=utf8mb3_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `tbldatosempresa`
--

DROP TABLE IF EXISTS `tbldatosempresa`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `tbldatosempresa` (
  `Id_Empresa` int(11) NOT NULL AUTO_INCREMENT,
  `Empresa` varchar(50) DEFAULT '-',
  `Propietario` varchar(50) DEFAULT NULL,
  `Telefono` varchar(50) DEFAULT '0',
  `Direccion` varchar(80) DEFAULT '-',
  `Nit` varchar(50) DEFAULT '0',
  `Detalle` text DEFAULT '-',
  `AgentesRet` varchar(2) DEFAULT 'No',
  `Resolucion` varchar(20) DEFAULT '-',
  `FechaR` timestamp NOT NULL DEFAULT current_timestamp(),
  `Rango` varchar(20) DEFAULT '0',
  `Rango2` varchar(20) DEFAULT NULL,
  `vs` varchar(50) DEFAULT NULL,
  `Porcentajes` varchar(2) DEFAULT NULL,
  `Regimen` varchar(15) DEFAULT 'Común',
  `CajaRegistradora` varchar(50) DEFAULT NULL,
  `Configuracion` varchar(50) DEFAULT NULL,
  `IniciarFacturaEn` int(11) DEFAULT 0,
  `Caja` int(11) DEFAULT 0,
  `IvaIncluido` tinyint(1) DEFAULT NULL,
  `Prefijo` varchar(4) DEFAULT NULL,
  `Status` int(11) DEFAULT 1,
  `email` varchar(100) DEFAULT NULL,
  `api_token` text DEFAULT NULL,
  `email_factelect` varchar(100) DEFAULT NULL,
  `password_factelect` varchar(100) DEFAULT NULL,
  `Logo` varchar(255) DEFAULT NULL,
  `version_sql_aplicada` varchar(20) DEFAULT NULL,
  `modulo_financiaciones` tinyint(1) NOT NULL DEFAULT 0,
  `tasa_mora_mensual` decimal(5,2) NOT NULL DEFAULT 0.00 COMMENT '% mensual sobre cuota vencida',
  `modulo_anticipos` tinyint(1) NOT NULL DEFAULT 0,
  `fe_company_id` int(11) DEFAULT NULL,
  `fe_company_id_at` datetime DEFAULT NULL,
  `ResolucionVence` date DEFAULT NULL,
  `ResolucionTextoCompleto` text DEFAULT NULL,
  `ResolucionSyncAt` datetime DEFAULT NULL,
  `ResolucionRemaining` int(11) DEFAULT NULL,
  `ResolucionUsagePct` decimal(5,2) DEFAULT NULL,
  `ResolucionNextConsec` int(11) DEFAULT NULL,
  `ResolucionTechnicalKey` varchar(150) DEFAULT NULL,
  `dias_estimados_entrega` int(11) NOT NULL DEFAULT 7,
  `uvt_valor` decimal(12,2) NOT NULL DEFAULT 52374.00,
  `uvt_anio` int(11) NOT NULL DEFAULT 2026,
  `uvt_actualizado_at` datetime DEFAULT NULL,
  PRIMARY KEY (`Id_Empresa`),
  KEY `Id_Empresa` (`Id_Empresa`)
) ENGINE=MyISAM AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb3 COLLATE=utf8mb3_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `tbldetalle_pedido`
--

DROP TABLE IF EXISTS `tbldetalle_pedido`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `tbldetalle_pedido` (
  `Id_DetallePedido` int(11) NOT NULL AUTO_INCREMENT,
  `Pedido_N` int(11) DEFAULT NULL,
  `Items` int(11) DEFAULT NULL,
  `Cantidad` float DEFAULT NULL,
  `PrecioC` decimal(19,4) DEFAULT NULL,
  `PrecioV` decimal(19,4) DEFAULT NULL,
  `Impuesto` decimal(19,4) DEFAULT NULL,
  `Subtotal` decimal(19,4) DEFAULT NULL,
  `Dev` float DEFAULT NULL,
  `Id_Presentacion` int(11) DEFAULT NULL,
  `IvaPct` float DEFAULT 0,
  `CostoSinIva` decimal(19,4) DEFAULT 0.0000,
  `CostoConIva` decimal(19,4) DEFAULT 0.0000,
  `FleteUnit` decimal(19,4) DEFAULT 0.0000,
  `CostoFinal` decimal(19,4) DEFAULT 0.0000,
  `CostoAnterior` decimal(19,4) DEFAULT 0.0000,
  `CostoPromedio` decimal(19,4) DEFAULT 0.0000,
  PRIMARY KEY (`Id_DetallePedido`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb3 COLLATE=utf8mb3_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `tbldetalle_venta`
--

DROP TABLE IF EXISTS `tbldetalle_venta`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `tbldetalle_venta` (
  `Id_DetalleVenta` int(11) NOT NULL AUTO_INCREMENT,
  `Factura_N` int(11) DEFAULT 0,
  `Factura_NTemp` varchar(100) DEFAULT NULL,
  `Items` int(11) DEFAULT 0,
  `DescripcionTemp` varchar(500) DEFAULT NULL,
  `Cantidad` float DEFAULT 0,
  `PrecioC` decimal(19,4) DEFAULT 0.0000,
  `PrecioV` decimal(19,4) DEFAULT 0.0000,
  `Impuesto` decimal(19,4) DEFAULT 0.0000,
  `Subtotal` decimal(19,4) DEFAULT 0.0000,
  `Dev` float DEFAULT 0,
  `IVA` int(11) DEFAULT NULL,
  `Descuento` decimal(19,4) DEFAULT 0.0000,
  `Entregado` varchar(1) DEFAULT 'S',
  `Cant_Mod` int(11) DEFAULT NULL,
  `PrecioV_Mod` decimal(19,4) DEFAULT 0.0000,
  `PrecioC_Mod` decimal(19,4) DEFAULT 0.0000,
  `fecha_entrega` date DEFAULT NULL,
  `Id_Presentacion` int(11) DEFAULT NULL,
  `FechaEntrega` datetime DEFAULT NULL,
  `UsuarioEntrego` int(11) DEFAULT NULL,
  `CantidadEntregada` float NOT NULL DEFAULT 0,
  PRIMARY KEY (`Id_DetalleVenta`),
  KEY `Id_DetalleVenta` (`Id_DetalleVenta`),
  KEY `idx_factura` (`Factura_N`),
  KEY `idx_factura_items` (`Factura_N`,`Items`)
) ENGINE=InnoDB AUTO_INCREMENT=65 DEFAULT CHARSET=utf8mb3 COLLATE=utf8mb3_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `tbldetallecomprobantediario`
--

DROP TABLE IF EXISTS `tbldetallecomprobantediario`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `tbldetallecomprobantediario` (
  `Id_DetalleComproDiario` int(11) NOT NULL AUTO_INCREMENT,
  `N_Comprobante` int(11) DEFAULT 0,
  `Concepto` varchar(50) DEFAULT NULL,
  `Valor` decimal(19,4) DEFAULT 0.0000,
  PRIMARY KEY (`Id_DetalleComproDiario`),
  KEY `Id_DetalleComproDiario` (`Id_DetalleComproDiario`)
) ENGINE=MyISAM AUTO_INCREMENT=10 DEFAULT CHARSET=utf8mb3 COLLATE=utf8mb3_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `tbldetalleorden`
--

DROP TABLE IF EXISTS `tbldetalleorden`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `tbldetalleorden` (
  `Id_Detalle_Orden` int(11) NOT NULL AUTO_INCREMENT,
  `Orden_N` int(11) DEFAULT 0,
  `Items` int(11) DEFAULT 0,
  `Descripcion` varchar(200) DEFAULT NULL,
  `Cantidad` double DEFAULT 0,
  `ValorUnit` decimal(19,4) DEFAULT 0.0000,
  `ValorTotal` decimal(19,4) DEFAULT 0.0000,
  PRIMARY KEY (`Id_Detalle_Orden`),
  KEY `Id_Detalle_Orden` (`Id_Detalle_Orden`)
) ENGINE=MyISAM DEFAULT CHARSET=utf8mb3 COLLATE=utf8mb3_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `tbldetalleorden2`
--

DROP TABLE IF EXISTS `tbldetalleorden2`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `tbldetalleorden2` (
  `Cod_DetalleOrden2` int(11) NOT NULL AUTO_INCREMENT,
  `Orden_N` int(11) DEFAULT 0,
  `Items` int(11) DEFAULT 0,
  `Id_Articulos` double DEFAULT 0,
  `Cantidad` int(11) DEFAULT 0,
  `valorUnit` decimal(19,4) DEFAULT 0.0000,
  `Subtotal` decimal(19,4) DEFAULT 0.0000,
  PRIMARY KEY (`Cod_DetalleOrden2`)
) ENGINE=MyISAM DEFAULT CHARSET=utf8mb3 COLLATE=utf8mb3_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `tbldetalleorden3`
--

DROP TABLE IF EXISTS `tbldetalleorden3`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `tbldetalleorden3` (
  `Id_DetalleOrden3` int(11) NOT NULL AUTO_INCREMENT,
  `Orden_N` int(11) DEFAULT 0,
  `Items` int(11) DEFAULT 0,
  `CodigoEmp` int(11) DEFAULT 0,
  `Porcentaje` int(11) DEFAULT 0,
  `Utilidad` decimal(19,4) DEFAULT 0.0000,
  PRIMARY KEY (`Id_DetalleOrden3`),
  KEY `Id_DetalleOrden3` (`Id_DetalleOrden3`)
) ENGINE=MyISAM DEFAULT CHARSET=utf8mb3 COLLATE=utf8mb3_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `tbldetalleplansepare`
--

DROP TABLE IF EXISTS `tbldetalleplansepare`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `tbldetalleplansepare` (
  `Id_DetallePlanSepare` int(11) NOT NULL AUTO_INCREMENT,
  `Id_PlanSepare` int(11) DEFAULT 0,
  `Id_Producto` int(11) DEFAULT 0,
  `Cantidad` int(11) DEFAULT 0,
  `Valor` decimal(19,4) DEFAULT 0.0000,
  `PCosto` decimal(19,4) DEFAULT 0.0000,
  `Subtotal` decimal(19,4) DEFAULT 0.0000,
  PRIMARY KEY (`Id_DetallePlanSepare`),
  KEY `Id_DetallePlanSepare` (`Id_DetallePlanSepare`),
  KEY `Id_PlanSepare` (`Id_PlanSepare`),
  KEY `Id_Producto` (`Id_Producto`)
) ENGINE=MyISAM DEFAULT CHARSET=utf8mb3 COLLATE=utf8mb3_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `tbldevolucion_ventas`
--

DROP TABLE IF EXISTS `tbldevolucion_ventas`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `tbldevolucion_ventas` (
  `IdDevolVent` int(11) NOT NULL AUTO_INCREMENT,
  `Id_DetalleVenta` int(11) NOT NULL,
  `valor_dev` double NOT NULL,
  `caja` varchar(1) NOT NULL,
  `fecha_fact` date NOT NULL,
  `fecha_mod` datetime NOT NULL,
  PRIMARY KEY (`IdDevolVent`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3 COLLATE=utf8mb3_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `tbldocumentos`
--

DROP TABLE IF EXISTS `tbldocumentos`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `tbldocumentos` (
  `Id_Documentos` int(11) NOT NULL DEFAULT 0,
  `N_Documento` int(11) DEFAULT 0,
  `Tipo_Documento` varchar(15) DEFAULT 'Crédito',
  `Descripcion` varchar(150) DEFAULT '-',
  `Fecha` timestamp NOT NULL DEFAULT current_timestamp(),
  `Valor` decimal(19,4) DEFAULT 0.0000,
  `Estado` varchar(20) DEFAULT 'Abierto',
  `Cuenta` varchar(15) DEFAULT NULL,
  PRIMARY KEY (`Id_Documentos`),
  KEY `Id_Documentos` (`Id_Documentos`)
) ENGINE=MyISAM DEFAULT CHARSET=utf8mb3 COLLATE=utf8mb3_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `tblegresos`
--

DROP TABLE IF EXISTS `tblegresos`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `tblegresos` (
  `Id_Egresos` int(11) NOT NULL AUTO_INCREMENT,
  `N_Comprobante` int(11) DEFAULT 0,
  `Fecha` timestamp NOT NULL DEFAULT current_timestamp(),
  `Orden` varchar(50) DEFAULT '-',
  `Concepto` varchar(90) DEFAULT NULL,
  `Suma` varchar(100) DEFAULT '-',
  `Valor` decimal(19,4) DEFAULT 0.0000,
  `Descuento` decimal(19,4) DEFAULT 0.0000,
  `Estado` varchar(15) DEFAULT NULL,
  `vinculado_a` varchar(20) DEFAULT NULL,
  `id_vinculo` int(11) DEFAULT NULL,
  `Cuentas` varchar(80) DEFAULT NULL,
  `FactN` varchar(15) DEFAULT NULL,
  `CodigoPro` int(11) DEFAULT 0,
  `NFacturaAnt` varchar(20) DEFAULT NULL,
  `ValorFact` decimal(19,4) DEFAULT 0.0000,
  `Saldoact` decimal(19,4) DEFAULT 0.0000,
  `Cedula` varchar(20) DEFAULT NULL,
  `TipoPago` int(11) DEFAULT NULL,
  `categoria_gasto` varchar(50) DEFAULT 'Otros',
  `id_usuario` int(11) DEFAULT NULL,
  `id_mediopago` int(11) NOT NULL DEFAULT 0,
  PRIMARY KEY (`Id_Egresos`),
  KEY `Id_Egresos` (`Id_Egresos`),
  KEY `idx_egr_estado_codpro_nfactant` (`Estado`,`CodigoPro`,`NFacturaAnt`),
  KEY `idx_egr_estado_codpro_factn` (`Estado`,`CodigoPro`,`FactN`),
  KEY `idx_usuario` (`id_usuario`),
  KEY `idx_egr_medio` (`id_mediopago`),
  KEY `idx_vinculado` (`vinculado_a`,`id_vinculo`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb3 COLLATE=utf8mb3_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `tblempleados`
--

DROP TABLE IF EXISTS `tblempleados`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `tblempleados` (
  `CodigoEmp` int(11) NOT NULL DEFAULT 0,
  `Nombres` varchar(50) DEFAULT '-',
  `Apellidos` varchar(50) DEFAULT '-',
  `Cedula` varchar(50) DEFAULT '-',
  `Telefono` varchar(50) DEFAULT '-',
  `Direccion` varchar(50) DEFAULT '-',
  `FechaIngr` timestamp NOT NULL DEFAULT current_timestamp(),
  `Cod_Entidad` int(11) DEFAULT 0,
  `Valor` decimal(19,4) DEFAULT 0.0000,
  `SueldoBasico` decimal(19,4) DEFAULT 0.0000,
  `Cargo` varchar(50) DEFAULT '-',
  `Pensión` decimal(19,4) DEFAULT 0.0000,
  `TipoEmpleado` int(11) DEFAULT 0,
  `Vinculado` varchar(2) DEFAULT NULL,
  `Id_Usuario` int(11) DEFAULT 0,
  PRIMARY KEY (`CodigoEmp`),
  KEY `Id_Usuario` (`Id_Usuario`)
) ENGINE=MyISAM DEFAULT CHARSET=utf8mb3 COLLATE=utf8mb3_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `tblentidades`
--

DROP TABLE IF EXISTS `tblentidades`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `tblentidades` (
  `Id_Entidades` int(11) NOT NULL AUTO_INCREMENT,
  `Entidad` varchar(50) DEFAULT NULL,
  PRIMARY KEY (`Id_Entidades`),
  KEY `Id_Entidades` (`Id_Entidades`)
) ENGINE=MyISAM AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb3 COLLATE=utf8mb3_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `tblentregaarticulos`
--

DROP TABLE IF EXISTS `tblentregaarticulos`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `tblentregaarticulos` (
  `idEntregaArt` int(11) NOT NULL AUTO_INCREMENT,
  `Items` int(11) NOT NULL,
  `FechaEntrega` datetime DEFAULT NULL,
  `IDDetalleVentaArt` int(11) NOT NULL,
  `Concepto` varchar(45) NOT NULL,
  `Valido` tinyint(1) DEFAULT NULL,
  PRIMARY KEY (`idEntregaArt`)
) ENGINE=MyISAM DEFAULT CHARSET=utf8mb3 COLLATE=utf8mb3_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `tbletiquetas`
--

DROP TABLE IF EXISTS `tbletiquetas`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `tbletiquetas` (
  `Id_Etiqueta` int(11) NOT NULL AUTO_INCREMENT,
  `Nombre` varchar(80) NOT NULL,
  `Descripcion` varchar(255) DEFAULT NULL,
  `Color` varchar(7) DEFAULT '#7c3aed',
  `Activa` tinyint(1) DEFAULT 1,
  `Fecha_Creacion` timestamp NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`Id_Etiqueta`),
  UNIQUE KEY `uk_nombre` (`Nombre`),
  KEY `idx_activa` (`Activa`)
) ENGINE=InnoDB AUTO_INCREMENT=64 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `tblfacturasanteriores`
--

DROP TABLE IF EXISTS `tblfacturasanteriores`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `tblfacturasanteriores` (
  `ID_FactAnteriores` int(11) NOT NULL AUTO_INCREMENT,
  `FacturaN` varchar(50) DEFAULT NULL,
  `Fecha` datetime DEFAULT NULL,
  `Dias` int(11) DEFAULT NULL,
  `Valor` decimal(19,4) DEFAULT NULL,
  `Saldo` decimal(19,4) DEFAULT NULL,
  `CodigoCli` int(11) DEFAULT NULL,
  `FechaMod` datetime DEFAULT NULL,
  PRIMARY KEY (`ID_FactAnteriores`),
  KEY `ID_FactAnteriores` (`ID_FactAnteriores`)
) ENGINE=MyISAM DEFAULT CHARSET=utf8mb3 COLLATE=utf8mb3_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `tblfacturasanterioresproveedor`
--

DROP TABLE IF EXISTS `tblfacturasanterioresproveedor`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `tblfacturasanterioresproveedor` (
  `ID_FactAnterioresP` int(11) NOT NULL AUTO_INCREMENT,
  `FacturaN` varchar(50) DEFAULT NULL,
  `Fecha` datetime DEFAULT NULL,
  `Dias` int(11) DEFAULT 0,
  `Descuento` decimal(19,4) DEFAULT 0.0000,
  `IVA` decimal(19,4) DEFAULT 0.0000,
  `Subtotal` decimal(19,4) DEFAULT 0.0000,
  `Valor` decimal(19,4) DEFAULT 0.0000,
  `Saldo` decimal(19,4) DEFAULT 0.0000,
  `CodigoProv` int(11) DEFAULT 0,
  PRIMARY KEY (`ID_FactAnterioresP`),
  KEY `ID_FactAnterioresP` (`ID_FactAnterioresP`),
  KEY `idx_fap_codprov_factn` (`CodigoProv`,`FacturaN`),
  KEY `idx_fap_fecha` (`Fecha`)
) ENGINE=MyISAM AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb3 COLLATE=utf8mb3_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `tblfamilia_items`
--

DROP TABLE IF EXISTS `tblfamilia_items`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `tblfamilia_items` (
  `Id_Familia_Item` int(11) NOT NULL AUTO_INCREMENT,
  `Id_Familia` int(11) NOT NULL,
  `Items` int(11) NOT NULL,
  `Factor` decimal(12,4) NOT NULL DEFAULT 1.0000,
  `Es_Base` tinyint(1) DEFAULT 0,
  PRIMARY KEY (`Id_Familia_Item`),
  UNIQUE KEY `uk_items` (`Items`),
  KEY `idx_familia` (`Id_Familia`),
  CONSTRAINT `fk_fi_familia` FOREIGN KEY (`Id_Familia`) REFERENCES `tblfamilias_producto` (`Id_Familia`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `tblfamilias_producto`
--

DROP TABLE IF EXISTS `tblfamilias_producto`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `tblfamilias_producto` (
  `Id_Familia` int(11) NOT NULL AUTO_INCREMENT,
  `Nombre` varchar(100) NOT NULL,
  `Descripcion` varchar(255) DEFAULT NULL,
  `Activa` tinyint(1) DEFAULT 1,
  `Fecha_Creacion` timestamp NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`Id_Familia`),
  KEY `idx_activa` (`Activa`)
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `tblfinanciacion_cuotas`
--

DROP TABLE IF EXISTS `tblfinanciacion_cuotas`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `tblfinanciacion_cuotas` (
  `Id_Cuota` int(11) NOT NULL AUTO_INCREMENT,
  `Id_Financiacion` int(11) NOT NULL,
  `NumCuota` int(11) NOT NULL,
  `FechaVencimiento` date NOT NULL,
  `ValorCuota` decimal(15,2) NOT NULL DEFAULT 0.00,
  `ValorPagado` decimal(15,2) NOT NULL DEFAULT 0.00,
  `Saldo` decimal(15,2) NOT NULL DEFAULT 0.00 COMMENT 'ValorCuota - ValorPagado',
  `Estado` varchar(15) NOT NULL DEFAULT 'Pendiente' COMMENT 'Pendiente | Parcial | Pagada',
  `FechaUltimoPago` date DEFAULT NULL,
  PRIMARY KEY (`Id_Cuota`),
  KEY `idx_financ` (`Id_Financiacion`),
  KEY `idx_vencimiento` (`FechaVencimiento`),
  KEY `idx_estado` (`Estado`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `tblfinanciacion_pagos`
--

DROP TABLE IF EXISTS `tblfinanciacion_pagos`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `tblfinanciacion_pagos` (
  `Id_FinancPago` int(11) NOT NULL AUTO_INCREMENT,
  `Id_Cuota` int(11) NOT NULL,
  `Id_Financiacion` int(11) NOT NULL,
  `Id_Pagos` int(11) DEFAULT NULL COMMENT 'FK opcional a tblpagos para trazabilidad contable',
  `Fecha` date NOT NULL,
  `Valor` decimal(15,2) NOT NULL,
  `id_mediopago` int(11) NOT NULL DEFAULT 0 COMMENT '0=Efectivo 1=Tarjeta 2=Bancolombia 3=Nequi',
  `Id_Usuario` int(11) DEFAULT NULL,
  `Estado` varchar(10) NOT NULL DEFAULT 'Valida' COMMENT 'Valida | Anulada',
  `FechaCreacion` timestamp NULL DEFAULT current_timestamp(),
  `EsInteresMora` tinyint(1) NOT NULL DEFAULT 0 COMMENT '1=pago de interes de mora, 0=abono a capital',
  PRIMARY KEY (`Id_FinancPago`),
  KEY `idx_cuota` (`Id_Cuota`),
  KEY `idx_financ` (`Id_Financiacion`),
  KEY `idx_fecha` (`Fecha`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `tblfinanciaciones`
--

DROP TABLE IF EXISTS `tblfinanciaciones`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `tblfinanciaciones` (
  `Id_Financiacion` int(11) NOT NULL AUTO_INCREMENT,
  `Consecutivo` varchar(20) DEFAULT NULL COMMENT 'Ej. F-001 o consecutivo por resolución',
  `Fecha` date NOT NULL,
  `Codigo` int(11) NOT NULL COMMENT 'CodigoClien del cliente',
  `Descripcion` varchar(300) DEFAULT NULL COMMENT 'Ej. Moto Hero NKD 125 Placa XXX',
  `MontoTotal` decimal(15,2) NOT NULL DEFAULT 0.00,
  `CuotaInicial` decimal(15,2) NOT NULL DEFAULT 0.00,
  `MontoFinanciado` decimal(15,2) NOT NULL DEFAULT 0.00,
  `NumCuotas` int(11) NOT NULL DEFAULT 1,
  `FrecuenciaDias` int(11) NOT NULL DEFAULT 30,
  `FechaPrimeraCuota` date DEFAULT NULL,
  `Factura_N` int(11) DEFAULT NULL COMMENT 'Vínculo opcional con tblventas.Factura_N',
  `Id_Usuario` int(11) DEFAULT NULL COMMENT 'Vendedor',
  `Estado` varchar(15) NOT NULL DEFAULT 'Activa' COMMENT 'Activa | Pagada | Anulada',
  `Comentario` text DEFAULT NULL,
  `FechaCreacion` timestamp NULL DEFAULT current_timestamp(),
  `FechaMod` timestamp NULL DEFAULT NULL ON UPDATE current_timestamp(),
  PRIMARY KEY (`Id_Financiacion`),
  KEY `idx_cliente` (`Codigo`),
  KEY `idx_estado` (`Estado`),
  KEY `idx_fecha` (`Fecha`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `tblformulario`
--

DROP TABLE IF EXISTS `tblformulario`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `tblformulario` (
  `Id_form` int(11) NOT NULL AUTO_INCREMENT,
  `Formulario` varchar(100) DEFAULT NULL,
  `PosX` float DEFAULT 0,
  `PoxY` float DEFAULT 0,
  `Alto` float DEFAULT 0,
  `Ancho` float DEFAULT 0,
  PRIMARY KEY (`Id_form`),
  KEY `Id_form` (`Id_form`)
) ENGINE=MyISAM AUTO_INCREMENT=99 DEFAULT CHARSET=utf8mb3 COLLATE=utf8mb3_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `tblkardex`
--

DROP TABLE IF EXISTS `tblkardex`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `tblkardex` (
  `Id_kardex` int(11) NOT NULL AUTO_INCREMENT,
  `Fecha` timestamp NOT NULL DEFAULT current_timestamp(),
  `Mes` varchar(15) DEFAULT 'Enero',
  `Items` int(11) DEFAULT 0,
  `Detalle` varchar(260) DEFAULT NULL,
  `C_D` int(11) DEFAULT 0,
  `Cant_Ent` float DEFAULT 0,
  `Cost_Ent` decimal(19,4) DEFAULT 0.0000,
  `Cant_Sal` float DEFAULT 0,
  `Cost_Sal` decimal(19,4) DEFAULT 0.0000,
  `Cant_Saldo` float DEFAULT 0,
  `Cost_Saldo` decimal(19,4) DEFAULT 0.0000,
  `Cost_Unit` decimal(19,4) DEFAULT 0.0000,
  PRIMARY KEY (`Id_kardex`),
  KEY `Id_kardex` (`Id_kardex`)
) ENGINE=InnoDB AUTO_INCREMENT=463 DEFAULT CHARSET=utf8mb3 COLLATE=utf8mb3_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `tblmedios_pago`
--

DROP TABLE IF EXISTS `tblmedios_pago`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `tblmedios_pago` (
  `id_mediopago` int(11) NOT NULL,
  `nombre_medio` varchar(40) NOT NULL,
  `payment_method_id` int(11) DEFAULT NULL,
  PRIMARY KEY (`id_mediopago`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3 COLLATE=utf8mb3_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `tblmeses`
--

DROP TABLE IF EXISTS `tblmeses`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `tblmeses` (
  `N_Mes` int(11) NOT NULL DEFAULT 0,
  `Mes` varchar(15) DEFAULT NULL,
  PRIMARY KEY (`N_Mes`)
) ENGINE=MyISAM DEFAULT CHARSET=utf8mb3 COLLATE=utf8mb3_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `tblmov_banco`
--

DROP TABLE IF EXISTS `tblmov_banco`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `tblmov_banco` (
  `Id_Mov` int(11) NOT NULL AUTO_INCREMENT,
  `Id_Cuenta` int(11) NOT NULL,
  `Fecha` datetime DEFAULT current_timestamp(),
  `Tipo` enum('ingreso','egreso','traslado_entrada','traslado_salida') NOT NULL,
  `Valor` decimal(19,4) NOT NULL,
  `Descripcion` varchar(255) DEFAULT '',
  `Referencia` varchar(50) DEFAULT '',
  `Id_Usuario` int(11) DEFAULT 0,
  `Id_Caja_Origen` int(11) DEFAULT NULL,
  `Id_Caja_Destino` int(11) DEFAULT NULL,
  PRIMARY KEY (`Id_Mov`),
  KEY `idx_cuenta` (`Id_Cuenta`),
  KEY `idx_fecha` (`Fecha`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `tblmov_caja`
--

DROP TABLE IF EXISTS `tblmov_caja`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `tblmov_caja` (
  `Id_Mov` int(11) NOT NULL AUTO_INCREMENT,
  `Id_Sesion` int(11) DEFAULT NULL,
  `Id_Caja_Origen` int(11) DEFAULT NULL,
  `Id_Caja_Destino` int(11) DEFAULT NULL,
  `Id_Usuario` int(11) NOT NULL,
  `Fecha` datetime DEFAULT current_timestamp(),
  `Valor` decimal(19,4) NOT NULL,
  `Tipo` enum('retiro_parcial','traslado','deposito','gasto','compra','pago_proveedor','cobro_cliente') NOT NULL,
  `Descripcion` varchar(255) DEFAULT '',
  PRIMARY KEY (`Id_Mov`),
  KEY `idx_sesion` (`Id_Sesion`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `tblmovimiento`
--

DROP TABLE IF EXISTS `tblmovimiento`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `tblmovimiento` (
  `ID_Asi` int(11) NOT NULL AUTO_INCREMENT,
  `Movimiento_N` int(11) DEFAULT 0,
  `Fecha` timestamp NOT NULL DEFAULT current_timestamp(),
  `Mes` int(11) DEFAULT 0,
  `Año` int(11) DEFAULT 0,
  `Cuenta` varchar(50) DEFAULT '0',
  `Valor` decimal(19,4) DEFAULT 0.0000,
  `En` varchar(10) DEFAULT NULL,
  `Items` int(11) DEFAULT 0,
  `Id_TipoMoviento` int(11) DEFAULT 0,
  PRIMARY KEY (`ID_Asi`),
  KEY `ID_Asi` (`ID_Asi`)
) ENGINE=MyISAM DEFAULT CHARSET=utf8mb3 COLLATE=utf8mb3_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `tblmovimientos_distribucion`
--

DROP TABLE IF EXISTS `tblmovimientos_distribucion`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `tblmovimientos_distribucion` (
  `Id_Mov` int(11) NOT NULL AUTO_INCREMENT,
  `Fecha` datetime DEFAULT current_timestamp(),
  `Id_Usuario` int(11) DEFAULT 0,
  `Items_Origen` int(11) NOT NULL,
  `Items_Destino` int(11) NOT NULL,
  `Cant_Origen` decimal(12,4) NOT NULL,
  `Cant_Destino` decimal(12,4) NOT NULL,
  `Factor_Origen` decimal(12,4) NOT NULL,
  `Factor_Destino` decimal(12,4) NOT NULL,
  `Motivo` enum('automatico','manual') DEFAULT 'automatico',
  `Factura_N` int(11) DEFAULT NULL,
  `Comentario` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`Id_Mov`),
  KEY `idx_fecha` (`Fecha`),
  KEY `idx_factura` (`Factura_N`),
  KEY `idx_origen` (`Items_Origen`),
  KEY `idx_destino` (`Items_Destino`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `tblnotas_articulo`
--

DROP TABLE IF EXISTS `tblnotas_articulo`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `tblnotas_articulo` (
  `Id_Nota` int(11) NOT NULL AUTO_INCREMENT,
  `Fecha` timestamp NULL DEFAULT current_timestamp(),
  `Items` int(11) NOT NULL,
  `Tipo` enum('Entrada','Salida') NOT NULL,
  `Concepto` varchar(30) NOT NULL,
  `Descripcion` varchar(500) DEFAULT NULL,
  `Cantidad` decimal(12,4) NOT NULL,
  `Valor_Unitario` decimal(19,4) DEFAULT 0.0000,
  `Id_Usuario` int(11) DEFAULT 0,
  `Id_Lote` int(11) DEFAULT NULL,
  `Estado` varchar(10) NOT NULL DEFAULT 'Valida' COMMENT 'Valida | Anulada',
  `Anulada_Por` int(11) DEFAULT NULL COMMENT 'Id_Usuario que anuló',
  `Fecha_Anulacion` datetime DEFAULT NULL,
  `Motivo_Anulacion` varchar(200) DEFAULT NULL,
  PRIMARY KEY (`Id_Nota`),
  KEY `idx_items` (`Items`),
  KEY `idx_fecha` (`Fecha`),
  KEY `idx_concepto` (`Concepto`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `tblordenproduccion`
--

DROP TABLE IF EXISTS `tblordenproduccion`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `tblordenproduccion` (
  `Orden_N` int(11) NOT NULL DEFAULT 0,
  `Fecha` timestamp NOT NULL DEFAULT current_timestamp(),
  `N_Mes` int(11) DEFAULT 0,
  `Año` int(11) DEFAULT 0,
  `Tipo` varchar(20) DEFAULT 'Cont',
  `Dias` int(11) DEFAULT 0,
  `Id_Cliente` int(11) DEFAULT 0,
  `A_nombre` varchar(70) DEFAULT '-',
  `Identificacion` varchar(20) DEFAULT NULL,
  `Direccion` varchar(50) DEFAULT '-',
  `Telefono` varchar(50) DEFAULT '0',
  `Iva` decimal(19,4) DEFAULT 0.0000,
  `Total` decimal(19,4) DEFAULT 0.0000,
  `Utilidad` decimal(19,4) DEFAULT 0.0000,
  `Obervaciones` text DEFAULT NULL,
  PRIMARY KEY (`Orden_N`),
  KEY `Identificacion` (`Identificacion`)
) ENGINE=MyISAM DEFAULT CHARSET=utf8mb3 COLLATE=utf8mb3_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `tblpagos`
--

DROP TABLE IF EXISTS `tblpagos`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `tblpagos` (
  `Id_Pagos` int(11) NOT NULL AUTO_INCREMENT,
  `RecCajaN` int(11) DEFAULT NULL,
  `Codigo` int(11) DEFAULT NULL,
  `Fact_N` int(11) DEFAULT NULL,
  `ValorPago` decimal(19,4) DEFAULT NULL,
  `Fecha` datetime DEFAULT NULL,
  `DetallePago` varchar(200) DEFAULT NULL,
  `ValorFact` decimal(19,4) DEFAULT NULL,
  `SaldoAct` decimal(19,4) DEFAULT NULL,
  `Descuento` double DEFAULT NULL,
  `Retencion` decimal(19,4) DEFAULT NULL,
  `IVARetenido` decimal(19,4) DEFAULT NULL,
  `Estado` varchar(10) DEFAULT NULL,
  `Afectada` varchar(50) DEFAULT NULL,
  `id_mediopago` int(11) NOT NULL,
  `Cuentas` varchar(80) DEFAULT NULL,
  `SaldoTotal` decimal(19,4) DEFAULT NULL,
  `NFactAnt` varchar(15) DEFAULT NULL,
  `Nfact_electronica` varchar(20) NOT NULL,
  `Fact_Plan` int(11) DEFAULT NULL,
  `Cedula` varchar(20) DEFAULT NULL,
  `RecibidoDe` varchar(60) DEFAULT NULL,
  `NRemision` int(11) DEFAULT NULL,
  `FechaMod` datetime DEFAULT NULL,
  `id_usuario` int(11) DEFAULT NULL,
  `Id_Anticipo` int(11) DEFAULT NULL COMMENT 'FK a tblanticipos_cliente cuando el pago viene de saldo a favor',
  PRIMARY KEY (`Id_Pagos`),
  KEY `idx_usuario` (`id_usuario`)
) ENGINE=InnoDB AUTO_INCREMENT=10 DEFAULT CHARSET=utf8mb3 COLLATE=utf8mb3_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `tblpedidos`
--

DROP TABLE IF EXISTS `tblpedidos`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `tblpedidos` (
  `Pedido_N` int(11) NOT NULL AUTO_INCREMENT,
  `FacturaCompra_N` varchar(50) DEFAULT NULL,
  `N_Mes` int(11) DEFAULT 0,
  `anio` int(11) DEFAULT NULL,
  `Fecha` timestamp NOT NULL DEFAULT current_timestamp(),
  `TipoPedido` varchar(8) DEFAULT 'Contado',
  `Dias` int(11) DEFAULT 0,
  `CodigoPro` int(11) DEFAULT 0,
  `Impuesto` decimal(19,4) DEFAULT 0.0000,
  `Descuento` decimal(19,4) DEFAULT 0.0000,
  `Flete` decimal(19,4) DEFAULT 0.0000,
  `Total` decimal(19,4) DEFAULT 0.0000,
  `Saldo` decimal(19,4) DEFAULT 0.0000,
  `EstadoPedido` varchar(15) DEFAULT 'Recibido',
  `Comentario` text DEFAULT NULL,
  `Retencion` decimal(19,4) DEFAULT NULL,
  `opcion_factura` int(11) NOT NULL,
  PRIMARY KEY (`Pedido_N`),
  KEY `CodigoPro` (`CodigoPro`),
  KEY `idx_ped_codpro_pedido` (`CodigoPro`,`Pedido_N`),
  KEY `idx_ped_estado_tipo` (`EstadoPedido`,`TipoPedido`),
  KEY `idx_ped_fecha` (`Fecha`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb3 COLLATE=utf8mb3_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `tblporcentajeutilidad`
--

DROP TABLE IF EXISTS `tblporcentajeutilidad`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `tblporcentajeutilidad` (
  `Id_Ganancia` int(11) NOT NULL AUTO_INCREMENT,
  `Rango1` decimal(19,4) DEFAULT 0.0000,
  `Rango2` decimal(19,4) DEFAULT 0.0000,
  `Porcentaje` double DEFAULT 0,
  PRIMARY KEY (`Id_Ganancia`),
  KEY `Id_Ganancia` (`Id_Ganancia`)
) ENGINE=MyISAM AUTO_INCREMENT=15 DEFAULT CHARSET=utf8mb3 COLLATE=utf8mb3_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `tblpresentaciones`
--

DROP TABLE IF EXISTS `tblpresentaciones`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `tblpresentaciones` (
  `Id_Presentacion` int(11) NOT NULL AUTO_INCREMENT,
  `Items` int(11) NOT NULL,
  `Nombre` varchar(80) NOT NULL,
  `Factor` decimal(10,4) NOT NULL DEFAULT 1.0000,
  `Precio_Venta` decimal(19,4) DEFAULT 0.0000,
  `Codigo_Barras` varchar(25) DEFAULT NULL,
  `Activa` tinyint(1) DEFAULT 1,
  PRIMARY KEY (`Id_Presentacion`),
  KEY `idx_items` (`Items`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `tblproducto_componentes`
--

DROP TABLE IF EXISTS `tblproducto_componentes`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `tblproducto_componentes` (
  `Id_Componente` int(11) NOT NULL AUTO_INCREMENT,
  `Items_Padre` int(11) NOT NULL,
  `Items_Componente` int(11) NOT NULL,
  `Cantidad` decimal(12,4) NOT NULL DEFAULT 1.0000,
  `Comentario` varchar(150) DEFAULT NULL,
  `Fecha_Creacion` timestamp NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`Id_Componente`),
  UNIQUE KEY `uk_padre_componente` (`Items_Padre`,`Items_Componente`),
  KEY `idx_padre` (`Items_Padre`),
  KEY `idx_componente` (`Items_Componente`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `tblproductos_lotes`
--

DROP TABLE IF EXISTS `tblproductos_lotes`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `tblproductos_lotes` (
  `Id_Lote` int(11) NOT NULL AUTO_INCREMENT,
  `Items` int(11) NOT NULL,
  `Numero_Lote` varchar(50) DEFAULT NULL,
  `Fecha_Vencimiento` date NOT NULL,
  `Fecha_Ingreso` timestamp NULL DEFAULT current_timestamp(),
  `Cantidad_Inicial` decimal(12,4) NOT NULL,
  `Cantidad_Actual` decimal(12,4) NOT NULL,
  `Estado` enum('activo','agotado','dado_de_baja') DEFAULT 'activo',
  `Pedido_N` int(11) DEFAULT NULL,
  `Comentario` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`Id_Lote`),
  KEY `idx_items_estado` (`Items`,`Estado`),
  KEY `idx_vencimiento` (`Fecha_Vencimiento`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `tblproductosrelacionados`
--

DROP TABLE IF EXISTS `tblproductosrelacionados`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `tblproductosrelacionados` (
  `ID_ProductoRelacionados` int(11) NOT NULL AUTO_INCREMENT,
  `CodigoPro` int(11) DEFAULT 0,
  `CodigoProRelacionado` int(11) DEFAULT 0,
  `Cantidad` int(11) DEFAULT 0,
  PRIMARY KEY (`ID_ProductoRelacionados`),
  KEY `ID_ProductoRelacionados` (`ID_ProductoRelacionados`)
) ENGINE=MyISAM DEFAULT CHARSET=utf8mb3 COLLATE=utf8mb3_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `tblproveedores`
--

DROP TABLE IF EXISTS `tblproveedores`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `tblproveedores` (
  `CodigoPro` int(11) NOT NULL AUTO_INCREMENT,
  `RazonSocial` varchar(50) DEFAULT NULL,
  `Nit` varchar(15) DEFAULT NULL,
  `Direccion` varchar(50) DEFAULT NULL,
  `Telefonos` varchar(30) DEFAULT NULL,
  `Nombres` varchar(50) DEFAULT NULL,
  `Apellidos` varchar(20) DEFAULT NULL,
  `Identificacion` int(11) DEFAULT NULL,
  `Telefonos_C` varchar(30) DEFAULT NULL,
  `Direccion_C` varchar(50) DEFAULT NULL,
  `Empresa` varchar(30) DEFAULT NULL,
  `CuentaN` varchar(50) DEFAULT NULL,
  `Fecha_Iingreso` datetime DEFAULT NULL,
  `FechaMod` datetime DEFAULT NULL,
  PRIMARY KEY (`CodigoPro`),
  KEY `idx_prov_codigo` (`CodigoPro`)
) ENGINE=InnoDB AUTO_INCREMENT=220634 DEFAULT CHARSET=utf8mb3 COLLATE=utf8mb3_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `tblreferencia`
--

DROP TABLE IF EXISTS `tblreferencia`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `tblreferencia` (
  `Id_Referencia` int(11) NOT NULL AUTO_INCREMENT,
  `Referencia` varchar(20) DEFAULT NULL,
  PRIMARY KEY (`Id_Referencia`),
  KEY `Id_Referencia` (`Id_Referencia`)
) ENGINE=MyISAM AUTO_INCREMENT=128 DEFAULT CHARSET=utf8mb3 COLLATE=utf8mb3_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `tblreferenciasarticulos`
--

DROP TABLE IF EXISTS `tblreferenciasarticulos`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `tblreferenciasarticulos` (
  `idRefeArt` int(11) NOT NULL AUTO_INCREMENT,
  `Id_DetalleVenta` int(11) NOT NULL,
  `RerenciaPro` varchar(100) NOT NULL,
  KEY `idRefeArt` (`idRefeArt`)
) ENGINE=MyISAM DEFAULT CHARSET=utf8mb3 COLLATE=utf8mb3_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `tblregistro`
--

DROP TABLE IF EXISTS `tblregistro`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `tblregistro` (
  `id_registro` int(11) NOT NULL AUTO_INCREMENT,
  `propietario` varchar(30) NOT NULL,
  `nit` varchar(20) NOT NULL,
  `serial` varchar(100) NOT NULL,
  `id_maquina` varchar(50) NOT NULL,
  `fecha_registro` date NOT NULL,
  PRIMARY KEY (`id_registro`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3 COLLATE=utf8mb3_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `tblregistroproducto`
--

DROP TABLE IF EXISTS `tblregistroproducto`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `tblregistroproducto` (
  `ID_Registro` varchar(15) NOT NULL,
  `Codigo` text DEFAULT NULL,
  PRIMARY KEY (`ID_Registro`),
  KEY `ID_Registro` (`ID_Registro`)
) ENGINE=MyISAM DEFAULT CHARSET=utf8mb3 COLLATE=utf8mb3_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `tblretenciones`
--

DROP TABLE IF EXISTS `tblretenciones`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `tblretenciones` (
  `Id_Retencion` int(11) NOT NULL AUTO_INCREMENT,
  `Codigo` varchar(20) NOT NULL,
  `Nombre` varchar(120) NOT NULL,
  `Porcentaje` decimal(7,4) NOT NULL DEFAULT 0.0000,
  `Codigo_Dian` varchar(5) DEFAULT NULL,
  `Activa` tinyint(1) DEFAULT 1,
  `Fecha_Creacion` timestamp NULL DEFAULT current_timestamp(),
  `es_retencion` tinyint(1) NOT NULL DEFAULT 1,
  `tipo_codigo` varchar(5) DEFAULT NULL COMMENT '05=ReteIVA, 06=ReteFuente, 07=ReteICA',
  PRIMARY KEY (`Id_Retencion`),
  UNIQUE KEY `uk_codigo` (`Codigo`),
  KEY `idx_activa` (`Activa`)
) ENGINE=InnoDB AUTO_INCREMENT=101 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `tblsaldosfact`
--

DROP TABLE IF EXISTS `tblsaldosfact`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `tblsaldosfact` (
  `Id_SaldoF` int(11) NOT NULL AUTO_INCREMENT,
  `Cuenta` varchar(15) DEFAULT NULL,
  `Valor` decimal(19,4) DEFAULT 0.0000,
  `Saldo` decimal(19,4) DEFAULT 0.0000,
  PRIMARY KEY (`Id_SaldoF`),
  KEY `Id_SaldoF` (`Id_SaldoF`)
) ENGINE=MyISAM DEFAULT CHARSET=utf8mb3 COLLATE=utf8mb3_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `tblsesiones_caja`
--

DROP TABLE IF EXISTS `tblsesiones_caja`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `tblsesiones_caja` (
  `Id_Sesion` int(11) NOT NULL AUTO_INCREMENT,
  `Id_Caja` int(11) NOT NULL,
  `Id_Usuario` int(11) NOT NULL,
  `FechaApertura` datetime NOT NULL,
  `FechaCierre` datetime DEFAULT NULL,
  `BaseInicial` decimal(19,4) DEFAULT 0.0000,
  `VentasContadoEfectivo` decimal(19,4) DEFAULT 0.0000,
  `VentasContadoTransf` decimal(19,4) DEFAULT 0.0000,
  `VentasCredito` decimal(19,4) DEFAULT 0.0000,
  `PagosEfectivo` decimal(19,4) DEFAULT 0.0000,
  `PagosTransf` decimal(19,4) DEFAULT 0.0000,
  `Egresos` decimal(19,4) DEFAULT 0.0000,
  `Anulaciones` decimal(19,4) DEFAULT 0.0000,
  `RetirosParciales` decimal(19,4) DEFAULT 0.0000,
  `TotalEfectivoSistema` decimal(19,4) DEFAULT 0.0000,
  `ConteoFinal` decimal(19,4) DEFAULT 0.0000,
  `DiferenciaFinal` decimal(19,4) DEFAULT 0.0000,
  `Estado` enum('abierta','cerrada') DEFAULT 'abierta',
  `Observacion` varchar(255) DEFAULT '',
  PRIMARY KEY (`Id_Sesion`),
  KEY `idx_caja` (`Id_Caja`),
  KEY `idx_usuario` (`Id_Usuario`),
  KEY `idx_estado` (`Estado`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `tbltempfactutilidad`
--

DROP TABLE IF EXISTS `tbltempfactutilidad`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `tbltempfactutilidad` (
  `Factura_N` int(11) DEFAULT 0,
  `Fecha` datetime DEFAULT NULL,
  `Tipo` varchar(8) DEFAULT NULL,
  `Cantidad` int(11) DEFAULT 0,
  `PrecioV` decimal(19,4) DEFAULT 0.0000,
  `PrecioCostoReal` decimal(19,4) DEFAULT 0.0000,
  `Subtotal` decimal(19,4) DEFAULT 0.0000,
  `Total` decimal(19,4) DEFAULT 0.0000,
  `N_Mes` int(11) DEFAULT 0,
  `Año` int(11) DEFAULT 0,
  `UtilidadBru` decimal(19,4) DEFAULT 0.0000
) ENGINE=MyISAM DEFAULT CHARSET=utf8mb3 COLLATE=utf8mb3_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `tbltemplistadofactuvenc`
--

DROP TABLE IF EXISTS `tbltemplistadofactuvenc`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `tbltemplistadofactuvenc` (
  `NFactura` varchar(30) DEFAULT NULL,
  `Fecha` datetime DEFAULT NULL,
  `Dias` int(11) DEFAULT 0,
  `FechaVenc` datetime DEFAULT NULL,
  `Total` decimal(19,4) DEFAULT 0.0000,
  `Saldo` decimal(19,4) DEFAULT 0.0000,
  `Codigo` int(11) DEFAULT 0,
  `Nombre` varchar(80) DEFAULT NULL,
  `Empresa` varchar(100) DEFAULT NULL,
  `Informe` varchar(50) DEFAULT NULL,
  `DiasVenc` int(11) DEFAULT NULL,
  `SinVencer` decimal(19,4) DEFAULT NULL,
  `De1a30` int(11) DEFAULT 0,
  `Mas60` int(11) DEFAULT 0,
  `de31a60` int(11) DEFAULT 0
) ENGINE=MyISAM DEFAULT CHARSET=utf8mb3 COLLATE=utf8mb3_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `tbltemplistadofactuvencpro`
--

DROP TABLE IF EXISTS `tbltemplistadofactuvencpro`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `tbltemplistadofactuvencpro` (
  `NFactura` varchar(30) NOT NULL,
  `Fecha` datetime NOT NULL,
  `Dias` int(11) NOT NULL,
  `DiasVenc` int(11) NOT NULL,
  `FechaVenc` datetime NOT NULL,
  `Total` decimal(19,4) NOT NULL,
  `Saldo` decimal(19,4) NOT NULL,
  `Codigo` int(11) NOT NULL,
  `Nombre` varchar(80) NOT NULL,
  `SinVencer` decimal(19,4) NOT NULL,
  `De1a30` decimal(19,4) NOT NULL,
  `de31a60` decimal(19,4) NOT NULL,
  `Mas60` decimal(19,4) NOT NULL
) ENGINE=MyISAM DEFAULT CHARSET=utf8mb3 COLLATE=utf8mb3_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `tbltempmes`
--

DROP TABLE IF EXISTS `tbltempmes`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `tbltempmes` (
  `Id` int(11) NOT NULL DEFAULT 0,
  `Año` int(11) DEFAULT 0,
  `Mes` int(11) DEFAULT 0,
  `FechaAct` timestamp NOT NULL DEFAULT current_timestamp(),
  `Fact_N` int(11) DEFAULT 0,
  `CuentaN` varchar(15) DEFAULT NULL,
  `Rec_Caja` int(11) DEFAULT 0,
  `DiasFact` int(11) DEFAULT 0,
  `CuentaN2` int(11) DEFAULT 0,
  `Fact_Temp` int(11) DEFAULT 0,
  PRIMARY KEY (`Id`)
) ENGINE=MyISAM DEFAULT CHARSET=utf8mb3 COLLATE=utf8mb3_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `tbltempventas`
--

DROP TABLE IF EXISTS `tbltempventas`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `tbltempventas` (
  `IdTempVenta` int(11) NOT NULL AUTO_INCREMENT,
  `NFacturaTemp` int(11) DEFAULT 0,
  `CodigoCli` int(11) DEFAULT 0,
  `NombreCliente` varchar(100) NOT NULL,
  `Dias` int(11) DEFAULT 0,
  `FechaHora` datetime DEFAULT NULL,
  PRIMARY KEY (`IdTempVenta`),
  KEY `IdTempVenta` (`IdTempVenta`)
) ENGINE=MyISAM AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb3 COLLATE=utf8mb3_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `tbltipomovimiento`
--

DROP TABLE IF EXISTS `tbltipomovimiento`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `tbltipomovimiento` (
  `Id_TipoMoviento` int(11) NOT NULL AUTO_INCREMENT,
  `Movimiento` varchar(50) DEFAULT NULL,
  PRIMARY KEY (`Id_TipoMoviento`),
  KEY `Id_TipoMoviento` (`Id_TipoMoviento`)
) ENGINE=MyISAM AUTO_INCREMENT=10 DEFAULT CHARSET=utf8mb3 COLLATE=utf8mb3_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `tbltiposusuario`
--

DROP TABLE IF EXISTS `tbltiposusuario`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `tbltiposusuario` (
  `Id_TiposUsuario` int(11) NOT NULL AUTO_INCREMENT,
  `Nombre_TipoUsuario` varchar(50) DEFAULT NULL,
  `Nivel` text DEFAULT NULL,
  `permisos` text DEFAULT NULL,
  PRIMARY KEY (`Id_TiposUsuario`),
  KEY `Id_TiposUsuario` (`Id_TiposUsuario`)
) ENGINE=MyISAM AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb3 COLLATE=utf8mb3_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `tblusuarios`
--

DROP TABLE IF EXISTS `tblusuarios`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `tblusuarios` (
  `Id_Usuario` int(11) NOT NULL AUTO_INCREMENT,
  `Usuario` varchar(10) DEFAULT NULL,
  `Nombre` varchar(50) DEFAULT NULL,
  `Indentificacion` int(11) DEFAULT 0,
  `contrasena` longtext DEFAULT NULL,
  `Nivel` text DEFAULT NULL,
  `Id_TiposUsuario` int(11) DEFAULT 0,
  `Id_Caja` int(11) DEFAULT NULL,
  PRIMARY KEY (`Id_Usuario`),
  KEY `Id_TiposUsuario` (`Id_TiposUsuario`),
  KEY `Id_Usuario` (`Id_Usuario`),
  KEY `idx_caja` (`Id_Caja`)
) ENGINE=MyISAM AUTO_INCREMENT=12 DEFAULT CHARSET=utf8mb3 COLLATE=utf8mb3_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `tblventa_retenciones`
--

DROP TABLE IF EXISTS `tblventa_retenciones`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `tblventa_retenciones` (
  `Id` int(11) NOT NULL AUTO_INCREMENT,
  `Factura_N` int(11) NOT NULL,
  `Id_Retencion` int(11) DEFAULT NULL,
  `Codigo` varchar(20) DEFAULT NULL,
  `Nombre` varchar(120) DEFAULT NULL,
  `Porcentaje` decimal(7,4) DEFAULT NULL,
  `Base` decimal(19,4) DEFAULT NULL,
  `Valor` decimal(19,4) DEFAULT NULL,
  `Modo` enum('informativo','gross_up') DEFAULT 'informativo',
  `Fecha` timestamp NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`Id`),
  KEY `idx_factura` (`Factura_N`),
  KEY `idx_retencion` (`Id_Retencion`)
) ENGINE=InnoDB AUTO_INCREMENT=18 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `tblventas`
--

DROP TABLE IF EXISTS `tblventas`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `tblventas` (
  `Factura_N` int(11) NOT NULL AUTO_INCREMENT,
  `N_Mes` int(11) DEFAULT NULL,
  `anio` int(11) DEFAULT NULL,
  `Fecha` datetime DEFAULT NULL,
  `Tipo` varchar(8) DEFAULT NULL,
  `Dias` int(11) DEFAULT NULL,
  `CodigoCli` int(11) DEFAULT NULL,
  `A_nombre` varchar(70) DEFAULT NULL,
  `Identificacion` varchar(20) DEFAULT NULL,
  `Direccion` varchar(50) DEFAULT NULL,
  `Telefono` varchar(50) DEFAULT NULL,
  `Impuesto` decimal(19,4) DEFAULT NULL,
  `Descuento` decimal(19,4) DEFAULT NULL,
  `Flete` decimal(19,4) DEFAULT NULL,
  `Total` decimal(19,4) DEFAULT NULL,
  `Saldo` decimal(19,4) DEFAULT NULL,
  `EstadoPedido` varchar(15) DEFAULT NULL,
  `Comentario` text DEFAULT NULL,
  `EstadoFact` varchar(10) DEFAULT NULL,
  `Pago` varchar(50) DEFAULT NULL,
  `Cambio` varchar(50) DEFAULT NULL,
  `Hora` varchar(50) DEFAULT NULL,
  `Id_Usuario` int(11) DEFAULT NULL,
  `Abono` decimal(19,4) DEFAULT NULL,
  `pagada` varchar(1) NOT NULL,
  `CodigoEmp` int(11) DEFAULT NULL,
  `Modifi` int(11) DEFAULT NULL,
  `FechaMod` datetime DEFAULT NULL,
  `id_mediopago` int(11) NOT NULL,
  `efectivo` double NOT NULL,
  `valorpagado1` double NOT NULL,
  `enviada_dian` tinyint(1) DEFAULT 0,
  `fecha_envio_dian` datetime DEFAULT NULL,
  `cufe` varchar(200) DEFAULT NULL,
  `en_contingencia` tinyint(1) DEFAULT 0,
  `contingencia_fecha` datetime DEFAULT NULL,
  `contingencia_reenviada` tinyint(1) DEFAULT 0,
  `contingencia_motivo` varchar(255) DEFAULT NULL,
  `email` varchar(150) DEFAULT NULL,
  PRIMARY KEY (`Factura_N`),
  KEY `idx_fecha` (`Fecha`),
  KEY `idx_codigoemp` (`CodigoEmp`),
  KEY `idx_estadofact` (`EstadoFact`),
  KEY `idx_fecha_estado` (`Fecha`,`EstadoFact`),
  KEY `idx_codigoemp_fecha` (`CodigoEmp`,`Fecha`),
  KEY `idx_codigoemp_fecha_estado` (`CodigoEmp`,`Fecha`,`EstadoFact`),
  KEY `idx_contingencia_pendientes` (`en_contingencia`,`contingencia_reenviada`)
) ENGINE=InnoDB AUTO_INCREMENT=63 DEFAULT CHARSET=utf8mb3 COLLATE=utf8mb3_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `tipos_documentos`
--

DROP TABLE IF EXISTS `tipos_documentos`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `tipos_documentos` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `code` varchar(10) NOT NULL,
  `name` varchar(100) NOT NULL,
  `description` varchar(255) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `type_documents`
--

DROP TABLE IF EXISTS `type_documents`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `type_documents` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `code` varchar(2) NOT NULL,
  `name` varchar(255) NOT NULL,
  `cufe_algorithm` varchar(255) NOT NULL DEFAULT 'CUFE-SHA384',
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `type_documents_code_unique` (`code`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `type_item_identifications`
--

DROP TABLE IF EXISTS `type_item_identifications`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `type_item_identifications` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `code` varchar(5) NOT NULL,
  `code_agency` varchar(255) DEFAULT NULL COMMENT 'Agencia asociada al esquema de identificación',
  `name` varchar(100) NOT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `type_item_identifications_code_unique` (`code`)
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `type_liabilities`
--

DROP TABLE IF EXISTS `type_liabilities`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `type_liabilities` (
  `id` int(11) NOT NULL,
  `code` varchar(10) NOT NULL,
  `name` varchar(100) NOT NULL,
  `description` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `type_organizations`
--

DROP TABLE IF EXISTS `type_organizations`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `type_organizations` (
  `id` int(11) NOT NULL,
  `code` varchar(5) NOT NULL,
  `name` varchar(50) NOT NULL,
  `description` varchar(100) DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `type_regimes`
--

DROP TABLE IF EXISTS `type_regimes`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `type_regimes` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `code` varchar(255) NOT NULL,
  `name` varchar(255) NOT NULL,
  `description` varchar(255) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=19 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `unit_measures`
--

DROP TABLE IF EXISTS `unit_measures`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `unit_measures` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(255) NOT NULL,
  `code` char(10) NOT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=1094 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Temporary table structure for view `ver_factura`
--

DROP TABLE IF EXISTS `ver_factura`;
/*!50001 DROP VIEW IF EXISTS `ver_factura`*/;
SET @saved_cs_client     = @@character_set_client;
SET character_set_client = utf8;
/*!50001 CREATE VIEW `ver_factura` AS SELECT
 1 AS `Factura_N`,
  1 AS `Fecha`,
  1 AS `Hora`,
  1 AS `Tipo`,
  1 AS `Dias`,
  1 AS `A_nombre`,
  1 AS `Identificacion`,
  1 AS `Telef`,
  1 AS `Direcc`,
  1 AS `Impuesto`,
  1 AS `Descuento`,
  1 AS `Total`,
  1 AS `Saldo`,
  1 AS `Pago`,
  1 AS `Cambio`,
  1 AS `Nombre` */;
SET character_set_client = @saved_cs_client;

--
-- Temporary table structure for view `view_detalles_ventas`
--

DROP TABLE IF EXISTS `view_detalles_ventas`;
/*!50001 DROP VIEW IF EXISTS `view_detalles_ventas`*/;
SET @saved_cs_client     = @@character_set_client;
SET character_set_client = utf8;
/*!50001 CREATE VIEW `view_detalles_ventas` AS SELECT
 1 AS `Factura_N`,
  1 AS `Items`,
  1 AS `Codigo`,
  1 AS `Nombres_Articulo`,
  1 AS `PrecioV`,
  1 AS `Cantidad`,
  1 AS `IVA`,
  1 AS `DescuPro`,
  1 AS `Entregado`,
  1 AS `subtotal`,
  1 AS `impuesto` */;
SET character_set_client = @saved_cs_client;

--
-- Temporary table structure for view `view_listado_facturas_electronica`
--

DROP TABLE IF EXISTS `view_listado_facturas_electronica`;
/*!50001 DROP VIEW IF EXISTS `view_listado_facturas_electronica`*/;
SET @saved_cs_client     = @@character_set_client;
SET character_set_client = utf8;
/*!50001 CREATE VIEW `view_listado_facturas_electronica` AS SELECT
 1 AS `fecha`,
  1 AS `num_factura`,
  1 AS `tipo_doc`,
  1 AS `payment_form_id`,
  1 AS `cliente`,
  1 AS `total`,
  1 AS `mediopago`,
  1 AS `status`,
  1 AS `cufe`,
  1 AS `prefix`,
  1 AS `invoice_cufe`,
  1 AS `fechahora`,
  1 AS `number`,
  1 AS `type_document_id`,
  1 AS `email_sent` */;
SET character_set_client = @saved_cs_client;

--
-- Temporary table structure for view `vw_auditoria_inventario_90d`
--

DROP TABLE IF EXISTS `vw_auditoria_inventario_90d`;
/*!50001 DROP VIEW IF EXISTS `vw_auditoria_inventario_90d`*/;
SET @saved_cs_client     = @@character_set_client;
SET character_set_client = utf8;
/*!50001 CREATE VIEW `vw_auditoria_inventario_90d` AS SELECT
 1 AS `Items`,
  1 AS `Codigo`,
  1 AS `Nombres_Articulo`,
  1 AS `Existencia`,
  1 AS `Precio_Costo`,
  1 AS `Precio_Venta`,
  1 AS `Margen_Porc`,
  1 AS `Unidades_Vendidas_90d`,
  1 AS `Veces_Vendido_90d`,
  1 AS `Total_Vendido_90d`,
  1 AS `Ultima_Venta`,
  1 AS `Capital_Invertido`,
  1 AS `Dias_Stock`,
  1 AS `Categoria`,
  1 AS `Proveedor`,
  1 AS `Auditoria` */;
SET character_set_client = @saved_cs_client;

--
-- Temporary table structure for view `vw_capacidad_compuestos`
--

DROP TABLE IF EXISTS `vw_capacidad_compuestos`;
/*!50001 DROP VIEW IF EXISTS `vw_capacidad_compuestos`*/;
SET @saved_cs_client     = @@character_set_client;
SET character_set_client = utf8;
/*!50001 CREATE VIEW `vw_capacidad_compuestos` AS SELECT
 1 AS `Items_Padre`,
  1 AS `Codigo`,
  1 AS `Producto`,
  1 AS `Unidades_Posibles`,
  1 AS `Costo_Total_Receta`,
  1 AS `Precio_Venta`,
  1 AS `Num_Componentes` */;
SET character_set_client = @saved_cs_client;

--
-- Temporary table structure for view `vw_componentes_detalle`
--

DROP TABLE IF EXISTS `vw_componentes_detalle`;
/*!50001 DROP VIEW IF EXISTS `vw_componentes_detalle`*/;
SET @saved_cs_client     = @@character_set_client;
SET character_set_client = utf8;
/*!50001 CREATE VIEW `vw_componentes_detalle` AS SELECT
 1 AS `Id_Componente`,
  1 AS `Items_Padre`,
  1 AS `Items_Componente`,
  1 AS `Cantidad`,
  1 AS `Comentario`,
  1 AS `Codigo_Padre`,
  1 AS `Nombre_Padre`,
  1 AS `Costo_Padre_Actual`,
  1 AS `Precio_Venta_Padre`,
  1 AS `Codigo_Componente`,
  1 AS `Nombre_Componente`,
  1 AS `Stock_Componente`,
  1 AS `Costo_Unit_Componente`,
  1 AS `Costo_Aporte` */;
SET character_set_client = @saved_cs_client;

--
-- Temporary table structure for view `vw_diagnostico_inventario_30d`
--

DROP TABLE IF EXISTS `vw_diagnostico_inventario_30d`;
/*!50001 DROP VIEW IF EXISTS `vw_diagnostico_inventario_30d`*/;
SET @saved_cs_client     = @@character_set_client;
SET character_set_client = utf8;
/*!50001 CREATE VIEW `vw_diagnostico_inventario_30d` AS SELECT
 1 AS `Items`,
  1 AS `Nombres_Articulo`,
  1 AS `Existencia`,
  1 AS `Precio_Costo`,
  1 AS `Precio_Venta`,
  1 AS `Margen_Porc`,
  1 AS `Unidades_Vendidas_30d`,
  1 AS `Veces_Vendido_30d`,
  1 AS `Capital_Invertido`,
  1 AS `Diagnostico` */;
SET character_set_client = @saved_cs_client;

--
-- Temporary table structure for view `vw_facturas_anteriores_cliente`
--

DROP TABLE IF EXISTS `vw_facturas_anteriores_cliente`;
/*!50001 DROP VIEW IF EXISTS `vw_facturas_anteriores_cliente`*/;
SET @saved_cs_client     = @@character_set_client;
SET character_set_client = utf8;
/*!50001 CREATE VIEW `vw_facturas_anteriores_cliente` AS SELECT
 1 AS `CodigoCli`,
  1 AS `FacturaN`,
  1 AS `Fecha`,
  1 AS `Dias`,
  1 AS `Fechav`,
  1 AS `Total`,
  1 AS `TotalPagos`,
  1 AS `Saldo`,
  1 AS `DiasVenc`,
  1 AS `Vencida` */;
SET character_set_client = @saved_cs_client;

--
-- Temporary table structure for view `vw_facturas_cliente_saldos`
--

DROP TABLE IF EXISTS `vw_facturas_cliente_saldos`;
/*!50001 DROP VIEW IF EXISTS `vw_facturas_cliente_saldos`*/;
SET @saved_cs_client     = @@character_set_client;
SET character_set_client = utf8;
/*!50001 CREATE VIEW `vw_facturas_cliente_saldos` AS SELECT
 1 AS `Factura_N`,
  1 AS `CodigoCli`,
  1 AS `A_Nombre`,
  1 AS `Fecha`,
  1 AS `Dias`,
  1 AS `Fechav`,
  1 AS `Total`,
  1 AS `TotalPagos`,
  1 AS `Saldo`,
  1 AS `Tipo`,
  1 AS `EstadoFact`,
  1 AS `FechaMod`,
  1 AS `DiasVenc`,
  1 AS `Vencida` */;
SET character_set_client = @saved_cs_client;

--
-- Temporary table structure for view `vw_facturas_elec_cliente_saldos`
--

DROP TABLE IF EXISTS `vw_facturas_elec_cliente_saldos`;
/*!50001 DROP VIEW IF EXISTS `vw_facturas_elec_cliente_saldos`*/;
SET @saved_cs_client     = @@character_set_client;
SET character_set_client = utf8;
/*!50001 CREATE VIEW `vw_facturas_elec_cliente_saldos` AS SELECT
 1 AS `DocID`,
  1 AS `Factura_N`,
  1 AS `CodigoCli`,
  1 AS `A_Nombre`,
  1 AS `Fecha`,
  1 AS `Dias`,
  1 AS `Fechav`,
  1 AS `Total`,
  1 AS `TotalPagos`,
  1 AS `Saldo`,
  1 AS `Tipo`,
  1 AS `EstadoFact`,
  1 AS `updated_at`,
  1 AS `DiasVenc`,
  1 AS `Vencida` */;
SET character_set_client = @saved_cs_client;

--
-- Temporary table structure for view `vw_item_ventas_30d`
--

DROP TABLE IF EXISTS `vw_item_ventas_30d`;
/*!50001 DROP VIEW IF EXISTS `vw_item_ventas_30d`*/;
SET @saved_cs_client     = @@character_set_client;
SET character_set_client = utf8;
/*!50001 CREATE VIEW `vw_item_ventas_30d` AS SELECT
 1 AS `Items`,
  1 AS `Unidades_Vendidas_30d`,
  1 AS `Veces_Vendido_30d` */;
SET character_set_client = @saved_cs_client;

--
-- Temporary table structure for view `vw_item_ventas_90d`
--

DROP TABLE IF EXISTS `vw_item_ventas_90d`;
/*!50001 DROP VIEW IF EXISTS `vw_item_ventas_90d`*/;
SET @saved_cs_client     = @@character_set_client;
SET character_set_client = utf8;
/*!50001 CREATE VIEW `vw_item_ventas_90d` AS SELECT
 1 AS `Items`,
  1 AS `Unidades_Vendidas_90d`,
  1 AS `Veces_Vendido_90d`,
  1 AS `Total_Vendido_90d`,
  1 AS `Ultima_Venta` */;
SET character_set_client = @saved_cs_client;

--
-- Temporary table structure for view `vw_lotes_por_vencer`
--

DROP TABLE IF EXISTS `vw_lotes_por_vencer`;
/*!50001 DROP VIEW IF EXISTS `vw_lotes_por_vencer`*/;
SET @saved_cs_client     = @@character_set_client;
SET character_set_client = utf8;
/*!50001 CREATE VIEW `vw_lotes_por_vencer` AS SELECT
 1 AS `Id_Lote`,
  1 AS `Items`,
  1 AS `Numero_Lote`,
  1 AS `Fecha_Vencimiento`,
  1 AS `Fecha_Ingreso`,
  1 AS `Cantidad_Inicial`,
  1 AS `Cantidad_Actual`,
  1 AS `dias_restantes`,
  1 AS `Codigo`,
  1 AS `Nombres_Articulo`,
  1 AS `Precio_Costo`,
  1 AS `Precio_Venta`,
  1 AS `valor_costo` */;
SET character_set_client = @saved_cs_client;

--
-- Temporary table structure for view `vw_productos_stock_bajo`
--

DROP TABLE IF EXISTS `vw_productos_stock_bajo`;
/*!50001 DROP VIEW IF EXISTS `vw_productos_stock_bajo`*/;
SET @saved_cs_client     = @@character_set_client;
SET character_set_client = utf8;
/*!50001 CREATE VIEW `vw_productos_stock_bajo` AS SELECT
 1 AS `Items`,
  1 AS `Codigo`,
  1 AS `Nombres_Articulo`,
  1 AS `Existencia`,
  1 AS `Stock_Minimo`,
  1 AS `Precio_Venta`,
  1 AS `Id_Familia`,
  1 AS `Familia_Nombre` */;
SET character_set_client = @saved_cs_client;

--
-- Temporary table structure for view `vw_prov_cxp_aging`
--

DROP TABLE IF EXISTS `vw_prov_cxp_aging`;
/*!50001 DROP VIEW IF EXISTS `vw_prov_cxp_aging`*/;
SET @saved_cs_client     = @@character_set_client;
SET character_set_client = utf8;
/*!50001 CREATE VIEW `vw_prov_cxp_aging` AS SELECT
 1 AS `CodigoPro`,
  1 AS `RazonSocial`,
  1 AS `FacturaN`,
  1 AS `Fecha`,
  1 AS `Dias`,
  1 AS `Fechav`,
  1 AS `Total`,
  1 AS `TotalPagos`,
  1 AS `Saldo`,
  1 AS `DiasVenc`,
  1 AS `Vencida`,
  1 AS `Origen` */;
SET character_set_client = @saved_cs_client;

--
-- Temporary table structure for view `vw_prov_facturas_anteriores_saldos`
--

DROP TABLE IF EXISTS `vw_prov_facturas_anteriores_saldos`;
/*!50001 DROP VIEW IF EXISTS `vw_prov_facturas_anteriores_saldos`*/;
SET @saved_cs_client     = @@character_set_client;
SET character_set_client = utf8;
/*!50001 CREATE VIEW `vw_prov_facturas_anteriores_saldos` AS SELECT
 1 AS `FacturaN`,
  1 AS `CodigoPro`,
  1 AS `RazonSocial`,
  1 AS `Fecha`,
  1 AS `Dias`,
  1 AS `Fechav`,
  1 AS `Total`,
  1 AS `TotalPagos`,
  1 AS `Saldo` */;
SET character_set_client = @saved_cs_client;

--
-- Temporary table structure for view `vw_prov_pedidos_credito_saldos`
--

DROP TABLE IF EXISTS `vw_prov_pedidos_credito_saldos`;
/*!50001 DROP VIEW IF EXISTS `vw_prov_pedidos_credito_saldos`*/;
SET @saved_cs_client     = @@character_set_client;
SET character_set_client = utf8;
/*!50001 CREATE VIEW `vw_prov_pedidos_credito_saldos` AS SELECT
 1 AS `FacturaN`,
  1 AS `CodigoPro`,
  1 AS `RazonSocial`,
  1 AS `Fecha`,
  1 AS `Dias`,
  1 AS `Fechav`,
  1 AS `Total`,
  1 AS `TotalPagos`,
  1 AS `Saldo`,
  1 AS `TipoPedido`,
  1 AS `EstadoPedido`,
  1 AS `Pedido_N` */;
SET character_set_client = @saved_cs_client;

--
-- Temporary table structure for view `vw_proveedores_saldo_actual`
--

DROP TABLE IF EXISTS `vw_proveedores_saldo_actual`;
/*!50001 DROP VIEW IF EXISTS `vw_proveedores_saldo_actual`*/;
SET @saved_cs_client     = @@character_set_client;
SET character_set_client = utf8;
/*!50001 CREATE VIEW `vw_proveedores_saldo_actual` AS SELECT
 1 AS `CodigoPro`,
  1 AS `RazonSocial`,
  1 AS `SaldoAnterior`,
  1 AS `SaldoPedidos`,
  1 AS `SaldoActual` */;
SET character_set_client = @saved_cs_client;

--
-- Final view structure for view `ver_factura`
--

/*!50001 DROP VIEW IF EXISTS `ver_factura`*/;
/*!50001 SET @saved_cs_client          = @@character_set_client */;
/*!50001 SET @saved_cs_results         = @@character_set_results */;
/*!50001 SET @saved_col_connection     = @@collation_connection */;
/*!50001 SET character_set_client      = utf8mb4 */;
/*!50001 SET character_set_results     = utf8mb4 */;
/*!50001 SET collation_connection      = utf8mb4_unicode_ci */;
/*!50001 CREATE ALGORITHM=UNDEFINED */
/*!50013 DEFINER=`root`@`localhost` SQL SECURITY DEFINER */
/*!50001 VIEW `ver_factura` AS select `v`.`Factura_N` AS `Factura_N`,`v`.`Fecha` AS `Fecha`,`v`.`Hora` AS `Hora`,`v`.`Tipo` AS `Tipo`,`v`.`Dias` AS `Dias`,`v`.`A_nombre` AS `A_nombre`,`v`.`Identificacion` AS `Identificacion`,`v`.`Telefono` AS `Telef`,`v`.`Direccion` AS `Direcc`,`v`.`Impuesto` AS `Impuesto`,`v`.`Descuento` AS `Descuento`,`v`.`Total` AS `Total`,`v`.`Saldo` AS `Saldo`,`v`.`Pago` AS `Pago`,`v`.`Cambio` AS `Cambio`,`u`.`Nombre` AS `Nombre` from (`tblventas` `v` join `tblusuarios` `u` on(`v`.`Id_Usuario` = `u`.`Id_Usuario`)) */;
/*!50001 SET character_set_client      = @saved_cs_client */;
/*!50001 SET character_set_results     = @saved_cs_results */;
/*!50001 SET collation_connection      = @saved_col_connection */;

--
-- Final view structure for view `view_detalles_ventas`
--

/*!50001 DROP VIEW IF EXISTS `view_detalles_ventas`*/;
/*!50001 SET @saved_cs_client          = @@character_set_client */;
/*!50001 SET @saved_cs_results         = @@character_set_results */;
/*!50001 SET @saved_col_connection     = @@collation_connection */;
/*!50001 SET character_set_client      = utf8mb4 */;
/*!50001 SET character_set_results     = utf8mb4 */;
/*!50001 SET collation_connection      = utf8mb4_unicode_ci */;
/*!50001 CREATE ALGORITHM=UNDEFINED */
/*!50013 DEFINER=`root`@`localhost` SQL SECURITY DEFINER */
/*!50001 VIEW `view_detalles_ventas` AS select `d`.`Factura_N` AS `Factura_N`,`d`.`Items` AS `Items`,`a`.`Codigo` AS `Codigo`,`a`.`Nombres_Articulo` AS `Nombres_Articulo`,`d`.`PrecioV` AS `PrecioV`,`d`.`Cantidad` AS `Cantidad`,`d`.`IVA` AS `IVA`,`d`.`Descuento` AS `DescuPro`,`d`.`Entregado` AS `Entregado`,`d`.`PrecioV` * `d`.`Cantidad` - `d`.`Descuento` AS `subtotal`,(`d`.`PrecioV` * `d`.`Cantidad` - `d`.`Descuento`) / (`d`.`IVA` / 100 + 1) AS `impuesto` from (`tbldetalle_venta` `d` left join `tblarticulos` `a` on(`d`.`Items` = `a`.`Items`)) */;
/*!50001 SET character_set_client      = @saved_cs_client */;
/*!50001 SET character_set_results     = @saved_cs_results */;
/*!50001 SET collation_connection      = @saved_col_connection */;

--
-- Final view structure for view `view_listado_facturas_electronica`
--

/*!50001 DROP VIEW IF EXISTS `view_listado_facturas_electronica`*/;
/*!50001 SET @saved_cs_client          = @@character_set_client */;
/*!50001 SET @saved_cs_results         = @@character_set_results */;
/*!50001 SET @saved_col_connection     = @@collation_connection */;
/*!50001 SET character_set_client      = utf8mb4 */;
/*!50001 SET character_set_results     = utf8mb4 */;
/*!50001 SET collation_connection      = utf8mb4_unicode_ci */;
/*!50001 CREATE ALGORITHM=UNDEFINED */
/*!50013 DEFINER=`root`@`localhost` SQL SECURITY DEFINER */
/*!50001 VIEW `view_listado_facturas_electronica` AS select `e`.`fecha` AS `fecha`,concat(`e`.`prefix`,`e`.`number`) AS `num_factura`,`t`.`name` AS `tipo_doc`,`e`.`payment_form_id` AS `payment_form_id`,`c`.`Razon_Social` AS `cliente`,`e`.`total` AS `total`,`m`.`nombre_medio` AS `mediopago`,`e`.`status` AS `status`,`e`.`cufe` AS `cufe`,`e`.`prefix` AS `prefix`,`e`.`invoice_cufe` AS `invoice_cufe`,`e`.`created_at` AS `fechahora`,`e`.`number` AS `number`,`e`.`type_document_id` AS `type_document_id`,`e`.`email_sent` AS `email_sent` from (((`electronic_documents` `e` left join `type_documents` `t` on(`t`.`id` = `e`.`type_document_id`)) left join `tblclientes` `c` on(`c`.`CodigoClien` = `e`.`cod_cliente`)) left join `tblmedios_pago` `m` on(`m`.`id_mediopago` = `e`.`id_mediopago`)) order by `e`.`fecha` */;
/*!50001 SET character_set_client      = @saved_cs_client */;
/*!50001 SET character_set_results     = @saved_cs_results */;
/*!50001 SET collation_connection      = @saved_col_connection */;

--
-- Final view structure for view `vw_auditoria_inventario_90d`
--

/*!50001 DROP VIEW IF EXISTS `vw_auditoria_inventario_90d`*/;
/*!50001 SET @saved_cs_client          = @@character_set_client */;
/*!50001 SET @saved_cs_results         = @@character_set_results */;
/*!50001 SET @saved_col_connection     = @@collation_connection */;
/*!50001 SET character_set_client      = utf8mb4 */;
/*!50001 SET character_set_results     = utf8mb4 */;
/*!50001 SET collation_connection      = utf8mb4_general_ci */;
/*!50001 CREATE ALGORITHM=UNDEFINED */
/*!50013 DEFINER=`root`@`localhost` SQL SECURITY DEFINER */
/*!50001 VIEW `vw_auditoria_inventario_90d` AS select `a`.`Items` AS `Items`,`a`.`Codigo` AS `Codigo`,`a`.`Nombres_Articulo` AS `Nombres_Articulo`,`a`.`Existencia` AS `Existencia`,`a`.`Precio_Costo` AS `Precio_Costo`,`a`.`Precio_Venta` AS `Precio_Venta`,case when `a`.`Precio_Costo` <= 0 then 0 when `a`.`Precio_Venta` <= 0 then 0 else round((`a`.`Precio_Venta` - `a`.`Precio_Costo`) / `a`.`Precio_Venta` * 100,2) end AS `Margen_Porc`,coalesce(`v`.`Unidades_Vendidas_90d`,0) AS `Unidades_Vendidas_90d`,coalesce(`v`.`Veces_Vendido_90d`,0) AS `Veces_Vendido_90d`,coalesce(`v`.`Total_Vendido_90d`,0) AS `Total_Vendido_90d`,`v`.`Ultima_Venta` AS `Ultima_Venta`,round(`a`.`Existencia` * `a`.`Precio_Costo`,0) AS `Capital_Invertido`,case when coalesce(`v`.`Unidades_Vendidas_90d`,0) > 0 then round(`a`.`Existencia` / (coalesce(`v`.`Unidades_Vendidas_90d`,0) / 90),0) else 999 end AS `Dias_Stock`,coalesce(`c`.`Categoria`,'VARIOS') AS `Categoria`,coalesce(`p`.`RazonSocial`,'') AS `Proveedor`,case when `a`.`Existencia` < 0 then 'Stock negativo' when `a`.`Precio_Costo` <= 0 then 'Costo inválido' when `a`.`Precio_Venta` <= `a`.`Precio_Costo` then 'Precio bajo costo' when (`a`.`Precio_Venta` - `a`.`Precio_Costo`) / `a`.`Precio_Venta` * 100 > 80 then 'Margen sospechoso' when `a`.`Existencia` > 0 and coalesce(`v`.`Veces_Vendido_90d`,0) = 0 then 'Capital muerto' when `a`.`Existencia` > 0 and coalesce(`v`.`Unidades_Vendidas_90d`,0) > 0 and `a`.`Existencia` / (coalesce(`v`.`Unidades_Vendidas_90d`,0) / 90) > 180 then 'Sobre-stock' when coalesce(`v`.`Veces_Vendido_90d`,0) >= 15 and (`a`.`Precio_Venta` - `a`.`Precio_Costo`) / `a`.`Precio_Venta` * 100 >= 20 then 'Excelente' when coalesce(`v`.`Veces_Vendido_90d`,0) >= 15 then 'Alta rotación / Margen bajo' when coalesce(`v`.`Veces_Vendido_90d`,0) >= 5 then 'Rotación normal' when coalesce(`v`.`Veces_Vendido_90d`,0) >= 1 then 'Baja rotación' else 'Sin movimiento' end AS `Auditoria` from (((`tblarticulos` `a` left join `vw_item_ventas_90d` `v` on(`a`.`Items` = `v`.`Items`)) left join `tblcategoria` `c` on(`a`.`Id_Categoria` = `c`.`Id_Categoria`)) left join `tblproveedores` `p` on(`a`.`CodigoPro` = `p`.`CodigoPro`)) where `a`.`Estado` = 1 */;
/*!50001 SET character_set_client      = @saved_cs_client */;
/*!50001 SET character_set_results     = @saved_cs_results */;
/*!50001 SET collation_connection      = @saved_col_connection */;

--
-- Final view structure for view `vw_capacidad_compuestos`
--

/*!50001 DROP VIEW IF EXISTS `vw_capacidad_compuestos`*/;
/*!50001 SET @saved_cs_client          = @@character_set_client */;
/*!50001 SET @saved_cs_results         = @@character_set_results */;
/*!50001 SET @saved_col_connection     = @@collation_connection */;
/*!50001 SET character_set_client      = utf8mb4 */;
/*!50001 SET character_set_results     = utf8mb4 */;
/*!50001 SET collation_connection      = utf8mb4_general_ci */;
/*!50001 CREATE ALGORITHM=UNDEFINED */
/*!50013 DEFINER=`root`@`localhost` SQL SECURITY DEFINER */
/*!50001 VIEW `vw_capacidad_compuestos` AS select `c`.`Items_Padre` AS `Items_Padre`,`p`.`Codigo` AS `Codigo`,`p`.`Nombres_Articulo` AS `Producto`,min(case when `c`.`Cantidad` > 0 then floor(`h`.`Existencia` / `c`.`Cantidad`) else 0 end) AS `Unidades_Posibles`,sum(`c`.`Cantidad` * `h`.`Precio_Costo`) AS `Costo_Total_Receta`,`p`.`Precio_Venta` AS `Precio_Venta`,count(0) AS `Num_Componentes` from ((`tblproducto_componentes` `c` join `tblarticulos` `p` on(`c`.`Items_Padre` = `p`.`Items`)) join `tblarticulos` `h` on(`c`.`Items_Componente` = `h`.`Items`)) group by `c`.`Items_Padre`,`p`.`Codigo`,`p`.`Nombres_Articulo`,`p`.`Precio_Venta` */;
/*!50001 SET character_set_client      = @saved_cs_client */;
/*!50001 SET character_set_results     = @saved_cs_results */;
/*!50001 SET collation_connection      = @saved_col_connection */;

--
-- Final view structure for view `vw_componentes_detalle`
--

/*!50001 DROP VIEW IF EXISTS `vw_componentes_detalle`*/;
/*!50001 SET @saved_cs_client          = @@character_set_client */;
/*!50001 SET @saved_cs_results         = @@character_set_results */;
/*!50001 SET @saved_col_connection     = @@collation_connection */;
/*!50001 SET character_set_client      = utf8mb4 */;
/*!50001 SET character_set_results     = utf8mb4 */;
/*!50001 SET collation_connection      = utf8mb4_general_ci */;
/*!50001 CREATE ALGORITHM=UNDEFINED */
/*!50013 DEFINER=`root`@`localhost` SQL SECURITY DEFINER */
/*!50001 VIEW `vw_componentes_detalle` AS select `c`.`Id_Componente` AS `Id_Componente`,`c`.`Items_Padre` AS `Items_Padre`,`c`.`Items_Componente` AS `Items_Componente`,`c`.`Cantidad` AS `Cantidad`,`c`.`Comentario` AS `Comentario`,`p`.`Codigo` AS `Codigo_Padre`,`p`.`Nombres_Articulo` AS `Nombre_Padre`,`p`.`Precio_Costo` AS `Costo_Padre_Actual`,`p`.`Precio_Venta` AS `Precio_Venta_Padre`,`h`.`Codigo` AS `Codigo_Componente`,`h`.`Nombres_Articulo` AS `Nombre_Componente`,`h`.`Existencia` AS `Stock_Componente`,`h`.`Precio_Costo` AS `Costo_Unit_Componente`,`c`.`Cantidad` * `h`.`Precio_Costo` AS `Costo_Aporte` from ((`tblproducto_componentes` `c` join `tblarticulos` `p` on(`c`.`Items_Padre` = `p`.`Items`)) join `tblarticulos` `h` on(`c`.`Items_Componente` = `h`.`Items`)) */;
/*!50001 SET character_set_client      = @saved_cs_client */;
/*!50001 SET character_set_results     = @saved_cs_results */;
/*!50001 SET collation_connection      = @saved_col_connection */;

--
-- Final view structure for view `vw_diagnostico_inventario_30d`
--

/*!50001 DROP VIEW IF EXISTS `vw_diagnostico_inventario_30d`*/;
/*!50001 SET @saved_cs_client          = @@character_set_client */;
/*!50001 SET @saved_cs_results         = @@character_set_results */;
/*!50001 SET @saved_col_connection     = @@collation_connection */;
/*!50001 SET character_set_client      = utf8mb4 */;
/*!50001 SET character_set_results     = utf8mb4 */;
/*!50001 SET collation_connection      = utf8mb4_general_ci */;
/*!50001 CREATE ALGORITHM=UNDEFINED */
/*!50013 DEFINER=`root`@`localhost` SQL SECURITY DEFINER */
/*!50001 VIEW `vw_diagnostico_inventario_30d` AS select `a`.`Items` AS `Items`,`a`.`Nombres_Articulo` AS `Nombres_Articulo`,`a`.`Existencia` AS `Existencia`,`a`.`Precio_Costo` AS `Precio_Costo`,`a`.`Precio_Venta` AS `Precio_Venta`,case when `a`.`Precio_Costo` <= 0 then 0 when `a`.`Precio_Venta` <= 0 then 0 else round((`a`.`Precio_Venta` - `a`.`Precio_Costo`) / `a`.`Precio_Venta` * 100,2) end AS `Margen_Porc`,coalesce(`v`.`Unidades_Vendidas_30d`,0) AS `Unidades_Vendidas_30d`,coalesce(`v`.`Veces_Vendido_30d`,0) AS `Veces_Vendido_30d`,round(`a`.`Existencia` * `a`.`Precio_Costo`,0) AS `Capital_Invertido`,case when `a`.`Precio_Costo` <= 0 then 'Costo inválido' when `a`.`Precio_Venta` <= `a`.`Precio_Costo` then 'Precio por debajo del costo' when (`a`.`Precio_Venta` - `a`.`Precio_Costo`) / `a`.`Precio_Venta` * 100 > 80 then 'Margen sospechoso' when coalesce(`v`.`Veces_Vendido_30d`,0) >= 10 and (`a`.`Precio_Venta` - `a`.`Precio_Costo`) / `a`.`Precio_Venta` * 100 >= 20 then 'Alta rotación / Buen margen' when coalesce(`v`.`Veces_Vendido_30d`,0) >= 10 then 'Alta rotación / Margen bajo' when coalesce(`v`.`Veces_Vendido_30d`,0) between 3 and 9 and (`a`.`Precio_Venta` - `a`.`Precio_Costo`) / `a`.`Precio_Venta` * 100 >= 20 then 'Rotación media / Margen aceptable' when coalesce(`v`.`Veces_Vendido_30d`,0) between 3 and 9 then 'Rotación media / Margen bajo' when coalesce(`v`.`Veces_Vendido_30d`,0) between 1 and 2 and (`a`.`Precio_Venta` - `a`.`Precio_Costo`) / `a`.`Precio_Venta` * 100 >= 20 then 'Baja rotación / Margen aceptable' when coalesce(`v`.`Veces_Vendido_30d`,0) between 1 and 2 then 'Baja rotación / Margen insuficiente' else 'Revisar' end AS `Diagnostico` from (`tblarticulos` `a` left join `vw_item_ventas_30d` `v` on(`a`.`Items` = `v`.`Items`)) where `a`.`Estado` = 1 */;
/*!50001 SET character_set_client      = @saved_cs_client */;
/*!50001 SET character_set_results     = @saved_cs_results */;
/*!50001 SET collation_connection      = @saved_col_connection */;

--
-- Final view structure for view `vw_facturas_anteriores_cliente`
--

/*!50001 DROP VIEW IF EXISTS `vw_facturas_anteriores_cliente`*/;
/*!50001 SET @saved_cs_client          = @@character_set_client */;
/*!50001 SET @saved_cs_results         = @@character_set_results */;
/*!50001 SET @saved_col_connection     = @@collation_connection */;
/*!50001 SET character_set_client      = utf8mb4 */;
/*!50001 SET character_set_results     = utf8mb4 */;
/*!50001 SET collation_connection      = utf8mb4_general_ci */;
/*!50001 CREATE ALGORITHM=UNDEFINED */
/*!50013 DEFINER=`root`@`localhost` SQL SECURITY DEFINER */
/*!50001 VIEW `vw_facturas_anteriores_cliente` AS select `fa`.`CodigoCli` AS `CodigoCli`,`fa`.`FacturaN` AS `FacturaN`,`fa`.`Fecha` AS `Fecha`,`fa`.`Dias` AS `Dias`,`fa`.`Fecha` + interval `fa`.`Dias` day AS `Fechav`,`fa`.`Valor` AS `Total`,coalesce(`p`.`TotalPagos`,0) AS `TotalPagos`,greatest(`fa`.`Valor` - coalesce(`p`.`TotalPagos`,0),0) AS `Saldo`,case when curdate() >= `fa`.`Fecha` + interval `fa`.`Dias` day then to_days(curdate()) - to_days(`fa`.`Fecha` + interval `fa`.`Dias` day) else 0 end AS `DiasVenc`,curdate() > `fa`.`Fecha` + interval `fa`.`Dias` day AS `Vencida` from (`tblfacturasanteriores` `fa` left join (select `tp`.`Codigo` AS `CodigoCli`,coalesce(nullif(`tp`.`NFactAnt`,''),cast(`tp`.`Fact_N` as char charset utf8mb4)) AS `FacturaN`,sum(`tp`.`ValorPago` + coalesce(`tp`.`Descuento`,0)) AS `TotalPagos` from `tblpagos` `tp` where coalesce(`tp`.`Estado`,'Valida') = 'Valida' and `tp`.`ValorPago` >= 0 and coalesce(`tp`.`Descuento`,0) >= 0 and (`tp`.`NFactAnt` is not null and `tp`.`NFactAnt` <> '' or `tp`.`Fact_N` is not null) group by `tp`.`Codigo`,coalesce(nullif(`tp`.`NFactAnt`,''),cast(`tp`.`Fact_N` as char charset utf8mb4))) `p` on(`p`.`CodigoCli` = `fa`.`CodigoCli` and `p`.`FacturaN` = `fa`.`FacturaN`)) */;
/*!50001 SET character_set_client      = @saved_cs_client */;
/*!50001 SET character_set_results     = @saved_cs_results */;
/*!50001 SET collation_connection      = @saved_col_connection */;

--
-- Final view structure for view `vw_facturas_cliente_saldos`
--

/*!50001 DROP VIEW IF EXISTS `vw_facturas_cliente_saldos`*/;
/*!50001 SET @saved_cs_client          = @@character_set_client */;
/*!50001 SET @saved_cs_results         = @@character_set_results */;
/*!50001 SET @saved_col_connection     = @@collation_connection */;
/*!50001 SET character_set_client      = utf8mb4 */;
/*!50001 SET character_set_results     = utf8mb4 */;
/*!50001 SET collation_connection      = utf8mb4_general_ci */;
/*!50001 CREATE ALGORITHM=UNDEFINED */
/*!50013 DEFINER=`root`@`localhost` SQL SECURITY DEFINER */
/*!50001 VIEW `vw_facturas_cliente_saldos` AS select `v`.`Factura_N` AS `Factura_N`,`v`.`CodigoCli` AS `CodigoCli`,`c`.`Razon_Social` AS `A_Nombre`,`v`.`Fecha` AS `Fecha`,`v`.`Dias` AS `Dias`,`v`.`Fecha` + interval `v`.`Dias` day AS `Fechav`,`v`.`Total` AS `Total`,coalesce(`p`.`TotalPagos`,0) AS `TotalPagos`,greatest(`v`.`Total` - coalesce(`p`.`TotalPagos`,0),0) AS `Saldo`,`v`.`Tipo` AS `Tipo`,`v`.`EstadoFact` AS `EstadoFact`,`v`.`FechaMod` AS `FechaMod`,case when curdate() >= `v`.`Fecha` + interval `v`.`Dias` day then to_days(curdate()) - to_days(`v`.`Fecha` + interval `v`.`Dias` day) else 0 end AS `DiasVenc`,curdate() > `v`.`Fecha` + interval `v`.`Dias` day AS `Vencida` from ((`tblventas` `v` join `tblclientes` `c` on(`c`.`CodigoClien` = `v`.`CodigoCli`)) left join (select coalesce(nullif(`tp`.`Fact_N`,0),case when `tp`.`NFactAnt` regexp '^[0-9]+$' then cast(`tp`.`NFactAnt` as unsigned) end) AS `Fact_N`,sum(`tp`.`ValorPago` + coalesce(`tp`.`Descuento`,0)) AS `TotalPagos` from `tblpagos` `tp` where coalesce(`tp`.`Estado`,'Valida') = 'Valida' and `tp`.`ValorPago` >= 0 and coalesce(`tp`.`Descuento`,0) >= 0 group by coalesce(nullif(`tp`.`Fact_N`,0),case when `tp`.`NFactAnt` regexp '^[0-9]+$' then cast(`tp`.`NFactAnt` as unsigned) end)) `p` on(`p`.`Fact_N` = `v`.`Factura_N`)) where `v`.`Tipo` is not null and `v`.`Tipo` <> 'Contado' and `v`.`EstadoFact` = 'Valida' */;
/*!50001 SET character_set_client      = @saved_cs_client */;
/*!50001 SET character_set_results     = @saved_cs_results */;
/*!50001 SET collation_connection      = @saved_col_connection */;

--
-- Final view structure for view `vw_facturas_elec_cliente_saldos`
--

/*!50001 DROP VIEW IF EXISTS `vw_facturas_elec_cliente_saldos`*/;
/*!50001 SET @saved_cs_client          = @@character_set_client */;
/*!50001 SET @saved_cs_results         = @@character_set_results */;
/*!50001 SET @saved_col_connection     = @@collation_connection */;
/*!50001 SET character_set_client      = utf8mb4 */;
/*!50001 SET character_set_results     = utf8mb4 */;
/*!50001 SET collation_connection      = utf8mb4_general_ci */;
/*!50001 CREATE ALGORITHM=UNDEFINED */
/*!50013 DEFINER=`root`@`localhost` SQL SECURITY DEFINER */
/*!50001 VIEW `vw_facturas_elec_cliente_saldos` AS select `v`.`id` AS `DocID`,concat(`v`.`prefix`,`v`.`number`) AS `Factura_N`,`v`.`cod_cliente` AS `CodigoCli`,`c`.`Razon_Social` AS `A_Nombre`,`v`.`fecha` AS `Fecha`,`v`.`payment_due_days` AS `Dias`,`v`.`fecha` + interval `v`.`payment_due_days` day AS `Fechav`,`v`.`total` AS `Total`,coalesce(`p`.`TotalPagos`,0) AS `TotalPagos`,greatest(`v`.`total` - coalesce(`p`.`TotalPagos`,0),0) AS `Saldo`,`v`.`payment_form_id` AS `Tipo`,`v`.`EstadoFact` AS `EstadoFact`,`v`.`updated_at` AS `updated_at`,case when curdate() >= `v`.`fecha` + interval `v`.`payment_due_days` day then to_days(curdate()) - to_days(`v`.`fecha` + interval `v`.`payment_due_days` day) else 0 end AS `DiasVenc`,curdate() > `v`.`fecha` + interval `v`.`payment_due_days` day AS `Vencida` from ((`electronic_documents` `v` join `tblclientes` `c` on(`c`.`CodigoClien` = `v`.`cod_cliente`)) left join (select `tp`.`Codigo` AS `CodigoCli`,cast(nullif(`tp`.`Nfact_electronica`,'') as unsigned) AS `DocID`,sum(`tp`.`ValorPago` + coalesce(`tp`.`Descuento`,0)) AS `TotalPagos` from `tblpagos` `tp` where `tp`.`Estado` = 'Valida' and `tp`.`ValorPago` >= 0 and coalesce(`tp`.`Descuento`,0) >= 0 and `tp`.`Nfact_electronica` is not null group by `tp`.`Codigo`,cast(nullif(`tp`.`Nfact_electronica`,'') as unsigned)) `p` on(`p`.`CodigoCli` = `v`.`cod_cliente` and `p`.`DocID` = `v`.`id`)) where `v`.`payment_form_id` = 2 and `v`.`status` = 'autorizado' and `v`.`type_document_id` = 1 */;
/*!50001 SET character_set_client      = @saved_cs_client */;
/*!50001 SET character_set_results     = @saved_cs_results */;
/*!50001 SET collation_connection      = @saved_col_connection */;

--
-- Final view structure for view `vw_item_ventas_30d`
--

/*!50001 DROP VIEW IF EXISTS `vw_item_ventas_30d`*/;
/*!50001 SET @saved_cs_client          = @@character_set_client */;
/*!50001 SET @saved_cs_results         = @@character_set_results */;
/*!50001 SET @saved_col_connection     = @@collation_connection */;
/*!50001 SET character_set_client      = utf8mb4 */;
/*!50001 SET character_set_results     = utf8mb4 */;
/*!50001 SET collation_connection      = utf8mb4_general_ci */;
/*!50001 CREATE ALGORITHM=UNDEFINED */
/*!50013 DEFINER=`root`@`localhost` SQL SECURITY DEFINER */
/*!50001 VIEW `vw_item_ventas_30d` AS select `d`.`Items` AS `Items`,coalesce(sum(`d`.`Cantidad`),0) AS `Unidades_Vendidas_30d`,count(distinct `d`.`Factura_N`) AS `Veces_Vendido_30d` from (`tbldetalle_venta` `d` join `tblventas` `v` on(`d`.`Factura_N` = `v`.`Factura_N`)) where `v`.`Fecha` >= curdate() - interval 30 day group by `d`.`Items` */;
/*!50001 SET character_set_client      = @saved_cs_client */;
/*!50001 SET character_set_results     = @saved_cs_results */;
/*!50001 SET collation_connection      = @saved_col_connection */;

--
-- Final view structure for view `vw_item_ventas_90d`
--

/*!50001 DROP VIEW IF EXISTS `vw_item_ventas_90d`*/;
/*!50001 SET @saved_cs_client          = @@character_set_client */;
/*!50001 SET @saved_cs_results         = @@character_set_results */;
/*!50001 SET @saved_col_connection     = @@collation_connection */;
/*!50001 SET character_set_client      = utf8mb4 */;
/*!50001 SET character_set_results     = utf8mb4 */;
/*!50001 SET collation_connection      = utf8mb4_general_ci */;
/*!50001 CREATE ALGORITHM=UNDEFINED */
/*!50013 DEFINER=`root`@`localhost` SQL SECURITY DEFINER */
/*!50001 VIEW `vw_item_ventas_90d` AS select `d`.`Items` AS `Items`,coalesce(sum(`d`.`Cantidad`),0) AS `Unidades_Vendidas_90d`,count(distinct `d`.`Factura_N`) AS `Veces_Vendido_90d`,coalesce(sum(`d`.`Subtotal`),0) AS `Total_Vendido_90d`,max(`v`.`Fecha`) AS `Ultima_Venta` from (`tbldetalle_venta` `d` join `tblventas` `v` on(`d`.`Factura_N` = `v`.`Factura_N`)) where `v`.`Fecha` >= curdate() - interval 90 day group by `d`.`Items` */;
/*!50001 SET character_set_client      = @saved_cs_client */;
/*!50001 SET character_set_results     = @saved_cs_results */;
/*!50001 SET collation_connection      = @saved_col_connection */;

--
-- Final view structure for view `vw_lotes_por_vencer`
--

/*!50001 DROP VIEW IF EXISTS `vw_lotes_por_vencer`*/;
/*!50001 SET @saved_cs_client          = @@character_set_client */;
/*!50001 SET @saved_cs_results         = @@character_set_results */;
/*!50001 SET @saved_col_connection     = @@collation_connection */;
/*!50001 SET character_set_client      = utf8mb4 */;
/*!50001 SET character_set_results     = utf8mb4 */;
/*!50001 SET collation_connection      = utf8mb4_general_ci */;
/*!50001 CREATE ALGORITHM=UNDEFINED */
/*!50013 DEFINER=`root`@`localhost` SQL SECURITY DEFINER */
/*!50001 VIEW `vw_lotes_por_vencer` AS select `l`.`Id_Lote` AS `Id_Lote`,`l`.`Items` AS `Items`,`l`.`Numero_Lote` AS `Numero_Lote`,`l`.`Fecha_Vencimiento` AS `Fecha_Vencimiento`,`l`.`Fecha_Ingreso` AS `Fecha_Ingreso`,`l`.`Cantidad_Inicial` AS `Cantidad_Inicial`,`l`.`Cantidad_Actual` AS `Cantidad_Actual`,to_days(`l`.`Fecha_Vencimiento`) - to_days(curdate()) AS `dias_restantes`,`a`.`Codigo` AS `Codigo`,`a`.`Nombres_Articulo` AS `Nombres_Articulo`,`a`.`Precio_Costo` AS `Precio_Costo`,`a`.`Precio_Venta` AS `Precio_Venta`,`l`.`Cantidad_Actual` * `a`.`Precio_Costo` AS `valor_costo` from (`tblproductos_lotes` `l` join `tblarticulos` `a` on(`l`.`Items` = `a`.`Items`)) where `l`.`Estado` = 'activo' and `l`.`Cantidad_Actual` > 0 */;
/*!50001 SET character_set_client      = @saved_cs_client */;
/*!50001 SET character_set_results     = @saved_cs_results */;
/*!50001 SET collation_connection      = @saved_col_connection */;

--
-- Final view structure for view `vw_productos_stock_bajo`
--

/*!50001 DROP VIEW IF EXISTS `vw_productos_stock_bajo`*/;
/*!50001 SET @saved_cs_client          = @@character_set_client */;
/*!50001 SET @saved_cs_results         = @@character_set_results */;
/*!50001 SET @saved_col_connection     = @@collation_connection */;
/*!50001 SET character_set_client      = utf8mb4 */;
/*!50001 SET character_set_results     = utf8mb4 */;
/*!50001 SET collation_connection      = utf8mb4_general_ci */;
/*!50001 CREATE ALGORITHM=UNDEFINED */
/*!50013 DEFINER=`root`@`localhost` SQL SECURITY DEFINER */
/*!50001 VIEW `vw_productos_stock_bajo` AS select `a`.`Items` AS `Items`,`a`.`Codigo` AS `Codigo`,`a`.`Nombres_Articulo` AS `Nombres_Articulo`,`a`.`Existencia` AS `Existencia`,`a`.`Existencia_minima` AS `Stock_Minimo`,`a`.`Precio_Venta` AS `Precio_Venta`,coalesce(`fi`.`Id_Familia`,0) AS `Id_Familia`,coalesce(`f`.`Nombre`,'') AS `Familia_Nombre` from ((`tblarticulos` `a` left join `tblfamilia_items` `fi` on(`a`.`Items` = `fi`.`Items`)) left join `tblfamilias_producto` `f` on(`fi`.`Id_Familia` = `f`.`Id_Familia`)) where `a`.`Estado` = 1 and `a`.`Existencia_minima` > 0 and `a`.`Existencia` < `a`.`Existencia_minima` */;
/*!50001 SET character_set_client      = @saved_cs_client */;
/*!50001 SET character_set_results     = @saved_cs_results */;
/*!50001 SET collation_connection      = @saved_col_connection */;

--
-- Final view structure for view `vw_prov_cxp_aging`
--

/*!50001 DROP VIEW IF EXISTS `vw_prov_cxp_aging`*/;
/*!50001 SET @saved_cs_client          = @@character_set_client */;
/*!50001 SET @saved_cs_results         = @@character_set_results */;
/*!50001 SET @saved_col_connection     = @@collation_connection */;
/*!50001 SET character_set_client      = utf8mb4 */;
/*!50001 SET character_set_results     = utf8mb4 */;
/*!50001 SET collation_connection      = utf8mb4_general_ci */;
/*!50001 CREATE ALGORITHM=UNDEFINED */
/*!50013 DEFINER=`root`@`localhost` SQL SECURITY DEFINER */
/*!50001 VIEW `vw_prov_cxp_aging` AS select `x`.`CodigoPro` AS `CodigoPro`,`x`.`RazonSocial` AS `RazonSocial`,`x`.`FacturaN` AS `FacturaN`,`x`.`Fecha` AS `Fecha`,`x`.`Dias` AS `Dias`,`x`.`Fechav` AS `Fechav`,`x`.`Total` AS `Total`,`x`.`TotalPagos` AS `TotalPagos`,`x`.`Saldo` AS `Saldo`,case when curdate() >= `x`.`Fechav` then to_days(curdate()) - to_days(`x`.`Fechav`) else 0 end AS `DiasVenc`,curdate() > `x`.`Fechav` AS `Vencida`,`x`.`Origen` AS `Origen` from (select `vw_prov_facturas_anteriores_saldos`.`FacturaN` AS `FacturaN`,`vw_prov_facturas_anteriores_saldos`.`CodigoPro` AS `CodigoPro`,`vw_prov_facturas_anteriores_saldos`.`RazonSocial` AS `RazonSocial`,`vw_prov_facturas_anteriores_saldos`.`Fecha` AS `Fecha`,`vw_prov_facturas_anteriores_saldos`.`Dias` AS `Dias`,`vw_prov_facturas_anteriores_saldos`.`Fechav` AS `Fechav`,`vw_prov_facturas_anteriores_saldos`.`Total` AS `Total`,`vw_prov_facturas_anteriores_saldos`.`TotalPagos` AS `TotalPagos`,`vw_prov_facturas_anteriores_saldos`.`Saldo` AS `Saldo`,'FacturasAnteriores' AS `Origen` from `vw_prov_facturas_anteriores_saldos` where `vw_prov_facturas_anteriores_saldos`.`Saldo` > 0 union all select `vw_prov_pedidos_credito_saldos`.`FacturaN` AS `FacturaN`,`vw_prov_pedidos_credito_saldos`.`CodigoPro` AS `CodigoPro`,`vw_prov_pedidos_credito_saldos`.`RazonSocial` AS `RazonSocial`,`vw_prov_pedidos_credito_saldos`.`Fecha` AS `Fecha`,`vw_prov_pedidos_credito_saldos`.`Dias` AS `Dias`,`vw_prov_pedidos_credito_saldos`.`Fechav` AS `Fechav`,`vw_prov_pedidos_credito_saldos`.`Total` AS `Total`,`vw_prov_pedidos_credito_saldos`.`TotalPagos` AS `TotalPagos`,`vw_prov_pedidos_credito_saldos`.`Saldo` AS `Saldo`,'PedidosCredito' AS `Origen` from `vw_prov_pedidos_credito_saldos` where `vw_prov_pedidos_credito_saldos`.`Saldo` > 0) `x` */;
/*!50001 SET character_set_client      = @saved_cs_client */;
/*!50001 SET character_set_results     = @saved_cs_results */;
/*!50001 SET collation_connection      = @saved_col_connection */;

--
-- Final view structure for view `vw_prov_facturas_anteriores_saldos`
--

/*!50001 DROP VIEW IF EXISTS `vw_prov_facturas_anteriores_saldos`*/;
/*!50001 SET @saved_cs_client          = @@character_set_client */;
/*!50001 SET @saved_cs_results         = @@character_set_results */;
/*!50001 SET @saved_col_connection     = @@collation_connection */;
/*!50001 SET character_set_client      = utf8mb4 */;
/*!50001 SET character_set_results     = utf8mb4 */;
/*!50001 SET collation_connection      = utf8mb4_general_ci */;
/*!50001 CREATE ALGORITHM=UNDEFINED */
/*!50013 DEFINER=`root`@`localhost` SQL SECURITY DEFINER */
/*!50001 VIEW `vw_prov_facturas_anteriores_saldos` AS select `f`.`FacturaN` AS `FacturaN`,`f`.`CodigoProv` AS `CodigoPro`,`p`.`RazonSocial` AS `RazonSocial`,`f`.`Fecha` AS `Fecha`,`f`.`Dias` AS `Dias`,`f`.`Fecha` + interval `f`.`Dias` day AS `Fechav`,sum(`f`.`Valor`) AS `Total`,coalesce(`pag`.`TotalPagos`,0) AS `TotalPagos`,greatest(sum(`f`.`Valor`) - coalesce(`pag`.`TotalPagos`,0),0) AS `Saldo` from ((`tblfacturasanterioresproveedor` `f` join `tblproveedores` `p` on(`p`.`CodigoPro` = `f`.`CodigoProv`)) left join (select `t`.`CodigoPro` AS `CodigoPro`,`t`.`NFacturaAnt` AS `NFacturaAnt`,sum(`t`.`Valor`) AS `TotalPagos` from `tblegresos` `t` where `t`.`Estado` = 'Valida' and `t`.`NFacturaAnt` is not null group by `t`.`CodigoPro`,`t`.`NFacturaAnt`) `pag` on(`pag`.`CodigoPro` = `f`.`CodigoProv` and `pag`.`NFacturaAnt` = `f`.`FacturaN`)) group by `f`.`FacturaN`,`f`.`CodigoProv`,`p`.`RazonSocial`,`f`.`Fecha`,`f`.`Dias` */;
/*!50001 SET character_set_client      = @saved_cs_client */;
/*!50001 SET character_set_results     = @saved_cs_results */;
/*!50001 SET collation_connection      = @saved_col_connection */;

--
-- Final view structure for view `vw_prov_pedidos_credito_saldos`
--

/*!50001 DROP VIEW IF EXISTS `vw_prov_pedidos_credito_saldos`*/;
/*!50001 SET @saved_cs_client          = @@character_set_client */;
/*!50001 SET @saved_cs_results         = @@character_set_results */;
/*!50001 SET @saved_col_connection     = @@collation_connection */;
/*!50001 SET character_set_client      = utf8mb4 */;
/*!50001 SET character_set_results     = utf8mb4 */;
/*!50001 SET collation_connection      = utf8mb4_general_ci */;
/*!50001 CREATE ALGORITHM=UNDEFINED */
/*!50013 DEFINER=`root`@`localhost` SQL SECURITY DEFINER */
/*!50001 VIEW `vw_prov_pedidos_credito_saldos` AS select `b`.`FacturaCompra_N` AS `FacturaN`,`b`.`CodigoPro` AS `CodigoPro`,`p`.`RazonSocial` AS `RazonSocial`,`b`.`Fecha` AS `Fecha`,`b`.`Dias` AS `Dias`,`b`.`Fecha` + interval `b`.`Dias` day AS `Fechav`,`b`.`Total` AS `Total`,`b`.`Total` - `b`.`Saldo` AS `TotalPagos`,`b`.`Saldo` AS `Saldo`,`b`.`TipoPedido` AS `TipoPedido`,`b`.`EstadoPedido` AS `EstadoPedido`,`b`.`Pedido_N` AS `Pedido_N` from (`tblpedidos` `b` join `tblproveedores` `p` on(`p`.`CodigoPro` = `b`.`CodigoPro`)) where `b`.`TipoPedido` <> 'Contado' and `b`.`EstadoPedido` = 'Recibido' */;
/*!50001 SET character_set_client      = @saved_cs_client */;
/*!50001 SET character_set_results     = @saved_cs_results */;
/*!50001 SET collation_connection      = @saved_col_connection */;

--
-- Final view structure for view `vw_proveedores_saldo_actual`
--

/*!50001 DROP VIEW IF EXISTS `vw_proveedores_saldo_actual`*/;
/*!50001 SET @saved_cs_client          = @@character_set_client */;
/*!50001 SET @saved_cs_results         = @@character_set_results */;
/*!50001 SET @saved_col_connection     = @@collation_connection */;
/*!50001 SET character_set_client      = utf8mb4 */;
/*!50001 SET character_set_results     = utf8mb4 */;
/*!50001 SET collation_connection      = utf8mb4_general_ci */;
/*!50001 CREATE ALGORITHM=UNDEFINED */
/*!50013 DEFINER=`root`@`localhost` SQL SECURITY DEFINER */
/*!50001 VIEW `vw_proveedores_saldo_actual` AS select `vw_prov_cxp_aging`.`CodigoPro` AS `CodigoPro`,`vw_prov_cxp_aging`.`RazonSocial` AS `RazonSocial`,sum(case when `vw_prov_cxp_aging`.`Origen` = 'FacturasAnteriores' then `vw_prov_cxp_aging`.`Saldo` else 0 end) AS `SaldoAnterior`,sum(case when `vw_prov_cxp_aging`.`Origen` = 'PedidosCredito' then `vw_prov_cxp_aging`.`Saldo` else 0 end) AS `SaldoPedidos`,sum(`vw_prov_cxp_aging`.`Saldo`) AS `SaldoActual` from `vw_prov_cxp_aging` group by `vw_prov_cxp_aging`.`CodigoPro`,`vw_prov_cxp_aging`.`RazonSocial` */;
/*!50001 SET character_set_client      = @saved_cs_client */;
/*!50001 SET character_set_results     = @saved_cs_results */;
/*!50001 SET collation_connection      = @saved_col_connection */;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2026-10-13 17:52:33
