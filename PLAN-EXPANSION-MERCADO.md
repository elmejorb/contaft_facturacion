# Plan de Expansión de Mercado — Conta FT

> **Estado**: planificación (NO empezado — pendiente de aprobación del usuario).
> **Branch de trabajo propuesto**: `feature/expansion-mercado`.
> **Prioridad**: media — se trabaja mientras el día a día permita.

---

## 1. Objetivos del plan

Hoy un cliente nuevo tarda **1–2 horas** en tener Conta FT corriendo (XAMPP, backend, BD, config, instalador). Esto nos limita a:

- Clientes que ya nos conocen o están dispuestos a dejarnos entrar remotamente.
- Mercado local acotado.
- Nosotros cobramos "en frío" — recordando, llamando, extendiendo plazos.

**El plan convierte Conta FT en un producto que:**

1. **Se descarga de la página** (`innovacion-digital.com/descargar` o similar) como cualquier app desktop moderna.
2. **Se instala en 30 segundos** haciendo doble click al `.exe` — sin servicios Windows, sin configurar BDs.
3. **Trae una demo funcional** apenas se abre — con datos de ejemplo, para que el cliente pruebe antes de comprometerse.
4. **Soporta dos modos**: 1 PC sola (SQLite) o red multi-puesto (MySQL/MariaDB).
5. **Cobra solo** — el cliente paga la suscripción desde la propia app con tarjeta/PSE/Nequi, se activa o se renueva solo, y si no paga se bloquea solo.

Resultado comercial: podemos vender a cualquiera en Colombia sin salir de Bogotá.

---

## 2. Flujo final del cliente (metáfora para alinear expectativas)

Así tiene que verse la experiencia completa cuando terminemos:

```
┌────────────────────────────────────────────────────────────────┐
│  1. Cliente llega a innovacion-digital.com                     │
│     └─> ve "Descargar demo gratis 14 días" → click             │
│                                                                │
│  2. Baja ContaFT_Setup.exe (unos 135 MB)                       │
│     └─> doble click → "Siguiente, siguiente, Instalar"         │
│     └─> en el camino: "¿Esta PC sola o en red?"                │
│         (si "sola" → SQLite auto, nada más que preguntar)      │
│                                                                │
│  3. Abre la app                                                │
│     └─> arranca con datos demo (empresa ejemplo, 10 productos, │
│         3 clientes, movimientos de muestra) para que juegue    │
│     └─> banner arriba: "Modo demo — 14 días restantes"         │
│                                                                │
│  4. Decide comprar                                             │
│     └─> botón "Activar licencia" dentro de la app              │
│     └─> abre pasarela de pago (Wompi/PayU) EN LA APP           │
│     └─> paga con tarjeta/PSE/Nequi → ok en 1 min               │
│     └─> app queda activada automática, borra datos demo,       │
│         pide "¿Cómo se llama tu empresa?" para arrancar limpio │
│                                                                │
│  5. Fin de mes 1 — toca renovar                                │
│     └─> app muestra 7 días antes: "Tu suscripción vence el X"  │
│     └─> botón "Renovar" → pasarela → pago → listo              │
│     └─> si no paga: app empieza a mostrar aviso rojo           │
│     └─> si pasa fecha + 5 días gracia: bloqueo de ventas       │
│         (sigue leyendo informes e imprimiendo histórico,       │
│          pero NO puede facturar — así no pierde su data y      │
│          cuando pague vuelve todo)                             │
└────────────────────────────────────────────────────────────────┘
```

**Lo clave**: en todo este flujo, nosotros no hicimos nada manual. No cobramos, no instalamos, no configuramos, no recordamos. El sistema trabaja solo.

---

## 3. Arquitectura: antes y después

### Antes (hoy)

