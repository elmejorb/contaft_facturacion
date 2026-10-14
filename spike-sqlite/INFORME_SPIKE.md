# Informe del Spike SQLite — RESULTADO FINAL

**Fecha**: 2026-10-14
**Branch**: `feature/expansion-mercado`
**Duración real**: ~2 horas
**Pregunta que responde**: ¿Es viable migrar el backend de Conta FT a SQLite? ¿Cuánto cuesta?

---

## TL;DR

**Es viable y más barato de lo estimado.**

- **101 de 101 tablas** del schema migran limpias con conversión mecánica.
- **18 de 18 vistas** cargan y funcionan contra queries reales.
- **9 stored procedures del template**: NO se usan (0 llamadas en el backend). Se eliminan sin costo.
- **25 queries representativas del backend productivo**: todas pasan en SQLite tal cual.
- **Capa `db.php` con factory por config.json**: ya está prototipada y funcionando.
- **Seed de pruebas en SQLite**: ya está escrito y carga sin errores.

### Estimación revisada de Fase 1

| Etapa | Estimación en plan | Estimación revisada |
|---|---|---|
| Backend compatible SQLite | 2 semanas | **2-3 días** |

El convertidor ya está hecho y los hallazgos indican que el backend necesita ajustes mínimos (ver sección "Qué queda").

---

## Qué se hizo paso a paso

### 1. Convertidor MySQL → SQLite [01_convertir_schema.php](01_convertir_schema.php)

Reglas mecánicas aplicadas al template:

| Patrón MySQL | Transformación | Veces |
|---|---|---|
| Backticks ``` ` ``` | Comillas dobles | 2,489 |
| `int(N)`, `tinyint(N)`, `bigint(N)` | `INTEGER` | 384 |
| `decimal(p,s)` | `NUMERIC` | 204 |
| `KEY "idx" (col)` inline | `CREATE INDEX` separado + quitar prefix length | 149 |
| `/*!50001 CREATE VIEW ... */` | Desenvuelto a `CREATE VIEW ...;` | 18 |
| `ENGINE=InnoDB DEFAULT CHARSET=utf8mb4` | Removido | 101 |
| `LOCK/UNLOCK TABLES` | Removido | 202 |
| `AUTO_INCREMENT` + `PRIMARY KEY (col)` | Fusionado a `INTEGER PRIMARY KEY AUTOINCREMENT` | 36 |
| `enum(...)` | `TEXT` | 15 |
| `current_timestamp()` | `CURRENT_TIMESTAMP` | 39 |
| `ON UPDATE CURRENT_TIMESTAMP` | Removido (se maneja en app) | 4 |
| `COMMENT 'x'` en columnas | Removido | 100+ |

### 2. Carga del schema [02_cargar_schema.php](02_cargar_schema.php)

- **101 de 101 tablas creadas** ✓
- **18 de 18 vistas creadas** ✓
- Las 16 tablas críticas del día a día (ventas, kardex, FE, caja, pagos, egresos, inventario, clientes, proveedores, pedidos) todas OK.

### 3. Verificación funcional de vistas [03_verificar_vistas.php](03_verificar_vistas.php)

Cargar la vista no es lo mismo que ejecutar su query interna. Hicimos `SELECT * LIMIT 1` contra cada una:

- **18 de 18 vistas funcionan** en SQLite ✓
- Ninguna usa funciones MySQL-only (DATE_FORMAT, IF, etc.)

### 4. Factory db.php [db_factory.php](db_factory.php) + [config.json](config.json)

```json
{
  "driver": "sqlite",
  "sqlite": { "path": "..." },
  "mysql":  { "host": "...", "database": "...", "username": "...", "password": "..." }
}
```

El mismo backend sirve a ambos modos leyendo el config. Compatibilidad con el `Database` legacy mantenida.

### 5. Seed de pruebas en SQLite [_seed_data_sqlite.sql](_seed_data_sqlite.sql) + [04_cargar_seed.php](04_cargar_seed.php)

- Equivalente SQLite nativo del seed MySQL de la suite.
- Carga sin errores: tabla por tabla con todas las columnas NOT NULL respetadas.

### 6. 25 queries reales del backend [05_queries_backend.php](05_queries_backend.php)

Queries extraídas de los endpoints más importantes (`caja/sesion.php`, `ventas/nueva.php`, `clientes/pagos.php`, `movimientos/gastos.php`, `informes/*`, `facturacion-electronica/enviar.php`) y ejecutadas directamente contra SQLite:

- **25 de 25 pasan** ✓

Incluyendo patrones típicamente problemáticos:
- Subqueries correlacionadas con `strftime`
- Vistas con JOINs complejos (`vw_facturas_cliente_saldos`)
- `GROUP_CONCAT` con separador
- `CTE` con window functions (`ROW_NUMBER() OVER`)
- Transacciones con `ROLLBACK`
- `LIKE` con wildcards para idempotency check de FE
- JOINs con `COALESCE`

---

## Lo que queda por hacer (Fase 1 real)

Trabajo bien acotado:

### A. Integrar la factory en el backend productivo (0.5 día)

- Mover `spike-sqlite/db_factory.php` a `conta-app-backend/api/config/db_factory.php`.
- Modificar `conta-app-backend/api/config/database.php` para que use la factory internamente (manteniendo la API `new Database()->getConnection()` intacta para no romper los 100+ archivos del backend que la usan).
- El `config.json` vive en `app.getPath('userData')` para Electron (regla establecida en memoria `feedback_config_path_userdata.md`).

### B. Script de migración definitivo (0.5 día)

- Mover `spike-sqlite/01_convertir_schema.php` a `conta-app-backend/tools/convertir_schema_sqlite.php` como herramienta oficial de setup.
- Script `install-sqlite.php` que ejecuta: convertir schema → crear BD → cargar seed limpio (versión producción, no la de pruebas).

### C. Buscar las últimas asperezas en queries MySQL-only (1-2 días)

El spike probó 25 queries. El backend tiene ~500. Hay que buscar casos que no toqué:

- `grep -r "DATE_FORMAT\|IF(" conta-app-backend/api/` → reemplazar por `strftime` y `iif()`.
- `grep -r "LIKE CONCAT" conta-app-backend/api/` → convertir a `LIKE ('%' || x || '%')`.
- Verificar que ninguna query use `SOUNDS LIKE`, `REGEXP` o `FULLTEXT MATCH`.

Toolkit: una vez identificadas, se reescriben una por una usando la suite de tests como red de seguridad. Tiempo estimado: ~1-2 días.

### D. Adaptar la suite de tests para correr contra ambos drivers (0.5 día)

- Agregar `TestCase::setUp` que mire variable de entorno `TEST_DB_DRIVER` y use la factory.
- Agregar `npm run test:backend:sqlite` paralelo al existente.
- Pre-build gate corre AMBOS (si uno falla, no hay build).

### Total realista

**2-3 días focalizados** (vs 2 semanas del plan original).

---

## Lo que NO sabemos todavía

Cosas que el spike no cubrió y hay que verificar en la Fase 1 real:

1. **Rendimiento**: SQLite debería ser más rápido que MySQL en 1 PC (sin red, sin servidor), pero no lo medimos. Correr una suite de inserción de 10k ventas lo confirmaría.
2. **Concurrencia**: SQLite tiene bloqueo por archivo. Con 1 solo proceso Electron hablando con 1 SQLite via WAL es seguro. Si en el futuro quisiéramos sync concurrente al CRM, hay que revisar.
3. **Migración de datos de clientes actuales**: no probamos todavía el flujo "exportar BD MySQL del cliente → importar a SQLite" (Fase 7 del plan).

Estos no bloquean el arranque, se verifican en el camino.

---

## Veredicto final

**Técnicamente la migración está desbloqueada.** Lo que en el plan original parecía 2 semanas de incertidumbre son 2-3 días de ejecución con sorpresas mínimas. El convertidor y la factory ya están escritos; solo faltan integración + barrido de queries + suite dual.

**Recomendación**: proceder con la Fase 1 cuando lo decidas. El código del spike es reutilizable al 100% — no fue tiempo perdido ni código tirado.

---

## Archivos del spike (todos en `spike-sqlite/`)

| Archivo | Propósito | Reutilizable en Fase 1 |
|---|---|---|
| `README.md` | Plan del spike | — |
| `01_convertir_schema.php` | Convertidor MySQL → SQLite | ✓ core |
| `02_cargar_schema.php` | Tester de carga schema | ✓ debug |
| `03_verificar_vistas.php` | Tester de vistas | ✓ debug |
| `04_cargar_seed.php` | Loader de seed SQLite | ✓ |
| `05_queries_backend.php` | 25 queries reales validadas | ✓ smoke test |
| `db_factory.php` | Factory PDO según config.json | ✓ core |
| `config.json` | Config de ejemplo | ✓ plantilla |
| `_seed_data_sqlite.sql` | Seed nativo SQLite | ✓ |
| `conta_sqlite_candidate.sql` | Schema convertido | ✓ |
| `conta.db` | BD SQLite real | — (regenerable) |
| `INFORME_SPIKE.md` | Este documento | — |
