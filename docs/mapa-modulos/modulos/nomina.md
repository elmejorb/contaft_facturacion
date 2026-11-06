# Nómina (empleados, anticipos/préstamos, liquidación)

**Propósito:** Maestro de empleados, "kardex" de deudas del empleado (anticipos, préstamos, cargos, abonos) y liquidación de nómina de un periodo que descuenta esas deudas y genera el egreso del neto.

**Pantallas (frontend):**
- `components/NominaManagement.tsx` — menú Movimientos → "Nómina", visible sólo si el módulo está activo (`Dashboard.tsx:763` `esModuloActivo('nomina')`, montado `:1641`). Llama `empleados.php` (`:51,71,81,257`), `liquidar.php` (`:60,152,577,600,616`), `movimientos.php` (`:347,430,506`) y `caja/sesion.php?usuario=` (`:339,421`) para elegir caja.
- `components/DesprendibleNomina.tsx` — impresión del desprendible con los datos de `liquidar.php?id=` (sin fetch propio; sin verificar).

**Endpoints (backend):** `conta-app-backend/api/nomina/`
- `empleados.php` — GET (listado / `?id=`), POST `action='crear'|'actualizar'|'retirar'|'reactivar'`.
- `movimientos.php` — GET `?empleado=`; POST `action='anticipo'|'prestamo'|'cargo'|'abono'|'anular'`.
- `liquidar.php` — GET `?empleado=` (propuesta), `?listar=1`, `?id=`; POST `action='liquidar'|'anular'`.

## Flujos principales

### Anticipo / préstamo
- **Pantalla → endpoint:** `NominaManagement.tsx:347` → `movimientos.php` POST.
- **Escribe:** `tblegresos` INSERT (`vinculado_a='empleado'`, `id_vinculo`=empleado, `TipoPago` = 0 caja / id del banco, **sin** `id_mediopago`, `CodigoPro` default 0) (`movimientos.php:52-71`); `tbl_mov_empleado` INSERT con `Saldo_Acum` (`:22-48,144-151`); si `caja_operativa` con sesión abierta: `tblmov_caja` Tipo `'gasto'` (`:154-165`). **No** actualiza `tblcajas.Saldo`.
- **Transacción:** sí `:138` / `:167` / rollBack `:174`.
- **Consecutivos:** `N_Comprobante` MAX+1 (`:59`).

### Cargo / abono
- Cargo: sólo `tbl_mov_empleado` (+valor), sin transacción (`:180-193`).
- Abono: `tbl_mov_empleado` (−valor) + opcional `tblmov_caja` Tipo `'deposito'` (`:195-235`), transacción `:208`/`:231`. No toca `tblcajas.Saldo`.

### Anular movimiento
- `movimientos.php` POST `anular`: `tbl_mov_empleado.Estado='anulado'`, `tblegresos.Estado='Anulada'` vinculado, recalcula `Saldo_Acum` de todos los movimientos activos (`:237-268`). No revierte `tblmov_caja`.

### Liquidar nómina
- **Pantalla → endpoint:** `NominaManagement.tsx:600` → `liquidar.php` POST `liquidar` (propuesta previa por GET `:577`).
- **Lee:** `tbl_empleados` activo (`liquidar.php:148`), `tbl_mov_empleado` (saldo previo, `:18-22`).
- **Escribe:** `tbl_nomina` INSERT `Estado='pagada'` (`:172-191`); `tbl_nomina_detalle` por deducción (`:201-205`); `tbl_mov_empleado` `desc_nomina` negativo (`:208-213`); `tblegresos` INSERT del neto (`vinculado_a='nomina'`, `TipoPago` = id banco o 0) (`:217-230`); `tbl_nomina.Id_Egreso` (`:231`).
- **Efectos colaterales:** el egreso con `TipoPago=0` cuenta como salida de efectivo en `caja/sesion.php:232` aunque no haya `tblmov_caja` ni cambio de `tblcajas.Saldo`.
- **Transacción:** sí `:169` / `:234` / `:241`.
- **Validaciones:** neto ≥ 0 (`:163`). Cálculo de salario del periodo (quincenal/2, semanal/4) sólo propuesto (`:86-88`); el POST acepta cualquier `salario_base`.

### Anular liquidación
- `liquidar.php` POST `anular`: `tbl_nomina.Estado='anulada'`, `tblegresos.Estado='Anulada'`, `tbl_mov_empleado` de esa nómina `'anulado'`, recalcula `Saldo_Acum` (`:245-280`).

