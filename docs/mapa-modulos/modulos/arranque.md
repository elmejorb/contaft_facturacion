# Secuencia de arranque (desde el .exe hasta el Dashboard visible)

**Propósito:** cronología exacta de lo que ocurre al abrir Conta FT: proceso principal de Electron, backend PHP embebido o legacy, puertas (gates) que bloquean la UI, efectos del renderer y cada llamada HTTP local o externa en orden. Sirve para diagnosticar "la app no abre", "se queda cargando" o "hace llamadas al CRM".
**Pantallas (frontend):** `main.tsx`, `App.tsx`, `components/ConfigurarServidor.tsx`, `components/SubscriptionGate.tsx`, `components/AutoUpdater.tsx`, `components/TrialBanner.tsx`, `components/LoginPage.tsx`, `components/Dashboard.tsx`, `components/PantallaInicio.tsx`, `components/NotificacionEmergente.tsx`, hooks de `src/hooks/`.
**Endpoints (backend):** en orden de aparición: `empresa/datos.php` (main, si falta token), `auth/login.php`, `actualizacion/aplicar-sql.php`, `migraciones/aplicar.php` (hotfix), `inicio/sugerencias.php`, `lotes/index.php?por_vencer=1`, `familias/stock-bajo.php`, `clientes/cumpleanos.php`, `vendedores/config.php`, `backup/?estado`, `backup/` POST `generar`, `modulos/estado.php`, `vendedores/pull.php`, `empresa/datos.php` (Dashboard). Externos: CRM `crm.innovacion-digital.com`, feed de updates, `innovacion-digital.com/hotfixes-contaft/`, `innovacion-digital.com/backups-contaft/upload.php`, SaaS `conta-basic` (SincroWorker).

Fuentes: electron/main.js (verificado `1875-1942`), App.tsx (verificado `15-100`), y el detalle de líneas de electron-main.md, frontend-shell.md y vendedores-movil-sync.md.

## Flujos principales

### Fase 0 — Carga del módulo main (síncrona, sin red)
1. `require` de electron/http/https/crypto/net/child_process (main.js:1-10). Solo dev: `electron-reload` (main.js:27-36).
2. Registro de `ipcMain.handle` a nivel de módulo: `entitlements:get` (160), `empresas:*` (212, 267), `updater:check/install` (663-664), `backup-cloud:subir/estado` (816, 824), `trial:getStatus` (857), `subscription:*` (859-872, 930, 1034), `pago:*` (932-1022), `config:read/write/getPath` (1285-1287), `print:listPrinters/silent` (1293, 1311); `ipcMain.on` `app:cerrar-confirmado/app:cierre-cancelado` (1421-1427).
3. Solo producción (`NODE_ENV` != development): `electron-updater` con `autoDownload=true`, `autoInstallOnAppQuit=true` y listeners (main.js:615-642). Feed `https://innovacion-digital.com/updates/contaft4.8/` (package.json:135-141). Aún no consulta.

### Fase 1 — `app.whenReady()` (main.js:1875), todo ANTES de la ventana (gate implícito: no hay ventana ni splash)
4. `Menu.setApplicationMenu(null)` (main.js:1876).
5. `migrarUserDataDesdeVersionesViejas()` (main.js:1877 → 1446-1478): si `userData/Local Storage` no existe copia (`fs.cpSync`) desde "Conta FT 4.3/4.2/4.1/Conta FT/ContaFT".
6. `ensureConfigExists()` (main.js:1878 → 1132-1217): `userData/config.json` (dev: `Dashboard-Facturación/config.json`, 1090-1095). Si existe: blindaje/recuperación de clientes XAMPP → `backendMode='legacy'` (1169-1182). Si no: migra el config de junto al .exe (1191-1201) o crea `{backendMode:'embedded'}` (1208-1212).
7. `syncBackend()` (main.js:1879 → 1244-1280): omitido en dev o embebido. En legacy copia síncronamente `resources/backend` → `cfg.backendPath` (default `C:\xampp\htdocs\conta-app-backend`) excepto `api/config/database.php` (1272-1274).
8. Si `backendMode==='embedded'` (main.js:1881-1885):
   - `bootstrapSqliteDb()` (1539-1663) con `spawnSync php.exe -r` **bloqueante**: BD existente → conteo `tblusuarios` (timeout 10 s) → reparación con seed si 0/error (15 s) → `aplicarMigracionesSqlite` (`migraciones_sqlite.sql`, 15 s, 1673-1707). BD nueva → schema + catálogo DIAN + seed (30 s) + migraciones (15 s). Peor caso ≈ 40-45 s.
   - `ensureTrialInicio()` escribe `trial_inicio` en config.json si falta (1711-1716; `DURACION=7`, 1725).
