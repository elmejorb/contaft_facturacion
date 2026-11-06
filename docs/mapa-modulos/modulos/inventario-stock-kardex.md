# Inventario — Stock (`tblarticulos.Existencia`) y Kardex (`tblkardex`)

**Propósito:** Módulo transversal: todo lo que sube o baja la existencia de un artículo y deja (o no) rastro en el libro kardex. No tiene pantalla propia de escritura; lo escriben 14 endpoints de 9 carpetas. Este documento es el inventario completo de esos puntos de escritura.
**Pantallas (frontend):** solo lectura — `components/Kardex.tsx:114` (vista "Kardex"), `components/KardexArticuloModal.tsx:44` (abierto desde `NuevaVenta.tsx:3020` y `DetalleFacturaModal.tsx:681`). Las escrituras se disparan desde las pantallas de los módulos de la tabla de abajo.
**Endpoints (backend):** lectura `api/inventario/kardex.php` (GET `items`, `mes`+`anio` o `fecha_inicio`+`fecha_fin`). Escritura: ver tabla.

## Flujos principales

### Tabla maestra: TODO punto de `api/` que escribe `Existencia` o inserta en `tblkardex`
Obtenida con `grep -rniE "UPDATE\s+tblarticulos"` + `grep -rniE "INSERT INTO tblkardex"` sobre `conta-app-backend/api` (31 sitios UPDATE tblarticulos, 30 INSERT kardex; los UPDATE de `tblarticulos` que no tocan `Existencia` — precios, `tiene_componentes`, `Id_Bodega`, `Estado` — se listan al final). No hay `UPDATE`/`DELETE` sobre `tblkardex` en ningún endpoint (grep vacío) ⇒ el kardex sí es inmutable desde la API.

Leyenda: **Signo** `+`/`-` relativo (`Existencia = Existencia ± x`) o **ABS** (`Existencia = valor calculado en PHP`, read-modify-write). **¿kardex?** sí/no + C_D usado. **Tx** = dentro de `beginTransaction`. **Serv/Comp** = ¿omite servicios (`Servicio=1`)? / ¿descuenta componentes de productos compuestos?

