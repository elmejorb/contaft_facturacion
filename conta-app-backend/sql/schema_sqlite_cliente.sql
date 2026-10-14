-- MariaDB dump 10.19  Distrib 10.4.32-MariaDB, for Win64 (AMD64)
--
-- Host: localhost    Database: conta_template
-- ------------------------------------------------------
-- Server version	11.4.4-MariaDB












--
-- Table structure for table "countries"
--

DROP TABLE IF EXISTS "countries";


CREATE TABLE "countries" (  "id" INTEGER PRIMARY KEY AUTOINCREMENT,
  "code" varchar(255) NOT NULL,
  "name" varchar(255) NOT NULL,
  "iso_code" varchar(255) DEFAULT NULL,
  "created_at" timestamp NULL DEFAULT NULL,
  "updated_at" timestamp NULL DEFAULT NULL);


--
-- Dumping data for table "countries"
--

LOCK TABLES "countries" WRITE;


UNLOCK TABLES;

--
-- Table structure for table "departments"
--

DROP TABLE IF EXISTS "departments";


CREATE TABLE "departments" (  "id" INTEGER PRIMARY KEY AUTOINCREMENT,
  "country_id" INTEGER unsigned NOT NULL,
  "code" varchar(255) NOT NULL,
  "name" varchar(255) NOT NULL,
  "created_at" timestamp NULL DEFAULT NULL,
  "updated_at" timestamp NULL DEFAULT NULL);


--
-- Dumping data for table "departments"
--

LOCK TABLES "departments" WRITE;


UNLOCK TABLES;

--
-- Table structure for table "detalle_cotizacion"
--

DROP TABLE IF EXISTS "detalle_cotizacion";


CREATE TABLE "detalle_cotizacion" (  "id_detalle_cotiza" INTEGER PRIMARY KEY AUTOINCREMENT,
  "item_pro" INTEGER NOT NULL,
  "cant_pro" float NOT NULL,
  "precio_v" double NOT NULL,
  "descuento" double NOT NULL,
  "id_cotizacion" INTEGER NOT NULL);


--
-- Dumping data for table "detalle_cotizacion"
--

LOCK TABLES "detalle_cotizacion" WRITE;


UNLOCK TABLES;

--
-- Table structure for table "detalle_document_electronic"
--

DROP TABLE IF EXISTS "detalle_document_electronic";


CREATE TABLE "detalle_document_electronic" (  "id_detalle_document" INTEGER PRIMARY KEY AUTOINCREMENT,
  "factura_n" INTEGER DEFAULT NULL,
  "items" INTEGER DEFAULT NULL,
  "unit_measure_id" INTEGER unsigned DEFAULT NULL,
  "invoiced_quantity" NUMERIC DEFAULT NULL,
  "line_extension_amount" NUMERIC DEFAULT NULL,
  "free_of_charge_indicator" INTEGER DEFAULT 0,
  "description" varchar(255) DEFAULT NULL,
  "type_item_identification_id" INTEGER DEFAULT NULL,
  "price_amount" NUMERIC DEFAULT NULL,
  "PrecioCosto" NUMERIC DEFAULT NULL,
  "discount_amount" NUMERIC DEFAULT 0.00,
  "base_quantity" NUMERIC DEFAULT NULL,
  "tax_id" INTEGER DEFAULT NULL,
  "tax_amount" NUMERIC DEFAULT NULL,
  "taxable_amount" NUMERIC DEFAULT NULL,
  "tax_percent" NUMERIC DEFAULT NULL,
  "created_at" timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" timestamp NULL DEFAULT NULL,
  CONSTRAINT "detalle_document_electronic_ibfk_1" FOREIGN KEY ("items") REFERENCES "tblarticulos" ("Items"),
  CONSTRAINT "detalle_document_electronic_ibfk_2" FOREIGN KEY ("unit_measure_id") REFERENCES "unit_measures" ("id")
);


--
-- Dumping data for table "detalle_document_electronic"
--

LOCK TABLES "detalle_document_electronic" WRITE;


UNLOCK TABLES;

--
-- Table structure for table "detalle_fact_abietas"
--

DROP TABLE IF EXISTS "detalle_fact_abietas";


CREATE TABLE "detalle_fact_abietas" (  "id_detalle_ab" INTEGER PRIMARY KEY AUTOINCREMENT,
  "id_fac_ab" INTEGER NOT NULL,
  "item_pro" INTEGER NOT NULL,
  "cant_pro" float NOT NULL,
  "precio_v" double NOT NULL,
  "descuento" double NOT NULL);


--
-- Dumping data for table "detalle_fact_abietas"
--

LOCK TABLES "detalle_fact_abietas" WRITE;


UNLOCK TABLES;

--
-- Table structure for table "detalle_factura_recibida"
--

DROP TABLE IF EXISTS "detalle_factura_recibida";


CREATE TABLE "detalle_factura_recibida" (  "id" INTEGER PRIMARY KEY AUTOINCREMENT,
  "factura_recibida_id" INTEGER NOT NULL,
  "linea_num" INTEGER DEFAULT 1,
  "codigo" varchar(60) DEFAULT NULL,
  "descripcion" varchar(500) DEFAULT NULL,
  "unidad_medida" varchar(20) DEFAULT NULL,
  "cantidad" NUMERIC DEFAULT 1.000,
  "precio_unitario" NUMERIC DEFAULT 0.00,
  "descuento" NUMERIC DEFAULT 0.00,
  "iva_pct" NUMERIC DEFAULT 0.00,
  "iva_monto" NUMERIC DEFAULT 0.00,
  "subtotal" NUMERIC DEFAULT 0.00,
  "total_linea" NUMERIC DEFAULT 0.00);


--
-- Dumping data for table "detalle_factura_recibida"
--

LOCK TABLES "detalle_factura_recibida" WRITE;


UNLOCK TABLES;

--
-- Table structure for table "electronic_documents"
--

DROP TABLE IF EXISTS "electronic_documents";


CREATE TABLE "electronic_documents" (  "id" INTEGER PRIMARY KEY AUTOINCREMENT,
  "origen" varchar(20) DEFAULT 'local',
  "id_vendedor_remoto" INTEGER DEFAULT NULL,
  "nombre_vendedor" varchar(150) DEFAULT NULL,
  "fecha" date NOT NULL,
  "cod_cliente" INTEGER NOT NULL,
  "customer_identification" varchar(255) DEFAULT NULL,
  "type_document_id" INTEGER unsigned NOT NULL,
  "resolution_id" INTEGER unsigned DEFAULT NULL,
  "prefix" varchar(255) DEFAULT NULL,
  "number" INTEGER unsigned NOT NULL,
  "status" varchar(255) NOT NULL DEFAULT 'enviado',
  "payment_due_days" INTEGER DEFAULT NULL,
  "descuento" NUMERIC NOT NULL DEFAULT 0.0000,
  "total" NUMERIC DEFAULT NULL,
  "payment_form_id" INTEGER unsigned DEFAULT NULL,
  "payment_method_id" INTEGER unsigned DEFAULT NULL,
  "dian_response" longtext DEFAULT NULL CHECK (json_valid("dian_response")),
  "cufe" varchar(255) DEFAULT NULL,
  "invoice_cufe" varchar(255) DEFAULT NULL,
  "sent_at" timestamp NULL DEFAULT NULL,
  "id_usuario" INTEGER NOT NULL,
  "abono" NUMERIC NOT NULL DEFAULT 0.0000,
  "codigoEmp" INTEGER NOT NULL DEFAULT 0,
  "id_mediopago" INTEGER NOT NULL DEFAULT 0,
  "efectivo" NUMERIC NOT NULL DEFAULT 0.0000,
  "valorpagado1" NUMERIC NOT NULL DEFAULT 0.0000,
  "pagada" varchar(1) NOT NULL DEFAULT 'N',
  "nota" text DEFAULT NULL,
  "EstadoFact" INTEGER NOT NULL DEFAULT 1,
  "created_at" timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  "email_sent" INTEGER DEFAULT 0,
  "email_sent_at" datetime DEFAULT NULL,
  "email_status" varchar(50) DEFAULT NULL,
  "email_recipient" varchar(500) DEFAULT NULL,
  "customer_name" varchar(200) DEFAULT NULL,
  "customer_email" varchar(150) DEFAULT NULL);


--
-- Dumping data for table "electronic_documents"
--

LOCK TABLES "electronic_documents" WRITE;


UNLOCK TABLES;

--
-- Table structure for table "eventos_factura_recibida"
--

DROP TABLE IF EXISTS "eventos_factura_recibida";


CREATE TABLE "eventos_factura_recibida" (  "id" INTEGER PRIMARY KEY AUTOINCREMENT,
  "factura_recibida_id" INTEGER NOT NULL,
  "event_code" varchar(4) NOT NULL,
  "event_label" varchar(120) DEFAULT NULL,
  "cude_evento" varchar(200) DEFAULT NULL,
  "event_id_remoto" INTEGER DEFAULT NULL,
  "dian_status" varchar(10) DEFAULT NULL,
  "dian_message" text DEFAULT NULL,
  "rejection_code" varchar(10) DEFAULT NULL,
  "rejection_description" varchar(500) DEFAULT NULL,
  "note" text DEFAULT NULL,
  "api_response" longtext DEFAULT NULL,
  "estado" TEXT DEFAULT 'pendiente',
  "enviado_at" datetime DEFAULT NULL,
  "usuario_id" INTEGER DEFAULT NULL,
  "created_at" timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  "aprobado_marker" varchar(4) GENERATED ALWAYS AS (case when "estado" = 'aprobado' then "event_code" else NULL end) STORED);


--
-- Dumping data for table "eventos_factura_recibida"
--

LOCK TABLES "eventos_factura_recibida" WRITE;


UNLOCK TABLES;

--
-- Table structure for table "facturas_recibidas"
--

DROP TABLE IF EXISTS "facturas_recibidas";


CREATE TABLE "facturas_recibidas" (  "id" INTEGER PRIMARY KEY AUTOINCREMENT,
  "cufe" varchar(200) NOT NULL,
  "tipo_documento" varchar(20) NOT NULL DEFAULT 'invoice',
  "document_type_code" varchar(4) DEFAULT '01',
  "numero" varchar(50) DEFAULT NULL,
  "prefijo" varchar(10) DEFAULT NULL,
  "fecha_emision" date DEFAULT NULL,
  "fecha_recepcion" datetime DEFAULT CURRENT_TIMESTAMP,
  "emisor_nit" varchar(30) DEFAULT NULL,
  "emisor_dv" varchar(2) DEFAULT NULL,
  "emisor_nombre" varchar(200) DEFAULT NULL,
  "emisor_organization_type" varchar(2) DEFAULT '1',
  "receptor_nit" varchar(30) DEFAULT NULL,
  "receptor_nombre" varchar(200) DEFAULT NULL,
  "subtotal" NUMERIC DEFAULT 0.00,
  "total_iva" NUMERIC DEFAULT 0.00,
  "total" NUMERIC DEFAULT 0.00,
  "moneda" varchar(3) DEFAULT 'COP',
  "archivo_original_nombre" varchar(255) DEFAULT NULL,
  "xml_filename" varchar(255) DEFAULT NULL,
  "xml_path" varchar(500) DEFAULT NULL,
  "compra_id" INTEGER DEFAULT NULL,
  "created_at" timestamp NULL DEFAULT CURRENT_TIMESTAMP);


--
-- Dumping data for table "facturas_recibidas"
--

LOCK TABLES "facturas_recibidas" WRITE;


UNLOCK TABLES;

--
-- Table structure for table "facturasv_abiertas"
--

DROP TABLE IF EXISTS "facturasv_abiertas";


CREATE TABLE "facturasv_abiertas" (  "id_fac_ab" INTEGER PRIMARY KEY AUTOINCREMENT,
  "fecha" date NOT NULL,
  "termino" varchar(15) NOT NULL,
  "dias" INTEGER NOT NULL,
  "codigo_cli" INTEGER NOT NULL,
  "identificacion_cli" varchar(15) NOT NULL,
  "nombres_cli" varchar(55) NOT NULL,
  "lista_precio" INTEGER NOT NULL,
  "total_factura" double NOT NULL,
  "fecha_hora_creado" datetime NOT NULL);


--
-- Dumping data for table "facturasv_abiertas"
--

LOCK TABLES "facturasv_abiertas" WRITE;


UNLOCK TABLES;

--
-- Table structure for table "municipalities"
--

DROP TABLE IF EXISTS "municipalities";


CREATE TABLE "municipalities" (  "id" INTEGER PRIMARY KEY AUTOINCREMENT,
  "country_id" INTEGER unsigned NOT NULL,
  "department_id" INTEGER unsigned NOT NULL,
  "code" varchar(255) NOT NULL,
  "name" varchar(255) NOT NULL,
  "created_at" timestamp NULL DEFAULT NULL,
  "updated_at" timestamp NULL DEFAULT NULL);


--
-- Dumping data for table "municipalities"
--

LOCK TABLES "municipalities" WRITE;


UNLOCK TABLES;

--
-- Table structure for table "payment_methods"
--

DROP TABLE IF EXISTS "payment_methods";


CREATE TABLE "payment_methods" (  "id" INTEGER PRIMARY KEY AUTOINCREMENT,
  "code" varchar(2) NOT NULL,
  "name" varchar(255) NOT NULL,
  "created_at" timestamp NULL DEFAULT NULL,
  "updated_at" timestamp NULL DEFAULT NULL);


--
-- Dumping data for table "payment_methods"
--

LOCK TABLES "payment_methods" WRITE;


UNLOCK TABLES;

--
-- Table structure for table "taxes"
--

DROP TABLE IF EXISTS "taxes";


CREATE TABLE "taxes" (  "id" INTEGER PRIMARY KEY AUTOINCREMENT,
  "name" varchar(255) NOT NULL,
  "code" varchar(255) NOT NULL,
  "description" varchar(255) DEFAULT NULL,
  "created_at" timestamp NULL DEFAULT NULL,
  "updated_at" timestamp NULL DEFAULT NULL);


--
-- Dumping data for table "taxes"
--

LOCK TABLES "taxes" WRITE;


UNLOCK TABLES;

--
-- Table structure for table "tbl_clientes_comportamiento"
--

DROP TABLE IF EXISTS "tbl_clientes_comportamiento";


CREATE TABLE "tbl_clientes_comportamiento" (  "id" INTEGER PRIMARY KEY AUTOINCREMENT,
  "CodigoClien" INTEGER NOT NULL,
  "comportamiento" TEXT DEFAULT 'sin_datos',
  "dias_mora_promedio" INTEGER DEFAULT NULL,
  "facturas_evaluadas" INTEGER DEFAULT 0,
  "comportamiento_calculado_at" datetime DEFAULT NULL,
  "cartera_castigada" INTEGER DEFAULT 0,
  "fecha_castigo" datetime DEFAULT NULL,
  "motivo_castigo" TEXT DEFAULT NULL,
  "motivo_detalle" varchar(255) DEFAULT NULL,
  "id_usuario_castigo" INTEGER DEFAULT NULL,
  "nota_cobranza" text DEFAULT NULL,
  "created_at" datetime DEFAULT CURRENT_TIMESTAMP,
  "updated_at" datetime DEFAULT CURRENT_TIMESTAMP);


--
-- Dumping data for table "tbl_clientes_comportamiento"
--

LOCK TABLES "tbl_clientes_comportamiento" WRITE;


UNLOCK TABLES;

--
-- Table structure for table "tbl_config_vendedores"
--

DROP TABLE IF EXISTS "tbl_config_vendedores";


CREATE TABLE "tbl_config_vendedores" (
  "id" INTEGER NOT NULL DEFAULT 1,
  "habilitado" INTEGER DEFAULT 0,
  "api_url" varchar(300) DEFAULT 'https://conta-basic.innovacion-digital.com/api-conta/public',
  "api_email" varchar(150) DEFAULT '',
  "api_token_empresa" varchar(255) DEFAULT '',
  "sync_intervalo_pull_min" INTEGER DEFAULT 15,
  "ultimo_pull_ventas" datetime DEFAULT NULL,
  "ultimo_pull_id" INTEGER DEFAULT 0,
  "fecha_mod" datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY ("id")
);


--
-- Dumping data for table "tbl_config_vendedores"
--

LOCK TABLES "tbl_config_vendedores" WRITE;


UNLOCK TABLES;

--
-- Table structure for table "tbl_pedidos_vendedor"
--

DROP TABLE IF EXISTS "tbl_pedidos_vendedor";


CREATE TABLE "tbl_pedidos_vendedor" (  "id" INTEGER PRIMARY KEY AUTOINCREMENT,
  "id_remoto" INTEGER NOT NULL,
  "numero_pedido" varchar(30) DEFAULT NULL,
  "id_cliente_remoto" INTEGER DEFAULT NULL,
  "nombre_cliente" varchar(200) DEFAULT NULL,
  "nit_cliente" varchar(30) DEFAULT NULL,
  "id_vendedor_remoto" INTEGER DEFAULT NULL,
  "nombre_vendedor" varchar(150) DEFAULT NULL,
  "fecha" date DEFAULT NULL,
  "subtotal" NUMERIC DEFAULT 0.00,
  "impuestos" NUMERIC DEFAULT 0.00,
  "total" NUMERIC DEFAULT 0.00,
  "forma_pago" varchar(30) DEFAULT NULL,
  "observaciones" text DEFAULT NULL,
  "estado" varchar(30) DEFAULT 'pendiente',
  "items_json" longtext DEFAULT NULL,
  "convertido_factura_n" INTEGER DEFAULT NULL,
  "fecha_descarga" datetime DEFAULT CURRENT_TIMESTAMP,
  "fecha_mod" datetime DEFAULT CURRENT_TIMESTAMP);


--
-- Dumping data for table "tbl_pedidos_vendedor"
--

LOCK TABLES "tbl_pedidos_vendedor" WRITE;


UNLOCK TABLES;

--
-- Table structure for table "tbl_vendedores_movil"
--

