# Historial de Versiones — Conta FT

Registro de cambios, mejoras y correcciones por versión.
Visible solo para administradores desde **Configuración → Acerca de → Ver historial**.

---

## 4.3.87 — 2026-08-12

### Hotfix — "Corregir base" tumbaba la app

- El fix de la 4.3.86 arregló 2 de las 3 referencias a `data.res.base`; quedaba una tercera dentro del modal (línea del título "Base actual") que lanzaba `Cannot read properties of undefined (reading 'base')` y la pantalla quedaba en blanco al clickear el botón.
- Ahora las tres referencias apuntan al campo real `data.resumen.base`.

### UX

- El input **"Base correcta"** del modal Corregir base selecciona todo el valor automáticamente al hacer click o recibir foco. Se puede escribir el número nuevo directo sin borrar.

---

## 4.3.86 — 2026-08-12

### Fix crítico — abono a crédito no puede superar el total

- Bug reportado en cliente: usuaria digitó $200.000 como abono en factura de $20.100 (le sobró un cero) y $24.500.000 en otra de $116.700. El sistema aceptaba y registraba un pago fantasma en `tblpagos` que además impactaba el cuadre de caja del día — la sesión terminaba con un faltante ficticio de decenas de millones.
- **Validación en 3 niveles**:
  1. **Input del abono**: al tipear un número ≥ total, se recorta automáticamente a `total - 1`, se muestra en rojo y aparece un toast explicativo.
  2. **Al confirmar la venta**: el frontend bloquea el guardado si `abono >= total` con mensaje claro (si el cliente va a pagar completo, se debe cambiar el término a Contado).
  3. **Backend** (`api/ventas/nueva.php`): defensa en profundidad — rechaza con HTTP 400 si el JSON llega con abono ≥ total, por si viene manipulado.
- Regla clave: en venta a Crédito, el abono debe ser ESTRICTAMENTE menor que el total. Si es igual, la venta es Contado.

### Fix — botón "Corregir base" no hacía nada

- En Caja Registradora, al presionar "Corregir base" el modal no aparecía. Causa: el código leía `data.res` pero el backend devuelve el campo como `data.resumen` — la condición era siempre falsa y el modal nunca se renderizaba.
- Corregido en las dos referencias (`solicitarCorregirBase` y el render condicional del modal).
- Ahora el botón abre el modal con la base actual pre-cargada; se puede corregir la base cuando el usuario se equivoca al abrir la caja. Requiere autorización admin si no es admin quien lo hace.

---

## 4.3.85 — 2026-08-11

### Performance (arranque -87% de bundle, -55% de memoria)

- **Code splitting con React.lazy** en 45 componentes pesados del Dashboard (AG Grid, Recharts, xlsx). Bundle inicial: **3.37 MB → 432 KB (gzip: 890 KB → 133 KB)**. Los módulos se descargan bajo demanda al navegar.
- **Memoria post-arranque**: 43 MB → 19 MB (-55%). Sin leaks en stress de 5 rondas de navegación.
- **Cache TTL 60s en `sugerencias.php`** vía nueva utilidad `utils/cachedFetch.ts` (sessionStorage). Evita re-fetch al volver a la Pantalla de Inicio.
- **Throttle 2s en `useNotificaciones`** — antes cada POST disparaba 3 fetches (lotes, stock-bajo, cumpleaños); ahora se ignoran las llamadas repetidas dentro de 2s.

### Consultas rápidas en Ventas (patrón portado de Compras)

- **Botón "Buscar Venta"** en la barra de VentasTabs — abre modal con filtros por mes/año y búsqueda por factura/cliente/NIT. Si el tab activo tiene cliente real, arranca prefiltrado por ese cliente.
- **Icono $ Historial de Precios de Venta** junto a cada línea del carrito — muestra las últimas 20 ventas del producto con precio unitario, cliente, deltas vs venta anterior y vs promedio.
- **Icono 📖 Kardex del artículo** junto a cada línea (solo admin) — modal compacto con entradas, salidas, saldo y costo unitario por fecha, con filtros por mes/año.
- Backend: nuevo endpoint `api/ventas/historial-precios.php`.

### Facturar al último precio del cliente

- Nueva opción en la ficha del cliente: **"Facturar al último precio del cliente"** (junto a "Facturar a precio costo"). Al activarla, cuando se agrega un producto en una nueva venta a ese cliente, el sistema busca automáticamente el último precio al que se le vendió y lo aplica en vez del precio de lista.
- Toast confirma el precio aplicado con número de factura de referencia. Si el producto nunca se le vendió a ese cliente, cae al precio de lista P1/P2/P3 normal.
- Badge azul **ÚLTIMO PRECIO** en la barra de venta cuando el cliente tiene la marca.
- Backend: endpoint `api/ventas/ultimo-precio.php`.
- ⚠️ Requiere ejecutar `actualizacion_completa.sql` para agregar la columna `UltimoPrecio` a `tblclientes`. Puede hacerse desde **Configuración → Mantenimiento BD → Aplicar Actualización Completa**.

### Facturar a costo (activación en ficha del cliente)

- Ahora el checkbox **"Facturar a precio costo"** que ya existía en la ficha del cliente REALMENTE se aplica al facturar (antes se guardaba pero no se usaba).
- Al seleccionar un cliente marcado, toast avisa y aparece badge naranja **A COSTO** en la barra. Los productos entran al carrito usando `Precio_Costo` en lugar de la lista de precios.

### Fix crítico — email fantasma de la DIAN

- La consulta DIAN de adquiriente devuelve el email del **último emisor que le facturó a ese NIT**, no el del cliente consultado. Al usar los datos DIAN para crear un cliente o facturar ocasional, el sistema estaba guardando ese email (típicos: `facturasnoprocesadas@olimpica.com.co`, `info1@danncarlton.com`).
- Corrección: los flujos "Usar solo aquí" y "Guardar como cliente" ya NO usan el email de DIAN. El panel muestra un aviso amarillo indicando por qué se ignora.
- Si necesita enviar la factura por correo a un cliente ocasional, el email debe escribirse manualmente.

### Fix — inputs de abono en modales de pago (efecto "no muestra el texto")

- En **Cuentas por Cobrar** (pagos a facturas de un cliente) y en **Proveedores** (pagos a facturas de crédito), al presionar los botones **Distribuir / Todo / Pagar Todo**, los abonos calculados aparecían en el state pero los inputs mostraban vacío hasta hacer focus/blur en cada celda. Causa: los inputs son uncontrolled (`defaultValue`) y necesitan re-mount al cambiar el state completo.
- Corrección: incrementar `formVersion` en los tres puntos que redistribuyen abonos, forzando el re-render inmediato.

### UX

- El checkbox **"Enviar por correo"** en la barra de FE se activa automáticamente si el cliente seleccionado tiene un correo válido (antes había que marcarlo cada vez).
- Fix del listado de historial de precios de venta — se corrigieron los nombres de columnas en el endpoint (`A_nombre`, `Razon_Social`).

---

## 4.3.84 — 2026-08-10

### Fix crítico FE — rechazo DIAN FAU12 en facturas con abono

- Al emitir FE de crédito con abono inicial, el JSON llevaba `pre_paid_amount` con el valor del abono pero sin el detalle de anticipos individuales que exige la regla DIAN **FAU12** ("Valor del Anticipo Total es distinto a la Suma de todos los anticipos"). Rechazo garantizado.
- Corrección: los abonos al momento de emitir **NO son anticipos DIAN** — son movimiento interno de cartera. La factura ahora sale por el total completo (`payable_amount = total`) sin `pre_paid_amount`.
- El abono se sigue registrando internamente en Cuentas por Cobrar como siempre.

### Flujo FE simplificado

- **Selector MEDIO DE PAGO (DIAN) directo en la barra superior** cuando el documento es Factura Electrónica o Doc. Soporte. Muestra el catálogo oficial: 10 Efectivo, 20 Cheque, 30 Transferencia crédito, 31 Débito domiciliado, 41 Concentración, 42 Consignación, 47 PSE, 48 Tarjeta crédito, 49 Tarjeta débito.
- **Sin modal de Abono para FE** — al presionar "Guardar y Enviar a DIAN" aparece un modal simple de confirmación con Total + medio DIAN + cuenta destino. Un solo paso.
- **Selector CUENTA destino** (Bancolombia/Nequi/Tarjeta) aparece automáticamente cuando FE Contado y el medio DIAN no es Efectivo, para que la caja cuadre por cuenta interna.
- Sincronización inteligente: al elegir DIAN 48/49 (Tarjeta) la cuenta salta a Tarjeta. Otras opciones vuelven a Bancolombia por defecto.
- Mapeo automático del `payment_method_id` cuando el modal no interviene (compat POS).

### UX

- **Checkbox "Enviar por correo"** ahora se activa automáticamente si el cliente tiene un email válido (antes había que marcarlo cada vez).

### Backend

- `api/facturacion-electronica/enviar.php` — acepta `payment_method_id` explícito del frontend; si no viene, mapeo automático desde `id_mediopago` interno (mapeo corregido: tarjeta ahora es DIAN 49 en vez del código 14 que no existe).
- `pre_paid_amount` siempre 0 en el JSON DIAN.

---

## 4.3.83 — 2026-08-07

### Fix crítico — Factura Anterior de Proveedor (modal no abría)

- El botón "Factura Anterior" del listado de Proveedores no abría el modal por un error en la ubicación del JSX del modal (estaba dentro del componente ProveedorDetalle en vez del componente principal). El estado sí cambiaba pero el modal no se renderizaba. Movido al lugar correcto — ahora abre normal.

### Fix crítico BD — saldos fantasma en proveedores

- **Vista `vw_prov_pedidos_credito_saldos`** solo miraba pagos con formato viejo (`tblegresos.FactN` casteado a int contra `tblpedidos.Pedido_N`). Los pagos hechos con el flujo nuevo (`NFacturaAnt = FacturaCompra_N`) eran invisibles para la vista → las facturas pagadas aparecían con saldo pendiente falso.
- El detalle del proveedor mostraba `SALDO PENDIENTE $X` arriba, pero abajo todas las facturas en `Pagada / $0`. Inconsistencia entre cache y vista.
- Ningún dato se perdió — los pagos siempre estuvieron correctos en `tblegresos`. Solo el resumen mentía.
- **Fix aplicado en `actualizacion_completa.sql`** — la vista ahora suma pagos por AMBOS formatos.
- Script separado `sql/fix_vista_saldos_proveedores.sql` para aplicar solo este fix rápido (5-10 seg).
- ⚠️ **Requiere ejecución manual del SQL** en cada BD de cliente (el updater no aplica migraciones de BD por diseño).

---

## 4.3.82 — 2026-08-07

### Facturas Anteriores (saldos migrados)

- **Registrar Factura Anterior de PROVEEDOR** — nuevo botón en el listado de Proveedores (color naranja). Permite migrar saldos que se le deben a un proveedor antes del sistema, sin crear compra ni afectar inventario. Los saldos aparecen en Cuentas por Pagar para aplicar abonos.
- **Prefijo automático `AT-`** en el número de factura anterior (para clientes y proveedores). El usuario digita solo el número; el sistema guarda `AT-12345` para diferenciar de facturas del sistema.
- **No permite duplicar número por cliente/proveedor** — evita ambigüedad al aplicar pagos. Sí se permite el mismo número entre distintos clientes/proveedores.

### Pagos — fix crítico

- **Fix crítico**: al aplicar un pago a una factura anterior (número `AT-*`), el sistema NO lo estaba registrando — el pago se perdía silenciosamente porque el endpoint solo buscaba en `tblventas`. Ahora detecta el prefijo `AT-` y actualiza correctamente `tblfacturasanteriores`.
- Al **anular** un pago de factura anterior, el saldo se restaura correctamente en `tblfacturasanteriores`.

