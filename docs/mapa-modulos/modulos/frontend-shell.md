# Frontend shell (arranque, gates, login, navegación del Dashboard y hooks globales)

**Propósito:** Es el "esqueleto" de la app de escritorio: decide a qué servidor PHP se habla, bloquea la app si no hay servidor configurado o suscripción válida, autentica al usuario, arma el menú lateral según rol/permisos/módulos y mantiene vivos los procesos de fondo (notificaciones, respaldo diario, hotfixes de BD, sync con vendedores móviles, estado de sincronización y backup en nube).

**Pantallas (frontend):** (rutas relativas a `Dashboard-Facturación/src`)
- `main.tsx` — punto de entrada (cargado por `index.html` → `/src/main.tsx`).
- `App.tsx` — árbol de providers y gates.
- `components/ConfigurarServidor.tsx` — gate de primer arranque (sin URL de API).
- `components/SubscriptionGate.tsx` — gate de suscripción (IPC).
- `components/TrialBanner.tsx` (+ `components/ActivarLicenciaModal.tsx`) — banner de ciclo comercial.
- `components/AutoUpdater.tsx` — toasts de electron-updater (sin UI propia).
- `components/LoginPage.tsx` + `contexts/AuthContext.tsx` — login/logout.
- `components/Dashboard.tsx` — sidebar, topbar, tabs, Ctrl+K, F2, modales Cambiar Contraseña y Sincronizar histórico.
- `components/ConfigServidor.tsx` — vista "Configuración → Servidor" (lazy, Dashboard.tsx:93, 1657).
- `components/PantallaInicio.tsx` / `components/DashboardVendedor.tsx` / `components/NotificacionEmergente.tsx` — sólo en cuanto el shell decide mostrarlos.
- `config/api.ts`, `services/api.ts`, `hooks/*.ts`.

**Endpoints (backend):** (todos bajo `conta-app-backend/api/`; los hardcodeados `http://localhost:80/conta-app-backend/api/...` se reescriben por el interceptor, ver §config/api.ts)
| Endpoint | Método / action | Quién lo llama |
|---|---|---|
| `auth/login.php` | POST `{username,password}` | AuthContext.tsx:51; `testConnection` config/api.ts:236 (POST con credenciales vacías, timeout 5 s) |
| `actualizacion/aplicar-sql.php` | POST `{version}` | AuthContext.tsx:75 (en cada login exitoso, fire-and-forget) |
| `migraciones/aplicar.php` | POST `{id,sha256,sql}` | hooks/useAutoHotfixes.ts:70 |
| `backup/` (`backup/index.php`) | GET `?estado`; POST `{action:'generar'}` | Dashboard.tsx:565, 569 |
| `empresa/datos.php` | GET | Dashboard.tsx:552 |
| `modulos/estado.php` | GET | hooks/useModulos.ts:25 |
| `lotes/index.php` | GET `?por_vencer=1` | hooks/useNotificaciones.ts:44 |
| `familias/stock-bajo.php` | GET | hooks/useNotificaciones.ts:45; hooks/useStockBajoCount.ts:13 |
| `clientes/cumpleanos.php` | GET (sin params) / GET `?rango=7` | hooks/useNotificaciones.ts:46 / hooks/useCumpleanosHoy.ts:10 |
| `vendedores/config.php` | GET; POST `action=guardar|probar|pull_ahora` | hooks/useVendedoresConfig.ts:25, 41, 59, 74; hooks/useAutoSyncVendedores.ts:48 |
| `vendedores/pull.php` | GET | hooks/useAutoSyncVendedores.ts:26 |
| `inicio/sugerencias.php` | GET | NotificacionEmergente.tsx:134 (montado por Dashboard.tsx:1381) |
| `caja/sesion.php` | GET `?usuario={id}` | App.tsx:39 (al intentar cerrar la ventana) |
| `usuarios/listar.php` | POST `action=cambiar-pass` | Dashboard.tsx:1700 |
| `ventas/listar.php` | GET `?anio&mes&estado=Valida` | DashboardVendedor.tsx:28 (sólo vendedor en "Panel de Ingresos") |
| Externo `https://innovacion-digital.com/hotfixes-contaft/index.json` | GET | useAutoHotfixes.ts:31, 95 |
| Externo `fix.url` (URL que venga en el index) | GET | useAutoHotfixes.ts:66 |

**Canales IPC que usa el shell** (no hay `window.electronAPI` en el alcance; todo es `window.require('electron').ipcRenderer`, posible porque la ventana tiene `nodeIntegration: true, contextIsolation: false` — electron/main.js:1360-1361):
- `config:read` (config/api.ts:100, 198), `config:write` (api.ts:65, 211), `config:getPath` (api.ts:225).
- `subscription:check` (SubscriptionGate.tsx:62, 117), `subscription:setOfflineCode` (:84), `subscription:setApiToken` (:110), `subscription:getVencimiento` (TrialBanner.tsx:42).
- `pago:planActual`, `pago:planes` (ActivarLicenciaModal.tsx:44-45), `pago:crearLinkWompi` (:77).
- `updater:install` (AutoUpdater.tsx:34), `updater:check` (Dashboard.tsx:952); escucha `updater:available`, `updater:downloaded`, `subscription:status` (AutoUpdater.tsx:73-75).
- `entitlements:get` (useEntitlements.ts:78).
- `sync:estado` invoke + evento push (useSincronizacion.ts:49, 58), `sync:forzar` (:71), `sync:backfill` (:81).
- `backup-cloud:estado` (Dashboard.tsx:605).
- `print:silent` (Dashboard.tsx:537, tecla F2 abre cajón).
- Cierre: escucha `app:intento-cierre`, envía `app:cierre-cancelado` / `app:cerrar-confirmado` (App.tsx:49, 55, 58).

---

## config/api.ts — resolución de URL y monkey-patch