### Empleados
- `empleados.php`: INSERT/UPDATE `tbl_empleados` (`:63,88`); `retirar` bloquea si `Saldo_Acum>0` (`:113-122`). Sin transacción.

## Dependencias
- **Usa de otros módulos:** `tblegresos` (compartida), `tblsesiones_caja`, `tblmov_caja`.
- **Lo usan otros módulos:** `informes/resumen.php` separa nómina en cierre_mes (`:94-98`) y estado_resultados (`:249-256`) por `vinculado_a='nomina'`, y excluye `vinculado_a IN ('empleado','nomina')` de gastos (`:90,241`); pero gastos_listado (`:654`), graficos (`:837`) y panel_gerencial (`:1294-1298`) NO filtran `vinculado_a` → cuentan nómina y anticipos como gasto. `caja/sesion.php:232` cuenta sus egresos `TipoPago=0`. Nadie fuera de `nomina/` lee `tbl_nomina`/`tbl_mov_empleado`/`tbl_empleados` (grep en `api/`). Nota: `informes/vendedores.php:33` usa otra tabla, `tblempleados` (legacy VB6), no `tbl_empleados`.
- **Triggers / vistas:** tablas en `actualizacion_completa.sql:2364` (`tbl_empleados`), `:2389` (`tbl_mov_empleado`), `:2418` (`tbl_nomina`), `:2449` (`tbl_nomina_detalle`, FK CASCADE `:2458`); columnas `tblegresos.vinculado_a`/`id_vinculo` (`:2467-2477`); `trg_egresos_tipopago_sync` (`:2680`) respeta `TipoPago` explícito (comentario `:2676-2678`); `trg_sync_gasto_*`.
- **Compatibilidad:** SQL estándar. `conta_template_limpio.sql` no contiene `vinculado_a` (grep) → BD plantilla sin `actualizacion_completa.sql` fallaría en liquidar y en informes que filtran por esa columna.

## Qué se rompe si lo tocas
- Cambiar `vinculado_a` ('nomina'/'empleado') → cierre_mes y estado_resultados (`informes/resumen.php:90,97,241,253`) reclasifican nómina/anticipos como gasto operativo o los pierden.
- Cambiar `TipoPago` (usa id de banco como TipoPago, `liquidar.php:220`, `movimientos.php:56`) → `caja/sesion.php:232` sólo distingue 0 vs ≠0; y `trg_egresos_tipopago_sync` no lo normaliza a 1 porque `id_mediopago` va NULL.
- Poner `CodigoPro` > 0 en estos egresos → pasarían a "Pagos a proveedores" en informes (`resumen.php:103,770`).
- Dejar `FactN` NULL es lo que los saca del listado de pagos a proveedores (`pagos-proveedores.php:248`, `NULL <> '-1'` es NULL). Si alguien les pone FactN, aparecerían allí.

## Evaluación de la implementación
**Confirmado:**
1. Nómina/anticipos pagados por "caja" no descuentan `tblcajas.Saldo` (no hay UPDATE en `liquidar.php` ni `movimientos.php`), pero sí cuentan como salida de efectivo en el cuadre (`caja/sesion.php:232`) → saldo de caja persistido vs calculado divergen.
2. `liquidar.php` con `origen_pago='caja_general'` no registra `tblmov_caja` (sólo `movimientos.php` lo hace, `:154`).
3. Anular movimiento/liquidación no revierte `tblmov_caja` (`movimientos.php:237-268`, `liquidar.php:245-280`).
4. `cargo` sin transacción (`movimientos.php:187`) — un solo INSERT, riesgo bajo.
5. `Saldo_Acum` se calcula leyendo el último movimiento (`liquidar.php:18-23`) sin bloqueo → dos operaciones concurrentes del mismo empleado producen saldo acumulado erróneo; la anulación lo recalcula entero (`:264-275`).
6. `N_Comprobante` MAX+1 compartido con compras/gastos/pagos (`liquidar.php:218`, `movimientos.php:59`).

**Sospecha:**
- Anticipo en caja operativa: egreso `TipoPago=0` + `tblmov_caja` Tipo `'gasto'` → posible doble descuento en algún cuadre que sume ambos (en `caja/sesion.php:494` sólo se suman `'gasto'` con descripción `'Reembolso por %'`, así que ahí no; `caja/estado.php` sin verificar).

**Contraste PROCESOS_SISTEMA.md:** no cubierto por el contrato. Respeta inmutabilidad (anula, no borra).
