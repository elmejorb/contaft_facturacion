# Capa BD — Triggers, vistas y rutinas

**Propósito:** catálogo exacto de los triggers y vistas que crea `conta-app-backend/sql/actualizacion_completa.sql` (2685 líneas, leído completo), quién los consume y cómo difieren en SQLite (embedded). Es la referencia para que otros módulos sepan qué lógica vive "escondida" en la BD (encolado de sincronización, corrección de `TipoPago`, cálculo de saldos de cartera/CxP, diagnósticos de inventario).
**Pantallas (frontend):** N/A (capa BD). Consumidores indirectos vía endpoints: `components/CuentasPorCobrar.tsx`, `components/ClienteDetalle.tsx`, `components/NuevaVenta.tsx` (info-crédito), `components/ProveedoresManagement.tsx`, `components/DiagnosticoInventario.tsx`, `components/AuditoriaInventario.tsx`, `components/ComponentesModal.tsx`, `components/NuevaCompra.tsx` + `hooks/useNotificaciones.ts` (lotes), `components/PanelSugerencias.tsx` / `NotificacionEmergente.tsx` (sugerencias), `components/IncomeOverview.tsx` (dashboard), `components/VentasPorTipoPago.tsx`, `components/informes/*` (informes/resumen.php). El worker `Dashboard-Facturación/electron/sincroWorker.js` es el único lector de `tbl_sync_outbox`.
**Endpoints (backend):** no expone endpoints propios. Aplicadores de SQL en runtime: `api/actualizacion/aplicar-sql.php` (POST, en cada login desde `src/contexts/AuthContext.tsx:75`), `api/mantenimiento/ejecutar-sql.php` (GET `?listar=1` / POST `{script}` desde `src/components/MantenimientoBD.tsx:6`), `api/migraciones/aplicar.php` (POST hotfix remoto desde `src/hooks/useAutoHotfixes.ts:32`).

Conteo en `actualizacion_completa.sql`: **15 triggers** (14 `trg_sync_*` + `trg_egresos_tipopago_sync`), **15 vistas**, **0 procedures / functions / events** (grep de `CREATE PROCEDURE|FUNCTION|EVENT` sin resultados en ese archivo). Ningún `CREATE` lleva cláusula `DEFINER` ni `SQL SECURITY` explícita.

---

## Catálogo de triggers (MySQL)

Todos son de una sola sentencia, sin `BEGIN…END` ni `DELIMITER` (justificado en `actualizacion_completa.sql:2546-2547`: "DELIMITER no funciona con `mysql < archivo.sql` en Windows"). Todos van precedidos de `DROP TRIGGER IF EXISTS` (idempotentes). DEFINER: ninguno explícito → MySQL asigna `CURRENT_USER` de la sesión que ejecuta el script (comportamiento estándar de MySQL, sin verificar en BD).

