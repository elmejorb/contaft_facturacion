# Pruebas QA — Modo Contingencia DIAN

**Estado:** Pendiente de validación en campo
**Fecha impl:** 2026-04-22
**Referencia legal:** Resolución DIAN 000165/2023 art. 31 (48h para retransmisión)

---

## Preparación

- [ ] Tener activo el toggle **"Facturación electrónica (DIAN)"** en Configuración del Sistema
- [ ] Tener configurados email + password de FE en Datos de Empresa
- [ ] Verificar que la tabla `tblventas` tiene las 4 columnas nuevas:
      `en_contingencia`, `contingencia_fecha`, `contingencia_reenviada`, `contingencia_motivo`
- [ ] Cliente de prueba con email + NIT válidos (para que la FE "normal" funcione)

---

## Escenarios a probar

### 1. Happy path (sin contingencia)

- [ ] Emitir factura electrónica normal (internet OK)
- [ ] Verificar que NO aparece el modal de contingencia
- [ ] Verificar que llega a DIAN y se asigna CUFE
- [ ] PDF descargado debe ser el oficial (TCPDF con QR)
- [ ] `en_contingencia = 0` en la BD
- [ ] No aparece botón "Contingencias" en toolbar de Fact. Electrónica

### 2. DIAN caída / sin internet — elegir CONTINGENCIA

- [ ] Desconectar internet o bloquear API DIAN
- [ ] Emitir factura electrónica
- [ ] Debe aparecer modal rojo "No se pudo enviar a la DIAN"
- [ ] Debe mostrar motivo + número de intentos
- [ ] Clic en **"Emitir en contingencia"**
- [ ] Verificar que se imprime la factura con banner rojo de contingencia
- [ ] Banner debe incluir el texto legal y la resolución 000165/2023
- [ ] NO debe abrir el PDF TCPDF (no hay CUFE todavía)
- [ ] Toast debe decir "emitida en CONTINGENCIA — pendiente de envío a DIAN"
- [ ] En BD: `en_contingencia=1`, `contingencia_fecha` con NOW(), `contingencia_reenviada=0`, `contingencia_motivo` con el error
- [ ] La venta sigue válida en `tblventas` (stock descontado, EstadoFact='Valida')

### 3. DIAN caída — elegir REINTENTAR

- [ ] Con internet caído, aparecer el modal
- [ ] Clic en **"Reintentar DIAN"**
- [ ] Debe mostrar "Reintentando DIAN..."
- [ ] Si sigue sin conexión, vuelve al mismo modal con contador de intentos +1
- [ ] Si se restablece internet antes del clic, debe pasar a DIAN normal y cerrarse todo
- [ ] NO debe quedar marcada como contingencia si el reintento es exitoso

### 4. DIAN caída — elegir "DEJAR SIN ENVIAR"

- [ ] Clic en **"Dejar sin enviar"**
- [ ] Modal se cierra, venta queda guardada pero NO marcada como contingencia
- [ ] NO aparece en la lista de contingencias
- [ ] La factura queda sin CUFE, sin estado DIAN
- [ ] Confirmar: ¿qué debe pasar con el usuario? ¿Debería aparecer en algún listado de "ventas sin transmitir"?
      *(posible tarea a resolver)*

### 5. Reenvío individual

- [ ] Tener al menos 1 factura en contingencia (de escenario 2)
- [ ] Restablecer internet/DIAN
- [ ] Ir a Facturación Electrónica
- [ ] Botón amarillo **"Contingencias (N)"** debe aparecer en el toolbar
- [ ] Clic → se abre modal con tabla de contingencias
- [ ] Verificar columnas: Factura, Fecha emisión, Cliente, Total, Espera (días), Motivo
- [ ] Clic en **"Reenviar"** de una fila
- [ ] Debe transmitir a DIAN, toast de éxito
- [ ] En BD: `contingencia_reenviada=1`, `cufe` con valor
- [ ] La factura desaparece de la lista de contingencias
- [ ] Si venía con email del cliente, ¿se envía el correo? (verificar comportamiento actual del backend)

### 6. Reenvío masivo "Reenviar todas"

- [ ] Tener 3+ facturas en contingencia
- [ ] Clic en **"Reenviar todas"**
- [ ] Botón cambia a "Reenviando..." y se bloquea
- [ ] Debe procesarlas una por una
- [ ] Al final: toast con conteo "N exitosas, M fallidas"
- [ ] Las exitosas desaparecen, las que fallaron permanecen en contingencia
- [ ] Lista se refresca automáticamente

### 7. Reenvío con DIAN aún caída

