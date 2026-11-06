# Proveedores y Cuentas por Pagar (pagos a proveedores / egresos)

**Propósito:** Maestro de proveedores, saldos iniciales ("facturas anteriores"), registro de pagos/abonos a facturas de compra (comprobantes de egreso), listado/anulación/edición de medio de esos pagos y análisis de productos por proveedor.

**Pantallas (frontend):**
- `components/ProveedoresManagement.tsx` — menú Compras/Proveedores (`view 'suppliers'`, `Dashboard.tsx:1631`) y Cartera → "Cuentas por Pagar" (`Dashboard.tsx:741`, montado como `<ProveedoresManagement modoCxP />` en `:1624`). Llama `proveedores/listar.php` (`:140,154,511,569`) y `proveedores/factura-anterior.php` (`:81,108,477,487`); también `caja/sesion.php?cajas=1` (`:533`) y `api/medios-pago/listar.php` (`:525`).
- `components/ListadoPagos.tsx` (componente `ListadoPagosProveedores`, menú Movimientos → "Pagos a Proveedores", `Dashboard.tsx:758`, `:1626`) → `movimientos/pagos-proveedores.php` (`ListadoPagos.tsx:429,469,514`); modal `EditarMedioPagoModal` (`:87`, POST `editar_medio` `:117-121`), visible con permiso `pagos_editar_medio` (`:449-452`).
- `components/ProductosProveedor.tsx` (`view 'productos-proveedor'`, `Dashboard.tsx:1632`) → `proveedores/productos.php` (`:44,51`).
- `components/informes/InformeSaldosProveedores.tsx`, `InformeProveedoresListado.tsx`, `InformePagosProveedores.tsx` → ver `informes.md`.

**Endpoints (backend):**
- `api/proveedores/listar.php` — GET (listado con saldos), GET `?id=` (detalle), POST `action='pagar'` (`:189`), POST sin action = crear proveedor (`:331`), PUT actualizar (`:351`).
- `api/proveedores/factura-anterior.php` — GET `?siguiente=1`; POST `action='crear'|'eliminar'`.
- `api/proveedores/productos.php` — GET (`?proveedor=&desde=&hasta=`).
- `api/movimientos/pagos-proveedores.php` — GET listado; POST `action='anular'|'editar_medio'`.

## Flujos principales

### Pagar facturas a proveedor (abono / pago final)
- **Pantalla → endpoint:** `ProveedoresManagement.tsx:569-576` → `proveedores/listar.php` POST `action='pagar'` (`tipo_pago`=id del medio, `caja_id` si efectivo).
- **Lee:** `tblegresos` MAX (`listar.php:219`), `tblproveedores` (`:223`), por cada pago `tblpedidos` o `tblfacturasanterioresproveedor` (Saldo **cacheado**, `:255-261`), `tblsesiones_caja` (`:302`).
- **Escribe:**
  - `tblegresos` INSERT por factura, todas con el MISMO `N_Comprobante` (`:231-238,272-287`): `FactN='0'`, `NFacturaAnt`=nº factura, `Valor`, `Descuento`, `Saldoact`, `TipoPago` 0/1, `id_mediopago`, `Cuentas` `'51 1305'`/`'1110'` (`:229`).
  - `tblpedidos.Saldo -= valor+descuento` (`:241,289`) **o** `tblfacturasanterioresproveedor.Saldo -=` (`:240,290`).
  - Si efectivo: `tblmov_caja` Tipo `'pago_proveedor'` (`:306-312`) + `tblcajas.Saldo -= totalPagado` (`:313-314`).
- **Efectos colaterales:** caja (efectivo), CxP, sync (`trg_sync_gasto_insert`, `trg_sync_compra_update`).
- **Transacción:** sí `:217` / `:317` / rollBack `:377`.
- **Consecutivos:** `N_Comprobante` MAX+1 sin bloqueo (`:219`).
- **Validaciones solo en frontend:** selección de facturas, caja requerida (también en backend `:212`).

### Listado de pendientes / detalle proveedor
- `ProveedoresManagement.tsx:511` → `listar.php?id=`: pendientes desde vistas `vw_prov_facturas_anteriores_saldos` y `vw_prov_pedidos_credito_saldos` (`listar.php:36-50`); facturas del año desde tablas crudas `tblfacturasanterioresproveedor` ∪ `tblpedidos` **sin filtrar anuladas** (`:61-74`); egresos `Estado='Valida'` (`:83-90`).
- Listado general (`:125-157`): saldo desde `vw_prov_cxp_aging`; `Monto_Compras` suma `tblpedidos.Total` **incluyendo anuladas** (`:150-152`).

