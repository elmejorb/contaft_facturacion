# Vendedores Móviles (hub Lumen) + Sincronización online (SincroWorker)

> Nota de alcance: esta ficha cubre DOS mecanismos de sincronización distintos que no comparten código ni credenciales:
> 1. **Hub de Vendedores Móviles (Lumen)** — endpoints PHP `api/vendedores/*` y `api/cargues-vendedor/*`, credenciales en `tbl_config_vendedores` (`api_url`, `api_email`, `api_token_empresa`).
> 2. **SincroWorker (Electron main)** — `electron/sincroWorker.js`, consume `tbl_sync_outbox` y envía al SaaS `conta-basic.../api-conta/public/sync/v2` (sincroWorker.js:37-38), credenciales en `config.json` o `tbldatosempresa.email/api_token` (sincroWorker.js:425-445). **No toca el hub de vendedores.**

**Propósito:** Permitir que vendedores de campo (APK) tomen pedidos / emitan FE / creen y editen clientes / registren cargues del día, y que el escritorio baje esos datos y suba catálogos (productos, clientes, categorías, vendedores) al hub. Aparte, el SincroWorker replica ventas, pagos, clientes, artículos, proveedores, compras y gastos hacia la plataforma web (SaaS) cuando el CRM activa el entitlement.

**Pantallas (frontend):** (rutas relativas a `Dashboard-Facturación/src`)
- `components/VendedoresMovil.tsx` — menú Vendedores → "Gestión de Vendedores" (view `vendedores-gestion`, Dashboard.tsx:788, render Dashboard.tsx:1645).
- `components/VendedoresPedidos.tsx` — menú Vendedores → "Pedidos de Campo" (view `vendedores-pedidos`, Dashboard.tsx:789, render Dashboard.tsx:1646).
- `components/CarguesVendedor.tsx` — menú Vendedores → "Cargues del día" (view `vendedores-cargues`, Dashboard.tsx:790, render Dashboard.tsx:1647).
- `components/ConfiguracionSistema.tsx` — sección de configuración Vendedores Móviles: GET config (ConfiguracionSistema.tsx:377), guardar (506), probar (551), push-all (575), pull (599).
- `components/NuevaVenta.tsx` — recibe un pedido de campo vía `localStorage.pedido_para_venta_id` (NuevaVenta.tsx:885-895) y lo marca procesado al facturar (NuevaVenta.tsx:1360-1366).
- `hooks/useAutoSyncVendedores.ts` — usado en Dashboard.tsx:582 (pull automático).
- `hooks/useVendedoresConfig.ts` — usado en Dashboard.tsx:593 (badge de pedidos pendientes, Dashboard.tsx:785), PantallaInicio.tsx:21, ClienteDetalle.tsx:33.
- `hooks/useSincronizacion.ts` — usado en Dashboard.tsx:595; badge "Sync" en Dashboard.tsx:1161-1170; backfill desde Dashboard.tsx:1762.
- Todas las URLs `http://localhost:80/conta-app-backend/api/...` son reescritas al `apiUrl` real por `installFetchInterceptor()` (main.tsx:4-9, implementación en `config/api.ts`, no leída en detalle → (sin verificar) reglas exactas).

**Endpoints (backend):** `conta-app-backend/api/...`
| Endpoint | Método / action |
|---|---|
| vendedores/config.php | GET (config + conteos); POST `guardar`, `probar`, `pull_ahora` (config.php:3-7) |
| vendedores/vendedores.php | GET lista / `?id=` / `?action=empleados_disponibles`; POST `crear`, `editar`, `sincronizar`, `toggle_activo` (vendedores.php:3-6, 20, 60, 103, 141, 230) |
| vendedores/asignar-clientes.php | GET `?id_vendedor=`; POST `{id_vendedor, codvb6[]}` (asignar-clientes.php:5-8) |
| vendedores/pull.php | GET o POST (sin action efectiva) — pull incremental (pull.php:3-5) |
| vendedores/push-all.php | GET o POST — subida completa (push-all.php:14-16) |
| vendedores/pedidos.php | GET lista / `?id=` / `?cargar_venta=1&id=`; POST `convertir`, `anular`, `marcar_procesado` (pedidos.php:3-7, 17, 285, 413, 421) |
| vendedores/sync-catalogos.php | Script CLI de desarrollo (conexión hardcodeada root/root a `conta_test_negocio` y `conta_movil`, sync-catalogos.php:8-11). No lo llama el frontend. |
| cargues-vendedor/list.php | GET (list.php:4-9) |
| cargues-vendedor/detalle.php | GET `?id=` (detalle.php:4) |
| cargues-vendedor/pull-from-hub.php | GET/POST (pull-from-hub.php:4) |
| cargues-vendedor/aprobar.php | POST `{id, notas_admin?, aprobado_por?}` (aprobar.php:4) |
| cargues-vendedor/rechazar.php | POST `{id, notas_admin}` (rechazar.php:4) |
| cargues-vendedor/cuadrar.php | POST `{id, notas_admin_final}` (cuadrar.php:4) |

