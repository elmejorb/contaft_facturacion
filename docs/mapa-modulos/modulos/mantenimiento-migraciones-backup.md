# Mantenimiento de BD: actualización de esquema, hotfixes, scripts, respaldos, versión y diagnóstico

**Propósito:** mantener el esquema de la BD del cliente al día con la versión del programa (automático al iniciar sesión, por hotfix remoto o manual desde Configuración), generar respaldos diarios locales y en la nube, mostrar el historial de versiones y el diagnóstico de inventario a 30 días.
**Pantallas (frontend):**
- `contexts/AuthContext.tsx:72-91` — dispara `actualizacion/aplicar-sql.php` en cada login (automático, sin pantalla).
- `hooks/useAutoHotfixes.ts` — montado en `App.tsx:70` (antes de cualquier gate); descarga y aplica hotfixes.
- `components/Dashboard.tsx:563-576` — respaldo automático diario al montar el Dashboard.
- `components/BackupBD.tsx` — Configuración → "Respaldo de la Base de Datos" (id `backup-bd`, Dashboard.tsx:811, permiso `configuracion` Dashboard.tsx:842).
- `components/MantenimientoBD.tsx` — Configuración → "Mantenimiento BD (Migración)" (id `mantenimiento-bd`, Dashboard.tsx:812, permiso `configuracion`).
- `components/HistorialVersiones.tsx` — modal desde `ConfiguracionSistema.tsx:1278`.
- `components/DiagnosticoInventario.tsx:75` — vista `diagnostico` del menú Inventario (ver conteo-auditoria.md).
- Electron main: `bootstrapSqliteDb`/`aplicarMigracionesSqlite` en cada arranque embebido y `subirBackupNube` (ver electron-main.md).
**Endpoints (backend):**
- `api/actualizacion/aplicar-sql.php` POST `{version}`
- `api/migraciones/aplicar.php` POST `{id, sha256, sql}`
- `api/mantenimiento/ejecutar-sql.php` GET `?listar=1`; POST `{script}` (whitelist)
- `api/backup/index.php` GET `?estado`; POST `action=generar` (`forzar` opcional) | `action=eliminar` (`nombre`); action aceptada por JSON, form o query string (backup/index.php:258-264)
- `api/version/changelog.php` GET
- `api/diagnostico/inventario-30d.php` GET
- `api/sql/migracion_bancos_autoincrement.sql` (archivo SQL suelto dentro de api/, no es endpoint; no referenciado por ningún PHP — grep vacío)
- Fuera de api/ pero en el bundle: `conta-app-backend/backups-contaft-server/` (upload.php, listar.php, descargar.php, admin.html) = **lado servidor** del backup nube desplegado en `innovacion-digital.com/backups-contaft/` (backups-contaft-server/README.md:1-8).

## Flujos principales

- **Operación:** Auto-actualización de esquema al iniciar sesión
- **Pantalla → endpoint:** AuthContext.tsx:72-79 (tras login OK, sin await, versión de `package.json`) → `actualizacion/aplicar-sql.php` POST.
- **Lee:** tbldatosempresa.version_sql_aplicada (aplicar-sql.php:63-66); information_schema.COLUMNS (aplicar-sql.php:51-56); archivo `conta-app-backend/sql/actualizacion_completa.sql` o `api/sql/actualizacion_completa.sql` (aplicar-sql.php:79-86).
- **Escribe:** tbldatosempresa ALTER ADD version_sql_aplicada si falta (aplicar-sql.php:58-60); TODO el DDL/DML de `actualizacion_completa.sql` (2685 líneas, 103 bloques PREPARE, vistas y 15 triggers — ver bd-triggers-vistas.md) vía `mysqli::multi_query` (aplicar-sql.php:105-128); tbldatosempresa UPDATE version_sql_aplicada (aplicar-sql.php:134-137).
- **Efectos colaterales:** recrea vistas y triggers `trg_sync_*` (sincronización); puede modificar datos (UPDATE de backfill en el consolidado, p.ej. actualizacion_completa.sql:2201-2205). Toast "Base de datos actualizada" (AuthContext.tsx:82-86).
- **Transacción:** no (DDL implica commit implícito en MySQL).
- **Consecutivos:** n/a.
- **Condición:** solo corre si `version_sql_aplicada != version` (aplicar-sql.php:68-76). **Marca la versión como aplicada aunque haya errores** (aplicar-sql.php:130-137) → no reintenta en el siguiente login.
- **Conexión:** `new mysqli` con las propiedades POR DEFECTO de la clase `Database` leídas por Reflection (aplicar-sql.php:22-29, 44) — ignora `config.json`/`db_factory`.
- **Validaciones solo en frontend:** ninguna; el endpoint no exige usuario.

