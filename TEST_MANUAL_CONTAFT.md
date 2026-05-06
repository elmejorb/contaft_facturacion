# TEST MANUAL — Conta FT
**Versión:** 4.3.x  
**Fecha:** 2026-05-04  
**Propósito:** Verificación completa de todos los módulos antes de entrega al primer cliente.

> **Convenciones:**  
> ✅ = paso superado  ❌ = fallo (anotar qué ocurrió)  ⚠️ = resultado parcial o advertencia  
> Ejecutar en orden. Algunos pasos dependen del estado que dejó el anterior.

---

## MÓDULO 0 — Preparación del entorno

| # | Acción | Resultado esperado |
|---|---|---|
| 0.1 | Abrir `api/config/database.php` y verificar que apunta a `conta_distrisalsas4` (sandbox) | `$dbname = 'conta_distrisalsas4'` |
| 0.2 | Verificar que Apache y MySQL están corriendo | App carga sin "Error de conexión" |
| 0.3 | Lanzar la app en modo dev (`npm run electron:dev`) | App abre con barra de título "dev" |
| 0.4 | No deben aparecer toasts de "actualización disponible" ni "suscripción" | Silencio total en notificaciones de sistema |

---

## MÓDULO 1 — Autenticación

| # | Acción | Resultado esperado |
|---|---|---|
| 1.1 | Ingresar usuario y contraseña **incorrectos** | Mensaje de error, no entra |
| 1.2 | Ingresar con usuario **admin** y contraseña correcta | Acceso total, ve todos los módulos |
| 1.3 | Cerrar sesión | Regresa a la pantalla de login |
| 1.4 | Ingresar con usuario **vendedor** (si existe) | Solo ve los módulos permitidos; no ve Configuración ni Informes sensibles |
| 1.5 | Cerrar sesión y volver a ingresar como admin | Estado limpio para los siguientes pasos |

---

## MÓDULO 2 — Configuración del sistema

### 2.1 Datos de empresa
| # | Acción | Resultado esperado |
|---|---|---|
| 2.1.1 | Ir a Configuración → Datos de Empresa | Formulario cargado con datos actuales |
| 2.1.2 | Modificar el teléfono o dirección y guardar | Toast "Guardado correctamente" |
| 2.1.3 | Recargar la sección | El nuevo valor persiste |

### 2.2 Cajas
| # | Acción | Resultado esperado |
|---|---|---|
| 2.2.1 | Ir a Configuración → Cajas | Lista de cajas existentes |
| 2.2.2 | Crear una caja nueva "Caja Test" con saldo inicial $0 | Aparece en la lista |
| 2.2.3 | Asignar la caja a un usuario cajero | El usuario queda vinculado a esa caja |
| 2.2.4 | Eliminar la caja de prueba (si el sistema lo permite) | La caja desaparece de la lista |

### 2.3 Categorías de gasto
| # | Acción | Resultado esperado |
|---|---|---|
| 2.3.1 | Ir a Configuración → Categorías de Gasto | Lista visible |
| 2.3.2 | Crear categoría "Servicios Públicos" | Aparece en la lista |

### 2.4 Permisos
| # | Acción | Resultado esperado |
|---|---|---|
| 2.4.1 | Ir a Configuración → Permisos | Matriz de permisos por módulo/rol |
| 2.4.2 | Desactivar un módulo para rol "Vendedor" y guardar | El cambio queda guardado |
| 2.4.3 | Reactivarlo | Vuelve al estado original |

---

## MÓDULO 3 — Inventario / Productos

### 3.1 Productos
| # | Acción | Resultado esperado |
|---|---|---|
| 3.1.1 | Ir a Inventario | Lista de productos con código, nombre, stock, precio |
| 3.1.2 | Buscar un producto por nombre parcial | Filtra correctamente |
| 3.1.3 | Crear un producto nuevo "Producto Test" con precio $10.000, costo $6.000, IVA 19%, stock inicial 50 | Producto guardado, aparece en lista |
| 3.1.4 | Editar el producto: cambiar precio a $11.000 | Modal se abre con datos precargados; al guardar, nuevo precio visible |
| 3.1.5 | Verificar que el stock muestra 50 | Stock correcto |

