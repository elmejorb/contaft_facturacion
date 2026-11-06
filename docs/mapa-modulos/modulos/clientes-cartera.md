# Clientes y Cartera (CxC, pagos/abonos, facturas anteriores)

**Propósito:** CRUD de clientes; cartera por cobrar que une tres fuentes (ventas POS a crédito, FE a crédito y facturas anteriores migradas); registro, anulación y edición de abonos (tblpagos) con descuento y retenciones; comportamiento de pago y castigo de cartera.

**Pantallas (frontend, rutas relativas a `Dashboard-Facturación/src`):**
- `components/CustomersManagement.tsx` (vista `customers`, `components/Dashboard.tsx:1630`).
- `components/CuentasPorCobrar.tsx` (vista `cuentas-cobrar`, `Dashboard.tsx:1623`). Abre `ClienteDetalle` en la pestaña "pagar" (`CuentasPorCobrar.tsx:824`).
- `components/ClienteDetalle.tsx`: ficha, pagos, facturas anteriores e impresión de recibo con `ReciboImpresion` (`ClienteDetalle.tsx:1037,1047`).
- `components/ListadoPagos.tsx` (vista `pagos-clientes`, `Dashboard.tsx:1625`): lista vía `movimientos/pagos-clientes.php` (otro grupo, `ListadoPagos.tsx:222`) y anula vía `clientes/pagos.php` (`:283-285`). Imprime con `components/ReciboImpresion.tsx` (`:413,671`), que no hace fetch: solo pinta el shape del pago.
- `components/TopClientes.tsx` (`Dashboard.tsx:1633`), `components/CumpleanosClientes.tsx` (`:1634`), `hooks/useCumpleanosHoy.ts:5`, `hooks/useNotificaciones.ts:23`.
- Consumidores en Nueva Venta: `NuevaVenta.tsx:13` (`buscar.php`), `:107` (`listar.php`), `:559,945` (`info-credito.php`). También `DetalleFacturaModal.tsx:12`, `AnticiposClientes.tsx:8`, `NuevaFinanciacion.tsx:7` y `FacturacionElectronica.tsx:731`.

**Endpoints (backend `conta-app-backend/api/clientes/`):**
- `listar.php`
  - GET: lista, o un cliente con `?id=`.
  - POST: crear.
  - PUT: editar.
  - DELETE `?id=`: eliminar.
- `pagos.php`
  - GET `?cliente=`: pendientes, historial y medios de pago.
  - POST `action`: `pagar`, `anular`, `editar`.
- `cartera.php`: GET, con `?detallado=1`.
- `info-credito.php`: GET `?id=`.
- `detalle.php`: GET `?id=&anio=`.
- `comportamiento.php`
  - GET
  - POST `castigar`, `restaurar`, `guardar_nota`, `recalcular`
- `factura-anterior.php`
  - GET `?siguiente=1`
  - POST `crear`, `eliminar`
- GET de solo lectura: `buscar.php` (`?q=` / `?identificacion=`), `top.php`, `cumpleanos.php`, `opciones.php` (catálogos DIAN).

## Flujos principales

### 1. Crear, editar y eliminar cliente
- **Pantalla → endpoint:** `CustomersManagement.tsx:170` (POST/PUT) y `:195` (DELETE) → `listar.php`. Además `NuevaVenta.tsx:107`, que crea un cliente al vuelo.
- **Escribe:**
  - `tblclientes` INSERT (`listar.php:95`). CodigoClien = `MAX(CodigoClien)+1` desde 130500 (`:92`), sin lock.
  - `tblclientes` UPDATE (`listar.php:~155`). Bloquea el 130500 (`:148`).
  - `tblclientes` DELETE (`listar.php:225`).
- **Validaciones:**
  - DELETE solo verifica `tblventas` (`listar.php:214`). **No** revisa electronic_documents, tblpagos, tblfacturasanteriores, tblanticipos_cliente ni tblfinanciaciones, así que pueden quedar huérfanos.
  - En la creación, `FechaCumple='0000-00-00'` como default (`:114`).
- **Efectos:** triggers `trg_sync_cliente_insert/update` (`actualizacion_completa.sql:2562-2570`).
- **Transacción:** no.

