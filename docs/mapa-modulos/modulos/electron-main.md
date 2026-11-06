# Electron main process (`electron/main.js`)

**Propósito:** proceso principal del desktop Conta FT. Arranca el backend (PHP+SQLite embebido o apunta a Apache/XAMPP legacy), crea la ventana, persiste `config.json`, valida licencia/suscripción y entitlements contra el CRM, gestiona auto-update, backup en la nube, impresión silenciosa a térmica, pagos de licencia y arranca el SincroWorker.

**Pantallas (frontend):** no hay preload ni `contextBridge` (grep en `Dashboard-Facturación` sin resultados). La ventana principal corre con `nodeIntegration: true, contextIsolation: false` (`electron/main.js:1359-1362`), así que el renderer usa `window.require('electron').ipcRenderer` directo. Consumidores (todas las rutas relativas a `Dashboard-Facturación/src`):
- `config/api.ts:65,100,198,211,225` (config:*) — usado por `App.tsx:21`, `components/ConfigServidor.tsx:12,23`, `components/ConfigurarServidor.tsx:31,36`.
- `App.tsx:33-59` (cierre de app), `components/SubscriptionGate.tsx:62,84,110,117`, `components/AutoUpdater.tsx:34,73-80`, `components/TrialBanner.tsx:42`, `components/ActivarLicenciaModal.tsx:44,45,77`, `components/SubirComprobanteForm.tsx:36,51`, `components/BackupBD.tsx:67,77`, `components/Dashboard.tsx:537,605,952`, `components/ImpresionFactura.tsx:661`, `components/ConfiguracionSistema.tsx:263,282,415,418,448`, `components/VendedoresMovil.tsx:119`, `hooks/useEntitlements.ts:78`, `hooks/useSincronizacion.ts:49,58,71,81`.
- `window.electronAPI` NO existe: `components/BackupBD.tsx:144-145` consulta `electronAPI.openPath` que nunca está definido (no hay preload).

**Endpoints (backend):** main.js no expone PHP; llama a estos endpoints locales: `empresa/datos.php` GET (`main.js:420`), `empresa/configurar-token.php` POST (`main.js:1051`), `backup/?action=generar` POST (`main.js:730`). Externos: ver tabla CRM más abajo.

---

## Archivos persistidos

| Archivo | Ruta | Escrito en | Leído en |
|---|---|---|---|
| `config.json` | prod: `app.getPath('userData')/config.json` (`main.js:1094`); dev (`NODE_ENV=development`): `Dashboard-Facturación/config.json` (`main.js:1091-1092`) | `writeConfig` read-merge-write (`main.js:1114-1127`); escrituras directas con `fs.writeFileSync` en `ensureConfigExists` (`main.js:1173,1180,1196,1212`) | `readConfig` (`main.js:1102-1112`), devuelve `{}` si no existe o JSON inválido |
| `config.json` legacy | junto al .exe (`main.js:1098-1100`) | — | solo para migrar una vez (`main.js:1191-1201`) |
| `backend-config.json` | `userData/backend-config.json` (`main.js:1766`) | solo si no existe: `{driver:'sqlite', sqlite.path=userData/conta.db, mysql: cfg.backendMysql || {localhost, conta_demo, root, ''}}` (`main.js:1767-1776`) | PHP vía env `CONTA_CONFIG_PATH` (`main.js:1803`); `subirBackupNube` lee `driver` (`main.js:713-716`) |
| `conta.db` | `userData/conta.db` (`main.js:1548`) | bootstrap/reparación/migraciones vía `php.exe -r` (`main.js:1560-1662`, `1673-1707`) | backup fallback (`main.js:756-761`) |
| `logs/main.log` | `userData/logs/main.log` (`main.js:1519-1522`) | `logMain` append, trunca a últimos 2MB al pasar 5MB (`main.js:1524-1529`) | — |
| userData completo | carpetas hermanas `Conta FT 4.3/4.2/4.1/Conta FT/ContaFT` | `migrarUserDataDesdeVersionesViejas` `fs.cpSync` si no hay `Local Storage` (`main.js:1446-1478`) | — |
| Backup local | `C:\ContaFT-Backups\<archivo>` (hardcode `main.js:738`; el PHP usa `getenv('CONTAFT_BACKUP_DIR') ?: 'C:\\ContaFT-Backups'` `conta-app-backend/api/backup/index.php:17,25`) | PHP | `subirBackupNube` (`main.js:738-743`) |
| Backend en htdocs (legacy) | `cfg.backendPath || 'C:\\xampp\\htdocs\\conta-app-backend'` (`main.js:1257`) | `syncBackend` copia `resources/backend` completo salvo `api/config/database.php` (`main.js:1273-1275`) | Apache |