DROP TABLE IF EXISTS "tbl_vendedores_movil";


CREATE TABLE "tbl_vendedores_movil" (  "id" INTEGER PRIMARY KEY AUTOINCREMENT,
  "id_remoto" INTEGER DEFAULT NULL,
  "codigo" varchar(20) NOT NULL,
  "nombre" varchar(150) NOT NULL,
  "email" varchar(150) NOT NULL,
  "password_hash" varchar(255) NOT NULL,
  "telefono" varchar(30) DEFAULT NULL,
  "cedula" varchar(30) DEFAULT NULL,
  "zona" varchar(100) DEFAULT NULL,
  "can_edit_clients" INTEGER DEFAULT 1,
  "activo" INTEGER DEFAULT 1,
  "sincronizado" INTEGER DEFAULT 0,
  "fecha_mod" datetime DEFAULT CURRENT_TIMESTAMP);


--
-- Dumping data for table "tbl_vendedores_movil"
--

LOCK TABLES "tbl_vendedores_movil" WRITE;


UNLOCK TABLES;

--
-- Table structure for table "tblanticipo_movs"
--

DROP TABLE IF EXISTS "tblanticipo_movs";


CREATE TABLE "tblanticipo_movs" (  "Id_Mov" INTEGER PRIMARY KEY AUTOINCREMENT,
  "Id_Anticipo" INTEGER NOT NULL,
  "Fecha" date NOT NULL,
  "Tipo" varchar(15) NOT NULL,
  "Valor" NUMERIC NOT NULL,
  "Factura_N" INTEGER DEFAULT NULL,
  "Concepto" varchar(200) DEFAULT NULL,
  "id_mediopago" INTEGER DEFAULT NULL,
  "Id_Usuario" INTEGER DEFAULT NULL,
  "Estado" varchar(10) NOT NULL DEFAULT 'Valida',
  "FechaCreacion" timestamp NULL DEFAULT CURRENT_TIMESTAMP);


--
-- Dumping data for table "tblanticipo_movs"
--

LOCK TABLES "tblanticipo_movs" WRITE;


UNLOCK TABLES;

--
-- Table structure for table "tblanticipos_cliente"
--

DROP TABLE IF EXISTS "tblanticipos_cliente";


CREATE TABLE "tblanticipos_cliente" (  "Id_Anticipo" INTEGER PRIMARY KEY AUTOINCREMENT,
  "Consecutivo" varchar(20) DEFAULT NULL,
  "Fecha" date NOT NULL,
  "CodigoCli" INTEGER NOT NULL,
  "Valor" NUMERIC NOT NULL,
  "Saldo" NUMERIC NOT NULL,
  "id_mediopago" INTEGER NOT NULL DEFAULT 0,
  "Concepto" varchar(200) DEFAULT NULL,
  "Id_Usuario" INTEGER DEFAULT NULL,
  "Estado" varchar(15) NOT NULL DEFAULT 'Vigente',
  "FechaCreacion" timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  "FechaMod" timestamp NULL DEFAULT NULL);


--
-- Dumping data for table "tblanticipos_cliente"
--

LOCK TABLES "tblanticipos_cliente" WRITE;


UNLOCK TABLES;

--
-- Table structure for table "tblarticulos"
--

DROP TABLE IF EXISTS "tblarticulos";


CREATE TABLE "tblarticulos" (
  "Items" INTEGER NOT NULL,
  "Codigo" varchar(25) DEFAULT NULL,
  "CodigoB" varchar(15) DEFAULT NULL,
  "Nombres_Articulo" varchar(150) DEFAULT NULL,
  "Id_Categoria" INTEGER DEFAULT NULL,
  "Id_Referencia" INTEGER DEFAULT NULL,
  "Existencia" float DEFAULT NULL,
  "Existencia_minima" float DEFAULT NULL,
  "Precio_Costo" NUMERIC DEFAULT NULL,
  "Precio_CostoComp" NUMERIC DEFAULT NULL,
  "Iva" float DEFAULT NULL,
  "Precio_Venta" NUMERIC DEFAULT NULL,
  "Precio_Venta2" NUMERIC DEFAULT NULL,
  "Precio_Venta3" NUMERIC DEFAULT NULL,
  "Fecha_Vencimiento" datetime DEFAULT NULL,
  "CodigoPro" INTEGER DEFAULT NULL,
  "Estante" varchar(10) DEFAULT NULL,
  "Flete" NUMERIC DEFAULT NULL,
  "ArticuloDe" varchar(10) DEFAULT NULL,
  "Ganancia" INTEGER DEFAULT NULL,
  "Sindescuento" INTEGER DEFAULT NULL,
  "Precio_Minimo" NUMERIC DEFAULT NULL,
  "PlanSepare" INTEGER DEFAULT NULL,
  "Servicio" INTEGER DEFAULT NULL,
  "Unidades" INTEGER DEFAULT NULL,
  "CuponDesc" INTEGER DEFAULT NULL,
  "Estado" INTEGER DEFAULT NULL,
  "FechaElim" datetime DEFAULT NULL,
  "FechaMod" datetime DEFAULT NULL,
  "unit_measure_id" INTEGER DEFAULT 70,
  "free_of_charge_indicator" INTEGER DEFAULT 0,
  "unidad_base" varchar(20) DEFAULT 'Unidad',
  "requiere_lote" INTEGER DEFAULT 0,
  "tiene_componentes" INTEGER DEFAULT 0,
  "Id_Etiqueta" INTEGER DEFAULT NULL,
  PRIMARY KEY ("Items"));


--
-- Dumping data for table "tblarticulos"
--

LOCK TABLES "tblarticulos" WRITE;


UNLOCK TABLES;

--
-- Table structure for table "tblarticulos2"
--

DROP TABLE IF EXISTS "tblarticulos2";


CREATE TABLE "tblarticulos2" (
  "Items" INTEGER NOT NULL,
  "Codigo" varchar(25) DEFAULT NULL,
  "CodigoB" varchar(15) DEFAULT NULL,
  "Nombres_Articulo" varchar(150) DEFAULT NULL,
  "Id_Categoria" INTEGER DEFAULT NULL,
  "Id_Referencia" INTEGER DEFAULT NULL,
  "Existencia" float DEFAULT NULL,
  "Existencia_minima" float DEFAULT NULL,
  "Precio_Costo" NUMERIC DEFAULT NULL,
  "Precio_CostoComp" NUMERIC DEFAULT NULL,
  "Iva" float DEFAULT NULL,
  "Precio_Venta" NUMERIC DEFAULT NULL,
  "Precio_Venta2" NUMERIC DEFAULT NULL,
  "Precio_Venta3" NUMERIC DEFAULT NULL,
  "Fecha_Vencimiento" datetime DEFAULT NULL,
  "CodigoPro" INTEGER DEFAULT NULL,
  "Estante" varchar(10) DEFAULT NULL,
  "Flete" NUMERIC DEFAULT NULL,
  "ArticuloDe" varchar(10) DEFAULT NULL,
  "Ganancia" INTEGER DEFAULT NULL,
  "Sindescuento" INTEGER DEFAULT NULL,
  "Precio_Minimo" NUMERIC DEFAULT NULL,
  "PlanSepare" INTEGER DEFAULT NULL,
  "Servicio" INTEGER DEFAULT NULL,
  "Unidades" INTEGER DEFAULT NULL,
  "CuponDesc" INTEGER DEFAULT NULL,
  "Estado" INTEGER DEFAULT NULL,
  "FechaElim" datetime DEFAULT NULL,
  "FechaMod" datetime DEFAULT NULL,
  "unit_measure_id" INTEGER DEFAULT 70,
  "free_of_charge_indicator" INTEGER DEFAULT 0,
  PRIMARY KEY ("Items"));


--
-- Dumping data for table "tblarticulos2"
--

LOCK TABLES "tblarticulos2" WRITE;


UNLOCK TABLES;

--
-- Table structure for table "tblauxiliarbanco"
--

DROP TABLE IF EXISTS "tblauxiliarbanco";


CREATE TABLE "tblauxiliarbanco" (
  "idAuxiliarBanco" INTEGER NOT NULL,
  "FechaCreacion" datetime DEFAULT NULL,
  "idBancos" INTEGER NOT NULL,
  "Detalle" varchar(100) NOT NULL,
  "Valor" NUMERIC NOT NULL,
  "NRecivo" INTEGER DEFAULT NULL,
  "NFactura" INTEGER DEFAULT NULL,
  "TipoMov" INTEGER DEFAULT NULL,
  "NRemision" INTEGER DEFAULT NULL
);


--
-- Dumping data for table "tblauxiliarbanco"
--

LOCK TABLES "tblauxiliarbanco" WRITE;


UNLOCK TABLES;

--
-- Table structure for table "tblauxiliares"
--

DROP TABLE IF EXISTS "tblauxiliares";


CREATE TABLE "tblauxiliares" (
  "Id_Auxiliar" INTEGER NOT NULL DEFAULT 0,
  "Año" INTEGER DEFAULT 0,
  "Fecha" timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "Mes" varchar(15) DEFAULT 'Enero',
  "Cuenta" varchar(50) DEFAULT '000',
  "Detalle" varchar(150) DEFAULT '-',
  "C_D" INTEGER DEFAULT 0,
  "Debe" NUMERIC DEFAULT 0.0000,
  "Haber" NUMERIC DEFAULT 0.0000,
  "Saldo" NUMERIC DEFAULT 0.0000,
  PRIMARY KEY ("Id_Auxiliar"));


--
-- Dumping data for table "tblauxiliares"
--

LOCK TABLES "tblauxiliares" WRITE;


UNLOCK TABLES;

--
-- Table structure for table "tblbancos"
--

DROP TABLE IF EXISTS "tblbancos";


CREATE TABLE "tblbancos" (  "idBancos" INTEGER PRIMARY KEY AUTOINCREMENT,
  "FechaCreacion" datetime DEFAULT NULL,
  "NumCuenta" varchar(50) NOT NULL,
  "NomCuenta" varchar(45) NOT NULL,
  "Predeterminada" INTEGER DEFAULT NULL,
  "Saldo" NUMERIC DEFAULT 0.0000,
  "Banco" varchar(50) DEFAULT '',
  "TipoCuenta" varchar(20) DEFAULT 'ahorros',
  "Activa" INTEGER DEFAULT 1);


--
-- Dumping data for table "tblbancos"
--

LOCK TABLES "tblbancos" WRITE;


UNLOCK TABLES;

--
-- Table structure for table "tblcajas"
--

DROP TABLE IF EXISTS "tblcajas";


CREATE TABLE "tblcajas" (  "Id_Caja" INTEGER PRIMARY KEY AUTOINCREMENT,
  "Nombre" varchar(50) NOT NULL,
  "Tipo" TEXT DEFAULT 'punto_venta',
  "Activa" INTEGER DEFAULT 1,
  "Saldo" NUMERIC DEFAULT 0.0000,
  "FechaCreacion" datetime DEFAULT CURRENT_TIMESTAMP);


--
-- Dumping data for table "tblcajas"
--

LOCK TABLES "tblcajas" WRITE;


UNLOCK TABLES;

--
-- Table structure for table "tblcategoria"
--

DROP TABLE IF EXISTS "tblcategoria";


CREATE TABLE "tblcategoria" (
  "Categoria" varchar(100) DEFAULT NULL,
  "Id_Categoria" INTEGER NOT NULL,
  PRIMARY KEY ("Id_Categoria")
);


--
-- Dumping data for table "tblcategoria"
--

LOCK TABLES "tblcategoria" WRITE;


UNLOCK TABLES;

--
-- Table structure for table "tblcategorias_gasto"
--

DROP TABLE IF EXISTS "tblcategorias_gasto";


CREATE TABLE "tblcategorias_gasto" (  "Id_Categoria" INTEGER PRIMARY KEY AUTOINCREMENT,
  "Nombre" varchar(50) NOT NULL,
  "Activa" INTEGER DEFAULT 1);


--
-- Dumping data for table "tblcategorias_gasto"
--

LOCK TABLES "tblcategorias_gasto" WRITE;


UNLOCK TABLES;

--
-- Table structure for table "tblcliente_retenciones"
--

DROP TABLE IF EXISTS "tblcliente_retenciones";


CREATE TABLE "tblcliente_retenciones" (  "Id" INTEGER PRIMARY KEY AUTOINCREMENT,
  "CodigoClien" INTEGER NOT NULL,
  "Id_Retencion" INTEGER NOT NULL,
  CONSTRAINT "fk_cliret_ret" FOREIGN KEY ("Id_Retencion") REFERENCES "tblretenciones" ("Id_Retencion") ON DELETE CASCADE
);


--
-- Dumping data for table "tblcliente_retenciones"
--

LOCK TABLES "tblcliente_retenciones" WRITE;


UNLOCK TABLES;

--
-- Table structure for table "tblclientes"
--

DROP TABLE IF EXISTS "tblclientes";


CREATE TABLE "tblclientes" (
  "CodigoClien" INTEGER NOT NULL,
  "Razon_Social" varchar(80) DEFAULT NULL,
  "Nit" varchar(15) DEFAULT NULL,
  "Direcion_R" varchar(50) DEFAULT NULL,
  "Nombres" varchar(20) DEFAULT NULL,
  "Apellidos" varchar(20) DEFAULT NULL,
  "Identificacion" INTEGER DEFAULT NULL,
  "Telefonos" varchar(100) DEFAULT NULL,
  "Direccion" varchar(50) DEFAULT NULL,
  "Nombre_C" varchar(50) DEFAULT NULL,
  "Apellidos_C" varchar(50) DEFAULT NULL,
  "Telefonos_C" varchar(50) DEFAULT NULL,
  "Direccion_C" varchar(50) DEFAULT NULL,
  "Cargo_C" varchar(50) DEFAULT NULL,
  "Fecha_Ingreso" datetime DEFAULT NULL,
  "CupoAutorizado" NUMERIC DEFAULT NULL,
  "Preciocosto" INTEGER DEFAULT NULL,
  "CodigoEmp" INTEGER DEFAULT NULL,
  "FechaCumple" datetime DEFAULT NULL,
  "Email" varchar(50) DEFAULT NULL,
  "Whatsapp" varchar(25) NOT NULL,
  "Termino" INTEGER DEFAULT NULL,
  "FacVenc" INTEGER DEFAULT NULL,
  "FechaMod" datetime DEFAULT NULL,
  "id_documento" INTEGER NOT NULL DEFAULT 2,
  "id_municipio" INTEGER unsigned DEFAULT NULL,
  "id_type_liability" INTEGER unsigned DEFAULT NULL,
  "id_type_organization" INTEGER unsigned DEFAULT NULL,
  "id_type_regime" INTEGER unsigned DEFAULT NULL,
  "retencion_modo" TEXT DEFAULT 'gross_up',
  "comportamiento" TEXT DEFAULT 'sin_datos',
  "dias_mora_promedio" INTEGER DEFAULT NULL,
  "cartera_castigada" INTEGER DEFAULT 0,
  "fecha_castigo" datetime DEFAULT NULL,
  "motivo_castigo" TEXT DEFAULT NULL,
  "motivo_detalle" varchar(255) DEFAULT NULL,
  "id_usuario_castigo" INTEGER DEFAULT NULL,
  "nota_cobranza" text DEFAULT NULL,
  "UltimoPrecio" INTEGER DEFAULT 0,
  "latitud" NUMERIC DEFAULT NULL,
  "longitud" NUMERIC DEFAULT NULL,
  "precision_gps_metros" INTEGER DEFAULT NULL,
  "gps_capturado_at" datetime DEFAULT NULL,
  PRIMARY KEY ("CodigoClien"));


--
-- Dumping data for table "tblclientes"
--

LOCK TABLES "tblclientes" WRITE;


UNLOCK TABLES;

--
-- Table structure for table "tblcomprobantediario"
--

DROP TABLE IF EXISTS "tblcomprobantediario";


CREATE TABLE "tblcomprobantediario" (
  "N_Comprobante" INTEGER NOT NULL DEFAULT 0,
  "Fecha" datetime DEFAULT NULL,
  "FacturaInicial" INTEGER DEFAULT 0,
  "FacturaFinal" INTEGER DEFAULT 0,
  "Acumulado" NUMERIC DEFAULT 0.0000,
  PRIMARY KEY ("N_Comprobante")
);


--
-- Dumping data for table "tblcomprobantediario"
--

LOCK TABLES "tblcomprobantediario" WRITE;


UNLOCK TABLES;

--
-- Table structure for table "tblconteo_detalle"
--

DROP TABLE IF EXISTS "tblconteo_detalle";


CREATE TABLE "tblconteo_detalle" (  "Id_Detalle" INTEGER PRIMARY KEY AUTOINCREMENT,
  "Id_Conteo" INTEGER NOT NULL,
  "Items" INTEGER NOT NULL,
  "Existencia_Sistema" float NOT NULL DEFAULT 0,
  "Existencia_Contada" float DEFAULT NULL,
  "Diferencia" float DEFAULT NULL,
  "Observacion" varchar(100) DEFAULT '');


--
-- Dumping data for table "tblconteo_detalle"
--

LOCK TABLES "tblconteo_detalle" WRITE;


UNLOCK TABLES;

--
-- Table structure for table "tblconteo_inventario"
--

DROP TABLE IF EXISTS "tblconteo_inventario";


CREATE TABLE "tblconteo_inventario" (  "Id_Conteo" INTEGER PRIMARY KEY AUTOINCREMENT,
  "Fecha" datetime NOT NULL,
  "Usuario" varchar(50) NOT NULL,
  "Observacion" varchar(255) DEFAULT '',
  "Tipo" varchar(20) DEFAULT 'Total',
  "Filtro_Categoria" INTEGER DEFAULT NULL,
  "Filtro_Proveedor" INTEGER DEFAULT NULL,
  "Total_Items" INTEGER DEFAULT 0,
  "Items_Contados" INTEGER DEFAULT 0,
  "Items_Con_Diferencia" INTEGER DEFAULT 0,
  "Estado" TEXT DEFAULT 'Abierto',
  "Fecha_Cierre" datetime DEFAULT NULL);


