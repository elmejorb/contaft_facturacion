# Bodegas (ubicación mono-bodega del artículo)

**Propósito:** Catálogo de bodegas y asignación de cada artículo a UNA bodega. El "traslado" mueve el artículo completo (toda su existencia) de bodega; no existe stock por bodega.
**Pantallas (frontend):** `components/BodegasManagement.tsx` — menú Inventario › "Bodegas" (`Dashboard.tsx:672`): lista :65, historial :66, eliminar :90-92, marcar principal :103-105, crear/editar :305-307, buscar producto :376/:385, trasladar :399-402. Selector de bodega en `EditarArticuloModal.tsx:109`, filtro en `InventarioManagement.tsx:174` y `StockBajo.tsx:101`.
**Endpoints (backend):** `bodegas/index.php` — GET (lista), GET `?traslados=1`, POST `action=crear|editar|eliminar|marcar_principal|trasladar`.

## Flujos principales
- **Operación:** Crear / editar bodega
- **Pantalla → endpoint:** BodegasManagement.tsx:305-307 → bodegas/index.php `crear` (:54-71) / `editar` (:73-86)
- **Lee:** —
- **Escribe:** `tblbodegas` INSERT (:61) / UPDATE (:82)
- **Efectos colaterales:** ninguno
- **Transacción:** no
- **Consecutivos:** AUTO_INCREMENT (`lastInsertId` :64); nombre único por índice (manejo de `23000` :66)
- **Validaciones solo en frontend:** —

- **Operación:** Eliminar bodega
- **Pantalla → endpoint:** BodegasManagement.tsx:90 → `eliminar` (:88-102)
- **Lee:** `tblbodegas.Principal` (:92), `COUNT tblarticulos WHERE Id_Bodega` (:96)
- **Escribe:** `tblbodegas` DELETE (:99)
- **Transacción:** no. **Consecutivos:** n.a. **Validaciones solo en frontend:** —

- **Operación:** Marcar principal → `marcar_principal` (:104-113): `UPDATE tblbodegas SET Principal=0` + `Principal=1, Activa=1` en transacción :107/:110.

- **Operación:** Trasladar producto
- **Pantalla → endpoint:** BodegasManagement.tsx:399-402 → `trasladar` (:115-149)
- **Lee:** `tblarticulos` (Existencia, Id_Bodega :123), `tblbodegas` destino (:129)
- **Escribe:** `tblarticulos.Id_Bodega` UPDATE (:135); `tbl_traslados_bodega` INSERT con `Cantidad = Existencia` (:136-140)
- **Efectos colaterales:** NO toca Existencia ni kardex; dispara `trg_sync_articulo_update` (outbox)
- **Transacción:** sí :134 / :141
- **Consecutivos:** AUTO_INCREMENT de `tbl_traslados_bodega`
- **Validaciones solo en frontend:** —

## Dependencias
- **Usa de otros módulos:** `tblarticulos`, `tblusuarios` (historial :31).
- **Lo usan otros módulos:** inventario/articulos.php:69-72, familias/stock-bajo.php:53/:94-97 (filtro por bodega), crear/actualizar-articulo (`Id_Bodega`, :104-107 / :120-123). Ventas, compras y kardex **no** usan bodega (grep de `Id_Bodega` sin coincidencias en ventas/compras).
- **Triggers / vistas de BD involucrados:** `tblbodegas` (actualizacion_completa.sql:1995), seed id=1 (:2007-2008), columna `tblarticulos.Id_Bodega` DEFAULT 1 (:2016-2021), `tbl_traslados_bodega` (:2033). Migración de etiquetas (:566-590) renombra `tblbodegas→tbletiquetas` si existe `tblbodegas` y NO existe `tbletiquetas`, y `tblarticulos.Id_Bodega→Id_Etiqueta` si no existe `Id_Etiqueta`.
- **Compatibilidad:** SQL estándar; `$db->query()` con interpolación de enteros (:92, :96, :123, :129) — seguro por `intval`.

## Qué se rompe si lo tocas
- Si conviertes bodegas en multi-stock (stock por bodega), hay que tocar los 27 puntos de escritura de inventario-stock-kardex.md y `tblkardex` (sin columna bodega, template :2111-2127).
- Si una BD tiene `tblbodegas` (real, v4.8) pero no `tbletiquetas` (p.ej. se borró), re-ejecutar `actualizacion_completa.sql` renombra la tabla de bodegas a etiquetas y la columna `Id_Bodega` a `Id_Etiqueta` (:571, :589) — luego :2016 vuelve a crear `Id_Bodega` = 1 para todos ⇒ se pierde la asignación de bodegas.

## Evaluación de la implementación
**Confirmado:** modelo mono-bodega consistente consigo mismo (comentario en migración :2020 "modelo mono-bodega"). El traslado registra `Cantidad` sólo informativa; no hay reverso de traslado. Eliminar no tiene transacción pero es una sola sentencia.
**Sospecha:** el nombre "traslado entre bodegas" también existe como motivo de movs-directos (`traslado`/`traslado_salida`, movs-directos/crear.php:118/:126) que sí mueve stock — dos conceptos distintos con el mismo nombre confunden al usuario.
