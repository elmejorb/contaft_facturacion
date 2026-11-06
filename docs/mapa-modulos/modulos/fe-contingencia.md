# FE — Contingencia y rescate (marcar, reenviar, convertir a borrador)

**Propósito:** Manejar facturas que no pudieron emitirse a la DIAN: marcarlas en contingencia, listarlas y reenviarlas cuando vuelva la conexión, o "convertir" la venta fallida en un borrador FE (anulando la venta POS asociada). Diseñado sobre el modelo legacy (FE dentro de `tblventas`).

**Pantallas (frontend):**
- `components/NuevaVenta.tsx`: modal de FE fallida / barra amarilla → `aceptarContingencia` (`:1376-1392`), `reintentarDian` (`:1399-1432`), `convertirEnBorrador` (`:1454-1479`).
- `components/FacturacionElectronica.tsx`: modal contingencias (`:808`) → `listar_contingencias` (`:373-375`), `reenviar_contingencia` una / todas (`:424-445`, `:1000`, `:1018`).

**Endpoints (backend):** `facturacion-electronica/enviar.php` POST `action=marcar_contingencia` (`:474-482`, sin login), `listar_contingencias` (`:484-496`, sin login), `reenviar_contingencia` (`:1469-1585`, con login), `convertir_a_borrador` (`:1703-1883`, local).

## Flujos principales

### 1. Marcar contingencia
- **Pantalla → endpoint:** `NuevaVenta.tsx:1380-1382` (`factura_n: factN`) → `enviar.php:474-482`.
- **Lee:** nada. **Escribe:** `tblventas` UPDATE `en_contingencia=1, contingencia_fecha, contingencia_motivo, contingencia_reenviada=0` WHERE `Factura_N` (`:478-479`).
- **Efectos colaterales:** ninguno sobre stock/kardex/caja/cartera. **Transacción:** no. **Consecutivos:** n/a.
- **Validaciones solo en frontend:** ninguna.

### 2. Listar contingencias
- **Pantalla → endpoint:** `FacturacionElectronica.tsx:373-375` → `enviar.php:484-496`.
- **Lee:** `tblventas WHERE en_contingencia=1 AND contingencia_reenviada=0 AND EstadoFact='Valida'` con `DATEDIFF(CURRENT_TIMESTAMP, ...)` (`:485-492`). **Escribe:** nada.

### 3. Reenviar contingencia
- **Pantalla → endpoint:** `FacturacionElectronica.tsx:426-428` → `enviar.php:1469-1585`.
- **Lee:** `tblventas` (`en_contingencia=1` `:1475`), `tbldetalle_venta` + `tblarticulos` (`:1480-1487`), `tblclientes` (email), `electronic_documents` pendiente/rechazado con `number=0`, mismo total e identificación (`:1506-1508`), `tbldatosempresa`, `tblventa_retenciones` (vía `buildInvoiceJSON`).
- **Escribe:** `electronic_documents` UPDATE aparcar FCON-0 + INSERT 'pendiente' si no hay previo (`:1515-1551`); tras éxito `tblventas` UPDATE enviada_dian, cufe, `contingencia_reenviada=1` (`:1568-1569`) y `electronic_documents` UPDATE 'autorizado', `number = consecutive`, cufe (`:1570-1571`); tras fallo UPDATE 'rechazado' (`:1573-1574`).
- **Efectos colaterales:** API `POST /login`, `POST /api/factura/send-v2` (`:1561`); logs `logs/contingencia_*`. NO inserta `detalle_document_electronic` y NO mueve stock/kardex (la venta POS original ya lo movió en `ventas/nueva.php` rama POS `:509-579`, sin verificar en detalle). No envía email aunque `send_email` (solo lo marca en el JSON `:1491-1502`; `send-v2` lo ignora según `:866-867`).
- **Transacción:** no. **Consecutivos:** API; guarda `consecutive` (`:1567`).

### 4. Convertir a borrador
- **Pantalla → endpoint:** `NuevaVenta.tsx:1460-1462` (`factura_n: factN, doc_local_id`) → `enviar.php:1703-1883`.
- **Lee:** `tblventas` (`:1714-1726`), `electronic_documents` (guard de FE emitida `:1731-1749`), `tbldetalle_venta` (`:1752-1754`), `tblarticulos`.
- **Escribe:**
  - `tblarticulos` UPDATE `Existencia + cant` y `tblkardex` INSERT C_D=1 "Conversion FV-{n} a borrador FE" por línea no-servicio (`:1757-1778`).
  - `tblventas` UPDATE `EstadoFact='Anulada', Saldo=0` (`:1781-1782`).
  - `electronic_documents`: si `doc_local_id>0` aparcar otros FCON-0 + UPDATE `status='borrador', number=0` (`:1788-1795`); si no, aparcar + INSERT 'borrador' (`:1803-1839`).
  - `detalle_document_electronic` INSERT desde `tbldetalle_venta` (solo rama sin doc `:1842-1870`).