### Claves de `config.json`

| Clave | Leída en | Escrita en | Significado |
|---|---|---|---|
| `backendMode` | `710,711,755,1169,1175,1253,1738,1883` | `1171,1177` (→`legacy`), `1209` (default `embedded`) | `embedded` = PHP+SQLite propio; `legacy` = Apache/XAMPP+MySQL |
| `backendPath` | `1162,1257` | `1172,1178` (default XAMPP) | destino de `syncBackend` |
| `apiUrl` | `417,724,1045,1157,1840`; renderer `config/api.ts:106` | renderer `config/api.ts:65` (`setApiUrl`) | URL backend legacy |
| `apiUrlRuntime` | `417,724,1045`; renderer `config/api.ts:104` (prioridad sobre apiUrl) | `1841` (solo si `!apiUrl` o apiUrl contiene `localhost:80`/`127.0.0.1:80`); borrada `1179` | URL del PHP embebido con puerto dinámico |
| `backendMysql` | `1772` | ninguna en main.js (sin verificar en otro lado) | creds MySQL para backend-config inicial |
| `api_token` | `412` | `1042` | token cliente en CRM (prioridad 1 sobre BD) |
| `_entitlements_cache` {jwt,checked_at,empresa,cliente_id,modulos,vigencia_del_token} | `131,224,273,564` | `117-126` | JWT RS256 del CRM; gracia 7 días (`136`) |
| `_subscription_cache` {allowed,estado,fecha_fin,checked_at,empresa,dias_restantes,plan_nombre} | `524-554` | `498-508` | cache de `consulta-plan`; válido hasta `fecha_fin` + 7 días gracia |
| `_vencimiento_cache` {data,checked_at} | `922-924` | `915-917` | cache 24h de `consulta-vencimiento` |
| `offline_activation` | `587-588` | `864` (set), `870` (null) | código HMAC offline |
| `ultimo_backup_nube` {ts,saved_at,size_bytes,empresa} | `826,837` | `804-811` | último backup nube OK |
| `trial_inicio` | `1713,1720,1726` | `1714` | fecha inicio trial (solo embedded) |
| `suscripcion_activa` | `1721` | ninguna (grep en main.js y src sin resultados) | corta el trial; en la práctica nunca se activa |
| `_force_sync_activo` | `sincroWorker.js:413` | ninguna en main.js | fuerza SincroWorker sin entitlement |
| cualquier otra | — | renderer vía `config:write` (`main.js:1286`) sin whitelist | — |

---

## Backend: embedded vs legacy

**Detección:** únicamente `cfg.backendMode === 'embedded'` (`main.js:1253,1738,1883`). Instalación limpia → default `embedded` (`main.js:1208-1212`). `ensureConfigExists` (`main.js:1132-1217`) aplica: (A) si `apiUrl` apunta a localhost/127.0.0.1 sin `:8089` y backendPath es XAMPP/Apache o vacío, y no hay backendMode → fija `legacy` (`1169-1174`); (B) si eso mismo pero `backendMode==='embedded'` → revierte a `legacy` y borra `apiUrlRuntime` (`1175-1182`).

**Embedded (secuencia en `app.whenReady`):**
1. `bootstrapSqliteDb()` (`main.js:1539-1663`) — `spawnSync` bloqueante de `php.exe -c php.ini -r <script>`:
   - BD existe: cuenta `tblusuarios` (timeout 10s, `1572-1575`); si >0 → `aplicarMigracionesSqlite` (`1581`); si 0/err → seed de reparación (`1586-1603`, timeout 15s) + migraciones.
   - BD no existe: carga `schema_sqlite_cliente.sql`, `dian_catalog_sqlite.sql`, `seed_sqlite_cliente.sql` con `PRAGMA journal_mode=WAL` (timeout 30s, `1622-1653`) + migraciones (`1662`).
   - `aplicarMigracionesSqlite` ejecuta `migraciones_sqlite.sql` statement por statement, tolera `duplicate column` (`1673-1707`, timeout 15s).
   - Todos los errores SQL se tragan (`1596,1639`).
