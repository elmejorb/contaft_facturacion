# FE — Emisión de Factura Electrónica (borrador → DIAN)

**Propósito:** Crear la factura electrónica de venta (FE) como borrador local en `electronic_documents` y enviarla a la DIAN vía la API propia (api-electronica.innovacion-digital.com). Desde v4.6 la FE vive SOLO en `electronic_documents`/`detalle_document_electronic`; el POS vive solo en `tblventas` (`ventas/nueva.php:154-159`, `:271-277`). Stock y kardex se mueven al AUTORIZAR, no al crear el borrador (`ventas/nueva.php:341-353`, `enviar.php:907-955`).

**Pantallas (frontend):**
- `components/NuevaVenta.tsx` (vista `nueva-venta`): selector tipo documento `electronica`/`soporte`; guarda vía `ventas/nueva.php` y luego llama `enviar.php action=factura` (`NuevaVenta.tsx:1584-1704`). Botón "Guardar Borrador" → `guardar_borrador`/`actualizar_borrador` (`NuevaVenta.tsx:1137-1189`). Carga borrador desde localStorage `borrador_para_editar` → `cargar_borrador` (`NuevaVenta.tsx:817-828`). Copia de FE desde `fe_para_copiar_id` → `copiar.php` (`NuevaVenta.tsx:886-902`).
- `components/FacturacionElectronica.tsx` (menú "Facturación Electrónica", vista `facturacion-electronica`, `Dashboard.tsx:714,1603`): editar/eliminar borrador (`FacturacionElectronica.tsx:195-218`), enviar legacy `factura` con `factura_n` (`:265-280`, botón `:789`), `preview` (`:282-292`).

**Endpoints (backend):**
- `ventas/nueva.php` POST con `tipo_documento='electronica'|'soporte'` (rama FE `:278-461`).
- `facturacion-electronica/enviar.php` POST `action=`: `factura`, `guardar_borrador`, `cargar_borrador`, `actualizar_borrador`, `eliminar_borrador`, `preview`, `factura_preview`, `consultar`, `login`; `listar_borradores` está en `$LOCAL_ACTIONS` (`:568`) pero NO tiene `case` → cae en `default` "Acción no válida" (`:2085-2086`).
- `facturacion-electronica/copiar.php` GET `?id=` (precarga NuevaVenta).

## Flujos principales

### 1. Crear borrador FE desde Nueva Venta
- **Pantalla → endpoint:** `NuevaVenta.tsx:1616` → `ventas/nueva.php` POST (`tipo_documento` en body `:1587`).
- **Lee:** `tblsesiones_caja` (guard caja abierta `nueva.php:167-180`), `tbldatosempresa` (Regimen, IvaIncluido `:186`), `tblarticulos` (Servicio, nombre, unit_measure `:393-405`), `information_schema`/`pragma_table_info` (columnas `saldo`, `entregado` `:308-319`, `:358-369`).
- **Escribe:**
  - `electronic_documents` UPDATE `number = 9000000000+id` de borradores/pendientes/rechazados con mismo prefix y number=0 (`:296-300`).
  - `electronic_documents` INSERT status='borrador', prefix 'FCON' (o 'DS', type 11), number 0 (`:323-339`).
  - `detalle_document_electronic` INSERT por línea (IVA siempre extraído del precio `:397-400`; `entregado` si existe la columna `:411,424`).
  - `tblpagos` INSERT abono inicial si crédito y abono>0, con `Fact_N=NULL`, `Nfact_electronica = "FCON-<id>"` (`:429-447`, `$refKardex` `:382`).
- **Efectos colaterales:** NO stock, NO kardex (`:341-353`, `:426`). Cartera: abono en `tblpagos` desde el borrador (antes de DIAN). Sync: trigger `trg_sync_pago_insert` sobre `tblpagos` (`actualizacion_completa.sql:2584`).
- **Transacción:** sí — `nueva.php:138` beginTransaction, `:449` commit, `:730` rollBack.
- **Consecutivos:** `electronic_documents.id` AUTO_INCREMENT; `number` provisional 0 (UNIQUE `uq_prefix_number` `actualizacion_completa.sql:700` obliga a "aparcar" otros 0 en 9e9+id). `tblpagos.RecCajaN = MAX+1` sin bloqueo (`nueva.php:432`).
- **Validaciones solo en frontend:** cupo de crédito / override admin (`NuevaVenta.tsx:1539-1544`; `nueva.php` no valida cupo — grep "cupo" sin resultados). Stock negativo y venta bajo costo: no se validan en `nueva.php` (grep "negativ"/"costo" sin resultados) (sin verificar dónde las aplica el frontend). Backend sí valida abono < total en crédito (`nueva.php:234-241`).

