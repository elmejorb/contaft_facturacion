-- MariaDB dump 10.19  Distrib 10.4.32-MariaDB, for Win64 (AMD64)
--
-- Host: localhost    Database: dbammiaccesorios
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
-- Table structure for table `detalle_cotizacion`
--

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `detalle_cotizacion` (
  `id_detalle_cotiza` int(11) NOT NULL,
  `item_pro` int(11) NOT NULL,
  `cant_pro` float NOT NULL,
  `precio_v` double NOT NULL,
  `descuento` double NOT NULL,
  `id_cotizacion` int(11) NOT NULL,
  PRIMARY KEY (`id_detalle_cotiza`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `detalle_fact_abietas`
--

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
-- Table structure for table `facturasv_abiertas`
--

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
-- Table structure for table `tblarticulos`
--

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
  PRIMARY KEY (`Items`),
  KEY `Codigo` (`Codigo`),
  KEY `Nombres_Articulo` (`Nombres_Articulo`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3 COLLATE=utf8mb3_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `tblauxiliarbanco`
--

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

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `tblbancos` (
  `idBancos` int(11) NOT NULL,
  `FechaCreacion` datetime DEFAULT NULL,
  `NumCuenta` varchar(50) NOT NULL,
  `NomCuenta` varchar(45) NOT NULL,
  `Predeterminada` int(11) DEFAULT NULL,
  PRIMARY KEY (`idBancos`)
) ENGINE=MyISAM DEFAULT CHARSET=utf8mb3 COLLATE=utf8mb3_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `tblcategoria`
--

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `tblcategoria` (
  `Categoria` varchar(100) DEFAULT NULL,
  `Id_Categoria` int(11) NOT NULL,
  PRIMARY KEY (`Id_Categoria`)
) ENGINE=MyISAM DEFAULT CHARSET=utf8mb3 COLLATE=utf8mb3_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `tblclientes`
--

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
  PRIMARY KEY (`CodigoClien`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3 COLLATE=utf8mb3_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `tblcomprobantediario`
--

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
-- Table structure for table `tblconteodeinventario`
--

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
) ENGINE=InnoDB AUTO_INCREMENT=227 DEFAULT CHARSET=utf8mb3 COLLATE=utf8mb3_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `tblcotizaciones`
--

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `tblcotizaciones` (
  `id_cotizacion` int(11) NOT NULL,
  `codigo_cli` int(11) NOT NULL,
  `nombre_cliente` varchar(50) NOT NULL,
  `telefono_cli` varchar(25) NOT NULL,
  `fecha` date NOT NULL,
  `termino` int(11) NOT NULL,
  `dias` int(11) NOT NULL,
  `total_factura` double NOT NULL,
  `fecha_hora_creado` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id_cotizacion`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `tblcuadrecaja`
--

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
  PRIMARY KEY (`Id_Empresa`),
  KEY `Id_Empresa` (`Id_Empresa`)
) ENGINE=MyISAM AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb3 COLLATE=utf8mb3_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `tbldetalle_pedido`
--

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
  PRIMARY KEY (`Id_DetallePedido`)
) ENGINE=InnoDB AUTO_INCREMENT=595 DEFAULT CHARSET=utf8mb3 COLLATE=utf8mb3_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `tbldetalle_venta`
--

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `tbldetalle_venta` (
  `Id_DetalleVenta` int(11) NOT NULL AUTO_INCREMENT,
  `Factura_N` int(11) DEFAULT 0,
  `Factura_NTemp` varchar(100) DEFAULT NULL,
  `Items` int(11) DEFAULT 0,
  `DescripcionTemp` varchar(100) DEFAULT NULL,
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
  PRIMARY KEY (`Id_DetalleVenta`),
  KEY `Id_DetalleVenta` (`Id_DetalleVenta`)
) ENGINE=InnoDB AUTO_INCREMENT=1071 DEFAULT CHARSET=utf8mb3 COLLATE=utf8mb3_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `tbldetallecomprobantediario`
--

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
  PRIMARY KEY (`Id_Egresos`),
  KEY `Id_Egresos` (`Id_Egresos`)
) ENGINE=InnoDB AUTO_INCREMENT=20 DEFAULT CHARSET=utf8mb3 COLLATE=utf8mb3_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `tblempleados`
--

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
-- Table structure for table `tblfacturasanteriores`
--

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
  KEY `ID_FactAnterioresP` (`ID_FactAnterioresP`)
) ENGINE=MyISAM DEFAULT CHARSET=utf8mb3 COLLATE=utf8mb3_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `tblformulario`
--

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

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `tblkardex` (
  `Id_kardex` int(11) NOT NULL DEFAULT 0,
  `Fecha` timestamp NOT NULL DEFAULT current_timestamp(),
  `Mes` varchar(15) DEFAULT 'Enero',
  `Items` int(11) DEFAULT 0,
  `Detalle` varchar(60) DEFAULT NULL,
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
-- Table structure for table `tblmedios_pago`
--

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `tblmedios_pago` (
  `id_mediopago` int(11) NOT NULL,
  `nombre_medio` varchar(40) NOT NULL,
  PRIMARY KEY (`id_mediopago`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3 COLLATE=utf8mb3_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `tblmeses`
--

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `tblmeses` (
  `N_Mes` int(11) NOT NULL DEFAULT 0,
  `Mes` varchar(15) DEFAULT NULL,
  PRIMARY KEY (`N_Mes`)
) ENGINE=MyISAM DEFAULT CHARSET=utf8mb3 COLLATE=utf8mb3_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `tblmovimiento`
--

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
-- Table structure for table `tblordenproduccion`
--

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
  `Fact_Plan` int(11) DEFAULT NULL,
  `Cedula` varchar(20) DEFAULT NULL,
  `RecibidoDe` varchar(60) DEFAULT NULL,
  `NRemision` int(11) DEFAULT NULL,
  `FechaMod` datetime DEFAULT NULL,
  PRIMARY KEY (`Id_Pagos`)
) ENGINE=InnoDB AUTO_INCREMENT=1313 DEFAULT CHARSET=utf8mb3 COLLATE=utf8mb3_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `tblpedidos`
--

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `tblpedidos` (
  `Pedido_N` int(11) NOT NULL DEFAULT 0,
  `FacturaCompra_N` int(11) DEFAULT 0,
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
  KEY `CodigoPro` (`CodigoPro`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3 COLLATE=utf8mb3_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `tblporcentajeutilidad`
--

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
-- Table structure for table `tblproductosrelacionados`
--

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
  PRIMARY KEY (`CodigoPro`)
) ENGINE=InnoDB AUTO_INCREMENT=220535 DEFAULT CHARSET=utf8mb3 COLLATE=utf8mb3_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `tblreferencia`
--

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
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=utf8mb3 COLLATE=utf8mb3_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `tblregistroproducto`
--

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
-- Table structure for table `tblsaldosfact`
--

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
-- Table structure for table `tbltempfactutilidad`
--

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
) ENGINE=MyISAM AUTO_INCREMENT=55 DEFAULT CHARSET=utf8mb3 COLLATE=utf8mb3_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `tbltipomovimiento`
--

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

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `tbltiposusuario` (
  `Id_TiposUsuario` int(11) NOT NULL AUTO_INCREMENT,
  `Nombre_TipoUsuario` varchar(50) DEFAULT NULL,
  `Nivel` text DEFAULT NULL,
  PRIMARY KEY (`Id_TiposUsuario`),
  KEY `Id_TiposUsuario` (`Id_TiposUsuario`)
) ENGINE=MyISAM AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb3 COLLATE=utf8mb3_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `tblusuarios`
--

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
  PRIMARY KEY (`Id_Usuario`),
  KEY `Id_TiposUsuario` (`Id_TiposUsuario`),
  KEY `Id_Usuario` (`Id_Usuario`)
) ENGINE=MyISAM AUTO_INCREMENT=12 DEFAULT CHARSET=utf8mb3 COLLATE=utf8mb3_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `tblventas`
--

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
  PRIMARY KEY (`Factura_N`)
) ENGINE=InnoDB AUTO_INCREMENT=869 DEFAULT CHARSET=utf8mb3 COLLATE=utf8mb3_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Temporary table structure for view `ver_factura`
--

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
-- Dumping routines for database 'dbammiaccesorios'
--
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'NO_AUTO_VALUE_ON_ZERO' */ ;
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

    -- Verificar existencia si la empresa no permite stock negativo
    IF FacturarNegativo = FALSE THEN
        SELECT Existencia INTO StockActual FROM tblarticulos WHERE Items = Items;
        IF StockActual < Cantidad THEN
            SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Stock insuficiente para este producto';
        END IF;
    END IF;

    -- Insertar detalle de la venta
    INSERT INTO tbldetalle_venta (Factura_N, Items, Cantidad, PrecioC, PrecioV, Iva, Impuesto, Subtotal, Descuento, Entregado)
    VALUES (FacturaN, Items, Cantidad, PrecioC, PrecioV, Iva, Impuesto, Subtotal, Descuento, Entregado);

    -- Si los productos se entregan, actualizar inventario
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

    -- Obtener el ID de la factura recién insertada
    SET Nun_Factura = LAST_INSERT_ID();

    -- Retornar el número de factura generado
    SELECT Nun_Factura AS FacturaN;
END ;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'NO_AUTO_VALUE_ON_ZERO' */ ;
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
/*!50001 SET character_set_client      = utf8mb3 */;
/*!50001 SET character_set_results     = utf8mb3 */;
/*!50001 SET collation_connection      = utf8mb4_general_ci */;
/*!50001 CREATE ALGORITHM=UNDEFINED */
/*!50013 DEFINER=`root`@`localhost` SQL SECURITY DEFINER */
/*!50001 VIEW `ver_factura` AS select 1 AS `Factura_N`,1 AS `Fecha`,1 AS `Hora`,1 AS `Tipo`,1 AS `Dias`,1 AS `A_nombre`,1 AS `Identificacion`,1 AS `Telef`,1 AS `Direcc`,1 AS `Impuesto`,1 AS `Descuento`,1 AS `Total`,1 AS `Saldo`,1 AS `Pago`,1 AS `Cambio`,1 AS `Nombre` */;
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
/*!50001 SET character_set_client      = utf8mb3 */;
/*!50001 SET character_set_results     = utf8mb3 */;
/*!50001 SET collation_connection      = utf8mb4_general_ci */;
/*!50001 CREATE ALGORITHM=UNDEFINED */
/*!50013 DEFINER=`root`@`localhost` SQL SECURITY DEFINER */
/*!50001 VIEW `view_detalles_ventas` AS select 1 AS `Factura_N`,1 AS `Items`,1 AS `Codigo`,1 AS `Nombres_Articulo`,1 AS `PrecioV`,1 AS `Cantidad`,1 AS `IVA`,1 AS `DescuPro`,1 AS `Entregado`,1 AS `subtotal`,1 AS `impuesto` */;
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

-- Dump completed on 2026-05-08  8:34:08
