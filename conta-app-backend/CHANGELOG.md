# Historial de Versiones — Conta FT

Registro de cambios, mejoras y correcciones por versión.
Visible solo para administradores desde **Configuración → Acerca de → Ver historial**.

---

## 4.3.45 — 2026-05-26

### Correcciones de bugs críticas (Facturación Electrónica)
- **DIAN rechazaba ventas a crédito con regla FAN04** ("crédito sin fecha en que se comprometió el pago"). El JSON enviado a la API Lumen no incluía `payment_due_date` ni `duration_measure`. Ahora se calculan a partir de `tblventas.Fecha + Dias` y se envían cuando `Tipo='Crédito'`
- **Abonos iniciales no llegaban a DIAN**: si una factura a crédito tenía abono al momento de emitir (campo `Abono`, `efectivo` o `valorpagado1`), DIAN no lo veía. Ahora se envía como `pre_paid_amount` en `legal_monetary_totals`. PrePaidAmount = $3M y PayableAmount = $5M deja claro a DIAN que el cliente debe $2M
- **Fix bloqueo "Duplicate entry FCON-0 for key uq_prefix_number"**: si un envío FE fallaba, la fila `(prefix='FCON', number=0, status='rechazado')` quedaba bloqueando todos los envíos siguientes por el UNIQUE constraint. Ahora antes de cada INSERT se mueven los huérfanos a `number = 9000000000 + id` (rango lejos de consecutivos reales DIAN), liberando el slot `(FCON, 0)` sin perder la huella de los intentos fallidos — el usuario sigue viendo sus rechazadas en el listado FE
- **Validación previa al envío DIAN**: nueva función `validateInvoiceForDIAN()` que verifica NIT, razón social, fecha, líneas, días en crédito y que abono ≤ total ANTES de gastar el envío. Si falla, aborta con mensaje claro y no consume rate-limit ni gasta consecutivos

### Mejoras de UX
- **Listado de Ventas POS — filtro por día**: nuevo selector "Día" en la toolbar al lado del Mes. Se desactiva si el mes está en "Todos" y se autoadapta al número de días reales del mes (28/29/30/31)
- **PDF de FE — wrap automático de la Nota**: la línea "Nota: ..." al pie del PDF usaba `Cell` de ancho fijo que cortaba el texto cuando era largo (caso anticipo + saldo pendiente). Ahora usa `MultiCell` con ancho 90mm que envuelve a segunda línea

### Correcciones de bugs (pagos)
- **Backend rechaza `ValorPago < 0` o `Descuento < 0`** en el bulk de pagos: aborta toda la transacción con mensaje claro. Antes solo bloqueaba si AMBOS eran ≤ 0
- **Pagos: si `saldoActual ≤ 0` se salta la factura** (ya está saldada o el cache está mal). Antes el clamp "no sobrepagar" convertía pagos positivos en negativos cuando el saldo cacheado venía corrupto — caso JAIME OSTEN factura 213 que terminó con `ValorPago = -$4.037.000`
- **Clamp "no sobrepagar" usa `max(.., 0)`** por defensa adicional: aunque un saldo raro pase los filtros, el ValorPago nunca puede quedar negativo
- **Label "Pago Final" solo si arrancábamos con saldo > 0**: antes, un abono de $44.000 sobre una factura de $950.000 podía etiquetarse "Pago Final" si el cache del saldo venía corrupto en 0. Aplicado en insert y edición de pago

### Nota importante para BD del cliente
La API Lumen DIAN tenía un typo en el template XML: `<cbc:PrePaidAmount>` con P mayúscula, cuando el schema DIAN exige `<cbc:PrepaidAmount>`. Corregido en `api-electronica/resources/views/xml/_legal_monetary_total.blade.php` — verificar que el hosting tenga la versión actualizada y el cache de vistas Laravel limpio

---

## 4.3.44 — 2026-05-25

