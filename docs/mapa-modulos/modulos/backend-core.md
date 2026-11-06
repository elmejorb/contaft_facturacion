# Backend core (api/config, api/utils, prepend.php, capa MySQL/SQLite)

**Propósito:** infraestructura común del backend PHP: conexión a BD (MySQL legacy o SQLite embebido), cabeceras CORS/JSON, helpers portables de esquema, recálculo de saldo de facturas y codificación de contraseñas VB6. Todo endpoint depende de esta capa.
**Pantallas (frontend):** ninguna directa. Indirectamente todas (cualquier `fetch` a `api/*`). `utils/passwordEncoder.ts` del frontend es el gemelo de `api/utils/passwordEncoder.php` (usado por `contexts/AuthContext.tsx:48`, `components/AutorizacionAdminModal.tsx:4`, `components/Dashboard.tsx:1699`).
**Endpoints (backend):** no expone endpoints de negocio. Archivos:
- `conta-app-backend/prepend.php` (auto_prepend del modo embebido)
- `api/config/database.php` (clase `Database`, CORS, timezone)
- `api/config/db_factory.php` (driver mysql|sqlite, `ContaSqlitePDO`, shims de funciones MySQL)
- `api/config/helpers_polyfill.php` (helpers `conta_*` idempotentes para clientes legacy)
- `api/config/saldo_helper.php` (`recalcularSaldoFactura`)
- `api/config/secrets.example.php` (plantilla de `secrets.php`, API keys IA)
- `api/utils/passwordEncoder.php` (codificación VB6), `api/utils/test-encoder.php` y `api/utils/check-table-structure.php` (scripts de prueba accesibles por HTTP, GET, salida HTML/texto)

## Flujos principales

- **Operación:** Abrir conexión (cada request)
- **Pantalla → endpoint:** cualquier componente → `require_once '../config/database.php'` (128 endpoints con ruta relativa + 7 de `facturas-recibidas/*` con `__DIR__`, p.ej. `facturas-recibidas/listar.php:13`) → `(new Database())->getConnection()`.
- **Lee:** archivo de config JSON resuelto por `conta_config_path()` en orden: env `CONTA_CONFIG_PATH` (lo pone Electron al spawnear php.exe apuntando a `userData/backend-config.json`, ver electron-main.md) → `api/config/config.json` → `null` (db_factory.php:35-41).
- **Escribe:** nada. En SQLite: crea el directorio del `.db` si no existe (db_factory.php:69-70) y fija `PRAGMA foreign_keys=ON`, `journal_mode=WAL`, `synchronous=NORMAL`, `busy_timeout=5000` (db_factory.php:76-82).
- **Efectos colaterales:** envía cabeceras `Access-Control-Allow-Origin: *`, métodos y `Content-Type: application/json` (database.php:18-21); responde 200 y `exit` a todo OPTIONS (database.php:24-27); fija `date_default_timezone_set('America/Bogota')` (database.php:16). Si falla la conexión: `echo json {success:false}` + `exit` sin código HTTP de error (database.php:60-66).
- **Transacción:** no aplica.
- **Consecutivos:** no aplica.
- **Selección de driver:**
  - Con config válido (`driver` no vacío): `conta_abrir_pdo` → `ContaSqlitePDO` (sqlite) o `PDO mysql` con credenciales del JSON (db_factory.php:63-103). JSON inválido → `error_log` y fallback legacy (db_factory.php:52-55).
  - Sin config: MySQL con las propiedades privadas de `Database` (`localhost` / `conta_demo` / `root` / `root`, database.php:34-37 y 53-57). **En clientes legacy XAMPP `database.php` NO se actualiza** (Electron `syncBackend` lo excluye: `skipPaths: ['api/config/database.php']`, electron/main.js:1272-1274), así que cada cliente conserva sus credenciales y, si es anterior a 4.8.0, **no** carga `db_factory.php` (comentario helpers_polyfill.php:5-8).

