# Plan de Implementación — Módulo de Vendedores Móviles
**Sistema destino:** Conta FT (Electron + React + PHP + MySQL)  
**App móvil:** `AppMobilFacturacion` (React Native / Expo)  
**API remota:** `AppMobilFacturacion/api` (Laravel Lumen 10, JWT auth)  
**Sincronizador:** `sincronizadorConta/electron-app` (Electron, se copia y adapta)

---

## Contexto y premisas

### Lo que ya existe (no tocar)
- `tbl_cambios_sincronizar` — tabla de cola de cambios (ya en BD)
- Triggers de `tblarticulos` y `tblclientes` → ya alimentan esa tabla
- Endpoints `POST /sync/productos/batch` y `POST /sync/clientes/batch` en la API remota → ya listos para recibir inventario y clientes

### Qué hace la API remota (Laravel)
- Tabla `mobile_vendedores`: vendedores con email, password (bcrypt), zona, permisos
- Tabla `ventas`: todo lo que los vendedores crean en campo
  - Si tiene `cufe` → es Factura Electrónica ya autorizada por DIAN
  - Si no tiene `cufe` (estado=`registrada`) → es un pedido/orden sin FE
- La app móvil hace JWT login con email + password y opera normalmente
- **No existe** endpoint de CRUD de vendedores — hay que agregarlo a la API remota

### Qué tiene Conta FT local
- Tabla `electronic_documents` → FE creadas desde Conta FT (con cufe, status, etc.)
- Tabla `tblventas` → ventas POS locales
- No hay tabla de pedidos de campo ni de vendedores móviles

### Decisión sobre FE de vendedores
El usuario tiene razón: las FE que los vendedores emiten desde la app ya existen en la tabla `electronic_documents` de Conta FT si ambos sistemas comparten la misma BD DIAN. Si no la comparten, se traen de la API remota y se insertan en `electronic_documents` con una columna `origen='movil'` para distinguirlas. **No se crea tabla separada para FE.**

### Módulo opcional
Solo se activa para clientes que tengan la app móvil contratada. Un toggle en Configuración lo habilita. Cuando está deshabilitado: el sidebar no muestra la sección, las tablas existen pero vacías.

---

## Parte 0 — Qué hay que agregar a la API remota (Laravel)

> **Hacer primero.** Sin este paso el módulo no puede sincronizar vendedores.

### 0.1 Endpoint `POST /sync/vendedores/batch` (nuevo en la API Lumen)

Archivo a crear: `app/Http/Controllers/SyncVendedorController.php`  
Ruta a agregar en `routes/web.php`:
```php
$router->post('/sync/vendedores/batch', 'SyncVendedorController@batch');
```

**Auth:** igual a los demás batch — `email` + `token_api` en el body (NO JWT).

**Request:**
```json
{
  "email": "empresa@ejemplo.com",
  "token_api": "abc123",
  "registros": [
    {
      "id_vendedor_conta": 5,
      "codigo": "V001",
      "nombre": "Carlos Ruiz",
      "email_vendedor": "carlos@empresa.com",
      "password_hash": "$2y$12$...",
      "telefono": "3001234567",
      "cedula": "12345678",
      "zona": "Zona Norte",
      "can_edit_clients": true,
      "activo": true
    }
  ]
}
```

**Lógica (upsert por `id_vendedor_conta`):**
- Si existe un `mobile_vendedores` con `id_vendedor_conta` = el enviado y `id_empresa` = empresa → UPDATE
- Si no existe → INSERT
- El `password_hash` se guarda directo (ya viene encriptado con bcrypt desde Conta FT)

**Response:**
```json
{ "error": false, "insertados": 1, "actualizados": 0, "total_procesados": 1 }
```

### 0.2 Endpoint `GET /sync/ventas/pendientes` (nuevo — para pull de pedidos/FE)

Ruta: `GET /sync/ventas/pendientes?after_id=0&per_page=100`

**Auth:** `Authorization: Bearer` (token_api de la empresa como bearer) o email+token_api como query params.