- **Efectos colaterales:** stock+kardex (reverso), POS anulada. NO revierte `tblpagos` (abono inicial POS), NO genera egreso de caja.
- **Transacción:** sí (`:1711`, commit `:1873`, rollBack `:1718,1723,1743,1880`).
- **Consecutivos:** id AUTO_INCREMENT; number 0.
- **Validaciones solo en frontend:** ninguna; backend bloquea si ya está Anulada (`:1722-1726`).

## Dependencias
- **Usa de otros módulos:** `tblventas`/`tbldetalle_venta` (ventas POS), `tblarticulos`/`tblkardex` (inventario), `buildInvoiceJSON`.
- **Lo usan otros módulos:** columnas `en_contingencia`, `contingencia_*` de `tblventas` (`migracion_v4.3_contingencia.sql`); `listar.php:93-108` muestra ventas con `enviada_dian=1` sin espejo en `electronic_documents`. Caja suma FE `status='pendiente'` (`caja/sesion.php:167,196`).
- **Triggers / vistas:** `trg_sync_venta_update` AFTER UPDATE ON `tblventas` (`actualizacion_completa.sql:2556`) se dispara en marcar/reenviar/convertir.
- **Compatibilidad:** `DATEDIFF` (`:488`) es MySQL; en SQLite lo emula `db_factory.php:265` (sqliteCreateFunction). PDO en `ERRMODE_EXCEPTION` (`db_factory.php:73,97`, `database.php:58`).

## Qué se rompe si lo tocas
- Todo este módulo asume que `factura_n` es `tblventas.Factura_N`. Desde v4.6 `NuevaVenta` pasa el id de `electronic_documents` como `factN` para FE (`NuevaVenta.tsx:1627`, `:1693`, `:1699`). Cambiar el contrato de ids afecta los cuatro flujos.
- El guard de `convertir_a_borrador` compara status `('aprobado','aceptado','valida','pendiente_dian')` (`:1733`) — si se normalizan estados hay que incluir `'autorizado'`.

## Evaluación de la implementación
**Confirmado:**
1. **Contingencia/rescate opera sobre la venta POS equivocada en el flujo FE v4.6+:** tras un fallo DIAN, `NuevaVenta` guarda `factN = doc_elec_id` (`:1627`, `:1693`) y luego llama `marcar_contingencia` (`:1382`) o `convertir_a_borrador` (`:1462`) con `factura_n: factN`. El backend actúa sobre `tblventas.Factura_N = <id de electronic_documents>` (`enviar.php:478`, `:1714`): marca en contingencia, o ANULA y reversa stock de una venta POS no relacionada que tenga ese número.
2. **Guard de "FE ya emitida" inefectivo:** busca status `aprobado/aceptado/valida/pendiente_dian` (`:1733`), pero el sistema escribe `'autorizado'` (`:900-904`). Con `doc_local_id>0` de una FE autorizada, el UPDATE `status='borrador', number=0` (`:1793`) se ejecutaría igual. Además referencia `id_venta_pos` (`:1735`) que no existe en el esquema (`actualizacion_completa.sql:663-703`); con PDO en `ERRMODE_EXCEPTION` (`db_factory.php:73,97`) el `execute` lanza "Unknown column" y el try/catch lo silencia (`:1747-1749`) → el guard completo queda sin efecto en BDs sin esa columna (grep `id_venta_pos` en `actualizacion_completa.sql`: sin resultados).
3. **Reenvío no guarda detalle FE:** la fila `electronic_documents` creada (`:1539-1551`) no tiene `detalle_document_electronic` → `listar.php`/`pdf.php` muestran total desde campo cacheado y PDF sin líneas; informes de costo FE (`informes/resumen.php:126-129`) no la ven.
4. Reenvío guarda `consecutive` en `number` (`:1567`, `:1570`) — ver fe-emision.
5. `convertir_a_borrador` no anula el abono inicial en `tblpagos` de la venta POS (sin UPDATE a tblpagos en `:1711-1873`) → pago fantasma contra una factura anulada (contradice regla "facturas anuladas se excluyen de todo" en memoria del proyecto).
6. Reuso de documento previo por `total` + identificación (`:1506`) puede tomar el doc rechazado de OTRA factura del mismo cliente y mismo total.

**Contraste con PROCESOS_SISTEMA.md:** no hay sección de contingencia. El rescate respeta "kardex inmutable" (reverso C_D=1 `:1760-1776`) y "servicios no mueven stock" (`:1767`).