### Kardex — navegación sin salir

- **Número de factura clickeable** en la columna Detalle del Kardex:
  - **Ventas y devoluciones** → abre `DetalleFacturaModal` encima del kardex
  - **Compras** → hace lookup del `Pedido_N` y abre `DetalleCompraModal`
- Al cerrar el modal, el Kardex sigue visible con la posición de scroll intacta.

### Utilidad reusable

- Nuevo helper `moneyInputHandlers()` en `src/utils/moneyInput.ts` — inputs monetarios que muestran `$ 1.234` al blur y el número raw al focus. Se aplica en los modales de Factura Anterior y en cualquier input futuro que maneje dinero.

### Inventario — formato visual

- Columna **Exist.** en el Listado de Artículos ahora muestra con separador de miles (`28.175` en vez de `28175`). Formato colombiano consistente con el resto del sistema.

### Backend

- Nuevos endpoints:
  - `/api/proveedores/factura-anterior.php` (POST create/eliminar)
  - `/api/compras/nueva.php?lookup_pedido=1` (lookup FacturaCompra_N → Pedido_N)
- Endpoint mejorado: `/api/clientes/factura-anterior.php` (prefijo AT- + validación duplicado + validación saldo ≤ valor)
- Endpoint fixeado: `/api/clientes/pagos.php` (soporte facturas anteriores en pagar/anular)

---

## 4.3.81 — 2026-08-06

### Compras — Multi-tab estilo Chrome + herramientas de precio

**Tabs múltiples en Nueva Compra** (base de la mejora):
- Se pueden tener varias compras en armado simultáneamente sin perder trabajo.
- Barra de pestañas superior estilo Chrome con `+` para nueva y `X` para cerrar (con confirmación si hay líneas).
- Cada tab guarda su propio estado — se pueden armar 2 compras a proveedores distintos en paralelo.
- **Fix del bug reportado**: al dar click al lápiz de una compra existente desde el listado, ahora abre en **tab nuevo** en vez de reemplazar la compra en armado. Ya no se pierde trabajo al consultar otra compra.
- Persistencia en localStorage: al cerrar la app, las compras a medio armar se conservan.

**Botón 📊 Historial de Precios en cada fila:**
- Al agregar un producto a la compra, el usuario puede ver las últimas 20 compras de ese producto.
- Muestra: fecha, proveedor, factura, cantidad, costo unitario final (con IVA + flete).
- **Deltas visuales**: variación % vs compra anterior + vs promedio histórico. Rojo si subió, verde si bajó, gris si igual.
- Estadísticas del producto: precio promedio, mínimo, máximo y total de compras.
- Utilidad: detectar aumentos de precio anómalos antes de aceptar una nueva compra.

**Botón "Buscar Compra" en la barra:**
- Modal buscable (por proveedor, pedido o número de factura) con filtro por año/mes.
- Al elegir una compra, se abre en un **tab nuevo** — no destruye tabs abiertos.

**Dropdown de búsqueda de productos enriquecido:**
- Al buscar un producto para agregar a la compra, además del nombre y precio de catálogo, se muestra debajo: `Última: $X · Proveedor Y · hace Z días`.
- El usuario ve de un vistazo si el precio va bien vs lo histórico, sin abrir modales.
- Ancho del dropdown aumentado (750px) para que los nombres largos + la sub-línea respiren.

### Backend
- Nuevo endpoint `/compras/historial-precios.php?items=N` → devuelve compras + estadísticas + deltas.
- `/compras/nueva.php?buscar=X` enriquecido con `ultimo_costo`, `ultima_fecha_compra`, `ultimo_proveedor` por producto.

---

## 4.3.80 — 2026-08-06

### Conteo de Inventario — rendimiento y fix visual

- **Fix crítico**: al guardar el valor de una casilla, el input quedaba vacío visualmente aunque el dato sí estaba en BD. Ahora el `valorInicial` del input lee del Map de cambios local (no solo de la fila) → el valor se mantiene visible después del ✓.
- **Fix foco perdido**: al pulsar Enter para pasar a la siguiente casilla, el cursor se perdía por remount de celdas al terminar el POST async. Fix: enfoque con `setTimeout(120ms)` + reintentos, y eliminación del timer de 2 seg que borraba `savedItems` (era el disparador principal del remount).
- **Optimización de re-renders**: input extraído a componente memoizado externo (`InputConteoCell` con `React.memo`), `colsDetalle` en `useMemo` con deps mínimas, `guardarItem` y `handleSaveInput` en `useCallback`, `getRowStyle` estable → menos remounts, cursor estable, mejor rendimiento con 1.000+ productos.
- **✓ verde permanente** en casillas guardadas — se acumulan durante la sesión como indicador visual de progreso.

### Caja — fix crítico de doble descuento en anulaciones

- **Bug**: al anular una venta Contado, el sistema descontaba el valor **dos veces** del Total en Efectivo:
  1. La venta anulada se excluía de "Ventas Contado" (`WHERE EstadoFact = 'Valida'`)
  2. Además se restaba en la línea "Anulaciones" (movimiento de reembolso)
  → Resultado: caja descuadrada en el valor de la anulación.
- **Fix**: las consultas de Ventas Contado y desglose por medio de pago ahora **incluyen las anuladas del día** (`EstadoFact IN ('Valida','Anulada')`). La anulación aparece como salida separada en "Anulaciones". Neto correcto y trazable — igual que hacía el sistema VB6.
- **Afecta**: `caja/sesion.php` (Resumen de Sesión, ventas por medio, post-cierre) y `caja/estado.php` (Resumen del día, ventas por medio, actualización de totales).
- **Ejemplo**: caja con Ventas Contado $2.306.100 y una anulación de $184.000 (venta original $184.000). Antes daba $2.218.100. Ahora: Ventas Contado $2.490.100 − Anulaciones $184.000 = **$2.306.100 efectivo neto** (correcto).

---

## 4.3.79 — 2026-08-06

### Ventas — edición de factura al estilo VB6

- **Cambio Crédito ↔ Contado bidireccional**: se puede convertir una factura de Crédito a Contado y viceversa desde el modal Editar Factura.
- **Medio de pago editable**: cuando el Tipo es Contado, aparece dropdown Medio de Pago (Efectivo / Tarjeta / Bancolombia / Nequi). Útil para corregir un medio mal ingresado sin tener que anular y rehacer.
- **Fix crítico Crédito → Contado no aparecía en caja**: cuando se convertía una factura, se cambiaba el Tipo pero NO se registraba el cobro. La venta quedaba invisible en la caja del día. Ahora se registra automáticamente en `tblpagos` con Fecha del cambio para que aparezca en la sesión activa.
- **Contado → Crédito**: anula el cobro automático que se había creado (lo marca `Estado='Anulada'`, no se borra por regla de inmutabilidad contable).
- **Contado → Contado con otro medio**: actualiza el registro sin generar nuevo cobro.
- **SQL de backfill** disponible en `sql/fix_ventas_convertidas_contado.sql` para corregir facturas históricas que se convirtieron antes del fix.

### Conteo de Inventario — UI compacta

- Las 4 tarjetas de estadísticas (Total / Contados / Con Diferencia / Valor Diferencia) se colapsaron en **una sola barra horizontal delgada** de ~36px. Antes ocupaban ~96px de alto en cards separadas.
- La grilla del detalle **crece ~60px** al aprovechar el espacio recuperado — más filas visibles en monitores pequeños.

---

## 4.3.78 — 2026-08-05

### Conteo de Inventario — CRÍTICO: auto-guardado por celda

- **Auto-guardado inmediato**: al salir de cada casilla (Tab, Enter o click fuera), la cantidad contada se guarda en la BD al instante. **Ya no es posible perder trabajo digitado** si se cae la app, se va la luz o se cierra por error.
- Indicador visual en cada celda: `⟳` violeta mientras guarda · borde verde + `✓` dos segundos al confirmar.
- El botón "Guardar (N)" queda como respaldo si algún guardado individual fallara (por corte de red, etc.).
- **Contexto**: en versiones anteriores el conteo se guardaba en memoria y solo se persistía al dar click en "Guardar" o al cerrar el conteo — un crash o cierre accidental perdía todo lo digitado desde el último guardado.

### Impresión de facturas — media carta

- Campo **"Máx. productos en media carta"** ahora se puede escribir libremente (antes era select fijo 8/10/12/15/20). Rango permitido: 1 a 60. Hint: recomendado 20, típico 8-30.
- Fix menor: el fallback cuando el valor no estaba definido usaba 12; ahora usa 20 (coincide con el default).

### Diseño

- **Conteo de Inventario** ahora usa el mismo estilo que **Listado de Artículos**: header violeta pastel, tipografía 12px, hover suave, mismo locale español en los menús del grid. Se ve como del mismo sistema.

---

## 4.3.77 — 2026-08-05

### Conteo de Inventario

- **Exportar a Excel** — nuevo botón verde en el detalle del conteo, genera `.xlsx` con: Código, Descripción, Categoría, Costo Unit, Existencia, Conteo, Diferencia, Valor Diferencia y Observación. Formato de moneda aplicado en columnas de dinero.
- **Reporte Final** — cuando el conteo está Cerrado o Cancelado, aparece un botón "Reporte Final" con las columnas: Existencia · Conteo · Diferencia · Valor Dif., más una fila de totales. Portrait carta, con colores por celda (verde=cuadra, rojo=faltante, azul=sobrante).
- Los botones **Ciego** y **Sistema** solo aparecen mientras el conteo está Abierto (son hojas de trabajo). El Reporte Final reemplaza esos dos cuando ya se cerró.
- **Grilla del detalle más alta** — se aprovecha el espacio vertical (110px más de tabla visible).

---

## 4.3.76 — 2026-08-04

### Impresión de facturas — rediseño completo del ticket media carta

- **Fix crítico**: el nombre del propietario NO salía en la impresión (aparecía "-" hardcoded en 4 componentes). Ahora se lee del campo `Propietario` de Datos Empresa.
- Layout nuevo: nombre del negocio + propietario + NIT + dirección + teléfono **centrados** bajo el logo (izquierda) y el número de factura (derecha).
- Nuevo campo **"Detalles / Actividad Económica"** aparece bajo los datos, centrado, multi-línea (respeta saltos de línea).
- **Frase promocional configurable** al final del ticket ("GRACIAS POR SU COMPRA", "FELIZ NAVIDAD", etc.) — se cambia en Configuración → Impresión.
- **Paginación automática** cuando hay muchos productos: se dividen en hojas (default 20 por hoja), con indicador "Página X de Y" y "Continúa en la siguiente página →" en las intermedias. La última página dice "— FINAL".
- **Margen izquierdo** ampliado para evitar que la "F" de "Fecha" se corte en la impresora.
- **Footer pegado al fondo** de la media carta (antes flotaba en el medio con espacio vacío).
- **Marca "Facturado con Conta FT v4.3.76"** al pie de las 3 impresiones (media carta, carta, tirilla). Pequeña y discreta.

### Compras a proveedores

- **Fix del flete en `Precio_Costo`**: al comprar con flete, el precio de costo del inventario ahora refleja el costo real (con flete + IVA) de la compra. Antes el promedio ponderado con el stock previo diluía el flete cuando el producto ya tenía existencia.
- **Fix botón "+ Nueva"**: si estabas editando una compra y le dabas "+ Nueva", los campos se limpiaban pero seguía en modo edición. Al guardar pisaba el pedido anterior. Ahora resetea completamente al modo "nueva compra".
- **Campos Flete / Descuento / Retención**: ahora tienen formato moneda automático al perder foco y estilo destacado con colores propios (naranja/verde/rojo) para no confundirse.

### Ventas y Cartera

