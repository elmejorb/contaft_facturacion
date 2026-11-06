# FE — Consulta, representación gráfica, correo, eventos RADIAN y limpieza

**Propósito:** Panel de documentos electrónicos emitidos: listado por período, detalle con notas asociadas, PDF/tirilla, reenvío de correo, estado de eventos DIAN del adquiriente (acuse/aceptación/tácita/rechazo) y eliminación de documentos rechazados.

**Pantallas (frontend):**
- `components/FacturacionElectronica.tsx` (menú "Facturación Electrónica", `Dashboard.tsx:714,1603`; atajo en `PantallaInicio.tsx:58`, solo admin): listado (`:239-254`), resoluciones (`:256-263`), correo (`:337-365`), eliminar rechazados uno/masivo (`:393`, `:414-416`), estado email Brevo (`:454-455`), eventos batch y refresh (`:470`, `:488`), PDF carta (`:225`) o tirilla vía `mapFEtoDatosFactura` + `imprimirFactura` (`:55-129`, `:228-233`).
- `components/DetalleDocElectronico.tsx` (modal): detalle (`:50`), eventos (`:71-72`), PDF (`:216`).
- `components/ImpresionFactura.tsx`: `imprimirFactura` (`:565`) con bloque FE QR+CUFE+resolución (`:193-206`; QR vía `api.qrserver.com` `:199`).
- `components/NuevaVenta.tsx:1343`: abre `pdf.php?id=` tras FE autorizada.

**Endpoints (backend):** `facturacion-electronica/listar.php` GET; `detalle.php` GET `?id`; `pdf.php` GET `?id|?cufe`; `email.php` POST; `eventos.php` GET `?cufe[&refresh]` / POST batch; `eliminar.php` POST; `enviar.php` GET `?resoluciones=1` y `?email_status=1`.

## Flujos principales

### 1. Listar
- **Pantalla → endpoint:** `FacturacionElectronica.tsx:242-244` → `listar.php`.
- **Lee:** `electronic_documents` + `type_documents` + `tblclientes` + `tblventas (v.cufe = e.cufe)` + agregado de `detalle_document_electronic` (`listar.php:32-55`); `tblventas` con `enviada_dian=1` sin espejo FE (`:90-108`); años (`:113`).
- **Escribe:** nada. Recalcula `total = Σbase + Σiva − descuento` (`:57-68`).
- **Compatibilidad:** `YEAR()`/`MONTH()` (`:15-20`) emulados en SQLite (`db_factory.php:223-228`).

### 2. Detalle
- `DetalleDocElectronico.tsx:50` → `detalle.php`: lee `electronic_documents`, `type_documents`, `tblclientes`, `detalle_document_electronic` + `tblarticulos`, notas por `invoice_cufe` type IN (2,3), `tbldatosempresa` (Resolucion, Rango, Prefijo) (`detalle.php:15-103`, empresa `:102`). No escribe.

### 3. PDF
- `pdf.php`: lee `electronic_documents`, `tblclientes` + catálogos, `tbldatosempresa` (`SELECT *` `:91`), `detalle_document_electronic` + `tblarticulos` + `unit_measures` (`:101-112`). Requiere TCPDF (`:13-19`). Número = `prefix + number` (`:142-143`); vigencia resolución calculada como `FechaR + 2 años` (`:116`); busca TCPDF primero en ruta fija `C:/xampp/htdocs/facturacion-electronica/vendor` (`:9-12`); total recalculado (`:126-137`). No escribe.

### 4. Correo
- **Pantalla → endpoint:** `FacturacionElectronica.tsx:345-351` → `email.php`.
- **Lee:** `electronic_documents` + `tblclientes.Email` por cufe (`email.php:81`), `tbldatosempresa` credenciales (`:99`).
- **Escribe:** posible `ALTER TABLE electronic_documents ADD COLUMN email_recipient` en caliente (`:170-172`); `electronic_documents` UPDATE `email_sent=1, email_sent_at, email_recipient` (`:173-178`); `tblclientes` UPDATE `Email` si `update_cliente_email` (`:184-187`).
- **Efectos colaterales:** API `POST /login` (`:101`), `POST /api/email/send-complete` por destinatario (`:146`). Log por CUFE `logs/email_*.log`.
- **Transacción:** no.