**Response:**
```json
{
  "error": false,
  "ventas": [
    {
      "id_venta": 1,
      "numero_factura": "M000001",
      "fecha_venta": "2026-05-01",
      "id_cliente": 10,
      "nombre_cliente": "Juan Pérez",
      "nit_cliente": "12345678",
      "id_vendedor_mobile": 2,
      "nombre_vendedor": "Carlos Ruiz",
      "subtotal": 50000,
      "total_impuestos": 9500,
      "total": 59500,
      "forma_pago": "credito",
      "observaciones": "",
      "origen": "mobile",
      "estado": "registrada",
      "cufe": null,
      "detalles": [
        { "id_producto": 5, "nombre_producto": "Producto A", "cantidad": 2, "precio_unitario": 25000, "porcentaje_iva": 19, "impuesto": 9500, "total": 59500 }
      ]
    }
  ],
  "total": 3
}
```

> **Nota:** El filtro `after_id` permite pull incremental. La API sólo devuelve ventas con `id_venta > after_id` de la empresa autenticada.

---

## Parte 1 — Base de datos MySQL local (Conta FT)

Agregar al final de `conta-app-backend/sql/actualizacion_completa.sql` — sección **v5.1**:

### 1.1 Tabla de configuración del módulo
```sql
-- v5.1: Módulo vendedores móviles
CREATE TABLE IF NOT EXISTS tbl_config_vendedores (
    id INT PRIMARY KEY DEFAULT 1,
    habilitado TINYINT(1) DEFAULT 0,
    api_url VARCHAR(300) DEFAULT 'https://conta-basic.innovacion-digital.com/api-conta/public',
    api_email VARCHAR(150) DEFAULT '',
    api_token_empresa VARCHAR(255) DEFAULT '',   -- token_api de la tabla empresas en la API
    sync_intervalo_pull_min INT DEFAULT 15,       -- cada cuántos minutos baja datos
    ultimo_pull_ventas DATETIME NULL,
    ultimo_pull_id INT DEFAULT 0,                 -- MAX(id_remoto) del último pull
    fecha_mod DATETIME DEFAULT NOW()
);
INSERT IGNORE INTO tbl_config_vendedores (id) VALUES (1);
```

### 1.2 Tabla local de vendedores móviles
```sql
-- v5.1
CREATE TABLE IF NOT EXISTS tbl_vendedores_movil (
    id INT AUTO_INCREMENT PRIMARY KEY,
    id_remoto INT NULL,              -- id en mobile_vendedores de la API (después de sync)
    codigo VARCHAR(20) NOT NULL,     -- V001, V002...
    nombre VARCHAR(150) NOT NULL,
    email VARCHAR(150) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,  -- bcrypt, se genera aquí y se sube
    telefono VARCHAR(30),
    cedula VARCHAR(30),
    zona VARCHAR(100),
    can_edit_clients TINYINT(1) DEFAULT 1,
    activo TINYINT(1) DEFAULT 1,
    sincronizado TINYINT(1) DEFAULT 0,   -- 0=pendiente de sync, 1=sincronizado
    fecha_mod DATETIME DEFAULT NOW(),
    UNIQUE KEY uk_codigo (codigo),
    UNIQUE KEY uk_email (email)
);
```

### 1.3 Tabla de pedidos de vendedores
```sql
-- v5.1 (solo pedidos SIN FE — ventas remotas sin cufe)
CREATE TABLE IF NOT EXISTS tbl_pedidos_vendedor (
    id INT AUTO_INCREMENT PRIMARY KEY,
    id_remoto INT NOT NULL,
    numero_pedido VARCHAR(30),
    id_cliente_remoto INT,
    nombre_cliente VARCHAR(200),
    nit_cliente VARCHAR(30),
    id_vendedor_remoto INT,
    nombre_vendedor VARCHAR(150),
    fecha DATE,
    subtotal DECIMAL(14,2) DEFAULT 0,
    impuestos DECIMAL(14,2) DEFAULT 0,
    total DECIMAL(14,2) DEFAULT 0,
    forma_pago VARCHAR(30),
    observaciones TEXT,
    estado VARCHAR(30) DEFAULT 'pendiente',     -- pendiente, procesado, anulado
    items_json LONGTEXT,                         -- detalles del pedido en JSON
    convertido_factura_n INT NULL,               -- FK tblventas si se convirtió
    fecha_descarga DATETIME DEFAULT NOW(),
    fecha_mod DATETIME DEFAULT NOW(),
    UNIQUE KEY uk_remoto (id_remoto)
);
```