| # | archivo:línea | operación | signo | ¿kardex? (línea, C_D) | ¿transacción? | ¿respeta servicios / compuestos? |
|---|---|---|---|---|---|---|
| 1 | ventas/nueva.php:638 | Venta POS (contado/crédito), producto normal | `-` | sí :649, C_D=2 | sí :138 / :718 | Serv: sólo si el front manda `es_servicio` y catálogo≠0 (:535-541, :576). Comp: sí (rama :590) |
| 2 | ventas/nueva.php:606 | Venta POS de compuesto → descuenta cada componente | `-` | sí :614 (C_D=2) + fila informativa del padre cant=0 :629 | sí | Comp: sí. No revisa si el componente es servicio |
| 3 | ventas/marcar-entregado.php:78 | Entrega (Fabricación) línea FE | `-` | sí :93, C_D=2, Fecha=fecha de entrega | sí :39 / :167 | No/No |
| 4 | ventas/marcar-entregado.php:138 | Entrega (Fabricación) línea POS | `-` | sí :153, C_D=2 | sí | No/No |
| 5 | ventas/detalle-factura.php:296 | Devolución parcial POS (`action=devolucion`) | `+` | sí :310, C_D=1 | sí :247 / :369 | No/No (devuelve al padre aunque se vendieron componentes) |
| 6 | ventas/detalle-factura.php:478 | Anulación POS (`action=anular`) | `+` | sí :488, C_D=1 | sí :454 / :518 | No/No. Sí omite líneas `Entregado='N'` sin entregar (:473) |
| 7 | ventas/crear-factura.php:141 (prep :121) | POS "tradicional" — **código muerto** (sin caller en `src/`; usa `tbldetallefactura`/`Id_Articulo`, columnas inexistentes) | `-` | sí :147, **C_D=1** en una venta, `MONTHNAME` | sí :39 / :186 | No/No |
| 8 | facturacion-electronica/enviar.php:948 | FE autorizada por DIAN (`case 'factura'`) | `-` | sí :951, C_D=2, idempotente por marcador `[#id]` (:936-943) | **no** (no hay beginTransaction en :587-972) | Serv: chequea `Servicio === 'S'` (:947) pero la columna es `int` → **no excluye servicios**. Comp: **no** (baja el padre). No filtra `entregado='N'` |
| 9 | facturacion-electronica/enviar.php:1291 | NC anulación total (`concept_id=2`) | `+` | sí :1294, C_D=1, sin idempotencia | **no** | Serv: mismo bug `'S'` (:1290). Comp: no. NC parcial (concept≠2) **no** repone stock (:1259) |
| 10 | facturacion-electronica/enviar.php:1768 | `convertir_a_borrador` (POS → borrador FE) | `+` | sí :1773, C_D=1 | sí :1711 / :1873 | Serv: bug `'S'` (:1767). Comp: no. No filtra `Entregado='N'` ni `Dev` |
| 11 | compras/nueva.php:802 (fields :794) | Crear compra | ABS (`$existAnt + $cant`, :770) | sí :806, C_D=1, costo **sin IVA** | sí :300 / :881 | No/n.a. |
| 12 | compras/nueva.php:476 | Editar compra: línea nueva | ABS (`$existActual + $cantReal`, :451) | sí :481, C_D=1, pero `Cant_Ent=$cant` (sin factor) | sí :300 / :698 | No/n.a. |
| 13 | compras/nueva.php:508 | Editar compra: cambia cantidad | ABS (`+ $diferencia`) | sí :514 (C_D=1) / :523 (C_D=2) | sí | No/n.a. |
| 14 | compras/nueva.php:559 | Editar compra: línea eliminada | `-` | sí :567, C_D=2, costo `PrecioC` (con IVA) | sí | No/n.a. Borra `tbldetalle_pedido` (:577) |
| 15 | compras/anular.php:125 | Anular compra | `-` | sí :143, C_D=2 | sí :108 / :189 | No/n.a. No revierte `Precio_Costo` |
| 16 | ordenes-compra/recibir.php:153 (prep :113) | Recibir OC → compra | ABS (`$existenciaAct + $cant`) | sí :156 (prep :115), C_D=1, Mes abreviado 'Ene' (:88-89) | sí :41 / :183, `FOR UPDATE` sólo sobre la OC (:44) | No/n.a. |
| 17 | vendedores/pedidos.php:386 | Pedido vendedor `action=convertir` → venta | `-` | **NO** | sí :310 / :397 | No/No. `PrecioC=0` en detalle (:373). Sin caller en `src/` (sin verificar app móvil/hub) |
| 18 | familias/distribuir.php:191 | Distribución (romper unidad mayor): origen | `-` | sí :220, C_D omitido (=0) | sí (aplicar :295 / manual :334) | n.a. |
| 19 | familias/distribuir.php:200 | Distribución: destino + costo promedio | ABS | sí :231, C_D=0 | sí | n.a. |
| 20 | inventario/crear-articulo.php:113 (valor :68) | Alta de artículo con existencia inicial | ABS (INSERT) | sí :122 si >0, **C_D=0** | **no** | No (crea kardex aunque sea servicio) |
| 21 | inventario/actualizar-articulo.php:128 (set :69) | Editar artículo (formulario completo) | ABS (`$input['Existencia']`) | sí :143 si cambió, C_D=0 "Ajuste manual" | **no** | No |
| 22 | inventario/conteo.php:363 (prep :288) | Cerrar conteo físico | ABS (= contado) | sí :332/:347 (prep :284), C_D=1/2 | sí :252 / :377 | No (cuenta todos los `Estado=1`, :145) |
| 23 | lotes/index.php:184 | Baja de lote por vencimiento | `-` | sí :194, C_D=0, sin Fecha (default) | sí :164 / :198 | No |
| 24 | notas-articulo/index.php:103 | Nota de Entrada/Salida | `+`/`-` | sí :131/:136, C_D=0 | sí :92 / :141 | No |
| 25 | notas-articulo/index.php:168 | Anular nota | inverso | sí :185/:188, C_D=0 | sí :165 / :197 | No |
| 26 | movs-directos/crear.php:108 | Movimiento directo entrada/salida | ABS (con `FOR UPDATE` :61) | sí :139/:148, C_D=1/2, Fecha = fecha del usuario | sí :58 / :157 | No |
| 27 | movs-directos/anular.php:50 | Anular movimiento directo | ABS (con `FOR UPDATE` :29) | sí :61/:70 | sí :20 / :84 | No |

Otros `UPDATE tblarticulos` que **no** tocan Existencia: compras/nueva.php:532 (precios), bodegas/index.php:135 (`Id_Bodega`), componentes/index.php:80/:103 (`tiene_componentes`), :137 (`Precio_Costo`), inventario/eliminar-articulo.php:52 (`Estado=0`), y `DELETE FROM tblarticulos` en eliminar-articulo.php:110.
Sin efecto en stock (verificado por grep): `cargues-vendedor/*` (sólo `tbl_cargues_vendedor`, aprobar.php:81, cuadrar.php:43), `vendedores/push-all.php`, `vendedores/sync-catalogos.php`, `compras/borradores.php` (doc :15 "es solo un almacen JSON").

