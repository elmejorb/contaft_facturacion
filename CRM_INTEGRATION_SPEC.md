# Especificación de Integración con el CRM

> **Propósito**: documento para pasar al equipo/dev del CRM de Innovación Digital.
> Describe exactamente qué debe implementar el CRM para que la App Conta FT local
> pueda consultar vigencia de suscripción, generar links de pago Wompi, recibir
> comprobantes manuales y validar el estado del cliente.

---

## 1. Resumen del flujo

```
┌──────────────────────────┐          ┌─────────────────────────────┐
│  App Conta FT (cliente)  │          │  CRM Innovación Digital     │
│  — Electron desktop —    │          │  — Hostinger —              │
└──────────────────────────┘          └─────────────────────────────┘
         │                                        │
         │  GET /api/suscripcion/estado?nit=X     │
         │ ─────────────────────────────────────> │
         │                                        │
         │ <────────────────────────────────────  │
         │  { estado:"activa", fecha_fin:"..."}   │
         │                                        │
         │  [cliente elige: Wompi | Comprobante]  │
         │                                        │
         │  POST /api/suscripcion/wompi/crear-link│
         │ ─────────────────────────────────────> │
         │                                        │  → llama Wompi
         │ <────────────────────────────────────  │
         │  { url_checkout: "..." }               │
         │                                        │
         │  [shell.openExternal(url_checkout)]    │
         │                                        │
         │                           webhook      │
         │                           Wompi ──────>│  POST /api/wompi/webhook
         │                                        │  → marca suscripción activa
         │                                        │
         │  [polling cada 12h]                    │
         │  GET /api/suscripcion/estado?nit=X     │
         │ ─────────────────────────────────────> │
         │ <────────────────────────────────────  │
         │  { estado:"activa", fecha_fin:"+365d"} │
         │                                        │
         │                                        │
         │  — Alternativa: Comprobante manual —   │
         │  POST /api/suscripcion/comprobante     │
         │  (multipart con imagen/PDF)            │
         │ ─────────────────────────────────────> │
         │                                        │  [admin revisa y aprueba]
         │ <────────────────────────────────────  │
         │  { estado:"pendiente_revision" }       │
         │                                        │
```

---

## 2. Tablas que debe tener el CRM

### `suscripciones`

Una fila por cliente activo.

| Campo | Tipo | Notas |
|---|---|---|
| `id` | int PK | auto |
| `nit_cliente` | varchar(20) | único (es la llave desde la app) |
| `nombre_empresa` | varchar(200) | para emails y panel admin |
| `email` | varchar(200) | para notificaciones |
| `plan` | enum('basico','pro','premium') | |
| `monto_anual` | int | 300000 / 450000 / 600000 |
| `estado` | enum('trial','activa','vencida','suspendida') | |
| `fecha_inicio_trial` | date | cuando arrancó el trial 30 días |
| `fecha_pago` | date | último pago exitoso |
| `fecha_fin` | date | **CLAVE** — se compara contra hoy para saber si está vigente |
| `metodo_ultimo_pago` | enum('wompi','comprobante') | |
| `ref_ultimo_pago` | varchar(100) | ref Wompi o id del comprobante |
| `created_at` | timestamp | |
| `updated_at` | timestamp | |

### `pagos_wompi`

Historial de intentos de pago vía Wompi (uno por cobro, exitoso o no).

| Campo | Tipo | Notas |
|---|---|---|
| `id` | int PK | auto |
| `nit_cliente` | varchar(20) | FK lógica a suscripciones |
| `plan` | varchar(20) | plan al momento del pago |
| `monto` | int | monto cobrado |
| `referencia` | varchar(100) | ref única `CFT-{nit}-{yyyymmdd-hhmmss}` |
| `transaction_id` | varchar(100) | id que devuelve Wompi |
| `estado` | enum('creado','aprobado','rechazado','cancelado') | |
| `metodo_pago` | enum('CARD','PSE','NEQUI','BANCOLOMBIA_TRANSFER') | de Wompi |
| `payload_webhook` | text | JSON crudo que mandó Wompi (auditoría) |
| `created_at` | timestamp | |
| `confirmed_at` | timestamp | cuando llegó el webhook de aprobado |

### `pagos_comprobante`

Historial de comprobantes subidos manualmente.

| Campo | Tipo | Notas |
|---|---|---|
| `id` | int PK | auto |
| `nit_cliente` | varchar(20) | |
| `plan` | varchar(20) | |
| `monto_declarado` | int | lo que dijo el cliente que pagó |
| `fecha_pago` | date | según el cliente |
| `banco_origen` | varchar(60) | Bancolombia / Nequi / etc |
| `referencia_transaccion` | varchar(100) | número del comprobante |
| `url_comprobante` | varchar(500) | ruta donde se guardó el archivo |
| `estado` | enum('pendiente','aprobado','rechazado') | |
| `motivo_rechazo` | varchar(255) | si fue rechazado, por qué |
| `revisado_por` | varchar(100) | user que aprobó/rechazó |
| `revisado_at` | timestamp | |
| `created_at` | timestamp | |