### Correcciones de bugs críticas (FE y pagos)
- **Reintentar DIAN se bloqueaba con `Duplicate entry 'FCON-0'`**: cuando un envío de FE fallaba, dejaba una fila `(prefix='FCON', number=0, status='rechazado')` en `electronic_documents`. El siguiente intento (reintentar o enviar otra FE) intentaba insertar otra fila con `(FCON, 0)` y violaba el unique constraint `uq_prefix_number`. Ahora antes del INSERT se mueven todas las filas `(FCON, 0, pendiente/rechazado)` a `number = -id` para liberar el slot, preservando historial. Aplicado en envío inicial y en `reenviar_contingencia`
- **Pagos: clamp "no sobrepagar" convertía pagos positivos en negativos** cuando el saldo cacheado venía corrupto. Caso JAIME OSTEN factura 213: cache en -$4.037.000 + distribución de $456.000 → terminó insertando ValorPago = -$4.037.000. Ahora si `saldoActual ≤ 0` se salta esa factura (ya está saldada o el dato está mal), y el clamp usa `max(.., 0)` por defensa
- **Rechazo explícito de `ValorPago < 0` o `Descuento < 0`** en el bulk de pagos: aborta toda la transacción con mensaje claro. Antes solo bloqueaba si AMBOS eran ≤ 0 (hueco que permitía digitación manual envenenada)
- **Label "Pago Final" solo si arrancábamos con saldo > 0**: antes, un abono de $44.000 sobre una factura de $950.000 podía etiquetarse como "Pago Final" si el cache del saldo venía corrupto en 0. Aplicado en insert y edición de pago

---

## 4.3.43 — 2026-05-25

### Correcciones de bugs críticas (vistas de saldo)
- **Las vistas `vw_facturas_cliente_saldos`, `vw_facturas_anteriores_cliente` y `vw_facturas_elec_cliente_saldos` no filtraban `ValorPago > 0`**, así que cualquier fila en `tblpagos` con `ValorPago < 0` (residuo de la era del cache desincronizado pre-4.3.41) envenenaba el SUM y la vista devolvía `Saldo > Total`. Cliente de Nutrigranos seguía viendo factura 213 con saldo $5.069.000 sobre un Total de $1.032.000 incluso después de actualizar a 4.3.42, porque la vista en su BD todavía sumaba un pago histórico de -$4.037.000 (Estado='Valida'). Ahora las 3 vistas filtran `tp.ValorPago > 0` defensivamente — el pago corrupto se ignora y el saldo vuelve a ser real
- **Definición de `vw_facturas_elec_cliente_saldos` agregada a `sql/actualizacion_completa.sql`**: antes solo existía en producción creada manualmente, no estaba versionada. Ahora se recrea cada vez que se corre la migración (idempotente, condicionada a que exista `electronic_documents`)

### Pasos para BDs de clientes con datos legacy
1. Ejecutar `sql/actualizacion_completa.sql` para que las vistas se recreen con el filtro defensivo
2. Ejecutar `sql/resync_saldos_clientes.sql` para resincronizar el cache `tblventas.Saldo` desde la vista corregida

A partir de 4.3.41 cada operación de pago llama `recalcularSaldoFactura()` filtrando `ValorPago > 0` en la fuente, así que ningún cliente nuevo va a tener este problema.

---

## 4.3.42 — 2026-05-25

### Correcciones de bugs
- **Preview de tirilla mostraba Total inflado con IVA fantasma en Régimen Simplificado**: la función `buildDatosFactura()` calculaba `iva = subtotal × l.Iva%` leyendo el porcentaje del catálogo (`tblarticulos.Iva`) sin importar el régimen de la empresa. Un MAÍZ con `Iva=5` sumaba 5% al Total ($62.000 → $65.100) solo en la preview que sale al guardar la venta. Al reimprimir desde el Listado de Ventas salía bien porque ese path lee `Total` directo de la BD (que el backend ya guarda sin IVA en Simplificado desde 4.3.33). Ahora `buildDatosFactura` consulta el régimen del cache de empresa y omite el cálculo si no es Responsable de IVA
- **Toggle "Agrupar productos iguales" huérfano**: la opción aparecía en Configuración → Datos en la Factura Impresa pero no estaba conectada a ninguna lógica (código muerto). Apagarla no cambiaba nada porque el comportamiento real lo controla **"Permitir el mismo producto en varias líneas"** (más abajo en la misma pantalla). Eliminado el toggle huérfano para no confundir

---

## 4.3.41 — 2026-05-25