### 2. Cartera (CxC)
- **Pantalla → endpoint:** `CuentasPorCobrar.tsx:197,339` → `cartera.php`.
- **Lee:** UNION de `vw_facturas_cliente_saldos`, `vw_facturas_anteriores_cliente` y `vw_facturas_elec_cliente_saldos` (`cartera.php:19-25`), JOIN `tblclientes`. Usa `DATEDIFF` y `DATE_ADD … INTERVAL` (`:62-65`), que en SQLite resuelven `ContaSqlitePDO::rewrite` y UDFs.
- **Compatibilidad:** referencia las tres vistas **sin** chequear que existan. Las vistas de anteriores y FE solo se crean si existe la tabla base (`actualizacion_completa.sql:963-1083`). En contraste, `pagos.php:29-55` sí hace el chequeo con `conta_tiene_tabla`.

### 3. Registrar pago (abono) de cliente
- **Pantalla → endpoint:** `ClienteDetalle.tsx:181` → `pagos.php` POST `pagar` (payload `{cliente, pagos[], medio_pago, fecha, id_usuario, retenciones[]}`, `ClienteDetalle.tsx:184`).
- **Lee:**
  - `tblpagos` MAX(RecCajaN) (`pagos.php:176`).
  - Para FE: `electronic_documents` + `vw_facturas_elec_cliente_saldos` (`:252-263`), filtrando `cod_cliente` y `status='autorizado'`.
  - Para facturas anteriores: `tblfacturasanteriores` (`:308`).
  - Para POS: `tblventas` + `vw_facturas_cliente_saldos` (`:359-364`), **sin filtrar por cliente**.
- **Escribe:**
  - `tblpagos` INSERT, una fila por factura y todas con el mismo `RecCajaN`:
    - POS (`:381`): Fact_N.
    - FE (`:287`): Fact_N=0, `Nfact_electronica=id`.
    - Anterior (`:329`): Fact_N=0, NFactAnt='AT-…'.
  - `tblventas.Saldo/pagada` vía `recalcularSaldoFactura` (`pagos.php:398` → `config/saldo_helper.php:72`), solo para POS.
  - `tblfacturasanteriores.Saldo` UPDATE delta `Saldo - pago` (`:202,347`).
  - `tbl_retenciones_pago` INSERT, ligadas **solo al primer pago POS** (`:395`, `:409-432`).
- **Efectos:** caja. El pago entra al cuadre por `Fecha` e `id_usuario` (`caja/sesion.php:214`). Sync: `trg_sync_pago_insert`. No toca stock, como manda PROCESOS_SISTEMA §2.3.
- **Transacción:** sí (`:173` → `:434`).
- **Consecutivos:** RecCajaN = `MAX+1` sin lock (`:176`).
- **Validaciones del backend:** rechaza negativos (`:218`); recorta el pago al saldo (`:270-271`, `:322-323`, `:373-374`).
- **Validaciones solo del frontend:** selección de facturas y montos.

### 4. Anular pago
- **Pantalla → endpoint:** `ClienteDetalle.tsx:228` y `ListadoPagos.tsx:283` → `pagos.php` POST `anular`.
- **Escribe:**
  - `tblpagos` Estado='Anulada' (`:485`).
  - `tblfacturasanteriores.Saldo` `+` (`:499`) si es una factura anterior.
  - `recalcularSaldoFactura` (`:510`) si es POS.
- **Transacción:** sí (`:482` → `:516`).
- **Validaciones:**
  - No exige autorización ni caja abierta. `id_usuario` se envía (`ListadoPagos.tsx:285`) pero se ignora.
  - No crea un egreso de caja si el pago ya se contó en una sesión cerrada: el cuadre de esa sesión ya quedó persistido.
  - Las `tbl_retenciones_pago` del pago no se anulan. La vista y el helper filtran por `p.Estado`, así que dejan de contar.

