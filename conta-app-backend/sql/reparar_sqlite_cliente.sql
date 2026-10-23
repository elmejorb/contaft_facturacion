-- =============================================================================
-- Reparacion BD SQLite — recupera indices y vistas que faltaron en el bootstrap
-- original (schema viejo tenia LOCK TABLES que cortaba el proceso).
-- Idempotente: usa IF NOT EXISTS, no rompe nada ya existente.
-- Fecha: 2026-10-23 - para clientes con BD creada antes del fix del schema.
-- =============================================================================

CREATE VIEW IF NOT EXISTS "ver_factura" AS SELECT
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

CREATE VIEW IF NOT EXISTS "view_detalles_ventas" AS SELECT
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

CREATE VIEW IF NOT EXISTS "view_listado_facturas_electronica" AS SELECT
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

CREATE VIEW IF NOT EXISTS "vw_auditoria_inventario_90d" AS SELECT
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

CREATE VIEW IF NOT EXISTS "vw_capacidad_compuestos" AS SELECT
 1 AS "Items_Padre",
  1 AS "Codigo",
  1 AS "Producto",
  1 AS "Unidades_Posibles",
  1 AS "Costo_Total_Receta",
  1 AS "Precio_Venta",
  1 AS "Num_Componentes" ;

CREATE VIEW IF NOT EXISTS "vw_componentes_detalle" AS SELECT
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

CREATE VIEW IF NOT EXISTS "vw_diagnostico_inventario_30d" AS SELECT
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

CREATE VIEW IF NOT EXISTS "vw_facturas_anteriores_cliente" AS SELECT
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

CREATE VIEW IF NOT EXISTS "vw_facturas_cliente_saldos" AS SELECT
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

CREATE VIEW IF NOT EXISTS "vw_facturas_elec_cliente_saldos" AS SELECT
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

CREATE VIEW IF NOT EXISTS "vw_item_ventas_30d" AS SELECT
 1 AS "Items",
  1 AS "Unidades_Vendidas_30d",
  1 AS "Veces_Vendido_30d" ;

CREATE VIEW IF NOT EXISTS "vw_item_ventas_90d" AS SELECT
 1 AS "Items",
  1 AS "Unidades_Vendidas_90d",
  1 AS "Veces_Vendido_90d",
  1 AS "Total_Vendido_90d",
  1 AS "Ultima_Venta" ;

CREATE VIEW IF NOT EXISTS "vw_lotes_por_vencer" AS SELECT
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

CREATE VIEW IF NOT EXISTS "vw_productos_stock_bajo" AS SELECT
 1 AS "Items",
  1 AS "Codigo",
  1 AS "Nombres_Articulo",
  1 AS "Existencia",
  1 AS "Stock_Minimo",
  1 AS "Precio_Venta",
  1 AS "Id_Familia",
  1 AS "Familia_Nombre" ;

CREATE VIEW IF NOT EXISTS "vw_prov_cxp_aging" AS SELECT
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

CREATE VIEW IF NOT EXISTS "vw_prov_facturas_anteriores_saldos" AS SELECT
 1 AS "FacturaN",
  1 AS "CodigoPro",
  1 AS "RazonSocial",
  1 AS "Fecha",
  1 AS "Dias",
  1 AS "Fechav",
  1 AS "Total",
  1 AS "TotalPagos",
  1 AS "Saldo" ;

CREATE VIEW IF NOT EXISTS "vw_prov_pedidos_credito_saldos" AS SELECT
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

CREATE VIEW IF NOT EXISTS "vw_proveedores_saldo_actual" AS SELECT
 1 AS "CodigoPro",
  1 AS "RazonSocial",
  1 AS "SaldoAnterior",
  1 AS "SaldoPedidos",
  1 AS "SaldoActual" ;

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
CREATE INDEX IF NOT EXISTS "idx_tblarticulos_idx_nombre_articulo" ON "tblarticulos" ("Nombres_Articulo");
CREATE INDEX IF NOT EXISTS "idx_tblarticulos_idx_etiqueta" ON "tblarticulos" ("Id_Etiqueta");
CREATE INDEX IF NOT EXISTS "idx_tblarticulos2_Codigo" ON "tblarticulos2" ("Codigo");
CREATE INDEX IF NOT EXISTS "idx_tblarticulos2_Nombres_Articulo" ON "tblarticulos2" ("Nombres_Articulo");
CREATE INDEX IF NOT EXISTS "idx_tblarticulos2_idx_codigo" ON "tblarticulos2" ("Codigo");
CREATE INDEX IF NOT EXISTS "idx_tblarticulos2_idx_items" ON "tblarticulos2" ("Items");
CREATE INDEX IF NOT EXISTS "idx_tblarticulos2_idx_categoria" ON "tblarticulos2" ("Id_Categoria");
CREATE INDEX IF NOT EXISTS "idx_tblarticulos2_idx_referencia" ON "tblarticulos2" ("Id_Referencia");
CREATE INDEX IF NOT EXISTS "idx_tblarticulos2_idx_estado" ON "tblarticulos2" ("Estado");
CREATE INDEX IF NOT EXISTS "idx_tblarticulos2_idx_codigopro" ON "tblarticulos2" ("CodigoPro");
CREATE INDEX IF NOT EXISTS "idx_tblarticulos2_idx_nombre_articulo" ON "tblarticulos2" ("Nombres_Articulo");
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
