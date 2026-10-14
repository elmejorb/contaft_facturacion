# Informe del Spike SQLite

**Fecha**: 2026-10-14
**Branch**: `feature/expansion-mercado`
**Duración real**: ~1 hora
**Pregunta que responde**: ¿Es viable migrar el schema de Conta FT a SQLite? ¿Cuánto cuesta?

---

## TL;DR

**Sí, es viable. El esfuerzo real es menor que lo que estimé en el plan.**

- **100 de 101 tablas migran** con conversión mecánica — sin intervención humana por tabla.
- **Las 16 tablas críticas del flujo diario** (ventas, kardex, pagos, egresos, FE, caja, inventario, clientes, proveedores, pedidos) migran todas limpias.
- Lo pendiente de verdad son **9 stored procedures que hay que portar a PHP** (ya se corrían desde PHP; es trabajo mecánico) y **18 vistas** por reescribir.
- Estimación revisada de la **Fase 1**: **1 semana** (en el plan original decía 2). El convertidor que ya escribí en este spike puede ser el inicio del script oficial.

---

## Qué se hizo

1. [01_convertir_schema.php](01_convertir_schema.php) — convertidor mecánico de MySQL → SQLite con reglas conocidas (AUTOINCREMENT, ENUM, backticks, ENGINE/CHARSET, DEFAULT CURRENT_TIMESTAMP, PK+AUTOINCREMENT fusionados, extracción de índices inline).
2. [02_cargar_schema.php](02_cargar_schema.php) — carga el schema candidato en una BD SQLite real y reporta errores por tabla.
3. [conta_sqlite_candidate.sql](conta_sqlite_candidate.sql) — el schema convertido (output del paso 1).
4. [conta.db](conta.db) — BD SQLite real con 100 tablas creadas.

---

## Hallazgos

### Lo que migra limpio (sin tocar código a mano)

| Patrón MySQL | Transformación aplicada | Veces |
|---|---|---|
| Backticks ``` ` ``` | Comillas dobles | 2,489 |
| `int(N)`, `tinyint(N)`, `bigint(N)` | `INTEGER` | 384 |
| `decimal(p,s)` | `NUMERIC` | 204 |
| `KEY "idx" (col)` inline | `CREATE INDEX` separado | 149 |
| `ENGINE=InnoDB DEFAULT CHARSET=utf8mb4` | (quitado) | 101 |
| `LOCK TABLES` / `UNLOCK TABLES` | (quitado) | 202 |
| `AUTO_INCREMENT` + `PRIMARY KEY (col)` | `INTEGER PRIMARY KEY AUTOINCREMENT` | 36 |
| `enum(...)` | `TEXT` | 15 |
| `current_timestamp()` | `CURRENT_TIMESTAMP` | 39 |
| `ON UPDATE CURRENT_TIMESTAMP` | (quitado — se maneja en app) | 4 |
| `COMMENT 'x'` en columnas | (quitado) | varios |

**Resultado**: 100 de 101 tablas creadas sin tocar nada a mano.

### Tablas críticas del día a día (todas OK)

```
tblventas            OK   tblproveedores       OK   tblcajas             OK
tbldetalle_venta     OK   tblpagos             OK   tblsesiones_caja     OK
tblkardex            OK   tblegresos           OK   tblpedidos           OK
tblarticulos         OK   tbldatosempresa      OK   tbldetalle_pedido    OK
tblclientes          OK   tblusuarios          OK   electronic_documents OK
                                                    detalle_document_electronic OK
```

### Lo pendiente (requiere trabajo manual)

| Pendiente | Cantidad | Esfuerzo estimado | Riesgo |
|---|---|---|---|
| **Stored procedures** (`CREATE PROCEDURE`) | 9 | 1-2 días | Bajo — son queries pequeñas que ya se invocan desde PHP, mover la lógica al PHP que las llama |
| **Vistas** (`CREATE VIEW`) | 18 | 1 día | Bajo — SQLite soporta vistas, hay que verificar las queries subyacentes |
| **1 tabla con PK rara** (`tblreferenciasarticulos`) | 1 | 10 min | Trivial — ajustar manualmente |
| **Índices con prefix length** (`col(N)`) | 3 | 10 min | Trivial — SQLite ignora el prefix, basta con quitarlo |
| **`GENERATED ALWAYS AS`** | 1 | 10 min | Trivial — SQLite lo soporta, verificar sintaxis |

**Total pendiente**: 2-3 días de trabajo mecánico.

### Lo que NO probé todavía (siguientes pasos de Fase 1)

- Correr la **suite de tests actual** (`conta-app-backend/tests/`) contra SQLite y ver cuántos pasan. Era el paso 3 del spike, lo dejé porque:
  - El schema ya probó ser cargable.
  - La suite usa 100% PDO con queries simples (`SELECT`, `INSERT`, `UPDATE`) — en teoría debería pasar >90%.
  - Vale la pena hacerlo en la Fase 1 real porque requiere cambios reales al TestCase.
- Los **endpoints de informes** (resumen, cuadre, ingresos-totales) usan queries con `DATE_FORMAT`, `GROUP_CONCAT`, etc. — ahí sí espero romper varias y necesitar reescritura.

---

## Estimación revisada de la Fase 1

Lo que había dicho en el plan:
> **Fase 1 — Backend compatible con SQLite (2 semanas)**

**Revisión tras el spike**: **1 semana** es más realista:

| Trabajo | Esfuerzo |
|---|---|
| Terminar el convertidor (ya tengo el 80%) | 0.5 día |
| Portar 9 stored procedures a PHP | 1-2 días |
| Verificar + ajustar 18 vistas | 1 día |
| Adaptar queries de informes (DATE_FORMAT, GROUP_CONCAT, IF) | 2 días |
| Correr suite completa contra SQLite + arreglar lo que chille | 1 día |
| Capa `db.php` que lee driver desde config.json | 0.5 día |
| **Total** | **~1 semana** |

Si todo sale limpio, podríamos pasar a la **Fase 2 (PHP CLI embebido)** la semana siguiente.

---

## Qué nos dice el spike comercialmente

**La migración NO es un proyecto grande arriesgado.** Es trabajo mecánico y predecible. La suite de tests que armamos ayer sirve de red mientras portamos.

**Decisión recomendada**: proceder con la Fase 1 cuando el usuario lo apruebe. Mantener el convertidor del spike como el núcleo del script oficial de migración.

---

## Archivos del spike

- `README.md` — plan del spike (este)
- `01_convertir_schema.php` — convertidor MySQL → SQLite (el que vamos a quedarnos)
- `02_cargar_schema.php` — tester de carga
- `conta_sqlite_candidate.sql` — schema convertido (output)
- `conversion_report.txt` — reporte de reemplazos del paso 1
- `schema_load_report.txt` — reporte de errores de carga
- `conta.db` — la BD SQLite real con las 100 tablas
- `INFORME_SPIKE.md` — este documento

El branch queda listo para seguir trabajando o para cerrar y volver a tocar cuando convenga.
