# Órdenes de Compra (OC)

**Propósito:** Registrar mercancía pedida a un proveedor antes de que llegue (sin mover inventario) y, al recibirla, convertirla en una compra real (`tblpedidos`) que sí mueve stock y kardex.

**Pantallas (frontend):**
- `components/OrdenesCompraManagement.tsx` — menú Compras → "Órdenes de Compra" (`Dashboard.tsx:731`, montado `:1636`; también se navega desde `StockBajo.tsx:186`). Llama `listar.php` (`:71`), `detalle.php` (`:88`), `recibir.php` (`:347`), `anular.php` (`:419`).
- `components/NuevaOrdenCompra.tsx` — crea la OC (`crear.php`, `:156`); reutiliza `compras/nueva.php?proveedores=1` (`:70`) y `?buscar=` (`:96`).

**Endpoints (backend):** `conta-app-backend/api/ordenes-compra/`
- `crear.php` POST · `listar.php` GET (filtro Estado, `listar.php:14`) · `detalle.php` GET `?id=` · `recibir.php` POST · `anular.php` POST.

## Flujos principales

### Crear OC
- **Pantalla → endpoint:** `NuevaOrdenCompra.tsx:156` → `crear.php` POST.
- **Lee:** `tbl_ordenes_compra` (MAX id, `crear.php:40`).
- **Escribe:** `tbl_ordenes_compra` INSERT `Estado='Pendiente'` (`:60-68`); `tbl_detalle_orden_compra` INSERT por línea (`:72-85`).
- **Efectos colaterales:** ninguno (no stock/kardex/caja).
- **Transacción:** sí `:37` / `:87` / `:97`.
- **Consecutivos:** `numero_oc = 'OC-' + (MAX(id_oc)+1)` (`:40-42`) sin bloqueo; el `id_oc` real es AUTO_INCREMENT (`:69`). Si hay huecos/borrados, `numero_oc` y `id_oc` pueden divergir o repetir (sospecha; no hay UNIQUE verificado sobre numero_oc — sin verificar).
- **Validaciones solo en frontend:** (sin verificar en detalle). Backend exige proveedor e items (`:24`).

### Recibir OC → compra
- **Pantalla → endpoint:** `OrdenesCompraManagement.tsx:347` → `recibir.php` POST (`TipoPedido` desde select con valores `'Contado'|'Credito'` sin tilde, `OrdenesCompraManagement.tsx:387-388`).
- **Lee:** `tbl_ordenes_compra ... FOR UPDATE` (`recibir.php:44`), `tbl_detalle_orden_compra` (`:53`), `tblarticulos` (`:112`).
- **Escribe:**
  - `tblpedidos` INSERT `EstadoPedido='Recibido'` (`:92-103`).
  - `tbldetalle_pedido` INSERT (`:106-111,147-150`), `FleteUnit=0`.
  - `tblarticulos` UPDATE Existencia, `Precio_Costo` = **promedio ponderado con IVA**, `Precio_CostoComp` = costo (`:113,153`).
  - `tblkardex` INSERT C_D=1 `'Recibido de OC-… → Ped. N Fac. F'` (`:114-117,156-162`), costo sin IVA derivado dividiendo por (1+IVA).
  - `tbl_detalle_orden_compra.Cantidad_Recibida` (`:118,165`); `tbl_ordenes_compra.Estado` = `'Recibida'|'Parcial'`, `pedido_generado_n` (`:169-181`).
- **Efectos colaterales:** stock + kardex; CxP (Saldo=Total si no Contado, `:83`); triggers sync de `tblpedidos`. **No** genera egreso ni toca caja aunque sea Contado (`:19`).
- **Transacción:** sí `:41` / `:183` / `:193`.
- **Consecutivos:** `Pedido_N` AUTO_INCREMENT (`:103`).

### Anular OC
- **Pantalla → endpoint:** `OrdenesCompraManagement.tsx:419` → `anular.php` POST.
- **Escribe:** `tbl_ordenes_compra.Estado='Anulada'` + comentario (`anular.php:54-55`). Bloquea si `Recibida|Parcial` (`:43-50`).
- **Transacción:** no (una sola sentencia).