### 2. Enviar FE a DIAN (`action=factura`)
- **Pantalla → endpoint:** `NuevaVenta.tsx:1671-1684` (manda `doc_elec_id` + `factura_n` = mismo id) → `enviar.php` `case 'factura'` (`:587-972`). También `NuevaVenta.tsx:1405-1411` (reintento, SOLO `factura_n`) y `FacturacionElectronica.tsx:268-270` (SOLO `factura_n`, grid ventas legacy `:789`).
- **Rama:** "flujo nuevo" si `doc_elec_id>0` (`:592-645`, lee `electronic_documents` + `detalle_document_electronic`); "legacy" si solo `factura_n` (`:646-661`, lee `tblventas`/`tbldetalle_venta`).
- **Lee:** `tbldatosempresa` (credenciales FE `:49-53`, Regimen `:197`), `tblclientes` + `type_liabilities`, `type_organizations`, `type_regimes`, `municipalities`, `departments`, `tipos_documentos` (`:118-137`), `tblventa_retenciones` + `tblretenciones` por `Factura_N` (`:294-319`), `electronic_documents.customer_email` de intentos previos (`:684-692`), `tblarticulos`.
- **Escribe:**
  - `electronic_documents` UPDATE status='pendiente' (+customer_email) en flujo nuevo (`:763-764`); en legacy UPDATE aparcar FCON-0 (`:743-747`) + INSERT status 'pendiente' (`:766-779`).
  - `detalle_document_electronic` INSERT solo en legacy (`:783-840`).
  - Tras éxito: `tblventas` UPDATE enviada_dian/cufe solo legacy (`:861-864`); `electronic_documents` UPDATE status='autorizado', prefix (si viene), `number = $result['consecutive']`, cufe, dian_response, email_sent (`:857-858`, `:898-905`).
  - `tblarticulos` UPDATE `Existencia - cant` y `tblkardex` INSERT C_D=2 "Venta FE Nº {prefix}-{consecutive} [#{id}]" por línea no-servicio, idempotente por marcador `[#id]` (`:917-955`).
  - Tras fallo: `electronic_documents` UPDATE status='rechazado' (`:956-960`).
- **Efectos colaterales:** API externa: `POST /login` (`:56-71`), `POST /api/factura/send-v2` (`:850`), `POST /api/email/send-complete` si `send_email` (`:869-891`). Logs JSON en `facturacion-electronica/logs/factura_*` (`:843-853`). Stock + kardex (ver arriba). No toca `tblpagos` (el abono ya se creó en el borrador). Caja: los totales de FE contado se leen de `electronic_documents` (`caja/sesion.php:167`).
- **Transacción:** NO (ningún beginTransaction en `:587-972`). La API puede autorizar y el UPDATE local fallar → FE autorizada en DIAN sin reflejo local.
- **Consecutivos:** asignados por la API externa. Se guarda `consecutive` (`:858`, `:900-904`), NO `number`. Contraste: NC usa `number` y documenta que `consecutive` es un id compuesto (`:1180-1186`). (sin verificar si `send-v2` devuelve `consecutive` compuesto o el entero real.)
- **Validaciones solo en frontend:** ninguna adicional; backend valida NIT, nombre, fecha, líneas, días crédito (FAN04) y abono ≤ total (`validateInvoiceForDIAN` `:84-114`, uso `:666-674`).

