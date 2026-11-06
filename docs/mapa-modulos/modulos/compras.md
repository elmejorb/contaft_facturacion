# Compras (pedidos a proveedor)

**Propósito:** Registrar facturas de compra de proveedores: suben inventario y costo, dejan deuda (crédito) o generan egreso automático (contado). Incluye edición, anulación, borradores persistentes e historial de precios de compra.

**Pantallas (frontend):** (rutas relativas a `Dashboard-Facturación/src`)
- `components/ComprasTabs.tsx` — menú Compras → "Nueva Compra" (`Dashboard.tsx:726`, montado en `Dashboard.tsx:1600`). Contiene `NuevaCompra.tsx` y la lista de borradores (`ComprasTabs.tsx:346,361,381`).
- `components/NuevaCompra.tsx` — formulario de compra (crear/editar): `NuevaCompra.tsx:163,169,228,688,763`.
- `components/PurchasesManagement.tsx` — menú Compras → "Listado de Compras" (`Dashboard.tsx:727`, `:1601`); lista con `?listar=1` (`PurchasesManagement.tsx:47`).
- `components/DetalleCompraModal.tsx` — detalle + anulación (`DetalleCompraModal.tsx:45,73`).
- `components/BuscarCompraModal.tsx` — buscador (`BuscarCompraModal.tsx:37`).
- `components/HistorialPreciosModal.tsx` → `compras/historial-precios.php`.
- Usos externos de `compras/nueva.php` (GET): `Kardex.tsx` (lookup_pedido), `MovsDirectos.tsx`, `NuevaOrdenCompra.tsx:70,96` (proveedores, buscar).

**Endpoints (backend):**
- `conta-app-backend/api/compras/nueva.php` — GET `?codigo=` (`:20`), `?buscar=` (`:65`), `?lookup_pedido=1` (`:154`), `?proveedores=1` (`:189`), `?listar=1` (`:196`), `?detalle=N` (`:226`), sin params → siguiente Pedido_N (`:286`); POST crear (`:709`) / editar si `pedido_n>0` (`:399`).
- `conta-app-backend/api/compras/anular.php` — POST.
- `conta-app-backend/api/compras/borradores.php` — GET `?listar=1`; POST `action` = `guardar|cargar|eliminar`.
- `conta-app-backend/api/compras/historial-precios.php` — GET `?items=`.

## Flujos principales

### Crear compra
- **Pantalla → endpoint:** `NuevaCompra.tsx:688` → `compras/nueva.php` POST (rama `:709`).
- **Lee:** `tblusuarios`+`tbltiposusuario` (permiso `compras_editar`, `nueva.php:316-335`), `tblpedidos` (duplicado, `:718-724`), `tblarticulos` (Existencia, Precio_Costo, `:762`), `tblproveedores` (`:819`), `tblsesiones_caja` (`:830,836`), `tblegresos` (MAX, `:842`).
- **Escribe:**
  - `tblpedidos` INSERT, `EstadoPedido='Recibido'` (`nueva.php:735-745`).
  - `tbldetalle_pedido` INSERT por línea, `PrecioC`=costo final CON IVA + flete (`:780-787`).
  - `tblarticulos` UPDATE Existencia, Precio_Costo (= último costo con IVA+flete, NO promedio), Precio_CostoComp, CodigoPro, Flete, Precio_Venta si >0 (`:794-802`).
  - `tblkardex` INSERT C_D=1, `Detalle='Compra Ped. N° X Fac. Y'`, costos SIN IVA (`:805-811`).
  - Si Contado y total>0: `tblegresos` INSERT (`FactN`=`NFacturaAnt`=factura proveedor, `CodigoPro`, `TipoPago` 0/1 según medio, `id_mediopago`) (`:853-864`).
  - Si Contado y medio=0 (efectivo) y hay caja: `tblmov_caja` INSERT Tipo='compra' (`:871-874`) + `tblcajas.Saldo -= total` (`:876-877`).