- [ ] Con internet pero DIAN caída, intentar reenviar contingencias
- [ ] Debe fallar con mensaje claro
- [ ] `contingencia_reenviada` permanece en 0
- [ ] La factura sigue en la lista

### 8. Días de espera — alerta visual

- [ ] Forzar en BD una contingencia con `contingencia_fecha` de hace 3+ días:
      ```sql
      UPDATE tblventas SET contingencia_fecha = DATE_SUB(NOW(), INTERVAL 3 DAY) WHERE Factura_N = X;
      ```
- [ ] En la lista, el día de espera debe salir en **ROJO** (>2 días)
- [ ] Los de menos de 2 días salen en naranja

### 9. Concurrencia / doble clic

- [ ] Clic rápido 2 veces en "Reenviar todas" — NO debe duplicar
- [ ] Clic en "Reenviar" de una fila mientras se ejecuta reenvío masivo — comportamiento?
- [ ] Abrir 2 ventanas del app simultáneamente, reenviar desde una — verificar que la otra se actualiza al refrescar

### 10. Cuadre de caja

- [ ] Las facturas en contingencia SÍ deben contarse en el cuadre diario
      (porque están en `tblventas` con `EstadoFact='Valida'`)
- [ ] Confirmar que el cuadre suma efectivo y transferencias de contingencias

### 11. Impresión — 3 formatos

- [ ] Config formato tirilla → emitir en contingencia → banner legible
- [ ] Config formato media-carta → banner visible arriba
- [ ] Config formato carta → banner arriba
- [ ] En los 3, el banner NO debe descuadrar el layout

### 12. Integración con otros módulos

- [ ] La factura en contingencia debe aparecer en Listado de Ventas normal
- [ ] La factura en contingencia NO debe aparecer en Facturación Electrónica como "autorizada"
- [ ] Al reenviar exitosamente, SÍ aparece en Facturación Electrónica
- [ ] Pagos a crédito sobre factura en contingencia deben funcionar
- [ ] Nota crédito sobre factura en contingencia: ¿qué pasa? (decidir regla)

### 13. Escenarios extremos

- [ ] Emitir en contingencia, luego editar la factura → ¿se puede? ¿debería bloquearse?
- [ ] Anular una factura en contingencia — ¿se limpia el flag?
- [ ] Marcar contingencia, reenviar, DIAN acepta, luego se cae → estado final correcto
- [ ] Apagar Apache mientras se reenvía masivamente → no debe corromper datos

---

## Riesgos conocidos / a decidir

1. **Plazo 48h:** el sistema no alerta hoy cuando una contingencia lleva >48h sin reenviar. Considerar:
   - Badge rojo destacado en el botón del toolbar
   - Email diario al administrador
   - Bloqueo de nuevas facturas electrónicas hasta resolver
2. **"Dejar sin enviar"** en el modal — actualmente no hay pantalla dedicada para esas facturas. ¿Agregarla?
3. **Resolución de contingencia separada** — hoy se usa el mismo prefijo FCON. La DIAN recomienda un rango de numeración distinto para contingencia; la API remota podría requerirlo en el futuro.
4. **Email al cliente** en reenvío — confirmar si se envía en el `reenviar_contingencia` (el endpoint actual no pasa `send_email=true` por defecto).
5. **Certificado digital offline** — hoy se depende de la API remota para firmar. Si la API remota está caída pero hay internet, es un tipo distinto de contingencia. Evaluar detección.

---

## Archivos modificados

### SQL
- `conta-app-backend/sql/migracion_v4.3_contingencia.sql` (nuevo)

### Backend PHP
- `conta-app-backend/api/facturacion-electronica/enviar.php` (acciones `marcar_contingencia`, `listar_contingencias`, `reenviar_contingencia`)

### Frontend
- `Dashboard-Facturación/src/components/NuevaVenta.tsx` (modal + helpers `finalizarVentaExitosa`, `aceptarContingencia`, `reintentarDian`)
- `Dashboard-Facturación/src/components/ImpresionFactura.tsx` (banner `BANNER_CONTINGENCIA_HTML` en los 3 formatos + prop `enContingencia`)
- `Dashboard-Facturación/src/components/FacturacionElectronica.tsx` (estado, lista, modal + botón toolbar)

---

## Logs de depuración

- Logs de reenvío de contingencia quedan en:
  `conta-app-backend/api/facturacion-electronica/logs/contingencia_{factN}_{timestamp}_request.json`
  `conta-app-backend/api/facturacion-electronica/logs/contingencia_{factN}_{timestamp}_response.json`
- Útiles para diagnóstico si algo falla en producción.