9. `await startEmbeddedPHP()` (main.js:1886 → 1735-1865). Legacy: retorna de inmediato. Embebido: crea `userData/backend-config.json` si no existe (1766-1776); hasta 3 intentos (1790-1850) de `puertoLibreOS()` + `spawn php.exe -c php.ini -d auto_prepend_file=<backend>/prepend.php -S 127.0.0.1:<puerto> -t <backend>/api` con env `CONTA_CONFIG_PATH` (1792-1805); "salud" = el proceso no murió en 2 s (1820-1826), **sin request HTTP**. OK → escribe `apiUrlRuntime=http://127.0.0.1:<puerto>` solo si no hay `apiUrl` o apunta a `:80` (1839-1843). 3 fallos → `dialog.showErrorBox` modal (1855-1864) y continúa igual.
10. `createWindow()` (main.js:1887 → 1353-1416): BrowserWindow 1400×900, `nodeIntegration:true, contextIsolation:false` (1359-1362), sin preload; prod `loadFile(build/index.html)` (1384-1389), dev `loadURL('http://localhost:3000')`; `globalShortcut` F5/Ctrl+R (1392-1398, globales del SO); handlers `close` → envía `app:intento-cierre` (1405-1411). No hace `await` de la carga.

### Fase 2 — Main, mismo tick tras `createWindow` (en paralelo con la carga del renderer)
11. `programarBackupNube()` (main.js:1891 → 832-853): si >24 h desde `ultimo_backup_nube.ts`, agenda `subirBackupNube` a los 5-15 min aleatorios; se reprograma cada 24 h. Sin bypass dev.
12. `require('./sincroWorker').iniciar(mainWindow, readConfig, consultarEntitlements)` (main.js:1903-1904): ciclo inmediato y luego cada 30 s (sincroWorker.js:31, 626-627). **Primera llamada de red del main:** cada ciclo → `consultarEntitlements()` → (si `cfg.api_token` falta o <10 chars) GET local `{apiUrlRuntime||apiUrl}/empresa/datos.php` (main.js:417-421, timeout 8 s) → GET externo `https://crm.innovacion-digital.com/api/public/api/v1/suscripcion-token/{token}` (main.js:106-108, timeout 10 s) → `writeConfig(_entitlements_cache)` (main.js:117). Si `plataforma_web`/`sincronizacion` activo: procesa hasta 50 filas de `tbl_sync_outbox` (solo MySQL; en SQLite lanza "Sincronización online no disponible", sincroWorker.js:88-89) y envía al SaaS `conta-basic.../api-conta/public/sync/v2` (sincroWorker.js:37-38). Sin bypass dev.
13. Registro de `sync:estado`, `sync:forzar`, `sync:backfill` (main.js:1905-1917) — después de `createWindow`.
14. Solo prod: `setTimeout(5 s)` → `checkUpdatesGuarded()` (main.js:1921-1928) → `validateForUpdate` → `consultarCRM` (posible GET local `empresa/datos.php` + GET CRM `consulta-plan/{token}?version&machine_id&machine_name&username&platform`, main.js:461-470) → `webContents.send('subscription:status')` (648) → si `allowed` `autoUpdater.checkForUpdates()` → descarga automática.

