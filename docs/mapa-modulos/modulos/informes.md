# Informes

**Propósito:** Reportes de gestión y contables de sólo lectura (ventas, compras, gastos, IVA, cartera, CxP, inventario, cuadre, panel gerencial, producción, vendedores). Son el **consumidor final** de casi todas las tablas transaccionales: cualquier cambio de estados, convenciones o tablas en Ventas/FE/Compras/Pagos/Egresos/Nómina se refleja aquí en silencio.

**Pantallas (frontend):**
- `components/informes/InformesHub.tsx` — menú Informes → "Panel de Informes" (`Dashboard.tsx:771`, montado `:1642`). Catálogo en `InformesHub.tsx:59-93`; cada tarjeta monta un componente `components/informes/Informe*.tsx` que llama `informes/resumen.php?tipo=…`:
  `PanelGerencial`(panel_gerencial) · `InformeCuadreCaja`(cuadre_caja) · `InformeCierreMes`(cierre_mes) · `InformeEstadoResultados`(estado_resultados) · `InformeIVA`(iva) · `InformeVentasListado`(ventas_listado) · `InformeVentasMensual`(ventas_mensual) · `InformeVentasDiario`(ventas_diario) · `InformeTopProductos`(top_productos) · `InformeTopClientes`(top_clientes) · `InformeVentasPorCategoria`(ventas_por_categoria) · `InformeFacturasVendedor`(facturas_vendedor) · `InformeComprasListado`(compras_listado) · `InformeProveedoresListado`(proveedores_listado) · `InformeSaldosProveedores`(proveedores_saldos) · `InformeInventarioValorizado`(inventario_valorizado) · `InformeProductosAgotados`(productos_agotados) · `InformeGastos`(gastos_listado) · `InformePagosProveedores`(pagos_proveedores) · `InformeCartera`/`InformeCarteraResumida`(cartera) · `InformeGraficos`(graficos) · `InformeComparativoAnual`(comparativo_anual).
  `InformeVentasPorProducto.tsx` → `informes/ventas-por-producto.php`; `InformeIngresosTotales.tsx` (tarjeta `ingresos-totales`, `InformesHub.tsx:145`) → `informes/ingresos-totales.php`. `InformeRetencionesRecibidas.tsx` es de otro módulo (retenciones).
- `components/InformeProduccionDia.tsx` — menú Informes → "Producción del Día" (`Dashboard.tsx:773`, `:1606`) → `informes/produccion-dia.php` (`InformeProduccionDia.tsx:45`).
- `components/InformeVendedores.tsx` — vista `vendedores-informe` (`Dashboard.tsx:1648`) → `informes/vendedores.php`.

**Endpoints (backend):** `conta-app-backend/api/informes/`
- `resumen.php` GET `?tipo=` (22 tipos, todos sólo lectura).
- `ingresos-totales.php`, `ventas-por-producto.php`, `vendedores.php`, `produccion-dia.php` — GET, sólo lectura.

## Flujos principales
Todos son **lecturas**: no escriben tablas, no hay transacciones, no hay consecutivos, no hay efectos colaterales. Lo relevante es QUÉ suman y con qué filtros.

### Matriz de reportes
Leyenda: **Anul.** = cómo excluye documentos anulados; **POS+FE** = si suma `tblventas` y `electronic_documents`; **JOIN** = riesgo de inflar SUM.

