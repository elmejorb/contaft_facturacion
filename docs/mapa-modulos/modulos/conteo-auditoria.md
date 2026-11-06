# Conteo físico, Auditoría (90d) y Diagnóstico (30d) de inventario

**Propósito:** (1) Conteo físico: congelar un snapshot de existencias, capturar lo contado y, al cerrar, ajustar `Existencia` y kardex por diferencias. (2) Auditoría/Diagnóstico: reportes de rotación, margen y capital inmovilizado (sólo lectura).
**Pantallas (frontend):**
- `components/ConteoInventario.tsx` — menú Inventario › "Conteo de Inventario" (`Dashboard.tsx:680`). Listar :227, detalle :237, opciones :251, crear :265-270, guardar :302-306 y :356-359, cerrar :389-392, cancelar :411-414. Impresión: `components/ImpresionConteo.tsx` (sin llamadas a API).
- `components/AuditoriaInventario.tsx:85` — "Auditoría (90 días)".
- `components/DiagnosticoInventario.tsx:75` — "Diagnóstico (30 días)".
**Endpoints (backend):** `inventario/conteo.php` (GET, GET `?id=`, POST `action=crear|guardar|cerrar|cancelar`); `auditoria/inventario-90d.php` GET; `diagnostico/inventario-30d.php` GET.

## Flujos principales

- **Operación:** Crear conteo
- **Pantalla → endpoint:** ConteoInventario.tsx:265-270 → conteo.php `crear`
- **Lee:** `tblconteo_inventario` (abierto existente :117), `tblarticulos` (`Estado=1` + filtros categoría/proveedor :145-154)
- **Escribe:** `tblconteo_inventario` INSERT (:131-141); `tblconteo_detalle` INSERT…SELECT con `Existencia_Sistema = a.Existencia` (:156-162); UPDATE `Total_Items` (:166)
- **Efectos colaterales:** ninguno sobre stock
- **Transacción:** sí :128 / :169 (pero el chequeo de "ya hay conteo abierto" :117 está **fuera** de la transacción)
- **Consecutivos:** `Id_Conteo` AUTO_INCREMENT (`lastInsertId` :142)
- **Validaciones solo en frontend:** `usuario` llega fijo `'admin'` desde ConteoInventario.tsx:265 (el backend lo acepta sin validar, :110)

- **Operación:** Guardar cantidades contadas
- **Pantalla → endpoint:** ConteoInventario.tsx:302 / :356 → conteo.php `guardar`
- **Lee:** `tblconteo_inventario.Estado` (:190)
- **Escribe:** `tblconteo_detalle` UPDATE `Existencia_Contada`, `Diferencia` (:201-217); `tblconteo_inventario` contadores (:221-227)
- **Efectos colaterales:** ninguno
- **Transacción:** sí :199 / :229
- **Consecutivos:** n.a.
- **Validaciones solo en frontend:** —

- **Operación:** Cerrar conteo (ajuste)
- **Pantalla → endpoint:** ConteoInventario.tsx:389-392 → conteo.php `cerrar`
- **Lee:** `tblconteo_detalle` + `tblarticulos.Precio_Costo` (:257-265); ventas POS durante el conteo `tbldetalle_venta`+`tblventas` con `v.Fecha >= Fecha_conteo` (:268-273)
- **Escribe:** `tblconteo_detalle` UPDATE `Diferencia` real (:291-320); `tblkardex` INSERT C_D=1 sobrante / C_D=2 faltante, Detalle "AJUSTE INV - Conteo #N …" (:283-360); `tblarticulos` UPDATE `Existencia = contado` (:288, :363); `tblconteo_inventario` Estado='Cerrado' (:368-375)
- **Efectos colaterales:** stock ABS, kardex, outbox (trigger)
- **Transacción:** sí :252 / :377, rollback en catch :411
- **Consecutivos:** n.a.
- **Validaciones solo en frontend:** confirmación de cierre (sin verificar texto)

- **Operación:** Cancelar conteo → conteo.php `cancelar` (:386-400): UPDATE Estado='Cancelado' sin transacción; no toca stock.

- **Operación:** Auditoría 90d / Diagnóstico 30d
- **Pantalla → endpoint:** AuditoriaInventario.tsx:85 → auditoria/inventario-90d.php (:12 `SELECT * FROM vw_auditoria_inventario_90d`); DiagnosticoInventario.tsx:75 → diagnostico/inventario-30d.php (:14 `vw_diagnostico_inventario_30d`)
- **Lee:** vistas → `tblarticulos`, `tbldetalle_venta`, `tblventas`, `tblcategoria`, `tblproveedores`
- **Escribe:** —
- **Efectos colaterales / Transacción / Consecutivos:** n.a.

## Dependencias
- **Usa de otros módulos:** tablas de ventas POS (`tbldetalle_venta`, `tblventas`) para la compensación.
- **Lo usan otros módulos:** ninguno lee `tblconteo_*` fuera de conteo.php (sin verificar informes).
- **Triggers / vistas de BD involucrados:** `vw_item_ventas_30d` (actualizacion_completa.sql:217), `vw_diagnostico_inventario_30d` (:230), `vw_item_ventas_90d` (:257), `vw_auditoria_inventario_90d` (:272); `trg_sync_articulo_update` (:2622). Tabla `tblconteo_inventario` (:54).
- **Compatibilidad:** las vistas usan `DATE_SUB(CURDATE(), INTERVAL …)`; en SQLite las vistas no pasan por `ContaSqlitePDO::rewrite` cuando se crean fuera de PHP (sin verificar cómo se crean en embedded).

## Qué se rompe si lo tocas
- Cambiar el texto "AJUSTE INV - Conteo #" afecta la trazabilidad usada como "cutoff de confianza" (PROCESOS_SISTEMA.md §2.5) por scripts correctivos.
- Cambiar `Existencia_Sistema` a algo distinto del snapshot rompe la compensación `esperado = snapshot - vendido` (:308).
- Cambiar las vistas `vw_item_ventas_*` cambia simultáneamente Auditoría y Diagnóstico.

## Evaluación de la implementación
**Confirmado:**
- La compensación sólo resta ventas POS (`tbldetalle_venta`, :268-273): no filtra `EstadoFact` (anuladas cuentan como vendidas), no incluye FE (`detalle_document_electronic`), ni compras, devoluciones, notas, movs directos o distribuciones ocurridos durante el conteo. Al cerrar se fija `Existencia = contado` (:363), así que cualquiera de esos movimientos intermedios se **borra** del stock, mientras su fila de kardex sigue existiendo ⇒ kardex y Existencia divergen.
- `tblventas.Fecha` es `date` (conta_template_limpio.sql:639) y `Fecha` del conteo es timestamp: `v.Fecha >= :fecha` excluye las ventas del mismo día del inicio del conteo (`'2026-11-06' >= '2026-11-06 10:00'` es falso) ⇒ ventas del día de apertura no se compensan.
- Servicios entran al conteo (sólo filtra `Estado=1`, :145).
- Vistas de auditoría/diagnóstico: cuentan ventas anuladas (no filtran `EstadoFact`, actualizacion_completa.sql:217-226, :257-267) y no cuentan FE (desde v4.6 las FE no están en `tbldetalle_venta`, PROCESOS_SISTEMA.md §2.2) ⇒ subestiman rotación en clientes que facturan electrónicamente.
**Sospecha:**
- Conteos concurrentes: el chequeo de conteo abierto (:117) está fuera de transacción y sin bloqueo.