**Hub externo (Lumen):** URL base = `tbl_config_vendedores.api_url` (default en SQL: `https://conta-basic.innovacion-digital.com/api-conta/public`, actualizacion_completa.sql:797; schema_sqlite_cliente.sql:349). Autenticación: **no hay header de auth**; `email` + `token_api` viajan en query string (GET) o en el body JSON (POST), tomados de `tbl_config_vendedores.api_email` / `api_token_empresa` (p.ej. pull.php:27-37, push-all.php:36-41). Todas las llamadas cURL desactivan verificación TLS (`CURLOPT_SSL_VERIFYPEER=false`, `VERIFYHOST=0`, p.ej. pull.php:42-43, push-all.php:53-54).

## Flujos principales

### 1. Configurar módulo
- **Operación:** guardar config / probar conexión
- **Pantalla → endpoint:** ConfiguracionSistema.tsx:506 → config.php POST `guardar`; ConfiguracionSistema.tsx:551 → config.php POST `probar`; también useVendedoresConfig.ts:39-62.
- **Lee:** tbl_config_vendedores (GET, config.php:15), tbl_pedidos_vendedor (conteo pendientes, config.php:18), electronic_documents (conteo `origen='movil'`, config.php:19)
- **Escribe:** tbl_config_vendedores (UPDATE id=1, config.php:35-57)
- **Efectos colaterales:** `probar` → GET `{api_url}/health` (config.php:72). Tras guardar, el renderer llama DIRECTO al hub `POST {api_url}/sync/empresa/modos` con email/token en body (ConfiguracionSistema.tsx:519-528); 404 se trata como aviso suave (ConfiguracionSistema.tsx:530-532).
- **Transacción:** no
- **Consecutivos:** n/a
- **Validaciones solo en frontend:** ninguna relevante; backend no valida URL/email/token en `guardar` (config.php:48-57).

### 2. Pull desde el hub (pedidos, FE móviles, vendedores, clientes nuevos, ediciones de clientes)
- **Pantalla → endpoint:** useAutoSyncVendedores.ts:26 → pull.php GET (automático); ConfiguracionSistema.tsx:599 → pull.php GET; useVendedoresConfig.ts:74-77 → config.php POST `pull_ahora` que hace `include 'pull.php'` (config.php:89-96).
- **Lee:** tbl_config_vendedores (pull.php:21), electronic_documents (por cufe, pull.php:79-84), tbl_pedidos_vendedor (por id_remoto, pull.php:125), tbl_vendedores_movil (pull.php:233, 321, 344), tblclientes (anti-duplicado por Nit/Identificacion pull.php:305-311; MAX pull.php:353; existencia pull.php:490)
- **Escribe:**
  - electronic_documents — INSERT/UPDATE con `origen='movil'`, solo cabecera (fecha, cod_cliente, customer_identification, total, cufe, status, id_vendedor_remoto, nombre_vendedor) (pull.php:89-120)
  - tbl_pedidos_vendedor — INSERT/UPDATE por id_remoto, items en `items_json` (pull.php:132-182)
  - tbl_config_vendedores — UPDATE ultimo_pull_id, ultimo_pull_ventas (pull.php:189-193)
  - tbl_vendedores_movil — INSERT stub con password_hash placeholder (pull.php:242-259)
  - tblclientes — INSERT cliente nuevo (pull.php:379-400); UPDATE CodigoEmp en fusión (pull.php:329-330); UPDATE dinámico de ediciones (pull.php:524-528)
- **Efectos colaterales:** llamadas externas:
  - GET `{api_url}/sync/ventas/pendientes?after_id=&per_page=100&email=&token_api=` (pull.php:37)
  - GET `{api_url}/sync/vendedores/todos` (pull.php:213)
  - GET `{api_url}/sync/clientes/nuevos?per_page=100` (pull.php:280)
  - POST `{api_url}/sync/clientes/confirmar-mapeo` (pull.php:415)
  - GET `{api_url}/sync/clientes/ediciones-pendientes?per_page=200` (pull.php:459)
  - POST `{api_url}/sync/clientes/ediciones-confirmadas` (pull.php:540)
  - Sincronización: INSERT/UPDATE en tblclientes disparan `trg_sync_cliente_insert/update` → tbl_sync_outbox (actualizacion_completa.sql:2561-2568) si modulo_sync está aplicado.
  - **NO** toca stock ni kardex ni cartera, ni siquiera para FE móviles autorizadas (pull.php:77-122).