**Constantes/estado:**
- `LS_KEY = 'api_server_url'` (api.ts:9) — sólo navegador.
- `DEFAULT_URL = import.meta.env.VITE_API_URL || 'http://localhost:80/conta-app-backend/api'` (api.ts:10). `.env` define `VITE_API_URL=http://localhost:80/conta-app-backend/api` (Dashboard-Facturación/.env).
- `HARDCODED_BASE = 'http://localhost:80/conta-app-backend/api'` (api.ts:14).
- `isElectron = !!window.require` (api.ts:17); `_ipcRenderer` se obtiene al importar el módulo (api.ts:20-24).
- Caché en memoria `_cachedUrl`, `_configLoaded` (api.ts:28-29). No exporta constantes; exporta funciones: `getApiUrl`, `setApiUrl`, `isApiConfigured`, `isConfigLoaded`, `loadConfigFromFile`, `installFetchInterceptor`, `readFullConfig`, `writeConfig`, `getConfigFilePath`, `testConnection`.

**Resolución de la URL:**
| Modo | Fuente | Código |
|---|---|---|
| Electron embebido (PHP built-in, puerto dinámico) | `config.apiUrlRuntime` vía IPC `config:read` (prioridad) | api.ts:104-105 |
| Electron servidor/legacy (Apache) | `config.apiUrl` vía IPC `config:read` | api.ts:106-107 |
| Electron sin config | `_cachedUrl=null` → `getApiUrl()` devuelve `DEFAULT_URL`; `isApiConfigured()` = false → gate ConfigurarServidor | api.ts:52, 80 |
| Navegador | `localStorage['api_server_url']`, si no `DEFAULT_URL` | api.ts:44-52, 81 |
| Dev (`import.meta.env.DEV`) | igual que arriba, pero App.tsx salta el gate de servidor (App.tsx:63, 85) y los hotfixes (App.tsx:70) | |

- En Electron **no** se usa localStorage para la URL (comentario api.ts:36-38). `setApiUrl` escribe sólo `{apiUrl}` en config.json vía `config:write` (api.ts:63-65) — nunca toca `apiUrlRuntime`.
- `writeConfig` en navegador cae a `localStorage['config_<k>']` (api.ts:215).

**Interceptor (`installFetchInterceptor`, api.ts:142-190)**, instalado en main.tsx:9 antes de `createRoot`:
- Parchea `window.fetch` (string / URL / Request), `XMLHttpRequest.prototype.open` y `window.open`.
- **Único efecto: reescritura de URL** (`rewriteUrl`, api.ts:121-132): si la URL empieza por `http://localhost:80/conta-app-backend/api` o `http://localhost/conta-app-backend/api`, sustituye ese prefijo por `getApiUrl()`. Otras URLs (externas, `127.0.0.1`, otros puertos) pasan intactas.
- **No inyecta** headers, usuario, token, ni maneja errores/reintentos. Es idempotente (`_fetchInterceptorInstalled`, api.ts:143-144).
- `getApiUrl()` se evalúa en cada llamada, así que antes de `loadConfigFromFile` reescribe a `DEFAULT_URL` (por eso App.tsx bloquea el render, App.tsx:72-74).

**services/api.ts (axios):** `baseURL` recalculado con `getApiUrl()` en cada request (services/api.ts:14-17); añade `Authorization: Bearer <localStorage.token>` (:22-24); en 401 borra `localStorage.token/user` y hace `window.location.href='/login'` (:37-41). Lo importan AuditoriaInventario, DiagnosticoInventario, EditarArticuloModal, IncomeOverview, InventarioManagement, Kardex, ProductsManagement y AuthContext (grep).

---

## App.tsx / gates / AuthContext

**Árbol de render** (App.tsx:104-121, 89-101):
```
AuthProvider
 ├─ ConfirmDialogProvider
 │   └─ AppContent
 │       ├─ [loading || !configLoaded] → spinner "Cargando..."            (App.tsx:74-83)
 │       ├─ [!isDev && !serverConfigured] → <ConfigurarServidor/>          (App.tsx:85-87)
 │       └─ <SubscriptionGate>                                             (App.tsx:90)
 │            ├─ [loading] splash "Verificando suscripción..."             (SubscriptionGate.tsx:135-209)
 │            ├─ [!allowed] pantalla bloqueo + token/código offline        (:213-335)
 │            └─ [allowed] <div> AutoUpdater, TrialBanner,
 │                         !isAuthenticated ? <LoginPage/> : <Dashboard onLogout user/>   (App.tsx:92-98)
 └─ <Toaster/> (zIndex 100000)                                             (App.tsx:110-119)
```
- `useAutoHotfixes(isDev)` se registra en AppContent **antes** de cualquier gate (App.tsx:70): corre aunque no haya login ni suscripción válida.
- Handler de cierre (App.tsx:31-60): al recibir `app:intento-cierre`, si hay usuario consulta `caja/sesion.php?usuario=<id>`; si `abierta` pide confirmación; error de red → cierra igual.
- ConfigurarServidor: `testConnection` (POST login vacío) y `setApiUrl` + `window.location.reload()` (ConfigurarServidor.tsx:30-38, App.tsx:86). "Usar local" fija `http://localhost:80/conta-app-backend/api` (ConfigurarServidor.tsx:36).
- SubscriptionGate: sin IPC → `allowed:true, source:'dev'` (SubscriptionGate.tsx:56-59). Token: valida ≥32 alfanuméricos en front (:103-104), `subscription:setApiToken` y luego `subscription:check` (:110-117). Botón token sólo para reasons `token-vacio|token-invalido|no-api-url|backend-inaccesible|sin-plan` (:250).
- TrialBanner (`useLicenciaEstado`): `subscription:getVencimiento` al montar, cada 12 h y en `window.focus` (TrialBanner.tsx:39-52); snooze 24 h en localStorage sólo si no está en rojo (:112-122, 146); re-chequeo de snooze cada 5 min (:131-134).