### `configuracion_empresa` (datos tuyos que la app lee)

Para que la pantalla de "subir comprobante" muestre los datos bancarios tuyos sin hardcodearlos en la app.

| Campo | Valor ejemplo |
|---|---|
| `cuentas_bancarias` | JSON: `[{"banco":"Bancolombia","tipo":"Ahorros","numero":"123456","titular":"..."}]` |
| `nequi_persona` | `3105550123` |
| `planes` | JSON: `[{"id":"basico","nombre":"Básico","monto":300000,"features":[...]}]` |
| `email_soporte` | `soporte@innovacion-digital.com` |

---

## 3. Endpoints que debe exponer el CRM

Base: `https://innovacion-digital.com/crm` (o donde esté el CRM).

### 3.1 `GET /api/suscripcion/estado?nit=XXXXXXXXX`

**Lo llama la app cada 12 horas** para saber si la suscripción está vigente.

**Respuesta esperada:**
```json
{
  "success": true,
  "nit": "900123456",
  "nombre_empresa": "DEMO SAS",
  "estado": "activa",
  "plan": "pro",
  "fecha_fin": "2027-10-14",
  "dias_restantes": 365,
  "en_trial": false,
  "pagos_pendientes_revision": 0,
  "ultimo_rechazo": null
}
```

Si está en trial:
```json
{ "success": true, "nit": "900123456", "estado": "trial", "dias_restantes_trial": 23 }
```

Si venció:
```json
{ "success": true, "nit": "900123456", "estado": "vencida", "dias_restantes": -3, "fecha_fin": "2027-10-11" }
```

Si tiene un comprobante en revisión:
```json
{ "success": true, "nit": "900123456", "estado": "activa", "fecha_fin": "...", "pagos_pendientes_revision": 1 }
```

Si fue rechazado:
```json
{
  "success": true,
  "nit": "900123456",
  "estado": "vencida",
  "ultimo_rechazo": {
    "fecha": "2026-10-14",
    "motivo": "El comprobante no es legible"
  }
}
```

### 3.2 `GET /api/suscripcion/planes`

Devuelve los planes disponibles para que la app los muestre al cliente.

**Respuesta:**
```json
{
  "success": true,
  "planes": [
    {
      "id": "basico",
      "nombre": "Básico",
      "monto_anual": 300000,
      "features": ["Facturación POS", "Facturación electrónica", "Hasta 2 usuarios"]
    },
    {
      "id": "pro",
      "nombre": "Pro",
      "monto_anual": 450000,
      "features": ["Todo lo del Básico", "Módulo Nómina", "Hasta 5 usuarios", "Soporte prioritario"],
      "recomendado": true
    },
    {
      "id": "premium",
      "nombre": "Premium",
      "monto_anual": 600000,
      "features": ["Todo lo del Pro", "Usuarios ilimitados", "Multiempresa", "Capacitación"]
    }
  ],
  "cuentas_bancarias": [
    { "banco": "Bancolombia", "tipo": "Ahorros", "numero": "123456789", "titular": "Innovación Digital SAS" }
  ],
  "nequi_persona": "3105550123"
}
```

### 3.3 `POST /api/suscripcion/wompi/crear-link`

La app llama cuando el cliente eligió "Pagar con Wompi".

**Body:**
```json
{
  "nit": "900123456",
  "nombre_empresa": "DEMO SAS",
  "email": "contacto@demo.co",
  "plan": "pro",
  "monto": 450000
}
```

**El CRM debe:**
1. Validar NIT.
2. Crear fila en `pagos_wompi` con estado `creado` y referencia única.
3. Llamar a Wompi API (ver sección 4 abajo).
4. Devolver la URL del checkout.

**Respuesta:**
```json
{
  "success": true,
  "referencia": "CFT-900123456-20261014-143022",
  "url_checkout": "https://checkout.wompi.co/l/ABC123",
  "expira_en_minutos": 30
}
```

### 3.4 `POST /api/wompi/webhook`

**Lo llama Wompi** cuando el pago se completa (exitoso o no). El CRM NO lo expone a la app.

**Qué hacer:**
1. **Validar firma HMAC** (ver sección 4.3) — crítico, si no, cualquiera activa suscripciones gratis.
2. Buscar la referencia en `pagos_wompi`.
3. Si el estado del evento es `APPROVED`:
   - Marcar `pagos_wompi.estado = 'aprobado'`.
   - Actualizar `suscripciones`: `estado='activa'`, `fecha_pago=hoy`, `fecha_fin=hoy+365d`, `metodo_ultimo_pago='wompi'`, `ref_ultimo_pago=<referencia>`.
   - Enviar email de bienvenida al cliente.