- **Transacción:** solo el bloque de ventas: beginTransaction pull.php:67, commit pull.php:195, rollBack pull.php:198. Vendedores, clientes nuevos y ediciones corren sin transacción y tragan excepciones (pull.php:263-265, 407-409, 427-429, 552-555).
- **Consecutivos:** CodigoClien = `COALESCE(MAX(CodigoClien),0)+1` sin bloqueo (pull.php:353). Cursor del pull = `MAX(id_venta)` del lote (pull.php:71-73).
- **Validaciones solo en frontend:** useAutoSyncVendedores sólo programa el pull si `habilitado === 1` y hay credenciales (useAutoSyncVendedores.ts:52-57); el backend repite el chequeo de `habilitado` y credenciales (pull.php:22-35).

### 3. Push completo al hub (catálogos)
- **Pantalla → endpoint:** VendedoresMovil.tsx:352 y ConfiguracionSistema.tsx:575 → push-all.php POST
- **Lee:** tbl_config_vendedores (push-all.php:95), tblcategoria (115-119), tblarticulos (Estado=1 AND Id_Etiqueta IN (2,3)) + tblcategoria (134-143), tblclientes (todas, columnas opcionales detectadas, 168-188), tbl_vendedores_movil activo=1 (211-216)
- **Escribe:**
  - tbl_vendedores_movil — UPDATE sincronizado=1 WHERE activo=1 (push-all.php:235)
  - tbl_config_vendedores — UPDATE fecha_mod (push-all.php:240)
- **Efectos colaterales:** POST en chunks de 200 (push-all.php:79) a `{api_url}/sync/categorias/batch` (124), `/sync/productos/batch` (157), `/sync/clientes/batch` (205), `/sync/vendedores/batch` (231). Envía `password_hash` bcrypt de los vendedores (push-all.php:224). **No envía los "modos"** aunque ConfiguracionSistema.tsx:515-516 dice que "se re-sincronizan en cada push-all".
- **Transacción:** no
- **Consecutivos:** n/a
- **Validaciones solo en frontend:** n/a

### 4. CRUD de vendedores
- **Pantalla → endpoint:** VendedoresMovil.tsx:214 → vendedores.php GET; VendedoresMovil.tsx:249 → GET `?action=empleados_disponibles`; VendedoresMovil.tsx:316 → POST `crear`/`editar`; VendedoresMovil.tsx:331 → POST `sincronizar`; VendedoresMovil.tsx:378 → POST `toggle_activo`
- **Lee:** tbl_vendedores_movil, tblempleados (vendedores.php:21-31, 43-50), tbl_config_vendedores (sincronizar, vendedores.php:143)
- **Escribe:** tbl_vendedores_movil — INSERT (vendedores.php:84-97), UPDATE (110-134), UPDATE sincronizado=1 (217), UPDATE activo=NOT activo (232)
- **Efectos colaterales:** `sincronizar` → POST `{api_url}/sync/vendedores/batch` con password_hash (vendedores.php:167-199).
- **Transacción:** no
- **Consecutivos:** `id` AUTO_INCREMENT (actualizacion_completa.sql:821); `codigo` lo digita el usuario, único por UNIQUE KEY (actualizacion_completa.sql:834).
- **Validaciones solo en frontend:** **cupo de vendedores activos** según entitlement CRM `vendedor_movil.cantidad` (VendedoresMovil.tsx:227-237, aplicado en 240, 264, 310, 376). vendedores.php `crear`/`toggle_activo` no valida cupo (vendedores.php:60-101, 230-235). Contraseña obligatoria en crear sí la repite el backend (vendedores.php:66).

### 5. Asignar clientes a vendedor
- **Pantalla → endpoint:** VendedoresMovil.tsx:163 → asignar-clientes.php GET; VendedoresMovil.tsx:187 → POST
- **Lee:** tbl_config_vendedores (asignar-clientes.php:20), tblclientes (57-61)
- **Escribe:** nada local (la fuente de verdad es el hub, asignar-clientes.php:10-11)
- **Efectos colaterales:** GET `{api_url}/sync/vendedor-clientes/asignados` (36-37); POST `{api_url}/sync/vendedor-clientes/asignar` (88).
- **Transacción:** no · **Consecutivos:** n/a · **Validaciones solo en frontend:** n/a

### 6. Código de vinculación (pairing) de la APK
- **Pantalla → endpoint:** VendedoresMovil.tsx:88 → **directo al hub** desde el renderer: POST `{api_url}/api/empresa/vincular` body `{codigo: api_token_empresa}`; VendedoresMovil.tsx:119 → IPC `empresas:renovarCodigoPairing` (main.js:267) que consulta CRM (`consultarEntitlements`, main.js:269) y hace POST `{api_url}/api/empresa/renovar-codigo` con **Bearer = JWT del CRM** cacheado en config.json (main.js:273-277).
- **Lee/Escribe BD:** nada.
- **Transacción:** no.

