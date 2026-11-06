# Dashboard e Inicio (pantalla de bienvenida, resumen, sugerencias, consulta IA)

**Propósito:** Vista inicial del sistema: bienvenida con marca, KPIs rápidos (ventas hoy/mes, cartera, inventario, top productos), tarjetas de sugerencias/alertas y un endpoint de filtrado semántico con IA.

**Pantallas (frontend):**
- `components/PantallaInicio.tsx` — vista por defecto `'inicio'` (`Dashboard.tsx:1595`). No hace fetch propio; usa hooks `useNotificaciones` y `useVendedoresConfig` (`PantallaInicio.tsx:7-8`) y monta `PanelSugerencias` **sólo en modo DEV y admin** (`PantallaInicio.tsx:220`).
- `components/IncomeOverview.tsx` — vista `'overview'` para no vendedores (`Dashboard.tsx:1596`) → `dashboard/resumen.php`.
- `components/DashboardVendedor.tsx` — vista `'overview'` para vendedores (`Dashboard.tsx:1596`) → `ventas/listar.php` (`DashboardVendedor.tsx:5,28`, otro módulo).
- `components/PanelSugerencias.tsx` (`:8`) y `components/NotificacionEmergente.tsx` (`:7,134`) → `inicio/sugerencias.php`.

**Endpoints (backend):**
- `api/dashboard/resumen.php` GET.
- `api/dashboard/estadisticas.php` GET — sin llamadas desde `src/` (grep `estadisticas.php`: ninguna).
- `api/dashboard/top-productos.php` GET `?periodo=` — sin llamadas desde `src/` (grep `dashboard/top-productos`: ninguna).
- `api/inicio/sugerencias.php` GET.
- `api/inicio/consulta-ia.php` POST `{modulo, pregunta, datos, campo_id}` — sin llamadas desde `src/` (grep `consulta-ia`: ninguna).

## Flujos principales
Todos son lecturas (sin escrituras, sin transacción, sin consecutivos).

### Resumen del dashboard (`dashboard/resumen.php`)
- **Pantalla → endpoint:** `IncomeOverview.tsx` → `dashboard/resumen.php`.
- **Lee:**
  - Ventas hoy / mes / mes anterior: `tblventas` `EstadoFact='Valida'` + `electronic_documents` `status='autorizado' AND type_document_id=1` (`resumen.php:18-42`). **No excluye FE con espejo POS** (no hay filtro por `cufe`, `:23`).
  - CxC: `vw_facturas_cliente_saldos` (`:45-50`) — sólo POS (vista `FROM tblventas`, `actualizacion_completa.sql:943`).
  - Pagos hoy/mes: `tblpagos` `Estado='Valida'` (`:53-54`).
  - Productos/sin stock/valor inventario: `tblarticulos` (`:57-59`), sin excluir servicios.
  - Top 5 del mes: UNION ALL detalle POS Valida + detalle FE autorizada (`:62-85`), sin inflar (agrega por línea), FE sin exclusión por cufe.
  - Ventas 7 días: UNION ALL POS + FE (`:88-105`).
  - Clientes activos del mes: UNION POS + FE (`:110-114`).
  - Empresa: `tbldatosempresa` (`:107`).

### Estadísticas / top productos (no usados)
- `estadisticas.php`: `tblArticulos` (mayúscula) conteos y valor (`:13-34`).
- `top-productos.php`: `tblArticulos` JOIN **`tblventasdetalle`** (`:37-39`), tabla que no existe en `conta_template_limpio.sql` ni en `actualizacion_completa.sql` (grep: 0) → el endpoint fallaría; código muerto.