4. Si es `DECLINED` o `VOIDED`: marcar `pagos_wompi.estado='rechazado'`, no tocar la suscripción.
5. **Siempre devolver 200 OK** a Wompi (si no, reintenta).

### 3.5 `POST /api/suscripcion/comprobante` (multipart)

La app sube un comprobante de transferencia.

**Content-Type:** `multipart/form-data`

**Campos:**
- `nit` (string)
- `nombre_empresa` (string)
- `email` (string)
- `plan` (string: basico/pro/premium)
- `monto_declarado` (int)
- `fecha_pago` (date YYYY-MM-DD)
- `banco_origen` (string)
- `referencia_transaccion` (string)
- `comprobante` (file: jpg/png/pdf, max 5MB)

**El CRM debe:**
1. Validar NIT + que haya archivo.
2. Guardar archivo en `/uploads/comprobantes/{nit}_{timestamp}.{ext}`.
3. Crear fila en `pagos_comprobante` con estado `pendiente`.
4. Notificar al operador (email a vos / Slack / etc).
5. Devolver confirmación.

**Respuesta:**
```json
{
  "success": true,
  "id_comprobante": 123,
  "mensaje": "Comprobante recibido. Verificaremos en máximo 24 horas y te notificaremos por email."
}
```

### 3.6 `POST /api/admin/comprobante/aprobar` (protegido con auth admin)

**Panel interno del CRM**, lo usás vos. No lo llama la app.

**Body:**
```json
{ "id_comprobante": 123, "fecha_pago_efectiva": "2026-10-14" }
```

**Qué hace:**
1. Actualizar `pagos_comprobante.estado='aprobado'`, `revisado_por=admin`, `revisado_at=now()`.
2. Actualizar `suscripciones`: `estado='activa'`, `fecha_fin=hoy+365d`.
3. Enviar email al cliente: *"Tu pago fue verificado. Suscripción activada hasta <fecha>."*

### 3.7 `POST /api/admin/comprobante/rechazar`

**Body:**
```json
{ "id_comprobante": 123, "motivo": "El comprobante está borroso, por favor reenviar." }
```

**Qué hace:**
1. `pagos_comprobante.estado='rechazado'`, guardar motivo.
2. Enviar email al cliente con el motivo.
3. En la próxima consulta `GET /suscripcion/estado`, incluir `ultimo_rechazo` para que la app lo muestre.

### 3.8 Panel admin `/crm/pagos-pendientes`

**UI web interna** (HTML+JS). No se consume desde la app.

- Lista de `pagos_comprobante WHERE estado='pendiente'` ordenados por `created_at ASC`.
- Para cada uno muestra: empresa, NIT, monto declarado, banco, referencia, miniatura del comprobante.
- Click en miniatura abre el archivo en nueva pestaña.
- Dos botones: **Aprobar** / **Rechazar** (abre modal pidiendo motivo).

---

## 4. Integración con Wompi (lado del CRM)

### 4.1 Credenciales que necesita el CRM

Las obtenés al activar cuenta Wompi para Innovación Digital SAS:
- `WOMPI_PUBLIC_KEY` (sandbox + producción)
- `WOMPI_PRIVATE_KEY` (sandbox + producción)
- `WOMPI_WEBHOOK_SECRET` (para validar firma HMAC)
- `WOMPI_BASE_URL`: `https://sandbox.wompi.co/v1` (pruebas) o `https://production.wompi.co/v1`

### 4.2 Crear link de pago

`POST https://production.wompi.co/v1/payment_links`

```http
Authorization: Bearer <WOMPI_PRIVATE_KEY>
Content-Type: application/json
```

```json
{
  "name": "Suscripción Pro Conta FT 2026",
  "description": "Licencia anual Conta FT - DEMO SAS",
  "single_use": true,
  "collect_shipping": false,
  "currency": "COP",
  "amount_in_cents": 45000000,
  "redirect_url": "https://innovacion-digital.com/pago-ok",
  "customer_data": {
    "customer_references": [
      { "label": "NIT", "value": "900123456" },
      { "label": "Referencia", "value": "CFT-900123456-20261014-143022" }
    ]
  }
}
```

**Respuesta:**
```json
{
  "data": {
    "id": "abc123def",
    "permalink": "https://checkout.wompi.co/l/abc123def"
  }
}
```

Devolvés `permalink` a la app como `url_checkout`.

### 4.3 Webhook: validar firma HMAC

Wompi firma cada webhook con HMAC-SHA256 del body + timestamp usando `WOMPI_WEBHOOK_SECRET`.

