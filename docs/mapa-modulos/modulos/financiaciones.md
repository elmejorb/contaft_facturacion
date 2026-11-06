# Financiaciones (crédito con cuotas)

**Propósito:** Registrar ventas financiadas a plazos (motos, equipos) con un cronograma de cuotas, cobrar cuotas (capital e interés de mora por separado) y anular pagos o financiaciones.

**Pantallas (frontend):**
- `components/FinanciacionesManagement.tsx`: vista `financiaciones`, `components/Dashboard.tsx:1628`. Solo se muestra si `getConfigImpresion().usarFinanciaciones` (`Dashboard.tsx:644,850`).
- `components/NuevaFinanciacion.tsx`
- `components/DetalleFinanciacion.tsx`: permisos `financiaciones_pagar` / `financiaciones_editar` (`DetalleFinanciacion.tsx:37`).

**Endpoints (backend):** `conta-app-backend/api/financiaciones/index.php`
- GET `?listar=1&anio=&mes=&estado=&q=`
- GET `?detalle=`
- POST `action`:
  - `crear`
  - `pagar`
  - `anular_pago`
  - `anular`

## Flujos principales

### 1. Crear financiación
- **Pantalla → endpoint:** `NuevaFinanciacion.tsx:111` → POST `crear`.
- **Escribe:**
  - `tblfinanciaciones` INSERT (`index.php:158-178`). Guarda `Factura_N` de forma opcional, solo como referencia.
  - `tblfinanciacion_cuotas` INSERT, una fila por cuota con Saldo=ValorCuota (`:181-195`).
- **Efectos colaterales:**
  - Ninguno sobre stock, caja ni cartera.
  - La cuota inicial (`CuotaInicial`, `:170`) solo se guarda: **no** genera ingreso a caja.
- **Transacción:** sí (`:149` → `:197`).
- **Consecutivos:** `F-` + (`MAX(Id_Financiacion)+1`) si el frontend no envía uno (`:152-156`), sin lock.
- **Validación en backend:** la suma de cuotas debe igualar el monto financiado, con tolerancia de $1 (`:141`).

### 2. Pagar cuota
- **Pantalla → endpoint:** `DetalleFinanciacion.tsx:83` → POST `pagar`.
- **Escribe:**
  - `tblfinanciacion_pagos` INSERT del capital, con `EsInteresMora=0` (`:238`).
  - `tblfinanciacion_pagos` INSERT del interés de mora, con `EsInteresMora=1` (`:241`).
  - `tblfinanciacion_cuotas` UPDATE de ValorPagado, Saldo y Estado (`:330`).
  - `tblfinanciaciones.Estado` (`:354`).
- **Efectos colaterales:**
  - **Ninguno sobre caja:** no hay `tblpagos` ni `tblmov_caja`, así que el cobro no entra al cuadre (`caja/sesion.php:214`).
  - **Ninguno sobre la factura vinculada:** su `tblventas.Saldo` sigue pendiente en cartera.
- **Transacción:** sí (`:231` → `:249`).
- **Validaciones:**
  - El pago no puede exceder el saldo de la cuota (`:225`).
  - **No** valida que la financiación esté 'Anulada' (`:218-229`).

### 3. Anular pago de una cuota
- **Pantalla → endpoint:** `DetalleFinanciacion.tsx:111` → POST `anular_pago`.
- **Escribe:**
  - `tblfinanciacion_pagos` Estado='Anulada' (`:272`).
  - Recalcula la cuota y la financiación (`:273-274`).
- **Transacción:** sí (`:271` → `:275`).

### 4. Anular financiación
- **Pantalla → endpoint:** `FinanciacionesManagement.tsx:78` → POST `anular`.
- **Validación:** no debe tener pagos válidos (`:284-290`). Esa query interpola `$id` en el SQL, aunque ya pasó por `intval` (`:282`).
- **Escribe:** `tblfinanciaciones` Estado='Anulada' (`:291`).
- **Transacción:** no.

### 5. Listar y detalle
- **Pantalla → endpoint:** `FinanciacionesManagement.tsx:48` (listado) y `DetalleFinanciacion.tsx:56` (detalle).
- **Lee:**
  - Para el listado, 4 subconsultas por fila más una consulta de mora por fila (`:47-77`). Es un patrón N+1.
- **Compatibilidad:** usa `YEAR`, `MONTH`, `DATEDIFF` y `CURRENT_DATE`, que en SQLite se emulan con UDFs (`config/db_factory.php`).

## Dependencias
- **Usa de otros módulos:** solo lee `tblclientes` y `tblusuarios`. Toma el cliente desde `clientes/buscar.php` (`NuevaFinanciacion.tsx:7,49`).
- **Lo usan otros módulos:** nadie más lee ni escribe `tblfinanciacion*` (grep en `api/`).
- **Triggers / vistas:** ninguno. Tablas definidas en `actualizacion_completa.sql:1565`, `:1589` y `:1605`; columna `EsInteresMora` en `:1636-1639`.

## Qué se rompe si lo tocas
- Si se integra con la cartera, la venta a crédito vinculada (`Factura_N`) y las cuotas representarían la **misma deuda dos veces**. Hay que definir cuál es la fuente de verdad antes de sumar ambas.
- Si se cambian los estados de la cuota ('Pendiente', 'Parcial', 'Pagada'), hay que revisar `recalcularCuota` (`:312-334`), el listado (`:51-53`) y la mora (`:72`).

## Evaluación de la implementación
**Confirmado:**
1. **Los cobros de cuotas y la cuota inicial no pasan por caja ni por `tblpagos`.** El cuadre del cajero no los ve: un cajero que cobra una cuota en efectivo tendrá un sobrante.
2. **Doble deuda posible.** Si la financiación referencia una venta a crédito, esa venta sigue con saldo en `vw_facturas_cliente_saldos` porque las cuotas no generan `tblpagos`.
3. **Se pueden registrar pagos sobre una financiación anulada** (no hay chequeo en `:218-229`).
4. **Anular la financiación** no es transaccional y no anula las cuotas (quedan 'Pendiente').
5. **Recalcular desde los pagos** (`recalcularCuota`) es un buen patrón: evita el saldo incremental.

**Contraste con PROCESOS_SISTEMA.md:** no hay contrato para financiaciones. La convención de "nunca borrar" se cumple (`index.php:16-17`).