### Anular pago a proveedor (egreso)
- **Pantalla → endpoint:** `ListadoPagos.tsx:514` → `movimientos/pagos-proveedores.php` POST `anular`.
- **Escribe:** `tblegresos.Estado='Anulada'` (`pagos-proveedores.php:178`); si efectivo y el usuario tiene caja abierta: `tblmov_caja` Tipo `'anulacion_egreso'` + `tblcajas.Saldo +=` (`:206-217`).
- **NO** restaura `tblpedidos.Saldo` (decisión explícita, `:184-190`).
- **Transacción:** sí `:175` / `:227`. Sin control de permisos en backend.

### Editar medio de pago de un egreso
- **Pantalla → endpoint:** `ListadoPagos.tsx:117-121` → `pagos-proveedores.php` POST `editar_medio`.
- **Escribe:** `tblegresos.id_mediopago`,`TipoPago` (`:124-125`); si cambia efectivo↔otro: `tblmov_caja` Tipo `'edicion_egreso_reverso'|'edicion_egreso_egreso'` + `tblcajas.Saldo` (`:103-118`); log a archivo `logs/egresos_editados_YYYYMM.log` (`:130-145`).
- **Transacción:** sí `:86` / `:127`. Permiso `pagos_editar_medio` sólo en frontend (`ListadoPagos.tsx:452`).

### Facturas anteriores (saldo inicial)
- `ProveedoresManagement.tsx:108,487` → `factura-anterior.php`: INSERT `tblfacturasanterioresproveedor` con prefijo `AT-` (`factura-anterior.php:48-50,92-96`); eliminar con DELETE físico si no hay egresos válidos con ese `NFacturaAnt` (`:112-133`). Consecutivo sugerido = MAX numérico de `AT-n` + 1 (`:31-35`).

### Crear / editar proveedor
- `listar.php` POST: `CodigoPro = MAX(CodigoPro, 220500)+1` sin bloqueo (`:336-347`). PUT bloquea editar el genérico 220500 (`:358`).

### Productos por proveedor
- `ProductosProveedor.tsx:51` → `productos.php`: `tblarticulos` con `CodigoPro` = proveedor (último proveedor que lo compró, lo escribe `compras/nueva.php:794`) + ventas POS del rango (`productos.php:43-52`) **sin filtro `EstadoFact`** y **sin FE**.

## Dependencias
- **Usa de otros módulos:** tablas de Caja (`tblsesiones_caja`, `tblcajas`, `tblmov_caja`); `tblmedios_pago`; tablas de Compras (`tblpedidos`).
- **Lo usan otros módulos:**
  - `compras/nueva.php` crea egresos con `FactN`=`NFacturaAnt`=factura y `CodigoPro` (`nueva.php:858-863`) que caen en este listado.
  - `movimientos/gastos.php` escribe `tblegresos` con `FactN='-1'`, `CodigoPro=0` (`gastos.php:113-114`); el listado de pagos los excluye con `FactN <> '-1'` (`pagos-proveedores.php:248`).
  - `nomina/*` escribe `tblegresos` con `CodigoPro` default 0 y `FactN` NULL (`liquidar.php:223-229`, `movimientos.php:62-70`).
  - `caja/sesion.php:232,491` y `caja/estado.php:97,224` cuentan egresos `TipoPago=0` como salida de efectivo.
  - `informes/resumen.php` pagos_proveedores (`:758-772`, `CodigoPro>0`), cierre_mes (`:101-104`), cuadre_caja (`:325-334`), proveedores_* (`:945-1036`), panel_gerencial (`:1335-1338`).
- **Triggers / vistas:** `vw_prov_facturas_anteriores_saldos` (`actualizacion_completa.sql:1219`, recalcula saldo = SUM(Valor) − SUM(egresos.Valor válidos por `NFacturaAnt`+`CodigoPro`, `:1232-1238`)); `vw_prov_pedidos_credito_saldos` (`:1257`, lee el cache `tblpedidos.Saldo`, filtro `TipoPedido<>'Contado' AND EstadoPedido='Recibido'`, `:1273`); `vw_prov_cxp_aging` (`:1279`); `vw_proveedores_saldo_actual` (`:1300`); `trg_egresos_tipopago_sync` (`:2680`); `trg_sync_gasto_*` (`:2606,2611`); `trg_sync_proveedor_*` (`:2573,2578`).
- **Compatibilidad:** vistas usan `Fecha + INTERVAL f.Dias DAY` y `GREATEST` (MySQL); en SQLite depende de cómo se cree el esquema embedded (sin verificar). `DATEDIFF`/`YEAR` están emuladas (`db_factory.php:228,265`).