**AuthContext:**
- Estado: `user` (id, username, nombre, tipoUsuario; en la práctica también `permisos`, ver auth/login.php:94-100), `loading`, `isAuthenticated = !!user` (AuthContext.tsx:35-36, 116).
- Hidratación: `sessionStorage['user']` (AuthContext.tsx:39-43). → sobrevive a `reload` pero **no** a reinicio de la app.
- `login()`: codifica password (`utils/passwordEncoder`), POST `${VITE_API_URL||localhost}/auth/login.php` (AuthContext.tsx:48-55) — no usa `getApiUrl()`, depende del interceptor. Guarda `sessionStorage.token` y `sessionStorage.user` (:63-64). Luego `import('../../package.json')` y POST `actualizacion/aplicar-sql.php {version}` sin await (:72-94); toast si `aplicado && statements_ok>0`.
- `logout()`: borra `sessionStorage.token/user` y `setUser(null)` (:105-109). No llama backend.
- Backend login: compara password codificada (auth/login.php:59), genera `token = bin2hex(random_bytes(32))` (:60-61) **que no se persiste** (sólo SELECT a tblusuarios/tbltiposusuario en el archivo); permisos desde `tbltiposusuario.permisos` con fallback admin/no-admin (:77-87).

---

## Dashboard.tsx — navegación

Mecánica: `abrirEnTab(view)` (Dashboard.tsx:369-401). Todas las 61 `View` (tipo en :150) están en `TAB_SUPPORTED_VIEWS` (:181-212) → siempre se abren como pestaña singleton (`MULTI_INSTANCE_VIEWS` vacío, :220). El render es `tabs.map(...)` con `display` según `activeTabId` (:1590-1663); **no existe ya un "switch viejo"**: si se llamara con una view no soportada, `activeTabId=null` y no se renderiza nada (:370-373). Pestaña inicial `inicio` no cerrable (:359-362).

**Variables de gating** (Dashboard.tsx):
- `esAdmin = tipoUsuario == 1`, `esVendedor = tipoUsuario == 2` (:591-592).
- `tiene(p) = esAdmin || user.permisos.includes(p)` (:818-819); mapa `menuPermisos` (:822-844). Admin ve todo sin filtro (:858).
- `vendedorMovilOK` = mientras carga entitlements usa `vendedores/config.php.habilitado`, luego `entitlements.vendedor_movil.activo` (:614-616).
- `financiacionesHabilitado` / `anticiposHabilitado` = `localStorage.config_sistema.usarFinanciaciones/usarAnticipos` (:644-645).
- `esFabricacion()` = `config_sistema.tipoNegocio` contiene `fabricaci|taller|confec` (ConfiguracionSistema.tsx:150-153).
- `esModuloActivo('nomina')` de useModulos → `tbl_modulos_activos` (:594, 763).

