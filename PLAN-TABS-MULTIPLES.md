# Plan: Sistema de Tabs / Ventanas Múltiples en Conta FT

> Documento de planeación — **NO iniciar hasta salir del ciclo de estabilización actual**.
> Se acordó postponer para no complicar el ciclo de pruebas con clientes en producción.
> Cuando se retome, empezar por **Fase 0 (prototipo)** para validar antes de refactor completo.

## Problema que resuelve

En VB6 el usuario podía abrir varias ventanas simultáneamente (MDI) — trabajar en una venta y consultar inventario sin perder estado. En la app React actual, el `Dashboard` hace `switch(activeModule)` que **desmonta el componente al cambiar de módulo**, perdiendo todo el estado. Reportado por el usuario como frustrante — ejemplo: estar armando una venta larga y querer consultar el inventario obliga a salir y perder el trabajo.

## Decisión — Opción elegida

**Tabs internos estilo Chrome** dentro de la misma ventana Electron. Descartadas:
- Múltiples ventanas Electron reales → costo en RAM prohibitivo en Celeron (~150-300 MB por ventana adicional × Chromium)
- Solo modales de consulta rápida → resuelve casos puntuales pero no el problema general

## Cambio de arquitectura

**Antes:**
```
activeModule state → switch → un solo componente montado a la vez
```

**Después:**
```
tabsAbiertos state → cada tab tiene su instancia del módulo → cambiar tab solo altera visibilidad
Componentes viven "vivos" en memoria mientras la tab exista
```

## Decisiones de diseño acordadas (pendiente confirmar antes de implementar)

Antes de codear el prototipo, confirmar:

1. **Módulos que pueden tener múltiples tabs (creadores):**
   - Nueva Venta ← permitir múltiples (mostrador + WhatsApp en paralelo)
   - Nueva Compra ← permitir múltiples (dos proveedores)

2. **Módulos singleton (siempre 1 sola tab):**
   - Inventario, Clientes, Proveedores, Cartera, Caja Registradora, Configuración, Datos Empresa

3. **Límite de tabs abiertos:** 5-8 con estrategia LRU (cerrar la menos usada al abrir la 9na)

4. **Persistencia:** solo en memoria (al cerrar la app se pierden). No en URL/localStorage por ahora.

5. **Cierre con cambios sin guardar:** confirmar con `confirmar()` antes de cerrar

## Riesgos técnicos identificados

Al refactorizar aparecerán bugs de "código que asumía una sola pantalla activa":

- **`triggerNotifRefresh`** — hoy dispara refresh global. Con múltiples tabs, ¿cuál refresca?
- **Toasts** — ya son globales, pero "Guardado" mientras estás en OTRO tab confunde
- **Atajos de teclado** (F2 abrir pago, Enter navegar) — necesitan saber a qué tab van dirigidos
- **`useEffect` de mount** — abrir 5 tabs = 5 requests al backend Apache local en paralelo (posible ahogo en Celeron)
- **Modales globales** (`AutorizacionAdminModal`, etc.) — verificar que no colisionen entre tabs
- **`localStorage` para persistencia de venta en armado** — hoy es una clave global, con múltiples ventas necesita ser por tab
- **Sesión de caja / auth** — compartidos entre tabs, OK

Ninguno bloqueador, pero cada uno requiere revisión al migrar cada módulo.

## Plan por fases

### Fase 0 — Prototipo (2 días)
- Implementar tabs solo para **Nueva Venta + Inventario**
- Barra de tabs arriba con: `[Inicio] [Nueva Venta #1] [Inventario] [+]`
- Botón cerrar por tab (X)
- Probar 2-3 días en máquina propia con datos reales antes de continuar

### Fase 1 — Módulos operativos frecuentes (1 semana)
Migrar: Ventas, Compras, Cartera, Clientes, Proveedores.

### Fase 2 — Módulos secundarios (3-4 días)
Informes, Movimientos, Bancos, Gastos.

### Fase 3 — Módulos singleton y bordes (2-3 días)
Caja Registradora (solo 1 tab, bloquear apertura de segunda), Configuración, Datos Empresa.

### Fase 4 — Refinamiento (unos días)
- Cerrar tab con confirmación de cambios sin guardar
- Reordenar tabs arrastrando
- Ctrl+Tab / Ctrl+Shift+Tab para navegar entre tabs
- Indicador visual "•" en tab con cambios pendientes
- Menú click-derecho: "Cerrar", "Cerrar otras", "Cerrar todas a la derecha"

**Total realista:** ~3 semanas + 1 semana de pruebas.

## Cuándo revisitar este plan

- Cuando termine el ciclo actual de estabilización (fixes de rendimiento, impresión, caja, etc.)
- Cuando los clientes reporten explícitamente esta limitación como problema
- Idealmente después de sacar la app móvil de `feature/movil` a producción, para no tener 2 refactors grandes simultáneos

## Referencias

- Componente principal a refactorizar: `Dashboard-Facturación/src/components/Dashboard.tsx`
- Patrón de referencia: Chrome, Google Docs, VS Code
- Librerías React útiles (si se decide usar): `@dnd-kit` para reordenar tabs, `react-tabs` como base (o custom desde 0, es simple)