- **Fix bug de borradores FE**: si tenías un borrador de factura electrónica guardado, no podías enviar otras FE a DIAN (error `uq_prefix_number`). Corregido.
- **Confirmación de anular factura** más clara — modal integrado en vez del cuadro genérico del navegador.
- **Rendimiento del Listado de Ventas**: en PCs lentos (Celeron, poca RAM) ahora puede cargar 10x más rápido. Dos opciones nuevas en Configuración → Impresión:
  - "Mostrar columna Saldo en Listado" (apagable — el saldo se consulta en el módulo Cartera si es necesario)
  - "Traer máximo N facturas" (100 / 200 / 500 / 1000 / 2000)
- **Detalle de factura** más rápido — hasta 14x en el modal por indexado adicional en pagos.

### Caja Registradora

- **Botón nuevo "Corregir base"**: si al abrir la caja el usuario digitó mal la base (por ejemplo $500.000 en vez de $50.000), un administrador puede corregirla sin cerrar la sesión. Queda registro en la observación.

### Datos Empresa

- **API Token oculto** con asteriscos por defecto. Botón ojo para mostrar/ocultar temporalmente. Botón copiar al portapapeles. Evita que se pueda copiar accidentalmente cuando otros ven la pantalla.

### Actualizaciones automáticas

- **Fix de configuración perdida al actualizar**: en clientes que vienen de versiones 4.1 o 4.2 y actualizaron a 4.3, la configuración quedaba "reseteada" porque Electron cambió la carpeta de datos. El sistema ahora detecta y copia automáticamente la configuración vieja a la nueva ubicación.

### Base de datos

- **Fix del script de actualización** para BDs muy antiguas (VB6): algunas vistas quedaban registradas como tabla por sintaxis antigua rechazada por MariaDB moderno, y hacía que el script fallara silenciosamente dejando la BD a medio actualizar. Ahora limpia ambos casos antes de crearlas.

### Herramientas nuevas para soporte técnico

Para diagnóstico y optimización en PCs de clientes (uso del desarrollador vía AnyDesk):

- `verificar_migracion.bat` — reporta qué falta en la BD del cliente
- `diagnostico_entorno.bat` — chequeo completo (MySQL, PHP, OpCache, Windows Defender, benchmark de queries reales)
- `optimizar_entorno_xampp.bat` — aplica OpCache + buffer 512MB + exclusiones Defender con un click
- `test_rendimiento.bat` — mide antes/después para confirmar mejora

---

## 4.3.75 — 2026-07-29

### Fix crítico: tipo de documento del cliente (NIT / Cédula) enviado a DIAN

Se detectó que las facturas electrónicas se enviaban a DIAN con el **tipo de documento incorrecto** — clientes con NIT (empresas, S.A.S.) aparecían clasificados como "Cédula de ciudadanía" en el XML/PDF descargado. Causa: en la migración VB6→React se omitió el selector "Tipo Doc." en el modal de crear/editar cliente, y todos los clientes quedaban con el default `id_documento=2` (Cédula) sin poder cambiarlo.

Cambios:

- **Nuevo campo "Tipo Doc." en el modal de cliente**, exactamente donde estaba en el VB6 original (al lado del NIT). Lista las 5 opciones DIAN: NIT, Cédula ciudadanía, Cédula extranjería, Pasaporte, Doc. extranjero.
- **Auto-sincronización con Tipo Adquiriente**: si seleccionas "Persona Jurídica" se sugiere NIT; si eliges "Persona Natural" se sugiere Cédula. Respeta si escogiste un tipo raro (Pasaporte/CE).
- **Consulta DIAN mejorada**: cuando consultas un cliente por su NIT/CC vía Resolución 202/2025, ahora la respuesta actualiza automáticamente el Tipo Doc. y el Tipo Adquiriente (antes solo traía nombre y correo).
- **Fix del flujo "Guardar como cliente" desde consulta DIAN en Nueva Venta**: guardaba `id_documento=6` (id inexistente en la BD) → el JOIN caía al default Cédula. Ahora usa el id correcto (1=NIT).

### Backfill automático de clientes históricos

El `actualizacion_completa.sql` corre 3 reglas idempotentes para corregir clientes existentes que quedaron mal clasificados:

1. Personas Jurídicas con Cédula → NIT.
2. NIT numérico de 9-10 dígitos marcado como Cédula → NIT (red de seguridad).
3. `id_documento` inválido (fuera del rango 1-5, típicamente el `6` del bug histórico) → NIT o Cédula según la longitud del número.

En clientes reales se corrigen automáticamente al aplicar la actualización — no se requiere edición manual.

### Cómo validar tras actualizar

En "Configuración → Impresión" está la opción **"Modo prueba FE"**: activa el envío al endpoint de previsualización (no gasta consecutivo, no firma). Emite una factura y verifica en el XML que aparece:
- `<cbc:CompanyID ... schemeName="31">...</cbc:CompanyID>` para clientes NIT
- `<cbc:CompanyID ... schemeName="13">...</cbc:CompanyID>` para clientes Cédula

Los `preview_*.json` en `conta-app-backend/api/facturacion-electronica/logs/` guardan el JSON exacto que se envió a la API.

---

## 4.3.74 — 2026-07-28

### Anulación de compras a proveedores

Nuevo botón **"Anular Compra"** en el Detalle de una compra (icono rojo). Al confirmar:

- Resta la cantidad de cada línea al inventario y registra reverso en kardex (salida C_D=2 con costo original).
- Marca `EstadoPedido='Anulada'` y `Saldo=0` (sale automáticamente de cartera de proveedores).
- Si la compra era **Contado**, marca el egreso relacionado como Anulada y (si fue en efectivo) ingresa el reverso a la caja abierta HOY del usuario — no toca cajas cerradas.
- Autorización: admin directo; vendedores requieren autorización de administrador.
- Trazabilidad completa (usuario, autorizador, timestamp) queda en el Comentario de la compra.
- En el listado, las compras anuladas se marcan con pill rojo "ANULADA" y ya no se pueden editar.

### Borradores de facturación electrónica

Ahora se puede **guardar una FE como borrador** sin enviarla a DIAN todavía:

- Botón **"Guardar Borrador"** en Nueva Venta (solo cuando tipo=Electrónica). No toca `tblventas` ni kardex hasta enviarla.
- En el módulo Facturación Electrónica, filtro nuevo **"Borradores"** + botones Editar (lápiz) y Eliminar (papelera) en cada borrador.
- Al editar: se abre en Nueva Venta con todos los datos, el botón cambia a **"Actualizar Borrador #ID"**. Al guardar, reemplaza el borrador anterior.
- Uso típico: reintentar una FE que rebotó por datos incorrectos del cliente sin duplicar la venta.

### Módulo Anticipos de clientes

Nuevo módulo para gestionar anticipos/abonos que un cliente entrega antes de la factura (cuenta 280505). Registra ingreso a caja, se aplica luego contra facturas pendientes, saldos disponibles por cliente.

### Consulta DIAN adquiriente (Resolución 202/2025)

Al agregar un cliente por NIT, la app consulta directamente a la API de DIAN para traer razón social, correo, régimen y actividad económica actualizados. Reduce errores de digitación y datos desactualizados.

### Módulo Mantenimiento BD

Ejecución controlada de scripts SQL (backup, migración, auditoría) desde la app sin necesidad de abrir phpMyAdmin. Solo admins.

### Informe Comparativo Anual

Nuevo informe que compara ventas mes a mes entre varios años, para ver el comportamiento estacional del negocio.

### UX

- **Atajo "0" + Enter en Ventas**: escribir 0 en cantidad y presionar Enter navega directo al siguiente producto (útil cuando escaneas rápido).
- Formato de moneda dinámico en precios de venta: al enfocar quita separadores para editar; al desenfocar aplica formato $ con miles.

### Fixes

- Reparación de `AUTO_INCREMENT` en BDs legacy VB6 que venían sin la columna incrementable en `tblkardex`, `tblpedidos`, `tblbancos`, `tblcotizaciones`.
- `Precio_Costo`/`PrecioC` se tratan como valores CON IVA en todos los cálculos de COGS (era inconsistente antes).
- Módulo de logo del sistema: al cambiar de BD entre empresas el logo no se persistía entre sesiones incorrectamente.
- Servicios: el campo `Servicio` se compara numéricamente (`Number(x)===1`) para evitar falsos positivos con el string "0".

---

## 4.3.73 — 2026-07-23

### Fix crítico: saldo pendiente de proveedores inflado

El endpoint de proveedores (listado y detalle) leía el campo cacheado `tblpedidos.Saldo`, que en BDs con historia larga suele estar desincronizado con los egresos reales. Resultado: aparecían facturas "fantasma" ya pagadas sumando al saldo pendiente (ej. Icoplastic mostraba $14.7M cuando el saldo real era $8.5M).

Solución: ahora el backend calcula el saldo real desde `tblegresos` usando las mismas vistas que el software VB6 original:

- **`vw_prov_facturas_anteriores_saldos`** — saldos iniciales pendientes
- **`vw_prov_pedidos_credito_saldos`** — pedidos crédito con saldo real (Total − suma egresos)
- **`vw_prov_cxp_aging`** — aging unificado (solo pendientes reales)
- **`vw_proveedores_saldo_actual`** — saldo por proveedor

El módulo de Clientes ya calculaba desde `tblpagos`, por eso no tenía el problema.

### Rendimiento en BDs grandes (>50k ventas)

- **Listado de Ventas**: cambio de `YEAR(Fecha) = X AND MONTH(Fecha) = Y` a rango de fechas (`Fecha >= X AND Fecha < Y`), que sí usa el índice. En Icoplastic (101k ventas) pasa de segundos a milisegundos.
- **Listado de Compras**: LIMIT 500 en el backend + mes actual por defecto en el frontend (antes traía el año completo).
- **Script `optimizar_indices.sql`** — crea 40+ índices sobre las columnas más consultadas (Fecha, Items, CodigoCli, EstadoFact, etc.). Idempotente: aplica solo lo que falte y valida columnas antes de crear.

### Compatibilidad SQL para BDs legacy VB6 y sin FE

- Agregada creación idempotente de tablas FE (`electronic_documents`, `detalle_document_electronic`) para clientes que aún no activan facturación electrónica — así los queries de FE (que aparecen en cuadre de caja, informes, etc.) no revientan.
- `caja/sesion.php` detecta si existe `electronic_documents` antes de consultar. Antes, un cliente sin FE hacía que la caja apareciera como "Cerrada" aunque tuviera sesión abierta.
- Migración de PRIMARY KEY antes de AUTO_INCREMENT en `tblkardex`, `tblpedidos`, `tblbancos`, `tblcotizaciones`, `detalle_cotizacion`, `detalle_document_electronic` — las BDs VB6 muy viejas venían sin PK y el consolidado rompía a mitad de aplicación.

### Otros

- Nuevas columnas `enviada_dian`, `cufe` en `tblventas` y `email_factelect`, `password_factelect` en `tbldatosempresa` — se crean vacías en clientes sin FE para que consultas y edición no fallen.

---

## 4.3.72 — 2026-07-22

### Fix: Caja Registradora no detectaba la sesión abierta si la caja no era la #1

Al abrir el módulo Caja Registradora, el componente arrancaba con `Id_Caja=1` por defecto. Si la caja operativa del usuario era otra (ej. Id_Caja=3), el frontend mostraba "Cerrada" aunque hubiera una sesión activa. Al intentar abrir, el backend respondía "Esta caja ya está abierta por ...", generando confusión y llevando a cerrar sesiones válidas.

Ahora la lógica de auto-selección es:

1. Si hay una sola caja disponible → esa.
2. Si alguna caja tiene sesión abierta → esa (evita perder la sesión y la base).
3. Fallback: primera caja del listado (nunca queda apuntando a un `Id_Caja=1` que no existe en la BD).

