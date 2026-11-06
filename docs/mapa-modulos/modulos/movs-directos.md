# Entradas y Salidas Directas de inventario (MD-xxxxxx)

**Propósito:** Movimientos de inventario sin compra ni venta (regalos, mermas, robo, producción propia, devoluciones informales, "traslados") con número correlativo MD-000001 y anulación por asiento opuesto. Es la implementación más sólida del grupo.
**Pantallas (frontend):** `components/MovsDirectos.tsx` — menú Inventario › "Entradas y Salidas Directas" (`Dashboard.tsx:683`): listar :68, buscar producto :236 (vía `compras/nueva.php?buscar=`), crear :281 (convierte empaque→unidad base :269), anular :509.
**Endpoints (backend):** `movs-directos/crear.php` POST; `movs-directos/anular.php` POST `{id_mov, motivo}`; `movs-directos/listar.php` GET.

## Flujos principales
- **Operación:** Crear movimiento
- **Pantalla → endpoint:** MovsDirectos.tsx:281 → crear.php
- **Lee:** `tblarticulos` con `FOR UPDATE` (:61); `MAX(id_mov)` (:83)
- **Escribe:** `tbl_movs_directos` INSERT (:87-91); `tblarticulos` `Existencia = nueva` (+ `Precio_Venta`/`Precio_Venta_Empaque` opcionales en entradas) (:94-109); `tblkardex` C_D=1 (:138-145) o C_D=2 (:147-154), Detalle "MD-xxxxxx · motivo · concepto"
- **Efectos colaterales:** stock ABS (con fila bloqueada), kardex, outbox; NO toca tblpedidos/tblegresos (docblock :12)
- **Transacción:** sí :58 / :157, rollback :168
- **Consecutivos:** `MD-` + `MAX(id_mov)+1` (:83-84) dentro de la transacción pero sin bloqueo de tabla; `numero_mov` es UNIQUE (actualizacion_completa.sql:1904) ⇒ colisión = error 500, no duplicado
- **Validaciones solo en frontend:** conversión empaque→unidades (MovsDirectos.tsx:269). Backend valida tipo, motivo, cantidad>0 y salida ≤ existencia (:51-56, :76-78); `motivo` no se valida contra la lista (:114-129 sólo traduce)

- **Operación:** Anular movimiento
- **Pantalla → endpoint:** MovsDirectos.tsx:509 → anular.php
- **Lee:** `tbl_movs_directos` FOR UPDATE (:22), `tblarticulos` FOR UPDATE (:29)
- **Escribe:** `tblarticulos` Existencia ABS (:50); `tblkardex` opuesto "ANULACIÓN MD-…" (:59-77); `tbl_movs_directos` Estado='Anulada' + concepto (:80-82)
- **Efectos colaterales:** stock, kardex
- **Transacción:** sí :20 / :84
- **Consecutivos:** n.a.
- **Validaciones solo en frontend:** —; backend rechaza anular entrada si existencia < cantidad (:39-41)

- **Operación:** Listar → listar.php (:33-54): `tbl_movs_directos` LEFT JOIN `tblarticulos`, `tblusuarios`.

## Dependencias
- **Usa de otros módulos:** `compras/nueva.php?buscar=` (búsqueda de productos, MovsDirectos.tsx:9/:236); `config/helpers_polyfill.php` (`conta_tiene_columna`, crear.php:102).
- **Lo usan otros módulos:** ninguno lee `tbl_movs_directos` fuera de esta carpeta (sin verificar informes/backup).
- **Triggers / vistas de BD involucrados:** `tbl_movs_directos` (actualizacion_completa.sql:1902); `trg_sync_articulo_update`.
- **Compatibilidad:** `SELECT … FOR UPDATE` (crear.php:61, anular.php:22/:29) no existe en SQLite y no lo reescribe `ContaSqlitePDO::rewrite` (db_factory.php:168-189) ⇒ el módulo completo fallaría en clientes embedded (sin verificar en runtime). `ENUM` en DDL (tipo/Estado) es MySQL-only.

## Qué se rompe si lo tocas
- Si quitas el `FOR UPDATE` para compatibilidad SQLite, el UPDATE ABS (:108) pasa a sufrir lost update como compras.
- Si cambias el formato "MD-xxxxxx" del Detalle, se pierde el enlace kardex↔movimiento (no hay FK, sólo texto).
- Kardex usa `Fecha = $fecha` del usuario (:142, :151) pero `Cant_Saldo` = saldo actual: retrofechar deja un saldo corrido inconsistente al ordenar por Fecha (Kardex.tsx ordena por `Id_kardex`, kardex.php:52, así que en pantalla no se nota).

## Evaluación de la implementación
**Confirmado:** transacción + bloqueo de fila + reverso inmutable: es el patrón de referencia para los demás módulos. `Cost_Ent/Cost_Sal` usa costo con IVA (comentario :136-137 lo admite), distinto de compras (sin IVA). Servicios no se excluyen. Motivos `traslado`/`traslado_salida` (:118, :126) mueven stock sin relación con `bodegas/` (que no mueve stock).
**Sospecha:** incompatibilidad SQLite (ver arriba).