--
-- Dumping data for table "tblconteo_inventario"
--

LOCK TABLES "tblconteo_inventario" WRITE;


UNLOCK TABLES;

--
-- Table structure for table "tblconteodeinventario"
--

DROP TABLE IF EXISTS "tblconteodeinventario";


CREATE TABLE "tblconteodeinventario" (
  "Cod_ConteoInv" INTEGER NOT NULL,
  "FechaYHoraInicio" datetime DEFAULT NULL,
  "FechaYhoraFinalizar" datetime DEFAULT NULL,
  "EnConteo" INTEGER DEFAULT NULL
);


--
-- Dumping data for table "tblconteodeinventario"
--

LOCK TABLES "tblconteodeinventario" WRITE;


UNLOCK TABLES;

--
-- Table structure for table "tblcontrolcaja"
--

DROP TABLE IF EXISTS "tblcontrolcaja";


CREATE TABLE "tblcontrolcaja" (  "Cod_ControlCaja" INTEGER PRIMARY KEY AUTOINCREMENT,
  "Fecha" timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "ValorInicalCaja" NUMERIC DEFAULT 0.0000,
  "Villetes" NUMERIC DEFAULT 0.0000,
  "Monedas" NUMERIC DEFAULT 0.0000,
  "Cheques" NUMERIC DEFAULT 0.0000,
  "ValorTotal" NUMERIC DEFAULT 0.0000,
  "SaldoEnLibros" NUMERIC DEFAULT 0.0000,
  "Diferencia" NUMERIC DEFAULT 0.0000,
  "Base" NUMERIC DEFAULT 0.0000,
  "Estado" INTEGER DEFAULT NULL,
  "VContado" NUMERIC DEFAULT 0.0000,
  "VCredito" NUMERIC DEFAULT 0.0000,
  "Pagos" NUMERIC DEFAULT 0.0000,
  "Egresos" NUMERIC DEFAULT 0.0000,
  "VInventario" NUMERIC DEFAULT 0.0000,
  "Id_Usuario" INTEGER DEFAULT NULL,
  "FechaCierre" datetime DEFAULT NULL);


--
-- Dumping data for table "tblcontrolcaja"
--

LOCK TABLES "tblcontrolcaja" WRITE;


UNLOCK TABLES;

--
-- Table structure for table "tblcotizaciones"
--

DROP TABLE IF EXISTS "tblcotizaciones";


CREATE TABLE "tblcotizaciones" (  "id_cotizacion" INTEGER PRIMARY KEY AUTOINCREMENT,
  "codigo_cli" INTEGER NOT NULL,
  "nombre_cliente" varchar(50) NOT NULL,
  "telefono_cli" varchar(25) NOT NULL,
  "fecha" date NOT NULL,
  "termino" INTEGER NOT NULL,
  "dias" INTEGER NOT NULL,
  "total_factura" double NOT NULL,
  "fecha_hora_creado" timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP);


--
-- Dumping data for table "tblcotizaciones"
--

LOCK TABLES "tblcotizaciones" WRITE;


UNLOCK TABLES;

--
-- Table structure for table "tblcuadrecaja"
--

DROP TABLE IF EXISTS "tblcuadrecaja";


CREATE TABLE "tblcuadrecaja" (  "Id_CuadreCaja" INTEGER PRIMARY KEY AUTOINCREMENT,
  "Fecha" datetime DEFAULT NULL,
  "FacturaN" INTEGER DEFAULT 0,
  "TipoDoc" varchar(20) DEFAULT NULL,
  "Descripcion" varchar(80) DEFAULT NULL,
  "Valor" NUMERIC DEFAULT 0.0000);


--
-- Dumping data for table "tblcuadrecaja"
--

LOCK TABLES "tblcuadrecaja" WRITE;


UNLOCK TABLES;

--
-- Table structure for table "tblcuentas"
--

DROP TABLE IF EXISTS "tblcuentas";


CREATE TABLE "tblcuentas" (
  "N_Cuenta" varchar(20) NOT NULL,
  "Cuenta" varchar(50) DEFAULT NULL,
  "Parciales" NUMERIC DEFAULT NULL,
  "Debe" NUMERIC DEFAULT NULL,
  "Haber" NUMERIC DEFAULT NULL,
  "Saldo" NUMERIC DEFAULT NULL,
  "FechaMod" datetime DEFAULT NULL,
  PRIMARY KEY ("N_Cuenta")
);


--
-- Dumping data for table "tblcuentas"
--

LOCK TABLES "tblcuentas" WRITE;


UNLOCK TABLES;

--
-- Table structure for table "tbldatosempresa"
--

DROP TABLE IF EXISTS "tbldatosempresa";


CREATE TABLE "tbldatosempresa" (  "Id_Empresa" INTEGER PRIMARY KEY AUTOINCREMENT,
  "Empresa" varchar(50) DEFAULT '-',
  "Propietario" varchar(50) DEFAULT NULL,
  "Telefono" varchar(50) DEFAULT '0',
  "Direccion" varchar(80) DEFAULT '-',
  "Nit" varchar(50) DEFAULT '0',
  "Detalle" text DEFAULT '-',
  "AgentesRet" varchar(2) DEFAULT 'No',
  "Resolucion" varchar(20) DEFAULT '-',
  "FechaR" timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "Rango" varchar(20) DEFAULT '0',
  "Rango2" varchar(20) DEFAULT NULL,
  "vs" varchar(50) DEFAULT NULL,
  "Porcentajes" varchar(2) DEFAULT NULL,
  "Regimen" varchar(15) DEFAULT 'Común',
  "CajaRegistradora" varchar(50) DEFAULT NULL,
  "Configuracion" varchar(50) DEFAULT NULL,
  "IniciarFacturaEn" INTEGER DEFAULT 0,
  "Caja" INTEGER DEFAULT 0,
  "IvaIncluido" INTEGER DEFAULT NULL,
  "Prefijo" varchar(4) DEFAULT NULL,
  "Status" INTEGER DEFAULT 1,
  "email" varchar(100) DEFAULT NULL,
  "api_token" text DEFAULT NULL,
  "email_factelect" varchar(100) DEFAULT NULL,
  "password_factelect" varchar(100) DEFAULT NULL,
  "Logo" varchar(255) DEFAULT NULL,
  "version_sql_aplicada" varchar(20) DEFAULT NULL,
  "modulo_financiaciones" INTEGER NOT NULL DEFAULT 0,
  "tasa_mora_mensual" NUMERIC NOT NULL DEFAULT 0.00,
  "modulo_anticipos" INTEGER NOT NULL DEFAULT 0,
  "fe_company_id" INTEGER DEFAULT NULL,
  "fe_company_id_at" datetime DEFAULT NULL,
  "ResolucionVence" date DEFAULT NULL,
  "ResolucionTextoCompleto" text DEFAULT NULL,
  "ResolucionSyncAt" datetime DEFAULT NULL,
  "ResolucionRemaining" INTEGER DEFAULT NULL,
  "ResolucionUsagePct" NUMERIC DEFAULT NULL,
  "ResolucionNextConsec" INTEGER DEFAULT NULL,
  "ResolucionTechnicalKey" varchar(150) DEFAULT NULL);


--
-- Dumping data for table "tbldatosempresa"
--

LOCK TABLES "tbldatosempresa" WRITE;


UNLOCK TABLES;

--
-- Table structure for table "tbldetalle_pedido"
--

DROP TABLE IF EXISTS "tbldetalle_pedido";


CREATE TABLE "tbldetalle_pedido" (  "Id_DetallePedido" INTEGER PRIMARY KEY AUTOINCREMENT,
  "Pedido_N" INTEGER DEFAULT NULL,
  "Items" INTEGER DEFAULT NULL,
  "Cantidad" float DEFAULT NULL,
  "PrecioC" NUMERIC DEFAULT NULL,
  "PrecioV" NUMERIC DEFAULT NULL,
  "Impuesto" NUMERIC DEFAULT NULL,
  "Subtotal" NUMERIC DEFAULT NULL,
  "Dev" float DEFAULT NULL,
  "Id_Presentacion" INTEGER DEFAULT NULL,
  "IvaPct" float DEFAULT 0,
  "CostoSinIva" NUMERIC DEFAULT 0.0000,
  "CostoConIva" NUMERIC DEFAULT 0.0000,
  "FleteUnit" NUMERIC DEFAULT 0.0000,
  "CostoFinal" NUMERIC DEFAULT 0.0000,
  "CostoAnterior" NUMERIC DEFAULT 0.0000,
  "CostoPromedio" NUMERIC DEFAULT 0.0000);


--
-- Dumping data for table "tbldetalle_pedido"
--

LOCK TABLES "tbldetalle_pedido" WRITE;


UNLOCK TABLES;

--
-- Table structure for table "tbldetalle_venta"
--

DROP TABLE IF EXISTS "tbldetalle_venta";


CREATE TABLE "tbldetalle_venta" (  "Id_DetalleVenta" INTEGER PRIMARY KEY AUTOINCREMENT,
  "Factura_N" INTEGER DEFAULT 0,
  "Factura_NTemp" varchar(100) DEFAULT NULL,
  "Items" INTEGER DEFAULT 0,
  "DescripcionTemp" varchar(500) DEFAULT NULL,
  "Cantidad" float DEFAULT 0,
  "PrecioC" NUMERIC DEFAULT 0.0000,
  "PrecioV" NUMERIC DEFAULT 0.0000,
  "Impuesto" NUMERIC DEFAULT 0.0000,
  "Subtotal" NUMERIC DEFAULT 0.0000,
  "Dev" float DEFAULT 0,
  "IVA" INTEGER DEFAULT NULL,
  "Descuento" NUMERIC DEFAULT 0.0000,
  "Entregado" varchar(1) DEFAULT 'S',
  "Cant_Mod" INTEGER DEFAULT NULL,
  "PrecioV_Mod" NUMERIC DEFAULT 0.0000,
  "PrecioC_Mod" NUMERIC DEFAULT 0.0000,
  "fecha_entrega" date DEFAULT NULL,
  "Id_Presentacion" INTEGER DEFAULT NULL);


--
-- Dumping data for table "tbldetalle_venta"
--

LOCK TABLES "tbldetalle_venta" WRITE;


UNLOCK TABLES;

--
-- Table structure for table "tbldetallecomprobantediario"
--

DROP TABLE IF EXISTS "tbldetallecomprobantediario";


CREATE TABLE "tbldetallecomprobantediario" (  "Id_DetalleComproDiario" INTEGER PRIMARY KEY AUTOINCREMENT,
  "N_Comprobante" INTEGER DEFAULT 0,
  "Concepto" varchar(50) DEFAULT NULL,
  "Valor" NUMERIC DEFAULT 0.0000);


--
-- Dumping data for table "tbldetallecomprobantediario"
--

LOCK TABLES "tbldetallecomprobantediario" WRITE;


UNLOCK TABLES;

--
-- Table structure for table "tbldetalleorden"
--

DROP TABLE IF EXISTS "tbldetalleorden";


CREATE TABLE "tbldetalleorden" (  "Id_Detalle_Orden" INTEGER PRIMARY KEY AUTOINCREMENT,
  "Orden_N" INTEGER DEFAULT 0,
  "Items" INTEGER DEFAULT 0,
  "Descripcion" varchar(200) DEFAULT NULL,
  "Cantidad" double DEFAULT 0,
  "ValorUnit" NUMERIC DEFAULT 0.0000,
  "ValorTotal" NUMERIC DEFAULT 0.0000);


--
-- Dumping data for table "tbldetalleorden"
--

LOCK TABLES "tbldetalleorden" WRITE;


UNLOCK TABLES;

--
-- Table structure for table "tbldetalleorden2"
--

DROP TABLE IF EXISTS "tbldetalleorden2";


CREATE TABLE "tbldetalleorden2" (  "Cod_DetalleOrden2" INTEGER PRIMARY KEY AUTOINCREMENT,
  "Orden_N" INTEGER DEFAULT 0,
  "Items" INTEGER DEFAULT 0,
  "Id_Articulos" double DEFAULT 0,
  "Cantidad" INTEGER DEFAULT 0,
  "valorUnit" NUMERIC DEFAULT 0.0000,
  "Subtotal" NUMERIC DEFAULT 0.0000);


--
-- Dumping data for table "tbldetalleorden2"
--

LOCK TABLES "tbldetalleorden2" WRITE;


UNLOCK TABLES;

--
-- Table structure for table "tbldetalleorden3"
--

DROP TABLE IF EXISTS "tbldetalleorden3";


CREATE TABLE "tbldetalleorden3" (  "Id_DetalleOrden3" INTEGER PRIMARY KEY AUTOINCREMENT,
  "Orden_N" INTEGER DEFAULT 0,
  "Items" INTEGER DEFAULT 0,
  "CodigoEmp" INTEGER DEFAULT 0,
  "Porcentaje" INTEGER DEFAULT 0,
  "Utilidad" NUMERIC DEFAULT 0.0000);


--
-- Dumping data for table "tbldetalleorden3"
--

LOCK TABLES "tbldetalleorden3" WRITE;


UNLOCK TABLES;

--
-- Table structure for table "tbldetalleplansepare"
--

DROP TABLE IF EXISTS "tbldetalleplansepare";


CREATE TABLE "tbldetalleplansepare" (  "Id_DetallePlanSepare" INTEGER PRIMARY KEY AUTOINCREMENT,
  "Id_PlanSepare" INTEGER DEFAULT 0,
  "Id_Producto" INTEGER DEFAULT 0,
  "Cantidad" INTEGER DEFAULT 0,
  "Valor" NUMERIC DEFAULT 0.0000,
  "PCosto" NUMERIC DEFAULT 0.0000,
  "Subtotal" NUMERIC DEFAULT 0.0000);


--
-- Dumping data for table "tbldetalleplansepare"
--

LOCK TABLES "tbldetalleplansepare" WRITE;


UNLOCK TABLES;

--
-- Table structure for table "tbldevolucion_ventas"
--

DROP TABLE IF EXISTS "tbldevolucion_ventas";


CREATE TABLE "tbldevolucion_ventas" (  "IdDevolVent" INTEGER PRIMARY KEY AUTOINCREMENT,
  "Id_DetalleVenta" INTEGER NOT NULL,
  "valor_dev" double NOT NULL,
  "caja" varchar(1) NOT NULL,
  "fecha_fact" date NOT NULL,
  "fecha_mod" datetime NOT NULL);


--
-- Dumping data for table "tbldevolucion_ventas"
--

LOCK TABLES "tbldevolucion_ventas" WRITE;


UNLOCK TABLES;

--
-- Table structure for table "tbldocumentos"
--

DROP TABLE IF EXISTS "tbldocumentos";


CREATE TABLE "tbldocumentos" (
  "Id_Documentos" INTEGER NOT NULL DEFAULT 0,
  "N_Documento" INTEGER DEFAULT 0,
  "Tipo_Documento" varchar(15) DEFAULT 'Crédito',
  "Descripcion" varchar(150) DEFAULT '-',
  "Fecha" timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "Valor" NUMERIC DEFAULT 0.0000,
  "Estado" varchar(20) DEFAULT 'Abierto',
  "Cuenta" varchar(15) DEFAULT NULL,
  PRIMARY KEY ("Id_Documentos"));


--
-- Dumping data for table "tbldocumentos"
--

LOCK TABLES "tbldocumentos" WRITE;


UNLOCK TABLES;

--
-- Table structure for table "tblegresos"
--

DROP TABLE IF EXISTS "tblegresos";


CREATE TABLE "tblegresos" (  "Id_Egresos" INTEGER PRIMARY KEY AUTOINCREMENT,
  "N_Comprobante" INTEGER DEFAULT 0,
  "Fecha" timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "Orden" varchar(50) DEFAULT '-',
  "Concepto" varchar(90) DEFAULT NULL,
  "Suma" varchar(100) DEFAULT '-',
  "Valor" NUMERIC DEFAULT 0.0000,
  "Descuento" NUMERIC DEFAULT 0.0000,
  "Estado" varchar(15) DEFAULT NULL,
  "Cuentas" varchar(80) DEFAULT NULL,
  "FactN" varchar(15) DEFAULT NULL,
  "CodigoPro" INTEGER DEFAULT 0,
  "NFacturaAnt" varchar(20) DEFAULT NULL,
  "ValorFact" NUMERIC DEFAULT 0.0000,
  "Saldoact" NUMERIC DEFAULT 0.0000,
  "Cedula" varchar(20) DEFAULT NULL,
  "TipoPago" INTEGER DEFAULT NULL,
  "categoria_gasto" varchar(50) DEFAULT 'Otros',
  "id_usuario" INTEGER DEFAULT NULL,
  "id_mediopago" INTEGER NOT NULL DEFAULT 0);


--
-- Dumping data for table "tblegresos"
--

LOCK TABLES "tblegresos" WRITE;


UNLOCK TABLES;

--
-- Table structure for table "tblempleados"
--

DROP TABLE IF EXISTS "tblempleados";


CREATE TABLE "tblempleados" (
  "CodigoEmp" INTEGER NOT NULL DEFAULT 0,
  "Nombres" varchar(50) DEFAULT '-',
  "Apellidos" varchar(50) DEFAULT '-',
  "Cedula" varchar(50) DEFAULT '-',
  "Telefono" varchar(50) DEFAULT '-',
  "Direccion" varchar(50) DEFAULT '-',
  "FechaIngr" timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "Cod_Entidad" INTEGER DEFAULT 0,
  "Valor" NUMERIC DEFAULT 0.0000,
  "SueldoBasico" NUMERIC DEFAULT 0.0000,
  "Cargo" varchar(50) DEFAULT '-',
  "Pensión" NUMERIC DEFAULT 0.0000,
  "TipoEmpleado" INTEGER DEFAULT 0,
  "Vinculado" varchar(2) DEFAULT NULL,
  "Id_Usuario" INTEGER DEFAULT 0,
  PRIMARY KEY ("CodigoEmp"));