### Fase 3 — Renderer: carga del bundle y gates
15. Import de `config/api.ts`: detecta Electron con `window.require` (api.ts:17-24). `services/api.ts` crea axios con `baseURL` = URL por defecto en ese momento (services/api.ts:6-7) (ver frontend-shell.md).
16. `main.tsx:9` `installFetchInterceptor()`: parchea `fetch`, `XHR.open`, `window.open` para reescribir el prefijo `http://localhost(:80)/conta-app-backend/api` → `getApiUrl()` (api.ts:121-132, 142-190). `main.tsx:11` render `AuthProvider > ConfirmDialogProvider > AppContent`.
17. **Gate 1 "Cargando..."** (App.tsx:74-84) mientras `loading || !configLoaded`. Efectos de AppContent en orden: (a) `loadConfigFromFile()` → IPC `config:read` (App.tsx:20-25, api.ts:100), prioriza `apiUrlRuntime` sobre `apiUrl` (api.ts:104-107); (b) listener `app:intento-cierre` (App.tsx:31-59); (c) `useAutoHotfixes(isDev)` (App.tsx:70): si no dev y >6 h, `setTimeout 8 s`. AuthProvider lee `sessionStorage.user` y `setLoading(false)` (AuthContext.tsx:38-44).
18. **Gate 2 servidor** (App.tsx:87-89): si no dev y no hay URL → `ConfigurarServidor` ("Probar" = POST `{url}/auth/login.php` vacío, timeout 5 s, api.ts:236-240; "Guardar" = IPC `config:write {apiUrl}` + `location.reload()` → vuelve al paso 15).
19. **Gate 3 suscripción** (`SubscriptionGate`, App.tsx:91): splash "Verificando suscripción" + IPC `subscription:check` (SubscriptionGate.tsx:62, 75) → main `validateForUsage`: dev → bypass (main.js:489); prod → GET local `empresa/datos.php` (si falta token) + GET CRM `consulta-plan` con telemetría; fallbacks cache → gracia → JWT de entitlements → código offline. `allowed=false` → pantalla de bloqueo (opciones `subscription:setApiToken`+`check`, `subscription:setOfflineCode`, SubscriptionGate.tsx:84, 110, 117).
20. Dentro del gate se montan `AutoUpdater` (escucha `updater:available/downloaded`, `subscription:status`, AutoUpdater.tsx:73-75) y `TrialBanner` (IPC `subscription:getVencimiento` → GET CRM `consulta-vencimiento` sin bypass dev; luego cada 12 h y en `focus`, TrialBanner.tsx:42-50; snooze cada 5 min, :132).
21. (t≈8 s desde paso 17, si aplica) GET externo `https://innovacion-digital.com/hotfixes-contaft/index.json` (useAutoHotfixes.ts:95) → por fix pendiente GET `fix.url` + POST `{api}/migraciones/aplicar.php` (useAutoHotfixes.ts:66-74). Ocurre aunque no haya login ni suscripción válida.
22. **Gate 4 login** (App.tsx:96-98): sin `sessionStorage.user` → `LoginPage`. Con sesión previa (reload) → directo al Dashboard.

### Fase 4 — Login
23. LoginPage.tsx:23 → AuthContext.tsx:46-55: POST `auth/login.php` `{username, password codificada VB6}` → guarda `sessionStorage.token/user` (63-64) → `setUser` → monta Dashboard.
24. En paralelo sin await: POST `actualizacion/aplicar-sql.php {version}` (AuthContext.tsx:72-79) → si la versión cambió ejecuta todo `actualizacion_completa.sql` con mysqli (ver mantenimiento-migraciones-backup.md). Corre concurrentemente con las lecturas del Dashboard (paso 25).

### Fase 5 — Montaje del Dashboard (visible desde el primer render, pestaña "Inicio")
25. Render: lee `localStorage.config_sistema` (esFabricacion, usarFinanciaciones, usarAnticipos; Dashboard.tsx:644-645). Efectos de hijos primero:
   - `NotificacionEmergente` (solo admin): GET `inicio/sugerencias.php` + cada 60 s; primera notificación a los 8 s (NotificacionEmergente.tsx:134, 155-162, 178-191).
   - `PantallaInicio`: reloj 1 s (PantallaInicio.tsx:24); `useNotificaciones` #1: GET `lotes/index.php?por_vencer=1`, `familias/stock-bajo.php`, `clientes/cumpleanos.php` en paralelo, cada 5 min + `focus` + evento `notificaciones:refresh` (useNotificaciones.ts:43-47, 71-75); `useVendedoresConfig` #1: GET `vendedores/config.php` (PantallaInicio.tsx:21).