### Correcciones de bugs críticas (saldos de cartera)
- **Cache de `tblventas.Saldo` desincronizado generaba saldos negativos y montos inflados en informes**. Diagnóstico: el campo `Saldo` se mantenía con `UPDATE` incremental (`Saldo = Saldo - :pago`), pero si entraba un pago con `ValorPago < 0` (anulación mal hecha, edición manual) o se editaba el Total de la factura, el delta componía errores y dejaba el cache desfasado de la realidad (tblpagos). El cliente nuevo de Nutrigranos vio saldo $-2.849.000 en JAIME OSTEN al cabo de 15 días — sin haber hecho nada raro, simplemente el flujo normal lo desincronizaba
- **Self-healing del cache**: nuevo helper [`api/config/saldo_helper.php`](conta-app-backend/api/config/saldo_helper.php) con `recalcularSaldoFactura()` que NO calcula delta — lee `tblventas.Total` + `SUM(ValorPago)` de tblpagos válidos y persiste el saldo real. Se llama después de cada inserción/anulación/edición de pago y después de editar el Total de una factura. Tras cualquier operación, el cache queda en sincronía con la fuente real
- **Todos los endpoints de lectura de saldo ahora consultan la VISTA `vw_facturas_cliente_saldos` (calculada en vivo desde tblpagos), no el cache**:
  - `api/dashboard/resumen.php` (Cuentas por cobrar del dashboard inicio)
  - `api/informes/resumen.php` (Cartera, Ventas listado, Top Clientes)
  - `api/ventas/listar.php` (Listado de ventas POS)
  - `api/ventas/por-tipo-pago.php` (Listado por medio de pago)
  - `api/clientes/comportamiento.php` (Clasificación de morosos)
  - `api/clientes/pagos.php` (Validación de "no sobrepagar" al recibir pago)
- **Script de resincronización retroactiva** [`sql/resync_saldos_clientes.sql`](conta-app-backend/sql/resync_saldos_clientes.sql): para BDs de clientes existentes que ya tienen el cache desincronizado. Idempotente — recalcula `tblventas.Saldo` y `pagada` para todas las facturas a crédito Validas desde `SUM(ValorPago + Descuento)` filtrando pagos válidos
- **JOIN bug en informes mensuales/diarios**: las consultas de `ventas_mensual` y `ventas_diario` hacían `LEFT JOIN tbldetalle_venta` con `SUM(v.Total)`, lo que multiplicaba el Total de cada factura por su número de líneas (factura con 5 ítems contaba 5x). Resultado: utilidad inflada ~2.7x. Corregido separando los agregados en subqueries unidos por mes/día

---

## 4.3.40 — 2026-05-23

### Mejoras
- **Copiar venta POS desde Listado de Ventas**: nuevo botón verde 📋 al lado de los íconos de Ver/Imprimir en cada fila. Carga el cliente, ítems (con precios actuales del catálogo) y forma de pago en Nueva Venta para guardar como factura nueva. Mismo patrón que la copia de FE. Nuevo endpoint `api/ventas/copiar.php`

### Correcciones de bugs
- **Saldo inflado por pagos negativos en `tblpagos`**: las vistas `vw_facturas_cliente_saldos`, `vw_facturas_elec_cliente_saldos` y `vw_facturas_anteriores_cliente` hacían `SUM(ValorPago)` sin filtrar. Si una factura tenía un pago con `ValorPago ≤ 0` (de una anulación mal hecha, edición manual o migración de VB6), la suma se invertía y el saldo aparecía más alto que el Total (ej. factura de $1.032.000 mostraba saldo $5.069.000). Ahora las 3 vistas filtran `ValorPago > 0` defensivamente

---

## 4.3.39 — 2026-05-23

### Correcciones adicionales
- **NuevaVenta refresca el cache de empresa al montarse**: si quedaba un valor viejo en `localStorage` (de una sesión previa con otra BD), la tirilla podía imprimir un nombre de empresa equivocado en la primera venta. Ahora cada vez que se abre la pantalla de Nueva Venta se hace fetch al endpoint `/empresa/datos.php` y se actualiza `empresa_cache`. Las impresiones posteriores ya leen el valor correcto
- **Tirilla desde Listado de Ventas también hardcodeada**: el 4.3.37 corrigió `buildDatosFactura` (NuevaVenta) pero el botón de impresora en `SalesManagement.tsx` tenía su propio bloque `empresa: {...}` con "DISTRIBUIDORA DE SALSAS" hardcoded. Por eso al reimprimir desde el listado seguía saliendo mal. Corregido también en `SalesManagement.tsx`, `DetalleFacturaModal.tsx` y `CuentasPorCobrar.tsx` (header del informe impreso de cartera). Todos usan ahora `getEmpresaCache()`

---

## 4.3.37 — 2026-05-23