--
-- Dumping data for table "tblempleados"
--

LOCK TABLES "tblempleados" WRITE;


UNLOCK TABLES;

--
-- Table structure for table "tblentidades"
--

DROP TABLE IF EXISTS "tblentidades";


CREATE TABLE "tblentidades" (  "Id_Entidades" INTEGER PRIMARY KEY AUTOINCREMENT,
  "Entidad" varchar(50) DEFAULT NULL);


--
-- Dumping data for table "tblentidades"
--

LOCK TABLES "tblentidades" WRITE;


UNLOCK TABLES;

--
-- Table structure for table "tblentregaarticulos"
--

DROP TABLE IF EXISTS "tblentregaarticulos";


CREATE TABLE "tblentregaarticulos" (  "idEntregaArt" INTEGER PRIMARY KEY AUTOINCREMENT,
  "Items" INTEGER NOT NULL,
  "FechaEntrega" datetime DEFAULT NULL,
  "IDDetalleVentaArt" INTEGER NOT NULL,
  "Concepto" varchar(45) NOT NULL,
  "Valido" INTEGER DEFAULT NULL);


--
-- Dumping data for table "tblentregaarticulos"
--

LOCK TABLES "tblentregaarticulos" WRITE;


UNLOCK TABLES;

--
-- Table structure for table "tbletiquetas"
--

DROP TABLE IF EXISTS "tbletiquetas";


CREATE TABLE "tbletiquetas" (  "Id_Etiqueta" INTEGER PRIMARY KEY AUTOINCREMENT,
  "Nombre" varchar(80) NOT NULL,
  "Descripcion" varchar(255) DEFAULT NULL,
  "Color" varchar(7) DEFAULT '#7c3aed',
  "Activa" INTEGER DEFAULT 1,
  "Fecha_Creacion" timestamp NULL DEFAULT CURRENT_TIMESTAMP);


--
-- Dumping data for table "tbletiquetas"
--

LOCK TABLES "tbletiquetas" WRITE;


UNLOCK TABLES;

--
-- Table structure for table "tblfacturasanteriores"
--

DROP TABLE IF EXISTS "tblfacturasanteriores";


CREATE TABLE "tblfacturasanteriores" (  "ID_FactAnteriores" INTEGER PRIMARY KEY AUTOINCREMENT,
  "FacturaN" varchar(50) DEFAULT NULL,
  "Fecha" datetime DEFAULT NULL,
  "Dias" INTEGER DEFAULT NULL,
  "Valor" NUMERIC DEFAULT NULL,
  "Saldo" NUMERIC DEFAULT NULL,
  "CodigoCli" INTEGER DEFAULT NULL,
  "FechaMod" datetime DEFAULT NULL);


--
-- Dumping data for table "tblfacturasanteriores"
--

LOCK TABLES "tblfacturasanteriores" WRITE;


UNLOCK TABLES;

--
-- Table structure for table "tblfacturasanterioresproveedor"
--

DROP TABLE IF EXISTS "tblfacturasanterioresproveedor";


CREATE TABLE "tblfacturasanterioresproveedor" (  "ID_FactAnterioresP" INTEGER PRIMARY KEY AUTOINCREMENT,
  "FacturaN" varchar(50) DEFAULT NULL,
  "Fecha" datetime DEFAULT NULL,
  "Dias" INTEGER DEFAULT 0,
  "Descuento" NUMERIC DEFAULT 0.0000,
  "IVA" NUMERIC DEFAULT 0.0000,
  "Subtotal" NUMERIC DEFAULT 0.0000,
  "Valor" NUMERIC DEFAULT 0.0000,
  "Saldo" NUMERIC DEFAULT 0.0000,
  "CodigoProv" INTEGER DEFAULT 0);


--
-- Dumping data for table "tblfacturasanterioresproveedor"
--

LOCK TABLES "tblfacturasanterioresproveedor" WRITE;


UNLOCK TABLES;

--
-- Table structure for table "tblfamilia_items"
--

DROP TABLE IF EXISTS "tblfamilia_items";


CREATE TABLE "tblfamilia_items" (  "Id_Familia_Item" INTEGER PRIMARY KEY AUTOINCREMENT,
  "Id_Familia" INTEGER NOT NULL,
  "Items" INTEGER NOT NULL,
  "Factor" NUMERIC NOT NULL DEFAULT 1.0000,
  "Es_Base" INTEGER DEFAULT 0,
  CONSTRAINT "fk_fi_familia" FOREIGN KEY ("Id_Familia") REFERENCES "tblfamilias_producto" ("Id_Familia") ON DELETE CASCADE
);


--
-- Dumping data for table "tblfamilia_items"
--

LOCK TABLES "tblfamilia_items" WRITE;


UNLOCK TABLES;

--
-- Table structure for table "tblfamilias_producto"
--

DROP TABLE IF EXISTS "tblfamilias_producto";


CREATE TABLE "tblfamilias_producto" (  "Id_Familia" INTEGER PRIMARY KEY AUTOINCREMENT,
  "Nombre" varchar(100) NOT NULL,
  "Descripcion" varchar(255) DEFAULT NULL,
  "Activa" INTEGER DEFAULT 1,
  "Fecha_Creacion" timestamp NULL DEFAULT CURRENT_TIMESTAMP);


--
-- Dumping data for table "tblfamilias_producto"
--

LOCK TABLES "tblfamilias_producto" WRITE;


UNLOCK TABLES;

--
-- Table structure for table "tblfinanciacion_cuotas"
--

DROP TABLE IF EXISTS "tblfinanciacion_cuotas";


CREATE TABLE "tblfinanciacion_cuotas" (  "Id_Cuota" INTEGER PRIMARY KEY AUTOINCREMENT,
  "Id_Financiacion" INTEGER NOT NULL,
  "NumCuota" INTEGER NOT NULL,
  "FechaVencimiento" date NOT NULL,
  "ValorCuota" NUMERIC NOT NULL DEFAULT 0.00,
  "ValorPagado" NUMERIC NOT NULL DEFAULT 0.00,
  "Saldo" NUMERIC NOT NULL DEFAULT 0.00,
  "Estado" varchar(15) NOT NULL DEFAULT 'Pendiente',
  "FechaUltimoPago" date DEFAULT NULL);


--
-- Dumping data for table "tblfinanciacion_cuotas"
--

LOCK TABLES "tblfinanciacion_cuotas" WRITE;


UNLOCK TABLES;

--
-- Table structure for table "tblfinanciacion_pagos"
--

DROP TABLE IF EXISTS "tblfinanciacion_pagos";


CREATE TABLE "tblfinanciacion_pagos" (  "Id_FinancPago" INTEGER PRIMARY KEY AUTOINCREMENT,
  "Id_Cuota" INTEGER NOT NULL,
  "Id_Financiacion" INTEGER NOT NULL,
  "Id_Pagos" INTEGER DEFAULT NULL,
  "Fecha" date NOT NULL,
  "Valor" NUMERIC NOT NULL,
  "id_mediopago" INTEGER NOT NULL DEFAULT 0,
  "Id_Usuario" INTEGER DEFAULT NULL,
  "Estado" varchar(10) NOT NULL DEFAULT 'Valida',
  "FechaCreacion" timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  "EsInteresMora" INTEGER NOT NULL DEFAULT 0);


--
-- Dumping data for table "tblfinanciacion_pagos"
--

LOCK TABLES "tblfinanciacion_pagos" WRITE;


UNLOCK TABLES;

--
-- Table structure for table "tblfinanciaciones"
--

DROP TABLE IF EXISTS "tblfinanciaciones";


CREATE TABLE "tblfinanciaciones" (  "Id_Financiacion" INTEGER PRIMARY KEY AUTOINCREMENT,
  "Consecutivo" varchar(20) DEFAULT NULL,
  "Fecha" date NOT NULL,
  "Codigo" INTEGER NOT NULL,
  "Descripcion" varchar(300) DEFAULT NULL,
  "MontoTotal" NUMERIC NOT NULL DEFAULT 0.00,
  "CuotaInicial" NUMERIC NOT NULL DEFAULT 0.00,
  "MontoFinanciado" NUMERIC NOT NULL DEFAULT 0.00,
  "NumCuotas" INTEGER NOT NULL DEFAULT 1,
  "FrecuenciaDias" INTEGER NOT NULL DEFAULT 30,
  "FechaPrimeraCuota" date DEFAULT NULL,
  "Factura_N" INTEGER DEFAULT NULL,
  "Id_Usuario" INTEGER DEFAULT NULL,
  "Estado" varchar(15) NOT NULL DEFAULT 'Activa',
  "Comentario" text DEFAULT NULL,
  "FechaCreacion" timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  "FechaMod" timestamp NULL DEFAULT NULL);


--
-- Dumping data for table "tblfinanciaciones"
--

LOCK TABLES "tblfinanciaciones" WRITE;


UNLOCK TABLES;

--
-- Table structure for table "tblformulario"
--

DROP TABLE IF EXISTS "tblformulario";


CREATE TABLE "tblformulario" (  "Id_form" INTEGER PRIMARY KEY AUTOINCREMENT,
  "Formulario" varchar(100) DEFAULT NULL,
  "PosX" float DEFAULT 0,
  "PoxY" float DEFAULT 0,
  "Alto" float DEFAULT 0,
  "Ancho" float DEFAULT 0);


--
-- Dumping data for table "tblformulario"
--

LOCK TABLES "tblformulario" WRITE;


UNLOCK TABLES;

--
-- Table structure for table "tblkardex"
--

DROP TABLE IF EXISTS "tblkardex";


CREATE TABLE "tblkardex" (  "Id_kardex" INTEGER PRIMARY KEY AUTOINCREMENT,
  "Fecha" timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "Mes" varchar(15) DEFAULT 'Enero',
  "Items" INTEGER DEFAULT 0,
  "Detalle" varchar(260) DEFAULT NULL,
  "C_D" INTEGER DEFAULT 0,
  "Cant_Ent" float DEFAULT 0,
  "Cost_Ent" NUMERIC DEFAULT 0.0000,
  "Cant_Sal" float DEFAULT 0,
  "Cost_Sal" NUMERIC DEFAULT 0.0000,
  "Cant_Saldo" float DEFAULT 0,
  "Cost_Saldo" NUMERIC DEFAULT 0.0000,
  "Cost_Unit" NUMERIC DEFAULT 0.0000);


--
-- Dumping data for table "tblkardex"
--

LOCK TABLES "tblkardex" WRITE;


UNLOCK TABLES;

--
-- Table structure for table "tblmedios_pago"
--

DROP TABLE IF EXISTS "tblmedios_pago";


CREATE TABLE "tblmedios_pago" (
  "id_mediopago" INTEGER NOT NULL,
  "nombre_medio" varchar(40) NOT NULL,
  "payment_method_id" INTEGER DEFAULT NULL,
  PRIMARY KEY ("id_mediopago")
);


--
-- Dumping data for table "tblmedios_pago"
--

LOCK TABLES "tblmedios_pago" WRITE;


UNLOCK TABLES;

--
-- Table structure for table "tblmeses"
--

DROP TABLE IF EXISTS "tblmeses";


CREATE TABLE "tblmeses" (
  "N_Mes" INTEGER NOT NULL DEFAULT 0,
  "Mes" varchar(15) DEFAULT NULL,
  PRIMARY KEY ("N_Mes")
);


--
-- Dumping data for table "tblmeses"
--

LOCK TABLES "tblmeses" WRITE;


UNLOCK TABLES;

--
-- Table structure for table "tblmov_banco"
--

DROP TABLE IF EXISTS "tblmov_banco";


CREATE TABLE "tblmov_banco" (  "Id_Mov" INTEGER PRIMARY KEY AUTOINCREMENT,
  "Id_Cuenta" INTEGER NOT NULL,
  "Fecha" datetime DEFAULT CURRENT_TIMESTAMP,
  "Tipo" TEXT NOT NULL,
  "Valor" NUMERIC NOT NULL,
  "Descripcion" varchar(255) DEFAULT '',
  "Referencia" varchar(50) DEFAULT '',
  "Id_Usuario" INTEGER DEFAULT 0,
  "Id_Caja_Origen" INTEGER DEFAULT NULL,
  "Id_Caja_Destino" INTEGER DEFAULT NULL);


--
-- Dumping data for table "tblmov_banco"
--

LOCK TABLES "tblmov_banco" WRITE;


UNLOCK TABLES;

--
-- Table structure for table "tblmov_caja"
--

DROP TABLE IF EXISTS "tblmov_caja";


CREATE TABLE "tblmov_caja" (  "Id_Mov" INTEGER PRIMARY KEY AUTOINCREMENT,
  "Id_Sesion" INTEGER DEFAULT NULL,
  "Id_Caja_Origen" INTEGER DEFAULT NULL,
  "Id_Caja_Destino" INTEGER DEFAULT NULL,
  "Id_Usuario" INTEGER NOT NULL,
  "Fecha" datetime DEFAULT CURRENT_TIMESTAMP,
  "Valor" NUMERIC NOT NULL,
  "Tipo" TEXT NOT NULL,
  "Descripcion" varchar(255) DEFAULT '');


--
-- Dumping data for table "tblmov_caja"
--

LOCK TABLES "tblmov_caja" WRITE;


UNLOCK TABLES;

--
-- Table structure for table "tblmovimiento"
--

DROP TABLE IF EXISTS "tblmovimiento";


CREATE TABLE "tblmovimiento" (  "ID_Asi" INTEGER PRIMARY KEY AUTOINCREMENT,
  "Movimiento_N" INTEGER DEFAULT 0,
  "Fecha" timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "Mes" INTEGER DEFAULT 0,
  "Año" INTEGER DEFAULT 0,
  "Cuenta" varchar(50) DEFAULT '0',
  "Valor" NUMERIC DEFAULT 0.0000,
  "En" varchar(10) DEFAULT NULL,
  "Items" INTEGER DEFAULT 0,
  "Id_TipoMoviento" INTEGER DEFAULT 0);


--
-- Dumping data for table "tblmovimiento"
--

LOCK TABLES "tblmovimiento" WRITE;


UNLOCK TABLES;

--
-- Table structure for table "tblmovimientos_distribucion"
--

DROP TABLE IF EXISTS "tblmovimientos_distribucion";


CREATE TABLE "tblmovimientos_distribucion" (  "Id_Mov" INTEGER PRIMARY KEY AUTOINCREMENT,
  "Fecha" datetime DEFAULT CURRENT_TIMESTAMP,
  "Id_Usuario" INTEGER DEFAULT 0,
  "Items_Origen" INTEGER NOT NULL,
  "Items_Destino" INTEGER NOT NULL,
  "Cant_Origen" NUMERIC NOT NULL,
  "Cant_Destino" NUMERIC NOT NULL,
  "Factor_Origen" NUMERIC NOT NULL,
  "Factor_Destino" NUMERIC NOT NULL,
  "Motivo" TEXT DEFAULT 'automatico',
  "Factura_N" INTEGER DEFAULT NULL,
  "Comentario" varchar(255) DEFAULT NULL);


--
-- Dumping data for table "tblmovimientos_distribucion"
--

LOCK TABLES "tblmovimientos_distribucion" WRITE;


UNLOCK TABLES;

--
-- Table structure for table "tblnotas_articulo"
--

DROP TABLE IF EXISTS "tblnotas_articulo";


CREATE TABLE "tblnotas_articulo" (  "Id_Nota" INTEGER PRIMARY KEY AUTOINCREMENT,
  "Fecha" timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  "Items" INTEGER NOT NULL,
  "Tipo" TEXT NOT NULL,
  "Concepto" varchar(30) NOT NULL,
  "Descripcion" varchar(500) DEFAULT NULL,
  "Cantidad" NUMERIC NOT NULL,
  "Valor_Unitario" NUMERIC DEFAULT 0.0000,
  "Id_Usuario" INTEGER DEFAULT 0,
  "Id_Lote" INTEGER DEFAULT NULL,
  "Estado" varchar(10) NOT NULL DEFAULT 'Valida',
  "Anulada_Por" INTEGER DEFAULT NULL,
  "Fecha_Anulacion" datetime DEFAULT NULL,
  "Motivo_Anulacion" varchar(200) DEFAULT NULL);


--
-- Dumping data for table "tblnotas_articulo"
--

LOCK TABLES "tblnotas_articulo" WRITE;


UNLOCK TABLES;

--
-- Table structure for table "tblordenproduccion"
--

DROP TABLE IF EXISTS "tblordenproduccion";


CREATE TABLE "tblordenproduccion" (
  "Orden_N" INTEGER NOT NULL DEFAULT 0,
  "Fecha" timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "N_Mes" INTEGER DEFAULT 0,
  "Año" INTEGER DEFAULT 0,
  "Tipo" varchar(20) DEFAULT 'Cont',
  "Dias" INTEGER DEFAULT 0,
  "Id_Cliente" INTEGER DEFAULT 0,
  "A_nombre" varchar(70) DEFAULT '-',
  "Identificacion" varchar(20) DEFAULT NULL,
  "Direccion" varchar(50) DEFAULT '-',
  "Telefono" varchar(50) DEFAULT '0',
  "Iva" NUMERIC DEFAULT 0.0000,
  "Total" NUMERIC DEFAULT 0.0000,
  "Utilidad" NUMERIC DEFAULT 0.0000,
  "Obervaciones" text DEFAULT NULL,
  PRIMARY KEY ("Orden_N"));


--
-- Dumping data for table "tblordenproduccion"
--

LOCK TABLES "tblordenproduccion" WRITE;


UNLOCK TABLES;

--
-- Table structure for table "tblpagos"
--

DROP TABLE IF EXISTS "tblpagos";


