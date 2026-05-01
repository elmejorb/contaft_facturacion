# Plan de Trabajo — Conta FT
**Fecha:** 2026-05-01  
**Estado:** Pre-lanzamiento primer cliente

---

## Estado actual del sistema

La migración de VB6 a Electron+React está ~90% completa. El core comercial (ventas, compras, caja, FE, cartera, informes) está operativo y validado. Lo que queda son bugs puntuales, ajustes de calidad y algunas funcionalidades de menor frecuencia de uso.

---

## 1. Bugs activos (bloquean primer cliente)

| # | Descripción | Archivo(s) | Prioridad |
|---|---|---|---|
| B-1 | ~~`tblpagos.Fecha` guardaba `00:00:00`, rompía cuadre de sesión~~ | `api/clientes/pagos.php` | ✅ Resuelto |
| B-2 | Anulación de venta de sesión anterior no aparece en ningún cuadre (fecha de la factura es de la sesión vieja, no de hoy) | `api/caja/sesion.php` | 🔴 Pendiente |
| B-3 | ~~`tbldevolucion_ventas.id_usuario` se guardaba como `0`~~ | `api/ventas/detalle-factura.php` | ✅ Resuelto |
| B-4 | ~~`tblventas.Saldo` e `Impuesto` no se recalculaban bien tras devolución parcial (IVA ignorado)~~ | `api/ventas/detalle-factura.php` | ✅ Resuelto |
| B-5 | Cierre de mes: el COGS no descuenta las devoluciones (sobre-informa costo de ventas) | `api/informes/cierre-mes.php` o `InformeCierreMes.tsx` | 🔴 Pendiente |
| B-6 | `database.php` apunta a `conta_test_negocio` (BD de prueba). Debe volver a `conta_innovacion` antes de usar en producción | `api/config/database.php` | 🔴 Pendiente |

---

## 2. Testing end-to-end (pasos pendientes)

Flujo completo de prueba iniciado en sesión anterior — quedan 3 pasos:

| Paso | Acción | Resultado esperado |
|---|---|---|
| 14 | Retiro parcial de efectivo de caja del cajero hacia caja principal | Movimiento en `tblmov_caja` tipo `traslado`, saldo actualizado en ambas cajas |
| 15 | Cierre de caja con conteo físico | Cuadre exacto: efectivo esperado vs contado, diferencia visible, impresión correcta |
| 16 | Informe de cierre de mes / Estado de Resultados | Ventas − COGS − Gastos = Utilidad, devoluciones descontadas, FE incluidas |

---

## 3. Operaciones inmediatas (antes del primer cliente)

| Tarea | Descripción |
|---|---|
| Git commit | Hacer commit de todos los cambios de esta sesión (pagos.php, detalle-factura.php, sesion.php, nueva.php, fecha.ts, etc.) |
| Restaurar database.php | Apuntar de vuelta a la BD del cliente (ver B-6 arriba) |
| Aplicar migraciones en cliente | Ejecutar `actualizacion_completa.sql` + `backfill_costo_fe.sql` sobre la BD real |
| Verificar PHP timezone | Confirmar `date_default_timezone_set('America/Bogota')` en `database.php` del servidor del cliente |

---

## 4. Mejoras a módulos existentes (calidad, no bloquean)

### 4.1 Ventas / Devoluciones
- [ ] Frontend `DetalleFacturaModal`: enviar `id_usuario` en el body de la llamada `action=devolucion` (actualmente el backend ya lo acepta pero el frontend puede no enviarlo)
- [ ] Devolución de venta contado: no hay registro de egreso en caja por el dinero devuelto al cliente. Definir si aplica o es proceso manual
- [ ] Al anular una venta de crédito con pagos parciales previos: los pagos quedan en `tblpagos` como válidos. Revisar si deben anularse también

### 4.2 Caja
- [ ] Bug #2 (ver arriba): las anulaciones hechas desde una sesión diferente a la original no aparecen en el cuadre de ninguna sesión
- [ ] Traslado entre cajas: falta validar que la caja origen tenga saldo suficiente antes de permitir el traslado
- [ ] Imprimir comprobante de egreso también cuando se registra una **compra a contado** (actualmente solo gastos tienen esa impresión)

### 4.3 Compras
- [ ] Al hacer una compra a crédito, el saldo del proveedor se actualiza en `tblcuentasxpagar`. Verificar que la lógica de pago parcial al proveedor decremente ese saldo correctamente
- [ ] Editar / anular una compra registrada (actualmente solo se puede crear)

### 4.4 Clientes / Cartera
- [ ] Facturas anteriores (migración de saldos VB6): verificar que el cobro sobre esas facturas actualice `tblpagos` con referencia correcta
- [ ] Estado de cuenta por cliente en PDF (carta): mostrar facturas pendientes + historial de pagos + saldo total