2. `ensureTrialInicio()` (`1711-1716`).
3. `startEmbeddedPHP()` (`1735-1865`):
   - php: `resources/php-portable/php.exe` (dev: `Dashboard-Facturación/php-portable`) (`1744-1752`); si falta → `dialog.showErrorBox` y return (`1753-1762`).
   - crea `backend-config.json` si no existe (`1766-1776`).
   - hasta 3 intentos (`1785-1850`); puerto nuevo con `net.listen(0)` (`1498-1507`, `1791`).
   - args: `-c php.ini [-d auto_prepend_file=<backend>/prepend.php] -S 127.0.0.1:<puerto> -t <backend>/api` (`1792-1796`); `cwd=docRoot`, `env={...process.env, CONTA_CONFIG_PATH}` (`1801-1805`). `prepend.php` hace `chdir(dirname(SCRIPT_FILENAME))` (`conta-app-backend/prepend.php:15-17`).
   - "Health check" = el proceso sigue vivo a los 2s (`1820-1826`). No hay request HTTP de salud.
   - OK → `phpProcess`, `phpPortActivo` (`1830-1831`); escribe `apiUrlRuntime=http://127.0.0.1:<puerto>` condicionado (`1839-1843`).
   - Falla 3 veces → `dialog.showErrorBox` con stderr (`1854-1864`); la ventana igual se crea.
   - Si PHP muere después: solo log y `phpProcess=null` (`1832-1835`). **No hay reinicio.**
4. Shutdown: `will-quit` → `stopEmbeddedPHP()` → `phpProcess.kill()` (`1867-1873`, `1939-1942`).

**Legacy:** `syncBackend()` (`1244-1280`) copia `process.resourcesPath/backend` a `backendPath` en cada arranque (omitido en dev `1245` y en embedded `1253`), preservando solo `api/config/database.php`. No se arranca PHP. La URL la resuelve el renderer: `apiUrlRuntime` > `apiUrl` (`config/api.ts:104-108`) y si no hay ninguna → pantalla `ConfigurarServidor` (`App.tsx:87-89`). Un interceptor reescribe `http://localhost:80/conta-app-backend/api` hardcodeado (`config/api.ts:119-131,139-188`, instalado en `main.tsx:9`).

---

## IPC

### `ipcMain.handle` / `ipcMain.on`