| Trigger | Tabla | Momento/evento | Qué hace (escribe) | archivo:línea | Idempotente | DEFINER |
|---|---|---|---|---|---|---|
| trg_sync_venta_insert | tblventas | AFTER INSERT | `INSERT INTO tbl_sync_outbox (Entidad, Id_Entidad, Operacion) VALUES ('venta', NEW.Factura_N, 'upsert')` | actualizacion_completa.sql:2550-2553 | sí (DROP IF EXISTS :2550) | no |
| trg_sync_venta_update | tblventas | AFTER UPDATE | igual, `Operacion = IF(NEW.EstadoFact='Anulada','anular','upsert')` | :2555-2558 | sí | no |
| trg_sync_cliente_insert | tblclientes | AFTER INSERT | outbox `('cliente', NEW.CodigoClien, 'upsert')` | :2561-2564 | sí | no |
| trg_sync_cliente_update | tblclientes | AFTER UPDATE | outbox `('cliente', NEW.CodigoClien, 'upsert')` | :2566-2569 | sí | no |
| trg_sync_proveedor_insert | tblproveedores | AFTER INSERT | outbox `('proveedor', NEW.CodigoPro, 'upsert')` | :2572-2575 | sí | no |
| trg_sync_proveedor_update | tblproveedores | AFTER UPDATE | outbox `('proveedor', NEW.CodigoPro, 'upsert')` | :2577-2580 | sí | no |
| trg_sync_pago_insert | tblpagos | AFTER INSERT | outbox `('pago', NEW.Id_Pagos, 'upsert')` | :2583-2586 | sí | no |
| trg_sync_pago_update | tblpagos | AFTER UPDATE | outbox `('pago', NEW.Id_Pagos, IF(NEW.Estado='Anulada','anular','upsert'))` | :2588-2591 | sí | no |
| trg_sync_compra_insert | tblpedidos | AFTER INSERT | outbox `('compra', NEW.Pedido_N, 'upsert')` | :2594-2597 | sí | no |
| trg_sync_compra_update | tblpedidos | AFTER UPDATE | outbox `('compra', NEW.Pedido_N, 'upsert')` (no distingue anulación) | :2599-2602 | sí | no |
| trg_sync_gasto_insert | tblegresos | AFTER INSERT | outbox `('gasto', NEW.Id_Egresos, 'upsert')` | :2605-2608 | sí | no |
| trg_sync_gasto_update | tblegresos | AFTER UPDATE | outbox `('gasto', NEW.Id_Egresos, IF(NEW.Estado='Anulada','anular','upsert'))` | :2610-2613 | sí | no |
| trg_sync_articulo_insert | tblarticulos | AFTER INSERT | outbox `('articulo', NEW.Items, 'upsert')` | :2616-2619 | sí | no |
| trg_sync_articulo_update | tblarticulos | AFTER UPDATE | outbox `('articulo', NEW.Items, 'upsert')` — se dispara en CADA `UPDATE tblarticulos SET Existencia…` | :2621-2624 | sí | no |
| trg_egresos_tipopago_sync | tblegresos | BEFORE INSERT | `SET NEW.TipoPago = CASE WHEN COALESCE(NEW.id_mediopago,0)>0 AND COALESCE(NEW.TipoPago,0)=0 THEN 1 ELSE COALESCE(NEW.TipoPago,0) END` (no escribe otra tabla; modifica la fila entrante) | :2679-2685 | sí (DROP IF EXISTS :2679) | no |

Tablas de soporte creadas junto a los triggers: `tbl_sync_outbox` (`actualizacion_completa.sql:2512-2527`, columnas Id_Outbox, Entidad, Id_Entidad, Operacion, Payload, Enviado, Intentos, Ultimo_Error, Fecha_Creacion, Fecha_Envio, Prox_Reintento) y `tbl_sync_estado` (`:2529-2538`, fila Id=1).

## Catálogo de vistas (MySQL)

Todas usan `DROP TABLE IF EXISTS <vw>` + `DROP VIEW IF EXISTS <vw>` + `CREATE VIEW` (comentario `:214`: dumps VB6 pueden haber dejado el nombre como TABLE), excepto las dos creadas con SQL dinámico condicional (`PREPARE`), indicadas abajo. Sin `DEFINER` ni `SQL SECURITY` explícitos (→ default `SQL SECURITY DEFINER`, sin verificar en BD).