### 3.2 Familias / Categorías de producto
| # | Acción | Resultado esperado |
|---|---|---|
| 3.2.1 | Ir a Familias de Producto | Lista de familias |
| 3.2.2 | Crear familia "Familia Test" | Aparece en la lista |
| 3.2.3 | Asignar "Producto Test" a esa familia | El producto queda categorizado |

### 3.3 Lotes
| # | Acción | Resultado esperado |
|---|---|---|
| 3.3.1 | Abrir detalle de "Producto Test" → pestaña Lotes | Si el producto maneja lotes, muestra el lote creado en la compra |
| 3.3.2 | Ver alerta de "Lotes por vencer" (si aplica) | Campana muestra el lote si vence en ≤ N días |

### 3.4 Kardex
| # | Acción | Resultado esperado |
|---|---|---|
| 3.4.1 | Ir a Kardex → seleccionar "Producto Test" | Muestra el movimiento de entrada del stock inicial |
| 3.4.2 | Verificar que las columnas muestran: Fecha, Tipo, Cantidad, Costo, Saldo | Datos correctos |

### 3.5 Stock bajo / Diagnóstico
| # | Acción | Resultado esperado |
|---|---|---|
| 3.5.1 | Ir a Inventario → Stock Bajo | Lista de productos bajo el mínimo configurado |
| 3.5.2 | Ir a Diagnóstico de Inventario | Reporte de inconsistencias (debe estar vacío en BD limpia) |

---

## MÓDULO 4 — Clientes

| # | Acción | Resultado esperado |
|---|---|---|
| 4.1 | Ir a Clientes | Lista de clientes |
| 4.2 | Crear cliente "Cliente Test", NIT/CC, teléfono, dirección, tipo: Persona | Cliente guardado |
| 4.3 | Asignarle cupo de crédito $500.000 | Campo cupo guardado |
| 4.4 | Buscar el cliente por nombre | Aparece en la búsqueda |
| 4.5 | Verificar campo "Cumpleaños" — si se llena, aparece en el panel de cumpleaños del día correspondiente | Según fecha configurada |

---

## MÓDULO 5 — Proveedores

| # | Acción | Resultado esperado |
|---|---|---|
| 5.1 | Ir a Proveedores | Lista de proveedores |
| 5.2 | Crear proveedor "Proveedor Test", NIT, teléfono | Proveedor guardado |
| 5.3 | Buscar el proveedor | Aparece en la búsqueda |

---

## MÓDULO 6 — Caja Registradora

### 6.1 Apertura de caja
| # | Acción | Resultado esperado |
|---|---|---|
| 6.1.1 | Ir a Caja Registradora | Muestra el botón "Abrir Caja" o la caja ya abierta |
| 6.1.2 | Abrir caja con saldo base $200.000 | Sesión creada, saldo inicial visible |
| 6.1.3 | Verificar que la fecha/hora de apertura es correcta (hora local colombiana) | Fecha y hora correctas |

### 6.2 Ingreso manual (egreso/ingreso de efectivo)
| # | Acción | Resultado esperado |
|---|---|---|
| 6.2.1 | Registrar un **egreso** de $50.000, categoría "Servicios Públicos", descripción "Pago agua" | Movimiento registrado, saldo baja a $150.000 |
| 6.2.2 | Registrar un **ingreso** de $30.000, descripción "Otro ingreso" | Saldo sube a $180.000 |
| 6.2.3 | Ver el listado de movimientos de la sesión | Aparecen los dos movimientos con fecha y hora |

### 6.3 Traslado entre cajas
| # | Acción | Resultado esperado |
|---|---|---|
| 6.3.1 | Registrar traslado de $50.000 desde caja actual hacia otra caja del sistema | Movimiento tipo `traslado` en ambas cajas; saldo caja origen baja, caja destino sube |
| 6.3.2 | Intentar trasladar más del saldo disponible | Error o advertencia (validación de saldo) |

