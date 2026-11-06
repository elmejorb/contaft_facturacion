# Notas de Artículo (entradas/salidas por concepto)

**Propósito:** Registrar entradas o salidas de inventario por Daño, Cambio, Vencimiento u Otro (sin compra ni venta), opcionalmente ligadas a un lote, y anularlas con asiento opuesto.
**Pantallas (frontend):** `components/NotasArticulo.tsx` — menú Inventario › "Notas de Artículo" (`Dashboard.tsx:681`): lista :34, anular :49-50, buscar producto :199 (`familias/buscar-producto.php`), crear :223-226. Llama `triggerNotifRefresh` (hook useNotificaciones).
**Endpoints (backend):** `notas-articulo/index.php` — GET (`items`, `desde`, `hasta`), POST `action=crear|anular` (alias `eliminar`, :150-151).

## Flujos principales
- **Operación:** Crear nota
- **Pantalla → endpoint:** NotasArticulo.tsx:223-226 → `crear` (:56-148)
- **Lee:** `tblarticulos` (Existencia, Precio_Costo :71-74); `tblproductos_lotes` con `FOR UPDATE` (:85) si Salida con lote
- **Escribe:** `tblnotas_articulo` INSERT (:95-98); `tblarticulos` `Existencia ± cant` (:103); `tblproductos_lotes` `Cantidad_Actual ±` y Estado agotado/dado_de_baja (:107-120); `tblkardex` INSERT "Nota {Tipo} — {Concepto}…" (:129-139, sin C_D ⇒ 0, sin Fecha)
- **Efectos colaterales:** stock, kardex, lotes, outbox
- **Transacción:** sí :92 / :141, rollback :204. El `FOR UPDATE` del lote (:85) se ejecuta **antes** de `beginTransaction` (en autocommit no bloquea nada)
- **Consecutivos:** `Id_Nota` AUTO_INCREMENT
- **Validaciones solo en frontend:** —; backend valida tipo/concepto/cantidad (:66), stock suficiente en salidas (:79), lote activo y suficiente (:88-89). `Concepto` libre (no se valida contra la lista Daño/Cambio/Vencimiento/Otro, :59)

- **Operación:** Anular nota
- **Pantalla → endpoint:** NotasArticulo.tsx:49-50 → `anular` (:151-200)
- **Lee:** `tblnotas_articulo` (:157)
- **Escribe:** `tblarticulos` signo inverso (:168); `tblproductos_lotes` inverso + `Estado='activo'` (:173); `tblkardex` "REVERSO Nota #N" (:183-190); `tblnotas_articulo` Estado='Anulada', Anulada_Por, Fecha_Anulacion, Motivo (:192-195)
- **Efectos colaterales:** stock, kardex, lotes
- **Transacción:** sí :165 / :197
- **Consecutivos:** n.a.
- **Validaciones solo en frontend:** —. No valida stock suficiente al anular una Entrada (puede dejar negativo).

## Dependencias
- **Usa de otros módulos:** `tblproductos_lotes` (lotes), `tblusuarios` (:40-41).
- **Lo usan otros módulos:** `lotes/index.php:168-171` inserta notas tipo Salida/Vencimiento.
- **Triggers / vistas de BD involucrados:** `tblnotas_articulo` (actualizacion_completa.sql:458; columnas de anulación agregadas :1783-1786), `trg_sync_articulo_update`.
- **Compatibilidad:** `FOR UPDATE` (:85) no soportado por SQLite ni reescrito por `ContaSqlitePDO` ⇒ notas de salida con lote fallarían en embedded (sin verificar).

## Qué se rompe si lo tocas
- El docblock (:12-14) dice "borra del kardex y elimina la nota… solo si fue creada hoy"; el código hace soft-delete + reverso sin restricción de fecha. Quien se guíe por el comentario reintroduce el borrado (viola kardex inmutable).
- Cambiar el texto "REVERSO Nota #" afecta búsquedas de idempotencia en scripts correctivos (contrato §1.4).

## Evaluación de la implementación
**Confirmado:** cumple kardex inmutable (reverso, no DELETE). Kardex sin C_D. Anular reactiva el lote a 'activo' aunque estuviera dado de baja por otra causa (:173). `$signo` interpolado en SQL (:103, :168) proviene de un ternario fijo (`'+'|'-'`) — seguro. Servicios no se excluyen.
**Sospecha:** la validación de stock (:79) y del lote (:85-89) ocurre fuera de transacción ⇒ condición de carrera con ventas concurrentes.