| Vista | Tablas base / joins | Qué calcula | archivo:línea | Consumidores (grep api/ + src/) |
|---|---|---|---|---|
| vw_item_ventas_30d | tbldetalle_venta d ⋈ tblventas v (Factura_N), `v.Fecha >= CURDATE()-30d`, GROUP BY Items | Unidades_Vendidas_30d = SUM(Cantidad), Veces_Vendido_30d = COUNT(DISTINCT Factura_N). **Sin filtro de EstadoFact** (cuenta anuladas) y **sin FE** (electronic_documents) | :215-225 | solo vw_diagnostico_inventario_30d (:251). Ningún PHP directo |
| vw_diagnostico_inventario_30d | tblarticulos a ⟕ vw_item_ventas_30d, `a.Estado=1` | Margen_Porc, Capital_Invertido = Existencia×Precio_Costo, texto Diagnostico (Costo inválido / Precio bajo costo / Margen sospechoso >80% / rotación alta-media-baja) | :228-252 | api/diagnostico/inventario-30d.php:14 |
| vw_item_ventas_90d | tbldetalle_venta ⋈ tblventas, últimos 90 días | Unidades, Veces, Total_Vendido_90d = SUM(Subtotal), Ultima_Venta = MAX(Fecha). Mismo hueco: anuladas incluidas, FE excluidas | :255-267 | solo vw_auditoria_inventario_90d (:302) |
| vw_auditoria_inventario_90d | tblarticulos ⟕ vw_item_ventas_90d ⟕ tblcategoria ⟕ tblproveedores, `Estado=1` | Margen, Capital_Invertido, Dias_Stock = Existencia/(uds90/90) (999 si sin ventas), Categoria, Proveedor, Auditoria (Stock negativo, Capital muerto, Sobre-stock >180d, Excelente…) | :270-305 | api/auditoria/inventario-90d.php:12 |
| vw_productos_stock_bajo | tblarticulos ⟕ tblfamilia_items ⟕ tblfamilias_producto | Artículos activos con `Existencia_minima>0 AND Existencia < Existencia_minima`; Stock_Minimo, Id_Familia, Familia_Nombre | :359-372 | api/inicio/sugerencias.php:105-123 (verifica existencia de la vista en MySQL/SQLite, :109-119) |
| vw_lotes_por_vencer | tblproductos_lotes ⋈ tblarticulos | Lotes `Estado='activo' AND Cantidad_Actual>0`; dias_restantes = DATEDIFF(Fecha_Vencimiento, CURDATE()), valor_costo = Cantidad_Actual×Precio_Costo | :497-508 | api/lotes/index.php:62,64,82 |
| vw_componentes_detalle | tblproducto_componentes ⋈ tblarticulos p (padre) ⋈ tblarticulos h (componente) | Receta (BOM) línea a línea: stock del componente, Costo_Aporte = Cantidad×Precio_Costo | :534-546 | api/componentes/index.php:34 |
| vw_capacidad_compuestos | mismo join, GROUP BY padre | Unidades_Posibles = MIN(FLOOR(h.Existencia/c.Cantidad)), Costo_Total_Receta, Num_Componentes | :549-560 | api/componentes/index.php:26 |
| vw_facturas_cliente_saldos | tblventas v ⋈ tblclientes c ⟕ (SUM pagos de tblpagos agrupados por `COALESCE(NULLIF(Fact_N,0), NFactAnt numérico)`) | **Cartera POS**: Total, TotalPagos = SUM(ValorPago + Descuento) de pagos `Estado='Valida'`, `ValorPago>=0`, `Descuento>=0`; Saldo = GREATEST(Total−TotalPagos,0); Fechav, DiasVenc, Vencida. Filtra `Tipo<>'Contado' AND EstadoFact='Valida'`. **No usa el cache tblventas.Saldo** | :929-957 | api/clientes/cartera.php:20; clientes/comportamiento.php:69; clientes/detalle.php:39,67,82; clientes/info-credito.php:28; clientes/pagos.php:34,362,442; dashboard/resumen.php:47; informes/resumen.php:398,461,499,687,697; inicio/sugerencias.php:45,76; ventas/listar.php:81,128,136; ventas/por-tipo-pago.php:75 (src/components/ConfiguracionSistema.tsx:71 solo comentario) |
| vw_facturas_anteriores_cliente | tblfacturasanteriores fa ⟕ (SUM pagos tblpagos agrupados por `Codigo` + `COALESCE(NULLIF(NFactAnt,''), CAST(Fact_N AS CHAR))`) | **Cartera migrada pre-sistema (VB6)**: Total = fa.Valor, TotalPagos, Saldo, DiasVenc, Vencida. Sin filtro de estado de la factura | :959-991 — **condicional**: solo si existe `tblfacturasanteriores` (`@t`, :960-964), creada con `PREPARE` (:966-991) | clientes/cartera.php:22; clientes/detalle.php:103; clientes/info-credito.php:30; clientes/pagos.php:52,344,449; informes/resumen.php:401,463 |
| vw_facturas_elec_cliente_saldos | electronic_documents v ⋈ tblclientes ⟕ (SUM pagos tblpagos agrupados por `Codigo` + `CAST(NULLIF(Nfact_electronica,'') AS UNSIGNED)` = DocID) | **Cartera FE crédito**: Factura_N = CONCAT(prefix,number), Total, TotalPagos, Saldo, DiasVenc. Filtra `payment_form_id=2 AND status='autorizado' AND type_document_id=1`. **No filtra EstadoFact** (solo lo expone) | :1042-1083 — **condicional** sobre existencia de electronic_documents (:1042-1046), `PREPARE`. Prerrequisitos: columna tblpagos.Nfact_electronica (:999-1004), electronic_documents.EstadoFact (:1010-1018) | clientes/cartera.php:24; clientes/detalle.php:53,91; clientes/info-credito.php:32; clientes/pagos.php:43,256,278,445 |
| vw_prov_facturas_anteriores_saldos | tblfacturasanterioresproveedor f ⋈ tblproveedores ⟕ (SUM tblegresos.Valor `Estado='Valida'` por CodigoPro+NFacturaAnt) | **CxP migrada**: Total = SUM(f.Valor), TotalPagos, Saldo | :1216-1239 | api/proveedores/listar.php:42; base de vw_prov_cxp_aging |
| vw_prov_pedidos_credito_saldos | tblpedidos b ⋈ tblproveedores | **CxP compras a crédito** leyendo el **cache** `tblpedidos.Saldo` (TotalPagos = Total−Saldo). Filtra `TipoPedido<>'Contado' AND EstadoPedido='Recibido'` | :1244-1273 (misma definición en fix_vista_saldos_proveedores.sql:70-88) | api/proveedores/listar.php:46; base de vw_prov_cxp_aging |
| vw_prov_cxp_aging | UNION ALL de las 2 vistas anteriores con `Saldo>0` | Aging unificado: DiasVenc, Vencida, Origen ('FacturasAnteriores' / 'PedidosCredito') | :1276-1294 | api/proveedores/listar.php:134,141; base de vw_proveedores_saldo_actual |
| vw_proveedores_saldo_actual | vw_prov_cxp_aging GROUP BY proveedor | SaldoAnterior, SaldoPedidos, SaldoActual | :1296-1307 | **ninguno** en api/ ni src/ (grep vacío) |