| Reporte (`resumen.php` salvo indicado) | Tablas | Anul. | POS+FE | JOIN / riesgo |
|---|---|---|---|---|
| `cierre_mes` `:38-183` | tblventas, electronic_documents, tblpedidos, tblegresos, tblpagos, tbldetalle_venta, detalle_document_electronic | POS `EstadoFact='Valida'` (`:52`); FE `status='autorizado'` (`:68`); egresos/pagos `Estado='Valida'` (`:89,97,103,109`); **compras SIN filtro de anuladas** (`:74-79`) | Sí; FE sólo si `cufe NOT IN (SELECT cufe FROM tblventas …)` (`:69,130`) | Costo = SUM línea×PrecioC (`:114`) sin inflar. NC parciales (type 2) no se restan. |
| `estado_resultados` `:185-281` | ídem + tblcategorias_gasto | igual que cierre_mes (`:191,203,213,226,240,253`) | Sí (mismo NOT IN, `:204,227`) | `LEFT JOIN tblcategorias_gasto ON e.categoria_gasto = cg.Nombre` (`:239`): si hay categorías con `Nombre` repetido, duplica gastos; la plantilla no define UNIQUE sobre `Nombre` (`conta_template_limpio.sql:979-984`) — duplicación depende de datos (sospecha). |
| `cuadre_caja` `:283-354` | tblventas, electronic_documents, tblegresos, tblpagos | POS **todas** (sin filtro, `:295`; el frontend filtra `EstadoFact==='Valida'`, `InformeCuadreCaja.tsx:24`); FE `status='autorizado'` (`:318`); egresos/pagos Valida | Sí, **sin** exclusión por cufe (`:303-323`) → FE con espejo POS se cuenta dos veces | Egresos incluye bancos, nómina y anticipos (sin filtro TipoPago/vinculado_a, `:328-331`). Distinto del cuadre real `caja/sesion.php`. |
| `top_productos` `:356-386` | tbldetalle_venta, tblventas, tblarticulos | POS Valida (`:371`) | **Solo POS** | Agrega por línea, OK. |
| `cartera` `:388-479` | vw_facturas_cliente_saldos, vw_facturas_anteriores_cliente, tblclientes | la vista filtra `EstadoFact='Valida'` (`actualizacion_completa.sql:957`) y pagos Valida (`:951`) | **Solo POS** (la vista lee `FROM tblventas`, `:943`); `vw_facturas_elec_cliente_saldos` (`:1068`) NO se usa → **FE a crédito no aparece** | — |
| `ventas_listado` `:481-530` | tblventas, tblmedios_pago, vw_facturas_cliente_saldos | parámetro `estado` (`:488`) | **Solo POS** | LEFT JOIN a vista por Factura_N (1 fila/factura, sin verificar unicidad). |
| `compras_listado` `:532-571` | tblpedidos, tblproveedores | **No excluye anuladas** ni devuelve EstadoPedido (`:536-545`) | n/a | — |
| `inventario_valorizado` `:573-608` | tblarticulos, tblcategoria | n/a | n/a | Valor = Existencia×Precio_Costo (con IVA). Incluye servicios con Existencia>0. |
| `productos_agotados` `:610-641` | tblarticulos, tblcategoria, tblproveedores | n/a | n/a | No excluye servicios (`Servicio='S'` con existencia 0 aparecen como agotados). |
| `gastos_listado` `:643-680` | tblegresos, tblcategorias_gasto | Valida (`:654`) | n/a | Filtro `CodigoPro=0` **incluye nómina y anticipos** (no filtra `vinculado_a`); mismo JOIN categorías. |
| `top_clientes` `:682-722` | tblventas, tblclientes, vw_facturas_cliente_saldos | POS Valida (`:704`) | **Solo POS** | Saldo por subconsulta correlacionada (sin inflar). |
| `ventas_por_categoria` `:724-756` | tbldetalle_venta, tblventas, tblarticulos, tblcategoria | POS Valida | **Solo POS** | OK. |
| `pagos_proveedores` `:758-796` | tblegresos, tblproveedores | Valida (`:769`) | n/a | `CodigoPro>0` incluye egresos automáticos de compras contado (`compras/nueva.php:853`). |
| `graficos` `:798-864` | tblventas, tbldetalle_venta, tblarticulos, tblegresos, tblcategorias_gasto | POS Valida; egresos Valida | **Solo POS** | Gastos incluye nómina/anticipos (`:837`). |
| `comparativo_anual` `:869-943` | tblventas | Valida | **Solo POS** | — |
| `proveedores_listado` `:945-977` | tblproveedores, tblfacturasanterioresproveedor, tblpedidos | Saldo cacheado; total compras **incluye anuladas** (`:966`) | n/a | Saldo = cache, `TipoPedido='Crédito'` literal (`:958`). |
| `proveedores_saldos` `:979-1037` | ídem | Saldo cache (anuladas tienen Saldo=0) | n/a | `TipoPedido='Crédito'` (`:991`): excluye compras de OC con `'Credito'`. Saldos anteriores leen `Saldo` cacheado, no la vista. |
| `ventas_mensual` `:1039-1098` | tblventas, tbldetalle_venta | Valida | **Solo POS** | Subconsultas separadas (fix v4.3.41, `:1042-1046`). Crédito = `Tipo='Crédito'` literal (`:1054`). |
| `ventas_diario` `:1100-1154` | ídem | Valida | **Solo POS** | Igual fix (`:1104-1105`). |
| `iva` `:1156-1221` | tbldetalle_venta, tblventas, tblpedidos | ventas Valida; **compras sin filtro de anuladas** (`:1181-1183`) | **Solo POS** → IVA generado en FE NO se reporta | IVA extraído del precio (`d.Iva/(100+d.Iva)`, `:1164`). |
| `facturas_vendedor` `:1223-1252` | tblventas, tblusuarios | Valida | **Solo POS** | — |
| `panel_gerencial` `:1266-1458` | tblventas, tbldetalle_venta, tblegresos, tblcontrolcaja, tblauxiliarbanco, tblarticulos, tblpedidos | POS `LOWER(EstadoFact)!='anulada'` OK; **egresos `!='anulado'` vs valor real `'Anulada'`** (`:1297`) → incluye egresos anulados; **compras `!='anulado'` vs `'Anulada'`** (`:1337,1409,1414`) → incluye compras anuladas | **Solo POS** | Cartera = `SUM(tblventas.Saldo)` cacheado (`:1331`), no la vista. Caja desde `tblcontrolcaja` (VB6 legacy, `:1316`). `Tipo='Credito'` sin tilde (`:1352`) vs `'Crédito'` en el resto. |
| `ingresos-totales.php` | tblventas, electronic_documents, tblpagos, tbl_retenciones_pago | POS Valida (`:48`); FE `status IN ('autorizado','aprobado')` (`:73`); pagos Valida y `ValorPago>0` (`:95-96`) | Sí; FE sin espejo por `LEFT JOIN tblventas ON cufe … IS NULL` (`:71,74`) | Agrupa FE por `created_at` (`:35,75`) mientras `resumen.php` usa `fecha` → días/meses distintos. |
| `ventas-por-producto.php` | tbldetalle_venta, tblventas, tblclientes | param `estado` (`:35-38`) | **Solo POS** | Por línea. |
| `vendedores.php` | tbl_vendedores_movil, tblempleados, tbl_pedidos_vendedor, tblventas | Facturas Valida (`:72`); **montos de pedidos incluyen anulados** (`:46-48` sin filtro estado) | **Solo POS** | `tblventas INNER JOIN tbl_pedidos_vendedor ON convertido_factura_n` (`:69-70`): si 2 pedidos se convierten en 1 factura, `SUM(v.Total)` se duplica (sospecha). `fecha BETWEEN ? AND ?` con 'YYYY-MM-DD' excluye el último día si `fecha` es DATETIME (tipo sin verificar). |
| `produccion-dia.php` | tblkardex, tblarticulos | n/a | n/a | Suma **toda** entrada de kardex `Cant_Ent>0` (`:21`): compras, NC, anulaciones de venta, ajustes — no sólo producción. |