### 5. Eventos RADIAN de FE emitidas
- `FacturacionElectronica.tsx:470` (POST `{cufes}`) / `:488` y `DetalleDocElectronico.tsx:71-72` (GET) → `eventos.php`: GET a `/api/documentos-electronicos/{cufe}/eventos-estado` (BD remota) o `/eventos` (DIAN en vivo) sin token (`eventos.php:30-75`, `:81-87`); batch con `curl_multi`, máx 8 conexiones, reintento 1s para 429/5xx (`:96-170`). No toca BD local.

### 6. Eliminar rechazados
- `FacturacionElectronica.tsx:393` / `:414-416` → `eliminar.php`.
- **Lee/Escribe:** `electronic_documents` (solo `status IN ('rechazado','error')` y sin cufe `:35-39`, `:59-67`) → DELETE `detalle_document_electronic` (`:86-89`) y DELETE `electronic_documents` (`:92-94`).
- **Transacción:** sí (`:78`, `:96`, `:106`). Usa `conta_tiene_tabla` de `config/helpers_polyfill.php` (`:14`, `:86`).

### 7. Resoluciones y estado de correo (GET en `enviar.php`)
- `?resoluciones=1` (`enviar.php:412-419`): login + `GET /api/resoluciones/company/{id}`.
- `?email_status=1` (`:422-466`): login + paginación `GET /api/empresas/{id}/documentos-electronicos` (hasta 50 páginas) con caché de archivo 5 min en `facturacion-electronica/cache/` (`:426-434`, `:461-462`).

## Dependencias
- **Usa de otros módulos:** `tbldatosempresa` (empresa-config), `tblclientes`, `tblarticulos`, `unit_measures`, `type_documents`; helpers `config/helpers_polyfill.php` (`conta_tiene_tabla`, `conta_tiene_columna`).
- **Lo usan otros módulos:** `ImpresionFactura.tsx` es compartido con POS (`SalesManagement.tsx:166`, `VentasTabs.tsx:180`, `DetalleFacturaModal.tsx:277`, `NuevaVenta.tsx:1350`).
- **Triggers / vistas:** ninguno. Existe `view_listado_facturas_electronica` en la plantilla (`conta_template_limpio.sql:4343`) sin uso en `api/` (sin verificar).
- **Compatibilidad:** `eliminar.php:52` usa `CONCAT`/`IFNULL` (SQLite ≥3.44 tiene `concat`; sin verificar versión embebida). `email.php:171` ejecuta `ALTER TABLE` en caliente.

## Qué se rompe si lo tocas
- Fórmula de total en `listar.php:62-64`, `detalle.php:56-57`, `pdf.php:136-137`, `FacturacionElectronica.tsx:108`: depende de que `line_extension_amount` sea base sin IVA y de qué contiene `electronic_documents.descuento` (ver fe-emision, hallazgos 8-9).
- `pdf.php` usa `prefix` del doc y cae a `Prefijo` de empresa si es NULL (`:119`, `:142`): si `prefix` queda NULL (FE móviles de `vendedores/pull.php:105-120`) sale el prefijo de la resolución local.
- `eliminar.php` solo protege por cufe/status; borrar un documento rechazado deja huérfano el abono de `tblpagos` con `Nfact_electronica="FCON-<id>"` (ver fe-emision).

## Evaluación de la implementación
**Confirmado:**
1. `listar.php:75` cuenta anulados con `status === 'anulada'`; la NC escribe `'anulado'` (`enviar.php:1264`) → resumen "anulados" siempre 0.
2. `mapFEtoDatosFactura` usa la suma de `discount_amount` de líneas como descuento (`FacturacionElectronica.tsx:104,108`) mientras `pdf.php` usa `electronic_documents.descuento` (`pdf.php:136`) → tirilla y PDF carta pueden mostrar totales distintos con descuento global.
3. `email.php` y `enviar.php` duplican `apiRequest`/login con formatos de respuesta distintos (`email.php:22-41` devuelve `{code, body}`; `enviar.php:21-46` devuelve el JSON plano).
4. Vigencia de resolución inventada (`FechaR + 2 años`) en `pdf.php:116` y `FacturacionElectronica.tsx:75-77`, no viene de la API de resoluciones.

**Sospecha:**
- QR de la tirilla depende de `api.qrserver.com` (`ImpresionFactura.tsx:199`), servicio externo: sin internet la tirilla FE sale sin QR.

**Contraste con PROCESOS_SISTEMA.md:** módulo de solo lectura salvo `eliminar.php`/`email.php`; no afecta stock/kardex/cartera.