### 1.4 Columna `origen` en `electronic_documents`
```sql
-- v5.1: Distinguir FE locales de FE emitidas por vendedores en campo
ALTER TABLE electronic_documents
    ADD COLUMN IF NOT EXISTS origen VARCHAR(20) DEFAULT 'local' AFTER id,
    ADD COLUMN IF NOT EXISTS id_vendedor_remoto INT NULL AFTER origen,
    ADD COLUMN IF NOT EXISTS nombre_vendedor VARCHAR(150) NULL AFTER id_vendedor_remoto;
-- Las FE existentes quedan con origen='local' (valor por defecto)
-- Las FE de vendedores se insertan con origen='movil'
```

---

## Parte 2 — Backend PHP (Conta FT)

Crear carpeta `conta-app-backend/api/vendedores/` con estos archivos:

### 2.1 `config.php` — Configuración del módulo

```
GET  → { habilitado, api_url, api_email, ultimo_pull, pedidos_pendientes, fe_vendedores }
POST action=guardar  → UPDATE tbl_config_vendedores
POST action=probar   → GET {api_url}/api/auth/me con el token → validar que responde 200
POST action=pull_ahora → ejecutar pull inmediato (ver lógica de pull en 2.4)
```

### 2.2 `vendedores.php` — CRUD de vendedores locales

```
GET  → lista de tbl_vendedores_movil con estado de sincronización
GET ?id=N → detalle del vendedor

POST action=crear:
  - Validar email único
  - Generar hash bcrypt de la contraseña con password_hash($pass, PASSWORD_BCRYPT)
  - INSERT en tbl_vendedores_movil con sincronizado=0
  - Responder con el vendedor creado

POST action=editar:
  - UPDATE en tbl_vendedores_movil
  - Si cambia email/password/permisos → sincronizado=0 (requiere re-sync)

POST action=sincronizar:
  - Leer tbl_vendedores_movil donde sincronizado=0
  - Por cada uno, llamar POST {api_url}/sync/vendedores/batch con las credenciales
  - Si responde OK → sincronizado=1, guardar id_remoto si viene en respuesta
  - Retornar { sincronizados: N, errores: [] }

POST action=toggle_activo:
  - UPDATE activo = !activo, sincronizado=0
```

### 2.3 `pedidos.php` — Pedidos de vendedores

```
GET ?pagina=1&estado=pendiente&vendedor=X&fecha_desde=Y
  → SELECT paginado de tbl_pedidos_vendedor con filtros
  → items_json viene como string, el endpoint lo parsea y lo devuelve como array

GET ?id=N
  → Detalle de un pedido con items_json parseado

POST action=convertir:
  - Leer pedido de tbl_pedidos_vendedor
  - Construir body equivalente al que espera api/ventas/nueva.php
  - Llamar la lógica de nueva.php (include o duplicar)
  - UPDATE tbl_pedidos_vendedor SET estado='procesado', convertido_factura_n=N
  - Retornar { factura_n, mensaje }

POST action=anular:
  - UPDATE tbl_pedidos_vendedor SET estado='anulado'
  - No afecta stock (el pedido nunca descontó stock localmente)
```

### 2.4 `pull.php` — Descarga de ventas de vendedores

Lógica central que tanto `config.php action=pull_ahora` como el cron interno usan:

```php
// 1. Leer config: api_url, api_token_empresa, ultimo_pull_id
// 2. GET {api_url}/sync/ventas/pendientes?after_id={ultimo_pull_id}&per_page=100
//    Headers: Authorization: Bearer {api_token_empresa}
// 3. Por cada venta recibida:
//    SI tiene cufe → es FE del vendedor:
//       INSERT INTO electronic_documents (origen='movil', id_vendedor_remoto, nombre_vendedor,
//         fecha, cod_cliente, customer_identification, total, cufe, status='autorizado', ...)
//       ON DUPLICATE KEY UPDATE ... (por cufe)
//    SI NO tiene cufe → es pedido:
//       INSERT INTO tbl_pedidos_vendedor (..., items_json=JSON del array detalles)
//       ON DUPLICATE KEY UPDATE ... (por id_remoto)
// 4. UPDATE tbl_config_vendedores SET ultimo_pull_id=MAX(id_remoto), ultimo_pull_ventas=NOW()
// 5. Retornar { pedidos_nuevos, fe_nuevas, timestamp }
```

---

## Parte 3 — Frontend React (Conta FT)

### 3.1 Configuración en `ConfiguracionSistema.tsx`

Nueva pestaña "Vendedores Móviles":

**Sección superior — Activación:**
- Toggle "Módulo habilitado" (llama `api/vendedores/config.php action=guardar`)
- Cuando está OFF: el resto de la pestaña queda gris/deshabilitado

**Sección — Conexión con la API:**
- Campo URL de la API (pre-rellena con la URL de prod)
- Campo Email del administrador de la empresa en la API
- Campo Token API (input password con ojo, tipo `token_api` de la tabla `empresas` en la API)
- Botón "Probar conexión" → llama `action=probar`, muestra toast verde/rojo

**Sección — Sincronización:**
- "Descarga automática cada:" select (5, 10, 15, 30, 60 minutos)
- Botón "Descargar ahora" → llama `pull.php`, muestra resultados
- Última descarga: "hace 5 minutos — 2 pedidos nuevos"
- Pendientes de procesar: N pedidos

### 3.2 Componente `VendedoresMovil.tsx` (nuevo)

**Gestión de vendedores de campo** — tab dentro de ConfiguracionSistema o sección propia en el sidebar:

Layout:
- Barra superior con botón "Nuevo Vendedor" + botón "Sincronizar pendientes" (badge con count)
- AG Grid con columnas: Código, Nombre, Email, Zona, Permisos, Activo (switch), Sincronizado (ícono)
- Columna "Acciones": Editar, Activar/Desactivar

**Modal crear/editar vendedor:**
- Código (auto-sugerido: V001, V002...)
- Nombre completo
- Email (será el login en la app móvil)
- Contraseña (solo al crear o cuando se quiera cambiar)
- Zona de cobertura (texto libre)
- Puede editar clientes (switch)
- Activo (switch)

**Botón "Sincronizar pendientes":**
- Llama `POST vendedores.php action=sincronizar`
- Muestra resultado: "3 vendedores sincronizados con la app móvil"
- Los que tienen error muestran ícono rojo con el mensaje

**Info para el vendedor (modal post-creación):**
```
✅ Vendedor creado y sincronizado.
El vendedor debe ingresar estos datos en la app:

  App: Conta FT Vendedores
  Email: carlos@empresa.com
  Contraseña: [la que ingresaste]

La contraseña se puede cambiar desde aquí cuando necesite.
```

### 3.3 Componente `VendedoresPedidos.tsx` (nuevo)

**Pedidos recibidos de vendedores en campo:**

Filtros: fecha desde/hasta, vendedor (dropdown desde tbl_vendedores_movil), estado

AG Grid:
- Fecha | Pedido # | Vendedor | Cliente | Total | Forma de pago | Estado | Acciones

Acciones por fila (estado=pendiente):
- "Ver detalle" → modal con tabla de items
- "Convertir a venta" → modal de confirmación → llama `pedidos.php action=convertir` → toast con # de factura creada
- "Anular" → confirmación → llama `pedidos.php action=anular`