### Correcciones de bugs críticas (tirilla POS)
- **Empresa hardcodeada**: `buildDatosFactura` tenía "DISTRIBUIDORA DE SALSAS DE PLANETA RICA" fijo. Ahora lee `getEmpresaCache()` (datos reales de `tbldatosempresa`)
- **Vendedor "Vendedor" literal**: ahora pasa el nombre del usuario logueado (`user.nombre || user.username`) desde `NuevaVenta`
- **Fuente con artefactos** ("SIN IVA" → "SIK IVA"): cambiada de Courier New a Consolas / Lucida Console / DejaVu Sans Mono. Más compatible con Bixolon, Epson TM-T20, 3nStar, etc.
- **Sección "DETALLE DE LOS IMPUESTOS" se mostraba para empresas Régimen Simplificado/Simple** aunque no manejan IVA. Solo confundía al cliente. Ahora el bloque entero se renderiza únicamente cuando la empresa es Responsable de IVA (Régimen Común)

---

## 4.3.35 — 2026-05-23

### Mejoras
- **Permitir cambiar la fecha en Nueva Venta** (toggle en Configuración → Reglas de Venta, default OFF). Cuando se activa, aparece un campo Fecha en el header de Nueva Venta. Útil para negocios que no alcanzan a facturar el mismo día. El campo se resalta en naranja cuando se cambia a una fecha distinta de hoy. Backend `api/ventas/nueva.php` acepta el parámetro opcional `fecha` (YYYY-MM-DD), valida formato y deriva `N_Mes` / `anio` correctamente para que los informes mensuales y anuales clasifiquen bien
- **Preview de factura desde detalle del cliente** (estilo VB6): al hacer click en el número de factura en la pestaña Pagar o Ventas del modal del cliente, se abre el modal de detalle de la venta **encima** del modal del cliente, sin cerrarlo. Permite consultar qué se vendió sin perder el contexto del cliente. El N° de factura ahora aparece con subrayado punteado morado para indicar que es clickeable

---

## 4.3.34 — 2026-05-23

### Correcciones de bugs
- **Modal de detalle del cliente: "Saldo Pendiente" coincide con la lista de pendientes**: la card superior leía `tblventas.Saldo` directamente (campo cacheado que puede desincronizarse cuando una factura quedó marcada como `pagada=1` sin pago real en `tblpagos`), mientras la lista de "Facturas pendientes" abajo usaba la vista dinámica `vw_facturas_cliente_saldos`. Resultado: dos sumas distintas en la misma pantalla. Ahora `api/clientes/detalle.php` calcula `saldo_pendiente` desde la vista dinámica (única fuente de verdad), respetando el filtro `EstadoFact='Valida'` y restando los pagos reales de `tblpagos`

---

## 4.3.33 — 2026-05-23

### Correcciones de bugs críticas
- **Backend de ventas (`api/ventas/nueva.php`) ahora respeta el régimen de IVA**: el 4.3.30 había corregido solo el frontend (`NuevaVenta.tsx`), pero el backend seguía guardando el IVA en `tblventas.Impuesto` y `tbldetalle_venta.Impuesto`, inflando el `Total` y dejando `Saldo > 0` (el IVA fantasma) en las facturas a crédito. Ahora el backend lee `tbldatosempresa.Regimen` y si es Simplificado/Simple deja todos los `Impuesto = 0`. Empresas Responsables de IVA (Común) siguen calculando normal
- **Script de limpieza retroactiva** [`sql/fix_iva_regimen_simplificado.sql`](conta-app-backend/sql/fix_iva_regimen_simplificado.sql): para BDs que ya tenían facturas con IVA mal cargado. Aborta automáticamente si la empresa SÍ es Responsable de IVA. Recalcula `Total = Total - Impuesto`, ajusta `Saldo = max(Saldo - Impuesto, 0)` y marca como pagadas las facturas cuyo saldo era solo el IVA fantasma
- **Prevención de compras duplicadas** (`api/compras/nueva.php`): si el flujo de edición fallaba (doble click, pérdida de state), se creaba un Pedido nuevo en lugar de actualizar el existente, duplicando inventario y deuda al proveedor. Ahora antes de insertar valida que no exista otro pedido con la **misma FacturaCompra_N + mismo CodigoPro** y bloquea con mensaje claro: "Ya existe una compra registrada con la factura X de este proveedor (Pedido N° Y)..."
- **Script de limpieza puntual** [`sql/fix_pedido15_duplicado_nutrigranos2.sql`](conta-app-backend/sql/fix_pedido15_duplicado_nutrigranos2.sql): plantilla para revertir un pedido duplicado preservando el pago real. Usa transacción + validación previa + kardex de reverso (inmutable). Se puede adaptar cambiando los números de pedido

---

## 4.3.32 — 2026-05-20