CREATE TABLE "tblpagos" (  "Id_Pagos" INTEGER PRIMARY KEY AUTOINCREMENT,
  "RecCajaN" INTEGER DEFAULT NULL,
  "Codigo" INTEGER DEFAULT NULL,
  "Fact_N" INTEGER DEFAULT NULL,
  "ValorPago" NUMERIC DEFAULT NULL,
  "Fecha" datetime DEFAULT NULL,
  "DetallePago" varchar(200) DEFAULT NULL,
  "ValorFact" NUMERIC DEFAULT NULL,
  "SaldoAct" NUMERIC DEFAULT NULL,
  "Descuento" double DEFAULT NULL,
  "Retencion" NUMERIC DEFAULT NULL,
  "IVARetenido" NUMERIC DEFAULT NULL,
  "Estado" varchar(10) DEFAULT NULL,
  "Afectada" varchar(50) DEFAULT NULL,
  "id_mediopago" INTEGER NOT NULL,
  "Cuentas" varchar(80) DEFAULT NULL,
  "SaldoTotal" NUMERIC DEFAULT NULL,
  "NFactAnt" varchar(15) DEFAULT NULL,
  "Nfact_electronica" varchar(20) NOT NULL,
  "Fact_Plan" INTEGER DEFAULT NULL,
  "Cedula" varchar(20) DEFAULT NULL,
  "RecibidoDe" varchar(60) DEFAULT NULL,
  "NRemision" INTEGER DEFAULT NULL,
  "FechaMod" datetime DEFAULT NULL,
  "id_usuario" INTEGER DEFAULT NULL,
  "Id_Anticipo" INTEGER DEFAULT NULL);


--
-- Dumping data for table "tblpagos"
--

LOCK TABLES "tblpagos" WRITE;


UNLOCK TABLES;

--
-- Table structure for table "tblpedidos"
--

DROP TABLE IF EXISTS "tblpedidos";


CREATE TABLE "tblpedidos" (  "Pedido_N" INTEGER PRIMARY KEY AUTOINCREMENT,
  "FacturaCompra_N" varchar(50) DEFAULT NULL,
  "N_Mes" INTEGER DEFAULT 0,
  "anio" INTEGER DEFAULT NULL,
  "Fecha" timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "TipoPedido" varchar(8) DEFAULT 'Contado',
  "Dias" INTEGER DEFAULT 0,
  "CodigoPro" INTEGER DEFAULT 0,
  "Impuesto" NUMERIC DEFAULT 0.0000,
  "Descuento" NUMERIC DEFAULT 0.0000,
  "Flete" NUMERIC DEFAULT 0.0000,
  "Total" NUMERIC DEFAULT 0.0000,
  "Saldo" NUMERIC DEFAULT 0.0000,
  "EstadoPedido" varchar(15) DEFAULT 'Recibido',
  "Comentario" text DEFAULT NULL,
  "Retencion" NUMERIC DEFAULT NULL,
  "opcion_factura" INTEGER NOT NULL);


--
-- Dumping data for table "tblpedidos"
--

LOCK TABLES "tblpedidos" WRITE;


UNLOCK TABLES;

--
-- Table structure for table "tblporcentajeutilidad"
--

DROP TABLE IF EXISTS "tblporcentajeutilidad";


CREATE TABLE "tblporcentajeutilidad" (  "Id_Ganancia" INTEGER PRIMARY KEY AUTOINCREMENT,
  "Rango1" NUMERIC DEFAULT 0.0000,
  "Rango2" NUMERIC DEFAULT 0.0000,
  "Porcentaje" double DEFAULT 0);


--
-- Dumping data for table "tblporcentajeutilidad"
--

LOCK TABLES "tblporcentajeutilidad" WRITE;


UNLOCK TABLES;

--
-- Table structure for table "tblpresentaciones"
--

DROP TABLE IF EXISTS "tblpresentaciones";


CREATE TABLE "tblpresentaciones" (  "Id_Presentacion" INTEGER PRIMARY KEY AUTOINCREMENT,
  "Items" INTEGER NOT NULL,
  "Nombre" varchar(80) NOT NULL,
  "Factor" NUMERIC NOT NULL DEFAULT 1.0000,
  "Precio_Venta" NUMERIC DEFAULT 0.0000,
  "Codigo_Barras" varchar(25) DEFAULT NULL,
  "Activa" INTEGER DEFAULT 1);


--
-- Dumping data for table "tblpresentaciones"
--

LOCK TABLES "tblpresentaciones" WRITE;


UNLOCK TABLES;

--
-- Table structure for table "tblproducto_componentes"
--

DROP TABLE IF EXISTS "tblproducto_componentes";


CREATE TABLE "tblproducto_componentes" (  "Id_Componente" INTEGER PRIMARY KEY AUTOINCREMENT,
  "Items_Padre" INTEGER NOT NULL,
  "Items_Componente" INTEGER NOT NULL,
  "Cantidad" NUMERIC NOT NULL DEFAULT 1.0000,
  "Comentario" varchar(150) DEFAULT NULL,
  "Fecha_Creacion" timestamp NULL DEFAULT CURRENT_TIMESTAMP);


--
-- Dumping data for table "tblproducto_componentes"
--

LOCK TABLES "tblproducto_componentes" WRITE;


UNLOCK TABLES;

--
-- Table structure for table "tblproductos_lotes"
--

DROP TABLE IF EXISTS "tblproductos_lotes";


CREATE TABLE "tblproductos_lotes" (  "Id_Lote" INTEGER PRIMARY KEY AUTOINCREMENT,
  "Items" INTEGER NOT NULL,
  "Numero_Lote" varchar(50) DEFAULT NULL,
  "Fecha_Vencimiento" date NOT NULL,
  "Fecha_Ingreso" timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  "Cantidad_Inicial" NUMERIC NOT NULL,
  "Cantidad_Actual" NUMERIC NOT NULL,
  "Estado" TEXT DEFAULT 'activo',
  "Pedido_N" INTEGER DEFAULT NULL,
  "Comentario" varchar(255) DEFAULT NULL);


--
-- Dumping data for table "tblproductos_lotes"
--

LOCK TABLES "tblproductos_lotes" WRITE;


UNLOCK TABLES;

--
-- Table structure for table "tblproductosrelacionados"
--

DROP TABLE IF EXISTS "tblproductosrelacionados";


CREATE TABLE "tblproductosrelacionados" (  "ID_ProductoRelacionados" INTEGER PRIMARY KEY AUTOINCREMENT,
  "CodigoPro" INTEGER DEFAULT 0,
  "CodigoProRelacionado" INTEGER DEFAULT 0,
  "Cantidad" INTEGER DEFAULT 0);


--
-- Dumping data for table "tblproductosrelacionados"
--

LOCK TABLES "tblproductosrelacionados" WRITE;


UNLOCK TABLES;

--
-- Table structure for table "tblproveedores"
--

DROP TABLE IF EXISTS "tblproveedores";


CREATE TABLE "tblproveedores" (  "CodigoPro" INTEGER PRIMARY KEY AUTOINCREMENT,
  "RazonSocial" varchar(50) DEFAULT NULL,
  "Nit" varchar(15) DEFAULT NULL,
  "Direccion" varchar(50) DEFAULT NULL,
  "Telefonos" varchar(30) DEFAULT NULL,
  "Nombres" varchar(50) DEFAULT NULL,
  "Apellidos" varchar(20) DEFAULT NULL,
  "Identificacion" INTEGER DEFAULT NULL,
  "Telefonos_C" varchar(30) DEFAULT NULL,
  "Direccion_C" varchar(50) DEFAULT NULL,
  "Empresa" varchar(30) DEFAULT NULL,
  "CuentaN" varchar(50) DEFAULT NULL,
  "Fecha_Iingreso" datetime DEFAULT NULL,
  "FechaMod" datetime DEFAULT NULL);


--
-- Dumping data for table "tblproveedores"
--

LOCK TABLES "tblproveedores" WRITE;


UNLOCK TABLES;

--
-- Table structure for table "tblreferencia"
--

DROP TABLE IF EXISTS "tblreferencia";


CREATE TABLE "tblreferencia" (  "Id_Referencia" INTEGER PRIMARY KEY AUTOINCREMENT,
  "Referencia" varchar(20) DEFAULT NULL);


--
-- Dumping data for table "tblreferencia"
--

LOCK TABLES "tblreferencia" WRITE;


UNLOCK TABLES;

--
-- Table structure for table "tblreferenciasarticulos"
--

DROP TABLE IF EXISTS "tblreferenciasarticulos";


CREATE TABLE "tblreferenciasarticulos" (  "idRefeArt" INTEGER PRIMARY KEY AUTOINCREMENT,
  "Id_DetalleVenta" INTEGER NOT NULL,
  "RerenciaPro" varchar(100) NOT NULL);


--
-- Dumping data for table "tblreferenciasarticulos"
--

LOCK TABLES "tblreferenciasarticulos" WRITE;


UNLOCK TABLES;

--
-- Table structure for table "tblregistro"
--

DROP TABLE IF EXISTS "tblregistro";


CREATE TABLE "tblregistro" (  "id_registro" INTEGER PRIMARY KEY AUTOINCREMENT,
  "propietario" varchar(30) NOT NULL,
  "nit" varchar(20) NOT NULL,
  "serial" varchar(100) NOT NULL,
  "id_maquina" varchar(50) NOT NULL,
  "fecha_registro" date NOT NULL);


--
-- Dumping data for table "tblregistro"
--

LOCK TABLES "tblregistro" WRITE;


UNLOCK TABLES;

--
-- Table structure for table "tblregistroproducto"
--

DROP TABLE IF EXISTS "tblregistroproducto";


CREATE TABLE "tblregistroproducto" (
  "ID_Registro" varchar(15) NOT NULL,
  "Codigo" text DEFAULT NULL,
  PRIMARY KEY ("ID_Registro"));


--
-- Dumping data for table "tblregistroproducto"
--

LOCK TABLES "tblregistroproducto" WRITE;


UNLOCK TABLES;

--
-- Table structure for table "tblretenciones"
--

DROP TABLE IF EXISTS "tblretenciones";


CREATE TABLE "tblretenciones" (  "Id_Retencion" INTEGER PRIMARY KEY AUTOINCREMENT,
  "Codigo" varchar(20) NOT NULL,
  "Nombre" varchar(120) NOT NULL,
  "Porcentaje" NUMERIC NOT NULL DEFAULT 0.0000,
  "Codigo_Dian" varchar(5) DEFAULT NULL,
  "Activa" INTEGER DEFAULT 1,
  "Fecha_Creacion" timestamp NULL DEFAULT CURRENT_TIMESTAMP);


--
-- Dumping data for table "tblretenciones"
--

LOCK TABLES "tblretenciones" WRITE;


UNLOCK TABLES;

--
-- Table structure for table "tblsaldosfact"
--

DROP TABLE IF EXISTS "tblsaldosfact";


CREATE TABLE "tblsaldosfact" (  "Id_SaldoF" INTEGER PRIMARY KEY AUTOINCREMENT,
  "Cuenta" varchar(15) DEFAULT NULL,
  "Valor" NUMERIC DEFAULT 0.0000,
  "Saldo" NUMERIC DEFAULT 0.0000);


--
-- Dumping data for table "tblsaldosfact"
--

LOCK TABLES "tblsaldosfact" WRITE;


UNLOCK TABLES;

--
-- Table structure for table "tblsesiones_caja"
--

DROP TABLE IF EXISTS "tblsesiones_caja";


CREATE TABLE "tblsesiones_caja" (  "Id_Sesion" INTEGER PRIMARY KEY AUTOINCREMENT,
  "Id_Caja" INTEGER NOT NULL,
  "Id_Usuario" INTEGER NOT NULL,
  "FechaApertura" datetime NOT NULL,
  "FechaCierre" datetime DEFAULT NULL,
  "BaseInicial" NUMERIC DEFAULT 0.0000,
  "VentasContadoEfectivo" NUMERIC DEFAULT 0.0000,
  "VentasContadoTransf" NUMERIC DEFAULT 0.0000,
  "VentasCredito" NUMERIC DEFAULT 0.0000,
  "PagosEfectivo" NUMERIC DEFAULT 0.0000,
  "PagosTransf" NUMERIC DEFAULT 0.0000,
  "Egresos" NUMERIC DEFAULT 0.0000,
  "Anulaciones" NUMERIC DEFAULT 0.0000,
  "RetirosParciales" NUMERIC DEFAULT 0.0000,
  "TotalEfectivoSistema" NUMERIC DEFAULT 0.0000,
  "ConteoFinal" NUMERIC DEFAULT 0.0000,
  "DiferenciaFinal" NUMERIC DEFAULT 0.0000,
  "Estado" TEXT DEFAULT 'abierta',
  "Observacion" varchar(255) DEFAULT '');


--
-- Dumping data for table "tblsesiones_caja"
--

LOCK TABLES "tblsesiones_caja" WRITE;


UNLOCK TABLES;

--
-- Table structure for table "tbltempfactutilidad"
--

DROP TABLE IF EXISTS "tbltempfactutilidad";


CREATE TABLE "tbltempfactutilidad" (
  "Factura_N" INTEGER DEFAULT 0,
  "Fecha" datetime DEFAULT NULL,
  "Tipo" varchar(8) DEFAULT NULL,
  "Cantidad" INTEGER DEFAULT 0,
  "PrecioV" NUMERIC DEFAULT 0.0000,
  "PrecioCostoReal" NUMERIC DEFAULT 0.0000,
  "Subtotal" NUMERIC DEFAULT 0.0000,
  "Total" NUMERIC DEFAULT 0.0000,
  "N_Mes" INTEGER DEFAULT 0,
  "Año" INTEGER DEFAULT 0,
  "UtilidadBru" NUMERIC DEFAULT 0.0000
);


--
-- Dumping data for table "tbltempfactutilidad"
--

LOCK TABLES "tbltempfactutilidad" WRITE;


UNLOCK TABLES;

--
-- Table structure for table "tbltemplistadofactuvenc"
--

DROP TABLE IF EXISTS "tbltemplistadofactuvenc";


CREATE TABLE "tbltemplistadofactuvenc" (
  "NFactura" varchar(30) DEFAULT NULL,
  "Fecha" datetime DEFAULT NULL,
  "Dias" INTEGER DEFAULT 0,
  "FechaVenc" datetime DEFAULT NULL,
  "Total" NUMERIC DEFAULT 0.0000,
  "Saldo" NUMERIC DEFAULT 0.0000,
  "Codigo" INTEGER DEFAULT 0,
  "Nombre" varchar(80) DEFAULT NULL,
  "Empresa" varchar(100) DEFAULT NULL,
  "Informe" varchar(50) DEFAULT NULL,
  "DiasVenc" INTEGER DEFAULT NULL,
  "SinVencer" NUMERIC DEFAULT NULL,
  "De1a30" INTEGER DEFAULT 0,
  "Mas60" INTEGER DEFAULT 0,
  "de31a60" INTEGER DEFAULT 0
);


--
-- Dumping data for table "tbltemplistadofactuvenc"
--

LOCK TABLES "tbltemplistadofactuvenc" WRITE;


UNLOCK TABLES;

--
-- Table structure for table "tbltemplistadofactuvencpro"
--

DROP TABLE IF EXISTS "tbltemplistadofactuvencpro";


CREATE TABLE "tbltemplistadofactuvencpro" (
  "NFactura" varchar(30) NOT NULL,
  "Fecha" datetime NOT NULL,
  "Dias" INTEGER NOT NULL,
  "DiasVenc" INTEGER NOT NULL,
  "FechaVenc" datetime NOT NULL,
  "Total" NUMERIC NOT NULL,
  "Saldo" NUMERIC NOT NULL,
  "Codigo" INTEGER NOT NULL,
  "Nombre" varchar(80) NOT NULL,
  "SinVencer" NUMERIC NOT NULL,
  "De1a30" NUMERIC NOT NULL,
  "de31a60" NUMERIC NOT NULL,
  "Mas60" NUMERIC NOT NULL
);


--
-- Dumping data for table "tbltemplistadofactuvencpro"
--

LOCK TABLES "tbltemplistadofactuvencpro" WRITE;


UNLOCK TABLES;

--
-- Table structure for table "tbltempmes"
--

DROP TABLE IF EXISTS "tbltempmes";


CREATE TABLE "tbltempmes" (
  "Id" INTEGER NOT NULL DEFAULT 0,
  "Año" INTEGER DEFAULT 0,
  "Mes" INTEGER DEFAULT 0,
  "FechaAct" timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "Fact_N" INTEGER DEFAULT 0,
  "CuentaN" varchar(15) DEFAULT NULL,
  "Rec_Caja" INTEGER DEFAULT 0,
  "DiasFact" INTEGER DEFAULT 0,
  "CuentaN2" INTEGER DEFAULT 0,
  "Fact_Temp" INTEGER DEFAULT 0,
  PRIMARY KEY ("Id")
);


--
-- Dumping data for table "tbltempmes"
--

LOCK TABLES "tbltempmes" WRITE;


UNLOCK TABLES;

--
-- Table structure for table "tbltempventas"
--

DROP TABLE IF EXISTS "tbltempventas";


CREATE TABLE "tbltempventas" (  "IdTempVenta" INTEGER PRIMARY KEY AUTOINCREMENT,
  "NFacturaTemp" INTEGER DEFAULT 0,
  "CodigoCli" INTEGER DEFAULT 0,
  "NombreCliente" varchar(100) NOT NULL,
  "Dias" INTEGER DEFAULT 0,
  "FechaHora" datetime DEFAULT NULL);


--
-- Dumping data for table "tbltempventas"
--

LOCK TABLES "tbltempventas" WRITE;


UNLOCK TABLES;

--
-- Table structure for table "tbltipomovimiento"
--

DROP TABLE IF EXISTS "tbltipomovimiento";


CREATE TABLE "tbltipomovimiento" (  "Id_TipoMoviento" INTEGER PRIMARY KEY AUTOINCREMENT,
  "Movimiento" varchar(50) DEFAULT NULL);


--
-- Dumping data for table "tbltipomovimiento"
--

LOCK TABLES "tbltipomovimiento" WRITE;


UNLOCK TABLES;