Los otros clientes (con Id_Caja=1 real) no notaron el bug porque coincidía con el default.

---

## 4.3.71 — 2026-07-21

### Fix: modal Editar Producto se abría marcado como "Servicio"

Al dar clic en el lápiz de un producto normal, el modal se posicionaba en la card "Servicio" en vez de "Producto físico". Causa: chequeo truthy sobre un valor que a veces llega como string `"0"` — `"0" ? 1 : 0` da 1. Corregido con `Number(a.Servicio) === 1` para que solo el valor exactamente 1 (numérico o string) marque servicio.

Esto también evitaba, al guardar sin cambiar nada, convertir accidentalmente productos en servicios (que no descuentan inventario).

---

## 4.3.70 — 2026-07-21

### Respaldo automático de la Base de Datos

Nuevo módulo en **Configuración → Respaldo de la Base de Datos**:

- **Automático diario**: al abrir la app se genera un respaldo del día si aún no existe. Máximo uno por día natural, aunque abran la app varios cajeros.
- **Botón "Respaldar Ahora"** para forzar uno extra (útil antes de actualizaciones).
- Archivos en `C:\ContaFT-Backups\contaft-YYYY-MM-DD_HHMMSS.sql`. Rotación automática de 30 días.
- Dump PHP puro — funciona incluso en servidores con `exec/shell_exec` bloqueados.
- El .sql restaura con `mysql -uroot -p nombre_bd < archivo.sql`.

### Módulo Financiaciones (opcional — negocios que venden a plazos)

Activable por empresa desde Configuración. Diseñado para almacenes de motos, electrodomésticos, muebles.

- Contratos con cronograma de cuotas de fechas y valores libres.
- Interés de **mora % mensual global** configurable. Se calcula on-the-fly y se cobra aparte (no reduce el saldo del capital, respeta kardex inmutable).
- Filtro por antigüedad de mora: sin mora / 1-30 / 31-60 / 61-90 / +90 días. Badge muestra días vencidos.
- Cobro con opción de "condonar mora" (botón "No cobrar").
- Permisos granulares: consultar / crear-editar / registrar pagos.

### Anulación de Notas de Artículo

- Ahora se pueden anular notas de cualquier fecha (antes solo del día). Requiere permiso admin o `inventario_editar`.
- **Soft-delete**: la nota queda con `Estado='Anulada'` — no se borra. Respeta la regla del kardex inmutable con un asiento REVERSO.
- Modal con motivo opcional, fila tachada con badge ANULADA, filtro "Mostrar anuladas" para revisar histórico.
- Fix bug histórico: ahora la nota guarda el usuario que la creó (antes salía "Sistema").

### Tema unificado en listados

Clientes, Proveedores, Productos por Proveedor, Cartera de Clientes y Cuentas por Cobrar comparten ahora el mismo estilo del Listado de Artículos: headers púrpura, filas compactas, hover y localización en español.

### Nueva Compra

- **Botón "Rotación"** al lado del proveedor: abre un modal con Productos por Proveedor preseleccionado — se puede consultar rotación sin salir de la compra.
- **Botón "Imprimir"** en la barra inferior: genera un HTML formateado con encabezado, líneas, totales y footer, e imprime en iframe oculto (sin popup).

### Nueva Venta

- Enter en Cantidad y en Precio ahora pasa al campo predeterminado (código o nombre) según Configuración → Campo predeterminado.
- Precio con formato `$ 24.000` al perder el foco, número plano `24000` al enfocar, y en negrita.
- Dropdown de búsqueda por nombre ya no se abre con input vacío.

### Compatibilidad SQL para clientes sin Facturación Electrónica

Migración consolidada corregida — antes rompía en BDs sin las tablas de FE. Ahora todas las migraciones de FE verifican existencia de tabla antes de aplicar. También se agregan `enviada_dian`/`cufe` a `tblventas` y `email_factelect`/`password_factelect` a `tbldatosempresa` como columnas vacías, para que el resto del sistema no falle al consultarlas.

### Otros

- Defensa contra warnings PHP al vender/anular con productos huérfanos.
- Toast informativo al imprimir factura desde el listado (antes con vista previa desactivada, el clic parecía no hacer nada).
- Inventario: filtro "Inactivos", columnas Etiqueta y Estado ocultas por defecto, nombres en MAYÚSCULAS, botones de acciones más limpios sin borde.

---

## 4.3.69 — 2026-07-14

### Flete en compras: input global y prorrateo por línea sincronizados

Se agruparon varios problemas del flete en Nueva Compra que quedaron pendientes desde versiones anteriores:

- **Re-prorrateo automático al cambiar el flete global**: antes al modificar el input "FLETE" del footer, las columnas "Flete/u" de las líneas no se actualizaban aunque el backend sí lo prorrateaba al guardar. Resultado: pantalla y BD mostraban valores distintos. Ahora un `useEffect([flete])` re-prorratea todas las líneas no-manuales al instante.
- **Flete no se limpiaba al Guardar / "+ Nueva"**: el input FLETE usaba `defaultValue` que ignora cambios posteriores del state. Se le agregó `key={flete-${flete}}` para forzar re-mount cuando `setFlete(0)` corre desde botones.
- **FleteUnit ahora siempre editable**: antes se deshabilitaba cuando el flete global era 0. Impedía el patrón "flete por peso" donde cada ítem lleva su propio costo de transporte.
- **Flete global sincroniza con la suma real al editar manualmente**: si el usuario tipea manualmente `Flete/u` en las líneas, el flete global del footer refleja `SUM(FleteUnit × Cantidad)` de todas las líneas — no acumula sobre valores residuales del state anterior.

### Decimales en Costo del inventario

Los costos promedio con flete prorrateado quedan con decimales en BD (ej. `Precio_Costo = 98748.47`), pero varias pantallas los truncaban a entero, causando confusión ("¿por qué en la compra se ve $98.748,47 y en el inventario $98.748?").

- **InventarioManagement**: `formatearMoneda` ahora muestra decimales si existen, entero si no.
- **EditarArticuloModal**: `fmtMoneda`/`fmt` respetan decimales; al hacer focus en los campos de Costo sin IVA / Costo con IVA se muestra el valor con 2 decimales (antes truncaba con `Math.round`).

---

## 4.3.68 — 2026-07-11

### Regla de negocio: anular egreso NO revive la compra

Al anular un pago a proveedor, la compra queda intacta con su saldo original — solo el egreso se marca como Anulada y deja de contar en reportes. Antes, la 4.3.66 recalculaba `tblpedidos.Saldo` y hacía que la compra volviera a Cuentas por Pagar como si estuviera impaga, confundiendo al usuario.

- `api/movimientos/pagos-proveedores.php action=anular` — se removió el bloque que recalculaba el saldo de la compra. Ahora el flujo es: (1) marcar egreso Anulada; (2) si el pago fue efectivo, devolver el valor a la caja abierta actual. La compra no se toca.

### Modales de confirmación en el listado de Pagos

Los botones "Anular" del listado de Pagos de Clientes y Pagos a Proveedores usaban `confirm()` nativo del navegador, que en algunos entornos rompía el foco del grid u ocultaba modales encima. Migrado al componente reusable `<ConfirmDialog>` que ya usa el resto del sistema (facturas recibidas, cerrar caja, etc.).

- El diálogo de anular egreso ahora indica dinámicamente si el pago era en efectivo (→ "se devolverá a la caja") o transferencia (→ "no afecta caja"). Ayuda al usuario a saber qué esperar antes de confirmar.

---

## 4.3.67 — 2026-07-11

### Fix crítico: anular pago de proveedor lanzaba "tblcompras doesn't exist"

Al anular un egreso desde el listado de Pagos a Proveedores, el sistema fallaba con `SQLSTATE[42S02] Base table or view not found: 1146 Table 'X.tblcompras' doesn't exist`. El endpoint que agregué en 4.3.64 consultaba una tabla llamada `tblcompras` que en el sistema NO existe — el nombre real (heredado del legacy VB6) es `tblpedidos`.

- `api/movimientos/pagos-proveedores.php` — reemplazado `tblcompras` por `tblpedidos` en el `SELECT`/`UPDATE` que recalcula el saldo de la compra al anular el egreso. Ahora la anulación revierte correctamente el saldo en Cuentas por Pagar.

---

## 4.3.66 — 2026-07-11

### Defensa cruzada Producto vs Servicio en la venta

Un cliente reportó que varios productos se estaban registrando como servicios (sin descontar inventario) aunque en el catálogo tenían `Servicio=0`. Investigación: el flujo estándar del frontend actual (4.3.64+) NO puede producirlo, pero flujos antiguos o cache stale podían dejar `es_servicio=1` en el payload y el backend lo aceptaba sin verificar.

- `api/ventas/nueva.php` — antes de tratar una línea como servicio, ahora consulta `tblarticulos.Servicio` del catálogo. Si el catálogo dice que es producto (=0), el flag `es_servicio=1` del payload se ignora y la venta descuenta stock + registra kárdex normalmente. El catálogo siempre manda.

### Fix: "Pagos a Proveedores" mezclaba gastos operativos

El listado de Pagos a Proveedores repetía los mismos registros que aparecían en Gastos (papelería, aseo, arriendo). Ambos endpoints leen de `tblegresos` pero solo Gastos filtraba por `FactN = '-1'` (marca del módulo de gastos operativos); Pagos a Proveedores no filtraba y mezclaba todo.

- `api/movimientos/pagos-proveedores.php` — se agregó `AND e.FactN <> '-1'` al `WHERE`. Ahora solo salen los egresos vinculados a una factura de compra real.

### Fix: servicio no se agregaba al buscar por código exacto

Al tipear el código exacto de un servicio + Enter, el sistema decía "no hay existencia suficiente" — porque el endpoint `?codigo=` no devolvía el flag `Servicio`, el frontend lo trataba como producto y validaba stock (existencia siempre 0 para servicios).

- `api/ventas/nueva.php` — la búsqueda exacta por código ahora también incluye `COALESCE(a.Servicio, 0) AS Servicio` en el `SELECT`, igual que la búsqueda por texto.

---

## 4.3.65 — 2026-07-11

### Fix crítico: "Configurar Servidor" en loop tras actualizar

Después de actualizar a 4.3.64, algunos clientes cayeron en un bucle: la app mostraba "Configurar Servidor", indicaban `localhost`, la prueba decía "Conexión exitosa", pero al Guardar volvía al mismo modal.