### 6.4 Cierre de caja
| # | Acción | Resultado esperado |
|---|---|---|
| 6.4.1 | Iniciar cierre de caja | Modal de conteo físico aparece |
| 6.4.2 | Ingresar el monto contado igual al esperado | Diferencia = $0, cuadre perfecto |
| 6.4.3 | Ver resumen del cierre: ventas + ingresos − egresos = efectivo esperado | Los números cuadran |
| 6.4.4 | Confirmar cierre | Sesión cerrada; no se puede seguir registrando movimientos |
| 6.4.5 | Intentar vender con caja cerrada | Mensaje de error "No hay caja abierta" |

---

## MÓDULO 7 — Nueva Venta

> **Prerequisito:** Abrir caja (repite paso 6.1 si la cerraste).

### 7.1 Venta de contado — cliente consumidor final
| # | Acción | Resultado esperado |
|---|---|---|
| 7.1.1 | Ir a Nueva Venta | Formulario limpio, cursor en búsqueda de producto |
| 7.1.2 | Buscar "Producto Test" y agregar 2 unidades | Línea en la tabla con subtotal correcto |
| 7.1.3 | Dejar cliente como "Consumidor Final" | Campo cliente vacío o valor por defecto |
| 7.1.4 | Medio de pago: Efectivo. Monto recibido: $30.000 | Cambio calculado automáticamente |
| 7.1.5 | Confirmar venta | Factura creada, modal de impresión aparece o tirilla lista |
| 7.1.6 | Stock de "Producto Test" bajó en 2 | Verificar en Inventario |
| 7.1.7 | El monto aparece en el cuadre de caja del día | Verificar en Caja → movimientos |

### 7.2 Venta de contado — con cliente
| # | Acción | Resultado esperado |
|---|---|---|
| 7.2.1 | Nueva venta, buscar "Cliente Test" | Cliente carga con su información |
| 7.2.2 | Agregar producto, medio de pago Efectivo | — |
| 7.2.3 | Confirmar venta | Factura con nombre del cliente |

### 7.3 Venta a crédito
| # | Acción | Resultado esperado |
|---|---|---|
| 7.3.1 | Nueva venta con "Cliente Test" (tiene cupo $500.000) | — |
| 7.3.2 | Agregar producto por $100.000, medio de pago **Crédito** | — |
| 7.3.3 | Confirmar venta | Factura creada, saldo del cliente en `tblcuentasxcobrar` aumentó $100.000 |
| 7.3.4 | Intentar venta a crédito que **supera el cupo** | Modal de autorización de admin aparece; sin autorización, la venta no pasa |
| 7.3.5 | Autorizar el exceso de cupo con credenciales de admin | Venta aprobada |

### 7.4 Venta con múltiples medios de pago
| # | Acción | Resultado esperado |
|---|---|---|
| 7.4.1 | Nueva venta por $150.000: $50.000 efectivo + $100.000 transferencia | — |
| 7.4.2 | Confirmar | Factura creada; dos registros de pago en `tblpagos` |

### 7.5 Venta con descuento
| # | Acción | Resultado esperado |
|---|---|---|
| 7.5.1 | Nueva venta, agregar producto, aplicar descuento en línea o global | Subtotal ajustado correctamente |

---

## MÓDULO 8 — Facturación Electrónica (FE)

### 8.1 Venta con FE
| # | Acción | Resultado esperado |
|---|---|---|
| 8.1.1 | Nueva venta, activar "Factura Electrónica" | Formulario exige RUT/NIT del cliente |
| 8.1.2 | Seleccionar "Cliente Test", agregar producto | — |
| 8.1.3 | Confirmar venta | FE enviada al proveedor DIAN; respuesta con CUFE visible |
| 8.1.4 | En Facturación Electrónica → ver la FE recién creada | Estado: "Aceptada" o "En proceso" |
| 8.1.5 | Reenviar la FE por correo al cliente (si aplica) | Acción ejecutada sin error |