```
┌─────────────────┐  HTTP   ┌───────────────────────┐
│ Electron (React)│ ──────> │ Apache  →  PHP        │
│ dist-electron/  │         │ (servicio Windows)    │
└─────────────────┘         │        ↓              │
                            │ MySQL (servicio Win.) │
                            │ port 3306             │
                            └───────────────────────┘
                            Instalado APARTE por el cliente.
```

### Después (modo local — 90% de clientes nuevos)

```
┌─────────────────────────────────────────────────────┐
│ Electron (main process)                             │
│  ├── React UI                                       │
│  ├── spawn('php', ['-S', '127.0.0.1:<libre>', ...]) │
│  │     └── backend PHP (mismos endpoints de hoy)    │
│  │           └── PDO → SQLite (archivo conta.db)    │
│  └── resources/                                     │
│       ├── php-portable/  (~30 MB, binario PHP CLI)  │
│       └── backend/       (los PHP de hoy)           │
└─────────────────────────────────────────────────────┘
                   TODO VIVE EN EL .exe
                   Nada que instalar aparte.
```

### Después (modo red — clientes multi-puesto)

```
┌─────────────────┐  LAN     ┌──────────────────────────┐
│ Electron (c/PC) │ ──────>  │ PC Servidor:             │
│ sin PHP interno │          │  Apache + PHP + MariaDB  │
└─────────────────┘          │  (igual que hoy, 1 vez)  │
                             └──────────────────────────┘
```

Mismo producto, el instalador pregunta y se adapta.

---

## 4. Fases de ejecución

### Fase 0 — Preparación (1 día)

- Crear branch `feature/expansion-mercado` desde `main`.
- Mover la suite de tests actual (`conta-app-backend/tests/`) para que corra tanto contra MySQL como contra SQLite — un parámetro de env dice cuál. Nos sirve de red durante toda la migración.
- Definir en `conta-app-backend/api/config/db.php` (nuevo) una capa de factory que decida driver según `config.json` en `userData`.

**Entregable**: suite verde contra MySQL (como hoy) y arranca contra SQLite aunque sea con 0 tests pasando (los iremos arreglando en fase 1).

---

### Fase 1 — Backend compatible con SQLite (2 semanas)

El 85% de los endpoints ya funciona sin tocar nada (PDO abstrae MySQL/SQLite). El 15% restante son queries con funciones específicas de MySQL. Mi inventario preliminar:

| Problema MySQL | Solución SQLite |
|---|---|
| `DATE_FORMAT(Fecha, '%d/%m')` | `strftime('%d/%m', Fecha)` |
| `GROUP_CONCAT(... SEPARATOR ', ')` | `group_concat(..., ', ')` (sin SEPARATOR) |
| `IF(x, a, b)` | `CASE WHEN x THEN a ELSE b END` o `iif()` |
| `enum('abierta','cerrada')` | `TEXT CHECK (col IN ('abierta','cerrada'))` |
| Triggers `tbl_sync_outbox` | SQLite soporta triggers, solo hay que reescribirlos |
| `AUTO_INCREMENT` | `INTEGER PRIMARY KEY AUTOINCREMENT` |
| Vistas (`vw_facturas_...`) | SQLite soporta vistas, igual sintaxis |
| `LOCK TABLES` / `UNLOCK TABLES` | SQLite no las necesita (WAL maneja concurrencia) |
| `innodb_autoinc_lock_mode` | SQLite no aplica |

**Tareas por semana**:

- **Semana 1**: adaptar schema (`conta_template_sqlite.sql` nuevo). Correr suite de tests contra SQLite, ir arreglando una por una. Prioridad: ventas, kardex, pagos, egresos (los flujos del día que ya tenemos cubiertos).
- **Semana 2**: adaptar informes (resumen, cuadre, ingresos totales, retenciones). Estos tienen las queries más complejas con `DATE_FORMAT`, `GROUP_CONCAT`, JOINs grandes.

**Criterio de aceptación**: los 5 tests actuales pasan contra SQLite, y escribimos 5 nuevos específicos de queries de informes para validar los adaptados.

---

### Fase 2 — PHP CLI embebido en Electron (1 semana)