Causa: `config.json` se guardaba en la carpeta del `.exe` (`C:\Program Files\Conta FT 4.3\`), que Windows protege — sin permisos elevados el escrito fallaba silenciosamente y al reload el archivo seguía sin `apiUrl`.

Además: el handler `Guardar` no esperaba a que la escritura IPC del config resolviera antes de hacer `window.location.reload()`, así que aunque hubiera permisos, el reload podía ganar la carrera.

- `electron/main.js` — `getConfigPath()` ahora usa `app.getPath('userData')` (`%APPDATA%/Roaming/Conta FT 4.3/`) que siempre es escribible por el usuario. La primera vez que arranca la 4.3.65, si detecta un `config.json` legacy junto al `.exe`, lo migra automáticamente al nuevo path preservando el `apiUrl` del cliente.
- `ConfigurarServidor.tsx` — `guardar` y `usarLocal` ahora hacen `await setApiUrl(...)` antes de `onConfigured()`, garantizando que el archivo se persistió antes del reload.

Workaround temporal para clientes bloqueados (funciona antes de instalar 4.3.65): abrir la app clic derecho → "Ejecutar como administrador", configurar servidor una vez, cerrar. Los próximos arranques leen el `config.json` recién creado sin problemas.

---

## 4.3.64 — 2026-07-11

### Auto-actualización de la base de datos

Antes: cada upgrade de la app requería que el cliente aplicara manualmente `actualizacion_completa.sql` en phpMyAdmin. Riesgo alto de saltar el paso y romper funciones.

- Nuevo endpoint `api/actualizacion/aplicar-sql.php`. Al iniciar sesión, el frontend le envía la versión de la app; si `tbldatosempresa.version_sql_aplicada` es distinta, corre el `.sql` consolidado con `mysqli::multi_query` (libera cursores de `PREPARE/EXECUTE` que PDO deja abiertos) y actualiza la versión.
- 100% en background — no bloquea el login. Si algo falla queda logueado en el response sin impedir usar la app.
- Idempotente: cada `ALTER TABLE` del `.sql` se salta si la columna ya existe. Reejecutar es seguro.

### Compras al Contado: medio de pago

Antes al hacer una compra al contado no se distinguía si el pago fue efectivo, tarjeta, Bancolombia o Nequi — todo pasaba por caja. Ahora:

- Al confirmar la compra al contado se abre un modal con las 4 tarjetas de medio de pago (mismo esquema que ventas: 0=Efectivo · 1=Tarjeta · 2=Bancolombia · 3=Nequi).
- Solo Efectivo descuenta la caja. Los demás quedan como egreso registrado con `id_mediopago` en `tblegresos` — la caja física no se afecta.
- Nueva columna `tblegresos.id_mediopago INT NOT NULL DEFAULT 0`.

### Pagos: Anular + Ver comprobante desde el listado

Pagos de Clientes y Pagos a Proveedores tienen columna Acciones con:

- 🖨️ Ver / Imprimir comprobante — reutiliza `ReciboImpresion` cambiando `tipoTercero` ("COMPROBANTE DE EGRESO" para proveedor).
- 🚫 Anular — endpoint POST en `pagos-proveedores.php` con `action=anular`: marca egreso `Estado='Anulada'`, recalcula el saldo de la compra afectada (vuelve a Cuentas por Pagar), y si era efectivo devuelve el valor a la caja abierta actual (respetando cajas cerradas).

### POS Ventas: botón Anular en el listado

Botón `Ban` rojo por fila. Reusa el flujo existente de `detalle-factura.php action=anular` incluyendo `AutorizacionAdminModal` cuando el backend responde `requiere_autorizacion` y toast cuando responde `requiere_caja_abierta`.

### PDF de FE con concepto largo

El PDF de la Factura Electrónica mostraba el nombre del artículo del catálogo ("HORA PROGRAMACIÓN") aunque el concepto enviado a la DIAN fuera largo ("Prestación de servicios profesionales…"). Ahora el `SELECT` de items en `facturacion-electronica/pdf.php` hace `COALESCE(NULLIF(d.description, ''), a.Nombres_Articulo)` — el concepto DIAN gana si viene con contenido.

### Descripción temporal ampliada

`tbldetalle_venta.DescripcionTemp` pasó de `VARCHAR(100)` a `VARCHAR(500)` — antes conceptos largos rompían con `SQLSTATE[22001] Data too long`.

---

## 4.3.63 — 2026-07-02

### Logo de la empresa desde el servidor (no más hardcode)

Antes el PDF de FE usaba un path hardcoded del logo de Innovación. Y el logo que el usuario subía en Datos de la Empresa solo se guardaba en `localStorage`, así que servía en la máquina donde se subió pero NO llegaba al PDF (que se genera server-side).

- Nuevo endpoint `api/empresa/logo.php` — POST base64 sube y guarda en `conta-app-backend/uploads/logo.{ext}`, DELETE lo borra, GET devuelve URL pública. Crea la columna `tbldatosempresa.Logo` idempotentemente.
- `api/empresa/datos.php` — GET devuelve `Logo_url` (absoluta) para que el frontend la muestre y las impresiones la reutilicen.
- `api/facturacion-electronica/pdf.php` — toma el logo del path guardado en BD; si no existe archivo, imprime sin logo (adiós al logo de Innovación por default).
- `DatosEmpresa.tsx` — al guardar sube al backend; al cargar trae desde el servidor.

### Cotizaciones — nuevo modo de documento + botones de imprimir

Se puede elegir "Cotización" desde el selector DOCUMENTO al inicio (no como acción posterior). En ese modo el botón Finalizar cambia a "Guardar Cotización" en azul, se omiten validaciones de stock/crédito/caja y no toca kardex/inventario.

- Botón "Nueva Cotización" de la barra ahora **activa el modo** (antes solo intentaba guardar y no hacía nada sin líneas). Label de la pestaña cambia a "Cotización N" inmediatamente. Cuando ya está en modo cotización con líneas, el botón muta a "Guardar Cotización".
- 🖨️ **Imprimir cotización**: botón nuevo en la barra superior cuando la pestaña activa ya es una cotización guardada, y otro botón en cada fila del listado **Cotizaciones guardadas** — permite reimprimir sin abrir la cotización en una pestaña.
- Fix crítico SQL: `tblcotizaciones.id_cotizacion` y `detalle_cotizacion.id_detalle_cotiza` en BDs viejas venían sin AUTO_INCREMENT, causando `1364 Field 'id_cotizacion' doesn't have a default value` al guardar. `actualizacion_completa.sql` ahora aplica el ALTER idempotentemente. También corregido en `estructura_conta_ft.sql` y `conta_template_cliente_nuevo.sql` para nuevas instalaciones.

### Facturación electrónica — consulta de eventos DIAN (facturas a crédito)

En Colombia, una factura a crédito se convierte en título valor cuando el cliente la acepta formalmente (evento 033) o pasan 3 días hábiles sin rechazo (aceptación tácita). Se agregó visibilidad de estos eventos:

- Nuevo endpoint proxy `api/facturacion-electronica/eventos.php`:
  - `GET ?cufe=X` → consulta rápida a `/eventos-estado` (BD Lumen).
  - `GET ?cufe=X&refresh=1` → consulta DIAN en tiempo real via `/eventos`.
  - `POST { cufes: [...] }` → batch con `curl_multi_init` en paralelo (max 100 cufes).
- Listado FE — nueva columna **Evento** con badge coloreado por estado (Pendiente / Acuse / Recibido / Aceptada / Aceptación Tácita / Rechazada). Solo muestra badge en facturas crédito autorizadas. Botón 🔄 por fila fuerza consulta DIAN. Carga en batch al abrir el módulo.
- Modal de detalle de FE — botón azul **Consultar eventos** en el header y bloque nuevo con timeline visual de los 4 pasos (acuse → recibido → aceptación → rechazo) con fechas. Muestra motivo de rechazo si aplica. Auto-carga estado al abrir el modal.
- `listar.php` incluye `payment_form_id` para que el frontend pueda filtrar créditos.

### Archivos tocados
- `conta-app-backend/api/empresa/logo.php` (nuevo)
- `conta-app-backend/api/empresa/datos.php`
- `conta-app-backend/api/facturacion-electronica/pdf.php`
- `conta-app-backend/api/facturacion-electronica/eventos.php` (nuevo)
- `conta-app-backend/api/facturacion-electronica/listar.php`
- `conta-app-backend/sql/actualizacion_completa.sql`
- `conta-app-backend/sql/estructura_conta_ft.sql`
- `conta-app-backend/sql/conta_template_cliente_nuevo.sql`
- `Dashboard-Facturación/src/components/DatosEmpresa.tsx`
- `Dashboard-Facturación/src/components/NuevaVenta.tsx`
- `Dashboard-Facturación/src/components/VentasTabs.tsx`
- `Dashboard-Facturación/src/components/FacturacionElectronica.tsx`
- `Dashboard-Facturación/src/components/DetalleDocElectronico.tsx`

---

## 4.3.62 — 2026-06-26

### Fix — Total inflado también aparecía en la vista previa de FE y en el listado

Después de 4.3.61 el PDF impreso ya salía bien, pero el **modal de detalle de FE** (vista previa con CUFE + ítems + totales) seguía mostrando `$ 979.530` arriba en "Total:" y abajo en "TOTAL:". También el listado de facturas electrónicas y el resumen "Total Facturado" leían el campo cacheado.

Causa: 4 lugares más leían `doc.total` / `e.total` directamente:
- `DetalleDocElectronico.tsx` — `totalDoc = parseFloat(doc.total)` → ahora `totalBase + totalIva - descuento`.
- `FacturacionElectronica.tsx` (`buildDatosFE` al copiar/imprimir desde el grid) — fallback al cálculo desde líneas.
- `api/facturacion-electronica/listar.php` — JOIN con `detalle_document_electronic` agrupado, total recalculado por fila (afecta grid + resumen).
- `api/facturacion-electronica/detalle.php` — `$doc['total']` y `$notas[*]['total']` se recalculan desde sus respectivos detalles.

Con esto, las facturas viejas (emitidas antes de 4.3.61, con `electronic_documents.total` inflado en la BD) **se ven bien sin migración**: la UI y el PDF reconstruyen el total al vuelo desde las líneas correctas. Si en el futuro se quiere normalizar la BD, basta con `UPDATE electronic_documents SET total = ... FROM (SUM line_extension_amount + SUM tax_amount - descuento)`.

### Archivos tocados
- `Dashboard-Facturación/src/components/DetalleDocElectronico.tsx`
- `Dashboard-Facturación/src/components/FacturacionElectronica.tsx`
- `conta-app-backend/api/facturacion-electronica/listar.php`
- `conta-app-backend/api/facturacion-electronica/detalle.php`

---

## 4.3.61 — 2026-06-26

### Fix CRÍTICO — Total inflado en facturas con IVA Incluido

**Síntoma reportado**: Cliente INVERSIONES EBENEZER (Régimen Común, IvaIncluido=1) generaba factura electrónica IE2 donde DIAN aceptaba bien ($887.000), pero el PDF local mostraba **Total: $979.530** — un valor inflado en exactamente el 19% sobre el precio bruto que ya tenía IVA incluido.

**Diagnóstico**:
- `api/ventas/nueva.php` calculaba el total como `subtotal + (subtotal × iva/100)` ignorando que cuando `IvaIncluido=1` el precio del catálogo YA contiene el IVA. Resultado: se sumaba IVA encima del precio ya inflado, y `tblventas.Total` quedaba con el monto duplicado.
- `api/facturacion-electronica/enviar.php` insertaba `electronic_documents.total` leyendo `$factura['Total']` directamente, propagando el valor inflado.
- `api/facturacion-electronica/pdf.php` leía `$doc['total']` sin recalcular, así el PDF mostraba el valor inflado aunque las líneas (line_extension_amount + tax_amount) estaban correctas.

A DIAN sí se enviaba el valor correcto porque `buildInvoiceJSON()` ya respetaba IvaIncluido al calcular `payable_amount = totalBase + totalIva - descGlobal`. Por eso la factura era aceptada con CUFE válido, pero el PDF mostraba inconsistencia.

**Cambios**:
- `api/ventas/nueva.php`: lee `IvaIncluido` de `tbldatosempresa`. Si está activo, extrae IVA del bruto con la fórmula `lineAmount × iva/(100+iva)` en vez de agregarlo. Aplica a ambos loops (totales de cabecera + detalle por línea). `tbldetalle_venta.Subtotal` se mantiene como bruto (compatibilidad con informes), pero `Impuesto` ahora trae el monto correcto.
- `api/facturacion-electronica/enviar.php`: nueva función `calcularTotalDocFE()` que computa el total desde las líneas respetando régimen + IvaIncluido. Usada en ambos INSERTs de `electronic_documents` (caso normal y reenvío por contingencia).
- `api/facturacion-electronica/pdf.php`: `$total` ya no se lee de `$doc['total']`, se recalcula como `subtotal + totalIva - descuento`. Esto permite que **facturas antiguas emitidas con el bug** muestren el total correcto al regenerarse el PDF, sin necesidad de reenviar a DIAN.

### Fix — Validación correo cliente (dos capas)

Reportado: cliente con email malformado (`rafaelgonzalez517@` sin dominio) emitió factura electrónica con `send_email=true`. El backend rechazaba el envío del correo silenciosamente (filter_var FALSE) y el cliente no recibía el correo aunque la UI lo prometía. Se cierra el agujero con DOS validaciones bloqueantes:

**1. Al guardar/editar cliente** (`CustomersManagement.tsx`):
   El campo Email es opcional, pero si se llena debe pasar el regex `/^[^\s@]+@[^\s@]+\.[^\s@]+$/`. Soporta varios correos separados por `,` o `;` — todos deben ser válidos. Si alguno falla, se muestra mensaje "Correo inválido: X. Use formato usuario@dominio.com" y NO se guarda.

**2. Al emitir factura electrónica** (`NuevaVenta.tsx`):
   - Al seleccionar cliente: si ningún token del campo Email pasa el regex completo (no solo `includes('@')` como antes), se desactiva `enviarEmailFE` automáticamente.
   - Al ejecutar venta: si `tipoDocumento === 'electronica' && enviarEmailFE` pero el cliente no tiene ningún correo válido, se bloquea la emisión con `toast.error` y se pide editar el cliente o destildar "Enviar a correo".

### Archivos tocados
- `conta-app-backend/api/ventas/nueva.php`
- `conta-app-backend/api/facturacion-electronica/enviar.php`
- `conta-app-backend/api/facturacion-electronica/pdf.php`
- `Dashboard-Facturación/src/components/NuevaVenta.tsx`
- `Dashboard-Facturación/src/components/CustomersManagement.tsx`

---

## 4.3.60 — 2026-06-26

### Cartera/Pagar — UI más limpia + confirmación de pago

- Tabla con nombres simples: `Abono | Descuento | Saldo Nuevo` (volvió a estos labels después de probar variantes más descriptivas).
- Indicador derecho ahora dice **TOTAL A PAGAR**.
- Campo arriba renombrado a **DESCUENTO**.
- Se removieron extras visuales que distraían: banda azul explicativa, fórmula "60.000 − 45.000 − 15.000" debajo de Saldo Nuevo, sublabel "+ rebaja $Y = cubre $Z". El cálculo lo refleja la propia columna Saldo Nuevo.
- **Confirmación antes de guardar**: el botón Guardar ahora abre un diálogo con resumen:
  > *"Recibirás $45.000 en efectivo/banco y aplicarás $15.000 de descuento a 1 factura(s)."*
  
  con botones `Cancelar` / `Sí, guardar`. Evita guardados accidentales.

### Archivos tocados
- `Dashboard-Facturación/src/components/ClienteDetalle.tsx`

---

## 4.3.59 — 2026-06-26

### Productos tipo Servicio (reintroduce funcionalidad del sistema anterior)

La BD ya tenía las columnas `tblarticulos.Servicio` y `tbldetalle_venta.DescripcionTemp`, faltaba cablearlas. Ahora un producto se puede marcar como **servicio**, y al venderlo:

- Su Existencia NO se descuenta (no afecta kardex ni inventario).
- El concepto/descripción del producto es **editable por venta** — útil para conceptos largos como "Mantenimiento preventivo de equipo Dell Latitude con cambio de pasta térmica" que cambian por cliente.
- La descripción editada se guarda en `tbldetalle_venta.DescripcionTemp` y aparece en el PDF impreso (tirilla y carta), en el detalle de la factura, en reimpresiones, en la copia a nueva venta y en la FE enviada a DIAN (campo `description`).

**Modal de producto reorganizado**: el primer paso ahora es elegir "Producto físico" vs "Servicio" con dos botones grandes. Cuando se elige Servicio, se ocultan las secciones que no aplican (Existencias, Ubicación, Costo) y la tabla de precios se reduce a 2 columnas en vez de 4.

**Listado de inventario**: nuevo filtro de tipo arriba `[Todos N] [Productos N] [Servicios N]`. Solo aparece si el negocio tiene al menos un servicio en catálogo.

### Cartera/Pagar — labels más claros, banda explicativa

Usuario reportó confusión: pensaba que la "Rebaja" se restaba del campo "Abono", cuando en realidad son independientes. Mejoras de UI (sin cambio de lógica):

- Banda azul arriba del módulo Pagar: *"En Paga escribe solo lo que el cliente te entrega en plata. La Rebaja es lo que tú le perdonas sin recibir dinero. Saldo nuevo = saldo anterior − Paga − Rebaja"*.
- Renombrados: "PAGO GLOBAL" → "PAGA EN TOTAL", "DESC." → "REBAJA (sin recibir $)", columnas "Abono"/"Desc." → "Paga"/"Rebaja".
- Indicador derecho cuando hay rebaja muestra: `RECIBE $45.000 + rebaja $15.000 = cubre $60.000` — deja claro que ambos suman para reducir el saldo.

### Archivos tocados
- `Dashboard-Facturación/src/components/EditarArticuloModal.tsx` — selector Producto/Servicio + campos condicionales
- `Dashboard-Facturación/src/components/InventarioManagement.tsx` — filtro por tipo
- `Dashboard-Facturación/src/components/NuevaVenta.tsx` — input editable para servicios + salta validación de stock
- `Dashboard-Facturación/src/components/ImpresionFactura.tsx` — usa DescripcionTemp
- `Dashboard-Facturación/src/components/ClienteDetalle.tsx` — labels claros en módulo Pagar
- `conta-app-backend/api/inventario/crear-articulo.php` + `actualizar-articulo.php` — persistir Servicio
- `conta-app-backend/api/inventario/articulos.php` — devolver Servicio
- `conta-app-backend/api/ventas/nueva.php` — guardar DescripcionTemp, saltar stock/kardex si servicio
- `conta-app-backend/api/ventas/detalle-factura.php` + `listar.php` + `copiar.php` — COALESCE DescripcionTemp
- `conta-app-backend/api/facturacion-electronica/enviar.php` — usar DescripcionTemp en JSON DIAN

---

## 4.3.58 — 2026-06-25

### Fixes módulo Gastos

**1. Informe del periodo — todos los gastos aparecían "Sin categoría"** (`api/informes/resumen.php`)
- `tblegresos.categoria_gasto` es VARCHAR(50) y guarda el nombre de la categoría (ej. "Arriendo"). El JOIN del informe comparaba contra `cg.Id_Categoria` (INT) → nunca matcheaba. Fix: JOIN por `cg.Nombre` en los 3 lugares donde aparece.

**2. Listado de gastos duplicaba el último** (`api/movimientos/gastos.php`)
- Bug clásico PHP: el primer `foreach ($gastos as &$g)` dejaba `$g` como referencia al último elemento. El siguiente `foreach ($gastos as $g)` sobrescribía ese último elemento en cada iteración, corrompiendo el array. Síntoma reportado: con 2 gastos (Arriendo $1.500.000 + Aseo $45.000) la tabla mostraba el de Aseo dos veces y el total por categoría decía "Aseo: $90.000". Fix: `unset($g)` después del primer foreach por referencia.

### Archivos tocados
- `conta-app-backend/api/informes/resumen.php` — JOIN por nombre
- `conta-app-backend/api/movimientos/gastos.php` — unset tras foreach con &

---

## 4.3.57 — 2026-06-24

### Fixes FE — onboarding de cliente nuevo (INVERSIONES EBENEZER)

Cliente nuevo destapó 4 problemas en FE que se acumularon en este parche. **Cero impacto para clientes con Régimen Simple/Simplificado** — todos los cambios se ejecutan solo en flujo de FE o son cosméticos del PDF de FE.

**1. SQL: defaults en `electronic_documents`** (`actualizacion_completa.sql`)
- BDs viejas tenían `descuento`, `abono`, `efectivo`, `valorpagado1`, `codigoEmp`, `id_mediopago` como `NOT NULL` sin default. INSERT desde `enviar.php` fallaba con *"Field 'X' doesn't have a default value"*. Ahora `actualizacion_completa.sql` aplica los defaults idempotentemente.

**2. SQL: AUTO_INCREMENT en `detalle_document_electronic`** (`actualizacion_completa.sql`)
- La PK `id_detalle_document` quedaba `NOT NULL` sin `AUTO_INCREMENT` en esquemas viejos. Cada INSERT de línea de FE fallaba. Migración idempotente: si la columna no tiene auto_increment, bumpea filas con id=0 y aplica el ALTER.

**3. Prefijo de FE**
- **Bug A** — `api/empresa/datos.php` no incluía la columna `Prefijo` en su UPDATE. Al guardarlo desde Datos de Empresa, el backend lo ignoraba y al recargar aparecía vacío. Fix: agregar `Prefijo = ?` al UPDATE.
- **Bug B** — `enviar.php` insertaba `electronic_documents.prefix='FCON'` hardcoded. Tras autorización DIAN, actualizaba `number` y `cufe` pero **olvidaba** actualizar `prefix`. Resultado: factura emitida por DIAN como "IE1" se mostraba en Conta FT como "FCON1". Fix: leer `result.prefix` y actualizarlo en el UPDATE post-autorización.

**4. PDF FE — bloque final se desbordaba a segunda página**
- En `api/facturacion-electronica/pdf.php`, `$alturaBloqueF = 65` no contemplaba el "Total de líneas" ni los `Ln`. Resultado: factura de 1 línea quedaba con QR+totales en página 1 y "Total de líneas: 1" solito en página 2. Ahora `$alturaBloqueF = 80` para que todo quepa en una hoja.

### Archivos tocados
- `conta-app-backend/sql/actualizacion_completa.sql` — migraciones idempotentes
- `conta-app-backend/api/empresa/datos.php` — Prefijo en UPDATE
- `conta-app-backend/api/facturacion-electronica/enviar.php` — prefix de DIAN al UPDATE
- `conta-app-backend/api/facturacion-electronica/pdf.php` — alturaBloqueF=80

---

## 4.3.56 — 2026-06-22

### Fix Nueva Venta: IVA se sumaba dos veces cuando el precio ya lo incluía

Si la empresa tenía configurado **"Precio con IVA incluido"** (Configuración → Sistema → IvaIncluido=1), Nueva Venta tomaba el `Precio_Venta` del catálogo (que ya contiene IVA) y le **sumaba el IVA otra vez** al calcular el total. El cliente reportó que un producto de $13.000 con IVA 19% terminaba mostrando $15.470 en lugar de $13.000.

**Fix en `NuevaVenta.tsx`**:
- Lee `getConfigImpresion().precioIvaIncluido`.
- Si está activo: el IVA por línea se **separa** del subtotal con fórmula `iva/(100+iva)` y el `totalFactura = subtotal − descuento` (sin sumar IVA encima). Se muestra "IVA incluido: $X" como informativo.
- Si NO está activo: comportamiento previo intacto — IVA se calcula con `iva/100` y se suma al subtotal.

Comportamiento retrocompatible: clientes con `IvaIncluido=0` no perciben cambios.

### Archivos tocados
- `Dashboard-Facturación/src/components/NuevaVenta.tsx` — cálculo de `totalIvaBase` y `totalFactura` según flag.

---

## 4.3.55 — 2026-06-16

### Fix crítico — Factura electrónica DIAN

Dos correcciones en `api/facturacion-electronica/enviar.php` que provocaban que DIAN rechazara la factura con el error *"Los totales de la factura no cuadran correctamente"*:

**1. Cálculo de IVA por línea con cantidades fraccionarias.** La fórmula `$ivaAmount / max($cant, 1) * $cant` dividía el IVA por 2 cuando la cantidad era menor a 1 (ej. 0.50 kg, 0.25 libras). Solo se manifestaba al vender productos a granel o por peso — con cantidades enteras (1, 2, etc.) pasaba inadvertido. Ejemplo real reportado: factura con 0.50 kg de pollo, DIAN esperaba `tax_amount=2119.05` y Conta FT enviaba `1059.53`. Ahora `tax_amount = $ivaAmount` directo, sin multiplicar de nuevo por cantidad.

**2. Régimen Simplificado / No Responsable de IVA.** Si la empresa estaba registrada como no responsable de IVA pero sus productos en el catálogo tenían IVA configurado (5%, 19%), el JSON salía con IVA cobrado, lo cual DIAN rechaza (un no responsable no puede cobrar IVA). Ahora `buildInvoiceJSON()` lee `tbldatosempresa.Regimen` y fuerza IVA=0 en todas las líneas si detecta: "Simplificado", "No responsable", "No resp" o simplemente "no". Empresas con régimen "Común" se comportan igual que antes.

Mismo ajuste aplicado en el INSERT a `tbldetalle_documento_electronico` para que el guardado local también respete el régimen.

### Eliminar documentos rechazados desde la UI

En el listado de Facturación Electrónica, los documentos que DIAN rechaza quedaban ocupando espacio sin poder hacer nada con ellos. Ahora:

- **Icono de basura por fila**: aparece solo en documentos con estado *rechazado* o *error* y sin CUFE. Pide confirmación antes de eliminar.
- **Botón "Limpiar rechazados"** en el header: aparece cuando hay al menos 1 rechazado. Elimina todos los del listado de una sola vez, mostrando el conteo.
- **Endpoint protegido**: `POST /api/facturacion-electronica/eliminar.php` valida en backend que el documento NO tenga CUFE y que su estado sea rechazado/error. Si el frontend envía un id de un documento autorizado lo ignora silenciosamente — los autorizados son inmutables ante DIAN y se manejan vía nota crédito.
- Elimina también el detalle (`tbldetalle_documento_electronico`) en la misma transacción.

### Archivos tocados
- `conta-app-backend/api/facturacion-electronica/enviar.php` — fix tax_amount + detección de régimen.
- `conta-app-backend/api/facturacion-electronica/eliminar.php` — NUEVO endpoint protegido.
- `Dashboard-Facturación/src/components/FacturacionElectronica.tsx` — icono basura por fila + botón masivo en header.

### Fix: abono inicial en venta a crédito no quedaba en tblpagos

Cuando se creaba una factura **a crédito** y se ingresaba un abono inicial desde el modal de cobro (campo "Valor Efectivo" del cierre de venta), el sistema guardaba el monto en `tblventas.Abono` y descontaba del `Saldo`, pero **NO** insertaba la fila correspondiente en `tblpagos`. Resultado:

- El detalle de la factura mostraba el saldo descontado (correcto, lee `tblventas.Saldo`).
- Pero el módulo de **Pagar / Cartera del cliente** mostraba el saldo COMPLETO (lee desde `vw_saldos_por_factura` que calcula `Total - SUM(tblpagos)`), permitiendo cobrar el abono otra vez.

Ahora `api/ventas/nueva.php` inserta una fila en `tblpagos` (con `DetallePago = "Abono inicial al crear factura N° X"`, `RecCajaN = MAX+1`, `id_mediopago` y `Codigo` del cliente) cuando `tipo != 'Contado' && abono > 0`.

Backfill aplicado para casos detectados en producción (`conta_nutrigranos`): factura 598 (Pedro Guerra, abono $40.000).

---

## 4.3.54 — 2026-06-09

### Sincronización móvil completa: ediciones + clientes nuevos + automático

> ⚠️ **El módulo de Vendedores Móviles SIGUE EN PRUEBAS**. Esta versión incluye el código para activarlo pero **NO** distribuye su migración SQL en `actualizacion_completa.sql`. Para clientes que NO usan vendedores móviles (default, módulo apagado en Configuración), esta versión es completamente transparente.
>
> Cuando un cliente contrate el módulo, aplicar `sql/modulo_vendedores_movil.sql` aparte (incluye checklist de despliegue).

Cuando un vendedor edita un cliente desde la app móvil o crea uno nuevo durante una visita, los cambios bajaban a Lumen pero NUNCA llegaban al Conta FT desktop. Solo los pedidos se sincronizaban. Ahora el flujo completo está cubierto:

**1. Ediciones de clientes (teléfono, GPS, dirección, etc.)** — Endpoint Lumen `GET /sync/clientes/ediciones-pendientes` + `POST /sync/clientes/ediciones-confirmadas`. El pull desde desktop aplica `UPDATE tblclientes` mapeando campos Lumen → columnas legacy VB6.

**2. Clientes nuevos creados desde móvil** — Endpoints Lumen `GET /sync/clientes/nuevos` + `POST /sync/clientes/confirmar-mapeo`. El pull inserta en `tblclientes` con un `CodigoClien` siguiente y confirma a Lumen el mapeo bidireccional `id_cliente` (Lumen) ↔ `codvb6` (= `CodigoClien` desktop). Así las próximas ediciones del mismo cliente sí encuentran el vínculo.

**3. Trazabilidad del vendedor** — Al insertar un cliente nuevo del móvil:
- `CodigoEmp` se llena si el vendedor móvil tiene `id_remoto` mapeado a un empleado del desktop.
- Si no hay mapeo, se escribe en `Cargo_C` algo como **"Móvil: V005 - Carlos Test"** para que en Conta FT se sepa quién creó al cliente.

**4. Sincronización automática (silenciosa)** — Hook `useAutoSyncVendedores` corre en el Dashboard: cada `sync_intervalo_pull_min` minutos (de la config) llama al pull silenciosamente. Solo muestra toast cuando hay cambios reales. Errores de conexión NO se reportan (no spamea si el hub está caído).

**5. App móvil — listado refresca al instante tras editar** — `EditClientScreen` ahora hace `clientsRepo.upsert` tras el PUT exitoso, así el listado refleja el cambio sin esperar al próximo fetch.

### Nuevas columnas en tblclientes — APLICAR SOLO EN BDs CON MÓDULO MÓVIL ACTIVO
- Archivo: `conta-app-backend/sql/modulo_vendedores_movil.sql` (separado, NO en `actualizacion_completa.sql`)
- Columnas: `latitud DECIMAL(10,7)`, `longitud DECIMAL(10,7)`, `precision_gps_metros DECIMAL(8,2)`, `gps_capturado_at DATETIME`
- Aplicado ya en BD de pruebas `conta_test_negocio` y en hub Lumen `conta_movil`.

### Toggle global respetado
Todo el flujo solo se activa si el cliente tiene encendido **Configuración → Vendedores Móviles → Habilitar módulo**. Sin el toggle: ningún pull, ningún tráfico, ningún cambio. Los clientes sin módulo móvil no perciben nada.

### Fixes durante implementación
- Lumen: `now()` reemplazado por `date('Y-m-d H:i:s')` (función no disponible en Lumen sin `use Carbon`).
- Lumen: filtro `whereNotNull('codvb6')` quitado en `ediciones-pendientes` — sino bloqueaba TODAS las ediciones de clientes creados en móvil.
- pull.php: tolera `Identificacion` int — pasa `null` cuando el documento contiene caracteres no numéricos.
- pull.php: `Whatsapp NOT NULL` sin default → pasa cadena vacía al insert.
- pull.php: normaliza `gps_capturado_at` de ISO con `Z` a `YYYY-MM-DD HH:MM:SS` para MySQL.

### Archivos tocados

Cuando un vendedor edita un cliente desde la app móvil (cambia teléfono, agrega coordenadas GPS al visitar al cliente, corrige dirección, etc.), el cambio quedaba represado en el hub Lumen y nunca llegaba al Conta FT desktop. Ahora el pull desde Configuración → Vendedores Móviles → **"⬇️ Bajar cambios"** trae ambas cosas: ventas hechas en móvil + ediciones de clientes.

**Detalles:**
- **Lumen** — endpoints nuevos `GET /sync/clientes/ediciones-pendientes` y `POST /sync/clientes/ediciones-confirmadas`. Solo entrega ediciones de clientes que ya existían en el desktop (con `codvb6`); los creados desde móvil quedan para un flujo aparte.
- **Desktop** — `api/vendedores/pull.php` extendido: tras bajar ventas, consulta ediciones pendientes y aplica `UPDATE tblclientes` por cada una mapeando campos Lumen → columnas legacy VB6 (`telefono`→`Telefonos`, `email`→`Email`, `direccion`→`Direccion`, `latitud`/`longitud`/`precision_gps_metros`/`gps_capturado_at` → columnas nuevas). Confirma a Lumen los ids aplicados.
- **Nuevas columnas en `tblclientes`** (idempotente, vía `actualizacion_completa.sql`): `latitud`, `longitud`, `precision_gps_metros`, `gps_capturado_at`. Solo se llenan si el negocio usa el módulo de vendedores móviles.
- **Toggle global respetado** — todo el flujo solo se activa si el cliente tiene encendido `Habilitar módulo de vendedores móviles` en Configuración. Para clientes sin módulo móvil, nada cambia.

### App móvil — listado refresca al instante tras editar

Antes, al editar un cliente y volver al listado, seguía mostrando el dato anterior hasta que se salía al menú y volvía. Causa: `useCachedList` muestra primero el caché local SQLite y luego refetcha en background. Ahora `EditClientScreen` actualiza el caché SQLite del cliente inmediatamente después del PUT exitoso (`clientsRepo.upsert`), así el listado refleja el cambio apenas vuelves del modal.

### Archivos tocados
- `AppMobilFacturacion/api/app/Http/Controllers/SyncVendedorController.php` — 4 métodos nuevos (ediciones-pendientes, ediciones-confirmadas, clientes-nuevos, confirmar-mapeo)
- `AppMobilFacturacion/api/routes/web.php` — 4 rutas nuevas en `/sync`
- `AppMobilFacturacion/src/db/clientsRepo.ts` — método `upsert`
- `AppMobilFacturacion/src/screens/EditClientScreen.tsx` — upsert tras save
- `conta-app-backend/api/vendedores/pull.php` — bloque de clientes nuevos + ediciones
- `conta-app-backend/sql/actualizacion_completa.sql` — columnas GPS en tblclientes
- `Dashboard-Facturación/src/components/ConfiguracionSistema.tsx` — feedback "Bajar cambios"
- `Dashboard-Facturación/src/components/Dashboard.tsx` — hook `useAutoSyncVendedores`
- `Dashboard-Facturación/src/hooks/useAutoSyncVendedores.ts` — NUEVO (sync silencioso)

### Migraciones a aplicar
- **Desktop (BD del cliente)**: ejecutar `actualizacion_completa.sql` — agrega las 4 columnas GPS de forma idempotente.
- **Hub Lumen** (solo en el servidor del hub):
```sql
ALTER TABLE cliente_ediciones_log
  ADD COLUMN sincronizado_desktop TINYINT(1) NOT NULL DEFAULT 0 AFTER fuente,
  ADD COLUMN fecha_sync_desktop DATETIME NULL DEFAULT NULL AFTER sincronizado_desktop,
  ADD INDEX idx_ediciones_pendientes (sincronizado_desktop, id_empresa, id);
```

---

## 4.3.53 — 2026-06-09

### Mejoras de productividad (reportadas por usuaria de Ammi Accesorios)

**1. Búsqueda inteligente de productos.** Al escribir un término en el buscador de Inventario, Productos o en el dropdown de búsqueda dentro de Compras/Ventas, los productos cuyo código o descripción **empieza** con el término ahora aparecen **primero**, antes de los que solo lo contienen. Ejemplo: al buscar "Bolsos", los productos que se llaman "Bolsos cuero", "Bolsos pequeños" aparecen arriba; los que solo contienen la palabra (ej. "Cinturón para bolsos") quedan abajo. Aplicado tanto en frontend (orden) como en backend (SQL `CASE` priorizando `LIKE 'término%'`).

**2. Filtros de AG Grid en español.** Las tablas con filtros de columna (encabezado → menú filtro) ahora muestran las opciones en español: "Contiene", "Empieza con", "Termina con", "Igual a", "Distinto de", "En blanco", "Entre", botones "Aplicar"/"Limpiar", paginación "Página X de Y", "Filas por página", etc. Aplicado a Inventario (más usado). Localización compartida en `src/utils/agGridLocaleEs.ts` reutilizable para otras tablas.

**3. Manejo de lotes / fechas de vencimiento ahora es una opción global de la app.** Antes era forzoso para cualquier producto con `requiere_lote=1` y bloqueaba el guardado. Ahora se controla desde **Configuración → Módulos opcionales del negocio → "Fechas de vencimiento / Lotes"**:
- Apagado por defecto. Apropiado para boutique, ferretería, accesorios, papelería, distribuidoras no perecederos.
- Cuando está **apagado**:
  - El modal de producto **oculta** el checkbox "Requiere fecha de vencimiento (perecedero)".
  - En Nueva Compra, los productos con `requiere_lote=1` en catálogo se tratan como NO perecederos: NO aparece la fila de Lote/Vencimiento, ni el badge "PERECEDERO", ni se valida nada.
- Cuando está **encendido** (farmacias, droguerías, alimentos, lácteos):
  - Aparece el checkbox en el modal de producto.
  - En Nueva Compra, los productos marcados muestran la fila Lote/Vencimiento (ahora etiquetada como **opcional** — si no se ingresa fecha, simplemente no se crea el lote; la compra se guarda igual).

**4. Campo Fecha en formulario de Compras.** El header de Nueva Compra ahora incluye un input **FECHA FACTURA** (`type="date"`) con default a hoy. Permite registrar facturas de proveedores que llegaron tarde (con fecha pasada) o programadas. Se persiste en `localStorage` y se envía al backend, que ya aceptaba el parámetro `fecha` opcional desde 4.3.x.

### Archivos tocados
- `Dashboard-Facturación/src/components/ConfiguracionSistema.tsx` — nuevo setting `usarLotes` (default OFF)
- `Dashboard-Facturación/src/components/InventarioManagement.tsx` — orden inteligente + localeText
- `Dashboard-Facturación/src/components/ProductsManagement.tsx` — orden inteligente
- `Dashboard-Facturación/src/components/NuevaCompra.tsx` — campo fecha + lote opcional + respeta `usarLotes`
- `Dashboard-Facturación/src/components/EditarArticuloModal.tsx` — checkbox perecedero solo si `usarLotes`
- `Dashboard-Facturación/src/utils/agGridLocaleEs.ts` — NUEVO (localización compartida)
- `conta-app-backend/api/compras/nueva.php` — ORDER BY con CASE startsWith primero
- `conta-app-backend/api/ventas/nueva.php` — idem

---

## 4.3.52 — 2026-06-05

### Corrección crítica (Bancos)
- **Gastos pagados con "Banco" no aparecían en el módulo de Bancos ni descontaban del saldo bancario.** El backend insertaba el egreso en `tblegresos` (con `Cuentas='1110'`) pero nunca registraba el movimiento en `tblmov_banco` ni actualizaba `tblbancos.Saldo`. Ahora:
  - Al **crear** un gasto con origen banco: se inserta el movimiento `egreso` en `tblmov_banco` (referenciado con `EGR-<N_Comprobante>`) y se descuenta del saldo del banco predeterminado (o el primer activo).
  - Al **editar** un gasto bancario: se ajusta el movimiento (descripción + valor) y el saldo del banco por el delta.
  - Al **anular** un gasto bancario: se registra un asiento opuesto `ingreso` (`REV-EGR-<N_Comprobante>`) y se devuelve el saldo. Preserva historial (no se borran movimientos).

### Fix retroactivo
- Para BDs con gastos bancarios huérfanos sin movimiento en `tblmov_banco`, ejecutar el siguiente SQL una vez (idempotente — solo crea los que faltan):

```sql
INSERT INTO tblmov_banco (Id_Cuenta, Fecha, Tipo, Valor, Descripcion, Referencia, Id_Usuario)
SELECT (SELECT idBancos FROM tblbancos WHERE Activa=1 ORDER BY Predeterminada DESC, idBancos ASC LIMIT 1),
       e.Fecha, 'egreso', e.Valor, CONCAT('Gasto: ', e.Concepto), CONCAT('EGR-', e.N_Comprobante), COALESCE(e.id_usuario, 0)
FROM tblegresos e
WHERE e.Estado='Valida' AND e.Cuentas='1110'
  AND NOT EXISTS (SELECT 1 FROM tblmov_banco m WHERE m.Referencia = CONCAT('EGR-', e.N_Comprobante));

UPDATE tblbancos SET Saldo = Saldo - (
  SELECT COALESCE(SUM(e.Valor),0) FROM tblegresos e
  WHERE e.Estado='Valida' AND e.Cuentas='1110'
    AND CONCAT('EGR-', e.N_Comprobante) IN (SELECT Referencia FROM tblmov_banco WHERE Tipo='egreso')
) WHERE Activa=1 ORDER BY Predeterminada DESC, idBancos ASC LIMIT 1;
```

⚠️ El UPDATE del saldo solo se debe correr UNA vez por BD. Si se corre dos veces, el saldo bajará el doble.

---

## 4.3.51 — 2026-06-04

### Nueva función
- **Editar gastos**: nuevo botón azul ✏️ en cada fila del listado de Gastos (solo en gastos válidos, no anulados). Abre el mismo modal precargado con los datos del gasto, permite cambiar concepto, valor, beneficiario, cédula, fecha y categoría. Si fue gasto de caja y cambia el valor, ajusta automáticamente el movimiento en `tblmov_caja` y el saldo de la caja por el delta. El **origen del pago** (caja vs banco) NO se puede cambiar al editar — si necesita cambiarlo, anule el gasto y cree uno nuevo

### Corrección de bug
- **Modal de Gastos no aceptaba escritura después de guardar el primero**: tras crear un gasto y volver a abrir el modal, los inputs quedaban bloqueados hasta minimizar y restaurar la ventana. Causa: el `window.confirm()` nativo de Electron dejaba el foco atascado tras aceptar. Solución: reemplazado por diálogos React propios + blur defensivo al cerrar el modal. También se quitó el desmontaje de la grilla del fondo (causaba que desapareciera la tabla detrás del modal)

### Mejora generalizada
- **Eliminados todos los `window.confirm()` y `window.alert()` nativos de la app** (25+ ocurrencias en 16 archivos). Se reemplazaron por el diálogo modal del proyecto (`ConfirmDialog`) y por `toast` para avisos. Razones: (1) los diálogos nativos de Electron se ven feos y desentonan con la UI, (2) dejaban el foco atascado bloqueando los inputs hasta minimizar/restaurar la ventana. Cubre: cerrar caja, eliminar categoría/cliente/familia/etiqueta/nota/retención, anular pago/gasto/pedido, recalcular costo, emitir nota crédito, cerrar/cancelar conteo, cerrar factura abierta, reenviar correo FE, cambio de contraseña, cierre de la app con caja abierta, etc.

---

## 4.3.50 — 2026-06-04

### Corrección crítica
- **Módulo Gastos no permitía escribir en los campos del modal "Nuevo Gasto"** y arrastraba el bloqueo a toda la app. Tres causas combinadas: (1) la grilla AgGrid del fondo "robaba" el foco al refrescar mientras el modal estaba abierto; (2) el `autoFocus` del campo VALOR competía con el repintado del modal; (3) el contenido del modal no detenía la propagación de clicks al backdrop. Fixes: la grilla se **desmonta mientras el modal está abierto**, el foco se aplica con `useEffect + requestAnimationFrame` (controlado, sin `autoFocus`), y el contenido del modal hace `stopPropagation`

---

## 4.3.49 — 2026-05-27

### Ajustes
- **Textos de configuración más claros** (sin jerga técnica): los toggles de impresión ya no mencionan términos internos que confundían al usuario
- **Impresión directa y Vista previa ahora son excluyentes**: al activar "Impresión directa a la térmica", se desactiva sola la "Vista previa antes de imprimir" (y viceversa). No tiene sentido mostrar preview si la tirilla sale directo

---

## 4.3.48 — 2026-05-26

### Nuevas funciones
- **Impresión directa a la impresora térmica**: nuevo toggle en Configuración → Comportamiento de Impresión, "Impresión directa a la térmica (sin diálogo)". Cuando se activa, la tirilla sale **sola** a la impresora elegida sin abrir el diálogo de impresión — cero clics, acelera mucho el flujo de ventas. Incluye selector de impresora (lista las instaladas), botón refrescar y botón "Probar" para tirilla de prueba. Apagado por default. Al activarla se desactiva automáticamente la "Vista previa" (son excluyentes)
- **Aviso al cerrar la app con caja abierta**: si se cierra la ventana de Windows y el usuario tiene una caja sin cerrar, el sistema pregunta "¿Seguro que deseas cerrar el sistema?" recordando que el cuadre quedará abierto. Si no hay caja abierta, cierra normal. Tiene salvaguarda: si la pantalla se cuelga, un segundo clic en la X fuerza el cierre

### Mejoras
- **Recibo de pago muestra el saldo TOTAL del cliente**: el recibo de abono ahora muestra "Saldo total cliente" (la deuda completa del cliente tras el pago, sumando todas sus facturas) en lugar de un saldo ambiguo. Antes el flujo de pago múltiple mandaba el saldo en 0
- **Fuente de la tirilla POS cambiada a Arial / sans-serif**: más legible y limpia. La alineación de columnas se mantiene porque el layout usa flexbox, no fuente monoespaciada
- **Tutorial de Familias de Productos y Distribución** ampliado en el manual HTML (`TUTORIAL_CONTA_FT.html`): concepto del Factor con ejemplos, crear familia paso a paso, distribución automática y manual, efecto en kardex/costo y errores comunes

---

## 4.3.47 — 2026-05-26

### Correcciones de bugs
- **No dejaba facturar stock fraccionario menor a 1** (ej. medio bulto, 0.5). Al agregar el producto la cantidad arrancaba en 1 y como solo había 0.5 disponible, la validación `1 > 0.5` bloqueaba con "No hay existencia suficiente" aunque sí hubiera media unidad. Ahora la cantidad inicial arranca con el disponible cuando es fraccionario < 1, y al incrementar un producto ya en la grilla el paso se ajusta al resto disponible. Se añadió tolerancia epsilon (1e-9) en todas las validaciones de stock para que la aritmética de punto flotante (0.1+0.2, etc.) no genere falsos "no hay existencia"

---

## 4.3.46 — 2026-05-26

### Mejoras UX
- **Listado de Ventas POS — totales reactivos al filtro**: las 4 cards de arriba (Total Facturas, Monto Total, Contado, Crédito) ahora se calculan sobre el array filtrado del cliente, no sobre el `resumen` del backend. Ahora reflejan TODOS los filtros activos: año/mes/día/estado (backend) + Contado/Crédito/búsqueda libre (cliente). Antes daban el total del mes completo aunque filtraras por día o por tipo
- **Hora en formato 12h con zona Bogotá**: la columna "Hora" del listado POS, el modal de detalle de factura, la reimpresión y el dashboard del vendedor muestran ahora la hora como `3:53 p. m.` en lugar de `15:53:00`. Más legible para usuarios colombianos

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