- **Operación:** Ajustar CWD en modo embebido
- **Pantalla → endpoint:** php.exe `-S` con `-d auto_prepend_file=prepend.php` → `chdir(dirname(SCRIPT_FILENAME))` (prepend.php:15-17). Sin esto, todos los `require_once '../config/database.php'` relativos fallan bajo el built-in server.

- **Operación:** Emulación MySQL→SQLite (solo driver sqlite)
- **Reescritura sintáctica** en `prepare/query/exec`: `DATE_SUB/DATE_ADD(x, INTERVAL n UNIT)` → `date(x, '±n units')` para DAY/MONTH/YEAR/HOUR/MINUTE/SECOND (db_factory.php:168-206). Nota: siempre usa `date()`, por lo que HOUR/MINUTE/SECOND pierden la parte horaria (db_factory.php:180, 185) — **Confirmado** por lectura.
- **Funciones registradas** con `sqliteCreateFunction` (db_factory.php:214-389): MONTH, YEAR, DAY, DAYOFMONTH, HOUR, MINUTE, NOW, CURDATE, CURRENT_DATE, DATEDIFF, MONTHNAME, DAYNAME (en español), QUARTER, UNIX_TIMESTAMP, DATE_FORMAT (mapa parcial de tokens), IF, CONCAT, CONCAT_WS, FIELD, LEAST, GREATEST, REGEXP, SUBSTRING.
- **No emulado (MySQL-only presente en api/):**
  - `FOR UPDATE`: `movs-directos/anular.php:22,29`, `movs-directos/crear.php:61`, `notas-articulo/index.php:85`, `ordenes-compra/recibir.php:44`, `ventas/crear-factura.php:43` → error de sintaxis en SQLite (sin verificar en ejecución).
  - `ON DUPLICATE KEY UPDATE`: `componentes/index.php:76`.
  - `SHOW COLUMNS`: `empresa/configurar-token.php:39`.
  - `GROUP_CONCAT(... ORDER BY ...)`: `facturas-recibidas/listar.php:43` (SQLite no acepta ORDER BY dentro de group_concat en versiones antiguas; sin verificar versión del php-portable).
  - `information_schema` sin rama SQLite: `actualizacion/aplicar-sql.php:52` (usa mysqli, ver mantenimiento-migraciones-backup.md); `backup/index.php:90-145` solo se usa en rama MySQL. Las ramas de `ventas/nueva.php:23-34,308-319,358-368` e `inicio/sugerencias.php:111-119` sí son portables.
  - `DESCRIBE`: `utils/check-table-structure.php:17`.

- **Operación:** Helpers de esquema portables
- `conta_tiene_tabla`, `conta_tiene_columna`, `conta_columnas_tabla`, `conta_tablas_schema` existen **dos veces**: en `db_factory.php:120-150,394-404` (sin `function_exists`) y en `helpers_polyfill.php:24-70` (con guardas `if (!function_exists(...))`). `conta_driver_actual()` solo en db_factory.php:110-113.
- Endpoints que incluyen el polyfill (siempre DESPUÉS de database.php — orden verificado, obligatorio porque db_factory no tiene guardas y fallaría con "Cannot redeclare" si se invirtiera): caja/sesion.php:13, clientes/cartera.php:12, clientes/pagos.php:10, compras/nueva.php:11, dashboard/resumen.php:8, dian/consultar-adquiriente.php:23, facturacion-electronica/eliminar.php:14, facturacion-electronica/email.php:18, familias/stock-bajo.php:12, informes/ingresos-totales.php:21, informes/resumen.php:21, inicio/consulta-ia.php:30, inicio/sugerencias.php:30, inventario/actualizar-articulo.php:7, inventario/articulos.php:7, inventario/crear-articulo.php:7, inventario/eliminar-articulo.php:15, modulos/estado.php:15, movs-directos/crear.php:30, vendedores/pedidos.php:10, vendedores/push-all.php:19, ventas/pendientes-entrega.php:11 (22 endpoints).
- Único usuario de `conta_*` sin polyfill: `backup/index.php:198-203`, protegido con `function_exists('conta_config_cargar')` (y fallback a `%APPDATA%\dashboard-facturacion\conta.db`, backup/index.php:206-211).