- **Efectos colaterales:** stock + kardex; caja (efectivo); cuentas por pagar (Saldo=Total si crédito, `:383`); sync vía triggers `trg_sync_compra_insert` (`actualizacion_completa.sql:2595`) y `trg_sync_gasto_insert` (`:2606`); `trg_egresos_tipopago_sync` (`:2680`). Lotes: el frontend llama aparte `lotes/index.php` tras guardar (`NuevaCompra.tsx:699`), fuera de la transacción.
- **Transacción:** sí — `beginTransaction` `nueva.php:300`, `commit` `:881`, `rollBack` `:893`. Ojo: los `exit` de validación (`:333`, `:344`, `:731`) ocurren DESPUÉS de abrir la transacción sin rollBack explícito (PDO la descarta al cerrar conexión).
- **Consecutivos:** `Pedido_N` AUTO_INCREMENT (`lastInsertId`, `:745`); `N_Comprobante` de egreso `MAX+1` sin bloqueo (`:842`).
- **Validaciones solo en frontend:** proveedor obligatorio, proveedor genérico 220500 no permitido en crédito, fecha obligatoria (`NuevaCompra.tsx:652-659`). El backend sólo exige factura (`nueva.php:342`) e items (`:295`).

### Editar compra
- **Pantalla → endpoint:** `NuevaCompra.tsx:687-688` (con `pedido_n`) → `compras/nueva.php` POST rama `:399`.
- **Escribe:** `tbldetalle_pedido` INSERT/UPDATE/**DELETE** de líneas quitadas (`:465`, `:537`, `:577`); `tblarticulos` UPDATE (`:476`, `:508`, `:532`, `:559`); `tblkardex` INSERT "Compra Adic.", "Ajuste Mod. Ped. (+/-)", "Elim. de Ped." (`:480`, `:513`, `:522`, `:566`); `tblpedidos` UPDATE cabecera incluido `Saldo` (`:591-601`); `tblegresos` UPDATE del egreso vinculado (busca por FactN+CodigoPro originales, `:623-657`); `tblmov_caja` INSERT Tipo `'compra'`/`'compra_ajuste'` + `tblcajas.Saldo` (`:679-686`).
- **Transacción:** sí (misma, `:300`/`:698`).

### Anular compra
- **Pantalla → endpoint:** `DetalleCompraModal.tsx:73` → `compras/anular.php` POST.
- **Lee:** `tblusuarios` (`anular.php:42`), `tblpedidos` (`:55`), `tblegresos` por FactN+CodigoPro+`Estado='Valida'` (`:77-83`), `tblsesiones_caja` abierta HOY del usuario (`:88-97`), `tbldetalle_pedido` (`:111`).
- **Escribe:** `tblarticulos.Existencia -= cant` (`:125`); `tblkardex` C_D=2 `'Anulación Ped. N° X Fac. Y'` (`:142-149`); `tblpedidos` `EstadoPedido='Anulada'`, `Saldo=0`, Comentario con trazabilidad (`:160`); `tblegresos.Estado='Anulada'` (`:166`); `tblmov_caja` Tipo `'ingreso'` + `tblcajas.Saldo +=` (`:175-183`).
- **Transacción:** sí `:108` / `:189` / `:198`. Las validaciones (caja abierta, autorización) van antes.
- **Validaciones:** exige caja abierta hoy si el egreso fue efectivo (`:86-104`).

### Borradores
- `ComprasTabs.tsx:346/361/381`, `NuevaCompra.tsx:722,763` → `compras/borradores.php`. Sólo `tbl_borradores_compra` (JSON). Auto-crea la tabla en cada request (`borradores.php:24-46`). Sin transacción. No toca inventario.

### Historial de precios
- `HistorialPreciosModal.tsx` → `historial-precios.php`: lee `tbldetalle_pedido`+`tblpedidos`+`tblproveedores`, excluye `EstadoPedido='Anulada'` (`historial-precios.php:72`). Sólo lectura.

## Dependencias
- **Usa de otros módulos:** `config/helpers_polyfill.php` (`conta_columnas_tabla`, `nueva.php:24`); tablas de Caja (`tblsesiones_caja`, `tblcajas`, `tblmov_caja`); `tblegresos` (compartida con Gastos/Pagos a proveedores/Nómina); `lotes/index.php` desde el frontend.
- **Lo usan otros módulos:**
  - `proveedores/listar.php` (pagar) actualiza `tblpedidos.Saldo` (`listar.php:241,289`).
  - `movimientos/pagos-proveedores.php` lista/anula egresos generados aquí.
  - Vistas `vw_prov_pedidos_credito_saldos` / `vw_prov_cxp_aging` / `vw_proveedores_saldo_actual` (`actualizacion_completa.sql:1257,1279,1300`) leen `tblpedidos.Saldo` cacheado y filtran `EstadoPedido='Recibido'` + `TipoPedido<>'Contado'` (`:1273`).
  - Informes: `informes/resumen.php` cierre_mes (`:74-79`), compras_listado (`:536-545`), iva (`:1176-1183`), proveedores_listado (`:958,966`), proveedores_saldos (`:991`), panel_gerencial (`:1336,1407`).
  - `ordenes-compra/recibir.php` inserta en `tblpedidos`/`tbldetalle_pedido` con la misma forma.
  - `inventario/detalle-producto.php:30`, `inventario/eliminar-articulo.php` leen `tbldetalle_pedido`.
  - `caja/sesion.php:232` y `caja/estado.php:97` suman `tblegresos` con `COALESCE(TipoPago,0)=0` como salida de efectivo.
- **Triggers / vistas:** `trg_sync_compra_insert/update` (`actualizacion_completa.sql:2595,2600`), `trg_sync_gasto_insert/update` (`:2606,2611`), `trg_egresos_tipopago_sync` (`:2680`); vistas de CxP arriba.
- **Compatibilidad:** `borradores.php:24` hace `CREATE TABLE ... AUTO_INCREMENT ... ENGINE=InnoDB` en cada request — sintaxis MySQL; en SQLite embedded fallaría (sin verificar si la tabla ya existe en el esquema SQLite y si `CREATE TABLE IF NOT EXISTS` llega a parsearse). `nueva.php` usa sólo SQL estándar.

## Qué se rompe si lo tocas
- Cambiar el valor `EstadoPedido='Recibido'` (`nueva.php:738`) → desaparece la deuda de la vista `vw_prov_pedidos_credito_saldos` que filtra `EstadoPedido='Recibido'` (`actualizacion_completa.sql:1273`) → CxP y Saldos de proveedores en 0.
- Cambiar la convención de `TipoPedido` ('Crédito' con tilde, default `nueva.php:305`) → `informes/resumen.php` usa literal `'Crédito'` (`:76,958,991`) mientras la vista usa `<>'Contado'`: los listados de informes y la CxP divergen.
- Cambiar el formato de `FactN`/`NFacturaAnt`/`CodigoPro` del egreso automático (`nueva.php:858-863`) → rompe la edición (`:623-628`) y la anulación (`anular.php:77-82`), que localizan el egreso por FactN+CodigoPro.
- Cambiar el texto `Descripcion` del `tblmov_caja` ("Pago compra #N…", `nueva.php:844,874`) → la edición no encuentra el movimiento para ajustar la caja (`:667-672` usa `LIKE 'Pago compra #N%'`).
- Cambiar `Detalle` del kardex (`'Compra Ped. N° X Fac. Y'`, `:809`) → la query de diagnóstico 4.5 de PROCESOS_SISTEMA.md (`LIKE '%Ped%N%'`) y el lookup de Kardex→compra (`lookup_pedido`, `:154`) dependen de ese texto.
- Cambiar `PrecioC` (con IVA) de `tbldetalle_pedido` (`:785`) → historial de precios (`historial-precios.php:63`) y búsqueda "último costo" (`nueva.php:90`).
- Cambiar `TipoPago`/`id_mediopago` del egreso → descuadra `caja/sesion.php:232` (suma efectivo con `TipoPago=0`).
- Cambiar `Total`/`Impuesto` de `tblpedidos` → `informes/resumen.php` cierre_mes, iva (`:1178`), compras_listado, panel_gerencial alertas de compras (`:1406`).

## Evaluación de la implementación
**Confirmado:**
1. **Duplicado bloquea re-registro tras anular:** el chequeo usa `EstadoPedido <> 'Anulado'` (`nueva.php:721`) pero la anulación escribe `'Anulada'` (`anular.php:160`). Una compra anulada sigue bloqueando registrar de nuevo la misma factura del proveedor.
2. **Editar compra crédito revive la deuda pagada:** en edición `Saldo = Total` completo (`nueva.php:383`, `:594-599`), ignorando abonos ya aplicados al cache `tblpedidos.Saldo` por `proveedores/listar.php:289`. La vista de CxP lee ese cache (`actualizacion_completa.sql:1267`) → la deuda vuelve a aparecer entera.
3. **Servicios mueven stock:** ni `nueva.php` (`:748-812`) ni `anular.php` (`:119-150`) consultan `tblarticulos.Servicio`. Viola PROCESOS_SISTEMA.md regla de oro 2.
4. **ENUM de `tblmov_caja.Tipo`:** los valores `'compra_ajuste'` (`nueva.php:678`) e `'ingreso'` (`anular.php:177`) NO están en el ENUM (`actualizacion_completa.sql:769-770`, `conta_template_limpio.sql:2236`). Con `sql_mode` estricto el INSERT lanza excepción y se hace rollback de toda la edición/anulación; sin modo estricto se guarda `''`. (El `sql_mode` del servidor del cliente: sin verificar; `database.php` no lo fija.)
5. **Autorización débil en anular:** basta enviar cualquier `autorizado_por` ≠ 0 para saltar el chequeo de admin (`anular.php:41`); no se valida que ese ID sea admin.
6. **Precio_Costo inconsistente entre flujos:** nueva compra fija Precio_Costo = costo de la última compra (`:794-795`), pero el comentario/valor del detalle guarda `CostoPromedio` (`:786`) y `ordenes-compra/recibir.php:153` sí guarda el promedio. Mismo acto de negocio, distinto costo.
7. **Retención no descuenta del Total:** `totalCompra = baseNeta + IVA + flete` (`nueva.php:382`), mientras `ordenes-compra/recibir.php:82` y `crear.php:57` restan la retención. El Saldo CxP difiere según el origen de la compra.
8. **Edición borra filas de `tbldetalle_pedido`** (`nueva.php:577`); el kardex sí queda con reverso (`:566`). Se pierde el detalle histórico de la compra original.
9. Rama de edición con `factor` (`:422-436`) es código muerto: el frontend ya manda cantidades en unidad base y no envía `factor` (`NuevaCompra.tsx:672-683`).
10. `N_Comprobante` MAX+1 sin lock (`:842`), compartido con gastos/nómina/pagos → posible duplicado concurrente.

**Sospecha:**
- La anulación marca `Anulada` el egreso original; si el cuadre de una sesión cerrada se recalcula desde `tblegresos` por fecha (`caja/sesion.php:232`), el cierre viejo cambia retroactivamente además del ingreso de reverso en la caja de hoy (sin verificar si sesiones cerradas se recalculan).
- `listar=1` interpola `$anio/$mes/$limit` como enteros (`nueva.php:197-210`) — seguro por `intval`.

**Contraste con PROCESOS_SISTEMA.md §2.4:** el contrato dice `EstadoPed='Valido'`; el código usa la columna `EstadoPedido` con valores `'Recibido'`/`'Anulada'`. La query de diagnóstico 4.5 (`p.EstadoPed = 'Valido'`) no coincide con el esquema real usado por el código → el contrato está desactualizado. Doble escritura stock+kardex: cumple. Servicios: NO cumple.
