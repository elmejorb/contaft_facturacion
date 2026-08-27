# Estrategia de ramas — Conta FT

## Ramas activas

| Rama | Propósito | Builds que llegan a clientes |
|------|-----------|------------------------------|
| `main` | Código estable para clientes regulares | ✅ Sí (auto-update via FTP `latest.yml`) |
| `feature/movil` | Desarrollo activo del módulo Vendedores Móviles | ❌ No |

## Regla de oro

> **Las builds que suben a FTP (`latest.yml`) salen SIEMPRE de `main`. Nunca desde `feature/movil`.**

Esto garantiza que los clientes regulares (Ammi Accesorios, etc.) NO reciben código experimental del módulo móvil.

## Flujo de trabajo

### Para correcciones o features que afectan a TODOS los clientes (Gastos, Compras, Ventas, etc.)

1. Trabajar en `main` directamente.
2. Commit + push.
3. Cuando el usuario diga **"sube"** → bump versión + build + FTP upload.

### Para cambios del módulo Vendedores Móviles (sync móvil, GPS, pedidos vendedor, etc.)

1. `git checkout feature/movil`
2. `git rebase main` (para tener las últimas correcciones del core).
3. Trabajar en el módulo, commits incrementales.
4. **No subir a FTP desde este branch.**
5. Para probar: build local + .exe manual a quien lo prueba.
6. Cuando el módulo esté maduro (probado por meses en uno o dos clientes piloto): merge a `main` con squash o merge commit.

### Cómo decidir en qué rama poner un cambio

Pregúntate:
- ¿Toca archivos del módulo móvil (`useAutoSyncVendedores`, `pull.php` bloque vendedores, `SyncVendedorController` de Lumen, `AppMobilFacturacion/`)? → `feature/movil`
- ¿Toca `tbl_config_vendedores`, `tbl_vendedores_movil`, `tbl_pedidos_vendedor`? → `feature/movil`
- ¿Es cualquier otro componente (Gastos, Compras, Ventas, Inventario, Bancos, FE, Caja, etc.)? → `main`

Si tocas un archivo compartido (ej. `Dashboard.tsx`) para algo del módulo móvil — primero `feature/movil`, luego al mergear se lleva.

## Migraciones SQL

| Tipo de cambio | Va en archivo |
|---------------|---------------|
| Migración que necesitan TODOS los clientes | `sql/actualizacion_completa.sql` (idempotente) |
| Migración del módulo Vendedores Móviles | `sql/modulo_vendedores_movil.sql` (separado, aplicar solo cuando contraten) |

## Auto-update (electron-updater) — futuro

Cuando el módulo móvil esté listo para piloto pero no para todos, se puede activar el **canal beta**:

```yaml
# Build de feature/movil sube a FTP como beta.yml
publish:
  - provider: generic
    url: https://innovacion-digital.com/updates/contaft/
    channel: beta   # vs "latest" (default)
```

El cliente que quiera ser piloto activa una opción en su Conta FT que le suscribe al canal `beta`, y desde ahí recibe esas builds.

**Por ahora (2026-06-09) no se ha implementado el canal beta** — para probar se distribuye el .exe manualmente.

## Histórico de decisión

- **2026-06-09**: Creado branch `feature/movil` partiendo de `main` en commit `d043cf1` (Conta FT 4.3.54). A partir de aquí todo desarrollo del módulo móvil va en branch separado.
- Razón: El módulo móvil está en pruebas activas y se quería evitar que bugs/cambios experimentales lleguen a clientes regulares vía auto-update.
