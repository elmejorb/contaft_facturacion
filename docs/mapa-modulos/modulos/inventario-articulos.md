# Inventario — Catálogo de artículos (CRUD, categorías, detalle)

**Propósito:** Alta, edición, desactivación/eliminación y consulta del maestro de productos/servicios (`tblarticulos`) y de sus categorías. La edición también funciona, de hecho, como ajuste manual de existencia.
**Pantallas (frontend):**
- `components/InventarioManagement.tsx` — menú Inventario › "Listado de Artículos" (`Dashboard.tsx:671`, vista `inventario`). Lista :196, eliminar :134, desactivar :151, bodegas :174; abre `EditarArticuloModal` (:871) y `DetalleProductoModal` (:881).
- `components/ProductsManagement.tsx:56` — vista `products` (lista, sólo lectura).
- `components/EditarArticuloModal.tsx` — crear/editar (:139-140); opciones :91, etiquetas :94, bodegas :109; abre `ComponentesModal` (:685). También se abre desde `NuevaVenta.tsx:2631`, `NuevaCompra.tsx:1548/1580`, `StockBajo.tsx:616`.
- `components/DetalleProductoModal.tsx:21` — historial de un producto.
- `components/CategoriasManagement.tsx:9` — menú Inventario › "Categorías".
**Endpoints (backend):**
- `inventario/articulos.php` GET (`buscarPor`, `ordenarPor`, `orden`, `estado`, `items`, `bodega`)
- `inventario/crear-articulo.php` POST
- `inventario/actualizar-articulo.php` PUT/POST
- `inventario/eliminar-articulo.php` DELETE `?items=` | POST `action=desactivar`
- `inventario/opciones.php` GET (categorías + proveedores para selects)
- `inventario/categorias.php` GET/POST/PUT/DELETE
- `inventario/detalle-producto.php` GET `items`, `anio`, `mes`
- `inventario/articulos-v2.php` GET y `inventario/proveedores.php` GET — **sin caller en `src/`** (grep vacío); proveedores.php usa columnas `Id_Proveedor`/`Nombres_Proveedor` (:13-15) distintas de las que usa el resto (`CodigoPro`/`RazonSocial`, opciones.php:14) ⇒ probablemente roto (sin verificar).

## Flujos principales

- **Operación:** Listar artículos
- **Pantalla → endpoint:** InventarioManagement.tsx:196 / ProductsManagement.tsx:56 → inventario/articulos.php GET
- **Lee:** `tblArticulos` (:106, con mayúscula), `tblcategoria`, `tblproveedores`, `tbletiquetas`, `tblbodegas` (JOINs condicionales :62-72 vía `conta_tablas_schema`)
- **Escribe:** —
- **Efectos colaterales:** ninguno
- **Transacción:** n.a.
- **Consecutivos:** n.a.
- **Validaciones solo en frontend:** n.a. (whitelist de orden en backend :20-29)

- **Operación:** Crear artículo
- **Pantalla → endpoint:** EditarArticuloModal.tsx:139-140 → inventario/crear-articulo.php POST
- **Lee:** `tblarticulos` (código duplicado :32; `MAX(Items)` :40), `information_schema`/pragma vía `conta_columnas_tabla` (:49)
- **Escribe:** `tblarticulos` INSERT (:110-113); `tblkardex` INSERT si `Existencia>0` (:121-136, C_D=0, "Carga inicial al crear el artículo")
- **Efectos colaterales:** stock (inicial), kardex, `trg_sync_articulo_insert` → `tbl_sync_outbox` (actualizacion_completa.sql:2617)
- **Transacción:** no
- **Consecutivos:** `Items = MAX(Items)+1` sin bloqueo (:40) — dos altas simultáneas chocan en PK (sin verificar si `Items` es PK en todas las BDs)
- **Validaciones solo en frontend:** ninguna relevante; backend valida código+nombre (:26) y código único (:32-37)

- **Operación:** Editar artículo (incluye existencia)
- **Pantalla → endpoint:** EditarArticuloModal.tsx:139-140 (PUT con todo `form`) → inventario/actualizar-articulo.php
- **Lee:** `tblarticulos` Existencia/Precio_Costo actuales (:32-34)
- **Escribe:** `tblarticulos` UPDATE de ~17 campos incl. `Existencia` y `Servicio` (:59-128); `tblkardex` INSERT de la diferencia (:142-159, C_D=0, "Ajuste manual (suma|resta)")
- **Efectos colaterales:** stock ABS, kardex, outbox
- **Transacción:** no (UPDATE y kardex separados; si falla el kardex queda stock sin rastro)
- **Consecutivos:** n.a.
- **Validaciones solo en frontend:** ninguna en backend: no exige permiso ni autorización para cambiar existencia; no valida `Codigo` único al editar (sólo en crear)