### 7. Facturar un pedido de campo (flujo real usado por la UI)
- **Pantalla → endpoint:** VendedoresPedidos.tsx:132-143 (botón visible sólo si `tipo==='pedido' && estado==='pendiente'`, VendedoresPedidos.tsx:282) guarda `pedido_para_venta_id` en localStorage → NuevaVenta.tsx:895 → pedidos.php GET `?cargar_venta=1&id=` → el usuario factura por el flujo normal de NuevaVenta (ventas/nueva.php o FE; ver ficha de ventas) → NuevaVenta.tsx:1360-1366 → pedidos.php POST `marcar_procesado` (fire-and-forget, `.catch(()=>{})`).
- **Lee:** tbl_pedidos_vendedor (pedidos.php:20), tblclientes (33-40), tblarticulos (99)
- **Escribe:**
  - tblclientes — INSERT cliente si no existe, **dentro de un GET** (pedidos.php:44-82)
  - tbl_pedidos_vendedor — UPDATE estado='procesado', convertido_factura_n (pedidos.php:424-425)
  - tblventas — UPDATE CodigoEmp WHERE Factura_N = factura_n (pedidos.php:441-443)
- **Efectos colaterales:** stock/kardex/caja/cartera los hace el endpoint de venta normal (fuera de este módulo). Triggers outbox por INSERT tblclientes y UPDATE tblventas.
- **Transacción:** no (ni cargar_venta ni marcar_procesado).
- **Consecutivos:** CodigoClien = `COALESCE(MAX(CodigoClien),130500)+1` sin bloqueo (pedidos.php:45) — base distinta a pull.php:353 (base 0).
- **Validaciones solo en frontend:** sólo se ofrece facturar pedidos `pendiente`; `marcar_procesado` en backend no verifica estado previo (pedidos.php:421-425). Para FE, (sin verificar) si el `factN` que NuevaVenta pasa a `marcar_procesado` corresponde a un `tblventas.Factura_N` (desde v4.6 la FE va sólo a electronic_documents según PROCESOS/memoria).

### 8. Convertir pedido directo a venta (`action=convertir`) — sin caller en la UI
- **Pantalla → endpoint:** ninguna. grep de `'convertir'` en `src/` no encuentra el action; `convertir()` de VendedoresPedidos.tsx:132 navega a NuevaVenta en vez de llamarlo.
- **Lee:** tbl_pedidos_vendedor (pedidos.php:289)
- **Escribe:**
  - tblventas — INSERT (pedidos.php:339-359), `CodigoCli = id_cliente_remoto` (id del hub), `CodigoEmp=1` fijo (pedidos.php:344)
  - tbldetalle_venta — INSERT con `PrecioC = 0` (pedidos.php:371-383)
  - tblarticulos — UPDATE Existencia = Existencia - cantidad (pedidos.php:386-387)
  - tbl_pedidos_vendedor — UPDATE estado='procesado' (pedidos.php:391-395)
- **Efectos colaterales:** stock sí; **kardex NO**; no revisa `Servicio='S'`; no inserta tblpagos ni caja; triggers outbox (venta, articulo).
- **Transacción:** sí — beginTransaction pedidos.php:310, commit 397, rollBack 407.
- **Consecutivos:** Factura_N = AUTO_INCREMENT de tblventas (`lastInsertId`, pedidos.php:360).
- **Validaciones solo en frontend:** n/a (no hay frontend).

### 9. Anular pedido de campo
- **Pantalla → endpoint:** VendedoresPedidos.tsx:147-152 → pedidos.php POST `anular`
- **Lee:** —
- **Escribe:** tbl_pedidos_vendedor — UPDATE estado='anulado' (pedidos.php:415)
- **Efectos colaterales:** ninguno; no avisa al hub.
- **Transacción:** no
- **Validaciones solo en frontend:** botón sólo para `pendiente` (VendedoresPedidos.tsx:282); backend anula cualquier estado, incluso `procesado` (pedidos.php:413-418).

### 10. Listar pedidos + FE móviles + cuadre por vendedor
- **Pantalla → endpoint:** VendedoresPedidos.tsx:114 → pedidos.php GET (filtros estado/vendedor/fechas); VendedoresPedidos.tsx:161 → GET `?id=`; VendedoresPedidos.tsx:94 → vendedores.php GET
- **Lee:** tbl_pedidos_vendedor (pedidos.php:171-176), electronic_documents `origen='movil'` + tblclientes (198-223)
- **Escribe:** nada. Resumen por vendedor calculado en PHP (pedidos.php:242-270).

### 11. Cargues del día (pull, aprobar, rechazar, cuadrar)
- **Pantalla → endpoint:** CarguesVendedor.tsx:100 → list.php; :120 → pull-from-hub.php; :137 → detalle.php; :153 → aprobar.php; :170 → rechazar.php; :186 → cuadrar.php
- **Lee:** tbl_cargues_vendedor, tbl_cargues_vendedor_detalle, tbl_vendedores_movil, tblarticulos (sólo nombre/Existencia en detalle.php:40-47), tbl_config_vendedores
- **Escribe:**
  - pull-from-hub: tbl_cargues_vendedor INSERT/UPDATE por id_cargue_hub (pull-from-hub.php:89-142); tbl_cargues_vendedor_detalle DELETE + INSERT (145-166)
  - aprobar: tbl_cargues_vendedor UPDATE estado='aprobado' (aprobar.php:80-88)
  - rechazar: tbl_cargues_vendedor UPDATE estado='rechazado' (rechazar.php:80-86)
  - cuadrar: tbl_cargues_vendedor UPDATE notas_admin (concatena `[CUADRE ADMIN]`) (cuadrar.php:40-47)
