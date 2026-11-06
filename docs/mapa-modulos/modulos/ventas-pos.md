# Ventas POS (tblventas) + borrador FE desde Nueva Venta

**Propósito:** Registrar ventas POS (contado/crédito) con descuento de inventario y kardex, abono inicial a cartera y retenciones; corregir, devolver o anular facturas; manejar cotizaciones, facturas abiertas (en espera) y entregas pendientes (modo Fabricación). Desde la misma pantalla se crean los borradores de FE/DS que luego envía el módulo FE.

**Pantallas (frontend, rutas relativas a `Dashboard-Facturación/src`):**
- `components/VentasTabs.tsx` (vista `nueva-venta`, `components/Dashboard.tsx:1598`): contiene `NuevaVenta` (`VentasTabs.tsx:411`), `BuscarVentaModal` (`:424`), `DetalleFacturaModal` (`:432`), facturas abiertas y cotizaciones.
- `components/NuevaVenta.tsx`: captura de la venta, búsqueda de artículos, pago, abono, retenciones y apertura de caja.
- `components/SalesManagement.tsx` (vista `sales`, `Dashboard.tsx:1599`): listado, detalle y anulación desde el listado.
- `components/DetalleFacturaModal.tsx`: editar, devolver, anular y marcar entregado (se abre también desde `SalesManagement.tsx:438`, `ClienteDetalle.tsx:1060` y `Kardex.tsx:356`).
- `components/PendientesEntrega.tsx` (vista `pendientes-entrega`, `Dashboard.tsx:1605`).
- `components/VentasPorTipoPago.tsx` (`Dashboard.tsx:1602`), `components/HistorialPreciosVentaModal.tsx`, `components/DashboardVendedor.tsx`, `components/BuscarVentaModal.tsx`, `components/informes/InformeVentasPorProducto.tsx:8` (usa el GET de búsqueda de `nueva.php`).

**Endpoints (backend `conta-app-backend/api/ventas/`):**
| Endpoint | Método / action | Uso |
|---|---|---|
| `nueva.php` | GET `?buscar=` / `?codigo=` | búsqueda de artículos |
| `nueva.php` | POST | crear venta POS o borrador FE/DS |
| `detalle-factura.php` | GET `?id=` | detalle, pagos y devoluciones |
| `detalle-factura.php` | POST `editar` / `devolucion` / `anular` | corrección, devolución parcial, anulación |
| `marcar-entregado.php` | POST | entrega total o parcial de una línea pendiente (POS o FE) |
| `listar.php` | GET | listado con filtros / `?id=` detalle |
| `copiar.php` | GET `?id=` | precarga de una venta en NuevaVenta |
| `cotizaciones.php` | GET / POST `create`·`delete`·`to-sale` | cotizaciones |
| `facturas-abiertas.php` | GET / POST `create`·`delete` | ventas en espera |
| `pendientes-entrega.php` | GET | pendientes de entrega POS+FE |
| `por-tipo-pago.php`, `historial-precios.php`, `ultimo-precio.php` | GET | reportes y consultas |
| `vendedores.php`, `numero-factura.php`, `crear-factura.php` | GET / GET / POST | **sin uso en el frontend** (grep en `src/` sin resultados) |

## Flujos principales