- Descargar binario de PHP CLI portable para Windows (`php-8.3-nts-Win32-...zip` del sitio oficial, ~30 MB extraído).
- Agregarlo a `extraResources` del `electron-builder` en `package.json`.
- Modificar [electron/main.js](Dashboard-Facturación/electron/main.js) para que al arrancar:
  1. Busque un puerto libre entre 50000-60000.
  2. `spawn('resources/php-portable/php.exe', ['-S', '127.0.0.1:<puerto>', '-t', 'resources/backend/api'])`.
  3. Guarde el PID y mate ese proceso al cerrar la app (`app.on('before-quit')`).
  4. Haga que `const API_BASE` del frontend se construya con ese puerto dinámico.
- SQLite ya viene como DLL con PHP (`php_pdo_sqlite.dll`), nada que agregar.
- Base de datos en `app.getPath('userData') + '/conta.db'` (ya tenemos esta regla por memoria `feedback_config_path_userdata.md`).

**Criterio de aceptación**: `npm run electron:build` → el `.exe` resultante arranca en una PC virgen (Windows 10 limpio, sin XAMPP, sin MySQL, sin PHP) y la app funciona completa.

---

### Fase 3 — Trial 30 días con la data propia del cliente (2 días)

**Modelo**: el cliente NO recibe una BD con datos simulados. Recibe una BD limpia (solo catálogos DIAN + plan de cuentas default), ingresa SU empresa, SUS productos, SUS clientes, y trabaja normalmente durante 30 días. Al día 31 se le pide activar la licencia.

Es como Alegra, QuickBooks, Siigo y la mayoría del mercado — y comercialmente es mucho más fuerte porque al vencer el trial el cliente YA tiene su data cargada y pagar es decisión natural (no quiere perder lo que lleva un mes digitando).

#### Qué se construye

- **Primer arranque** detecta que `conta.db` no existe en `userData`. Lo crea desde `schema_sqlite.sql` + catálogos DIAN + plan de cuentas default. Guarda `trial_inicio` en `config.json` con la fecha de hoy.
- **Banner suave arriba** de la app: *"Prueba gratis — 23 días restantes · Activar licencia"*. Verde los primeros días, amarillo <7, rojo <1.
- **Al día 31**: la app abre normal pero bloquea los botones de **Nueva Venta** y **Nueva Compra**. El cliente SIGUE pudiendo leer todos sus informes, imprimir su histórico, consultar sus clientes. Lo único que no puede es facturar nuevo.
- **Modal al bloquear**: *"Tu prueba de 30 días venció. Activa tu licencia para seguir facturando — tu información queda intacta."* Con botón directo a la pantalla de pago (Fase 4).
- **Al activar**: el bloqueo se levanta inmediatamente. Toda la data del cliente queda igual, no se borra nada.

#### Lo que NO perdemos de valor

El beneficio de "la app funciona apenas la abro, sin pedir configuración" se mantiene: el cliente abre, le pide los datos de su empresa (NIT, nombre, dirección), empieza a facturar la primera venta. 30 segundos.

#### Ventajas sobre el modelo anterior

| Modelo anterior (fixtures demo) | Nuevo modelo (BD limpia, trial 30 días) |
|---|---|
| Cliente juega con empresa falsa; al comprar, borra todo y empieza de cero | Cliente trabaja con su data desde día 1; al pagar, nada se pierde |
| Fixtures que mantener alineados con el schema | Cero mantenimiento de datos de ejemplo |
| Trial 14 días (presión de "explorar") | Trial 30 días (presión real: "no quiero perder lo que ingresé") |

**Criterio de aceptación**: instalador fresh, cliente ingresa datos de su empresa, factura durante 30 días, día 31 ve el modal y no puede facturar más. Al activar sigue como estaba.

---

### Fase 4 — Comprobante de pago en la app + verificación en CRM (1-2 semanas)