Fuera del consolidado: el `SELECT` de verificación `:1973-1983` cuenta 4 vistas en information_schema.VIEWS (no crea nada).

## Procedures / functions / events

- `actualizacion_completa.sql`: ninguno.
- `conta-app-backend/sql/auditar_bd.sql:14-16,254-257`: `DROP PROCEDURE IF EXISTS auditarBD` + `CREATE PROCEDURE auditarBD()` con `DELIMITER $$`, `CALL auditarBD();` y `DROP PROCEDURE` al final — procedure efímero, solo lectura según su descripción (`api/mantenimiento/ejecutar-sql.php:18-22`).
- Eventos: ninguno en los archivos revisados.

---

## Flujos principales

- **Operación:** Encolar cambios para sincronización online (SaaS)
- **Pantalla → endpoint:** cualquier endpoint que haga INSERT/UPDATE en tblventas, tblclientes, tblproveedores, tblpagos, tblpedidos, tblegresos, tblarticulos → trigger `trg_sync_*`
- **Lee:** — (los triggers no leen)
- **Escribe:** tbl_sync_outbox (INSERT) — una fila por evento, sin deduplicar
- **Efectos colaterales:** sincronización. Consumido por `electron/sincroWorker.js:464-473` (lote `BATCH_SIZE=50`, `MAX_INTENTOS=10`, :32-33), marca `Enviado=1` (:492-550) o reintenta con backoff (:561, :590). El backfill del worker sí deduplica con `NOT EXISTS … Enviado=0` (:671-718); los triggers no
- **Transacción:** el INSERT del trigger corre dentro de la transacción del endpoint que lo dispara (semántica MySQL; sin verificar caso a caso)
- **Consecutivos:** Id_Outbox AUTO_INCREMENT (:2513)
- **Validaciones solo en frontend:** N/A