- **Operación:** Hotfix remoto
- **Pantalla → endpoint:** App.tsx:70 `useAutoHotfixes(isDev)` → si no es dev y pasaron >6 h (`localStorage.hotfix_last_check`, useAutoHotfixes.ts:33-34, 56-59) → a los 8 s (useAutoHotfixes.ts:123) GET externo `https://innovacion-digital.com/hotfixes-contaft/index.json` (useAutoHotfixes.ts:31, 95) → por cada fix sin `localStorage.hotfix_applied_<id>` GET `fix.url` (useAutoHotfixes.ts:66) → POST `migraciones/aplicar.php {id, sha256, sql}` (useAutoHotfixes.ts:70-74).
- **Lee:** tbl_hotfixes_aplicados (aplicar.php:77-79).
- **Escribe:** tbl_hotfixes_aplicados CREATE IF NOT EXISTS (aplicar.php:67-74); el SQL arbitrario recibido con `PDO::exec` (aplicar.php:98); tbl_hotfixes_aplicados INSERT (aplicar.php:110-114).
- **Efectos colaterales:** cualquiera (depende del SQL remoto). Toast (useAutoHotfixes.ts:108-115).
- **Transacción:** no.
- **Seguridad:** el hash lo envía el mismo cliente que envía el SQL; el servidor solo verifica que `sha256(sql) == sha256` enviado (aplicar.php:53-63) → no autentica el origen. Corre antes del login y de la suscripción (App.tsx:70 vs gates en App.tsx:74-100).
- **Compatibilidad:** usa la conexión PDO normal (sí respeta SQLite); el SQL de los hotfixes es texto MySQL (sin verificar si alguno es portable).

- **Operación:** Ejecutar script de mantenimiento
- **Pantalla → endpoint:** MantenimientoBD.tsx:44 GET `?listar=1`; :68 POST `{script}` individual; :91-105 "Migración completa" en orden `actualizacion_completa → reparar_autoincrement → optimizar_indices → auditar_bd`.
- **Lee/Escribe:** según whitelist (ejecutar-sql.php:17-48): `auditar_bd.sql` (solo lectura, crea/borra procedure `auditarBD`), `actualizacion_completa.sql`, `reparar_autoincrement.sql`, `optimizar_indices.sql`, `fix_vista_saldos_proveedores.sql`.
- **Efectos colaterales:** DDL masivo; preprocesa `DELIMITER` (ejecutar-sql.php:70-98) a diferencia de aplicar-sql.php. **No** actualiza `version_sql_aplicada`.
- **Transacción:** no.
- **Conexión:** mysqli con defaults de `Database` por Reflection (ejecutar-sql.php:189-191) — mismo problema que aplicar-sql.php.
- **Validaciones solo en frontend:** confirmación (MantenimientoBD.tsx:59, 84-90); permiso `configuracion` solo en menú.

- **Operación:** Respaldo automático diario (local)
- **Pantalla → endpoint:** Dashboard.tsx:563-576 al montar: GET `{getApiUrl()}/backup/?estado` → si `!tiene_hoy` POST `{action:'generar'}`. Manual: BackupBD.tsx:93 (estado), :107-109 (generar, `forzar`), :130-132 (eliminar).
- **Lee:** MySQL: INFORMATION_SCHEMA.TABLES/VIEWS/TRIGGERS + `SHOW CREATE TABLE/VIEW/TRIGGER` + `SELECT *` de cada tabla base (backup/index.php:90-155). SQLite: ruta del `.db` desde `conta_config_cargar()` o fallback `%APPDATA%\dashboard-facturacion\conta.db` (backup/index.php:196-213).
- **Escribe:** archivo `C:\ContaFT-Backups\contaft-YYYY-MM-DD_His.sql` (MySQL, dump PHP puro con DROP TABLE + CREATE + INSERT por lotes de 200, vistas y triggers con DELIMITER) o `.db` (copia binaria con `copy()`) (backup/index.php:17, 23-28, 74-173, 286-302); log `backup-debug.log` en el mismo dir en cada request (backup/index.php:177-184); borra backups >30 días (backup/index.php:18, 49-60, 314).
- **Efectos colaterales:** archivo en disco del **servidor PHP** (en LAN legacy = el PC servidor). Ninguna tabla.
- **Transacción:** no; el dump MySQL no usa snapshot consistente (lee tabla por tabla mientras la app escribe).
- **Consecutivos:** nombre por timestamp; dedupe "ya existe hoy" por prefijo `contaft-<hoy>` salvo `forzar` (backup/index.php:270-284).
- **Validaciones:** `eliminar` valida nombre `^contaft-.*\.(sql|db)$` sin `..` (backup/index.php:336-338).