### Hechos transversales (confirmados)
- **Desde v4.6 la FE vive sólo en `electronic_documents`** (memoria del proyecto / PROCESOS_SISTEMA.md §2.2). Los reportes marcados "Solo POS" (top_productos, cartera, ventas_listado, top_clientes, ventas_por_categoria, graficos, comparativo_anual, ventas_mensual, ventas_diario, **iva**, facturas_vendedor, panel_gerencial, ventas-por-producto, vendedores) **omiten todas las FE emitidas desde v4.6**.
- **Exclusión FE↔POS por CUFE:** `cufe NOT IN (SELECT cufe FROM tblventas …)` no mira `EstadoFact`. Si una FE autorizada tiene fila espejo en `tblventas` ANULADA (la migración legacy v4.6 anula, no borra), queda excluida del lado FE y del lado POS → **no se cuenta en ningún lado** (`resumen.php:69,130,204,227`; `ingresos-totales.php:71-74`). Lógica confirmada; frecuencia en datos sin verificar.
- **Estados de FE inconsistentes:** `resumen.php` y `dashboard/resumen.php` usan `status='autorizado'`; `ingresos-totales.php:73` acepta también `'aprobado'`; PROCESOS_SISTEMA.md §4.2 menciona `'autorizado','aprobado','anulado'`.
- **Notas crédito parciales** (type_document_id=2, concept≠2) no se restan en ningún reporte (grep `type_document_id=2` en informes: ninguno).
- **Literales de tipo crédito:** `'Crédito'` (`resumen.php:76,1054,1113,1232,958,991`), `'Credito'` (`:1352`), `<>'Contado'` (`ingresos-totales.php:45`, vista CxP). Qué escribe realmente `tblventas.Tipo`: sin verificar en este grupo.

## Dependencias
- **Usa de otros módulos:** `config/helpers_polyfill.php` (`conta_tiene_tabla`, `resumen.php:33`, `ingresos-totales.php:39`); vistas de Cartera clientes (`vw_facturas_cliente_saldos`, `vw_facturas_anteriores_cliente`, `actualizacion_completa.sql:931,967`); tablas de Ventas, FE, Compras, Pagos, Egresos, Nómina, Caja legacy (`tblcontrolcaja`, `tblauxiliarbanco`), Vendedores móviles, Retenciones.
- **Lo usan otros módulos:** sólo el frontend listado arriba. Ningún endpoint escribe en función de estos informes.
- **Triggers / vistas:** vistas citadas; ningún trigger.
- **Compatibilidad:** `DATE_FORMAT` (`ingresos-totales.php:33-36`), `DATE_ADD/DATE_SUB … INTERVAL` (`resumen.php:394,848,984,1353`), `DATEDIFF`, `YEAR/MONTH`, `IFNULL` (`:1322`), `LOWER` — emuladas o reescritas en SQLite por `db_factory.php:169-190,214-383` salvo `IFNULL`/`LOWER` que SQLite trae nativo. `CONCAT(?, ' 23:59:59')` emulado (`db_factory.php:336`). `panel_gerencial` usa `tblcontrolcaja` (existe en `conta_template_limpio.sql`; tabla legacy VB6 manejada por `caja/estado.php:30,175`, mientras el flujo multi-cajero usa `tblsesiones_caja`/`caja/sesion.php` → el componente "Caja" del patrimonio puede no reflejar la caja real; sin verificar); `tblauxiliarbanco` va en try/catch (`:1321-1325`).