- **Efectos colaterales:** externos — POST `{api_url}/sync/cargues/pendientes-desktop` (pull-from-hub.php:39; según comentario el hub marca los cargues como sincronizados al devolverlos, pull-from-hub.php:9); POST `/sync/cargues/aprobar` (aprobar.php:57); POST `/sync/cargues/rechazar` (rechazar.php:58). **Ningún endpoint de cargues toca tblarticulos.Existencia ni tblkardex**, aunque modulo_vendedores_movil.sql:84-85 documenta "Admin lo aprueba desde Desktop → descuenta stock + kardex".
- **Transacción:** pull-from-hub sí (beginTransaction :67, commit :170, rollBack :172). aprobar/rechazar: no; llaman al hub primero y luego UPDATE local (aprobar.php:44-88).
- **Consecutivos:** `id` AUTO_INCREMENT (modulo_vendedores_movil.sql:98).
- **Validaciones solo en frontend:** nota obligatoria en cuadre (CarguesVendedor.tsx:183) — cuadrar.php acepta vacío (cuadrar.php:18, sin check). `aprobado_por` nunca lo envía el frontend (CarguesVendedor.tsx:155) → queda NULL (aprobar.php:18). Motivo de rechazo sí lo repite el backend (rechazar.php:22-26).

### 12. SincroWorker (Electron main → SaaS conta-basic, NO hub de vendedores)
- **Arranque:** `app.whenReady` → tras `createWindow()` (main.js:1888) → `sincroWorker.iniciar(mainWindow, readConfig, consultarEntitlements)` (main.js:1904-1905). Registra IPC `sync:estado`, `sync:forzar`, `sync:backfill` (main.js:1906-1918).
- **Intervalo:** ciclo inmediato + `setInterval` cada 30 s (`POLL_MS`, sincroWorker.js:31, 626-627). Reentrada evitada con flag `corriendo` (sincroWorker.js:403).
- **Gate:** en cada ciclo llama `getEntitlements()` = `consultarEntitlements` (main.js:92) → HTTP GET al CRM `https://crm.innovacion-digital.com/api/public/api/v1/suscripcion-token/{token}` (main.js:46, 106), con cache/gracia de 7 días (main.js:130-139). Sólo continúa si `_force_sync_activo` o módulos `plataforma_web`/`sincronizacion` activos (sincroWorker.js:412-422). No se ve guard de modo dev en `consultarEntitlements` ni en el bloque de arranque (main.js:92-140, 1900-1920).
- **Config BD:** `config.json` db_* → `userData/backend-config.json` (mysql; si `driver==='sqlite'` lanza error "Sincronización online no disponible") → parseo regex de `{backendPath}/api/config/database.php` (sincroWorker.js:56-126).
- **Config SaaS:** env `SAAS_SYNC_*` → `config.json` `sync_url/sync_email/sync_token_api` → fallback `tbldatosempresa.email, api_token` (sincroWorker.js:128-135, 432-445).
- **Lee:** information_schema.TABLES (existencia outbox, 453-462), tbl_sync_outbox (Enviado=0, Intentos<10, Prox_Reintento<=NOW(), LIMIT 50, 464-473), fila completa de la entidad (`SELECT *` en tblclientes/tblarticulos/tblproveedores/tblventas/tblpagos/tblpedidos/tblegresos, 300-303), tbldetalle_venta (313-317), tbldetalle_pedido (331-335), tbldatosempresa (434-436)
- **Escribe:**
  - tbl_sync_outbox — UPDATE Enviado=1 / Intentos / Prox_Reintento / Ultimo_Error (491-594); INSERT masivo en backfill (670-722)
  - tbl_sync_estado — UPDATE Id=1 (601-609)
- **Efectos colaterales:** POST `{sync_url}/{clientes|productos|proveedores|ventas|pagos|compras|gastos}/batch` con `{email, token_api, items}` en body (sincroWorker.js:42-50, 527-532); `idempotency_key = sha256(entidad|email|pk|fecha_mod)` (155-158). Envía estado al renderer por `sync:estado` (614).
- **Transacción:** no.
- **Backoff:** `min(10·2^intentos, 600)` s, máx 10 intentos (sincroWorker.js:33-35, 559, 574, 588).

