# Caja (sesiones multi-cajero + caja principal)

**Propósito:** Abrir y cerrar sesiones de caja por usuario con base inicial, calcular el cuadre (efectivo esperado contra conteo), registrar retiros parciales, ingresos y egresos manuales, y trasladar dinero a la caja principal. Existe un modelo legacy (`tblcontrolcaja`, de una sola caja diaria) que ya no usa el frontend.

**Pantallas (frontend, rutas relativas a `Dashboard-Facturación/src`):**
- `components/CajaRegistradora.tsx`: vista `caja`, `components/Dashboard.tsx:1637`.
- `components/HistorialCajas.tsx`: vista `caja-historial`, `Dashboard.tsx:1638`.
- `components/ConfigCajas.tsx`: vista `config-cajas`, `Dashboard.tsx:1656`.
- Pantallas que consultan o abren caja desde otros módulos:
  - `components/NuevaVenta.tsx:305,767,796,1029,1502`
  - `components/GastosManagement.tsx:31`
  - `components/NominaManagement.tsx:339,421`
  - `components/ProveedoresManagement.tsx:533`
  - `App.tsx:39`

**Endpoints (backend `conta-app-backend/api/caja/`):**

`sesion.php` (modelo actual):
- GET
  - `?cajas=1&usuario=`: lista las cajas.
  - `?historial=1&caja=`: historial de sesiones.
  - sin parámetros, con `caja=`/`usuario=` opcionales: estado y resumen de la sesión abierta.
- POST `action`
  - `abrir`
  - `corregir_base`
  - `cerrar`
  - `retiro`
  - `crear_caja`

`movimientos.php`:
- GET
  - `?caja_principal=1`
  - `?sesion=N`
  - `?caja=&desde=&hasta=`
- POST `action`
  - `ingreso`
  - `egreso`
  - `trasladar`
  - `nota`

`estado.php` (legacy `tblcontrolcaja`):
- GET y GET `?historial=1`
- POST `abrir`, `cerrar`, `modificar_base`
- **Sin uso en el frontend** (grep de `caja/estado` en `src/` = 0). Su tabla la lee `informes/resumen.php`.

## Flujos principales

### 1. Abrir sesión
- **Pantalla → endpoint:** `CajaRegistradora.tsx:115` y `NuevaVenta.tsx:1029` → `sesion.php` POST `abrir`.
- **Lee:** `tblcajas.Tipo` (bloquea la principal, `sesion.php:315-322`), `tblusuarios.Id_Caja` (caja asignada a un no-admin, `:325-336`) y la sesión abierta de esa caja (`:339`).
- **Escribe:** `tblsesiones_caja` INSERT con Estado='abierta' y FechaApertura=CURRENT_TIMESTAMP (`:350`).
- **Transacción:** no.
- **Consecutivos:** AUTO_INCREMENT.
- **Validaciones:** el backend no verifica si el usuario ya tiene otra sesión abierta en otra caja, solo si la caja está ocupada (`:339`).

### 2. Estado / resumen (cuadre en vivo)
- **Pantalla → endpoint:** `CajaRegistradora.tsx:94` y `NuevaVenta.tsx:796,1502` → `sesion.php` GET.
- **Lee:**
  - `tblventas` contado, Valida+Anulada (bruto), con `Fecha >= FechaApertura AND Id_Usuario` (`:147-159`).
  - `electronic_documents` FE contado/crédito autorizadas o pendientes por `created_at` e `id_usuario` (`:167`, `:196`), solo si existe la tabla (`:20`).
  - `tblventas` crédito (`:189`) y desglose por medio de pago (`:209`).
  - `tblpagos` Valida por `Fecha >= apertura AND id_usuario` (`:214`).
  - `tblegresos` con `TipoPago=0`, por **día** de apertura e `id_usuario` (`:229-233`).
  - `tblmov_caja` 'gasto' con `Descripcion LIKE 'Reembolso por %'` (`:237`), 'retiro_parcial' (`:242`) y el resto de movimientos (`:252-256`).
- **Fórmula:** `total_efectivo = base + ventas_contado_ef(bruto, efectivo - Cambio) + pagos_ef - egresos_ef - reembolsos - retiros` (`:261`).

### 3. Cerrar sesión
- **Pantalla → endpoint:** `CajaRegistradora.tsx:168` → `sesion.php` POST `cerrar`.
- **Lee:** las mismas fuentes que el GET (`:461-498`).
- **Escribe:**
  - `tblsesiones_caja` UPDATE con totales, ConteoFinal, DiferenciaFinal y Estado='cerrada' (`:503`).
  - `tblmov_caja` INSERT 'traslado' a la caja principal (`:524`).
  - `tblcajas` UPDATE `Saldo = Saldo + trasladado` (`:526`).
