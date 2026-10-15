# Especificación de Integración con el CRM — **REVISADA (lado CRM real)**

> **Reemplaza** a `CRM_INTEGRATION_SPEC.md`. El original fue escrito sin conocer el CRM
> real; aquí se corrige con los endpoints, el modelo de datos y las piezas que el CRM
> **ya tiene**, para no reconstruir lo existente. Lo marcado **[YA EXISTE]** no se toca;
> **[NUEVO]** es lo que se construye.
>
> **Meta:** el cliente paga solo desde la App (Wompi) y la suscripción se **activa
> automáticamente** por webhook — sin intervención manual. El comprobante manual queda
> como alternativa de respaldo.

---

## 0. Cambios clave frente al documento original

| Original decía | Realidad del CRM | Qué se hace |
|---|---|---|
| Identifica al cliente por **NIT** (`?nit=X`) | El CRM identifica por **`token_consulta`** (cada cliente tiene uno). Muchos NIT son 0/NULL. | **Se usa `token`, no NIT.** |
| Base `https://innovacion-digital.com/crm` | Base real **`https://crm.innovacion-digital.com/api/public/api/v1`** | URLs corregidas. |
| Crear tabla `suscripciones` plana | Ya existe modelo normalizado (`clientes`+`planes`+`suscripciones`+`facturas`+`pagos`) | Se **mapea**, no se duplica. |
| Planes `basico/pro/premium` 300/450/600k | Planes reales en tabla `planes`/`productos` (variados) | Endpoint sirve los **reales**. |
| Cron de recordatorios nuevo | Ya corre **`notificaciones:vencimientos`** (7/3/1d) + `reporte:diario` | Se **extiende**, no se duplica. |
| Preguntar si hay SMTP | Ya hay **Resend** (`ResendMailer`) | Nada que configurar. |
| Panel admin HTML suelto | El CRM es **React SPA** | Es un **módulo** React. |

---

## 1. Identidad del cliente: **token, no NIT**

Cada cliente en el CRM tiene un `token_consulta` (string largo). La App Conta FT ya lo usa
hoy para consultar licencia/módulos. **Toda** llamada de la App va con ese token:

- En GET: `.../consulta-vencimiento/{token}`
- En POST: el token en la ruta o en el body.

> El NIT puede ir como dato informativo, pero **nunca** como llave de búsqueda.

**Base URL:** `https://crm.innovacion-digital.com/api/public/api/v1`

---

## 2. Endpoints

### 2.1 Estado de suscripción — **[YA EXISTE, se extiende]**
`GET /consulta-vencimiento/{token}` y `GET /validar-pago/{token}`

Ya devuelven vigencia / pago al día / facturas pendientes. Se **amplía** la respuesta de
`consulta-vencimiento` para que la App tenga todo en una sola llamada:

```json
{
  "success": true,
  "code": "OK",
  "data": {
    "empresa": "DEMO SAS",
    "estado": "activa",                // prueba | activa | suspendida | cancelada | vencida
    "en_trial": false,
    "fecha_fin": "2027-10-14",
    "dias_restantes": 365,
    "urgente": false,                  // true cuando faltan <=7 días
    "pago_al_dia": true,
    "facturas_pendientes": 0,
    "total_adeudado": 0,
    "pagos_pendientes_revision": 0,    // comprobantes en revisión
    "ultimo_rechazo": null             // o { "fecha": "...", "motivo": "..." }
  }
}
```
La App la llama **cada 12h** y cachea 24h para operar offline.

### 2.2 Planes disponibles — **[NUEVO, sobre datos reales]**
`GET /planes-publicos`

Devuelve los planes **reales** desde la tabla `planes` (no un enum inventado) + datos
bancarios desde `configuraciones`:
```json
{
  "success": true,
  "planes": [
    { "id": 3, "nombre": "CNotas Anual", "periodo": "anual", "monto": 400000, "features": ["..."] }
  ],
  "cuentas_bancarias": [ { "banco": "Bancolombia", "tipo": "Ahorros", "numero": "...", "titular": "Innovación Digital" } ],
  "nequi": "3105550123"
}
```
> `features` sale del **sistema de módulos/entitlements** que ya existe (los módulos del plan).