### Mejoras
- **Permitir el mismo producto en varias líneas** (nuevo toggle en Reglas de Venta, default OFF). Si está activo, agregar un producto que ya está en la factura crea una línea nueva en lugar de sumar cantidad. Útil para vender a precios distintos por unidad o aplicar promociones a parte del lote
- La validación de stock ahora **suma todas las líneas del mismo Items** contra la existencia disponible (importante con el toggle anterior activo, para evitar vender más de lo que hay aunque esté repartido en varias líneas)

---

## 4.3.31 — 2026-05-20

### Mejoras
- **Nueva sección "Reglas de Venta" en Configuración** con dos toggles:
  - **Permitir facturar en negativo** (default: OFF) — si está apagado, el sistema bloquea con mensaje claro cuando la cantidad supera la existencia disponible
  - **Validar precio mínimo y costo** (default: ON) — si está activo, no se puede vender por debajo del Precio Mínimo del artículo, ni en o por debajo del Precio de Costo
- Validación se aplica al agregar producto, al incrementar cantidad, y al editar el precio en línea — siempre con toast de error explicando el motivo

---

## 4.3.30 — 2026-05-20

### Correcciones de bugs
- **Empresas Régimen Simplificado/Simple no deben sumar IVA al facturar**: si la empresa no es Responsable de IVA (régimen distinto a Común/Responsable), el sistema ya no agrega el IVA del producto al total de la venta. El precio del catálogo es el precio que paga el cliente. El campo IVA por producto sigue existiendo para trazar IVA pagado en compras

### Mejoras
- **Tooltip discreto de costo y margen en Nueva Venta**: al pasar el mouse sobre el campo Precio de cada línea, aparece un tooltip nativo con "Costo: $X   Margen: $Y (Z%)". Solo aparece si está activado "Mostrar precio costo" en Configuración → Datos en la Factura Impresa. No se ve por defecto, así que el cliente sentado al lado no lo nota — solo el vendedor que sabe pasar el mouse

---

## 4.3.29 — 2026-05-20

### Mejoras
- **Flete editable por línea en Nueva Compra**: el campo Flete/u ahora es editable. Útil cuando el proveedor cobra flete por peso y no por valor (ej. agropecuarios: un bulto de maíz pesa más que uno de mogolla aunque cuesten parecido). Al editar el flete de una línea, queda marcada con borde naranja y un 📌. El recálculo automático del flete prorrateado **respeta las líneas manuales** y solo distribuye el flete restante entre las demás. Click en 📌 para volver al prorrateo automático

---

## 4.3.28 — 2026-05-20

### Mejoras
- **Exportar inventario a Excel (.xlsx)**: nuevo botón en Inventario → Inventario de Artículos. Genera un archivo `.xlsx` real (no CSV) con formato de moneda y porcentaje aplicado a las columnas numéricas. Respeta el filtro de búsqueda actual

### Notas
- Versión publicada para sobrescribir el cache de Cloudflare del 4.3.27 (algunos clientes descargaban la versión sin la feature de exportar)

---

## 4.3.27 — 2026-05-19

### Mejoras
- **IVA por defecto al agregar producto a compra**: el sistema recuerda el `IvaPct` de la última compra de ese producto y lo usa como default en la nueva línea. Útil para clientes Régimen Simple que dejan `Iva=0` en catálogo pero deben digitar el IVA real del proveedor cada vez. Endpoint de búsqueda devuelve `last_iva_compra`
- **Botón "Aplicar IVA a todos"** en el header de Nueva Compra: 3 botones rápidos (0% / 5% / 19%) que aplican el IVA seleccionado a todas las líneas de la grilla. Útil cuando toda la factura del proveedor está al mismo IVA

### Correcciones de bugs
- **`Precio_Costo` ahora se guarda CON IVA** (era sin IVA por error en `api/compras/nueva.php`). Esto rompía la utilidad calculada porque `Precio_Venta` sí incluye IVA cuando `precioIvaIncluido=true`, así que la resta Venta-Costo daba un margen inflado. Ahora ambos campos están en la misma base. Cambios:
  - **Backend [api/compras/nueva.php](conta-app-backend/api/compras/nueva.php)**: `Precio_Costo` y `tbldetalle_pedido.PrecioC` se guardan con IVA + flete. `Precio_CostoComp` sigue con IVA (sin flete). El kardex permanece sin IVA por convención contable colombiana (COGS no incluye IVA, va a cuenta aparte)
  - **Frontend [EditarArticuloModal.tsx](Dashboard-Facturación/src/components/EditarArticuloModal.tsx)**: el campo "Costo con IVA" lee/escribe directo `Precio_Costo`. "Costo sin IVA" es calculado dividiendo. El cálculo de utilidad (Precio_Venta − Precio_Costo) ya no multiplica el costo por (1+IVA%)
  - **Frontend [NuevaCompra.tsx](Dashboard-Facturación/src/components/NuevaCompra.tsx)**: las columnas "C. Final" y "C. Promedio" muestran valores con IVA (consistentes con `Precio_Costo`). Header de cada columna anota "(c/IVA)" para evitar confusión

  **Importante:** datos viejos en BDs que recibieron compras con el código bugueado (entre 4.x y 4.3.26) tienen `Precio_Costo` mezclado (algunos sin IVA, otros con IVA si vienen del legacy VB6). Las próximas compras los normalizarán al actualizar el promedio ponderado, o se pueden corregir manualmente desde Modificar Producto