| Canal | Tipo | main.js | Qué hace | Externo / local | Escribe | Renderer |
|---|---|---|---|---|---|---|
| `entitlements:get` | handle | 160 | `consultarEntitlements()` (92-158) | local `empresa/datos.php` si no hay `api_token`; CRM `GET /suscripcion-token/{token}` | `_entitlements_cache` | `hooks/useEntitlements.ts:78` (cada 15 min `:112`), `ConfiguracionSistema.tsx:415` |
| `empresas:activar` | handle | 212 | entitlements + exige `vendedor_movil.activo`; POST Bearer JWT al hub | CRM + `POST {apiUrlLumen}/api/empresas/activar` | `_entitlements_cache` | `ConfiguracionSistema.tsx:418,448` |
| `empresas:renovarCodigoPairing` | handle | 267 | idem, renueva código pairing | CRM + `POST {apiUrlLumen}/api/empresa/renovar-codigo` | `_entitlements_cache` | `VendedoresMovil.tsx:119` |
| `updater:check` | handle | 663 | `checkUpdatesGuarded()` (644-661): `validateForUpdate` (CRM estricto) → `autoUpdater.checkForUpdates()`; emite `subscription:status` | CRM `consulta-plan`; feed `innovacion-digital.com/updates/contaft4.8/` | — | `Dashboard.tsx:952` |
| `updater:install` | handle | 664 | `cierreConfirmado=true`; `quitAndInstall(true,true)` (silencioso + relanza) | — | — | `AutoUpdater.tsx:34` |
| `backup-cloud:subir` | handle | 816 | `subirBackupNube()` (689-814) | local `POST backup/?action=generar`; `POST https://innovacion-digital.com/backups-contaft/upload.php` | `ultimo_backup_nube` | `BackupBD.tsx:77` |
| `backup-cloud:estado` | handle | 824 | devuelve `ultimo_backup_nube` | — | — | `BackupBD.tsx:67`, `Dashboard.tsx:605` (cada 5 min) |
| `trial:getStatus` | handle | 857 | `getTrialStatus()` (1718-1733) | — | — | ninguno (grep) |
| `subscription:check` | handle | 859 | `validateForUsage()` (488-601) | local datos.php; CRM `consulta-plan` | `_subscription_cache` | `SubscriptionGate.tsx:62,117` |
| `subscription:checkUpdate` | handle | 860 | `validateForUpdate()` | CRM | — | ninguno |
| `subscription:setOfflineCode` | handle | 861 | verifica HMAC (432-451) y guarda | — | `offline_activation` | `SubscriptionGate.tsx:84` |
| `subscription:clearOfflineCode` | handle | 869 | borra código | — | `offline_activation=null` | ninguno |
| `subscription:getVencimiento` | handle | 930 | `consultarVencimiento()` (895-928) | CRM `consulta-vencimiento` + telemetría | `_vencimiento_cache` | `TrialBanner.tsx:42` |
| `pago:planes` | handle | 932 | lista planes/bancos | CRM `GET /planes-publicos` | — | `ActivarLicenciaModal.tsx:45` |
| `pago:planActual` | handle | 949 | plan del cliente | CRM `GET /consulta-plan/{token}` (sin telemetría) | — | `ActivarLicenciaModal.tsx:44` |
| `pago:crearLinkWompi` | handle | 964 | crea link y `shell.openExternal(url_checkout)` (975) | CRM `POST /pago/wompi/crear-link/{token}` | — | `ActivarLicenciaModal.tsx:77` |
| `pago:subirComprobante` | handle | 982 | multipart con archivo (359-405) | CRM `POST /pago/comprobante/{token}` | — | `SubirComprobanteForm.tsx:51` |
| `pago:elegirArchivoComprobante` | handle | 1009 | `dialog.showOpenDialog`, máx 5MB | — | — | `SubirComprobanteForm.tsx:36` |
| `subscription:setApiToken` | handle | 1034 | valida ≥32 chars, guarda; intenta POST al backend | local `POST empresa/configurar-token.php` (8s) | `api_token` (+ BD `tbldatosempresa.api_token` vía PHP, sin verificar) | `SubscriptionGate.tsx:110` |
| `config:read` | handle | 1285 | `readConfig()` completo (incluye JWT, api_token) | — | — | `config/api.ts:100,198` |
| `config:write` | handle | 1286 | `writeConfig(data)` merge sin whitelist | — | cualquier clave | `config/api.ts:65,211` |
| `config:getPath` | handle | 1287 | ruta config | — | — | `config/api.ts:225` → `ConfigServidor.tsx:12` |
| `print:listPrinters` | handle | 1293 | `webContents.getPrintersAsync()` | — | — | `ConfiguracionSistema.tsx:263` |
| `print:silent` | handle | 1311 | BrowserWindow oculta (`nodeIntegration:false, contextIsolation:true`), `loadURL(data:text/html)`, a los 250ms `print({silent:true, deviceName, printBackground, margins none})` (1313-1348) | — | — | `ImpresionFactura.tsx:661`, `Dashboard.tsx:537`, `ConfiguracionSistema.tsx:282` |
| `app:cerrar-confirmado` | on | 1421 | `cierreConfirmado=true`; `mainWindow.close()` | — | — | `App.tsx:55` |
| `app:cierre-cancelado` | on | 1425 | `cierreEnProceso=false` | — | — | `App.tsx:49` |
| `sync:estado` | handle | 1906 | `sincroWorker.getEstado()` | — | — | `useSincronizacion.ts:49` |
| `sync:forzar` | handle | 1907 | `sincroWorker.forzarCiclo(...)` | (dentro del worker) | — | `useSincronizacion.ts:71` |
| `sync:backfill` | handle | 1908 | `sincroWorker.backfill(readConfig, desde)` + `forzarCiclo` | (worker) | (worker: tbl_sync_outbox, fuera de alcance) | `useSincronizacion.ts:81` |