### 4.5 Informes
- [ ] **InformeCierreMes**: ajustar COGS para descontar `valor_dev` de `tbldevolucion_ventas` (Bug #5)
- [ ] **InformeEstadoResultados**: verificar que use el COGS corregido y no duplique gastos financieros de la caja
- [ ] **InformeIVA**: validar que incluya tanto FE como facturas POS y que las notas crédito resten correctamente
- [ ] Informe de comisiones por vendedor (basado en `InformeFacturasVendedor`)
- [ ] Informe de devoluciones detallado (quién devolvió qué y cuánto)

### 4.6 Facturación Electrónica
- [ ] Nota débito (ND): flujo completo frontend → DIAN (solo nota crédito está 100% validada)
- [ ] Reenvío masivo de facturas en contingencia (hay modo contingencia pero el reenvío es uno a uno)
- [ ] Validar que la numeración FE no se salte si falla el envío a DIAN (consecutivo ya consumido vs rechazado)

### 4.7 Configuración
- [ ] Permisos por módulo (`ConfigPermisos`): confirmar que todos los módulos nuevos (FamiliasProducto, Lotes, Componentes) respeten los permisos del usuario
- [ ] Cambio de contraseña de usuario desde el propio perfil (sin necesitar admin)
- [ ] Logo de empresa: validar que se muestre en todos los formatos de impresión (tirilla ya OK, media carta pendiente de revisión en todos los reportes)

---

## 5. Funcionalidades nuevas (post-primer cliente, media prioridad)

| Funcionalidad | Descripción | Complejidad |
|---|---|---|
| **Cotizaciones completas** | Convertir cotización → factura con un clic. Actualmente la tab existe pero el flujo de conversión puede no estar completo | Media |
| **Backup automático de BD** | Desde la app: exportar dump de MySQL a una carpeta local o USB | Media |
| **Importar productos desde Excel** | Subir un `.xlsx` con código, nombre, precio, costo y actualizar o crear masivamente | Media |
| **Precio por lista / por cliente** | Asignar lista de precios (Público, Mayorista, Distribuidor) y que NuevaVenta cargue el precio de la lista del cliente | Alta |
| **Descuento global configurable** | Porcentaje de descuento máximo permitido por rol (vendedor no puede dar más del X%) | Baja |
| **Notificación de vencimiento de lotes** | Alerta push (ya hay campana) cuando un lote vence en los próximos N días (configurable) | Baja |
| **Modo pantalla táctil / POS kiosco** | Layout de NuevaVenta optimizado para pantalla táctil con botones grandes, sin teclado | Alta |
| **Dashboard vendedor mejorado** | `DashboardVendedor` con sus propias ventas del día, comisión, meta diaria | Media |

---

## 6. Funcionalidades futuras (post-estabilización, baja prioridad)

| Funcionalidad | Descripción |
|---|---|
| **Multi-empresa** | Cambiar de empresa sin reiniciar la app (múltiples BDs, un solo Apache) |
| **Módulo de nómina básica** | Empleados, salario, deducciones, colillas de pago |
| **Plan de cuentas / libro mayor** | Contabilidad formal: PUC colombiano, asientos automáticos de ventas/compras/gastos |
| **Balance general y P&G formal** | Estado de Resultados y Balance basado en el libro mayor (no en tablas operativas) |
| **Integración bancaria** | Conciliación bancaria semi-automática con extracto CSV del banco |
| **App móvil para vendedores** | React Native o PWA para tomar pedidos en campo |
| **Reportes programados por email** | Enviar el cierre diario o semanal automáticamente al correo del dueño |
| **Acceso remoto / nube** | Mover el backend PHP a un servidor en internet para acceso desde cualquier lugar |

---

## 7. Deuda técnica conocida

| Ítem | Descripción |
|---|---|
| `SuppliersManagement.tsx` | Componente antiguo (posiblemente reemplazado por `ProveedoresManagement`). Verificar si sigue en uso o es eliminable |
| `ProductsManagement.tsx` | Ídem — verificar si `InventarioManagement` lo reemplazó |
| `actualizacion_completa.sql` | Confirmar que las migraciones v4.12 (`id_usuario` en `tblpagos`) y v4.13 (ENUM `tblmov_caja`) estén incluidas |
| Timezone servidor cliente | El cliente puede tener PHP con timezone `Europe/Berlin` u otro; `database.php` ya tiene el fix pero debe verificarse en cada instalación |
| Zona horaria JS | Reemplazados `toISOString().slice(0,10)` por `hoyLocal()` en 18+ archivos; verificar que no queden instancias sueltas |
| Costos en FE históricas | El `backfill_costo_fe.sql` cubre las FE antiguas, pero artículos eliminados del sistema quedan con costo 0 — requiere revisión manual con el cliente |

---

## Checklist de lanzamiento (primer cliente)

```
[ ] B-2 y B-5 corregidos
[ ] database.php apunta a BD correcta
[ ] actualizacion_completa.sql ejecutado sobre BD del cliente
[ ] backfill_costo_fe.sql ejecutado + reporte revisado con cliente
[ ] Timezone PHP verificada en el servidor
[ ] FE: resolución y habilitación DIAN del cliente configurada
[ ] Logo y datos de empresa cargados en Configuración
[ ] Cajas creadas y asignadas a usuarios
[ ] Categorías de gastos configuradas
[ ] Medios de pago activados
[ ] Git tag de versión creado (v4.3.x)
[ ] Build Electron generado y probado en equipo limpio
[ ] Auto-updater configurado con URL del servidor de actualizaciones
```