- **Transacción:** **no**. Son tres escrituras independientes.
- **Validaciones:** ninguna sobre quién cierra. No compara `usuario_id` con el dueño de la sesión (`:429-451`).

### 4. Corregir base
- **Pantalla → endpoint:** `CajaRegistradora.tsx:130` → `sesion.php` POST `corregir_base`.
- **Escribe:** `tblsesiones_caja` BaseInicial y Observacion (`:419`).
- **Validaciones:** exige admin o un `autorizado_por` ≠ 0, que no se verifica (`:394-405`).

### 5. Retiro parcial
- **Pantalla → endpoint:** `CajaRegistradora.tsx:188` → `sesion.php` POST `retiro`.
- **Escribe:**
  - `tblmov_caja` INSERT 'retiro_parcial' (`:564`).
  - `tblcajas` Saldo de la principal `+valor` (`:569`).
- **Transacción:** no.

### 6. Ingreso / egreso manual de caja
- **Pantalla → endpoint:** `CajaRegistradora.tsx:212` (ingreso) y `:229` (egreso) → `movimientos.php` POST.
- **Escribe:**
  - `tblmov_caja` INSERT 'deposito' (`movimientos.php:159`) o 'gasto' (`:164`), ligado a la sesión abierta de la caja si existe.
  - `tblcajas.Saldo` `±valor` (`:161`, `:166`).
- **Efectos:** **ninguno sobre el cuadre de la sesión.**
  - El 'gasto' manual no cumple `LIKE 'Reembolso por %'` (`sesion.php:237`) y además se excluye de la lista (`:255`).
  - El 'deposito' tampoco entra en `total_efectivo` (`:261`).
- **Transacción:** no.

### 7. Traslado manual y nota (historial)
- **Pantalla → endpoint:** `HistorialCajas.tsx:104` (`trasladar`) y `:79` (`nota`) → `movimientos.php`.
- **Escribe:**
  - `tblmov_caja` 'traslado' (`:187`).
  - `tblcajas.Saldo` (`:189`).
  - `tblsesiones_caja.Observacion` (`:197`), sobreescribiéndola: esto borra la traza de "BASE CORREGIDA" que agrega `sesion.php:408-416`.

### 8. Crear caja
- **Pantalla → endpoint:** `ConfigCajas.tsx:35` y `CajaRegistradora.tsx:199` → `sesion.php` POST `crear_caja`.
- **Escribe:** `tblcajas` INSERT (`sesion.php:578`).

### 9. Legacy `estado.php`
- **Lee / escribe:** `tblcontrolcaja` por fecha (`DATE(Fecha) = ?`, sin filtro de usuario).
- **Inconsistencias internas:**
  - El GET resta los pagos anulados (`estado.php:106-117`); el cierre no lo hace (`:231`).
  - El cierre no resta reembolsos (`:231`).
  - Usa `SUM(efectivo)` sin descontar Cambio (`:212`).
- Endpoint muerto para el frontend, pero sigue desplegado.

## Dependencias
- **Usa de otros módulos:** `config/helpers_polyfill.php` (`conta_tiene_tabla`, `sesion.php:13,20`). Lee `tblventas`, `electronic_documents`, `tblpagos`, `tblegresos` y `tblusuarios`.
- **Lo usan otros módulos (grep en `api/`):**
  - **Escriben `tblmov_caja`:**
    - `ventas/detalle-factura.php:361,504` (reembolsos)
    - `compras/nueva.php`, `compras/anular.php`
    - `movimientos/gastos.php`, `movimientos/bancos.php`, `movimientos/pagos-proveedores.php`
    - `nomina/movimientos.php`
    - `proveedores/listar.php`
  - **Escriben `tblcajas.Saldo`:**
    - `compras/nueva.php`, `compras/anular.php`
    - `movimientos/gastos.php`, `movimientos/bancos.php`, `movimientos/pagos-proveedores.php`
    - `proveedores/listar.php`
  - **Escriben `tblsesiones_caja`:** `ventas/detalle-factura.php:512` (Anulaciones).
  - **Leen `tblsesiones_caja`:**
    - `ventas/nueva.php:168` (guardarraíl CAJA_CERRADA)
    - `compras/*`
    - `movimientos/*`
    - `nomina/movimientos.php`
    - `proveedores/listar.php`
  - **Escriben `tblegresos`, que el cuadre lee:** otros grupos (`compras/nueva.php`, `movimientos/gastos.php`, `proveedores/listar.php`, nómina), según `actualizacion_completa.sql:2648-2665`.
  - `tblcontrolcaja` lo lee `informes/resumen.php`.