26. Efectos del Dashboard en orden de declaración: atajos de teclado (Dashboard.tsx:444, 488, 514); GET `empresa/datos.php` → `localStorage.empresa_cache` (:552-554); GET `backup/?estado` → si `!tiene_hoy` POST `backup/ {action:'generar'}` (:563-576); `useCumpleanosHoy` GET `cumpleanos.php?rango=7` (:577); `useStockBajoCount` GET `stock-bajo.php` + 5 min (:578); `useNotificaciones` #2 (mismos 3 GET, :579); `useAutoSyncVendedores` GET `vendedores/config.php` → si `habilitado===1` y credenciales: a los 15 s GET `vendedores/pull.php`, luego cada `max(1, sync_intervalo_pull_min||5)` min (:582; useAutoSyncVendedores.ts:48-68); `useVendedoresConfig` #2 (:593); `useModulos` GET `modulos/estado.php` + evento `modulos:refresh` (:594); `useSincronizacion` IPC `sync:estado` cada 10 s + push `sync:estado` (:595); IPC `backup-cloud:estado` + cada 5 min (:602-609); `useEntitlements` IPC `entitlements:get` + cada 15 min (:610; useEntitlements.ts:78, 112).
27. Al cargar entitlements: si FE activa en CRM fuerza `config_sistema.usarFacturacionElectronica=true` en localStorage (Dashboard.tsx:624-630). El menú lateral se filtra por rol/permisos/entitlements/flags (Dashboard.tsx:848-870).

### Resumen de llamadas en el arranque típico (prod, embebido, con sesión nueva)
| # | Momento | Origen | Llamada |
|---|---|---|---|
| 1 | Fase 2 inmediato y cada 30 s | main/SincroWorker | (local `empresa/datos.php` si falta token) + CRM `suscripcion-token/{token}` |
| 2 | Fase 3 gate 3 | main (IPC) | (local `empresa/datos.php`) + CRM `consulta-plan/{token}` |
| 3 | Fase 3 | main (IPC TrialBanner) | CRM `consulta-vencimiento` |
| 4 | +5 s | main | CRM `consulta-plan` (validateForUpdate) + feed updates |
| 5 | +8 s | renderer | `hotfixes-contaft/index.json` (+ `.sql` + local `migraciones/aplicar.php`) |
| 6 | login | renderer | `auth/login.php`, `actualizacion/aplicar-sql.php` |
| 7 | Dashboard | renderer | `sugerencias` (admin), `lotes` ×2, `stock-bajo` ×3, `cumpleanos` ×3, `vendedores/config` ×3, `empresa/datos`, `backup/?estado` (+`generar`), `modulos/estado` |
| 8 | +15 s | renderer | `vendedores/pull.php` (si módulo habilitado) → hub Lumen |
| 9 | +5-15 min | main | local `backup/?action=generar` + `backups-contaft/upload.php` (si >24 h) |

Timers vivos tras el login: 1 s (reloj), 10 s (sync), 30 s (SincroWorker+CRM), 60 s (sugerencias admin), 5 min ×4 (stock-bajo, notificaciones ×2, backup-cloud), 5 min (snooze banner), N min (pull vendedores), 15 min (entitlements), 12 h (vencimiento), 24 h (backup nube).

### Apagado
28. X → `close` → `app:intento-cierre` → renderer GET `caja/sesion.php?usuario=<id>` (URL localhost reescrita, App.tsx:38-39); caja abierta → confirmación → `app:cerrar-confirmado` o `app:cierre-cancelado` (App.tsx:40-55). Segunda X sin respuesta fuerza el cierre (main.js:1407). `window-all-closed` → `app.quit` (main.js:1932-1937) → `will-quit` → `stopEmbeddedPHP` (`kill`, main.js:1939-1942). SincroWorker nunca se detiene explícitamente. `autoInstallOnAppQuit` instala la actualización descargada.

- **Transacción / Consecutivos / Validaciones solo en frontend:** n/a para el arranque. Las únicas escrituras de BD automáticas del arranque son: migraciones SQLite (paso 8), hotfixes (paso 21), `aplicar-sql.php` (paso 24), creación de backup (archivo, paso 26), `vendedores/pull.php` (escribe pedidos/clientes, paso 26) y el SincroWorker (marca filas del outbox).