- **Operación:** Normalizar TipoPago de egresos (capa 2 del fix Nutrigranos, comentario :2644-2667)
- **Pantalla → endpoint:** cualquier `INSERT INTO tblegresos` (compras/nueva.php:856, movimientos/gastos.php:113, proveedores/listar.php:234, nómina) → `trg_egresos_tipopago_sync`
- **Lee:** NEW.id_mediopago, NEW.TipoPago
- **Escribe:** NEW.TipoPago (misma fila, BEFORE INSERT)
- **Efectos colaterales:** caja — el cuadre cuenta efectivo con `COALESCE(TipoPago,0)=0` (comentarios compras/nueva.php:847-849, movimientos/gastos.php:104-105, proveedores/listar.php:197-199)
- **Transacción:** la del endpoint
- **Consecutivos:** N/A
- **Validaciones solo en frontend:** N/A

- **Operación:** Cálculo de saldos de cartera clientes (POS / anteriores / FE) y CxP proveedores
- **Pantalla → endpoint:** CuentasPorCobrar.tsx → clientes/cartera.php:18-25 (UNION ALL de las 3 vistas de clientes); ProveedoresManagement.tsx → proveedores/listar.php:42-46,134-141
- **Lee:** vistas de saldos (tabla arriba)
- **Escribe:** — (vistas de solo lectura)
- **Efectos colaterales:** ninguno; el saldo de cliente se recalcula en vivo desde tblpagos, el de proveedor-pedido sale del cache tblpedidos.Saldo que mantiene proveedores/listar.php:241 (`UPDATE tblpedidos SET Saldo = Saldo - :pago`)

- **Operación:** Aplicación del SQL en runtime
- `aplicar-sql.php`: lee `actualizacion_completa.sql` (:79-95) y lo ejecuta con `mysqli::multi_query` sin preprocesar DELIMITER (:105-121); marca `tbldatosempresa.version_sql_aplicada` **aunque haya errores** (:130-137). Los triggers del archivo funcionan aquí porque no usan DELIMITER (:2546-2547).
- `ejecutar-sql.php`: whitelist (:17-48) incluye `actualizacion_completa` y `fix_vista_saldos_proveedores`; `preprocesarDelimiter()` (:70-98) convierte bloques `DELIMITER $$` en sentencias `;` para multi_query (necesario para auditar_bd.sql).
- `migraciones/aplicar.php`: ejecuta un hotfix arbitrario verificado por SHA-256 (:53-63) con `PDO::exec` multi-sentencia (:96-98); no maneja DELIMITER → un hotfix con trigger multi-sentencia `BEGIN…END` fallaría (sin verificar con un hotfix real).
- Respaldo: `api/backup/index.php:130-141` vuelca vistas con `SHOW CREATE VIEW` y `:143-155` triggers con `SHOW CREATE TRIGGER` envueltos en `DELIMITER $$` (:151-153). La salida de `SHOW CREATE` incluye `DEFINER=…` (comportamiento MySQL, sin verificar en el archivo de backup generado).

## Dependencias