### 2.3 Crear link de pago Wompi — **[NUEVO]**
`POST /pago/wompi/crear-link/{token}`

Body: `{ "plan_id": 3 }` (el monto lo pone el CRM desde el plan, no el cliente).

El CRM: valida token → crea fila en `pagos_wompi` (estado `creado`, referencia única
`CFT-{clienteId}-{yyyymmddHHmmss}`) → llama Wompi → devuelve el checkout:
```json
{ "success": true, "referencia": "CFT-33-20261015-143022", "url_checkout": "https://checkout.wompi.co/l/XXX", "expira_en_minutos": 30 }
```
La App abre `url_checkout` con `shell.openExternal`.

### 2.4 Webhook Wompi — **[NUEVO, núcleo del auto-pago]**
`POST /wompi/webhook` (lo llama Wompi, no la App)

1. **Valida la firma** (events secret, HMAC-SHA256) — crítico.
2. Busca la referencia en `pagos_wompi`.
3. Si `APPROVED`:
   - `pagos_wompi.estado='aprobado'`, guarda `transaction_id` + `payload`.
   - **Genera/paga la factura** y **extiende la suscripción** reutilizando la lógica ya
     existente (`Factura::reactivarSuscripcionSiCorresponde` / `marcarPagada`): `estado='activa'`,
     `siguiente_cobro`/`fecha_fin` +1 periodo.
   - Correo de bienvenida vía Resend.
   - **→ Esto es el "sin meter mano": el cliente paga y queda activo solo.**
4. Si `DECLINED`/`VOIDED`: `pagos_wompi.estado='rechazado'`, no toca la suscripción.
5. **Siempre responde 200** (si no, Wompi reintenta).

### 2.5 Subir comprobante — **[NUEVO = el "portal de comprobantes" que teníamos pendiente]**
`POST /pago/comprobante/{token}` (multipart)

Campos: `plan_id`, `monto_declarado`, `fecha_pago`, `banco_origen`,
`referencia_transaccion`, `comprobante` (jpg/png/pdf ≤5MB).

El CRM: valida token + archivo → guarda en `storage/comprobantes/{clienteId}_{ts}.{ext}`
→ fila en `pagos_comprobante` (estado `pendiente`) → notifica al admin (campanita + correo
Resend) → responde `{ "success": true, "id_comprobante": 123, "mensaje": "..." }`.

### 2.6 Revisión de comprobantes (admin) — **[NUEVO, módulo React]**
Protegido con JWT (ya existe el login):
- `GET /comprobantes?estado=pendiente` — lista.
- `POST /comprobantes/{id}/aprobar` `{ "fecha_pago": "..." }` → marca pagado + extiende suscripción (misma lógica del webhook) + correo al cliente.
- `POST /comprobantes/{id}/rechazar` `{ "motivo": "..." }` → correo al cliente; el motivo aparece como `ultimo_rechazo` en 2.1.

Un **módulo "Comprobantes"** en el menú del CRM (no HTML suelto): lista con miniatura,
abrir archivo, botones Aprobar/Rechazar.

---

## 3. Modelo de datos (reconciliado)

**Reusar** (no crear): `clientes`, `suscripciones`, `planes`, `productos`, `facturas`,
`pagos`, `configuraciones` (datos bancarios), `notificaciones`, `correos`, módulos/entitlements.

**Nuevas tablas (solo estas):**

### `pagos_wompi`
`id, cliente_id, plan_id, monto, referencia (único), transaction_id, estado(creado|aprobado|rechazado|cancelado), metodo_pago, payload_webhook TEXT, created_at, confirmed_at`