**Tabla completa menú → componente → gating** (render en Dashboard.tsx:1595-1661; menú en :651-815):
| Menú (id) | View | Componente | Gating de visibilidad en menú (Dashboard.tsx) |
|---|---|---|---|
| Inicio (`inicio`) | `inicio` | `PantallaInicio` (:1595) | ninguno |
| Panel de Ingresos (`overview`) | `overview` | `esVendedor ? DashboardVendedor : IncomeOverview` (:1596) | perm `dashboard_completo` (:823) |
| Inventario › Listado (`inventario-list`) | `inventario` | `InventarioManagement` (:1608) | perm `inventario` (:824) |
| Inventario › Bodegas (`inventario-bodegas`) | `bodegas` | `BodegasManagement` (:1621) | `inventario` (:829) |
| Inventario › Etiquetas | `config-etiquetas` | `ConfigEtiquetas` (:1620) | `inventario` (:828) |
| Inventario › Categorías | `categorias` | `CategoriasManagement` (:1612) | `categorias` (:824) |
| Inventario › Familias | `familias` | `FamiliasProducto` (:1614) | `inventario` (:827) |
| Inventario › Distribuir | `distribuir` | `DistribuirProductos` (:1615) | `inventario` |
| Inventario › Stock Bajo (badge `useStockBajoCount`) | `stock-bajo` | `StockBajo` (:1616) | `inventario` |
| Inventario › Diagnóstico 30 d | `diagnostico` | `DiagnosticoInventario` (:1610) | `inventario_diagnostico` (:825) |
| Inventario › Auditoría 90 d | `auditoria` | `AuditoriaInventario` (:1611) | `inventario_diagnostico` |
| Inventario › Conteo | `conteo` | `ConteoInventario` (:1613) | `inventario_conteo` (:826) |
| Inventario › Notas de Artículo | `notas-articulo` | `NotasArticulo` (:1617) | `inventario` (:828) |
| Inventario › Productos por Vencer | `lotes-vencer` | `LotesPorVencer` (:1618) | `inventario` |
| Inventario › Entradas y Salidas | `movs-directos` | `MovsDirectos` (:1619) | **sin mapeo** → visible a todos |
| Clientes › Listado (`customer-list`) | `customers` | `CustomersManagement` (:1630) | **sin mapeo efectivo** (mapa usa `customers-list`, :830) |
| Clientes › Top (`top-customers`) | `top-clientes` | `TopClientes` (:1633) | **sin mapeo efectivo** (mapa usa `top-clientes`) |
| Clientes › Cumpleaños (`birthdays`) | `cumpleanos` | `CumpleanosClientes` (:1634) | **sin mapeo efectivo** (mapa usa `cumpleanos`) |
| Clientes › Anticipos | `anticipos-clientes` | `AnticiposClientes` (:1627) | `config_sistema.usarAnticipos` (:853-854) + perm `clientes` |
| Proveedores › Listado | `suppliers` | `ProveedoresManagement` (:1631) | `proveedores` (:832) |
| Proveedores › Productos Proveedor | `productos-proveedor` | `ProductosProveedor` (:1632) | `proveedores` |
| Ventas › Nueva Venta (`new-sale`) | `nueva-venta` | `VentasTabs` (:1598) | `ventas` (:833) |
| Ventas › Listado | `sales` | `SalesManagement` (:1599) | `ventas_listado` |
| Ventas › Por Tipo de Pago | `ventas-tipo-pago` | `VentasPorTipoPago` (:1602) | `ventas_tipo_pago` (:834) |
| Ventas › Facturación Electrónica (`fe-panel`) | `facturacion-electronica` | `FacturacionElectronica` (:1603) | `facturacion_electronica` (no depende del entitlement CRM) |
| Ventas › Pendientes por Entregar | `pendientes-entrega` | `PendientesEntrega` (:1605) | `esFabricacion()` (:716-718); sin perm |
| Compras › Nueva Compra | `nueva-compra` | `ComprasTabs` (:1600) | `compras_editar` (:835) |
| Compras › Listado | `purchases` | `PurchasesManagement` (:1601) | `compras` |
| Compras › Órdenes de Compra | `ordenes-compra` | `OrdenesCompraManagement` (:1636) | siempre (:728-731); sin perm |
| Compras › Facturas Recibidas (`received-invoices`) | `facturas-recibidas` | `FacturasRecibidas` (:1604) | sin perm |
| Cartera › Clientes (`accounts-receivable`) | `cuentas-cobrar` | `CuentasPorCobrar` (:1623) | `clientes_cartera` (:831) |
| Cartera › Cuentas por Pagar | `cuentas-pagar` | `ProveedoresManagement modoCxP` (:1624) | `proveedores_pagar` |
| Financiaciones | `financiaciones` | `FinanciacionesManagement` (:1628) | `config_sistema.usarFinanciaciones` (:850) + perm `financiaciones` (:836) |
| Movimientos › Abrir/Cerrar Caja (`caja-actual`) | `caja` | `CajaRegistradora` (:1637) | `caja` (:837) |
| Movimientos › Historial de Cajas | `caja-historial` | `HistorialCajas` (:1638) | `caja_historial` |
| Movimientos › Pagos Clientes | `pagos-clientes` | `ListadoPagosClientes` (:1625) | `pagos_listado` (:838) |
| Movimientos › Pagos a Proveedores | `pagos-proveedores` | `ListadoPagosProveedores` (:1626) | `pagos_listado` |
| Movimientos › Gastos | `gastos` | `GastosManagement` (:1639) | `gastos` (:839) |
| Movimientos › Bancos | `bancos` | `BancosManagement` (:1640) | `bancos` |
| Movimientos › Nómina | `nomina` | `NominaManagement` (:1641) | `esModuloActivo('nomina')` (:763); sin perm |
| Informes (item simple, no fabricación) | `informes-hub` | `InformesHub` (:1642) | perm `informes` (:843) |
| Informes › Panel (fabricación) | `informes-hub` | `InformesHub` | `esFabricacion()` (:766); hijos **sin mapeo** |
| Informes › Retenciones Recibidas (fabricación) | `informe-retenciones` | `InformeRetencionesRecibidas` (:1643) | sólo en menú si `esFabricacion()` (:772) |
| Informes › Producción del Día (fabricación) | `produccion-dia` | `InformeProduccionDia` (:1606) | `esFabricacion()` (:773) |
| Vendedores › Gestión (badge `pedidosPendientes`) | `vendedores-gestion` | `VendedoresMovil` (:1645) | `vendedorMovilOK` (:849); sin perm |
| Vendedores › Pedidos de Campo | `vendedores-pedidos` | `VendedoresPedidos` (:1646) | idem |
| Vendedores › Cargues del día | `vendedores-cargues` | `CarguesVendedor` (:1647) | idem |
| Vendedores › Ranking | `vendedores-informe` | `InformeVendedores` (:1648) | idem |
| Configuración › General (`config-sistema`) | `configuracion` | `ConfiguracionSistema` (:1650) | `configuracion` (:840) |
| Configuración › Datos Empresa | `datos-empresa` | `DatosEmpresa` (:1651) | `datos_empresa` (:841) |
| Configuración › Usuarios | `usuarios` | `UsuariosManagement` (:1652) | `usuarios` |
| Configuración › Permisos | `config-permisos` | `ConfigPermisos` (:1658) | `usuarios` (:842) |
| Configuración › Módulos | `config-modulos` | `ConfigModulos` (:1659) | sólo `username==='root'` (:805) + `configuracion` |
| Configuración › Categorías de Gastos (`config-categorias`) | `config-categorias-gasto` | `ConfigCategoriasGasto` (:1653) | `configuracion` |
| Configuración › Retenciones | `config-retenciones` | `ConfigRetenciones` (:1654) | **sin mapeo** |
| Configuración › Conceptos ReteFuente | `config-conceptos-rete` | `ConceptosRetefuente` (:1655) | **sin mapeo** |
| Configuración › Administrar Cajas | `config-cajas` | `ConfigCajas` (:1656) | `configuracion` |
| Configuración › Servidor | `config-servidor` | `ConfigServidor` (:1657) | `configuracion` |
| Configuración › Respaldo BD | `backup-bd` | `BackupBD` (:1660) | `configuracion`; también desde badge nube (:1221) |
| Configuración › Mantenimiento BD | `mantenimiento-bd` | `MantenimientoBD` (:1661) | `configuracion` |
| (sin ítem de menú) | `products` | `ProductsManagement` (:1609) | sólo alcanzable vía `onNavigate` de hijos (sin verificar quién) |

Otros accesos a vistas (sin chequeo de permisos, `abrirEnTab` no valida): campana de notificaciones (`irA`, Dashboard.tsx:587, 1283-1322), `PantallaInicio` accesos rápidos (Nueva Venta, Caja, Inventario, Ventas con `show:true` para todos; FE, Cartera, Informes, Compras sólo `esAdmin` — PantallaInicio.tsx:54-62), `NotificacionEmergente.onNavigate(destino)` (sólo admin, NotificacionEmergente.tsx:127, 155), `onNavigate` de SalesManagement/PurchasesManagement/FacturacionElectronica/StockBajo/VendedoresPedidos (:1599-1646). Ctrl+K usa `menuItems` ya filtrado (:906-917). Menú avatar "Configuración" (sólo admin) llama `setCurrentView('configuracion')` sin abrir pestaña (:1357).

