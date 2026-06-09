# Conta Movil API

API backend dedicada a la app móvil de vendedores en calle. Stack: **Lumen 10 + JWT + MySQL**.

Sirve como puente entre el ecosistema de Conta y los vendedores móviles. En producción comparte BD con `api-conta` en Hostinger, en desarrollo usa una BD local.

## Stack

- PHP 8.2+
- Lumen 10
- tymon/jwt-auth 2.x
- MySQL 5.7+ / MariaDB 10.4+

## Setup inicial

```bash
# 1. Instalar dependencias
composer install

# 2. Copiar y editar .env
cp .env.example .env
# Ajustar DB_USERNAME, DB_PASSWORD, JWT_SECRET

# 3. Crear BD
mysql -u root -p -e "CREATE DATABASE conta_movil CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"

# 4. Migrar
php artisan migrate

# 5. Seed (vendedor demo + catálogos)
php artisan db:seed

# 6. Arrancar servidor
php -S localhost:8000 -t public
```

La API quedará en `http://localhost:8000`.

## Credenciales demo

Después del seeder tienes 2 vendedores de prueba:

| Email | Password | Código | Zona |
|---|---|---|---|
| `fernando@epikom.com` | `demo1234` | V001 | Zona Centro |
| `maria@epikom.com` | `demo1234` | V002 | Zona Norte |

## Endpoints disponibles (Fase 0)

### Públicos

- `GET /` → info básica de la API
- `GET /health` → healthcheck
- `POST /api/auth/login` → body `{email, password}` → devuelve JWT + vendedor + empresa

### Protegidos (requieren `Authorization: Bearer {token}`)

- `GET /api/auth/me` → datos del vendedor autenticado
- `POST /api/auth/refresh` → renueva el token
- `POST /api/auth/logout` → invalida el token

## Probar con curl

```bash
# Login
curl -X POST http://localhost:8000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"fernando@epikom.com","password":"demo1234"}'

# Copiar el token y...
curl http://localhost:8000/api/auth/me \
  -H "Authorization: Bearer <TOKEN>"
```

## Estructura de BD

**Tablas compartidas** (en producción ya las provee `api-conta`, aquí las creamos para dev):
- `empresas`
- `clientes`
- `categorias`
- `productos`
- `ventas`
- `venta_detalles`

**Tablas exclusivas de la app móvil** (siempre se crean):
- `mobile_vendedores` — usuarios móviles con su propio login
- `mobile_vendedor_clientes` — asignación N:M vendedor ↔ cliente
- `mobile_refresh_tokens` — tokens de dispositivos para revocación
- `mobile_sync_log` — auditoría de operaciones móviles

## Despliegue a Hostinger (futuro)

1. Subir el código al VPS
2. Configurar `.env` con las credenciales de la BD remota (compartida con api-conta)
3. **NO** correr la migración `2026_04_24_000001_create_shared_tables` (esas tablas ya existen)
4. Correr solo `2026_04_24_000002_create_mobile_tables`
5. Crear vendedores reales (no usar el seeder demo)

## Endpoints de sincronización (Electron)

**Auth:** email + token_api en el body. NO usa JWT.
**Obtener token_api** de `empresas.token_api` en la BD (se genera en el seeder).

### Validación
- `POST /sync/electron/validar` → body `{email, token_api}` → devuelve empresa
- `POST /sync/validar` → idéntico (alias VB6)

### Batch (upsert por `codvb6`)
Todos aceptan body `{email, token_api, registros: [...]}` y devuelven `{insertados, actualizados, total_procesados, total_errores, errores}`.

- `POST /sync/categorias/batch` (máx 100)
- `POST /sync/productos/batch` (máx 200)
- `POST /sync/clientes/batch` (máx 200)
- `POST /sync/proveedores/batch` (máx 200)
- `POST /sync/ventas/batch` (máx 100, incluye `detalles`)
- `POST /sync/pagos/batch` (máx 500, alias `/sync/pagos/vb6/batch`)
- `POST /sync/saldos/batch` (máx 500, acepta `tipo=cliente|proveedor` y `reset_saldos=true`)
- `POST /sync/cierres-caja/batch` (máx 200)

### Auditoría
Cada batch registra en `sync_batch_log` con recibidos, insertados, actualizados, errores.

## Próximas fases

- **Fase 4**: Integración directa con `api-electronica` para DIAN desde el móvil
- **Extensión del Electron**: apuntar `urlBase` al nuevo dominio donde corra `conta-movil-api`

## Variables de entorno relevantes

```
DB_DATABASE=conta_movil          # Local dev
DB_USERNAME=root
DB_PASSWORD=root

JWT_SECRET=<generado>            # hex 64 chars
JWT_TTL=1440                     # token vive 24h
JWT_REFRESH_TTL=20160            # refresh 14 días

DIAN_API_URL=https://api-electronica.innovacion-digital.com
CONTA_API_URL=https://conta-basic.innovacion-digital.com/api-conta/public
```

---

Desarrollado por [Innovación Digital](https://innovacion-digital.com/).