### 1. Crear venta POS
- **Pantalla → endpoint:** `NuevaVenta.tsx:1616` → `ventas/nueva.php` POST (`tipo_documento='pos'`). Antes de enviar hace un GET a `caja/sesion.php?usuario=` (`NuevaVenta.tsx:1502`).
- **Lee:** `tblsesiones_caja` (`nueva.php:168`), `tbldatosempresa` Regimen/IvaIncluido (`:186`), `tblarticulos` (Servicio `:537`, componentes `:582`, existencia y costo `:640`), `tblproducto_componentes` (`:592`), `tblpagos` MAX(RecCajaN) (`:666`).
- **Escribe:**
  - `tblventas` INSERT (`nueva.php:467`). Factura_N se genera con AUTO_INCREMENT; EstadoFact='Valida'; CodigoEmp=0.
  - `tbldetalle_venta` INSERT por línea (`:501`), con Entregado, CantidadEntregada, FechaEntrega y DescripcionTemp.
  - `tblarticulos` UPDATE `Existencia - cant` (`:509`, `:606`, `:638`).
  - `tblkardex` INSERT C_D=2 con Detalle "Venta Fra. N° X" (`:649`). En compuestos: una fila por componente con "Consumo por venta de …" (`:614`) y otra informativa del padre con cantidad 0 (`:629`).
  - `tblpagos` INSERT del abono inicial cuando es crédito y abono > 0 (`:677`): Fact_N=Factura_N, `id_usuario=vendedor`.
  - `tblventa_retenciones` INSERT, snapshot de retenciones (`:700`).
- **Efectos colaterales:** baja stock y escribe kardex (excepto servicios `:576` y líneas con Entregado='N' `:579`). El abono entra al cuadre de caja vía `tblpagos` (`caja/sesion.php:214`). Los triggers `trg_sync_venta_insert` y `trg_sync_pago_insert` encolan en `tbl_sync_outbox` (`sql/actualizacion_completa.sql:2551,2584`). El frontend **no** llama `triggerNotifRefresh` (grep: solo `LotesPorVencer.tsx` y `NotasArticulo.tsx`).
- **Transacción:** sí. `beginTransaction` en `nueva.php:138`, `commit` en `:718`, `rollBack` en `:730`. Los `exit` de validación en `:178` y `:240` salen **dentro** de la transacción sin rollBack explícito; el rollback ocurre de forma implícita al cerrarse la conexión.
- **Consecutivos:** Factura_N con AUTO_INCREMENT. RecCajaN con `MAX+1` sin bloqueo (`:666`).
- **Validaciones que solo hace el frontend:**
  - Stock suficiente (`permitirFacturarNegativo`, `NuevaVenta.tsx:720`).
  - Precio ≤ costo y precio mínimo (`:731-740`).
  - Cupo de crédito con autorización admin (`:1535-1545`). El backend recibe `autorizado_por` (`:1591`) pero **no lo lee ni lo guarda**.
  - Correo válido para FE (`:1521`).
- **El backend sí valida:** caja abierta del vendedor (`nueva.php:167-180`), abono < total (`:234`) y servicio contra catálogo (`:535-543`).

### 2. Crear borrador FE/DS (enlace con el módulo FE)
- **Pantalla → endpoint:** `NuevaVenta.tsx:1616` → `nueva.php` POST (`tipo_documento='electronica'|'soporte'`). Después llama `facturacion-electronica/enviar.php` `action:'factura'` con `doc_elec_id` (`NuevaVenta.tsx:1671-1683`).
- **Escribe:**
  - `electronic_documents` UPDATE: los borradores con number=0 se mueven a `9000000000+id` (`nueva.php:296`).
  - `electronic_documents` INSERT con status='borrador', number=0, prefix FCON/DS (`:323`).
  - `detalle_document_electronic` INSERT (`:372`).
  - `tblpagos` INSERT del abono inicial con `Fact_N=NULL` y `Nfact_electronica="FCON-<id>"` (`:436-446`).
- **Efectos:** **no** toca stock ni kardex (`:343-353`); eso queda a cargo de `enviar.php` cuando DIAN autoriza (`facturacion-electronica/enviar.php:932-933`). Si la venta es crédito con abono, el pago entra en `tblpagos` aunque la FE nunca llegue a autorizarse.
- **Transacción:** sí (`nueva.php:138` → `:449`).
- **Consecutivos:** FE sin número hasta DIAN (number=0). `id` con AUTO_INCREMENT.