Los `sync:*` se registran dentro de `whenReady` y solo si `require('./sincroWorker')` no lanza (`1903-1920`).

### Eventos main → renderer (`webContents.send`)

| Evento | Emitido en | Escucha |
|---|---|---|
| `updater:available` | `main.js:626` | `AutoUpdater.tsx:73` |
| `updater:progress` | `main.js:632` | nadie (grep) |
| `updater:downloaded` | `main.js:636` | `AutoUpdater.tsx:74` |
| `subscription:status` | `main.js:648` | `AutoUpdater.tsx:75` |
| `app:intento-cierre` | `main.js:1410` | `App.tsx:58` |
| `sync:estado` | `sincroWorker.js:614` | `useSincronizacion.ts:58` |

---

## CRM / suscripción / licencia — llamadas externas

Base `SUBS_API_BASE = https://crm.innovacion-digital.com/api/public/api/v1` (`main.js:46`).

| URL | Función | Cuándo | Uso de respuesta | Bypass dev |
|---|---|---|---|---|
| `GET {base}/suscripcion-token/{api_token}` | `consultarEntitlements` 106 | `entitlements:get`, `empresas:*`, y **cada ciclo del SincroWorker (30s)** (`main.js:1905` → `sincroWorker.js:31,414,627`) | verifica JWT RS256 con llave pública embebida (51-86), guarda cache; fallback cache 7 días; si no, modo emergencia solo `nucleo` (143-156) | **NO** |
| `GET {base}/consulta-plan/{token}?version&machine_id&machine_name&username&platform` | `consultarCRM` 454-484 | `subscription:check`, `updater:check`, check de update a los 5s | `estado ∈ ['activa','prueba','por_vencer']` (47) | SÍ en `validateForUsage` (489) y `validateForUpdate` (605) |
| `GET {base}/consulta-vencimiento/{token}?…telemetría` | `consultarVencimiento` 909 | `TrialBanner` | cache 24h | **NO** |
| `GET {base}/planes-publicos` | 934 | modal activar licencia | — | **NO** |
| `GET {base}/consulta-plan/{token}` | 953 | modal activar licencia | exige `body.success` (≠ `body.code==='OK'` de 471) | **NO** |
| `POST {base}/pago/wompi/crear-link/{token}` | 968 | botón pagar | abre navegador | **NO** |
| `POST {base}/pago/comprobante/{token}` multipart | 989 | subir comprobante | — | **NO** |
| `POST {apiUrlLumen}/api/empresas/activar`, `/api/empresa/renovar-codigo` (Bearer JWT CRM) | 231, 276 | Vendedores Móviles | id_empresa/token_api/código pairing | **NO** |
| `POST https://innovacion-digital.com/backups-contaft/upload.php` header `X-API-Token` | 686, 793 | scheduler + manual | guarda `ultimo_backup_nube` | **NO** |
| electron-updater feed `https://innovacion-digital.com/updates/contaft4.8/` channel `latest` | `package.json:135-141` | 5s tras arranque + manual | autoDownload | SÍ (`autoUpdater` no se carga, 615) |

Local previo a todo lo anterior cuando no hay `cfg.api_token`: `GET {apiUrlRuntime||apiUrl}/empresa/datos.php` (8s) → `empresa.api_token` (`main.js:407-428`).

**Regla "en dev nada llama servicios externos": NO se cumple** para entitlements (y por ende SincroWorker cada 30s), vencimiento, pagos, Lumen y backup nube (scheduler `programarBackupNube` sin chequeo de `NODE_ENV`, `832-853`). Que efectivamente salga la llamada en dev depende de que el `config.json` de dev tenga `api_token` o el backend devuelva uno (sin verificar).

