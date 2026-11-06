# Productos compuestos / Recetas (BOM)

**Propósito:** Definir que un artículo "padre" se arma con N unidades de otros artículos "componentes". Al venderlo por POS se descuentan los componentes en vez del padre.
**Pantallas (frontend):** `components/ComponentesModal.tsx` (abierto desde `EditarArticuloModal.tsx:685`): listar :28, eliminar :43-44, recalcular costo :54-55, buscar producto :188 (`familias/buscar-producto.php`), agregar :201-203.
**Endpoints (backend):** `componentes/index.php` — GET `?items=N`, GET `?listar=1`, POST `action=agregar|eliminar|actualizar|recalcular_costo`.

## Flujos principales
- **Operación:** Ver receta / capacidad
- **Pantalla → endpoint:** ComponentesModal.tsx:28 → GET `?items` (:31-46) | GET `?listar=1` (:25-29, sin caller en `src/` — grep sólo encuentra `?items`)
- **Lee:** `vw_componentes_detalle` (:34), `vw_capacidad_compuestos` (:26)
- **Escribe:** —

- **Operación:** Agregar / actualizar componente
- **Pantalla → endpoint:** ComponentesModal.tsx:201-203 → `agregar` (:52-84); `actualizar` (:110-122, sin caller en `src/`)
- **Lee:** `tblproducto_componentes` (detección de ciclo de 1 nivel :66-70)
- **Escribe:** `tblproducto_componentes` INSERT … `ON DUPLICATE KEY UPDATE` (:73-77); `tblarticulos.tiene_componentes = 1` (:80)
- **Efectos colaterales:** outbox (trigger update de tblarticulos)
- **Transacción:** no
- **Consecutivos:** AUTO_INCREMENT; unicidad `uk_padre_componente` (actualizacion_completa.sql:521)
- **Validaciones solo en frontend:** —

- **Operación:** Eliminar componente → `eliminar` (:86-108): DELETE (:97) y, si quedan 0, `tiene_componentes=0` (:103). Sin transacción.

- **Operación:** Recalcular costo del padre
- **Pantalla → endpoint:** ComponentesModal.tsx:54 → `recalcular_costo` (:124-145)
- **Lee:** `SUM(Cantidad * Precio_Costo)` de componentes (:128-133)
- **Escribe:** `tblarticulos.Precio_Costo` del padre (:137)
- **Efectos colaterales:** cambia COGS de ventas futuras del padre; no kardex (no es movimiento de cantidad)
- **Transacción:** no

- **Operación (consumo, en ventas):** ventas/nueva.php:581-633 lee `tiene_componentes` y `tblproducto_componentes`; descuenta cada componente (:606) con kardex "Consumo por venta de …" (:614) y deja una fila kardex informativa del padre con cantidad 0 (:629).

## Dependencias
- **Usa de otros módulos:** `familias/buscar-producto.php` para buscar (ComponentesModal.tsx:7).
- **Lo usan otros módulos:** **sólo** `ventas/nueva.php` (grep `tblproducto_componentes|tiene_componentes` → componentes/index.php y ventas/nueva.php). NO lo usan: FE (`facturacion-electronica/enviar.php`), NC, anulación/devolución POS (`ventas/detalle-factura.php`), `ventas/marcar-entregado.php`, `vendedores/pedidos.php`, conteo, eliminar-articulo.
- **Triggers / vistas de BD involucrados:** `tblproducto_componentes` (actualizacion_completa.sql:514), `tiene_componentes` (:525-531), `vw_componentes_detalle` (:536), `vw_capacidad_compuestos` (:551).
- **Compatibilidad:** `ON DUPLICATE KEY UPDATE … VALUES()` (:76) es MySQL-only y no lo reescribe `ContaSqlitePDO` (db_factory.php:168-189) ⇒ en SQLite embedded `agregar` falla (sin verificar en runtime).

## Qué se rompe si lo tocas
- Si cambias `tiene_componentes` (flag) por "existe fila en tblproducto_componentes", ventas/nueva.php:588 deja de reconocer el compuesto.
- Si eliminas un componente de una receta usada en ventas ya hechas, las anulaciones futuras no se ven afectadas (no usan la receta) — el problema ya existe: nunca reponen componentes.
- `recalcular_costo` sobreescribe `Precio_Costo`; la siguiente compra del padre (si se compra) lo vuelve a pisar (compras/nueva.php:794).

## Evaluación de la implementación
**Confirmado:**
- Asimetría grave: sólo la venta POS consume componentes; la venta FE descuenta el padre (enviar.php:948), y anulación/devolución/NC reponen el padre (detalle-factura.php:296/:478, enviar.php:1291). Un ciclo venta POS + anulación deja componentes −N y padre +N.
- La detección de ciclos es de un nivel (:66-70); A→B→C→A no se detecta. El consumo en ventas/nueva.php no es recursivo (un componente compuesto se descuenta como simple).
- Componentes que sean servicios igual se descuentan (ventas/nueva.php:601-606 no mira `Servicio`).
- Sin transacciones en el CRUD (inofensivo salvo `eliminar`+desmarcar).
**Sospecha:** la fila kardex informativa del padre con `Cant_Sal=0` (:629-636) usa C_D=2 y suma 0; inocua para la query 4.6 pero cuenta como "venta" en reportes que cuenten filas.
