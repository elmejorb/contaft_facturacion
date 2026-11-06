# Gastos operativos (carpeta `api/movimientos/`)

**Propósito:** Registrar egresos que no son pago a proveedor (arriendo, servicios, nómina informal…) saliendo de una caja o del banco predeterminado, con categoría; editarlos y anularlos. La carpeta `movimientos/` **no contiene nada de inventario** (pese al nombre): es tesorería (gastos, bancos, listados de pagos). Inventario "movimientos" vive en `movs-directos/` y `familias/movimientos.php`.
**Pantallas (frontend):**
- `components/GastosManagement.tsx` — listar :102, cajas :111 (`caja/sesion.php?cajas=1`), crear/editar :155-157, anular :192-194.
- `components/ConfigCategoriasGasto.tsx` (vista `config-categorias-gasto`, menú Configuración `Dashboard.tsx:806`): listar :15, crear :25, editar :32, desactivar/activar :38. También `ConfiguracionSistema.tsx:231`.
- Otros archivos de la carpeta (resumen, no inventario): `BancosManagement.tsx:10` → `bancos.php`; `ListadoPagos.tsx:222` → `pagos-clientes.php`; `ListadoPagos.tsx:429` → `pagos-proveedores.php`.
**Endpoints (backend):**
- `movimientos/gastos.php` — GET (`anio`, `mes`), POST `action=crear|editar|anular`
- `movimientos/categorias-gasto.php` — GET, POST `crear|editar|eliminar|activar`
- `movimientos/bancos.php` — GET cuentas / `?cuenta=N`, POST `crear_cuenta|editar_cuenta|ingreso|egreso|traslado`
- `movimientos/pagos-clientes.php` — GET listado `tblpagos` (sólo lectura)
- `movimientos/pagos-proveedores.php` — GET listado `tblegresos`, POST `anular|editar_medio`

## Flujos principales
- **Operación:** Registrar gasto
- **Pantalla → endpoint:** GastosManagement.tsx:156-157 → gastos.php `crear` (:69-152)
- **Lee:** `MAX(N_Comprobante)` de `tblegresos` (:94); sesión abierta de la caja (:121); banco predeterminado (:135)
- **Escribe:** `tblegresos` INSERT con `FactN='-1'` (marca de gasto), `Cuentas` '51 1305' (caja) o '1110' (banco), `TipoPago` 0/1 (:112-116); si caja: `tblmov_caja` INSERT tipo 'gasto' (:125) y `tblcajas.Saldo -` (:128); si banco: `tblmov_banco` 'egreso' ref `EGR-n` (:138) y `tblbancos.Saldo -` (:140)
- **Efectos colaterales:** caja/banco; `trg_sync_gasto_insert` → `tbl_sync_outbox` (actualizacion_completa.sql:2606); `trg_egresos_tipopago_sync` BEFORE INSERT (:2680)
- **Transacción:** sí :102 / :145 (el consecutivo :94 se calcula antes)
- **Consecutivos:** `N_Comprobante = MAX+1` sin bloqueo (:94); la secuencia es compartida con egresos de compras y pagos a proveedores (misma tabla) (sin verificar en esos endpoints)
- **Validaciones solo en frontend:** caja abierta: el backend inserta `tblmov_caja` con `Id_Sesion = NULL` si no hay sesión (:126) y descuenta igual

- **Operación:** Editar gasto
- **Pantalla → endpoint:** GastosManagement.tsx:155-157 → `editar` (:153-273)
- **Lee:** `tblegresos` (:158); busca el movimiento de caja por `Descripcion` + `Valor` (:213-216) y de banco por Referencia o Descripcion+Valor (:237-247)
- **Escribe:** `tblegresos` UPDATE (:203-206); `tblmov_caja` UPDATE + `tblcajas.Saldo` por delta (:222-226); `tblmov_banco` UPDATE + `tblbancos.Saldo` por delta (:253-256)
- **Efectos colaterales:** caja/banco (modifica movimientos existentes, no asiento opuesto); outbox
- **Transacción:** sí :199 / :264
- **Validaciones solo en frontend:** —

- **Operación:** Anular gasto
- **Pantalla → endpoint:** GastosManagement.tsx:192-194 → `anular` (:274-305)
- **Escribe:** `tblegresos` Estado='Anulada' (:287); **sólo si `Cuentas` contiene '1110'** (banco): `tblmov_banco` 'ingreso' `REV-EGR-n` (:297) y `tblbancos.Saldo +` (:299)
- **Efectos colaterales:** banco; outbox (trigger update → 'anular', :2611-2613)
- **Transacción:** sí :286 / :304

- **Operación:** Categorías de gasto → categorias-gasto.php: INSERT (:24), UPDATE nombre (:31), `Activa=0` (:36), `Activa=1` (:41). Sin transacción.

- **Operación (resumen):** bancos.php `ingreso|egreso` (:83-100, tx :91/:97), `traslado` caja↔banco↔banco (:101-138, tx :111/:138); pagos-proveedores.php `anular` (:175-227, reverso de caja en caja activa) y `editar_medio` (:46-127, exige caja abierta). Detalle completo pertenece a los módulos de caja/cartera.

## Dependencias
- **Usa de otros módulos:** caja (`tblsesiones_caja`, `tblcajas`, `tblmov_caja`), bancos (`tblbancos`, `tblmov_banco`), `caja/sesion.php` desde el front.
- **Lo usan otros módulos:** el cuadre de caja (`api/caja/sesion.php`, según memoria del proyecto) suma `tblegresos` con `COALESCE(TipoPago,0)=0` (comentario gastos.php:104-109) y `tblmov_caja`; informes de gastos leen `FactN='-1'` (sin verificar cuáles).
- **Triggers / vistas de BD involucrados:** `trg_sync_gasto_insert/update` (actualizacion_completa.sql:2606-2613), `trg_egresos_tipopago_sync` (:2680), `tblcategorias_gasto` (:149).
- **Compatibilidad:** `YEAR()`/`MONTH()` (gastos.php:17-19, :40) emuladas en SQLite (db_factory.php:223-232).

## Qué se rompe si lo tocas
- Cambiar `FactN='-1'` rompe el filtro del listado (:17, :40) y cualquier informe que distinga gastos de pagos a proveedor.
- Cambiar la `Descripcion` "Gasto: {concepto}" de `tblmov_caja` (:126) rompe la edición (:213-216 la usa para encontrar el movimiento).
- Cambiar `Cuentas` ('51 1305'/'1110') rompe la detección caja/banco de editar (:196-197) y anular (:291).

## Evaluación de la implementación
**Confirmado:**
- **Anular un gasto de caja no devuelve el dinero a la caja**: `anular` sólo revierte banco (:291-302); `tblmov_caja` y `tblcajas.Saldo` quedan descontados. Inconsistente con pagos-proveedores.php `anular` que sí reversa caja (:207-216) y con la regla de memoria "anulación crea egreso/ingreso en caja activa".
- Editar gasto modifica en sitio `tblmov_caja`/`tblmov_banco` (UPDATE) en vez de asiento opuesto; el vínculo es por texto+valor (frágil: dos gastos iguales el mismo día).
- Gasto de caja sin sesión abierta descuenta `tblcajas.Saldo` con movimiento sin sesión (:121-128).
- No toca inventario (correcto); el nombre de la carpeta induce a error.
**Sospecha:** colisión de `N_Comprobante` (MAX+1 fuera de tx) entre gastos, compras contado y pagos a proveedores simultáneos.