### 3. Editar factura (cliente / fecha / tipo / medio)
- **Pantalla → endpoint:** `DetalleFacturaModal.tsx:148` → `detalle-factura.php` POST `editar`.
- **Lee:** `tblventas` (`:85`), `tblpagos` (pagos manuales, `:99`) y `electronic_documents` (`:114`).
- **Escribe:**
  - `tblventas` UPDATE de cliente, Tipo, Dias, Fecha, id_mediopago, efectivo y valorpagado1 (`:146`).
  - `tblventas` UPDATE de Saldo/pagada (`:163`, `:166`).
  - `tblpagos` INSERT "Pago total al convertir a Contado" (`:183`).
  - `tblpagos` UPDATE Estado='Anulada' cuando vuelve a crédito (`:208`).
  - `tblpagos` UPDATE id_mediopago (`:220`).
- **Efectos:** caja. El cobro automático entra al cuadre con la Fecha de hoy.
- **Transacción:** **no** (son 3 a 4 UPDATE/INSERT sin transacción).
- **Consecutivos:** RecCajaN con `MAX+1` (`:180`).
- **Validaciones:** el backend bloquea si hay pagos manuales (`:99-109`). El bloqueo de fecha FE busca `prefix='FE'` (`:116`), pero `nueva.php` usa `FCON`/`DS` (`nueva.php:291`), así que la regla nunca se activa para FE nuevas (además, las FE ya no viven en tblventas desde v4.6).

### 4. Devolución parcial
- **Pantalla → endpoint:** `DetalleFacturaModal.tsx:182` → `detalle-factura.php` POST `devolucion`.
- **Escribe:**
  - `tbldetalle_venta` UPDATE de Cantidad, Dev, Subtotal e Impuesto (`:292`).
  - `tblarticulos` UPDATE `Existencia + cant` (`:296`).
  - `tbldevolucion_ventas` INSERT (`:300`).
  - `tblkardex` INSERT C_D=1 con Detalle "Dev. Fra. N° X" (`:310`).
  - `tblventas` UPDATE Total (`:334`).
  - `tblventas.Saldo` vía `recalcularSaldoFactura` (`config/saldo_helper.php:72`) si es crédito, o `Saldo=0` (`:340`) si es contado.
  - `tblmov_caja` INSERT 'gasto' "Reembolso por devolución parcial FV-X" si es contado (`:360`).
- **Transacción:** sí (`:247` → `:369`).
- **Validaciones:** exige caja abierta del usuario para contado (`:346-357`). **No** valida autorización: el frontend manda `autorizado_por` (`DetalleFacturaModal.tsx:186`) pero el backend lo ignora. No salta servicios ni descompone compuestos (ver "Qué se rompe").

### 5. Anular factura POS
- **Pantalla → endpoint:** `DetalleFacturaModal.tsx:218` y `SalesManagement.tsx:204` → `detalle-factura.php` POST `anular`.
- **Lee:** `tblventas`, `tblsesiones_caja`+`tblcajas` (caja abierta **hoy**, `:398-406`), `tblusuarios` (`:423`), `tbldetalle_venta`.
- **Escribe:**
  - `tblarticulos` UPDATE `+CantidadEntregada` (`:478`).
  - `tblkardex` INSERT C_D=1 "Anulación Fra. N° X" (`:488`).
  - `tblventas` UPDATE EstadoFact='Anulada', Saldo=0 (`:494`).
  - `tblmov_caja` INSERT 'gasto' "Reembolso por anulación FV-X" (`:504`).
  - `tblsesiones_caja` UPDATE `Anulaciones +` (`:512`).
- **Efectos:** la caja descuenta el reembolso en el cuadre por `Descripcion LIKE 'Reembolso por %'` (`caja/sesion.php:237`). Las anuladas siguen sumando bruto en ventas contado (`sesion.php:159`). Trigger `trg_sync_venta_update` → operación 'anular' (`actualizacion_completa.sql:2556`).
- **Transacción:** sí (`:454` → `:518`). Las validaciones previas quedan fuera de la transacción.
- **Validaciones:** un vendedor solo anula su propia venta dentro de su sesión abierta (`:427-450`). Si llega `autorizado_por` ≠ 0, el backend **lo acepta sin verificar** (`:375`, `:422`). La verificación real de credenciales solo ocurre en el frontend (`components/AutorizacionAdminModal.tsx:6` → `auth/verify-admin.php`).