- **Operación:** Respaldo en la nube
- **Pantalla → endpoint:** main.js `programarBackupNube` (cada 24 h, primer intento 5-15 min tras abrir) o BackupBD.tsx:77 IPC `backup-cloud:subir` → main.js `subirBackupNube` → POST local `backup/?action=generar` → lee `C:\ContaFT-Backups\<archivo>` (ruta hardcodeada) → POST `https://innovacion-digital.com/backups-contaft/upload.php` con header `X-API-Token` (detalle y líneas en electron-main.md). Servidor: valida token contra CRM con cache 1 h (backups-contaft-server/upload.php:32-35, 54-56, 76-104) y guarda por `sha256(token)[0:16]` (upload.php:111).
- **Escribe:** config.json `ultimo_backup_nube` (main.js, ver electron-main.md).
- **Efectos colaterales:** externo (Hostinger/servidor propio). Estado mostrado en topbar vía `backup-cloud:estado` cada 5 min (Dashboard.tsx:602-609).

- **Operación:** Historial de versiones
- **Pantalla → endpoint:** HistorialVersiones.tsx:95 → `version/changelog.php` GET → lee `conta-app-backend/CHANGELOG.md` (changelog.php:15-29). No usa BD.

- **Operación:** Diagnóstico inventario 30 días
- **Pantalla → endpoint:** DiagnosticoInventario.tsx:75 (`api.get`, axios de services/api.ts) → `diagnostico/inventario-30d.php` GET.
- **Lee:** vista `vw_diagnostico_inventario_30d` (inventario-30d.php:13-14).
- **Escribe:** nada.

- **Operación:** Migraciones SQLite al arrancar (embebido)
- Fuera de api/: Electron ejecuta `schema_sqlite_cliente.sql` + `dian_catalog_sqlite.sql` + `seed_sqlite_cliente.sql` en BD nueva y `migraciones_sqlite.sql` en cada arranque, con `php.exe -r` síncrono (detalle en electron-main.md / arranque.md). Es el equivalente SQLite de `actualizacion_completa.sql`, mantenido por separado.

## Dependencias
- **Usa de otros módulos:** `config/database.php` (todos), propiedades de la clase `Database` vía Reflection (aplicar-sql.php, ejecutar-sql.php), `conta_config_cargar` de db_factory (backup/index.php:202-205), vistas de inventario (diagnóstico), CRM (upload.php del servidor), Electron main (backup nube, bootstrap SQLite).
- **Lo usan otros módulos:** todo módulo que dependa de columnas/tablas/vistas/triggers creados por `actualizacion_completa.sql` (prácticamente todos). `tbldatosempresa.version_sql_aplicada` solo lo usa aplicar-sql.php. El SincroWorker depende de los triggers `trg_sync_*` que este flujo crea (ver vendedores-movil-sync.md).
- **Triggers / vistas de BD involucrados:** los 15 triggers y 15 vistas de actualizacion_completa.sql (bd-triggers-vistas.md) se crean por aquí; backup los vuelca con `SHOW CREATE` (incluye DEFINER del servidor de origen, backup/index.php:135, 147).
- **Compatibilidad:**
  - `aplicar-sql.php` y `ejecutar-sql.php`: **solo MySQL** (mysqli + information_schema). En embebido SQLite se conectan a MySQL `localhost/conta_demo/root/root` (database.php:34-37): si no hay MySQL → error 500 silencioso (AuthContext.tsx:91 solo `console.warn`); si existe un MySQL local con `conta_demo` → migran una BD que no es la del programa.
  - En legacy cuyo `database.php` es el viejo del cliente, Reflection devuelve sus credenciales reales (OK). Si el cliente legacy usa `api/config/config.json` con driver mysql y credenciales distintas, aplicar-sql usa las de la clase, no las del JSON.
  - `backup/index.php`: ramas separadas MySQL/SQLite (backup/index.php:191-220).
  - `migraciones/aplicar.php`: usa PDO normal (respeta driver).

