# Familias de producto, Distribución (romper empaques), Stock bajo y Etiquetas

**Propósito:** (1) Familias: agrupar presentaciones del mismo producto con un factor (caja=24, unidad=1) para "romper" unidades mayores automáticamente al vender o manualmente. (2) Stock bajo: alertar artículos bajo su mínimo. (3) Etiquetas: clasificación libre de productos (Insumos, Producto Terminado, Reventa).
**Pantallas (frontend):**
- `components/FamiliasProducto.tsx` — Inventario › "Familias de Productos" (`Dashboard.tsx:675`): listar :45, guardar :65, eliminar :78, detalle :86, remover item :95, editar item :258-260, buscar :377, agregar item :389-391.
- `components/DistribuirProductos.tsx` — Inventario › "Distribuir Productos" (`Dashboard.tsx:676`): buscar :31, hermanos :44, distribución manual :64-66, historial :80.
- `components/NuevaVenta.tsx:1271-1300` — `verificar` (:1276-1278) y `aplicar` (:1288-1290) antes de guardar la venta, sólo si `cfg.usarFamilias` (:1273); usado en :1331 y :2768.
- `components/StockBajo.tsx:90` (Inventario › "Stock Bajo", `Dashboard.tsx:677`), `hooks/useStockBajoCount.ts:13` (badge del menú cada 5 min, :19), `hooks/useNotificaciones.ts:45`.
- `components/ConfigEtiquetas.tsx` — Inventario › "Etiquetas" (`Dashboard.tsx:673`): listar :31, eliminar :43-44, crear/editar :153; selector en `EditarArticuloModal.tsx:94`.
**Endpoints (backend):** `familias/listar.php` GET (`items`|`id`|`search`); `familias/guardar.php` POST `action=crear|editar|eliminar|agregar_item|editar_item|remover_item`; `familias/distribuir.php` GET `?items=`, POST `action=verificar|aplicar|manual`; `familias/movimientos.php` GET; `familias/buscar-producto.php` GET `q`, `exclude_familia` (buscador genérico usado también por componentes, lotes, notas, bodegas); `familias/stock-bajo.php` GET `?bodega=`; `etiquetas/index.php` GET `[?todas]`, POST `action=crear|editar|eliminar`.

## Flujos principales
- **Operación:** CRUD de familias e ítems
- **Pantalla → endpoint:** FamiliasProducto.tsx:65/:78/:95/:258/:389 → guardar.php
- **Lee:** `tblfamilia_items`+`tblfamilias_producto` (producto ya en otra familia :57)
- **Escribe:** `tblfamilias_producto` INSERT/UPDATE/DELETE (:23/:35/:44 — docblock :7 "CASCADE borra items"); `tblfamilia_items` INSERT/UPDATE/DELETE (:70/:92/:102), `Es_Base=0` para el resto (:68/:90)
- **Efectos colaterales:** ninguno sobre stock
- **Transacción:** sólo agregar_item (:65/:72) y editar_item (:88/:94)
- **Consecutivos:** AUTO_INCREMENT
- **Validaciones solo en frontend:** factor > 0 (sin verificar en backend)

- **Operación:** Distribución automática al vender
- **Pantalla → endpoint:** NuevaVenta.tsx:1288 → distribuir.php `aplicar` (:286-302)
- **Lee:** `tblfamilia_items`, `tblarticulos.Existencia` (planificar :95-172, buscarDonante :30-87)
- **Escribe:** por cada distribución: `tblarticulos` origen `Existencia - x` (:191-192), destino `Existencia = ABS, Precio_Costo = promedio` (:200-201); `tblmovimientos_distribucion` INSERT (:204-214); `tblkardex` salida (:219-227) y entrada (:230-238), sin C_D ni Fecha
- **Efectos colaterales:** stock (dos artículos), costo del destino, kardex, outbox
- **Transacción:** sí :295 / :299 — pero es una petición HTTP **separada y anterior** a `ventas/nueva.php` (NuevaVenta.tsx:1331 → luego :1616): si la venta falla, la distribución queda aplicada
- **Consecutivos:** n.a.
- **Validaciones solo en frontend:** el front no envía `factura_n` (NuevaVenta.tsx:1290) ⇒ `tblmovimientos_distribucion.Factura_N` siempre NULL y el Detalle de kardex nunca incluye "(Factura N)" (:218)