El cliente paga por su cuenta (transferencia Bancolombia, Nequi, PSE donde él quiera) y **adjunta la foto/PDF del comprobante dentro de la propia app**. El CRM recibe el comprobante, vos (o quien revise) lo verifica contra el extracto bancario, aprueba con un click → la suscripción se activa sola.

**Por qué este modelo y no una pasarela**:
- **Cero comisiones de intermediario**. Wompi se come 2.65% + $700 por cada cobro — en 100 clientes a $29.900 son ~$150.000/mes perdidos.
- **Encaja con cómo paga el PYME colombiano hoy**: la tiendita no quiere digitar tarjeta en una app, prefiere pasarte transferencia de su Bancolombia como lo hace con cualquier proveedor.
- **Cero KYC con pasarela**, cero problemas de contracargos, cero PCI compliance.
- **Más control**: vos ves cada pago antes de que entre.

#### 4.1 Flujo técnico

```
                    ┌─────────────────────────────────────────┐
                    │ CRM Hostinger — ya existe, lo ampliamos │
                    │                                         │
                    │ Tabla suscripciones:                    │
                    │  - nit_cliente, plan, fecha_fin         │
                    │  - estado (trial/pendiente/activa/      │
                    │            vencida/rechazado)           │
                    │                                         │
                    │ Tabla pagos_pendientes:                 │
                    │  - id, nit_cliente, monto, fecha_pago   │
                    │  - banco, referencia                    │
                    │  - comprobante_url (jpg/pdf)            │
                    │  - estado (pendiente/aprobado/rechazado)│
                    │  - revisado_por, revisado_at, nota      │
                    │                                         │
                    │ Panel admin para VOS:                   │
                    │ innovacion-digital.com/crm/pagos        │
                    │  → lista de pagos pendientes            │
                    │  → ver comprobante, aprobar/rechazar    │
                    └─────────────────────────────────────────┘
                        ↑                   ↑
          HTTPS         │                   │
          (consulta +   │                   │  POST multipart
           upload)      │                   │  (comprobante)
                        │                   │
┌─────────────────────────────────────────┐  │
│ App Electron del cliente                │  │
│                                         │  │
│ Pantalla "Activar / Renovar":           │  │
│  1. Muestra datos de pago (cuentas      │  │
│     tuyas: Bancolombia, Nequi, etc.)    │  │
│  2. Botón "Ya pagué, subir comprobante" │  │
│  3. Formulario:                         │  │
│     - Fecha de pago                     │  │
│     - Monto                             │  │
│     - Banco origen                      │  │
│     - Referencia / número transacción   │  │
│     - Foto/PDF del comprobante          │  │
│  4. Enviar → CRM responde "recibido,    │  │
│     revisaremos en max 24h"             │  │
│  5. App queda en estado "pendiente".    │  │
│     Mientras tanto deja seguir usando.  │  │
└─────────────────────────────────────────┘
```

#### 4.2 Pasos del cliente (lo que ve)

1. Botón "Activar licencia" en app → pantalla con planes.
2. Elige plan → aparece pantalla con:
   - Tus datos bancarios (Bancolombia Cta Ahorros 123..., Nequi 310..., etc.) con botones "Copiar número".
   - Monto a pagar en grande.
   - Mensaje: *"Haz la transferencia por tu banco y vuelve acá a subir el comprobante."*
3. Hace la transferencia por su banco (fuera de la app).
4. Vuelve a la app → botón "Ya pagué, subir comprobante".
5. Formulario corto: fecha, monto, banco origen, referencia, foto/PDF.
6. Enviar → la app muestra: *"Comprobante recibido. Verificaremos en max 24h y te activaremos. Puedes seguir usando la app mientras tanto."*
7. Al abrir cada día, la app consulta el CRM. Cuando el estado pase de `pendiente` → `activa`, muestra toast verde *"¡Suscripción activada!"*.
8. Si vos lo rechazás (ej. comprobante borroso, monto no coincide), aparece modal explicando por qué, con botón para reenviar.