**Qué muestra Inicio:** siempre `PantallaInicio` como primera pestaña para admin y vendedor (props `esAdmin`, `esVendedor`; :1595). `DashboardVendedor` sólo sustituye a `IncomeOverview` en la view `overview` cuando `tipoUsuario==2` (:1596).

**Efectos / timers de Dashboard en el montaje** (orden de declaración):
| # | Qué | Endpoint / IPC | Frecuencia | Código |
|---|---|---|---|---|
| 1 | Atajos Ctrl+W / Ctrl+Tab | — | listener keydown | :444-467 |
| 2 | Cerrar menú contextual | — | listener click/scroll | :470-479 |
| 3 | Ctrl+K paleta | — | listener keydown | :488-504 |
| 4 | F2 abre cajón | IPC `print:silent` con `config_sistema.impresoraTirilla` | por tecla | :514-548 |
| 5 | Datos de empresa | GET `empresa/datos.php` → `saveEmpresaCache` (localStorage `empresa_cache`) | 1 vez | :551-556 |
| 6 | Respaldo diario | GET `${getApiUrl()}/backup/?estado`; si `!tiene_hoy` POST `{action:'generar'}` | 1 vez por montaje | :563-576 |
| 7 | `useCumpleanosHoy` | GET `clientes/cumpleanos.php?rango=7` | 1 vez | :577 (resultado `cumpleProximos` no se usa) |
| 8 | `useStockBajoCount` | GET `familias/stock-bajo.php` | 1 vez + cada 5 min | :578 |
| 9 | `useNotificaciones` | 3 GET paralelos (lotes, stock-bajo, cumpleaños) | 1 vez + 5 min + `focus` + evento | :579 |
| 10 | `useAutoSyncVendedores` | GET `vendedores/config.php`; si habilitado+credenciales: `pull.php` a los 15 s y cada N min | ver hook | :582 |
| 11 | `useVendedoresConfig` | GET `vendedores/config.php` | 1 vez | :593 |
| 12 | `useModulos` | GET `modulos/estado.php` | 1 vez + evento `modulos:refresh` | :594 |
| 13 | `useSincronizacion` | IPC `sync:estado` | 1 vez + cada 10 s + push | :595 |
| 14 | Backup nube badge | IPC `backup-cloud:estado` | 1 vez + cada 5 min | :602-609 |
| 15 | `useEntitlements` | IPC `entitlements:get` | 1 vez + cada 15 min | :610 |
| 16 | Forzar FE ON en config local | escribe `localStorage.config_sistema.usarFacturacionElectronica=true` si entitlement FE activo | al terminar entitlements | :624-630 |
Hijos montados (efectos antes que los del padre): `NotificacionEmergente` (sólo admin: GET `inicio/sugerencias.php` + cada 60 s; primera notificación a los 8 s; NotificacionEmergente.tsx:154-163, 166-195) y `PantallaInicio` (reloj cada 1 s PantallaInicio.tsx:24; **segunda** instancia de `useNotificaciones` :20 y de `useVendedoresConfig` :21).

No hay auto-migración en el montaje del Dashboard: el comentario Dashboard.tsx:632-641 dice que se retiró en 4.3.96 — pero sí la hay en el login (AuthContext.tsx:75), ver Evaluación.

---

## Hooks

| Hook | Llama | Intervalo / disparadores | Eventos | Consumidores (grep) |
|---|---|---|---|---|
| `useAutoHotfixes(isDev)` | GET externo `INDEX_URL` (:31, 95); GET `fix.url` (:66); POST `${getApiUrl()}/migraciones/aplicar.php` (:32, 70) | sólo si `!isDev` y pasaron >6 h desde `localStorage.hotfix_last_check` (:33-34, 56-59); `setTimeout` 8 s tras montar (:123) | — | App.tsx:70 |
| `useAutoSyncVendedores` | GET `vendedores/config.php` (:48); GET `vendedores/pull.php` (:26) | si `habilitado===1` y `api_url/api_email/api_token_empresa`: primer pull a 15 s (:64), luego `setInterval` `max(1, sync_intervalo_pull_min||5)` min (:59-68); candado `ejecutando` (:23-24) | — | Dashboard.tsx:582 |
| `useCumpleanosHoy` | GET `clientes/cumpleanos.php?rango=7` (:10) | 1 vez | — | Dashboard.tsx:577; re-export CumpleanosClientes.tsx:167 |
| `useEntitlements` | IPC `entitlements:get` (:78) | al montar + cada 15 min (:109-113); sin Electron → todo activo (:58-74); error → `MODULOS_INACTIVOS` (sólo núcleo) (:34-42, 89-105) | — | Dashboard.tsx:610, ConfigModulos.tsx:175, ConfiguracionSistema.tsx:246, VendedoresMovil.tsx:45 |
| `useModulos` | GET `modulos/estado.php` (:10, 25) | al montar | escucha `modulos:refresh` (:35); `triggerModulosRefresh()` lo emite (:43-44) | Dashboard.tsx:594, ConfigModulos.tsx:174 (emisor ConfigModulos.tsx:8) |
| `useNotificaciones` | GET `lotes/index.php?por_vencer=1`, `familias/stock-bajo.php`, `clientes/cumpleanos.php` (:21-23, 43-47) | al montar, cada 5 min (:71), `window.focus` (:72); throttle 2 s + candado `enCurso` **por instancia** (:34-41) | escucha `notificaciones:refresh` (:75); `triggerNotifRefresh()` lo emite (:17-19) | Dashboard.tsx:579, PantallaInicio.tsx:20; emisores de `triggerNotifRefresh`: sólo LotesPorVencer.tsx:238, 352 y NotasArticulo.tsx:52, 232 |
| `useSincronizacion` | IPC `sync:estado`, `sync:forzar`, `sync:backfill` (:49, 71, 81) | cada 10 s (:55) | escucha IPC push `sync:estado` (:58) | Dashboard.tsx:595 (badge :1161-1190, modal backfill :1718-1837) |
| `useStockBajoCount` | GET `familias/stock-bajo.php` (:5, 13) | al montar + cada 5 min (:19) | — | Dashboard.tsx:578; re-export StockBajo.tsx:646 |
| `useVendedoresConfig` | GET `vendedores/config.php` (:25); POST `guardar`/`probar`/`pull_ahora` (:41-44, 59-62, 74-77) | sólo al montar | — | Dashboard.tsx:593, PantallaInicio.tsx:21, VendedoresMovil.tsx:44, VendedoresPedidos.tsx:79, ClienteDetalle.tsx:33 |
| `useLicenciaEstado` (en TrialBanner.tsx) | IPC `subscription:getVencimiento` | al montar, cada 12 h, `focus` | — | TrialBanner.tsx:125 |