- **Operación:** Distribución manual
- **Pantalla → endpoint:** DistribuirProductos.tsx:64-66 → `manual` (:304-351)
- **Lee:** ambos ítems en la misma familia y factor origen > destino (:316-329), existencia origen (:330)
- **Escribe:** igual que la automática (aplicarDistribucion :174-239)
- **Transacción:** sí :334 / :343
- **Validaciones solo en frontend:** —

- **Operación:** Stock bajo
- **Pantalla → endpoint:** StockBajo.tsx:90, useStockBajoCount.ts:13, useNotificaciones.ts:45 → stock-bajo.php
- **Lee:** `tblarticulos` + familias/etiquetas/proveedores/bodegas (:83-91), filtro `Estado=1 AND Existencia_minima>0 AND Existencia<Existencia_minima` (:88-90)
- **Escribe:** —

- **Operación:** Etiquetas CRUD
- **Pantalla → endpoint:** ConfigEtiquetas.tsx:153 / :43 → etiquetas/index.php
- **Escribe:** `tbletiquetas` INSERT (:43) / UPDATE (:63) / DELETE (:86, sólo si no hay artículos :78)
- **Transacción:** no

## Dependencias
- **Usa de otros módulos:** `tblarticulos`, `tblkardex`.
- **Lo usan otros módulos:** `buscar-producto.php` es el buscador de ComponentesModal.tsx:7, LotesPorVencer.tsx:28, NotasArticulo.tsx:13, BodegasManagement.tsx:376. `tbletiquetas` lo leen inventario/articulos.php:64-66 y stock-bajo.php:47. Ventas depende de `distribuir.php` cuando `usarFamilias`.
- **Triggers / vistas de BD involucrados:** `tblfamilias_producto` (actualizacion_completa.sql:319), `tblfamilia_items` (:328), `tblmovimientos_distribucion` (:339), `vw_productos_stock_bajo` (:361, no usada por stock-bajo.php que arma su propio SELECT), `tbletiquetas` (:593) + seed (:618-621), migración rename bodegas→etiquetas (:566-590).
- **Compatibilidad:** SQL estándar.

## Qué se rompe si lo tocas
- Si cambias la respuesta de `verificar` (`ok`, `distribuciones`, `faltantes`), NuevaVenta.tsx:1320 deja de mostrar "Stock insuficiente".
- `buscar-producto.php` es compartido: cambiar su forma de respuesta rompe 5 pantallas.
- Si stock-bajo.php filtra servicios o bodegas distinto, cambia el badge del menú (Dashboard.tsx:677) y la campana.

## Evaluación de la implementación
**Confirmado:**
- Distribución y venta no son atómicas (dos requests, ver arriba). Distribución + venta concurrente desde otra PC: `planificar` lee existencia sin bloqueo (:109-111) y `aplicarDistribucion` escribe el destino en ABS (:200) ⇒ lost update.
- `Factura_N` de distribución automática nunca se guarda (front no lo envía).
- `planificar` asume `Cantidad` en unidad base; si la línea se vende como empaque (`VenderComoEmpaque`) el cálculo podría ser incorrecto (sin verificar cómo NuevaVenta envía cantidades de empaque).
- Kardex sin C_D (=0) para movimientos que sí son entrada/salida.
- `categorías`/`etiquetas`: etiquetas eliminar sí valida productos asignados (:78), categorías sólo activos (categorias.php:78).
**Sospecha:** `buscarDonante` sólo combina un donante; si hacen falta dos presentaciones mayores reporta faltante aunque haya stock total suficiente (:67-86).