### 5. Editar pago (mismo día)
- **Pantalla → endpoint:** `ClienteDetalle.tsx:247` → `pagos.php` POST `editar`.
- **Escribe:** `tblpagos` ValorPago, id_mediopago, SaldoAct y DetallePago (`:587`). Luego `recalcularSaldoFactura(intval($factN))` (`:594`).
- **Transacción:** sí (`:556` → `:597`).
- **Bugs confirmados:**
  - `$factN = NFactAnt ?: Fact_N` (`:562`). Para una factura anterior, `intval('AT-…') = 0`: el helper sale sin hacer nada y **no** actualiza `tblfacturasanteriores.Saldo`.
  - `valorAnterior` incluye el Descuento, pero solo se reemplaza ValorPago (`:558-566`).

### 6. Facturas anteriores (saldos migrados)
- **Pantalla → endpoint:** `ClienteDetalle.tsx:75,85` y `CuentasPorCobrar.tsx:448,646` → `factura-anterior.php`.
- **Escribe:**
  - `tblfacturasanteriores` INSERT con prefijo `AT-` (`factura-anterior.php:66`).
  - `tblfacturasanteriores` DELETE físico (`:74`), sin revisar si tiene pagos.
- **Efecto en cartera:** el "saldo" que se digita (`:37`) **no** se usa. La vista calcula `Valor - pagos` (`actualizacion_completa.sql:971-975`), así que una factura anterior creada con saldo < valor aparece por el valor completo.

### 7. Comportamiento y castigo
- **Pantalla → endpoint:** `CuentasPorCobrar.tsx:368` (`castigar`), `:401` (`restaurar`), `:421` (`recalcular`) → `comportamiento.php`.
- **Lee:** `tblpagos`+`tblventas` (`:52-54`), `vw_facturas_cliente_saldos` (`:69`).
- **Escribe:** `tblclientes` (comportamiento, dias_mora_promedio, cartera_castigada…) en `:81,105,126,146`.
- **Efectos:** castigar no saca facturas de las vistas; es solo una marca.

### 8. Consulta de crédito para Nueva Venta
- **Pantalla → endpoint:** `NuevaVenta.tsx:559,945` → `info-credito.php`.
- **Lee:** `tblclientes.CupoAutorizado` más las tres vistas (`info-credito.php:19-32`).
- **Uso:** alimenta la validación de cupo, que se hace **solo en el frontend** (`NuevaVenta.tsx:1535`).

## Dependencias
- **Usa de otros módulos:**
  - `config/saldo_helper.php` (`pagos.php:11`).
  - `config/helpers_polyfill.php` (`pagos.php:10`, `cartera.php:12`).
  - Vistas de `sql/actualizacion_completa.sql`: `vw_facturas_cliente_saldos` `:931`, `vw_facturas_anteriores_cliente` `:967`, `vw_facturas_elec_cliente_saldos` `:1049-1081`.
  - `electronic_documents` del módulo FE.
- **Lo usan otros módulos (grep en `api/`):**
  - **Escriben `tblpagos`:** `ventas/nueva.php:436,677`, `ventas/detalle-factura.php:183,208,220`.
  - **Leen `tblpagos`:**
    - Caja: `caja/sesion.php:214`, `caja/estado.php:88,107`, `caja/movimientos.php:65`.
    - `config/saldo_helper.php:38`.
    - Informes y dashboard: `informes/ingresos-totales.php`, `informes/resumen.php`, `dashboard/resumen.php`.
    - `movimientos/pagos-clientes.php` (listado de ListadoPagos).
    - Retenciones: `retenciones/informe.php:24`, `retenciones/pago.php:42`.
  - **Escriben `tblclientes`:**
    - `facturacion-electronica/email.php`
    - `retenciones/listar.php:98` (retencion_modo)
    - `vendedores/pedidos.php`, `vendedores/pull.php`
  - **Leen `tblclientes`:** unos 30 endpoints (FE, informes, vendedores, ventas, anticipos, financiaciones; ver grep en `data/ventas-caja-cartera.json`).
  - `tbl_retenciones_pago` también lo escribe `retenciones/pago.php:51` y lo leen `config/saldo_helper.php:56` e `informes/ingresos-totales.php`.
- **Triggers / vistas:**
  - `trg_sync_pago_insert/update` (`actualizacion_completa.sql:2584-2592`) y `trg_sync_cliente_*`.
  - Las tres vistas de saldo, descritas arriba.