### 8.2 Nota Crédito (devolución FE)
| # | Acción | Resultado esperado |
|---|---|---|
| 8.2.1 | Abrir la FE del paso 8.1.3 | Modal de detalle |
| 8.2.2 | Crear Nota Crédito por devolución total | NC enviada al proveedor DIAN; CUFE de NC visible |
| 8.2.3 | Stock del producto devuelto aumentó | Verificar en Inventario |

---

## MÓDULO 9 — Devoluciones y Anulaciones

### 9.1 Devolución parcial de venta (factura POS)
| # | Acción | Resultado esperado |
|---|---|---|
| 9.1.1 | Ir a Ventas → buscar la venta de 7.1 | Aparece en la lista |
| 9.1.2 | Abrir detalle → iniciar devolución de **1 unidad** (no todas) | Modal de devolución con checkbox por línea |
| 9.1.3 | Confirmar devolución con autorización de admin | `tbldevolucion_ventas` tiene registro; stock sube en 1; saldo de la factura recalculado |
| 9.1.4 | IVA del saldo restante es correcto (no duplicado ni ignorado) | Verificar en detalle de la venta |

### 9.2 Devolución total
| # | Acción | Resultado esperado |
|---|---|---|
| 9.2.1 | Abrir la venta de 7.2 → devolución total | Todos los ítems revertidos; saldo factura = $0 |

### 9.3 Anulación de venta contado (misma sesión)
| # | Acción | Resultado esperado |
|---|---|---|
| 9.3.1 | Abrir la venta de 7.1.5 (o similar) → Anular | Requiere autorización admin |
| 9.3.2 | Autorizar y confirmar | Factura marcada "Anulada"; stock restituido; egreso automático registrado en caja por el valor devuelto |
| 9.3.3 | Verificar el cuadre de caja de la sesión actual | La anulación aparece como movimiento negativo |

### 9.4 Anulación de venta de sesión anterior
| # | Acción | Resultado esperado |
|---|---|---|
| 9.4.1 | Abrir una venta de una sesión de caja ya cerrada | — |
| 9.4.2 | Anular con autorización admin | Factura anulada; egreso registrado en la **caja abierta hoy** (no en la cerrada) |
| 9.4.3 | Verificar que la anulación aparece en el cuadre de la sesión **actual** | La anulación es visible |

### 9.5 Anulación de venta a crédito con pago parcial
| # | Acción | Resultado esperado |
|---|---|---|
| 9.5.1 | Tomar la venta de 7.3 (crédito $100.000) | — |
| 9.5.2 | Registrar un pago parcial de $30.000 primero (ver módulo 11) | — |
| 9.5.3 | Luego intentar anularla | Advertencia o bloqueo indicando que tiene pagos; confirmar comportamiento esperado |

---

## MÓDULO 10 — Compras

### 10.1 Compra a contado
| # | Acción | Resultado esperado |
|---|---|---|
| 10.1.1 | Ir a Compras → Nueva Compra | Formulario de compra |
| 10.1.2 | Seleccionar "Proveedor Test", agregar "Producto Test" × 20 unidades, costo $6.000 c/u | Total $120.000 |
| 10.1.3 | Medio de pago: Contado | — |
| 10.1.4 | Confirmar | Compra registrada; stock de "Producto Test" sube en 20; kardex tiene entrada |
| 10.1.5 | Verificar que se generó comprobante de egreso (si aplica) | Tirilla de egreso imprimible |

### 10.2 Compra a crédito
| # | Acción | Resultado esperado |
|---|---|---|
| 10.2.1 | Nueva compra al mismo proveedor × 10 unidades, tipo Crédito | — |
| 10.2.2 | Confirmar | Deuda en `tblcuentasxpagar` del proveedor aumentó |
| 10.2.3 | Ir a Saldos Proveedores → ver saldo de "Proveedor Test" | Saldo correcto |