## Dependencias
- **Usa de otros módulos:** `compras/nueva.php` (GET proveedores/buscar) desde el frontend; escribe directamente las tablas de Compras (`tblpedidos`, `tbldetalle_pedido`) y de Inventario (`tblarticulos`, `tblkardex`) sin pasar por `compras/nueva.php`.
- **Lo usan otros módulos:** nadie fuera de `ordenes-compra/` lee `tbl_ordenes_compra` (grep en `api/`). Las compras que genera son leídas por todo lo listado en `compras.md` (vistas CxP, informes, pagos).
- **Triggers / vistas:** tablas definidas en `actualizacion_completa.sql:1841` (`Estado ENUM('Pendiente','Parcial','Recibida','Anulada')`, `:1852`) y `tbl_detalle_orden_compra` (`:1863`). Triggers sync de `tblpedidos` (`:2595,2600`).
- **Compatibilidad:** `SELECT ... FOR UPDATE` (`recibir.php:44`) no es SQL válido en SQLite → recibir OC fallaría en clientes embedded (`db_factory.php` no reescribe `FOR UPDATE`, ver `ContaSqlitePDO::rewrite` `db_factory.php:169-190`).

## Qué se rompe si lo tocas
- Cambiar `EstadoPedido='Recibido'` (`recibir.php:95`) → la compra deja de aparecer en `vw_prov_pedidos_credito_saldos` (`actualizacion_completa.sql:1273`).
- El valor `'Credito'` sin tilde que envía el frontend (`OrdenesCompraManagement.tsx:388`) ya hoy hace que estas compras NO aparezcan en `informes/resumen.php` `proveedores_saldos` (`:991` filtra `TipoPedido='Crédito'`), `proveedores_listado` (`:958`) ni en `compras_credito` de cierre_mes (`:76`), aunque SÍ aparecen en Cuentas por Pagar (vista `<>'Contado'`). Cambiar cualquiera de los dos lados mueve números.
- Cambiar la fórmula de `Total` (`recibir.php:82`, resta retención) → difiere de `compras/nueva.php:382` (no la resta); afecta Saldo CxP y pagos.
- Cambiar el texto de kardex → `PROCESOS_SISTEMA.md` query 4.5 busca `'%Ped%N%'`; el detalle actual contiene "Ped. N" así que hoy coincide.

## Evaluación de la implementación
**Confirmado:**
1. **Doble recepción en OC Parcial:** `recibir.php` sólo bloquea `Recibida|Anulada` (`:48`); una OC `Parcial` puede recibirse otra vez y la cantidad se recalcula como `min(recibida_enviada, Cantidad_pedida)` (`:72`) **sin restar lo ya recibido** → vuelve a sumar stock por el total pedido, crea un segundo `tblpedidos`, y sobrescribe `pedido_generado_n` (`:177-181`) y `Cantidad_Recibida` (`:165`, SET no acumulativo).
2. **Servicios mueven stock** (no se revisa `Servicio`, `:120-166`) — viola regla 2 del contrato.
3. **Sin control de factura duplicada** (a diferencia de `compras/nueva.php:718`).
4. **`Mes` del kardex abreviado** (`'Ene','Feb'…`, `recibir.php:88-89`) vs nombre completo en compras (`'Enero'…`, `compras/nueva.php:353`). Consultas que agrupen kardex por `Mes` mezclan formatos.
5. **Precio_Costo = promedio** (`:153`) mientras compra normal usa último costo (`compras/nueva.php:795`).
6. Comentario `recibir.php:124` asume `PrecioC` de la OC CON IVA y calcula `costoSinIva = PrecioC/(1+IVA)` (`:129`), pero `crear.php:53-55` trata `PrecioC` como base SIN IVA (suma IVA encima para el total). Interpretación contradictoria del mismo campo → Total de la OC ≠ Total de la compra generada (sospecha de magnitud; la contradicción de fórmulas es confirmada).
7. Recepción Contado no genera egreso ni mueve caja (`:19`) — la compra queda "pagada" (Saldo 0, `:83`) sin registro del pago.

**Contraste PROCESOS_SISTEMA.md:** no figura en el contrato; replica §2.4 parcialmente (stock+kardex sí, servicios no).