--
-- Table structure for table "tbltiposusuario"
--

DROP TABLE IF EXISTS "tbltiposusuario";


CREATE TABLE "tbltiposusuario" (  "Id_TiposUsuario" INTEGER PRIMARY KEY AUTOINCREMENT,
  "Nombre_TipoUsuario" varchar(50) DEFAULT NULL,
  "Nivel" text DEFAULT NULL,
  "permisos" text DEFAULT NULL);


--
-- Dumping data for table "tbltiposusuario"
--

LOCK TABLES "tbltiposusuario" WRITE;


UNLOCK TABLES;

--
-- Table structure for table "tblusuarios"
--

DROP TABLE IF EXISTS "tblusuarios";


CREATE TABLE "tblusuarios" (  "Id_Usuario" INTEGER PRIMARY KEY AUTOINCREMENT,
  "Usuario" varchar(10) DEFAULT NULL,
  "Nombre" varchar(50) DEFAULT NULL,
  "Indentificacion" INTEGER DEFAULT 0,
  "contrasena" longtext DEFAULT NULL,
  "Nivel" text DEFAULT NULL,
  "Id_TiposUsuario" INTEGER DEFAULT 0,
  "Id_Caja" INTEGER DEFAULT NULL);


--
-- Dumping data for table "tblusuarios"
--

LOCK TABLES "tblusuarios" WRITE;


UNLOCK TABLES;

--
-- Table structure for table "tblventa_retenciones"
--

DROP TABLE IF EXISTS "tblventa_retenciones";


CREATE TABLE "tblventa_retenciones" (  "Id" INTEGER PRIMARY KEY AUTOINCREMENT,
  "Factura_N" INTEGER NOT NULL,
  "Id_Retencion" INTEGER DEFAULT NULL,
  "Codigo" varchar(20) DEFAULT NULL,
  "Nombre" varchar(120) DEFAULT NULL,
  "Porcentaje" NUMERIC DEFAULT NULL,
  "Base" NUMERIC DEFAULT NULL,
  "Valor" NUMERIC DEFAULT NULL,
  "Modo" TEXT DEFAULT 'informativo',
  "Fecha" timestamp NULL DEFAULT CURRENT_TIMESTAMP);


--
-- Dumping data for table "tblventa_retenciones"
--

LOCK TABLES "tblventa_retenciones" WRITE;


UNLOCK TABLES;

--
-- Table structure for table "tblventas"
--

DROP TABLE IF EXISTS "tblventas";


CREATE TABLE "tblventas" (  "Factura_N" INTEGER PRIMARY KEY AUTOINCREMENT,
  "N_Mes" INTEGER DEFAULT NULL,
  "anio" INTEGER DEFAULT NULL,
  "Fecha" datetime DEFAULT NULL,
  "Tipo" varchar(8) DEFAULT NULL,
  "Dias" INTEGER DEFAULT NULL,
  "CodigoCli" INTEGER DEFAULT NULL,
  "A_nombre" varchar(70) DEFAULT NULL,
  "Identificacion" varchar(20) DEFAULT NULL,
  "Direccion" varchar(50) DEFAULT NULL,
  "Telefono" varchar(50) DEFAULT NULL,
  "Impuesto" NUMERIC DEFAULT NULL,
  "Descuento" NUMERIC DEFAULT NULL,
  "Flete" NUMERIC DEFAULT NULL,
  "Total" NUMERIC DEFAULT NULL,
  "Saldo" NUMERIC DEFAULT NULL,
  "EstadoPedido" varchar(15) DEFAULT NULL,
  "Comentario" text DEFAULT NULL,
  "EstadoFact" varchar(10) DEFAULT NULL,
  "Pago" varchar(50) DEFAULT NULL,
  "Cambio" varchar(50) DEFAULT NULL,
  "Hora" varchar(50) DEFAULT NULL,
  "Id_Usuario" INTEGER DEFAULT NULL,
  "Abono" NUMERIC DEFAULT NULL,
  "pagada" varchar(1) NOT NULL,
  "CodigoEmp" INTEGER DEFAULT NULL,
  "Modifi" INTEGER DEFAULT NULL,
  "FechaMod" datetime DEFAULT NULL,
  "id_mediopago" INTEGER NOT NULL,
  "efectivo" double NOT NULL,
  "valorpagado1" double NOT NULL,
  "enviada_dian" INTEGER DEFAULT 0,
  "fecha_envio_dian" datetime DEFAULT NULL,
  "cufe" varchar(200) DEFAULT NULL,
  "en_contingencia" INTEGER DEFAULT 0,
  "contingencia_fecha" datetime DEFAULT NULL,
  "contingencia_reenviada" INTEGER DEFAULT 0,
  "contingencia_motivo" varchar(255) DEFAULT NULL,
  "email" varchar(150) DEFAULT NULL);


--
-- Dumping data for table "tblventas"
--

LOCK TABLES "tblventas" WRITE;


UNLOCK TABLES;

--
-- Table structure for table "tipos_documentos"
--

DROP TABLE IF EXISTS "tipos_documentos";


CREATE TABLE "tipos_documentos" (  "id" INTEGER PRIMARY KEY AUTOINCREMENT,
  "code" varchar(10) NOT NULL,
  "name" varchar(100) NOT NULL,
  "description" varchar(255) DEFAULT NULL,
  "created_at" timestamp NULL DEFAULT NULL,
  "updated_at" timestamp NULL DEFAULT NULL);


--
-- Dumping data for table "tipos_documentos"
--

LOCK TABLES "tipos_documentos" WRITE;


UNLOCK TABLES;

--
-- Table structure for table "type_documents"
--

DROP TABLE IF EXISTS "type_documents";


CREATE TABLE "type_documents" (  "id" INTEGER PRIMARY KEY AUTOINCREMENT,
  "code" varchar(2) NOT NULL,
  "name" varchar(255) NOT NULL,
  "cufe_algorithm" varchar(255) NOT NULL DEFAULT 'CUFE-SHA384',
  "created_at" timestamp NULL DEFAULT NULL,
  "updated_at" timestamp NULL DEFAULT NULL);


--
-- Dumping data for table "type_documents"
--

LOCK TABLES "type_documents" WRITE;


UNLOCK TABLES;

--
-- Table structure for table "type_item_identifications"
--

DROP TABLE IF EXISTS "type_item_identifications";


CREATE TABLE "type_item_identifications" (  "id" INTEGER PRIMARY KEY AUTOINCREMENT,
  "code" varchar(5) NOT NULL,
  "code_agency" varchar(255) DEFAULT NULL,
  "name" varchar(100) NOT NULL,
  "created_at" timestamp NULL DEFAULT NULL,
  "updated_at" timestamp NULL DEFAULT NULL);


--
-- Dumping data for table "type_item_identifications"
--

LOCK TABLES "type_item_identifications" WRITE;


UNLOCK TABLES;

--
-- Table structure for table "type_liabilities"
--

DROP TABLE IF EXISTS "type_liabilities";


CREATE TABLE "type_liabilities" (
  "id" INTEGER NOT NULL,
  "code" varchar(10) NOT NULL,
  "name" varchar(100) NOT NULL,
  "description" varchar(255) DEFAULT NULL,
  PRIMARY KEY ("id")
);


--
-- Dumping data for table "type_liabilities"
--

LOCK TABLES "type_liabilities" WRITE;


UNLOCK TABLES;

--
-- Table structure for table "type_organizations"
--

DROP TABLE IF EXISTS "type_organizations";


CREATE TABLE "type_organizations" (
  "id" INTEGER NOT NULL,
  "code" varchar(5) NOT NULL,
  "name" varchar(50) NOT NULL,
  "description" varchar(100) DEFAULT NULL,
  PRIMARY KEY ("id")
);


--
-- Dumping data for table "type_organizations"
--

LOCK TABLES "type_organizations" WRITE;


UNLOCK TABLES;

--
-- Table structure for table "type_regimes"
--

DROP TABLE IF EXISTS "type_regimes";


CREATE TABLE "type_regimes" (  "id" INTEGER PRIMARY KEY AUTOINCREMENT,
  "code" varchar(255) NOT NULL,
  "name" varchar(255) NOT NULL,
  "description" varchar(255) DEFAULT NULL,
  "created_at" timestamp NULL DEFAULT NULL,
  "updated_at" timestamp NULL DEFAULT NULL);


--
-- Dumping data for table "type_regimes"
--

LOCK TABLES "type_regimes" WRITE;


UNLOCK TABLES;

--
-- Table structure for table "unit_measures"
--

DROP TABLE IF EXISTS "unit_measures";


CREATE TABLE "unit_measures" (  "id" INTEGER PRIMARY KEY AUTOINCREMENT,
  "name" varchar(255) NOT NULL,
  "code" char(10) NOT NULL,
  "created_at" timestamp NULL DEFAULT NULL,
  "updated_at" timestamp NULL DEFAULT NULL);


--
-- Dumping data for table "unit_measures"
--

LOCK TABLES "unit_measures" WRITE;


UNLOCK TABLES;

--
-- Temporary table structure for view "ver_factura"
--

DROP TABLE IF EXISTS "ver_factura";
/*!50001 DROP VIEW IF EXISTS "ver_factura"*/;


CREATE VIEW "ver_factura" AS SELECT
 1 AS "Factura_N",
  1 AS "Fecha",
  1 AS "Hora",
  1 AS "Tipo",
  1 AS "Dias",
  1 AS "A_nombre",
  1 AS "Identificacion",
  1 AS "Telef",
  1 AS "Direcc",
  1 AS "Impuesto",
  1 AS "Descuento",
  1 AS "Total",
  1 AS "Saldo",
  1 AS "Pago",
  1 AS "Cambio",
  1 AS "Nombre" ;


--
-- Temporary table structure for view "view_detalles_ventas"
--

DROP TABLE IF EXISTS "view_detalles_ventas";
/*!50001 DROP VIEW IF EXISTS "view_detalles_ventas"*/;


CREATE VIEW "view_detalles_ventas" AS SELECT
 1 AS "Factura_N",
  1 AS "Items",
  1 AS "Codigo",
  1 AS "Nombres_Articulo",
  1 AS "PrecioV",
  1 AS "Cantidad",
  1 AS "IVA",
  1 AS "DescuPro",
  1 AS "Entregado",
  1 AS "subtotal",
  1 AS "impuesto" ;


--
-- Temporary table structure for view "view_listado_facturas_electronica"
--

DROP TABLE IF EXISTS "view_listado_facturas_electronica";
/*!50001 DROP VIEW IF EXISTS "view_listado_facturas_electronica"*/;


CREATE VIEW "view_listado_facturas_electronica" AS SELECT
 1 AS "fecha",
  1 AS "num_factura",
  1 AS "tipo_doc",
  1 AS "payment_form_id",
  1 AS "cliente",
  1 AS "total",
  1 AS "mediopago",
  1 AS "status",
  1 AS "cufe",
  1 AS "prefix",
  1 AS "invoice_cufe",
  1 AS "fechahora",
  1 AS "number",
  1 AS "type_document_id",
  1 AS "email_sent" ;


--
-- Temporary table structure for view "vw_auditoria_inventario_90d"
--

DROP TABLE IF EXISTS "vw_auditoria_inventario_90d";
/*!50001 DROP VIEW IF EXISTS "vw_auditoria_inventario_90d"*/;


CREATE VIEW "vw_auditoria_inventario_90d" AS SELECT
 1 AS "Items",
  1 AS "Codigo",
  1 AS "Nombres_Articulo",
  1 AS "Existencia",
  1 AS "Precio_Costo",
  1 AS "Precio_Venta",
  1 AS "Margen_Porc",
  1 AS "Unidades_Vendidas_90d",
  1 AS "Veces_Vendido_90d",
  1 AS "Total_Vendido_90d",
  1 AS "Ultima_Venta",
  1 AS "Capital_Invertido",
  1 AS "Dias_Stock",
  1 AS "Categoria",
  1 AS "Proveedor",
  1 AS "Auditoria" ;


--
-- Temporary table structure for view "vw_capacidad_compuestos"
--

DROP TABLE IF EXISTS "vw_capacidad_compuestos";
/*!50001 DROP VIEW IF EXISTS "vw_capacidad_compuestos"*/;


CREATE VIEW "vw_capacidad_compuestos" AS SELECT
 1 AS "Items_Padre",
  1 AS "Codigo",
  1 AS "Producto",
  1 AS "Unidades_Posibles",
  1 AS "Costo_Total_Receta",
  1 AS "Precio_Venta",
  1 AS "Num_Componentes" ;


--
-- Temporary table structure for view "vw_componentes_detalle"
--

DROP TABLE IF EXISTS "vw_componentes_detalle";
/*!50001 DROP VIEW IF EXISTS "vw_componentes_detalle"*/;


CREATE VIEW "vw_componentes_detalle" AS SELECT
 1 AS "Id_Componente",
  1 AS "Items_Padre",
  1 AS "Items_Componente",
  1 AS "Cantidad",
  1 AS "Comentario",
  1 AS "Codigo_Padre",
  1 AS "Nombre_Padre",
  1 AS "Costo_Padre_Actual",
  1 AS "Precio_Venta_Padre",
  1 AS "Codigo_Componente",
  1 AS "Nombre_Componente",
  1 AS "Stock_Componente",
  1 AS "Costo_Unit_Componente",
  1 AS "Costo_Aporte" ;


--
-- Temporary table structure for view "vw_diagnostico_inventario_30d"
--

DROP TABLE IF EXISTS "vw_diagnostico_inventario_30d";
/*!50001 DROP VIEW IF EXISTS "vw_diagnostico_inventario_30d"*/;


CREATE VIEW "vw_diagnostico_inventario_30d" AS SELECT
 1 AS "Items",
  1 AS "Nombres_Articulo",
  1 AS "Existencia",
  1 AS "Precio_Costo",
  1 AS "Precio_Venta",
  1 AS "Margen_Porc",
  1 AS "Unidades_Vendidas_30d",
  1 AS "Veces_Vendido_30d",
  1 AS "Capital_Invertido",
  1 AS "Diagnostico" ;


--
-- Temporary table structure for view "vw_facturas_anteriores_cliente"
--

DROP TABLE IF EXISTS "vw_facturas_anteriores_cliente";
/*!50001 DROP VIEW IF EXISTS "vw_facturas_anteriores_cliente"*/;


CREATE VIEW "vw_facturas_anteriores_cliente" AS SELECT
 1 AS "CodigoCli",
  1 AS "FacturaN",
  1 AS "Fecha",
  1 AS "Dias",
  1 AS "Fechav",
  1 AS "Total",
  1 AS "TotalPagos",
  1 AS "Saldo",
  1 AS "DiasVenc",
  1 AS "Vencida" ;


--
-- Temporary table structure for view "vw_facturas_cliente_saldos"
--

DROP TABLE IF EXISTS "vw_facturas_cliente_saldos";
/*!50001 DROP VIEW IF EXISTS "vw_facturas_cliente_saldos"*/;


CREATE VIEW "vw_facturas_cliente_saldos" AS SELECT
 1 AS "Factura_N",
  1 AS "CodigoCli",
  1 AS "A_Nombre",
  1 AS "Fecha",
  1 AS "Dias",
  1 AS "Fechav",
  1 AS "Total",
  1 AS "TotalPagos",
  1 AS "Saldo",
  1 AS "Tipo",
  1 AS "EstadoFact",
  1 AS "FechaMod",
  1 AS "DiasVenc",
  1 AS "Vencida" ;


--
-- Temporary table structure for view "vw_facturas_elec_cliente_saldos"
--

DROP TABLE IF EXISTS "vw_facturas_elec_cliente_saldos";
/*!50001 DROP VIEW IF EXISTS "vw_facturas_elec_cliente_saldos"*/;


CREATE VIEW "vw_facturas_elec_cliente_saldos" AS SELECT
 1 AS "DocID",
  1 AS "Factura_N",
  1 AS "CodigoCli",
  1 AS "A_Nombre",
  1 AS "Fecha",
  1 AS "Dias",
  1 AS "Fechav",
  1 AS "Total",
  1 AS "TotalPagos",
  1 AS "Saldo",
  1 AS "Tipo",
  1 AS "EstadoFact",
  1 AS "updated_at",
  1 AS "DiasVenc",
  1 AS "Vencida" ;


--
-- Temporary table structure for view "vw_item_ventas_30d"
--

DROP TABLE IF EXISTS "vw_item_ventas_30d";
/*!50001 DROP VIEW IF EXISTS "vw_item_ventas_30d"*/;


CREATE VIEW "vw_item_ventas_30d" AS SELECT
 1 AS "Items",
  1 AS "Unidades_Vendidas_30d",
  1 AS "Veces_Vendido_30d" ;


--
-- Temporary table structure for view "vw_item_ventas_90d"
--

DROP TABLE IF EXISTS "vw_item_ventas_90d";
/*!50001 DROP VIEW IF EXISTS "vw_item_ventas_90d"*/;


CREATE VIEW "vw_item_ventas_90d" AS SELECT
 1 AS "Items",
  1 AS "Unidades_Vendidas_90d",
  1 AS "Veces_Vendido_90d",
  1 AS "Total_Vendido_90d",
  1 AS "Ultima_Venta" ;


--
-- Temporary table structure for view "vw_lotes_por_vencer"
--

DROP TABLE IF EXISTS "vw_lotes_por_vencer";
/*!50001 DROP VIEW IF EXISTS "vw_lotes_por_vencer"*/;


CREATE VIEW "vw_lotes_por_vencer" AS SELECT
 1 AS "Id_Lote",
  1 AS "Items",
  1 AS "Numero_Lote",
  1 AS "Fecha_Vencimiento",
  1 AS "Fecha_Ingreso",
  1 AS "Cantidad_Inicial",
  1 AS "Cantidad_Actual",
  1 AS "dias_restantes",
  1 AS "Codigo",
  1 AS "Nombres_Articulo",
  1 AS "Precio_Costo",
  1 AS "Precio_Venta",
  1 AS "valor_costo" ;