- **Operación:** Eliminar / desactivar
- **Pantalla → endpoint:** InventarioManagement.tsx:134 (DELETE) y :151 (POST desactivar) → inventario/eliminar-articulo.php
- **Lee:** `tbldetalle_venta` (:69), `tbldetalle_pedido` (:75), `tblkardex` (:83), `tblproductos_lotes` (:92)
- **Escribe:** `tblarticulos` DELETE (:110) o UPDATE `Estado=0` (:52)
- **Efectos colaterales:** outbox (trigger update; DELETE no tiene trigger ⇒ el hub no se entera del borrado — sin verificar el worker)
- **Transacción:** no
- **Consecutivos:** n.a.
- **Validaciones solo en frontend:** n.a. — **Falta** chequear `detalle_document_electronic` (FE desde v4.6), `tblproducto_componentes`, `tblfamilia_items`, `tbl_movs_directos`, `tblnotas_articulo`, `tbl_detalle_orden_compra`: un artículo vendido sólo por FE y sin kardex (p.ej. servicio) puede borrarse dejando FE huérfanas.

- **Operación:** Categorías CRUD
- **Pantalla → endpoint:** CategoriasManagement.tsx → inventario/categorias.php
- **Lee/Escribe:** `tblcategoria` (INSERT :49 con `MAX+1` :46, UPDATE :65, DELETE :89)
- **Efectos colaterales:** ninguno
- **Transacción:** no
- **Consecutivos:** `MAX(Id_Categoria)+1` sin bloqueo (:46)
- **Validaciones solo en frontend:** DELETE sólo bloquea si hay artículos **activos** (:78) ⇒ artículos inactivos quedan con categoría huérfana (luego se muestran como 'VARIOS', articulos.php:85)

- **Operación:** Detalle de producto
- **Pantalla → endpoint:** DetalleProductoModal.tsx:21 → inventario/detalle-producto.php GET
- **Lee:** `tblarticulos`, `tblcategoria`, `tblproveedores` (:20), `tbldetalle_pedido`+`tblpedidos` (:27-31), `tbldetalle_venta`+`tblventas` (:41-114), `tbldevolucion_ventas` (:59)
- **Escribe:** —
- **Efectos colaterales:** —; **no lee FE** (`detalle_document_electronic`) ⇒ desde v4.6 el historial de ventas del producto omite las FE.

## Dependencias
- **Usa de otros módulos:** `config/helpers_polyfill.php` (`conta_columnas_tabla`, `conta_tiene_tabla`, `conta_tablas_schema`); tablas de bodegas/etiquetas/proveedores/categorías.
- **Lo usan otros módulos:** prácticamente todos leen `tblarticulos` (ventas/nueva.php:50/87, compras, FE, vendedores/push-all.php:136, sync-catalogos.php:28, dashboard, informes). `EditarArticuloModal` es reutilizado por ventas, compras y stock bajo.
- **Triggers / vistas de BD involucrados:** `trg_sync_articulo_insert/update` (actualizacion_completa.sql:2617-2624); vistas de diagnóstico/auditoría/stock bajo/compuestos.
- **Compatibilidad:** detección de columnas en runtime (crear :49-55, actualizar :44-50, articulos :49-72) para BDs sin `actualizacion_completa`. `FROM tblArticulos` (articulos.php:106, articulos-v2.php:16) depende de nombres de tabla case-insensitive (Windows/SQLite OK; MySQL Linux no — sin verificar si existe algún cliente así).

## Qué se rompe si lo tocas
- Si `actualizar-articulo.php` deja de exigir `Existencia` o el modal deja de enviarla, cambia el único camino de "ajuste manual" sin conteo que usan los clientes (el texto "Ajuste manual (suma)" es el "cutoff de confianza" del contrato §2.5).
- Si cambias el formato de `Servicio` (1/0), rompes ventas/nueva.php:539 y EditarArticuloModal.tsx:61; si lo cambias a 'S', **arreglas** enviar.php:947 pero rompes los demás.
- Si cambias los alias del SELECT de articulos.php (`Descripcion`, `Costo`, `Precio1`…, :76-105), se rompen InventarioManagement/ProductsManagement/EditarArticuloModal (mapeo :52-61) y BodegasManagement.tsx:385.
- Si agregas campos obligatorios al INSERT sin la detección de columnas, clientes con BD legacy reciben "error de conexión" (comentario :46-48).

## Evaluación de la implementación
**Confirmado:**
- Edición de artículo sobrescribe la existencia con un valor potencialmente viejo (ver inventario-stock-kardex.md, hallazgo 9) y sin transacción (actualizar-articulo.php:126-159).
- Alta de servicio con existencia > 0 crea kardex (crear-articulo.php:116 no mira `Servicio`). Cambiar un producto a servicio no pone `Existencia` en 0.
- C_D=0 en carga inicial (:125) vs contrato §2.1 (C_D=1, Detalle='Inventario Inicial'): la query 4.6 del contrato no depende de C_D, pero reportes por C_D sí.
- `eliminar-articulo.php` no considera FE ni compuestos/familias (ver arriba).
- Endpoints muertos: `articulos-v2.php`, `inventario/proveedores.php`.
**Sospecha:**
- `Items = MAX+1` sin bloqueo ni transacción (crear-articulo.php:40) con dos PCs creando a la vez.
- Contraste con PROCESOS_SISTEMA.md: cumple "Crear Producto" en esencia (INSERT + kardex si inicial>0) pero con C_D y texto distintos y sin regla de servicio.