---

## Inventario de localStorage / sessionStorage del shell
| Clave | Almacén | Lee / escribe | Código |
|---|---|---|---|
| `token`, `user` | **sessionStorage** | escribe login, borra logout, lee `user` al hidratar | AuthContext.tsx:39, 63-64, 106-107 |
| `token` (y `user` al 401) | **localStorage** | axios lee `token`; borra ambos en 401 | services/api.ts:22, 38-39 |
| `api_server_url` | localStorage | URL API (sólo navegador) | config/api.ts:9, 45, 70, 81 |
| `config_<clave>` | localStorage | fallback de `writeConfig` en navegador | config/api.ts:215 |
| `hotfix_last_check` | localStorage | throttle 6 h | useAutoHotfixes.ts:34, 57, 62 |
| `hotfix_applied_<id>` | localStorage | fix ya aplicado en esta máquina | useAutoHotfixes.ts:35, 51, 54 |
| `trial_banner_snooze_until` | localStorage | snooze 24 h | TrialBanner.tsx:112, 116, 121 |
| `FORCE_SHOW_BANNER`, `FORCE_SHOW_MODAL` | localStorage | flags QA | TrialBanner.tsx:140-141, 212 |
| `config_sistema` | localStorage | `getConfigImpresion` (impresora F2, `usarFinanciaciones`, `usarAnticipos`, `tipoNegocio`) y escritura `usarFacturacionElectronica` | ConfiguracionSistema.tsx:78, 131, 156; Dashboard.tsx:524-525, 626-628, 644-645 |
| `empresa_cache` | localStorage | `saveEmpresaCache` tras `empresa/datos.php` | ConfiguracionSistema.tsx:173, 184, 228; Dashboard.tsx:554 |
| `sugerencias_vistas`, `sugerencias_aplazadas`, `filtros_pendientes:<destino>` | localStorage | NotificacionEmergente | NotificacionEmergente.tsx:8-9, 62-86, 121 |
Además Electron `config.json` (vía IPC): `apiUrl`, `apiUrlRuntime` (config/api.ts:104-107).

---

## Flujos principales

- **Operación:** Resolver servidor y arrancar
  - **Pantalla → endpoint:** App.tsx:21 → IPC `config:read`; ConfigurarServidor.tsx:20/31 → `auth/login.php` (prueba) + IPC `config:write`.
  - **Lee/Escribe:** config.json (main process). No toca BD.
  - **Transacción:** no aplica. **Validaciones solo en frontend:** ninguna sobre la URL (se arma `http://ip:puerto/ruta`, ConfigurarServidor.tsx:15).
- **Operación:** Login
  - **Pantalla → endpoint:** LoginPage.tsx:23 → AuthContext.tsx:51 → `auth/login.php` (POST).
  - **Lee:** tblusuarios, tbltiposusuario (auth/login.php). **Escribe:** nada en BD; sessionStorage `token`,`user`.
  - **Efectos colaterales:** dispara `actualizacion/aplicar-sql.php` (migración de esquema completa si cambió la versión).
  - **Transacción:** no.
- **Operación:** Migración automática al login
  - **Pantalla → endpoint:** AuthContext.tsx:75 → `actualizacion/aplicar-sql.php` (POST `{version}`).
  - **Lee:** tbldatosempresa.version_sql_aplicada, information_schema (aplicar-sql.php:51-66). **Escribe:** `ALTER TABLE tbldatosempresa ADD version_sql_aplicada` (:59); todo `sql/actualizacion_completa.sql` vía `mysqli::multi_query` (:79-125); `UPDATE tbldatosempresa SET version_sql_aplicada` (:134-137).
  - **Transacción:** no. Marca versión aunque haya errores (:130-137).
- **Operación:** Hotfix remoto
  - **Pantalla → endpoint:** App.tsx:70 → useAutoHotfixes.ts:95/66/70 → externo index.json + `.sql` → `migraciones/aplicar.php`.
  - **Escribe:** `CREATE TABLE IF NOT EXISTS tbl_hotfixes_aplicados` (aplicar.php:61-68), SQL arbitrario `$db->exec($sql)` (:88-90), `INSERT INTO tbl_hotfixes_aplicados` (:101-105).
  - **Transacción:** no.
- **Operación:** Respaldo diario automático
  - **Pantalla → endpoint:** Dashboard.tsx:565-572 → `backup/index.php` GET `?estado` (:224-248) / POST `generar` (:266-314).
  - **Escribe:** archivos `contaft-*.sql|.db` en `CONTAFT_BACKUP_DIR` o `C:\ContaFT-Backups` (backup/index.php:17, 25); rota >30 días (:314).
- **Operación:** Cambiar contraseña propia
  - **Pantalla → endpoint:** Dashboard.tsx:1694-1707 → `usuarios/listar.php` POST `cambiar-pass`.
  - **Escribe:** `UPDATE tblusuarios SET contrasena` (usuarios/listar.php:71).
  - **Validaciones solo en frontend:** coincidencia y longitud ≥4 (Dashboard.tsx:1696-1697); **la contraseña actual no se valida en backend** (listar.php:64-72 ignora `contrasena_actual`).
- **Operación:** Badges/notificaciones
  - **Pantalla → endpoint:** useNotificaciones/useStockBajoCount/useCumpleanosHoy → `lotes/index.php`, `familias/stock-bajo.php`, `clientes/cumpleanos.php` (sólo lectura: vw_lotes_por_vencer lotes/index.php:64; tblarticulos+joins stock-bajo.php; tblclientes cumpleanos.php:20-66).