### 6. Marcar entregado (modo Fabricación)
- **Pantalla → endpoint:** `DetalleFacturaModal.tsx:74`, `PendientesEntrega.tsx:86` → `marcar-entregado.php` POST.
- **Escribe, origen POS:**
  - `tblarticulos` `-cant` (`:138`).
  - `tblkardex` C_D=2 con la fecha de entrega elegida (`:152`).
  - `tbldetalle_venta` Entregado, CantidadEntregada, FechaEntrega, UsuarioEntrego (`:163`).
- **Escribe, origen FE:**
  - `tblarticulos` (`:78`).
  - `tblkardex` (`:92`).
  - `detalle_document_electronic` (`:104`).
- **Transacción:** sí (`:39` → `:167`).
- **Validaciones:** tope al faltante (`:62-64`, `:126-128`). No salta servicios ni compuestos.

### 7. Cotizaciones y facturas abiertas
- **Pantalla → endpoint:** `VentasTabs.tsx:125/188/213/254/307/318` → `cotizaciones.php` y `facturas-abiertas.php`.
- **Escribe:**
  - `tblcotizaciones` y `detalle_cotizacion` (`cotizaciones.php:68-80`): INSERT o UPDATE, más DELETE+INSERT del detalle.
  - DELETE físico al eliminar (`cotizaciones.php:35-36`).
  - `facturasv_abiertas` y `detalle_fact_abietas`: el mismo patrón (`facturas-abiertas.php:39-40`, `:57-69`).
- **Transacción:** sí en ambos.
- **Efectos:** ninguno sobre stock ni caja. `to-sale` solo devuelve datos (`cotizaciones.php:39-53`).

### 8. Copiar venta
- **Pantalla → endpoint:** `NuevaVenta.tsx:909`, `SalesManagement.tsx:44` → `copiar.php` GET.
- **Lee:** `tblventas`, `tblclientes`, `tbldetalle_venta` y `tblarticulos`, con precios actuales del catálogo (`copiar.php:59-75`).

### 9. Consultas
- `listar.php` (`SalesManagement.tsx:87`, `BuscarVentaModal.tsx:51`, `DashboardVendedor.tsx:5`) lee tblventas, tbldetalle_venta, tblmedios_pago, tblempleados, `tbl_pedidos_vendedor`, `tbl_vendedores_movil` (`listar.php:27-32`) y `vw_facturas_cliente_saldos` cuando `con_saldo=1` (`:136`).
- `por-tipo-pago.php` lee `vw_facturas_cliente_saldos` (`:75`) con YEAR/MONTH.
- `pendientes-entrega.php` hace UNION de tbldetalle_venta y detalle_document_electronic (`:43`, `:79`).
- `ultimo-precio.php` (`NuevaVenta.tsx:637`) y `historial-precios.php` (`:62`) leen tbldetalle_venta+tblventas.

## Dependencias
- **Usa de otros módulos:**
  - `config/saldo_helper.php` (`recalcularSaldoFactura`, `detalle-factura.php:337`).
  - `caja/sesion.php` desde el frontend (`NuevaVenta.tsx:305,1029,1502`).
  - `facturacion-electronica/enviar.php` (`NuevaVenta.tsx:14,1671`) y `facturacion-electronica/copiar.php` (`:902`).
  - `familias/distribuir.php` (`NuevaVenta.tsx:15,1276,1288`).
  - `vendedores/pedidos.php` `marcar_procesado` (`NuevaVenta.tsx:1361`).
  - `clientes/info-credito.php`, `clientes/buscar.php`, `retenciones/listar.php`, `dian/consultar-adquiriente.php`.