### `pagos_comprobante`
`id, cliente_id, plan_id, monto_declarado, fecha_pago, banco_origen, referencia_transaccion, url_comprobante, estado(pendiente|aprobado|rechazado), motivo_rechazo, revisado_por, revisado_at, created_at`

> Ambas se enlazan a `clientes.id` (vía token resuelto), no por NIT.

---

## 4. Wompi (lado CRM)

Credenciales en el **`.env` del servidor** (nunca en el repo):
`WOMPI_PUBLIC_KEY`, `WOMPI_PRIVATE_KEY`, `WOMPI_EVENTS_SECRET` (firma del webhook),
`WOMPI_INTEGRITY_SECRET` (firma al crear), `WOMPI_BASE_URL`
(`https://sandbox.wompi.co/v1` o `https://production.wompi.co/v1`).

Crear link: `POST {WOMPI_BASE_URL}/payment_links` con `Authorization: Bearer {PRIVATE_KEY}`,
`amount_in_cents`, `currency:"COP"`, `single_use:true`, `redirect_url`,
`customer_references` (NIT + referencia). Se devuelve `data.permalink` como `url_checkout`.

Webhook: validar HMAC con `WOMPI_EVENTS_SECRET` (concatenar las `signature.properties` +
`timestamp` + secret, `sha256`, comparar con `hash_equals`). Empezar en **sandbox**
(tarjetas `4242…`=aprueba, `4111…`=rechaza) y pasar a producción al validar.

---

## 5. Recordatorios — **[YA EXISTE, se extiende]**
`notificaciones:vencimientos` ya avisa 7/3/1 días (campanita + correo a admin y cliente).
Se **añaden** 60 y 30 días y el flag `urgente` que consume la App (2.1). No se crea cron nuevo.

---

## 6. Trial
Se mapea al estado **`prueba`** de `suscripciones` con `fecha_fin` = inicio + 30 días. La App
lee `en_trial` / `dias_restantes` de 2.1.

---

## 7. Checklist CRM (lo que implemento yo)

- [ ] 2 tablas nuevas: `pagos_wompi`, `pagos_comprobante`.
- [ ] Extender `consulta-vencimiento` con los campos de 2.1.
- [ ] `GET /planes-publicos` (2.2).
- [ ] `POST /pago/comprobante/{token}` + guardado de archivo (2.5).
- [ ] Módulo React "Comprobantes" + endpoints admin aprobar/rechazar (2.6).
- [ ] `POST /pago/wompi/crear-link/{token}` (2.3) — requiere creds Wompi.
- [ ] `POST /wompi/webhook` con validación HMAC + auto-activación (2.4) — requiere creds Wompi.
- [ ] Extender `notificaciones:vencimientos` a 60/30 + flag urgente (5).
- [ ] Plantillas de correo: bienvenida, pago aprobado, comprobante recibido/aprobado/rechazado.

## 8. Checklist App (lado facturador)
- [ ] La App ya debe tener el **`token_consulta`** del cliente (igual que para licencia). **No** usar NIT.
- [ ] Pantalla "Activar licencia" con 2 opciones (Wompi + comprobante).
- [ ] Llamar `consulta-vencimiento/{token}` cada 12h, cachear 24h.
- [ ] Pantalla "Pagar con Wompi" → `crear-link` → `shell.openExternal`.
- [ ] Pantalla "Subir comprobante" → multipart a `pago/comprobante/{token}`.
- [ ] Banner días restantes + bloqueo cuando `estado` ∈ {vencida, suspendida}.

## 9. Lo que necesito de ti (Luis)
1. **Credenciales Wompi**: `WOMPI_PUBLIC_KEY`, `WOMPI_PRIVATE_KEY`, `WOMPI_EVENTS_SECRET`, `WOMPI_INTEGRITY_SECRET`, y si arrancamos en **sandbox** o **producción**.
2. Confirmar que la App Conta FT ya recibe/guarda el **token** del cliente (como para la licencia).
3. Qué **planes reales** se ofrecen para auto-pago (puedo tomarlos de la tabla `planes` tal cual).
