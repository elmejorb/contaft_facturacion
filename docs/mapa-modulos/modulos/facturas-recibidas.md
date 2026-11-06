# Facturas Recibidas (FE de proveedores) + Eventos DIAN 030-034

**Propósito:** Registrar facturas electrónicas emitidas por proveedores (ZIP/XML UBL), y emitir a la DIAN los eventos del adquiriente: 030 acuse, 032 recibo del bien, 033 aceptación expresa, 034 aceptación tácita, 031 reclamo. No genera compra contable ni inventario.

**Pantallas (frontend):**
- `components/FacturasRecibidas.tsx` (menú "Facturas Recibidas (FE)", `Dashboard.tsx:732,1604`): listar (`:63-64`), subir (`:88`), eliminar (`:121`), descargar XML (`:210`), abre `AplicarEventoModal` (`:302`) y `DetalleFacturaRecibida` (`:311`).
- `components/DetalleFacturaRecibida.tsx`: detalle (`:62`, `:75`), borrar evento (`:89`), limpiar no aprobados (`:106-108`), XML (`:147`).
- `components/AplicarEventoModal.tsx`: emitir evento (`:96`); reglas UX LGC12/exclusión (`:41-59`); 031 exige código+descripción, 034 exige nota (`:73-77`).

**Endpoints (backend):** `facturas-recibidas/subir.php` POST multipart; `listar.php` GET; `detalle.php` GET `?id`; `xml.php` GET `?id`; `eliminar.php` DELETE `?id` / POST `{action:'delete'}`; `evento-emitir.php` POST; `evento-eliminar.php` DELETE `?id` / POST `action=delete_evento|limpiar_no_aprobados`. Helper `helpers/xml-parser.php` (clase `App\FacturasRecibidas\XmlParser`).

## Flujos principales

### 1. Subir factura recibida
- **Pantalla → endpoint:** `FacturasRecibidas.tsx:88` → `subir.php`.
- **Lee:** archivo ZIP/XML (`XmlParser::extraerXmlDelArchivo` `xml-parser.php:30`, desenvuelve AttachedDocument `:63`), `facturas_recibidas` por cufe (idempotencia `subir.php:97-109`).
- **Escribe:** archivo en `uploads/facturas_recibidas/AAAA/MM/` (`:113-125`); `facturas_recibidas` INSERT (`:141-163`); `detalle_factura_recibida` INSERT por línea (`:165-178`).
- **Efectos colaterales:** ninguno sobre stock/kardex/caja/cartera/compras. Borra el archivo si falla el INSERT (`:180-184`).
- **Transacción:** sí (`:139`, `:179`, `:181`).
- **Consecutivos:** AUTO_INCREMENT; idempotencia por UNIQUE `uq_cufe` (`actualizacion_completa.sql:1408-1436`).
- **Validaciones solo en frontend:** ninguna; backend valida extensión, tamaño ≤20MB, CUFE ≥90 chars (`subir.php:53-90`).

### 2. Emitir evento (030/031/032/033/034)
- **Pantalla → endpoint:** `AplicarEventoModal.tsx:85-100` → `evento-emitir.php`.
- **Lee:** `facturas_recibidas` (`:135-142`), `eventos_factura_recibida` aprobados (`:145-150`), `tbldatosempresa` credenciales FE (`:67`).
- **Reglas locales:** idempotencia → 409 (`:153-161`); LGC12: 033/031 requieren 032 aprobado (`:163-171`); exclusión 033↔031 (`:173-182`); 031 requiere código+descripción, 034 requiere `note` (`:121-130`).
- **Escribe:** `eventos_factura_recibida` INSERT 'pendiente' antes del envío (`:209-223`) y UPDATE con cude, dian_status, api_response, estado 'aprobado'/'rechazado' (`:249-260`).
- **Efectos colaterales:** API externa `POST /login` (`:74-95`) y `POST /api/eventos/acuse` sin token, timeout 120s (`:227-240`).
- **Transacción:** no. **Consecutivos:** CUDE devuelto por la API.
- **Validaciones solo en frontend:** ninguna adicional (el backend replica las del modal).