--
-- Temporary table structure for view "vw_productos_stock_bajo"
--

DROP TABLE IF EXISTS "vw_productos_stock_bajo";
/*!50001 DROP VIEW IF EXISTS "vw_productos_stock_bajo"*/;


CREATE VIEW "vw_productos_stock_bajo" AS SELECT
 1 AS "Items",
  1 AS "Codigo",
  1 AS "Nombres_Articulo",
  1 AS "Existencia",
  1 AS "Stock_Minimo",
  1 AS "Precio_Venta",
  1 AS "Id_Familia",
  1 AS "Familia_Nombre" ;


--
-- Temporary table structure for view "vw_prov_cxp_aging"
--

DROP TABLE IF EXISTS "vw_prov_cxp_aging";
/*!50001 DROP VIEW IF EXISTS "vw_prov_cxp_aging"*/;


CREATE VIEW "vw_prov_cxp_aging" AS SELECT
 1 AS "CodigoPro",
  1 AS "RazonSocial",
  1 AS "FacturaN",
  1 AS "Fecha",
  1 AS "Dias",
  1 AS "Fechav",
  1 AS "Total",
  1 AS "TotalPagos",
  1 AS "Saldo",
  1 AS "DiasVenc",
  1 AS "Vencida",
  1 AS "Origen" ;


--
-- Temporary table structure for view "vw_prov_facturas_anteriores_saldos"
--

DROP TABLE IF EXISTS "vw_prov_facturas_anteriores_saldos";
/*!50001 DROP VIEW IF EXISTS "vw_prov_facturas_anteriores_saldos"*/;


CREATE VIEW "vw_prov_facturas_anteriores_saldos" AS SELECT
 1 AS "FacturaN",
  1 AS "CodigoPro",
  1 AS "RazonSocial",
  1 AS "Fecha",
  1 AS "Dias",
  1 AS "Fechav",
  1 AS "Total",
  1 AS "TotalPagos",
  1 AS "Saldo" ;


--
-- Temporary table structure for view "vw_prov_pedidos_credito_saldos"
--

DROP TABLE IF EXISTS "vw_prov_pedidos_credito_saldos";
/*!50001 DROP VIEW IF EXISTS "vw_prov_pedidos_credito_saldos"*/;


CREATE VIEW "vw_prov_pedidos_credito_saldos" AS SELECT
 1 AS "FacturaN",
  1 AS "CodigoPro",
  1 AS "RazonSocial",
  1 AS "Fecha",
  1 AS "Dias",
  1 AS "Fechav",
  1 AS "Total",
  1 AS "TotalPagos",
  1 AS "Saldo",
  1 AS "TipoPedido",
  1 AS "EstadoPedido",
  1 AS "Pedido_N" ;


--
-- Temporary table structure for view "vw_proveedores_saldo_actual"
--

DROP TABLE IF EXISTS "vw_proveedores_saldo_actual";
/*!50001 DROP VIEW IF EXISTS "vw_proveedores_saldo_actual"*/;


CREATE VIEW "vw_proveedores_saldo_actual" AS SELECT
 1 AS "CodigoPro",
  1 AS "RazonSocial",
  1 AS "SaldoAnterior",
  1 AS "SaldoPedidos",
  1 AS "SaldoActual" ;


--
-- Dumping routines for database 'conta_template'
--
 ;
 ;

 ;
 ;
 ;
 ;
 ;
 ;
DELIMITER ;;
CREATE DEFINER="root"@"localhost" PROCEDURE "InsertarDetalleVenta"(IN "FacturaN" INT, IN "Items" VARCHAR(50), IN "Cantidad" NUMERIC, IN "PrecioC" NUMERIC, IN "PrecioV" NUMERIC, IN "Iva" NUMERIC, IN "Impuesto" NUMERIC, IN "Subtotal" NUMERIC, IN "Descuento" NUMERIC, IN "Entregado" CHAR(1), IN "FacturarNegativo" BOOLEAN, IN "ActivarEntregados" BOOLEAN)
BEGIN
    DECLARE StockActual NUMERIC;

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
 ;
 ;
 ;
 ;
 ;
 ;

 ;
 ;
 ;
 ;
 ;
 ;
DELIMITER ;;
CREATE DEFINER="root"@"localhost" PROCEDURE "InsertarVenta"(OUT "Nun_Factura" INT, IN "Fecha" VARCHAR(10), IN "N_Mes" VARCHAR(2), IN "Anio" VARCHAR(4), IN "Tipo" VARCHAR(20), IN "Dias" VARCHAR(4), IN "CodigoCli" VARCHAR(20), IN "A_nombre" VARCHAR(100), IN "Identificacion" VARCHAR(20), IN "Direccion" VARCHAR(100), IN "Telefono" VARCHAR(20), IN "Impuesto" VARCHAR(20), IN "Descuento" VARCHAR(20), IN "Total" VARCHAR(20), IN "Id_Usuario" INT, IN "CodigoEmp" INT, IN "EstadoPedido" VARCHAR(20), IN "Comentario" VARCHAR(100), IN "EstadoFact" VARCHAR(20), IN "Hora" VARCHAR(20), IN "Pago" VARCHAR(20), IN "Cambio" VARCHAR(20), IN "Abono" VARCHAR(20), IN "Saldo" VARCHAR(20), IN "id_mediopago" INT, IN "efectivo" VARCHAR(20), IN "valorpagado1" VARCHAR(20))
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
 ;
 ;
 ;
 ;
 ;
 ;

 ;
 ;
 ;
 ;
 ;
 ;
DELIMITER ;;
CREATE DEFINER="root"@"localhost" PROCEDURE "prc_guardarCuentasCli"("CodigoCuenta" VARCHAR(20), "Nombre" VARCHAR(50))
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
 ;
 ;
 ;
 ;
 ;
 ;

 ;
 ;
 ;
 ;
 ;
 ;
DELIMITER ;;
CREATE DEFINER="root"@"localhost" PROCEDURE "proc_GuardarCliente"("CodigoCli" INT, "RazonSocial" VARCHAR(50), "Nit" VARCHAR(15), "Telefonos" VARCHAR(25), "Direccion" VARCHAR(50), "Nombre_C" VARCHAR(25), "Apellidos_C" VARCHAR(25), "Telefono_C" VARCHAR(30), "Direccion_C" VARCHAR(50), "Cargo_C" VARCHAR(25), "Whatsapp" VARCHAR(15), "Cupo" DOUBLE, "PrecioCosto" INT, "CodigoEmp" INT, "FechaCumple" DATE, "Email" VARCHAR(50), "Termino" INT, "FacturarVenc" INT)
BEGIN
	
    declare codigo int default null;
    DECLARE "_rollback" BOOL DEFAULT 0;
    DECLARE CONTINUE HANDLER FOR SQLEXCEPTION SET "_rollback" = 1;
    
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
                
              IF "_rollback" THEN
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
                        
              IF "_rollback" THEN
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
 ;
 ;
 ;
 ;
 ;
 ;

 ;
 ;
 ;
 ;
 ;
 ;
DELIMITER ;;
CREATE DEFINER="root"@"localhost" PROCEDURE "proc_GuardarPagoCliente"("NumRecibo" INT, "CodigoCliente" INT, "FactAnt" VARCHAR(15), "FacturaN" INT, "Cuenta" VARCHAR(15), "ValorPago" DOUBLE, "Descuento" DOUBLE)
BEGIN
    declare UltimoNumRecibo int;
    declare SaldoCliente double default 0;
    declare SaldoActual double default 0;
    declare PagosCliente double default 0;
    declare TotalFactura double default 0;
    declare TotalPagado double default 0;
    DECLARE "_rollback" BOOL DEFAULT 0;
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
 ;
 ;
 ;
 ;
 ;
 ;

 ;
 ;
 ;
 ;
 ;
 ;
DELIMITER ;;
CREATE DEFINER="root"@"localhost" PROCEDURE "proc_guardar_factura"("FechaF" DATE, "Tipo" VARCHAR(10), "Dias" INT, "CodigoCliente" VARCHAR(15), "NomCliente" VARCHAR(50), "Identificacion" VARCHAR(15), "DireccionCli" VARCHAR(40), "TelefonoCli" VARCHAR(25), "Impuesto" DOUBLE, "Descuento" DOUBLE, "Total" DOUBLE, "Hora" TIME, "idUsuario" INT, "Efectivo" VARCHAR(1), "Cambio" DOUBLE)
BEGIN
	    declare NuevoID int default null;
        DECLARE "_rollback" BOOL DEFAULT 0;
        DECLARE CONTINUE HANDLER FOR SQLEXCEPTION SET "_rollback" = 1;
     
       
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
        
         IF "_rollback" THEN 
			ROLLBACK;
            select 0 as id, "ERROR al guardar el Cliente";
		ELSE
		    COMMIT;
        END IF;    
                    
        Select NuevoId, "Guardado con exito"; 
        
        
END ;;
DELIMITER ;
 ;
 ;
 ;
 ;
 ;
 ;

 ;
 ;
 ;
 ;
 ;
 ;
DELIMITER ;;
CREATE DEFINER="root"@"localhost" PROCEDURE "proc_registro_saldo_cliente"("CodigoCli" INT, "TipoDoc" VARCHAR(5), "NumFact" INT, "NumDoc" INT, "Ing_Egre" DOUBLE)
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
 ;
 ;
 ;
 ;
 ;
 ;

 ;
 ;
 ;
 ;
 ;
 ;
DELIMITER ;;
CREATE DEFINER="root"@"localhost" PROCEDURE "proc_vent_desc_inventario"("num_fact" INT)
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
 ;
 ;
 ;
 ;
 ;
 ;

 ;
 ;
 ;
 ;
 ;
 ;
DELIMITER ;;
CREATE DEFINER="root"@"localhost" PROCEDURE "reportar_kardex"("Tipo" INT, "CodigoPro" INT, "Cantidad" FLOAT, "Precio" DOUBLE, "Detalle" VARCHAR(50), "CD" INT)
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
 ;
 ;
 ;
 ;

--
-- Final view structure for view "ver_factura"
--

/*!50001 DROP VIEW IF EXISTS "ver_factura"*/;













--
-- Final view structure for view "view_detalles_ventas"
--

/*!50001 DROP VIEW IF EXISTS "view_detalles_ventas"*/;













--
-- Final view structure for view "view_listado_facturas_electronica"
--

/*!50001 DROP VIEW IF EXISTS "view_listado_facturas_electronica"*/;













--
-- Final view structure for view "vw_auditoria_inventario_90d"
--

/*!50001 DROP VIEW IF EXISTS "vw_auditoria_inventario_90d"*/;













--
-- Final view structure for view "vw_capacidad_compuestos"
--

/*!50001 DROP VIEW IF EXISTS "vw_capacidad_compuestos"*/;













--
-- Final view structure for view "vw_componentes_detalle"
--

/*!50001 DROP VIEW IF EXISTS "vw_componentes_detalle"*/;













--
-- Final view structure for view "vw_diagnostico_inventario_30d"
--

/*!50001 DROP VIEW IF EXISTS "vw_diagnostico_inventario_30d"*/;













--
-- Final view structure for view "vw_facturas_anteriores_cliente"
--

/*!50001 DROP VIEW IF EXISTS "vw_facturas_anteriores_cliente"*/;













--
-- Final view structure for view "vw_facturas_cliente_saldos"
--

/*!50001 DROP VIEW IF EXISTS "vw_facturas_cliente_saldos"*/;













--
-- Final view structure for view "vw_facturas_elec_cliente_saldos"
--

/*!50001 DROP VIEW IF EXISTS "vw_facturas_elec_cliente_saldos"*/;













--
-- Final view structure for view "vw_item_ventas_30d"
--

/*!50001 DROP VIEW IF EXISTS "vw_item_ventas_30d"*/;













--
-- Final view structure for view "vw_item_ventas_90d"
--

/*!50001 DROP VIEW IF EXISTS "vw_item_ventas_90d"*/;













--
-- Final view structure for view "vw_lotes_por_vencer"
--

/*!50001 DROP VIEW IF EXISTS "vw_lotes_por_vencer"*/;













--
-- Final view structure for view "vw_productos_stock_bajo"
--

/*!50001 DROP VIEW IF EXISTS "vw_productos_stock_bajo"*/;













--
-- Final view structure for view "vw_prov_cxp_aging"
--

/*!50001 DROP VIEW IF EXISTS "vw_prov_cxp_aging"*/;













--
-- Final view structure for view "vw_prov_facturas_anteriores_saldos"
--

/*!50001 DROP VIEW IF EXISTS "vw_prov_facturas_anteriores_saldos"*/;













--
-- Final view structure for view "vw_prov_pedidos_credito_saldos"
--

/*!50001 DROP VIEW IF EXISTS "vw_prov_pedidos_credito_saldos"*/;













--
-- Final view structure for view "vw_proveedores_saldo_actual"
--

/*!50001 DROP VIEW IF EXISTS "vw_proveedores_saldo_actual"*/;






















-- Dump completed on 2026-08-20 15:10:25