### Sugerencias (`inicio/sugerencias.php`)
- **Pantalla → endpoint:** `PanelSugerencias.tsx` (sólo DEV) y `NotificacionEmergente.tsx:134`.
- **Lee:** `vw_facturas_cliente_saldos` (cartera vencida >60 d y por vencer 7 d, `sugerencias.php:45,76`) — sólo POS; `vw_productos_stock_bajo` JOIN `tbldetalle_venta` JOIN `tblventas` Valida 30 d (`:120-131`), detecta la vista vía `sqlite_master` o `information_schema` (`:112-117`); `tblclientes.FechaCumple` (`:159`); `tblventas` Valida semana vs 4 semanas previas (`:199-204`); top producto 7 días `tbldetalle_venta`+`tblventas`+`tblarticulos` (`:233-238`).
- **POS+FE:** sólo POS en todas las tarjetas.

### Consulta IA (`inicio/consulta-ia.php`)
- **Externo:** POST a Groq `https://api.groq.com/openai/v1/chat/completions` vía cURL (`consulta-ia.php:32,112-129`). API key desde `tbldatosempresa.groq_api_key` o `config/secrets.php` (`:37-50`). Envía hasta 500 registros que manda el cliente (`:181`) al proveedor externo. El LLM sólo devuelve IDs; no genera SQL (`:10-13`).
- No hay pantalla que lo llame (grep). Memoria del proyecto: en modo dev nada debe llamar servicios externos — este endpoint no tiene guarda de modo dev (sin verificar si alguna pantalla lo llamará).

## Dependencias
- **Usa de otros módulos:** `config/helpers_polyfill.php` (`conta_tiene_tabla`, `dashboard/resumen.php:14`; `conta_tiene_columna`, `consulta-ia.php:39`); vistas de cartera clientes y stock bajo (`actualizacion_completa.sql:931,361`); tablas Ventas/FE/Pagos/Inventario/Clientes.
- **Lo usan otros módulos:** sólo frontend.
- **Triggers / vistas:** `vw_facturas_cliente_saldos`, `vw_productos_stock_bajo`.
- **Compatibilidad:** `sugerencias.php:112-117` contempla SQLite explícitamente. `DATE_SUB(… INTERVAL n DAY|MONTH)` reescrito por `db_factory.php:169-190`. `top-productos.php` usa `DATE_SUB(CURRENT_TIMESTAMP, …)` y nombres en mayúscula (`tblArticulos`) — en MySQL Linux sería case-sensitive (despliegues son Windows; sin verificar).

## Qué se rompe si lo tocas
- Volver a guardar FE en `tblventas` o tener FE legacy con espejo POS válido → `dashboard/resumen.php` las cuenta dos veces (no excluye por `cufe`, `:23,73-82,96-102`), a diferencia de `informes/resumen.php` cierre_mes (`:69`). Los KPIs del inicio y el Cierre de Mes no cuadran entre sí.
- Cambiar `status` de FE ('autorizado') o `EstadoFact` ('Valida') → KPIs de ventas.
- Cambiar la vista `vw_facturas_cliente_saldos` → CxC del dashboard y tarjetas de cartera vencida.
- Renombrar/ajustar `vw_productos_stock_bajo` → tarjeta "Stock crítico" desaparece silenciosamente (se omite si la vista no existe, `:119`).

## Evaluación de la implementación
**Confirmado:**
1. Doble conteo potencial FE+POS en `dashboard/resumen.php` (sin filtro cufe) vs exclusión en informes → KPIs inconsistentes entre pantallas.
2. CxC del dashboard y sugerencias de cartera ignoran FE a crédito (vista sólo POS).
3. Sugerencias de ventas/top producto ignoran FE v4.6+.
4. `dashboard/top-productos.php` referencia `tblventasdetalle` inexistente; `estadisticas.php` y `top-productos.php` sin consumidores → código muerto.
5. `consulta-ia.php` envía datos de clientes a un tercero (Groq) sin pantalla consumidora ni guarda de entorno.
6. `PanelSugerencias` sólo se monta en DEV (`PantallaInicio.tsx:220`); en producción las sugerencias llegan sólo por `NotificacionEmergente`.

**Contraste PROCESOS_SISTEMA.md:** regla 5 (FE y POS mismos efectos) — el dashboard sí suma ambos flujos, pero sin la deduplicación por CUFE que usan los informes.