---

## 4.3.26 — 2026-05-19

### Mejoras
- **Selector de formato de impresión en Listado de Facturas Electrónicas**: en el header del listado FE ahora hay un select para elegir entre "Carta (PDF)" y "Tirilla POS" al imprimir. Se preselecciona según `formatoFactura` de Configuración del Sistema, pero permite override en la sesión sin tocar la config global. Tirilla usa el motor HTML existente (`imprimirFactura()` con override de formato), Carta sigue usando el `pdf.php` del backend (TCPDF)
- **Copiar factura electrónica a Nueva Venta**: botón 📄→ verde en cada fila del Listado FE (y dentro del modal de vista previa) que precarga una venta con el mismo cliente, items y forma de pago de la FE original. **No copia el número de factura** — la nueva venta toma su propio consecutivo. Los precios se toman del catálogo actual (`tblarticulos`), así que si subieron, la copia refleja el precio nuevo. Útil para clientes recurrentes que compran lo mismo periódicamente. Nuevo endpoint `facturacion-electronica/copiar.php`

### Correcciones de bugs
- **`config.json` ahora es la única fuente de verdad de `apiUrl` en Electron**: antes el frontend leía primero del `localStorage` y solo si estaba vacío recurría al archivo. Como el `localStorage` de Electron depende de `productName` y se guarda en `%APPDATA%\Conta FT 4.3\`, dos instalaciones del mismo producto en un PC compartían el mismo `localStorage` — una pisaba la config de la otra. Además había una race condition: los componentes hacían `fetch` con la URL anterior antes de que `loadConfigFromFile()` terminara. Ahora el render se bloquea hasta que el config.json termina de cargar y el localStorage no se usa en Electron
- **URLs hardcodeadas a `http://localhost:80/conta-app-backend/api/...` ignoraban el `config.json`**: alrededor de 90 componentes y hooks tenían el URL del backend fijo en el código (constantes `const API = '...'`). Aunque se cambiara el `apiUrl` en `config.json`, esos componentes seguían llamando a la URL fija. Ahora `main.tsx` instala un interceptor global de `fetch`, `XMLHttpRequest` y `window.open` que reescribe transparentemente esas URLs al `apiUrl` configurado. Sin tocar los componentes individuales. El axios de `services/api.ts` también recalcula `baseURL` en cada request
- **Preview de PDF de factura electrónica mostraba "Documento no encontrado"**: el `window.open()` del PDF en `NuevaVenta.tsx` usaba el URL hardcodeado, así que abría el PDF contra la BD equivocada cuando el `config.json` apuntaba a otra instancia del backend. Corregido por el interceptor de `window.open` mencionado arriba

---

## 4.3.25 — 2026-05-16

### Correcciones de bugs
- **Modal de pago mostraba facturas anuladas con saldo**: el endpoint `pagos.php` consultaba `tblventas` directamente filtrando solo por `Saldo > 0` sin considerar `EstadoFact`. Como el campo `Saldo` queda cacheado y no se resetea al anular una factura, las anuladas aparecían como pendientes. Ahora `pagos.php` y `detalle.php` consultan las vistas (`vw_facturas_cliente_saldos`, `vw_facturas_elec_cliente_saldos`, `vw_facturas_anteriores_cliente`) que ya filtran `EstadoFact='Valida'` y calculan el saldo dinámicamente
- **Inputs del modal de pago se congelaban al cambiar entre clientes**: la `key` de los inputs solo incluía el número de factura, así que cuando dos clientes tenían facturas con el mismo `Factura_N`, React reutilizaba el DOM viejo y dejaba el input con el state anterior. Ahora la `key` incluye `clienteId` para garantizar unicidad por cliente

---

## 4.3.24 — 2026-05-11

