# Retenciones (tipos, conceptos de retefuente, UVT, retenciones en ventas y pagos)

**Propósito:** El módulo cubre seis piezas:
- el catálogo de retenciones (ReteIVA, ReteICA, Otras);
- los conceptos DIAN de retefuente, con base en UVT;
- el valor UVT anual;
- la asignación de retenciones por cliente;
- el snapshot de retenciones al facturar POS;
- el registro de retenciones aplicadas por el cliente al abonar, que alimenta el informe para el Formulario 350.

**Pantallas (frontend):**
| Pantalla | Dónde se abre / uso |
|---|---|
| `components/ConfigRetenciones.tsx` | vista `config-retenciones`, `Dashboard.tsx:1654` |
| `components/ConceptosRetefuente.tsx` | vista `config-conceptos-rete`, `Dashboard.tsx:1655` |
| `components/InformeRetencionesRecibidas.tsx` | vista `informe-retenciones`, `Dashboard.tsx:1643` |
| `components/RetencionesInput.tsx` | catálogo unificado en el modal de pago y en FE contado: `RetencionesInput.tsx:24,65` |
| `components/CustomersManagement.tsx` | retenciones del cliente: `:37,116,124,180` |
| `components/NuevaVenta.tsx` | `:16,1062-1063` |
| `components/ClienteDetalle.tsx` | envía `retenciones[]` dentro de `clientes/pagos.php`: `ClienteDetalle.tsx:184` |

**Endpoints (backend):**
- `retenciones/listar.php`
  - GET: todas las retenciones; con `?activas=1` solo las activas; con `?cliente=N` las del cliente.
  - POST `crear` / `editar` / `eliminar` / `set_cliente`.
- `retenciones/catalogo-unificado.php`: GET.
- `retenciones/uvt.php`: GET y POST `guardar` / `sincronizar`.
- `retenciones/informe.php`: GET `?desde=&hasta=`.
- `retenciones/pago.php`: GET `?id_pago=` y POST `aplicar`. **Sin uso en el frontend:** el grep de `retenciones/pago` en `src/` no da resultados.
- `conceptos-retefuente/index.php`: GET y POST `crear` / `editar` / `toggle` / `eliminar` (este último es un soft delete con `activo=0`).

## Flujos principales

### 1. CRUD de tipos de retención
- **Pantalla → endpoint:** `ConfigRetenciones.tsx:38,58,70` → `listar.php`.
- **Escribe en `tblretenciones`:**
  - crear: INSERT (`listar.php:60`).
  - editar: UPDATE (`:66`).
  - eliminar: DELETE (`:85`), o UPDATE `Activa=0` (`:82`) si ya se usó en `tblventa_retenciones` (`:78`).
- **Transacción:** no.

### 2. Retenciones del cliente
- **Pantalla → endpoint:** `CustomersManagement.tsx:180` → `listar.php` POST `set_cliente`.
- **Escribe:**
  - `tblclientes.retencion_modo` (`:98`).
  - `tblcliente_retenciones`: DELETE + INSERT (`:99-104`).
- **Transacción:** sí (`:97` → `:107`).

### 3. Snapshot de retenciones en la venta POS
- **Pantalla → endpoint:** `NuevaVenta.tsx:1614` (`retenciones: retencionesCalc`) → `ventas/nueva.php`.
- **Escribe:** `tblventa_retenciones` (`ventas/nueva.php:699-716`), dentro de la transacción de la venta.
- **Efectos:**
  - Es informativo o *gross_up*: el frontend ya re-escaló los precios cuando aplica gross-up (`NuevaVenta.tsx:1574-1576`).
  - **No** reduce `tblventas.Saldo` ni el Total.
  - En el flujo FE (`nueva.php:278-461`) **no** se guarda el snapshot. `facturacion-electronica/enviar.php` lee `tblventa_retenciones` y `tblretenciones` (grep); queda sin verificar si FE las arma por otra vía.