- **Lo usan otros módulos (grep en `api/`):**
  - **Escriben `tblventas`:** `vendedores/pedidos.php:340` (convertir pedido móvil en POS), `facturacion-electronica/enviar.php:478,862,1261,1568,1781` (flujo FE legacy sobre tblventas), `config/saldo_helper.php:72`.
  - **Escriben `tbldetalle_venta`:** `vendedores/pedidos.php:372`.
  - **Escriben `tblkardex`/`Existencia` por ventas fuera de este módulo:** `facturacion-electronica/enviar.php:932-933,1279-1280,1757-1760`.
  - **Leen tblventas/tbldetalle_venta:** caja (`sesion.php`, `estado.php`, `movimientos.php`), clientes (`detalle.php`, `pagos.php`, `comportamiento.php`, `top.php`, `listar.php:214`), `dashboard/resumen.php`, `dashboard/top-productos.php`, `informes/*` (`resumen`, `ingresos-totales`, `vendedores`, `ventas-por-producto`), `inicio/sugerencias.php`, `inventario/conteo.php`, `inventario/detalle-producto.php`, `inventario/eliminar-articulo.php`, `proveedores/productos.php`, `facturacion-electronica/listar.php`, `facturacion-electronica/copiar.php`.
  - `tbldevolucion_ventas` lo lee `inventario/detalle-producto.php`.
  - `tblventa_retenciones` lo leen `facturacion-electronica/enviar.php` y `retenciones/listar.php`.
- **Triggers / vistas:**
  - Triggers `trg_sync_venta_insert/update` (`actualizacion_completa.sql:2551-2559`) y `trg_sync_pago_insert/update` (`:2584-2592`).
  - Vista `vw_facturas_cliente_saldos` (`:931-962`): solo crédito con EstadoFact='Valida'; pagos por `Fact_N` o `NFactAnt` numérico.
- **Compatibilidad:**
  - `nueva.php` es portable: usa PRAGMA o information_schema según el driver (`:23-35`, `:308-319`, `:358-369`).
  - `crear-factura.php` usa `FOR UPDATE`, `MONTHNAME` y tablas `tblfacturas`/`tbldetallefactura`, que no existen en `sql/conta_template_limpio.sql` (grep = 0).
  - `por-tipo-pago.php`/`listar.php` usan YEAR/MONTH, emulados en SQLite (`config/db_factory.php:223-232`).
  - `detalle-factura.php:402` usa `DATE(...) = CURRENT_DATE`. En SQLite, `CURRENT_DATE`/`CURRENT_TIMESTAMP` como palabra clave son UTC: la función registrada en `db_factory.php:261` no reemplaza la palabra clave. (Sospecha, sin verificar en ejecución.)

## Qué se rompe si lo tocas
- **Cambiar el texto del Detalle de kardex** ("Venta Fra. N° X", "Anulación Fra. N° X") rompe la query de diagnóstico 4.4 de PROCESOS_SISTEMA.md (`LIKE '%Fra%'`) y los scripts correctivos idempotentes.
- **Cambiar la descripción "Reembolso por …"** en `detalle-factura.php:359,501` hace que el cuadre deje de restar el reembolso (`caja/sesion.php:237,494`, `caja/estado.php:102`), porque el cuadre filtra por ese texto.
- **Cambiar `DetallePago LIKE 'Pago total al convertir%'`** (`detalle-factura.php:196`) rompe la reversión del caso 2 y del caso 3 (`:211`, `:223`) y el chequeo de pagos manuales (`:102`).
- **Cambiar el formato de `Nfact_electronica`** del abono FE (`nueva.php:445`) afecta `vw_facturas_elec_cliente_saldos`, que hace `CAST(... AS UNSIGNED)` (`actualizacion_completa.sql:~1075`). El formato actual "FCON-<id>" ya produce CAST=0 (ver bugs).
- **Cambiar el filtro de caja abierta** en `nueva.php:167` afecta qué ventas entran a qué sesión: el cuadre usa `Fecha >= FechaApertura AND Id_Usuario` (`sesion.php:159`).
- **Cambiar EstadoFact o Tipo** ('Valida'/'Anulada', 'Contado') rompe las vistas de saldo, el cuadre y el trigger de sync, que dependen de esos literales.
- **Si se reactiva `crear-factura.php`:** escribe en tablas inexistentes y usa kardex C_D=1 para una salida (`crear-factura.php:165`).