## Dependencias
- **Usa de otros módulos:**
  - `api/config/database.php` (todos los endpoints).
  - `api/config/helpers_polyfill.php` → `conta_tiene_columna`, `conta_tiene_tabla` (portables MySQL/SQLite, helpers_polyfill.php:25-37) — usados en pedidos.php:10,57 y push-all.php:19,28-29,210.
  - Tablas núcleo: tblclientes, tblarticulos, tblcategoria, tblempleados, tblventas, tbldetalle_venta, electronic_documents.
  - Flujo de venta de NuevaVenta (ventas/nueva.php / facturacion-electronica) para facturar pedidos.
  - Electron main: `consultarEntitlements` (main.js:92), `readConfig`, IPC `empresas:renovarCodigoPairing` (main.js:267).
- **Lo usan otros módulos:**
  - `api/informes/vendedores.php` lee tbl_vendedores_movil (informes/vendedores.php:32), tbl_pedidos_vendedor (:49, :149) y JOIN `p.convertido_factura_n = v.Factura_N` (:70, :161).
  - `api/ventas/listar.php` LEFT JOIN tbl_pedidos_vendedor / tbl_vendedores_movil (ventas/listar.php:31-32).
  - `useVendedoresConfig` → badge en menú (Dashboard.tsx:785), PantallaInicio.tsx:21, ClienteDetalle.tsx:33.
  - Triggers `trg_sync_*` (outbox) se disparan desde CUALQUIER módulo que inserte/actualice tblventas, tblclientes, tblproveedores, tblpagos, tblpedidos, tblegresos, tblarticulos.
- **Triggers / vistas de BD involucrados:**
  - 14 triggers `trg_sync_{venta,cliente,proveedor,pago,compra,gasto,articulo}_{insert,update}` → INSERT en tbl_sync_outbox (modulo_sync.sql:55-129; replicados en actualizacion_completa.sql:2550-2625). El update de venta/pago/gasto marca `Operacion='anular'` si Estado/EstadoFact='Anulada' (modulo_sync.sql:63, 96, 118), pero el worker no usa `Operacion` (sólo la selecciona, sincroWorker.js:465).
  - Ubicación de DDL: tbl_config_vendedores, tbl_vendedores_movil, tbl_pedidos_vendedor + columnas `origen/id_vendedor_remoto/nombre_vendedor` de electronic_documents → actualizacion_completa.sql:794-868. tbl_sync_outbox / tbl_sync_estado → actualizacion_completa.sql:2512-2538. **tbl_cargues_vendedor(_detalle) y columnas GPS de tblclientes sólo en modulo_vendedores_movil.sql** (91-138, 29-55); 0 apariciones de `tbl_cargues` en actualizacion_completa.sql, schema_sqlite_cliente.sql y conta_template_limpio.sql.
- **Compatibilidad:**
  - SQLite: schema_sqlite_cliente.sql tiene tbl_config_vendedores (346-357) **sin** columnas `modo_*` → config.php `guardar` (config.php:42-44) fallará en embedded. Tiene tbl_pedidos_vendedor (369), tbl_vendedores_movil (399) y GPS en tblclientes (728-731). No tiene tbl_cargues_vendedor ni tbl_sync_outbox. migraciones_sqlite.sql no menciona ninguna de estas tablas.
  - MySQL-only: `DATE_SUB(CURRENT_DATE, INTERVAL 30 DAY)` en list.php:70; `CONCAT` en vendedores.php:23,46 y pedidos.php:200 (SQLite <3.44 no tiene CONCAT → (sin verificar) versión SQLite empaquetada); sincroWorker usa `mysql2` + `information_schema` + `DATE_ADD` y rechaza explícitamente SQLite (sincroWorker.js:88-89).
  - No usan db_factory (cumple regla de memoria).

## Qué se rompe si lo tocas
- Si cambias el significado de `tbl_pedidos_vendedor.convertido_factura_n` o `id_vendedor_remoto`, se rompen el informe Ranking de Vendedores (informes/vendedores.php:70,161) y el listado de ventas (ventas/listar.php:31-32), que hacen JOIN por esos campos.
- Si cambias `tbl_vendedores_movil.id_remoto` (= tblempleados.CodigoEmp), se rompe la propagación de vendedor a `tblventas.CodigoEmp` (pedidos.php:433-443), la asignación de CodigoEmp a clientes creados en móvil (pull.php:321-330, 344-349) y `empleados_disponibles` (vendedores.php:27-29).
- Si cambias `tbl_vendedores_movil.codigo`, pull-from-hub ignora los cargues de ese vendedor (pull-from-hub.php:74-79) y pull.php deja de mapear CodigoEmp (pull.php:321).
- Si cambias el `id` local de un vendedor, el hub pierde la ancla `id_vendedor_conta` del upsert (push-all.php:218-220, vendedores.php:170).
- Si agregas/renombras columnas de tblclientes usadas por el mapeo de ediciones (pull.php:445-456) o el INSERT de cliente nuevo (pull.php:380-383), las ediciones se ignoran o el INSERT falla en silencio (excepción tragada, pull.php:407-409) y el cliente se reintenta en cada pull.
- Si cambias el NOT NULL/defaults de tblclientes (Whatsapp NOT NULL, pull.php:377-378, 391; columnas vacías forzadas en pedidos.php:67-77), ambos INSERT pueden fallar.
- Cualquier INSERT/UPDATE nuevo sobre las 7 tablas con trigger `trg_sync_*` genera filas en tbl_sync_outbox (modulo_sync.sql:55-129); cambios de PK en esas tablas rompen `armarItem` (sincroWorker.js:43-49, 300-303).
- Si cambias el nombre de columnas `FechaMod/Fecha_Mod/updated_at`, cambia el idempotency_key (sincroWorker.js:307, 351) → el SaaS recibe "nuevas" versiones.
- Si cambias el JSON de respuesta de pull.php (`pedidos_nuevos`, `fe_nuevas`, `clientes_nuevos_creados`, `ediciones_clientes_aplicadas`), el toast del auto-sync deja de reportar (useAutoSyncVendedores.ts:31-34).
- Si cambias el shape de `cargar_venta` (cliente con alias `Nombre_Cliente`, `Telefono`, `Cupo`; items), NuevaVenta deja de precargar (NuevaVenta.tsx:924-933; pedidos.php:31, 119-129).
- Si `habilitado` llega como string `"1"` y no int, `useVendedoresConfig.habilitado` y el auto-sync quedan apagados por comparación estricta (useVendedoresConfig.ts:96; useAutoSyncVendedores.ts:52) — ver Sospecha.

