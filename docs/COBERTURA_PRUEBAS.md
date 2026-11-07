# Cobertura de pruebas — Conta FT

> Se actualiza en cada commit que agregue o cambie pruebas. Checklist = las 36 fichas de `docs/mapa-modulos/modulos/`.
> Última actualización: 2026-11-06 (noche) — versión 4.8.19. e2e del instalador en marcha.

## Cómo se prueba

| Capa | Qué hace | Cómo correr |
|---|---|---|
| **Suite funcional** | Casos en `conta-app-backend/tests/cases/test_*.php`. HTTP real contra `php -S` sobre el backend **del repo**, BD de prueba recargada antes de cada caso. Corre en **MySQL** (PHP de XAMPP) y **SQLite** (php-portable que se empaca). | `node scripts/pre-build-tests.mjs` (todo) · `php tests/run.php <filtro> --driver=mysql\|sqlite` |
| **Bases reales** (`test:clientes`) | Por cada dump en `C:\ContaFT-pruebas\bases\`: migración sin errores, **invariantes** antes/después (ventas, FE, existencia por producto, kardex, pagos, cartera POS/FE, caja, egresos, compras), idempotencia, **humo** de ~40 endpoints en modo legacy XAMPP y en SQLite, MySQL == SQLite. | `npm run test:clientes` |
| **Paquete** (`test:paquete`) | El instalador no lleva datos ni nombres de clientes. | `npm run test:paquete` · real tras `electron-builder` |
| **e2e instalador** | Playwright contra la app **empaquetada** (`dist-electron/win-unpacked`, SQLite embebido, userData temporal, licencia real de la empresa de prueba del CRM): abre sin pantalla blanca → activa token → login → abre caja → vende POS → cierra caja → backup. Verifica en `conta.db` (stock, kardex, cuadre, hora local, copia íntegra). Al final del build registra `pruebas.e2e` en la constancia. | `npm run test:e2e:instalador` · encadenado en `electron:build` |

Leyenda: ✅ probado con verificación de resultados · 🟡 solo humo (responde sin error, no valida cálculos) / parcial · ❌ sin prueba · — no aplica.

## Resumen

| | Módulos |
|---|---|
| Con verificación de resultados (✅ en al menos una capa) | 13 de 36 |
| Solo humo / parcial (🟡) | 13 de 36 |
| Sin prueba (❌) | 10 de 36 |

Bases reales: Nutrigranos (06-11), AhorraMas (06-11), EyD (27-10), Manos Creativas (26-10) — 4/4 OK. Falta Ammi.

## Prioridad 1 (pedido Luis: POS, FE, NC, caja, cartera, inventario/kardex, compras, devoluciones, backup, sync)

| Módulo | Qué se prueba hoy | MySQL | SQLite | Bases reales | e2e | Pendiente |
|---|---|---|---|---|---|---|
| ventas-pos | Venta contado y crédito: total, IVA extraído, saldo, pagada, efectivo; baja stock + kardex C_D=2; marca entregado (`test_pos_*`, `test_flujo_completo_dia`) | ✅ | ✅ | 🟡 listar + invariantes | ✅ venta contado: total, stock 10→9, kardex, fecha de hoy | Descuento por línea y global, servicios, compuestos, multi-medio de pago, gross-up retención, cupo/stock negativo en backend |
| fe-emision | Borrador no toca stock; abono inicial 'Pendiente' y enlazado por id (`test_fe_borrador_*`, `test_fe_fallida_*`) | ✅ | ✅ | 🟡 listar + cartera FE | ⏸ espera mock DIAN | Autorización (requiere mock de API DIAN): stock/kardex al autorizar, `number` vs `consecutive`, descuento de línea en UBL, retenciones |
| fe-contingencia | Convertir a borrador / contingencia NO tocan POS ajena; freno legacy; eliminar borrador anula abono (`test_fe_fallida_*`) | ✅ | ✅ | — | — | Reenvío de contingencia (mock DIAN) |
| fe-notas-credito | — | ❌ | ❌ | — | — | NC total/parcial, concepto, reversión de stock, guard anti doble NC (mock DIAN) |
| devoluciones POS | Anulación total repone stock + kardex (`test_flujo_completo_dia`) | 🟡 | 🟡 | — | — | Devolución parcial (IVA incluido), anular tras devolución parcial (doble stock), egreso de reembolso |
| caja | Cuadre calculado en la prueba (base + pagos − egresos) | 🟡 | 🟡 | 🟡 `caja/sesion.php` humo | ✅ abrir/cerrar, cuadre con venta, hora local, pestaña se refresca | Endpoint `caja/sesion.php` (cuadre real, FE contado, anuladas excluidas, abonos 'Pendiente' excluidos), abrir/cerrar, movimientos manuales |
| clientes-cartera | Pago parcial baja saldo (`test_flujo_completo_dia`) | 🟡 | 🟡 | ✅ invariantes cartera POS/FE + fix deudas falsas | — | Vistas de saldo vs `saldo_helper`, retenciones, pagos a FE, `info-credito` |
| inventario-stock-kardex | Entradas/salidas por venta, anulación | 🟡 | 🟡 | ✅ huella de existencia por producto + kardex | ✅ por venta | Edición de artículo pisando stock, conteo, movs directos, compuestos, servicios en FE |
| compras | Compra creada por INSERT directo en el setup (no por endpoint) | ❌ | ❌ | 🟡 informes compras | — | `compras/nueva.php` (stock, kardex, costo con IVA, egreso), anular, editar a crédito |
| backup | Copia local desde la UI (e2e) | ❌ | ❌ | 🟡 `backup/?estado` humo | ✅ copia local íntegra con la venta (WAL) | Generar/restaurar dump MySQL y SQLite (WAL) |
| vendedores-movil-sync | — | ❌ | ❌ | — | — | Outbox/triggers, pedidos → venta (sin kardex hoy), cargues |

## Resto de módulos

| Módulo | Qué se prueba hoy | MySQL | SQLite | Bases reales | Pendiente |
|---|---|---|---|---|---|
| gastos | Crear sin hora usa NOW; editar preserva hora (`test_egreso_*`) | ✅ | ✅ | 🟡 invariante egresos | Anular gasto en efectivo (no devuelve a caja) |
| informes | — | ❌ | ❌ | 🟡 22 tipos responden sin error | Totales POS+FE, exclusión de anuladas, IVA, cartera con FE |
| dashboard-inicio | — | ❌ | ❌ | 🟡 humo | Totales sin doble conteo FE/POS |
| inventario-articulos | — | ❌ | ❌ | 🟡 `articulos.php` humo | Crear/editar, paginación |
| anticipos | — | ❌ | ❌ | — | Crear/aplicar/devolver + caja |
| financiaciones | — | ❌ | ❌ | — | Cuotas, pagos, caja |
| retenciones | — | ❌ | ❌ | — | Cálculo, cartera, Formulario 350 |
| proveedores-cxp | — | ❌ | ❌ | 🟡 informes proveedores | Pago y anulación de pago (no restaura saldo) |
| ordenes-compra | — | ❌ | ❌ | — | Recepción parcial (doble stock) |
| nomina | — | ❌ | ❌ | — | Liquidación, egreso, caja |
| bodegas | — | ❌ | 🟡 tabla agregada en esquema | — | Traslados |
| conteo-auditoria | — | ❌ | ❌ | — | Cierre de conteo con movimientos durante el conteo |
| componentes | — | ❌ | ❌ | — | Venta/anulación de compuestos |
| lotes | — | ❌ | ❌ | 🟡 por vencer humo | Consumo de lotes |
| movs-directos | — | ❌ | 🟡 tabla agregada en esquema | — | Entrada/salida + kardex |
| notas-articulo | — | ❌ | ❌ | — | |
| familias-etiquetas | — | ❌ | ❌ | 🟡 stock-bajo humo | Distribuir/desempacar |
| facturas-recibidas | — | ❌ | ❌ | — | Eventos 030-034, exclusión mutua |
| fe-consulta | — | ❌ | ❌ | 🟡 listar humo | PDF, email, eliminar |
| empresa-config | — | ❌ | ❌ | 🟡 datos humo | No exponer credenciales |
| auth-usuarios-permisos | Login con usuario de prueba | 🟡 | 🟡 | 🟡 login | Permisos en servidor (hoy solo UI) |
| mantenimiento-migraciones-backup | `actualizacion_completa.sql` sin errores e idempotente; migraciones SQLite | — | — | ✅ 4 bases | aplicar-sql al login, hotfixes remotos |
| backend-core | MySQL legacy (database.php viejo) y SQLite responden; SQLite guarda hora de Colombia (`test_sqlite_hora_local`) | 🟡 | 🟡 | ✅ modo legacy real | Compatibilidad de funciones SQL por motor |
| bd-triggers-vistas | Invariantes con triggers activos | — | — | 🟡 | Vistas SQLite equivalentes |
| electron-main | e2e: arranque embebido, php -S, licencia, userData aislado | — | ✅ e2e | — | Cierre con caja abierta, updater, canal |
| arranque | e2e: abre sin pantalla blanca, sin errores JS | — | ✅ e2e | — | Arranque con BD grande (rendimiento) |
| frontend-shell | e2e: login, pestañas (Caja se recarga al activarse) | — | ✅ e2e | — | Resto de pantallas |

## Plan inmediato

1. **Mock de la API DIAN** (servidor local que imita autorizar/rechazar) para probar FE autorizada, NC y contingencia sin llamar a la DIAN.
2. Casos de prioridad 1 en este orden: devoluciones POS, caja (`sesion.php`), compras, NC, cartera con retenciones, inventario (edición de artículo), backup, sync.
3. ~~e2e Playwright contra el instalador~~ hecho (falta el paso FE, depende del mock DIAN).
4. Cada bug corregido entra con su caso en `tests/cases/` (regresión).
