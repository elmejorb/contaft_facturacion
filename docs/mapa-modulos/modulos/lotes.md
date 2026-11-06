# Lotes y vencimientos

**Propósito:** Etiquetar parte de la existencia de un producto con número de lote y fecha de vencimiento, alertar lo próximo a vencer y dar de baja lo vencido (con salida de inventario y kardex). Es una capa informativa paralela: la existencia real sigue en `tblarticulos.Existencia`.
**Pantallas (frontend):**
- `components/LotesPorVencer.tsx` — menú Inventario › "Productos por Vencer" (`Dashboard.tsx:682`): lista :76, dar de baja :233-235, stock disponible :323, crear lote manual :340-343, buscar producto :313.
- `components/NuevaCompra.tsx:693-712` — tras guardar una compra crea un lote por cada línea con `RequiereLote` y fecha (llamada POST separada, después del commit de la compra).
- `components/NotasArticulo.tsx` — notas con `id_lote` (ver notas-articulo.md).
- `hooks/useNotificaciones.ts:44` — `?por_vencer=1` cada 5 min (:71) para la campana; `triggerNotifRefresh` (:17) lo llama LotesPorVencer.
**Endpoints (backend):** `lotes/index.php` — GET (todos), GET `?items=`, GET `?por_vencer=1[&dias=N]`, GET `?stock_disponible=ITEMS`, POST `action=crear|dar_de_baja`.

## Flujos principales
- **Operación:** Consultar lotes / por vencer
- **Pantalla → endpoint:** LotesPorVencer.tsx:76, useNotificaciones.ts:44 → GET (:24-85)
- **Lee:** `vw_lotes_por_vencer` (:64, :82), `tblproductos_lotes`+`tblarticulos` (:48-56), suma de lotes activos (:35)
- **Escribe:** —
- **Efectos colaterales:** ninguno. `?dias` se interpola en SQL (`WHERE dias_restantes <= $dias`, :63) — seguro por `intval` (:27).

- **Operación:** Crear lote
- **Pantalla → endpoint:** LotesPorVencer.tsx:340 / NuevaCompra.tsx:699 → `crear` (:90-136)
- **Lee:** `tblarticulos.Existencia` y `SUM(Cantidad_Actual)` de lotes activos (:108-118), sólo si NO viene `pedido_n` (:99)
- **Escribe:** `tblproductos_lotes` INSERT (:129-132)
- **Efectos colaterales:** ninguno sobre stock (docblock :11: "la existencia se actualiza por la compra normal")
- **Transacción:** no
- **Consecutivos:** AUTO_INCREMENT
- **Validaciones solo en frontend:** desde compra, la validación "lotes ≤ existencia" se salta (:99) — se confía en el front.

- **Operación:** Dar de baja por vencimiento
- **Pantalla → endpoint:** LotesPorVencer.tsx:233-235 → `dar_de_baja` (:138-204)
- **Lee:** lote + `Precio_Costo` (:149-156)
- **Escribe:** `tblnotas_articulo` INSERT Salida/Vencimiento (:168-171); `tblproductos_lotes` UPDATE Cantidad_Actual (:174) y Estado='dado_de_baja' si llega a 0 (:180); `tblarticulos` `Existencia - cant` (:184); `tblkardex` INSERT "Baja por Vencimiento — Lote X" (:193-196, sin `C_D` ⇒ 0, sin `Fecha` ⇒ default)
- **Efectos colaterales:** stock, kardex, outbox; docblock :15 "NO afecta gastos ni utilidad"
- **Transacción:** sí :164 / :198, rollback :208 — pero las validaciones de estado/cantidad (:157-162) están **antes** de la transacción y sin bloqueo
- **Consecutivos:** `Id_Nota` AUTO_INCREMENT
- **Validaciones solo en frontend:** —

## Dependencias
- **Usa de otros módulos:** `tblnotas_articulo` (notas-articulo), `tblarticulos`, `tblkardex`.
- **Lo usan otros módulos:** `notas-articulo/index.php` (descuenta/repone lotes :84-90, :107-120, :171-175), `inventario/eliminar-articulo.php:90-96` (bloquea borrar si hay lotes). **No lo usan** ventas (POS/FE), devoluciones, anulaciones, conteo ni movs-directos (grep `tblproductos_lotes` → sólo 3 archivos).
- **Triggers / vistas de BD involucrados:** `tblproductos_lotes` (actualizacion_completa.sql:474), `requiere_lote` (:492), `vw_lotes_por_vencer` (:499).
- **Compatibilidad:** `DATEDIFF` (:50 y vista :503) emulado en SQLite (db_factory.php:265).

## Qué se rompe si lo tocas
- Si haces que ventas consuman lotes (FIFO), hay que cambiar también devoluciones/anulaciones/NC para reponerlos y la validación de `crear` (:113-120) que asume lotes ≤ existencia.
- Cambiar los estados del ENUM (`activo|agotado|dado_de_baja`) rompe la vista (:508 filtra `activo`) y notas-articulo.php:116.

## Evaluación de la implementación
**Confirmado:**
- Las ventas no descuentan lotes ⇒ `Cantidad_Actual` sólo baja por bajas/notas; con el tiempo `SUM(lotes activos)` > `Existencia` y `stock_disponible` (:42) da negativo; la alerta de "por vencer" sigue mostrando unidades ya vendidas.
- Lotes de compra se crean en una petición separada después de la compra (NuevaCompra.tsx:693-712): si falla, la compra queda sin lote (el front sólo cuenta `failLotes`). Anular la compra no anula sus lotes (compras/anular.php no referencia `tblproductos_lotes`).
- Kardex con C_D=0 y sin Fecha explícita (:194).
**Sospecha:** doble clic en "dar de baja" puede pasar ambas validaciones (:159) antes de la transacción y bajar dos veces (no hay `FOR UPDATE`).