## Evaluación de la implementación

### Confirmado (leído en código)
1. **`action=convertir` viola doble escritura y otras reglas:** descuenta `Existencia` sin `INSERT INTO tblkardex` (pedidos.php:385-387), no filtra `Servicio='S'`, graba `PrecioC=0` (pedidos.php:374) y `CodigoEmp=1` fijo (pedidos.php:344), usa `CodigoCli = id_cliente_remoto` (id del hub, pedidos.php:348) y asume IVA 19% si falta (pedidos.php:321, 368). Mitigante: la UI ya no lo llama (VendedoresPedidos.tsx:132-143 navega a NuevaVenta). Es código muerto pero expuesto.
2. **FE emitidas desde la APK no mueven inventario en el desktop:** pull.php inserta sólo la cabecera en electronic_documents con `origen='movil'` (pull.php:105-120); no hay detalle, ni `UPDATE tblarticulos`, ni kardex, ni cartera. Contradice PROCESOS_SISTEMA.md:87-89 (FE debe bajar Existencia + kardex C_D=2). Tampoco llena `prefix`/`number`, que el listado usa para `numero_pedido` (pedidos.php:200).
3. **Cargues aprobados no descuentan stock ni kardex** (aprobar.php:79-88) pese a que modulo_vendedores_movil.sql:84-85 lo promete. tblarticulos sólo se lee (detalle.php:43).
4. **aprobar/rechazar no son atómicos con el hub:** llaman primero al hub y luego hacen UPDATE local sin transacción (aprobar.php:44-88, rechazar.php:46-86). Si el UPDATE falla, hub y desktop quedan en estados distintos y el desktop no permite reintentar si el hub ya cambió (sin verificar comportamiento del hub ante doble aprobación).
5. **pull-from-hub puede perder cargues:** el hub los marca como sincronizados al devolverlos (pull-from-hub.php:9), pero el desktop ignora los de vendedor no mapeado (pull-from-hub.php:75-79) y si la transacción hace rollback (172) no hay forma de volver a pedirlos.
6. **Tablas de cargues fuera del consolidado:** `tbl_cargues_vendedor(_detalle)` y las columnas GPS sólo existen si se aplicó modulo_vendedores_movil.sql (coincide con la regla de memoria "módulo móvil separado"). Si no se aplicó, CarguesVendedor.tsx falla con error SQL y pull.php no puede crear clientes nuevos (INSERT con latitud…, pull.php:380-383) — el error se traga y se reintenta indefinidamente (pull.php:407-409).
7. **SQLite embedded:** tbl_config_vendedores sin `modo_*` (schema_sqlite_cliente.sql:346-357) → `guardar` revienta (config.php:42-44); list.php usa `DATE_SUB` (list.php:70).
8. **Consecutivos de clientes con MAX+1 sin bloqueo y con bases distintas:** pull.php:353 (base 0) vs pedidos.php:45 (base 130500). Carreras posibles entre auto-sync y un usuario creando clientes.
9. **Escritura en un GET:** `pedidos.php?cargar_venta=1` crea clientes (pedidos.php:44-82). Abrir el pedido dos veces con nombre que no matchea por NIT y LIKE puede crear clientes duplicados (búsqueda por `Razon_Social LIKE %nombre%`, pedidos.php:37-40).
10. **Anular sin control de estado:** pedidos.php:413-418 anula incluso pedidos `procesado`; el frontend lo oculta (VendedoresPedidos.tsx:282). `marcar_procesado` tampoco verifica estado (pedidos.php:424) y es fire-and-forget (NuevaVenta.tsx:1365): si falla, el pedido queda `pendiente` y puede facturarse dos veces.
11. **Cupo de vendedores sólo en frontend** (VendedoresMovil.tsx:227-237); vendedores.php crear/toggle no lo valida.
12. **Seguridad del canal:** token en query string (pull.php:37, asignar-clientes.php:36-37) y TLS sin verificar en todas las cURL (p.ej. push-all.php:53-54); los `password_hash` bcrypt salen del local hacia el hub (push-all.php:224, vendedores.php:174).
13. **push-all marca sincronizado=1 aunque el hub reporte `errores`** por registro: sólo mira `fallas_http` (push-all.php:234); `errores_lumen` se cuenta pero no se usa (push-all.php:89).
14. **Comentario engañoso sobre modos:** ConfiguracionSistema.tsx:515-516 dice que push-all re-sincroniza los modos; push-all.php sólo envía categorías, productos, clientes y vendedores (push-all.php:113-237).
15. **SincroWorker – outbox crece sin límite:** los triggers encolan aunque el entitlement esté apagado (comentario actualizacion_completa.sql:2493-2494) y cada UPDATE de tblarticulos (cada venta/compra) encola una fila (modulo_sync.sql:126-129). No existe ningún `DELETE`/purga de tbl_sync_outbox en backend ni electron (grep sin resultados).
16. **SincroWorker – filas muertas cuentan como pendientes:** al llegar a 10 intentos dejan de procesarse (sincroWorker.js:468) pero siguen en `COUNT(*) WHERE Enviado=0` (sincroWorker.js:475-478) → el badge muestra pendientes para siempre (Dashboard.tsx:1164-1167).
17. **SincroWorker – `es_servicio` siempre false:** `row.Servicio === 1` (sincroWorker.js:208), pero el valor de servicio es `'S'` (PROCESOS_SISTEMA.md:20).
18. **SincroWorker – llamada al CRM cada 30 s** (consultarEntitlements en cada ciclo, sincroWorker.js:414; main.js:106) sin guard de modo dev visible, contrario a la regla de memoria "en dev nada debe llamar servicios externos".
19. **Pull incremental por `after_id`:** una venta ya bajada (id ≤ `ultimo_pull_id`) que cambie luego en el hub (p.ej. anulada) no se vuelve a bajar (pull.php:37, 71-73, 189-193) salvo que el hub la reexponga (sin verificar).

