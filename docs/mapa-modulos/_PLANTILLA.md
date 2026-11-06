# Plantilla de ficha de módulo (no editar — la usan quienes levantan el mapa)

Cada módulo se documenta en `docs/mapa-modulos/modulos/<modulo>.md` con EXACTAMENTE estas secciones.
Todo dato debe salir de leer el código (citar `archivo:línea`). Si algo no se pudo verificar, escribir "(sin verificar)".

```markdown
# <Nombre del módulo>

**Propósito:** 1-2 frases en lenguaje de negocio.
**Pantallas (frontend):** componentes .tsx que lo usan (ruta relativa a Dashboard-Facturación/src) y desde qué menú/vista se abren.
**Endpoints (backend):** conta-app-backend/api/<carpeta>/*.php con método y `action` cuando aplique.

## Flujos principales
Para cada operación de negocio (crear, anular, devolver, abonar…):
- **Operación:** nombre
- **Pantalla → endpoint:** Componente.tsx:línea → endpoint.php (método/action)
- **Lee:** tablas/vistas
- **Escribe:** tabla (INSERT/UPDATE/DELETE) — una línea por tabla
- **Efectos colaterales:** stock (tblarticulos.Existencia), kardex, caja (tblmov_caja/tblegresos/sesión), cartera (tblpagos/Saldo), DIAN/API externa, backup, notificaciones, sincronización (tbl_sync_outbox / triggers)
- **Transacción:** sí/no (archivo:línea de beginTransaction/commit/rollBack)
- **Consecutivos:** cómo se numera (MAX+1, AUTO_INCREMENT, API externa) y si hay bloqueo
- **Validaciones solo en frontend:** las que el backend NO repite

## Dependencias
- **Usa de otros módulos:** endpoints/tablas/helpers de otros módulos (helpers en api/utils, api/config, saldo_helper, etc.)
- **Lo usan otros módulos:** quién lee o escribe sus tablas (buscar con grep en todo api/ y src/)
- **Triggers / vistas de BD involucrados:** (buscar en conta-app-backend/sql/actualizacion_completa.sql)
- **Compatibilidad:** MySQL legacy vs SQLite embedded (¿usa funciones sólo MySQL? ¿db_factory?)

## Qué se rompe si lo tocas
Lista concreta: "si cambias X, se afecta Y porque Z (archivo:línea)".

## Evaluación de la implementación
- ¿Es adecuada? Problemas de diseño, bugs, riesgos de integridad (con archivo:línea). Separar **Confirmado** (leído en código) de **Sospecha**.
- Contraste con las reglas de PROCESOS_SISTEMA.md (raíz del repo).
```

Además, cada grupo entrega `docs/mapa-modulos/data/<grupo>.json` con esta forma (una entrada por endpoint):

```json
[{ "modulo": "ventas", "endpoint": "ventas/nueva.php", "metodo": "POST", "action": null,
   "pantallas": ["components/NuevaVenta.tsx"],
   "lee": ["tblarticulos"], "escribe": ["tblventas","tbldetalle_venta","tblkardex"],
   "efectos": ["stock","kardex","caja","cartera"], "transaccion": true,
   "llama_endpoints": [], "helpers": ["utils/saldo_helper.php"], "externo": [] }]
```