## Evaluación de la implementación

**Confirmado:**
1. **Devolución y anulación no saltan servicios.** `detalle-factura.php:296` y `:478` suman Existencia y kardex sin chequear `Servicio`. `nueva.php:576` nunca los descontó, así que viola la regla de oro 2 de PROCESOS_SISTEMA.md.
2. **Devolución y anulación no manejan productos compuestos.** La venta descuenta componentes, no al padre (`nueva.php:590-635`). La anulación y la devolución reponen al **padre** (`detalle-factura.php:296`, `:478`): el stock del padre se infla y los componentes nunca vuelven. `marcar-entregado.php:138` tampoco descompone.
3. **Abono inicial FE no se vincula a su documento.** `Nfact_electronica="FCON-<id>"` (`nueva.php:382,445`), pero la vista agrupa por `CAST(NULLIF(Nfact_electronica,'') AS UNSIGNED)`, que da 0 (`actualizacion_completa.sql` vista 2c). La FE crédito aparece con el saldo completo en cartera, aunque el abono sí entró a caja. `clientes/pagos.php:297` usa el formato correcto (`strval(id)`).
4. **Anulación con `autorizado_por` falsificable.** El backend confía en un entero del cliente (`detalle-factura.php:375,422`).
5. **Anular una venta crédito no anula sus pagos.** `tblpagos` queda 'Valida' (`detalle-factura.php:454-518` no toca tblpagos). Esos abonos siguen sumando en caja y en informes (`informes/ingresos-totales.php` lee tblpagos), aunque la vista excluye la factura.
6. **Cupo, stock negativo y precio mínimo solo se validan en el frontend.** `nueva.php` no los revisa, en contra de "Validaciones previas" de PROCESOS_SISTEMA §2.2.
7. **`editar` no es transaccional y su chequeo FE usa un prefijo que no existe** ('FE' vs 'FCON') (`detalle-factura.php:116`).
8. **PROCESOS_SISTEMA §2.2 está desactualizado.** Nombra `api/ventas/crear-factura.php` como endpoint POS. El real es `ventas/nueva.php`; `crear-factura.php` es código muerto que apunta a tablas inexistentes.
9. **`vendedores/pedidos.php:340-388` (otro grupo) crea ventas POS sin kardex.** Viola la regla de oro 1. Además deja `PrecioC=0`, suma el IVA encima sin mirar IvaIncluido ni Régimen (`:321-324`) y no valida caja abierta.
10. **RecCajaN con `MAX+1` sin lock** (`nueva.php:432,666`, `detalle-factura.php:180`). Puede duplicar el número de recibo con dos cajeros simultáneos.

**Sospecha:**
- En SQLite, la comparación `DATE(FechaApertura) = CURRENT_DATE` (`detalle-factura.php:402`) falla después de las 19:00 hora Colombia, porque la palabra clave es UTC (sin verificar).
- `exit` dentro de una transacción abierta (`nueva.php:178,240`) depende del rollback implícito de PDO al cerrar la conexión.

**Contraste con PROCESOS_SISTEMA.md:**
- POS cumple la doble escritura Existencia+kardex en la creación.
- Devolución y anulación incumplen la regla 2 (servicios).
- FE borrador cumple "no baja stock".
- El abono inicial FE se registra antes de la autorización DIAN, algo que el contrato no contempla.