- **Usa de otros módulos:** columnas añadidas por el mismo consolidado: tblegresos.id_mediopago (:1535-1540, prerequisito de trg_egresos_tipopago_sync), tblpagos.Nfact_electronica (:999-1004), tblpagos.Descuento (usado en :949, sin ALTER en el consolidado — viene del esquema legacy, sin verificar), electronic_documents.EstadoFact (:1010-1018).
- **Lo usan otros módulos:** cartera/pagos/clientes (3 vistas de clientes), proveedores (4 vistas CxP), inventario/diagnóstico/auditoría/lotes/componentes/sugerencias, informes/resumen.php, dashboard/resumen.php, ventas/listar.php; sincronización (`electron/sincroWorker.js` lee tbl_sync_outbox; MAP_ENTIDAD :42-50 mapea las 7 entidades de los triggers).
- **Triggers / vistas de BD involucrados:** los de este documento.
- **Compatibilidad MySQL vs SQLite:**
  - `schema_sqlite_cliente.sql` crea **18 vistas que son stubs** (estructura temporal de mysqldump): p. ej. `CREATE VIEW "vw_facturas_cliente_saldos" AS SELECT 1 AS "Factura_N", 1 AS "CodigoCli", … 1 AS "Vencida"` (:2411-2426). La sección "Final view structure" (:2694-2764) quedó **vacía** (solo comentarios). Lista: ver_factura :2257, view_detalles_ventas :2280, view_listado_facturas_electronica :2298, vw_auditoria_inventario_90d :2320, vw_capacidad_compuestos :2343, vw_componentes_detalle :2357, vw_diagnostico_inventario_30d :2378, vw_facturas_anteriores_cliente :2395, vw_facturas_cliente_saldos :2412, vw_facturas_elec_cliente_saldos :2433, vw_item_ventas_30d :2455, vw_item_ventas_90d :2465, vw_lotes_por_vencer :2477, vw_productos_stock_bajo :2497, vw_prov_cxp_aging :2512, vw_prov_facturas_anteriores_saldos :2531, vw_prov_pedidos_credito_saldos :2547, vw_proveedores_saldo_actual :2566.
  - El bootstrap embedded (`Dashboard-Facturación/electron/main.js:1622-1644`) carga ese schema partiendo por `;` e ignorando errores (:1636-1640); `migraciones_sqlite.sql` (51 líneas) solo tiene `ALTER TABLE ADD COLUMN`, **ninguna vista ni trigger**. No hay en api/ ni electron/ ningún otro `CREATE VIEW` (grep vacío) que reemplace los stubs.
  - **Triggers en SQLite: 0** (grep `trigger` vacío en schema_sqlite_cliente.sql y migraciones_sqlite.sql) y **no existe tbl_sync_outbox** en SQLite; `sincroWorker.js:453-461` consulta `information_schema` (solo MySQL) y aborta con "tbl_sync_outbox no existe".
  - Vistas solo en SQLite (y en la plantilla MySQL `conta_template_cliente_nuevo.sql:1779-1849`, no en el consolidado): ver_factura, view_detalles_ventas, view_listado_facturas_electronica — sin consumidores en api/ ni src/.
  - `tools/diagnostico_sqlite_cliente.php:129-137,231-235` solo verifica que las vistas **existan** y que `SELECT COUNT(*)` no falle; un stub pasa ambas pruebas.
- **modulo_sync.sql:** contiene exactamente los mismos 14 triggers `trg_sync_*` (modulo_sync.sql:55-129) y las mismas tablas outbox/estado (:17-43), textualmente idénticos a actualizacion_completa.sql:2512-2624. No incluye `trg_egresos_tipopago_sync`.
- **modulo_vendedores_movil.sql:** sin triggers, vistas ni rutinas (grep `trigger|view|procedure|delimiter|definer` vacío).

## Qué se rompe si lo tocas

- Si renombras/eliminas columnas `Factura_N`, `EstadoFact` (tblventas), `CodigoClien` (tblclientes), `CodigoPro` (tblproveedores), `Id_Pagos`/`Estado` (tblpagos), `Pedido_N` (tblpedidos), `Id_Egresos`/`Estado` (tblegresos), `Items` (tblarticulos), los triggers `trg_sync_*` fallan y **cualquier INSERT/UPDATE en esas tablas aborta** (un error en trigger AFTER revierte la sentencia — semántica MySQL), rompiendo ventas, pagos, compras, gastos y stock (actualizacion_completa.sql:2550-2624).
- Si cambias el formato de `tblpagos.Nfact_electronica`, se rompe el JOIN `CAST(NULLIF(Nfact_electronica,'') AS UNSIGNED) = electronic_documents.id` de vw_facturas_elec_cliente_saldos (:1072, :1080); clientes/pagos.php:277-297 escribe el **id numérico** (`':nfe' => strval($docFE['id'])`).
- Si cambias reglas de tblpagos (`Estado`, `ValorPago` negativo para reversos, `Descuento`), cambian los saldos de cartera de las 3 vistas de clientes (:949-953, :982-987, :1073-1078) y con ello cartera.php, info-credito.php (cupo en NuevaVenta), informes de cartera, dashboard y sugerencias.
- Si dejas de mantener `tblpedidos.Saldo` en algún flujo de pago/anulación a proveedor, vw_prov_pedidos_credito_saldos (:1257-1273) muestra saldos fantasma: la vista confía en el cache (comentario :1247-1256).
- Si un endpoint nuevo inserta egresos por banco con `TipoPago` NULL/0 e `id_mediopago>0`, el trigger lo corrige; pero un **UPDATE** de `id_mediopago` no lo corrige (el trigger es solo BEFORE INSERT, :2680) → el cuadre de caja (`COALESCE(TipoPago,0)=0`) descuadra.
- Si eliminas `tblfacturasanteriores`, la vista vw_facturas_anteriores_cliente deja de crearse (:960-991) y `clientes/cartera.php:22` (UNION sin chequeo de existencia, :18-25) falla.
- Si cambias el orden del consolidado: las vistas dependientes (vw_diagnostico → vw_item_ventas_30d; vw_auditoria → vw_item_ventas_90d; vw_prov_cxp_aging → 2 vistas prov; vw_proveedores_saldo_actual → aging) deben crearse después de sus bases.
- Si cambias la definición de una vista MySQL, recuerda que en SQLite NO se replica (stubs, ver arriba).

