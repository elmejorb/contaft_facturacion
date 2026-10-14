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
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Dumping data for table `unit_measures`
--

LOCK TABLES `unit_measures` WRITE;
/*!40000 ALTER TABLE `unit_measures` DISABLE KEYS */;
INSERT INTO `unit_measures` VALUES (1,'spray pequeño','04',NULL,NULL),(2,'levantar','05',NULL,NULL),(3,'Lote calor','08',NULL,NULL),(4,'grupo','10',NULL,NULL),(5,'equipar','11',NULL,NULL),(6,'ración','13',NULL,NULL),(7,'Disparo','14',NULL,NULL),(8,'palo','15',NULL,NULL),(9,'tambor de ciento quince kg','16',NULL,NULL),(10,'tambor de cien libras','17',NULL,NULL),(11,'tambor de cincuenta y cinco galones (US)','18',NULL,NULL),(12,'camión cisterna','19',NULL,NULL),(13,'contenedor de veinte pies','20',NULL,NULL),(14,'contenedor de cuarenta pies','21',NULL,NULL),(15,'decilitro por gramo','22',NULL,NULL),(16,'gramo por centímetro cúbico','23',NULL,NULL),(17,'libra teórica','24',NULL,NULL),(18,'gramo por centímetro cuadrado','25',NULL,NULL),(19,'tonelada real','26',NULL,NULL),(20,'tonelada teórica','27',NULL,NULL),(21,'kilogramo por metro cuadrado','28',NULL,NULL),(22,'libra por mil pies cuadrados','29',NULL,NULL),(23,'Día de potencia del caballo por tonelada métrica seca al aire.','30',NULL,NULL),(24,'coger peso','31',NULL,NULL),(25,'kilogramo por aire seco tonelada métrica','32',NULL,NULL),(26,'kilopascales metros cuadrados por gramo','33',NULL,NULL),(27,'kilopascales por milímetro','34',NULL,NULL),(28,'mililitros por centímetro cuadrado segundo','35',NULL,NULL),(29,'pies cúbicos por minuto por pie cuadrado','36',NULL,NULL),(30,'onza por pie cuadrado','37',NULL,NULL),(31,'onzas por pie cuadrado por 0,01 pulgadas','38',NULL,NULL),(32,'mililitro por segundo','40',NULL,NULL),(33,'mililitro por minuto','41',NULL,NULL),(34,'bolsa súper a granel','43',NULL,NULL),(35,'bolsa a granel de quinientos kg','44',NULL,NULL),(36,'bolsa a granel de trescientos kg','45',NULL,NULL),(37,'bolsa a granel de cincuenta libras','46',NULL,NULL),(38,'bolsa de cincuenta libras','47',NULL,NULL),(39,'carga de automóviles a granel','48',NULL,NULL),(40,'kilogramos teóricos','53',NULL,NULL),(41,'tonelada teórica','54',NULL,NULL),(42,'sitas','56',NULL,NULL),(43,'malla','57',NULL,NULL),(44,'kilogramo neto','58',NULL,NULL),(45,'parte por millón','59',NULL,NULL),(46,'porcentaje de peso','60',NULL,NULL),(47,'parte por billón (US)','61',NULL,NULL),(48,'porcentaje por 1000 horas','62',NULL,NULL),(49,'tasa de fracaso en el tiempo','63',NULL,NULL),(50,'libra por pulgada cuadrada, calibre','64',NULL,NULL),(51,'Oersted','66',NULL,NULL),(52,'prueba de escala específica','69',NULL,NULL),(53,'voltio amperio por libra','71',NULL,NULL),(54,'vatio por libra','72',NULL,NULL),(55,'amperio tum por centímetro','73',NULL,NULL),(56,'milipascal','74',NULL,NULL),(57,'gauss','76',NULL,NULL),(58,'mili pulgadas','77',NULL,NULL),(59,'kilogauss','78',NULL,NULL),(60,'libras por pulgada cuadrada absoluta','80',NULL,NULL),(61,'Enrique','81',NULL,NULL),(62,'kilopound por pulgada cuadrada','84',NULL,NULL),(63,'fuerza libra pie','85',NULL,NULL),(64,'libra por pie cúbico','87',NULL,NULL),(65,'equilibrio','89',NULL,NULL),(66,'Saybold segundo universal','90',NULL,NULL),(67,'alimenta','91',NULL,NULL),(68,'calorías por centímetro cúbico','92',NULL,NULL),(69,'calorías por gramo','93',NULL,NULL),(70,'unidad','94',NULL,NULL),(71,'veinte mil galones (US) de carros','95',NULL,NULL),(72,'diez mil galones (US) de carros','96',NULL,NULL),(73,'tambor de diez kg','97',NULL,NULL),(74,'tambor de quince kg','98',NULL,NULL),(75,'milla de coche','1ª',NULL,NULL),(76,'recuento de coches','1B',NULL,NULL),(77,'recuento de locomotoras','1C',NULL,NULL),(78,'recuento de cabos','1D',NULL,NULL),(79,'carro vacio','1E',NULL,NULL),(80,'millas de tren','1F',NULL,NULL),(81,'uso de combustible galón (US)','1G',NULL,NULL),(82,'milla del caboose','1H',NULL,NULL),(83,'tipo de interés fijo','1I',NULL,NULL),(84,'tonelada milla','1J',NULL,NULL),(85,'milla locomotora','1K',NULL,NULL),(86,'recuento total de coches','1L',NULL,NULL),(87,'milla de coche total','1M',NULL,NULL),(88,'cuarto de milla','1X',NULL,NULL),(89,'radianes por segundo','2ª',NULL,NULL),(90,'radianes por segundo al cuadrado','2B',NULL,NULL),(91,'Röntgen','2C',NULL,NULL),(92,'Unidad térmica británica por hora.','2I',NULL,NULL),(93,'centímetro cúbico por segundo','2J',NULL,NULL),(94,'pie cúbico por hora','2K',NULL,NULL),(95,'pie cúbico por minuto','2L',NULL,NULL),(96,'centímetro por segundo','2M',NULL,NULL),(97,'decibel','2N',NULL,NULL),(98,'kilobyte','2P',NULL,NULL),(99,'kilobecquerel','2Q',NULL,NULL),(100,'kilocurie','2R',NULL,NULL),(101,'megagramo','2U',NULL,NULL),(102,'megagramo por hora','2V',NULL,NULL),(103,'compartimiento','2W',NULL,NULL),(104,'metro por minuto','2X',NULL,NULL),(105,'milliröntgen','2Y',NULL,NULL),(106,'milivoltios','2Z',NULL,NULL),(107,'megajulio','3B',NULL,NULL),(108,'manmonth','3C',NULL,NULL),(109,'libra por libra de producto','3E',NULL,NULL),(110,'libra por pieza de producto','3G',NULL,NULL),(111,'kilogramo por kilogramo de producto','3H',NULL,NULL),(112,'kilogramo por pieza de producto','3I',NULL,NULL),(113,'bobina','4ª',NULL,NULL),(114,'gorra','4B',NULL,NULL),(115,'centistokes','4C',NULL,NULL),(116,'paquete de veinte','4E',NULL,NULL),(117,'microlitro','4G',NULL,NULL),(118,'micrometro','4H',NULL,NULL),(119,'miliamperio','4K',NULL,NULL),(120,'megabyte','4L',NULL,NULL),(121,'miligramo por hora','4M',NULL,NULL),(122,'megabecquerel','4N',NULL,NULL),(123,'microfarad','4º',NULL,NULL),(124,'newton por metro','4P',NULL,NULL),(125,'onza pulgada','4Q',NULL,NULL),(126,'pie onza','4R',NULL,NULL),(127,'picofarad','4T',NULL,NULL),(128,'libra por hora','4U',NULL,NULL),(129,'tonelada (US) por hora','4W',NULL,NULL),(130,'kilolitro por hora','4X',NULL,NULL),(131,'barril por minuto','5ª',NULL,NULL),(132,'lote','5B',NULL,NULL),(133,'galón (US) por mil','5C',NULL,NULL),(134,'MMSCF / día','5E',NULL,NULL),(135,'libras por mil','5F',NULL,NULL),(136,'bomba','5G',NULL,NULL),(137,'escenario','5H',NULL,NULL),(138,'pie cúbico estándar','5I',NULL,NULL),(139,'potencia hidráulica de caballos','5J',NULL,NULL),(140,'contar por minuto','5K',NULL,NULL),(141,'nivel sismico','5P',NULL,NULL),(142,'nfor sismica','5Q',NULL,NULL),(143,'15 calorías C','A1',NULL,NULL),(144,'amperio metro cuadrado por joule segundo','A10',NULL,NULL),(145,'Ã ¥ ngström','A11',NULL,NULL),(146,'unidad astronómica','A12',NULL,NULL),(147,'attojoule','A13',NULL,NULL),(148,'granero','A14',NULL,NULL),(149,'granero por electrón voltio','A15',NULL,NULL),(150,'granero por voltio de electrones esteradiano,','A16',NULL,NULL),(151,'granero por sterdian','A17',NULL,NULL),(152,'becquerel por kilogramo','A18',NULL,NULL),(153,'becquerel por metro cúbico','A19',NULL,NULL),(154,'amperio por centímetro','A2',NULL,NULL),(155,'Unidad térmica británica por segundo pie cuadrado grado Rankin','A20',NULL,NULL),(156,'Unidad térmica británica por libra grado Rankin','A21',NULL,NULL),(157,'Unidad térmica británica por segundo pie grado Rankin','A22',NULL,NULL),(158,'Unidad térmica británica por hora pie cuadrado grado Rankin','A23',NULL,NULL),(159,'candela por metro cuadrado','A24',NULL,NULL),(160,'cheval vapeur','A25',NULL,NULL),(161,'medidor de culombio','A26',NULL,NULL),(162,'medidor de culombio al cuadrado por voltio','A27',NULL,NULL),(163,'Coulomb por centímetro cúbico','A28',NULL,NULL),(164,'Coulomb por metro cúbico','A29',NULL,NULL),(165,'amperio por milímetro','A3',NULL,NULL),(166,'Coulomb por milímetro cúbico','A30',NULL,NULL),(167,'Coulomb por kilogramo segundo','A31',NULL,NULL),(168,'Coulomb por mol','A32',NULL,NULL),(169,'Coulomb por centímetro cuadrado','A33',NULL,NULL),(170,'Coulomb por metro cuadrado','A34',NULL,NULL),(171,'Coulomb por milímetro cuadrado','A35',NULL,NULL),(172,'centímetro cúbico por mol','A36',NULL,NULL),(173,'nformaci cúbico por mol','A37',NULL,NULL),(174,'metro cúbico por coulomb','A38',NULL,NULL),(175,'metro cúbico por kilogramo','A39',NULL,NULL),(176,'amperio por centímetro cuadrado','A4',NULL,NULL),(177,'metro cúbico por mol','A40',NULL,NULL),(178,'amperio por metro cuadrado','A41',NULL,NULL),(179,'curie por kilogramo','A42',NULL,NULL),(180,'tonelaje de peso muerto','A43',NULL,NULL),(181,'decalitro','A44',NULL,NULL),(182,'decámetro','A45',NULL,NULL),(183,'decitex','A47',NULL,NULL),(184,'grado Rankin','A48',NULL,NULL),(185,'negador','A49',NULL,NULL),(186,'amperio metro cuadrado','A5',NULL,NULL),(187,'dyn segundo por centímetro cúbico','A50',NULL,NULL),(188,'dina segundo por centímetro','A51',NULL,NULL),(189,'dina segundo por centímetro al quinto','A52',NULL,NULL),(190,'electronvolt','A53',NULL,NULL),(191,'electronvoltio por metro','A54',NULL,NULL),(192,'metro electronvolt cuadrado','A55',NULL,NULL),(193,'electronvoltio de metro cuadrado por kilogramo','A56',NULL,NULL),(194,'ergio','A57',NULL,NULL),(195,'erg por centímetro','A58',NULL,NULL),(196,'amperio por metro cuadrado kelvin al cuadrado','A6',NULL,NULL),(197,'erg por centímetro cúbico','A60',NULL,NULL),(198,'erg por gramo','A61',NULL,NULL),(199,'erg por gramo de segundo','A62',NULL,NULL),(200,'erg por segundo','A63',NULL,NULL),(201,'erg por segundo centímetro cuadrado','A64',NULL,NULL),(202,'erg por centímetro cuadrado segundo','A65',NULL,NULL),(203,'erg centímetro cuadrado','A66',NULL,NULL),(204,'ergímetro cuadrado por gramo','A67',NULL,NULL),(205,'exajulio','A68',NULL,NULL),(206,'faradio por metro','A69',NULL,NULL),(207,'amperio por milímetro cuadrado','A7',NULL,NULL),(208,'femtojoule','A70',NULL,NULL),(209,'femtometro','A71',NULL,NULL),(210,'pie por segundo al cuadrado','A73',NULL,NULL),(211,'pie-fuerza de la libra por segundo','A74',NULL,NULL),(212,'tonelada de carga','A75',NULL,NULL),(213,'galón','A76',NULL,NULL),(214,'Unidad de desplazamiento CGS gaussiana','A77',NULL,NULL),(215,'Unidad gaussiana CGS de corriente eléctrica.','A78',NULL,NULL),(216,'Unidad Gaussian CGS de carga eléctrica.','A79',NULL,NULL),(217,'amperio segundo','A8',NULL,NULL),(218,'Unidad Gaussian CGS de intensidad de campo eléctrico.','A80',NULL,NULL),(219,'Unidad Gaussian CGS de polarización eléctrica.','A81',NULL,NULL),(220,'Unidad Gaussian CGS de potencial eléctrico.','A82',NULL,NULL),(221,'Unidad Gaussiana CGS de magnetización.','A83',NULL,NULL),(222,'gigacoulomb por metro cúbico','A84',NULL,NULL),(223,'Gigaelectronvolt','A85',NULL,NULL),(224,'gigahercios','A86',NULL,NULL),(225,'gigaohm','A87',NULL,NULL),(226,'medidor de gigaohm','A88',NULL,NULL),(227,'gigapascal','A89',NULL,NULL),(228,'tarifa','A9',NULL,NULL),(229,'gigavatios','A90',NULL,NULL),(230,'gon','A91',NULL,NULL),(231,'gramo por metro cúbico','A93',NULL,NULL),(232,'gramo por mol','A94',NULL,NULL),(233,'gris','A95',NULL,NULL),(234,'gris por segundo','A96',NULL,NULL),(235,'hectopascal','A97',NULL,NULL),(236,'Henry por metro','A98',NULL,NULL),(237,'bola','AA',NULL,NULL),(238,'paquete a granel','AB',NULL,NULL),(239,'acre','ACR',NULL,NULL),(240,'byte','AD',NULL,NULL),(241,'amperio por metro','AE',NULL,NULL),(242,'minuto adicional','AH',NULL,NULL),(243,'minuto promedio por llamada','AI',NULL,NULL),(244,'policía','AJ',NULL,NULL),(245,'braza','AK',NULL,NULL),(246,'nfor de acceso','AL',NULL,NULL),(247,'ampolla','AM',NULL,NULL),(248,'hora amperio','AMH',NULL,NULL),(249,'amperio','AMP',NULL,NULL),(250,'año','ANA',NULL,NULL),(251,'solo libra de aluminio','AP',NULL,NULL),(252,'onza troy o onza de boticarios','APZ',NULL,NULL),(253,'Unidad de factor antihemofílico (AHF)','AQ',NULL,NULL),(254,'supositorio','AR',NULL,NULL),(255,'son','SON',NULL,NULL),(256,'surtido','COMO',NULL,NULL),(257,'fuerza alcohólica en masa','ASM',NULL,NULL),(258,'fuerza alcohólica por volumen','ASU',NULL,NULL),(259,'ambiente estándar','ATM',NULL,NULL),(260,'ambiente técnico','ATT',NULL,NULL),(261,'cápsula','AV',NULL,NULL),(262,'vial lleno de polvo','AW',NULL,NULL),(263,'montaje','SÍ',NULL,NULL),(264,'Unidad térmica británica por libra','AZ',NULL,NULL),(265,'Btu por pie cúbico','B0',NULL,NULL),(266,'barril (US) por día','B1',NULL,NULL),(267,'julios por kilogramo kelvin','B11',NULL,NULL),(268,'julios por metro','B12',NULL,NULL),(269,'julios por metro cuadrado','B13',NULL,NULL),(270,'julios por metro a la cuarta potencia','B14',NULL,NULL),(271,'julios por mol','B15',NULL,NULL),(272,'julios por mol kelvin','B16',NULL,NULL),(273,'joule segundo','B18',NULL,NULL),(274,'litera','B2',NULL,NULL),(275,'joule metro cuadrado por kilogramo','B20',NULL,NULL),(276,'kelvin por vatio','B21',NULL,NULL),(277,'Kiloampere','B22',NULL,NULL),(278,'kiloampere por metro cuadrado','B23',NULL,NULL),(279,'kiloampere por metro','B24',NULL,NULL),(280,'kilobecquerel por kilogramo','B25',NULL,NULL),(281,'kilocoulomb','B26',NULL,NULL),(282,'kilocoulomb por metro cúbico','B27',NULL,NULL),(283,'kilocoulomb por metro cuadrado','B28',NULL,NULL),(284,'kiloelectronvolt','B29',NULL,NULL),(285,'libra de bateo','B3',NULL,NULL),(286,'kilogramo metro por segundo','B31',NULL,NULL),(287,'kilogramo metro cuadrado','B32',NULL,NULL),(288,'kilogramo metro cuadrado por segundo','B33',NULL,NULL),(289,'kilogramo por decímetro cúbico','B34',NULL,NULL),(290,'kilogramo por litro','B35',NULL,NULL),(291,'caloría termoquímica por gramo','B36',NULL,NULL),(292,'kilogramo de fuerza','B37',NULL,NULL),(293,'metro de fuerza de kilogramo','B38',NULL,NULL),(294,'metro de fuerza de kilogramo por segundo','B39',NULL,NULL),(295,'barril, imperial','B4',NULL,NULL),(296,'kilogramo de fuerza por metro cuadrado','B40',NULL,NULL),(297,'kilojoule per kelvin','B41',NULL,NULL),(298,'kilojoule por kilogramo','B42',NULL,NULL),(299,'kilojoule por kilogramo kelvin','B43',NULL,NULL),(300,'kilojoule por mol','B44',NULL,NULL),(301,'kilomol','B45',NULL,NULL),(302,'kilomol por metro cúbico','B46',NULL,NULL),(303,'Kilonewton','B47',NULL,NULL),(304,'medidor de kilonewton','B48',NULL,NULL),(305,'kiloohm','B49',NULL,NULL),(306,'palanquilla','B5',NULL,NULL),(307,'medidor de kiloohm','B50',NULL,NULL),(308,'kilopond','B51',NULL,NULL),(309,'kilosegundo','B52',NULL,NULL),(310,'kilosiemens','B53',NULL,NULL),(311,'kilosiemens por metro','B54',NULL,NULL),(312,'kilovoltios por metro','B55',NULL,NULL),(313,'kiloveber por metro','B56',NULL,NULL),(314,'año luz','B57',NULL,NULL),(315,'litro por mol','B58',NULL,NULL),(316,'hora lumen','B59',NULL,NULL),(317,'bollo','B6',NULL,NULL),(318,'lumen por metro cuadrado','B60',NULL,NULL),(319,'lumen por vatio','B61',NULL,NULL),(320,'lumen segundo','B62',NULL,NULL),(321,'hora de lux','B63',NULL,NULL),(322,'lux segundo','B64',NULL,NULL),(323,'Maxwell','B65',NULL,NULL),(324,'megaamperios por metro cuadrado','B66',NULL,NULL),(325,'megabecquerel por kilogramo','B67',NULL,NULL),(326,'megacoulomb por metro cúbico','B69',NULL,NULL),(327,'ciclo','B7',NULL,NULL),(328,'megacoulomb por metro cuadrado','B70',NULL,NULL),(329,'megaelectronvolt','B71',NULL,NULL),(330,'megagramo por metro cúbico','B72',NULL,NULL),(331,'meganewton','B73',NULL,NULL),(332,'medidor de meganewton','B74',NULL,NULL),(333,'megaohm','B75',NULL,NULL),(334,'metro megaohm','B76',NULL,NULL),(335,'megasiemens por metro','B77',NULL,NULL),(336,'megavoltio','B78',NULL,NULL),(337,'megavolt por metro','B79',NULL,NULL),(338,'julios por metro cúbico','B8',NULL,NULL),(339,'metro recíproco cuadrado recíproco segundo','B81',NULL,NULL),(340,'metro a la cuarta potencia','B83',NULL,NULL),(341,'microamperios','B84',NULL,NULL),(342,'microbar','B85',NULL,NULL),(343,'microcoulomb','B86',NULL,NULL),(344,'microcoulomb por metro cúbico','B87',NULL,NULL),(345,'microcoulomb por metro cuadrado','B88',NULL,NULL),(346,'microfarada por metro','B89',NULL,NULL),(347,'batt','B9',NULL,NULL),(348,'microhenry','B90',NULL,NULL),(349,'microhenry por metro','B91',NULL,NULL),(350,'micronewton','B92',NULL,NULL),(351,'medidor de micronewton','B93',NULL,NULL),(352,'microohm','B94',NULL,NULL),(353,'medidor de microohmios','B95',NULL,NULL),(354,'micropascal','B96',NULL,NULL),(355,'microradiano','B97',NULL,NULL),(356,'microsegundo','B98',NULL,NULL),(357,'microsiemens','B99',NULL,NULL),(358,'bar','BAR',NULL,NULL),(359,'caja base','BB',NULL,NULL),(360,'tablero','BD',NULL,NULL),(361,'haz','SER',NULL,NULL),(362,'pie de tabla','BFT',NULL,NULL),(363,'bolso','BG',NULL,NULL),(364,'cepillo','BH',NULL,NULL),(365,'potencia al freno','BHP',NULL,NULL),(366,'trillón de dólares','BIL',NULL,NULL),(367,'cangilón','BJ',NULL,NULL),(368,'cesta','BK',NULL,NULL),(369,'bala','BL',NULL,NULL),(370,'barril seco','BLD',NULL,NULL),(371,'barril (EE. UU.) (petróleo, etc.)','BLL',NULL,NULL),(372,'botella','BO',NULL,NULL),(373,'cien pies de tabla','BP',NULL,NULL),(374,'becquerel','BQL',NULL,NULL),(375,'bar','BR',NULL,NULL),(376,'tornillo','BT',NULL,NULL),(377,'Unidad Térmica Británica','BTU',NULL,NULL),(378,'bushel (EE. UU.)','BUA',NULL,NULL),(379,'bushel (Reino Unido)','BUI',NULL,NULL),(380,'peso base','BW',NULL,NULL),(381,'caja','BX',NULL,NULL),(382,'millones de BTUs','BZ',NULL,NULL),(383,'llamada','C0',NULL,NULL),(384,'producto compuesto libra (peso total)','C1',NULL,NULL),(385,'millifarad','C10',NULL,NULL),(386,'miligal','C11',NULL,NULL),(387,'miligramo por metro','C12',NULL,NULL),(388,'miligray','C13',NULL,NULL),(389,'milihenry','C14',NULL,NULL),(390,'milijoule','C15',NULL,NULL),(391,'milímetro por segundo','C16',NULL,NULL),(392,'milímetro cuadrado por segundo','C17',NULL,NULL),(393,'milimol','C18',NULL,NULL),(394,'mol por kilogramo','C19',NULL,NULL),(395,'carset','C2',NULL,NULL),(396,'millinewton','C20',NULL,NULL),(397,'millinewton por metro','C22',NULL,NULL),(398,'medidor de miliohm','C23',NULL,NULL),(399,'segundo milipascal','C24',NULL,NULL),(400,'miliradian','C25',NULL,NULL),(401,'milisegundo','C26',NULL,NULL),(402,'milisiemens','C27',NULL,NULL),(403,'milisievert','C28',NULL,NULL),(404,'millitesla','C29',NULL,NULL),(405,'microvoltios por metro','C3',NULL,NULL),(406,'milivoltios por metro','C30',NULL,NULL),(407,'milivatios','C31',NULL,NULL),(408,'milivatios por metro cuadrado','C32',NULL,NULL),(409,'milliweber','C33',NULL,NULL),(410,'Topo','C34',NULL,NULL),(411,'mol por decímetro cúbico','C35',NULL,NULL),(412,'mol por metro cúbico','C36',NULL,NULL),(413,'mol por litro','C38',NULL,NULL),(414,'Nanoampere','C39',NULL,NULL),(415,'partido de carga','C4',NULL,NULL),(416,'nanocoulomb','C40',NULL,NULL),(417,'nanofarad','C41',NULL,NULL),(418,'nanofarad por metro','C42',NULL,NULL),(419,'nanohenry','C43',NULL,NULL),(420,'nanohenry por metro','C44',NULL,NULL),(421,'nanometro','C45',NULL,NULL),(422,'medidor de nanoohm','C46',NULL,NULL),(423,'nanosegundo','C47',NULL,NULL),(424,'nanotesla','C48',NULL,NULL),(425,'nanovatio','C49',NULL,NULL),(426,'costo','C5',NULL,NULL),(427,'neper','C50',NULL,NULL),(428,'neper por segundo','C51',NULL,NULL),(429,'picometro','C52',NULL,NULL),(430,'metro de newton segundo','C53',NULL,NULL),(431,'newton metro cuadrado kilogramo cuadrado','C54',NULL,NULL),(432,'newton por metro cuadrado','C55',NULL,NULL),(433,'newton por milímetro cuadrado','C56',NULL,NULL),(434,'newton segundo','C57',NULL,NULL),(435,'newton segundo por metro','C58',NULL,NULL),(436,'octava','C59',NULL,NULL),(437,'célula','C6',NULL,NULL),(438,'ohm centímetro','C60',NULL,NULL),(439,'ohm metro','C61',NULL,NULL),(440,'uno','C62',NULL,NULL),(441,'parsec','C63',NULL,NULL),(442,'pascal por kelvin','C64',NULL,NULL),(443,'segundo pascal','C65',NULL,NULL),(444,'segundo pascal por metro cúbico','C66',NULL,NULL),(445,'segundo pascal por metro','C67',NULL,NULL),(446,'petajoule','C68',NULL,NULL),(447,'telefono','C69',NULL,NULL),(448,'centipoise','C7',NULL,NULL),(449,'picoampere','C70',NULL,NULL),(450,'picocoulomb','C71',NULL,NULL),(451,'picofarad por metro','C72',NULL,NULL),(452,'picohenry','C73',NULL,NULL),(453,'picowatt','C75',NULL,NULL),(454,'picowatt por metro cuadrado','C76',NULL,NULL),(455,'medidor de libras','C77',NULL,NULL),(456,'fuerza de libra','C78',NULL,NULL),(457,'Millicoulomb por kilogramo','C8',NULL,NULL),(458,'rad','C80',NULL,NULL),(459,'radián','C81',NULL,NULL),(460,'medidor de radianes al cuadrado por mol','C82',NULL,NULL),(461,'medidor de radianes al cuadrado por kilogramo','C83',NULL,NULL),(462,'radian por metro','C84',NULL,NULL),(463,'â € ngstr recíproco “m','C85',NULL,NULL),(464,'metro cúbico recíproco','C86',NULL,NULL),(465,'metro cúbico recíproco por segundo','C87',NULL,NULL),(466,'voltios de electrones recíprocos por metro cúbico','C88',NULL,NULL),(467,'Henry Recíproco','C89',NULL,NULL),(468,'grupo de bobina','C9',NULL,NULL),(469,'Joule recíproco por metro cúbico','C90',NULL,NULL),(470,'kelvin recíproco o kelvin al poder menos uno','C91',NULL,NULL),(471,'medidor recíproco','C92',NULL,NULL),(472,'metro cuadrado recíproco','C93',NULL,NULL),(473,'minuto recíproco','C94',NULL,NULL),(474,'mole recíproco','C95',NULL,NULL),(475,'Pascal recíproco o pascal a la potencia menos uno.','C96',NULL,NULL),(476,'segundo recíproco','C97',NULL,NULL),(477,'segundo recíproco por metro cúbico','C98',NULL,NULL),(478,'segundo recíproco por metro cuadrado','C99',NULL,NULL),(479,'Caja','CA',NULL,NULL),(480,'Capacidad de carga en toneladas métricas.','CCT',NULL,NULL),(481,'candela','CDL',NULL,NULL),(482,'grado Celsius','CEL',NULL,NULL),(483,'cien','CEN',NULL,NULL),(484,'tarjeta','CG',NULL,NULL),(485,'centigramo','CGM',NULL,NULL),(486,'envase','CH',NULL,NULL),(487,'cono','CJ',NULL,NULL),(488,'conector','CK',NULL,NULL),(489,'Coulomb por kilogramo','CKG',NULL,NULL),(490,'bobina','CL',NULL,NULL),(491,'cientos de licencia','CLF',NULL,NULL),(492,'centilitro','CLT',NULL,NULL),(493,'centímetro cuadrado','CMK',NULL,NULL),(494,'centímetro cúbico','CMQ',NULL,NULL),(495,'centímetro','CMT',NULL,NULL),(496,'paquete de cien','CNP',NULL,NULL),(497,'Cental (Reino Unido)','CNT',NULL,NULL),(498,'garrafón','CO',NULL,NULL),(499,'culombio','COU',NULL,NULL),(500,'cartucho','CQ',NULL,NULL),(501,'caja','CR',NULL,NULL),(502,'caso','CS',NULL,NULL),(503,'caja de cartón','CT',NULL,NULL),(504,'quilate métrico','CTM',NULL,NULL),(505,'vaso','CU',NULL,NULL),(506,'curie','CUR',NULL,NULL),(507,'cubrir','CV',NULL,NULL),(508,'cien libras (quintales) / cien pesos (US)','CWA',NULL,NULL),(509,'cien pesos (Reino Unido)','CWI',NULL,NULL),(510,'cilindro','CY',NULL,NULL),(511,'combo','CZ',NULL,NULL),(512,'segundo recíproco por esteradiano','D1',NULL,NULL),(513,'siemens por metro','D10',NULL,NULL),(514,'siemens metro cuadrado por mol','D12',NULL,NULL),(515,'sievert','D13',NULL,NULL),(516,'mil yardas lineales','D14',NULL,NULL),(517,'sone','D15',NULL,NULL),(518,'centímetro cuadrado por ergio','D16',NULL,NULL),(519,'centímetro cuadrado por erg esterlina','D17',NULL,NULL),(520,'metro kelvin','D18',NULL,NULL),(521,'kelvin metro cuadrado por vatio','D19',NULL,NULL),(522,'segundo recíproco por metros cuadrados esteradianos','D2',NULL,NULL),(523,'metro cuadrado por julio','D20',NULL,NULL),(524,'metro cuadrado por kilogramo','D21',NULL,NULL),(525,'metro cuadrado por mol','D22',NULL,NULL),(526,'pluma gramo (proteína)','D23',NULL,NULL),(527,'metro cuadrado por esterilizador','D24',NULL,NULL),(528,'metro cuadrado por julios esteradianos','D25',NULL,NULL),(529,'metro cuadrado por voltio segundo','D26',NULL,NULL),(530,'esteradiano','D27',NULL,NULL),(531,'sifón','D28',NULL,NULL),(532,'terahercios','D29',NULL,NULL),(533,'terajulio','D30',NULL,NULL),(534,'teravatio','D31',NULL,NULL),(535,'hora de teravatio','D32',NULL,NULL),(536,'tesla','D33',NULL,NULL),(537,'Texas','D34',NULL,NULL),(538,'caloría termoquímica','D35',NULL,NULL),(539,'caloría termoquímica por gramo kelvin','D37',NULL,NULL),(540,'calorías termoquímicas por segundo centímetro kelvin','D38',NULL,NULL),(541,'calorías termoquímicas por segundo centímetro cuadrado kelvin','D39',NULL,NULL),(542,'mil litros','D40',NULL,NULL),(543,'tonelada por metro cúbico','D41',NULL,NULL),(544,'año tropical','D42',NULL,NULL),(545,'unidad de masa atómica unificada','D43',NULL,NULL),(546,'var','D44',NULL,NULL),(547,'voltios al cuadrado por kelvin al cuadrado','D45',NULL,NULL),(548,'voltio – amperio','D46',NULL,NULL),(549,'voltio por centímetro','D47',NULL,NULL),(550,'voltio por kelvin','D48',NULL,NULL),(551,'milivoltios por kelvin','D49',NULL,NULL),(552,'kilogramo por centímetro cuadrado','D5',NULL,NULL),(553,'voltios por metro','D50',NULL,NULL),(554,'voltios por milímetro','D51',NULL,NULL),(555,'vatios por kelvin','D52',NULL,NULL),(556,'vatios por metro kelvin','D53',NULL,NULL),(557,'vatios por metro cuadrado','D54',NULL,NULL),(558,'vatios por metro cuadrado kelvin','D55',NULL,NULL),(559,'vatios por metro cuadrado de kelvin a la cuarta potencia','D56',NULL,NULL),(560,'vatios por steradian','D57',NULL,NULL),(561,'vatios por metro cuadrado esterlino','D58',NULL,NULL),(562,'weber por metro','D59',NULL,NULL),(563,'röntgen por segundo','D6',NULL,NULL),(564,'weber por milímetro','D60',NULL,NULL),(565,'minuto','D61',NULL,NULL),(566,'segundo','D62',NULL,NULL),(567,'libro','D63',NULL,NULL),(568,'bloquear','D64',NULL,NULL),(569,'redondo','D65',NULL,NULL),(570,'casete','D66',NULL,NULL),(571,'dólar por hora','D67',NULL,NULL),(572,'pulgada a la cuarta potencia','D69',NULL,NULL),(573,'Sandwich','D7',NULL,NULL),(574,'Tabla Internacional (IT) caloría','D70',NULL,NULL),(575,'Tabla Internacional (IT) calorías por segundo centímetro kelvin','D71',NULL,NULL),(576,'Tabla Internacional (IT) calorías por segundo centímetro cuadrado kelvin','D72',NULL,NULL),(577,'joule metro cuadrado','D73',NULL,NULL),(578,'kilogramo por mol','D74',NULL,NULL),(579,'Tabla Internacional (IT) calorías por gramo','D75',NULL,NULL),(580,'Tabla Internacional (IT) calorías por gramo kelvin','D76',NULL,NULL),(581,'megacoulomb','D77',NULL,NULL),(582,'haz','D79',NULL,NULL),(583,'puntaje de drenaje','D8',NULL,NULL),(584,'microwatt','D80',NULL,NULL),(585,'microtesla','D81',NULL,NULL),(586,'microvoltio','D82',NULL,NULL),(587,'medidor de millinewton','D83',NULL,NULL),(588,'microwatt por metro cuadrado','D85',NULL,NULL),(589,'Millicoulomb','D86',NULL,NULL),(590,'milimol por kilogramo','D87',NULL,NULL),(591,'millicoulomb por metro cúbico','D88',NULL,NULL),(592,'millicoulomb por metro cuadrado','D89',NULL,NULL),(593,'dina por centímetro cuadrado','D9',NULL,NULL),(594,'metro cúbico (neto)','D90',NULL,NULL),(595,'movimiento rápido del ojo','D91',NULL,NULL),(596,'banda','D92',NULL,NULL),(597,'segundo por metro cúbico','D93',NULL,NULL),(598,'segundo por metro cúbico radianes','D94',NULL,NULL),(599,'julios por gramo','D95',NULL,NULL),(600,'libra bruta','D96',NULL,NULL),(601,'carga de palet / unidad','D97',NULL,NULL),(602,'libra de masa','D98',NULL,NULL),(603,'manga','D99',NULL,NULL),(604,'despreciar','DAA',NULL,NULL),(605,'diez dias','DAD',NULL,NULL),(606,'día','DAY',NULL,NULL),(607,'libra seca','DB',NULL,NULL),(608,'disco','DC',NULL,NULL),(609,'la licenciatura','DD',NULL,NULL),(610,'acuerdo','DE',NULL,NULL),(611,'década','DEC',NULL,NULL),(612,'decigramo','DG',NULL,NULL),(613,'dispensador','DI',NULL,NULL),(614,'decagramo','DJ',NULL,NULL),(615,'decilitro','DLT',NULL,NULL),(616,'nformaci cuadrado','DMK',NULL,NULL),(617,'decímetro cúbico','DMQ',NULL,NULL),(618,'decímetro','DMT',NULL,NULL),(619,'medidor de decinewton','DN',NULL,NULL),(620,'docena pieza','DPC',NULL,NULL),(621,'docena par','DPR',NULL,NULL),(622,'tonelaje de desplazamiento','DPT',NULL,NULL),(623,'registro de datos','DQ',NULL,NULL),(624,'tambor','DR',NULL,NULL),(625,'dram (US)','DRA',NULL,NULL),(626,'dram (Reino Unido)','DRI',NULL,NULL),(627,'docena rollo','DRL',NULL,NULL),(628,'dracma (Reino Unido)','DRM',NULL,NULL),(629,'monitor','DS',NULL,NULL),(630,'tonelada seca','DT',NULL,NULL),(631,'Decitonne','DTN',NULL,NULL),(632,'dina','DU',NULL,NULL),(633,'pennyweight','DWT',NULL,NULL),(634,'dina por centímetro','DX',NULL,NULL),(635,'libro de directorio','DY',NULL,NULL),(636,'docena','DZN',NULL,NULL),(637,'paquete de doce','DZP',NULL,NULL),(638,'cinturón','E2',NULL,NULL),(639,'remolque','E3',NULL,NULL),(640,'kilogramo bruto','E4',NULL,NULL),(641,'tonelada métrica larga','E5',NULL,NULL),(642,'cada','EA',NULL,NULL),(643,'casilla de correo electrónico','EB',NULL,NULL),(644,'cada uno por mes','CE',NULL,NULL),(645,'paquete de once','EP',NULL,NULL),(646,'galón equivalente','EQ',NULL,NULL),(647,'sobre','EV',NULL,NULL),(648,'mil pies cúbicos por día','F1',NULL,NULL),(649,'Fibra por centímetro cúbico de aire','F9',NULL,NULL),(650,'grado Fahrenheit','FAH',NULL,NULL),(651,'faradio','FAR',NULL,NULL),(652,'campo','FB',NULL,NULL),(653,'mil pies cúbicos','FC',NULL,NULL),(654,'millón de partículas por pie cúbico','FD',NULL,NULL),(655,'pie de pista','FE',NULL,NULL),(656,'cien metros cúbicos','FF',NULL,NULL),(657,'parche transdérmico','FG',NULL,NULL),(658,'micromol','FH',NULL,NULL),(659,'tonelada en escamas','FL',NULL,NULL),(660,'millones de pies cúbicos','FM',NULL,NULL),(661,'pie','FOT',NULL,NULL),(662,'libra por pie cuadrado','FP',NULL,NULL),(663,'pie por minuto','FR',NULL,NULL),(664,'pie por segundo','FS',NULL,NULL),(665,'pie cuadrado','FTK',NULL,NULL),(666,'pie cubico','FTQ',NULL,NULL),(667,'US galones por minuto','G2',NULL,NULL),(668,'Galon imperial por minuto','G3',NULL,NULL),(669,'hoja de microficha','G7',NULL,NULL),(670,'galón (US) por día','GB',NULL,NULL),(671,'gigabecquerel','GBQ',NULL,NULL),(672,'gramo por 100 gramo','GC',NULL,NULL),(673,'barril bruto','GD',NULL,NULL),(674,'libra por galón (US)','GE',NULL,NULL),(675,'gramo por metro (gramo por 100 centímetros)','GF',NULL,NULL),(676,'gramo de isótopo fisionable','GFI',NULL,NULL),(677,'gramo','GGR',NULL,NULL),(678,'medio galón (EE. UU.)','GH',NULL,NULL),(679,'branquias','GIA',NULL,NULL),(680,'Gill (Reino Unido)','GII',NULL,NULL),(681,'gramo por mililitro','GJ',NULL,NULL),(682,'gramo por kilogramo','G K',NULL,NULL),(683,'gramo por litro','GL',NULL,NULL),(684,'galón seco (EE. UU.)','GLD',NULL,NULL),(685,'galón (Reino Unido)','GLI',NULL,NULL),(686,'galón','GLL',NULL,NULL),(687,'gramo por metro cuadrado','GM',NULL,NULL),(688,'galón bruto','GN',NULL,NULL),(689,'miligramos por metro cuadrado','GO',NULL,NULL),(690,'miligramo por metro cúbico','GP',NULL,NULL),(691,'microgramos por metro cúbico','GQ',NULL,NULL),(692,'gramo','GRM',NULL,NULL),(693,'grano','GRN',NULL,NULL),(694,'bruto','GRO',NULL,NULL),(695,'tonelada de registro bruto','GRT',NULL,NULL),(696,'tonelada bruta','GT',NULL,NULL),(697,'gigajoule','GV',NULL,NULL),(698,'galón por mil pies cúbicos','GW',NULL,NULL),(699,'hora de gigavatios','GWH',NULL,NULL),(700,'patio bruto','GY',NULL,NULL),(701,'sistema de medición','GZ',NULL,NULL),(702,'media página – electrónica','H1',NULL,NULL),(703,'medio litro','H2',NULL,NULL),(704,'madeja','HA',NULL,NULL),(705,'hectárea','HAR',NULL,NULL),(706,'hectobar','HBA',NULL,NULL),(707,'cien cajas','HBX',NULL,NULL),(708,'cien cuentas','HC',NULL,NULL),(709,'media docena','HD',NULL,NULL),(710,'centésima de quilate','ÉL',NULL,NULL),(711,'cien pies','HF',NULL,NULL),(712,'hectogramo','HGM',NULL,NULL),(713,'cien pies cúbicos','HH',NULL,NULL),(714,'cien hojas','HI',NULL,NULL),(715,'cien unidades internacionales','HIU',NULL,NULL),(716,'caballo métrico','HJ',NULL,NULL),(717,'cien kilogramos','HK',NULL,NULL),(718,'cien pies (lineales)','HL',NULL,NULL),(719,'hectolitro','HLT',NULL,NULL),(720,'milla por hora','HM',NULL,NULL),(721,'millones de metros cúbicos','HMQ',NULL,NULL),(722,'hectómetro','HMT',NULL,NULL),(723,'milímetro convencional de mercurio','HN',NULL,NULL),(724,'cien onzas troy','HO',NULL,NULL),(725,'milímetro convencional de agua','HP',NULL,NULL),(726,'hectolitro de alcohol puro','HPA',NULL,NULL),(727,'cien pies cuadrados','HS',NULL,NULL),(728,'media hora','HT',NULL,NULL),(729,'hertz','HTZ',NULL,NULL),(730,'hora','HUR',NULL,NULL),(731,'cien yardas','HY',NULL,NULL),(732,'pulgada libra','IA',NULL,NULL),(733,'contar por pulgada','IC',NULL,NULL),(734,'persona','IE',NULL,NULL),(735,'pulgadas de agua','IF',NULL,NULL),(736,'columna pulgada','II',NULL,NULL),(737,'pulgada por minuto','IL',NULL,NULL),(738,'impresión','IM',NULL,NULL),(739,'pulgada','INH',NULL,NULL),(740,'pulgada cuadrada','INK',NULL,NULL),(741,'pulgada en cubos','INQ',NULL,NULL),(742,'póliza de seguros','IP',NULL,NULL),(743,'conteo por centímetro','IT',NULL,NULL),(744,'pulgada por segundo (velocidad lineal)','IU',NULL,NULL),(745,'pulgada por segundo al cuadrado (aceleración)','IV',NULL,NULL),(746,'julios por kilogramo','J2',NULL,NULL),(747,'jumbo','JB',NULL,NULL),(748,'joule por kelvin','JE',NULL,NULL),(749,'jarra','JG',NULL,NULL),(750,'megajulio por kilogramo','JK',NULL,NULL),(751,'megajulio por metro cúbico','JM',NULL,NULL),(752,'articulación','JO',NULL,NULL),(753,'joule','JOU',NULL,NULL),(754,'tarro','JR',NULL,NULL),(755,'demanda de kilovatios','K1',NULL,NULL),(756,'kilovoltios amperios reactivos de demanda','K2',NULL,NULL),(757,'kilovoltio amperio hora reactiva','K3',NULL,NULL),(758,'amperios kilovoltios (reactivos)','K5',NULL,NULL),(759,'kilolitro','K6',NULL,NULL),(760,'pastel','KA',NULL,NULL),(761,'kilocharacter','KB',NULL,NULL),(762,'kilobar','KBA',NULL,NULL),(763,'kilogramo decimal','KD',NULL,NULL),(764,'kelvin','KEL',NULL,NULL),(765,'kilopacket','KF',NULL,NULL),(766,'barrilete','KG',NULL,NULL),(767,'kilogramo','KGM',NULL,NULL),(768,'kilogramo por segundo','KGS',NULL,NULL),(769,'kilohercio','KHZ',NULL,NULL),(770,'Kilogramo por milímetro de ancho','KI',NULL,NULL),(771,'kilosegmento','KJ',NULL,NULL),(772,'kilojoule','KJO',NULL,NULL),(773,'kilogramo por metro','KL',NULL,NULL),(774,'kilómetro por hora','KMH',NULL,NULL),(775,'kilometro cuadrado','KMK',NULL,NULL),(776,'kilogramo por metro cúbico','KMQ',NULL,NULL),(777,'kilogramo de nitrógeno','KNI',NULL,NULL),(778,'kilogramo de sustancia nombrada','KNS',NULL,NULL),(779,'nudo','KNT',NULL,NULL),(780,'Milliequivalencia de potasa cáustica por gramo de producto.','KO',NULL,NULL),(781,'kilopascal','KPA',NULL,NULL),(782,'kilogramo de hidróxido de potasio (potasa cáustica)','KPH',NULL,NULL),(783,'kilogramo de óxido de potasio','KPO',NULL,NULL),(784,'kilogramo de pentóxido de fósforo (anhídrido fosfórico)','KPP',NULL,NULL),(785,'KilorÃ¶ntgen','KR',NULL,NULL),(786,'mil libras por pulgada cuadrada','KS',NULL,NULL),(787,'kilogramo de sustancia 90% seca','KSD',NULL,NULL),(788,'kilogramo de hidróxido de sodio (soda cáustica)','KSH',NULL,NULL),(789,'equipo','KT',NULL,NULL),(790,'kilómetro','KTM',NULL,NULL),(791,'kilotonne','KTN',NULL,NULL),(792,'kilogramo de uranio','KUR',NULL,NULL),(793,'kilovoltio – ampere','KVA',NULL,NULL),(794,'kilovar','KVR',NULL,NULL),(795,'kilovoltio','KVT',NULL,NULL),(796,'kilogramos por milímetro','KW',NULL,NULL),(797,'kilovatios hora','KWH',NULL,NULL),(798,'kilovatio','KWT',NULL,NULL),(799,'mililitro por kilogramo','KX',NULL,NULL),(800,'litro por minuto','L2',NULL,NULL),(801,'libra por pulgada cúbica','LA',NULL,NULL),(802,'libra','LBR',NULL,NULL),(803,'libra troy','LBT',NULL,NULL),(804,'centímetro lineal','LC',NULL,NULL),(805,'litro por día','LD',NULL,NULL),(806,'lite','LE',NULL,NULL),(807,'hoja','LEF',NULL,NULL),(808,'pie lineal','LF',NULL,NULL),(809,'hora de trabajo','LH',NULL,NULL),(810,'pulgada lineal','LI',NULL,NULL),(811,'spray grande','LJ',NULL,NULL),(812,'enlazar','LK',NULL,NULL),(813,'metro lineal','LM',NULL,NULL),(814,'longitud','LN',NULL,NULL),(815,'mucho','LO',NULL,NULL),(816,'libra liquida','LP',NULL,NULL),(817,'litro de alcohol puro','LPA',NULL,NULL),(818,'capa','LR',NULL,NULL),(819,'Suma global','LS',NULL,NULL),(820,'ton (Reino Unido) o longton (EE. UU.)','LTN',NULL,NULL),(821,'litro','LTR',NULL,NULL),(822,'lumen','LUM',NULL,NULL),(823,'lux','LUX',NULL,NULL),(824,'yarda lineal por libra','LX',NULL,NULL),(825,'yarda lineal','LY',NULL,NULL),(826,'cinta magnética','M0',NULL,NULL),(827,'miligramos por litro','M1',NULL,NULL),(828,'valor monetario','M4',NULL,NULL),(829,'microcurie','M5',NULL,NULL),(830,'micropulgada','M7',NULL,NULL),(831,'millones de Btu por 1000 pies cúbicos','M9',NULL,NULL),(832,'máquina por unidad','MA',NULL,NULL),(833,'mega litro','MAL',NULL,NULL),(834,'megametro','MAM',NULL,NULL),(835,'megavatio','MAW',NULL,NULL),(836,'mil equivalentes de ladrillo estándar','MBE',NULL,NULL),(837,'mil pies de tabla','MBF',NULL,NULL),(838,'milibar','MBR',NULL,NULL),(839,'microgramo','MC',NULL,NULL),(840,'milicurie','MCU',NULL,NULL),(841,'aire seco tonelada métrica','MD',NULL,NULL),(842,'miligramo por pie cuadrado por lado','MF',NULL,NULL),(843,'miligramo','MGM',NULL,NULL),(844,'megahercio','MGM',NULL,NULL),(845,'milla cuadrada','MIK',NULL,NULL),(846,'mil','MIL',NULL,NULL),(847,'minuto','MIN',NULL,NULL),(848,'millón','MIO',NULL,NULL),(849,'millones de unidades internacionales','MIU',NULL,NULL),(850,'miligramo por pulgada cuadrada','MK',NULL,NULL),(851,'mil millones','MLD',NULL,NULL),(852,'mililitro','MLT',NULL,NULL),(853,'milímetro cuadrado','MMK',NULL,NULL),(854,'milímetro cúbico','MMQ',NULL,NULL),(855,'milímetro','MMT',NULL,NULL),(856,'mes','LUN',NULL,NULL),(857,'megapascal','MPA',NULL,NULL),(858,'mil metros','MQ',NULL,NULL),(859,'metro cúbico por hora','MQH',NULL,NULL),(860,'metro cúbico por segundo','MQS',NULL,NULL),(861,'metro por segundo al cuadrado','MSK',NULL,NULL),(862,'estera','MT',NULL,NULL),(863,'metro cuadrado','MTK',NULL,NULL),(864,'Metro cúbico','MTQ',NULL,NULL),(865,'metro','MTR',NULL,NULL),(866,'metro por segundo','MTS',NULL,NULL),(867,'numero de mults','MV',NULL,NULL),(868,'megavolt – ampere','MVA',NULL,NULL),(869,'megavatios hora (1000 kW.h)','MWH',NULL,NULL),(870,'calorías de la pluma','N1',NULL,NULL),(871,'número de líneas','N2',NULL,NULL),(872,'punto de impresión','N3',NULL,NULL),(873,'miligramo por kilogramo','NA',NULL,NULL),(874,'número de artículos','NAR',NULL,NULL),(875,'barcaza','NB',NULL,NULL),(876,'número de bobinas','NBB',NULL,NULL),(877,'coche','NC',NULL,NULL),(878,'número de celdas','NCL',NULL,NULL),(879,'barril neto','ND',NULL,NULL),(880,'litro neto','NE',NULL,NULL),(881,'newton','NEW',NULL,NULL),(882,'mensaje','NF',NULL,NULL),(883,'galón neto (nosotros)','NG',NULL,NULL),(884,'hora del mensaje','NH',NULL,NULL),(885,'galón imperial neto','NI',NULL,NULL),(886,'número de unidades internacionales','NIU',NULL,NULL),(887,'número de pantallas','NJ',NULL,NULL),(888,'carga','NL',NULL,NULL),(889,'milla nautica','MNI',NULL,NULL),(890,'número de paquetes','NMP',NULL,NULL),(891,'entrenar','NN',NULL,NULL),(892,'número de parcelas','NPL',NULL,NULL),(893,'numero de pares','NPR',NULL,NULL),(894,'numero de partes','TNP',NULL,NULL),(895,'mho','NQ',NULL,NULL),(896,'micromho','NR',NULL,NULL),(897,'número de rollos','NRL',NULL,NULL),(898,'tonelada neta','NT',NULL,NULL),(899,'registro neto de toneladas','NTT',NULL,NULL),(900,'medidor de newton','NU',NULL,NULL),(901,'vehículo','NV',NULL,NULL),(902,'parte por mil','NX',NULL,NULL),(903,'libra por aire seco tonelada métrica','NY',NULL,NULL),(904,'panel','OA',NULL,NULL),(905,'ohm','OHM',NULL,NULL),(906,'onza por yarda cuadrada','EN',NULL,NULL),(907,'onza','ONZ',NULL,NULL),(908,'Dos paquetes','OP',NULL,NULL),(909,'hora extra','OT',NULL,NULL),(910,'onza av','ONZ',NULL,NULL),(911,'onza líquida (US)','OZA',NULL,NULL),(912,'onza líquida (Reino Unido)','OZI',NULL,NULL),(913,'pagina – electronica','P0',NULL,NULL),(914,'por ciento','P1',NULL,NULL),(915,'libra por pie','P2',NULL,NULL),(916,'paquete de tres','P3',NULL,NULL),(917,'paquete de cuatro','P4',NULL,NULL),(918,'paquete de cinco','P5',NULL,NULL),(919,'paquete de seis','P6',NULL,NULL),(920,'paquete de siete','P7',NULL,NULL),(921,'paquete de ocho','P8',NULL,NULL),(922,'paquete de nueve','P9',NULL,NULL),(923,'paquete','PA',NULL,NULL),(924,'pascal','PAL',NULL,NULL),(925,'par de pulgadas','PB',NULL,NULL),(926,'almohadilla','PD',NULL,NULL),(927,'equivalente en libras','PE',NULL,NULL),(928,'palet (ascensor)','PF',NULL,NULL),(929,'plato','PG',NULL,NULL),(930,'galón de prueba','PGL',NULL,NULL),(931,'tono','Pi',NULL,NULL),(932,'paquete','PK',NULL,NULL),(933,'cubo','PL',NULL,NULL),(934,'porcentaje de libra','PM',NULL,NULL),(935,'libra neta','PN',NULL,NULL),(936,'libra por pulgada de longitud','PO',NULL,NULL),(937,'página por pulgada','PQ',NULL,NULL),(938,'par','PR',NULL,NULL),(939,'fuerza de libra por pulgada cuadrada','PD',NULL,NULL),(940,'pinta','PT',NULL,NULL),(941,'pinta seca','PTD',NULL,NULL),(942,'pinta (Reino Unido)','PTI',NULL,NULL),(943,'pinta liquida (US)','PTL',NULL,NULL),(944,'bandeja / paquete de bandeja','PU',NULL,NULL),(945,'media pinta (US)','PV',NULL,NULL),(946,'libra por pulgada de ancho','PW',NULL,NULL),(947,'Peck Dry (US)','PY',NULL,NULL),(948,'Peck Dry (Reino Unido)','PZ',NULL,NULL),(949,'comida','Q3',NULL,NULL),(950,'página – facsímil','QA',NULL,NULL),(951,'cuarto (de un año)','QAN',NULL,NULL),(952,'página – copia impresa','QB',NULL,NULL),(953,'cuarto de docena','QD',NULL,NULL),(954,'un cuarto de hora','QH',NULL,NULL),(955,'cuarto de kilogramo','QK',NULL,NULL),(956,'mano de papel','QR',NULL,NULL),(957,'cuarto de galón (US)','QT',NULL,NULL),(958,'cuarto seco (EE. UU.)','QTD',NULL,NULL),(959,'cuarto de galón (Reino Unido)','QTI',NULL,NULL),(960,'cuarto líquido (US)','QTL',NULL,NULL),(961,'cuarto (UK)','QTR',NULL,NULL),(962,'pica','R1',NULL,NULL),(963,'caloría','R4',NULL,NULL),(964,'mil metros cúbicos','R9',NULL,NULL),(965,'estante','RA',NULL,NULL),(966,'barra','RD',NULL,NULL),(967,'anillo','RG',NULL,NULL),(968,'hora de funcionamiento o de funcionamiento','RH',NULL,NULL),(969,'medida métrica rollo','RK',NULL,NULL),(970,'carrete','RL',NULL,NULL),(971,'resma','RM',NULL,NULL),(972,'medida métrica de resma','RN',NULL,NULL),(973,'rodar','RO',NULL,NULL),(974,'libra por resma','RP',NULL,NULL),(975,'revoluciones por minuto','RPM',NULL,NULL),(976,'revoluciones por segundo','RPS',NULL,NULL),(977,'Reiniciar','RS',NULL,NULL),(978,'ingreso tonelada milla','RT',NULL,NULL),(979,'correr','RU',NULL,NULL),(980,'pie cuadrado por segundo','S3',NULL,NULL),(981,'metro cuadrado por segundo','S4',NULL,NULL),(982,'sesenta cuartos de pulgada','S5',NULL,NULL),(983,'sesión','S6',NULL,NULL),(984,'unidad de almacenamiento','S7',NULL,NULL),(985,'unidad de publicidad estándar','S8',NULL,NULL),(986,'saco','SA',NULL,NULL),(987,'medio año (6 meses)','SAN',NULL,NULL),(988,'Puntuación','OCS',NULL,NULL),(989,'escrúpulo','SCR',NULL,NULL),(990,'libra solida','SD',NULL,NULL),(991,'sección','SE',NULL,NULL),(992,'segundo','SEC',NULL,NULL),(993,'conjunto','SET',NULL,NULL),(994,'segmento','SG',NULL,NULL),(995,'tonelada de envío','SHT',NULL,NULL),(996,'siemens','SIE',NULL,NULL),(997,'camión cisterna dividido','SK',NULL,NULL),(998,'hoja de deslizamiento','SL',NULL,NULL),(999,'milla (milla estatutaria)','SMI',NULL,NULL),(1000,'varilla cuadrada','SN',NULL,NULL),(1001,'carrete','SO',NULL,NULL),(1002,'paquete de estante','SP',NULL,NULL),(1003,'cuadrado','SQ',NULL,NULL),(1004,'tira','SR',NULL,NULL),(1005,'hoja métrica medida','SS',NULL,NULL),(1006,'corto estándar (7200 partidos)','SST',NULL,NULL),(1007,'hoja','ST',NULL,NULL),(1008,'piedra (Reino Unido)','ITS',NULL,NULL),(1009,'tonelada (US) o tonelada corta (UK / US)','STN',NULL,NULL),(1010,'patinar','SV',NULL,NULL),(1011,'madeja','SO',NULL,NULL),(1012,'envío','SX',NULL,NULL),(1013,'Línea de telecomunicaciones en servicio.','T0',NULL,NULL),(1014,'mil libras brutas','T1',NULL,NULL),(1015,'mil piezas','T3',NULL,NULL),(1016,'bolsa de mil','T4',NULL,NULL),(1017,'caja de mil','T5',NULL,NULL),(1018,'mil galones (US)','T6',NULL,NULL),(1019,'mil impresiones','T7',NULL,NULL),(1020,'mil pulgadas lineales','T8',NULL,NULL),(1021,'décimo pie cúbico','TA',NULL,NULL),(1022,'Kiloampere hora (mil amperios hora)','TAH',NULL,NULL),(1023,'camion','TC',NULL,NULL),(1024,'termia','TD',NULL,NULL),(1025,'totalizador','TE',NULL,NULL),(1026,'diez metros cuadrados','TF',NULL,NULL),(1027,'mil pulgadas cuadradas','TI',NULL,NULL),(1028,'mil centímetros cuadrados','TJ',NULL,NULL),(1029,'tanque, rectangular','TK',NULL,NULL),(1030,'mil pies (lineales)','TL',NULL,NULL),(1031,'estaño','TN',NULL,NULL),(1032,'tonelada (tonelada métrica)','TNE',NULL,NULL),(1033,'paquete de diez','TP',NULL,NULL),(1034,'diez pares','TPR',NULL,NULL),(1035,'mil pies','TQ',NULL,NULL),(1036,'mil metros cúbicos por día','TQD',NULL,NULL),(1037,'diez pies cuadrados','TR',NULL,NULL),(1038,'trillón (EUR)','TRL',NULL,NULL),(1039,'mil pies cuadrados','TS',NULL,NULL),(1040,'tonelada de sustancia 90% seca','TSD',NULL,NULL),(1041,'tonelada de vapor por hora','TSH',NULL,NULL),(1042,'mil metros lineales','TT',NULL,NULL),(1043,'tubo','TU',NULL,NULL),(1044,'mil kilogramos','TV',NULL,NULL),(1045,'mil hojas','TW',NULL,NULL),(1046,'tanque, cilíndrico','TY',NULL,NULL),(1047,'tratamiento','U1',NULL,NULL),(1048,'tableta','U2',NULL,NULL),(1049,'torr','UA',NULL,NULL),(1050,'Línea de telecomunicaciones en servicio promedio.','UB',NULL,NULL),(1051,'puerto de telecomunicaciones','UC',NULL,NULL),(1052,'décimo minuto','UD',NULL,NULL),(1053,'décima hora','UE',NULL,NULL),(1054,'uso por línea de telecomunicación promedio','UF',NULL,NULL),(1055,'diez mil yardas','UH',NULL,NULL),(1056,'millones de unidades','UM',NULL,NULL),(1057,'voltio amperio por kilogramo','VA',NULL,NULL),(1058,'frasco','VI',NULL,NULL),(1059,'voltio','VLT',NULL,NULL),(1060,'abultar','VQ',NULL,NULL),(1061,'visitar','VS',NULL,NULL),(1062,'kilo mojado','W2',NULL,NULL),(1063,'dos semanas','W4',NULL,NULL),(1064,'vatio por kilogramo','WA',NULL,NULL),(1065,'libra mojada','WB',NULL,NULL),(1066,'cable','WCD',NULL,NULL),(1067,'tonelada mojada','WE',NULL,NULL),(1068,'weber','WEB',NULL,NULL),(1069,'semana','WEE',NULL,NULL),(1070,'galon de vino','WG',NULL,NULL),(1071,'rueda','WH',NULL,NULL),(1072,'vatios hora','WHR',NULL,NULL),(1073,'peso por pulgada cuadrada','WI',NULL,NULL),(1074,'mes de trabajo','WM',NULL,NULL),(1075,'envolver','WR',NULL,NULL),(1076,'estándar','WSD',NULL,NULL),(1077,'vatio','WTT',NULL,NULL),(1078,'mililitro de agua','WW',NULL,NULL),(1079,'cadena','X1',NULL,NULL),(1080,'yarda cuadrada','YDK',NULL,NULL),(1081,'Yarda cúbica','YDQ',NULL,NULL),(1082,'cien yardas lineales','YL',NULL,NULL),(1083,'yarda','YRD',NULL,NULL),(1084,'diez yardas','YT',NULL,NULL),(1085,'van de elevación','Z1',NULL,NULL),(1086,'pecho','Z2',NULL,NULL),(1087,'barril','Z3',NULL,NULL),(1088,'pipa','Z4',NULL,NULL),(1089,'arrastrar','Z5',NULL,NULL),(1090,'punto de conferencia','Z6',NULL,NULL),(1091,'línea de noticias de ágata','Z8',NULL,NULL),(1092,'página','ZP',NULL,NULL),(1093,'mutuamente definido','ZZ',NULL,NULL);
/*!40000 ALTER TABLE `unit_measures` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Dumping data for table `type_documents`
--

LOCK TABLES `type_documents` WRITE;
/*!40000 ALTER TABLE `type_documents` DISABLE KEYS */;
INSERT INTO `type_documents` VALUES (1,'01','Factura electrónica','CUFE-SHA384',NULL,NULL),(2,'91','Nota crédito','CUDE-SHA384',NULL,NULL),(3,'92','Nota débito','CUDE-SHA384',NULL,NULL);
/*!40000 ALTER TABLE `type_documents` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Dumping data for table `type_item_identifications`
--

LOCK TABLES `type_item_identifications` WRITE;
/*!40000 ALTER TABLE `type_item_identifications` DISABLE KEYS */;
INSERT INTO `type_item_identifications` VALUES (1,'001',NULL,'UNSPSC',NULL,NULL),(2,'010',NULL,'GTIN',NULL,NULL),(3,'020','195','Partida Arancelarias',NULL,NULL),(4,'999',NULL,'Estándar de adopción del contribuyente',NULL,NULL);
/*!40000 ALTER TABLE `type_item_identifications` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Dumping data for table `type_liabilities`
--

LOCK TABLES `type_liabilities` WRITE;
/*!40000 ALTER TABLE `type_liabilities` DISABLE KEYS */;
INSERT INTO `type_liabilities` VALUES (1,'50','Gran contribuyente','Responsabilidad tributaria especial'),(2,'51','Autorretenedor','Responsable de sus propias retenciones'),(3,'52','Agente de retención IVA','Retiene IVA de terceros'),(4,'R-99-PN','No aplica','Persona natural sin responsabilidad específica');
/*!40000 ALTER TABLE `type_liabilities` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Dumping data for table `type_organizations`
--

LOCK TABLES `type_organizations` WRITE;
/*!40000 ALTER TABLE `type_organizations` DISABLE KEYS */;
INSERT INTO `type_organizations` VALUES (1,'1','Persona Jurídica','Empresa legalmente constituida'),(2,'2','Persona Natural','Individuo que ejerce actividad comercial');
/*!40000 ALTER TABLE `type_organizations` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Dumping data for table `type_regimes`
--

LOCK TABLES `type_regimes` WRITE;
/*!40000 ALTER TABLE `type_regimes` DISABLE KEYS */;
INSERT INTO `type_regimes` VALUES (1,'48','Régimen Simple de Tributación - SIMPLE','Ley 2010 de 2019',NULL,NULL),(2,'49','Régimen Ordinario','Régimen general tradicional',NULL,NULL);
/*!40000 ALTER TABLE `type_regimes` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Dumping data for table `taxes`
--

LOCK TABLES `taxes` WRITE;
/*!40000 ALTER TABLE `taxes` DISABLE KEYS */;
INSERT INTO `taxes` VALUES (1,'IVA','01','Impuesto al Valor Agregado',NULL,NULL),(3,'ICA','03','Impuesto de Industria y Comercio',NULL,NULL);
/*!40000 ALTER TABLE `taxes` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Dumping data for table `payment_methods`
--

LOCK TABLES `payment_methods` WRITE;
/*!40000 ALTER TABLE `payment_methods` DISABLE KEYS */;
INSERT INTO `payment_methods` VALUES (2,'2','Crédito ACH',NULL,NULL),(3,'3','Débito ACH',NULL,NULL),(4,'4','Reversión débito de demanda ACH',NULL,NULL),(5,'5','Reversión crédito de demanda ACH ',NULL,NULL),(6,'6','Crédito de demanda ACH',NULL,NULL),(7,'7','Débito de demanda ACH',NULL,NULL),(8,'8','Mantener',NULL,NULL),(9,'9','Clearing Nacional o Regional',NULL,NULL),(10,'10','Efectivo',NULL,NULL),(11,'11','Reversión Crédito Ahorro',NULL,NULL),(12,'12','Reversión Débito Ahorro',NULL,NULL),(13,'13','Crédito Ahorro',NULL,NULL),(14,'14','Débito Ahorro',NULL,NULL),(15,'15','Bookentry Crédito',NULL,NULL),(16,'16','Bookentry Débito',NULL,NULL),(17,'17','Concentración de la demanda en efectivo /Desembolso Crédito (CCD)',NULL,NULL),(18,'18','Concentración de la demanda en efectivo / Desembolso (CCD) débito',NULL,NULL),(19,'19','Crédito Pago negocio corporativo (CTP)',NULL,NULL),(20,'20','Cheque',NULL,NULL),(21,'21','Poyecto bancario',NULL,NULL),(22,'22','Proyecto bancario certificado',NULL,NULL),(23,'23','Cheque bancario',NULL,NULL),(24,'24','Nota cambiaria esperando aceptación',NULL,NULL),(25,'25','Cheque certificado',NULL,NULL),(26,'26','Cheque Local',NULL,NULL),(27,'27','Débito Pago Neogcio Corporativo (CTP)',NULL,NULL),(28,'28','Crédito Negocio Intercambio Corporativo (CTX)',NULL,NULL),(29,'29','Débito Negocio Intercambio Corporativo (CTX)',NULL,NULL),(30,'30','Transferecia Crédito',NULL,NULL),(31,'31','Transferencia Débito',NULL,NULL),(32,'32','Concentración Efectivo / Desembolso Crédito plus (CCD+)',NULL,NULL),(33,'33','Concentración Efectivo / Desembolso Débito plus (CCD+)',NULL,NULL),(34,'34','Pago y depósito pre acordado (PPD)',NULL,NULL),(35,'35','Concentración efectivo ahorros / Desembolso Crédito (CCD)',NULL,NULL),(36,'36','Concentración efectivo ahorros / Desembolso Drédito (CCD)',NULL,NULL),(37,'37','Pago Negocio Corporativo Ahorros Crédito (CTP)',NULL,NULL),(38,'38','Pago Neogcio Corporativo Ahorros Débito (CTP)',NULL,NULL),(39,'39','Crédito Negocio Intercambio Corporativo (CTX)',NULL,NULL),(40,'40','Débito Negocio Intercambio Corporativo (CTX)',NULL,NULL),(41,'41','Concentración efectivo/Desembolso Crédito plus (CCD+)',NULL,NULL),(42,'42','Consiganción bancaria',NULL,NULL),(43,'43','Concentración efectivo / Desembolso Débito plus (CCD+)',NULL,NULL),(44,'44','Nota cambiaria',NULL,NULL),(45,'45','Transferencia Crédito Bancario',NULL,NULL),(46,'46','Transferencia Débito Interbancario',NULL,NULL),(47,'47','Transferencia Débito Bancaria',NULL,NULL),(48,'48','Tarjeta Crédito',NULL,NULL),(49,'49','Tarjeta Débito',NULL,NULL),(50,'50','Postgiro',NULL,NULL),(51,'51','Telex estándar bancario francés',NULL,NULL),(52,'52','Pago comercial urgente',NULL,NULL),(53,'53','Pago Tesorería Urgente',NULL,NULL),(54,'60','Nota promisoria',NULL,NULL),(55,'61','Nota promisoria firmada por el acreedor',NULL,NULL),(56,'62','Nota promisoria firmada por el acreedor, avalada por el banco',NULL,NULL),(57,'63','Nota promisoria firmada por el acreedor, avalada por un tercero',NULL,NULL),(58,'64','Nota promisoria firmada pro el banco',NULL,NULL),(59,'65','Nota promisoria firmada por un banco avalada por otro banco',NULL,NULL),(60,' 6','Nota promisoria firmada',NULL,NULL),(61,'67','Nota promisoria firmada por un tercero avalada por un banco',NULL,NULL),(62,'70','Retiro de nota por el por el acreedor',NULL,NULL),(63,'74','Retiro de nota por el por el acreedor sobre un banco',NULL,NULL),(64,'75','Retiro de nota por el acreedor, avalada por otro banco',NULL,NULL),(65,'76','Retiro de nota por el acreedor, sobre un banco avalada por un tercero',NULL,NULL),(66,'77','Retiro de una nota por el acreedor sobre un tercero',NULL,NULL),(67,'78','Retiro de una nota por el acreedor sobre un tercero avalada por un banco',NULL,NULL),(68,'91','Nota bancaria tranferible',NULL,NULL),(69,'92','Cheque local traferible',NULL,NULL),(70,'93','Giro referenciado',NULL,NULL),(71,'94','Giro urgente',NULL,NULL),(72,'95','Giro formato abierto',NULL,NULL),(73,'96','Método de pago solicitado no usuado',NULL,NULL),(74,'97','Clearing entre partners',NULL,NULL),(75,'ZZ','Acuerdo mutuo',NULL,NULL);
/*!40000 ALTER TABLE `payment_methods` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Dumping data for table `municipalities`
--

LOCK TABLES `municipalities` WRITE;
/*!40000 ALTER TABLE `municipalities` DISABLE KEYS */;
INSERT INTO `municipalities` VALUES (1,46,2,'05001','Medellín',NULL,NULL),(2,46,2,'05002','Abejorral',NULL,NULL),(3,46,2,'05004','Abriaquí',NULL,NULL),(4,46,2,'05021','Alejandría',NULL,NULL),(5,46,2,'05030','Amagá',NULL,NULL),(6,46,2,'05031','Amalfi',NULL,NULL),(7,46,2,'05034','Andes',NULL,NULL),(8,46,2,'05036','Angelópolis',NULL,NULL),(9,46,2,'05038','Angostura',NULL,NULL),(10,46,2,'05040','Anorí',NULL,NULL),(11,46,2,'05042','Santa Fé De Antioquia',NULL,NULL),(12,46,2,'05044','Anzá',NULL,NULL),(13,46,2,'05045','Apartadó',NULL,NULL),(14,46,2,'05051','Arboletes',NULL,NULL),(15,46,2,'05055','Argelia',NULL,NULL),(16,46,2,'05059','Armenia',NULL,NULL),(17,46,2,'05079','Barbosa',NULL,NULL),(18,46,2,'05086','Belmira',NULL,NULL),(19,46,2,'05088','Bello',NULL,NULL),(20,46,2,'05091','Betania',NULL,NULL),(21,46,2,'05093','Betulia',NULL,NULL),(22,46,2,'05101','Ciudad Bolívar ',NULL,NULL),(23,46,2,'05107','Briceño',NULL,NULL),(24,46,2,'05113','Buriticá',NULL,NULL),(25,46,2,'05120','Cáceres',NULL,NULL),(26,46,2,'05125','Caicedo',NULL,NULL),(27,46,2,'05129','Caldas',NULL,NULL),(28,46,2,'05134','Campamento',NULL,NULL),(29,46,2,'05138','Cañasgordas',NULL,NULL),(30,46,2,'05142','Caracolí',NULL,NULL),(31,46,2,'05145','Caramanta',NULL,NULL),(32,46,2,'05147','Carepa',NULL,NULL),(33,46,2,'05148','El Carmen De Viboral',NULL,NULL),(34,46,2,'05150','Carolina',NULL,NULL),(35,46,2,'05154','Caucasia',NULL,NULL),(36,46,2,'05172','Chigorodó',NULL,NULL),(37,46,2,'05190','Cisneros',NULL,NULL),(38,46,2,'05197','Cocorná',NULL,NULL),(39,46,2,'05206','Concepción',NULL,NULL),(40,46,2,'05209','Concordia',NULL,NULL),(41,46,2,'05212','Copacabana',NULL,NULL),(42,46,2,'05234','Dabeiba',NULL,NULL),(43,46,2,'05237','Donmatías',NULL,NULL),(44,46,2,'05240','Ebéjico',NULL,NULL),(45,46,2,'05250','El Bagre ',NULL,NULL),(46,46,2,'05264','Entrerríos',NULL,NULL),(47,46,2,'05266','Envigado',NULL,NULL),(48,46,2,'05282','Fredonia',NULL,NULL),(49,46,2,'05284','Frontino',NULL,NULL),(50,46,2,'05306','Giraldo',NULL,NULL),(51,46,2,'05308','Girardota',NULL,NULL),(52,46,2,'05310','Gómez Plata ',NULL,NULL),(53,46,2,'05313','Granada',NULL,NULL),(54,46,2,'05315','Guadalupe',NULL,NULL),(55,46,2,'05318','Guarne',NULL,NULL),(56,46,2,'05321','Guatapé',NULL,NULL),(57,46,2,'05347','Heliconia',NULL,NULL),(58,46,2,'05353','Hispania',NULL,NULL),(59,46,2,'05360','Itagüí',NULL,NULL),(60,46,2,'05361','Ituango',NULL,NULL),(61,46,2,'05364','Jardín',NULL,NULL),(62,46,2,'05368','Jericó',NULL,NULL),(63,46,2,'05376','La Ceja ',NULL,NULL),(64,46,2,'05380','La Estrella ',NULL,NULL),(65,46,2,'05390','La Pintada ',NULL,NULL),(66,46,2,'05400','La Unión ',NULL,NULL),(67,46,2,'05411','Liborina',NULL,NULL),(68,46,2,'05425','Maceo',NULL,NULL),(69,46,2,'05440','Marinilla',NULL,NULL),(70,46,2,'05467','Montebello',NULL,NULL),(71,46,2,'05475','Murindó',NULL,NULL),(72,46,2,'05480','Mutatá',NULL,NULL),(73,46,2,'05483','Nariño',NULL,NULL),(74,46,2,'05490','Necoclí',NULL,NULL),(75,46,2,'05495','Nechí',NULL,NULL),(76,46,2,'05501','Olaya',NULL,NULL),(77,46,2,'05541','Peñol',NULL,NULL),(78,46,2,'05543','Peque',NULL,NULL),(79,46,2,'05576','Pueblorrico',NULL,NULL),(80,46,2,'05579','Puerto Berrío ',NULL,NULL),(81,46,2,'05585','Puerto Nare ',NULL,NULL),(82,46,2,'05591','Puerto Triunfo ',NULL,NULL),(83,46,2,'05604','Remedios',NULL,NULL),(84,46,2,'05607','Retiro',NULL,NULL),(85,46,2,'05615','Rionegro',NULL,NULL),(86,46,2,'05628','Sabanalarga',NULL,NULL),(87,46,2,'05631','Sabaneta',NULL,NULL),(88,46,2,'05642','Salgar',NULL,NULL),(89,46,2,'05647','San Andrés De Cuerquía',NULL,NULL),(90,46,2,'05649','San Carlos ',NULL,NULL),(91,46,2,'05652','San Francisco ',NULL,NULL),(92,46,2,'05656','San Jerónimo ',NULL,NULL),(93,46,2,'05658','San José De La Montaña ',NULL,NULL),(94,46,2,'05659','San Juan De Urabá',NULL,NULL),(95,46,2,'05660','San Luis ',NULL,NULL),(96,46,2,'05664','San Pedro De Los Milagros ',NULL,NULL),(97,46,2,'05665','San Pedro De Urabá',NULL,NULL),(98,46,2,'05667','San Rafael ',NULL,NULL),(99,46,2,'05670','San Roque ',NULL,NULL),(100,46,2,'05674','San Vicente Ferrer',NULL,NULL),(101,46,2,'05679','Santa Bárbara ',NULL,NULL),(102,46,2,'05686','Santa Rosa De Osos',NULL,NULL),(103,46,2,'05690','Santo Domingo ',NULL,NULL),(104,46,2,'05697','El Santuario ',NULL,NULL),(105,46,2,'05736','Segovia',NULL,NULL),(106,46,2,'05756','Sonsón',NULL,NULL),(107,46,2,'05761','Sopetrán',NULL,NULL),(108,46,2,'05789','Támesis',NULL,NULL),(109,46,2,'05790','Tarazá',NULL,NULL),(110,46,2,'05792','Tarso',NULL,NULL),(111,46,2,'05809','Titiribí',NULL,NULL),(112,46,2,'05819','Toledo',NULL,NULL),(113,46,2,'05837','Turbo',NULL,NULL),(114,46,2,'05842','Uramita',NULL,NULL),(115,46,2,'05847','Urrao',NULL,NULL),(116,46,2,'05854','Valdivia',NULL,NULL),(117,46,2,'05856','Valparaíso',NULL,NULL),(118,46,2,'05858','Vegachí',NULL,NULL),(119,46,2,'05861','Venecia',NULL,NULL),(120,46,2,'05873','Vigía Del Fuerte',NULL,NULL),(121,46,2,'05885','Yalí',NULL,NULL),(122,46,2,'05887','Yarumal',NULL,NULL),(123,46,2,'05890','Yolombó',NULL,NULL),(124,46,2,'05893','Yondó',NULL,NULL),(125,46,2,'05895','Zaragoza',NULL,NULL),(126,46,4,'08001','Barranquilla',NULL,NULL),(127,46,4,'08078','Baranoa',NULL,NULL),(128,46,4,'08137','Campo De La Cruz',NULL,NULL),(129,46,4,'08141','Candelaria',NULL,NULL),(130,46,4,'08296','Galapa',NULL,NULL),(131,46,4,'08372','Juan De Acosta',NULL,NULL),(132,46,4,'08421','Luruaco',NULL,NULL),(133,46,4,'08433','Malambo',NULL,NULL),(134,46,4,'08436','Manatí',NULL,NULL),(135,46,4,'08520','Palmar De Varela',NULL,NULL),(136,46,4,'08549','Piojó',NULL,NULL),(137,46,4,'08558','Polonuevo',NULL,NULL),(138,46,4,'08560','Ponedera',NULL,NULL),(139,46,4,'08573','Puerto Colombia ',NULL,NULL),(140,46,4,'08606','Repelón',NULL,NULL),(141,46,4,'08634','Sabanagrande',NULL,NULL),(142,46,4,'08638','Sabanalarga',NULL,NULL),(143,46,4,'08675','Santa Lucía ',NULL,NULL),(144,46,4,'08685','Santo Tomás ',NULL,NULL),(145,46,4,'08758','Soledad',NULL,NULL),(146,46,4,'08770','Suan',NULL,NULL),(147,46,4,'08832','Tubará',NULL,NULL),(148,46,4,'08849','Usiacurí',NULL,NULL),(149,46,5,'11001','Bogotá, D.c. ',NULL,NULL),(150,46,6,'13001','Cartagena De Indias',NULL,NULL),(151,46,6,'13006','Achí',NULL,NULL),(152,46,6,'13030','Altos Del Rosario',NULL,NULL),(153,46,6,'13042','Arenal',NULL,NULL),(154,46,6,'13052','Arjona',NULL,NULL),(155,46,6,'13062','Arroyohondo',NULL,NULL),(156,46,6,'13074','Barranco De Loba',NULL,NULL),(157,46,6,'13140','Calamar',NULL,NULL),(158,46,6,'13160','Cantagallo',NULL,NULL),(159,46,6,'13188','Cicuco',NULL,NULL),(160,46,6,'13212','Córdoba',NULL,NULL),(161,46,6,'13222','Clemencia',NULL,NULL),(162,46,6,'13244','El Carmen De Bolívar',NULL,NULL),(163,46,6,'13248','El Guamo ',NULL,NULL),(164,46,6,'13268','El Peñón ',NULL,NULL),(165,46,6,'13300','Hatillo De Loba',NULL,NULL),(166,46,6,'13430','Magangué',NULL,NULL),(167,46,6,'13433','Mahates',NULL,NULL),(168,46,6,'13440','Margarita',NULL,NULL),(169,46,6,'13442','María La Baja',NULL,NULL),(170,46,6,'13458','Montecristo',NULL,NULL),(171,46,6,'13468','Mompós',NULL,NULL),(172,46,6,'13473','Morales',NULL,NULL),(173,46,6,'13490','Norosí',NULL,NULL),(174,46,6,'13549','Pinillos',NULL,NULL),(175,46,6,'13580','Regidor',NULL,NULL),(176,46,6,'13600','Río Viejo ',NULL,NULL),(177,46,6,'13620','San Cristóbal ',NULL,NULL),(178,46,6,'13647','San Estanislao ',NULL,NULL),(179,46,6,'13650','San Fernando ',NULL,NULL),(180,46,6,'13654','San Jacinto ',NULL,NULL),(181,46,6,'13655','San Jacinto Del Cauca',NULL,NULL),(182,46,6,'13657','San Juan Nepomuceno',NULL,NULL),(183,46,6,'13667','San Martín De Loba',NULL,NULL),(184,46,6,'13670','San Pablo ',NULL,NULL),(185,46,6,'13673','Santa Catalina ',NULL,NULL),(186,46,6,'13683','Santa Rosa ',NULL,NULL),(187,46,6,'13688','Santa Rosa Del Sur',NULL,NULL),(188,46,6,'13744','Simití',NULL,NULL),(189,46,6,'13760','Soplaviento',NULL,NULL),(190,46,6,'13780','Talaigua Nuevo ',NULL,NULL),(191,46,6,'13810','Tiquisio',NULL,NULL),(192,46,6,'13836','Turbaco',NULL,NULL),(193,46,6,'13838','Turbaná',NULL,NULL),(194,46,6,'13873','Villanueva',NULL,NULL),(195,46,6,'13894','Zambrano',NULL,NULL),(196,46,7,'15001','Tunja',NULL,NULL),(197,46,7,'15022','Almeida',NULL,NULL),(198,46,7,'15047','Aquitania',NULL,NULL),(199,46,7,'15051','Arcabuco',NULL,NULL),(200,46,7,'15087','Belén',NULL,NULL),(201,46,7,'15090','Berbeo',NULL,NULL),(202,46,7,'15092','Betéitiva',NULL,NULL),(203,46,7,'15097','Boavita',NULL,NULL),(204,46,7,'15104','Boyacá',NULL,NULL),(205,46,7,'15106','Briceño',NULL,NULL),(206,46,7,'15109','Buenavista',NULL,NULL),(207,46,7,'15114','Busbanzá',NULL,NULL),(208,46,7,'15131','Caldas',NULL,NULL),(209,46,7,'15135','Campohermoso',NULL,NULL),(210,46,7,'15162','Cerinza',NULL,NULL),(211,46,7,'15172','Chinavita',NULL,NULL),(212,46,7,'15176','Chiquinquirá',NULL,NULL),(213,46,7,'15180','Chiscas',NULL,NULL),(214,46,7,'15183','Chita',NULL,NULL),(215,46,7,'15185','Chitaraque',NULL,NULL),(216,46,7,'15187','Chivatá',NULL,NULL),(217,46,7,'15189','Ciénega',NULL,NULL),(218,46,7,'15204','Cómbita',NULL,NULL),(219,46,7,'15212','Coper',NULL,NULL),(220,46,7,'15215','Corrales',NULL,NULL),(221,46,7,'15218','Covarachía',NULL,NULL),(222,46,7,'15223','Cubará',NULL,NULL),(223,46,7,'15224','Cucaita',NULL,NULL),(224,46,7,'15226','Cuítiva',NULL,NULL),(225,46,7,'15232','Chíquiza',NULL,NULL),(226,46,7,'15236','Chivor',NULL,NULL),(227,46,7,'15238','Duitama',NULL,NULL),(228,46,7,'15244','El Cocuy ',NULL,NULL),(229,46,7,'15248','El Espino ',NULL,NULL),(230,46,7,'15272','Firavitoba',NULL,NULL),(231,46,7,'15276','Floresta',NULL,NULL),(232,46,7,'15293','Gachantivá',NULL,NULL),(233,46,7,'15296','Gámeza',NULL,NULL),(234,46,7,'15299','Garagoa',NULL,NULL),(235,46,7,'15317','Guacamayas',NULL,NULL),(236,46,7,'15322','Guateque',NULL,NULL),(237,46,7,'15325','Guayatá',NULL,NULL),(238,46,7,'15332','Güicán De La Sierra',NULL,NULL),(239,46,7,'15362','Iza',NULL,NULL),(240,46,7,'15367','Jenesano',NULL,NULL),(241,46,7,'15368','Jericó',NULL,NULL),(242,46,7,'15377','Labranzagrande',NULL,NULL),(243,46,7,'15380','La Capilla ',NULL,NULL),(244,46,7,'15401','La Victoria ',NULL,NULL),(245,46,7,'15403','La Uvita ',NULL,NULL),(246,46,7,'15407','Villa De Leyva',NULL,NULL),(247,46,7,'15425','Macanal',NULL,NULL),(248,46,7,'15442','Maripí',NULL,NULL),(249,46,7,'15455','Miraflores',NULL,NULL),(250,46,7,'15464','Mongua',NULL,NULL),(251,46,7,'15466','Monguí',NULL,NULL),(252,46,7,'15469','Moniquirá',NULL,NULL),(253,46,7,'15476','Motavita',NULL,NULL),(254,46,7,'15480','Muzo',NULL,NULL),(255,46,7,'15491','Nobsa',NULL,NULL),(256,46,7,'15494','Nuevo Colón ',NULL,NULL),(257,46,7,'15500','Oicatá',NULL,NULL),(258,46,7,'15507','Otanche',NULL,NULL),(259,46,7,'15511','Pachavita',NULL,NULL),(260,46,7,'15514','Páez',NULL,NULL),(261,46,7,'15516','Paipa',NULL,NULL),(262,46,7,'15518','Pajarito',NULL,NULL),(263,46,7,'15522','Panqueba',NULL,NULL),(264,46,7,'15531','Pauna',NULL,NULL),(265,46,7,'15533','Paya',NULL,NULL),(266,46,7,'15537','Paz De Río',NULL,NULL),(267,46,7,'15542','Pesca',NULL,NULL),(268,46,7,'15550','Pisba',NULL,NULL),(269,46,7,'15572','Puerto Boyacá ',NULL,NULL),(270,46,7,'15580','Quípama',NULL,NULL),(271,46,7,'15599','Ramiriquí',NULL,NULL),(272,46,7,'15600','Ráquira',NULL,NULL),(273,46,7,'15621','Rondón',NULL,NULL),(274,46,7,'15632','Saboyá',NULL,NULL),(275,46,7,'15638','Sáchica',NULL,NULL),(276,46,7,'15646','Samacá',NULL,NULL),(277,46,7,'15660','San Eduardo ',NULL,NULL),(278,46,7,'15664','San José De Pare',NULL,NULL),(279,46,7,'15667','San Luis De Gaceno',NULL,NULL),(280,46,7,'15673','San Mateo ',NULL,NULL),(281,46,7,'15676','San Miguel De Sema',NULL,NULL),(282,46,7,'15681','San Pablo De Borbur',NULL,NULL),(283,46,7,'15686','Santana',NULL,NULL),(284,46,7,'15690','Santa María ',NULL,NULL),(285,46,7,'15693','Santa Rosa De Viterbo',NULL,NULL),(286,46,7,'15696','Santa Sofía ',NULL,NULL),(287,46,7,'15720','Sativanorte',NULL,NULL),(288,46,7,'15723','Sativasur',NULL,NULL),(289,46,7,'15740','Siachoque',NULL,NULL),(290,46,7,'15753','Soatá',NULL,NULL),(291,46,7,'15755','Socotá',NULL,NULL),(292,46,7,'15757','Socha',NULL,NULL),(293,46,7,'15759','Sogamoso',NULL,NULL),(294,46,7,'15761','Somondoco',NULL,NULL),(295,46,7,'15762','Sora',NULL,NULL),(296,46,7,'15763','Sotaquirá',NULL,NULL),(297,46,7,'15764','Soracá',NULL,NULL),(298,46,7,'15774','Susacón',NULL,NULL),(299,46,7,'15776','Sutamarchán',NULL,NULL),(300,46,7,'15778','Sutatenza',NULL,NULL),(301,46,7,'15790','Tasco',NULL,NULL),(302,46,7,'15798','Tenza',NULL,NULL),(303,46,7,'15804','Tibaná',NULL,NULL),(304,46,7,'15806','Tibasosa',NULL,NULL),(305,46,7,'15808','Tinjacá',NULL,NULL),(306,46,7,'15810','Tipacoque',NULL,NULL),(307,46,7,'15814','Toca',NULL,NULL),(308,46,7,'15816','Togüí',NULL,NULL),(309,46,7,'15820','Tópaga',NULL,NULL),(310,46,7,'15822','Tota',NULL,NULL),(311,46,7,'15832','Tununguá',NULL,NULL),(312,46,7,'15835','Turmequé',NULL,NULL),(313,46,7,'15837','Tuta',NULL,NULL),(314,46,7,'15839','Tutazá',NULL,NULL),(315,46,7,'15842','Úmbita',NULL,NULL),(316,46,7,'15861','Ventaquemada',NULL,NULL),(317,46,7,'15879','Viracachá',NULL,NULL),(318,46,7,'15897','Zetaquira',NULL,NULL),(319,46,8,'17001','Manizales',NULL,NULL),(320,46,8,'17013','Aguadas',NULL,NULL),(321,46,8,'17042','Anserma',NULL,NULL),(322,46,8,'17050','Aranzazu',NULL,NULL),(323,46,8,'17088','Belalcázar',NULL,NULL),(324,46,8,'17174','Chinchiná',NULL,NULL),(325,46,8,'17272','Filadelfia',NULL,NULL),(326,46,8,'17380','La Dorada ',NULL,NULL),(327,46,8,'17388','La Merced ',NULL,NULL),(328,46,8,'17433','Manzanares',NULL,NULL),(329,46,8,'17442','Marmato',NULL,NULL),(330,46,8,'17444','Marquetalia',NULL,NULL),(331,46,8,'17446','Marulanda',NULL,NULL),(332,46,8,'17486','Neira',NULL,NULL),(333,46,8,'17495','Norcasia',NULL,NULL),(334,46,8,'17513','Pácora',NULL,NULL),(335,46,8,'17524','Palestina',NULL,NULL),(336,46,8,'17541','Pensilvania',NULL,NULL),(337,46,8,'17614','Riosucio',NULL,NULL),(338,46,8,'17616','Risaralda',NULL,NULL),(339,46,8,'17653','Salamina',NULL,NULL),(340,46,8,'17662','Samaná',NULL,NULL),(341,46,8,'17665','San José ',NULL,NULL),(342,46,8,'17777','Supía',NULL,NULL),(343,46,8,'17867','Victoria',NULL,NULL),(344,46,8,'17873','Villamaría',NULL,NULL),(345,46,8,'17877','Viterbo',NULL,NULL),(346,46,9,'18001','Florencia',NULL,NULL),(347,46,9,'18029','Albania',NULL,NULL),(348,46,9,'18094','Belén De Los Andaquíes',NULL,NULL),(349,46,9,'18150','Cartagena Del Chairá',NULL,NULL),(350,46,9,'18205','Curillo',NULL,NULL),(351,46,9,'18247','El Doncello ',NULL,NULL),(352,46,9,'18256','El Paujíl ',NULL,NULL),(353,46,9,'18410','La Montañita ',NULL,NULL),(354,46,9,'18460','Milán',NULL,NULL),(355,46,9,'18479','Morelia',NULL,NULL),(356,46,9,'18592','Puerto Rico ',NULL,NULL),(357,46,9,'18610','San José Del Fragua',NULL,NULL),(358,46,9,'18753','San Vicente Del Caguán',NULL,NULL),(359,46,9,'18756','Solano',NULL,NULL),(360,46,9,'18785','Solita',NULL,NULL),(361,46,9,'18860','Valparaíso',NULL,NULL),(362,46,11,'19001','Popayán',NULL,NULL),(363,46,11,'19022','Almaguer',NULL,NULL),(364,46,11,'19050','Argelia',NULL,NULL),(365,46,11,'19075','Balboa',NULL,NULL),(366,46,11,'19100','Bolívar',NULL,NULL),(367,46,11,'19110','Buenos Aires ',NULL,NULL),(368,46,11,'19130','Cajibío',NULL,NULL),(369,46,11,'19137','Caldono',NULL,NULL),(370,46,11,'19142','Caloto',NULL,NULL),(371,46,11,'19212','Corinto',NULL,NULL),(372,46,11,'19256','El Tambo ',NULL,NULL),(373,46,11,'19290','Florencia',NULL,NULL),(374,46,11,'19300','Guachené',NULL,NULL),(375,46,11,'19318','Guapí',NULL,NULL),(376,46,11,'19355','Inzá',NULL,NULL),(377,46,11,'19364','Jambaló',NULL,NULL),(378,46,11,'19392','La Sierra ',NULL,NULL),(379,46,11,'19397','La Vega ',NULL,NULL),(380,46,11,'19418','López De Micay',NULL,NULL),(381,46,11,'19450','Mercaderes',NULL,NULL),(382,46,11,'19455','Miranda',NULL,NULL),(383,46,11,'19473','Morales',NULL,NULL),(384,46,11,'19513','Padilla',NULL,NULL),(385,46,11,'19517','Páez',NULL,NULL),(386,46,11,'19532','Patía',NULL,NULL),(387,46,11,'19533','Piamonte',NULL,NULL),(388,46,11,'19548','Piendamó - Tunía',NULL,NULL),(389,46,11,'19573','Puerto Tejada ',NULL,NULL),(390,46,11,'19585','Puracé',NULL,NULL),(391,46,11,'19622','Rosas',NULL,NULL),(392,46,11,'19693','San Sebastián ',NULL,NULL),(393,46,11,'19698','Santander De Quilichao',NULL,NULL),(394,46,11,'19701','Santa Rosa ',NULL,NULL),(395,46,11,'19743','Silvia',NULL,NULL),(396,46,11,'19760','Sotara',NULL,NULL),(397,46,11,'19780','Suárez',NULL,NULL),(398,46,11,'19785','Sucre',NULL,NULL),(399,46,11,'19807','Timbío',NULL,NULL),(400,46,11,'19809','Timbiquí',NULL,NULL),(401,46,11,'19821','Toribío',NULL,NULL),(402,46,11,'19824','Totoró',NULL,NULL),(403,46,11,'19845','Villa Rica ',NULL,NULL),(404,46,12,'20001','Valledupar',NULL,NULL),(405,46,12,'20011','Aguachica',NULL,NULL),(406,46,12,'20013','Agustín Codazzi ',NULL,NULL),(407,46,12,'20032','Astrea',NULL,NULL),(408,46,12,'20045','Becerril',NULL,NULL),(409,46,12,'20060','Bosconia',NULL,NULL),(410,46,12,'20175','Chimichagua',NULL,NULL),(411,46,12,'20178','Chiriguaná',NULL,NULL),(412,46,12,'20228','Curumaní',NULL,NULL),(413,46,12,'20238','El Copey ',NULL,NULL),(414,46,12,'20250','El Paso ',NULL,NULL),(415,46,12,'20295','Gamarra',NULL,NULL),(416,46,12,'20310','González',NULL,NULL),(417,46,12,'20383','La Gloria ',NULL,NULL),(418,46,12,'20400','La Jagua De Ibirico',NULL,NULL),(419,46,12,'20443','Manaure Balcón Del Cesar',NULL,NULL),(420,46,12,'20517','Pailitas',NULL,NULL),(421,46,12,'20550','Pelaya',NULL,NULL),(422,46,12,'20570','Pueblo Bello ',NULL,NULL),(423,46,12,'20614','Río De Oro',NULL,NULL),(424,46,12,'20621','La Paz ',NULL,NULL),(425,46,12,'20710','San Alberto ',NULL,NULL),(426,46,12,'20750','San Diego ',NULL,NULL),(427,46,12,'20770','San Martín ',NULL,NULL),(428,46,12,'20787','Tamalameque',NULL,NULL),(429,46,14,'23001','Montería',NULL,NULL),(430,46,14,'23068','Ayapel',NULL,NULL),(431,46,14,'23079','Buenavista',NULL,NULL),(432,46,14,'23090','Canalete',NULL,NULL),(433,46,14,'23162','Cereté',NULL,NULL),(434,46,14,'23168','Chimá',NULL,NULL),(435,46,14,'23182','Chinú',NULL,NULL),(436,46,14,'23189','Ciénaga De Oro',NULL,NULL),(437,46,14,'23300','Cotorra',NULL,NULL),(438,46,14,'23350','La Apartada ',NULL,NULL),(439,46,14,'23417','Lorica',NULL,NULL),(440,46,14,'23419','Los Córdobas ',NULL,NULL),(441,46,14,'23464','Momil',NULL,NULL),(442,46,14,'23466','Montelíbano',NULL,NULL),(443,46,14,'23500','Moñitos',NULL,NULL),(444,46,14,'23555','Planeta Rica',NULL,NULL),(445,46,14,'23570','Pueblo Nuevo ',NULL,NULL),(446,46,14,'23574','Puerto Escondido ',NULL,NULL),(447,46,14,'23580','Puerto Libertador ',NULL,NULL),(448,46,14,'23586','Purísima De La Concepción',NULL,NULL),(449,46,14,'23660','Sahagún',NULL,NULL),(450,46,14,'23670','San Andrés De Sotavento',NULL,NULL),(451,46,14,'23672','San Antero ',NULL,NULL),(452,46,14,'23675','San Bernardo Del Viento',NULL,NULL),(453,46,14,'23678','San Carlos ',NULL,NULL),(454,46,14,'23682','San José De Uré',NULL,NULL),(455,46,14,'23686','San Pelayo ',NULL,NULL),(456,46,14,'23807','Tierralta',NULL,NULL),(457,46,14,'23815','Tuchín',NULL,NULL),(458,46,14,'23855','Valencia',NULL,NULL),(459,46,15,'25001','Agua De Dios',NULL,NULL),(460,46,15,'25019','Albán',NULL,NULL),(461,46,15,'25035','Anapoima',NULL,NULL),(462,46,15,'25040','Anolaima',NULL,NULL),(463,46,15,'25053','Arbeláez',NULL,NULL),(464,46,15,'25086','Beltrán',NULL,NULL),(465,46,15,'25095','Bituima',NULL,NULL),(466,46,15,'25099','Bojacá',NULL,NULL),(467,46,15,'25120','Cabrera',NULL,NULL),(468,46,15,'25123','Cachipay',NULL,NULL),(469,46,15,'25126','Cajicá',NULL,NULL),(470,46,15,'25148','Caparrapí',NULL,NULL),(471,46,15,'25151','Cáqueza',NULL,NULL),(472,46,15,'25154','Carmen De Carupa',NULL,NULL),(473,46,15,'25168','Chaguaní',NULL,NULL),(474,46,15,'25175','Chía',NULL,NULL),(475,46,15,'25178','Chipaque',NULL,NULL),(476,46,15,'25181','Choachí',NULL,NULL),(477,46,15,'25183','Chocontá',NULL,NULL),(478,46,15,'25200','Cogua',NULL,NULL),(479,46,15,'25214','Cota',NULL,NULL),(480,46,15,'25224','Cucunubá',NULL,NULL),(481,46,15,'25245','El Colegio ',NULL,NULL),(482,46,15,'25258','El Peñón ',NULL,NULL),(483,46,15,'25260','El Rosal ',NULL,NULL),(484,46,15,'25269','Facatativá',NULL,NULL),(485,46,15,'25279','Fómeque',NULL,NULL),(486,46,15,'25281','Fosca',NULL,NULL),(487,46,15,'25286','Funza',NULL,NULL),(488,46,15,'25288','Fúquene',NULL,NULL),(489,46,15,'25290','Fusagasugá',NULL,NULL),(490,46,15,'25293','Gachalá',NULL,NULL),(491,46,15,'25295','Gachancipá',NULL,NULL),(492,46,15,'25297','Gachetá',NULL,NULL),(493,46,15,'25299','Gama',NULL,NULL),(494,46,15,'25307','Girardot',NULL,NULL),(495,46,15,'25312','Granada',NULL,NULL),(496,46,15,'25317','Guachetá',NULL,NULL),(497,46,15,'25320','Guaduas',NULL,NULL),(498,46,15,'25322','Guasca',NULL,NULL),(499,46,15,'25324','Guataquí',NULL,NULL),(500,46,15,'25326','Guatavita',NULL,NULL),(501,46,15,'25328','Guayabal De Síquima',NULL,NULL),(502,46,15,'25335','Guayabetal',NULL,NULL),(503,46,15,'25339','Gutiérrez',NULL,NULL),(504,46,15,'25368','Jerusalén',NULL,NULL),(505,46,15,'25372','Junín',NULL,NULL),(506,46,15,'25377','La Calera ',NULL,NULL),(507,46,15,'25386','La Mesa ',NULL,NULL),(508,46,15,'25394','La Palma ',NULL,NULL),(509,46,15,'25398','La Peña ',NULL,NULL),(510,46,15,'25402','La Vega ',NULL,NULL),(511,46,15,'25407','Lenguazaque',NULL,NULL),(512,46,15,'25426','Machetá',NULL,NULL),(513,46,15,'25430','Madrid',NULL,NULL),(514,46,15,'25436','Manta',NULL,NULL),(515,46,15,'25438','Medina',NULL,NULL),(516,46,15,'25473','Mosquera',NULL,NULL),(517,46,15,'25483','Nariño',NULL,NULL),(518,46,15,'25486','Nemocón',NULL,NULL),(519,46,15,'25488','Nilo',NULL,NULL),(520,46,15,'25489','Nimaima',NULL,NULL),(521,46,15,'25491','Nocaima',NULL,NULL),(522,46,15,'25506','Venecia',NULL,NULL),(523,46,15,'25513','Pacho',NULL,NULL),(524,46,15,'25518','Paime',NULL,NULL),(525,46,15,'25524','Pandi',NULL,NULL),(526,46,15,'25530','Paratebueno',NULL,NULL),(527,46,15,'25535','Pasca',NULL,NULL),(528,46,15,'25572','Puerto Salgar ',NULL,NULL),(529,46,15,'25580','Pulí',NULL,NULL),(530,46,15,'25592','Quebradanegra',NULL,NULL),(531,46,15,'25594','Quetame',NULL,NULL),(532,46,15,'25596','Quipile',NULL,NULL),(533,46,15,'25599','Apulo',NULL,NULL),(534,46,15,'25612','Ricaurte',NULL,NULL),(535,46,15,'25645','San Antonio Del Tequendama',NULL,NULL),(536,46,15,'25649','San Bernardo ',NULL,NULL),(537,46,15,'25653','San Cayetano ',NULL,NULL),(538,46,15,'25658','San Francisco ',NULL,NULL),(539,46,15,'25662','San Juan De Rioseco',NULL,NULL),(540,46,15,'25718','Sasaima',NULL,NULL),(541,46,15,'25736','Sesquilé',NULL,NULL),(542,46,15,'25740','Sibaté',NULL,NULL),(543,46,15,'25743','Silvania',NULL,NULL),(544,46,15,'25745','Simijaca',NULL,NULL),(545,46,15,'25754','Soacha',NULL,NULL),(546,46,15,'25758','Sopó',NULL,NULL),(547,46,15,'25769','Subachoque',NULL,NULL),(548,46,15,'25772','Suesca',NULL,NULL),(549,46,15,'25777','Supatá',NULL,NULL),(550,46,15,'25779','Susa',NULL,NULL),(551,46,15,'25781','Sutatausa',NULL,NULL),(552,46,15,'25785','Tabio',NULL,NULL),(553,46,15,'25793','Tausa',NULL,NULL),(554,46,15,'25797','Tena',NULL,NULL),(555,46,15,'25799','Tenjo',NULL,NULL),(556,46,15,'25805','Tibacuy',NULL,NULL),(557,46,15,'25807','Tibirita',NULL,NULL),(558,46,15,'25815','Tocaima',NULL,NULL),(559,46,15,'25817','Tocancipá',NULL,NULL),(560,46,15,'25823','Topaipí',NULL,NULL),(561,46,15,'25839','Ubalá',NULL,NULL),(562,46,15,'25841','Ubaque',NULL,NULL),(563,46,15,'25843','Villa De San Diego De Ubaté',NULL,NULL),(564,46,15,'25845','Une',NULL,NULL),(565,46,15,'25851','Útica',NULL,NULL),(566,46,15,'25862','Vergara',NULL,NULL),(567,46,15,'25867','Vianí',NULL,NULL),(568,46,15,'25871','Villagómez',NULL,NULL),(569,46,15,'25873','Villapinzón',NULL,NULL),(570,46,15,'25875','Villeta',NULL,NULL),(571,46,15,'25878','Viotá',NULL,NULL),(572,46,15,'25885','Yacopí',NULL,NULL),(573,46,15,'25898','Zipacón',NULL,NULL),(574,46,15,'25899','Zipaquirá',NULL,NULL),(575,46,13,'27001','Quibdó',NULL,NULL),(576,46,13,'27006','Acandí',NULL,NULL),(577,46,13,'27025','Alto Baudó ',NULL,NULL),(578,46,13,'27050','Atrato',NULL,NULL),(579,46,13,'27073','Bagadó',NULL,NULL),(580,46,13,'27075','Bahía Solano ',NULL,NULL),(581,46,13,'27077','Bajo Baudó ',NULL,NULL),(582,46,13,'27099','Bojayá',NULL,NULL),(583,46,13,'27135','El Cantón Del San Pablo ',NULL,NULL),(584,46,13,'27150','Carmen Del Darién',NULL,NULL),(585,46,13,'27160','Cértegui',NULL,NULL),(586,46,13,'27205','Condoto',NULL,NULL),(587,46,13,'27245','El Carmen De Atrato',NULL,NULL),(588,46,13,'27250','El Litoral Del San Juan ',NULL,NULL),(589,46,13,'27361','Istmina',NULL,NULL),(590,46,13,'27372','Juradó',NULL,NULL),(591,46,13,'27413','Lloró',NULL,NULL),(592,46,13,'27425','Medio Atrato ',NULL,NULL),(593,46,13,'27430','Medio Baudó ',NULL,NULL),(594,46,13,'27450','Medio San Juan',NULL,NULL),(595,46,13,'27491','Nóvita',NULL,NULL),(596,46,13,'27495','Nuquí',NULL,NULL),(597,46,13,'27580','Río Iró ',NULL,NULL),(598,46,13,'27600','Río Quito ',NULL,NULL),(599,46,13,'27615','Riosucio',NULL,NULL),(600,46,13,'27660','San José Del Palmar',NULL,NULL),(601,46,13,'27745','Sipí',NULL,NULL),(602,46,13,'27787','Tadó',NULL,NULL),(603,46,13,'27800','Unguía',NULL,NULL),(604,46,13,'27810','Unión Panamericana ',NULL,NULL),(605,46,18,'41001','Neiva',NULL,NULL),(606,46,18,'41006','Acevedo',NULL,NULL),(607,46,18,'41013','Agrado',NULL,NULL),(608,46,18,'41016','Aipe',NULL,NULL),(609,46,18,'41020','Algeciras',NULL,NULL),(610,46,18,'41026','Altamira',NULL,NULL),(611,46,18,'41078','Baraya',NULL,NULL),(612,46,18,'41132','Campoalegre',NULL,NULL),(613,46,18,'41206','Colombia',NULL,NULL),(614,46,18,'41244','Elías',NULL,NULL),(615,46,18,'41298','Garzón',NULL,NULL),(616,46,18,'41306','Gigante',NULL,NULL),(617,46,18,'41319','Guadalupe',NULL,NULL),(618,46,18,'41349','Hobo',NULL,NULL),(619,46,18,'41357','Íquira',NULL,NULL),(620,46,18,'41359','Isnos',NULL,NULL),(621,46,18,'41378','La Argentina ',NULL,NULL),(622,46,18,'41396','La Plata ',NULL,NULL),(623,46,18,'41483','Nátaga',NULL,NULL),(624,46,18,'41503','Oporapa',NULL,NULL),(625,46,18,'41518','Paicol',NULL,NULL),(626,46,18,'41524','Palermo',NULL,NULL),(627,46,18,'41530','Palestina',NULL,NULL),(628,46,18,'41548','Pital',NULL,NULL),(629,46,18,'41551','Pitalito',NULL,NULL),(630,46,18,'41615','Rivera',NULL,NULL),(631,46,18,'41660','Saladoblanco',NULL,NULL),(632,46,18,'41668','San Agustín ',NULL,NULL),(633,46,18,'41676','Santa María ',NULL,NULL),(634,46,18,'41770','Suaza',NULL,NULL),(635,46,18,'41791','Tarqui',NULL,NULL),(636,46,18,'41797','Tesalia',NULL,NULL),(637,46,18,'41799','Tello',NULL,NULL),(638,46,18,'41801','Teruel',NULL,NULL),(639,46,18,'41807','Timaná',NULL,NULL),(640,46,18,'41872','Villavieja',NULL,NULL),(641,46,18,'41885','Yaguará',NULL,NULL),(642,46,19,'44001','Riohacha',NULL,NULL),(643,46,19,'44035','Albania',NULL,NULL),(644,46,19,'44078','Barrancas',NULL,NULL),(645,46,19,'44090','Dibulla',NULL,NULL),(646,46,19,'44098','Distracción',NULL,NULL),(647,46,19,'44110','El Molino ',NULL,NULL),(648,46,19,'44279','Fonseca',NULL,NULL),(649,46,19,'44378','Hatonuevo',NULL,NULL),(650,46,19,'44420','La Jagua Del Pilar',NULL,NULL),(651,46,19,'44430','Maicao',NULL,NULL),(652,46,19,'44560','Manaure',NULL,NULL),(653,46,19,'44650','San Juan Del Cesar',NULL,NULL),(654,46,19,'44847','Uribia',NULL,NULL),(655,46,19,'44855','Urumita',NULL,NULL),(656,46,19,'44874','Villanueva',NULL,NULL),(657,46,20,'47001','Santa Marta ',NULL,NULL),(658,46,20,'47030','Algarrobo',NULL,NULL),(659,46,20,'47053','Aracataca',NULL,NULL),(660,46,20,'47058','Ariguaní',NULL,NULL),(661,46,20,'47161','Cerro De San Antonio',NULL,NULL),(662,46,20,'47170','Chivolo',NULL,NULL),(663,46,20,'47189','Ciénaga',NULL,NULL),(664,46,20,'47205','Concordia',NULL,NULL),(665,46,20,'47245','El Banco ',NULL,NULL),(666,46,20,'47258','El Piñón ',NULL,NULL),(667,46,20,'47268','El Retén ',NULL,NULL),(668,46,20,'47288','Fundación',NULL,NULL),(669,46,20,'47318','Guamal',NULL,NULL),(670,46,20,'47460','Nueva Granada ',NULL,NULL),(671,46,20,'47541','Pedraza',NULL,NULL),(672,46,20,'47545','Pijiño Del Carmen',NULL,NULL),(673,46,20,'47551','Pivijay',NULL,NULL),(674,46,20,'47555','Plato',NULL,NULL),(675,46,20,'47570','Puebloviejo',NULL,NULL),(676,46,20,'47605','Remolino',NULL,NULL),(677,46,20,'47660','Sabanas De San Ángel',NULL,NULL),(678,46,20,'47675','Salamina',NULL,NULL),(679,46,20,'47692','San Sebastián De Buenavista',NULL,NULL),(680,46,20,'47703','San Zenón ',NULL,NULL),(681,46,20,'47707','Santa Ana ',NULL,NULL),(682,46,20,'47720','Santa Bárbara De Pinto',NULL,NULL),(683,46,20,'47745','Sitionuevo',NULL,NULL),(684,46,20,'47798','Tenerife',NULL,NULL),(685,46,20,'47960','Zapayán',NULL,NULL),(686,46,20,'47980','Zona Bananera ',NULL,NULL),(687,46,21,'50001','Villavicencio',NULL,NULL),(688,46,21,'50006','Acacías',NULL,NULL),(689,46,21,'50110','Barranca De Upía',NULL,NULL),(690,46,21,'50124','Cabuyaro',NULL,NULL),(691,46,21,'50150','Castilla La Nueva',NULL,NULL),(692,46,21,'50223','Cubarral',NULL,NULL),(693,46,21,'50226','Cumaral',NULL,NULL),(694,46,21,'50245','El Calvario ',NULL,NULL),(695,46,21,'50251','El Castillo ',NULL,NULL),(696,46,21,'50270','El Dorado ',NULL,NULL),(697,46,21,'50287','Fuente De Oro',NULL,NULL),(698,46,21,'50313','Granada',NULL,NULL),(699,46,21,'50318','Guamal',NULL,NULL),(700,46,21,'50325','Mapiripán',NULL,NULL),(701,46,21,'50330','Mesetas',NULL,NULL),(702,46,21,'50350','La Macarena ',NULL,NULL),(703,46,21,'50370','Uribe',NULL,NULL),(704,46,21,'50400','Lejanías',NULL,NULL),(705,46,21,'50450','Puerto Concordia ',NULL,NULL),(706,46,21,'50568','Puerto Gaitán ',NULL,NULL),(707,46,21,'50573','Puerto López ',NULL,NULL),(708,46,21,'50577','Puerto Lleras ',NULL,NULL),(709,46,21,'50590','Puerto Rico ',NULL,NULL),(710,46,21,'50606','Restrepo',NULL,NULL),(711,46,21,'50680','San Carlos De Guaroa',NULL,NULL),(712,46,21,'50683','San Juan De Arama',NULL,NULL),(713,46,21,'50686','San Juanito ',NULL,NULL),(714,46,21,'50689','San Martín ',NULL,NULL),(715,46,21,'50711','Vistahermosa',NULL,NULL),(716,46,22,'52001','Pasto',NULL,NULL),(717,46,22,'52019','Albán',NULL,NULL),(718,46,22,'52022','Aldana',NULL,NULL),(719,46,22,'52036','Ancuyá',NULL,NULL),(720,46,22,'52051','Arboleda',NULL,NULL),(721,46,22,'52079','Barbacoas',NULL,NULL),(722,46,22,'52083','Belén',NULL,NULL),(723,46,22,'52110','Buesaco',NULL,NULL),(724,46,22,'52203','Colón',NULL,NULL),(725,46,22,'52207','Consacá',NULL,NULL),(726,46,22,'52210','Contadero',NULL,NULL),(727,46,22,'52215','Córdoba',NULL,NULL),(728,46,22,'52224','Cuaspúd',NULL,NULL),(729,46,22,'52227','Cumbal',NULL,NULL),(730,46,22,'52233','Cumbitara',NULL,NULL),(731,46,22,'52240','Chachagüí',NULL,NULL),(732,46,22,'52250','El Charco ',NULL,NULL),(733,46,22,'52254','El Peñol ',NULL,NULL),(734,46,22,'52256','El Rosario ',NULL,NULL),(735,46,22,'52258','El Tablón De Gómez',NULL,NULL),(736,46,22,'52260','El Tambo ',NULL,NULL),(737,46,22,'52287','Funes',NULL,NULL),(738,46,22,'52317','Guachucal',NULL,NULL),(739,46,22,'52320','Guaitarilla',NULL,NULL),(740,46,22,'52323','Gualmatán',NULL,NULL),(741,46,22,'52352','Iles',NULL,NULL),(742,46,22,'52354','Imués',NULL,NULL),(743,46,22,'52356','Ipiales',NULL,NULL),(744,46,22,'52378','La Cruz ',NULL,NULL),(745,46,22,'52381','La Florida ',NULL,NULL),(746,46,22,'52385','La Llanada ',NULL,NULL),(747,46,22,'52390','La Tola ',NULL,NULL),(748,46,22,'52399','La Unión ',NULL,NULL),(749,46,22,'52405','Leiva',NULL,NULL),(750,46,22,'52411','Linares',NULL,NULL),(751,46,22,'52418','Los Andes ',NULL,NULL),(752,46,22,'52427','Magüí',NULL,NULL),(753,46,22,'52435','Mallama',NULL,NULL),(754,46,22,'52473','Mosquera',NULL,NULL),(755,46,22,'52480','Nariño',NULL,NULL),(756,46,22,'52490','Olaya Herrera ',NULL,NULL),(757,46,22,'52506','Ospina',NULL,NULL),(758,46,22,'52520','Francisco Pizarro ',NULL,NULL),(759,46,22,'52540','Policarpa',NULL,NULL),(760,46,22,'52560','Potosí',NULL,NULL),(761,46,22,'52565','Providencia',NULL,NULL),(762,46,22,'52573','Puerres',NULL,NULL),(763,46,22,'52585','Pupiales',NULL,NULL),(764,46,22,'52612','Ricaurte',NULL,NULL),(765,46,22,'52621','Roberto Payán ',NULL,NULL),(766,46,22,'52678','Samaniego',NULL,NULL),(767,46,22,'52683','Sandoná',NULL,NULL),(768,46,22,'52685','San Bernardo ',NULL,NULL),(769,46,22,'52687','San Lorenzo ',NULL,NULL),(770,46,22,'52693','San Pablo ',NULL,NULL),(771,46,22,'52694','San Pedro De Cartago',NULL,NULL),(772,46,22,'52696','Santa Bárbara ',NULL,NULL),(773,46,22,'52699','Santacruz',NULL,NULL),(774,46,22,'52720','Sapuyes',NULL,NULL),(775,46,22,'52786','Taminango',NULL,NULL),(776,46,22,'52788','Tangua',NULL,NULL),(777,46,22,'52835','San Andrés De Tumaco',NULL,NULL),(778,46,22,'52838','Túquerres',NULL,NULL),(779,46,22,'52885','Yacuanquer',NULL,NULL),(780,46,23,'54001','San José De Cúcuta',NULL,NULL),(781,46,23,'54003','Ábrego',NULL,NULL),(782,46,23,'54051','Arboledas',NULL,NULL),(783,46,23,'54099','Bochalema',NULL,NULL),(784,46,23,'54109','Bucarasica',NULL,NULL),(785,46,23,'54125','Cácota',NULL,NULL),(786,46,23,'54128','Cáchira',NULL,NULL),(787,46,23,'54172','Chinácota',NULL,NULL),(788,46,23,'54174','Chitagá',NULL,NULL),(789,46,23,'54206','Convención',NULL,NULL),(790,46,23,'54223','Cucutilla',NULL,NULL),(791,46,23,'54239','Durania',NULL,NULL),(792,46,23,'54245','El Carmen ',NULL,NULL),(793,46,23,'54250','El Tarra ',NULL,NULL),(794,46,23,'54261','El Zulia ',NULL,NULL),(795,46,23,'54313','Gramalote',NULL,NULL),(796,46,23,'54344','Hacarí',NULL,NULL),(797,46,23,'54347','Herrán',NULL,NULL),(798,46,23,'54377','Labateca',NULL,NULL),(799,46,23,'54385','La Esperanza ',NULL,NULL),(800,46,23,'54398','La Playa ',NULL,NULL),(801,46,23,'54405','Los Patios ',NULL,NULL),(802,46,23,'54418','Lourdes',NULL,NULL),(803,46,23,'54480','Mutiscua',NULL,NULL),(804,46,23,'54498','Ocaña',NULL,NULL),(805,46,23,'54518','Pamplona',NULL,NULL),(806,46,23,'54520','Pamplonita',NULL,NULL),(807,46,23,'54553','Puerto Santander ',NULL,NULL),(808,46,23,'54599','Ragonvalia',NULL,NULL),(809,46,23,'54660','Salazar',NULL,NULL),(810,46,23,'54670','San Calixto ',NULL,NULL),(811,46,23,'54673','San Cayetano ',NULL,NULL),(812,46,23,'54680','Santiago',NULL,NULL),(813,46,23,'54720','Sardinata',NULL,NULL),(814,46,23,'54743','Silos',NULL,NULL),(815,46,23,'54800','Teorama',NULL,NULL),(816,46,23,'54810','Tibú',NULL,NULL),(817,46,23,'54820','Toledo',NULL,NULL),(818,46,23,'54871','Villa Caro ',NULL,NULL),(819,46,23,'54874','Villa Del Rosario',NULL,NULL),(820,46,25,'63001','Armenia',NULL,NULL),(821,46,25,'63111','Buenavista',NULL,NULL),(822,46,25,'63130','Calarcá',NULL,NULL),(823,46,25,'63190','Circasia',NULL,NULL),(824,46,25,'63212','Córdoba',NULL,NULL),(825,46,25,'63272','Filandia',NULL,NULL),(826,46,25,'63302','Génova',NULL,NULL),(827,46,25,'63401','La Tebaida ',NULL,NULL),(828,46,25,'63470','Montenegro',NULL,NULL),(829,46,25,'63548','Pijao',NULL,NULL),(830,46,25,'63594','Quimbaya',NULL,NULL),(831,46,25,'63690','Salento',NULL,NULL),(832,46,26,'66001','Pereira',NULL,NULL),(833,46,26,'66045','Apía',NULL,NULL),(834,46,26,'66075','Balboa',NULL,NULL),(835,46,26,'66088','Belén De Umbría',NULL,NULL),(836,46,26,'66170','Dosquebradas',NULL,NULL),(837,46,26,'66318','Guática',NULL,NULL),(838,46,26,'66383','La Celia ',NULL,NULL),(839,46,26,'66400','La Virginia ',NULL,NULL),(840,46,26,'66440','Marsella',NULL,NULL),(841,46,26,'66456','Mistrató',NULL,NULL),(842,46,26,'66572','Pueblo Rico ',NULL,NULL),(843,46,26,'66594','Quinchía',NULL,NULL),(844,46,26,'66682','Santa Rosa De Cabal',NULL,NULL),(845,46,26,'66687','Santuario',NULL,NULL),(846,46,28,'68001','Bucaramanga',NULL,NULL),(847,46,28,'68013','Aguada',NULL,NULL),(848,46,28,'68020','Albania',NULL,NULL),(849,46,28,'68051','Aratoca',NULL,NULL),(850,46,28,'68077','Barbosa',NULL,NULL),(851,46,28,'68079','Barichara',NULL,NULL),(852,46,28,'68081','Barrancabermeja',NULL,NULL),(853,46,28,'68092','Betulia',NULL,NULL),(854,46,28,'68101','Bolívar',NULL,NULL),(855,46,28,'68121','Cabrera',NULL,NULL),(856,46,28,'68132','California',NULL,NULL),(857,46,28,'68147','Capitanejo',NULL,NULL),(858,46,28,'68152','Carcasí',NULL,NULL),(859,46,28,'68160','Cepitá',NULL,NULL),(860,46,28,'68162','Cerrito',NULL,NULL),(861,46,28,'68167','Charalá',NULL,NULL),(862,46,28,'68169','Charta',NULL,NULL),(863,46,28,'68176','Chima',NULL,NULL),(864,46,28,'68179','Chipatá',NULL,NULL),(865,46,28,'68190','Cimitarra',NULL,NULL),(866,46,28,'68207','Concepción',NULL,NULL),(867,46,28,'68209','Confines',NULL,NULL),(868,46,28,'68211','Contratación',NULL,NULL),(869,46,28,'68217','Coromoro',NULL,NULL),(870,46,28,'68229','Curití',NULL,NULL),(871,46,28,'68235','El Carmen De Chucurí',NULL,NULL),(872,46,28,'68245','El Guacamayo ',NULL,NULL),(873,46,28,'68250','El Peñón ',NULL,NULL),(874,46,28,'68255','El Playón ',NULL,NULL),(875,46,28,'68264','Encino',NULL,NULL),(876,46,28,'68266','Enciso',NULL,NULL),(877,46,28,'68271','Florián',NULL,NULL),(878,46,28,'68276','Floridablanca',NULL,NULL),(879,46,28,'68296','Galán',NULL,NULL),(880,46,28,'68298','Gámbita',NULL,NULL),(881,46,28,'68307','Girón',NULL,NULL),(882,46,28,'68318','Guaca',NULL,NULL),(883,46,28,'68320','Guadalupe',NULL,NULL),(884,46,28,'68322','Guapotá',NULL,NULL),(885,46,28,'68324','Guavatá',NULL,NULL),(886,46,28,'68327','Güepsa',NULL,NULL),(887,46,28,'68344','Hato',NULL,NULL),(888,46,28,'68368','Jesús María ',NULL,NULL),(889,46,28,'68370','Jordán',NULL,NULL),(890,46,28,'68377','La Belleza ',NULL,NULL),(891,46,28,'68385','Landázuri',NULL,NULL),(892,46,28,'68397','La Paz ',NULL,NULL),(893,46,28,'68406','Lebrija',NULL,NULL),(894,46,28,'68418','Los Santos ',NULL,NULL),(895,46,28,'68425','Macaravita',NULL,NULL),(896,46,28,'68432','Málaga',NULL,NULL),(897,46,28,'68444','Matanza',NULL,NULL),(898,46,28,'68464','Mogotes',NULL,NULL),(899,46,28,'68468','Molagavita',NULL,NULL),(900,46,28,'68498','Ocamonte',NULL,NULL),(901,46,28,'68500','Oiba',NULL,NULL),(902,46,28,'68502','Onzaga',NULL,NULL),(903,46,28,'68522','Palmar',NULL,NULL),(904,46,28,'68524','Palmas Del Socorro',NULL,NULL),(905,46,28,'68533','Páramo',NULL,NULL),(906,46,28,'68547','Piedecuesta',NULL,NULL),(907,46,28,'68549','Pinchote',NULL,NULL),(908,46,28,'68572','Puente Nacional ',NULL,NULL),(909,46,28,'68573','Puerto Parra ',NULL,NULL),(910,46,28,'68575','Puerto Wilches ',NULL,NULL),(911,46,28,'68615','Rionegro',NULL,NULL),(912,46,28,'68655','Sabana De Torres',NULL,NULL),(913,46,28,'68669','San Andrés ',NULL,NULL),(914,46,28,'68673','San Benito ',NULL,NULL),(915,46,28,'68679','San Gil ',NULL,NULL),(916,46,28,'68682','San Joaquín ',NULL,NULL),(917,46,28,'68684','San José De Miranda',NULL,NULL),(918,46,28,'68686','San Miguel ',NULL,NULL),(919,46,28,'68689','San Vicente De Chucurí',NULL,NULL),(920,46,28,'68705','Santa Bárbara ',NULL,NULL),(921,46,28,'68720','Santa Helena Del Opón',NULL,NULL),(922,46,28,'68745','Simacota',NULL,NULL),(923,46,28,'68755','Socorro',NULL,NULL),(924,46,28,'68770','Suaita',NULL,NULL),(925,46,28,'68773','Sucre',NULL,NULL),(926,46,28,'68780','Suratá',NULL,NULL),(927,46,28,'68820','Tona',NULL,NULL),(928,46,28,'68855','Valle De San José',NULL,NULL),(929,46,28,'68861','Vélez',NULL,NULL),(930,46,28,'68867','Vetas',NULL,NULL),(931,46,28,'68872','Villanueva',NULL,NULL),(932,46,28,'68895','Zapatoca',NULL,NULL),(933,46,29,'70001','Sincelejo',NULL,NULL),(934,46,29,'70110','Buenavista',NULL,NULL),(935,46,29,'70124','Caimito',NULL,NULL),(936,46,29,'70204','Colosó',NULL,NULL),(937,46,29,'70215','Corozal',NULL,NULL),(938,46,29,'70221','Coveñas',NULL,NULL),(939,46,29,'70230','Chalán',NULL,NULL),(940,46,29,'70233','El Roble ',NULL,NULL),(941,46,29,'70235','Galeras',NULL,NULL),(942,46,29,'70265','Guaranda',NULL,NULL),(943,46,29,'70400','La Unión ',NULL,NULL),(944,46,29,'70418','Los Palmitos ',NULL,NULL),(945,46,29,'70429','Majagual',NULL,NULL),(946,46,29,'70473','Morroa',NULL,NULL),(947,46,29,'70508','Ovejas',NULL,NULL),(948,46,29,'70523','Palmito',NULL,NULL),(949,46,29,'70670','Sampués',NULL,NULL),(950,46,29,'70678','San Benito Abad',NULL,NULL),(951,46,29,'70702','San Juan De Betulia',NULL,NULL),(952,46,29,'70708','San Marcos ',NULL,NULL),(953,46,29,'70713','San Onofre ',NULL,NULL),(954,46,29,'70717','San Pedro ',NULL,NULL),(955,46,29,'70742','San Luis De Sincé',NULL,NULL),(956,46,29,'70771','Sucre',NULL,NULL),(957,46,29,'70820','Santiago De Tolú',NULL,NULL),(958,46,29,'70823','Tolú Viejo ',NULL,NULL),(959,46,30,'73001','Ibagué',NULL,NULL),(960,46,30,'73024','Alpujarra',NULL,NULL),(961,46,30,'73026','Alvarado',NULL,NULL),(962,46,30,'73030','Ambalema',NULL,NULL),(963,46,30,'73043','Anzoátegui',NULL,NULL),(964,46,30,'73055','Armero',NULL,NULL),(965,46,30,'73067','Ataco',NULL,NULL),(966,46,30,'73124','Cajamarca',NULL,NULL),(967,46,30,'73148','Carmen De Apicalá',NULL,NULL),(968,46,30,'73152','Casabianca',NULL,NULL),(969,46,30,'73168','Chaparral',NULL,NULL),(970,46,30,'73200','Coello',NULL,NULL),(971,46,30,'73217','Coyaima',NULL,NULL),(972,46,30,'73226','Cunday',NULL,NULL),(973,46,30,'73236','Dolores',NULL,NULL),(974,46,30,'73268','Espinal',NULL,NULL),(975,46,30,'73270','Falan',NULL,NULL),(976,46,30,'73275','Flandes',NULL,NULL),(977,46,30,'73283','Fresno',NULL,NULL),(978,46,30,'73319','Guamo',NULL,NULL),(979,46,30,'73347','Herveo',NULL,NULL),(980,46,30,'73349','Honda',NULL,NULL),(981,46,30,'73352','Icononzo',NULL,NULL),(982,46,30,'73408','Lérida',NULL,NULL),(983,46,30,'73411','Líbano',NULL,NULL),(984,46,30,'73443','San Sebastián De Mariquita',NULL,NULL),(985,46,30,'73449','Melgar',NULL,NULL),(986,46,30,'73461','Murillo',NULL,NULL),(987,46,30,'73483','Natagaima',NULL,NULL),(988,46,30,'73504','Ortega',NULL,NULL),(989,46,30,'73520','Palocabildo',NULL,NULL),(990,46,30,'73547','Piedras',NULL,NULL),(991,46,30,'73555','Planadas',NULL,NULL),(992,46,30,'73563','Prado',NULL,NULL),(993,46,30,'73585','Purificación',NULL,NULL),(994,46,30,'73616','Rioblanco',NULL,NULL),(995,46,30,'73622','Roncesvalles',NULL,NULL),(996,46,30,'73624','Rovira',NULL,NULL),(997,46,30,'73671','Saldaña',NULL,NULL),(998,46,30,'73675','San Antonio ',NULL,NULL),(999,46,30,'73678','San Luis ',NULL,NULL),(1000,46,30,'73686','Santa Isabel ',NULL,NULL),(1001,46,30,'73770','Suárez',NULL,NULL),(1002,46,30,'73854','Valle De San Juan',NULL,NULL),(1003,46,30,'73861','Venadillo',NULL,NULL),(1004,46,30,'73870','Villahermosa',NULL,NULL),(1005,46,30,'73873','Villarrica',NULL,NULL),(1006,46,31,'76001','Cali',NULL,NULL),(1007,46,31,'76020','Alcalá',NULL,NULL),(1008,46,31,'76036','Andalucía',NULL,NULL),(1009,46,31,'76041','Ansermanuevo',NULL,NULL),(1010,46,31,'76054','Argelia',NULL,NULL),(1011,46,31,'76100','Bolívar',NULL,NULL),(1012,46,31,'76109','Buenaventura',NULL,NULL),(1013,46,31,'76111','Guadalajara De Buga',NULL,NULL),(1014,46,31,'76113','Bugalagrande',NULL,NULL),(1015,46,31,'76122','Caicedonia',NULL,NULL),(1016,46,31,'76126','Calima',NULL,NULL),(1017,46,31,'76130','Candelaria',NULL,NULL),(1018,46,31,'76147','Cartago',NULL,NULL),(1019,46,31,'76233','Dagua',NULL,NULL),(1020,46,31,'76243','El Águila ',NULL,NULL),(1021,46,31,'76246','El Cairo ',NULL,NULL),(1022,46,31,'76248','El Cerrito ',NULL,NULL),(1023,46,31,'76250','El Dovio ',NULL,NULL),(1024,46,31,'76275','Florida',NULL,NULL),(1025,46,31,'76306','Ginebra',NULL,NULL),(1026,46,31,'76318','Guacarí',NULL,NULL),(1027,46,31,'76364','Jamundí',NULL,NULL),(1028,46,31,'76377','La Cumbre ',NULL,NULL),(1029,46,31,'76400','La Unión ',NULL,NULL),(1030,46,31,'76403','La Victoria ',NULL,NULL),(1031,46,31,'76497','Obando',NULL,NULL),(1032,46,31,'76520','Palmira',NULL,NULL),(1033,46,31,'76563','Pradera',NULL,NULL),(1034,46,31,'76606','Restrepo',NULL,NULL),(1035,46,31,'76616','Riofrío',NULL,NULL),(1036,46,31,'76622','Roldanillo',NULL,NULL),(1037,46,31,'76670','San Pedro ',NULL,NULL),(1038,46,31,'76736','Sevilla',NULL,NULL),(1039,46,31,'76823','Toro',NULL,NULL),(1040,46,31,'76828','Trujillo',NULL,NULL),(1041,46,31,'76834','Tuluá',NULL,NULL),(1042,46,31,'76845','Ulloa',NULL,NULL),(1043,46,31,'76863','Versalles',NULL,NULL),(1044,46,31,'76869','Vijes',NULL,NULL),(1045,46,31,'76890','Yotoco',NULL,NULL),(1046,46,31,'76892','Yumbo',NULL,NULL),(1047,46,31,'76895','Zarzal',NULL,NULL),(1048,46,3,'81001','Arauca',NULL,NULL),(1049,46,3,'81065','Arauquita',NULL,NULL),(1050,46,3,'81220','Cravo Norte ',NULL,NULL),(1051,46,3,'81300','Fortul',NULL,NULL),(1052,46,3,'81591','Puerto Rondón ',NULL,NULL),(1053,46,3,'81736','Saravena',NULL,NULL),(1054,46,3,'81794','Tame',NULL,NULL),(1055,46,10,'85001','Yopal',NULL,NULL),(1056,46,10,'85010','Aguazul',NULL,NULL),(1057,46,10,'85015','Chámeza',NULL,NULL),(1058,46,10,'85125','Hato Corozal ',NULL,NULL),(1059,46,10,'85136','La Salina ',NULL,NULL),(1060,46,10,'85139','Maní',NULL,NULL),(1061,46,10,'85162','Monterrey',NULL,NULL),(1062,46,10,'85225','Nunchía',NULL,NULL),(1063,46,10,'85230','Orocué',NULL,NULL),(1064,46,10,'85250','Paz De Ariporo',NULL,NULL),(1065,46,10,'85263','Pore',NULL,NULL),(1066,46,10,'85279','Recetor',NULL,NULL),(1067,46,10,'85300','Sabanalarga',NULL,NULL),(1068,46,10,'85315','Sácama',NULL,NULL),(1069,46,10,'85325','San Luis De Palenque',NULL,NULL),(1070,46,10,'85400','Támara',NULL,NULL),(1071,46,10,'85410','Tauramena',NULL,NULL),(1072,46,10,'85430','Trinidad',NULL,NULL),(1073,46,10,'85440','Villanueva',NULL,NULL),(1074,46,24,'86001','Mocoa',NULL,NULL),(1075,46,24,'86219','Colón',NULL,NULL),(1076,46,24,'86320','Orito',NULL,NULL),(1077,46,24,'86568','Puerto Asís ',NULL,NULL),(1078,46,24,'86569','Puerto Caicedo ',NULL,NULL),(1079,46,24,'86571','Puerto Guzmán ',NULL,NULL),(1080,46,24,'86573','Puerto Leguízamo ',NULL,NULL),(1081,46,24,'86749','Sibundoy',NULL,NULL),(1082,46,24,'86755','San Francisco ',NULL,NULL),(1083,46,24,'86757','San Miguel ',NULL,NULL),(1084,46,24,'86760','Santiago',NULL,NULL),(1085,46,24,'86865','Valle Del Guamuez',NULL,NULL),(1086,46,24,'86885','Villagarzón',NULL,NULL),(1087,46,27,'88001','San Andrés ',NULL,NULL),(1088,46,27,'88564','Providencia',NULL,NULL),(1089,46,1,'91001','Leticia',NULL,NULL),(1090,46,1,'91263','El Encanto ',NULL,NULL),(1091,46,1,'91405','La Chorrera ',NULL,NULL),(1092,46,1,'91407','La Pedrera ',NULL,NULL),(1093,46,1,'91430','La Victoria ',NULL,NULL),(1094,46,1,'91460','Mirití - Paraná',NULL,NULL),(1095,46,1,'91530','Puerto Alegría ',NULL,NULL),(1096,46,1,'91536','Puerto Arica ',NULL,NULL),(1097,46,1,'91540','Puerto Nariño ',NULL,NULL),(1098,46,1,'91669','Puerto Santander ',NULL,NULL),(1099,46,1,'91798','Tarapacá',NULL,NULL),(1100,46,16,'94001','Inírida',NULL,NULL),(1101,46,16,'94343','Barranco Minas ',NULL,NULL),(1102,46,16,'94663','Mapiripana',NULL,NULL),(1103,46,16,'94883','San Felipe ',NULL,NULL),(1104,46,16,'94884','Puerto Colombia ',NULL,NULL),(1105,46,16,'94885','La Guadalupe ',NULL,NULL),(1106,46,16,'94886','Cacahual',NULL,NULL),(1107,46,16,'94887','Pana Pana ',NULL,NULL),(1108,46,16,'94888','Morichal',NULL,NULL),(1109,46,17,'95001','San José Del Guaviare',NULL,NULL),(1110,46,17,'95015','Calamar',NULL,NULL),(1111,46,17,'95025','El Retorno ',NULL,NULL),(1112,46,17,'95200','Miraflores',NULL,NULL),(1113,46,32,'97001','Mitú',NULL,NULL),(1114,46,32,'97161','Carurú',NULL,NULL),(1115,46,32,'97511','Pacoa',NULL,NULL),(1116,46,32,'97666','Taraira',NULL,NULL),(1117,46,32,'97777','Papunahua',NULL,NULL),(1118,46,32,'97889','Yavaraté',NULL,NULL),(1119,46,33,'99001','Puerto Carreño ',NULL,NULL),(1120,46,33,'99524','La Primavera ',NULL,NULL),(1121,46,33,'99624','Santa Rosalía ',NULL,NULL),(1122,46,33,'99773','Cumaribo',NULL,NULL);
/*!40000 ALTER TABLE `municipalities` ENABLE KEYS */;
UNLOCK TABLES;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2026-10-13 17:58:44
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