- **Triggers / vistas:**
  - `trg_egresos_tipopago_sync` BEFORE INSERT en `tblegresos` (`actualizacion_completa.sql:2680`): fuerza TipoPago=1 si id_mediopago>0. El cuadre depende de eso.
  - `trg_sync_gasto_*` (`:2606-2614`).
  - ENUM de `tblmov_caja.Tipo` extendido a compra / pago_proveedor / cobro_cliente (`:769`).
- **Compatibilidad:**
  - `sesion.php` no usa funciones exclusivas de MySQL salvo comparación de fechas.
  - En SQLite, `CURRENT_TIMESTAMP` (FechaApertura `:350`, ventas `nueva.php:256`) es UTC, mientras `clientes/pagos.php:168` guarda la Fecha con PHP `date()` en hora local de Bogotá. Sospecha: en embedded, los pagos de las primeras 5 h de una sesión quedarían fuera del cuadre (sin verificar en ejecución).

## Qué se rompe si lo tocas
- **Cambiar el texto "Reembolso por …"** (`ventas/detalle-factura.php:359,501`) o el filtro LIKE (`sesion.php:237,494`, `estado.php:102`): los reembolsos dejan de restar y la caja da sobrante falso.
- **Excluir las anuladas del bruto de ventas** (`sesion.php:159,461`) sin quitar la resta de reembolsos: se descuentan dos veces. Esta dualidad bruto/neto está documentada en `sesion.php:138-146`.
- **Cambiar `tblpagos.id_usuario`** en cualquier endpoint que inserte pagos (`clientes/pagos.php:183`, `ventas/nueva.php:683`, `detalle-factura.php:189`): el pago sale del cuadre del cajero (filtro `sesion.php:134,214`).
- **Cambiar la semántica de `tblegresos.TipoPago`/`id_usuario`** en otros módulos: altera el efectivo esperado (`sesion.php:232`).
- **Registrar ventas con fecha custom** (`nueva.php:253-264`) fuera del rango `Fecha >= FechaApertura`: no entran a ninguna sesión.

## Evaluación de la implementación

**Confirmado:**
1. **Ingresos y egresos manuales de caja no afectan el cuadre.** `movimientos.php:159,164` frente a `sesion.php:237,255,261`. El cajero registra un egreso y el sistema sigue esperando ese efectivo en caja.
2. **`cerrar`, `retiro`, `ingreso/egreso` y `trasladar` no son transaccionales.** Además, `tblcajas.Saldo` es un caché incremental (`Saldo = Saldo + ?`) que nunca se recalcula.
3. **No hay control de autoría en `cerrar`/`retiro`.** Cualquier `sesion_id` se puede cerrar (`sesion.php:430-451`). `corregir_base` acepta un `autorizado_por` sin verificar (`:394`).
4. **Egresos por día y no por sesión** (`sesion.php:229-233`). Si un usuario abre dos sesiones el mismo día, los egresos del día se restan en ambas.
5. **FE contado: los conteos asumen efectivo.** `c_efectivo` suma todas las FE como efectivo (`sesion.php:184`). El monto `ef` de FE no descuenta Cambio (`:167`); el frontend lo compensa mandando `efectivo=total` exacto para FE contado (`NuevaVenta.tsx:1558-1566`).
6. **El abono inicial FE se cuenta en caja aunque la FE no llegue a autorizarse.** El INSERT `tblpagos` ocurre en el borrador (`nueva.php:436`) y el cuadre suma `tblpagos` sin mirar el estado de la FE (`sesion.php:214`).
7. **`movimientos.php?sesion=N` lista ventas y pagos de todos los usuarios.** Filtra solo por rango de fechas (`movimientos.php:60,65`), mientras el cuadre filtra por usuario: el detalle del historial no coincide con el cuadre en multi-cajero.
8. **`estado.php` (legacy) es inconsistente entre GET y cierre** (ver flujo 9) y sigue desplegado.

**Sospecha:** el desfase UTC/local en SQLite descrito en Compatibilidad.

**Contraste con las reglas:**
- Memoria `feedback_anulacion_caja`: la anulación de contado exige caja abierta hoy y registra egreso en la caja activa. Se cumple en `detalle-factura.php:397-416`.
- La anulación de una FE contado vía NC (otro módulo) no genera reembolso en `tblmov_caja` desde este módulo. La FE con status='anulado' desaparece del cuadre de la sesión abierta (`sesion.php:167`). Sin verificar en `enviar.php`.