- **Compatibilidad:**
  - Las vistas usan `INTERVAL`, `TO_DAYS`, `GREATEST`, `REGEXP` y `CAST AS UNSIGNED` (MySQL). Para SQLite hay versiones separadas en `sql/schema_sqlite_cliente.sql:2395,2412,2433` (no se comparó su lógica).
  - `pagos.php` usa `conta_tiene_tabla` portable.

## Qué se rompe si lo tocas
- **Cambiar el formato de `NFactAnt`** ('AT-…') o la regex de FE (`pagos.php:239-241`): el pago cae en la rama numérica y se pierde (comentario en `:234-238`).
- **Cambiar `Nfact_electronica`** a algo no numérico: la vista FE ya no lo une (`CAST … UNSIGNED`). Ese bug ya existe en el abono inicial FE (`ventas/nueva.php:445`).
- **Cambiar `id_usuario` o `Fecha` del INSERT en tblpagos** (`pagos.php:168-171,183`): el pago deja de aparecer en el cuadre del cajero (`caja/sesion.php:214`).
- **Tocar la fórmula de `recalcularSaldoFactura`**: afecta pagos, devoluciones (`ventas/detalle-factura.php:338`) y el caché `tblventas.Saldo`, que leen `caja/sesion.php:189` (saldo_pendiente), `clientes/detalle.php` e informes.
- **Agregar retenciones al cálculo de la vista** sin hacerlo también en el helper, o al revés: hoy ya están desalineados (ver Evaluación).

## Evaluación de la implementación

**Confirmado:**
1. **La vista de cartera ignora las retenciones; el helper sí las resta.**
   - `vw_facturas_cliente_saldos` suma solo `ValorPago+Descuento` (`actualizacion_completa.sql:941-951`).
   - `recalcularSaldoFactura` resta además `tbl_retenciones_pago` (`saldo_helper.php:53-68`).
   - Resultado: si una factura se cerró con retención, `tblventas.Saldo=0`, pero cartera, info-credito y el modal de pago la siguen mostrando con saldo igual a la retención y permiten cobrarla otra vez.
2. **Retenciones mal atribuidas.**
   - Se ligan solo al **primer pago POS** del recibo (`pagos.php:395,409`). Si el recibo es solo FE o solo de facturas anteriores, `$pagoIdCreado` no existe y las retenciones **se descartan en silencio** (`:410`).
   - `recalcularSaldoFactura` del primer pago corre **antes** de insertar las retenciones (`:398` vs `:411`), así que el caché no las refleja.
3. **Pago a factura POS sin validar cliente ni estado.** `pagos.php:359-364` hace `COALESCE(s.Saldo, v.Total)`. Si la factura es Contado o Anulada, la vista no la trae y el saldo resulta ser el **Total**: acepta el pago. A diferencia de la rama FE (`:258`), no filtra `CodigoCli`. Viola la memoria `feedback_facturas_anuladas_excluidas` si se manda el factura_n.
4. **El saldo digitado de una factura anterior se ignora** (`factura-anterior.php:37,66` vs la vista `:975`). Además, `tblfacturasanteriores.Saldo` se mantiene como caché delta (`pagos.php:202,499`), justo lo que `saldo_helper.php:5-8` prohíbe.
5. **`cartera.php` e `info-credito.php` fallan en BDs sin FE ni facturas anteriores**, porque las vistas no existen (`cartera.php:20-24`, `info-credito.php:28-32`).
6. **DELETE de cliente con huérfanos** (`listar.php:214`) y **DELETE de factura anterior con pagos** (`factura-anterior.php:74`). Este último contradice la convención de no borrar registros contables.
7. **CodigoClien y RecCajaN con `MAX+1` sin lock.**

**Sospecha:** el desfase UTC/local en SQLite entre `pagos.php:168` (hora local de PHP) y `FechaApertura` (`CURRENT_TIMESTAMP` UTC) del cuadre (sin verificar).

**Contraste con PROCESOS_SISTEMA §2.3:** el contrato nombra el endpoint `api/pagos/crear.php`, pero el real es `api/clientes/pagos.php` (`action=pagar`). Cumple "no toca stock".