### 3. Borradores (`guardar_borrador`, `cargar_borrador`, `actualizar_borrador`, `eliminar_borrador`)
- **Pantalla → endpoint:** `NuevaVenta.tsx:1144-1179` → `enviar.php` `guardar_borrador` (`:1593-1687`) / `actualizar_borrador` (`:1954-2038`); `NuevaVenta.tsx:826-828` → `cargar_borrador` (`:1888-1950`); `FacturacionElectronica.tsx:210-212` y `NuevaVenta.tsx:1637-1640` → `eliminar_borrador` (`:2041-2058`).
- **Lee:** `electronic_documents`, `detalle_document_electronic`, `tblarticulos`, `tblclientes`.
- **Escribe:** `electronic_documents` UPDATE aparcar FCON-0 + INSERT 'borrador' (`:1621-1646`) / UPDATE cabecera (`:1989-2002`) / DELETE (`:2055`); `detalle_document_electronic` INSERT (`:1649-1678`) / DELETE+INSERT (`:2005-2034`) / DELETE (`:2054`).
- **Efectos colaterales:** ninguno sobre stock/kardex/caja/cartera. `guardar_borrador` NO crea abono en `tblpagos` (a diferencia de `nueva.php:431-447`).
- **Transacción:** sí (`:1619/1680`, `:1984/2036`, `:2053/2056`) pero sin try/rollBack local: una excepción va al catch global (`:2089-2090`) sin rollBack explícito.
- **Consecutivos:** id AUTO_INCREMENT; number 0.
- **Validaciones solo en frontend:** ninguna relevante; backend valida NIT/nombre en guardar (`:1611-1617`) pero NO en actualizar (`:1982`).
- **Nota:** `actualizar_borrador` NO está en `$LOCAL_ACTIONS` (`:568`) → exige login exitoso a la API externa (`:574-580`) para editar un borrador local.

### 4. Preview / modo prueba / consulta
- `preview` (`FacturacionElectronica.tsx:284-286` → `enviar.php:2068-2083`): arma JSON desde `tblventas` sin enviar; requiere login.
- `factura_preview` (`NuevaVenta.tsx:1652-1654`, si `cfgFE.modoPruebaFE`) → `enviar.php:499-563`: lee `tblventas WHERE Factura_N = factura_n` y llama `POST /api/factura/preview-xml` sin token. En flujo FE el frontend pasa `factN = doc_elec_id` (`NuevaVenta.tsx:1627`) → lee la venta POS con ese número, no la FE.
- `consultar` (`enviar.php:2060-2066`): `POST /api/status/zip/{zipKey}`. Sin uso en frontend (grep `consultar` en FE screens sin resultados).
- `login` (`:583-585`): devuelve token. Sin uso en frontend (sin verificar).

### 5. Copiar FE a nueva venta (`copiar.php`)
- **Pantalla → endpoint:** `FacturacionElectronica.tsx:186-190` / `DetalleDocElectronico` `onCopiar` (`FacturacionElectronica.tsx:1169`) → localStorage → `NuevaVenta.tsx:902` → `copiar.php?id=`.
- **Lee:** `electronic_documents`, `tblventas WHERE Factura_N = electronic_documents.number` (`copiar.php:46-53`), `tblclientes` (`:66-78`), `detalle_document_electronic` + `tblarticulos` (precio de catálogo, no el facturado `:86-107`).
- **Escribe:** nada. **Transacción:** n/a.

## Dependencias
- **Usa de otros módulos:** `config/database.php` (→ `db_factory.php` `database.php:29`); `tblsesiones_caja` (caja); `tblclientes` + catálogos DIAN; `tblventa_retenciones`/`tblretenciones` (retenciones); `tbldatosempresa` (empresa-config); `tblpagos` (cartera). Ninguna llamada a helpers de `api/utils`.
- **Lo usan otros módulos:**
  - Cartera: `vw_facturas_elec_cliente_saldos` (une `tblpagos.Nfact_electronica` CAST UNSIGNED = `electronic_documents.id`, solo `status='autorizado'`, `payment_form_id=2`, `type_document_id=1`; `actualizacion_completa.sql:1049-1083`) consumida por `clientes/cartera.php:24`, `clientes/detalle.php:53,91`, `clientes/info-credito.php:32`, `clientes/pagos.php:255-298` (abonos FE insertan `Nfact_electronica = id` `pagos.php:277-298`).
  - Caja: `caja/sesion.php:167,196,466,476` suman `efectivo/valorpagado1/total` de FE con `status IN ('autorizado','pendiente')` por `created_at`.
  - Informes/Dashboard: `informes/resumen.php:66-68,126-129,201-203,223-226`, `informes/ingresos-totales.php:70-75`, `dashboard/resumen.php:23,77-81,99,112` (solo `autorizado`, type 1; costo desde `detalle_document_electronic.PrecioCosto`).
  - Fabricación: `ventas/pendientes-entrega.php:79-85` (lee `entregado='N'` de FE autorizadas); `ventas/marcar-entregado.php:45,72,104` descuenta stock + kardex al entregar línea FE y actualiza `detalle_document_electronic.entregado/cantidad_entregada`.
  - Vendedores móvil: `vendedores/pull.php:80-120` INSERT/UPDATE `electronic_documents` origen='movil' (sin detalle, sin prefix/number); `vendedores/pedidos.php:218`, `vendedores/config.php:19` leen.
  - Ventas POS: `ventas/detalle-factura.php:114-118` consulta `electronic_documents WHERE number = Factura_N AND prefix='FE'`.