## Qué se rompe si lo tocas
- `tblpedidos.Saldo` es **la fuente** de la CxP de compras (vista `:1267`), no un cache opcional: cualquier endpoint que reescriba `Saldo` (p.ej. edición de compra `compras/nueva.php:599`) cambia lo que se debe.
- Cambiar `NFacturaAnt`/`CodigoPro` de los egresos → `vw_prov_facturas_anteriores_saldos` deja de restar pagos de saldos iniciales (`:1236-1238`), y `factura-anterior.php:114-115` deja de detectar pagos aplicados.
- Cambiar `FactN='-1'` en gastos o el filtro `FactN <> '-1'` → gastos aparecen como pagos a proveedores (`pagos-proveedores.php:243-248`).
- Cambiar `TipoPago`/`id_mediopago` → cuadre de caja (`caja/sesion.php:232`) y `informes/resumen.php` cierre_mes.
- Cambiar la convención `CodigoPro>0` = pago a proveedor / `CodigoPro=0` = gasto → `informes/resumen.php` cierre_mes (`:89,103`), estado_resultados (`:240`), gastos_listado (`:654`), pagos_proveedores (`:770`), graficos (`:837`), panel_gerencial (`:1298`).
- Agregar Tipo nuevos a `tblmov_caja` sin ampliar el ENUM (`actualizacion_completa.sql:769-770`) → ver bug abajo.

## Evaluación de la implementación
**Confirmado:**
1. **Anular un pago "perdona" la deuda de compras:** `pagar` descuenta `tblpedidos.Saldo` (`listar.php:289`), `anular` NO lo restaura (`pagos-proveedores.php:184-190`) y la vista de CxP lee ese Saldo (`actualizacion_completa.sql:1267`). Resultado: tras anular el egreso, la factura sigue con saldo reducido aunque no hay pago válido. El mensaje del UI dice "La compra NO se afecta" (`ListadoPagos.tsx:~509`). Para facturas *anteriores* el comportamiento es el opuesto (la vista recalcula desde egresos válidos, `:1232-1238`) → asimetría.
2. **Descuentos de pago no cuentan en saldos iniciales:** `pagar` resta `valor+descuento` del Saldo (`listar.php:264,290`) pero la vista de facturas anteriores sólo resta `SUM(t.Valor)` (`actualizacion_completa.sql:1233`) → el descuento reaparece como deuda.
3. **Cache vs vista:** `pagar` valida el tope con el Saldo cacheado (`listar.php:256-266`) mientras la lista de pendientes viene de la vista; para facturas anteriores ambos pueden divergir.
4. **ENUM `tblmov_caja.Tipo`:** `'anulacion_egreso'` (`pagos-proveedores.php:208`), `'edicion_egreso_reverso'`, `'edicion_egreso_egreso'` (`:107,114`) no existen en el ENUM (`actualizacion_completa.sql:770`). Con `sql_mode` estricto la anulación/edición de un egreso en efectivo falla con rollback; sin estricto queda `Tipo=''` (sql_mode: sin verificar).
5. Comentario obsoleto: `listar.php:32-35` dice que la vista calcula "contra tblegresos", pero `vw_prov_pedidos_credito_saldos` lee el cache (`actualizacion_completa.sql:1247-1273`).
6. `Monto_Compras` y "facturas del año" incluyen compras anuladas (`listar.php:61-74,150-152`).
7. `proveedores/productos.php:47-50` suma ventas anuladas y omite FE (v4.6+ FE no está en `tblventas`).
8. `ProveedoresManagement.tsx:525` llama `api/medios-pago/listar.php`, carpeta que no existe en `conta-app-backend/api/` (listado de carpetas) → falla silenciosa del combo de medios (sin verificar fallback del componente).
9. Sin chequeo de permisos en backend para anular/editar egresos.

**Sospecha:**
- Un egreso de compra contado (`FactN`=`NFacturaAnt`=factura) con un `CodigoPro` que también tenga una factura anterior con el mismo número restaría de esa factura anterior en la vista (match por `NFacturaAnt`+`CodigoPro`, `:1236-1238`); poco probable por el prefijo `AT-`.

**Contraste PROCESOS_SISTEMA.md:** el contrato no cubre pagos a proveedores. Regla "kardex/libros inmutables": cumple (egresos se anulan, no se borran), salvo `factura-anterior.php:133` (DELETE físico, permitido sólo sin pagos).