**Orden de validación de uso (`validateForUsage` 488-601):** dev → CRM online (si responde `allowed=false` bloquea, 520) → `_subscription_cache` vigente hasta `fecha_fin` (526-537) → gracia 7 días desde `checked_at` (540-554) → payload de `_entitlements_cache.jwt` SIN verificar firma, `modulos.nucleo.vigencia_hasta` (564-584) → código offline HMAC (587-598) → bloqueado.

---

## Auto-update, backup, impresión, timers

- **Auto-update:** `electron-updater` solo fuera de dev (`615-642`), `autoDownload=true`, `autoInstallOnAppQuit=true` (618-619). Check 5s tras `whenReady` (`1923-1929`) y manual (`663`), siempre tras `validateForUpdate` (CRM online obligatorio, `604-609`). Instalación: `quitAndInstall(isSilent=true, forceRunAfter=true)` (677), NSIS `oneClick:false` (`package.json:130-133`). Como `autoInstallOnAppQuit=true`, una descarga completada se instala al cerrar la app aunque el usuario no pulse instalar.
- **Backup nube:** `programarBackupNube()` (`832-853`) llamado tras `createWindow` (`1892`): si pasaron >24h desde `ultimo_backup_nube.ts`, ejecuta a los 5-15 min aleatorios; reprograma a sí mismo cada 24h. `subirBackupNube` (689-814): token → driver (`legacy`→mysql; si no lee `backend-config.json`) → `POST {backend}/backup/?action=generar` y lee `C:\ContaFT-Backups\<archivo>` → fallback `conta.db` crudo (solo sqlite/no legacy) → gzip nivel 6 → multipart (`nombre_app`, `version`, `driver`, `backup`) → upload.
- **Impresión:** silenciosa vía ventana oculta (1311-1349). No hay `printToPDF` en main.js (grep).
- **Timers del main:** check update 5s (1924), backup 5-15 min + 24h (845, 852), SincroWorker `setInterval` 30s (`sincroWorker.js:627`). Timers en renderer que pegan al main: entitlements 15 min (`useEntitlements.ts:112`), backup-cloud:estado 5 min (`Dashboard.tsx:610`).

## Ventana y ciclo de vida

- `createWindow` (1353-1416): 1400×900, `autoHideMenuBar`, `nodeIntegration:true`, `contextIsolation:false`; prod `loadFile(build/index.html)` con fallback `resources/app/build/index.html` (1384-1389); dev `loadURL('http://localhost:3000')` + DevTools (1368-1370).
- `Menu.setApplicationMenu(null)` (1876).
- `globalShortcut.register('F5')` y `'CommandOrControl+R'` → reload (1392-1398) — atajos **globales del SO**.
- Cierre: `close` → si no confirmado envía `app:intento-cierre` y previene (1405-1411); renderer consulta `caja/sesion.php` y confirma (`App.tsx:36-56`); segunda X sin respuesta cierra (1407).
- `window-all-closed` → `app.quit()` (1932-1937); `will-quit` → unregister + `stopEmbeddedPHP` (1939-1942); `activate` recrea ventana (1894-1898).
- **No hay** `requestSingleInstanceLock`, `second-instance`, `before-quit`, Tray (grep sin resultados).
- SincroWorker: `iniciar(mainWindow, readConfig, consultarEntitlements)` (1905); `detener()` existe (`sincroWorker.js:630`) pero main.js nunca lo llama (grep).

---

## Flujos principales