### 10.3 Pago a proveedor
| # | Acción | Resultado esperado |
|---|---|---|
| 10.3.1 | Desde el detalle del proveedor o Cartera Proveedores, registrar pago parcial $30.000 | Saldo del proveedor baja; registro en tabla de pagos a proveedor |
| 10.3.2 | Verificar nuevo saldo | Correcto |

---

## MÓDULO 11 — Cartera / Cobros a Clientes

| # | Acción | Resultado esperado |
|---|---|---|
| 11.1 | Ir a Cartera / Cobros (ListadoPagos o similar) | Lista de facturas pendientes de cobro |
| 11.2 | Seleccionar la venta a crédito de 7.3 ($100.000) | Detalle de la deuda |
| 11.3 | Registrar pago parcial $40.000, medio: Efectivo | Saldo baja a $60.000; `tblpagos` tiene el registro con fecha y hora correctas |
| 11.4 | Registrar el saldo restante $60.000 | Factura queda en $0; marcada como pagada |
| 11.5 | Verificar que los pagos afectan el saldo de caja (si el pago fue efectivo) | Caja tiene los $100.000 |
| 11.6 | Ir a Informe de Cartera | Muestra el estado actualizado; la deuda cobrada no aparece como pendiente |

---

## MÓDULO 12 — Informes

### 12.1 Ventas
| # | Acción | Resultado esperado |
|---|---|---|
| 12.1.1 | Ir a Informes → Ventas del período | Incluye todas las ventas del día actual |
| 12.1.2 | Filtrar por fecha específica | Filtra correctamente |
| 12.1.3 | Ver InformeVentasMensual | Gráfico y tabla con ventas por mes |

### 12.2 Inventario valorizado
| # | Acción | Resultado esperado |
|---|---|---|
| 12.2.1 | Ir a Informes → Inventario Valorizado | Lista de productos × stock × costo = valor total |
| 12.2.2 | Verificar que "Producto Test" tiene el costo correcto ($6.000) | Sin multiplicación extra de IVA |

### 12.3 Cierre de mes / Estado de Resultados
| # | Acción | Resultado esperado |
|---|---|---|
| 12.3.1 | Ir a Informes → Cierre de Mes, seleccionar el mes actual | — |
| 12.3.2 | Ventas brutas − devoluciones = ventas netas | Cálculo correcto |
| 12.3.3 | COGS: costo de lo vendido, descontando devoluciones | COGS no incluye los ítems devueltos |
| 12.3.4 | Gastos (egresos de caja) aparecen en la sección de gastos | Categorías visibles |
| 12.3.5 | Utilidad = Ventas netas − COGS − Gastos | Número coherente |
| 12.3.6 | Las FE (facturas electrónicas) están incluidas en las ventas | No se omiten |

### 12.4 Cartera resumida y detallada
| # | Acción | Resultado esperado |
|---|---|---|
| 12.4.1 | Ir a Informe Cartera | Lista de clientes con saldo pendiente |
| 12.4.2 | Abrir detalle de "Cliente Test" | Historial de facturas y pagos |

### 12.5 Informe IVA
| # | Acción | Resultado esperado |
|---|---|---|
| 12.5.1 | Ir a Informes → IVA del período | Incluye ventas POS y FE; notas crédito restan |

### 12.6 Proveedores
| # | Acción | Resultado esperado |
|---|---|---|
| 12.6.1 | Ir a Informes → Saldos Proveedores | Muestra deuda total con "Proveedor Test" |
| 12.6.2 | Ir a Informe Proveedores Listado | Lista completa con contacto y saldo |

---

## MÓDULO 13 — Facturación Electrónica (panel de gestión)

| # | Acción | Resultado esperado |
|---|---|---|
| 13.1 | Ir a Facturación Electrónica | Lista de FE emitidas |
| 13.2 | Filtrar por estado "Pendiente" | Solo las FE sin respuesta DIAN |
| 13.3 | Intentar reenviar una FE rechazada | Acción ejecutada; estado actualizado |
| 13.4 | Verificar numeración consecutiva | Sin saltos (el consecutivo no se perdió en envíos fallidos) |