**En PHP:**
```php
$body = file_get_contents('php://input');
$evento = json_decode($body, true);

$timestamp = $evento['timestamp'] ?? '';
$firma_recibida = $evento['signature']['checksum'] ?? '';
$props = $evento['signature']['properties'] ?? [];

$concatenado = '';
foreach ($props as $p) {
    $concatenado .= jsonPathGet($evento['data'], $p);
}
$concatenado .= $timestamp;
$concatenado .= getenv('WOMPI_WEBHOOK_SECRET');

$firma_calculada = hash('sha256', $concatenado);

if (!hash_equals($firma_calculada, $firma_recibida)) {
    http_response_code(401);
    exit('firma inválida');
}

// Procesar evento...
if ($evento['event'] === 'transaction.updated' &&
    $evento['data']['transaction']['status'] === 'APPROVED') {
    // Activar suscripción
}
```

### 4.4 Flujo de pruebas

Wompi tiene sandbox gratis con tarjetas de prueba. Antes de producción:
- `4242 4242 4242 4242` → aprueba
- `4111 1111 1111 1111` → rechaza

---

## 5. Lógica de recordatorios (cron del CRM)

Se corre **1 vez al día** (ej. 9 AM).

```sql
-- 60 días antes del vencimiento: email suave
SELECT * FROM suscripciones
WHERE estado = 'activa'
  AND DATEDIFF(fecha_fin, CURDATE()) IN (60, 30, 7, 1)
  AND (ultimo_recordatorio_dias IS NULL OR ultimo_recordatorio_dias > DATEDIFF(fecha_fin, CURDATE()));
```

Para cada fila:
- **60 días antes**: email *"Tu licencia vence el X. Renueva con descuento de $50.000 pagando antes del Y."*
- **30 días antes**: email + anotar en `suscripciones.ultimo_recordatorio_dias = 30`
- **7 días antes**: email + marcar banner urgente en app (via GET /suscripcion/estado flag `urgente=true`).
- **1 día antes**: email final.
- **Día de vencimiento**: la app detecta `fecha_fin < hoy` y muestra modal de bloqueo.

---

## 6. Lo que necesita hacer el CRM — checklist

Para que podamos integrar la app:

- [ ] Crear las 4 tablas (`suscripciones`, `pagos_wompi`, `pagos_comprobante`, `configuracion_empresa`)
- [ ] Implementar los 5 endpoints públicos (3.1–3.5)
- [ ] Implementar los 2 endpoints admin (3.6–3.7)
- [ ] Panel admin web `/crm/pagos-pendientes` (3.8)
- [ ] Integrar Wompi (4.1–4.4) una vez tengas la cuenta
- [ ] Cron de recordatorios (sección 5)
- [ ] Email templates: bienvenida, pago aprobado, pago rechazado, recordatorio 60/30/7 días, pago vencido

---

## 7. Lo que necesita hacer la app (nuestro lado — ya tenemos la base)

- [x] Trial 30 días con BD limpia (F3 — ya hecho)
- [x] IPC `trial:getStatus` (F3 — ya hecho)
- [ ] Pantalla "Activar licencia" con las 2 opciones (Wompi + comprobante)
- [ ] Consulta a `GET /suscripcion/estado` cada 12h, cachear 24h offline
- [ ] Pantalla "Subir comprobante" con formulario + upload
- [ ] Pantalla "Pagar con Wompi": llama al CRM, abre URL en navegador con `shell.openExternal`
- [ ] Banner de días restantes (verde/amarillo/rojo) ← **ya tenemos el componente**
- [ ] Bloqueo de Nueva Venta / Nueva Compra cuando `estado='vencida'`
- [ ] Modal persistente con botón "Activar ahora" al vencer

---

## 8. Preguntas al equipo CRM

Para que arranques la conversación con quien lo mantenga:

1. **¿El CRM está en PHP o Node?** El código de ejemplo arriba está en PHP, se puede traducir.
2. **¿Tiene SMTP ya configurado para los emails?** Si no, hay que configurar (SendGrid, Mailgun, Postmark).
3. **¿Hay auth admin funcional** para el panel de aprobar pagos? Si no, qué sistema de login usar.
4. **¿Cuándo abren la cuenta Wompi?** Mientras tanto arrancamos con el flujo del comprobante solo.

---

## 9. Siguiente paso

Cuando el CRM tenga listos los **5 endpoints públicos (3.1–3.5)**, aviso y arranco con la implementación del lado de la app:

- Pantalla de activación con las 2 opciones.
- Upload de comprobante.
- Polling de estado.
- Bloqueo cuando vence.

Esto es ~1 semana de trabajo del lado de la app una vez que el CRM esté listo.