## Qué se rompe si lo tocas
- Cualquier cambio en `conta-app-backend/sql/actualizacion_completa.sql` se ejecuta automáticamente en todos los clientes MySQL en el primer login tras actualizar el .exe (AuthContext.tsx:75 → aplicar-sql.php:105). Un statement con error puede dejar el resto sin aplicar y la versión marcada (aplicar-sql.php:130-137).
- Cambiar `name` en package.json o el userData rompe el fallback de ruta SQLite del backup (backup/index.php:209).
- Cambiar `$DEFAULT_DIR` o usar `CONTAFT_BACKUP_DIR` (backup/index.php:17, 25) desincroniza con main.js, que busca el archivo en `C:\ContaFT-Backups` fijo (electron-main.md).
- Cambiar la forma de respuesta de `backup/?estado` (`tiene_hoy`, `directorio`, `archivos`) rompe Dashboard.tsx:567-568 y BackupBD.tsx.
- Cambiar la whitelist de ejecutar-sql.php:17-48 sin actualizar MantenimientoBD.tsx:91 (orden fijo de ids) → pasos saltados en silencio (`if (!s) continue`, MantenimientoBD.tsx:93-94).
- Renombrar/mover `CHANGELOG.md` rompe el modal de versiones (changelog.php:15).
- Cambiar el contrato `{id, sha256, sql}` o `ya_aplicado` de migraciones/aplicar.php rompe useAutoHotfixes.ts:70-79 (marca local de aplicado).

## Evaluación de la implementación
**Confirmado (leído en código):**
- Contradicción de diseño: Dashboard.tsx:632-641 dice que la auto-migración "vuelve a ser MANUAL" tras el incidente 4.3.96, pero AuthContext.tsx:72-79 la ejecuta en cada login cuando cambia la versión.
- `aplicar-sql.php` marca la versión aunque falle (aplicar-sql.php:130-137); la respuesta trae `errores` pero el frontend solo hace `console.warn` (AuthContext.tsx:88-90).
- `aplicar-sql.php` no procesa `DELIMITER` (ejecutar-sql.php sí, :70-98); hoy el consolidado no usa DELIMITER en triggers (bd-triggers-vistas.md), pero cualquier procedure futuro con DELIMITER rompería el auto-aplicado.
- `migraciones/aplicar.php` ejecuta SQL arbitrario sin autenticación: el "hash" es autoverificable por cualquiera que mande `{sql, sha256(sql)}` (aplicar.php:53-63, 98). En modo LAN legacy cualquier PC de la red puede ejecutar SQL en la BD.
- Hotfixes se aplican antes de login y de suscripción (App.tsx:70) y la marca local `hotfix_applied_<id>` es por PC (localStorage), mientras la marca real es por BD (`tbl_hotfixes_aplicados`): N PCs → N descargas, la BD responde `ya_aplicado`.
- Respaldo SQLite con `copy()` de `conta.db` con `journal_mode=WAL` activo (db_factory.php:78): el archivo `-wal` no se copia → páginas no checkpointeadas quedan fuera del backup (backup/index.php:169-173).
- Dump MySQL sin consistencia transaccional y con `SHOW CREATE VIEW/TRIGGER` que incluye `DEFINER` del servidor de origen (backup/index.php:135, 147): restaurar en otro servidor puede fallar (caso conocido de DEFINER en Ammi).
- Rotación >30 días borra solo por nombre; no hay límite de espacio. Cada PC que abre el Dashboard dispara `?estado` + posible `generar` contra el mismo servidor (dedupe diario por nombre, backup/index.php:270-284).
- Log `backup-debug.log` crece sin rotación en cada request (backup/index.php:177-184).
- `api/sql/migracion_bancos_autoincrement.sql` es un SQL huérfano dentro de api/ (servible por HTTP como texto si Apache no lo bloquea; sin verificar config de Apache).
- El bundle del cliente incluye todo `conta-app-backend/sql/` (package.json:100-111), con scripts específicos de clientes (`MERCAYA_*`, `ICOPLASTIC_*`, `fix_*`) y `backups-contaft-server/` (código del servidor de backups).

**Sospecha:**
- `mysqli::multi_query` en MySQL detiene la ejecución del lote en el primer statement con error (comportamiento documentado del protocolo multi-statement, no verificable en el código); si es así, un error temprano en el consolidado deja sin aplicar todo lo posterior (incluidos los triggers al final, actualizacion_completa.sql:2546-2625) y, por la marca de versión, no se reintenta.
- En SQLite embebido, el login siempre produce un 500 en aplicar-sql.php (mysqli a `conta_demo` inexistente) — sin verificar en ejecución.

**Contraste con PROCESOS_SISTEMA.md:** la regla 4 (idempotencia de SQL correctivos con marcador `REPO HISTÓRICO`/`NOT EXISTS`) es la única condición que hace tolerable el auto-aplicado repetido; `aplicar-sql.php` asume idempotencia total (aplicar-sql.php:11-13) sin verificarla. El checklist §3 ("query de diagnóstico antes y después") no se cumple en el flujo automático: no hay snapshot ni backup previo forzado antes de aplicar el consolidado (el backup diario es independiente y puede ocurrir después).