**Modal de detalle del pedido:**
- Header: número, fecha, vendedor, cliente, forma de pago
- Tabla: producto | cantidad | precio | IVA | subtotal
- Totales
- Si `convertido_factura_n` existe: badge "Convertido → FV-XXXX" con link

### 3.4 Pestaña "De vendedores" en `FacturacionElectronica.tsx`

En el componente existente de FE, agregar una pestaña o filtro "Origen":
- **Todas** (local + movil)  
- **Emitidas aquí** (origen='local')  
- **De vendedores** (origen='movil')

En la vista "De vendedores": agregar columna "Vendedor" con el nombre del vendedor que la emitió.

Las FE de vendedores son **solo lectura** — no tienen botones de reenviar/anular (ya están en DIAN).

### 3.5 Modificaciones a `Dashboard.tsx`

Agregar cases:
```tsx
case 'vendedores_gestion':  return <VendedoresMovil />
case 'vendedores_pedidos':  return <VendedoresPedidos />
```

Agregar al sidebar (solo si `habilitado && esAdmin`):
```tsx
{
  icon: Smartphone,
  label: 'Vendedores',
  children: [
    { label: 'Gestión de Vendedores', view: 'vendedores_gestion' },
    { label: 'Pedidos de Campo', view: 'vendedores_pedidos' },
  ]
}
```

### 3.6 Card en `PantallaInicio.tsx`

Solo si `habilitado && esAdmin && pedidosPendientes > 0`:
```tsx
{ icon: Smartphone, label: 'Pedidos de campo', view: 'vendedores_pedidos',
  badge: pedidosPendientes, color: 'amber' }
```

### 3.7 Hook `useVendedoresConfig.ts`

```ts
// Llama GET api/vendedores/config.php una vez al cargar
// Cachea en memory (no localStorage — dato administrativo)
// Exporta: { habilitado, pedidosPendientes, ultimoPull }
// Si habilitado=false, los componentes simplemente no se montan
```

---

## Parte 4 — Sincronizador V2

**Copiar a:** `C:\Users\LUIS_FDO\Documents\proyectos\InnovacionDg\SincronizadorVendedores\electron-app`

> El original (`sincronizadorConta`) sigue igual para clientes VB6. Este es un binario separado.

### 4.1 Cambios de identidad

`package.json`:
```json
{
  "name": "sincronizador-vendedores-conta",
  "productName": "Sincronizador Vendedores — Conta FT",
  "appId": "com.innovaciondg.sincronizador-vendedores"
}
```

### 4.2 Nuevos módulos en `src/sync/`

**`pullEngine.js`** — Descarga ventas desde la API al MySQL local:

```js
// pullOnce():
//   1. Leer ultimo_pull_id de tbl_config_vendedores
//   2. GET {api_url}/sync/ventas/pendientes?after_id={ultimoId}&per_page=100
//   3. Por cada venta:
//      - Si cufe → upsert en electronic_documents (origen='movil')
//      - Si no cufe → upsert en tbl_pedidos_vendedor (items_json)
//   4. UPDATE tbl_config_vendedores SET ultimo_pull_id, ultimo_pull_ventas
//   5. Emitir evento 'pull-progress' al renderer

// startPullTimer(intervalMin):
//   setInterval(pullOnce, intervalMin * 60000)

// stopPullTimer()
```

**`vendedorSync.js`** — Sube vendedores locales a la API:

```js
// syncVendedores():
//   1. SELECT * FROM tbl_vendedores_movil WHERE sincronizado=0
//   2. POST {api_url}/sync/vendedores/batch con todos los pendientes
//   3. UPDATE sincronizado=1 para los que respondieron OK

// Se llama: manualmente desde UI o al detectar cambios en tbl_vendedores_movil
```

### 4.3 Config adicional

```js
// En configStore.js agregar:
sync: {
  pushProductos: true,
  pushClientes: true,
  pushVendedores: true,
  pullVentasVendedores: true,
  intervaloPullMin: 15
}
```

### 4.4 Módulos de push (verificar mappers existentes)

