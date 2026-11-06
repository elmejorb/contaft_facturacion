# Anticipos de clientes

**Propósito:** Registrar dinero que el cliente entrega por adelantado (saldo a favor, un pasivo del negocio) y luego aplicarlo a ventas, devolverlo o anularlo.

**Pantallas (frontend):**
- `components/AnticiposClientes.tsx` (vista `anticipos-clientes`, `components/Dashboard.tsx:1627`). Lo habilita `tbldatosempresa.modulo_anticipos` (`sql/actualizacion_completa.sql:1687-1689`) y la configuración en `components/ConfigModulos.tsx`.
- No hay otra pantalla que use el endpoint: `NuevaVenta.tsx` **no** referencia anticipos. El grep de `anticipo` en `src/` solo encuentra `AnticiposClientes`, `ConfigModulos`, `ConfiguracionSistema`, `Dashboard`, `InformeRetencionesRecibidas` y `NominaManagement`.

**Endpoints (backend):** `conta-app-backend/api/anticipos/index.php`
- GET:
  - `?listar=1&anio=&mes=&estado=&q=`
  - `?por_cliente=`
  - `?detalle=`
  - `?saldo=`
- POST `action`:
  - `crear`
  - `aplicar`
  - `devolver`
  - `anular`

## Flujos principales

### 1. Crear anticipo
- **Pantalla → endpoint:** `AnticiposClientes.tsx:261` → POST `crear`.
- **Escribe:** `tblanticipos_cliente` INSERT con Saldo=Valor y Estado='Vigente' (`index.php:178-182`).
- **Efectos colaterales:** **ninguno sobre la caja.** No inserta en `tblmov_caja` ni en `tblpagos`, así que el efectivo recibido no aparece en el cuadre (`caja/sesion.php:261`).
- **Transacción:** no (un solo INSERT).
- **Consecutivos:**
  - `ANT-` + (`MAX(Id_Anticipo)+1`), sin lock (`:175-176`).
  - Si se anula el último registro, el número calculado diverge del `Id` AUTO_INCREMENT real.

### 2. Aplicar anticipo a una factura
- **Pantalla → endpoint:** ninguna. Ninguna pantalla envía `action:'aplicar'` (grep en `src/`).
- **Escribe:**
  - `tblanticipos_cliente` UPDATE `Saldo - valor` (`:218`).
  - `tblanticipo_movs` INSERT 'Aplicacion' (`:221`).
  - Recalcula el Estado (`:27-39`).
- **Efectos colaterales:** **no** inserta en `tblpagos`. La factura `factura_n` conserva su saldo en cartera, aunque el comentario de la migración dice que "se marca en tblpagos como origen 'anticipo'" (`actualizacion_completa.sql:1679-1680,1732-1740`). La columna `tblpagos.Id_Anticipo` existe, pero ningún endpoint la escribe.
- **Transacción:** sí (`:216` → `:227`). La validación del saldo (`:204-214`) ocurre fuera de la transacción.

### 3. Devolver anticipo
- **Pantalla → endpoint:** `AnticiposClientes.tsx:420` → POST `devolver`.
- **Escribe:**
  - `tblanticipos_cliente` Saldo (`:256`); pasa a Estado='Devuelto' si llega a 0 (`:268`).
  - `tblanticipo_movs` 'Devolucion' (`:258`).
- **Efectos colaterales:** **ninguno sobre la caja.** El egreso físico no se registra en `tblmov_caja` ni en `tblegresos`.
- **Transacción:** sí (`:255` → `:271`).

### 4. Anular anticipo
- **Pantalla → endpoint:** `AnticiposClientes.tsx:71` → POST `anular`.
- **Validación:** solo procede si el anticipo nunca tuvo consumo (Saldo = Valor, `:290`).
- **Escribe:**
  - `tblanticipos_cliente` Estado='Anulado', Saldo=0 (`:295`).
  - `tblanticipo_movs` 'Reverso' (`:297`).
- **Transacción:** sí (`:294` → `:301`).

### 5. Consultas
- **Pantalla → endpoint:** `AnticiposClientes.tsx:47` (listado) y `:400` (detalle).
- **Lee:**
  - `tblanticipos_cliente`, `tblclientes`, `tblusuarios`.
  - El listado filtra por `YEAR()`/`MONTH()` (`:119-121`).
- **Defecto:** la búsqueda `q` usa la columna `c.Nombre_Cliente` (`:124`), que no existe en `tblclientes` (grep en `sql/conta_template_limpio.sql` = 0). Sospecha: error SQL al buscar por texto (sin verificar en ejecución).

## Dependencias
- **Usa de otros módulos:** `tblclientes` y `tblusuarios` (solo lectura). No usa helpers.
- **Lo usan otros módulos:** ninguno. `tblanticipos_cliente` y `tblanticipo_movs` solo se leen y escriben en `anticipos/index.php` (grep en `api/`). `retenciones/informe.php` y `nomina` no los usan; en nómina, "anticipos" se refiere a anticipos de empleados.
- **Triggers / vistas:** ninguno. Las tablas se crean en `actualizacion_completa.sql:1694` y `:1715`.
- **Compatibilidad:** `YEAR`/`MONTH` están emulados en SQLite (`config/db_factory.php:223-232`).

## Qué se rompe si lo tocas
- **Al conectar "aplicar" con ventas o caja,** hay que insertar en `tblpagos` con `Id_Anticipo` y `id_usuario`. Sin el usuario, `caja/sesion.php:214` sumaría el anticipo como cobro **en efectivo** si `id_mediopago=0`, y el dinero se contaría dos veces: al crear el anticipo (si se llegara a registrar) y al aplicarlo. Ese diseño falta resolverlo.
- **Al cambiar los estados** ('Vigente', 'Aplicado', 'Devuelto', 'Anulado'), hay que revisar `recalcularEstadoAnticipo` (`:27-39`) y el cálculo de saldo (`:52`, `:77`).

## Evaluación de la implementación
**Confirmado:**
1. **El módulo está aislado de la caja y de la cartera.** Crear o devolver no mueve caja, y aplicar no reduce la deuda de la factura. El pasivo se lleva en una tabla aparte, sin integración contable.
2. **El endpoint `aplicar` está huérfano:** no se llama desde el frontend.
3. **El consecutivo sale de `MAX(Id)+1` sin lock**, y la validación del saldo ocurre fuera de la transacción. Dos aplicaciones concurrentes pueden dejar el saldo negativo.

**Sospecha:** la búsqueda `q` falla por la columna `Nombre_Cliente`, que no existe.

**Contraste con PROCESOS_SISTEMA.md:** el contrato no define flujos de anticipos.