- **Operación:** Cierre de ventana con caja abierta
  - **Pantalla → endpoint:** App.tsx:36-56 → `caja/sesion.php?usuario=` (lee tblsesiones_caja; respuesta `abierta`, caja/sesion.php:103-124).

## Dependencias
- **Usa de otros módulos:** endpoints de inventario/lotes (`lotes/index.php`, `familias/stock-bajo.php`), clientes (`clientes/cumpleanos.php`), empresa (`empresa/datos.php`), caja (`caja/sesion.php`), usuarios (`usuarios/listar.php`), vendedores (`vendedores/config.php`, `pull.php`), ventas (`ventas/listar.php` vía DashboardVendedor), inicio (`inicio/sugerencias.php`). Helpers front: `utils/passwordEncoder` (AuthContext.tsx:3, Dashboard.tsx:1699), `ConfiguracionSistema.{getConfigImpresion,saveConfigImpresion,saveEmpresaCache,esFabricacion}` (Dashboard.tsx:65). Main process (IPC) para config, suscripción, entitlements, updater, sync, backup nube, impresión.
- **Lo usan otros módulos:** `getApiUrl`/interceptor (todo el frontend; ~90 componentes con URL hardcodeada dependen del interceptor, comentario main.tsx:6-8); `useAuth` (LoginPage, App); `triggerNotifRefresh` (LotesPorVencer, NotasArticulo); `triggerModulosRefresh` (ConfigModulos); `useEntitlements`/`useVendedoresConfig`/`useModulos` (ver tabla de hooks); `services/api` (7 componentes de inventario/informes).
- **Triggers / vistas de BD involucrados:** `vw_lotes_por_vencer` (lotes/index.php:64); `vw_facturas_cliente_saldos`, `vw_productos_stock_bajo` (inicio/sugerencias.php, grep). Triggers: (sin verificar) — el shell no escribe tablas de negocio salvo vía aplicar-sql / hotfix / cambiar-pass.
- **Compatibilidad:** `aplicar-sql.php` usa `mysqli` con las propiedades por defecto de `Database` leídas por Reflection (aplicar-sql.php:21-26) y no `db_factory.php` (que sí usa `database.php:29`) → en modo embebido SQLite intentaría conectar a MySQL `localhost/conta_demo` (database.php:34-35) (comportamiento en runtime sin verificar). `backup/index.php` distingue `sqlite` (:192, 204-209). `inicio/sugerencias.php` consulta `sqlite_master` e `information_schema` (grep) → contempla ambos.

## Qué se rompe si lo tocas
- **`rewriteUrl` / `HARDCODED_BASE` (config/api.ts:14, 121-132):** todas las llamadas con `http://localhost:80/conta-app-backend/api` (AuthContext.tsx:49, hooks, Dashboard.tsx:552/1700, App.tsx:39, ~90 componentes) dejan de llegar al PHP embebido (puerto dinámico) o al servidor de red. Cambiar el prefijo en `.env` (`VITE_API_URL`) sin cambiar `HARDCODED_BASE` hace que el login (AuthContext.tsx:49) apunte a una URL que el interceptor ya no reescribe.
- **Orden en main.tsx:9:** si el interceptor se instala después de `createRoot`, las primeras llamadas salen sin reescritura.
- **Bloqueo `!configLoaded` (App.tsx:74):** quitarlo hace que hooks/efectos llamen con `DEFAULT_URL` antes de leer config.json.
- **Prioridad `apiUrlRuntime` > `apiUrl` (api.ts:104-107):** invertirla rompe el modo embebido; mantenerla hace que "Configuración → Servidor" (ConfigServidor.tsx:23) no tenga efecto en embebido.
- **sessionStorage `user` (AuthContext.tsx:39, 64):** cualquier componente que lea `localStorage.user/token` (services/api.ts:22) no verá la sesión.
- **Forma de `user` del login** (`tipoUsuario`, `permisos`, `id`, auth/login.php:94-100): Dashboard deriva `esAdmin/esVendedor/tiene()` (:591-592, 818-819) y App.tsx:38-39 usa `user.id`; renombrar campos deja a todos sin menú o como no-admin.
- **ids de menú vs `menuPermisos` (Dashboard.tsx:651-844):** renombrar un `id` hijo lo deja sin permiso (visible a todos), porque el filtro trata "sin mapeo" como permitido (:862-863).
- **Agregar una View nueva** sin añadirla a `TAB_SUPPORTED_VIEWS` (:181-212) y al bloque de render (:1595-1661) → pantalla en blanco (no existe switch de respaldo, :370-373).
- **Nombre de eventos `notificaciones:refresh` / `modulos:refresh`:** emisores en LotesPorVencer, NotasArticulo y ConfigModulos dejan de refrescar badges/menú.
- **`useAutoHotfixes` antes de los gates (App.tsx:70):** moverlo detrás del login cambia cuándo corre (hoy corre sin sesión).
- **`aplicar-sql.php` en login (AuthContext.tsx:75):** cualquier cambio en `actualizacion_completa.sql` se ejecuta automáticamente en el siguiente login de cada cliente cuya versión de app cambió.

## Evaluación de la implementación