---

## MÓDULO 14 — Usuarios

| # | Acción | Resultado esperado |
|---|---|---|
| 14.1 | Ir a Usuarios | Lista de usuarios del sistema |
| 14.2 | Crear usuario "cajero_test", rol Cajero, caja asignada | Usuario guardado |
| 14.3 | Iniciar sesión con "cajero_test" | Solo ve módulos permitidos para Cajero |
| 14.4 | Cerrar sesión y volver a admin | Estado restaurado |
| 14.5 | Eliminar "cajero_test" | Desaparece de la lista |

---

## MÓDULO 15 — Auditoría y herramientas de diagnóstico

| # | Acción | Resultado esperado |
|---|---|---|
| 15.1 | Ir a Auditoría de Inventario | Movimientos de inventario con usuario y fecha |
| 15.2 | Verificar que las devoluciones del módulo 9 aparecen en el log | Tipo "DEVOLUCION" visible |
| 15.3 | Ir a Diagnóstico de Inventario | Sin inconsistencias tras las operaciones anteriores |

---

## MÓDULO 16 — Impresión

| # | Acción | Resultado esperado |
|---|---|---|
| 16.1 | Reimprimir la factura de 7.1 | Tirilla con datos correctos: fecha local, cliente, productos, totales, logo |
| 16.2 | Imprimir comprobante de egreso de caja (gasto del paso 6.2.1) | Comprobante con categoría, monto, fecha |
| 16.3 | Imprimir recibo de pago del cliente (módulo 11) | Recibo con nombre, valor, saldo restante |
| 16.4 | Logo de empresa visible en los formatos media carta | No aparece imagen rota |

---

## MÓDULO 17 — Auto-actualización (solo en build de producción)

> Solo ejecutar si hay un build `.exe` publicado en el servidor de actualizaciones.

| # | Acción | Resultado esperado |
|---|---|---|
| 17.1 | Instalar la versión anterior de la app en un equipo limpio | App instalada y funcionando |
| 17.2 | Publicar una nueva versión en el servidor | `latest.yml` actualizado |
| 17.3 | Abrir la app (la versión anterior) | A los ~5 segundos aparece toast "Descargando actualización..." |
| 17.4 | Esperar descarga | Toast "Actualización lista. [Reiniciar ahora] [Más tarde]" |
| 17.5 | Clic en "Reiniciar ahora" | App se cierra, instala y abre en la nueva versión |
| 17.6 | Probar con suscripción **vencida** | Toast de advertencia rojo; actualización bloqueada |

---

## MÓDULO 18 — Prueba de zona horaria

| # | Acción | Resultado esperado |
|---|---|---|
| 18.1 | Revisar la fecha y hora de las últimas facturas en la BD | Deben estar en hora Colombia (UTC-5), sin offset a UTC |
| 18.2 | Crear una venta ahora y verificar `tblventas.Fecha` en la BD | Hora local colombiana |
| 18.3 | Verificar campo `Fecha` en `tblpagos` tras un cobro | Mismo resultado |

---

## CHECKLIST FINAL — Antes de pasar a producción

```
[ ] database.php apunta a la BD del cliente (conta_innovacion o la real)
[ ] actualizacion_completa.sql ejecutado sobre la BD del cliente
[ ] backfill_costo_fe.sql ejecutado + revisado con el cliente
[ ] Timezone PHP = America/Bogota en el servidor del cliente
[ ] FE: resolución y habilitación DIAN configurada
[ ] Logo y datos de empresa cargados
[ ] Cajas creadas y asignadas a usuarios
[ ] Categorías de gasto configuradas
[ ] Medios de pago activos
[ ] Numeración FE iniciada correctamente
[ ] Build electron generado (npm run electron:build)
[ ] Instalador probado en equipo limpio
[ ] latest.yml subido al servidor de actualizaciones
[ ] Git tag creado (git tag v4.3.x)
```

---

*Documento generado 2026-05-04. Actualizar con cada nueva versión.*