### Sospecha
- `habilitado === 1` estricto (useVendedoresConfig.ts:96, useAutoSyncVendedores.ts:52): si el driver PDO devuelve strings (`"1"`), el módulo aparece apagado y el auto-sync nunca arranca. Depende de la versión de PHP/mysqlnd y de `ATTR_EMULATE_PREPARES` en database.php (sin verificar).
- Para facturas FE creadas desde un pedido, `marcar_procesado` hace `UPDATE tblventas SET CodigoEmp WHERE Factura_N = factN` (pedidos.php:442); si `factN` es un número de FE y no un Factura_N, puede actualizar una venta POS ajena (sin verificar qué devuelve el flujo FE de NuevaVenta).
- `id_vendedor_remoto` se llena con `id_vendedor_conta ?? id_vendedor_mobile` (pull.php:99, 117, 145, 171): si el hub no manda `id_vendedor_conta`, se mezclan ids de Lumen con ids locales y los JOIN de informes/listar (`vm.id = p.id_vendedor_remoto`) atribuyen ventas al vendedor equivocado.
- pull.php puede tardar mucho (hasta 6 llamadas cURL de 30 s, sin transacción global) y el auto-sync lo dispara en segundo plano mientras el usuario trabaja; con PHP builtin de un solo hilo (modo embedded) podría bloquear otras peticiones (sin verificar modelo de concurrencia del PHP embebido).

### Contraste con PROCESOS_SISTEMA.md
| Regla | Estado en este módulo |
|---|---|
| 1. Existencia + tblkardex en el mismo endpoint (PROCESOS_SISTEMA.md:17-18) | **Viola** en `convertir` (pedidos.php:386 sin kardex). FE móviles (pull.php) y aprobación de cargues (aprobar.php) ni siquiera mueven Existencia. El flujo real de pedidos → NuevaVenta delega en el endpoint de venta (cumple según su propia ficha). |
| 2. Servicio='S' no mueve stock (PROCESOS_SISTEMA.md:20-21) | **Viola** en `convertir` (no consulta Servicio, pedidos.php:363-388). SincroWorker reporta `es_servicio` mal (sincroWorker.js:208). |
| 3. Kardex inmutable (PROCESOS_SISTEMA.md:22) | No aplica: el módulo no escribe kardex. Los únicos DELETE son de `tbl_cargues_vendedor_detalle` (pull-from-hub.php:145), que es espejo del hub, no libro contable. |
| FE debe bajar stock + kardex (PROCESOS_SISTEMA.md:87-89) | **Viola** para FE emitidas en la APK (pull.php:105-120). |