## Dependencias
- **Usa de otros módulos:** electron-main (config.json, IPC, PHP embebido, CRM), frontend-shell (gates, interceptor, hooks), mantenimiento-migraciones-backup (aplicar-sql, hotfix, backup), auth-usuarios-permisos (login), vendedores-movil-sync (pull automático, SincroWorker), empresa-config (`empresa/datos.php`), lotes/clientes/familias/inicio (notificaciones).
- **Lo usan otros módulos:** todos (cualquier pantalla asume que el arranque dejó `getApiUrl()` resuelto y `sessionStorage.user` cargado).
- **Triggers / vistas de BD involucrados:** `trg_sync_*` (alimentan el outbox que procesa el SincroWorker); vistas de stock bajo/lotes que leen las notificaciones (ver bd-triggers-vistas.md).
- **Compatibilidad:** pasos 8-9 solo embebido (SQLite); paso 7 solo legacy (MySQL/XAMPP). Paso 24 solo funciona contra MySQL (mysqli). SincroWorker solo MySQL.

## Qué se rompe si lo tocas
- Si cambias el orden `startEmbeddedPHP` → `createWindow` (main.js:1886-1887) el renderer puede leer `config:read` antes de que exista `apiUrlRuntime` y quedar apuntando al puerto viejo (api.ts:104 lee la URL una sola vez).
- Si mueves `installFetchInterceptor()` después del render (main.tsx:9) o quitas el gate `!configLoaded` (App.tsx:74), las primeras llamadas salen a `localhost:80`.
- Si `useAutoHotfixes` se mueve dentro de un gate, deja de correr antes del login (hoy App.tsx:70, intencional por la regla de hooks).
- Si un nuevo bootstrap SQLite tarda más (scripts grandes), la ventana tarda lo mismo: todo `spawnSync` es previo a `createWindow` (main.js:1881-1887).
- Si `consultarEntitlements` cambia de firma, rompe a la vez SincroWorker (main.js:1904) y `entitlements:get` (main.js:160).
- Si se cambia `name` en package.json cambia `userData`: config.json, conta.db y backend-config.json "desaparecen" y el paso 6 crea un config embebido nuevo (main.js:1208-1212).

## Evaluación de la implementación
**Confirmado (leído en código):**
- Arranque bloqueante sin splash: hasta ≈45 s de `spawnSync` + 6 s de intentos PHP + diálogos modales antes de crear la ventana (main.js:1881-1887, 1539-1707, 1790-1864).
- "Salud" de PHP = proceso vivo 2 s; no hay request de prueba ni reinicio si PHP muere después (main.js:1820-1835).
- Si PHP falla 3 veces se muestra error y la ventana abre igual, contra un backend inexistente (main.js:1855-1864).
- La regla de memoria "en dev nada llama servicios externos" no se cumple para SincroWorker/entitlements (cada 30 s), vencimiento, backup nube (electron-main.md §CRM); sí para `validateForUsage`/`validateForUpdate`/autoUpdater/hotfixes (useAutoHotfixes.ts:90).
- ~2.880 llamadas/día al CRM por PC solo por el SincroWorker (30 s), más reescritura de config.json en cada respuesta (main.js:117).
- Llamadas duplicadas al montar: `stock-bajo.php` ×3, `vendedores/config.php` ×3, `cumpleanos.php` ×3 (frontend-shell.md).
- La auto-migración del login (paso 24) se lanza sin await y en paralelo con las lecturas del Dashboard (pasos 25-26), sin coordinación (AuthContext.tsx:72-79).
- Hotfixes (escritura de BD con SQL remoto) corren antes de validar suscripción y sin usuario (App.tsx:70).

**Sospecha:**
- Durante el DDL del paso 24 las vistas pueden no existir momentáneamente (DROP/CREATE VIEW) → errores transitorios en las lecturas del Dashboard, silenciados por `catch` vacíos (no medido).
- En SQLite embebido el paso 24 siempre falla (mysqli a `conta_demo`, ver mantenimiento-migraciones-backup.md) y queda solo como warning de consola.
- Varias instancias (sin `requestSingleInstanceLock`) arrancan cada una su PHP y reescriben `apiUrlRuntime` en el mismo config.json (electron-main.md).

**Contraste con PROCESOS_SISTEMA.md:** el arranque no ejecuta flujos de inventario/cartera, salvo `vendedores/pull.php` (que guarda FE móviles sin mover stock/kardex, contra §2.2 — ver vendedores-movil-sync.md). Las migraciones automáticas (pasos 8, 21, 24) no siguen el checklist §3 (diagnóstico antes/después).