- **Operación:** Recalcular saldo de factura POS
- **Pantalla → endpoint:** `clientes/pagos.php:398,510,594` y `ventas/detalle-factura.php:338` → `recalcularSaldoFactura($db, $facturaN)`.
- **Lee:** tblventas.Total; tblpagos (SUM ValorPago+Descuento, `Estado='Valida'`, `ValorPago>0`); tbl_retenciones_pago JOIN tblpagos (saldo_helper.php:29-66; tabla opcional con try/catch, :53-66).
- **Escribe:** tblventas UPDATE Saldo, pagada (saldo_helper.php:72-73).
- **Efectos colaterales:** cartera (cache `tblventas.Saldo`). No toca `electronic_documents.saldo`, `tblfacturasanteriores.Saldo` ni `tblpedidos.Saldo` (esos siguen con UPDATE incremental, p.ej. clientes/pagos.php:202-205,499-507, proveedores/listar.php:240-241).
- **Transacción:** la del llamador.
- **Validaciones solo en frontend:** n/a.

- **Operación:** Codificar contraseña VB6
- Cada carácter → `decbin(ord(c))` con padding a 7 dígitos (passwordEncoder.php:7-31). Gemelo JS: `utils/passwordEncoder.ts:6-29` usa `charCodeAt` (UTF-16). La comparación es texto plano codificado (`auth/login.php:59`); el frontend codifica y el backend compara. `usuarios/listar.php:39-41,67-70` re-implementa el algoritmo inline (no usa el helper).

- **Operación:** API keys externas
- `inicio/consulta-ia.php:36-47` busca primero la key en `tbldatosempresa` y luego `require api/config/secrets.php` (archivo fuera de git, plantilla `secrets.example.php:15-24`).

## Dependencias
- **Usa de otros módulos:** variable de entorno `CONTA_CONFIG_PATH` y el archivo `backend-config.json` que crea Electron (`electron/main.js:1766-1776, 1792-1805`, ver electron-main.md). Tabla `tbl_retenciones_pago` (módulo retenciones) en saldo_helper.php:55-61.
- **Lo usan otros módulos:** 135 de 144 archivos PHP de api/ incluyen `database.php`. Sin `database.php`: `version/changelog.php` (pone sus propias cabeceras, :6-12), `vendedores/sync-catalogos.php` (PDO directo hardcodeado a `conta_test_negocio` y `conta_movil` con root/root, sync-catalogos.php:8-18 — script de desarrollo expuesto por HTTP), `facturas-recibidas/helpers/xml-parser.php` (librería), y los propios archivos de config/utils.
- **Triggers / vistas de BD involucrados:** ninguno directamente. Las vistas no existen realmente en SQLite (ver bd-triggers-vistas.md), por lo que la emulación de funciones no cubre las lecturas a vistas.
- **Compatibilidad:** esta capa ES la capa de compatibilidad. Endpoints que usan `mysqli` directo y por tanto ignoran `db_factory`/config.json: `actualizacion/aplicar-sql.php:44`, `mantenimiento/ejecutar-sql.php:191` (ambos leen credenciales por Reflection sobre las propiedades por defecto de `Database`).

## Qué se rompe si lo tocas
- Si cambias las propiedades privadas `$host/$db_name/$username/$password` de `Database` (database.php:34-37), cambias las credenciales que `aplicar-sql.php:23-29` y `ejecutar-sql.php:189-191` usan vía Reflection; en embebido apuntan a `conta_demo` (no a la SQLite), ver mantenimiento-migraciones-backup.md.
- Si `database.php` deja de cargar `db_factory.php` o se mueve, se pierde el modo SQLite completo (database.php:29, 45-49).
- Si agregas una función `conta_*` nueva solo en `db_factory.php`, los clientes legacy (database.php viejo, no sincronizado) revientan con "Call to undefined function" — debe agregarse también con guarda en `helpers_polyfill.php` (helpers_polyfill.php:5-17).
- Si incluyes `helpers_polyfill.php` ANTES de `database.php` en un endpoint, en clientes nuevos `db_factory.php` redeclara `conta_tiene_tabla` sin guarda → fatal (db_factory.php:120,137,144,394).
- Si quitas `prepend.php` o el flag `auto_prepend_file`, todos los requires relativos fallan en modo embebido (prepend.php:1-17).
- Si cambias el regex de `ContaSqlitePDO::rewrite` (db_factory.php:176-188), afecta a toda consulta con INTERVAL en SQLite (p.ej. cargues-vendedor/list.php:70 usa `DATE_SUB`).
- Si cambias el algoritmo de `codificarPassword` en un lado (PHP o TS) sin el otro, nadie puede iniciar sesión (auth/login.php:59 compara strings exactos).
- Si cambias `recalcularSaldoFactura` (filtros `Estado`, `ValorPago>0`, retenciones), cambian los saldos de cartera y el estado `pagada` de todas las facturas tocadas por pagos y devoluciones parciales.