- **Operación:** Arranque embebido. **Pantalla → endpoint:** n/a → php.exe `-S`. **Lee:** config.json, conta.db (`tblusuarios`). **Escribe:** config.json (`trial_inicio`, `apiUrlRuntime`), backend-config.json, conta.db (schema/seed/migraciones). **Efectos:** proceso hijo PHP. **Transacción:** no (statements sueltos, errores tragados `1596,1639,1690-1694`). **Validaciones solo frontend:** n/a.
- **Operación:** Validar licencia. `SubscriptionGate.tsx:62` → `subscription:check` → CRM consulta-plan. **Escribe:** `_subscription_cache`. **Efectos:** API externa + telemetría máquina.
- **Operación:** Activar token. `SubscriptionGate.tsx:110` → `subscription:setApiToken` → config.json + `empresa/configurar-token.php`. Validación de alfanumérico solo en frontend (`SubscriptionGate.tsx:104`); main solo exige longitud ≥32 (`main.js:1037`).
- **Operación:** Backup nube. `BackupBD.tsx:77`/scheduler → `backup/?action=generar` → upload. **Escribe:** `ultimo_backup_nube`, archivo en `C:\ContaFT-Backups` (PHP).
- **Operación:** Imprimir tirilla. `ImpresionFactura.tsx:661` → `print:silent`.
- **Operación:** Actualizar. `Dashboard.tsx:952` → `updater:check` → CRM → feed → `updater:downloaded` → `AutoUpdater.tsx:34` `updater:install`.
- **Operación:** Pago licencia. `ActivarLicenciaModal.tsx:77` → `pago:crearLinkWompi`; `SubirComprobanteForm.tsx:36,51`.

## Dependencias

- **Usa de otros módulos:** `empresa/datos.php`, `empresa/configurar-token.php`, `backup/index.php` (`action=generar`, dir `C:\ContaFT-Backups`), `prepend.php`, `sql/schema_sqlite_cliente.sql`, `dian_catalog_sqlite.sql`, `seed_sqlite_cliente.sql`, `migraciones_sqlite.sql`, `sincroWorker.js`, CRM, hub Lumen.
- **Lo usan otros módulos:** todo el frontend depende de `apiUrlRuntime/apiUrl` (`config/api.ts`); el PHP depende de `CONTA_CONFIG_PATH` → `backend-config.json`; `backup/index.php:209` asume `%APPDATA%\dashboard-facturacion\conta.db` (mismo userData).
- **Triggers / vistas:** ninguno directo (sin verificar en migraciones SQLite).
- **Compatibilidad:** embedded = SQLite; legacy = MySQL. SincroWorker usa `mysql` (`sincroWorker.js:427`) y se arranca sin mirar `backendMode` (`main.js:1903-1905`).

## Qué se rompe si lo tocas

- Cambiar `name` del `package.json` cambia `userData` → se pierde config.json, conta.db, backend-config.json, logs (`main.js:1094,1548,1766`) y el `backup/index.php:209` deja de encontrar `conta.db`. La migración `1446-1478` solo cubre nombres "Conta FT x".
- Cambiar la clave `apiUrlRuntime` o su prioridad: `config/api.ts:104` la prefiere; si main no la reescribe (condición `1840`) el renderer apunta a un puerto viejo.
- Cambiar `ensureConfigExists` (A/B, `1157-1182`): reabre el bug de migrar clientes XAMPP a embedded (caso Ammi).
- Mover `C:\ContaFT-Backups` o setear `CONTAFT_BACKUP_DIR` en el PHP: `main.js:738` hardcodea la ruta y el backup nube cae a fallback/falla.
- Quitar `prepend.php` o cambiar docRoot `api/`: rompe todos los `require_once '../config/...'` en embedded (`prepend.php:3-12`).
- Cambiar la firma de `readConfig`/`consultarEntitlements`: SincroWorker los recibe por parámetro (`1905,1907,1910-1912`).
- Quitar `cierreConfirmado=true` de `updater:install` (670): el close handler bloquea el quitAndInstall.
- Cambiar la llave pública CRM (51-59) u `OFFLINE_SECRET` (295) sin el CRM: todos los clientes caen a emergencia / códigos inválidos.
- Activar `contextIsolation`: rompe todos los `window.require('electron')` del renderer (no hay preload).

## Evaluación de la implementación