### Refactor importante
- **Comportamiento de cartera ahora vive en `tblclientes`** (antes en tabla aparte `tbl_clientes_comportamiento`). Resultado: el frontend hace **1 solo fetch** a `cartera.php` en lugar de 2 (cartera + comportamiento). Más simple, sin merge, sin riesgo de desincronización
- Migración v5.5 (idempotente): agrega columnas a `tblclientes` y migra datos desde la tabla vieja (que se conserva como histórico)

### Correcciones
- **Listado de Compras mostraba Totales en $0** para pedidos migrados de VB6 (los detalles tenían `PrecioC = 0` y `Subtotal = 0` aunque sí había costo en `CostoPromedio`). Se incluyó data fix retroactivo en la migración SQL
- **Vista `vw_facturas_cliente_saldos`** ahora es robusta al encoding `latin1` de la columna `Tipo` (usaba `= 'Crédito'` UTF-8 que no matcheaba bytes latin1 → vista devolvía 0 filas)
- **`pagos.php`** guardaba `Fact_N=0` y el número en `NFactAnt`. Causaba que los saldos no se descontaran después de pagar. Ahora guarda `Fact_N` correctamente + data fix retroactivo para pagos viejos
- **`cartera.php` y `comportamiento.php`** devolvían IDs como string. Causaba que el frontend no detectara castigados. Ahora castean a int

---

## 4.3.23 — 2026-05-08

### Correcciones de bugs
- **Castigar cartera**: el click en el botón 🚫 abría la ventana de detalle del cliente en lugar del modal de castigo (bug de propagación de eventos en AG Grid). Ahora solo dispara la acción correcta
- Lo mismo para los botones 👁 Ver detalle y ↩️ Restaurar — ya no se ejecutan dos cosas al mismo tiempo

### Mejoras
- **Modal de castigo de cartera rediseñado**: en vez de prompts del navegador, ahora muestra un modal centrado con icono rojo, alerta amarilla explicando que el saldo NO se borra, dropdown de motivos, y textarea cuando se elige "Otro"

---

## 4.3.22 — 2026-05-08

### Correcciones de bugs
- **"Recalcular comportamiento" no clasificaba clientes** en BDs legacy heredadas de VB6: la query usaba `tblventas.CodigoEmp` que en esas BDs siempre está en 0. Ahora usa `tblpagos.Codigo` (vínculo correcto del legado VB6)
- También corregida la columna del JOIN: ahora usa `tblpagos.Fact_N` (era `NFactAnt`, que está vacío en BDs reales)

---

## 4.3.21 — 2026-05-08

### Nuevas funciones
- **Comportamiento de cartera**: clasificación automática de clientes por puntualidad de pago (Excelente / Puntual / Regular / Moroso / Crítico) con badge de color en la tabla
- **Castigar cartera incobrable**: el admin puede marcar carteras como castigadas con motivo (cliente perdido, empresa cerrada, no localizable, acuerdo fallido, otro). Las castigadas desaparecen del listado activo pero preservan saldo e historial
- **Pestañas nuevas en Cuentas por Cobrar**: ⭐ Mejores · ⚠ Morosos · ⛔ Castigadas · Todas
- **Botón "Recalcular comportamiento"** que analiza pagos de los últimos 12 meses para todos los clientes
- **Historial de versiones** visible en Configuración (esta vista)

### Mejoras
- CRM ahora registra "ping" automático cuando el cliente abre Conta FT (último acceso visible en panel admin del CRM)
- Tracking de máquinas: cuántos equipos distintos usa cada cliente, útil para detectar uso compartido de licencia

---

## 4.3.20 — 2026-05-08

### Correcciones de bugs
- **Pagos a proveedor**: el input de monto a pagar quedaba "atascado" al cambiar entre proveedores (key colisión de React entre facturas con mismo ID)
- **Header del top bar** ya no se sobrepone al scroll en módulos con tabla larga (Inventario, Ventas, etc.)
- **Caja Principal** filtrada del dropdown "Caja asignada" del usuario (solo cajas de punto de venta aparecen)

### Mejoras
- **Cards de inventario** compactas (mismo estilo que Clientes), tabla gana ~30 px de altura para mostrar más filas

---

## 4.3.19 — 2026-05-08

### Nuevas funciones
- **Auto-deploy del backend PHP**: los archivos PHP del backend ahora viajan dentro del instalador de Conta FT y se copian automáticamente al `htdocs` del cliente en cada update. Ya no hay que conectarse manualmente a sincronizar archivos
- **Modal "No tienes caja asignada"** en Ventas cuando un admin intenta vender sin haber configurado su caja, con instrucciones paso a paso