## Evaluación de la implementación
**Confirmado (leído en código):**
- CORS `*` sin autenticación en ninguna capa: no hay verificación de token/sesión en database.php ni en ningún endpoint (grep de `HTTP_AUTHORIZATION`/`Bearer` en api/ solo encuentra llamadas salientes: dian/consultar-adquiriente.php:82, facturacion-electronica/email.php:28, enviar.php:29). En modo servidor LAN cualquier equipo que alcance Apache opera la BD.
- Error de conexión devuelve HTTP 200 con `success:false` (database.php:60-66) → el frontend no distingue "BD caída" de error de negocio.
- Duplicación de helpers en dos archivos con implementaciones distintas (db_factory usa `PRAGMA table_info("$tabla")` interpolado, db_factory.php:123; polyfill usa `pragma_table_info(?)` parametrizado, helpers_polyfill.php:39).
- `DATE_SUB(..., INTERVAL n HOUR|MINUTE|SECOND)` se traduce a `date()` → pierde la hora (db_factory.php:174-187).
- Scripts de prueba/desarrollo publicados por HTTP dentro del bundle (extraResources copia todo `conta-app-backend` excepto `api/config/config.json`, Dashboard-Facturación/package.json:100-111): `utils/test-encoder.php`, `utils/check-table-structure.php`, `vendedores/sync-catalogos.php` (este último escribe en `conta_movil` y hace `ALTER TABLE ... AUTO_INCREMENT` sobre BD remota, sync-catalogos.php:38,85).
- Contraseñas: codificación reversible (binario de ASCII) sin hash ni sal (passwordEncoder.php:7-31).
- Divergencia de codificación con caracteres no ASCII: el TS codifica el code unit UTF-16 (`'ñ'` → 8 bits `11110001`), PHP en `usuarios/listar.php:39-41` codifica cada byte UTF-8 (`'ñ'` → 2 bloques). Un usuario creado/cambiado desde UsuariosManagement con `ñ`/tildes en la clave no puede iniciar sesión (login compara contra lo codificado por el TS).
- `saldo_helper` solo lo usan 2 endpoints; los demás flujos de saldo (facturas anteriores, proveedores, `electronic_documents.saldo`) siguen con UPDATE incremental que el propio helper desaconseja (saldo_helper.php:5-7).

**Sospecha:**
- `FOR UPDATE` en 5 endpoints probablemente falla en SQLite (sintaxis no soportada) → movs-directos, notas de artículo con lotes, recibir OC y `ventas/crear-factura.php` rotos en embebido (sin verificar en ejecución).
- `copy()` del `.db` con `journal_mode=WAL` (db_factory.php:78 + backup/index.php:169-173) no incluye el archivo `-wal`: backups SQLite potencialmente incompletos (ver mantenimiento-migraciones-backup.md).

**Contraste con PROCESOS_SISTEMA.md:** la capa no implementa ninguna regla de negocio (doble escritura Existencia+kardex, Servicio='S'); todo queda en cada endpoint. No hay helper común para "mover stock" — cada endpoint replica el patrón (ver inventario-stock-kardex.md), lo que explica los bugs históricos de la sección 6 del contrato. La regla "saldo = cache desechable" (saldo_helper.php:3-8) es la única regla transversal codificada.