#### 4.3 Pasos tuyos (verificar y activar)

Panel web `innovacion-digital.com/crm/pagos`:

- Lista de pagos pendientes ordenados por fecha de subida.
- Para cada uno ves: nombre empresa, NIT, monto declarado, banco, referencia, miniatura del comprobante.
- Click → abre el comprobante en grande + extracto bancario (si lo tenés integrado) o te deja ir a verlo en tu Bancolombia.
- Dos botones:
  - **Aprobar**: activa la suscripción (`fecha_fin = fecha_fin_actual + 30 días`), notifica al cliente por email + lo verá al abrir la app.
  - **Rechazar**: pide motivo (comprobante borroso, monto no coincide, duplicado…), el cliente ve el motivo en la app y puede reenviar.
- Tiempo de revisión por pago: ~30 segundos. 20 pagos por día = 10 minutos de trabajo.
- Opcional futuro: botón "Auto-aprobar monto exacto" si el comprobante coincide 100% con un movimiento del extracto que ingresaste.

#### 4.4 Período de trial, vencimiento y gracia

- **Trial**: 14 días desde la primera apertura. Durante trial puede usar todo. Banner suave arriba: *"Trial — 10 días restantes"*.
- **Al vencer trial**: modal al abrir *"Tu trial venció. Activa tu suscripción para seguir usando Conta FT"*. Bloquea Nueva Venta / Nueva Compra. Deja consultar informes e imprimir histórico.
- **Después de activación**: fecha_fin se guarda. 7 días antes de vencer: banner amarillo *"Tu suscripción vence el X. Renueva"*. 1 día antes: banner rojo. Día de vencimiento: todavía puede usar. Día +5 (gracia): bloqueo de facturación igual que trial vencido.
- **Pago mientras está activo pero próximo a vencer**: suma 30 días al fecha_fin actual, no al día de hoy. (Así premiamos al que paga anticipado.)

#### 4.5 Qué construimos nosotros

**En el CRM Hostinger** (ya existe, lo ampliamos):

- Tablas: `suscripciones`, `pagos_pendientes` (schema arriba).
- Endpoint `POST /api/suscripcion/subir-pago` (multipart: nit, monto, fecha, banco, referencia, comprobante). Guarda el archivo en `/uploads/comprobantes/{nit}_{timestamp}.{ext}`, crea fila en `pagos_pendientes`.
- Endpoint `GET /api/suscripcion/estado?nit=X` (devuelve: estado actual, fecha_fin, si hay pagos pendientes de revisión, si hay rechazo pendiente de mostrar).
- Panel admin `innovacion-digital.com/crm/pagos` (lista + aprobar/rechazar). Esto es un CRUD simple sobre `pagos_pendientes`.
- Al aprobar: actualiza `suscripciones` + envía email al cliente (SMTP ya configurado en Hostinger).

**En la App**:

- Componente `SuscripcionPanel.tsx` con las dos pantallas (datos pago + subir comprobante).
- Al abrir la app: `GET /api/suscripcion/estado` cada 12h. Cachea en `userData/suscripcion.json` para funcionar sin internet un rato.
- Lógica de banner / modal / bloqueo según estado.
- Upload con progreso al subir el comprobante (max 5MB, acepta jpg/png/pdf).
- Pantalla "Mis pagos" para que el cliente vea histórico de qué ha pagado y estados.

#### 4.6 Reglas de negocio a decidir contigo

| Decisión | Opción A | Opción B |
|---|---|---|
| Trial inicial | 14 días | 7 o 30 días |
| Gracia tras vencer | 5 días con bloqueo gradual | Sin gracia |
| ¿Qué se bloquea al vencer? | Solo facturar/comprar | Todo salvo informes |
| Planes | 1 solo (ej. $29.900/mes) | Básico / Pro con features distintas |
| Pago anual con descuento | Sí (ej. 10 meses por el precio de 12) | No |
| Rechazo de comprobante | Email + modal en app | Solo email |
| Recordatorio para VOS si hay pagos pendientes >24h | Email diario resumen | WhatsApp a vos |

