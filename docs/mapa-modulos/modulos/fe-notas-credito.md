# FE — Notas Crédito y Notas Débito

**Propósito:** Anular o ajustar una FE autorizada mediante Nota Crédito (NC, type_document_id=2) o cobrar un mayor valor con Nota Débito (ND). La NC de anulación total (concept_id=2) marca la FE como `anulado` y devuelve el inventario.

**Pantallas (frontend):**
- `components/FacturacionElectronica.tsx`: botón NC en grid de FE autorizadas tipo 1 (`:752`, visible si `cufe && status==='autorizado'` `:750`) → `NotaCreditoModal` (`:1185-1204`) → `enviarNotaCredito` (`:294-317`) con `doc_elec_id` (flujo nuevo) y `factura_n = factura_n_local` (id POS legacy si existía). ND: `enviarNotaDebito` (`:319-335`) con `factura_n` (sin verificar desde qué botón se abre `setShowNotaDebito`).
- `components/DetalleDocElectronico.tsx` (modal "Ver detalle" desde el grid): NC (`:96-142`) y ND (`:144-157`) enviando `factura_n: doc.number` (número DIAN), SIN `doc_elec_id` ni `concept_id`. Autorización admin (`AutorizacionAdminModal`) para devolución/anulación solo en frontend (`:100-107`).

**Endpoints (backend):** `facturacion-electronica/enviar.php` POST `action=nota_credito` (`:974-1313`), `action=nota_debito` (`:1315-1467`).

## Flujos principales

### 1. Nota Crédito (`nota_credito`)
- **Pantalla → endpoint:** `FacturacionElectronica.tsx:297-303` / `DetalleDocElectronico.tsx:111-137` → `enviar.php` `case 'nota_credito'`.
- **Rama:** flujo nuevo si `doc_elec_id>0` (`:982-1033`, items = TODO el detalle FE `:1018-1032`, ignora `items` del body); legacy con `factura_n` → `tblventas` (`:1034-1063`, usa items del body salvo concept 2 o vacío `:1045-1054`).
- **Lee:** `electronic_documents` (FE original, guard anti-doble NC por `invoice_cufe` + type 2 + 'autorizado' `:1072-1095`), `detalle_document_electronic`, `tblclientes` + catálogos DIAN (`buildInvoiceJSON` `:1112`), `tblventas`/`tbldetalle_venta` (legacy), `tblventa_retenciones` (vía buildInvoiceJSON, luego `unset withholding_taxes` `:1114`), `tblarticulos`.
- **Escribe:**
  - `electronic_documents` UPDATE aparcar `number=0` de prefijos NC/NCRE/NCRN/NCMA (`:1105-1109`).
  - Si aprobada: `electronic_documents` INSERT NC type 2, status 'autorizado', `number = $result['number']` (o placeholder `9000000000 + id%1e6` + nota `[REVISAR-NUMERO]`), `total = factura.Total`, `invoice_cufe` = CUFE FE (`:1199-1240`).
  - `detalle_document_electronic` INSERT…SELECT copiando TODO el detalle de la FE (`:1243-1255`).
  - Si concept_id=2: `tblventas` UPDATE EstadoFact='Anulada' (solo legacy `:1260-1263`); `electronic_documents` UPDATE status='anulado' WHERE cufe (`:1264-1265`); `tblarticulos` UPDATE `Existencia + cant` y `tblkardex` INSERT C_D=1 "NC {prefix}{number} — anula {prefijoFE}" por línea no-servicio (`:1274-1298`).
- **Efectos colaterales:** API externa `POST /login`, `POST /api/notas/credito/enviar` (`:1152`); 409 con `nota_existente` → no persiste nada, devuelve datos para registro manual (`:1156-1175`). Logs `logs/nc_*` y `_sin_number.json` (`:1146-1154`, `:1203-1208`). Stock + kardex solo concept 2. NO toca `tblpagos`, caja ni cartera directamente: la FE pasa a 'anulado' y sale de `vw_facturas_elec_cliente_saldos` (filtra 'autorizado', `actualizacion_completa.sql:1081`), de caja (`caja/sesion.php:167,196` filtran 'autorizado','pendiente') y de informes.
- **Transacción:** NO.
- **Consecutivos:** de la API (`number`, `:1186`); éxito detectado por CUFE o `status_code='00'` aunque `success=false` (`:1177-1189`).
- **Validaciones solo en frontend:** autorización admin para devolución/anulación (`DetalleDocElectronico.tsx:100-107`; backend ignora `admin_auth`, 0 ocurrencias en `enviar.php`). Confirmación "irreversible" (`FacturacionElectronica.tsx:1196-1201`).