---

## 4.3.18 — 2026-05-08

### Nuevas funciones
- **Eliminar producto** ahora funciona (antes solo hacía `console.log`)
- Validación previa de dependencias: si el producto tiene ventas, compras o movimientos en kárdex, **bloquea la eliminación** y ofrece **desactivar** como alternativa (preserva todo el historial)

---

## 4.3.17 — 2026-05-08

### Mejoras
- **Admins pueden tener caja asignada**: si un admin va a vender, se le puede asignar una caja específica desde Configuración → Usuarios. Sin asignación = ve todas (modo supervisor). Con asignación = solo opera la suya (modo vendedor)

---

## 4.3.16 — 2026-05-08

### Mejoras
- **Editar cantidad de un producto** desde el modal: si se sube/baja la existencia, automáticamente se registra una entrada o salida en el kárdex con el detalle "Ajuste manual"
- Al **crear un producto con stock inicial**, se registra automáticamente "Carga inicial" en el kárdex

---

## 4.3.15 — 2026-05-08

### Correcciones
- **Feedback visible** en el modal de suscripción: antes los toasts de error quedaban escondidos detrás del modal y el usuario no entendía qué fallaba al pegar el token. Ahora los mensajes aparecen dentro del modal en bloques coloreados (info/error/éxito) con el detalle exacto

---

## 4.3.14 — 2026-05-08

### Nuevas funciones
- **Configurar token de suscripción** desde el modal bloqueante: nuevo botón verde "Configurar token (instalación inicial)" que aparece cuando el cliente recién instalado no tiene `api_token` en la base de datos. El instalador pega el token entregado por Innovación Digital y queda activado
- Endpoint nuevo `POST /api/empresa/configurar-token.php` que actualiza el token en la BD del cliente

---

## 4.3.13 — 2026-05-08

### Correcciones
- **Pantalla de inicio** ya no genera scroll innecesario; el gradient ahora cubre exactamente el área visible
- **Tab bar superior fija**: ya no scroll-ea con el contenido en módulos largos

---

## 4.3.12 — 2026-05-08

### Mejoras
- **Pantalla de inicio sin scroll**: el wrapper del Dashboard usa `flex-col + min-h-0` para que la pantalla de bienvenida llene exactamente el área disponible sin scroll vertical

---

## 4.3.11 — 2026-05-08

### Mejoras visuales
- **Loading screen** completamente rediseñado: fondo morado con gradient de marca, logo central con anillo giratorio, marca "Conta FT · FACTURACIÓN", chip flotante con punto cyan parpadeante. Reemplaza el spinner blanco simple anterior

---

## 4.3.10 — 2026-05-08

### Correcciones
- **`config.json` se crea automáticamente** al primer arranque si no existe, con `apiUrl` por defecto. Antes, una reinstalación borraba el archivo y dejaba al cliente sin poder validar suscripción

---

## 4.3.9 — 2026-05-08

### Nuevas funciones
- **Sistema de suscripción robusto**:
  - Modal bloqueante "Suscripción no válida" cuando el cliente no tiene plan activo
  - Cache de validación hasta la `fecha_fin` real de la suscripción (en vez de 7 días fijos)
  - **Código de activación offline** para clientes sin internet permanente: se genera desde el CRM con HMAC-SHA256 y se pega en el modal. Permite operar hasta una fecha embebida sin necesidad de red
  - Validación estricta para descargar updates (requiere CRM en línea), validación permisiva para uso (cache + código offline)

---

## 4.3.8 — 2026-05-08

### Mejoras visuales
- **Quitado el menú File / Edit / View** de Electron (no era útil para el cliente final)
- `autoHideMenuBar: true` + `Menu.setApplicationMenu(null)` en main.js

---

## 4.3.7 — 2026-05-07

### Pruebas
- Build de prueba para validar el flujo completo del auto-updater contra el FTP

---

## 4.3.6 — 2026-05-07

### Nuevas funciones
- **Auto-update funcional**: descarga e instala nuevas versiones automáticamente al abrir la app
- **Versión visible en sidebar** debajo del logo (`v4.3.6`); click sobre la versión fuerza una verificación de actualización
- **Diagnóstico de conexión**: el click muestra el motivo exacto si falla (sin red, sin token, suscripción vencida, backend inaccesible, etc.)

---

## Versiones anteriores

Para versiones 4.3.5 e inferiores, consultar el historial de Git del repositorio.