**Criterio de aceptación**:
- Cliente ficticio sube un comprobante → aparece en tu panel en segundos.
- Vos click aprobar → en max 30 seg la app del cliente se activa sola al refrescar estado.
- Vos click rechazar con motivo → cliente ve el motivo y puede reenviar.
- Cliente deja vencer → el día X+5 no puede facturar pero sí leer informes.

---

### Fase 5 — Página de descarga + landing (1 semana)

- Página `innovacion-digital.com/descargar-contaft` (o directo en el home).
- Hero: "Facturación electrónica DIAN en 30 segundos". Botón grande "Descargar demo gratis".
- Captura el email antes de la descarga (para seguimiento). El `.exe` sale al final por email o download directo.
- Screenshots cortas: pantalla de ventas, pantalla de cuadre, pantalla de informe.
- Comparativa simple vs competencia (Siigo, Alegra, World Office) centrada en "no necesita internet", "no es suscripción abusiva", "soporta tu BD actual".
- Testimonios de clientes actuales (Nutrigranos, Manos Creativas, etc. — con permiso).

**No es desarrollo pesado** — es contenido + diseño. Delegable.

---

### Fase 6 — Instalador que pregunta "¿Local o Red?" (3 días)

Modificar NSIS (el instalador que usa electron-builder) para incluir una pantalla extra:

```
┌─────────────────────────────────────────────┐
│ Tipo de instalación                         │
│                                             │
│ ○ Esta PC sola (recomendado)                │
│   Más fácil. Para 1 cajero / 1 oficina.     │
│                                             │
│ ○ Red (varias PCs comparten datos)          │
│   Requiere servidor con MySQL instalado.    │
│   Ideal para tiendas con varios cajeros.    │
└─────────────────────────────────────────────┘
```

- Si "Local": escribe `config.json` con `driver: "sqlite"` y arranca.
- Si "Red": pide IP del servidor + credenciales en pantallas siguientes.

**Criterio de aceptación**: una misma `.exe` sirve para ambos casos.

---

### Fase 7 — Script de migración MySQL → SQLite para clientes actuales (1 semana, opcional)

Para clientes que quieran pasarse al modo local:
- Script que lee su BD MySQL actual.
- Convierte a SQLite preservando datos.
- Backup del MySQL por si acaso.
- Instala la versión nueva y arranca ya con su data.

**Opcional**: lo hacemos cuando algún cliente actual lo pida, no antes.

---

## 5. Estimación total

| Fase | Esfuerzo | Prioridad |
|---|---|---|
| 0. Prep (branch + factory DB) | 1 día | Alta |
| 1. Backend compatible SQLite | 2 semanas | Alta |
| 2. PHP CLI embebido | 1 semana | Alta |
| 3. Demo + trial | 3-4 días | Media |
| 4. Comprobante de pago + verificación | 1-2 semanas | **Alta — comercial** |
| 5. Landing descarga | 1 semana | Media |
| 6. Instalador Local/Red | 3 días | Media |
| 7. Migrador MySQL→SQLite | 1 semana | Baja |
| **TOTAL** | **~7-8 semanas** | |

Trabajando mientras el día a día lo permita: ~2-3 meses de calendario para tenerlo todo listo.

---

## 6. Riesgos y mitigaciones