## Qué se rompe si lo tocas
(lado informes: qué cambio externo altera números)
- **Ventas POS:** cambiar `EstadoFact` ('Valida'/'Anulada') o `Tipo` ('Contado'/'Crédito') → todos los reportes de ventas; `'Crédito'` está como literal en `resumen.php:76,1054,1113,1232`.
- **FE:** cambiar `status` ('autorizado'/'anulado'), `type_document_id`, `payment_form_id`/`payment_method_id` (cierre_mes los usa para efectivo=10/tarjeta=14, `resumen.php:60-63`), `fecha` vs `created_at`, o la columna `cufe` → cierre_mes, estado_resultados, cuadre_caja, ingresos-totales. Guardar FE otra vez en `tblventas` (revertir v4.6) duplica ventas en `cuadre_caja` y en `dashboard/resumen.php` (no excluyen por cufe).
- **Costo:** `tbldetalle_venta.PrecioC` y `detalle_document_electronic.PrecioCosto` son la base del costo de ventas y utilidad (`resumen.php:114,125,211,222,365,734,1062,1121,1278`). Si cambian de "con IVA" a "sin IVA" cambian todos los márgenes.
- **Compras:** el valor de anulación `'Anulada'` (`compras/anular.php:160`) — `panel_gerencial` compara con `'anulado'`; cierre_mes/iva/compras_listado no filtran.
- **Egresos:** `Estado` ('Valida'/'Anulada'), `CodigoPro` (0 = gasto, >0 = proveedor), `vinculado_a` ('nomina'/'empleado'), `categoria_gasto` (JOIN por nombre) → cierre_mes, estado_resultados, gastos_listado, pagos_proveedores, graficos, panel_gerencial.
- **Cartera clientes:** si la cartera de FE se sigue manejando en `vw_facturas_elec_cliente_saldos`, el informe `cartera` y `top_clientes.saldo_actual` deben unirla; hoy no lo hacen.
- **Kardex:** `produccion-dia.php` toma toda entrada; cualquier módulo nuevo que inserte `Cant_Ent>0` aparece como "producción".

## Evaluación de la implementación
**Confirmado:**
1. 14 de 26 reportes son sólo POS y omiten FE v4.6+ (tabla). El más grave: **`iva`** (`:1156-1221`) — informe de impuestos sin FE.
2. **`cartera`** omite FE a crédito (vista POS, `actualizacion_completa.sql:943`).
3. Compras anuladas sumadas en `cierre_mes` (`:74-79`), `iva` (`:1181`), `compras_listado` (`:541-543`), `proveedores_listado` (`:966`), `panel_gerencial` (`:1407-1414`, por `'anulado'`≠`'Anulada'`).
4. Egresos anulados sumados en `panel_gerencial.gastosMes` (`:1297`, `'anulado'`≠`'Anulada'` que escriben `compras/anular.php:166`, `pagos-proveedores.php:178`, `gastos.php:287`, `nomina/*`).
5. Clasificación de gastos inconsistente: cierre_mes/estado_resultados excluyen nómina y anticipos; gastos_listado, graficos y panel_gerencial no.
6. `cuadre_caja` suma FE con espejo POS dos veces (no excluye por cufe, `:303-323`) y es un cálculo distinto al cuadre oficial `caja/sesion.php`.
7. `produccion-dia.php` no filtra por tipo de entrada.
8. Interpolación directa de `$anio`/`$mes`/`$limite` en SQL, saneada con `intval` (`:39-40,374,708`) — sin inyección.

**Sospecha:**
- JOIN `tblcategorias_gasto` por `Nombre` puede duplicar gastos si hay nombres repetidos (`:239,652,836`); no hay UNIQUE en la plantilla (`conta_template_limpio.sql:979-984`).
- `vendedores.php` duplica totales si varios pedidos apuntan a la misma factura.

**Contraste PROCESOS_SISTEMA.md:** §6 registra el bug v4.3.40 de JOIN inflado en `resumen.php`; los fixes de `ventas_mensual`/`ventas_diario` están (`:1042,1104`). La regla 5 ("FE y POS son dos flujos con los mismos efectos") no se respeta en los informes: la mayoría sólo lee POS.