El sincronizador ya sube `tblarticulos` y `tblclientes` vía `tbl_cambios_sincronizar`. Verificar que `tableMappers.js` genere exactamente los campos que espera la API:

**Para productos** (`POST /sync/productos/batch`):
- `codigo` ← `tblarticulos.Codigo`
- `nombre_pro` ← `tblarticulos.Nombres_Articulo`
- `precio_venta1` ← `tblarticulos.Precio_Venta`
- `existencia` ← `tblarticulos.Existencia`
- `iva` ← `tblarticulos.Iva`
- `estado` ← `tblarticulos.Estado == 1` (boolean)
- `cod_categoria` ← `tblarticulos.Cod_Cat` (si existe)

**Para clientes** (`POST /sync/clientes/batch`):
- `codigo` ← `tblclientes.Codigo`
- `razon_social` ← `tblclientes.Nombre`
- `nit` ← `tblclientes.Nit`
- `telefonos` ← `tblclientes.Telefono`
- `cupo_autorizado` ← `tblclientes.Cupo`
- `email_cliente` ← `tblclientes.Email`
- `id_type_regime` ← `tblclientes.Regimen` (mapear a código)

### 4.5 Carga inicial desde el sincronizador

En el módulo "Carga Inicial" (ya existe), agregar checkboxes:
- ☑ Enviar inventario completo a app móvil
- ☑ Enviar clientes completos a app móvil

Al ejecutar: hace SELECT directo (sin depender de tbl_cambios_sincronizar) e inserta todos los registros en bloques de 200.

### 4.6 UI del Sincronizador V2

Agregar sección nueva en `renderer/index.html`:

**Panel "Descarga de ventas de campo":**
- Switch "Descargar pedidos y FE automáticamente"
- "Cada: [15] minutos"
- Botón "Descargar ahora"
- Último pull: timestamp + "N pedidos, N FE"

**Panel "Vendedores":**
- Indicador "Vendedores pendientes de sync: N"
- Botón "Sincronizar vendedores ahora"

---

## Parte 5 — Flujo completo del vendedor (para documentación)

```
1. Admin en Conta FT → Configuración → Vendedores Móviles → Toggle ON
2. Admin configura URL y token de la API → Prueba conexión ✓
3. Admin → Gestión de Vendedores → Nuevo Vendedor
   - Ingresa: Carlos Ruiz | carlos@empresa.com | contraseña | Zona Norte
4. Admin → Sincronizar pendientes → "1 vendedor sincronizado ✓"
5. Admin le dice a Carlos: "Descarga la app, entra con carlos@empresa.com / tu contraseña"
6. Carlos abre la app → login → ve los productos e inventario (sync automático)
7. Carlos visita un cliente, crea una venta desde la app → queda en API remota
8. En Conta FT (automático cada 15 min o manual) → baja el pedido
9. Admin ve en "Pedidos de Campo": pedido de Carlos por $150.000
10. Admin click "Convertir a venta" → se crea FV-1234 localmente, descuenta stock
11. Si Carlos emitió una FE desde la app → aparece en Facturación Electrónica tab "De vendedores"
12. Inventario cambia en Conta FT → sincronizador V2 lo sube → Carlos ve precios actualizados
```

---

## Parte 6 — Orden de implementación

### Sprint 1 — API remota (prerequisito)
1. Crear `SyncVendedorController.php` con endpoint `POST /sync/vendedores/batch`
2. Crear endpoint `GET /sync/ventas/pendientes` con filtro `after_id`
3. Probar ambos endpoints con Postman/curl

### Sprint 2 — Base de datos local
4. Agregar sección v5.1 a `actualizacion_completa.sql` (tablas del plan)
5. Aplicar en BD de desarrollo y verificar

### Sprint 3 — Backend PHP
6. `api/vendedores/config.php` (GET + guardar + probar)
7. `api/vendedores/vendedores.php` (CRUD + sync)
8. `api/vendedores/pull.php` (descarga de ventas remotas)
9. `api/vendedores/pedidos.php` (lista + convertir + anular)

