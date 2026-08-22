-- MariaDB dump 10.19  Distrib 10.4.32-MariaDB, for Win64 (AMD64)
--
-- Host: localhost    Database: conta_template
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
-- Dumping data for table `countries`
--

LOCK TABLES `countries` WRITE;
/*!40000 ALTER TABLE `countries` DISABLE KEYS */;
INSERT INTO `countries` VALUES (31,'BR','Brasil','BRA',NULL,NULL),(46,'CO','Colombia','COL',NULL,NULL),(65,'US','Estados Unidos','USA',NULL,NULL);
/*!40000 ALTER TABLE `countries` ENABLE KEYS */;
UNLOCK TABLES;

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
-- Dumping data for table `departments`
--

LOCK TABLES `departments` WRITE;
/*!40000 ALTER TABLE `departments` DISABLE KEYS */;
INSERT INTO `departments` VALUES (1,46,'91','Amazonas',NULL,NULL),(2,46,'05','Antioquia',NULL,NULL),(3,46,'81','Arauca',NULL,NULL),(4,46,'08','Atlántico',NULL,NULL),(5,46,'11','Bogotá',NULL,NULL),(6,46,'13','Bolívar',NULL,NULL),(7,46,'15','Boyacá',NULL,NULL),(8,46,'17','Caldas',NULL,NULL),(9,46,'18','Caquetá',NULL,NULL),(10,46,'85','Casanare',NULL,NULL),(11,46,'19','Cauca',NULL,NULL),(12,46,'20','Cesar',NULL,NULL),(13,46,'27','Chocó',NULL,NULL),(14,46,'23','Córdoba',NULL,NULL),(15,46,'25','Cundinamarca',NULL,NULL),(16,46,'94','Guainía',NULL,NULL),(17,46,'95','Guaviare',NULL,NULL),(18,46,'41','Huila',NULL,NULL),(19,46,'44','La Guajira',NULL,NULL),(20,46,'47','Magdalena',NULL,NULL),(21,46,'50','Meta',NULL,NULL),(22,46,'52','Nariño',NULL,NULL),(23,46,'54','Norte de Santander',NULL,NULL),(24,46,'86','Putumayo',NULL,NULL),(25,46,'63','Quindío',NULL,NULL),(26,46,'66','Risaralda',NULL,NULL),(27,46,'88','San Andrés y Providencia',NULL,NULL),(28,46,'68','Santander',NULL,NULL),(29,46,'70','Sucre',NULL,NULL),(30,46,'73','Tolima',NULL,NULL),(31,46,'76','Valle del Cauca',NULL,NULL),(32,46,'97','Vaupés',NULL,NULL),(33,46,'99','Vichada',NULL,NULL);
/*!40000 ALTER TABLE `departments` ENABLE KEYS */;
UNLOCK TABLES;

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
-- Dumping data for table `detalle_cotizacion`
--

LOCK TABLES `detalle_cotizacion` WRITE;
/*!40000 ALTER TABLE `detalle_cotizacion` DISABLE KEYS */;
INSERT INTO `detalle_cotizacion` VALUES (29,5,1,1000,0,3),(30,4,1,1000,0,3);
/*!40000 ALTER TABLE `detalle_cotizacion` ENABLE KEYS */;
UNLOCK TABLES;

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
  PRIMARY KEY (`id_detalle_document`),
  KEY `factura_n` (`factura_n`),
  KEY `items` (`items`),
  KEY `unit_measure_id` (`unit_measure_id`),
  KEY `type_item_identification_id` (`type_item_identification_id`),
  CONSTRAINT `detalle_document_electronic_ibfk_1` FOREIGN KEY (`items`) REFERENCES `tblarticulos` (`Items`),
  CONSTRAINT `detalle_document_electronic_ibfk_2` FOREIGN KEY (`unit_measure_id`) REFERENCES `unit_measures` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `detalle_document_electronic`
--

LOCK TABLES `detalle_document_electronic` WRITE;
/*!40000 ALTER TABLE `detalle_document_electronic` DISABLE KEYS */;
/*!40000 ALTER TABLE `detalle_document_electronic` ENABLE KEYS */;
UNLOCK TABLES;

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
-- Dumping data for table `detalle_fact_abietas`
--

LOCK TABLES `detalle_fact_abietas` WRITE;
/*!40000 ALTER TABLE `detalle_fact_abietas` DISABLE KEYS */;
/*!40000 ALTER TABLE `detalle_fact_abietas` ENABLE KEYS */;
UNLOCK TABLES;

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
-- Dumping data for table `detalle_factura_recibida`
--

LOCK TABLES `detalle_factura_recibida` WRITE;
/*!40000 ALTER TABLE `detalle_factura_recibida` DISABLE KEYS */;
INSERT INTO `detalle_factura_recibida` VALUES (1,1,1,'0002','Servicio de prueba','94',1.000,1200.00,0.00,0.00,0.00,1200.00,1200.00);
/*!40000 ALTER TABLE `detalle_factura_recibida` ENABLE KEYS */;
UNLOCK TABLES;

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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `electronic_documents`
--

LOCK TABLES `electronic_documents` WRITE;
/*!40000 ALTER TABLE `electronic_documents` DISABLE KEYS */;
/*!40000 ALTER TABLE `electronic_documents` ENABLE KEYS */;
UNLOCK TABLES;

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
-- Dumping data for table `eventos_factura_recibida`
--

LOCK TABLES `eventos_factura_recibida` WRITE;
/*!40000 ALTER TABLE `eventos_factura_recibida` DISABLE KEYS */;
INSERT INTO `eventos_factura_recibida` VALUES (5,1,'030','Acuse de recibo de Factura Electrónica de Venta','e7e949cd328cb65577ffa8fa24d8e7975421b681c23c5cfde510669ed21ce0a10407cb6525c7c751e5ab2ba0992b5dab',1,'00','La Application response 1, ha sido autorizada.',NULL,NULL,NULL,'{\"success\":true,\"message\":\"Evento 030 (Acuse de recibo de Factura Electr\\u00f3nica de Venta) registrado en DIAN.\",\"event_id\":1,\"cude_evento\":\"e7e949cd328cb65577ffa8fa24d8e7975421b681c23c5cfde510669ed21ce0a10407cb6525c7c751e5ab2ba0992b5dab\",\"event_code\":\"030\",\"invoice_cufe\":\"239ab7bdca3fc15e7157eeeb5ec1de20d3ae1a07dca77ddb15438e72f5edd1952a884e90c4e45f57c303095d11874b56\",\"dian_status\":\"00\",\"dian_message\":\"La Application response 1, ha sido autorizada.\",\"response_dian\":{\"Envelope\":{\"Header\":{\"Action\":{\"_attributes\":{\"mustUnderstand\":\"1\"},\"_value\":\"http:\\/\\/wcf.dian.colombia\\/IWcfDianCustomerServices\\/SendEventUpdateStatusResponse\"},\"Security\":{\"_attributes\":{\"mustUnderstand\":\"1\"},\"Timestamp\":{\"_attributes\":{\"Id\":\"_0\"},\"Created\":\"2026-07-06T21:54:31.940Z\",\"Expires\":\"2026-07-06T21:59:31.940Z\"}}},\"Body\":{\"SendEventUpdateStatusResponse\":{\"SendEventUpdateStatusResult\":{\"ErrorMessage\":{},\"IsValid\":\"true\",\"StatusCode\":\"00\",\"StatusDescription\":\"Procesado Correctamente.\",\"StatusMessage\":\"La Application response 1, ha sido autorizada.\",\"XmlBase64Bytes\":\"PD94bWwgdmVyc2lvbj0iMS4wIiBlbmNvZGluZz0idXRmLTgiIHN0YW5kYWxvbmU9Im5vIj8+PEFwcGxpY2F0aW9uUmVzcG9uc2UgeG1sbnM6Y2FjPSJ1cm46b2FzaXM6bmFtZXM6c3BlY2lmaWNhdGlvbjp1Ymw6c2NoZW1hOnhzZDpDb21tb25BZ2dyZWdhdGVDb21wb25lbnRzLTIiIHhtbG5zOmNiYz0idXJuOm9hc2lzOm5hbWVzOnNwZWNpZmljYXRpb246dWJsOnNjaGVtYTp4c2Q6Q29tbW9uQmFzaWNDb21wb25lbnRzLTIiIHhtbG5zOmV4dD0idXJuOm9hc2lzOm5hbWVzOnNwZWNpZmljYXRpb246dWJsOnNjaGVtYTp4c2Q6Q29tbW9uRXh0ZW5zaW9uQ29tcG9uZW50cy0yIiB4bWxuczpzdHM9ImRpYW46Z292OmNvOmZhY3R1cmFlbGVjdHJvbmljYTpTdHJ1Y3R1cmVzLTItMSIgeG1sbnM6ZHM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvMDkveG1sZHNpZyMiIHhtbG5zPSJ1cm46b2FzaXM6bmFtZXM6c3BlY2lmaWNhdGlvbjp1Ymw6c2NoZW1hOnhzZDpBcHBsaWNhdGlvblJlc3BvbnNlLTIiPg0KICA8ZXh0OlVCTEV4dGVuc2lvbnM+DQogICAgPGV4dDpVQkxFeHRlbnNpb24+DQogICAgICA8ZXh0OkV4dGVuc2lvbkNvbnRlbnQ+DQogICAgICAgIDxzdHM6RGlhbkV4dGVuc2lvbnM+DQogICAgICAgICAgPHN0czpJbnZvaWNlU291cmNlPg0KICAgICAgICAgICAgPGNiYzpJZGVudGlmaWNhdGlvbkNvZGUgbGlzdEFnZW5jeUlEPSI2IiBsaXN0QWdlbmN5TmFtZT0iVW5pdGVkIE5hdGlvbnMgRWNvbm9taWMgQ29tbWlzc2lvbiBmb3IgRXVyb3BlIiBsaXN0U2NoZW1lVVJJPSJ1cm46b2FzaXM6bmFtZXM6c3BlY2lmaWNhdGlvbjp1Ymw6Y29kZWxpc3Q6Z2M6Q291bnRyeUlkZW50aWZpY2F0aW9uQ29kZS0yLjEiPkNPPC9jYmM6SWRlbnRpZmljYXRpb25Db2RlPg0KICAgICAgICAgIDwvc3RzOkludm9pY2VTb3VyY2U+DQogICAgICAgICAgPHN0czpTb2Z0d2FyZVByb3ZpZGVyPg0KICAgICAgICAgICAgPHN0czpQcm92aWRlcklEIHNjaGVtZUlEPSI0IiBzY2hlbWVOYW1lPSIzMSIgc2NoZW1lQWdlbmN5SUQ9IjE5NSIgc2NoZW1lQWdlbmN5TmFtZT0iQ08sIERJQU4gKERpcmVjY2nDs24gZGUgSW1wdWVzdG9zIHkgQWR1YW5hcyBOYWNpb25hbGVzKSI+ODAwMTk3MjY4PC9zdHM6UHJvdmlkZXJJRD4NCiAgICAgICAgICAgIDxzdHM6U29mdHdhcmVJRCBzY2hlbWVBZ2VuY3lJRD0iMTk1IiBzY2hlbWVBZ2VuY3lOYW1lPSJDTywgRElBTiAoRGlyZWNjacOzbiBkZSBJbXB1ZXN0b3MgeSBBZHVhbmFzIE5hY2lvbmFsZXMpIj4uLi48L3N0czpTb2Z0d2FyZUlEPg0KICAgICAgICAgIDwvc3RzOlNvZnR3YXJlUHJvdmlkZXI+DQogICAgICAgICAgPHN0czpTb2Z0d2FyZVNlY3VyaXR5Q29kZSBzY2hlbWVBZ2VuY3lJRD0iMTk1IiBzY2hlbWVBZ2VuY3lOYW1lPSJDTywgRElBTiAoRGlyZWNjacOzbiBkZSBJbXB1ZXN0b3MgeSBBZHVhbmFzIE5hY2lvbmFsZXMpIj4uLi48L3N0czpTb2Z0d2FyZVNlY3VyaXR5Q29kZT4NCiAgICAgICAgICA8c3RzOkF1dGhvcml6YXRpb25Qcm92aWRlcj4NCiAgICAgICAgICAgIDxzdHM6QXV0aG9yaXphdGlvblByb3ZpZGVySUQgc2NoZW1lSUQ9IjQiIHNjaGVtZU5hbWU9IjMxIiBzY2hlbWVBZ2VuY3lJRD0iMTk1IiBzY2hlbWVBZ2VuY3lOYW1lPSJDTywgRElBTiAoRGlyZWNjacOzbiBkZSBJbXB1ZXN0b3MgeSBBZHVhbmFzIE5hY2lvbmFsZXMpIj44MDAxOTcyNjg8L3N0czpBdXRob3JpemF0aW9uUHJvdmlkZXJJRD4NCiAgICAgICAgICA8L3N0czpBdXRob3JpemF0aW9uUHJvdmlkZXI+DQogICAgICAgIDwvc3RzOkRpYW5FeHRlbnNpb25zPg0KICAgICAgPC9leHQ6RXh0ZW5zaW9uQ29udGVudD4NCiAgICA8L2V4dDpVQkxFeHRlbnNpb24+DQogICAgPGV4dDpVQkxFeHRlbnNpb24+DQogICAgICA8ZXh0OkV4dGVuc2lvbkNvbnRlbnQ+PGRzOlNpZ25hdHVyZSB4bWxuczpkcz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC8wOS94bWxkc2lnIyIgSWQ9IlNpZ25hdHVyZS0yNGE3NmJjYy05OTNiLTQ0ZDMtOGFlYS1jNTdmM2ZhNDI4YTYiPjxkczpTaWduZWRJbmZvPjxkczpDYW5vbmljYWxpemF0aW9uTWV0aG9kIEFsZ29yaXRobT0iaHR0cDovL3d3dy53My5vcmcvVFIvMjAwMS9SRUMteG1sLWMxNG4tMjAwMTAzMTUiIC8+PGRzOlNpZ25hdHVyZU1ldGhvZCBBbGdvcml0aG09Imh0dHA6Ly93d3cudzMub3JnLzIwMDEvMDQveG1sZHNpZy1tb3JlI3JzYS1zaGEyNTYiIC8+PGRzOlJlZmVyZW5jZSBJZD0iUmVmZXJlbmNlLTcxZjI5N2UyLWM3MjAtNDVjMC05ZTNmLTBkNmU2MjRiMDVhNiIgVVJJPSIiPjxkczpUcmFuc2Zvcm1zPjxkczpUcmFuc2Zvcm0gQWxnb3JpdGhtPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwLzA5L3htbGRzaWcjZW52ZWxvcGVkLXNpZ25hdHVyZSIgLz48L2RzOlRyYW5zZm9ybXM+PGRzOkRpZ2VzdE1ldGhvZCBBbGdvcml0aG09Imh0dHA6Ly93d3cudzMub3JnLzIwMDEvMDQveG1sZW5jI3NoYTI1NiIgLz48ZHM6RGlnZXN0VmFsdWU+ZExPcWZBWGplTW1tSUlRb0YxODc3cmMzVWlXL2RUVmsvN2JHUTBsTEtiRT08L2RzOkRpZ2VzdFZhbHVlPjwvZHM6UmVmZXJlbmNlPjxkczpSZWZlcmVuY2UgSWQ9IlJlZmVyZW5jZUtleUluZm8iIFVSST0iI1NpZ25hdHVyZS0yNGE3NmJjYy05OTNiLTQ0ZDMtOGFlYS1jNTdmM2ZhNDI4YTYtS2V5SW5mbyI+PGRzOkRpZ2VzdE1ldGhvZCBBbGdvcml0aG09Imh0dHA6Ly93d3cudzMub3JnLzIwMDEvMDQveG1sZW5jI3NoYTI1NiIgLz48ZHM6RGlnZXN0VmFsdWU+WWRsRzBMeEFpZ3N2Qmcxc3ZoWENKcHQyY2lvVU0wNTlOc3k4VDlWUTBvQT08L2RzOkRpZ2VzdFZhbHVlPjwvZHM6UmVmZXJlbmNlPjxkczpSZWZlcmVuY2UgVHlwZT0iaHR0cDovL3VyaS5ldHNpLm9yZy8wMTkwMyNTaWduZWRQcm9wZXJ0aWVzIiBVUkk9IiN4bWxkc2lnLVNpZ25hdHVyZS0yNGE3NmJjYy05OTNiLTQ0ZDMtOGFlYS1jNTdmM2ZhNDI4YTYtc2lnbmVkcHJvcHMiPjxkczpEaWdlc3RNZXRob2QgQWxnb3JpdGhtPSJodHRwOi8vd3d3LnczLm9yZy8yMDAxLzA0L3htbGVuYyNzaGEyNTYiIC8+PGRzOkRpZ2VzdFZhbHVlPmlsSERxc08xMFh3ekhLcm51RkRPd1dpeHZzY1JhR0o1Vjg1bTlWeVRDVm89PC9kczpEaWdlc3RWYWx1ZT48L2RzOlJlZmVyZW5jZT48L2RzOlNpZ25lZEluZm8+PGRzOlNpZ25hdHVyZVZhbHVlIElkPSJTaWduYXR1cmVWYWx1ZS0yNGE3NmJjYy05OTNiLTQ0ZDMtOGFlYS1jNTdmM2ZhNDI4YTYiPmR5ZnM2MTBQNjlnZEx0L3pZV0FkMlAyZk04V2E0MnBpUDMxek45L3JReFViTUtwa2N0amowWEFnczV1ZGhVeFJmQUJiSkNYVjFKaDl0ZTdKSysrNG51SUVRL0xpQ2J3ZjUzK015UWRwYjFMZ2Vmd2crelMwUW1hYkZnVWJxUU02clhMWkxibnBTYWxKcWhsM29oK2tvOEhkaktQOWRyeHZFaEJDOXo1aUxyN2pUZzFWUkJOSTBJVmxUWjR3TEc1Vkh2ZmxNL2E4NUUvUSs1bFMzM3NJUzM5SVZGZ0N3dVQxSU10dDhvcFJiSDRjam5wYklmRlIySllCSU1WYm5POEkzREhWaU1xbGg2ZG1oYXowUkxHc0duMkZJSDJKQnBGbG5paXpDQmlKRG0yNW5JSUk3WEtvRGYxU052bkhsaFFUMGZxSG1KNHp1RGtpR2NVQ3FiSzBtdz09PC9kczpTaWduYXR1cmVWYWx1ZT48ZHM6S2V5SW5mbyBJZD0iU2lnbmF0dXJlLTI0YTc2YmNjLTk5M2ItNDRkMy04YWVhLWM1N2YzZmE0MjhhNi1LZXlJbmZvIj48ZHM6WDUwOURhdGE+PGRzOlg1MDlDZXJ0aWZpY2F0ZT5NSUlIL0RDQ0JlU2dBd0lCQWdJUVEwTTNPVFV4TkRZME5pMHdNREF3TVRBTkJna3Foa2lHOXcwQkFRc0ZBRENDQVNReEZEQVNCZ05WQkFVTUN6a3dNREF6TWpjM05DMDBNUlF3RWdZRFZRUXREQXM1TURBd016STNOelF0TkRGRE1FRUdBMVVFQ1F3NlUyVmxJR04xY25KbGJuUWdZV1JrY21WemN5QmhkQ0JvZEhSd2N6b3ZMMjFwWTJWeWRHbG1hV05oWkc4dWIyeHBiWEJwWVdsMExtTnZiVEVWTUJNR0ExVUVCd3dNUW05bmIzVERvU0JFTGtNdU1SVXdFd1lEVlFRSURBeENiMmR2ZE1PaElFUXVReTR4Q3pBSkJnTlZCQVlUQWtOUE1TNHdMQVlKS29aSWh2Y05BUWtCREI5elpYSjJhV05wYjJGc1kyeHBaVzUwWlVCdmJHbHRjR2xoYVhRdVkyOXRNUll3RkFZRFZRUUxEQTFQYkdsdGNHbGhTVlFnUlVORU1SSXdFQVlEVlFRS0RBbFBiR2x0Y0dsaFNWUXhHakFZQmdOVkJBTU1FVTlzYVcxd2FXRkpWQ0JGUTBRZ1UzVmlNQjRYRFRJME1USXdNekUzTkRBMU1Gb1hEVEkyTVRJd016RTNNemsxTUZvd2dnRVlNUXN3Q1FZRFZRUUdFd0pEVHpFV01CUUdBMVVFQ0F3TlFrOUhUMVREZ1N3Z1JDNURMakVXTUJRR0ExVUVCd3dOUWs5SFQxVERnUzRnUkM1RExqRTdNRGtHQTFVRUF3d3lWUzVCTGtVdUlFUkpVa1ZEUTBsUFRpQkVSU0JKVFZCVlJWTlVUMU1nV1NCQlJGVkJUa0ZUSUU1QlEwbFBUa0ZNUlZNeEVqQVFCZ05WQkdFTUNUZ3dNREU1TnpJMk9ERWFNQmdHQTFVRUNRd1JRMUlnSUNBM0lDQWdOaUJESUNBZ05UUXhLVEFuQmdrcWhraUc5dzBCQ1FFV0dtTm9ZWEpzWlhOaU1EY3lNREE1UUdodmRHMWhhV3d1WTI5dE1Sa3dGd1lEVlFRTURCQlFaWEp6YjI1aElFcDFjbWxrYVdOaE1SSXdFQVlEVlFRdERBazRNREF4T1RjeU5qZ3hFakFRQmdOVkJBVU1DVGd3TURFNU56STJPRENDQVNJd0RRWUpLb1pJaHZjTkFRRUJCUUFEZ2dFUEFEQ0NBUW9DZ2dFQkFKaHd3ZEk5SklreFQ0dFpBK28zQ2YyS2NISmVKdDBJTkl2ck5TQWZXclFaUFBRNDlLTkVCeklVemFnYVZTeUk2ZnVVczc3T29KWjFRd0YwTTNtbzJpeW9NbTlTcHdHcyt3N3hlbktEZUl0VmJ3VVVoWjZDTm5MUEFZRG5jWEZQMmppMEU2dzFJREMrTk9RRnlEQzdreUtra3JhdVRsUS93YnoyVlArYkE5WEtPTE9YcjJVb1RVYjlNVlM1Q3FVZS9nQXFxWFczNzZ5RlhhdkpZMk93NlB6cGxnMHM5bmJpZHlWM2w2MGpLVHlkaUV5UDJuRGhySTdQakZlVDZOS2U5VHJFQWdmMitES1pMZTNlUWwvRnluc21jc0VaSlAvZDRWZzNBV2hwSjlGL0hhcTRHQ1V3WFg3QVIxNHd2bVl6cGcrY1ByRWM3S3Z1bmtWUUNqWEtRU1VDQXdFQUFhT0NBakF3Z2dJc01COEdBMVVkSXdRWU1CYUFGTzYxdW92RVZiVzNzZmR6OHlCNTgvNnJaNmhlTUIwR0ExVWREZ1FXQkJTSFhaeUhqd3JUZytiYkVudHc2ZHZtTGtUK1VqQUpCZ05WSFJNRUFqQUFNQThHQTFVZER3RUIvd1FGQXdNQTBBQXdnWWdHQTFVZElBU0JnREIrTUh3R0N5c0dBUVFCZzQxS0FnRUNNRzB3YXdZSUt3WUJCUVVIQWdFV1gyaDBkSEJ6T2k4dmJXbGpaWEowYVdacFkyRmtieTV2YkdsdGNHbGhhWFF1WTI5dEwzSmxZM1Z5YzI5ekwyRnlZMmhwZG05ekwyUmxZMnhoY21GamFXOXVaR1Z3Y21GamRHbGpZWE5rWldObGNuUnBabWxqWVdOcGIyNHVjR1JtTUNVR0ExVWRFUVFlTUJ5QkdtTm9ZWEpzWlhOaU1EY3lNREE1UUdodmRHMWhhV3d1WTI5dE1CVUdBMVVkRWdRT01BeUNDakl4TFVWRFJDMHdNREV3UFFZRFZSMGZCRFl3TkRBeW9EQ2dMb1lzYUhSMGNEb3ZMMk55YkM1dmJHbHRjR2xoYVhRdVkyOXRMMjlzYVcxd2FXRnBkR1ZqWkhOMVlpNWpjbXd3Z2NVR0NDc0dBUVVGQndFQkJJRzRNSUcxTURjR0NDc0dBUVVGQnpBQmhpdG9kSFJ3Y3pvdkwyOWpjM0JsWTJRdWIyeHBiWEJwWVdsMExtTnZiVG80TXpjeUwyRndhUzl2WTNOd01Ib0dDQ3NHQVFVRkJ6QUNobTVvZEhSd2N6b3ZMMjFwWTJWeWRHbG1hV05oWkc4dWIyeHBiWEJwWVdsMExtTnZiUzlqYjI1MFpXNTBMM0psWTNWeWMyOXpMMmh2YldVdmFXNXBZMmxoYkM5alpYSjBhV1pwWTJGa2IzTXZVM1ZpYjNKa2FXNWhaR0V2YjJ4cGJYQnBZV2wwWldOa2MzVmlMbU55ZERBTkJna3Foa2lHOXcwQkFRc0ZBQU9DQWdFQVl4SEpESTZNRW9oSVA1Q3kwOGpjazRrbzgzS1JFTUZaZy9Pam50aC9LRWR5WExsejVodVN1MnpIMVUyT0dqMEVOcU9rMVp0clkvY3RaWis4MXRZMCtvVE45WTI5aWdLVHlMQ0thRGFWUkNib2t1dm9NbzBadXNwYXdMbmcyVFZnRmZnYklGUkpCbWdaaFZja29pSDk3amJTY3UzSi9LTWpGZmhWL2ZYRWp5UzczMnozOGR2WTNnWU9uWlZWSW1POGhmR01CcTYyd2x2bEhjS0hhVTFaUlJGRHlxWnBZd3BTcUl5SXhBT0V1ZmhJY0d5LzB1c2gzYnN1VlFEbXZWRU5aSGpjV3NpOVl3L0doNm1makhtMEgxRWJxQ2NBcHVJMXZvMlBwa0wzemJWcDljYjUydXBLUmlYc01hQkFrZ05IRFJFOTFEWlc2Sm9qNDBzY0JkbGdScFFzL0REaTZKbnFacW1yOEYyeXZsb0hGY2hLbENuVnJxMkRNZ2Z2SjBjMHdNd1NpS3RYdUNaZktJL1UraHlBclJvdCt4VXhESGt6THdRRXhrV2xHV3V1K3RKNUFOVGxuK0ZhZFpKZ2U0WjVIQ1NCcExycEVIdll3Ky81bEs3dmh6Tm1PVk5tWWF4R2VheS9FMWNSOVBRRzd4YWl1azVTOGZreTlYRFZyeFRlVURBNzB3WnhKaW1YUGVOd2EwNksydEc3U0xYdXVaTGdFczlaZnNiQVBaWkI3aHd0LzF5Y2RGZ0gweGd0enJuZ2dQVHY5d0ZSZTF4RWJXQm5UV25KVlRhWkJPRUhzUHpZZkxqM2xlL0twL1dORE5HMGxHU3FoaFRsVEx5YXNQTktIOEVwYU1EYzZhaE40OWFwbStCRUVXdmU3ZGg1WEUvTkpNcE9LWW1semZZPTwvZHM6WDUwOUNlcnRpZmljYXRlPjwvZHM6WDUwOURhdGE+PGRzOktleVZhbHVlPjxkczpSU0FLZXlWYWx1ZT48ZHM6TW9kdWx1cz5tSERCMGowa2lURlBpMWtENmpjSi9ZcHdjbDRtM1FnMGkrczFJQjlhdEJrODlEajBvMFFITWhUTnFCcFZMSWpwKzVTenZzNmdsblZEQVhRemVhamFMS2d5YjFLbkFhejdEdkY2Y29ONGkxVnZCUlNGbm9JMmNzOEJnT2R4Y1UvYU9MUVRyRFVnTUw0MDVBWElNTHVUSXFTU3RxNU9WRC9CdlBaVS81c0QxY280czVldlpTaE5SdjB4VkxrS3BSNytBQ3FwZGJmdnJJVmRxOGxqWTdEby9PbVdEU3oyZHVKM0pYZVhyU01wUEoySVRJL2FjT0dzanMrTVY1UG8wcDcxT3NRQ0IvYjRNcGt0N2Q1Q1g4WEtleVp5d1Jray85M2hXRGNCYUdrbjBYOGRxcmdZSlRCZGZzQkhYakMrWmpPbUQ1dytzUnpzcSs2ZVJWQUtOY3BCSlE9PTwvZHM6TW9kdWx1cz48ZHM6RXhwb25lbnQ+QVFBQjwvZHM6RXhwb25lbnQ+PC9kczpSU0FLZXlWYWx1ZT48L2RzOktleVZhbHVlPjwvZHM6S2V5SW5mbz48ZHM6T2JqZWN0IElkPSJYYWRlc09iamVjdElkLWZjOTM3ZmFjLWRiMjAtNDI1Ni04ODNmLWMxYmNkYzU4MDZjNCI+PHhhZGVzOlF1YWxpZnlpbmdQcm9wZXJ0aWVzIHhtbG5zOnhhZGVzPSJodHRwOi8vdXJpLmV0c2kub3JnLzAxOTAzL3YxLjMuMiMiIElkPSJRdWFsaWZ5aW5nUHJvcGVydGllcy03YmYwOWRhMC1jZDk5LTRkOWQtOTc0OS1hYjI0NGQwZDVmYzgiIFRhcmdldD0iI1NpZ25hdHVyZS0yNGE3NmJjYy05OTNiLTQ0ZDMtOGFlYS1jNTdmM2ZhNDI4YTYiPjx4YWRlczpTaWduZWRQcm9wZXJ0aWVzIElkPSJ4bWxkc2lnLVNpZ25hdHVyZS0yNGE3NmJjYy05OTNiLTQ0ZDMtOGFlYS1jNTdmM2ZhNDI4YTYtc2lnbmVkcHJvcHMiPjx4YWRlczpTaWduZWRTaWduYXR1cmVQcm9wZXJ0aWVzPjx4YWRlczpTaWduaW5nVGltZT4yMDI2LTA3LTA2VDE2OjU0OjMxKzAwOjAwPC94YWRlczpTaWduaW5nVGltZT48eGFkZXM6U2lnbmluZ0NlcnRpZmljYXRlPjx4YWRlczpDZXJ0Pjx4YWRlczpDZXJ0RGlnZXN0PjxkczpEaWdlc3RNZXRob2QgQWxnb3JpdGhtPSJodHRwOi8vd3d3LnczLm9yZy8yMDAxLzA0L3htbGVuYyNzaGEyNTYiIC8+PGRzOkRpZ2VzdFZhbHVlPi9LdjlrRkgrbVY5SlUzSHJZc2NZRGt2TjlPdmhkZDQ3TDNzbTVSc2djVWs9PC9kczpEaWdlc3RWYWx1ZT48L3hhZGVzOkNlcnREaWdlc3Q+PHhhZGVzOklzc3VlclNlcmlhbD48ZHM6WDUwOUlzc3Vlck5hbWU+Q049T2xpbXBpYUlUIEVDRCBTdWIsIE89T2xpbXBpYUlULCBPVT1PbGltcGlhSVQgRUNELCBFPXNlcnZpY2lvYWxjbGllbnRlQG9saW1waWFpdC5jb20sIEM9Q08sIFM9Qm9nb3TDoSBELkMuLCBMPUJvZ290w6EgRC5DLiwgU1RSRUVUPVNlZSBjdXJyZW50IGFkZHJlc3MgYXQgaHR0cHM6Ly9taWNlcnRpZmljYWRvLm9saW1waWFpdC5jb20sIE9JRC4yLjUuNC40NT05MDAwMzI3NzQtNCwgU0VSSUFMTlVNQkVSPTkwMDAzMjc3NC00PC9kczpYNTA5SXNzdWVyTmFtZT48ZHM6WDUwOVNlcmlhbE51bWJlcj44OTQwNzI3OTY3MjEwNjg1MDUzOTI0MzExNTEyMTIxMjQwMzc2MTwvZHM6WDUwOVNlcmlhbE51bWJlcj48L3hhZGVzOklzc3VlclNlcmlhbD48L3hhZGVzOkNlcnQ+PC94YWRlczpTaWduaW5nQ2VydGlmaWNhdGU+PHhhZGVzOlNpZ25hdHVyZVBvbGljeUlkZW50aWZpZXI+PHhhZGVzOlNpZ25hdHVyZVBvbGljeUlkPjx4YWRlczpTaWdQb2xpY3lJZD48eGFkZXM6SWRlbnRpZmllcj5odHRwczovL2ZhY3R1cmFlbGVjdHJvbmljYS5kaWFuLmdvdi5jby9wb2xpdGljYWRlZmlybWEvdjIvcG9saXRpY2FkZWZpcm1hdjIucGRmPC94YWRlczpJZGVudGlmaWVyPjx4YWRlczpEZXNjcmlwdGlvbiAvPjwveGFkZXM6U2lnUG9saWN5SWQ+PHhhZGVzOlNpZ1BvbGljeUhhc2g+PGRzOkRpZ2VzdE1ldGhvZCBBbGdvcml0aG09Imh0dHA6Ly93d3cudzMub3JnLzIwMDEvMDQveG1sZW5jI3NoYTI1NiIgLz48ZHM6RGlnZXN0VmFsdWU+ZE1vTXZ0Y0c1YUl6Z1lvMHRJc1NRZVZKQkRuVW5mU09mQnB4WHJtb3IwWT08L2RzOkRpZ2VzdFZhbHVlPjwveGFkZXM6U2lnUG9saWN5SGFzaD48L3hhZGVzOlNpZ25hdHVyZVBvbGljeUlkPjwveGFkZXM6U2lnbmF0dXJlUG9saWN5SWRlbnRpZmllcj48eGFkZXM6U2lnbmVyUm9sZT48eGFkZXM6Q2xhaW1lZFJvbGVzPjx4YWRlczpDbGFpbWVkUm9sZT5zdXBwbGllcjwveGFkZXM6Q2xhaW1lZFJvbGU+PC94YWRlczpDbGFpbWVkUm9sZXM+PC94YWRlczpTaWduZXJSb2xlPjwveGFkZXM6U2lnbmVkU2lnbmF0dXJlUHJvcGVydGllcz48eGFkZXM6U2lnbmVkRGF0YU9iamVjdFByb3BlcnRpZXM+PHhhZGVzOkRhdGFPYmplY3RGb3JtYXQgT2JqZWN0UmVmZXJlbmNlPSIjUmVmZXJlbmNlLTcxZjI5N2UyLWM3MjAtNDVjMC05ZTNmLTBkNmU2MjRiMDVhNiI+PHhhZGVzOk1pbWVUeXBlPnRleHQveG1sPC94YWRlczpNaW1lVHlwZT48eGFkZXM6RW5jb2Rpbmc+VVRGLTg8L3hhZGVzOkVuY29kaW5nPjwveGFkZXM6RGF0YU9iamVjdEZvcm1hdD48L3hhZGVzOlNpZ25lZERhdGFPYmplY3RQcm9wZXJ0aWVzPjwveGFkZXM6U2lnbmVkUHJvcGVydGllcz48L3hhZGVzOlF1YWxpZnlpbmdQcm9wZXJ0aWVzPjwvZHM6T2JqZWN0PjwvZHM6U2lnbmF0dXJlPjwvZXh0OkV4dGVuc2lvbkNvbnRlbnQ+DQogICAgPC9leHQ6VUJMRXh0ZW5zaW9uPg0KICA8L2V4dDpVQkxFeHRlbnNpb25zPg0KICA8Y2JjOlVCTFZlcnNpb25JRD5VQkwgMi4xPC9jYmM6VUJMVmVyc2lvbklEPg0KICA8Y2JjOkN1c3RvbWl6YXRpb25JRD4xPC9jYmM6Q3VzdG9taXphdGlvbklEPg0KICA8Y2JjOlByb2ZpbGVJRD5ESUFOIDIuMTwvY2JjOlByb2ZpbGVJRD4NCiAgPGNiYzpQcm9maWxlRXhlY3V0aW9uSUQ+MTwvY2JjOlByb2ZpbGVFeGVjdXRpb25JRD4NCiAgPGNiYzpJRD43ODQ5MDQ1NTwvY2JjOklEPg0KICA8Y2JjOlVVSUQgc2NoZW1lTmFtZT0iQ1VERS1TSEEzODQiPjcwMTA0Y2VjOTJkY2I0Y2RjYjY5YTIwMTE5NWNmZmM1ZTQ4NWYyYTYxOWI2YTE1YzcyMTljMjI1MTg2NzFhN2RjNTFmNTIyYTQyYWQyN2NmYjRiZmZhNmUxMDI3ZjQxNTwvY2JjOlVVSUQ+DQogIDxjYmM6SXNzdWVEYXRlPjIwMjYtMDctMDY8L2NiYzpJc3N1ZURhdGU+DQogIDxjYmM6SXNzdWVUaW1lPjE2OjU0OjMxLTA1OjAwPC9jYmM6SXNzdWVUaW1lPg0KICA8Y2FjOlNlbmRlclBhcnR5Pg0KICAgIDxjYWM6UGFydHlUYXhTY2hlbWU+DQogICAgICA8Y2JjOlJlZ2lzdHJhdGlvbk5hbWU+VW5pZGFkIEVzcGVjaWFsIERpcmVjY2nDs24gZGUgSW1wdWVzdG9zIHkgQWR1YW5hcyBOYWNpb25hbGVzPC9jYmM6UmVnaXN0cmF0aW9uTmFtZT4NCiAgICAgIDxjYmM6Q29tcGFueUlEIHNjaGVtZUlEPSI0IiBzY2hlbWVOYW1lPSIzMSI+ODAwMTk3MjY4PC9jYmM6Q29tcGFueUlEPg0KICAgICAgPGNhYzpUYXhTY2hlbWU+DQogICAgICAgIDxjYmM6SUQ+MDE8L2NiYzpJRD4NCiAgICAgICAgPGNiYzpOYW1lPklWQTwvY2JjOk5hbWU+DQogICAgICA8L2NhYzpUYXhTY2hlbWU+DQogICAgPC9jYWM6UGFydHlUYXhTY2hlbWU+DQogIDwvY2FjOlNlbmRlclBhcnR5Pg0KICA8Y2FjOlJlY2VpdmVyUGFydHk+DQogICAgPGNhYzpQYXJ0eVRheFNjaGVtZT4NCiAgICAgIDxjYmM6UmVnaXN0cmF0aW9uTmFtZT5NQVJUSU5FWiBSSUNBUkRPIExVSVMgRkVSTkFORE88L2NiYzpSZWdpc3RyYXRpb25OYW1lPg0KICAgICAgPGNiYzpDb21wYW55SUQgc2NoZW1lSUQ9IjgiIHNjaGVtZU5hbWU9IjMxIj4xMTEwNTE2OTwvY2JjOkNvbXBhbnlJRD4NCiAgICAgIDxjYWM6VGF4U2NoZW1lPg0KICAgICAgICA8Y2JjOklEPjAxPC9jYmM6SUQ+DQogICAgICAgIDxjYmM6TmFtZT5JVkE8L2NiYzpOYW1lPg0KICAgICAgPC9jYWM6VGF4U2NoZW1lPg0KICAgIDwvY2FjOlBhcnR5VGF4U2NoZW1lPg0KICA8L2NhYzpSZWNlaXZlclBhcnR5Pg0KICA8Y2FjOkRvY3VtZW50UmVzcG9uc2U+DQogICAgPGNhYzpSZXNwb25zZT4NCiAgICAgIDxjYmM6UmVzcG9uc2VDb2RlPjAyPC9jYmM6UmVzcG9uc2VDb2RlPg0KICAgICAgPGNiYzpEZXNjcmlwdGlvbj5Eb2N1bWVudG8gdmFsaWRhZG8gcG9yIGxhIERJQU48L2NiYzpEZXNjcmlwdGlvbj4NCiAgICA8L2NhYzpSZXNwb25zZT4NCiAgICA8Y2FjOkRvY3VtZW50UmVmZXJlbmNlPg0KICAgICAgPGNiYzpJRD4xPC9jYmM6SUQ+DQogICAgICA8Y2JjOlVVSUQgc2NoZW1lTmFtZT0iQ1VERS1TSEEzODQiPmU3ZTk0OWNkMzI4Y2I2NTU3N2ZmYThmYTI0ZDhlNzk3NTQyMWI2ODFjMjNjNWNmZGU1MTA2NjllZDIxY2UwYTEwNDA3Y2I2NTI1YzdjNzUxZTVhYjJiYTA5OTJiNWRhYjwvY2JjOlVVSUQ+DQogICAgPC9jYWM6RG9jdW1lbnRSZWZlcmVuY2U+DQogICAgPGNhYzpMaW5lUmVzcG9uc2U+DQogICAgICA8Y2FjOkxpbmVSZWZlcmVuY2U+DQogICAgICAgIDxjYmM6TGluZUlEPjE8L2NiYzpMaW5lSUQ+DQogICAgICA8L2NhYzpMaW5lUmVmZXJlbmNlPg0KICAgICAgPGNhYzpSZXNwb25zZT4NCiAgICAgICAgPGNiYzpSZXNwb25zZUNvZGU+MDAwMDwvY2JjOlJlc3BvbnNlQ29kZT4NCiAgICAgICAgPGNiYzpEZXNjcmlwdGlvbj4wPC9jYmM6RGVzY3JpcHRpb24+DQogICAgICA8L2NhYzpSZXNwb25zZT4NCiAgICA8L2NhYzpMaW5lUmVzcG9uc2U+DQogICAgPGNhYzpMaW5lUmVzcG9uc2U+DQogICAgICA8Y2FjOkxpbmVSZWZlcmVuY2U+DQogICAgICAgIDxjYmM6TGluZUlEPjI8L2NiYzpMaW5lSUQ+DQogICAgICA8L2NhYzpMaW5lUmVmZXJlbmNlPg0KICAgICAgPGNhYzpSZXNwb25zZT4NCiAgICAgICAgPGNiYzpSZXNwb25zZUNvZGU+MDwvY2JjOlJlc3BvbnNlQ29kZT4NCiAgICAgICAgPGNiYzpEZXNjcmlwdGlvbj5MYSBBcHBsaWNhdGlvbiByZXNwb25zZSAxLCBoYSBzaWRvIGF1dG9yaXphZGEuPC9jYmM6RGVzY3JpcHRpb24+DQogICAgICA8L2NhYzpSZXNwb25zZT4NCiAgICA8L2NhYzpMaW5lUmVzcG9uc2U+DQogIDwvY2FjOkRvY3VtZW50UmVzcG9uc2U+DQo8L0FwcGxpY2F0aW9uUmVzcG9uc2U+\",\"XmlBytes\":{\"_attributes\":{\"nil\":\"true\"}},\"XmlDocumentKey\":\"e7e949cd328cb65577ffa8fa24d8e7975421b681c23c5cfde510669ed21ce0a10407cb6525c7c751e5ab2ba0992b5dab\",\"XmlFileName\":\"event_1_030_1_signed\"}}}}}}','aprobado','2026-07-06 16:54:31',NULL,'2026-07-06 21:54:29','030');
/*!40000 ALTER TABLE `eventos_factura_recibida` ENABLE KEYS */;
UNLOCK TABLES;

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
-- Dumping data for table `facturas_recibidas`
--

LOCK TABLES `facturas_recibidas` WRITE;
/*!40000 ALTER TABLE `facturas_recibidas` DISABLE KEYS */;
INSERT INTO `facturas_recibidas` VALUES (1,'239ab7bdca3fc15e7157eeeb5ec1de20d3ae1a07dca77ddb15438e72f5edd1952a884e90c4e45f57c303095d11874b56','Invoice','01','14','FE','2026-07-06','2026-07-06 13:08:48','901437071',NULL,'FJD GROUP SAS','1','11105169','LUIS FERNANDO MARTINEZ RICARDO',1200.00,0.00,1200.00,'COP','z09014370710002600000014.zip','20260706_130848_33bac277_z09014370710002600000014.zip','uploads/facturas_recibidas/2026/07/20260706_130848_33bac277_z09014370710002600000014.zip',NULL,'2026-07-06 18:08:48');
/*!40000 ALTER TABLE `facturas_recibidas` ENABLE KEYS */;
UNLOCK TABLES;

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
-- Dumping data for table `facturasv_abiertas`
--

LOCK TABLES `facturasv_abiertas` WRITE;
/*!40000 ALTER TABLE `facturasv_abiertas` DISABLE KEYS */;
/*!40000 ALTER TABLE `facturasv_abiertas` ENABLE KEYS */;
UNLOCK TABLES;

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
-- Dumping data for table `municipalities`
--

LOCK TABLES `municipalities` WRITE;
/*!40000 ALTER TABLE `municipalities` DISABLE KEYS */;
INSERT INTO `municipalities` VALUES (1,46,2,'05001','Medellín',NULL,NULL),(2,46,2,'05002','Abejorral',NULL,NULL),(3,46,2,'05004','Abriaquí',NULL,NULL),(4,46,2,'05021','Alejandría',NULL,NULL),(5,46,2,'05030','Amagá',NULL,NULL),(6,46,2,'05031','Amalfi',NULL,NULL),(7,46,2,'05034','Andes',NULL,NULL),(8,46,2,'05036','Angelópolis',NULL,NULL),(9,46,2,'05038','Angostura',NULL,NULL),(10,46,2,'05040','Anorí',NULL,NULL),(11,46,2,'05042','Santa Fé De Antioquia',NULL,NULL),(12,46,2,'05044','Anzá',NULL,NULL),(13,46,2,'05045','Apartadó',NULL,NULL),(14,46,2,'05051','Arboletes',NULL,NULL),(15,46,2,'05055','Argelia',NULL,NULL),(16,46,2,'05059','Armenia',NULL,NULL),(17,46,2,'05079','Barbosa',NULL,NULL),(18,46,2,'05086','Belmira',NULL,NULL),(19,46,2,'05088','Bello',NULL,NULL),(20,46,2,'05091','Betania',NULL,NULL),(21,46,2,'05093','Betulia',NULL,NULL),(22,46,2,'05101','Ciudad Bolívar ',NULL,NULL),(23,46,2,'05107','Briceño',NULL,NULL),(24,46,2,'05113','Buriticá',NULL,NULL),(25,46,2,'05120','Cáceres',NULL,NULL),(26,46,2,'05125','Caicedo',NULL,NULL),(27,46,2,'05129','Caldas',NULL,NULL),(28,46,2,'05134','Campamento',NULL,NULL),(29,46,2,'05138','Cañasgordas',NULL,NULL),(30,46,2,'05142','Caracolí',NULL,NULL),(31,46,2,'05145','Caramanta',NULL,NULL),(32,46,2,'05147','Carepa',NULL,NULL),(33,46,2,'05148','El Carmen De Viboral',NULL,NULL),(34,46,2,'05150','Carolina',NULL,NULL),(35,46,2,'05154','Caucasia',NULL,NULL),(36,46,2,'05172','Chigorodó',NULL,NULL),(37,46,2,'05190','Cisneros',NULL,NULL),(38,46,2,'05197','Cocorná',NULL,NULL),(39,46,2,'05206','Concepción',NULL,NULL),(40,46,2,'05209','Concordia',NULL,NULL),(41,46,2,'05212','Copacabana',NULL,NULL),(42,46,2,'05234','Dabeiba',NULL,NULL),(43,46,2,'05237','Donmatías',NULL,NULL),(44,46,2,'05240','Ebéjico',NULL,NULL),(45,46,2,'05250','El Bagre ',NULL,NULL),(46,46,2,'05264','Entrerríos',NULL,NULL),(47,46,2,'05266','Envigado',NULL,NULL),(48,46,2,'05282','Fredonia',NULL,NULL),(49,46,2,'05284','Frontino',NULL,NULL),(50,46,2,'05306','Giraldo',NULL,NULL),(51,46,2,'05308','Girardota',NULL,NULL),(52,46,2,'05310','Gómez Plata ',NULL,NULL),(53,46,2,'05313','Granada',NULL,NULL),(54,46,2,'05315','Guadalupe',NULL,NULL),(55,46,2,'05318','Guarne',NULL,NULL),(56,46,2,'05321','Guatapé',NULL,NULL),(57,46,2,'05347','Heliconia',NULL,NULL),(58,46,2,'05353','Hispania',NULL,NULL),(59,46,2,'05360','Itagüí',NULL,NULL),(60,46,2,'05361','Ituango',NULL,NULL),(61,46,2,'05364','Jardín',NULL,NULL),(62,46,2,'05368','Jericó',NULL,NULL),(63,46,2,'05376','La Ceja ',NULL,NULL),(64,46,2,'05380','La Estrella ',NULL,NULL),(65,46,2,'05390','La Pintada ',NULL,NULL),(66,46,2,'05400','La Unión ',NULL,NULL),(67,46,2,'05411','Liborina',NULL,NULL),(68,46,2,'05425','Maceo',NULL,NULL),(69,46,2,'05440','Marinilla',NULL,NULL),(70,46,2,'05467','Montebello',NULL,NULL),(71,46,2,'05475','Murindó',NULL,NULL),(72,46,2,'05480','Mutatá',NULL,NULL),(73,46,2,'05483','Nariño',NULL,NULL),(74,46,2,'05490','Necoclí',NULL,NULL),(75,46,2,'05495','Nechí',NULL,NULL),(76,46,2,'05501','Olaya',NULL,NULL),(77,46,2,'05541','Peñol',NULL,NULL),(78,46,2,'05543','Peque',NULL,NULL),(79,46,2,'05576','Pueblorrico',NULL,NULL),(80,46,2,'05579','Puerto Berrío ',NULL,NULL),(81,46,2,'05585','Puerto Nare ',NULL,NULL),(82,46,2,'05591','Puerto Triunfo ',NULL,NULL),(83,46,2,'05604','Remedios',NULL,NULL),(84,46,2,'05607','Retiro',NULL,NULL),(85,46,2,'05615','Rionegro',NULL,NULL),(86,46,2,'05628','Sabanalarga',NULL,NULL),(87,46,2,'05631','Sabaneta',NULL,NULL),(88,46,2,'05642','Salgar',NULL,NULL),(89,46,2,'05647','San Andrés De Cuerquía',NULL,NULL),(90,46,2,'05649','San Carlos ',NULL,NULL),(91,46,2,'05652','San Francisco ',NULL,NULL),(92,46,2,'05656','San Jerónimo ',NULL,NULL),(93,46,2,'05658','San José De La Montaña ',NULL,NULL),(94,46,2,'05659','San Juan De Urabá',NULL,NULL),(95,46,2,'05660','San Luis ',NULL,NULL),(96,46,2,'05664','San Pedro De Los Milagros ',NULL,NULL),(97,46,2,'05665','San Pedro De Urabá',NULL,NULL),(98,46,2,'05667','San Rafael ',NULL,NULL),(99,46,2,'05670','San Roque ',NULL,NULL),(100,46,2,'05674','San Vicente Ferrer',NULL,NULL),(101,46,2,'05679','Santa Bárbara ',NULL,NULL),(102,46,2,'05686','Santa Rosa De Osos',NULL,NULL),(103,46,2,'05690','Santo Domingo ',NULL,NULL),(104,46,2,'05697','El Santuario ',NULL,NULL),(105,46,2,'05736','Segovia',NULL,NULL),(106,46,2,'05756','Sonsón',NULL,NULL),(107,46,2,'05761','Sopetrán',NULL,NULL),(108,46,2,'05789','Támesis',NULL,NULL),(109,46,2,'05790','Tarazá',NULL,NULL),(110,46,2,'05792','Tarso',NULL,NULL),(111,46,2,'05809','Titiribí',NULL,NULL),(112,46,2,'05819','Toledo',NULL,NULL),(113,46,2,'05837','Turbo',NULL,NULL),(114,46,2,'05842','Uramita',NULL,NULL),(115,46,2,'05847','Urrao',NULL,NULL),(116,46,2,'05854','Valdivia',NULL,NULL),(117,46,2,'05856','Valparaíso',NULL,NULL),(118,46,2,'05858','Vegachí',NULL,NULL),(119,46,2,'05861','Venecia',NULL,NULL),(120,46,2,'05873','Vigía Del Fuerte',NULL,NULL),(121,46,2,'05885','Yalí',NULL,NULL),(122,46,2,'05887','Yarumal',NULL,NULL),(123,46,2,'05890','Yolombó',NULL,NULL),(124,46,2,'05893','Yondó',NULL,NULL),(125,46,2,'05895','Zaragoza',NULL,NULL),(126,46,4,'08001','Barranquilla',NULL,NULL),(127,46,4,'08078','Baranoa',NULL,NULL),(128,46,4,'08137','Campo De La Cruz',NULL,NULL),(129,46,4,'08141','Candelaria',NULL,NULL),(130,46,4,'08296','Galapa',NULL,NULL),(131,46,4,'08372','Juan De Acosta',NULL,NULL),(132,46,4,'08421','Luruaco',NULL,NULL),(133,46,4,'08433','Malambo',NULL,NULL),(134,46,4,'08436','Manatí',NULL,NULL),(135,46,4,'08520','Palmar De Varela',NULL,NULL),(136,46,4,'08549','Piojó',NULL,NULL),(137,46,4,'08558','Polonuevo',NULL,NULL),(138,46,4,'08560','Ponedera',NULL,NULL),(139,46,4,'08573','Puerto Colombia ',NULL,NULL),(140,46,4,'08606','Repelón',NULL,NULL),(141,46,4,'08634','Sabanagrande',NULL,NULL),(142,46,4,'08638','Sabanalarga',NULL,NULL),(143,46,4,'08675','Santa Lucía ',NULL,NULL),(144,46,4,'08685','Santo Tomás ',NULL,NULL),(145,46,4,'08758','Soledad',NULL,NULL),(146,46,4,'08770','Suan',NULL,NULL),(147,46,4,'08832','Tubará',NULL,NULL),(148,46,4,'08849','Usiacurí',NULL,NULL),(149,46,5,'11001','Bogotá, D.c. ',NULL,NULL),(150,46,6,'13001','Cartagena De Indias',NULL,NULL),(151,46,6,'13006','Achí',NULL,NULL),(152,46,6,'13030','Altos Del Rosario',NULL,NULL),(153,46,6,'13042','Arenal',NULL,NULL),(154,46,6,'13052','Arjona',NULL,NULL),(155,46,6,'13062','Arroyohondo',NULL,NULL),(156,46,6,'13074','Barranco De Loba',NULL,NULL),(157,46,6,'13140','Calamar',NULL,NULL),(158,46,6,'13160','Cantagallo',NULL,NULL),(159,46,6,'13188','Cicuco',NULL,NULL),(160,46,6,'13212','Córdoba',NULL,NULL),(161,46,6,'13222','Clemencia',NULL,NULL),(162,46,6,'13244','El Carmen De Bolívar',NULL,NULL),(163,46,6,'13248','El Guamo ',NULL,NULL),(164,46,6,'13268','El Peñón ',NULL,NULL),(165,46,6,'13300','Hatillo De Loba',NULL,NULL),(166,46,6,'13430','Magangué',NULL,NULL),(167,46,6,'13433','Mahates',NULL,NULL),(168,46,6,'13440','Margarita',NULL,NULL),(169,46,6,'13442','María La Baja',NULL,NULL),(170,46,6,'13458','Montecristo',NULL,NULL),(171,46,6,'13468','Mompós',NULL,NULL),(172,46,6,'13473','Morales',NULL,NULL),(173,46,6,'13490','Norosí',NULL,NULL),(174,46,6,'13549','Pinillos',NULL,NULL),(175,46,6,'13580','Regidor',NULL,NULL),(176,46,6,'13600','Río Viejo ',NULL,NULL),(177,46,6,'13620','San Cristóbal ',NULL,NULL),(178,46,6,'13647','San Estanislao ',NULL,NULL),(179,46,6,'13650','San Fernando ',NULL,NULL),(180,46,6,'13654','San Jacinto ',NULL,NULL),(181,46,6,'13655','San Jacinto Del Cauca',NULL,NULL),(182,46,6,'13657','San Juan Nepomuceno',NULL,NULL),(183,46,6,'13667','San Martín De Loba',NULL,NULL),(184,46,6,'13670','San Pablo ',NULL,NULL),(185,46,6,'13673','Santa Catalina ',NULL,NULL),(186,46,6,'13683','Santa Rosa ',NULL,NULL),(187,46,6,'13688','Santa Rosa Del Sur',NULL,NULL),(188,46,6,'13744','Simití',NULL,NULL),(189,46,6,'13760','Soplaviento',NULL,NULL),(190,46,6,'13780','Talaigua Nuevo ',NULL,NULL),(191,46,6,'13810','Tiquisio',NULL,NULL),(192,46,6,'13836','Turbaco',NULL,NULL),(193,46,6,'13838','Turbaná',NULL,NULL),(194,46,6,'13873','Villanueva',NULL,NULL),(195,46,6,'13894','Zambrano',NULL,NULL),(196,46,7,'15001','Tunja',NULL,NULL),(197,46,7,'15022','Almeida',NULL,NULL),(198,46,7,'15047','Aquitania',NULL,NULL),(199,46,7,'15051','Arcabuco',NULL,NULL),(200,46,7,'15087','Belén',NULL,NULL),(201,46,7,'15090','Berbeo',NULL,NULL),(202,46,7,'15092','Betéitiva',NULL,NULL),(203,46,7,'15097','Boavita',NULL,NULL),(204,46,7,'15104','Boyacá',NULL,NULL),(205,46,7,'15106','Briceño',NULL,NULL),(206,46,7,'15109','Buenavista',NULL,NULL),(207,46,7,'15114','Busbanzá',NULL,NULL),(208,46,7,'15131','Caldas',NULL,NULL),(209,46,7,'15135','Campohermoso',NULL,NULL),(210,46,7,'15162','Cerinza',NULL,NULL),(211,46,7,'15172','Chinavita',NULL,NULL),(212,46,7,'15176','Chiquinquirá',NULL,NULL),(213,46,7,'15180','Chiscas',NULL,NULL),(214,46,7,'15183','Chita',NULL,NULL),(215,46,7,'15185','Chitaraque',NULL,NULL),(216,46,7,'15187','Chivatá',NULL,NULL),(217,46,7,'15189','Ciénega',NULL,NULL),(218,46,7,'15204','Cómbita',NULL,NULL),(219,46,7,'15212','Coper',NULL,NULL),(220,46,7,'15215','Corrales',NULL,NULL),(221,46,7,'15218','Covarachía',NULL,NULL),(222,46,7,'15223','Cubará',NULL,NULL),(223,46,7,'15224','Cucaita',NULL,NULL),(224,46,7,'15226','Cuítiva',NULL,NULL),(225,46,7,'15232','Chíquiza',NULL,NULL),(226,46,7,'15236','Chivor',NULL,NULL),(227,46,7,'15238','Duitama',NULL,NULL),(228,46,7,'15244','El Cocuy ',NULL,NULL),(229,46,7,'15248','El Espino ',NULL,NULL),(230,46,7,'15272','Firavitoba',NULL,NULL),(231,46,7,'15276','Floresta',NULL,NULL),(232,46,7,'15293','Gachantivá',NULL,NULL),(233,46,7,'15296','Gámeza',NULL,NULL),(234,46,7,'15299','Garagoa',NULL,NULL),(235,46,7,'15317','Guacamayas',NULL,NULL),(236,46,7,'15322','Guateque',NULL,NULL),(237,46,7,'15325','Guayatá',NULL,NULL),(238,46,7,'15332','Güicán De La Sierra',NULL,NULL),(239,46,7,'15362','Iza',NULL,NULL),(240,46,7,'15367','Jenesano',NULL,NULL),(241,46,7,'15368','Jericó',NULL,NULL),(242,46,7,'15377','Labranzagrande',NULL,NULL),(243,46,7,'15380','La Capilla ',NULL,NULL),(244,46,7,'15401','La Victoria ',NULL,NULL),(245,46,7,'15403','La Uvita ',NULL,NULL),(246,46,7,'15407','Villa De Leyva',NULL,NULL),(247,46,7,'15425','Macanal',NULL,NULL),(248,46,7,'15442','Maripí',NULL,NULL),(249,46,7,'15455','Miraflores',NULL,NULL),(250,46,7,'15464','Mongua',NULL,NULL),(251,46,7,'15466','Monguí',NULL,NULL),(252,46,7,'15469','Moniquirá',NULL,NULL),(253,46,7,'15476','Motavita',NULL,NULL),(254,46,7,'15480','Muzo',NULL,NULL),(255,46,7,'15491','Nobsa',NULL,NULL),(256,46,7,'15494','Nuevo Colón ',NULL,NULL),(257,46,7,'15500','Oicatá',NULL,NULL),(258,46,7,'15507','Otanche',NULL,NULL),(259,46,7,'15511','Pachavita',NULL,NULL),(260,46,7,'15514','Páez',NULL,NULL),(261,46,7,'15516','Paipa',NULL,NULL),(262,46,7,'15518','Pajarito',NULL,NULL),(263,46,7,'15522','Panqueba',NULL,NULL),(264,46,7,'15531','Pauna',NULL,NULL),(265,46,7,'15533','Paya',NULL,NULL),(266,46,7,'15537','Paz De Río',NULL,NULL),(267,46,7,'15542','Pesca',NULL,NULL),(268,46,7,'15550','Pisba',NULL,NULL),(269,46,7,'15572','Puerto Boyacá ',NULL,NULL),(270,46,7,'15580','Quípama',NULL,NULL),(271,46,7,'15599','Ramiriquí',NULL,NULL),(272,46,7,'15600','Ráquira',NULL,NULL),(273,46,7,'15621','Rondón',NULL,NULL),(274,46,7,'15632','Saboyá',NULL,NULL),(275,46,7,'15638','Sáchica',NULL,NULL),(276,46,7,'15646','Samacá',NULL,NULL),(277,46,7,'15660','San Eduardo ',NULL,NULL),(278,46,7,'15664','San José De Pare',NULL,NULL),(279,46,7,'15667','San Luis De Gaceno',NULL,NULL),(280,46,7,'15673','San Mateo ',NULL,NULL),(281,46,7,'15676','San Miguel De Sema',NULL,NULL),(282,46,7,'15681','San Pablo De Borbur',NULL,NULL),(283,46,7,'15686','Santana',NULL,NULL),(284,46,7,'15690','Santa María ',NULL,NULL),(285,46,7,'15693','Santa Rosa De Viterbo',NULL,NULL),(286,46,7,'15696','Santa Sofía ',NULL,NULL),(287,46,7,'15720','Sativanorte',NULL,NULL),(288,46,7,'15723','Sativasur',NULL,NULL),(289,46,7,'15740','Siachoque',NULL,NULL),(290,46,7,'15753','Soatá',NULL,NULL),(291,46,7,'15755','Socotá',NULL,NULL),(292,46,7,'15757','Socha',NULL,NULL),(293,46,7,'15759','Sogamoso',NULL,NULL),(294,46,7,'15761','Somondoco',NULL,NULL),(295,46,7,'15762','Sora',NULL,NULL),(296,46,7,'15763','Sotaquirá',NULL,NULL),(297,46,7,'15764','Soracá',NULL,NULL),(298,46,7,'15774','Susacón',NULL,NULL),(299,46,7,'15776','Sutamarchán',NULL,NULL),(300,46,7,'15778','Sutatenza',NULL,NULL),(301,46,7,'15790','Tasco',NULL,NULL),(302,46,7,'15798','Tenza',NULL,NULL),(303,46,7,'15804','Tibaná',NULL,NULL),(304,46,7,'15806','Tibasosa',NULL,NULL),(305,46,7,'15808','Tinjacá',NULL,NULL),(306,46,7,'15810','Tipacoque',NULL,NULL),(307,46,7,'15814','Toca',NULL,NULL),(308,46,7,'15816','Togüí',NULL,NULL),(309,46,7,'15820','Tópaga',NULL,NULL),(310,46,7,'15822','Tota',NULL,NULL),(311,46,7,'15832','Tununguá',NULL,NULL),(312,46,7,'15835','Turmequé',NULL,NULL),(313,46,7,'15837','Tuta',NULL,NULL),(314,46,7,'15839','Tutazá',NULL,NULL),(315,46,7,'15842','Úmbita',NULL,NULL),(316,46,7,'15861','Ventaquemada',NULL,NULL),(317,46,7,'15879','Viracachá',NULL,NULL),(318,46,7,'15897','Zetaquira',NULL,NULL),(319,46,8,'17001','Manizales',NULL,NULL),(320,46,8,'17013','Aguadas',NULL,NULL),(321,46,8,'17042','Anserma',NULL,NULL),(322,46,8,'17050','Aranzazu',NULL,NULL),(323,46,8,'17088','Belalcázar',NULL,NULL),(324,46,8,'17174','Chinchiná',NULL,NULL),(325,46,8,'17272','Filadelfia',NULL,NULL),(326,46,8,'17380','La Dorada ',NULL,NULL),(327,46,8,'17388','La Merced ',NULL,NULL),(328,46,8,'17433','Manzanares',NULL,NULL),(329,46,8,'17442','Marmato',NULL,NULL),(330,46,8,'17444','Marquetalia',NULL,NULL),(331,46,8,'17446','Marulanda',NULL,NULL),(332,46,8,'17486','Neira',NULL,NULL),(333,46,8,'17495','Norcasia',NULL,NULL),(334,46,8,'17513','Pácora',NULL,NULL),(335,46,8,'17524','Palestina',NULL,NULL),(336,46,8,'17541','Pensilvania',NULL,NULL),(337,46,8,'17614','Riosucio',NULL,NULL),(338,46,8,'17616','Risaralda',NULL,NULL),(339,46,8,'17653','Salamina',NULL,NULL),(340,46,8,'17662','Samaná',NULL,NULL),(341,46,8,'17665','San José ',NULL,NULL),(342,46,8,'17777','Supía',NULL,NULL),(343,46,8,'17867','Victoria',NULL,NULL),(344,46,8,'17873','Villamaría',NULL,NULL),(345,46,8,'17877','Viterbo',NULL,NULL),(346,46,9,'18001','Florencia',NULL,NULL),(347,46,9,'18029','Albania',NULL,NULL),(348,46,9,'18094','Belén De Los Andaquíes',NULL,NULL),(349,46,9,'18150','Cartagena Del Chairá',NULL,NULL),(350,46,9,'18205','Curillo',NULL,NULL),(351,46,9,'18247','El Doncello ',NULL,NULL),(352,46,9,'18256','El Paujíl ',NULL,NULL),(353,46,9,'18410','La Montañita ',NULL,NULL),(354,46,9,'18460','Milán',NULL,NULL),(355,46,9,'18479','Morelia',NULL,NULL),(356,46,9,'18592','Puerto Rico ',NULL,NULL),(357,46,9,'18610','San José Del Fragua',NULL,NULL),(358,46,9,'18753','San Vicente Del Caguán',NULL,NULL),(359,46,9,'18756','Solano',NULL,NULL),(360,46,9,'18785','Solita',NULL,NULL),(361,46,9,'18860','Valparaíso',NULL,NULL),(362,46,11,'19001','Popayán',NULL,NULL),(363,46,11,'19022','Almaguer',NULL,NULL),(364,46,11,'19050','Argelia',NULL,NULL),(365,46,11,'19075','Balboa',NULL,NULL),(366,46,11,'19100','Bolívar',NULL,NULL),(367,46,11,'19110','Buenos Aires ',NULL,NULL),(368,46,11,'19130','Cajibío',NULL,NULL),(369,46,11,'19137','Caldono',NULL,NULL),(370,46,11,'19142','Caloto',NULL,NULL),(371,46,11,'19212','Corinto',NULL,NULL),(372,46,11,'19256','El Tambo ',NULL,NULL),(373,46,11,'19290','Florencia',NULL,NULL),(374,46,11,'19300','Guachené',NULL,NULL),(375,46,11,'19318','Guapí',NULL,NULL),(376,46,11,'19355','Inzá',NULL,NULL),(377,46,11,'19364','Jambaló',NULL,NULL),(378,46,11,'19392','La Sierra ',NULL,NULL),(379,46,11,'19397','La Vega ',NULL,NULL),(380,46,11,'19418','López De Micay',NULL,NULL),(381,46,11,'19450','Mercaderes',NULL,NULL),(382,46,11,'19455','Miranda',NULL,NULL),(383,46,11,'19473','Morales',NULL,NULL),(384,46,11,'19513','Padilla',NULL,NULL),(385,46,11,'19517','Páez',NULL,NULL),(386,46,11,'19532','Patía',NULL,NULL),(387,46,11,'19533','Piamonte',NULL,NULL),(388,46,11,'19548','Piendamó - Tunía',NULL,NULL),(389,46,11,'19573','Puerto Tejada ',NULL,NULL),(390,46,11,'19585','Puracé',NULL,NULL),(391,46,11,'19622','Rosas',NULL,NULL),(392,46,11,'19693','San Sebastián ',NULL,NULL),(393,46,11,'19698','Santander De Quilichao',NULL,NULL),(394,46,11,'19701','Santa Rosa ',NULL,NULL),(395,46,11,'19743','Silvia',NULL,NULL),(396,46,11,'19760','Sotara',NULL,NULL),(397,46,11,'19780','Suárez',NULL,NULL),(398,46,11,'19785','Sucre',NULL,NULL),(399,46,11,'19807','Timbío',NULL,NULL),(400,46,11,'19809','Timbiquí',NULL,NULL),(401,46,11,'19821','Toribío',NULL,NULL),(402,46,11,'19824','Totoró',NULL,NULL),(403,46,11,'19845','Villa Rica ',NULL,NULL),(404,46,12,'20001','Valledupar',NULL,NULL),(405,46,12,'20011','Aguachica',NULL,NULL),(406,46,12,'20013','Agustín Codazzi ',NULL,NULL),(407,46,12,'20032','Astrea',NULL,NULL),(408,46,12,'20045','Becerril',NULL,NULL),(409,46,12,'20060','Bosconia',NULL,NULL),(410,46,12,'20175','Chimichagua',NULL,NULL),(411,46,12,'20178','Chiriguaná',NULL,NULL),(412,46,12,'20228','Curumaní',NULL,NULL),(413,46,12,'20238','El Copey ',NULL,NULL),(414,46,12,'20250','El Paso ',NULL,NULL),(415,46,12,'20295','Gamarra',NULL,NULL),(416,46,12,'20310','González',NULL,NULL),(417,46,12,'20383','La Gloria ',NULL,NULL),(418,46,12,'20400','La Jagua De Ibirico',NULL,NULL),(419,46,12,'20443','Manaure Balcón Del Cesar',NULL,NULL),(420,46,12,'20517','Pailitas',NULL,NULL),(421,46,12,'20550','Pelaya',NULL,NULL),(422,46,12,'20570','Pueblo Bello ',NULL,NULL),(423,46,12,'20614','Río De Oro',NULL,NULL),(424,46,12,'20621','La Paz ',NULL,NULL),(425,46,12,'20710','San Alberto ',NULL,NULL),(426,46,12,'20750','San Diego ',NULL,NULL),(427,46,12,'20770','San Martín ',NULL,NULL),(428,46,12,'20787','Tamalameque',NULL,NULL),(429,46,14,'23001','Montería',NULL,NULL),(430,46,14,'23068','Ayapel',NULL,NULL),(431,46,14,'23079','Buenavista',NULL,NULL),(432,46,14,'23090','Canalete',NULL,NULL),(433,46,14,'23162','Cereté',NULL,NULL),(434,46,14,'23168','Chimá',NULL,NULL),(435,46,14,'23182','Chinú',NULL,NULL),(436,46,14,'23189','Ciénaga De Oro',NULL,NULL),(437,46,14,'23300','Cotorra',NULL,NULL),(438,46,14,'23350','La Apartada ',NULL,NULL),(439,46,14,'23417','Lorica',NULL,NULL),(440,46,14,'23419','Los Córdobas ',NULL,NULL),(441,46,14,'23464','Momil',NULL,NULL),(442,46,14,'23466','Montelíbano',NULL,NULL),(443,46,14,'23500','Moñitos',NULL,NULL),(444,46,14,'23555','Planeta Rica',NULL,NULL),(445,46,14,'23570','Pueblo Nuevo ',NULL,NULL),(446,46,14,'23574','Puerto Escondido ',NULL,NULL),(447,46,14,'23580','Puerto Libertador ',NULL,NULL),(448,46,14,'23586','Purísima De La Concepción',NULL,NULL),(449,46,14,'23660','Sahagún',NULL,NULL),(450,46,14,'23670','San Andrés De Sotavento',NULL,NULL),(451,46,14,'23672','San Antero ',NULL,NULL),(452,46,14,'23675','San Bernardo Del Viento',NULL,NULL),(453,46,14,'23678','San Carlos ',NULL,NULL),(454,46,14,'23682','San José De Uré',NULL,NULL),(455,46,14,'23686','San Pelayo ',NULL,NULL),(456,46,14,'23807','Tierralta',NULL,NULL),(457,46,14,'23815','Tuchín',NULL,NULL),(458,46,14,'23855','Valencia',NULL,NULL),(459,46,15,'25001','Agua De Dios',NULL,NULL),(460,46,15,'25019','Albán',NULL,NULL),(461,46,15,'25035','Anapoima',NULL,NULL),(462,46,15,'25040','Anolaima',NULL,NULL),(463,46,15,'25053','Arbeláez',NULL,NULL),(464,46,15,'25086','Beltrán',NULL,NULL),(465,46,15,'25095','Bituima',NULL,NULL),(466,46,15,'25099','Bojacá',NULL,NULL),(467,46,15,'25120','Cabrera',NULL,NULL),(468,46,15,'25123','Cachipay',NULL,NULL),(469,46,15,'25126','Cajicá',NULL,NULL),(470,46,15,'25148','Caparrapí',NULL,NULL),(471,46,15,'25151','Cáqueza',NULL,NULL),(472,46,15,'25154','Carmen De Carupa',NULL,NULL),(473,46,15,'25168','Chaguaní',NULL,NULL),(474,46,15,'25175','Chía',NULL,NULL),(475,46,15,'25178','Chipaque',NULL,NULL),(476,46,15,'25181','Choachí',NULL,NULL),(477,46,15,'25183','Chocontá',NULL,NULL),(478,46,15,'25200','Cogua',NULL,NULL),(479,46,15,'25214','Cota',NULL,NULL),(480,46,15,'25224','Cucunubá',NULL,NULL),(481,46,15,'25245','El Colegio ',NULL,NULL),(482,46,15,'25258','El Peñón ',NULL,NULL),(483,46,15,'25260','El Rosal ',NULL,NULL),(484,46,15,'25269','Facatativá',NULL,NULL),(485,46,15,'25279','Fómeque',NULL,NULL),(486,46,15,'25281','Fosca',NULL,NULL),(487,46,15,'25286','Funza',NULL,NULL),(488,46,15,'25288','Fúquene',NULL,NULL),(489,46,15,'25290','Fusagasugá',NULL,NULL),(490,46,15,'25293','Gachalá',NULL,NULL),(491,46,15,'25295','Gachancipá',NULL,NULL),(492,46,15,'25297','Gachetá',NULL,NULL),(493,46,15,'25299','Gama',NULL,NULL),(494,46,15,'25307','Girardot',NULL,NULL),(495,46,15,'25312','Granada',NULL,NULL),(496,46,15,'25317','Guachetá',NULL,NULL),(497,46,15,'25320','Guaduas',NULL,NULL),(498,46,15,'25322','Guasca',NULL,NULL),(499,46,15,'25324','Guataquí',NULL,NULL),(500,46,15,'25326','Guatavita',NULL,NULL),(501,46,15,'25328','Guayabal De Síquima',NULL,NULL),(502,46,15,'25335','Guayabetal',NULL,NULL),(503,46,15,'25339','Gutiérrez',NULL,NULL),(504,46,15,'25368','Jerusalén',NULL,NULL),(505,46,15,'25372','Junín',NULL,NULL),(506,46,15,'25377','La Calera ',NULL,NULL),(507,46,15,'25386','La Mesa ',NULL,NULL),(508,46,15,'25394','La Palma ',NULL,NULL),(509,46,15,'25398','La Peña ',NULL,NULL),(510,46,15,'25402','La Vega ',NULL,NULL),(511,46,15,'25407','Lenguazaque',NULL,NULL),(512,46,15,'25426','Machetá',NULL,NULL),(513,46,15,'25430','Madrid',NULL,NULL),(514,46,15,'25436','Manta',NULL,NULL),(515,46,15,'25438','Medina',NULL,NULL),(516,46,15,'25473','Mosquera',NULL,NULL),(517,46,15,'25483','Nariño',NULL,NULL),(518,46,15,'25486','Nemocón',NULL,NULL),(519,46,15,'25488','Nilo',NULL,NULL),(520,46,15,'25489','Nimaima',NULL,NULL),(521,46,15,'25491','Nocaima',NULL,NULL),(522,46,15,'25506','Venecia',NULL,NULL),(523,46,15,'25513','Pacho',NULL,NULL),(524,46,15,'25518','Paime',NULL,NULL),(525,46,15,'25524','Pandi',NULL,NULL),(526,46,15,'25530','Paratebueno',NULL,NULL),(527,46,15,'25535','Pasca',NULL,NULL),(528,46,15,'25572','Puerto Salgar ',NULL,NULL),(529,46,15,'25580','Pulí',NULL,NULL),(530,46,15,'25592','Quebradanegra',NULL,NULL),(531,46,15,'25594','Quetame',NULL,NULL),(532,46,15,'25596','Quipile',NULL,NULL),(533,46,15,'25599','Apulo',NULL,NULL),(534,46,15,'25612','Ricaurte',NULL,NULL),(535,46,15,'25645','San Antonio Del Tequendama',NULL,NULL),(536,46,15,'25649','San Bernardo ',NULL,NULL),(537,46,15,'25653','San Cayetano ',NULL,NULL),(538,46,15,'25658','San Francisco ',NULL,NULL),(539,46,15,'25662','San Juan De Rioseco',NULL,NULL),(540,46,15,'25718','Sasaima',NULL,NULL),(541,46,15,'25736','Sesquilé',NULL,NULL),(542,46,15,'25740','Sibaté',NULL,NULL),(543,46,15,'25743','Silvania',NULL,NULL),(544,46,15,'25745','Simijaca',NULL,NULL),(545,46,15,'25754','Soacha',NULL,NULL),(546,46,15,'25758','Sopó',NULL,NULL),(547,46,15,'25769','Subachoque',NULL,NULL),(548,46,15,'25772','Suesca',NULL,NULL),(549,46,15,'25777','Supatá',NULL,NULL),(550,46,15,'25779','Susa',NULL,NULL),(551,46,15,'25781','Sutatausa',NULL,NULL),(552,46,15,'25785','Tabio',NULL,NULL),(553,46,15,'25793','Tausa',NULL,NULL),(554,46,15,'25797','Tena',NULL,NULL),(555,46,15,'25799','Tenjo',NULL,NULL),(556,46,15,'25805','Tibacuy',NULL,NULL),(557,46,15,'25807','Tibirita',NULL,NULL),(558,46,15,'25815','Tocaima',NULL,NULL),(559,46,15,'25817','Tocancipá',NULL,NULL),(560,46,15,'25823','Topaipí',NULL,NULL),(561,46,15,'25839','Ubalá',NULL,NULL),(562,46,15,'25841','Ubaque',NULL,NULL),(563,46,15,'25843','Villa De San Diego De Ubaté',NULL,NULL),(564,46,15,'25845','Une',NULL,NULL),(565,46,15,'25851','Útica',NULL,NULL),(566,46,15,'25862','Vergara',NULL,NULL),(567,46,15,'25867','Vianí',NULL,NULL),(568,46,15,'25871','Villagómez',NULL,NULL),(569,46,15,'25873','Villapinzón',NULL,NULL),(570,46,15,'25875','Villeta',NULL,NULL),(571,46,15,'25878','Viotá',NULL,NULL),(572,46,15,'25885','Yacopí',NULL,NULL),(573,46,15,'25898','Zipacón',NULL,NULL),(574,46,15,'25899','Zipaquirá',NULL,NULL),(575,46,13,'27001','Quibdó',NULL,NULL),(576,46,13,'27006','Acandí',NULL,NULL),(577,46,13,'27025','Alto Baudó ',NULL,NULL),(578,46,13,'27050','Atrato',NULL,NULL),(579,46,13,'27073','Bagadó',NULL,NULL),(580,46,13,'27075','Bahía Solano ',NULL,NULL),(581,46,13,'27077','Bajo Baudó ',NULL,NULL),(582,46,13,'27099','Bojayá',NULL,NULL),(583,46,13,'27135','El Cantón Del San Pablo ',NULL,NULL),(584,46,13,'27150','Carmen Del Darién',NULL,NULL),(585,46,13,'27160','Cértegui',NULL,NULL),(586,46,13,'27205','Condoto',NULL,NULL),(587,46,13,'27245','El Carmen De Atrato',NULL,NULL),(588,46,13,'27250','El Litoral Del San Juan ',NULL,NULL),(589,46,13,'27361','Istmina',NULL,NULL),(590,46,13,'27372','Juradó',NULL,NULL),(591,46,13,'27413','Lloró',NULL,NULL),(592,46,13,'27425','Medio Atrato ',NULL,NULL),(593,46,13,'27430','Medio Baudó ',NULL,NULL),(594,46,13,'27450','Medio San Juan',NULL,NULL),(595,46,13,'27491','Nóvita',NULL,NULL),(596,46,13,'27495','Nuquí',NULL,NULL),(597,46,13,'27580','Río Iró ',NULL,NULL),(598,46,13,'27600','Río Quito ',NULL,NULL),(599,46,13,'27615','Riosucio',NULL,NULL),(600,46,13,'27660','San José Del Palmar',NULL,NULL),(601,46,13,'27745','Sipí',NULL,NULL),(602,46,13,'27787','Tadó',NULL,NULL),(603,46,13,'27800','Unguía',NULL,NULL),(604,46,13,'27810','Unión Panamericana ',NULL,NULL),(605,46,18,'41001','Neiva',NULL,NULL),(606,46,18,'41006','Acevedo',NULL,NULL),(607,46,18,'41013','Agrado',NULL,NULL),(608,46,18,'41016','Aipe',NULL,NULL),(609,46,18,'41020','Algeciras',NULL,NULL),(610,46,18,'41026','Altamira',NULL,NULL),(611,46,18,'41078','Baraya',NULL,NULL),(612,46,18,'41132','Campoalegre',NULL,NULL),(613,46,18,'41206','Colombia',NULL,NULL),(614,46,18,'41244','Elías',NULL,NULL),(615,46,18,'41298','Garzón',NULL,NULL),(616,46,18,'41306','Gigante',NULL,NULL),(617,46,18,'41319','Guadalupe',NULL,NULL),(618,46,18,'41349','Hobo',NULL,NULL),(619,46,18,'41357','Íquira',NULL,NULL),(620,46,18,'41359','Isnos',NULL,NULL),(621,46,18,'41378','La Argentina ',NULL,NULL),(622,46,18,'41396','La Plata ',NULL,NULL),(623,46,18,'41483','Nátaga',NULL,NULL),(624,46,18,'41503','Oporapa',NULL,NULL),(625,46,18,'41518','Paicol',NULL,NULL),(626,46,18,'41524','Palermo',NULL,NULL),(627,46,18,'41530','Palestina',NULL,NULL),(628,46,18,'41548','Pital',NULL,NULL),(629,46,18,'41551','Pitalito',NULL,NULL),(630,46,18,'41615','Rivera',NULL,NULL),(631,46,18,'41660','Saladoblanco',NULL,NULL),(632,46,18,'41668','San Agustín ',NULL,NULL),(633,46,18,'41676','Santa María ',NULL,NULL),(634,46,18,'41770','Suaza',NULL,NULL),(635,46,18,'41791','Tarqui',NULL,NULL),(636,46,18,'41797','Tesalia',NULL,NULL),(637,46,18,'41799','Tello',NULL,NULL),(638,46,18,'41801','Teruel',NULL,NULL),(639,46,18,'41807','Timaná',NULL,NULL),(640,46,18,'41872','Villavieja',NULL,NULL),(641,46,18,'41885','Yaguará',NULL,NULL),(642,46,19,'44001','Riohacha',NULL,NULL),(643,46,19,'44035','Albania',NULL,NULL),(644,46,19,'44078','Barrancas',NULL,NULL),(645,46,19,'44090','Dibulla',NULL,NULL),(646,46,19,'44098','Distracción',NULL,NULL),(647,46,19,'44110','El Molino ',NULL,NULL),(648,46,19,'44279','Fonseca',NULL,NULL),(649,46,19,'44378','Hatonuevo',NULL,NULL),(650,46,19,'44420','La Jagua Del Pilar',NULL,NULL),(651,46,19,'44430','Maicao',NULL,NULL),(652,46,19,'44560','Manaure',NULL,NULL),(653,46,19,'44650','San Juan Del Cesar',NULL,NULL),(654,46,19,'44847','Uribia',NULL,NULL),(655,46,19,'44855','Urumita',NULL,NULL),(656,46,19,'44874','Villanueva',NULL,NULL),(657,46,20,'47001','Santa Marta ',NULL,NULL),(658,46,20,'47030','Algarrobo',NULL,NULL),(659,46,20,'47053','Aracataca',NULL,NULL),(660,46,20,'47058','Ariguaní',NULL,NULL),(661,46,20,'47161','Cerro De San Antonio',NULL,NULL),(662,46,20,'47170','Chivolo',NULL,NULL),(663,46,20,'47189','Ciénaga',NULL,NULL),(664,46,20,'47205','Concordia',NULL,NULL),(665,46,20,'47245','El Banco ',NULL,NULL),(666,46,20,'47258','El Piñón ',NULL,NULL),(667,46,20,'47268','El Retén ',NULL,NULL),(668,46,20,'47288','Fundación',NULL,NULL),(669,46,20,'47318','Guamal',NULL,NULL),(670,46,20,'47460','Nueva Granada ',NULL,NULL),(671,46,20,'47541','Pedraza',NULL,NULL),(672,46,20,'47545','Pijiño Del Carmen',NULL,NULL),(673,46,20,'47551','Pivijay',NULL,NULL),(674,46,20,'47555','Plato',NULL,NULL),(675,46,20,'47570','Puebloviejo',NULL,NULL),(676,46,20,'47605','Remolino',NULL,NULL),(677,46,20,'47660','Sabanas De San Ángel',NULL,NULL),(678,46,20,'47675','Salamina',NULL,NULL),(679,46,20,'47692','San Sebastián De Buenavista',NULL,NULL),(680,46,20,'47703','San Zenón ',NULL,NULL),(681,46,20,'47707','Santa Ana ',NULL,NULL),(682,46,20,'47720','Santa Bárbara De Pinto',NULL,NULL),(683,46,20,'47745','Sitionuevo',NULL,NULL),(684,46,20,'47798','Tenerife',NULL,NULL),(685,46,20,'47960','Zapayán',NULL,NULL),(686,46,20,'47980','Zona Bananera ',NULL,NULL),(687,46,21,'50001','Villavicencio',NULL,NULL),(688,46,21,'50006','Acacías',NULL,NULL),(689,46,21,'50110','Barranca De Upía',NULL,NULL),(690,46,21,'50124','Cabuyaro',NULL,NULL),(691,46,21,'50150','Castilla La Nueva',NULL,NULL),(692,46,21,'50223','Cubarral',NULL,NULL),(693,46,21,'50226','Cumaral',NULL,NULL),(694,46,21,'50245','El Calvario ',NULL,NULL),(695,46,21,'50251','El Castillo ',NULL,NULL),(696,46,21,'50270','El Dorado ',NULL,NULL),(697,46,21,'50287','Fuente De Oro',NULL,NULL),(698,46,21,'50313','Granada',NULL,NULL),(699,46,21,'50318','Guamal',NULL,NULL),(700,46,21,'50325','Mapiripán',NULL,NULL),(701,46,21,'50330','Mesetas',NULL,NULL),(702,46,21,'50350','La Macarena ',NULL,NULL),(703,46,21,'50370','Uribe',NULL,NULL),(704,46,21,'50400','Lejanías',NULL,NULL),(705,46,21,'50450','Puerto Concordia ',NULL,NULL),(706,46,21,'50568','Puerto Gaitán ',NULL,NULL),(707,46,21,'50573','Puerto López ',NULL,NULL),(708,46,21,'50577','Puerto Lleras ',NULL,NULL),(709,46,21,'50590','Puerto Rico ',NULL,NULL),(710,46,21,'50606','Restrepo',NULL,NULL),(711,46,21,'50680','San Carlos De Guaroa',NULL,NULL),(712,46,21,'50683','San Juan De Arama',NULL,NULL),(713,46,21,'50686','San Juanito ',NULL,NULL),(714,46,21,'50689','San Martín ',NULL,NULL),(715,46,21,'50711','Vistahermosa',NULL,NULL),(716,46,22,'52001','Pasto',NULL,NULL),(717,46,22,'52019','Albán',NULL,NULL),(718,46,22,'52022','Aldana',NULL,NULL),(719,46,22,'52036','Ancuyá',NULL,NULL),(720,46,22,'52051','Arboleda',NULL,NULL),(721,46,22,'52079','Barbacoas',NULL,NULL),(722,46,22,'52083','Belén',NULL,NULL),(723,46,22,'52110','Buesaco',NULL,NULL),(724,46,22,'52203','Colón',NULL,NULL),(725,46,22,'52207','Consacá',NULL,NULL),(726,46,22,'52210','Contadero',NULL,NULL),(727,46,22,'52215','Córdoba',NULL,NULL),(728,46,22,'52224','Cuaspúd',NULL,NULL),(729,46,22,'52227','Cumbal',NULL,NULL),(730,46,22,'52233','Cumbitara',NULL,NULL),(731,46,22,'52240','Chachagüí',NULL,NULL),(732,46,22,'52250','El Charco ',NULL,NULL),(733,46,22,'52254','El Peñol ',NULL,NULL),(734,46,22,'52256','El Rosario ',NULL,NULL),(735,46,22,'52258','El Tablón De Gómez',NULL,NULL),(736,46,22,'52260','El Tambo ',NULL,NULL),(737,46,22,'52287','Funes',NULL,NULL),(738,46,22,'52317','Guachucal',NULL,NULL),(739,46,22,'52320','Guaitarilla',NULL,NULL),(740,46,22,'52323','Gualmatán',NULL,NULL),(741,46,22,'52352','Iles',NULL,NULL),(742,46,22,'52354','Imués',NULL,NULL),(743,46,22,'52356','Ipiales',NULL,NULL),(744,46,22,'52378','La Cruz ',NULL,NULL),(745,46,22,'52381','La Florida ',NULL,NULL),(746,46,22,'52385','La Llanada ',NULL,NULL),(747,46,22,'52390','La Tola ',NULL,NULL),(748,46,22,'52399','La Unión ',NULL,NULL),(749,46,22,'52405','Leiva',NULL,NULL),(750,46,22,'52411','Linares',NULL,NULL),(751,46,22,'52418','Los Andes ',NULL,NULL),(752,46,22,'52427','Magüí',NULL,NULL),(753,46,22,'52435','Mallama',NULL,NULL),(754,46,22,'52473','Mosquera',NULL,NULL),(755,46,22,'52480','Nariño',NULL,NULL),(756,46,22,'52490','Olaya Herrera ',NULL,NULL),(757,46,22,'52506','Ospina',NULL,NULL),(758,46,22,'52520','Francisco Pizarro ',NULL,NULL),(759,46,22,'52540','Policarpa',NULL,NULL),(760,46,22,'52560','Potosí',NULL,NULL),(761,46,22,'52565','Providencia',NULL,NULL),(762,46,22,'52573','Puerres',NULL,NULL),(763,46,22,'52585','Pupiales',NULL,NULL),(764,46,22,'52612','Ricaurte',NULL,NULL),(765,46,22,'52621','Roberto Payán ',NULL,NULL),(766,46,22,'52678','Samaniego',NULL,NULL),(767,46,22,'52683','Sandoná',NULL,NULL),(768,46,22,'52685','San Bernardo ',NULL,NULL),(769,46,22,'52687','San Lorenzo ',NULL,NULL),(770,46,22,'52693','San Pablo ',NULL,NULL),(771,46,22,'52694','San Pedro De Cartago',NULL,NULL),(772,46,22,'52696','Santa Bárbara ',NULL,NULL),(773,46,22,'52699','Santacruz',NULL,NULL),(774,46,22,'52720','Sapuyes',NULL,NULL),(775,46,22,'52786','Taminango',NULL,NULL),(776,46,22,'52788','Tangua',NULL,NULL),(777,46,22,'52835','San Andrés De Tumaco',NULL,NULL),(778,46,22,'52838','Túquerres',NULL,NULL),(779,46,22,'52885','Yacuanquer',NULL,NULL),(780,46,23,'54001','San José De Cúcuta',NULL,NULL),(781,46,23,'54003','Ábrego',NULL,NULL),(782,46,23,'54051','Arboledas',NULL,NULL),(783,46,23,'54099','Bochalema',NULL,NULL),(784,46,23,'54109','Bucarasica',NULL,NULL),(785,46,23,'54125','Cácota',NULL,NULL),(786,46,23,'54128','Cáchira',NULL,NULL),(787,46,23,'54172','Chinácota',NULL,NULL),(788,46,23,'54174','Chitagá',NULL,NULL),(789,46,23,'54206','Convención',NULL,NULL),(790,46,23,'54223','Cucutilla',NULL,NULL),(791,46,23,'54239','Durania',NULL,NULL),(792,46,23,'54245','El Carmen ',NULL,NULL),(793,46,23,'54250','El Tarra ',NULL,NULL),(794,46,23,'54261','El Zulia ',NULL,NULL),(795,46,23,'54313','Gramalote',NULL,NULL),(796,46,23,'54344','Hacarí',NULL,NULL),(797,46,23,'54347','Herrán',NULL,NULL),(798,46,23,'54377','Labateca',NULL,NULL),(799,46,23,'54385','La Esperanza ',NULL,NULL),(800,46,23,'54398','La Playa ',NULL,NULL),(801,46,23,'54405','Los Patios ',NULL,NULL),(802,46,23,'54418','Lourdes',NULL,NULL),(803,46,23,'54480','Mutiscua',NULL,NULL),(804,46,23,'54498','Ocaña',NULL,NULL),(805,46,23,'54518','Pamplona',NULL,NULL),(806,46,23,'54520','Pamplonita',NULL,NULL),(807,46,23,'54553','Puerto Santander ',NULL,NULL),(808,46,23,'54599','Ragonvalia',NULL,NULL),(809,46,23,'54660','Salazar',NULL,NULL),(810,46,23,'54670','San Calixto ',NULL,NULL),(811,46,23,'54673','San Cayetano ',NULL,NULL),(812,46,23,'54680','Santiago',NULL,NULL),(813,46,23,'54720','Sardinata',NULL,NULL),(814,46,23,'54743','Silos',NULL,NULL),(815,46,23,'54800','Teorama',NULL,NULL),(816,46,23,'54810','Tibú',NULL,NULL),(817,46,23,'54820','Toledo',NULL,NULL),(818,46,23,'54871','Villa Caro ',NULL,NULL),(819,46,23,'54874','Villa Del Rosario',NULL,NULL),(820,46,25,'63001','Armenia',NULL,NULL),(821,46,25,'63111','Buenavista',NULL,NULL),(822,46,25,'63130','Calarcá',NULL,NULL),(823,46,25,'63190','Circasia',NULL,NULL),(824,46,25,'63212','Córdoba',NULL,NULL),(825,46,25,'63272','Filandia',NULL,NULL),(826,46,25,'63302','Génova',NULL,NULL),(827,46,25,'63401','La Tebaida ',NULL,NULL),(828,46,25,'63470','Montenegro',NULL,NULL),(829,46,25,'63548','Pijao',NULL,NULL),(830,46,25,'63594','Quimbaya',NULL,NULL),(831,46,25,'63690','Salento',NULL,NULL),(832,46,26,'66001','Pereira',NULL,NULL),(833,46,26,'66045','Apía',NULL,NULL),(834,46,26,'66075','Balboa',NULL,NULL),(835,46,26,'66088','Belén De Umbría',NULL,NULL),(836,46,26,'66170','Dosquebradas',NULL,NULL),(837,46,26,'66318','Guática',NULL,NULL),(838,46,26,'66383','La Celia ',NULL,NULL),(839,46,26,'66400','La Virginia ',NULL,NULL),(840,46,26,'66440','Marsella',NULL,NULL),(841,46,26,'66456','Mistrató',NULL,NULL),(842,46,26,'66572','Pueblo Rico ',NULL,NULL),(843,46,26,'66594','Quinchía',NULL,NULL),(844,46,26,'66682','Santa Rosa De Cabal',NULL,NULL),(845,46,26,'66687','Santuario',NULL,NULL),(846,46,28,'68001','Bucaramanga',NULL,NULL),(847,46,28,'68013','Aguada',NULL,NULL),(848,46,28,'68020','Albania',NULL,NULL),(849,46,28,'68051','Aratoca',NULL,NULL),(850,46,28,'68077','Barbosa',NULL,NULL),(851,46,28,'68079','Barichara',NULL,NULL),(852,46,28,'68081','Barrancabermeja',NULL,NULL),(853,46,28,'68092','Betulia',NULL,NULL),(854,46,28,'68101','Bolívar',NULL,NULL),(855,46,28,'68121','Cabrera',NULL,NULL),(856,46,28,'68132','California',NULL,NULL),(857,46,28,'68147','Capitanejo',NULL,NULL),(858,46,28,'68152','Carcasí',NULL,NULL),(859,46,28,'68160','Cepitá',NULL,NULL),(860,46,28,'68162','Cerrito',NULL,NULL),(861,46,28,'68167','Charalá',NULL,NULL),(862,46,28,'68169','Charta',NULL,NULL),(863,46,28,'68176','Chima',NULL,NULL),(864,46,28,'68179','Chipatá',NULL,NULL),(865,46,28,'68190','Cimitarra',NULL,NULL),(866,46,28,'68207','Concepción',NULL,NULL),(867,46,28,'68209','Confines',NULL,NULL),(868,46,28,'68211','Contratación',NULL,NULL),(869,46,28,'68217','Coromoro',NULL,NULL),(870,46,28,'68229','Curití',NULL,NULL),(871,46,28,'68235','El Carmen De Chucurí',NULL,NULL),(872,46,28,'68245','El Guacamayo ',NULL,NULL),(873,46,28,'68250','El Peñón ',NULL,NULL),(874,46,28,'68255','El Playón ',NULL,NULL),(875,46,28,'68264','Encino',NULL,NULL),(876,46,28,'68266','Enciso',NULL,NULL),(877,46,28,'68271','Florián',NULL,NULL),(878,46,28,'68276','Floridablanca',NULL,NULL),(879,46,28,'68296','Galán',NULL,NULL),(880,46,28,'68298','Gámbita',NULL,NULL),(881,46,28,'68307','Girón',NULL,NULL),(882,46,28,'68318','Guaca',NULL,NULL),(883,46,28,'68320','Guadalupe',NULL,NULL),(884,46,28,'68322','Guapotá',NULL,NULL),(885,46,28,'68324','Guavatá',NULL,NULL),(886,46,28,'68327','Güepsa',NULL,NULL),(887,46,28,'68344','Hato',NULL,NULL),(888,46,28,'68368','Jesús María ',NULL,NULL),(889,46,28,'68370','Jordán',NULL,NULL),(890,46,28,'68377','La Belleza ',NULL,NULL),(891,46,28,'68385','Landázuri',NULL,NULL),(892,46,28,'68397','La Paz ',NULL,NULL),(893,46,28,'68406','Lebrija',NULL,NULL),(894,46,28,'68418','Los Santos ',NULL,NULL),(895,46,28,'68425','Macaravita',NULL,NULL),(896,46,28,'68432','Málaga',NULL,NULL),(897,46,28,'68444','Matanza',NULL,NULL),(898,46,28,'68464','Mogotes',NULL,NULL),(899,46,28,'68468','Molagavita',NULL,NULL),(900,46,28,'68498','Ocamonte',NULL,NULL),(901,46,28,'68500','Oiba',NULL,NULL),(902,46,28,'68502','Onzaga',NULL,NULL),(903,46,28,'68522','Palmar',NULL,NULL),(904,46,28,'68524','Palmas Del Socorro',NULL,NULL),(905,46,28,'68533','Páramo',NULL,NULL),(906,46,28,'68547','Piedecuesta',NULL,NULL),(907,46,28,'68549','Pinchote',NULL,NULL),(908,46,28,'68572','Puente Nacional ',NULL,NULL),(909,46,28,'68573','Puerto Parra ',NULL,NULL),(910,46,28,'68575','Puerto Wilches ',NULL,NULL),(911,46,28,'68615','Rionegro',NULL,NULL),(912,46,28,'68655','Sabana De Torres',NULL,NULL),(913,46,28,'68669','San Andrés ',NULL,NULL),(914,46,28,'68673','San Benito ',NULL,NULL),(915,46,28,'68679','San Gil ',NULL,NULL),(916,46,28,'68682','San Joaquín ',NULL,NULL),(917,46,28,'68684','San José De Miranda',NULL,NULL),(918,46,28,'68686','San Miguel ',NULL,NULL),(919,46,28,'68689','San Vicente De Chucurí',NULL,NULL),(920,46,28,'68705','Santa Bárbara ',NULL,NULL),(921,46,28,'68720','Santa Helena Del Opón',NULL,NULL),(922,46,28,'68745','Simacota',NULL,NULL),(923,46,28,'68755','Socorro',NULL,NULL),(924,46,28,'68770','Suaita',NULL,NULL),(925,46,28,'68773','Sucre',NULL,NULL),(926,46,28,'68780','Suratá',NULL,NULL),(927,46,28,'68820','Tona',NULL,NULL),(928,46,28,'68855','Valle De San José',NULL,NULL),(929,46,28,'68861','Vélez',NULL,NULL),(930,46,28,'68867','Vetas',NULL,NULL),(931,46,28,'68872','Villanueva',NULL,NULL),(932,46,28,'68895','Zapatoca',NULL,NULL),(933,46,29,'70001','Sincelejo',NULL,NULL),(934,46,29,'70110','Buenavista',NULL,NULL),(935,46,29,'70124','Caimito',NULL,NULL),(936,46,29,'70204','Colosó',NULL,NULL),(937,46,29,'70215','Corozal',NULL,NULL),(938,46,29,'70221','Coveñas',NULL,NULL),(939,46,29,'70230','Chalán',NULL,NULL),(940,46,29,'70233','El Roble ',NULL,NULL),(941,46,29,'70235','Galeras',NULL,NULL),(942,46,29,'70265','Guaranda',NULL,NULL),(943,46,29,'70400','La Unión ',NULL,NULL),(944,46,29,'70418','Los Palmitos ',NULL,NULL),(945,46,29,'70429','Majagual',NULL,NULL),(946,46,29,'70473','Morroa',NULL,NULL),(947,46,29,'70508','Ovejas',NULL,NULL),(948,46,29,'70523','Palmito',NULL,NULL),(949,46,29,'70670','Sampués',NULL,NULL),(950,46,29,'70678','San Benito Abad',NULL,NULL),(951,46,29,'70702','San Juan De Betulia',NULL,NULL),(952,46,29,'70708','San Marcos ',NULL,NULL),(953,46,29,'70713','San Onofre ',NULL,NULL),(954,46,29,'70717','San Pedro ',NULL,NULL),(955,46,29,'70742','San Luis De Sincé',NULL,NULL),(956,46,29,'70771','Sucre',NULL,NULL),(957,46,29,'70820','Santiago De Tolú',NULL,NULL),(958,46,29,'70823','Tolú Viejo ',NULL,NULL),(959,46,30,'73001','Ibagué',NULL,NULL),(960,46,30,'73024','Alpujarra',NULL,NULL),(961,46,30,'73026','Alvarado',NULL,NULL),(962,46,30,'73030','Ambalema',NULL,NULL),(963,46,30,'73043','Anzoátegui',NULL,NULL),(964,46,30,'73055','Armero',NULL,NULL),(965,46,30,'73067','Ataco',NULL,NULL),(966,46,30,'73124','Cajamarca',NULL,NULL),(967,46,30,'73148','Carmen De Apicalá',NULL,NULL),(968,46,30,'73152','Casabianca',NULL,NULL),(969,46,30,'73168','Chaparral',NULL,NULL),(970,46,30,'73200','Coello',NULL,NULL),(971,46,30,'73217','Coyaima',NULL,NULL),(972,46,30,'73226','Cunday',NULL,NULL),(973,46,30,'73236','Dolores',NULL,NULL),(974,46,30,'73268','Espinal',NULL,NULL),(975,46,30,'73270','Falan',NULL,NULL),(976,46,30,'73275','Flandes',NULL,NULL),(977,46,30,'73283','Fresno',NULL,NULL),(978,46,30,'73319','Guamo',NULL,NULL),(979,46,30,'73347','Herveo',NULL,NULL),(980,46,30,'73349','Honda',NULL,NULL),(981,46,30,'73352','Icononzo',NULL,NULL),(982,46,30,'73408','Lérida',NULL,NULL),(983,46,30,'73411','Líbano',NULL,NULL),(984,46,30,'73443','San Sebastián De Mariquita',NULL,NULL),(985,46,30,'73449','Melgar',NULL,NULL),(986,46,30,'73461','Murillo',NULL,NULL),(987,46,30,'73483','Natagaima',NULL,NULL),(988,46,30,'73504','Ortega',NULL,NULL),(989,46,30,'73520','Palocabildo',NULL,NULL),(990,46,30,'73547','Piedras',NULL,NULL),(991,46,30,'73555','Planadas',NULL,NULL),(992,46,30,'73563','Prado',NULL,NULL),(993,46,30,'73585','Purificación',NULL,NULL),(994,46,30,'73616','Rioblanco',NULL,NULL),(995,46,30,'73622','Roncesvalles',NULL,NULL),(996,46,30,'73624','Rovira',NULL,NULL),(997,46,30,'73671','Saldaña',NULL,NULL),(998,46,30,'73675','San Antonio ',NULL,NULL),(999,46,30,'73678','San Luis ',NULL,NULL),(1000,46,30,'73686','Santa Isabel ',NULL,NULL),(1001,46,30,'73770','Suárez',NULL,NULL),(1002,46,30,'73854','Valle De San Juan',NULL,NULL),(1003,46,30,'73861','Venadillo',NULL,NULL),(1004,46,30,'73870','Villahermosa',NULL,NULL),(1005,46,30,'73873','Villarrica',NULL,NULL),(1006,46,31,'76001','Cali',NULL,NULL),(1007,46,31,'76020','Alcalá',NULL,NULL),(1008,46,31,'76036','Andalucía',NULL,NULL),(1009,46,31,'76041','Ansermanuevo',NULL,NULL),(1010,46,31,'76054','Argelia',NULL,NULL),(1011,46,31,'76100','Bolívar',NULL,NULL),(1012,46,31,'76109','Buenaventura',NULL,NULL),(1013,46,31,'76111','Guadalajara De Buga',NULL,NULL),(1014,46,31,'76113','Bugalagrande',NULL,NULL),(1015,46,31,'76122','Caicedonia',NULL,NULL),(1016,46,31,'76126','Calima',NULL,NULL),(1017,46,31,'76130','Candelaria',NULL,NULL),(1018,46,31,'76147','Cartago',NULL,NULL),(1019,46,31,'76233','Dagua',NULL,NULL),(1020,46,31,'76243','El Águila ',NULL,NULL),(1021,46,31,'76246','El Cairo ',NULL,NULL),(1022,46,31,'76248','El Cerrito ',NULL,NULL),(1023,46,31,'76250','El Dovio ',NULL,NULL),(1024,46,31,'76275','Florida',NULL,NULL),(1025,46,31,'76306','Ginebra',NULL,NULL),(1026,46,31,'76318','Guacarí',NULL,NULL),(1027,46,31,'76364','Jamundí',NULL,NULL),(1028,46,31,'76377','La Cumbre ',NULL,NULL),(1029,46,31,'76400','La Unión ',NULL,NULL),(1030,46,31,'76403','La Victoria ',NULL,NULL),(1031,46,31,'76497','Obando',NULL,NULL),(1032,46,31,'76520','Palmira',NULL,NULL),(1033,46,31,'76563','Pradera',NULL,NULL),(1034,46,31,'76606','Restrepo',NULL,NULL),(1035,46,31,'76616','Riofrío',NULL,NULL),(1036,46,31,'76622','Roldanillo',NULL,NULL),(1037,46,31,'76670','San Pedro ',NULL,NULL),(1038,46,31,'76736','Sevilla',NULL,NULL),(1039,46,31,'76823','Toro',NULL,NULL),(1040,46,31,'76828','Trujillo',NULL,NULL),(1041,46,31,'76834','Tuluá',NULL,NULL),(1042,46,31,'76845','Ulloa',NULL,NULL),(1043,46,31,'76863','Versalles',NULL,NULL),(1044,46,31,'76869','Vijes',NULL,NULL),(1045,46,31,'76890','Yotoco',NULL,NULL),(1046,46,31,'76892','Yumbo',NULL,NULL),(1047,46,31,'76895','Zarzal',NULL,NULL),(1048,46,3,'81001','Arauca',NULL,NULL),(1049,46,3,'81065','Arauquita',NULL,NULL),(1050,46,3,'81220','Cravo Norte ',NULL,NULL),(1051,46,3,'81300','Fortul',NULL,NULL),(1052,46,3,'81591','Puerto Rondón ',NULL,NULL),(1053,46,3,'81736','Saravena',NULL,NULL),(1054,46,3,'81794','Tame',NULL,NULL),(1055,46,10,'85001','Yopal',NULL,NULL),(1056,46,10,'85010','Aguazul',NULL,NULL),(1057,46,10,'85015','Chámeza',NULL,NULL),(1058,46,10,'85125','Hato Corozal ',NULL,NULL),(1059,46,10,'85136','La Salina ',NULL,NULL),(1060,46,10,'85139','Maní',NULL,NULL),(1061,46,10,'85162','Monterrey',NULL,NULL),(1062,46,10,'85225','Nunchía',NULL,NULL),(1063,46,10,'85230','Orocué',NULL,NULL),(1064,46,10,'85250','Paz De Ariporo',NULL,NULL),(1065,46,10,'85263','Pore',NULL,NULL),(1066,46,10,'85279','Recetor',NULL,NULL),(1067,46,10,'85300','Sabanalarga',NULL,NULL),(1068,46,10,'85315','Sácama',NULL,NULL),(1069,46,10,'85325','San Luis De Palenque',NULL,NULL),(1070,46,10,'85400','Támara',NULL,NULL),(1071,46,10,'85410','Tauramena',NULL,NULL),(1072,46,10,'85430','Trinidad',NULL,NULL),(1073,46,10,'85440','Villanueva',NULL,NULL),(1074,46,24,'86001','Mocoa',NULL,NULL),(1075,46,24,'86219','Colón',NULL,NULL),(1076,46,24,'86320','Orito',NULL,NULL),(1077,46,24,'86568','Puerto Asís ',NULL,NULL),(1078,46,24,'86569','Puerto Caicedo ',NULL,NULL),(1079,46,24,'86571','Puerto Guzmán ',NULL,NULL),(1080,46,24,'86573','Puerto Leguízamo ',NULL,NULL),(1081,46,24,'86749','Sibundoy',NULL,NULL),(1082,46,24,'86755','San Francisco ',NULL,NULL),(1083,46,24,'86757','San Miguel ',NULL,NULL),(1084,46,24,'86760','Santiago',NULL,NULL),(1085,46,24,'86865','Valle Del Guamuez',NULL,NULL),(1086,46,24,'86885','Villagarzón',NULL,NULL),(1087,46,27,'88001','San Andrés ',NULL,NULL),(1088,46,27,'88564','Providencia',NULL,NULL),(1089,46,1,'91001','Leticia',NULL,NULL),(1090,46,1,'91263','El Encanto ',NULL,NULL),(1091,46,1,'91405','La Chorrera ',NULL,NULL),(1092,46,1,'91407','La Pedrera ',NULL,NULL),(1093,46,1,'91430','La Victoria ',NULL,NULL),(1094,46,1,'91460','Mirití - Paraná',NULL,NULL),(1095,46,1,'91530','Puerto Alegría ',NULL,NULL),(1096,46,1,'91536','Puerto Arica ',NULL,NULL),(1097,46,1,'91540','Puerto Nariño ',NULL,NULL),(1098,46,1,'91669','Puerto Santander ',NULL,NULL),(1099,46,1,'91798','Tarapacá',NULL,NULL),(1100,46,16,'94001','Inírida',NULL,NULL),(1101,46,16,'94343','Barranco Minas ',NULL,NULL),(1102,46,16,'94663','Mapiripana',NULL,NULL),(1103,46,16,'94883','San Felipe ',NULL,NULL),(1104,46,16,'94884','Puerto Colombia ',NULL,NULL),(1105,46,16,'94885','La Guadalupe ',NULL,NULL),(1106,46,16,'94886','Cacahual',NULL,NULL),(1107,46,16,'94887','Pana Pana ',NULL,NULL),(1108,46,16,'94888','Morichal',NULL,NULL),(1109,46,17,'95001','San José Del Guaviare',NULL,NULL),(1110,46,17,'95015','Calamar',NULL,NULL),(1111,46,17,'95025','El Retorno ',NULL,NULL),(1112,46,17,'95200','Miraflores',NULL,NULL),(1113,46,32,'97001','Mitú',NULL,NULL),(1114,46,32,'97161','Carurú',NULL,NULL),(1115,46,32,'97511','Pacoa',NULL,NULL),(1116,46,32,'97666','Taraira',NULL,NULL),(1117,46,32,'97777','Papunahua',NULL,NULL),(1118,46,32,'97889','Yavaraté',NULL,NULL),(1119,46,33,'99001','Puerto Carreño ',NULL,NULL),(1120,46,33,'99524','La Primavera ',NULL,NULL),(1121,46,33,'99624','Santa Rosalía ',NULL,NULL),(1122,46,33,'99773','Cumaribo',NULL,NULL);
/*!40000 ALTER TABLE `municipalities` ENABLE KEYS */;
UNLOCK TABLES;

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
-- Dumping data for table `payment_methods`
--

LOCK TABLES `payment_methods` WRITE;
/*!40000 ALTER TABLE `payment_methods` DISABLE KEYS */;
INSERT INTO `payment_methods` VALUES (2,'2','Crédito ACH',NULL,NULL),(3,'3','Débito ACH',NULL,NULL),(4,'4','Reversión débito de demanda ACH',NULL,NULL),(5,'5','Reversión crédito de demanda ACH ',NULL,NULL),(6,'6','Crédito de demanda ACH',NULL,NULL),(7,'7','Débito de demanda ACH',NULL,NULL),(8,'8','Mantener',NULL,NULL),(9,'9','Clearing Nacional o Regional',NULL,NULL),(10,'10','Efectivo',NULL,NULL),(11,'11','Reversión Crédito Ahorro',NULL,NULL),(12,'12','Reversión Débito Ahorro',NULL,NULL),(13,'13','Crédito Ahorro',NULL,NULL),(14,'14','Débito Ahorro',NULL,NULL),(15,'15','Bookentry Crédito',NULL,NULL),(16,'16','Bookentry Débito',NULL,NULL),(17,'17','Concentración de la demanda en efectivo /Desembolso Crédito (CCD)',NULL,NULL),(18,'18','Concentración de la demanda en efectivo / Desembolso (CCD) débito',NULL,NULL),(19,'19','Crédito Pago negocio corporativo (CTP)',NULL,NULL),(20,'20','Cheque',NULL,NULL),(21,'21','Poyecto bancario',NULL,NULL),(22,'22','Proyecto bancario certificado',NULL,NULL),(23,'23','Cheque bancario',NULL,NULL),(24,'24','Nota cambiaria esperando aceptación',NULL,NULL),(25,'25','Cheque certificado',NULL,NULL),(26,'26','Cheque Local',NULL,NULL),(27,'27','Débito Pago Neogcio Corporativo (CTP)',NULL,NULL),(28,'28','Crédito Negocio Intercambio Corporativo (CTX)',NULL,NULL),(29,'29','Débito Negocio Intercambio Corporativo (CTX)',NULL,NULL),(30,'30','Transferecia Crédito',NULL,NULL),(31,'31','Transferencia Débito',NULL,NULL),(32,'32','Concentración Efectivo / Desembolso Crédito plus (CCD+)',NULL,NULL),(33,'33','Concentración Efectivo / Desembolso Débito plus (CCD+)',NULL,NULL),(34,'34','Pago y depósito pre acordado (PPD)',NULL,NULL),(35,'35','Concentración efectivo ahorros / Desembolso Crédito (CCD)',NULL,NULL),(36,'36','Concentración efectivo ahorros / Desembolso Drédito (CCD)',NULL,NULL),(37,'37','Pago Negocio Corporativo Ahorros Crédito (CTP)',NULL,NULL),(38,'38','Pago Neogcio Corporativo Ahorros Débito (CTP)',NULL,NULL),(39,'39','Crédito Negocio Intercambio Corporativo (CTX)',NULL,NULL),(40,'40','Débito Negocio Intercambio Corporativo (CTX)',NULL,NULL),(41,'41','Concentración efectivo/Desembolso Crédito plus (CCD+)',NULL,NULL),(42,'42','Consiganción bancaria',NULL,NULL),(43,'43','Concentración efectivo / Desembolso Débito plus (CCD+)',NULL,NULL),(44,'44','Nota cambiaria',NULL,NULL),(45,'45','Transferencia Crédito Bancario',NULL,NULL),(46,'46','Transferencia Débito Interbancario',NULL,NULL),(47,'47','Transferencia Débito Bancaria',NULL,NULL),(48,'48','Tarjeta Crédito',NULL,NULL),(49,'49','Tarjeta Débito',NULL,NULL),(50,'50','Postgiro',NULL,NULL),(51,'51','Telex estándar bancario francés',NULL,NULL),(52,'52','Pago comercial urgente',NULL,NULL),(53,'53','Pago Tesorería Urgente',NULL,NULL),(54,'60','Nota promisoria',NULL,NULL),(55,'61','Nota promisoria firmada por el acreedor',NULL,NULL),(56,'62','Nota promisoria firmada por el acreedor, avalada por el banco',NULL,NULL),(57,'63','Nota promisoria firmada por el acreedor, avalada por un tercero',NULL,NULL),(58,'64','Nota promisoria firmada pro el banco',NULL,NULL),(59,'65','Nota promisoria firmada por un banco avalada por otro banco',NULL,NULL),(60,' 6','Nota promisoria firmada',NULL,NULL),(61,'67','Nota promisoria firmada por un tercero avalada por un banco',NULL,NULL),(62,'70','Retiro de nota por el por el acreedor',NULL,NULL),(63,'74','Retiro de nota por el por el acreedor sobre un banco',NULL,NULL),(64,'75','Retiro de nota por el acreedor, avalada por otro banco',NULL,NULL),(65,'76','Retiro de nota por el acreedor, sobre un banco avalada por un tercero',NULL,NULL),(66,'77','Retiro de una nota por el acreedor sobre un tercero',NULL,NULL),(67,'78','Retiro de una nota por el acreedor sobre un tercero avalada por un banco',NULL,NULL),(68,'91','Nota bancaria tranferible',NULL,NULL),(69,'92','Cheque local traferible',NULL,NULL),(70,'93','Giro referenciado',NULL,NULL),(71,'94','Giro urgente',NULL,NULL),(72,'95','Giro formato abierto',NULL,NULL),(73,'96','Método de pago solicitado no usuado',NULL,NULL),(74,'97','Clearing entre partners',NULL,NULL),(75,'ZZ','Acuerdo mutuo',NULL,NULL);
/*!40000 ALTER TABLE `payment_methods` ENABLE KEYS */;
UNLOCK TABLES;

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
-- Dumping data for table `taxes`
--

LOCK TABLES `taxes` WRITE;
/*!40000 ALTER TABLE `taxes` DISABLE KEYS */;
INSERT INTO `taxes` VALUES (1,'IVA','01','Impuesto al Valor Agregado',NULL,NULL),(3,'ICA','03','Impuesto de Industria y Comercio',NULL,NULL);
/*!40000 ALTER TABLE `taxes` ENABLE KEYS */;
UNLOCK TABLES;

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
-- Dumping data for table `tbl_clientes_comportamiento`
--

LOCK TABLES `tbl_clientes_comportamiento` WRITE;
/*!40000 ALTER TABLE `tbl_clientes_comportamiento` DISABLE KEYS */;
/*!40000 ALTER TABLE `tbl_clientes_comportamiento` ENABLE KEYS */;
UNLOCK TABLES;

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
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `tbl_config_vendedores`
--

LOCK TABLES `tbl_config_vendedores` WRITE;
/*!40000 ALTER TABLE `tbl_config_vendedores` DISABLE KEYS */;
INSERT INTO `tbl_config_vendedores` VALUES (1,0,'https://conta-basic.innovacion-digital.com/api-conta/public','','',15,NULL,0,'2026-05-19 16:16:39');
/*!40000 ALTER TABLE `tbl_config_vendedores` ENABLE KEYS */;
UNLOCK TABLES;

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
-- Dumping data for table `tbl_pedidos_vendedor`
--

LOCK TABLES `tbl_pedidos_vendedor` WRITE;
/*!40000 ALTER TABLE `tbl_pedidos_vendedor` DISABLE KEYS */;
/*!40000 ALTER TABLE `tbl_pedidos_vendedor` ENABLE KEYS */;
UNLOCK TABLES;

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
-- Dumping data for table `tbl_vendedores_movil`
--

LOCK TABLES `tbl_vendedores_movil` WRITE;
/*!40000 ALTER TABLE `tbl_vendedores_movil` DISABLE KEYS */;
/*!40000 ALTER TABLE `tbl_vendedores_movil` ENABLE KEYS */;
UNLOCK TABLES;

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
-- Dumping data for table `tblanticipo_movs`
--

LOCK TABLES `tblanticipo_movs` WRITE;
/*!40000 ALTER TABLE `tblanticipo_movs` DISABLE KEYS */;
/*!40000 ALTER TABLE `tblanticipo_movs` ENABLE KEYS */;
UNLOCK TABLES;

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
-- Dumping data for table `tblanticipos_cliente`
--

LOCK TABLES `tblanticipos_cliente` WRITE;
/*!40000 ALTER TABLE `tblanticipos_cliente` DISABLE KEYS */;
/*!40000 ALTER TABLE `tblanticipos_cliente` ENABLE KEYS */;
UNLOCK TABLES;

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
  `unidad_base` varchar(20) DEFAULT 'Unidad',
  `requiere_lote` tinyint(1) DEFAULT 0,
  `tiene_componentes` tinyint(1) DEFAULT 0,
  `Id_Etiqueta` int(11) DEFAULT NULL,
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
  KEY `idx_etiqueta` (`Id_Etiqueta`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3 COLLATE=utf8mb3_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `tblarticulos`
--

LOCK TABLES `tblarticulos` WRITE;
/*!40000 ALTER TABLE `tblarticulos` DISABLE KEYS */;
/*!40000 ALTER TABLE `tblarticulos` ENABLE KEYS */;
UNLOCK TABLES;

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
-- Dumping data for table `tblarticulos2`
--

LOCK TABLES `tblarticulos2` WRITE;
/*!40000 ALTER TABLE `tblarticulos2` DISABLE KEYS */;
INSERT INTO `tblarticulos2` VALUES (1,'1','0','DIADEMAS N-65BT',1,15,0,12,22000.0000,0.0000,0,50000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(2,'2','0','PARLANTE FLAME LIGHT 3\" GTS-1373',1,15,0,7,11000.0000,0.0000,0,25000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(3,'3','0','PARLANTE FLAME LIGHT 3\" GTS-1835',1,15,0,6,11000.0000,0.0000,0,25000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(4,'4','0','PARLANTE FLAME LIGHT 3\" GTS-1867',1,15,0,7,11000.0000,0.0000,0,25000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(5,'5','0','STANLEY MEDIANO TERMO 1.1',1,15,0,5,40000.0000,0.0000,0,75000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(6,'6','0','STANLEY COMBO TERMO',1,15,0,7,38000.0000,0.0000,0,65000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(7,'7','0','PROTECTOR CARGADOR SENCILLO',1,15,0,18,8000.0000,0.0000,0,24000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(8,'8','0','PROTECTOR CARGADOR FINO',1,15,0,9,12000.0000,0.0000,0,28000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(9,'9','0','PARLANTE RGB LIGHT UP',1,15,0,4,11000.0000,0.0000,0,25000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(10,'10','0','PARLANTEFANTASTIC QUALITY 1346',1,15,0,2,18000.0000,0.0000,0,30000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(11,'11','0','PARLANTE PORTABLE CILINDRO2165',1,15,0,6,22000.0000,0.0000,0,60000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(12,'12','0','PARLANTE FLAME LIGHT 1867',1,15,0,7,11000.0000,0.0000,0,30000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(13,'13','0','PARLANTE FANTASTIC QUALTY 4\" 1390',1,15,0,4,18000.0000,0.0000,0,40000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(14,'14','0','PARLANTE PREMIUM BT-OP103',1,15,0,2,180000.0000,0.0000,0,320000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(15,'15','0','PARLANTE Z TRONIC 10000',1,15,0,1,160000.0000,0.0000,0,300000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(16,'16','0','PARLANTE SONIVOX VS-SS2378',1,15,0,2,145000.0000,0.0000,0,280000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(17,'17','0','PARLANTE NIATEC 8WATTS NT-P9876',1,15,0,1,90000.0000,0.0000,0,180000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(18,'18','0','PARLANTE NIATEC 8W NT-P1342',1,15,0,1,90000.0000,0.0000,0,180000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(19,'19','0','PARLANTE TYG TG165C',1,15,0,2,25000.0000,0.0000,0,55000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(20,'20','0','PARLANTE JK-1119',1,15,0,1,45000.0000,0.0000,0,80000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(21,'21','0','PARLANTE MOBILE SPARK MS-2212BT',1,15,0,1,18000.0000,0.0000,0,40000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(22,'22','0','PARLANTE MOBILE SPAKER MS-2213BT',1,15,0,1,18000.0000,0.0000,0,40000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(23,'23','0','PARLANTE 4PLAY JB17049',1,15,0,1,36000.0000,0.0000,0,80000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(24,'24','0','HARVIC PR817',1,15,0,1,95000.0000,0.0000,0,190000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(25,'25','0','PARLANTE JBL ?P10PRO',1,15,0,4,95000.0000,0.0000,0,180000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(26,'26','0','PARLANTE MUSIC A13',1,15,0,2,65000.0000,0.0000,0,130000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(27,'27','0','RADIO BSKPLAY BP-R092BTS',1,15,0,2,55000.0000,0.0000,0,120000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(28,'28','0','RADIO COLDYIR ICF-18BT',1,15,0,2,38000.0000,0.0000,0,90000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(29,'29','0','RADIO BECK PLAY BP-R122USB',1,15,0,2,1.0000,0.0000,0,2.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(30,'30','0','RADIO NANOTEC NT-R1220',1,15,0,1,1.0000,0.0000,0,2.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(31,'31','0','RADIO NANOTEC NT-R1190',1,15,0,2,1.0000,0.0000,0,2.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(32,'32','0','MINI COMBO KR-718 IRON MAN',1,15,0,1,1.0000,0.0000,0,2.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(33,'33','0','MINI COMBO KR-718 HELLO KITY',1,15,0,1,25000.0000,0.0000,0,60000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(34,'34','0','LAMPARA LED MSUSHROOM HOUSE',1,15,0,1,1.0000,0.0000,0,2.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(35,'35','0','TABLETA CORN FENIX9 64GB',1,15,0,2,195000.0000,0.0000,0,310000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(36,'36','0','TABLETA SAMSUNG A9 64GB',1,15,0,4,430000.0000,0.0000,0,650000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(37,'37','0','TABLETA CORN MAGIC 9 36 64GB',1,15,0,1,195000.0000,0.0000,0,310000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(38,'38','0','TABLETA CORN STAR 9 64GB',1,15,0,1,195000.0000,0.0000,0,310000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(39,'39','0','STYLIUS PEN XS1307',1,15,0,3,18000.0000,0.0000,0,35000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(40,'40','0','STYLIUS PEN YS1308',1,15,0,2,18000.0000,0.0000,0,35000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(41,'41','0','DIADEMASUPR BASS B23BT',1,15,0,1,25000.0000,0.0000,0,60000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(42,'42','0','DIADEMA NEW HBX-950BT',1,15,0,1,30000.0000,0.0000,0,75000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(43,'43','0','DIADEMA MARKS BOSS BT-444',1,15,0,2,32000.0000,0.0000,0,70000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(44,'44','0','DIADEMA JBL P2962',1,15,0,1,60000.0000,0.0000,0,120000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(45,'45','0','DIADEMA FORST GH-40',1,15,0,1,28000.0000,0.0000,0,60000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(46,'46','0','DIADEMA AIRPOPS MAX GRANDE',1,15,0,4,110000.0000,0.0000,0,200000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(47,'47','0','DIADEMA AIRPOPS MAX PEQUE',1,15,0,1,70000.0000,0.0000,0,150000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(48,'48','0','SOPRTE CELULAR MOTO Y BICI HARVI',1,15,0,3,15000.0000,0.0000,0,30000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(49,'49','0','COMBO REFLECTOR LED PROFECIONAL',1,15,0,3,90000.0000,0.0000,0,180000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(50,'50','0','RADIO BOQUI TOQUI',1,15,0,1,75000.0000,0.0000,0,120000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(51,'51','0','PROYECTOR  +3D GAME',1,15,0,1,240000.0000,0.0000,0,380000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(52,'52','0','CONTROL GAME PAD',1,15,0,2,28000.0000,0.0000,0,70000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(53,'53','0','COMTROL PLAY DUALSHOCH 4',1,15,0,2,65000.0000,0.0000,0,110000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(54,'54','0','CONTROL XBOS',1,15,0,2,85000.0000,0.0000,0,150000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(55,'55','0','CELULAR SAMSUNG A36  8GB- 256GB BLANCO',1,15,0,1,1100000.0000,0.0000,0,1300000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(56,'56','0','SAMSUNG GALAXI A16 5G 8G- 256GB AZUL',1,15,0,1,650000.0000,0.0000,0,850000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(57,'57','0','SAMSUNG GALAXY A16 8G- 256GB NEGRO',1,15,0,1,630000.0000,0.0000,0,800000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(58,'58','0','SAMSUNG GALAXY A16 6G- 128GB NEGRO',1,15,0,1,520000.0000,0.0000,0,660000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(59,'59','0','SAMSUNG GALAXY A16 6G- 128GB GRIS',1,15,0,1,520000.0000,0.0000,0,660000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(60,'60','0','SAMSUNG GALAXY A05 4G- 128GB NEGRO',1,15,0,1,350000.0000,0.0000,0,500000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(61,'61','0','SAMSUNG GALAXY A06 4G- 128GB NEGRO',1,15,0,1,680000.0000,0.0000,0,820000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(62,'62','0','SAMSUNG GALAXY A06 4G- 128GB AZUL',1,15,0,1,680000.0000,0.0000,0,820000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(63,'63','0','SAMSUNG GALAXY A05 4G- 64GB NEGRO',1,15,0,1,260000.0000,0.0000,0,400000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(64,'64','0','SAMSUNG GALAXY A05 4G- 64 GB VERDE',1,15,0,1,260000.0000,0.0000,0,400000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(65,'65','0','CELULAR NEO NUBIA GAMER 8RAM 256GB AMARILLO',1,15,0,1,850000.0000,0.0000,0,1200000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(66,'66','0','CELULAR MOTOROLA G15 4RAM- 256GB GRIS',1,15,0,1,410000.0000,0.0000,0,590000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(67,'67','0','MOTOROLA E14 2RAM 64GB LAVANDA',1,15,0,2,250000.0000,0.0000,0,400000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(68,'68','0','MOTORALA G05 4RAM- 128GB ROJO',1,15,0,1,420000.0000,0.0000,0,590000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(69,'69','0','MOTOROLA G05 4RAM- 128G VERDE',1,15,0,1,420000.0000,0.0000,0,590000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(70,'70','0','OPPO A20 4RAM- 128G CAFE',1,15,0,1,460000.0000,0.0000,0,610000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(71,'71','0','COMBO OPPO RENO13 5G 12RAM 512G AZUL',1,15,0,1,2250000.0000,0.0000,0,3000000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(72,'72','0','TECNO CAMON 40 8RAM- 256G NEGRO',1,15,0,2,620000.0000,0.0000,0,790000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(73,'73','0','TECNO CAMON 40PRO 8RAM- 256G NEGRO',1,15,0,1,850000.0000,0.0000,0,1010000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(74,'74','0','TECNO SPARK GO 1S 3RAM- 64G NEGRO',1,15,0,2,240000.0000,0.0000,0,390000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(75,'75','0','TECNO SPARK GO 1S 3RAM- 64G BLANCO',1,15,0,1,240000.0000,0.0000,0,390000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(76,'76','0','TECNO SPAK 30C 4RAM 256G NEGRO',1,15,0,1,390000.0000,0.0000,0,538000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(77,'77','0','INFINIX SMART 9 3RAM- 64 G TITANIO',1,15,0,1,265000.0000,0.0000,0,405000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(78,'78','0','ZTE BLADE A75 5G 4RAM 128G VERDE',1,15,0,1,290000.0000,0.0000,0,450000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(79,'79','0','ZTE A35 2RAM 64G NEGR0',1,15,0,1,230000.0000,0.0000,0,380000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(80,'80','0','POCO X7PRO 7RAM 512G NEGRO',1,15,0,1,1380000.0000,0.0000,0,1600000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(81,'81','0','REDMI NOTE 14PRO 8RAM 256G AZUL',1,15,0,1,830000.0000,0.0000,0,1100000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(82,'82','0','REDMI NOTE 14 6RAM 128G NEGRO',1,15,0,2,520000.0000,0.0000,0,685000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(83,'83','0','REDMI NOTE 14 8RAM 256G AZUL',1,15,0,1,680000.0000,0.0000,0,820000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(84,'84','0','REDMI 14PRO+ 5G 8RAM 256G LAVANDA',1,15,0,1,1380000.0000,0.0000,0,1550000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(85,'85','0','REDMI 14PR0+ 5G 8RAM 256G NEGRO',1,15,0,1,1380000.0000,0.0000,0,1550000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(86,'86','0','REDMI A5 4RAM 128G NEGRO',1,15,0,1,260000.0000,0.0000,0,510000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(87,'87','0','REDMI A5 4RAM 128G DORADO',1,15,0,1,260000.0000,0.0000,0,510000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(88,'88','0','REDMI 13 6RAM 128G NEGRO',1,15,0,2,290000.0000,0.0000,0,510000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(89,'89','0','REDMI13 8RAM 256G NEGRO',1,15,0,1,430000.0000,0.0000,0,600000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(90,'90','0','REDMI 14C 4RAM 128G NEGRO',1,15,0,1,390000.0000,0.0000,0,540000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(91,'91','0','REDMI 14C 4RAM 256G VERDE',1,15,0,1,440000.0000,0.0000,0,600000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(92,'92','0','REDMI 14C 4RAM 256G AZUL',1,15,0,1,440000.0000,0.0000,0,600000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(93,'93','0','FLECHITA CORN GT10',1,15,0,4,60000.0000,0.0000,0,100000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(94,'94','0','FLECHITA CORN GT20',1,15,0,2,60000.0000,0.0000,0,100000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(95,'95','0','FLECHITA NOKIA 105 4G',1,15,0,2,110000.0000,0.0000,0,180000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(96,'96','0','FLECHITA CORN RS30',1,15,0,2,60000.0000,0.0000,0,100000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(97,'97','0','COMBO RELOJ BIG 8PRO MAXL',1,15,0,2,60000.0000,0.0000,0,120000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(98,'98','0','FLECHITA NOKIA 110 410',1,15,0,3,120000.0000,0.0000,0,200000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(99,'99','0','COMBO SMAR WACH ULTRA SPOR VERSION',1,15,0,3,45000.0000,0.0000,0,100000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(100,'100','0','COMBO P9 ULTRA2',1,15,0,1,70000.0000,0.0000,0,140000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(101,'101','0','COMBO K15 KARAOQUE',1,15,0,1,85000.0000,0.0000,0,160000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(102,'102','0','COMBO SMART WACH PLUS X9',1,15,0,2,115000.0000,0.0000,0,200000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(103,'103','0','RELOJ WATCH HD300',1,15,0,2,110000.0000,0.0000,0,190000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(104,'104','0','RELOJ REDMI WACH 5 ACTIVE',1,15,0,1,145000.0000,0.0000,0,220000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(105,'105','0','APPLE WACH HOMBRE',1,15,0,1,95000.0000,0.0000,0,200000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(106,'106','0','APPLE WACH MUJER',1,15,0,1,95000.0000,0.0000,0,200000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(107,'107','0','RELOJ HARVIC SWC 964',1,15,0,2,125000.0000,0.0000,0,250000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(108,'108','0','RELOJ KALEY SWC 3 MUJER',1,15,0,1,180000.0000,0.0000,0,300000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(109,'109','0','RELOJ KALEY SWC 3 HOMBRE',1,15,0,1,195000.0000,0.0000,0,300000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(110,'110','0','RELOJ X15 MAX',1,15,0,1,95000.0000,0.0000,0,180000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(111,'111','0','RELOJ HELLO 3 PRO+',1,15,0,2,140000.0000,0.0000,0,250000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(112,'112','0','RELOJ SMART WATCH SY9 ULTRA2',1,15,0,1,140000.0000,0.0000,0,250000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(113,'113','0','SMARCH WACH MH9 MINI',1,15,0,1,45000.0000,0.0000,0,10000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(114,'114','0','SMART WATCH HW68 MIMI',1,15,0,3,70000.0000,0.0000,0,150000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(115,'115','0','SMART WATCH X10 MINI 3',1,15,0,2,65000.0000,0.0000,0,140000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(116,'116','0','CARGADOR REOJ',1,15,0,3,12000.0000,0.0000,0,30000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(117,'117','0','PROTECTOR SMART WACH 49\"',1,15,0,2,8000.0000,0.0000,0,25000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(118,'118','0','PROTECTOR SMAR WATCH 38\"',1,15,0,2,6000.0000,0.0000,0,20000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(119,'119','0','PROTECTOR SMART WATCH 42\"',1,15,0,3,6000.0000,0.0000,0,20000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(120,'120','0','PROTECTOR SMART WATCH 44\"',1,15,0,2,8000.0000,0.0000,0,25000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(121,'121','0','PRTECTOR SMART WATCH 38\" LUJO',1,15,0,2,9000.0000,0.0000,0,25000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(122,'122','0','MANILLASMART WATCH 42\" A 49\"',1,15,0,12,9000.0000,0.0000,0,25000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(123,'123','0','MANILLA SMART WATCH 42\" A 44\"',1,15,0,1,6000.0000,0.0000,0,20000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(124,'124','0','MANILLA SMART WATCH 38\" A 41\"',1,15,0,2,12000.0000,0.0000,0,25000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(125,'125','0','MANILLAS SMART WACH SENCILLA 38\" A 41\"',1,15,0,15,12000.0000,0.0000,0,25000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(126,'126','0','MANILLA SMART WATCH 22MM',1,15,0,4,12000.0000,0.0000,0,20000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(127,'127','0','MANILLA SMART WATCH PREMIUN 42\" A 49\"',1,15,0,7,12000.0000,0.0000,0,30000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(128,'128','0','COMBO PROTECTOR Y MANILLA SMART WATCH',1,15,0,3,18000.0000,0.0000,0,35000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(129,'129','0','CELULAR SAMSUNG GALAXY S25 ULTRA 12RAM 256G NEGRO',1,15,0,1,3750000.0000,0.0000,0,4400000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(130,'130','0','CELULAR SAMSUNG S24 ULTRA 12RAM 256G GRIS',1,15,0,1,3300000.0000,0.0000,0,3600000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(131,'131','0','CELULAR IPHONE 13 128GB NEGRO',1,15,0,1,1950000.0000,0.0000,0,2350000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(132,'132','0','IPHONE 13 PROMAX 128GB VERDE',1,15,0,1,3100000.0000,0.0000,0,3400000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(133,'133','0','IPHONE 16 128GB NEGRO',1,15,0,1,3150000.0000,0.0000,0,3600000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(134,'134','0','IPHONE 16 PRO DORADO',1,15,0,1,3800000.0000,0.0000,0,4200000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(135,'135','0','USADO IPHONE 11PROMAX 256GB NEGRO',1,15,0,1,1350000.0000,0.0000,0,1600000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(136,'136','0','USADO 12PROMAX 128GB AZUL',1,15,0,1,1300000.0000,0.0000,0,1750000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(137,'137','0','USADO IPHONE 13 128 VERDE',1,15,0,1,1370000.0000,0.0000,0,1650000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(138,'138','0','USADO 14PROMAX 256GB NEGRO',1,15,0,1,2600000.0000,0.0000,0,3000000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(139,'139','0','USADO IPHONE 15 128GB VERDE',1,15,0,1,2250000.0000,0.0000,0,2500000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(140,'140','0','USADO IPHONE 16 128GB ROSADO',1,15,0,1,2780000.0000,0.0000,0,3100000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(141,'141','0','USADO IPHONE 16PLUS 128GB ROSADO',1,15,0,1,3000000.0000,0.0000,0,3400000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(142,'142','0','SILICONA SAMSUNG A20-A30',1,15,0,14,5000.0000,0.0000,0,20000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(143,'143','0','SILICONA SAMSUNG A21S',1,15,0,12,5000.0000,0.0000,0,20000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(144,'144','0','SILICONA SAMSUNG A23',1,15,0,7,5000.0000,0.0000,0,20000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(145,'145','0','SILICONA SAMSUNG A22 4G',1,15,0,5,5000.0000,0.0000,0,20000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(146,'146','0','SILICONA SAMSUNG A22 5G',1,15,0,8,5000.0000,0.0000,0,20000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(147,'147','0','SILICONA SAMSUNG A24',1,15,0,11,5000.0000,0.0000,0,20000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(148,'148','0','SILICONA SAMSUNG A25 5G',1,15,0,3,5000.0000,0.0000,0,20000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(149,'149','0','SILICONA SAMSUNG A26',1,15,0,10,5000.0000,0.0000,0,20000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(150,'150','0','SILICONA SAMSUNG A25 4G',1,15,0,5,5000.0000,0.0000,0,20000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(151,'151','0','SILICONA SAMSUNG A31',1,15,0,7,5000.0000,0.0000,0,20000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(152,'152','0','SILICONA SAMSUNG A50-A30S-A50S',1,15,0,6,5000.0000,0.0000,0,20000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(153,'153','0','SILICONA SAMSUNG A53 5G',1,15,0,7,5000.0000,0.0000,0,20000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(154,'154','0','SILICONA SAMSUNG A32',1,15,0,6,5000.0000,0.0000,0,20000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(155,'155','0','SILICONA SAMSUNG A34 5G',1,15,0,8,5000.0000,0.0000,0,20000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(156,'156','0','SILICONA SAMSUNG A35',1,15,0,9,5000.0000,0.0000,0,20000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(157,'157','0','SILICONA SAMSUNG A36',1,15,0,14,5000.0000,0.0000,0,20000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(158,'158','0','SILICONA SAMSUNG GALAXY A51',1,15,0,8,5000.0000,0.0000,0,20000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(159,'159','0','SILICONA SAMSUNG A52',1,15,0,3,5000.0000,0.0000,0,20000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(160,'160','0','SILICONA SAMSUNG A54',1,15,0,7,5000.0000,0.0000,0,20000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(161,'161','0','SILICONA SAMSUNG A55 5G',1,15,0,5,5000.0000,0.0000,0,20000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(162,'162','0','SILICONA SAMSUNG A545G',1,15,0,1,5000.0000,0.0000,0,20000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(163,'163','0','SILICONA SAMSUNG A55',1,15,0,20,5000.0000,0.0000,0,20000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(164,'164','0','SILICONA SAMSUNG A56',1,15,0,7,5000.0000,0.0000,0,20000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(165,'165','0','SILICONA SAMSUNG A70',1,15,0,4,5000.0000,0.0000,0,20000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(166,'166','0','SILICONA SAMSUNG S22',1,15,0,6,5000.0000,0.0000,0,20000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(167,'167','0','SILICONA SAMSUNG S21 FE',1,15,0,8,5000.0000,0.0000,0,20000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(168,'168','0','SILICONA SAMSUNG S23',1,15,0,5,5000.0000,0.0000,0,20000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(169,'169','0','SILICONA SAMSUNG S23 FE',1,15,0,10,5000.0000,0.0000,0,20000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(170,'170','0','SILICONA SAMSUNG S23 ULTRA',1,15,0,14,6000.0000,0.0000,0,20000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(171,'171','0','SILICONA SAMSUNG S24 FE',1,15,0,8,5000.0000,0.0000,0,20000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(172,'172','0','SILICONA SAMSUNG S24 ULTRA',1,15,0,9,6000.0000,0.0000,0,20000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(173,'173','0','SILICONA SAMSUNG S25 ULTRA',1,15,0,16,6000.0000,0.0000,0,20000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(174,'174','0','SILICONA SAMSUNG M55',1,15,0,16,5000.0000,0.0000,0,20000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(175,'175','0','FORRO CANGURO SAM A05',1,15,0,4,12000.0000,0.0000,0,30000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(176,'176','0','FORRO CANGURO SAM A06',1,15,0,4,12000.0000,0.0000,0,30000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(177,'177','0','FORRO CANGURO SAM A55',1,15,0,5,12000.0000,0.0000,0,30000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(178,'178','0','FORR MAGNETICO S23 ULTRA',1,15,0,3,14000.0000,0.0000,0,35000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(179,'179','0','FORRO LUJO S24 ULTRA',1,15,0,2,16000.0000,0.0000,0,40000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(180,'180','0','FORRO LUJO PASTA DURA S24 ULTRA',1,15,0,3,12000.0000,0.0000,0,30000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(181,'181','0','FORRO MAGNETICO S24 ULTRA',1,15,0,3,14000.0000,0.0000,0,35000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(182,'182','0','FORRO MAGNETICO S25 ULTRA',1,15,0,3,14000.0000,0.0000,0,35000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(183,'183','0','FORRO LUJO S24 FE',1,15,0,4,16000.0000,0.0000,0,35000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(184,'184','0','PATINETA HARVIC',1,15,0,1,1450000.0000,0.0000,0,2100000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(185,'185','0','SILICONA VIVO Y01-Y15A-Y15S-T1-Y10',1,15,0,6,6000.0000,0.0000,0,20000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(186,'186','0','SILICONA VIVO Y20S',1,15,0,6,6000.0000,0.0000,0,20000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(187,'187','0','SILICONA VIVO V25E',1,15,0,8,6000.0000,0.0000,0,20000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(188,'188','0','SILICONA VIVO V3O LITE',1,15,0,6,6000.0000,0.0000,0,20000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(189,'189','0','SILICONA VIVO Y33S',1,15,0,8,6000.0000,0.0000,0,20000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(190,'190','0','SILICONA VIVO Y03 4G',1,15,0,7,6000.0000,0.0000,0,20000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(191,'191','0','SILICONA ZTE V50',1,15,0,8,6000.0000,0.0000,0,20000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(192,'192','0','SILICONA INFINIX NOTE 30PRO',1,15,0,13,6000.0000,0.0000,0,20000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(193,'193','0','SILICONA INFINIX NOTE 40 4G',1,15,0,7,5000.0000,0.0000,0,20000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(194,'194','0','SILICONA SAMS A05',1,15,0,10,5000.0000,0.0000,0,20000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(195,'195','0','SILICONA SAMS A04',1,15,0,8,5000.0000,0.0000,0,20000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(196,'196','0','SILICONA SAMS A05',1,15,0,8,5000.0000,0.0000,0,20000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(197,'197','0','SILICONA SAMS A06',1,15,0,7,5000.0000,0.0000,0,20000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(198,'198','0','SILICONA SAMS A10- M10',1,15,0,8,5000.0000,0.0000,0,20000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(199,'199','0','SILICONA SAMS A11',1,15,0,8,5000.0000,0.0000,0,20000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(200,'200','0','SILICONA SAMS A12',1,15,0,12,5000.0000,0.0000,0,20000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(201,'201','0','SILICONA SAMS A13',1,15,0,9,5000.0000,0.0000,0,20000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(202,'202','0','SILICONA SAMS A14',1,15,0,3,5000.0000,0.0000,0,20000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(203,'203','0','SILICONA SAMS A15',1,15,0,5,5000.0000,0.0000,0,20000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(204,'204','0','SILICONA SAMS A16 5G',1,15,0,5,5000.0000,0.0000,0,20000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(205,'205','0','SILICONA SAMS A16',1,15,0,6,5000.0000,0.0000,0,20000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(206,'206','0','SILICONA SAMS A20S',1,15,0,5,5000.0000,0.0000,0,20000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(207,'207','0','SILICONA REDMI A1-A2',1,15,0,7,5000.0000,0.0000,0,20000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(208,'208','0','SILICONA REDMI A5',1,15,0,18,5000.0000,0.0000,0,20000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(209,'209','0','SILICONA REDMI XIAOMI POCO X3- X3PRO- NFC',1,15,0,7,5000.0000,0.0000,0,20000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(210,'210','0','SILICONA RED XIOMI POCO X3',1,15,0,8,5000.0000,0.0000,0,20000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(211,'211','0','SILICONA RED XIAMI POCO X5PRO',1,15,0,10,5000.0000,0.0000,0,20000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(212,'212','0','SILICONA RED XIOMI POCO X6PRO 5G',1,15,0,8,5000.0000,0.0000,0,20000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(213,'213','0','SILICONA REDMI NOTE 8',1,15,0,7,5000.0000,0.0000,0,20000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(214,'214','0','SILICONA REDMI NOTE 8PRO',1,15,0,8,5000.0000,0.0000,0,20000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(215,'215','0','VSILICONA REDMI REDMI 9',1,15,0,14,5000.0000,0.0000,0,20000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(216,'216','0','SILICONA REDMI 9C',1,15,0,4,5000.0000,0.0000,0,20000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(217,'217','0','SILICONA REDMI NOTE 9',1,15,0,8,5000.0000,0.0000,0,20000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(218,'218','0','SILICONA REDMI NOTE 9S-9RO',1,15,0,8,5000.0000,0.0000,0,20000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(219,'219','0','SILICONA REDMI 10',1,15,0,6,5000.0000,0.0000,0,20000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(220,'220','0','SILICONA REDMI 10A',1,15,0,1,5000.0000,0.0000,0,20000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(221,'221','0','SILICONA REDMI 10C',1,15,0,7,5000.0000,0.0000,0,20000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(222,'222','0','SILICONA REDMI NOTE 10 4G- 10S',1,15,0,7,5000.0000,0.0000,0,20000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(223,'223','0','VSILICONA REDMI NOTE 11',1,15,0,5,5000.0000,0.0000,0,20000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(224,'224','0','SILICONA REDMI 12',1,15,0,6,5000.0000,0.0000,0,20000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(225,'225','0','SILICONA REDMI 12C',1,15,0,6,5000.0000,0.0000,0,20000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(226,'226','0','SILICONA REDMI NOTE 12',1,15,0,3,5000.0000,0.0000,0,20000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(227,'227','0','SILICONA REDMI NOTE 12PRO - POCO X5PRO',1,15,0,6,5000.0000,0.0000,0,20000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(228,'228','0','SILICONA REDMI 13',1,15,0,6,5000.0000,0.0000,0,20000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(229,'229','0','SILICONA REDMI 13C',1,15,0,3,5000.0000,0.0000,0,20000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(230,'230','0','SILICONA REDMI NOTE 13 4G',1,15,0,11,5000.0000,0.0000,0,20000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(231,'231','0','SILICONA REDMI NOTE 13PRO 4G',1,15,0,10,5000.0000,0.0000,0,20000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(232,'232','0','SILICONA REDMI NOTE 13PRO 5G',1,15,0,13,5000.0000,0.0000,0,20000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(233,'233','0','SILICONA REDMI NOTE 13PRO PLUS',1,15,0,8,5000.0000,0.0000,0,20000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(234,'234','0','SILICONA REDMI 14C',1,15,0,12,5000.0000,0.0000,0,20000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(235,'235','0','SILICONA REDMI NOTE 14 4G',1,15,0,12,5000.0000,0.0000,0,20000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(236,'236','0','SILICONA REDMI OTE 14S',1,15,0,7,5000.0000,0.0000,0,20000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(237,'237','0','SILICONA REDMI NOTE 14PRO 4G',1,15,0,6,5000.0000,0.0000,0,20000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(238,'238','0','SILICONA REDMI NOTE 14 PRO+',1,15,0,11,6000.0000,0.0000,0,20000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(239,'239','0','SILICONA REDMI NOTE 12 PRO PLUS',1,15,0,1,5000.0000,0.0000,0,20000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(240,'240','0','FORRO LUJO REDMI A5',1,15,0,4,12000.0000,0.0000,0,25000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(241,'241','0','SILICONA MOTOROLA ONE FUSION',1,15,0,7,5000.0000,0.0000,0,20000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(242,'242','0','SILICONA MOTOROLA  G75',1,15,0,5,5000.0000,0.0000,0,20000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(243,'243','0','SILICONA MOTOROLA  G04-G04S-E14',1,15,0,5,5000.0000,0.0000,0,20000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(244,'244','0','SILICONA MOTOROLA G05-E15',1,15,0,7,5000.0000,0.0000,0,20000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(245,'245','0','SILICONA MOTOROLA  G9PLAY',1,15,0,9,6000.0000,0.0000,0,20000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(246,'246','0','SILICONA MOTOROLA  G9PLAY-E7PLUS',1,15,0,7,5000.0000,0.0000,0,20000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(247,'247','0','SILICONA MOTOROLA  G10-G20-G30-G10POWER',1,15,0,7,5000.0000,0.0000,0,20000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(248,'248','0','SILICONA MOTOROLA  E13',1,15,0,7,5000.0000,0.0000,0,20000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(249,'249','0','SILICONA MOTOROLA G14',1,15,0,8,5000.0000,0.0000,0,20000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(250,'250','0','SILICONA MOTOROLA  G15',1,15,0,7,5000.0000,0.0000,0,20000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(251,'251','0','SILICONA MOTOROLA  E22 4G- E22I',1,15,0,5,5000.0000,0.0000,0,20000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(252,'252','0','SILICONA MOTOROLA  G22',1,15,0,8,5000.0000,0.0000,0,20000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(253,'253','0','SILICONA MOTOROLA G13-G23-G53',1,15,0,8,5000.0000,0.0000,0,20000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(254,'254','0','SILICONA MOTOROLA G24',1,15,0,6,5000.0000,0.0000,0,20000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(255,'255','0','SILICONA MOTOROLA E30',1,15,0,7,5000.0000,0.0000,0,20000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(256,'256','0','SILICONA MOTOROLA EDGE 30',1,15,0,7,5000.0000,0.0000,0,20000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(257,'257','0','SILICONA MOTOROLA EDGE 30 NEO',1,15,0,8,5000.0000,0.0000,0,20000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(258,'258','0','SILICONA MOTOROLA  G32',1,15,0,7,5000.0000,0.0000,0,20000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(259,'259','0','SILICONA MOTOROLA E32',1,15,0,8,5000.0000,0.0000,0,20000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(260,'260','0','SILICONA MOTOROLA G34',1,15,0,8,5000.0000,0.0000,0,20000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(261,'261','0','SILICONA MOTOROLA  G50',1,15,0,17,5000.0000,0.0000,0,20000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(262,'262','0','SILICONA MOTOROLA EDGE 50 FUSION',1,15,0,8,5000.0000,0.0000,0,20000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(263,'263','0','SILICONA MOTOROLA G52-G82',1,15,0,8,5000.0000,0.0000,0,20000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(264,'264','0','SILICONA MOTOROLA G54',1,15,0,8,5000.0000,0.0000,0,20000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(265,'265','0','SILICONA MOTOROLA G55',1,15,0,7,5000.0000,0.0000,0,20000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(266,'266','0','SILICONA MOTOROLA G60',1,15,0,6,5000.0000,0.0000,0,20000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(267,'267','0','SILICONA MOTOROLA G60S',1,15,0,4,5000.0000,0.0000,0,20000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(268,'268','0','SILICONA MOTOROLA G71',1,15,0,8,5000.0000,0.0000,0,20000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(269,'269','0','SILICONA MOTOROLA G84',1,15,0,8,5000.0000,0.0000,0,20000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(270,'270','0','SILICONA MOTOROLA G85 5G',1,15,0,5,5000.0000,0.0000,0,20000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(271,'271','0','ARO DE LUZ GRANDE',1,15,0,3,105000.0000,0.0000,0,170000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(272,'272','0','ARO LUZ MEDIANO',1,15,0,3,44000.0000,0.0000,0,100000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(273,'273','0','ARO DE LUZ PEQUE?O',1,15,0,3,35000.0000,0.0000,0,80000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(274,'274','0','TRIPODE PEQUE?O',1,15,0,3,30000.0000,0.0000,0,60000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(275,'275','0','TRIPODE GRANDE',1,15,0,3,30000.0000,0.0000,0,60000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(276,'276','0','Vidrio Honor X7A-X7',1,15,0,6,1500.0000,0.0000,0,10000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(277,'277','0','Vidrio Moto G01',1,15,0,37,1500.0000,0.0000,0,10000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(278,'278','0','Vidrio Y9 Prime 2019 ',1,15,0,9,1500.0000,0.0000,0,10000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(279,'279','0','Vidrio Moto G84',1,15,0,8,1500.0000,0.0000,0,10000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(280,'280','0','Vidrio Moto G13',1,15,0,2,1500.0000,0.0000,0,10000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(281,'281','0','Vidrio Moto G9 Play ',1,15,0,7,1500.0000,0.0000,0,10000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(282,'282','0','Vidrio Moto E30-E40 Antiespia ',1,15,0,10,2000.0000,0.0000,0,20000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(283,'283','0','Vidrio Moto G75 Antiespia',1,15,0,4,2000.0000,0.0000,0,20000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(284,'284','0','Vidrio Redmi 10C-12C-10',1,15,0,7,1500.0000,0.0000,0,10000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(285,'285','0','Vidrio Redmi 10-10T-Note 105G',1,15,0,11,1500.0000,0.0000,0,10000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(286,'286','0',' Vidrio Note 8-Redmi8-Redmi 8A',1,15,0,14,1500.0000,0.0000,0,10000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(287,'287','0','Vidrio Redmi 13- Redmi 12',1,15,0,30,1500.0000,0.0000,0,10000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(288,'288','0','Vidrio Redmi 14C',1,15,0,37,1500.0000,0.0000,0,10000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(289,'289','0','Vidrio Redmi Note 13 Pro 4G',1,15,0,30,1500.0000,0.0000,0,10000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(290,'290','0','Vidrio Note 9-A11',1,15,0,5,1500.0000,0.0000,0,10000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(291,'291','0','Vidrio Redmi 13C',1,15,0,10,1500.0000,0.0000,0,10000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(292,'292','0','Vidrio Note 8 Antiespia ',1,15,0,7,2000.0000,0.0000,0,20000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(293,'293','0','Vidrio Redmi 9A-9C Antiespia ',1,15,0,10,2000.0000,0.0000,0,20000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(294,'294','0','Vidrio Curvo Moto Edge 50 Fusion',1,15,0,13,8000.0000,0.0000,0,30000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(295,'295','0','Vidrio Curvo Note 14 Pro',1,15,0,13,8000.0000,0.0000,0,30000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(296,'296','0','Vidrio  Curvo Note 14 Pro Plus',1,15,0,1,8000.0000,0.0000,0,30000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(297,'297','0','Vidrio Curvo Magic Lite',1,15,0,5,8000.0000,0.0000,0,30000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(298,'298','0','Vidrio Curvo V40 Lite',1,15,0,3,8000.0000,0.0000,0,30000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(299,'299','0','Vidrio Curvo Camon 30s Pro',1,15,0,4,8000.0000,0.0000,0,30000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(300,'300','0','Vidrio Curvo G85',1,15,0,3,8000.0000,0.0000,0,30000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(301,'301','0','Vidrio Curvo S22 Ultra ',1,15,0,2,8000.0000,0.0000,0,30000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(302,'302','0','Vidrio Curvo Camon 40 Pro ',1,15,0,3,8000.0000,0.0000,0,30000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(303,'303','0','Vidrio Curvo Spart Go 20 Pro+',1,15,0,3,8000.0000,0.0000,0,30000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(304,'304','0','Vidrio Sam A34',1,15,0,18,1500.0000,0.0000,0,10000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(305,'305','0','Vidrio Sam A35',1,15,0,17,1500.0000,0.0000,0,10000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(306,'306','0','Vidrio Sam A224G -A14',1,15,0,12,1500.0000,0.0000,0,10000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(307,'307','0','Vidrio Sam A16',1,15,0,6,1500.0000,0.0000,0,10000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(308,'308','0','Vidrio Sam A21S',1,15,0,17,1500.0000,0.0000,0,10000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(309,'309','0','Vidrio Sam A06',1,15,0,16,1500.0000,0.0000,0,10000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(310,'310','0','Vidrio Sam A05S',1,15,0,25,1500.0000,0.0000,0,10000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(311,'311','0','Vidrio Sam A20S',1,15,0,18,1500.0000,0.0000,0,10000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(312,'312','0','Vidrio Sam A71 ',1,15,0,8,1500.0000,0.0000,0,10000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(313,'313','0','Vidrio Sam S24',1,15,0,8,1500.0000,0.0000,0,10000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(314,'314','0','Vidrio Sam A24',1,15,0,3,1500.0000,0.0000,0,10000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(315,'315','0','Vidrio Sam A10S',1,15,0,18,1500.0000,0.0000,0,10000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(316,'316','0','Vidrio Sam A51',1,15,0,8,1500.0000,0.0000,0,10000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(317,'317','0','Vidrio Sam J8',1,15,0,9,1500.0000,0.0000,0,10000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(318,'318','0','Vidrio Sam Galaxy S24  Ultra',1,15,0,17,1500.0000,0.0000,0,10000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(319,'319','0','Vidrio Sam A70 Antiespia',1,15,0,23,2000.0000,0.0000,0,20000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(320,'320','0','Vidrio Sam A24 Antiespia ',1,15,0,9,2000.0000,0.0000,0,20000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(321,'321','0','Vidrio Sam A22 Antiespia 10',1,15,0,10,2000.0000,0.0000,0,20000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(322,'322','0','Vidrio Sam A21S Antiespia',1,15,0,10,2000.0000,0.0000,0,20000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(323,'323','0','Vidrio Sam A06 Antiespia',1,15,0,10,2000.0000,0.0000,0,20000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(324,'324','0','Vidrio Sam A54 Antiespia ',1,15,0,3,2000.0000,0.0000,0,20000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(325,'325','0','Vidrio Sam A14 Antiespia',1,15,0,8,2000.0000,0.0000,0,20000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(326,'326','0','Vidrio Sam A05S Antiespia ',1,15,0,10,2000.0000,0.0000,0,20000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(327,'327','0','Vidrios Tablet ',1,15,0,5,10000.0000,0.0000,0,25000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(328,'328','0','Vidrio Iphone 11',1,15,0,19,1500.0000,0.0000,0,13000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(329,'329','0','Vidrio Iphone 13 Pro Max ',1,15,0,24,1500.0000,0.0000,0,13000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(330,'330','0','Vidrio Iphone 15 Pro',1,15,0,18,1500.0000,0.0000,0,13000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(331,'331','0','Vidrio Iphone 12',1,15,0,20,1500.0000,0.0000,0,13000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(332,'332','0','Vidrio Iphone Xs Max- 11 Promax',1,15,0,20,1500.0000,0.0000,0,13000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(333,'333','0','Vidrio Iphone 6/7/8 Plus',1,15,0,17,1500.0000,0.0000,0,13000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(334,'334','0','Vidrio Iphone 14 Pro Max ',1,15,0,9,1500.0000,0.0000,0,13000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(335,'335','0','Vidrio Iphone 16 Pro Max ',1,15,0,13,1500.0000,0.0000,0,13000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(336,'336','0','Vidrio Iphone 15/16 ',1,15,0,5,1500.0000,0.0000,0,13000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(337,'337','0','Vidrio Iphone 16 Pro ',1,15,0,18,1500.0000,0.0000,0,13000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(338,'338','0','Vidrio Iphone XS-X ',1,15,0,20,1500.0000,0.0000,0,13000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(339,'339','0','Vidrio Iphone 15 Pro Max ',1,15,0,9,1500.0000,0.0000,0,13000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(340,'340','0','Vidrio Iphone 13  ',1,15,0,4,1500.0000,0.0000,0,13000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(341,'341','0','Vidrio Iphone 13/14 Antiespia',1,15,0,3,2000.0000,0.0000,0,20000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(342,'342','0','Vidrio Iphone 16 Pro Max Antiespia',1,15,0,19,2000.0000,0.0000,0,20000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(343,'343','0','Vidrio Iphone 13 Pro Max Antiespia',1,15,0,10,2000.0000,0.0000,0,20000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(344,'344','0','Vidrio Iphone 15/16 Antiespia',1,15,0,4,2000.0000,0.0000,0,20000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(345,'345','0','Vidrio Iphone 12 Antiespia ',1,15,0,4,2000.0000,0.0000,0,20000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(346,'346','0','Vidrio Iphone 14 Pro Antiespia',1,15,0,10,2000.0000,0.0000,0,20000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(347,'347','0','Vidrio Iphone 12 Pro Max Antiespia',1,15,0,10,2000.0000,0.0000,0,20000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(348,'348','0','Vidrio Iphone 15 Pro Max Antiespia',1,15,0,7,2000.0000,0.0000,0,20000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(349,'349','0','Vidrio Iphone 16 Pro Antiespia ',1,15,0,9,2000.0000,0.0000,0,20000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(350,'350','0','Vidrio Iphone X-XS-11Pro',1,15,0,10,2000.0000,0.0000,0,20000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(351,'351','0','Vidrio Iphone 6/7/8 Plus Antiespia',1,15,0,10,2000.0000,0.0000,0,20000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(352,'352','0','Vidrio Iphone XsMax-11 Pro Max Antiespia',1,15,0,10,2000.0000,0.0000,0,20000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(353,'353','0','Silicon Honor X8 B',1,15,0,7,5000.0000,0.0000,0,20000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(354,'354','0','Silicon Huawei Y6P',1,15,0,7,5000.0000,0.0000,0,20000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(355,'355','0','Silicon Honor X6BA',1,15,0,5,5000.0000,0.0000,0,20000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(356,'356','0','Silicon Honor X6',1,15,0,8,5000.0000,0.0000,0,20000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(357,'357','0','Silicon Honor X7B',1,15,0,6,5000.0000,0.0000,0,20000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(358,'358','0','Silicon Honor X7A',1,15,0,6,5000.0000,0.0000,0,20000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(359,'359','0','Silicon Honor X9A /Magic 5 Lite ',1,15,0,6,5000.0000,0.0000,0,20000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(360,'360','0','Silicon Honor 200',1,15,0,8,5000.0000,0.0000,0,20000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(361,'361','0','Silicon Huawei Y9 2019',1,15,0,5,5000.0000,0.0000,0,20000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(362,'362','0','Silicon Huawei Y9 Prime ',1,15,0,6,5000.0000,0.0000,0,20000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(363,'363','0','Silicon Huawei Nova 10 SE',1,15,0,8,5000.0000,0.0000,0,20000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(364,'364','0','Silicon Huawei Y19S 4G',1,15,0,7,5000.0000,0.0000,0,20000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(365,'365','0','Silicon Huawei Vi 2Y20S',1,15,0,11,5000.0000,0.0000,0,20000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(366,'366','0','Silicon Huawei Y22s',1,15,0,7,5000.0000,0.0000,0,20000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(367,'367','0','Silicon Huawei Nova Y70',1,15,0,6,5000.0000,0.0000,0,20000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(368,'368','0','Silicon Oppo Reno 5 Lite /A94/Reno 5F',1,15,0,8,5000.0000,0.0000,0,20000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(369,'369','0','Silicon Oppo Reno 7/8',1,15,0,5,5000.0000,0.0000,0,20000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(370,'370','0','Silicon Oppo Reno 10/10Pro',1,15,0,7,5000.0000,0.0000,0,20000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(371,'371','0','Silicon Oppo Reno 11 5G',1,15,0,6,5000.0000,0.0000,0,20000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(372,'372','0','Silicon Oppo Reno 12',1,15,0,9,5000.0000,0.0000,0,20000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(373,'373','0','Silicon Oppo Reno 12F',1,15,0,6,5000.0000,0.0000,0,20000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(374,'374','0','Silicon Oppo Reno 13',1,15,0,8,5000.0000,0.0000,0,20000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(375,'375','0','Silicon Oppo A54',1,15,0,7,5000.0000,0.0000,0,20000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(376,'376','0','Silicon Oppo A58 4G',1,15,0,5,5000.0000,0.0000,0,20000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(377,'377','0','Silicon Oppo A59 5G',1,15,0,7,5000.0000,0.0000,0,20000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(378,'378','0','Silicon Oppo A79 5G',1,15,0,9,5000.0000,0.0000,0,20000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(379,'379','0','Silicon Oppo A80',1,15,0,6,5000.0000,0.0000,0,20000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(380,'380','0','Silicon Tecno Spark Go 2025',1,15,0,8,5000.0000,0.0000,0,20000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(381,'381','0','Silicon Tecno Spark Go 2023/Smart 7/POP 7',1,15,0,7,5000.0000,0.0000,0,20000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(382,'382','0','Silicon Tecno Spark 10/10C',1,15,0,6,5000.0000,0.0000,0,20000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(383,'383','0','Silicon Tecno Spark 10 Pro ',1,15,0,5,5000.0000,0.0000,0,20000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(384,'384','0','Silicon Tecno Camon 20-4G',1,15,0,7,5000.0000,0.0000,0,20000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(385,'385','0','Silicon Tecno Spark Go 2024',1,15,0,4,5000.0000,0.0000,0,20000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(386,'386','0','Silicon Tecno Camon 40 Pro ',1,15,0,5,7000.0000,0.0000,0,25000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(387,'387','0','Silicon Tecno Spark 30 Pro 4G',1,15,0,8,5000.0000,0.0000,0,20000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(388,'388','0','Silicon Tecno Sparck 30C',1,15,0,7,5000.0000,0.0000,0,20000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(389,'389','0','Silicon Tecno Camon 30s',1,15,0,5,5000.0000,0.0000,0,20000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(390,'390','0','Silicon Tecno Spark 20 Pro ',1,15,0,8,5000.0000,0.0000,0,20000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(391,'391','0','bateria A02S',1,15,0,1,13000.0000,0.0000,0,25000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(392,'392','0','bateria  Bateria A-03 S ',1,15,0,1,13000.0000,0.0000,0,25000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(393,'393','0','bateria A-04S',1,15,0,2,12000.0000,0.0000,0,25000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(394,'394','0','bateria A-05 S',1,15,0,2,13000.0000,0.0000,0,25000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(395,'395','0','bateria A-03 CORE ',1,15,0,2,12000.0000,0.0000,0,25000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(396,'396','0','bateria A-04 E ',1,15,0,2,12000.0000,0.0000,0,25000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(397,'397','0','bateria A-02',1,15,0,2,12000.0000,0.0000,0,25000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(398,'398','0','bateria A-03',1,15,0,2,12000.0000,0.0000,0,25000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(399,'399','0','bateria A-04',1,15,0,1,12000.0000,0.0000,0,25000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(400,'400','0','bateria A-05',1,15,0,1,13000.0000,0.0000,0,25000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(401,'401','0','bateria A-06',1,15,0,2,15000.0000,0.0000,0,25000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(402,'402','0','bateria A-10S',1,15,0,4,12000.0000,0.0000,0,25000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(403,'403','0','bateria A-11',1,15,0,2,10000.0000,0.0000,0,25000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(404,'404','0','bateria A-12',1,15,0,2,12000.0000,0.0000,0,25000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(405,'405','0','bateria A-13',1,15,0,2,13000.0000,0.0000,0,25000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(406,'406','0','bateria A-14',1,15,0,2,14000.0000,0.0000,0,25000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(407,'407','0','bateria A-15',1,15,0,2,13000.0000,0.0000,0,25000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(408,'408','0','bateria A-20S',1,15,0,3,12000.0000,0.0000,0,25000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(409,'409','0','bateria A-20',1,15,0,2,12000.0000,0.0000,0,25000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(410,'410','0','bateria A-21S',1,15,0,2,13000.0000,0.0000,0,25000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(411,'411','0','bateria A-22 4G',1,15,0,2,13000.0000,0.0000,0,25000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(412,'412','0','bateria A-22 5G',1,15,0,2,12000.0000,0.0000,0,25000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(413,'413','0','bateria A-23 4G',1,15,0,1,20000.0000,0.0000,0,30000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(414,'414','0','bateria A-25',1,15,0,2,18000.0000,0.0000,0,25000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(415,'415','0','bateria A-30',1,15,0,2,13000.0000,0.0000,0,25000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(416,'416','0','bateria A-31',1,15,0,2,15000.0000,0.0000,0,25000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(417,'417','0','bateria A-32',1,15,0,2,13000.0000,0.0000,0,25000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(418,'418','0','bateria A-33',1,15,0,2,13000.0000,0.0000,0,25000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(419,'419','0','bateria A-30S',1,15,0,2,15000.0000,0.0000,0,25000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(420,'420','0','bateria A-52',1,15,0,2,30000.0000,0.0000,0,45000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(421,'421','0','bateria A-52S',1,15,0,2,30000.0000,0.0000,0,45000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(422,'422','0','bateria A-54',1,15,0,2,25000.0000,0.0000,0,35000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(423,'423','0','bateria A-16',1,15,0,2,15000.0000,0.0000,0,25000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(424,'424','0','Logicas A 02 S ',1,15,0,1,13000.0000,0.0000,0,25000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(425,'425','0','Logicas A-03 S ',1,15,0,1,13000.0000,0.0000,0,25000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(426,'426','0','Logicas A-04S',1,15,0,2,12000.0000,0.0000,0,25000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(427,'427','0','Logicas A-05 S',1,15,0,2,13000.0000,0.0000,0,25000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(428,'428','0','Logicas A-03 CORE ',1,15,0,2,12000.0000,0.0000,0,25000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(429,'429','0','Logicas A-04 E ',1,15,0,2,12000.0000,0.0000,0,25000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(430,'430','0','Logicas A-02',1,15,0,2,12000.0000,0.0000,0,25000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(431,'431','0','Logicas A-03',1,15,0,2,12000.0000,0.0000,0,25000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(432,'432','0','Logicas A-04',1,15,0,1,12000.0000,0.0000,0,25000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(433,'433','0','Logicas A-05',1,15,0,1,13000.0000,0.0000,0,25000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(434,'434','0','Logicas A-06',1,15,0,2,15000.0000,0.0000,0,25000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(435,'435','0','Logicas A-10S',1,15,0,4,12000.0000,0.0000,0,25000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(436,'436','0','Logicas A-11',1,15,0,2,10000.0000,0.0000,0,25000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(437,'437','0','Logicas A-12',1,15,0,2,12000.0000,0.0000,0,25000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(438,'438','0','Logicas A-13',1,15,0,2,13000.0000,0.0000,0,25000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(439,'439','0','Logicas A-14',1,15,0,2,14000.0000,0.0000,0,25000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(440,'440','0','Logicas A-15',1,15,0,2,13000.0000,0.0000,0,25000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(441,'441','0','Logicas A-20S',1,15,0,3,12000.0000,0.0000,0,25000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(442,'442','0','Logicas A-20',1,15,0,2,12000.0000,0.0000,0,25000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(443,'443','0','Logicas A-21S',1,15,0,2,13000.0000,0.0000,0,25000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(444,'444','0','Logicas A-22 4G',1,15,0,2,13000.0000,0.0000,0,25000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(445,'445','0','Logicas A-22 5G',1,15,0,2,12000.0000,0.0000,0,25000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(446,'446','0','Logicas A-23 4G',1,15,0,1,20000.0000,0.0000,0,30000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(447,'447','0','Logicas A-25',1,15,0,2,18000.0000,0.0000,0,25000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(448,'448','0','Logicas A-30',1,15,0,2,13000.0000,0.0000,0,25000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(449,'449','0','Logicas A-31',1,15,0,2,15000.0000,0.0000,0,25000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(450,'450','0','Logicas A-32',1,15,0,2,13000.0000,0.0000,0,25000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(451,'451','0','Logicas A-33',1,15,0,2,13000.0000,0.0000,0,25000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(452,'452','0','Logicas A-30S',1,15,0,2,15000.0000,0.0000,0,25000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(453,'453','0','Logicas A-52',1,15,0,2,30000.0000,0.0000,0,40000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(454,'454','0','Logicas A-52S',1,15,0,2,30000.0000,0.0000,0,40000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(455,'455','0','Logicas A-54',1,15,0,2,25000.0000,0.0000,0,35000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(456,'456','0','Logicas A-16',1,15,0,2,15000.0000,0.0000,0,25000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(457,'457','0','Flex De Volumen A03  CORE',1,15,0,2,3900.0000,0.0000,0,7800.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(458,'458','0','Flex De Volumen A 31',1,15,0,2,3900.0000,0.0000,0,7800.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(459,'459','0','Flex De Volumen A 20 S ',1,15,0,1,3900.0000,0.0000,0,3900.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(460,'460','0','Flex De Volumen A 21 S',1,15,0,2,3900.0000,0.0000,0,7800.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(461,'461','0','Flex De Volumen A 32 ',1,15,0,2,3900.0000,0.0000,0,7800.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(462,'462','0','Flex De Volumen A 03 S ',1,15,0,2,3900.0000,0.0000,0,7800.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(463,'463','0','Flex De Volumen A 11',1,15,0,2,3900.0000,0.0000,0,7800.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(464,'464','0','Flex De Volumen A 02',1,15,0,2,3900.0000,0.0000,0,7800.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(465,'465','0','Flex De Volumen A 20S ',1,15,0,2,3900.0000,0.0000,0,7800.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(466,'466','0','Flex De Volumen J 4 PLUS ',1,15,0,2,3900.0000,0.0000,0,7800.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(467,'467','0','Flex De Volumen A 10 S ',1,15,0,2,3900.0000,0.0000,0,7800.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(468,'468','0','Flex De Volumen A 10',1,15,0,2,3900.0000,0.0000,0,7800.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(469,'469','0','Flex De Volumen A20-A30',1,15,0,2,3900.0000,0.0000,0,7800.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(470,'470','0','Flex De Volumen A30S-A50',1,15,0,2,3900.0000,0.0000,0,7800.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(471,'471','0','Flex De Volumen RETMI A 1',1,15,0,1,3900.0000,0.0000,0,3900.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(472,'472','0','Flex De Volumen RETMI 8',1,15,0,2,3900.0000,0.0000,0,7800.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(473,'473','0','Flex De Volumen RETMI 9',1,15,0,1,3900.0000,0.0000,0,3900.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(474,'474','0','Flex De Volumen RETMI NOTE 7 -8',1,15,0,2,3900.0000,0.0000,0,7800.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(475,'475','0','Flex De Volumen RETMI NOTE 11',1,15,0,2,3900.0000,0.0000,0,7800.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(476,'476','0','Flex De Volumen RETMI NOTE 9',1,15,0,2,3900.0000,0.0000,0,7800.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(477,'477','0','Flex De Volumen RETMI NOTE 10S',1,15,0,2,3900.0000,0.0000,0,7800.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(478,'478','0','Flex De Volumen RETIMI 13C',1,15,0,2,3900.0000,0.0000,0,7800.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(479,'479','0','Flex De Volumen NOITE 8 PRO ',1,15,0,2,3900.0000,0.0000,0,7800.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(480,'480','0','Flex De Volumen 9A-9C-10A',1,15,0,2,3900.0000,0.0000,0,7800.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(481,'481','0','Flex De Volumen 12C ',1,15,0,2,3900.0000,0.0000,0,7800.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(482,'482','0','Flex De Volumen NOTE 9 PRO -9S',1,15,0,2,3900.0000,0.0000,0,7800.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(483,'483','0','Flex De Volumen RETMI 9T',1,15,0,2,3900.0000,0.0000,0,7800.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(484,'484','0','Flex De Volumen MOTO G 32',1,15,0,2,3900.0000,0.0000,0,7800.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(485,'485','0','Flex De Volumen MOTOG8 PLAY ',1,15,0,2,3900.0000,0.0000,0,7800.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(486,'486','0','Flex De Volumen MOTO G 84',1,15,0,2,3900.0000,0.0000,0,7800.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(487,'487','0','Flex De Volumen MOTO E 7I POWER ',1,15,0,2,3900.0000,0.0000,0,7800.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(488,'488','0','Flex De Volumen MOTO E8 POWER ',1,15,0,2,3900.0000,0.0000,0,7800.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(489,'489','0','Flex De Volumen MOTOG7 -G7 Plus ',1,15,0,2,3900.0000,0.0000,0,7800.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(490,'490','0','Flex De Volumen MOTO E 13',1,15,0,2,3900.0000,0.0000,0,7800.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(491,'491','0','Flex De Volumen MOTO G 20 -G30',1,15,0,2,3900.0000,0.0000,0,7800.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(492,'492','0','Flex De Volumen MOTO G 14',1,15,0,2,3900.0000,0.0000,0,7800.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(493,'493','0','Flex De Volumen MOTO G 6 PLAY ',1,15,0,2,3900.0000,0.0000,0,7800.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(494,'494','0','Flex De Volumen MOTO G 31',1,15,0,2,3900.0000,0.0000,0,7800.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(495,'495','0','Flex De Volumen MOTO E 20',1,15,0,1,3900.0000,0.0000,0,3900.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(496,'496','0','Flex De Volumen MOTO 22-22E',1,15,0,2,3900.0000,0.0000,0,7800.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(497,'497','0','Flex De Volumen MOTO ONE ',1,15,0,2,3900.0000,0.0000,0,7800.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(498,'498','0','Flex De Volumen MOTO C',1,15,0,2,3900.0000,0.0000,0,7800.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(499,'499','0','Flex De Volumen MOTO G 7 PLAY ',1,15,0,2,3900.0000,0.0000,0,7800.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(500,'500','0','Flex De Volumen MOTO E S PLUS ',1,15,0,2,3900.0000,0.0000,0,7800.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(501,'501','0','Flex De Volumen YS 2018',1,15,0,2,3900.0000,0.0000,0,7800.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(502,'502','0','Flex De Volumen Y9 S ',1,15,0,2,3900.0000,0.0000,0,7800.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(503,'503','0','Flex De Volumen Y7 2019',1,15,0,2,3900.0000,0.0000,0,7800.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(504,'504','0','Flex De Volumen Y9 A',1,15,0,2,3900.0000,0.0000,0,7800.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(505,'505','0','Flex De Volumen Y7 PRIME ',1,15,0,2,3900.0000,0.0000,0,7800.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(506,'506','0','Flex De Volumen Y9 PRIME ',1,15,0,2,3900.0000,0.0000,0,7800.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(507,'507','0','Flex De Volumen P20 LITE ',1,15,0,2,3900.0000,0.0000,0,7800.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(508,'508','0','Flex De Volumen Y 6 2019',1,15,0,2,3900.0000,0.0000,0,7800.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(509,'509','0','Flex De Volumen Y9 2019',1,15,0,2,3900.0000,0.0000,0,7800.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(510,'510','0','Flex De Volumen P SMART 2019',1,15,0,2,3900.0000,0.0000,0,7800.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(511,'511','0','Flex De Volumen P SMART 2018',1,15,0,2,3900.0000,0.0000,0,7800.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(512,'512','0','Display  A-02S,03S,03  SAM',1,15,0,8,29000.0000,0.0000,0,44000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(513,'513','0','Display  A-12,A02-A32 G5 SAM',1,15,0,4,29000.0000,0.0000,0,44000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(514,'514','0','Display  A-10 SAM',1,15,0,2,29000.0000,0.0000,0,44000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(515,'515','0','Display  A-21 S-SAM',1,15,0,9,29000.0000,0.0000,0,44000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(516,'516','0','Display  A-21 S MARCO -SAM',1,15,0,4,29000.0000,0.0000,0,44000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(517,'517','0','Display  A-22 MARCO 4G-SAM',1,15,0,2,29000.0000,0.0000,0,44000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(518,'518','0','Display  A-06 -SAM',1,15,0,2,29000.0000,0.0000,0,44000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(519,'519','0','Display  A-14 5G-SAM',1,15,0,2,29000.0000,0.0000,0,44000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(520,'520','0','Display  A-51 MARCO-SAM',1,15,0,2,29000.0000,0.0000,0,44000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(521,'521','0','Display  A-05 -SAM',1,15,0,2,29000.0000,0.0000,0,44000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(522,'522','0','Display  A-02-SAM',1,15,0,2,29000.0000,0.0000,0,44000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(523,'523','0','Display  A-22 5G-SAM',1,15,0,2,29000.0000,0.0000,0,44000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(524,'524','0','Display  A-15-SAM',1,15,0,2,29000.0000,0.0000,0,44000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(525,'525','0','Display  A-03 CORE-MARCO-SAM',1,15,0,1,29000.0000,0.0000,0,44000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(526,'526','0','Display  A-10 S-SAM',1,15,0,3,29000.0000,0.0000,0,44000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(527,'527','0','Display  A-04 S-SAM',1,15,0,3,29000.0000,0.0000,0,44000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(528,'528','0','Display  J 4 PLUS- J 6 PLUS -SAM',1,15,0,3,29000.0000,0.0000,0,44000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(529,'529','0','Display  J 7 PRIME -SAM',1,15,0,3,29000.0000,0.0000,0,44000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(530,'530','0','Display  J 8-J 8 PLUS -SAM',1,15,0,2,29000.0000,0.0000,0,44000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(531,'531','0','Display  A-30S MARCO-SAM',1,15,0,5,29000.0000,0.0000,0,44000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(532,'532','0','Display  A-30 A-50 MARCO -SAM',1,15,0,2,29000.0000,0.0000,0,44000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(533,'533','0','Display  A-13 4G-SAM',1,15,0,1,29000.0000,0.0000,0,44000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(534,'534','0','Display  A-04 MARCO-SAM',1,15,0,2,29000.0000,0.0000,0,44000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(535,'535','0','Display  A-32 4G MARCO-SAM',1,15,0,2,29000.0000,0.0000,0,44000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(536,'536','0','Display  A-20 MARCO-SAM',1,15,0,3,29000.0000,0.0000,0,44000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(537,'537','0','Display  A-24 MARCO-SAM',1,15,0,2,29000.0000,0.0000,0,44000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(538,'538','0','Display  RETMI 13C',1,15,0,4,33000.0000,0.0000,0,48000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(539,'539','0','Display  RETMI A1-A2 MARCO',1,15,0,1,43000.0000,0.0000,0,58000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(540,'540','0','Display  RETMI A1- A2',1,15,0,0,37000.0000,0.0000,0,52000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(541,'541','0','Display  NOTE 11',1,15,0,2,41000.0000,0.0000,0,56000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(542,'542','0','Display  NOTE 9',1,15,0,4,36000.0000,0.0000,0,51000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(543,'543','0','Display  NOTE 12',1,15,0,1,44000.0000,0.0000,0,59000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(544,'544','0','Display  NOTE 10 S ',1,15,0,2,38000.0000,0.0000,0,53000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(545,'545','0','Display  NOTE 13',1,15,0,3,50000.0000,0.0000,0,65000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(546,'546','0','Display  NOTE 13 PRO 4G',1,15,0,4,50000.0000,0.0000,0,65000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(547,'547','0','Display  NOTE 10  AMOLED',1,15,0,1,105000.0000,0.0000,0,120000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(548,'548','0','Display  RETMI 12',1,15,0,1,40000.0000,0.0000,0,55000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(549,'549','0','Display  RETMI 9T- POCO M3',1,15,0,4,31000.0000,0.0000,0,46000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(550,'550','0','Display  RETMI 14C ',1,15,0,2,40000.0000,0.0000,0,55000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(551,'551','0','Display  NOTE 13 PRO 4G OLED',1,15,0,2,150000.0000,0.0000,0,165000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(552,'552','0','Display  RETMI 10 C ',1,15,0,1,34000.0000,0.0000,0,49000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(553,'553','0','Display  NOTE 11-11S-12S-POCO M4',1,15,0,6,41000.0000,0.0000,0,56000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(554,'554','0','Display  NOTE 10 4G-10 S 4G',1,15,0,2,30000.0000,0.0000,0,45000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(555,'555','0','Display  RETMI 10',1,15,0,2,38000.0000,0.0000,0,53000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(556,'556','0','Display  RETMI 9',1,15,0,4,33000.0000,0.0000,0,48000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(557,'557','0','Display  NOTE 8',1,15,0,10,30000.0000,0.0000,0,45000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(558,'558','0','Display  RETMI 9A -9C-10A',1,15,0,13,29000.0000,0.0000,0,44000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(559,'559','0','Display  RETMI 12C ',1,15,0,3,33000.0000,0.0000,0,48000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(560,'560','0','Display  EDGE 50 FUSION AMOLED',1,15,0,1,200000.0000,0.0000,0,215000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(561,'561','0','Display  MOTO G20 ',1,15,0,11,30000.0000,0.0000,0,45000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(562,'562','0','Display  MOTO ONE FUSION',1,15,0,3,33000.0000,0.0000,0,48000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(563,'563','0','Display  MOTO E 40',1,15,0,3,36000.0000,0.0000,0,51000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(564,'564','0','Display  MOTO E 20',1,15,0,10,31000.0000,0.0000,0,46000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(565,'565','0','Display  MOTO E 71 2020',1,15,0,5,35000.0000,0.0000,0,50000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(566,'566','0','Display  MOTO ONE ',1,15,0,3,35000.0000,0.0000,0,50000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(567,'567','0','Display  MOTO E 22 (I)',1,15,0,2,36000.0000,0.0000,0,51000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(568,'568','0','Display  MOTO G 9 PLAY -MOTO E7 PLUS',1,15,0,5,33000.0000,0.0000,0,48000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(569,'569','0','Display  MOTO G22',1,15,0,5,34000.0000,0.0000,0,49000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(570,'570','0','Display  MOTO G 8 PLAY ',1,15,0,3,33000.0000,0.0000,0,48000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(571,'571','0','Display  Y 9 PRIME 2019',1,15,0,3,32000.0000,0.0000,0,47000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(572,'572','0','Display  Y 9 2019',1,15,0,3,35000.0000,0.0000,0,50000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(573,'573','0','Display  Y 6 2019',1,15,0,3,30000.0000,0.0000,0,45000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(574,'574','0','Display  Y 7 2019',1,15,0,3,32000.0000,0.0000,0,47000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(575,'575','0','Display  Y 9 2019 MARCO',1,15,0,1,45000.0000,0.0000,0,60000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(576,'576','0','Display   OPPO-A-20 ',1,15,0,1,45000.0000,0.0000,0,60000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(577,'577','0','Display  OPPO-A-54',1,15,0,3,33000.0000,0.0000,0,48000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(578,'578','0','Display  OPPO-A-57    A77',1,15,0,5,31000.0000,0.0000,0,46000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(579,'579','0','Display  VIVO-Y 21 S ',1,15,0,3,31000.0000,0.0000,0,46000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(580,'580','0','Display  VIVO-Y 20 S ',1,15,0,3,32000.0000,0.0000,0,47000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(581,'581','0','Display  VIVO-V 25 E ',1,15,0,1,45000.0000,0.0000,0,60000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(582,'582','0','Display  HONOR-X6 S ',1,15,0,2,35000.0000,0.0000,0,50000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(583,'583','0','Display  HONOR-X7 A ',1,15,0,1,37000.0000,0.0000,0,52000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(584,'584','0','Display  HONOR-X8 A',1,15,0,2,44000.0000,0.0000,0,59000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(585,'585','0','Display  SPAR-GO 20C ',1,15,0,1,44000.0000,0.0000,0,59000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(586,'586','0','Display  7G PLUS NEGRO',1,15,0,2,44000.0000,0.0000,0,59000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(587,'587','0','Display  7G PLUS BLANCO',1,15,0,2,44000.0000,0.0000,0,59000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(588,'588','0','Display  8G PLUS BLANCO',1,15,0,3,44000.0000,0.0000,0,59000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(589,'589','0','Display  JX       XR',1,15,0,5,44000.0000,0.0000,0,59000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(590,'590','0','Display  JX      11 IPHONE ',1,15,0,4,44000.0000,0.0000,0,59000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(591,'591','0','Display  JK       XS +',1,15,0,1,44000.0000,0.0000,0,59000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(592,'592','0','Display  JK       12 PRO MAX',1,15,0,1,44000.0000,0.0000,0,59000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(593,'593','0','Display  JK       12 PRO',1,15,0,2,44000.0000,0.0000,0,59000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(594,'594','0','Display  JK       13',1,15,0,2,44000.0000,0.0000,0,59000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(595,'595','0','Display  JK       13 PROMAX ',1,15,0,1,44000.0000,0.0000,0,59000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(596,'596','0','Display  JK       13 PRO',1,15,0,2,44000.0000,0.0000,0,59000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(597,'597','0','CABLE  AURICULARES HARVIC  EH-522-D',1,15,0,5,1.0000,0.0000,0,28000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(598,'598','0','CABLE  AURICULARES  PLUS A16',1,15,0,3,1.0000,0.0000,0,20000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(599,'599','0','CABLE  AURICULARES  JBL',1,15,0,9,1.0000,0.0000,0,25000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(600,'600','0','CABLE  AURICULARES HARVIC  EH-521--D',1,15,0,16,1.0000,0.0000,0,15000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(601,'601','0','CABLE  AURICULARES HARVIC  EH-512 BOLSAS ',1,15,0,16,1.0000,0.0000,0,12000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(602,'602','0','CABLE  AURICULARES  LINK N11',1,15,0,1,1.0000,0.0000,0,30000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(603,'603','0','CABLE  AURICULARES  VETEX X-38',1,15,0,1,1.0000,0.0000,0,30000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(604,'604','0','CABLE  AURICULARES  LINK N-06',1,15,0,1,1.0000,0.0000,0,30000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(605,'605','0','CABLE  ARICULARES SAMSUNG AKG ',1,15,0,5,1.0000,0.0000,0,1.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(606,'606','0','CABLE  AURICULAR REDMI M-01',1,15,0,5,1.0000,0.0000,0,1.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(607,'607','0','CABLE  AURICULARES INFINITE ',1,15,0,8,1.0000,0.0000,0,30000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(608,'608','0','CABLE  AURICULARES INFINITE ',1,15,0,7,1.0000,0.0000,0,30000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(609,'609','0','CABLE  AURICULARES  CH-108',1,15,0,4,1.0000,0.0000,0,1.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(610,'610','0','CABLE  AURICULARES  CH-108',1,15,0,6,1.0000,0.0000,0,1.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(611,'611','0','CABLE  AURICULARES  EH-514',1,15,0,8,1.0000,0.0000,0,12000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(612,'612','0','CABLE  AURICULARES  LEO BOSS M10',1,15,0,4,1.0000,0.0000,0,12000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(613,'613','0','CABLE  ARICULARES SAMSUNG S-6',1,15,0,12,1.0000,0.0000,0,10000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(614,'614','0','CABLE  AURICULARES  S-5',1,15,0,11,1.0000,0.0000,0,10000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(615,'615','0','CABLE  AURICULARES  SPARTAN M313',1,15,0,10,1.0000,0.0000,0,12000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(616,'616','0','CABLE  AURICULARES  ',1,15,0,10,1.0000,0.0000,0,12000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(617,'617','0','CABLE  AURICULARES  Z-1',1,15,0,5,1.0000,0.0000,0,10000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(618,'618','0','CABLE  AURICULARES SENCILLOS BOLSA',1,15,0,8,1.0000,0.0000,0,10000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(619,'619','0','CABLE  AURICULARES SENCILLOS BOLSA',1,15,0,16,1.0000,0.0000,0,10000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(620,'620','0','INALAMBRICO AURICULARES HARVIC INALAMBRICO BT-543 II',1,15,0,21,1.0000,0.0000,0,50000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(621,'621','0','INALAMBRICO AUICULARES REDMI BUDS 4',1,15,0,1,1.0000,0.0000,0,1.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(622,'622','0','INALAMBRICO AURICULARES GALAXI BUDS FE',1,15,0,5,1.0000,0.0000,0,170000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(623,'623','0','INALAMBRICO AURICULARES REDMI AIR DOTS 2',1,15,0,2,1.0000,0.0000,0,1.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(624,'624','0','INALAMBRICO AURICULARES E6S',1,15,0,1,1.0000,0.0000,0,1.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(625,'625','0','INALAMBRICO AURICULARES MARKBOSS BT 111',1,15,0,3,1.0000,0.0000,0,60000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(626,'626','0','INALAMBRICO AURICULARES M88 PLUS ',1,15,0,4,1.0000,0.0000,0,40000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(627,'627','0','INALAMBRICO AURICULARES Y80',1,15,0,4,1.0000,0.0000,0,1.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(628,'628','0','INALAMBRICO AURICULARES AKZ G5   ',1,15,0,3,1.0000,0.0000,0,60000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(629,'629','0','INALAMBRICO AURICULARES MARK BOSS SPORT MAX',1,15,0,4,1.0000,0.0000,0,50000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(630,'630','0','INALAMBRICO AURICULARES Q218',1,15,0,2,1.0000,0.0000,0,70000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(631,'631','0','INALAMBRICO AURICULARES IPHONES  AIR PODS PRO 2 GENERACION ',1,15,0,2,1.0000,0.0000,0,170000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(632,'632','0','INALAMBRICO AURICULARES IPHONES  AIR PODS PRO 2 GENERACION ',1,15,0,3,1.0000,0.0000,0,170000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(633,'633','0','INALAMBRICO AURICULARES IPHONES  AIR PODS PRO 3 GENERACION ',1,15,0,2,1.0000,0.0000,0,100000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(634,'634','0','INALAMBRICO AURICULARES IPHONES  AIR PODS PRO 4GENERACION ',1,15,0,2,1.0000,0.0000,0,120000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(635,'635','0','CABLE  AURICULARES APPLE APPLES ORIGINAL ',1,15,0,3,1.0000,0.0000,0,60000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(636,'636','0','CABLE  AURICULARES APPLE APPLES GENERICO',1,15,0,3,1.0000,0.0000,0,25000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(637,'637','0','CABLE  EARPODS TIPO USB-C ORIGINAL ',1,15,0,1,1.0000,0.0000,0,60000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(638,'638','0','PARLANTES PC HARVIC PRPC-895 PARLANTES PC',1,15,0,1,1.0000,0.0000,0,60000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(639,'639','0','PARLANTE  PRPC-894 PARLANTES PC',1,15,0,1,1.0000,0.0000,0,1.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(640,'640','0','PARLANTE  PRPC-892 PARLANTES PC',1,15,0,1,1.0000,0.0000,0,1.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(641,'641','0','PARLANTE  PRPC-896 PARLANTES PC',1,15,0,1,1.0000,0.0000,0,1.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(642,'642','0','PARLANTE  PRPC-892 PARLANTES PC',1,15,0,1,1.0000,0.0000,0,1.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(643,'643','0','PARLANTE  E-005 PARLANTES PC',1,15,0,1,1.0000,0.0000,0,35000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(644,'644','0','PARLANTE MINI DIGITAL SPEAKER PARLANTES PC',1,15,0,3,1.0000,0.0000,0,30000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(645,'645','0','TECLACO CABLE  KB2 TECLADOS ',1,15,0,2,1.0000,0.0000,0,1.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(646,'646','0','TECLADO INALAMBRICO  KIT TECLADOS ',1,15,0,2,1.0000,0.0000,0,1.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(647,'647','0','TECLADO MINI MARK BOSS TECLADOS ',1,15,0,4,1.0000,0.0000,0,35000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(648,'648','0','MOUSE  HARVIC USB 423 MOUSE CABLE ',1,15,0,1,1.0000,0.0000,0,25000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(649,'649','0','MOUSE TRANSFORME HARVIC USB 422 MOUSE CABLE ',1,15,0,2,1.0000,0.0000,0,30000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(650,'650','0','MOUSE OPTICAL MS116 MOUSE CABLE ',1,15,0,4,1.0000,0.0000,0,10000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(651,'651','0','MOUSE  X3 MOUSE CABLE ',1,15,0,2,1.0000,0.0000,0,30000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(652,'652','0','MOUSE ERGONOMIC  MOUSE INALAMBRICO',1,15,0,4,1.0000,0.0000,0,70000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(653,'653','0','MOUSE  JB208 MOUSE INALAMBRICO',1,15,0,2,1.0000,0.0000,0,40000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(654,'654','0','MOUSE HARVIC  MBT-402 MOUSE INALAMBRICO',1,15,0,2,1.0000,0.0000,0,60000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(655,'655','0','MOUSE HARVIC  MBT-403 MOUSE INALAMBRICO',1,15,0,1,1.0000,0.0000,0,30000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(656,'656','0','VENTOSA   ACCESORIOS ',1,15,0,9,1.0000,0.0000,0,15000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(657,'657','0','LLAVERO LARGOS  PERLADOS  ACCESORIOS ',1,15,0,2,1.0000,0.0000,0,15000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(658,'658','0','LLAVEROS CORTOS   ACCESORIOS ',1,15,0,4,1.0000,0.0000,0,12000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(659,'659','0','VENTOSA  FIGURA  ACCESORIOS ',1,15,0,2,1.0000,0.0000,0,8000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(660,'660','0','VENTOSA  1.1 ACCESORIOS ',1,15,0,2,1.0000,0.0000,0,15000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(661,'661','0','VENTILADOR  SPRAY MINI FAN ACCESORIOS ',1,15,0,3,1.0000,0.0000,0,35000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(662,'662','0','VENTILADOR  PA-28 ACCESORIOS ',1,15,0,2,1.0000,0.0000,0,30000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(663,'663','0','VENTILADOR  PEQUE?O ACCESORIOS ',1,15,0,2,1.0000,0.0000,0,30000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(664,'664','0','VENTOSA  SOPORTE ACCESORIOS ',1,15,0,5,1.0000,0.0000,0,15000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(665,'665','0','AIR PODS  PRO2 PROTECTORES AURICULARES ',1,15,0,9,1.0000,0.0000,0,25000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(666,'666','0','AIR PODS 3  PROTECTORES AURICULARES ',1,15,0,11,1.0000,0.0000,0,25000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(667,'667','0','AIR PODS 4  PROTECTORES AURICULARES ',1,15,0,10,1.0000,0.0000,0,25000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(668,'668','0','AIR PODS 2 MH2 PROTECTORES AURICULARES ',1,15,0,3,1.0000,0.0000,0,10000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(669,'669','0','HARVIC USB 4 GB MENORIA ',1,15,0,1,1.0000,0.0000,0,20000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(670,'670','0','HARVIC USB 128 GB MENORIA ',1,15,0,1,1.0000,0.0000,0,1.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(671,'671','0','HARVIC USB 16 GB MENORIA ',1,15,0,1,1.0000,0.0000,0,35000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(672,'672','0','HORIZONE  32GB MENORIA ',1,15,0,3,1.0000,0.0000,0,40000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(673,'673','0','MICRO SD  4GB MENORIA ',1,15,0,5,1.0000,0.0000,0,20000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(674,'674','0','MICRO SD  16GB MENORIA ',1,15,0,1,1.0000,0.0000,0,30000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(675,'675','0','IPHONE BETTERY PACK                                 3.000 MA BATERIAS INALAMBRICAS ',1,15,0,4,1.0000,0.0000,0,80000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(676,'676','0','POWER BANK PBM-633             10.000 MA  BATERIAS INALAMBRICAS ',1,15,0,1,1.0000,0.0000,0,130000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(677,'677','0','POWER BANK PB-120                   5.600 MA BATERIAS INALAMBRICAS ',1,15,0,1,1.0000,0.0000,0,80000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(678,'678','0','POWER BANK MINI CH-702        5.000 MA  BATERIAS INALAMBRICAS ',1,15,0,2,1.0000,0.0000,0,80000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(679,'679','0','POWER BANK RG 10.000 MA BATERIAS CABLE ',1,15,0,1,1.0000,0.0000,0,120000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(680,'680','0','POWER BANK RG 20.000 MA BATERIAS CABLE ',1,15,0,1,1.0000,0.0000,0,140000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(681,'681','0','POWER BANK VOLTRAX             12.000 MA BATERIAS CABLE ',1,15,0,1,1.0000,0.0000,0,1.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(682,'682','0','TGO 5G SIM CARD',1,15,0,11,1.0000,0.0000,0,4000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(683,'683','0','WOM 3G SIM CARD',1,15,0,8,1.0000,0.0000,0,4000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(684,'684','0','CLARO 4G SIM CARD',1,15,0,3,1.0000,0.0000,0,4000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(685,'685','0','MOVISTAR 5G SIM CARD',1,15,0,10,1.0000,0.0000,0,4000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(686,'686','0','SPINGEN SP-CH-003 CARGADOR DE CARRO',1,15,0,2,1.0000,0.0000,0,30000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(687,'687','0','AEDOS  AD-45 CARGADOR DE CARRO',1,15,0,2,1.0000,0.0000,0,30000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(688,'688','0','VOLTRAX 38W CARGADOR DE CARRO',1,15,0,1,1.0000,0.0000,0,40000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(689,'689','0','LZ-MOPD 18W CARGADOR DE CARRO',1,15,0,3,1.0000,0.0000,0,20000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(690,'690','0','MARK BOSS  4.1 AMP CARGADOR DE CARRO',1,15,0,3,1.0000,0.0000,0,30000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(691,'691','0','CAR CHARGER  KN-18 CARGADOR DE CARRO',1,15,0,2,1.0000,0.0000,0,30000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(692,'692','0','FASTCHARGER 25W CARGADOR DE CARRO',1,15,0,2,1.0000,0.0000,0,30000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(693,'693','0','FASTCHARGER CR-53 CARGADOR DE CARRO',1,15,0,5,1.0000,0.0000,0,20000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(694,'694','0','MARK BOSS  3.1A CARGADOR DE CARRO',1,15,0,6,1.0000,0.0000,0,20000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(695,'695','0','MARK BOSS  BLC-71 CARGADOR DE CARRO',1,15,0,2,1.0000,0.0000,0,20000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(696,'696','0','  CARGADOR DE CARRO',1,15,0,0,1.0000,0.0000,0,1.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(697,'697','0','BATRI TDT  ACCESARIOS TV',1,15,0,2,1.0000,0.0000,0,65000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(698,'698','0','TV BOX   ACCESARIOS TV',1,15,0,1,1.0000,0.0000,0,150000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(699,'699','0','TV STICK 8K  ACCESARIOS TV',1,15,0,2,1.0000,0.0000,0,180000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(700,'700','0','HARVIC CABLE 2 EN 1  ACCESARIOS TV',1,15,0,6,1.0000,0.0000,0,10000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(701,'701','0','HARVIC AUX 1 EN 1 ACCESARIOS TV',1,15,0,10,1.0000,0.0000,0,15000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(702,'702','0','HDMI 3 M ACCESARIOS TV',1,15,0,4,1.0000,0.0000,0,20000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(703,'703','0','HDMI 5 M ACCESARIOS TV',1,15,0,1,1.0000,0.0000,0,28000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(704,'704','0','HDMI 10 M ACCESARIOS TV',1,15,0,3,1.0000,0.0000,0,38000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(705,'705','0','CABLE ECONOMICO 2 EN 1  ACCESARIOS TV',1,15,0,3,1.0000,0.0000,0,10000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(706,'706','0','CABLE ECONOMICO 3 EN 1 ACCESARIOS TV',1,15,0,4,1.0000,0.0000,0,15000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(707,'707','0','CABLE ECONOMICO 2 EN 1    3M ACCESARIOS TV',1,15,0,1,1.0000,0.0000,0,20000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(708,'708','0','MULTI USB  2.0 ACCESARIOS TV',1,15,0,1,1.0000,0.0000,0,35000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(709,'709','0','MULTI TOMAS  2 METROS  ACCESARIOS TV',1,15,0,2,1.0000,0.0000,0,45000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(710,'710','0','ADAPTER CONVERTER  TIPOC-USB CONVERTIDORES ',1,15,0,2,1.0000,0.0000,0,15000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(711,'711','0','FASHION OTG LANIN CONVERTIDORES ',1,15,0,3,1.0000,0.0000,0,15000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(712,'712','0','FASHION OTG V8 CONVERTIDORES ',1,15,0,3,1.0000,0.0000,0,15000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(713,'713','0','WIRELES  SX20 MICROFONOS ',1,15,0,1,1.0000,0.0000,0,10.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(714,'714','0','WIRELES  M8PRO MICROFONOS ',1,15,0,1,1.0000,0.0000,0,10.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(715,'715','0','WIRELES  SE91 MICROFONOS ',1,15,0,1,1.0000,0.0000,0,10.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(716,'716','0','WIRELES  ONE TU 2 MICROFONOS ',1,15,0,1,1.0000,0.0000,0,70000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(717,'717','0','WIRELES  (COMBO) MICROFONOS ',1,15,0,1,1.0000,0.0000,0,35000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(718,'718','0','WIRELES  SX63 MICROFONOS ',1,15,0,1,1.0000,0.0000,0,1.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(719,'719','0','WIRELES  SX31 MICROFONOS ',1,15,0,3,1.0000,0.0000,0,120000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(720,'720','0','TABLE A9 11? 360 PROTECTORES TABLE ',1,15,0,1,1.0000,0.0000,0,80000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(721,'721','0','TABLE A9 8.7  PROTECTORES TABLE ',1,15,0,2,1.0000,0.0000,0,70000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(722,'722','0','SMART KEYBOARD IPD11 PROTECTORES TABLE ',1,15,0,1,1.0000,0.0000,0,140000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(723,'723','0','SMART KEYBOARD A8 PROTECTORES TABLE ',1,15,0,1,1.0000,0.0000,0,140000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(724,'724','0','IPD 10 IPD 10 PROTECTORES TABLE ',1,15,0,3,1.0000,0.0000,0,80000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(725,'725','0','IPD11 IPD11 PROTECTORES TABLE ',1,15,0,1,1.0000,0.0000,0,80000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(726,'726','0','IPD11 PASTA DURA PROTECTORES TABLE ',1,15,0,1,1.0000,0.0000,0,60000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(727,'727','0','TABLE 7\"  PROTECTORES TABLE ',1,15,0,6,1.0000,0.0000,0,25000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(728,'728','0','PROTECTORES CAMARAS   PROTECTORES CAMARA ',1,15,0,50,1.0000,0.0000,0,1.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(729,'729','0','CARGADORES  IPHONE ADAPTER 35W TIPO C-C',1,15,0,9,1.0000,0.0000,0,60000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(730,'730','0','CARGADORES  IPHONE ADAPTER TIPOC-LIGHTNING 20W',1,15,0,33,1.0000,0.0000,0,60000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(731,'731','0','CARGADORES  POWER ADAPTER LIGHTNING-USB 5W',1,15,0,3,1.0000,0.0000,0,28000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(732,'732','0','CARGADORES  SPEED CHANGER AF-V8',1,15,0,15,1.0000,0.0000,0,10000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(733,'733','0','CARGADORES  QUICK CHARGER-V8',1,15,0,20,1.0000,0.0000,0,15000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(734,'734','0','CARGADORES  HARVIC-V8',1,15,0,9,1.0000,0.0000,0,20000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(735,'735','0','CARGADORES  FAST CHARGER-V8',1,15,0,12,1.0000,0.0000,0,20000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(736,'736','0','CARGADORES  ROMMOS-V8',1,15,0,9,1.0000,0.0000,0,30000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(737,'737','0','CARGADORES  MARK BOSS-V8',1,15,0,10,1.0000,0.0000,0,30000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(738,'738','0','CARGADORES  TUGEV V-8 5.0',1,15,0,10,1.0000,0.0000,0,40000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(739,'739','0','CARGADORES  TUGEV V-8 4.0',1,15,0,10,1.0000,0.0000,0,30000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(740,'740','0','CARGADORES  TRAVEL ADAPTER 38W V-8',1,15,0,4,1.0000,0.0000,0,30000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(741,'741','0','CARGADORES  FAST CHARGER TIPO C 5 AMP',1,15,0,1,1.0000,0.0000,0,20000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(742,'742','0','CARGADORES  HARVIC TIPO C 3.1',1,15,0,10,1.0000,0.0000,0,20000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(743,'743','0','CARGADORES  TUGEV TIPO C 4',1,15,0,9,1.0000,0.0000,0,20000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(744,'744','0','CARGADORES  TUGEV TIPO C 5',1,15,0,9,1.0000,0.0000,0,30000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(745,'745','0','CARGADORES  MARK BOSS TIPO C 5 AMP',1,15,0,10,1.0000,0.0000,0,30000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(746,'746','0','CARGADORES  ROMMOS TIPO C 5.1 AMP',1,15,0,9,1.0000,0.0000,0,30000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(747,'747','0','CARGADORES  SPINGEN TIPO C 5AMP',1,15,0,9,1.0000,0.0000,0,40000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(748,'748','0','CARGADORES  SAMSUNG TIPO C 3.0 AMP',1,15,0,8,1.0000,0.0000,0,1.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(749,'749','0','CARGADORES  SAMSUNG TIPO C 25W',1,15,0,3,1.0000,0.0000,0,50000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(750,'750','0','CARGADORES  SAMSUNG TIPO C 45W',1,15,0,1,1.0000,0.0000,0,40000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(751,'751','0','CARGADORES  TURBO CHARGER 45W TIPO C ',1,15,0,2,1.0000,0.0000,0,35000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(752,'752','0','CARGADORES  XIOMI 120W TIPO C ',1,15,0,3,1.0000,0.0000,0,120000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(753,'753','0','CARGADORES  CARGADOR UNIVERSAL MULTI CONECTOR ',1,15,0,5,1.0000,0.0000,0,30000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(754,'754','0','CABEZOTES  CABEZA 25W TIPOC ',1,15,0,11,1.0000,0.0000,0,30000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(755,'755','0','CABEZOTES  CABEZA ORIGINAL SAMSUNG TIPOC',1,15,0,10,1.0000,0.0000,0,100000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(756,'756','0','CABEZOTES  CABEZA MASTER 25W',1,15,0,8,1.0000,0.0000,0,30000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(757,'757','0','CABEZOTES  CABEZA IPONE ORIGINAL USB-C 20W',1,15,0,6,1.0000,0.0000,0,100000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(758,'758','0','CABEZOTES  CABEZA IPONE ORIGINAL USB-C 25W',1,15,0,13,1.0000,0.0000,0,40000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(759,'759','0','CABEZOTES  CABEZA SPARE PARTS 0.1',1,15,0,6,1.0000,0.0000,0,10000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(760,'760','0','CABLES  CABLE ORIGINAL IPHONE Lightning-C 2METROS',1,15,0,4,1.0000,0.0000,0,100000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(761,'761','0','CABLES  CABLE ORIGINAL IPHONE Lightning-C 1 METROS',1,15,0,3,1.0000,0.0000,0,60000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(762,'762','0','CABLES  CABLE GENERICO Lightning-C 1 METRO',1,15,0,13,1.0000,0.0000,0,30000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(763,'763','0','CABLES  CABLE GENERICO Lightning-C 2 METRO ',1,15,0,3,1.0000,0.0000,0,40000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(764,'764','0','CABLES  CABLE GENERICO Lightning-USB ',1,15,0,5,1.0000,0.0000,0,30000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(765,'765','0','CABLES  CABLE GENERICO TIPO C-C',1,15,0,7,1.0000,0.0000,0,40000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(766,'766','0','CABLES  CABLE SOMOSTEL 3.1 A USB- Lightning',1,15,0,10,1.0000,0.0000,0,15000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(767,'767','0','CABLES  CABLE MARK BOSS 6A Lightning-USB ',1,15,0,9,1.0000,0.0000,0,20000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(768,'768','0','CABLES  CABLE HARVIC TIPOC 4A-Lightning',1,15,0,10,1.0000,0.0000,0,25000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(769,'769','0','CABLES  CABLE MARK BOSS 5A Lightning-USB ',1,15,0,9,1.0000,0.0000,0,15000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(770,'770','0','CABLES  CABLE MULTIFUNCIONAL 9A',1,15,0,4,1.0000,0.0000,0,30000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(771,'771','0','CABLES  CABLE SAMSUNG USB-V8',1,15,0,4,1.0000,0.0000,0,18000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(772,'772','0','CABLES  CABLE SPIGEN DE 5A USB-V8',1,15,0,10,1.0000,0.0000,0,22000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(773,'773','0','CABLES  CABLE SPIGEN DE 4.1 USB-V8',1,15,0,8,1.0000,0.0000,0,18000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(774,'774','0','CABLES  CABLE HARVIC 3.1A USB-V8',1,15,0,8,1.0000,0.0000,0,18000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(775,'775','0','CABLES  CABLE HARVIC 4A USB-V8',1,15,0,6,1.0000,0.0000,0,15000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(776,'776','0','CABLES  CABLE CH TECHNOLOGY 3.1A USB-V8',1,15,0,10,1.0000,0.0000,0,15000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(777,'777','0','CABLES  CABLE CH TECHNOLOGY 3.1A USB-TIPOC',1,15,0,10,1.0000,0.0000,0,15000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(778,'778','0','CABLES  CABLE HARVIC 4A USB-TIPO C',1,15,0,7,1.0000,0.0000,0,20000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(779,'779','0','CABLES  CABLE SPIGEN DE 5A USB-TIPOC',1,15,0,7,1.0000,0.0000,0,22000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(780,'780','0','CABLES  CABLE SPIGEN DE 4.1 USB-TIPO C',1,15,0,8,1.0000,0.0000,0,18000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(781,'781','0','CABLES  CABLE JB-CB13 TIPO C-C 120W',1,15,0,8,1.0000,0.0000,0,18000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(782,'782','0','CABLES  CABLE HARVIC 3.1A USB-TIPO C',1,15,0,10,1.0000,0.0000,0,18000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(783,'783','0','CABLES  CABLE XIAOMI USB-TIPOC',1,15,0,4,1.0000,0.0000,0,35000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(784,'784','0','CABLES  CABLE SAMSUNG USB-TIPO C ',1,15,0,2,1.0000,0.0000,0,18000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(785,'785','0','CABLES  CABLE SOMOSTEL 60 W TIPO C-C ',1,15,0,6,1.0000,0.0000,0,35000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(786,'786','0','CABLES  CABLE MARK BOSS 5A TIPO C-C',1,15,0,8,1.0000,0.0000,0,30000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(787,'787','0','CABLES  CABLE MARK BOSS 7A USB-V8',1,15,0,1,1.0000,0.0000,0,30000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(788,'788','0','FORRO IP MAGTICO PASTA DURA 16 PROMAX',1,15,0,7,12000.0000,0.0000,0,35000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(789,'789','0','FORRO IP 16 PROMAX D?LAR ',1,15,0,1,12000.0000,0.0000,0,20000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(790,'790','0','FORRO IP PRADA PASTA DURA 16 PROMAX',1,15,0,2,12000.0000,0.0000,0,35000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(791,'791','0','FORRO IP METALICO 16 PROMAX',1,15,0,3,12000.0000,0.0000,0,50000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(792,'792','0','FORRO IP  TARJETERO 16 PROMAX',1,15,0,2,12000.0000,0.0000,0,45000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(793,'793','0','FORRO IP ESCARCHADO CAMARA 16 PROMAX',1,15,0,2,12000.0000,0.0000,0,45000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(794,'794','0','FORRO IP MAGTICO CAMARA 16 PROMAX',1,15,0,2,12000.0000,0.0000,0,40000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(795,'795','0','FORRO IP DE LUJO ESTRELLA 16 PROMAX',1,15,0,1,12000.0000,0.0000,0,25000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(796,'796','0','FORRO IP TARJETERO 16 PRO',1,15,0,3,12000.0000,0.0000,0,45000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(797,'797','0','FORRO IP 360 16 PRO',1,15,0,2,12000.0000,0.0000,0,25000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(798,'798','0','FORRO IP MAGTICO PASTA DURA 16 PRO',1,15,0,2,12000.0000,0.0000,0,35000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(799,'799','0','FORRO IP DE LUJO DOLAR16 PRO',1,15,0,1,12000.0000,0.0000,0,15000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(800,'800','0','FORRO IP 360 16 PROMAX',1,15,0,4,12000.0000,0.0000,0,25000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(801,'801','0','FORRO IP 16 MAGNETICO PASTA DURA',1,15,0,14,12000.0000,0.0000,0,35000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(802,'802','0','FORRO IP 16 MAGNETICO PASTA DURA CAMARA',1,15,0,1,12000.0000,0.0000,0,40000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(803,'803','0','FORRO IP 16 MAGNETICO CAJA',1,15,0,4,12000.0000,0.0000,0,35000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(804,'804','0','FORRO IP 16 TARJETERO ',1,15,0,1,12000.0000,0.0000,0,40000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(805,'805','0','FORRO IP 15 PROMAX ESCARCHADO CAMARA ',1,15,0,3,12000.0000,0.0000,0,45000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(806,'806','0','FORRO IP 15 PROMAX METALICO ',1,15,0,4,12000.0000,0.0000,0,50000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(807,'807','0','FORRO IP   15 PROMAX TARJETERO',1,15,0,2,12000.0000,0.0000,0,40000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(808,'808','0','FORRO IP 15 PRO MAX MAGNETICO CAJA',1,15,0,7,12000.0000,0.0000,0,35000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(809,'809','0','FORRO IP 360 15 PROMAX',1,15,0,6,12000.0000,0.0000,0,25000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(810,'810','0','FORRO IP 15 PROMAX MAGNETICO PASTA DURA',1,15,0,5,12000.0000,0.0000,0,35000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(811,'811','0','FORRO IP 15 PROMAX LUJO CORAZON',1,15,0,1,12000.0000,0.0000,0,22000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(812,'812','0','FORRO IP 15 PRO LUJO DEGRADADO ',1,15,0,3,12000.0000,0.0000,0,25000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(813,'813','0','FORRO IP 15 PRO MAGNETICO CAJA',1,15,0,2,12000.0000,0.0000,0,35000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(814,'814','0','FORRO IP 15 PRO MAGNETICO PASTA DURA',1,15,0,7,12000.0000,0.0000,0,30000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(815,'815','0','FORRO IP PERLADO 15 PRO',1,15,0,1,12000.0000,0.0000,0,25000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(816,'816','0','FORRO IP 15 MAGNETICO PASTA DURA',1,15,0,12,12000.0000,0.0000,0,35000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(817,'817','0','FORRO IP 15 MAGNETICO PASTA DURA CAMARA',1,15,0,4,12000.0000,0.0000,0,40000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(818,'818','0','FORRO IP 14 PROMAX MAGNETICO CAJA',1,15,0,1,12000.0000,0.0000,0,23000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(819,'819','0','FORRO IP 14 PROMAX LUJO',1,15,0,1,12000.0000,0.0000,0,23000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(820,'820','0','FORRO IP 360 14 PROMAX',1,15,0,2,12000.0000,0.0000,0,25000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(821,'821','0','FORRO IP 14 PROMAX MAGNETICO PASTA DURA',1,15,0,3,12000.0000,0.0000,0,35000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(822,'822','0','FORRO IP 14 PRO MAGNETICO CAMARA',1,15,0,1,12000.0000,0.0000,0,40000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(823,'823','0','FORRO IP 14 PRO LUJO DEGRADADO ',1,15,0,5,12000.0000,0.0000,0,25000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(824,'824','0','FORRO IP 14  MAGNETICO PASTA DURA',1,15,0,18,12000.0000,0.0000,0,30000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(825,'825','0','FORRO IP 14  TIPO CUERO SENCILLO',1,15,0,4,12000.0000,0.0000,0,20000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(826,'826','0','FORRO IP 14 MAGNETICO CAJA',1,15,0,4,12000.0000,0.0000,0,35000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(827,'827','0','FORRO IP 14 CANGURO ',1,15,0,5,12000.0000,0.0000,0,35000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(828,'828','0','FORRO IP 14 MAGNETICO CAMARA',1,15,0,2,12000.0000,0.0000,0,40000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(829,'829','0','FORRO IP METALICO 14',1,15,0,1,12000.0000,0.0000,0,50000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(830,'830','0','FORRO IP 13 PROMAX PASTA DURA CAMARA',1,15,0,9,12000.0000,0.0000,0,45000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(831,'831','0','FORRO IP  TARJETERO 13 PROMAX',1,15,0,1,12000.0000,0.0000,0,40000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(832,'832','0','FORRO IP 13 PROMAX CANGURO ACCESORIO',1,15,0,3,12000.0000,0.0000,0,45000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(833,'833','0','FORRO IP 13 PROMAX MAGNETICO CAJA',1,15,0,3,12000.0000,0.0000,0,35000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(834,'834','0','FORRO IP 13 PROMAX MAGNETICO PASTA DURA',1,15,0,5,12000.0000,0.0000,0,35000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(835,'835','0','FORRO IP 13 PROMAX CANGURO ',1,15,0,5,12000.0000,0.0000,0,30000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(836,'836','0','FORRO IP 13 PRO MAGNETICO PASTA DURA',1,15,0,3,12000.0000,0.0000,0,35000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(837,'837','0','FORRO IP 13 PRO MAGNETICO CAMARA',1,15,0,4,12000.0000,0.0000,0,45000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(838,'838','0','FORRO IP 12 PROMAX MAGNETICO SOPORTE',1,15,0,3,12000.0000,0.0000,0,45000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(839,'839','0','FORRO IP 12 PROMAX MAGNETICO CAJA',1,15,0,6,12000.0000,0.0000,0,35000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(840,'840','0','FORRO IP 12 PROMAX MAGNETICO ESCARCHADO',1,15,0,4,12000.0000,0.0000,0,30000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(841,'841','0','FORRO IP 12 PRO CAJA',1,15,0,0,12000.0000,0.0000,0,20000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(842,'842','0','FORRO IP 12 PRO MAGNETICO PASTA DURA',1,15,0,6,12000.0000,0.0000,0,35000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(843,'843','0','FORRO IP 12 MAGNETICO CAMARA',1,15,0,7,12000.0000,0.0000,0,40000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(844,'844','0','FORRO IP 11 PROMAX CAJA',1,15,0,10,12000.0000,0.0000,0,35000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(845,'845','0','FORRO IP 11 PROMAX 360',1,15,0,2,12000.0000,0.0000,0,25000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(846,'846','0','FORRO IP 11 PRO PASTA DURA ',1,15,0,1,12000.0000,0.0000,0,35000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(847,'847','0','FORRO IP 11 MAGNETICO CAJA ',1,15,0,4,12000.0000,0.0000,0,35000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(848,'848','0','FORRO IP 11 MAGNETICO SENCILLO',1,15,0,9,12000.0000,0.0000,0,25000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(849,'849','0','FORRO IP 11 360',1,15,0,2,12000.0000,0.0000,0,25000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(850,'850','0','FORRO IP 11 CANGURO ',1,15,0,2,12000.0000,0.0000,0,35000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(851,'851','0','FORRO STITCH ',1,15,0,30,12000.0000,0.0000,0,25000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(852,'852','0','SILICON 16 PROMAX ',1,15,0,8,12000.0000,0.0000,0,20000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(853,'853','0','SILICON 16 PRO',1,15,0,10,5000.0000,0.0000,0,20000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(854,'854','0','SILICON 16 ',1,15,0,9,5000.0000,0.0000,0,20000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(855,'855','0','SILICON 15 PROMAX',1,15,0,9,5000.0000,0.0000,0,20000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(856,'856','0','SILICON 15 PRO',1,15,0,8,5000.0000,0.0000,0,20000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(857,'857','0','SILICON 15',1,15,0,6,5000.0000,0.0000,0,20000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(858,'858','0','SILICON 14 PROMAX',1,15,0,8,5000.0000,0.0000,0,20000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(859,'859','0','SILICON 14 PRO',1,15,0,7,5000.0000,0.0000,0,20000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(860,'860','0','SILICON 14 ',1,15,0,8,5000.0000,0.0000,0,20000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(861,'861','0','SILICON 13 PROMAX',1,15,0,6,5000.0000,0.0000,0,20000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(862,'862','0','SILICON 13 PRO',1,15,0,8,5000.0000,0.0000,0,20000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(863,'863','0','SILICON 12 PROMAX',1,15,0,9,5000.0000,0.0000,0,20000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(864,'864','0','SILICON 12',1,15,0,10,5000.0000,0.0000,0,20000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(865,'865','0','SILICON 11 PROMAX',1,15,0,9,5000.0000,0.0000,0,20000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(866,'866','0','SILICON 11 PRO',1,15,0,9,5000.0000,0.0000,0,20000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(867,'867','0','SILICON 11 ',1,15,0,5,5000.0000,0.0000,0,20000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(868,'868','0','FORRO IP 7 MAGNETICO ',1,15,0,4,5000.0000,0.0000,0,20000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(869,'869','0','SILICON IP 7',1,15,0,4,5000.0000,0.0000,0,20000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(870,'870','0','SILICON XS-+',1,15,0,10,5000.0000,0.0000,0,20000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(871,'871','0','SILICON XR',1,15,0,4,5000.0000,0.0000,0,20000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(872,'872','0','SILICON XXS',1,15,0,4,5000.0000,0.0000,0,20000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(873,'873','0','FORRO IP 16 PROMAX MAGNETICO SENCILLO',1,15,0,6,8000.0000,0.0000,0,25000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(874,'874','0','FORRO IP 16 PRO MAGNETICO SENCILLO',1,15,0,9,8000.0000,0.0000,0,25000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(875,'875','0','FORRO IP 16  MAGNETICO SENCILLO',1,15,0,4,8000.0000,0.0000,0,25000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(876,'876','0','FORRO IP 15 PROMAX MAGNETICO SENCILLO',1,15,0,10,8000.0000,0.0000,0,25000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(877,'877','0','FORRO IP 15 PRO MAGNETICO SENCILLO',1,15,0,7,8000.0000,0.0000,0,25000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(878,'878','0','FORRO IP 15 PLUS MAGNETICO SENCILLO',1,15,0,5,8000.0000,0.0000,0,25000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(879,'879','0','FORRO IP 15 MAGNETICO SENCILLO',1,15,0,2,8000.0000,0.0000,0,25000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(880,'880','0','FORRO IP 14 PROMAX SPASE MAGNETICO ',1,15,0,10,8000.0000,0.0000,0,25000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(881,'881','0','FORRO IP 14 PRO MAGNETICO SENCILLO',1,15,0,2,8000.0000,0.0000,0,25000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(882,'882','0','FORRO IP 14 PLUS MAGNETICO SENCILLO',1,15,0,4,8000.0000,0.0000,0,25000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(883,'883','0','FORRO IP 14 PROMAX SENCILLO MAGNETICO ',1,15,0,1,8000.0000,0.0000,0,25000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(884,'884','0','FORRO IP 13 PROMAX MAGNETICO SENCILLO',1,15,0,10,8000.0000,0.0000,0,25000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(885,'885','0','FORRO IP 13 PROMAX SPASE MAGNETICO ',1,15,0,9,8000.0000,0.0000,0,25000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(886,'886','0','FORRO IP 13 SPASE MAGNETICO ',1,15,0,10,8000.0000,0.0000,0,25000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(887,'887','0','FORRO IP 13 PRO MAGNETICO SENCILLO',1,15,0,4,8000.0000,0.0000,0,25000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(888,'888','0','FORRO IP 12 PROMAX MAGNETICO SENCILLO',1,15,0,7,8000.0000,0.0000,0,25000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(889,'889','0','FORRO IP 12 MAGNETICO SENCILLO',1,15,0,2,8000.0000,0.0000,0,25000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(890,'890','0','FORRO IP 11 PROMAX MAGNETICO SENCILLO',1,15,0,3,8000.0000,0.0000,0,25000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(891,'891','0','SPACE IP 16 PROMAX ',1,15,0,1,5500.0000,0.0000,0,15000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(892,'892','0','SPACE IP 16 PRO',1,15,0,7,5500.0000,0.0000,0,15000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(893,'893','0','SPACE IP 16 ',1,15,0,7,5500.0000,0.0000,0,15000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(894,'894','0','SPACE IP 15 PROMAX ',1,15,0,7,5500.0000,0.0000,0,15000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(895,'895','0','SPACE IP 15 PRO',1,15,0,7,5500.0000,0.0000,0,15000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(896,'896','0','SPACE IP 14 PROMAX',1,15,0,5,5500.0000,0.0000,0,15000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(897,'897','0','SPACE IP 14-13',1,15,0,15,5500.0000,0.0000,0,15000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(898,'898','0','SPACE IP 12 PROMAX',1,15,0,7,5500.0000,0.0000,0,15000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(899,'899','0','SPACE IP 11 PROMAX',1,15,0,3,5500.0000,0.0000,0,15000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(900,'900','0','SPACE IP 11 PRO MAGNETICO',1,15,0,4,5500.0000,0.0000,0,15000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(901,'901','0','SPACE IP 11',1,15,0,1,5500.0000,0.0000,0,15000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(902,'902','0','SPACE IP  XS+',1,15,0,3,5500.0000,0.0000,0,15000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(903,'903','0','SPACE IP  6-7-8',1,15,0,3,5500.0000,0.0000,0,15000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(904,'904','0','SPACE IP  XR',1,15,0,1,5500.0000,0.0000,0,15000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(905,'905','0','SPACE IP  X',1,15,0,4,5500.0000,0.0000,0,15000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(906,'906','0','SPACE A56',1,15,0,2,5500.0000,0.0000,0,15000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(907,'907','0','SPACE A54',1,15,0,4,5500.0000,0.0000,0,15000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(908,'908','0','SPACE A35',1,15,0,2,5500.0000,0.0000,0,15000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(909,'909','0','SPACE A34',1,15,0,3,5500.0000,0.0000,0,15000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(910,'910','0','SPACE A32',1,15,0,3,5500.0000,0.0000,0,15000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(911,'911','0','SPACE A25',1,15,0,3,5500.0000,0.0000,0,15000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(912,'912','0','SPACE S24 ULTRA ',1,15,0,5,5500.0000,0.0000,0,15000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(913,'913','0','SPACE A21S',1,15,0,2,5500.0000,0.0000,0,15000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(914,'914','0','SPACE A22 4G',1,15,0,3,5500.0000,0.0000,0,15000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(915,'915','0','SPACE A15',1,15,0,3,5500.0000,0.0000,0,15000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(916,'916','0','SPACE A16',1,15,0,3,5500.0000,0.0000,0,15000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(917,'917','0','SPACE A13',1,15,0,3,5500.0000,0.0000,0,15000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(918,'918','0','SPACE A14',1,15,0,3,5500.0000,0.0000,0,15000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(919,'919','0','SPACE A12',1,15,0,3,5500.0000,0.0000,0,15000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(920,'920','0','SPACE A06',1,15,0,3,5500.0000,0.0000,0,15000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(921,'921','0','SPACE A05S',1,15,0,3,5500.0000,0.0000,0,15000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(922,'922','0','SPACE A05',1,15,0,2,5500.0000,0.0000,0,15000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(923,'923','0','SPACE REDMI NOTE 14',1,15,0,7,5500.0000,0.0000,0,15000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(924,'924','0','SPACE REDMI  14C',1,15,0,3,5500.0000,0.0000,0,15000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(925,'925','0','SPACE NOTE 14 PRO 5G',1,15,0,3,5500.0000,0.0000,0,15000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(926,'926','0','SPACE REDMI NOTE 14 PRO PLUS ',1,15,0,4,5500.0000,0.0000,0,15000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(927,'927','0','SPACE REDMI NOTE 13 4G',1,15,0,2,5500.0000,0.0000,0,15000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(928,'928','0','SPACE REDMI 13C ',1,15,0,3,5500.0000,0.0000,0,15000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(929,'929','0','SPACE REDMI 13',1,15,0,3,5500.0000,0.0000,0,15000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(930,'930','0','SPACE REDMI NOTE 13 PRO',1,15,0,2,5500.0000,0.0000,0,15000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(931,'931','0','SPACE REDMI 12',1,15,0,3,5500.0000,0.0000,0,15000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(932,'932','0','SPACE REDMI NOTE 12',1,15,0,2,5500.0000,0.0000,0,15000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(933,'933','0','SPACE REDMI NOTE 12C',1,15,0,3,5500.0000,0.0000,0,15000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(934,'934','0','SPACE REDMI NOTE 8',1,15,0,2,5500.0000,0.0000,0,15000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(935,'935','0','SPACE REDMI NOTE 9A',1,15,0,3,5500.0000,0.0000,0,15000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(936,'936','0','SPACE REDMI NOTE 9',1,15,0,4,5500.0000,0.0000,0,15000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(937,'937','0','SPACE REDMI 10',1,15,0,3,5500.0000,0.0000,0,15000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(938,'938','0','SPACE NOTE 10 4G',1,15,0,3,5500.0000,0.0000,0,15000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(939,'939','0','SPACE 9A',1,15,0,3,5500.0000,0.0000,0,15000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(940,'940','0','SPACE REDMI NOTE 9',1,15,0,1,5500.0000,0.0000,0,15000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(941,'941','0','SPACE REDMI 9',1,15,0,3,5500.0000,0.0000,0,15000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(942,'942','0','SPACE REDMI NOTE 8',1,15,0,2,5500.0000,0.0000,0,15000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(943,'943','0','SPACE REDMI A3',1,15,0,3,5500.0000,0.0000,0,15000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(944,'944','0','FORRO TRANSFORME S24 ULTRA',1,15,0,4,6500.0000,0.0000,0,25000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(945,'945','0','FORRO TRANSFORME A25',1,15,0,1,6500.0000,0.0000,0,25000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(946,'946','0','FORRO TRANSFORME A14',1,15,0,1,6500.0000,0.0000,0,25000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(947,'947','0','FORRO TRANSFORME A16',1,15,0,6,6500.0000,0.0000,0,25000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(948,'948','0','FORRO TRANSFORME A55',1,15,0,1,6500.0000,0.0000,0,25000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(949,'949','0','FORRO TRANSFORME A05S',1,15,0,2,6500.0000,0.0000,0,25000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(950,'950','0','FORRO TRANSFORME A06',1,15,0,4,6500.0000,0.0000,0,25000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(951,'951','0','FORRO TRANSFORME REDMI 12F',1,15,0,5,6500.0000,0.0000,0,25000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(952,'952','0','FORRO TRANSFORME REDMI 14C',1,15,0,4,6500.0000,0.0000,0,25000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(953,'953','0','FORRO TRANSFORME REDMI NOTE 14',1,15,0,3,6500.0000,0.0000,0,25000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(954,'954','0','FORRO TRANSFORME REDMI NOTE 13',1,15,0,1,6500.0000,0.0000,0,25000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(955,'955','0','FORRO TRANSFORME REDMI NOTE 10',1,15,0,5,6500.0000,0.0000,0,25000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(956,'956','0','FORRO TRANSFORME REDMI 9',1,15,0,5,6500.0000,0.0000,0,25000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(957,'957','0','FORRO TRANSFORME MAGIC 5 LITE',1,15,0,3,6500.0000,0.0000,0,25000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(958,'958','0','FORRO TRANSFORME HONOR 200 LITE',1,15,0,5,6500.0000,0.0000,0,25000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(959,'959','0','FORRO TRANSFORME SPART 30 5G',1,15,0,8,6500.0000,0.0000,0,25000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(960,'960','0','FORRO TRANSFORME OPPO A 79',1,15,0,4,6500.0000,0.0000,0,25000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(961,'961','0','FORRO TRANSFORME OPPO A 40',1,15,0,3,6500.0000,0.0000,0,25000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(962,'962','0','FORRO TRANSFORME REDMI NOTE 13 4G',1,15,0,1,6500.0000,0.0000,0,25000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(963,'963','0','FORRO TRANSFORME SPART 30 5G',1,15,0,8,6500.0000,0.0000,0,25000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(964,'964','0','FORRO LUJO 3D A55',1,15,0,3,13000.0000,0.0000,0,25000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(965,'965','0','FORRO LUJO 3D A35',1,15,0,1,13000.0000,0.0000,0,25000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(966,'966','0','FORRO LUJO A36',1,15,0,5,5000.0000,0.0000,0,25000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(967,'967','0','FORRO LUJO A25',1,15,0,6,13000.0000,0.0000,0,25000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(968,'968','0','FORRO LUJO PERLA A26',1,15,0,5,13000.0000,0.0000,0,25000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(969,'969','0','FORRO LUJO A21S',1,15,0,5,5000.0000,0.0000,0,25000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(970,'970','0','FORRO LUJO A16',1,15,0,5,13000.0000,0.0000,0,25000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(971,'971','0','FORRO LUJO A12',1,15,0,3,5000.0000,0.0000,0,25000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(972,'972','0','FORRO LUJO A12 3D',1,15,0,3,13000.0000,0.0000,0,25000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(973,'973','0','FORRO LUJO A06',1,15,0,6,5000.0000,0.0000,0,25000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(974,'974','0','FORRO LUJO A06 3D',1,15,0,2,13000.0000,0.0000,0,25000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(975,'975','0','FORRO LUJO A05',1,15,0,10,5000.0000,0.0000,0,25000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(976,'976','0','FORRO LUJO A05S',1,15,0,7,13000.0000,0.0000,0,25000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(977,'977','0','FORRO LUJO A05S 3D',1,15,0,11,13000.0000,0.0000,0,25000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(978,'978','0','FORRO LUJO REDMI 14 PRO',1,15,0,3,8000.0000,0.0000,0,25000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(979,'979','0','FORRO LUJO REDMI NOTE 14G',1,15,0,4,7000.0000,0.0000,0,25000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(980,'980','0','FORRO LUJO REDMI NOTE 14 PRO ',1,15,0,18,7000.0000,0.0000,0,25000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(981,'981','0','FORRO LUJO REDMI NOTE 14 PRO PLUS ACCESORIO ',1,15,0,5,10000.0000,0.0000,0,30000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(982,'982','0','FORRO LUJO REDMI NOTE 14 PRO PLUS ',1,15,0,4,10000.0000,0.0000,0,30000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(983,'983','0','FORRO LUJO REDMI NOTE 14 PRO PLUS PERLADO',1,15,0,8,7000.0000,0.0000,0,20000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(984,'984','0','FORRO LUJO REDMI 14 C',1,15,0,9,7000.0000,0.0000,0,20000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(985,'985','0','FORRO LUJO REDMI NOTE 13 PRO',1,15,0,7,13000.0000,0.0000,0,25000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(986,'986','0','FORRO LUJO REDMI NOTE 13 4G ACCESORIO',1,15,0,3,10000.0000,0.0000,0,30000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(987,'987','0','FORRO LUJO REDMI NOTE 13 4G ',1,15,0,12,7000.0000,0.0000,0,20000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(988,'988','0','FORRO LUJO REDMI 13C',1,15,0,4,7000.0000,0.0000,0,25000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(989,'989','0','FORRO LUJO REDMI 13',1,15,0,2,7000.0000,0.0000,0,25000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(990,'990','0','FORRO LUJO REDMI NOTE 12',1,15,0,9,7000.0000,0.0000,0,25000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(991,'991','0','FORRO LUJO REDMI 12C',1,15,0,2,7000.0000,0.0000,0,25000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(992,'992','0','FORRO LUJO REDMI 12',1,15,0,4,7000.0000,0.0000,0,25000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(993,'993','0','FORRO LUJO REDMI NOTE 11',1,15,0,5,7000.0000,0.0000,0,25000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(994,'994','0','FORRO LUJO REDMI A3',1,15,0,3,7000.0000,0.0000,0,25000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(995,'995','0','FORRO LUJO OPPO A60-A20',1,15,0,5,7000.0000,0.0000,0,25000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(996,'996','0','FORRO LUJO OPPO A20 PERLADO',1,15,0,5,7000.0000,0.0000,0,25000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(997,'997','0','FORRO LUJO OPPO A60 TRANSPARENTE',1,15,0,2,12000.0000,0.0000,0,30000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(998,'998','0','FORRO LUJO OPPO A40',1,15,0,2,12000.0000,0.0000,0,30000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(999,'999','0','FORRO LUJO HUAWEI Y9 PRIME',1,15,0,4,7000.0000,0.0000,0,25000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(1000,'1000','0','FORRO LUJO XIAOMI G10-G20-G30',1,15,0,3,16000.0000,0.0000,0,25000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(1001,'1001','0','FORRO LUJO MOTO G24',1,15,0,6,16000.0000,0.0000,0,25000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(1002,'1002','0','FORRO LUJO MOTO E14',1,15,0,6,16000.0000,0.0000,0,25000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(1003,'1003','0','FORRO LUJO MOTO G14',1,15,0,6,16000.0000,0.0000,0,25000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(1004,'1004','0','FORRO LUJO MOTO E15',1,15,0,5,16000.0000,0.0000,0,25000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(1005,'1005','0','FORRO LUJO MOTO G05',1,15,0,3,16000.0000,0.0000,0,25000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(1006,'1006','0','FORRO LUJO HONOR X7B',1,15,0,5,16000.0000,0.0000,0,25000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(1007,'1007','0','FORRO LUJO HONOR X9B',1,15,0,6,16000.0000,0.0000,0,25000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0),(1008,'1008','0','FORRO LUJO HONOR 200 LITE ACCESORIO ',1,15,0,3,12000.0000,0.0000,0,30000.0000,0.0000,0.0000,'0000-00-00 00:00:00',220500,'Est',NULL,NULL,0,0,0.0000,NULL,0,NULL,NULL,1,NULL,NULL,70,0);
/*!40000 ALTER TABLE `tblarticulos2` ENABLE KEYS */;
UNLOCK TABLES;

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
-- Dumping data for table `tblauxiliarbanco`
--

LOCK TABLES `tblauxiliarbanco` WRITE;
/*!40000 ALTER TABLE `tblauxiliarbanco` DISABLE KEYS */;
/*!40000 ALTER TABLE `tblauxiliarbanco` ENABLE KEYS */;
UNLOCK TABLES;

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
-- Dumping data for table `tblauxiliares`
--

LOCK TABLES `tblauxiliares` WRITE;
/*!40000 ALTER TABLE `tblauxiliares` DISABLE KEYS */;
INSERT INTO `tblauxiliares` VALUES (1,0,'0000-00-00 00:00:00','Enero','1305','Abono o pago a Facturas Nº 7',110501,0.0000,300000.0000,0.0000),(2,0,'0000-00-00 00:00:00','Enero','130510','Abono o pago a Facturas Nº 7',110501,0.0000,300000.0000,0.0000),(3,0,'2025-10-13 05:00:00','Enero','1305','Venta al crédito según Fact. 7',7,550000.0000,0.0000,0.0000),(4,0,'2025-10-13 05:00:00','Enero','130510','Venta al crédito según Fact. 7',7,550000.0000,0.0000,0.0000),(5,0,'0000-00-00 00:00:00','Enero','1305','Abono o pago a Facturas Nº 8',110502,0.0000,200000.0000,0.0000),(6,0,'0000-00-00 00:00:00','Enero','130511','Abono o pago a Facturas Nº 8',110502,0.0000,200000.0000,0.0000),(7,0,'2025-09-05 05:00:00','Enero','1305','Venta al crédito según Fact. 8',8,400000.0000,0.0000,0.0000),(8,0,'2025-09-05 05:00:00','Enero','130511','Venta al crédito según Fact. 8',8,400000.0000,0.0000,0.0000),(9,0,'2025-10-17 05:00:00','Enero','1305','Venta al crédito según Fact. 9',9,400000.0000,0.0000,0.0000),(10,0,'2025-10-17 05:00:00','Enero','130513','Venta al crédito según Fact. 9',9,400000.0000,0.0000,0.0000),(11,0,'2025-11-17 05:00:00','Enero','1305','Venta al crédito según Fact. 10',10,400000.0000,0.0000,0.0000),(12,0,'2025-11-17 05:00:00','Enero','130514','Venta al crédito según Fact. 10',10,400000.0000,0.0000,0.0000),(13,0,'2025-11-19 05:00:00','Enero','1305','Pago de Facturas Nº 10',3,0.0000,400000.0000,-400000.0000),(14,0,'2025-11-19 05:00:00','Enero','130514','Pago de Facturas Nº 10',3,0.0000,400000.0000,-400000.0000),(15,0,'2025-11-19 05:00:00','Enero','1105','Pago de Facturas Nº 10',3,400000.0000,0.0000,400000.0000);
/*!40000 ALTER TABLE `tblauxiliares` ENABLE KEYS */;
UNLOCK TABLES;

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
-- Dumping data for table `tblbancos`
--

LOCK TABLES `tblbancos` WRITE;
/*!40000 ALTER TABLE `tblbancos` DISABLE KEYS */;
INSERT INTO `tblbancos` VALUES (1,'2024-08-30 10:22:00','111111111111111','Bancoolombia',1,0.0000,'','ahorros',1);
/*!40000 ALTER TABLE `tblbancos` ENABLE KEYS */;
UNLOCK TABLES;

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
-- Dumping data for table `tblcajas`
--

LOCK TABLES `tblcajas` WRITE;
/*!40000 ALTER TABLE `tblcajas` DISABLE KEYS */;
INSERT INTO `tblcajas` VALUES (1,'Caja 1','punto_venta',1,0.0000,'2026-04-07 17:41:10'),(2,'Caja Principal','principal',1,0.0000,'2026-04-07 17:41:10');
/*!40000 ALTER TABLE `tblcajas` ENABLE KEYS */;
UNLOCK TABLES;

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
-- Dumping data for table `tblcategoria`
--

LOCK TABLES `tblcategoria` WRITE;
/*!40000 ALTER TABLE `tblcategoria` DISABLE KEYS */;
INSERT INTO `tblcategoria` VALUES ('VARIOS',1);
/*!40000 ALTER TABLE `tblcategoria` ENABLE KEYS */;
UNLOCK TABLES;

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
-- Dumping data for table `tblcategorias_gasto`
--

LOCK TABLES `tblcategorias_gasto` WRITE;
/*!40000 ALTER TABLE `tblcategorias_gasto` DISABLE KEYS */;
INSERT INTO `tblcategorias_gasto` VALUES (1,'Servicios Públicos',1),(2,'Arriendo',1),(3,'Nómina',1),(4,'Transporte',1),(5,'Mantenimiento',1),(6,'Papelería',1),(7,'Alimentación',1),(8,'Aseo',1),(9,'Impuestos',1),(10,'Otros',1);
/*!40000 ALTER TABLE `tblcategorias_gasto` ENABLE KEYS */;
UNLOCK TABLES;

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
-- Dumping data for table `tblcliente_retenciones`
--

LOCK TABLES `tblcliente_retenciones` WRITE;
/*!40000 ALTER TABLE `tblcliente_retenciones` DISABLE KEYS */;
INSERT INTO `tblcliente_retenciones` VALUES (4,130503,1),(3,130504,1);
/*!40000 ALTER TABLE `tblcliente_retenciones` ENABLE KEYS */;
UNLOCK TABLES;

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
  `latitud` decimal(10,6) DEFAULT NULL,
  `longitud` decimal(10,6) DEFAULT NULL,
  `precision_gps_metros` int(11) DEFAULT NULL,
  `gps_capturado_at` datetime DEFAULT NULL,
  PRIMARY KEY (`CodigoClien`),
  KEY `idx_cartera_castigada` (`cartera_castigada`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3 COLLATE=utf8mb3_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `tblclientes`
--

LOCK TABLES `tblclientes` WRITE;
/*!40000 ALTER TABLE `tblclientes` DISABLE KEYS */;
INSERT INTO `tblclientes` VALUES (130500,'VENTAS AL CONTADO','0','-','-','-',0,'0','-','-','-','0','-','-','2016-02-16 00:00:00',0.0000,0,0,NULL,NULL,'',NULL,NULL,NULL,2,444,4,2,3,'gross_up','sin_datos',NULL,0,NULL,NULL,NULL,NULL,NULL,0,NULL,NULL,NULL,NULL),(130502,'CONSUMIDOR FINAL','222222222','-','-','-',2147483647,'0','-','-','-','0','-','Null','2025-07-26 16:13:20',0.0000,0,0,'1899-12-30 00:00:00','-','0',0,0,'2025-08-05 10:08:21',1,444,4,2,3,'gross_up','sin_datos',NULL,0,NULL,NULL,NULL,NULL,NULL,0,NULL,NULL,NULL,NULL);
/*!40000 ALTER TABLE `tblclientes` ENABLE KEYS */;
UNLOCK TABLES;

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
-- Dumping data for table `tblcomprobantediario`
--

LOCK TABLES `tblcomprobantediario` WRITE;
/*!40000 ALTER TABLE `tblcomprobantediario` DISABLE KEYS */;
/*!40000 ALTER TABLE `tblcomprobantediario` ENABLE KEYS */;
UNLOCK TABLES;

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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `tblconteo_detalle`
--

LOCK TABLES `tblconteo_detalle` WRITE;
/*!40000 ALTER TABLE `tblconteo_detalle` DISABLE KEYS */;
/*!40000 ALTER TABLE `tblconteo_detalle` ENABLE KEYS */;
UNLOCK TABLES;

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
-- Dumping data for table `tblconteo_inventario`
--

LOCK TABLES `tblconteo_inventario` WRITE;
/*!40000 ALTER TABLE `tblconteo_inventario` DISABLE KEYS */;
INSERT INTO `tblconteo_inventario` VALUES (1,'2026-08-05 07:38:41','admin','','Total',NULL,NULL,22,16,10,'Cerrado','2026-08-05 07:51:41'),(2,'2026-08-05 11:01:37','admin','','Total',NULL,NULL,22,0,0,'Cancelado',NULL);
/*!40000 ALTER TABLE `tblconteo_inventario` ENABLE KEYS */;
UNLOCK TABLES;

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
-- Dumping data for table `tblconteodeinventario`
--

LOCK TABLES `tblconteodeinventario` WRITE;
/*!40000 ALTER TABLE `tblconteodeinventario` DISABLE KEYS */;
/*!40000 ALTER TABLE `tblconteodeinventario` ENABLE KEYS */;
UNLOCK TABLES;

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
-- Dumping data for table `tblcontrolcaja`
--

LOCK TABLES `tblcontrolcaja` WRITE;
/*!40000 ALTER TABLE `tblcontrolcaja` DISABLE KEYS */;
INSERT INTO `tblcontrolcaja` VALUES (1,'2025-08-11 05:00:00',0.0000,0.0000,0.0000,0.0000,0.0000,0.0000,0.0000,1.0000,1,0.0000,0.0000,0.0000,0.0000,0.0000,NULL,NULL),(2,'2025-08-27 05:00:00',0.0000,0.0000,0.0000,0.0000,0.0000,0.0000,0.0000,1.0000,1,0.0000,0.0000,0.0000,0.0000,0.0000,NULL,NULL),(3,'2025-09-01 05:00:00',0.0000,0.0000,0.0000,0.0000,0.0000,0.0000,0.0000,1.0000,1,0.0000,0.0000,0.0000,0.0000,0.0000,NULL,NULL),(4,'2025-09-12 05:00:00',0.0000,0.0000,0.0000,0.0000,0.0000,0.0000,0.0000,1.0000,1,0.0000,0.0000,0.0000,0.0000,0.0000,NULL,NULL),(5,'2025-10-20 05:00:00',0.0000,0.0000,0.0000,0.0000,0.0000,0.0000,0.0000,1.0000,1,0.0000,0.0000,0.0000,0.0000,0.0000,NULL,NULL),(6,'2025-10-27 05:00:00',0.0000,0.0000,0.0000,0.0000,0.0000,0.0000,0.0000,1.0000,1,0.0000,0.0000,0.0000,0.0000,0.0000,NULL,NULL),(7,'2025-11-19 05:00:00',0.0000,0.0000,0.0000,0.0000,0.0000,0.0000,0.0000,1.0000,1,0.0000,0.0000,0.0000,0.0000,0.0000,NULL,NULL),(8,'2026-03-06 05:00:00',0.0000,0.0000,0.0000,0.0000,0.0000,0.0000,0.0000,0.0000,1,0.0000,0.0000,0.0000,0.0000,0.0000,NULL,NULL),(9,'2026-03-20 05:00:00',0.0000,0.0000,0.0000,0.0000,0.0000,0.0000,0.0000,1.0000,1,0.0000,0.0000,0.0000,0.0000,0.0000,NULL,NULL);
/*!40000 ALTER TABLE `tblcontrolcaja` ENABLE KEYS */;
UNLOCK TABLES;

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
-- Dumping data for table `tblcotizaciones`
--

LOCK TABLES `tblcotizaciones` WRITE;
/*!40000 ALTER TABLE `tblcotizaciones` DISABLE KEYS */;
INSERT INTO `tblcotizaciones` VALUES (1,130500,'VENTAS AL CONTADO','0','2025-09-12',1,0,550000,'2025-09-12 14:00:27'),(3,130500,'FERNANDO MARTINEZ RICARDO','0','2025-09-12',1,0,2000,'2025-09-12 15:16:46');
/*!40000 ALTER TABLE `tblcotizaciones` ENABLE KEYS */;
UNLOCK TABLES;

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
-- Dumping data for table `tblcuadrecaja`
--

LOCK TABLES `tblcuadrecaja` WRITE;
/*!40000 ALTER TABLE `tblcuadrecaja` DISABLE KEYS */;
/*!40000 ALTER TABLE `tblcuadrecaja` ENABLE KEYS */;
UNLOCK TABLES;

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
-- Dumping data for table `tblcuentas`
--

LOCK TABLES `tblcuentas` WRITE;
/*!40000 ALTER TABLE `tblcuentas` DISABLE KEYS */;
INSERT INTO `tblcuentas` VALUES ('11','DISPONIBLE',0.0000,0.0000,0.0000,0.0000,NULL),('1105','CAJA',0.0000,0.0000,0.0000,0.0000,NULL),('110505','Caja General',0.0000,0.0000,0.0000,0.0000,NULL),('110510','CAJA MENOR',0.0000,0.0000,0.0000,0.0000,NULL),('1110','BANCOS',0.0000,0.0000,0.0000,0.0000,NULL),('1110001000000001','Cuenta para compras',0.0000,0.0000,0.0000,0.0000,NULL),('11100111111','Bancolombia',0.0000,0.0000,0.0000,0.0000,NULL),('1305','CLIENTES',0.0000,0.0000,0.0000,0.0000,NULL),('130500','VENTAS AL CONTADO',0.0000,0.0000,0.0000,0.0000,'2023-01-27 09:10:29'),('1355','ANTICIPO DE IMPUESTOS',0.0000,0.0000,0.0000,0.0000,NULL),('135515','Retención en la Fuente',0.0000,0.0000,0.0000,0.0000,NULL),('1365','CUENTAS X COBRAR A TRABAJADORES',0.0000,0.0000,0.0000,0.0000,NULL),('1435','MERCANCIA NO FABRICADA X LA EMPRESA',0.0000,0.0000,0.0000,0.0000,NULL),('2','provedores',0.0000,0.0000,0.0000,0.0000,NULL),('2205','PROVEEDORES NACIONALES',0.0000,0.0000,0.0000,0.0000,NULL),('220500','COMPRAS AL CONTADO',0.0000,0.0000,0.0000,0.0000,'2018-11-28 14:48:25'),('2408','IMPUESTO SOBRE LAS VENTAS X PAGAR',0.0000,0.0000,0.0000,0.0000,NULL),('3115','APORTES SOCIALES',0.0000,0.0000,0.0000,0.0000,NULL),('4135','COMERCIO AL POR MAYOR Y AL POR MENOR',0.0000,0.0000,0.0000,0.0000,NULL),('4175','Devoluciones en Ventas',0.0000,0.0000,0.0000,0.0000,NULL),('4201','INGRESOS NO OPERACIONALES',0.0000,0.0000,0.0000,0.0000,NULL),('4210','FINANCIEROS',0.0000,0.0000,0.0000,0.0000,NULL),('4295','DIVERSOS',0.0000,0.0000,0.0000,0.0000,NULL),('429553','Sobrante en Caja',0.0000,0.0000,0.0000,0.0000,NULL),('4705','Devolucion en Compras',0.0000,0.0000,0.0000,0.0000,NULL),('5','GASTOS',0.0000,0.0000,0.0000,0.0000,NULL),('51','GASTOS OPERACIONALES DE ADMINISTRACION',0.0000,0.0000,0.0000,0.0000,NULL),('5105','Gastos de Personal',0.0000,0.0000,0.0000,0.0000,NULL),('510501','Gastos Fijos',0.0000,0.0000,0.0000,0.0000,NULL),('510595','OTROS',0.0000,0.0000,0.0000,0.0000,NULL),('5506','Liquidación Caja',0.0000,0.0000,0.0000,0.0000,NULL),('6135','COMERCIO AL POR MAYOR Y AL POR MENOR(Costo)',0.0000,0.0000,0.0000,0.0000,NULL);
/*!40000 ALTER TABLE `tblcuentas` ENABLE KEYS */;
UNLOCK TABLES;

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
  PRIMARY KEY (`Id_Empresa`),
  KEY `Id_Empresa` (`Id_Empresa`)
) ENGINE=MyISAM AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb3 COLLATE=utf8mb3_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `tbldatosempresa`
--

LOCK TABLES `tbldatosempresa` WRITE;
/*!40000 ALTER TABLE `tbldatosempresa` DISABLE KEYS */;
INSERT INTO `tbldatosempresa` VALUES (1,'NOMBRE DE LA EMPRESA','Propietario','0000000','Dirección','000000000-0','Detalle del negocio','No','No requerida','2025-05-31 05:00:00','1','2000','9','No','Simplificado','No','  1 4',1,1,0,NULL,1,'correo@empresa.com',NULL,'','','uploads/logo.png','4.3.89',0,0.00,0,1,'2026-08-18 13:20:55',NULL,NULL,NULL,NULL,NULL,NULL,NULL);
/*!40000 ALTER TABLE `tbldatosempresa` ENABLE KEYS */;
UNLOCK TABLES;

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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3 COLLATE=utf8mb3_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `tbldetalle_pedido`
--

LOCK TABLES `tbldetalle_pedido` WRITE;
/*!40000 ALTER TABLE `tbldetalle_pedido` DISABLE KEYS */;
/*!40000 ALTER TABLE `tbldetalle_pedido` ENABLE KEYS */;
UNLOCK TABLES;

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
  PRIMARY KEY (`Id_DetalleVenta`),
  KEY `Id_DetalleVenta` (`Id_DetalleVenta`),
  KEY `idx_factura` (`Factura_N`),
  KEY `idx_factura_items` (`Factura_N`,`Items`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3 COLLATE=utf8mb3_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `tbldetalle_venta`
--

LOCK TABLES `tbldetalle_venta` WRITE;
/*!40000 ALTER TABLE `tbldetalle_venta` DISABLE KEYS */;
/*!40000 ALTER TABLE `tbldetalle_venta` ENABLE KEYS */;
UNLOCK TABLES;

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
) ENGINE=MyISAM DEFAULT CHARSET=utf8mb3 COLLATE=utf8mb3_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `tbldetallecomprobantediario`
--

LOCK TABLES `tbldetallecomprobantediario` WRITE;
/*!40000 ALTER TABLE `tbldetallecomprobantediario` DISABLE KEYS */;
/*!40000 ALTER TABLE `tbldetallecomprobantediario` ENABLE KEYS */;
UNLOCK TABLES;

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
-- Dumping data for table `tbldetalleorden`
--

LOCK TABLES `tbldetalleorden` WRITE;
/*!40000 ALTER TABLE `tbldetalleorden` DISABLE KEYS */;
/*!40000 ALTER TABLE `tbldetalleorden` ENABLE KEYS */;
UNLOCK TABLES;

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
-- Dumping data for table `tbldetalleorden2`
--

LOCK TABLES `tbldetalleorden2` WRITE;
/*!40000 ALTER TABLE `tbldetalleorden2` DISABLE KEYS */;
/*!40000 ALTER TABLE `tbldetalleorden2` ENABLE KEYS */;
UNLOCK TABLES;

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
-- Dumping data for table `tbldetalleorden3`
--

LOCK TABLES `tbldetalleorden3` WRITE;
/*!40000 ALTER TABLE `tbldetalleorden3` DISABLE KEYS */;
/*!40000 ALTER TABLE `tbldetalleorden3` ENABLE KEYS */;
UNLOCK TABLES;

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
-- Dumping data for table `tbldetalleplansepare`
--

LOCK TABLES `tbldetalleplansepare` WRITE;
/*!40000 ALTER TABLE `tbldetalleplansepare` DISABLE KEYS */;
/*!40000 ALTER TABLE `tbldetalleplansepare` ENABLE KEYS */;
UNLOCK TABLES;

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
-- Dumping data for table `tbldevolucion_ventas`
--

LOCK TABLES `tbldevolucion_ventas` WRITE;
/*!40000 ALTER TABLE `tbldevolucion_ventas` DISABLE KEYS */;
/*!40000 ALTER TABLE `tbldevolucion_ventas` ENABLE KEYS */;
UNLOCK TABLES;

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
-- Dumping data for table `tbldocumentos`
--

LOCK TABLES `tbldocumentos` WRITE;
/*!40000 ALTER TABLE `tbldocumentos` DISABLE KEYS */;
/*!40000 ALTER TABLE `tbldocumentos` ENABLE KEYS */;
UNLOCK TABLES;

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
  KEY `idx_egr_medio` (`id_mediopago`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3 COLLATE=utf8mb3_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `tblegresos`
--

LOCK TABLES `tblegresos` WRITE;
/*!40000 ALTER TABLE `tblegresos` DISABLE KEYS */;
/*!40000 ALTER TABLE `tblegresos` ENABLE KEYS */;
UNLOCK TABLES;

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
-- Dumping data for table `tblempleados`
--

LOCK TABLES `tblempleados` WRITE;
/*!40000 ALTER TABLE `tblempleados` DISABLE KEYS */;
INSERT INTO `tblempleados` VALUES (0,'No','Asignado','0','0','-','2014-08-26 05:00:00',0,0.0000,0.0000,'-',0.0000,0,'No',NULL);
/*!40000 ALTER TABLE `tblempleados` ENABLE KEYS */;
UNLOCK TABLES;

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
-- Dumping data for table `tblentidades`
--

LOCK TABLES `tblentidades` WRITE;
/*!40000 ALTER TABLE `tblentidades` DISABLE KEYS */;
INSERT INTO `tblentidades` VALUES (1,'COOMEVA'),(2,'ISS'),(3,'SALUDCOOP'),(4,'NINGUNA');
/*!40000 ALTER TABLE `tblentidades` ENABLE KEYS */;
UNLOCK TABLES;

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
-- Dumping data for table `tblentregaarticulos`
--

LOCK TABLES `tblentregaarticulos` WRITE;
/*!40000 ALTER TABLE `tblentregaarticulos` DISABLE KEYS */;
/*!40000 ALTER TABLE `tblentregaarticulos` ENABLE KEYS */;
UNLOCK TABLES;

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
) ENGINE=InnoDB AUTO_INCREMENT=42 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `tbletiquetas`
--

LOCK TABLES `tbletiquetas` WRITE;
/*!40000 ALTER TABLE `tbletiquetas` DISABLE KEYS */;
INSERT INTO `tbletiquetas` VALUES (1,'Insumos','Materias primas e ingredientes para producci├│n','#d97706',1,'2026-04-30 17:53:54'),(2,'Producto Terminado','Productos elaborados listos para vender','#16a34a',1,'2026-04-30 17:53:54'),(3,'Reventa','Productos que se compran y se venden sin transformaci├│n','#2563eb',1,'2026-04-30 17:53:54');
/*!40000 ALTER TABLE `tbletiquetas` ENABLE KEYS */;
UNLOCK TABLES;

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
-- Dumping data for table `tblfacturasanteriores`
--

LOCK TABLES `tblfacturasanteriores` WRITE;
/*!40000 ALTER TABLE `tblfacturasanteriores` DISABLE KEYS */;
/*!40000 ALTER TABLE `tblfacturasanteriores` ENABLE KEYS */;
UNLOCK TABLES;

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
-- Dumping data for table `tblfacturasanterioresproveedor`
--

LOCK TABLES `tblfacturasanterioresproveedor` WRITE;
/*!40000 ALTER TABLE `tblfacturasanterioresproveedor` DISABLE KEYS */;
/*!40000 ALTER TABLE `tblfacturasanterioresproveedor` ENABLE KEYS */;
UNLOCK TABLES;

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
-- Dumping data for table `tblfamilia_items`
--

LOCK TABLES `tblfamilia_items` WRITE;
/*!40000 ALTER TABLE `tblfamilia_items` DISABLE KEYS */;
/*!40000 ALTER TABLE `tblfamilia_items` ENABLE KEYS */;
UNLOCK TABLES;

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
-- Dumping data for table `tblfamilias_producto`
--

LOCK TABLES `tblfamilias_producto` WRITE;
/*!40000 ALTER TABLE `tblfamilias_producto` DISABLE KEYS */;
INSERT INTO `tblfamilias_producto` VALUES (4,'Arroz roa',NULL,1,'2026-04-18 01:57:52');
/*!40000 ALTER TABLE `tblfamilias_producto` ENABLE KEYS */;
UNLOCK TABLES;

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
-- Dumping data for table `tblfinanciacion_cuotas`
--

LOCK TABLES `tblfinanciacion_cuotas` WRITE;
/*!40000 ALTER TABLE `tblfinanciacion_cuotas` DISABLE KEYS */;
/*!40000 ALTER TABLE `tblfinanciacion_cuotas` ENABLE KEYS */;
UNLOCK TABLES;

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
-- Dumping data for table `tblfinanciacion_pagos`
--

LOCK TABLES `tblfinanciacion_pagos` WRITE;
/*!40000 ALTER TABLE `tblfinanciacion_pagos` DISABLE KEYS */;
/*!40000 ALTER TABLE `tblfinanciacion_pagos` ENABLE KEYS */;
UNLOCK TABLES;

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
-- Dumping data for table `tblfinanciaciones`
--

LOCK TABLES `tblfinanciaciones` WRITE;
/*!40000 ALTER TABLE `tblfinanciaciones` DISABLE KEYS */;
/*!40000 ALTER TABLE `tblfinanciaciones` ENABLE KEYS */;
UNLOCK TABLES;

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
-- Dumping data for table `tblformulario`
--

LOCK TABLES `tblformulario` WRITE;
/*!40000 ALTER TABLE `tblformulario` DISABLE KEYS */;
INSERT INTO `tblformulario` VALUES (1,'frmInventario',555,1155,12765,28185),(2,'frmIngresar_Producto',6525,1665,8700,8400),(3,'frmReferencia',3675,1545,3750,4770),(4,'frmCategoria',1500,1500,7620,6720),(5,'frmBuscarArticulo',1500,-45,10125,13335),(6,'frmKardex',795,-300,9570,14265),(7,'frmClientes',8430,435,8610,7740),(8,'frmBuscarCliente',2235,780,8925,13200),(9,'frmCompra',2730,-210,9990,14700),(10,'frmBuscarProveedor',3720,75,8730,13110),(11,'frmAuxiliarProveedor',1635,750,5955,9930),(12,'frmProveedor',4515,270,6345,7035),(13,'frmVerPedido',1905,285,6855,9300),(14,'frmListadoPedidos',2100,1095,4785,8130),(15,'frmDatosEmpresa',5400,210,7545,7110),(16,'frmDistribuirArt',1620,450,5610,9075),(17,'frmDevolucionComp',1440,135,7620,9045),(18,'frmCuentasXcobrar',45,315,9540,15915),(19,'frmInicializarCaja',2520,1560,3360,6705),(20,'frmArqueoCajaMenor',3255,1170,4440,4905),(21,'frmCaja',2835,795,3135,6405),(22,'frmCrearCuetaB',3345,2070,3165,8445),(23,'frmVentas',0,0,6930,9360),(24,'frmVentaArt',3840,1890,9075,16290),(25,'frmCuentasXpagar',4770,765,8265,9870),(26,'frmAuxliarBancos',1455,495,8610,10950),(27,'frmConsignaciones',3180,525,5220,5595),(28,'frmPagoFCliente',6480,330,9570,8205),(29,'frmAuxiliarClientes',4800,270,5910,9540),(30,'frmPagoFProveedor',14010,345,9450,6765),(31,'frmAuxiliarCaja',3915,-15,8085,10905),(32,'frmGastos',11265,750,7425,7995),(33,'frmCrearCuenta',6210,3300,3060,6000),(34,'frmDevolucionVent',1875,825,6840,10530),(35,'frmGaficoVenta',3270,1200,7080,9390),(36,'frmProcesarSaldos',4215,2670,1095,4185),(37,'frmCorreccionManual',5010,1695,6570,10590),(38,'frmCrearUsuario',6510,165,8280,11040),(39,'frmExportarAux',8865,930,5535,5370),(40,'frmCopiaSeguridad',5100,990,5385,7245),(41,'frmRestaurarCopia',3660,1410,3315,5130),(42,'frmAcrcade',3900,1530,4215,4770),(43,'frmListadoFacturas',1860,945,8295,16995),(44,NULL,330,435,5025,10290),(45,'frmProcesarCant',4290,2565,1140,4065),(46,'frmVerfactura',3300,330,7725,14370),(47,'frmOrdenProd',5415,135,6450,8460),(48,'frmControlCaja',8190,855,5355,6360),(49,'frmEmpleados',3300,915,6765,10170),(50,'frmUtilidadEmpleado',1920,-645,7740,8520),(51,'frmGanaciaPrecio',3225,900,3990,4800),(52,'frmListadoEgresos',8100,2250,4575,8100),(53,'frmAgregarFactura',8490,2955,3330,3645),(54,'frmNotaCredito',120,2670,3540,7140),(55,'frmAgregarFactComp',9975,3375,4305,4260),(56,'frmResultados',4740,30,5175,4905),(57,'frmListadoPagos',4845,1035,8250,14055),(58,'frmInventarioMes',3285,1275,3075,4800),(59,'frmCorregirA',5070,2985,5655,9345),(60,'frmFacturasCompra',3105,315,8550,14910),(61,'frmArticulosCompra',4275,345,8790,13950),(62,'frmOpcionesAdicio',9975,1995,3765,5835),(63,'frmCambio',1530,60,4380,8460),(64,'frmFechaInforme',5940,1785,1890,4545),(65,'frmTemppVenta',-60,-450,10230,15420),(66,'frmRastreoIngresos',195,5340,3570,5550),(67,'frmCuentasUsuario',3945,585,5745,7800),(68,'frmBuscarUsuario',7650,1545,4170,9015),(69,'frmFacturasAbiertas',3420,2970,4500,8475),(70,'frmCodigoBarras',375,375,5955,8490),(71,'frmInformesPorDia',8310,2865,2070,4185),(72,'frmComprobantes',4260,1185,3420,6690),(73,'frmConfiguraciones',3750,735,7635,12210),(74,'frmPlanSepare',1500,270,8205,10965),(75,'frmAbrirCaja',8955,2490,3870,5625),(76,'frmCierredecaja',8010,0,9180,7395),(77,'frmListadoPlan',6285,750,6780,10560),(78,'frmPagosPLanSp',5205,915,7935,7920),(79,'frmListadoCierres',3285,-105,8895,11835),(80,'frmFacturasClientSel',5340,300,8955,13500),(81,'frmListadoPagosCli',6765,0,7785,11910),(83,'frmV3_BuscarProductos',5085,-210,9060,12330),(84,'frmProductosRelacionados',780,780,6780,8325),(85,'frmFacturasProveSel',2595,-180,9135,15420),(86,'frmListadoPagosPro',3180,-300,7950,12900),(87,'frmAcercaDe',6690,435,4260,6915),(88,'frmEstadisticaVentas',8490,-105,9165,8985),(89,'frmListarGastos',780,210,7710,11835),(90,'frmV3_Ventas',2730,2730,8910,12345),(91,'frmListaServicios',0,0,7530,11730),(92,'frmIngresarProductoRc',1845,-375,9180,8685),(93,'frmConsultaProductosRelacionados',1170,1170,6510,17700),(94,'frmArticulosProveedor',1500,1500,6255,17430),(95,'frmPagosClientes',1095,870,8190,17430),(96,'frmVentasClientes',0,0,6255,17430),(97,'frmPagosProveedores',1035,555,8175,14970),(98,'frmInformeRangoFecha',1875,1875,6255,17430);
/*!40000 ALTER TABLE `tblformulario` ENABLE KEYS */;
UNLOCK TABLES;

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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3 COLLATE=utf8mb3_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `tblkardex`
--

LOCK TABLES `tblkardex` WRITE;
/*!40000 ALTER TABLE `tblkardex` DISABLE KEYS */;
/*!40000 ALTER TABLE `tblkardex` ENABLE KEYS */;
UNLOCK TABLES;

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
-- Dumping data for table `tblmedios_pago`
--

LOCK TABLES `tblmedios_pago` WRITE;
/*!40000 ALTER TABLE `tblmedios_pago` DISABLE KEYS */;
INSERT INTO `tblmedios_pago` VALUES (0,'Efectivo',10),(1,'Tarjeta',14),(2,'Bancolombia',30),(3,'Nequi',30);
/*!40000 ALTER TABLE `tblmedios_pago` ENABLE KEYS */;
UNLOCK TABLES;

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
-- Dumping data for table `tblmeses`
--

LOCK TABLES `tblmeses` WRITE;
/*!40000 ALTER TABLE `tblmeses` DISABLE KEYS */;
INSERT INTO `tblmeses` VALUES (1,'Enero'),(2,'Febrero'),(3,'Marzo'),(4,'Abril'),(5,'Mayo'),(6,'Junio'),(7,'Julio'),(8,'Agosto'),(9,'Septiembre'),(10,'Octubre'),(11,'Noviembre'),(12,'Diciembre');
/*!40000 ALTER TABLE `tblmeses` ENABLE KEYS */;
UNLOCK TABLES;

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
-- Dumping data for table `tblmov_banco`
--

LOCK TABLES `tblmov_banco` WRITE;
/*!40000 ALTER TABLE `tblmov_banco` DISABLE KEYS */;
/*!40000 ALTER TABLE `tblmov_banco` ENABLE KEYS */;
UNLOCK TABLES;

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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `tblmov_caja`
--

LOCK TABLES `tblmov_caja` WRITE;
/*!40000 ALTER TABLE `tblmov_caja` DISABLE KEYS */;
/*!40000 ALTER TABLE `tblmov_caja` ENABLE KEYS */;
UNLOCK TABLES;

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
-- Dumping data for table `tblmovimiento`
--

LOCK TABLES `tblmovimiento` WRITE;
/*!40000 ALTER TABLE `tblmovimiento` DISABLE KEYS */;
/*!40000 ALTER TABLE `tblmovimiento` ENABLE KEYS */;
UNLOCK TABLES;

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
-- Dumping data for table `tblmovimientos_distribucion`
--

LOCK TABLES `tblmovimientos_distribucion` WRITE;
/*!40000 ALTER TABLE `tblmovimientos_distribucion` DISABLE KEYS */;
/*!40000 ALTER TABLE `tblmovimientos_distribucion` ENABLE KEYS */;
UNLOCK TABLES;

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
-- Dumping data for table `tblnotas_articulo`
--

LOCK TABLES `tblnotas_articulo` WRITE;
/*!40000 ALTER TABLE `tblnotas_articulo` DISABLE KEYS */;
/*!40000 ALTER TABLE `tblnotas_articulo` ENABLE KEYS */;
UNLOCK TABLES;

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
-- Dumping data for table `tblordenproduccion`
--

LOCK TABLES `tblordenproduccion` WRITE;
/*!40000 ALTER TABLE `tblordenproduccion` DISABLE KEYS */;
/*!40000 ALTER TABLE `tblordenproduccion` ENABLE KEYS */;
UNLOCK TABLES;

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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3 COLLATE=utf8mb3_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `tblpagos`
--

LOCK TABLES `tblpagos` WRITE;
/*!40000 ALTER TABLE `tblpagos` DISABLE KEYS */;
/*!40000 ALTER TABLE `tblpagos` ENABLE KEYS */;
UNLOCK TABLES;

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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3 COLLATE=utf8mb3_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `tblpedidos`
--

LOCK TABLES `tblpedidos` WRITE;
/*!40000 ALTER TABLE `tblpedidos` DISABLE KEYS */;
/*!40000 ALTER TABLE `tblpedidos` ENABLE KEYS */;
UNLOCK TABLES;

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
-- Dumping data for table `tblporcentajeutilidad`
--

LOCK TABLES `tblporcentajeutilidad` WRITE;
/*!40000 ALTER TABLE `tblporcentajeutilidad` DISABLE KEYS */;
INSERT INTO `tblporcentajeutilidad` VALUES (10,0.0000,0.0000,0),(11,0.0000,0.0000,0),(12,0.0000,0.0000,0),(13,25.0000,40.0000,0),(14,1.0000,21.0000,0);
/*!40000 ALTER TABLE `tblporcentajeutilidad` ENABLE KEYS */;
UNLOCK TABLES;

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
-- Dumping data for table `tblpresentaciones`
--

LOCK TABLES `tblpresentaciones` WRITE;
/*!40000 ALTER TABLE `tblpresentaciones` DISABLE KEYS */;
INSERT INTO `tblpresentaciones` VALUES (1,18,'Kilo',1.0000,3000.0000,'123456',0),(2,18,'Bulto x 50',50.0000,120000.0000,'654321',1);
/*!40000 ALTER TABLE `tblpresentaciones` ENABLE KEYS */;
UNLOCK TABLES;

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
-- Dumping data for table `tblproducto_componentes`
--

LOCK TABLES `tblproducto_componentes` WRITE;
/*!40000 ALTER TABLE `tblproducto_componentes` DISABLE KEYS */;
/*!40000 ALTER TABLE `tblproducto_componentes` ENABLE KEYS */;
UNLOCK TABLES;

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
-- Dumping data for table `tblproductos_lotes`
--

LOCK TABLES `tblproductos_lotes` WRITE;
/*!40000 ALTER TABLE `tblproductos_lotes` DISABLE KEYS */;
/*!40000 ALTER TABLE `tblproductos_lotes` ENABLE KEYS */;
UNLOCK TABLES;

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
-- Dumping data for table `tblproductosrelacionados`
--

LOCK TABLES `tblproductosrelacionados` WRITE;
/*!40000 ALTER TABLE `tblproductosrelacionados` DISABLE KEYS */;
/*!40000 ALTER TABLE `tblproductosrelacionados` ENABLE KEYS */;
UNLOCK TABLES;

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
-- Dumping data for table `tblproveedores`
--

LOCK TABLES `tblproveedores` WRITE;
/*!40000 ALTER TABLE `tblproveedores` DISABLE KEYS */;
INSERT INTO `tblproveedores` VALUES (220500,'COMPRAS AL CONTADO','0','-','0','-','-',0,'-','-','-','0','2018-11-28 00:00:00','2024-09-17 21:01:13');
/*!40000 ALTER TABLE `tblproveedores` ENABLE KEYS */;
UNLOCK TABLES;

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
-- Dumping data for table `tblreferencia`
--

LOCK TABLES `tblreferencia` WRITE;
/*!40000 ALTER TABLE `tblreferencia` DISABLE KEYS */;
INSERT INTO `tblreferencia` VALUES (15,'-'),(127,'Unidad');
/*!40000 ALTER TABLE `tblreferencia` ENABLE KEYS */;
UNLOCK TABLES;

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
-- Dumping data for table `tblreferenciasarticulos`
--

LOCK TABLES `tblreferenciasarticulos` WRITE;
/*!40000 ALTER TABLE `tblreferenciasarticulos` DISABLE KEYS */;
/*!40000 ALTER TABLE `tblreferenciasarticulos` ENABLE KEYS */;
UNLOCK TABLES;

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
-- Dumping data for table `tblregistro`
--

LOCK TABLES `tblregistro` WRITE;
/*!40000 ALTER TABLE `tblregistro` DISABLE KEYS */;
/*!40000 ALTER TABLE `tblregistro` ENABLE KEYS */;
UNLOCK TABLES;

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
-- Dumping data for table `tblregistroproducto`
--

LOCK TABLES `tblregistroproducto` WRITE;
/*!40000 ALTER TABLE `tblregistroproducto` DISABLE KEYS */;
INSERT INTO `tblregistroproducto` VALUES ('LFMR - 0004','011001110001000110110011011101101001011010101001110101001011001101010101110010111000011001010100001001111');
/*!40000 ALTER TABLE `tblregistroproducto` ENABLE KEYS */;
UNLOCK TABLES;

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
  PRIMARY KEY (`Id_Retencion`),
  UNIQUE KEY `uk_codigo` (`Codigo`),
  KEY `idx_activa` (`Activa`)
) ENGINE=InnoDB AUTO_INCREMENT=67 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `tblretenciones`
--

LOCK TABLES `tblretenciones` WRITE;
/*!40000 ALTER TABLE `tblretenciones` DISABLE KEYS */;
INSERT INTO `tblretenciones` VALUES (1,'RETEFUENTE_SERV_DECL','ReteFuente servicios (declarante)',4.0000,'06',1,'2026-04-22 12:56:34'),(2,'RETEFUENTE_SERV_NODE','ReteFuente servicios (no declarante)',6.0000,'06',0,'2026-04-22 12:56:34'),(3,'RETEFUENTE_COMPRAS','ReteFuente compras generales',2.5000,'06',0,'2026-04-22 12:56:34'),(4,'RETEICA_PLANETARICA','ReteICA Planeta Rica servicios',0.9660,'07',0,'2026-04-22 12:56:34'),(5,'RETEIVA','ReteIVA (15% del IVA)',15.0000,'05',0,'2026-04-22 12:56:34');
/*!40000 ALTER TABLE `tblretenciones` ENABLE KEYS */;
UNLOCK TABLES;

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
-- Dumping data for table `tblsaldosfact`
--

LOCK TABLES `tblsaldosfact` WRITE;
/*!40000 ALTER TABLE `tblsaldosfact` DISABLE KEYS */;
/*!40000 ALTER TABLE `tblsaldosfact` ENABLE KEYS */;
UNLOCK TABLES;

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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `tblsesiones_caja`
--

LOCK TABLES `tblsesiones_caja` WRITE;
/*!40000 ALTER TABLE `tblsesiones_caja` DISABLE KEYS */;
/*!40000 ALTER TABLE `tblsesiones_caja` ENABLE KEYS */;
UNLOCK TABLES;

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
-- Dumping data for table `tbltempfactutilidad`
--

LOCK TABLES `tbltempfactutilidad` WRITE;
/*!40000 ALTER TABLE `tbltempfactutilidad` DISABLE KEYS */;
/*!40000 ALTER TABLE `tbltempfactutilidad` ENABLE KEYS */;
UNLOCK TABLES;

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
-- Dumping data for table `tbltemplistadofactuvenc`
--

LOCK TABLES `tbltemplistadofactuvenc` WRITE;
/*!40000 ALTER TABLE `tbltemplistadofactuvenc` DISABLE KEYS */;
INSERT INTO `tbltemplistadofactuvenc` VALUES ('9','2025-10-17 00:00:00',7,'2025-10-24 00:00:00',400000.0000,400000.0000,130513,'Abastos Planeta','INNOVACION DIGITAL','Saldo de Clientes',146,0.0000,0,400000,0),('8','2025-09-05 00:00:00',30,'2025-10-05 00:00:00',400000.0000,200000.0000,130511,'ESTUCOS PLANETA','INNOVACION DIGITAL','Saldo de Clientes',165,0.0000,0,200000,0),('7','2025-10-13 00:00:00',30,'2025-11-12 00:00:00',550000.0000,250000.0000,130510,'HERNANDEZ OCHOA MATEO','INNOVACION DIGITAL','Saldo de Clientes',127,0.0000,0,250000,0);
/*!40000 ALTER TABLE `tbltemplistadofactuvenc` ENABLE KEYS */;
UNLOCK TABLES;

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
-- Dumping data for table `tbltemplistadofactuvencpro`
--

LOCK TABLES `tbltemplistadofactuvencpro` WRITE;
/*!40000 ALTER TABLE `tbltemplistadofactuvencpro` DISABLE KEYS */;
/*!40000 ALTER TABLE `tbltemplistadofactuvencpro` ENABLE KEYS */;
UNLOCK TABLES;

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
-- Dumping data for table `tbltempmes`
--

LOCK TABLES `tbltempmes` WRITE;
/*!40000 ALTER TABLE `tbltempmes` DISABLE KEYS */;
INSERT INTO `tbltempmes` VALUES (0,2022,6,'2024-06-20 05:00:00',6953,NULL,432,0,1,0);
/*!40000 ALTER TABLE `tbltempmes` ENABLE KEYS */;
UNLOCK TABLES;

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
-- Dumping data for table `tbltempventas`
--

LOCK TABLES `tbltempventas` WRITE;
/*!40000 ALTER TABLE `tbltempventas` DISABLE KEYS */;
/*!40000 ALTER TABLE `tbltempventas` ENABLE KEYS */;
UNLOCK TABLES;

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
-- Dumping data for table `tbltipomovimiento`
--

LOCK TABLES `tbltipomovimiento` WRITE;
/*!40000 ALTER TABLE `tbltipomovimiento` DISABLE KEYS */;
INSERT INTO `tbltipomovimiento` VALUES (1,'Venta'),(2,'Compra'),(3,'Egreso'),(4,'Ingreso'),(5,'Devolucion x Compra'),(6,'Devolucion x Venta'),(7,'Anulación Egreso'),(8,'Anulación Ingreso'),(9,'Articulos Nuevo');
/*!40000 ALTER TABLE `tbltipomovimiento` ENABLE KEYS */;
UNLOCK TABLES;

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
-- Dumping data for table `tbltiposusuario`
--

LOCK TABLES `tbltiposusuario` WRITE;
/*!40000 ALTER TABLE `tbltiposusuario` DISABLE KEYS */;
INSERT INTO `tbltiposusuario` VALUES (1,'Administrador',' 0 1 2 3 4 5 6 7 8 9 10 11 12 13 14 15 16 17 18 19 20 21 22 23 24 25 26 27 28 29',NULL),(2,'Vendedor',' 6 7 10 11 12 13 14 15 16 17 18 19 20 21 22 23','[\"ventas\",\"ventas_listado\",\"clientes\",\"caja\",\"compras\",\"ventas_tipo_pago\",\"facturacion_electronica\",\"gastos\",\"pagos_listado\"]'),(3,'Secretaria',' 0 1 2 3 4 5 6 7 8 9 10 11 12 13 14 15 16 17 18 19 20 21 22 23 24 26 27 28',NULL);
/*!40000 ALTER TABLE `tbltiposusuario` ENABLE KEYS */;
UNLOCK TABLES;

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
-- Dumping data for table `tblusuarios`
--

LOCK TABLES `tblusuarios` WRITE;
/*!40000 ALTER TABLE `tblusuarios` DISABLE KEYS */;
INSERT INTO `tblusuarios` VALUES (1,'root','Luis Fernando Martinez',0,'0110001011001001100110110100',' 0 1 2 3 4 5 6 7 8 9 10 11 12 13 14 15 16 17 18 19 20 21 22 23 24 25 26 27 28',1,NULL);
/*!40000 ALTER TABLE `tblusuarios` ENABLE KEYS */;
UNLOCK TABLES;

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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `tblventa_retenciones`
--

LOCK TABLES `tblventa_retenciones` WRITE;
/*!40000 ALTER TABLE `tblventa_retenciones` DISABLE KEYS */;
/*!40000 ALTER TABLE `tblventa_retenciones` ENABLE KEYS */;
UNLOCK TABLES;

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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3 COLLATE=utf8mb3_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `tblventas`
--

LOCK TABLES `tblventas` WRITE;
/*!40000 ALTER TABLE `tblventas` DISABLE KEYS */;
/*!40000 ALTER TABLE `tblventas` ENABLE KEYS */;
UNLOCK TABLES;

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
-- Dumping data for table `tipos_documentos`
--

LOCK TABLES `tipos_documentos` WRITE;
/*!40000 ALTER TABLE `tipos_documentos` DISABLE KEYS */;
INSERT INTO `tipos_documentos` VALUES (1,'31','NIT','Número de Identificación Tributaria',NULL,NULL),(2,'13','Cédula de ciudadanía','Persona natural colombiana',NULL,NULL),(3,'22','Cédula de extranjería','Persona natural extranjera',NULL,NULL),(4,'41','Pasaporte','Documento para extranjeros',NULL,NULL),(5,'42','Tipo de documento extranjero','Otro documento válido',NULL,NULL);
/*!40000 ALTER TABLE `tipos_documentos` ENABLE KEYS */;
UNLOCK TABLES;

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
-- Dumping data for table `type_documents`
--

LOCK TABLES `type_documents` WRITE;
/*!40000 ALTER TABLE `type_documents` DISABLE KEYS */;
INSERT INTO `type_documents` VALUES (1,'01','Factura electrónica','CUFE-SHA384',NULL,NULL),(2,'91','Nota crédito','CUDE-SHA384',NULL,NULL),(3,'92','Nota débito','CUDE-SHA384',NULL,NULL);
/*!40000 ALTER TABLE `type_documents` ENABLE KEYS */;
UNLOCK TABLES;

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
-- Dumping data for table `type_item_identifications`
--

LOCK TABLES `type_item_identifications` WRITE;
/*!40000 ALTER TABLE `type_item_identifications` DISABLE KEYS */;
INSERT INTO `type_item_identifications` VALUES (1,'001',NULL,'UNSPSC',NULL,NULL),(2,'010',NULL,'GTIN',NULL,NULL),(3,'020','195','Partida Arancelarias',NULL,NULL),(4,'999',NULL,'Estándar de adopción del contribuyente',NULL,NULL);
/*!40000 ALTER TABLE `type_item_identifications` ENABLE KEYS */;
UNLOCK TABLES;

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
-- Dumping data for table `type_liabilities`
--

LOCK TABLES `type_liabilities` WRITE;
/*!40000 ALTER TABLE `type_liabilities` DISABLE KEYS */;
INSERT INTO `type_liabilities` VALUES (1,'50','Gran contribuyente','Responsabilidad tributaria especial'),(2,'51','Autorretenedor','Responsable de sus propias retenciones'),(3,'52','Agente de retención IVA','Retiene IVA de terceros'),(4,'R-99-PN','No aplica','Persona natural sin responsabilidad específica');
/*!40000 ALTER TABLE `type_liabilities` ENABLE KEYS */;
UNLOCK TABLES;

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
-- Dumping data for table `type_organizations`
--

LOCK TABLES `type_organizations` WRITE;
/*!40000 ALTER TABLE `type_organizations` DISABLE KEYS */;
INSERT INTO `type_organizations` VALUES (1,'1','Persona Jurídica','Empresa legalmente constituida'),(2,'2','Persona Natural','Individuo que ejerce actividad comercial');
/*!40000 ALTER TABLE `type_organizations` ENABLE KEYS */;
UNLOCK TABLES;

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
-- Dumping data for table `type_regimes`
--

LOCK TABLES `type_regimes` WRITE;
/*!40000 ALTER TABLE `type_regimes` DISABLE KEYS */;
INSERT INTO `type_regimes` VALUES (1,'48','Régimen Simple de Tributación - SIMPLE','Ley 2010 de 2019',NULL,NULL),(2,'49','Régimen Ordinario','Régimen general tradicional',NULL,NULL);
/*!40000 ALTER TABLE `type_regimes` ENABLE KEYS */;
UNLOCK TABLES;

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
-- Dumping data for table `unit_measures`
--

LOCK TABLES `unit_measures` WRITE;
/*!40000 ALTER TABLE `unit_measures` DISABLE KEYS */;
INSERT INTO `unit_measures` VALUES (1,'spray pequeño','04',NULL,NULL),(2,'levantar','05',NULL,NULL),(3,'Lote calor','08',NULL,NULL),(4,'grupo','10',NULL,NULL),(5,'equipar','11',NULL,NULL),(6,'ración','13',NULL,NULL),(7,'Disparo','14',NULL,NULL),(8,'palo','15',NULL,NULL),(9,'tambor de ciento quince kg','16',NULL,NULL),(10,'tambor de cien libras','17',NULL,NULL),(11,'tambor de cincuenta y cinco galones (US)','18',NULL,NULL),(12,'camión cisterna','19',NULL,NULL),(13,'contenedor de veinte pies','20',NULL,NULL),(14,'contenedor de cuarenta pies','21',NULL,NULL),(15,'decilitro por gramo','22',NULL,NULL),(16,'gramo por centímetro cúbico','23',NULL,NULL),(17,'libra teórica','24',NULL,NULL),(18,'gramo por centímetro cuadrado','25',NULL,NULL),(19,'tonelada real','26',NULL,NULL),(20,'tonelada teórica','27',NULL,NULL),(21,'kilogramo por metro cuadrado','28',NULL,NULL),(22,'libra por mil pies cuadrados','29',NULL,NULL),(23,'Día de potencia del caballo por tonelada métrica seca al aire.','30',NULL,NULL),(24,'coger peso','31',NULL,NULL),(25,'kilogramo por aire seco tonelada métrica','32',NULL,NULL),(26,'kilopascales metros cuadrados por gramo','33',NULL,NULL),(27,'kilopascales por milímetro','34',NULL,NULL),(28,'mililitros por centímetro cuadrado segundo','35',NULL,NULL),(29,'pies cúbicos por minuto por pie cuadrado','36',NULL,NULL),(30,'onza por pie cuadrado','37',NULL,NULL),(31,'onzas por pie cuadrado por 0,01 pulgadas','38',NULL,NULL),(32,'mililitro por segundo','40',NULL,NULL),(33,'mililitro por minuto','41',NULL,NULL),(34,'bolsa súper a granel','43',NULL,NULL),(35,'bolsa a granel de quinientos kg','44',NULL,NULL),(36,'bolsa a granel de trescientos kg','45',NULL,NULL),(37,'bolsa a granel de cincuenta libras','46',NULL,NULL),(38,'bolsa de cincuenta libras','47',NULL,NULL),(39,'carga de automóviles a granel','48',NULL,NULL),(40,'kilogramos teóricos','53',NULL,NULL),(41,'tonelada teórica','54',NULL,NULL),(42,'sitas','56',NULL,NULL),(43,'malla','57',NULL,NULL),(44,'kilogramo neto','58',NULL,NULL),(45,'parte por millón','59',NULL,NULL),(46,'porcentaje de peso','60',NULL,NULL),(47,'parte por billón (US)','61',NULL,NULL),(48,'porcentaje por 1000 horas','62',NULL,NULL),(49,'tasa de fracaso en el tiempo','63',NULL,NULL),(50,'libra por pulgada cuadrada, calibre','64',NULL,NULL),(51,'Oersted','66',NULL,NULL),(52,'prueba de escala específica','69',NULL,NULL),(53,'voltio amperio por libra','71',NULL,NULL),(54,'vatio por libra','72',NULL,NULL),(55,'amperio tum por centímetro','73',NULL,NULL),(56,'milipascal','74',NULL,NULL),(57,'gauss','76',NULL,NULL),(58,'mili pulgadas','77',NULL,NULL),(59,'kilogauss','78',NULL,NULL),(60,'libras por pulgada cuadrada absoluta','80',NULL,NULL),(61,'Enrique','81',NULL,NULL),(62,'kilopound por pulgada cuadrada','84',NULL,NULL),(63,'fuerza libra pie','85',NULL,NULL),(64,'libra por pie cúbico','87',NULL,NULL),(65,'equilibrio','89',NULL,NULL),(66,'Saybold segundo universal','90',NULL,NULL),(67,'alimenta','91',NULL,NULL),(68,'calorías por centímetro cúbico','92',NULL,NULL),(69,'calorías por gramo','93',NULL,NULL),(70,'unidad','94',NULL,NULL),(71,'veinte mil galones (US) de carros','95',NULL,NULL),(72,'diez mil galones (US) de carros','96',NULL,NULL),(73,'tambor de diez kg','97',NULL,NULL),(74,'tambor de quince kg','98',NULL,NULL),(75,'milla de coche','1ª',NULL,NULL),(76,'recuento de coches','1B',NULL,NULL),(77,'recuento de locomotoras','1C',NULL,NULL),(78,'recuento de cabos','1D',NULL,NULL),(79,'carro vacio','1E',NULL,NULL),(80,'millas de tren','1F',NULL,NULL),(81,'uso de combustible galón (US)','1G',NULL,NULL),(82,'milla del caboose','1H',NULL,NULL),(83,'tipo de interés fijo','1I',NULL,NULL),(84,'tonelada milla','1J',NULL,NULL),(85,'milla locomotora','1K',NULL,NULL),(86,'recuento total de coches','1L',NULL,NULL),(87,'milla de coche total','1M',NULL,NULL),(88,'cuarto de milla','1X',NULL,NULL),(89,'radianes por segundo','2ª',NULL,NULL),(90,'radianes por segundo al cuadrado','2B',NULL,NULL),(91,'Röntgen','2C',NULL,NULL),(92,'Unidad térmica británica por hora.','2I',NULL,NULL),(93,'centímetro cúbico por segundo','2J',NULL,NULL),(94,'pie cúbico por hora','2K',NULL,NULL),(95,'pie cúbico por minuto','2L',NULL,NULL),(96,'centímetro por segundo','2M',NULL,NULL),(97,'decibel','2N',NULL,NULL),(98,'kilobyte','2P',NULL,NULL),(99,'kilobecquerel','2Q',NULL,NULL),(100,'kilocurie','2R',NULL,NULL),(101,'megagramo','2U',NULL,NULL),(102,'megagramo por hora','2V',NULL,NULL),(103,'compartimiento','2W',NULL,NULL),(104,'metro por minuto','2X',NULL,NULL),(105,'milliröntgen','2Y',NULL,NULL),(106,'milivoltios','2Z',NULL,NULL),(107,'megajulio','3B',NULL,NULL),(108,'manmonth','3C',NULL,NULL),(109,'libra por libra de producto','3E',NULL,NULL),(110,'libra por pieza de producto','3G',NULL,NULL),(111,'kilogramo por kilogramo de producto','3H',NULL,NULL),(112,'kilogramo por pieza de producto','3I',NULL,NULL),(113,'bobina','4ª',NULL,NULL),(114,'gorra','4B',NULL,NULL),(115,'centistokes','4C',NULL,NULL),(116,'paquete de veinte','4E',NULL,NULL),(117,'microlitro','4G',NULL,NULL),(118,'micrometro','4H',NULL,NULL),(119,'miliamperio','4K',NULL,NULL),(120,'megabyte','4L',NULL,NULL),(121,'miligramo por hora','4M',NULL,NULL),(122,'megabecquerel','4N',NULL,NULL),(123,'microfarad','4º',NULL,NULL),(124,'newton por metro','4P',NULL,NULL),(125,'onza pulgada','4Q',NULL,NULL),(126,'pie onza','4R',NULL,NULL),(127,'picofarad','4T',NULL,NULL),(128,'libra por hora','4U',NULL,NULL),(129,'tonelada (US) por hora','4W',NULL,NULL),(130,'kilolitro por hora','4X',NULL,NULL),(131,'barril por minuto','5ª',NULL,NULL),(132,'lote','5B',NULL,NULL),(133,'galón (US) por mil','5C',NULL,NULL),(134,'MMSCF / día','5E',NULL,NULL),(135,'libras por mil','5F',NULL,NULL),(136,'bomba','5G',NULL,NULL),(137,'escenario','5H',NULL,NULL),(138,'pie cúbico estándar','5I',NULL,NULL),(139,'potencia hidráulica de caballos','5J',NULL,NULL),(140,'contar por minuto','5K',NULL,NULL),(141,'nivel sismico','5P',NULL,NULL),(142,'nfor sismica','5Q',NULL,NULL),(143,'15 calorías C','A1',NULL,NULL),(144,'amperio metro cuadrado por joule segundo','A10',NULL,NULL),(145,'Ã ¥ ngström','A11',NULL,NULL),(146,'unidad astronómica','A12',NULL,NULL),(147,'attojoule','A13',NULL,NULL),(148,'granero','A14',NULL,NULL),(149,'granero por electrón voltio','A15',NULL,NULL),(150,'granero por voltio de electrones esteradiano,','A16',NULL,NULL),(151,'granero por sterdian','A17',NULL,NULL),(152,'becquerel por kilogramo','A18',NULL,NULL),(153,'becquerel por metro cúbico','A19',NULL,NULL),(154,'amperio por centímetro','A2',NULL,NULL),(155,'Unidad térmica británica por segundo pie cuadrado grado Rankin','A20',NULL,NULL),(156,'Unidad térmica británica por libra grado Rankin','A21',NULL,NULL),(157,'Unidad térmica británica por segundo pie grado Rankin','A22',NULL,NULL),(158,'Unidad térmica británica por hora pie cuadrado grado Rankin','A23',NULL,NULL),(159,'candela por metro cuadrado','A24',NULL,NULL),(160,'cheval vapeur','A25',NULL,NULL),(161,'medidor de culombio','A26',NULL,NULL),(162,'medidor de culombio al cuadrado por voltio','A27',NULL,NULL),(163,'Coulomb por centímetro cúbico','A28',NULL,NULL),(164,'Coulomb por metro cúbico','A29',NULL,NULL),(165,'amperio por milímetro','A3',NULL,NULL),(166,'Coulomb por milímetro cúbico','A30',NULL,NULL),(167,'Coulomb por kilogramo segundo','A31',NULL,NULL),(168,'Coulomb por mol','A32',NULL,NULL),(169,'Coulomb por centímetro cuadrado','A33',NULL,NULL),(170,'Coulomb por metro cuadrado','A34',NULL,NULL),(171,'Coulomb por milímetro cuadrado','A35',NULL,NULL),(172,'centímetro cúbico por mol','A36',NULL,NULL),(173,'nformaci cúbico por mol','A37',NULL,NULL),(174,'metro cúbico por coulomb','A38',NULL,NULL),(175,'metro cúbico por kilogramo','A39',NULL,NULL),(176,'amperio por centímetro cuadrado','A4',NULL,NULL),(177,'metro cúbico por mol','A40',NULL,NULL),(178,'amperio por metro cuadrado','A41',NULL,NULL),(179,'curie por kilogramo','A42',NULL,NULL),(180,'tonelaje de peso muerto','A43',NULL,NULL),(181,'decalitro','A44',NULL,NULL),(182,'decámetro','A45',NULL,NULL),(183,'decitex','A47',NULL,NULL),(184,'grado Rankin','A48',NULL,NULL),(185,'negador','A49',NULL,NULL),(186,'amperio metro cuadrado','A5',NULL,NULL),(187,'dyn segundo por centímetro cúbico','A50',NULL,NULL),(188,'dina segundo por centímetro','A51',NULL,NULL),(189,'dina segundo por centímetro al quinto','A52',NULL,NULL),(190,'electronvolt','A53',NULL,NULL),(191,'electronvoltio por metro','A54',NULL,NULL),(192,'metro electronvolt cuadrado','A55',NULL,NULL),(193,'electronvoltio de metro cuadrado por kilogramo','A56',NULL,NULL),(194,'ergio','A57',NULL,NULL),(195,'erg por centímetro','A58',NULL,NULL),(196,'amperio por metro cuadrado kelvin al cuadrado','A6',NULL,NULL),(197,'erg por centímetro cúbico','A60',NULL,NULL),(198,'erg por gramo','A61',NULL,NULL),(199,'erg por gramo de segundo','A62',NULL,NULL),(200,'erg por segundo','A63',NULL,NULL),(201,'erg por segundo centímetro cuadrado','A64',NULL,NULL),(202,'erg por centímetro cuadrado segundo','A65',NULL,NULL),(203,'erg centímetro cuadrado','A66',NULL,NULL),(204,'ergímetro cuadrado por gramo','A67',NULL,NULL),(205,'exajulio','A68',NULL,NULL),(206,'faradio por metro','A69',NULL,NULL),(207,'amperio por milímetro cuadrado','A7',NULL,NULL),(208,'femtojoule','A70',NULL,NULL),(209,'femtometro','A71',NULL,NULL),(210,'pie por segundo al cuadrado','A73',NULL,NULL),(211,'pie-fuerza de la libra por segundo','A74',NULL,NULL),(212,'tonelada de carga','A75',NULL,NULL),(213,'galón','A76',NULL,NULL),(214,'Unidad de desplazamiento CGS gaussiana','A77',NULL,NULL),(215,'Unidad gaussiana CGS de corriente eléctrica.','A78',NULL,NULL),(216,'Unidad Gaussian CGS de carga eléctrica.','A79',NULL,NULL),(217,'amperio segundo','A8',NULL,NULL),(218,'Unidad Gaussian CGS de intensidad de campo eléctrico.','A80',NULL,NULL),(219,'Unidad Gaussian CGS de polarización eléctrica.','A81',NULL,NULL),(220,'Unidad Gaussian CGS de potencial eléctrico.','A82',NULL,NULL),(221,'Unidad Gaussiana CGS de magnetización.','A83',NULL,NULL),(222,'gigacoulomb por metro cúbico','A84',NULL,NULL),(223,'Gigaelectronvolt','A85',NULL,NULL),(224,'gigahercios','A86',NULL,NULL),(225,'gigaohm','A87',NULL,NULL),(226,'medidor de gigaohm','A88',NULL,NULL),(227,'gigapascal','A89',NULL,NULL),(228,'tarifa','A9',NULL,NULL),(229,'gigavatios','A90',NULL,NULL),(230,'gon','A91',NULL,NULL),(231,'gramo por metro cúbico','A93',NULL,NULL),(232,'gramo por mol','A94',NULL,NULL),(233,'gris','A95',NULL,NULL),(234,'gris por segundo','A96',NULL,NULL),(235,'hectopascal','A97',NULL,NULL),(236,'Henry por metro','A98',NULL,NULL),(237,'bola','AA',NULL,NULL),(238,'paquete a granel','AB',NULL,NULL),(239,'acre','ACR',NULL,NULL),(240,'byte','AD',NULL,NULL),(241,'amperio por metro','AE',NULL,NULL),(242,'minuto adicional','AH',NULL,NULL),(243,'minuto promedio por llamada','AI',NULL,NULL),(244,'policía','AJ',NULL,NULL),(245,'braza','AK',NULL,NULL),(246,'nfor de acceso','AL',NULL,NULL),(247,'ampolla','AM',NULL,NULL),(248,'hora amperio','AMH',NULL,NULL),(249,'amperio','AMP',NULL,NULL),(250,'año','ANA',NULL,NULL),(251,'solo libra de aluminio','AP',NULL,NULL),(252,'onza troy o onza de boticarios','APZ',NULL,NULL),(253,'Unidad de factor antihemofílico (AHF)','AQ',NULL,NULL),(254,'supositorio','AR',NULL,NULL),(255,'son','SON',NULL,NULL),(256,'surtido','COMO',NULL,NULL),(257,'fuerza alcohólica en masa','ASM',NULL,NULL),(258,'fuerza alcohólica por volumen','ASU',NULL,NULL),(259,'ambiente estándar','ATM',NULL,NULL),(260,'ambiente técnico','ATT',NULL,NULL),(261,'cápsula','AV',NULL,NULL),(262,'vial lleno de polvo','AW',NULL,NULL),(263,'montaje','SÍ',NULL,NULL),(264,'Unidad térmica británica por libra','AZ',NULL,NULL),(265,'Btu por pie cúbico','B0',NULL,NULL),(266,'barril (US) por día','B1',NULL,NULL),(267,'julios por kilogramo kelvin','B11',NULL,NULL),(268,'julios por metro','B12',NULL,NULL),(269,'julios por metro cuadrado','B13',NULL,NULL),(270,'julios por metro a la cuarta potencia','B14',NULL,NULL),(271,'julios por mol','B15',NULL,NULL),(272,'julios por mol kelvin','B16',NULL,NULL),(273,'joule segundo','B18',NULL,NULL),(274,'litera','B2',NULL,NULL),(275,'joule metro cuadrado por kilogramo','B20',NULL,NULL),(276,'kelvin por vatio','B21',NULL,NULL),(277,'Kiloampere','B22',NULL,NULL),(278,'kiloampere por metro cuadrado','B23',NULL,NULL),(279,'kiloampere por metro','B24',NULL,NULL),(280,'kilobecquerel por kilogramo','B25',NULL,NULL),(281,'kilocoulomb','B26',NULL,NULL),(282,'kilocoulomb por metro cúbico','B27',NULL,NULL),(283,'kilocoulomb por metro cuadrado','B28',NULL,NULL),(284,'kiloelectronvolt','B29',NULL,NULL),(285,'libra de bateo','B3',NULL,NULL),(286,'kilogramo metro por segundo','B31',NULL,NULL),(287,'kilogramo metro cuadrado','B32',NULL,NULL),(288,'kilogramo metro cuadrado por segundo','B33',NULL,NULL),(289,'kilogramo por decímetro cúbico','B34',NULL,NULL),(290,'kilogramo por litro','B35',NULL,NULL),(291,'caloría termoquímica por gramo','B36',NULL,NULL),(292,'kilogramo de fuerza','B37',NULL,NULL),(293,'metro de fuerza de kilogramo','B38',NULL,NULL),(294,'metro de fuerza de kilogramo por segundo','B39',NULL,NULL),(295,'barril, imperial','B4',NULL,NULL),(296,'kilogramo de fuerza por metro cuadrado','B40',NULL,NULL),(297,'kilojoule per kelvin','B41',NULL,NULL),(298,'kilojoule por kilogramo','B42',NULL,NULL),(299,'kilojoule por kilogramo kelvin','B43',NULL,NULL),(300,'kilojoule por mol','B44',NULL,NULL),(301,'kilomol','B45',NULL,NULL),(302,'kilomol por metro cúbico','B46',NULL,NULL),(303,'Kilonewton','B47',NULL,NULL),(304,'medidor de kilonewton','B48',NULL,NULL),(305,'kiloohm','B49',NULL,NULL),(306,'palanquilla','B5',NULL,NULL),(307,'medidor de kiloohm','B50',NULL,NULL),(308,'kilopond','B51',NULL,NULL),(309,'kilosegundo','B52',NULL,NULL),(310,'kilosiemens','B53',NULL,NULL),(311,'kilosiemens por metro','B54',NULL,NULL),(312,'kilovoltios por metro','B55',NULL,NULL),(313,'kiloveber por metro','B56',NULL,NULL),(314,'año luz','B57',NULL,NULL),(315,'litro por mol','B58',NULL,NULL),(316,'hora lumen','B59',NULL,NULL),(317,'bollo','B6',NULL,NULL),(318,'lumen por metro cuadrado','B60',NULL,NULL),(319,'lumen por vatio','B61',NULL,NULL),(320,'lumen segundo','B62',NULL,NULL),(321,'hora de lux','B63',NULL,NULL),(322,'lux segundo','B64',NULL,NULL),(323,'Maxwell','B65',NULL,NULL),(324,'megaamperios por metro cuadrado','B66',NULL,NULL),(325,'megabecquerel por kilogramo','B67',NULL,NULL),(326,'megacoulomb por metro cúbico','B69',NULL,NULL),(327,'ciclo','B7',NULL,NULL),(328,'megacoulomb por metro cuadrado','B70',NULL,NULL),(329,'megaelectronvolt','B71',NULL,NULL),(330,'megagramo por metro cúbico','B72',NULL,NULL),(331,'meganewton','B73',NULL,NULL),(332,'medidor de meganewton','B74',NULL,NULL),(333,'megaohm','B75',NULL,NULL),(334,'metro megaohm','B76',NULL,NULL),(335,'megasiemens por metro','B77',NULL,NULL),(336,'megavoltio','B78',NULL,NULL),(337,'megavolt por metro','B79',NULL,NULL),(338,'julios por metro cúbico','B8',NULL,NULL),(339,'metro recíproco cuadrado recíproco segundo','B81',NULL,NULL),(340,'metro a la cuarta potencia','B83',NULL,NULL),(341,'microamperios','B84',NULL,NULL),(342,'microbar','B85',NULL,NULL),(343,'microcoulomb','B86',NULL,NULL),(344,'microcoulomb por metro cúbico','B87',NULL,NULL),(345,'microcoulomb por metro cuadrado','B88',NULL,NULL),(346,'microfarada por metro','B89',NULL,NULL),(347,'batt','B9',NULL,NULL),(348,'microhenry','B90',NULL,NULL),(349,'microhenry por metro','B91',NULL,NULL),(350,'micronewton','B92',NULL,NULL),(351,'medidor de micronewton','B93',NULL,NULL),(352,'microohm','B94',NULL,NULL),(353,'medidor de microohmios','B95',NULL,NULL),(354,'micropascal','B96',NULL,NULL),(355,'microradiano','B97',NULL,NULL),(356,'microsegundo','B98',NULL,NULL),(357,'microsiemens','B99',NULL,NULL),(358,'bar','BAR',NULL,NULL),(359,'caja base','BB',NULL,NULL),(360,'tablero','BD',NULL,NULL),(361,'haz','SER',NULL,NULL),(362,'pie de tabla','BFT',NULL,NULL),(363,'bolso','BG',NULL,NULL),(364,'cepillo','BH',NULL,NULL),(365,'potencia al freno','BHP',NULL,NULL),(366,'trillón de dólares','BIL',NULL,NULL),(367,'cangilón','BJ',NULL,NULL),(368,'cesta','BK',NULL,NULL),(369,'bala','BL',NULL,NULL),(370,'barril seco','BLD',NULL,NULL),(371,'barril (EE. UU.) (petróleo, etc.)','BLL',NULL,NULL),(372,'botella','BO',NULL,NULL),(373,'cien pies de tabla','BP',NULL,NULL),(374,'becquerel','BQL',NULL,NULL),(375,'bar','BR',NULL,NULL),(376,'tornillo','BT',NULL,NULL),(377,'Unidad Térmica Británica','BTU',NULL,NULL),(378,'bushel (EE. UU.)','BUA',NULL,NULL),(379,'bushel (Reino Unido)','BUI',NULL,NULL),(380,'peso base','BW',NULL,NULL),(381,'caja','BX',NULL,NULL),(382,'millones de BTUs','BZ',NULL,NULL),(383,'llamada','C0',NULL,NULL),(384,'producto compuesto libra (peso total)','C1',NULL,NULL),(385,'millifarad','C10',NULL,NULL),(386,'miligal','C11',NULL,NULL),(387,'miligramo por metro','C12',NULL,NULL),(388,'miligray','C13',NULL,NULL),(389,'milihenry','C14',NULL,NULL),(390,'milijoule','C15',NULL,NULL),(391,'milímetro por segundo','C16',NULL,NULL),(392,'milímetro cuadrado por segundo','C17',NULL,NULL),(393,'milimol','C18',NULL,NULL),(394,'mol por kilogramo','C19',NULL,NULL),(395,'carset','C2',NULL,NULL),(396,'millinewton','C20',NULL,NULL),(397,'millinewton por metro','C22',NULL,NULL),(398,'medidor de miliohm','C23',NULL,NULL),(399,'segundo milipascal','C24',NULL,NULL),(400,'miliradian','C25',NULL,NULL),(401,'milisegundo','C26',NULL,NULL),(402,'milisiemens','C27',NULL,NULL),(403,'milisievert','C28',NULL,NULL),(404,'millitesla','C29',NULL,NULL),(405,'microvoltios por metro','C3',NULL,NULL),(406,'milivoltios por metro','C30',NULL,NULL),(407,'milivatios','C31',NULL,NULL),(408,'milivatios por metro cuadrado','C32',NULL,NULL),(409,'milliweber','C33',NULL,NULL),(410,'Topo','C34',NULL,NULL),(411,'mol por decímetro cúbico','C35',NULL,NULL),(412,'mol por metro cúbico','C36',NULL,NULL),(413,'mol por litro','C38',NULL,NULL),(414,'Nanoampere','C39',NULL,NULL),(415,'partido de carga','C4',NULL,NULL),(416,'nanocoulomb','C40',NULL,NULL),(417,'nanofarad','C41',NULL,NULL),(418,'nanofarad por metro','C42',NULL,NULL),(419,'nanohenry','C43',NULL,NULL),(420,'nanohenry por metro','C44',NULL,NULL),(421,'nanometro','C45',NULL,NULL),(422,'medidor de nanoohm','C46',NULL,NULL),(423,'nanosegundo','C47',NULL,NULL),(424,'nanotesla','C48',NULL,NULL),(425,'nanovatio','C49',NULL,NULL),(426,'costo','C5',NULL,NULL),(427,'neper','C50',NULL,NULL),(428,'neper por segundo','C51',NULL,NULL),(429,'picometro','C52',NULL,NULL),(430,'metro de newton segundo','C53',NULL,NULL),(431,'newton metro cuadrado kilogramo cuadrado','C54',NULL,NULL),(432,'newton por metro cuadrado','C55',NULL,NULL),(433,'newton por milímetro cuadrado','C56',NULL,NULL),(434,'newton segundo','C57',NULL,NULL),(435,'newton segundo por metro','C58',NULL,NULL),(436,'octava','C59',NULL,NULL),(437,'célula','C6',NULL,NULL),(438,'ohm centímetro','C60',NULL,NULL),(439,'ohm metro','C61',NULL,NULL),(440,'uno','C62',NULL,NULL),(441,'parsec','C63',NULL,NULL),(442,'pascal por kelvin','C64',NULL,NULL),(443,'segundo pascal','C65',NULL,NULL),(444,'segundo pascal por metro cúbico','C66',NULL,NULL),(445,'segundo pascal por metro','C67',NULL,NULL),(446,'petajoule','C68',NULL,NULL),(447,'telefono','C69',NULL,NULL),(448,'centipoise','C7',NULL,NULL),(449,'picoampere','C70',NULL,NULL),(450,'picocoulomb','C71',NULL,NULL),(451,'picofarad por metro','C72',NULL,NULL),(452,'picohenry','C73',NULL,NULL),(453,'picowatt','C75',NULL,NULL),(454,'picowatt por metro cuadrado','C76',NULL,NULL),(455,'medidor de libras','C77',NULL,NULL),(456,'fuerza de libra','C78',NULL,NULL),(457,'Millicoulomb por kilogramo','C8',NULL,NULL),(458,'rad','C80',NULL,NULL),(459,'radián','C81',NULL,NULL),(460,'medidor de radianes al cuadrado por mol','C82',NULL,NULL),(461,'medidor de radianes al cuadrado por kilogramo','C83',NULL,NULL),(462,'radian por metro','C84',NULL,NULL),(463,'â € ngstr recíproco “m','C85',NULL,NULL),(464,'metro cúbico recíproco','C86',NULL,NULL),(465,'metro cúbico recíproco por segundo','C87',NULL,NULL),(466,'voltios de electrones recíprocos por metro cúbico','C88',NULL,NULL),(467,'Henry Recíproco','C89',NULL,NULL),(468,'grupo de bobina','C9',NULL,NULL),(469,'Joule recíproco por metro cúbico','C90',NULL,NULL),(470,'kelvin recíproco o kelvin al poder menos uno','C91',NULL,NULL),(471,'medidor recíproco','C92',NULL,NULL),(472,'metro cuadrado recíproco','C93',NULL,NULL),(473,'minuto recíproco','C94',NULL,NULL),(474,'mole recíproco','C95',NULL,NULL),(475,'Pascal recíproco o pascal a la potencia menos uno.','C96',NULL,NULL),(476,'segundo recíproco','C97',NULL,NULL),(477,'segundo recíproco por metro cúbico','C98',NULL,NULL),(478,'segundo recíproco por metro cuadrado','C99',NULL,NULL),(479,'Caja','CA',NULL,NULL),(480,'Capacidad de carga en toneladas métricas.','CCT',NULL,NULL),(481,'candela','CDL',NULL,NULL),(482,'grado Celsius','CEL',NULL,NULL),(483,'cien','CEN',NULL,NULL),(484,'tarjeta','CG',NULL,NULL),(485,'centigramo','CGM',NULL,NULL),(486,'envase','CH',NULL,NULL),(487,'cono','CJ',NULL,NULL),(488,'conector','CK',NULL,NULL),(489,'Coulomb por kilogramo','CKG',NULL,NULL),(490,'bobina','CL',NULL,NULL),(491,'cientos de licencia','CLF',NULL,NULL),(492,'centilitro','CLT',NULL,NULL),(493,'centímetro cuadrado','CMK',NULL,NULL),(494,'centímetro cúbico','CMQ',NULL,NULL),(495,'centímetro','CMT',NULL,NULL),(496,'paquete de cien','CNP',NULL,NULL),(497,'Cental (Reino Unido)','CNT',NULL,NULL),(498,'garrafón','CO',NULL,NULL),(499,'culombio','COU',NULL,NULL),(500,'cartucho','CQ',NULL,NULL),(501,'caja','CR',NULL,NULL),(502,'caso','CS',NULL,NULL),(503,'caja de cartón','CT',NULL,NULL),(504,'quilate métrico','CTM',NULL,NULL),(505,'vaso','CU',NULL,NULL),(506,'curie','CUR',NULL,NULL),(507,'cubrir','CV',NULL,NULL),(508,'cien libras (quintales) / cien pesos (US)','CWA',NULL,NULL),(509,'cien pesos (Reino Unido)','CWI',NULL,NULL),(510,'cilindro','CY',NULL,NULL),(511,'combo','CZ',NULL,NULL),(512,'segundo recíproco por esteradiano','D1',NULL,NULL),(513,'siemens por metro','D10',NULL,NULL),(514,'siemens metro cuadrado por mol','D12',NULL,NULL),(515,'sievert','D13',NULL,NULL),(516,'mil yardas lineales','D14',NULL,NULL),(517,'sone','D15',NULL,NULL),(518,'centímetro cuadrado por ergio','D16',NULL,NULL),(519,'centímetro cuadrado por erg esterlina','D17',NULL,NULL),(520,'metro kelvin','D18',NULL,NULL),(521,'kelvin metro cuadrado por vatio','D19',NULL,NULL),(522,'segundo recíproco por metros cuadrados esteradianos','D2',NULL,NULL),(523,'metro cuadrado por julio','D20',NULL,NULL),(524,'metro cuadrado por kilogramo','D21',NULL,NULL),(525,'metro cuadrado por mol','D22',NULL,NULL),(526,'pluma gramo (proteína)','D23',NULL,NULL),(527,'metro cuadrado por esterilizador','D24',NULL,NULL),(528,'metro cuadrado por julios esteradianos','D25',NULL,NULL),(529,'metro cuadrado por voltio segundo','D26',NULL,NULL),(530,'esteradiano','D27',NULL,NULL),(531,'sifón','D28',NULL,NULL),(532,'terahercios','D29',NULL,NULL),(533,'terajulio','D30',NULL,NULL),(534,'teravatio','D31',NULL,NULL),(535,'hora de teravatio','D32',NULL,NULL),(536,'tesla','D33',NULL,NULL),(537,'Texas','D34',NULL,NULL),(538,'caloría termoquímica','D35',NULL,NULL),(539,'caloría termoquímica por gramo kelvin','D37',NULL,NULL),(540,'calorías termoquímicas por segundo centímetro kelvin','D38',NULL,NULL),(541,'calorías termoquímicas por segundo centímetro cuadrado kelvin','D39',NULL,NULL),(542,'mil litros','D40',NULL,NULL),(543,'tonelada por metro cúbico','D41',NULL,NULL),(544,'año tropical','D42',NULL,NULL),(545,'unidad de masa atómica unificada','D43',NULL,NULL),(546,'var','D44',NULL,NULL),(547,'voltios al cuadrado por kelvin al cuadrado','D45',NULL,NULL),(548,'voltio – amperio','D46',NULL,NULL),(549,'voltio por centímetro','D47',NULL,NULL),(550,'voltio por kelvin','D48',NULL,NULL),(551,'milivoltios por kelvin','D49',NULL,NULL),(552,'kilogramo por centímetro cuadrado','D5',NULL,NULL),(553,'voltios por metro','D50',NULL,NULL),(554,'voltios por milímetro','D51',NULL,NULL),(555,'vatios por kelvin','D52',NULL,NULL),(556,'vatios por metro kelvin','D53',NULL,NULL),(557,'vatios por metro cuadrado','D54',NULL,NULL),(558,'vatios por metro cuadrado kelvin','D55',NULL,NULL),(559,'vatios por metro cuadrado de kelvin a la cuarta potencia','D56',NULL,NULL),(560,'vatios por steradian','D57',NULL,NULL),(561,'vatios por metro cuadrado esterlino','D58',NULL,NULL),(562,'weber por metro','D59',NULL,NULL),(563,'röntgen por segundo','D6',NULL,NULL),(564,'weber por milímetro','D60',NULL,NULL),(565,'minuto','D61',NULL,NULL),(566,'segundo','D62',NULL,NULL),(567,'libro','D63',NULL,NULL),(568,'bloquear','D64',NULL,NULL),(569,'redondo','D65',NULL,NULL),(570,'casete','D66',NULL,NULL),(571,'dólar por hora','D67',NULL,NULL),(572,'pulgada a la cuarta potencia','D69',NULL,NULL),(573,'Sandwich','D7',NULL,NULL),(574,'Tabla Internacional (IT) caloría','D70',NULL,NULL),(575,'Tabla Internacional (IT) calorías por segundo centímetro kelvin','D71',NULL,NULL),(576,'Tabla Internacional (IT) calorías por segundo centímetro cuadrado kelvin','D72',NULL,NULL),(577,'joule metro cuadrado','D73',NULL,NULL),(578,'kilogramo por mol','D74',NULL,NULL),(579,'Tabla Internacional (IT) calorías por gramo','D75',NULL,NULL),(580,'Tabla Internacional (IT) calorías por gramo kelvin','D76',NULL,NULL),(581,'megacoulomb','D77',NULL,NULL),(582,'haz','D79',NULL,NULL),(583,'puntaje de drenaje','D8',NULL,NULL),(584,'microwatt','D80',NULL,NULL),(585,'microtesla','D81',NULL,NULL),(586,'microvoltio','D82',NULL,NULL),(587,'medidor de millinewton','D83',NULL,NULL),(588,'microwatt por metro cuadrado','D85',NULL,NULL),(589,'Millicoulomb','D86',NULL,NULL),(590,'milimol por kilogramo','D87',NULL,NULL),(591,'millicoulomb por metro cúbico','D88',NULL,NULL),(592,'millicoulomb por metro cuadrado','D89',NULL,NULL),(593,'dina por centímetro cuadrado','D9',NULL,NULL),(594,'metro cúbico (neto)','D90',NULL,NULL),(595,'movimiento rápido del ojo','D91',NULL,NULL),(596,'banda','D92',NULL,NULL),(597,'segundo por metro cúbico','D93',NULL,NULL),(598,'segundo por metro cúbico radianes','D94',NULL,NULL),(599,'julios por gramo','D95',NULL,NULL),(600,'libra bruta','D96',NULL,NULL),(601,'carga de palet / unidad','D97',NULL,NULL),(602,'libra de masa','D98',NULL,NULL),(603,'manga','D99',NULL,NULL),(604,'despreciar','DAA',NULL,NULL),(605,'diez dias','DAD',NULL,NULL),(606,'día','DAY',NULL,NULL),(607,'libra seca','DB',NULL,NULL),(608,'disco','DC',NULL,NULL),(609,'la licenciatura','DD',NULL,NULL),(610,'acuerdo','DE',NULL,NULL),(611,'década','DEC',NULL,NULL),(612,'decigramo','DG',NULL,NULL),(613,'dispensador','DI',NULL,NULL),(614,'decagramo','DJ',NULL,NULL),(615,'decilitro','DLT',NULL,NULL),(616,'nformaci cuadrado','DMK',NULL,NULL),(617,'decímetro cúbico','DMQ',NULL,NULL),(618,'decímetro','DMT',NULL,NULL),(619,'medidor de decinewton','DN',NULL,NULL),(620,'docena pieza','DPC',NULL,NULL),(621,'docena par','DPR',NULL,NULL),(622,'tonelaje de desplazamiento','DPT',NULL,NULL),(623,'registro de datos','DQ',NULL,NULL),(624,'tambor','DR',NULL,NULL),(625,'dram (US)','DRA',NULL,NULL),(626,'dram (Reino Unido)','DRI',NULL,NULL),(627,'docena rollo','DRL',NULL,NULL),(628,'dracma (Reino Unido)','DRM',NULL,NULL),(629,'monitor','DS',NULL,NULL),(630,'tonelada seca','DT',NULL,NULL),(631,'Decitonne','DTN',NULL,NULL),(632,'dina','DU',NULL,NULL),(633,'pennyweight','DWT',NULL,NULL),(634,'dina por centímetro','DX',NULL,NULL),(635,'libro de directorio','DY',NULL,NULL),(636,'docena','DZN',NULL,NULL),(637,'paquete de doce','DZP',NULL,NULL),(638,'cinturón','E2',NULL,NULL),(639,'remolque','E3',NULL,NULL),(640,'kilogramo bruto','E4',NULL,NULL),(641,'tonelada métrica larga','E5',NULL,NULL),(642,'cada','EA',NULL,NULL),(643,'casilla de correo electrónico','EB',NULL,NULL),(644,'cada uno por mes','CE',NULL,NULL),(645,'paquete de once','EP',NULL,NULL),(646,'galón equivalente','EQ',NULL,NULL),(647,'sobre','EV',NULL,NULL),(648,'mil pies cúbicos por día','F1',NULL,NULL),(649,'Fibra por centímetro cúbico de aire','F9',NULL,NULL),(650,'grado Fahrenheit','FAH',NULL,NULL),(651,'faradio','FAR',NULL,NULL),(652,'campo','FB',NULL,NULL),(653,'mil pies cúbicos','FC',NULL,NULL),(654,'millón de partículas por pie cúbico','FD',NULL,NULL),(655,'pie de pista','FE',NULL,NULL),(656,'cien metros cúbicos','FF',NULL,NULL),(657,'parche transdérmico','FG',NULL,NULL),(658,'micromol','FH',NULL,NULL),(659,'tonelada en escamas','FL',NULL,NULL),(660,'millones de pies cúbicos','FM',NULL,NULL),(661,'pie','FOT',NULL,NULL),(662,'libra por pie cuadrado','FP',NULL,NULL),(663,'pie por minuto','FR',NULL,NULL),(664,'pie por segundo','FS',NULL,NULL),(665,'pie cuadrado','FTK',NULL,NULL),(666,'pie cubico','FTQ',NULL,NULL),(667,'US galones por minuto','G2',NULL,NULL),(668,'Galon imperial por minuto','G3',NULL,NULL),(669,'hoja de microficha','G7',NULL,NULL),(670,'galón (US) por día','GB',NULL,NULL),(671,'gigabecquerel','GBQ',NULL,NULL),(672,'gramo por 100 gramo','GC',NULL,NULL),(673,'barril bruto','GD',NULL,NULL),(674,'libra por galón (US)','GE',NULL,NULL),(675,'gramo por metro (gramo por 100 centímetros)','GF',NULL,NULL),(676,'gramo de isótopo fisionable','GFI',NULL,NULL),(677,'gramo','GGR',NULL,NULL),(678,'medio galón (EE. UU.)','GH',NULL,NULL),(679,'branquias','GIA',NULL,NULL),(680,'Gill (Reino Unido)','GII',NULL,NULL),(681,'gramo por mililitro','GJ',NULL,NULL),(682,'gramo por kilogramo','G K',NULL,NULL),(683,'gramo por litro','GL',NULL,NULL),(684,'galón seco (EE. UU.)','GLD',NULL,NULL),(685,'galón (Reino Unido)','GLI',NULL,NULL),(686,'galón','GLL',NULL,NULL),(687,'gramo por metro cuadrado','GM',NULL,NULL),(688,'galón bruto','GN',NULL,NULL),(689,'miligramos por metro cuadrado','GO',NULL,NULL),(690,'miligramo por metro cúbico','GP',NULL,NULL),(691,'microgramos por metro cúbico','GQ',NULL,NULL),(692,'gramo','GRM',NULL,NULL),(693,'grano','GRN',NULL,NULL),(694,'bruto','GRO',NULL,NULL),(695,'tonelada de registro bruto','GRT',NULL,NULL),(696,'tonelada bruta','GT',NULL,NULL),(697,'gigajoule','GV',NULL,NULL),(698,'galón por mil pies cúbicos','GW',NULL,NULL),(699,'hora de gigavatios','GWH',NULL,NULL),(700,'patio bruto','GY',NULL,NULL),(701,'sistema de medición','GZ',NULL,NULL),(702,'media página – electrónica','H1',NULL,NULL),(703,'medio litro','H2',NULL,NULL),(704,'madeja','HA',NULL,NULL),(705,'hectárea','HAR',NULL,NULL),(706,'hectobar','HBA',NULL,NULL),(707,'cien cajas','HBX',NULL,NULL),(708,'cien cuentas','HC',NULL,NULL),(709,'media docena','HD',NULL,NULL),(710,'centésima de quilate','ÉL',NULL,NULL),(711,'cien pies','HF',NULL,NULL),(712,'hectogramo','HGM',NULL,NULL),(713,'cien pies cúbicos','HH',NULL,NULL),(714,'cien hojas','HI',NULL,NULL),(715,'cien unidades internacionales','HIU',NULL,NULL),(716,'caballo métrico','HJ',NULL,NULL),(717,'cien kilogramos','HK',NULL,NULL),(718,'cien pies (lineales)','HL',NULL,NULL),(719,'hectolitro','HLT',NULL,NULL),(720,'milla por hora','HM',NULL,NULL),(721,'millones de metros cúbicos','HMQ',NULL,NULL),(722,'hectómetro','HMT',NULL,NULL),(723,'milímetro convencional de mercurio','HN',NULL,NULL),(724,'cien onzas troy','HO',NULL,NULL),(725,'milímetro convencional de agua','HP',NULL,NULL),(726,'hectolitro de alcohol puro','HPA',NULL,NULL),(727,'cien pies cuadrados','HS',NULL,NULL),(728,'media hora','HT',NULL,NULL),(729,'hertz','HTZ',NULL,NULL),(730,'hora','HUR',NULL,NULL),(731,'cien yardas','HY',NULL,NULL),(732,'pulgada libra','IA',NULL,NULL),(733,'contar por pulgada','IC',NULL,NULL),(734,'persona','IE',NULL,NULL),(735,'pulgadas de agua','IF',NULL,NULL),(736,'columna pulgada','II',NULL,NULL),(737,'pulgada por minuto','IL',NULL,NULL),(738,'impresión','IM',NULL,NULL),(739,'pulgada','INH',NULL,NULL),(740,'pulgada cuadrada','INK',NULL,NULL),(741,'pulgada en cubos','INQ',NULL,NULL),(742,'póliza de seguros','IP',NULL,NULL),(743,'conteo por centímetro','IT',NULL,NULL),(744,'pulgada por segundo (velocidad lineal)','IU',NULL,NULL),(745,'pulgada por segundo al cuadrado (aceleración)','IV',NULL,NULL),(746,'julios por kilogramo','J2',NULL,NULL),(747,'jumbo','JB',NULL,NULL),(748,'joule por kelvin','JE',NULL,NULL),(749,'jarra','JG',NULL,NULL),(750,'megajulio por kilogramo','JK',NULL,NULL),(751,'megajulio por metro cúbico','JM',NULL,NULL),(752,'articulación','JO',NULL,NULL),(753,'joule','JOU',NULL,NULL),(754,'tarro','JR',NULL,NULL),(755,'demanda de kilovatios','K1',NULL,NULL),(756,'kilovoltios amperios reactivos de demanda','K2',NULL,NULL),(757,'kilovoltio amperio hora reactiva','K3',NULL,NULL),(758,'amperios kilovoltios (reactivos)','K5',NULL,NULL),(759,'kilolitro','K6',NULL,NULL),(760,'pastel','KA',NULL,NULL),(761,'kilocharacter','KB',NULL,NULL),(762,'kilobar','KBA',NULL,NULL),(763,'kilogramo decimal','KD',NULL,NULL),(764,'kelvin','KEL',NULL,NULL),(765,'kilopacket','KF',NULL,NULL),(766,'barrilete','KG',NULL,NULL),(767,'kilogramo','KGM',NULL,NULL),(768,'kilogramo por segundo','KGS',NULL,NULL),(769,'kilohercio','KHZ',NULL,NULL),(770,'Kilogramo por milímetro de ancho','KI',NULL,NULL),(771,'kilosegmento','KJ',NULL,NULL),(772,'kilojoule','KJO',NULL,NULL),(773,'kilogramo por metro','KL',NULL,NULL),(774,'kilómetro por hora','KMH',NULL,NULL),(775,'kilometro cuadrado','KMK',NULL,NULL),(776,'kilogramo por metro cúbico','KMQ',NULL,NULL),(777,'kilogramo de nitrógeno','KNI',NULL,NULL),(778,'kilogramo de sustancia nombrada','KNS',NULL,NULL),(779,'nudo','KNT',NULL,NULL),(780,'Milliequivalencia de potasa cáustica por gramo de producto.','KO',NULL,NULL),(781,'kilopascal','KPA',NULL,NULL),(782,'kilogramo de hidróxido de potasio (potasa cáustica)','KPH',NULL,NULL),(783,'kilogramo de óxido de potasio','KPO',NULL,NULL),(784,'kilogramo de pentóxido de fósforo (anhídrido fosfórico)','KPP',NULL,NULL),(785,'KilorÃ¶ntgen','KR',NULL,NULL),(786,'mil libras por pulgada cuadrada','KS',NULL,NULL),(787,'kilogramo de sustancia 90% seca','KSD',NULL,NULL),(788,'kilogramo de hidróxido de sodio (soda cáustica)','KSH',NULL,NULL),(789,'equipo','KT',NULL,NULL),(790,'kilómetro','KTM',NULL,NULL),(791,'kilotonne','KTN',NULL,NULL),(792,'kilogramo de uranio','KUR',NULL,NULL),(793,'kilovoltio – ampere','KVA',NULL,NULL),(794,'kilovar','KVR',NULL,NULL),(795,'kilovoltio','KVT',NULL,NULL),(796,'kilogramos por milímetro','KW',NULL,NULL),(797,'kilovatios hora','KWH',NULL,NULL),(798,'kilovatio','KWT',NULL,NULL),(799,'mililitro por kilogramo','KX',NULL,NULL),(800,'litro por minuto','L2',NULL,NULL),(801,'libra por pulgada cúbica','LA',NULL,NULL),(802,'libra','LBR',NULL,NULL),(803,'libra troy','LBT',NULL,NULL),(804,'centímetro lineal','LC',NULL,NULL),(805,'litro por día','LD',NULL,NULL),(806,'lite','LE',NULL,NULL),(807,'hoja','LEF',NULL,NULL),(808,'pie lineal','LF',NULL,NULL),(809,'hora de trabajo','LH',NULL,NULL),(810,'pulgada lineal','LI',NULL,NULL),(811,'spray grande','LJ',NULL,NULL),(812,'enlazar','LK',NULL,NULL),(813,'metro lineal','LM',NULL,NULL),(814,'longitud','LN',NULL,NULL),(815,'mucho','LO',NULL,NULL),(816,'libra liquida','LP',NULL,NULL),(817,'litro de alcohol puro','LPA',NULL,NULL),(818,'capa','LR',NULL,NULL),(819,'Suma global','LS',NULL,NULL),(820,'ton (Reino Unido) o longton (EE. UU.)','LTN',NULL,NULL),(821,'litro','LTR',NULL,NULL),(822,'lumen','LUM',NULL,NULL),(823,'lux','LUX',NULL,NULL),(824,'yarda lineal por libra','LX',NULL,NULL),(825,'yarda lineal','LY',NULL,NULL),(826,'cinta magnética','M0',NULL,NULL),(827,'miligramos por litro','M1',NULL,NULL),(828,'valor monetario','M4',NULL,NULL),(829,'microcurie','M5',NULL,NULL),(830,'micropulgada','M7',NULL,NULL),(831,'millones de Btu por 1000 pies cúbicos','M9',NULL,NULL),(832,'máquina por unidad','MA',NULL,NULL),(833,'mega litro','MAL',NULL,NULL),(834,'megametro','MAM',NULL,NULL),(835,'megavatio','MAW',NULL,NULL),(836,'mil equivalentes de ladrillo estándar','MBE',NULL,NULL),(837,'mil pies de tabla','MBF',NULL,NULL),(838,'milibar','MBR',NULL,NULL),(839,'microgramo','MC',NULL,NULL),(840,'milicurie','MCU',NULL,NULL),(841,'aire seco tonelada métrica','MD',NULL,NULL),(842,'miligramo por pie cuadrado por lado','MF',NULL,NULL),(843,'miligramo','MGM',NULL,NULL),(844,'megahercio','MGM',NULL,NULL),(845,'milla cuadrada','MIK',NULL,NULL),(846,'mil','MIL',NULL,NULL),(847,'minuto','MIN',NULL,NULL),(848,'millón','MIO',NULL,NULL),(849,'millones de unidades internacionales','MIU',NULL,NULL),(850,'miligramo por pulgada cuadrada','MK',NULL,NULL),(851,'mil millones','MLD',NULL,NULL),(852,'mililitro','MLT',NULL,NULL),(853,'milímetro cuadrado','MMK',NULL,NULL),(854,'milímetro cúbico','MMQ',NULL,NULL),(855,'milímetro','MMT',NULL,NULL),(856,'mes','LUN',NULL,NULL),(857,'megapascal','MPA',NULL,NULL),(858,'mil metros','MQ',NULL,NULL),(859,'metro cúbico por hora','MQH',NULL,NULL),(860,'metro cúbico por segundo','MQS',NULL,NULL),(861,'metro por segundo al cuadrado','MSK',NULL,NULL),(862,'estera','MT',NULL,NULL),(863,'metro cuadrado','MTK',NULL,NULL),(864,'Metro cúbico','MTQ',NULL,NULL),(865,'metro','MTR',NULL,NULL),(866,'metro por segundo','MTS',NULL,NULL),(867,'numero de mults','MV',NULL,NULL),(868,'megavolt – ampere','MVA',NULL,NULL),(869,'megavatios hora (1000 kW.h)','MWH',NULL,NULL),(870,'calorías de la pluma','N1',NULL,NULL),(871,'número de líneas','N2',NULL,NULL),(872,'punto de impresión','N3',NULL,NULL),(873,'miligramo por kilogramo','NA',NULL,NULL),(874,'número de artículos','NAR',NULL,NULL),(875,'barcaza','NB',NULL,NULL),(876,'número de bobinas','NBB',NULL,NULL),(877,'coche','NC',NULL,NULL),(878,'número de celdas','NCL',NULL,NULL),(879,'barril neto','ND',NULL,NULL),(880,'litro neto','NE',NULL,NULL),(881,'newton','NEW',NULL,NULL),(882,'mensaje','NF',NULL,NULL),(883,'galón neto (nosotros)','NG',NULL,NULL),(884,'hora del mensaje','NH',NULL,NULL),(885,'galón imperial neto','NI',NULL,NULL),(886,'número de unidades internacionales','NIU',NULL,NULL),(887,'número de pantallas','NJ',NULL,NULL),(888,'carga','NL',NULL,NULL),(889,'milla nautica','MNI',NULL,NULL),(890,'número de paquetes','NMP',NULL,NULL),(891,'entrenar','NN',NULL,NULL),(892,'número de parcelas','NPL',NULL,NULL),(893,'numero de pares','NPR',NULL,NULL),(894,'numero de partes','TNP',NULL,NULL),(895,'mho','NQ',NULL,NULL),(896,'micromho','NR',NULL,NULL),(897,'número de rollos','NRL',NULL,NULL),(898,'tonelada neta','NT',NULL,NULL),(899,'registro neto de toneladas','NTT',NULL,NULL),(900,'medidor de newton','NU',NULL,NULL),(901,'vehículo','NV',NULL,NULL),(902,'parte por mil','NX',NULL,NULL),(903,'libra por aire seco tonelada métrica','NY',NULL,NULL),(904,'panel','OA',NULL,NULL),(905,'ohm','OHM',NULL,NULL),(906,'onza por yarda cuadrada','EN',NULL,NULL),(907,'onza','ONZ',NULL,NULL),(908,'Dos paquetes','OP',NULL,NULL),(909,'hora extra','OT',NULL,NULL),(910,'onza av','ONZ',NULL,NULL),(911,'onza líquida (US)','OZA',NULL,NULL),(912,'onza líquida (Reino Unido)','OZI',NULL,NULL),(913,'pagina – electronica','P0',NULL,NULL),(914,'por ciento','P1',NULL,NULL),(915,'libra por pie','P2',NULL,NULL),(916,'paquete de tres','P3',NULL,NULL),(917,'paquete de cuatro','P4',NULL,NULL),(918,'paquete de cinco','P5',NULL,NULL),(919,'paquete de seis','P6',NULL,NULL),(920,'paquete de siete','P7',NULL,NULL),(921,'paquete de ocho','P8',NULL,NULL),(922,'paquete de nueve','P9',NULL,NULL),(923,'paquete','PA',NULL,NULL),(924,'pascal','PAL',NULL,NULL),(925,'par de pulgadas','PB',NULL,NULL),(926,'almohadilla','PD',NULL,NULL),(927,'equivalente en libras','PE',NULL,NULL),(928,'palet (ascensor)','PF',NULL,NULL),(929,'plato','PG',NULL,NULL),(930,'galón de prueba','PGL',NULL,NULL),(931,'tono','Pi',NULL,NULL),(932,'paquete','PK',NULL,NULL),(933,'cubo','PL',NULL,NULL),(934,'porcentaje de libra','PM',NULL,NULL),(935,'libra neta','PN',NULL,NULL),(936,'libra por pulgada de longitud','PO',NULL,NULL),(937,'página por pulgada','PQ',NULL,NULL),(938,'par','PR',NULL,NULL),(939,'fuerza de libra por pulgada cuadrada','PD',NULL,NULL),(940,'pinta','PT',NULL,NULL),(941,'pinta seca','PTD',NULL,NULL),(942,'pinta (Reino Unido)','PTI',NULL,NULL),(943,'pinta liquida (US)','PTL',NULL,NULL),(944,'bandeja / paquete de bandeja','PU',NULL,NULL),(945,'media pinta (US)','PV',NULL,NULL),(946,'libra por pulgada de ancho','PW',NULL,NULL),(947,'Peck Dry (US)','PY',NULL,NULL),(948,'Peck Dry (Reino Unido)','PZ',NULL,NULL),(949,'comida','Q3',NULL,NULL),(950,'página – facsímil','QA',NULL,NULL),(951,'cuarto (de un año)','QAN',NULL,NULL),(952,'página – copia impresa','QB',NULL,NULL),(953,'cuarto de docena','QD',NULL,NULL),(954,'un cuarto de hora','QH',NULL,NULL),(955,'cuarto de kilogramo','QK',NULL,NULL),(956,'mano de papel','QR',NULL,NULL),(957,'cuarto de galón (US)','QT',NULL,NULL),(958,'cuarto seco (EE. UU.)','QTD',NULL,NULL),(959,'cuarto de galón (Reino Unido)','QTI',NULL,NULL),(960,'cuarto líquido (US)','QTL',NULL,NULL),(961,'cuarto (UK)','QTR',NULL,NULL),(962,'pica','R1',NULL,NULL),(963,'caloría','R4',NULL,NULL),(964,'mil metros cúbicos','R9',NULL,NULL),(965,'estante','RA',NULL,NULL),(966,'barra','RD',NULL,NULL),(967,'anillo','RG',NULL,NULL),(968,'hora de funcionamiento o de funcionamiento','RH',NULL,NULL),(969,'medida métrica rollo','RK',NULL,NULL),(970,'carrete','RL',NULL,NULL),(971,'resma','RM',NULL,NULL),(972,'medida métrica de resma','RN',NULL,NULL),(973,'rodar','RO',NULL,NULL),(974,'libra por resma','RP',NULL,NULL),(975,'revoluciones por minuto','RPM',NULL,NULL),(976,'revoluciones por segundo','RPS',NULL,NULL),(977,'Reiniciar','RS',NULL,NULL),(978,'ingreso tonelada milla','RT',NULL,NULL),(979,'correr','RU',NULL,NULL),(980,'pie cuadrado por segundo','S3',NULL,NULL),(981,'metro cuadrado por segundo','S4',NULL,NULL),(982,'sesenta cuartos de pulgada','S5',NULL,NULL),(983,'sesión','S6',NULL,NULL),(984,'unidad de almacenamiento','S7',NULL,NULL),(985,'unidad de publicidad estándar','S8',NULL,NULL),(986,'saco','SA',NULL,NULL),(987,'medio año (6 meses)','SAN',NULL,NULL),(988,'Puntuación','OCS',NULL,NULL),(989,'escrúpulo','SCR',NULL,NULL),(990,'libra solida','SD',NULL,NULL),(991,'sección','SE',NULL,NULL),(992,'segundo','SEC',NULL,NULL),(993,'conjunto','SET',NULL,NULL),(994,'segmento','SG',NULL,NULL),(995,'tonelada de envío','SHT',NULL,NULL),(996,'siemens','SIE',NULL,NULL),(997,'camión cisterna dividido','SK',NULL,NULL),(998,'hoja de deslizamiento','SL',NULL,NULL),(999,'milla (milla estatutaria)','SMI',NULL,NULL),(1000,'varilla cuadrada','SN',NULL,NULL),(1001,'carrete','SO',NULL,NULL),(1002,'paquete de estante','SP',NULL,NULL),(1003,'cuadrado','SQ',NULL,NULL),(1004,'tira','SR',NULL,NULL),(1005,'hoja métrica medida','SS',NULL,NULL),(1006,'corto estándar (7200 partidos)','SST',NULL,NULL),(1007,'hoja','ST',NULL,NULL),(1008,'piedra (Reino Unido)','ITS',NULL,NULL),(1009,'tonelada (US) o tonelada corta (UK / US)','STN',NULL,NULL),(1010,'patinar','SV',NULL,NULL),(1011,'madeja','SO',NULL,NULL),(1012,'envío','SX',NULL,NULL),(1013,'Línea de telecomunicaciones en servicio.','T0',NULL,NULL),(1014,'mil libras brutas','T1',NULL,NULL),(1015,'mil piezas','T3',NULL,NULL),(1016,'bolsa de mil','T4',NULL,NULL),(1017,'caja de mil','T5',NULL,NULL),(1018,'mil galones (US)','T6',NULL,NULL),(1019,'mil impresiones','T7',NULL,NULL),(1020,'mil pulgadas lineales','T8',NULL,NULL),(1021,'décimo pie cúbico','TA',NULL,NULL),(1022,'Kiloampere hora (mil amperios hora)','TAH',NULL,NULL),(1023,'camion','TC',NULL,NULL),(1024,'termia','TD',NULL,NULL),(1025,'totalizador','TE',NULL,NULL),(1026,'diez metros cuadrados','TF',NULL,NULL),(1027,'mil pulgadas cuadradas','TI',NULL,NULL),(1028,'mil centímetros cuadrados','TJ',NULL,NULL),(1029,'tanque, rectangular','TK',NULL,NULL),(1030,'mil pies (lineales)','TL',NULL,NULL),(1031,'estaño','TN',NULL,NULL),(1032,'tonelada (tonelada métrica)','TNE',NULL,NULL),(1033,'paquete de diez','TP',NULL,NULL),(1034,'diez pares','TPR',NULL,NULL),(1035,'mil pies','TQ',NULL,NULL),(1036,'mil metros cúbicos por día','TQD',NULL,NULL),(1037,'diez pies cuadrados','TR',NULL,NULL),(1038,'trillón (EUR)','TRL',NULL,NULL),(1039,'mil pies cuadrados','TS',NULL,NULL),(1040,'tonelada de sustancia 90% seca','TSD',NULL,NULL),(1041,'tonelada de vapor por hora','TSH',NULL,NULL),(1042,'mil metros lineales','TT',NULL,NULL),(1043,'tubo','TU',NULL,NULL),(1044,'mil kilogramos','TV',NULL,NULL),(1045,'mil hojas','TW',NULL,NULL),(1046,'tanque, cilíndrico','TY',NULL,NULL),(1047,'tratamiento','U1',NULL,NULL),(1048,'tableta','U2',NULL,NULL),(1049,'torr','UA',NULL,NULL),(1050,'Línea de telecomunicaciones en servicio promedio.','UB',NULL,NULL),(1051,'puerto de telecomunicaciones','UC',NULL,NULL),(1052,'décimo minuto','UD',NULL,NULL),(1053,'décima hora','UE',NULL,NULL),(1054,'uso por línea de telecomunicación promedio','UF',NULL,NULL),(1055,'diez mil yardas','UH',NULL,NULL),(1056,'millones de unidades','UM',NULL,NULL),(1057,'voltio amperio por kilogramo','VA',NULL,NULL),(1058,'frasco','VI',NULL,NULL),(1059,'voltio','VLT',NULL,NULL),(1060,'abultar','VQ',NULL,NULL),(1061,'visitar','VS',NULL,NULL),(1062,'kilo mojado','W2',NULL,NULL),(1063,'dos semanas','W4',NULL,NULL),(1064,'vatio por kilogramo','WA',NULL,NULL),(1065,'libra mojada','WB',NULL,NULL),(1066,'cable','WCD',NULL,NULL),(1067,'tonelada mojada','WE',NULL,NULL),(1068,'weber','WEB',NULL,NULL),(1069,'semana','WEE',NULL,NULL),(1070,'galon de vino','WG',NULL,NULL),(1071,'rueda','WH',NULL,NULL),(1072,'vatios hora','WHR',NULL,NULL),(1073,'peso por pulgada cuadrada','WI',NULL,NULL),(1074,'mes de trabajo','WM',NULL,NULL),(1075,'envolver','WR',NULL,NULL),(1076,'estándar','WSD',NULL,NULL),(1077,'vatio','WTT',NULL,NULL),(1078,'mililitro de agua','WW',NULL,NULL),(1079,'cadena','X1',NULL,NULL),(1080,'yarda cuadrada','YDK',NULL,NULL),(1081,'Yarda cúbica','YDQ',NULL,NULL),(1082,'cien yardas lineales','YL',NULL,NULL),(1083,'yarda','YRD',NULL,NULL),(1084,'diez yardas','YT',NULL,NULL),(1085,'van de elevación','Z1',NULL,NULL),(1086,'pecho','Z2',NULL,NULL),(1087,'barril','Z3',NULL,NULL),(1088,'pipa','Z4',NULL,NULL),(1089,'arrastrar','Z5',NULL,NULL),(1090,'punto de conferencia','Z6',NULL,NULL),(1091,'línea de noticias de ágata','Z8',NULL,NULL),(1092,'página','ZP',NULL,NULL),(1093,'mutuamente definido','ZZ',NULL,NULL);
/*!40000 ALTER TABLE `unit_measures` ENABLE KEYS */;
UNLOCK TABLES;

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
-- Dumping routines for database 'conta_template'
--
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'NO_AUTO_VALUE_ON_ZERO' */ ;
/*!50003 DROP PROCEDURE IF EXISTS `InsertarDetalleVenta` */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_general_ci */ ;
DELIMITER ;;
CREATE DEFINER=`root`@`localhost` PROCEDURE `InsertarDetalleVenta`(IN `FacturaN` INT, IN `Items` VARCHAR(50), IN `Cantidad` DECIMAL(10,2), IN `PrecioC` DECIMAL(10,2), IN `PrecioV` DECIMAL(10,2), IN `Iva` DECIMAL(10,2), IN `Impuesto` DECIMAL(10,2), IN `Subtotal` DECIMAL(10,2), IN `Descuento` DECIMAL(10,2), IN `Entregado` CHAR(1), IN `FacturarNegativo` BOOLEAN, IN `ActivarEntregados` BOOLEAN)
BEGIN
    DECLARE StockActual DECIMAL(10,2);

    START TRANSACTION;

    
    IF FacturarNegativo = FALSE THEN
        SELECT Existencia INTO StockActual FROM tblarticulos WHERE Items = Items;
        IF StockActual < Cantidad THEN
            SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Stock insuficiente para este producto';
        END IF;
    END IF;

    
    INSERT INTO tbldetalle_venta (Factura_N, Items, Cantidad, PrecioC, PrecioV, Iva, Impuesto, Subtotal, Descuento, Entregado)
    VALUES (FacturaN, Items, Cantidad, PrecioC, PrecioV, Iva, Impuesto, Subtotal, Descuento, Entregado);

    
    IF ActivarEntregados = 0 OR Entregado = 'S' THEN
        UPDATE tblarticulos SET Existencia = Existencia - Cantidad WHERE Items = Items;
    END IF;

    COMMIT;
END ;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'NO_AUTO_VALUE_ON_ZERO' */ ;
/*!50003 DROP PROCEDURE IF EXISTS `InsertarVenta` */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_general_ci */ ;
DELIMITER ;;
CREATE DEFINER=`root`@`localhost` PROCEDURE `InsertarVenta`(OUT `Nun_Factura` INT, IN `Fecha` VARCHAR(10), IN `N_Mes` VARCHAR(2), IN `Anio` VARCHAR(4), IN `Tipo` VARCHAR(20), IN `Dias` VARCHAR(4), IN `CodigoCli` VARCHAR(20), IN `A_nombre` VARCHAR(100), IN `Identificacion` VARCHAR(20), IN `Direccion` VARCHAR(100), IN `Telefono` VARCHAR(20), IN `Impuesto` VARCHAR(20), IN `Descuento` VARCHAR(20), IN `Total` VARCHAR(20), IN `Id_Usuario` INT, IN `CodigoEmp` INT, IN `EstadoPedido` VARCHAR(20), IN `Comentario` VARCHAR(100), IN `EstadoFact` VARCHAR(20), IN `Hora` VARCHAR(20), IN `Pago` VARCHAR(20), IN `Cambio` VARCHAR(20), IN `Abono` VARCHAR(20), IN `Saldo` VARCHAR(20), IN `id_mediopago` INT, IN `efectivo` VARCHAR(20), IN `valorpagado1` VARCHAR(20))
BEGIN
    DECLARE Nun_Factura INT;

    INSERT INTO tblventas (
        Fecha, N_Mes, Anio, Tipo, Dias, CodigoCli, A_nombre, Identificacion, Direccion, Telefono,
        Impuesto, Descuento, Total, Id_Usuario, CodigoEmp, EstadoPedido, Comentario, EstadoFact,
        Hora, Pago, Cambio, Abono, Saldo, id_mediopago, efectivo, valorpagado1
    )
    VALUES (
        Fecha, N_Mes, Anio, Tipo, Dias, CodigoCli, A_nombre, Identificacion, Direccion, Telefono,
        Impuesto, Descuento, Total, Id_Usuario, CodigoEmp, EstadoPedido, Comentario, EstadoFact,
        Hora, Pago, Cambio, Abono, Saldo, id_mediopago, efectivo, valorpagado1
    );

    
    SET Nun_Factura = LAST_INSERT_ID();

    
    SELECT Nun_Factura AS FacturaN;
END ;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'NO_AUTO_VALUE_ON_ZERO' */ ;
/*!50003 DROP PROCEDURE IF EXISTS `prc_guardarCuentasCli` */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_general_ci */ ;
DELIMITER ;;
CREATE DEFINER=`root`@`localhost` PROCEDURE `prc_guardarCuentasCli`(`CodigoCuenta` VARCHAR(20), `Nombre` VARCHAR(50))
BEGIN
		declare codigo int default null;
                
        set codigo = (select N_Cuenta from tblCuentas where N_Cuenta = CodigoCuenta);
        
        if codigo is null then
           Insert Into tblcuentas (N_Cuenta, Cuenta, Saldo, FechaMod) Values (CodigoCuenta, Nombre, 0, now());
        else 
			Update tblcuentas set Cuenta = Nombre, FechaMod = now() Where N_Cuenta = CodigoCuenta;           
        end if;
END ;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'NO_AUTO_VALUE_ON_ZERO' */ ;
/*!50003 DROP PROCEDURE IF EXISTS `proc_GuardarCliente` */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_general_ci */ ;
DELIMITER ;;
CREATE DEFINER=`root`@`localhost` PROCEDURE `proc_GuardarCliente`(`CodigoCli` INT, `RazonSocial` VARCHAR(50), `Nit` VARCHAR(15), `Telefonos` VARCHAR(25), `Direccion` VARCHAR(50), `Nombre_C` VARCHAR(25), `Apellidos_C` VARCHAR(25), `Telefono_C` VARCHAR(30), `Direccion_C` VARCHAR(50), `Cargo_C` VARCHAR(25), `Whatsapp` VARCHAR(15), `Cupo` DOUBLE, `PrecioCosto` INT, `CodigoEmp` INT, `FechaCumple` DATE, `Email` VARCHAR(50), `Termino` INT, `FacturarVenc` INT)
BEGIN
	
    declare codigo int default null;
    DECLARE `_rollback` BOOL DEFAULT 0;
    DECLARE CONTINUE HANDLER FOR SQLEXCEPTION SET `_rollback` = 1;
    
    DECLARE EXIT HANDLER FOR 1062
    BEGIN
		select 0 as id, 'El Nit del cliente ya existe verifique';
    END;
    START TRANSACTION;
   
    
    if CodigoCli is not null then           
       set codigo = (select codigoCli from tblClientes where CodigoClien = CodigoCli);
       if codigo is null then    
			select 0 as id, 'El cliente solicita no se encontro en la base de datos';
       else
		   Update tblClientes 
			set Razon_Social = RazonSocial, Nit = Nit, Telefonos = Telefonos, Direccion = Direccion,
				Email = Email, Nombre_C = Nombre_C, Apellidos_C = Apellidos_C, Telefonos_C = Telefono_C,
				Direccion_C = Direccion_C, Cargo_C = Cargo_C, Whatsapp = Whatsapp, CupoAutorizado = Cupo, Preciocosto = PrecioCosto, 
				CodigoEmp = CodigoEmp, FechaCumple = FechaCumple, Termino = Termino, FacVenc = FacturarVenc, FechaMod = now() 
				where CodigoClien = CodigoCli;    
                
              IF `_rollback` THEN
					ROLLBACK;
                    select 0 as id, "ERROR al guardar el Cliente";
			  ELSE
				    COMMIT;
                   
                    
                    Update tblcuentas set Cuenta = RazonSocial, FechaMod = now() Where N_Cuenta = CodigoCli;
                    call prc_guardarCuentasCli(CodigoCli, RazonSocial);
                    
                     select 1 as id, "Cliente Guardado con Exito";
			  END IF;
              
              
       end if;     
    else
     
  	 set codigo = (Select max(CodigoClien) + 1 from tblClientes); 
     if codigo is null then
        set codigo = '130501';
     end if;
         
         insert into tblClientes (CodigoClien, Razon_Social, Nit, Telefonos, Direccion, Email, Whatsapp, Nombre_C, 
						Apellidos_C, Telefonos_C, Direccion_C, Cargo_C, CupoAutorizado, Preciocosto, CodigoEmp, 
                        FechaCumple, Termino, FacVenc, Fecha_Ingreso)	values (codigo, RazonSocial, Nit, Telefonos, Direccion, Email, Whatsapp,  Nombre_C, Apellidos_C, Telefono_C, Direccion_C, Cargo_C, Cupo, PrecioCosto, CodigoEmp, FechaCumple, Termino, FacturarVenc, now());
                        
              IF `_rollback` THEN
					ROLLBACK;
                    select 0 as id, 'ERROR al Guardar el cliente, verifique';
			  ELSE
				COMMIT;
               
                call prc_guardarCuentasCli(CodigoCli, RazonSocial);
                 
				select 1 as id, 'El cliente se guardo con exito', codigo, now();
			  END IF;
              
         
    end if;
    

END ;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'NO_AUTO_VALUE_ON_ZERO' */ ;
/*!50003 DROP PROCEDURE IF EXISTS `proc_GuardarPagoCliente` */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_general_ci */ ;
DELIMITER ;;
CREATE DEFINER=`root`@`localhost` PROCEDURE `proc_GuardarPagoCliente`(`NumRecibo` INT, `CodigoCliente` INT, `FactAnt` VARCHAR(15), `FacturaN` INT, `Cuenta` VARCHAR(15), `ValorPago` DOUBLE, `Descuento` DOUBLE)
BEGIN
    declare UltimoNumRecibo int;
    declare SaldoCliente double default 0;
    declare SaldoActual double default 0;
    declare PagosCliente double default 0;
    declare TotalFactura double default 0;
    declare TotalPagado double default 0;
    DECLARE `_rollback` BOOL DEFAULT 0;
    declare MESSAGE varchar(100);
    declare codigoerrir int;

	DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
 
			 GET DIAGNOSTICS CONDITION 1
			@p1 = RETURNED_SQLSTATE, @p2 = MESSAGE_TEXT;
			SELECT @p1 as RETURNED_SQLSTATE  , @p2 as MESSAGE_TEXT;
			ROLLBACK;
			END;


    select max(RecCajaN) + 1 into UltimoNumRecibo from tblPagos;
    
    
    START TRANSACTION;
    
    if FactAnt is null then
		   if NumRecibo is not null then     
			  set UltimoNumRecibo = NumRecibo;
		   end if;     

            select Total into TotalFactura from tblVentas where Factura_N = FacturaN;
       
            select sum(ValorPago) into PagosCliente from tblPagos where Fact_N = FacturaN and Estado = 'V';  
            
            if PagosCliente is null then
               set PagosCliente = 0;
            end if;
            
            set SaldoActual = TotalFactura - PagosCliente;
            set TotalPagado = ValorPago + Descuento;
            
            if SaldoActual >= TotalPagado then  
				set SaldoCliente = SaldoActual - (ValorPago + Descuento);            
            
				Insert Into tblPagos (Codigo, NFactAnt, Fact_N, DetallePago, Afectada, RecCajaN, ValorPago, Fecha, Saldoact, Descuento, Estado, FechaMod )
				values (CodigoCliente, null, FacturaN, 'Pago', Cuenta, UltimoNumRecibo,  ValorPago, now(), SaldoCliente,Descuento, 'V', now());
                
                 update tblventas set Saldo = SaldoCliente where Factura_N = FacturaN; 
				
				call proc_registro_saldo_cliente(CodigoCliente, 'ingr', FacturaN, UltimoNumRecibo, ValorPago);
                if Descuento > 0 then
                   call proc_registro_saldo_cliente(CodigoCliente, 'ntdv', FacturaN, UltimoNumRecibo, ValorPago);  
                end if;
                
               
				COMMIT;
				
			else
                select 0, 'Error el Pago no puede superar el saldo de la factura', SaldoActual, TotalPagado;
            end if;     
            
    end if;    
    
END ;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'NO_AUTO_VALUE_ON_ZERO' */ ;
/*!50003 DROP PROCEDURE IF EXISTS `proc_guardar_factura` */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_general_ci */ ;
DELIMITER ;;
CREATE DEFINER=`root`@`localhost` PROCEDURE `proc_guardar_factura`(`FechaF` DATE, `Tipo` VARCHAR(10), `Dias` INT, `CodigoCliente` VARCHAR(15), `NomCliente` VARCHAR(50), `Identificacion` VARCHAR(15), `DireccionCli` VARCHAR(40), `TelefonoCli` VARCHAR(25), `Impuesto` DOUBLE, `Descuento` DOUBLE, `Total` DOUBLE, `Hora` TIME, `idUsuario` INT, `Efectivo` VARCHAR(1), `Cambio` DOUBLE)
BEGIN
	    declare NuevoID int default null;
        DECLARE `_rollback` BOOL DEFAULT 0;
        DECLARE CONTINUE HANDLER FOR SQLEXCEPTION SET `_rollback` = 1;
     
       
		SELECT Max(Factura_N) + 1
        into NuevoId
        FROM tblventas ORDER BY Max(Factura_N) DESC;
        
        if NuevoId is null then
           set NuevoId = 1;
        end if;
        
        START TRANSACTION;

		
        
        if Tipo = 'Crédito' then
			Insert into tblventas (Factura_N, fecha, tipo, dias, CodigoCli, A_nombre, Identificacion, Direccion, Telefono, Impuesto, Descuento, Total, Saldo, Hora, Id_Usuario, Pago, Cambio)
			Values(NuevoId, FechaF,Tipo, Dias, CodigoCliente, NomCliente, Identificacion , DireccionCli, TelefonoCli, Impuesto, Descuento, Total, Total, Hora, idUsuario, Efectivo, Cambio);
            
            call proc_registro_saldo_cliente(CodigoCliente, 'vent', NuevoId, NuevoId, Total);
        else
			Insert into tblventas (Factura_N, fecha, tipo, dias, CodigoCli, A_nombre, Identificacion, Direccion, Telefono, Impuesto, Descuento, Total, Saldo, Hora, Id_Usuario, Pago, Cambio)
			Values(NuevoId, FechaF,Tipo, Dias, CodigoCliente, NomCliente, Identificacion , DireccionCli, TelefonoCli, Impuesto, Descuento, Total, 0, Hora, idUsuario, Efectivo, Cambio);
        end if;
        
         IF `_rollback` THEN 
			ROLLBACK;
            select 0 as id, "ERROR al guardar el Cliente";
		ELSE
		    COMMIT;
        END IF;    
                    
        Select NuevoId, "Guardado con exito"; 
        
        
END ;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'NO_AUTO_VALUE_ON_ZERO' */ ;
/*!50003 DROP PROCEDURE IF EXISTS `proc_registro_saldo_cliente` */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_general_ci */ ;
DELIMITER ;;
CREATE DEFINER=`root`@`localhost` PROCEDURE `proc_registro_saldo_cliente`(`CodigoCli` INT, `TipoDoc` VARCHAR(5), `NumFact` INT, `NumDoc` INT, `Ing_Egre` DOUBLE)
BEGIN
	declare SaldoCli double default 0;
    
    select saldo 
    into SaldoCli 
    from  tblmovimientos_cliente where codigoclien = CodigoCli Order by id_mov_cli DESC Limit 1;
	 
    if SaldoCli is null then
       set SaldoCli = 0;
    end if;
    
    if TipoDoc = 'vent' then  
       set SaldoCli = SaldoCli + Ing_Egre;
       insert into tblmovimientos_cliente (fecha_mov, codigoclien, 	tipo_mov, num_fact, num_doc, entreda_salida, saldo)
       values (now(), CodigoCli, TipoDoc, NumFact, NumDoc, Ing_Egre, SaldoCli);
       select SaldoCli;
    end if;
    
	if TipoDoc = 'ingr' then 
       
       set SaldoCli = SaldoCli + Ing_Egre;
       
       insert into tblmovimientos_cliente (fecha_mov, codigoclien, 	tipo_mov, num_fact, num_doc, entreda_salida, saldo)
       values (now(), CodigoCli, TipoDoc, NumFact, NumDoc, Ing_Egre, SaldoCli);
       select SaldoCli,   CodigoCli;
    end if;
    
	if TipoDoc = 'ntcr' then 
       
       set SaldoCli = SaldoCli - Ing_Egre;
       
       insert into tblmovimientos_cliente (fecha_mov, codigoclien, 	tipo_mov, num_fact, num_doc, entreda_salida, saldo)
       values (now(), CodigoCli, TipoDoc, NumFact, NumDoc, Ing_Egre, SaldoCli);
       select SaldoCli,   CodigoCli;
    end if;    
    
	if TipoDoc = 'ntdv' then 
       
       set SaldoCli = SaldoCli + Ing_Egre;
       
       insert into tblmovimientos_cliente (fecha_mov, codigoclien, 	tipo_mov, num_fact, num_doc, entreda_salida, saldo)
       values (now(), CodigoCli, TipoDoc, NumFact, NumDoc, Ing_Egre, SaldoCli);
       select SaldoCli,   CodigoCli;
    end if;
    
 	if TipoDoc = 'anul' then  
       set SaldoCli = SaldoCli + Ing_Egre;
       insert into tblmovimientos_cliente (fecha_mov, codigoclien, 	tipo_mov, num_fact, num_doc, entreda_salida, saldo)
       values (now(), CodigoCli, TipoDoc, NumFact, NumDoc, Ing_Egre, SaldoCli);
       
        select SaldoCli;
    end if;

   
    
    
    
END ;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'NO_AUTO_VALUE_ON_ZERO' */ ;
/*!50003 DROP PROCEDURE IF EXISTS `proc_vent_desc_inventario` */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_general_ci */ ;
DELIMITER ;;
CREATE DEFINER=`root`@`localhost` PROCEDURE `proc_vent_desc_inventario`(`num_fact` INT)
BEGIN
	DECLARE bDone INT;
	DECLARE _cant float;
    declare _items int;
    declare contar int;
    declare countRow int;
    
	DECLARE _curs CURSOR FOR  Select items, cantidad from tbldetalle_venta where Factura_NTemp = num_fact;
    DECLARE CONTINUE HANDLER FOR NOT FOUND SET bDone = 1;
    OPEN _curs;
	set contar = 0;
	SET bDone = 0;
	REPEAT
		FETCH _curs INTO _items, _cant;
			if ! bDone then
				update tblarticulos set existencia = (existencia - _cant) where items = _items;
				COMMIT;			
					set contar = contar + 1;
            end if;
       UNTIL bDone END REPEAT;     
   CLOSE _curs;

   Select 1, "Registros actualizados", countRow;
   
END ;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'NO_AUTO_VALUE_ON_ZERO' */ ;
/*!50003 DROP PROCEDURE IF EXISTS `reportar_kardex` */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_general_ci */ ;
DELIMITER ;;
CREATE DEFINER=`root`@`localhost` PROCEDURE `reportar_kardex`(`Tipo` INT, `CodigoPro` INT, `Cantidad` FLOAT, `Precio` DOUBLE, `Detalle` VARCHAR(50), `CD` INT)
BEGIN
	 declare Cant float default null;
     declare Saldo float default 0;
     
     
     
     Select Existencia
     into Cant
     from tblarticulos  where items = CodigoPro;  
     
     if Tipo = 1 then  
		 if Cant is not null then
			set Saldo = Cant + Cantidad;
			Update tblarticulos set Existencia = Saldo Where items = CodigoPro;
			
			Insert into tblkardex (Fecha, Items, Detalle,  C_D, Cant_Ent, Cant_Saldo, Cost_Unit)
			values (now(), CodigoPro, Detalle, CD, Cantidad,  Saldo,  Precio);
        else
            Insert into tblkardex (Fecha, Items, Detalle,  C_D, Cant_Ent, Cant_Saldo, Cost_Unit)
			values (now(), CodigoPro, Detalle, CD, Cantidad,  Cantidad,  Precio);
		end if;        
     else   
		 if Cant is not null then
			set Saldo = Cant - Cantidad;
			Update tblarticulos set Existencia = Saldo Where items = CodigoPro;
			
			Insert into tblkardex (Fecha, Items, Detalle,  C_D, Cant_Sal, Cant_Saldo, Cost_Unit)
			values (now(), CodigoPro, Detalle, CD, Cantidad,  Saldo,  Precio);
        else  
            Insert into tblkardex (Fecha, Items, Detalle,  C_D, Cant_Sal, Cant_Saldo, Cost_Unit)
			values (now(), CodigoPro, Detalle, CD, Cantidad,  Cantidad,  Precio);
		end if;   
     end if;   
     
     
END ;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;

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
/*!50001 VIEW `vw_facturas_anteriores_cliente` AS select `fa`.`CodigoCli` AS `CodigoCli`,`fa`.`FacturaN` AS `FacturaN`,`fa`.`Fecha` AS `Fecha`,`fa`.`Dias` AS `Dias`,`fa`.`Fecha` + interval `fa`.`Dias` day AS `Fechav`,`fa`.`Valor` AS `Total`,coalesce(`p`.`TotalPagos`,0) AS `TotalPagos`,greatest(`fa`.`Valor` - coalesce(`p`.`TotalPagos`,0),0) AS `Saldo`,case when curdate() >= `fa`.`Fecha` + interval `fa`.`Dias` day then to_days(curdate()) - to_days(`fa`.`Fecha` + interval `fa`.`Dias` day) else 0 end AS `DiasVenc`,curdate() > `fa`.`Fecha` + interval `fa`.`Dias` day AS `Vencida` from (`tblfacturasanteriores` `fa` left join (select `tp`.`Codigo` AS `CodigoCli`,coalesce(nullif(`tp`.`NFactAnt`,''),cast(`tp`.`Fact_N` as char charset utf8mb4)) AS `FacturaN`,sum(`tp`.`ValorPago`) AS `TotalPagos` from `tblpagos` `tp` where coalesce(`tp`.`Estado`,'Valida') = 'Valida' and `tp`.`ValorPago` > 0 and (`tp`.`NFactAnt` is not null and `tp`.`NFactAnt` <> '' or `tp`.`Fact_N` is not null) group by `tp`.`Codigo`,coalesce(nullif(`tp`.`NFactAnt`,''),cast(`tp`.`Fact_N` as char charset utf8mb4))) `p` on(`p`.`CodigoCli` = `fa`.`CodigoCli` and `p`.`FacturaN` = `fa`.`FacturaN`)) */;
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
/*!50001 VIEW `vw_facturas_cliente_saldos` AS select `v`.`Factura_N` AS `Factura_N`,`v`.`CodigoCli` AS `CodigoCli`,`c`.`Razon_Social` AS `A_Nombre`,`v`.`Fecha` AS `Fecha`,`v`.`Dias` AS `Dias`,`v`.`Fecha` + interval `v`.`Dias` day AS `Fechav`,`v`.`Total` AS `Total`,coalesce(`p`.`TotalPagos`,0) AS `TotalPagos`,greatest(`v`.`Total` - coalesce(`p`.`TotalPagos`,0),0) AS `Saldo`,`v`.`Tipo` AS `Tipo`,`v`.`EstadoFact` AS `EstadoFact`,`v`.`FechaMod` AS `FechaMod`,case when curdate() >= `v`.`Fecha` + interval `v`.`Dias` day then to_days(curdate()) - to_days(`v`.`Fecha` + interval `v`.`Dias` day) else 0 end AS `DiasVenc`,curdate() > `v`.`Fecha` + interval `v`.`Dias` day AS `Vencida` from ((`tblventas` `v` join `tblclientes` `c` on(`c`.`CodigoClien` = `v`.`CodigoCli`)) left join (select coalesce(nullif(`tp`.`Fact_N`,0),case when `tp`.`NFactAnt` regexp '^[0-9]+$' then cast(`tp`.`NFactAnt` as unsigned) end) AS `Fact_N`,sum(`tp`.`ValorPago`) AS `TotalPagos` from `tblpagos` `tp` where coalesce(`tp`.`Estado`,'Valida') = 'Valida' and `tp`.`ValorPago` > 0 group by coalesce(nullif(`tp`.`Fact_N`,0),case when `tp`.`NFactAnt` regexp '^[0-9]+$' then cast(`tp`.`NFactAnt` as unsigned) end)) `p` on(`p`.`Fact_N` = `v`.`Factura_N`)) where `v`.`Tipo` is not null and `v`.`Tipo` <> 'Contado' and `v`.`EstadoFact` = 'Valida' */;
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
/*!50001 VIEW `vw_facturas_elec_cliente_saldos` AS select `v`.`id` AS `DocID`,concat(`v`.`prefix`,`v`.`number`) AS `Factura_N`,`v`.`cod_cliente` AS `CodigoCli`,`c`.`Razon_Social` AS `A_Nombre`,`v`.`fecha` AS `Fecha`,`v`.`payment_due_days` AS `Dias`,`v`.`fecha` + interval `v`.`payment_due_days` day AS `Fechav`,`v`.`total` AS `Total`,coalesce(`p`.`TotalPagos`,0) AS `TotalPagos`,greatest(`v`.`total` - coalesce(`p`.`TotalPagos`,0),0) AS `Saldo`,`v`.`payment_form_id` AS `Tipo`,`v`.`EstadoFact` AS `EstadoFact`,`v`.`updated_at` AS `updated_at`,case when curdate() >= `v`.`fecha` + interval `v`.`payment_due_days` day then to_days(curdate()) - to_days(`v`.`fecha` + interval `v`.`payment_due_days` day) else 0 end AS `DiasVenc`,curdate() > `v`.`fecha` + interval `v`.`payment_due_days` day AS `Vencida` from ((`electronic_documents` `v` join `tblclientes` `c` on(`c`.`CodigoClien` = `v`.`cod_cliente`)) left join (select `tp`.`Codigo` AS `CodigoCli`,cast(nullif(`tp`.`Nfact_electronica`,'') as unsigned) AS `DocID`,sum(`tp`.`ValorPago`) AS `TotalPagos` from `tblpagos` `tp` where `tp`.`Estado` = 'Valida' and `tp`.`ValorPago` > 0 and `tp`.`Nfact_electronica` is not null group by `tp`.`Codigo`,cast(nullif(`tp`.`Nfact_electronica`,'') as unsigned)) `p` on(`p`.`CodigoCli` = `v`.`cod_cliente` and `p`.`DocID` = `v`.`id`)) where `v`.`payment_form_id` = 2 and `v`.`status` = 'autorizado' and `v`.`type_document_id` = 1 */;
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

-- Dump completed on 2026-08-20 15:10:25