### 4. Retenciones aplicadas al abonar
- **Pantalla → endpoint:** `ClienteDetalle.tsx:181` → `clientes/pagos.php` (`:404-432`).
- **Escribe:** `tbl_retenciones_pago`, ligada al primer `Id_Pagos` POS del recibo.
- **Efecto sobre el saldo:**
  - `config/saldo_helper.php:53-68` resta estas retenciones del saldo cacheado `tblventas.Saldo`.
  - La vista de cartera **no** las resta (`actualizacion_completa.sql:941-951`).
- `retenciones/pago.php` (POST `aplicar`, `:35-80`) inserta en la misma tabla, pero **no** recalcula el saldo y no tiene caller.

### 5. UVT y conceptos de retefuente
- **Pantalla → endpoint:** `ConceptosRetefuente.tsx:59,76` → `uvt.php`; `ConceptosRetefuente.tsx:113,128` → `conceptos-retefuente/index.php`.
- **Escribe:**
  - `tbldatosempresa.uvt_*` (`uvt.php:49,70`). Usa `exec()` con valores interpolados, saneados con `floatval`/`intval` (`:44-45`).
  - `tbl_conceptos_retefuente` (`conceptos-retefuente/index.php:47,68,77,86`).
- **Efecto externo:** ninguno. "sincronizar" usa una tabla local `$UVT_OFICIAL`, no una API DIAN (`uvt.php:54-60`).

### 6. Informe de retenciones recibidas
- **Pantalla → endpoint:** `InformeRetencionesRecibidas.tsx:5` → `informe.php`.
- **Lee:**
  - `tbl_retenciones_pago` JOIN `tblpagos` + `tblclientes` (`informe.php:23-25`).
  - `tbl_retenciones_factura` (`:39`).
- **No lee** `tblventa_retenciones`, que es el snapshot del POS.

## Dependencias
- **Usa de otros módulos:** `tblclientes`, `tblpagos`, `tbldatosempresa`.
- **Lo usan otros módulos:**
  - `ventas/nueva.php` escribe `tblventa_retenciones`.
  - `clientes/pagos.php` escribe `tbl_retenciones_pago`.
  - `config/saldo_helper.php:56` e `informes/ingresos-totales.php` leen `tbl_retenciones_pago`.
  - `facturacion-electronica/enviar.php` lee `tblretenciones` y `tblventa_retenciones`.
  - `clientes/pagos.php:95` lee `tbl_retenciones_pago`.
- **Triggers / vistas:** ninguno propio. Tablas: `tblventa_retenciones` (`actualizacion_completa.sql:432`), `tbl_retenciones_factura` (`:2324`).
- **Compatibilidad:** sin funciones exclusivas de MySQL relevantes.

## Qué se rompe si lo tocas
- **Si cambias `tbl_retenciones_pago.Id_Pagos`** o la regla de "primer pago" en `clientes/pagos.php:395`: cambia qué factura cierra la retención según `recalcularSaldoFactura`.
- **Si agregas las retenciones a la vista `vw_facturas_cliente_saldos`:** se corrige la discrepancia con el caché, pero cambian la cartera, `info-credito` (cupo) y `por-tipo-pago` de forma retroactiva.
- **Si eliminas un tipo de retención** sin respetar `tblventa_retenciones` (`listar.php:78`): rompes el histórico de ventas. El snapshot guarda Codigo/Nombre, pero también `Id_Retencion`.

## Evaluación de la implementación
**Confirmado:**
1. **Desalineación entre vista y helper.** La vista ignora las retenciones y el helper las resta (detalle en `clientes-cartera.md`). Una factura cerrada con retención queda con saldo fantasma en cartera.
2. **Nadie escribe `tbl_retenciones_factura`.** Solo `retenciones/informe.php:39` la referencia (grep en `api/`). Por eso las retenciones de ventas de contado nunca salen en el informe del Formulario 350. El snapshot real del POS (`tblventa_retenciones`) no lo lee el informe.
3. **`retenciones/pago.php` está huérfano** (sin caller) y además no recalcula el saldo.
4. **Retenciones descartadas en silencio** cuando el recibo no incluye una factura POS (`clientes/pagos.php:410`).

**Contraste con PROCESOS_SISTEMA.md:** el contrato no cubre retenciones.