### Sprint 4 — Frontend React
10. Tab "Vendedores Móviles" en `ConfiguracionSistema.tsx`
11. Hook `useVendedoresConfig.ts`
12. Componente `VendedoresMovil.tsx` (CRUD + sync button)
13. Componente `VendedoresPedidos.tsx` (lista + convertir)
14. Tab "De vendedores" en `FacturacionElectronica.tsx`
15. Sidebar y `PantallaInicio.tsx` (condicional)

### Sprint 5 — Sincronizador V2
16. Copiar el sincronizador a nueva carpeta
17. Cambiar identidad (nombre, appId)
18. Crear `pullEngine.js`
19. Crear `vendedorSync.js`
20. Verificar y ajustar mappers de productos/clientes
21. Actualizar UI del sincronizador
22. Build y prueba end-to-end

---

## Archivos a crear / modificar — Resumen

| Archivo | Tipo | Acción |
|---|---|---|
| `AppMobilFacturacion/api/app/Http/Controllers/SyncVendedorController.php` | PHP Laravel | Crear |
| `AppMobilFacturacion/api/routes/web.php` | PHP | Modificar — agregar 2 rutas |
| `conta-app-backend/sql/actualizacion_completa.sql` | SQL | Agregar sección v5.1 |
| `conta-app-backend/api/vendedores/config.php` | PHP | Crear |
| `conta-app-backend/api/vendedores/vendedores.php` | PHP | Crear |
| `conta-app-backend/api/vendedores/pull.php` | PHP | Crear |
| `conta-app-backend/api/vendedores/pedidos.php` | PHP | Crear |
| `Dashboard-Facturación/src/components/VendedoresMovil.tsx` | React | Crear |
| `Dashboard-Facturación/src/components/VendedoresPedidos.tsx` | React | Crear |
| `Dashboard-Facturación/src/hooks/useVendedoresConfig.ts` | React | Crear |
| `Dashboard-Facturación/src/components/ConfiguracionSistema.tsx` | React | Modificar — nueva pestaña |
| `Dashboard-Facturación/src/components/FacturacionElectronica.tsx` | React | Modificar — tab origen |
| `Dashboard-Facturación/src/components/Dashboard.tsx` | React | Modificar — cases + sidebar |
| `Dashboard-Facturación/src/components/PantallaInicio.tsx` | React | Modificar — card condicional |
| `SincronizadorVendedores/electron-app/` | Electron | Copiar + modificar |

---

## Notas para la IA que programe cada pieza

1. **Siempre verificar `habilitado`** antes de cualquier acción o render. Si `habilitado=false`, retornar `null` en React o `403` en PHP.

2. **Password del vendedor:** Se genera con `password_hash($pass, PASSWORD_BCRYPT)` en PHP antes de guardarlo local y antes de subirlo a la API. Nunca se guarda en texto claro ni se devuelve al frontend.

3. **Pull incremental:** Siempre usar `after_id = tbl_config_vendedores.ultimo_pull_id`. Nunca bajar todo de nuevo. En el primer pull (ultimo_pull_id=0), limitar a los últimos 60 días.

4. **Convertir pedido → venta:** No duplicar la lógica de creación de factura. El `pedidos.php action=convertir` debe hacer `include` o llamada interna al código de `api/ventas/nueva.php`, pasando los items del `items_json` parseado.

5. **FE de vendedores en `electronic_documents`:** El campo `cufe` es la clave natural. Usar `ON DUPLICATE KEY UPDATE` por `cufe` para que sea idempotente. El `status` siempre es `'autorizado'` (ya fue aprobado por DIAN antes de llegar aquí).

6. **Sincronizador V2:** Es un binario separado. El cliente instala AMBOS sincronizadores si venía de VB6 y también tiene vendedores. Si es cliente nuevo de Conta FT puro, solo instala el V2.

7. **Estilos Conta FT:** inline styles, controles `sm`, formato moneda `$ 1.234.000`, AG Grid para tablas. Mismas convenciones que el resto del sistema.