### 2. Nota Débito (`nota_debito`)
- **Pantalla → endpoint:** `FacturacionElectronica.tsx:322-324` / `DetalleDocElectronico.tsx:149-151` → `enviar.php:1315-1467`.
- **Lee:** `electronic_documents` (por id o por cufe de `tblventas` `:1325-1366`), `tblclientes`, `MAX(number)` de type 5 prefix 'NDBS' (`:1380`).
- **Escribe:** NADA en BD local (solo log `logs/nd_*` `:1451-1459`).
- **Efectos colaterales:** API `POST /api/notas/debito/enviar` (`:1457`). No cartera, no caja.
- **Transacción:** n/a. **Consecutivos:** `MAX(number)+1` sobre filas type 5 que nunca se insertan → siempre 1 (sin verificar qué hace la API con ese `number`).
- **Validaciones solo en frontend:** `valor > 0` (`DetalleDocElectronico.tsx:145-146`); backend también exige `valor` (`:1323`).

## Dependencias
- **Usa de otros módulos:** `buildInvoiceJSON` (mismo archivo), `tblclientes`, `tblarticulos`, `tblkardex`, `tblventas` (legacy).
- **Lo usan otros módulos:** `facturacion-electronica/detalle.php:62-90` lista notas por `invoice_cufe` con `type_document_id IN (2,3)`; `listar.php` las muestra. Ningún módulo fuera de `facturacion-electronica/` filtra `type_document_id = 2` (grep sin resultados): informes, caja y cartera ignoran las NC.
- **Triggers / vistas:** `vw_facturas_elec_cliente_saldos` (efecto indirecto vía status 'anulado'). Sin triggers sobre `electronic_documents`.
- **Compatibilidad:** SQL estándar; `INSERT…SELECT` con subconsulta compatible MySQL/SQLite (sin verificar en SQLite).

## Qué se rompe si lo tocas
- El guard anti-doble NC depende de `invoice_cufe` + `type_document_id=2` + `status='autorizado'` (`:1072-1080`); cambiar el status de NC o el campo de referencia reabre el caso Nutrigranos (doble NC).
- El texto del kardex `"NC {prefix}{number} — anula …"` (`:1277`) es lo que busca la query 4.3 de PROCESOS_SISTEMA.md (`LIKE CONCAT('NC ', nc.prefix, nc.number, '%')`).
- `origNumber`/`origPrefix` (`:1064-1065`) alimentan `billing_reference` (`:1123-1128`): si `electronic_documents.number` de la FE quedó con `consecutive` compuesto (ver fe-emision), la NC referencia un número inexistente.
- `credit_note.number = id local de la FE` (`:1138-1139`) — semántica de la API externa (sin verificar).

## Evaluación de la implementación
**Confirmado:**
1. **NC parcial no es parcial:** flujo nuevo siempre sobreescribe `$items` con el detalle completo (`:1031-1032`) y la NC se guarda con `total = factura.Total` y copia todas las líneas (`:1230`, `:1243-1255`). Para concept 1/3/4/5 se emite a DIAN una NC por el valor total sin anular la FE (status sigue 'autorizado'), sin devolver stock y sin afectar cartera.
2. **`DetalleDocElectronico` envía namespace equivocado y concept por defecto:** `factura_n: doc.number` (número DIAN) sin `doc_elec_id` (`DetalleDocElectronico.tsx:111,151`) → rama legacy busca `tblventas.Factura_N = número DIAN` (`enviar.php:1037-1043`). No manda `concept_id` → backend usa 2 = anulación total (`:978`) aunque el usuario eligió "Devolución parcial" (`DetalleDocElectronico.tsx:114-128`); `valor_descuento` (`:130`) no se lee en el backend.
3. **Sin transacción:** INSERT NC, UPDATE FE 'anulado' y reversión de stock no son atómicos; un fallo a mitad deja NC en DIAN sin reverso local (el guard solo protege si el INSERT de la NC llegó).
4. **Reverso de stock sin idempotencia:** no hay chequeo `NOT EXISTS` sobre kardex (`:1281-1298`), a diferencia de `factura` (`:936-944`).
5. **ND no se persiste:** no hay INSERT en `electronic_documents` → no aparece en listado, ni en cartera (no suma a saldo), y `detalle.php:76` espera type 3 cuando el envío usa type 5 (`:1394`).
6. **Cartera tras anulación:** al pasar la FE a 'anulado' su saldo desaparece de la vista, pero los abonos `tblpagos` asociados permanecen 'Valida' (no hay UPDATE a tblpagos en `:1259-1299`) — el dinero recibido queda sin documento ni egreso de caja.

**Sospecha:**
- Si la FE se anuló el mismo día, `caja/sesion.php:167` deja de sumarla (filtro de status) y el cuadre puede mostrar sobrante del efectivo ya recibido (sin verificar en UI).

**Contraste con PROCESOS_SISTEMA.md:** §2.2 NC se cumple para concept 2 (INSERT type 2, copia detalle, FE 'anulado', stock+kardex C_D=1). No contempla NC parcial ni ND; el código tampoco los implementa correctamente.