## Evaluación de la implementación

**Confirmado (leído en código):**
1. **Ningún trigger toca `tblarticulos.Existencia`, `tblkardex` ni saldos.** Los 15 triggers solo escriben `tbl_sync_outbox` o `NEW.TipoPago` (:2550-2685). No hay doble escritura de stock/kardex/saldo entre triggers y PHP. El único campo que escriben ambos es `tblegresos.TipoPago`: PHP lo fija (`TipoPago = ?` en compras/nueva.php:649,856; movimientos/gastos.php:113; proveedores/listar.php:234) y el trigger lo re-normaliza con la misma regla (`id_mediopago>0 → 1`); el efecto es idempotente, no doble.
2. **Vistas SQLite rotas:** todas las vistas en `schema_sqlite_cliente.sql` son stubs `SELECT 1 AS col…` sin `FROM` (:2257-2571) y la sección final está vacía (:2694-2764). En embedded, cada vista devuelve una fila constante con todos los campos = 1. Afecta cartera (3 vistas), CxP, diagnóstico/auditoría, lotes por vencer, componentes, stock bajo. El efecto exacto en pantalla está sin verificar en ejecución.
3. **Sin triggers ni outbox en SQLite:** la sincronización online no existe en modo embedded (sincroWorker.js:453-461 solo MySQL).
4. **Desajuste de formato en Nfact_electronica:** `ventas/nueva.php:382,431-445` inserta el abono inicial de FE a crédito con `Nfact_electronica = "$prefijo-$docElecId"` (p. ej. `FCON-123`, :291); la migración v4.6 escribe `CONCAT(prefix, number)` (actualizacion_completa.sql:2098). La vista hace `CAST(... AS UNSIGNED)` (:1072), que para un texto que empieza por letras da 0 → esos pagos **no se descuentan** del saldo de la FE en vw_facturas_elec_cliente_saldos. Solo `clientes/pagos.php:297` usa el id numérico que la vista espera. cartera.php no compensa con `electronic_documents.abono` (grep sin resultados).
5. **Crecimiento ilimitado de tbl_sync_outbox:** los triggers encolan siempre, tenga o no el cliente el módulo contratado (comentario :2493-2494), una fila por cada UPDATE (sin deduplicar). `trg_sync_articulo_update` se dispara en cada línea vendida (`UPDATE tblarticulos SET Existencia…` en ventas/nueva.php:509, compras/nueva.php:476,508,559). No hay `DELETE FROM tbl_sync_outbox` en sincroWorker.js ni en api/ (grep vacío): las filas `Enviado=1` se acumulan para siempre.
6. **aplicar-sql.php marca la versión como aplicada aunque haya errores** (:130-137) → un fallo parcial no se reintenta en el siguiente login.
7. **vw_item_ventas_30d/90d no filtran `EstadoFact`** (:222-225, :264-267) → ventas anuladas cuentan como rotación. Además, desde v4.6 la FE no va a tblventas (:2060-2070), así que **las ventas FE no aparecen** en rotación, diagnóstico ni auditoría.
8. **vw_facturas_elec_cliente_saldos no filtra EstadoFact** (:1081) aunque lo expone; cartera.php:24 tampoco filtra. Contradice la regla de excluir anuladas de cartera si una FE anulada conserva `status='autorizado'` (sin verificar cómo se marca la anulación de FE).
9. **vw_proveedores_saldo_actual no tiene consumidores** (grep vacío) — código muerto. Lo mismo ver_factura / view_detalles_ventas / view_listado_facturas_electronica (solo en SQLite/plantilla).
10. **trg_sync_compra_update siempre manda 'upsert'** (:2602), a diferencia de venta/pago/gasto que detectan 'anular'; la anulación de compras se sincroniza como upsert (cómo la interpreta el SaaS: sin verificar).
11. Dos vistas (anteriores_cliente, elec_cliente_saldos) se crean con `PREPARE` condicional; si la tabla base no existe, el `DROP VIEW` tampoco corre (:963, :1045) y una vista vieja/incompatible podría quedar.