### Operación: consultar kardex
- **Pantalla → endpoint:** Kardex.tsx:114 / KardexArticuloModal.tsx:44 → inventario/kardex.php (GET)
- **Lee:** `tblKardex` (:41, mayúscula — sólo funciona con `lower_case_table_names` ≠ 0 o SQLite) ordenado por `Id_kardex` (:52)
- **Escribe:** nada
- **Efectos colaterales:** ninguno
- **Transacción:** n.a.
- **Consecutivos:** n.a.
- **Validaciones solo en frontend:** n.a. Kardex.tsx:89 además consulta compras/nueva.php `?lookup_pedido=1` para abrir la compra desde el detalle.

### Operación: cualquier movimiento (patrón común)
- **Lee:** `tblarticulos` (Existencia, Precio_Costo) antes y/o después del UPDATE para calcular `Cant_Saldo`/`Cost_Saldo`
- **Escribe:** `tblarticulos` UPDATE; `tblkardex` INSERT
- **Efectos colaterales:** cada UPDATE dispara `trg_sync_articulo_update` → `tbl_sync_outbox` (actualizacion_completa.sql:2622-2624)
- **Transacción:** ver tabla
- **Consecutivos:** `tblkardex.Id_kardex` AUTO_INCREMENT (conta_template_limpio.sql:2112)
- **Validaciones solo en frontend:** stock negativo en ventas: `NuevaVenta.tsx:609,622,721` (`cfg.permitirFacturarNegativo`). **Ningún endpoint de venta valida existencia** (grep `negativ|stock insuf` vacío en ventas/nueva.php y enviar.php). Sólo validan en backend: notas-articulo/index.php:79, movs-directos/crear.php:76, movs-directos/anular.php:210, lotes/index.php:159, familias/distribuir.php:288/:330.