**Confirmado (leído en código):**
1. **Contadores de cumpleaños de la campana siempre en 0:** `useNotificaciones` lee `cumpleRes.value.cumpleanos` y `c.dias_para_cumple` (useNotificaciones.ts:58-60) pero `clientes/cumpleanos.php` devuelve `clientes` y `Dias_Para_Cumple` (cumpleanos.php:25, 57, 86). Afecta badge total, dropdown (Dashboard.tsx:1308-1322) y PantallaInicio.
2. **Token desalineado:** AuthContext guarda en `sessionStorage` (AuthContext.tsx:63) y axios lee `localStorage.token` (services/api.ts:22) → nunca se envía `Authorization`. En 401 borra claves equivocadas y navega a `/login` (services/api.ts:38-40), ruta inexistente en una app sin router. Además el token del backend no se persiste/valida (auth/login.php:60-61; sólo SELECTs) → la "sesión" es puramente de cliente.
3. **Ejecución de SQL arbitrario sin autenticación:** `migraciones/aplicar.php` ejecuta `$db->exec($sql)` (:88-90) si `sha256(sql)` coincide con el `sha256` que **manda el mismo cliente** (:45-48); no hay chequeo de usuario. Cualquiera que alcance la API (en modo servidor, la LAN) puede ejecutar SQL. En el front, el hash viene del mismo `index.json` que la URL del SQL (useAutoHotfixes.ts:95-98, 66-73) → sólo protege contra corrupción, no contra un canal comprometido.
4. **Cambio de contraseña sin verificar la actual y por Id arbitrario:** backend ignora `contrasena_actual` y actualiza `WHERE Id_Usuario = ?` con el id recibido (usuarios/listar.php:64-71).
5. **Auto-migración activa en login, contradice el comentario y la regla de memoria:** AuthContext.tsx:72-94 (introducido en d0d90dd, 2026-07-14) ejecuta `actualizacion_completa.sql` completo; Dashboard.tsx:632-641 afirma que la migración "vuelve a ser MANUAL". `aplicar-sql.php` marca la versión aunque haya errores (:130-137), así que una migración fallida no se reintenta. Contraste: PROCESOS_SISTEMA.md §6 lista "v4.3.96 Auto-migrar rompía BDs legacy al arrancar".
6. **Permisos de menú con ids desalineados:** `customers-list`/`top-clientes`/`cumpleanos` en el mapa (Dashboard.tsx:830) vs ids `customer-list`/`top-customers`/`birthdays` (:691-693) → visibles para cualquier usuario. Sin mapeo: `inventario-movs-directos`, `ordenes-compra`, `received-invoices`, `pendientes-entrega`, `nomina`, `config-retenciones`, `config-conceptos-rete`, hijos de Informes en fabricación, Vendedores.
7. **Gating sólo visual:** `abrirEnTab` no valida permisos (:369-401); PantallaInicio ofrece Nueva Venta/Caja/Inventario/Ventas a todos (PantallaInicio.tsx:54-57) y la campana navega a lotes/stock/cumpleaños para cualquiera (Dashboard.tsx:1283-1322). Un usuario sin permiso `inventario` puede abrir Inventario desde Inicio.
8. **Menú avatar "Configuración" no hace nada visible:** `setCurrentView('configuracion')` (Dashboard.tsx:1357) sin tocar `activeTabId`; el contenido depende sólo de `activeTabId` (:1592).
9. **Polling duplicado:** `useNotificaciones` instanciado dos veces (Dashboard.tsx:579, PantallaInicio.tsx:20) con throttle por instancia; `familias/stock-bajo.php` se pide 3 veces al montar y cada 5 min (+ en cada `focus` x2); `vendedores/config.php` 3 veces al montar (Dashboard.tsx:582, 593; PantallaInicio.tsx:21); `cumpleanos.php` 3 veces. `cumpleProximos` (Dashboard.tsx:577) no se usa.
10. **`triggerNotifRefresh` casi no se usa:** sólo LotesPorVencer y NotasArticulo lo emiten (grep). Ventas/compras/ajustes no refrescan el badge de stock bajo (depende del intervalo de 5 min o del `focus`).
11. **Dos fuentes de verdad para módulos:** Financiaciones/Anticipos se gatean por `localStorage.config_sistema` (Dashboard.tsx:644-645, por PC) mientras `modulos/estado.php` maneja `financiaciones` en `tbl_modulos_activos`/`tbldatosempresa.modulo_financiaciones` (estado.php:20-23, 41-50). `esFabricacion()` también es por PC (ConfiguracionSistema.tsx:150-153) → el menú puede diferir entre equipos de la misma empresa.
12. **Hotfixes corren sin sesión ni suscripción válida** (App.tsx:70 antes de los gates) y con cualquier cajero.
13. **Entitlements en "emergency" no apagan FE local:** el efecto sólo fuerza ON (Dashboard.tsx:627-628).
14. **ConfigServidor sin efecto en embebido:** `setApiUrl` escribe `apiUrl` (api.ts:65) pero `apiUrlRuntime` tiene prioridad (api.ts:104).

**Sospecha (no verificado en runtime):**
- `mysqli::multi_query` normalmente detiene el lote en el primer statement que falla; el bucle (aplicar-sql.php:105-121) asume que continúa → `statements_ok` puede ser parcial y la versión queda marcada igual.
- En modo SQLite, `aplicar-sql.php` probablemente falla (conexión MySQL por Reflection) y sólo deja un `console.warn` (AuthContext.tsx:93).
- Respaldo diario sólo se evalúa al montar Dashboard: si la app queda abierta pasada la medianoche no hay respaldo del día siguiente hasta re-login (Dashboard.tsx:563-576, sin intervalo).
- `services/api.ts` crea axios con `baseURL: getApiUrl()` al importar (antes de config) — mitigado por el interceptor de request (:14-17).
- `PanelSugerencias` sólo en DEV (PantallaInicio.tsx:220).

**Contraste con PROCESOS_SISTEMA.md:** el shell no mueve stock ni kardex directamente, así que las reglas de oro 1-5 sólo le aplican indirectamente: (a) `aplicar-sql.php` y `migraciones/aplicar.php` pueden ejecutar SQL correctivo sobre `tblkardex/tblarticulos` sin el "checklist pre-modificación" (§3) ni las queries de diagnóstico (§4); su idempotencia depende sólo de la convención del autor del SQL (aplicar.php:24-26). (b) §6 registra el incidente de auto-migrar (v4.3.96), y el login vuelve a auto-migrar (Confirmado 5). (c) La regla de memoria "tras POST que afecte inventario llamar `triggerNotifRefresh()`" no está documentada en PROCESOS_SISTEMA.md y en código sólo la cumplen 2 componentes (Confirmado 10).