**Sospecha (requiere verificación en BD/ejecución):**
- `mysqli::multi_query` detiene la ejecución de las sentencias restantes al primer error (semántica de multi-statement de MySQL), contrario al comentario de aplicar-sql.php:115-116 ("more_results() sigue procesando"). Como los triggers están al final del archivo (:2550-2685), un error temprano dejaría la BD sin triggers y, por el punto 6, sin reintento.
- DEFINER: los triggers/vistas se crean con el usuario de la conexión (aplicar-sql.php usa las credenciales de `Database`, :23-29,44). Los backups (backup/index.php:135-153) copian `SHOW CREATE`, que incluye `DEFINER`; restaurar en otro servidor/usuario puede producir el error "definer does not exist" / "Table doesn't exist" en triggers (antecedente del cliente Ammi registrado por el equipo; no reproducido aquí).
- vw_facturas_anteriores_cliente agrupa pagos por `COALESCE(NULLIF(NFactAnt,''), CAST(Fact_N AS CHAR))` e incluye pagos con `Fact_N IS NOT NULL` (:981, :987): un pago a una venta POS cuyo número coincida con un `FacturaN` de facturas anteriores del mismo cliente se descontaría en **ambas** vistas (doble descuento de saldo).
- `DROP TABLE IF EXISTS <vista>` (p. ej. :215) sobre un nombre que ya es VIEW: comportamiento distinto entre MySQL y MariaDB (warning vs error); si diera error, combinado con el punto anterior de multi_query cortaría el script.
- Un trigger `AFTER` que falle (p. ej. si tbl_sync_outbox se borra o pierde columnas) aborta la operación de negocio, contradiciendo el comentario "Si un trigger falla, no es crítico" (:2544).

**Contraste con PROCESOS_SISTEMA.md:**
- Regla 1 (doble escritura Existencia + kardex, PROCESOS_SISTEMA.md:16-19): cumplida en el sentido de que **ningún trigger** hace la escritura; toda la responsabilidad queda en PHP. No hay red de seguridad en BD si un endpoint olvida el kardex.
- Regla 2 (Servicio='S' no mueve stock, :20-21): ningún trigger ni vista mueve stock; las vistas de inventario (diagnóstico/auditoría/stock bajo) **no excluyen** `Servicio='S'` (filtran solo `Estado=1`, :252, :305, :370), así que servicios pueden aparecer como "Capital muerto"/"Costo inválido".
- Regla 3 (kardex inmutable, :22-24): no hay trigger que impida `DELETE FROM tblkardex`; la inmutabilidad depende solo del código PHP.
- Regla 5 (FE y POS mismos efectos, :29-31): las vistas de rotación solo leen POS (tblventas), violando el espíritu de la regla en los informes de inventario.
- 2.3 Pagos "NO toca stock ni kardex" (:118-121): consistente; las vistas de cartera solo leen tblpagos.