-- Índices extraídos de los CREATE TABLE
CREATE INDEX IF NOT EXISTS "idx_departments_departments_country_id_foreign" ON "departments" ("country_id");
CREATE INDEX IF NOT EXISTS "idx_detalle_document_electronic_factura_n" ON "detalle_document_electronic" ("factura_n");
CREATE INDEX IF NOT EXISTS "idx_detalle_document_electronic_items" ON "detalle_document_electronic" ("items");
CREATE INDEX IF NOT EXISTS "idx_detalle_document_electronic_unit_measure_id" ON "detalle_document_electronic" ("unit_measure_id");
CREATE INDEX IF NOT EXISTS "idx_detalle_document_electronic_type_item_identification_id" ON "detalle_document_electronic" ("type_item_identification_id");
CREATE INDEX IF NOT EXISTS "idx_detalle_factura_recibida_idx_factura" ON "detalle_factura_recibida" ("factura_recibida_id");
CREATE UNIQUE INDEX IF NOT EXISTS "uq_electronic_documents_uq_prefix_number" ON "electronic_documents" ("prefix","number");
CREATE INDEX IF NOT EXISTS "idx_electronic_documents_electronic_documents_type_document_id_foreign" ON "electronic_documents" ("type_document_id");
CREATE INDEX IF NOT EXISTS "idx_electronic_documents_electronic_documents_resolution_id_foreign" ON "electronic_documents" ("resolution_id");
CREATE UNIQUE INDEX IF NOT EXISTS "uq_eventos_factura_recibida_uq_solo_aprobado" ON "eventos_factura_recibida" ("factura_recibida_id","aprobado_marker");
CREATE INDEX IF NOT EXISTS "idx_eventos_factura_recibida_idx_factura" ON "eventos_factura_recibida" ("factura_recibida_id");
CREATE INDEX IF NOT EXISTS "idx_eventos_factura_recibida_idx_estado" ON "eventos_factura_recibida" ("estado");
CREATE UNIQUE INDEX IF NOT EXISTS "uq_facturas_recibidas_uq_cufe" ON "facturas_recibidas" ("cufe");
CREATE INDEX IF NOT EXISTS "idx_facturas_recibidas_idx_fecha_emision" ON "facturas_recibidas" ("fecha_emision");
CREATE INDEX IF NOT EXISTS "idx_facturas_recibidas_idx_compra" ON "facturas_recibidas" ("compra_id");
CREATE INDEX IF NOT EXISTS "idx_facturas_recibidas_idx_emisor" ON "facturas_recibidas" ("emisor_nit");
CREATE INDEX IF NOT EXISTS "idx_municipalities_municipalities_country_id_foreign" ON "municipalities" ("country_id");
CREATE INDEX IF NOT EXISTS "idx_municipalities_municipalities_department_id_foreign" ON "municipalities" ("department_id");
CREATE UNIQUE INDEX IF NOT EXISTS "uq_tbl_clientes_comportamiento_CodigoClien" ON "tbl_clientes_comportamiento" ("CodigoClien");
CREATE INDEX IF NOT EXISTS "idx_tbl_clientes_comportamiento_idx_comportamiento" ON "tbl_clientes_comportamiento" ("comportamiento");
CREATE INDEX IF NOT EXISTS "idx_tbl_clientes_comportamiento_idx_castigada" ON "tbl_clientes_comportamiento" ("cartera_castigada");
CREATE INDEX IF NOT EXISTS "idx_tbl_clientes_comportamiento_idx_fecha_castigo" ON "tbl_clientes_comportamiento" ("fecha_castigo");
CREATE UNIQUE INDEX IF NOT EXISTS "uq_tbl_pedidos_vendedor_uk_remoto" ON "tbl_pedidos_vendedor" ("id_remoto");
CREATE UNIQUE INDEX IF NOT EXISTS "uq_tbl_vendedores_movil_uk_codigo" ON "tbl_vendedores_movil" ("codigo");
CREATE UNIQUE INDEX IF NOT EXISTS "uq_tbl_vendedores_movil_uk_email" ON "tbl_vendedores_movil" ("email");
CREATE INDEX IF NOT EXISTS "idx_tblanticipo_movs_idx_anticipo" ON "tblanticipo_movs" ("Id_Anticipo");
CREATE INDEX IF NOT EXISTS "idx_tblanticipo_movs_idx_factura" ON "tblanticipo_movs" ("Factura_N");
CREATE INDEX IF NOT EXISTS "idx_tblanticipo_movs_idx_fecha" ON "tblanticipo_movs" ("Fecha");
CREATE INDEX IF NOT EXISTS "idx_tblanticipos_cliente_idx_cliente" ON "tblanticipos_cliente" ("CodigoCli");
CREATE INDEX IF NOT EXISTS "idx_tblanticipos_cliente_idx_estado" ON "tblanticipos_cliente" ("Estado");
CREATE INDEX IF NOT EXISTS "idx_tblanticipos_cliente_idx_fecha" ON "tblanticipos_cliente" ("Fecha");
CREATE INDEX IF NOT EXISTS "idx_tblarticulos_Codigo" ON "tblarticulos" ("Codigo");
CREATE INDEX IF NOT EXISTS "idx_tblarticulos_Nombres_Articulo" ON "tblarticulos" ("Nombres_Articulo");
CREATE INDEX IF NOT EXISTS "idx_tblarticulos_idx_codigo" ON "tblarticulos" ("Codigo");
CREATE INDEX IF NOT EXISTS "idx_tblarticulos_idx_items" ON "tblarticulos" ("Items");
CREATE INDEX IF NOT EXISTS "idx_tblarticulos_idx_categoria" ON "tblarticulos" ("Id_Categoria");
CREATE INDEX IF NOT EXISTS "idx_tblarticulos_idx_referencia" ON "tblarticulos" ("Id_Referencia");
CREATE INDEX IF NOT EXISTS "idx_tblarticulos_idx_estado" ON "tblarticulos" ("Estado");
CREATE INDEX IF NOT EXISTS "idx_tblarticulos_idx_codigopro" ON "tblarticulos" ("CodigoPro");
CREATE INDEX IF NOT EXISTS "idx_tblarticulos_idx_nombre_articulo" ON "tblarticulos" ("Nombres_Articulo"(30);
CREATE INDEX IF NOT EXISTS "idx_tblarticulos_idx_etiqueta" ON "tblarticulos" ("Id_Etiqueta");
CREATE INDEX IF NOT EXISTS "idx_tblarticulos2_Codigo" ON "tblarticulos2" ("Codigo");
CREATE INDEX IF NOT EXISTS "idx_tblarticulos2_Nombres_Articulo" ON "tblarticulos2" ("Nombres_Articulo");
CREATE INDEX IF NOT EXISTS "idx_tblarticulos2_idx_codigo" ON "tblarticulos2" ("Codigo");
CREATE INDEX IF NOT EXISTS "idx_tblarticulos2_idx_items" ON "tblarticulos2" ("Items");
CREATE INDEX IF NOT EXISTS "idx_tblarticulos2_idx_categoria" ON "tblarticulos2" ("Id_Categoria");
CREATE INDEX IF NOT EXISTS "idx_tblarticulos2_idx_referencia" ON "tblarticulos2" ("Id_Referencia");
CREATE INDEX IF NOT EXISTS "idx_tblarticulos2_idx_estado" ON "tblarticulos2" ("Estado");
CREATE INDEX IF NOT EXISTS "idx_tblarticulos2_idx_codigopro" ON "tblarticulos2" ("CodigoPro");
CREATE INDEX IF NOT EXISTS "idx_tblarticulos2_idx_nombre_articulo" ON "tblarticulos2" ("Nombres_Articulo"(30);
CREATE INDEX IF NOT EXISTS "idx_tblauxiliares_Id_Auxiliar" ON "tblauxiliares" ("Id_Auxiliar");
CREATE UNIQUE INDEX IF NOT EXISTS "uq_tblcliente_retenciones_uk_cli_ret" ON "tblcliente_retenciones" ("CodigoClien","Id_Retencion");
CREATE INDEX IF NOT EXISTS "idx_tblcliente_retenciones_idx_cliente" ON "tblcliente_retenciones" ("CodigoClien");
CREATE INDEX IF NOT EXISTS "idx_tblcliente_retenciones_fk_cliret_ret" ON "tblcliente_retenciones" ("Id_Retencion");
CREATE INDEX IF NOT EXISTS "idx_tblclientes_idx_cartera_castigada" ON "tblclientes" ("cartera_castigada");
CREATE UNIQUE INDEX IF NOT EXISTS "uq_tblconteo_detalle_uk_conteo_item" ON "tblconteo_detalle" ("Id_Conteo","Items");
CREATE INDEX IF NOT EXISTS "idx_tblconteo_detalle_idx_conteo" ON "tblconteo_detalle" ("Id_Conteo");
CREATE INDEX IF NOT EXISTS "idx_tblconteo_detalle_idx_items" ON "tblconteo_detalle" ("Items");
CREATE INDEX IF NOT EXISTS "idx_tblcuadrecaja_Id_CuadreCaja" ON "tblcuadrecaja" ("Id_CuadreCaja");
CREATE INDEX IF NOT EXISTS "idx_tbldatosempresa_Id_Empresa" ON "tbldatosempresa" ("Id_Empresa");
CREATE INDEX IF NOT EXISTS "idx_tbldetalle_venta_Id_DetalleVenta" ON "tbldetalle_venta" ("Id_DetalleVenta");
CREATE INDEX IF NOT EXISTS "idx_tbldetalle_venta_idx_factura" ON "tbldetalle_venta" ("Factura_N");
CREATE INDEX IF NOT EXISTS "idx_tbldetalle_venta_idx_factura_items" ON "tbldetalle_venta" ("Factura_N","Items");
CREATE INDEX IF NOT EXISTS "idx_tbldetallecomprobantediario_Id_DetalleComproDiario" ON "tbldetallecomprobantediario" ("Id_DetalleComproDiario");
CREATE INDEX IF NOT EXISTS "idx_tbldetalleorden_Id_Detalle_Orden" ON "tbldetalleorden" ("Id_Detalle_Orden");
CREATE INDEX IF NOT EXISTS "idx_tbldetalleorden3_Id_DetalleOrden3" ON "tbldetalleorden3" ("Id_DetalleOrden3");
CREATE INDEX IF NOT EXISTS "idx_tbldetalleplansepare_Id_DetallePlanSepare" ON "tbldetalleplansepare" ("Id_DetallePlanSepare");
CREATE INDEX IF NOT EXISTS "idx_tbldetalleplansepare_Id_PlanSepare" ON "tbldetalleplansepare" ("Id_PlanSepare");
CREATE INDEX IF NOT EXISTS "idx_tbldetalleplansepare_Id_Producto" ON "tbldetalleplansepare" ("Id_Producto");
CREATE INDEX IF NOT EXISTS "idx_tbldocumentos_Id_Documentos" ON "tbldocumentos" ("Id_Documentos");
CREATE INDEX IF NOT EXISTS "idx_tblegresos_Id_Egresos" ON "tblegresos" ("Id_Egresos");
CREATE INDEX IF NOT EXISTS "idx_tblegresos_idx_egr_estado_codpro_nfactant" ON "tblegresos" ("Estado","CodigoPro","NFacturaAnt");
CREATE INDEX IF NOT EXISTS "idx_tblegresos_idx_egr_estado_codpro_factn" ON "tblegresos" ("Estado","CodigoPro","FactN");
CREATE INDEX IF NOT EXISTS "idx_tblegresos_idx_usuario" ON "tblegresos" ("id_usuario");
CREATE INDEX IF NOT EXISTS "idx_tblegresos_idx_egr_medio" ON "tblegresos" ("id_mediopago");
CREATE INDEX IF NOT EXISTS "idx_tblempleados_Id_Usuario" ON "tblempleados" ("Id_Usuario");
CREATE INDEX IF NOT EXISTS "idx_tblentidades_Id_Entidades" ON "tblentidades" ("Id_Entidades");
CREATE UNIQUE INDEX IF NOT EXISTS "uq_tbletiquetas_uk_nombre" ON "tbletiquetas" ("Nombre");
CREATE INDEX IF NOT EXISTS "idx_tbletiquetas_idx_activa" ON "tbletiquetas" ("Activa");
CREATE INDEX IF NOT EXISTS "idx_tblfacturasanteriores_ID_FactAnteriores" ON "tblfacturasanteriores" ("ID_FactAnteriores");
CREATE INDEX IF NOT EXISTS "idx_tblfacturasanterioresproveedor_ID_FactAnterioresP" ON "tblfacturasanterioresproveedor" ("ID_FactAnterioresP");
CREATE INDEX IF NOT EXISTS "idx_tblfacturasanterioresproveedor_idx_fap_codprov_factn" ON "tblfacturasanterioresproveedor" ("CodigoProv","FacturaN");
CREATE INDEX IF NOT EXISTS "idx_tblfacturasanterioresproveedor_idx_fap_fecha" ON "tblfacturasanterioresproveedor" ("Fecha");
CREATE UNIQUE INDEX IF NOT EXISTS "uq_tblfamilia_items_uk_items" ON "tblfamilia_items" ("Items");
CREATE INDEX IF NOT EXISTS "idx_tblfamilia_items_idx_familia" ON "tblfamilia_items" ("Id_Familia");
CREATE INDEX IF NOT EXISTS "idx_tblfamilias_producto_idx_activa" ON "tblfamilias_producto" ("Activa");
CREATE INDEX IF NOT EXISTS "idx_tblfinanciacion_cuotas_idx_financ" ON "tblfinanciacion_cuotas" ("Id_Financiacion");
CREATE INDEX IF NOT EXISTS "idx_tblfinanciacion_cuotas_idx_vencimiento" ON "tblfinanciacion_cuotas" ("FechaVencimiento");
CREATE INDEX IF NOT EXISTS "idx_tblfinanciacion_cuotas_idx_estado" ON "tblfinanciacion_cuotas" ("Estado");
CREATE INDEX IF NOT EXISTS "idx_tblfinanciacion_pagos_idx_cuota" ON "tblfinanciacion_pagos" ("Id_Cuota");
CREATE INDEX IF NOT EXISTS "idx_tblfinanciacion_pagos_idx_financ" ON "tblfinanciacion_pagos" ("Id_Financiacion");
CREATE INDEX IF NOT EXISTS "idx_tblfinanciacion_pagos_idx_fecha" ON "tblfinanciacion_pagos" ("Fecha");
CREATE INDEX IF NOT EXISTS "idx_tblfinanciaciones_idx_cliente" ON "tblfinanciaciones" ("Codigo");
CREATE INDEX IF NOT EXISTS "idx_tblfinanciaciones_idx_estado" ON "tblfinanciaciones" ("Estado");
CREATE INDEX IF NOT EXISTS "idx_tblfinanciaciones_idx_fecha" ON "tblfinanciaciones" ("Fecha");
CREATE INDEX IF NOT EXISTS "idx_tblformulario_Id_form" ON "tblformulario" ("Id_form");
CREATE INDEX IF NOT EXISTS "idx_tblkardex_Id_kardex" ON "tblkardex" ("Id_kardex");
CREATE INDEX IF NOT EXISTS "idx_tblmov_banco_idx_cuenta" ON "tblmov_banco" ("Id_Cuenta");
CREATE INDEX IF NOT EXISTS "idx_tblmov_banco_idx_fecha" ON "tblmov_banco" ("Fecha");
CREATE INDEX IF NOT EXISTS "idx_tblmov_caja_idx_sesion" ON "tblmov_caja" ("Id_Sesion");
CREATE INDEX IF NOT EXISTS "idx_tblmovimiento_ID_Asi" ON "tblmovimiento" ("ID_Asi");
CREATE INDEX IF NOT EXISTS "idx_tblmovimientos_distribucion_idx_fecha" ON "tblmovimientos_distribucion" ("Fecha");
CREATE INDEX IF NOT EXISTS "idx_tblmovimientos_distribucion_idx_factura" ON "tblmovimientos_distribucion" ("Factura_N");
CREATE INDEX IF NOT EXISTS "idx_tblmovimientos_distribucion_idx_origen" ON "tblmovimientos_distribucion" ("Items_Origen");
CREATE INDEX IF NOT EXISTS "idx_tblmovimientos_distribucion_idx_destino" ON "tblmovimientos_distribucion" ("Items_Destino");
CREATE INDEX IF NOT EXISTS "idx_tblnotas_articulo_idx_items" ON "tblnotas_articulo" ("Items");
CREATE INDEX IF NOT EXISTS "idx_tblnotas_articulo_idx_fecha" ON "tblnotas_articulo" ("Fecha");
CREATE INDEX IF NOT EXISTS "idx_tblnotas_articulo_idx_concepto" ON "tblnotas_articulo" ("Concepto");
CREATE INDEX IF NOT EXISTS "idx_tblordenproduccion_Identificacion" ON "tblordenproduccion" ("Identificacion");
CREATE INDEX IF NOT EXISTS "idx_tblpagos_idx_usuario" ON "tblpagos" ("id_usuario");
CREATE INDEX IF NOT EXISTS "idx_tblpedidos_CodigoPro" ON "tblpedidos" ("CodigoPro");
CREATE INDEX IF NOT EXISTS "idx_tblpedidos_idx_ped_codpro_pedido" ON "tblpedidos" ("CodigoPro","Pedido_N");
CREATE INDEX IF NOT EXISTS "idx_tblpedidos_idx_ped_estado_tipo" ON "tblpedidos" ("EstadoPedido","TipoPedido");
CREATE INDEX IF NOT EXISTS "idx_tblpedidos_idx_ped_fecha" ON "tblpedidos" ("Fecha");
CREATE INDEX IF NOT EXISTS "idx_tblporcentajeutilidad_Id_Ganancia" ON "tblporcentajeutilidad" ("Id_Ganancia");
CREATE INDEX IF NOT EXISTS "idx_tblpresentaciones_idx_items" ON "tblpresentaciones" ("Items");
CREATE UNIQUE INDEX IF NOT EXISTS "uq_tblproducto_componentes_uk_padre_componente" ON "tblproducto_componentes" ("Items_Padre","Items_Componente");
CREATE INDEX IF NOT EXISTS "idx_tblproducto_componentes_idx_padre" ON "tblproducto_componentes" ("Items_Padre");
CREATE INDEX IF NOT EXISTS "idx_tblproducto_componentes_idx_componente" ON "tblproducto_componentes" ("Items_Componente");
CREATE INDEX IF NOT EXISTS "idx_tblproductos_lotes_idx_items_estado" ON "tblproductos_lotes" ("Items","Estado");
CREATE INDEX IF NOT EXISTS "idx_tblproductos_lotes_idx_vencimiento" ON "tblproductos_lotes" ("Fecha_Vencimiento");
CREATE INDEX IF NOT EXISTS "idx_tblproductosrelacionados_ID_ProductoRelacionados" ON "tblproductosrelacionados" ("ID_ProductoRelacionados");
CREATE INDEX IF NOT EXISTS "idx_tblproveedores_idx_prov_codigo" ON "tblproveedores" ("CodigoPro");
CREATE INDEX IF NOT EXISTS "idx_tblreferencia_Id_Referencia" ON "tblreferencia" ("Id_Referencia");
CREATE INDEX IF NOT EXISTS "idx_tblreferenciasarticulos_idRefeArt" ON "tblreferenciasarticulos" ("idRefeArt");
CREATE INDEX IF NOT EXISTS "idx_tblregistroproducto_ID_Registro" ON "tblregistroproducto" ("ID_Registro");
CREATE UNIQUE INDEX IF NOT EXISTS "uq_tblretenciones_uk_codigo" ON "tblretenciones" ("Codigo");
CREATE INDEX IF NOT EXISTS "idx_tblretenciones_idx_activa" ON "tblretenciones" ("Activa");
CREATE INDEX IF NOT EXISTS "idx_tblsaldosfact_Id_SaldoF" ON "tblsaldosfact" ("Id_SaldoF");
CREATE INDEX IF NOT EXISTS "idx_tblsesiones_caja_idx_caja" ON "tblsesiones_caja" ("Id_Caja");
CREATE INDEX IF NOT EXISTS "idx_tblsesiones_caja_idx_usuario" ON "tblsesiones_caja" ("Id_Usuario");
CREATE INDEX IF NOT EXISTS "idx_tblsesiones_caja_idx_estado" ON "tblsesiones_caja" ("Estado");
CREATE INDEX IF NOT EXISTS "idx_tbltempventas_IdTempVenta" ON "tbltempventas" ("IdTempVenta");
CREATE INDEX IF NOT EXISTS "idx_tbltipomovimiento_Id_TipoMoviento" ON "tbltipomovimiento" ("Id_TipoMoviento");
CREATE INDEX IF NOT EXISTS "idx_tbltiposusuario_Id_TiposUsuario" ON "tbltiposusuario" ("Id_TiposUsuario");
CREATE INDEX IF NOT EXISTS "idx_tblusuarios_Id_TiposUsuario" ON "tblusuarios" ("Id_TiposUsuario");
CREATE INDEX IF NOT EXISTS "idx_tblusuarios_Id_Usuario" ON "tblusuarios" ("Id_Usuario");
CREATE INDEX IF NOT EXISTS "idx_tblusuarios_idx_caja" ON "tblusuarios" ("Id_Caja");
CREATE INDEX IF NOT EXISTS "idx_tblventa_retenciones_idx_factura" ON "tblventa_retenciones" ("Factura_N");
CREATE INDEX IF NOT EXISTS "idx_tblventa_retenciones_idx_retencion" ON "tblventa_retenciones" ("Id_Retencion");
CREATE INDEX IF NOT EXISTS "idx_tblventas_idx_fecha" ON "tblventas" ("Fecha");
CREATE INDEX IF NOT EXISTS "idx_tblventas_idx_codigoemp" ON "tblventas" ("CodigoEmp");
CREATE INDEX IF NOT EXISTS "idx_tblventas_idx_estadofact" ON "tblventas" ("EstadoFact");
CREATE INDEX IF NOT EXISTS "idx_tblventas_idx_fecha_estado" ON "tblventas" ("Fecha","EstadoFact");
CREATE INDEX IF NOT EXISTS "idx_tblventas_idx_codigoemp_fecha" ON "tblventas" ("CodigoEmp","Fecha");
CREATE INDEX IF NOT EXISTS "idx_tblventas_idx_codigoemp_fecha_estado" ON "tblventas" ("CodigoEmp","Fecha","EstadoFact");
CREATE INDEX IF NOT EXISTS "idx_tblventas_idx_contingencia_pendientes" ON "tblventas" ("en_contingencia","contingencia_reenviada");
CREATE UNIQUE INDEX IF NOT EXISTS "uq_type_documents_type_documents_code_unique" ON "type_documents" ("code");
CREATE UNIQUE INDEX IF NOT EXISTS "uq_type_item_identifications_type_item_identifications_code_unique" ON "type_item_identifications" ("code");
