# Historial de Versiones — Conta FT

Registro de cambios, mejoras y correcciones por versión.
Visible solo para administradores desde **Configuración → Acerca de → Ver historial**.

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