### 3. Listar / detalle / XML
- `listar.php`: `facturas_recibidas` LEFT JOIN `eventos_factura_recibida`, `GROUP_CONCAT(DISTINCT … ORDER BY …)`, flags `tiene_0xx` (`listar.php:41-55`), `YEAR/MONTH` (`:24-28`).
- `detalle.php`: cabecera + líneas + eventos (`detalle.php:23-60`).
- `xml.php`: sirve el archivo de `xml_path` como attachment (`xml.php:21-48`).

### 4. Eliminar factura / eventos
- `eliminar.php`: bloquea con 409 si hay eventos aprobados (`eliminar.php:33-47`); DELETE eventos, detalle, cabecera en transacción (`:59-68`); borra archivo (`:70-75`).
- `evento-eliminar.php`: nunca borra aprobados (409 `:69-76`); `limpiar_no_aprobados` borra rechazados/pendientes (`:33-50`). Sin transacción.

## Dependencias
- **Usa de otros módulos:** `config/database.php`; `tbldatosempresa.email_factelect/password_factelect` (empresa-config). Duplica el login FE en función propia `loginFacturadorElectronico` (`evento-emitir.php:66-96`) en vez de reutilizar `enviar.php`.
- **Lo usan otros módulos:** ninguno fuera de `facturas-recibidas/` (grep `facturas_recibidas|eventos_factura_recibida` en `api/`). `facturas_recibidas.compra_id` (FK a compras, `actualizacion_completa.sql:1430`) nunca se escribe (grep `compra_id` sin resultados en `facturas-recibidas/`). `InformeRetencionesRecibidas.tsx` existe pero no consume estos endpoints (sin verificar).
- **Triggers / vistas:** columna generada `aprobado_marker` + UNIQUE `uq_solo_aprobado (factura_recibida_id, aprobado_marker)` (`actualizacion_completa.sql:1479-1483`); en SQLite `uq_eventos_factura_recibida_uq_solo_aprobado` (`schema_sqlite_cliente.sql:2778`).
- **Compatibilidad:** `GROUP_CONCAT(DISTINCT … ORDER BY …)` (`listar.php:42`) no es válido en SQLite (sin verificar versión embebida); `YEAR/MONTH` emulados (`db_factory.php:223-228`). Columna generada STORED en MySQL ≥5.7.

## Qué se rompe si lo tocas
- `event_code` como VARCHAR '030'… y estado `'aprobado'` alimentan el UNIQUE parcial y los flags de `listar.php:43-47`; cambiar valores rompe idempotencia y UI.
- Labels `EVENT_LABELS` (`evento-emitir.php:51-58`): DIAN valida texto exacto (regla AAH04, comentario `:49-50`).
- Ruta `uploads/facturas_recibidas/` relativa a la raíz del backend (`subir.php:113-125`, `xml.php`, `eliminar.php:71-74`): en modo embedded el docRoot es `api/` (`empresa/datos.php:13-14`) — `xml.php` lee por filesystem, no por URL, así que no se afecta (sin verificar en embedded).

## Evaluación de la implementación
**Confirmado:**
1. `emisor_dv` y `emisor_organization_type` nunca se pueblan: `subir.php:141-147` no los inserta y `XmlParser::extraerDatosFactura` no los extrae (`xml-parser.php:107-120`) → `evento-emitir.php:198` envía siempre `issuer_organization_type='1'` (default columna) y nunca `issuer_dv` (`:200`).
2. `usuario_id` del evento siempre NULL: el backend lo lee de `$in['usuario_id']` (`evento-emitir.php:210`) pero `AplicarEventoModal.tsx:85-95` no lo envía.
3. No se valida que `receptor_nit` sea el NIT de la empresa (`subir.php` no consulta `tbldatosempresa`) → se pueden registrar y aceptar facturas de terceros.
4. Las reglas locales no exigen 030 antes de 032 ni 032 antes de 034, y no excluyen 034 frente a 031 (`evento-emitir.php:152-182`).
5. Un evento que muere por timeout queda 'pendiente' (`:216`) y no cuenta como aprobado → reintento permitido aunque DIAN sí lo haya registrado.
6. Sin integración con compras/inventario/CxP: la factura recibida no crea `tblpedidos` ni movimientos (`compra_id` muerto).

**Contraste con PROCESOS_SISTEMA.md:** no cubierto por el contrato; el módulo no toca tablas contables.