- **Triggers / vistas de BD involucrados:** `vw_facturas_elec_cliente_saldos` (arriba). Triggers de sync existen sobre `tblventas`, `tblpagos`, `tblarticulos` (`actualizacion_completa.sql:2551-2622`); NINGUNO sobre `electronic_documents`/`detalle_document_electronic`/`tblkardex` (grep TRIGGER). UNIQUE `uq_prefix_number` (`:700`).
- **Compatibilidad:** `nueva.php` detecta driver para columnas (`:308-319`, `:358-369`). `enviar.php` no usa funciones MySQL-only en los flujos de emisión, salvo `DATEDIFF` en `listar_contingencias` (ver fe-contingencia). En SQLite la vista `vw_facturas_elec_cliente_saldos` figura como stub de placeholders (`schema_sqlite_cliente.sql:2433`) — definición real en SQLite (sin verificar).

## Qué se rompe si lo tocas
- Cambiar el formato de `tblpagos.Nfact_electronica` del abono inicial: hoy `nueva.php:445` guarda `"FCON-<id>"` pero la vista hace `CAST(NULLIF(Nfact_electronica,'') AS UNSIGNED)` (`actualizacion_completa.sql:1072-1081`) → en MySQL `CAST('FCON-123' AS UNSIGNED)=0` → el abono inicial NO descuenta el saldo FE en cartera; `clientes/pagos.php:288-297` sí guarda el id numérico. Unificar formato afecta cartera, info-crédito y caja.
- Cambiar qué campo de la API se guarda en `electronic_documents.number` (`enviar.php:858,900-904`): afecta PDF (`pdf.php:143`), `billing_reference` de NC/ND (`enviar.php:1064,1124,1377,1396`), búsqueda de FE para abonar en `clientes/pagos.php:257` (prefix+number), detalle de kardex `Venta FE Nº` y la query diagnóstico 4.2 de PROCESOS_SISTEMA.md (LIKE prefix/number).
- Cambiar el marcador `[#id]` del detalle kardex (`enviar.php:925,936-937`): rompe la idempotencia en reintentos (doble descuento de stock).
- Cambiar estados (`borrador/pendiente/autorizado/rechazado/anulado`): caja (`sesion.php:167,196` usa `'autorizado','pendiente'`), informes (`'autorizado'` o `'autorizado','aprobado'`), cartera (vista `'autorizado'`), `listar.php:75` cuenta `'anulada'` (nunca escrito; NC escribe `'anulado'` `enviar.php:1264`).
- Cambiar el cálculo de IVA/total en `nueva.php:397-400` vs `buildInvoiceJSON` (`enviar.php:206-247`): el detalle local y lo enviado a DIAN deben coincidir; `listar.php:62-64`, `detalle.php:57`, `pdf.php:126-137` recalculan total desde `line_extension_amount + tax_amount - descuento`.
- Mover el descuento de stock fuera de `case 'factura'`: rompe contrato §2.2 y el modo fabricación (ver evaluación).