| Riesgo | Mitigación |
|---|---|
| Alguna query compleja de informes no tiene traducción directa a SQLite | La suite de tests lo detecta en Fase 1. Alternativa: reescribir ese informe en PHP puro (sin SQL complejo) procesando filas básicas en loop. |
| Flujo de revisión manual se vuelve cuello de botella con muchos clientes | Diseñamos la cola con filtros + atajos de teclado. 50 revisiones/día son ~25 min. Si crece: agregamos "auto-aprobar monto exacto que coincide con movimiento del extracto bancario" cuando conectemos el extracto Bancolombia. |
| Antivirus marca el `.exe` por el PHP CLI embebido | Firmar digitalmente el instalador (certificado code-signing ~$300 USD/año) elimina el 95% de falsos positivos. |
| Cliente pierde el archivo `conta.db` | Backup automático diario a Google Drive del cliente (OAuth una vez). YA tenemos este patrón para MySQL con export, solo cambia qué se respalda. |
| Un cliente actual se enoja porque le toca pagar sus mensualidades por app en vez de "yo le paso cuenta de cobro" | Los clientes actuales siguen con el flujo manual que ya tienen. El flujo auto solo aplica a clientes nuevos que entran con el instalador nuevo. |

---

## 7. Decisiones pendientes para arrancar

Antes de encarar la Fase 1 necesito que me confirmes:

1. **¿Qué cuentas bancarias / Nequi mostramos al cliente para pagar?** (vos mandás esos datos y las guardamos en el CRM; se pueden editar después sin tocar la app).
2. **¿Precio del plan?** (ej. $29.900/mes). Define también si querés un solo plan o Básico / Pro con features distintas.
3. **¿Trial de cuántos días?** 14 me parece el estándar. 7 es poco, 30 es demasiado.
4. **¿Gracia tras vencer?** 5 días con bloqueo gradual sería lo humano.
5. **¿Quién revisa los comprobantes?** Si sos solo vos → notificación cuando llega uno. Si delegás → agregamos un usuario "operador" al CRM con permiso solo para aprobar/rechazar.
6. **¿Pago anual con descuento?** (ej. 12 meses al precio de 10). Suele mejorar flujo de caja + reduce la carga de revisión mensual.
7. **¿Mantenemos los clientes actuales con el flujo manual actual?** Mi recomendación: sí, no les cambiamos nada. Les ofrecemos migrarse si quieren.

---

## 8. Orden de arranque sugerido cuando empecemos

1. Crear branch `feature/expansion-mercado`.
2. Fase 0 + Fase 1 (semana 1-3) → backend SQLite listo.
3. Fase 2 (semana 4) → `.exe` autosuficiente.
4. **Hito 1**: generamos un `.exe` que un amigo puede instalar en su casa y abrir. Si funciona ahí → vamos bien.
5. Fase 3 (semana 5) → demo con datos.
6. Fase 4 (semana 6-7) → pagos online.
7. **Hito 2**: cliente ficticio compra con tarjeta de prueba → se activa solo.
8. Fase 5 (paralelo) → landing lista.
9. Fase 6 (semana 8) → instalador Local/Red.
10. **Hito 3**: lanzamos. Publicamos la landing. El primer cliente real descarga, prueba, paga, usa.
11. Fase 7 (cuando algún cliente actual lo pida).

---

## 9. Qué NO está en este plan (y por qué)

- **No** vamos a reescribir el backend en Node.js — es un proyecto de 3-4 meses sin valor incremental para el cliente final. SQLite + PHP CLI nos da el 95% del mismo resultado en 1/3 del tiempo.
- **No** vamos a hacer todo SaaS (navegador puro). Para el mercado PYME colombiano de tienda/papelería/micromercado, el modo offline-first es diferenciador comercial, no limitación.
- **No** vamos a tocar FE/DIAN en este plan. Ya funciona. Lo preservamos.
- **No** vamos a cambiar los informes ni la UI de ventas. Lo que ya está bien, no se toca.

---

## 10. Para discutir cuando revisemos este plan

- ¿Hay algo acá que no te cuaje?
- ¿Querés agregar alguna fase que no vi? (ej. una app móvil del dueño para ver ventas en tiempo real sin abrir el PC, módulo contador externo que exporte libros, integraciones con Shopify/WhatsApp Business…)
- ¿Hay un cliente nuevo o un amigo que podamos tener como "beta tester" del Hito 1 (semana 4)?