**Confirmado (leído en código):**
1. **CRM consultado cada 30s por el SincroWorker** sin dev-bypass: `main.js:1905` pasa `consultarEntitlements` → `sincroWorker.js:414` lo llama en cada ciclo, `POLL_MS=30s` (`sincroWorker.js:31`). Cada éxito reescribe `config.json` (`main.js:117`) y, sin `api_token` en config, hace también `GET empresa/datos.php` local. Viola la regla de dev y genera ~2.880 req/día/PC al CRM.
2. **Licencia evitable desde el renderer:** `config:write` (1286) acepta cualquier clave; `validateForUsage` confía en `_subscription_cache` sin firma (526-537) y en el payload del JWT sin verificar firma (565-583). Con `nodeIntegration:true` cualquier script del renderer puede escribirlos. Además `OFFLINE_SECRET` está en claro en el bundle (295) → cualquiera puede generar códigos offline.
3. **`config.json` frágil:** `readConfig` devuelve `{}` ante JSON inválido (1108-1111) y `writeConfig` hace merge sobre eso (1119-1121) → una escritura posterior borra todas las claves (backendMode, apiUrl, api_token). Escritura no atómica (`writeFileSync` directo, 1121). Con `backendMode` perdido, el arranque deja de levantar PHP (1738) y `syncBackend` intenta copiar a XAMPP (1257).
4. **Sin single-instance lock:** dos instancias = dos php.exe, ambas escriben `apiUrlRuntime` (1841) en el mismo config; el renderer de la primera, al recargar (F5), apunta al PHP de la segunda y queda sin backend cuando ésta cierra.
5. **PHP sin supervisión:** health check = "vivo a los 2s" (1820-1826), sin request HTTP; si muere luego, no hay reinicio (1832-1835) ni aviso al renderer.
6. **Arranque bloqueante:** `bootstrapSqliteDb` usa `spawnSync` (hasta 10+15+15 s o 30+15 s) y `startEmbeddedPHP` hasta 3×2 s antes de `createWindow` (1884-1888) → sin ventana ni splash durante ese tiempo.
7. **`globalShortcut` F5/Ctrl+R son globales del SO** (1392-1398): mientras Conta FT corre, F5 en el navegador u otras apps recarga Conta FT (y se pierde el formulario en curso).
8. **Backup nube en LAN legacy:** si `apiUrl` apunta a otro PC, el dump se genera en el servidor y `main.js:739` busca el archivo en el disco local → falla; además cada PC cliente dispara un dump diario en el servidor.
9. **Canales muertos / API fantasma:** `trial:getStatus`, `subscription:checkUpdate`, `subscription:clearOfflineCode` sin uso; `updater:progress` sin listener; `window.electronAPI.openPath` (`BackupBD.tsx:144`) nunca existe.
10. **Trial inconsistente:** comentarios dicen 30 días (855, 1709) pero `DURACION=7` (1725); `suscripcion_activa` nunca se escribe → el trial nunca se "apaga" por esa vía. `trial:getStatus` no se consume.
11. **`pago:planActual` (955) exige `body.success`** mientras `consultarCRM` (471) usa `body.code==='OK'` sobre el mismo endpoint — una de las dos ramas está mal (cuál: sin verificar contra el CRM).
12. **`print:silent` imprime tras 250 ms fijos** (1321) — fuentes/imágenes pesadas pueden no haber cargado.
13. `autoInstallOnAppQuit=true` (619): si se descargó una versión, al cerrar se instala aunque el usuario no lo pidiera.
14. Exclusión `:8089` en `ensureConfigExists` (1161) obsoleta: el puerto ahora es aleatorio (1498-1507).

**Sospecha:**
- Embedded con `apiUrl` remota (no localhost) + `apiUrlRuntime` vieja: la condición 1840 no la actualiza y el renderer usaría un puerto muerto (`config/api.ts:104`).
- En dev, `getConfigPath` usa `Dashboard-Facturación/config.json` pero `backend-config.json`/`conta.db` siguen en userData (1766, 1548) — posible confusión de entorno.
- `sincroWorker` arranca en modo embedded (SQLite) e intentaría `mysql.createConnection` si el entitlement está activo (`sincroWorker.js:427`) (sin verificar el efecto).

**Contraste con PROCESOS_SISTEMA.md:** el contrato (`PROCESOS_SISTEMA.md:14-35`) cubre inventario/kardex/FE/POS; main.js no toca esas tablas directamente. Las migraciones SQLite de arranque (1673-1707) aplican DDL fuera de `actualizacion_completa.sql`; la regla "auto-update NO aplica SQL" se cumple para MySQL (no hay SQL en legacy) pero NO para SQLite embebido, donde cada arranque ejecuta `migraciones_sqlite.sql`. No hay contradicción con las reglas de oro de stock.