## Evaluación de la implementación
**Confirmado:**
1. **`consecutive` vs `number`:** `factura` (`enviar.php:858`) y `reenviar_contingencia` (`:1567`) guardan `$result['consecutive']` en `number`; NC ya migró a `number` (`:1186`) con comentario de que `consecutive` es id compuesto (`:1180-1182`). Riesgo: FE con número erróneo en PDF, NC referenciando número equivocado, abonos FE que no encuentran el documento.
2. **Retenciones cruzadas con POS:** en flujo nuevo `$factura['Factura_N'] = electronic_documents.id` (`enviar.php:608`) y `buildInvoiceJSON` busca `tblventa_retenciones WHERE Factura_N = ?` (`:294-304`). `nueva.php` rama FE NO guarda retenciones (solo la rama POS `:698-716`, después del `exit` FE `:460`). Resultado: una FE con id N envía a DIAN las retenciones de la venta POS N.
3. **Reintento DIAN desde Nueva Venta usa namespace POS:** `NuevaVenta.tsx:1405-1411` manda solo `factura_n` (= `doc_elec_id` en FE, `:1627`) → `enviar.php:646-651` busca `tblventas.Factura_N = id FE` → envía la venta POS homónima a DIAN o "Factura no encontrada". Igual `factura_preview` (`:1654`).
4. **Sin guarda de estado al enviar:** `case 'factura'` flujo nuevo no verifica `status` antes de reenviar (`:596-600`, `:763`); un doble envío de una FE ya `autorizado` llega a DIAN otra vez y sobreescribe number/cufe. El kardex no se duplica gracias a `[#id]`.
5. **Doble descuento en modo fabricación:** `case 'factura'` baja stock de TODAS las líneas (`:938-955`, sin filtro `entregado`), y `marcar-entregado.php:71-73` vuelve a bajar al entregar líneas FE `entregado='N'`. El POS sí omite las líneas no entregadas (`nueva.php:579`).
6. **Abono FE huérfano:** el abono en `tblpagos` se crea en el borrador (`nueva.php:431-447`), antes de DIAN. Si la FE es rechazada/eliminada (`eliminar.php:86-93`, `eliminar_borrador :2054-2055`) el pago queda sin documento. Contrato §2.2 dice que el abono va "tras aprobada".
7. **Régimen inconsistente:** `nueva.php:189-191` considera responsable de IVA cualquier Regimen que contenga "responsable" → "No Responsable" (`DatosEmpresa.tsx:204`) calcula IVA local; `buildInvoiceJSON` (`enviar.php:199-204`) envía IVA 0. El detalle local (tax_amount) difiere de lo autorizado.
8. **IVA del borrador manual sumado encima:** `guardar_borrador`/`actualizar_borrador`/`convertir_a_borrador` guardan `line_extension_amount = subtotal bruto` y `tax_amount = subtotal*iva/100` (`:1672-1676`, `:2028-2032`, `:1864-1868`), mientras `nueva.php:399-400` extrae el IVA. `listar.php`/`detalle.php`/`pdf.php` suman ambos → total inflado en borradores de esas rutas.
9. **Descuento de línea restado dos veces en pantallas:** `nueva.php:333` guarda `descuento = global + Σ desc. línea` (`:202,218`); `line_extension_amount` ya resta el desc. de línea (`:397-400`); `listar.php:62-64`, `detalle.php:56-57`, `pdf.php:136-137` restan `descuento` completo otra vez. `buildInvoiceJSON` sí lo corrige (`:255-257`).
10. `copiar.php:46-53` busca snapshot del comprador en `tblventas.Factura_N = electronic_documents.number` (namespaces distintos) → datos de comprador ocasional de una venta POS ajena.
11. `listar_borradores` declarado pero sin `case` (`enviar.php:568` vs switch).
12. Cero transacciones en el envío (contrato §1.1 pide transacción "si es posible").

**Sospecha:**
- `GET resoluciones` y `email_status` (`enviar.php:412-466`) hacen login en cada llamada; `email_status` puede pedir hasta 50 páginas (`:441`) — riesgo de rate-limit (el comentario de `eventos.php:101` menciona 20 r/s).

**Contraste con PROCESOS_SISTEMA.md:** §2.2 FE se cumple en lo esencial (borrador sin stock; stock+kardex al autorizar; rechazo solo cambia status). Desvíos: abono en `tblpagos` al crear borrador y no tras aprobación; la regla "FE replica validaciones POS" (§5) no se cumple para cupo/negativos (no hay validación backend en ninguno de los dos) y para `entregado` (POS lo respeta, FE no).