## Dependencias
- **Usa de otros módulos:** `config/helpers_polyfill.php` (`conta_tiene_tabla`, `conta_columnas_tabla`) en crear/actualizar-articulo; `config/db_factory.php` UDFs SQLite (`MONTH`, `YEAR`, `MONTHNAME`… :223-300).
- **Lo usan otros módulos:** lectores de `tblkardex`: inventario/kardex.php, inventario/eliminar-articulo.php:83, informes/produccion-dia.php:34, enviar.php:936 (idempotencia por `LIKE`). Lectores de `Existencia`: dashboard/*, informes/resumen.php, vendedores/push-all.php:136 y sync-catalogos.php:28 (envían stock al hub móvil), proveedores/productos.php:37, cotizaciones/copiar, stock-bajo, vistas.
- **Triggers / vistas de BD involucrados:** `trg_sync_articulo_insert/update` (actualizacion_completa.sql:2617-2624). Vistas que leen Existencia: `vw_diagnostico_inventario_30d` (:230), `vw_auditoria_inventario_90d` (:272), `vw_productos_stock_bajo` (:361), `vw_capacidad_compuestos` (:551), `vw_componentes_detalle` (:536). Ningún trigger sobre `tblkardex`.
- **Compatibilidad:** `tblkardex` no tiene columna de bodega (template :2111-2127) ⇒ kardex mono-bodega. `FOR UPDATE` (movs-directos, ordenes-compra/recibir:44, notas-articulo:85) no lo reescribe `ContaSqlitePDO::rewrite` (db_factory.php:168-189, sólo INTERVAL) ⇒ en SQLite embedded esas sentencias fallarían (sin verificar en runtime). `ventas/crear-factura.php` usa `MONTHNAME` (emulada en SQLite, db_factory.php:272, pero en MySQL devuelve inglés).

## Qué se rompe si lo tocas
- Si cambias el texto `Detalle` de la FE ("Venta FE Nº … [#id]", enviar.php:925), se rompe la idempotencia (:936-943) y la query de diagnóstico 4.2 de PROCESOS_SISTEMA.md (`LIKE '%Venta FE%'`).
- Si cambias "Venta Fra. N° X" (ventas/nueva.php:651) / "Dev. Fra." / "Anulación Fra.", se rompe la query 4.4 del contrato (`LIKE '%Fra%'`).
- Si cambias "Compra Ped. N° X" (compras/nueva.php:809) se rompe la query 4.5 (`LIKE '%Ped%'`).
- Si normalizas `Servicio` a 'S'/'N' para "arreglar" enviar.php, se rompen ventas/nueva.php:539 (`intval(...) === 0`), EditarArticuloModal.tsx:61 (`Number(a.Servicio) === 1`) y crear/actualizar-articulo (:80/:94 guardan 1/0).
- Si agregas filtro `C_D IN (1,2)` en un reporte, desaparecen cargas iniciales, ajustes manuales, notas, lotes y distribuciones (todos C_D=0, ver tabla #18-#25).
- Si mueves el bloque de stock de enviar.php:906-960 dentro del `if ($esFlujoNuevo)`, arreglas el doble descuento legacy pero cambias el comportamiento de clientes con BD sin migrar (sin verificar cuántos).
- Cada UPDATE de stock genera una fila en `tbl_sync_outbox` (trigger :2622): cambiar a UPDATE masivo multiplica/reduce la cola del worker de sincronización.

## Evaluación de la implementación
**Confirmado (leído en código):**
1. **Servicios se descuentan en FE/NC/convertir:** `($art['Servicio'] ?? 'N') === 'S'` (enviar.php:947, :1290, :1767) contra columna `int(11)` (template :731) y valores 1/0 escritos por crear/actualizar-articulo (:80/:94). El filtro nunca es verdadero. Viola regla 2 del contrato.
2. **FE no maneja compuestos:** enviar.php:938-957 descuenta el padre; ventas/nueva.php:590-633 descuenta componentes. Mismo producto, efecto distinto según POS o FE (viola regla 5). NC (:1281) y anulación/devolución POS (detalle-factura.php:296/:478) reponen al padre aunque se hayan consumido componentes ⇒ el padre "gana" stock fantasma y los componentes nunca se reponen.
3. **Doble descuento en Fabricación FE:** ventas/nueva.php inserta `detalle_document_electronic.entregado='N'` (:370-371); enviar.php:921 baja **todas** las líneas al autorizar sin mirar `entregado`; luego marcar-entregado.php:78 vuelve a bajar.
4. **Doble descuento POS→FE legacy:** con `factura_n` sin `doc_elec_id` (FacturacionElectronica.tsx:270, botón "Enviar" de ventas legacy `enviada_dian=1` sin CUFE, listar.php:96-102), enviar.php crea el electronic_document (:766-779) y en la aprobación baja stock (:948) que ya bajó ventas/nueva.php:638.
5. **Anular después de devolver duplica reposición:** devolución reduce `Cantidad` pero no `CantidadEntregada` (detalle-factura.php:292-293); anulación usa `CantidadEntregada` (:470-475) que ventas/nueva.php seteó = Cantidad original (:561).
6. **Sin kardex:** vendedores/pedidos.php:386 (viola regla 1).
7. **Sin transacción con efectos DIAN:** FE/NC (enviar.php) — un error a mitad del foreach deja stock parcial; la FE ya está autorizada en DIAN.
8. **Lost update:** compras/nueva.php, ordenes-compra/recibir.php, familias/distribuir.php:200, conteo.php:363 y actualizar-articulo.php:69 escriben valor ABS calculado desde un SELECT sin `FOR UPDATE`; una venta concurrente (otra PC/terminal) entre el SELECT y el UPDATE se pierde. Sólo movs-directos bloquea la fila (crear.php:61, anular.php:29).
9. **Edición de artículo como ajuste encubierto:** EditarArticuloModal.tsx:140 envía todo el `form` incluida `Existencia` cargada al abrir (:52); actualizar-articulo.php:36/:69 la escribe tal cual y registra la diferencia como "Ajuste manual" (:139-141). Si hubo ventas mientras el modal estaba abierto (se abre desde NuevaVenta.tsx:2631 y NuevaCompra.tsx:1548), el stock retrocede y el kardex registra un ajuste falso. Sin transacción ni permiso backend.
10. **Valoración mixta del kardex:** ventas/devoluciones/NC usan `Precio_Costo` (con IVA, regla de memoria), compras usan costo **sin IVA** (compras/nueva.php:756, recibir.php:159). `Cost_Saldo` no es comparable entre filas.
11. **C_D inconsistente:** 0 en altas, ajustes, notas, lotes y distribución; 1 en la venta de crear-factura.php (muerto). Contrato §2.1 pide C_D=1 para inventario inicial.
12. **PROCESOS_SISTEMA.md desactualizado:** dice que POS es `api/ventas/crear-factura.php` (§2.2) — el real es `ventas/nueva.php`; dice `EstadoPed` — el código usa `EstadoPedido` (compras/anular.php:160, recibir.php:94); dice validación `permitirNegativos` en backend — no existe.

**Sospecha:**
- `ventas/nueva.php:535`: si el front manda `es_servicio` falso para un artículo con `Servicio=1`, se descuenta (la defensa cruzada sólo corrige el caso inverso).
- compras/nueva.php crear (:770) usa `$cant` sin factor y editar (:423) usa `$cant * $factor`: si el front manda cantidades en empaque, crear y editar divergen (sin verificar payload de NuevaCompra.tsx).
- conteo.php compensa sólo ventas POS (`tbldetalle_venta`, :268-273) incluidas anuladas y con `tblventas.Fecha` tipo `date` (template :639) ⇒ ventas FE, compras, notas o movs hechos durante el conteo se pierden al fijar `Existencia = contado` (:363).
