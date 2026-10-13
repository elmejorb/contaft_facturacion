# CONTRATO DE PROCESOS — Conta FT

Este documento es el **contrato oficial** de qué tablas debe tocar cada
acción del sistema, en qué orden, con qué validaciones. **Leer siempre
antes de modificar cualquier endpoint que afecte inventario, kardex,
cartera o facturación.**

> Si un fix cambia el comportamiento descrito aquí, actualizar el
> contrato en el mismo commit. Si un bug viola el contrato, se escribe
> el fix y la query de diagnóstico correspondiente aquí abajo.

---

## 1. Reglas de oro

1. **Doble escritura inventario:** cualquier movimiento que afecte stock
   debe actualizar **`tblarticulos.Existencia`** Y además insertar fila
   en **`tblkardex`** — en el mismo endpoint, en transacción si es posible.
   Nunca uno sin el otro.
2. **Servicios no mueven stock:** si `tblarticulos.Servicio = 'S'`, la
   línea no toca ni `Existencia` ni `tblkardex`.
3. **Kardex inmutable:** las filas de kardex NO se borran. Correcciones
   se hacen con una fila opuesta (C_D=1 ↔ C_D=2) con detalle que
   explique el reverso.
4. **Idempotencia en SQL correctivos:** todo `INSERT INTO tblkardex` de
   un script correctivo debe tener detalle con marcador único
   (`REPO HISTÓRICO`, `REVERSO HISTÓRICO`) y chequeo `NOT EXISTS` por ese
   detalle antes de insertar.
5. **FE y POS son dos flujos distintos** con los mismos efectos sobre
   stock/kardex. Un fix al flujo POS normalmente debe replicarse al
   flujo FE y viceversa.
6. **Validar antes de modificar:** antes de tocar un endpoint, correr
   la query de diagnóstico correspondiente para capturar estado actual.

---

## 2. Procesos — qué debe hacer cada acción

### 2.1 Catálogo

#### Crear Producto
- `INSERT INTO tblarticulos`
- Si cantidad inicial > 0:
  - `UPDATE tblarticulos SET Existencia = cantidad_inicial` (ya en el INSERT)
  - `INSERT INTO tblkardex` C_D=1, Detalle='Inventario Inicial', Cant_Ent=inicial

#### Crear Cliente
- `INSERT INTO tblclientes`

#### Crear Proveedor
- `INSERT INTO tblproveedores`

---

### 2.2 Ventas

#### POS (Factura POS tradicional)
Endpoint: `api/ventas/crear-factura.php`

Toca:
1. `INSERT INTO tblventas` (status EstadoFact='Valida')
2. `INSERT INTO tbldetalle_venta` por cada línea
3. Por cada línea con Servicio != 'S':
   - `UPDATE tblarticulos SET Existencia = Existencia - cantidad`
   - `INSERT INTO tblkardex` C_D=2, Detalle='Venta Fra. N° XXX', Cant_Sal=cantidad
4. Si Tipo='Credito' y hay abono inicial:
   - `INSERT INTO tblpagos` con CodigoClien, Fact_N=Factura_N

Validaciones previas:
- Si `config.permitirNegativos = false` y `stock < cantidad` → bloquear
- Si crédito y `cliente.saldo_pendiente + total > cupo` → requiere override admin
- Si `config.permitirFacturarAlCosto = false` y `precio_venta < costo` → bloquear

#### FE — Factura Electrónica (flujo v4.6+ puro)
Endpoints involucrados en orden:
- `api/facturacion-electronica/enviar.php` → `case 'guardar_borrador'` → crea borrador
- `api/facturacion-electronica/enviar.php` → `case 'factura'` → envía a DIAN

Qué debe tocar (idéntico a POS en lo contable, PERO guardando en tablas FE):

1. **`guardar_borrador`:**
   - `INSERT INTO electronic_documents` con status='borrador'
   - `INSERT INTO detalle_document_electronic` por línea

2. **`factura` (tras `aprobada` por DIAN):**
   - `UPDATE electronic_documents SET status='autorizado', cufe=X, prefix=X, number=X`
   - Por cada línea con Servicio != 'S':
     - `UPDATE tblarticulos SET Existencia = Existencia - cantidad` ← **CRÍTICO**
     - `INSERT INTO tblkardex` C_D=2, Detalle='Venta FE Nº PREFIX-NUMBER', Cant_Sal=cantidad ← **CRÍTICO**
   - Si crédito con abono: `INSERT INTO tblpagos` igual que POS

Si DIAN rechaza (`aprobada = false`):
- Solo `UPDATE electronic_documents SET status='rechazado'`
- **NO** se baja stock. El inventario solo se mueve si DIAN autorizó.

> **Bug histórico v4.6+ hasta v4.7.11:** el fix en el paso 2 estaba
> ausente. Las FE puras autorizadas no bajaban stock ni kardex.
> Corregido en v4.7.12.

#### NC — Nota Crédito (anulación de FE)
Endpoint: `api/facturacion-electronica/enviar.php` → `case 'nota_credito'`

Tras `aprobada` por DIAN:
1. `INSERT INTO electronic_documents` type=2, status='autorizado', invoice_cufe=cufe_fe
2. Copiar detalle: `INSERT INTO detalle_document_electronic` con las líneas de la FE
3. Si `concept_id = 2` (anulación total):
   - `UPDATE electronic_documents SET status='anulado' WHERE cufe=cufe_fe`
   - Si flujo legacy: `UPDATE tblventas SET EstadoFact='Anulada'`
   - Por cada línea con Servicio != 'S':
     - `UPDATE tblarticulos SET Existencia = Existencia + cantidad` ← **CRÍTICO**
     - `INSERT INTO tblkardex` C_D=1, Detalle='NC NCRE-X — anula FCON-Y', Cant_Ent=cantidad ← **CRÍTICO**

> **Bug histórico v4.6+ hasta v4.7.11:** idénticos al de FE: paso 3
> ausente. Las NCs no reponían stock. Corregido en v4.7.12.

---

### 2.3 Pagos (abonos a cartera)
Endpoint: `api/pagos/crear.php`
- `INSERT INTO tblpagos` con CodigoClien, Fact_N (si abona a una factura puntual)
- NO toca stock ni kardex.

---

### 2.4 Compras

#### Nueva compra / Recepción
Endpoint: `api/compras/nueva.php`

1. `INSERT INTO tblpedidos` (EstadoPed='Valido')
2. `INSERT INTO tbldetalle_pedido` por línea
3. Por cada línea con Servicio != 'S':
   - `UPDATE tblarticulos SET Existencia = Existencia + cantidad`
   - `UPDATE tblarticulos SET Precio_Costo = ...` (PrecioC autoritativo, con IVA)
   - `INSERT INTO tblkardex` C_D=1, Detalle='Compra Ped. N° XX Fac. YYYY', Cant_Ent=cantidad

#### Anular compra
Endpoint: `api/compras/anular.php`

1. `UPDATE tblpedidos SET EstadoPed='Anulada'`
2. Por cada línea con Servicio != 'S':
   - `UPDATE tblarticulos SET Existencia = Existencia - cantidad` (reversa)
   - `INSERT INTO tblkardex` C_D=2, Detalle='Anulación Ped. N° XX'

---

### 2.5 Ajustes manuales
Endpoint: `api/inventario/ajuste.php` (o el equivalente)

Dos variantes:
- **Suma:** `tblarticulos.Existencia += N`, kardex Detalle='Ajuste manual (suma): +N unidades', C_D=1
- **Resta:** `tblarticulos.Existencia -= N`, kardex Detalle='Ajuste manual (resta): -N unidades', C_D=2
- **Nota de Entrada / Salida por Cambio/Otro:** mismo patrón con detalle descriptivo.

Estos movimientos son el **cutoff de confianza** del inventario — un
script correctivo nunca debe tocar movimientos anteriores a un ajuste
manual del mismo producto.

---

## 3. Checklist pre-modificación

Antes de tocar un endpoint que afecte stock/kardex/pagos/FE:

- [ ] Identificar en qué sección del contrato cae
- [ ] Leer el flujo completo del endpoint actual (grep de `UPDATE tblarticulos`, `INSERT INTO tblkardex`, `INSERT INTO tblpagos`)
- [ ] Verificar que el fix **respeta todas las tablas listadas en el contrato**
- [ ] Correr la query de diagnóstico correspondiente ANTES del cambio
  (snapshot: stock total, filas kardex, pendientes)
- [ ] Hacer el cambio
- [ ] Correr la misma query DESPUÉS y comparar
- [ ] Si es cambio al flujo FE o NC, probar end-to-end con DIAN real
  (consume consecutivo pero garantiza funcionamiento)
- [ ] Si es cambio al flujo POS, probar con una venta de prueba
- [ ] Actualizar este documento si el contrato cambia

---

## 4. Queries de diagnóstico

Correr en cualquier BD de cliente para verificar que los flujos están sanos.

### 4.1 Sanity check general
```sql
SELECT
  (SELECT COUNT(*) FROM tblarticulos) AS articulos,
  (SELECT SUM(Existencia) FROM tblarticulos) AS stock_total,
  (SELECT COUNT(*) FROM tblarticulos WHERE Existencia < 0) AS stock_negativo,
  (SELECT COUNT(*) FROM tblkardex) AS kardex_filas;
```

### 4.2 FE puras sin kardex de salida (bug v4.6+)
```sql
SELECT COUNT(DISTINCT fe.id) AS fe_pendientes
FROM electronic_documents fe
LEFT JOIN tblventas v ON v.cufe = fe.cufe
JOIN detalle_document_electronic d ON d.factura_n = fe.id
JOIN tblarticulos a ON a.Items = d.items
WHERE fe.type_document_id = 1
  AND fe.status IN ('autorizado','aprobado','anulado')
  AND v.Factura_N IS NULL
  AND COALESCE(a.Servicio,'N') != 'S'
  AND NOT EXISTS (
    SELECT 1 FROM tblkardex k
    WHERE k.Items = d.items AND k.C_D = 2
      AND k.Detalle LIKE CONCAT('%Venta FE%', fe.prefix, '%', fe.number, '%')
  );
```

### 4.3 NCs sin kardex de entrada (bug v4.6+)
```sql
SELECT COUNT(DISTINCT nc.id) AS nc_pendientes
FROM electronic_documents nc
JOIN detalle_document_electronic d ON d.factura_n = nc.id
JOIN tblarticulos a ON a.Items = d.items
WHERE nc.type_document_id = 2
  AND nc.status IN ('autorizado','aprobado')
  AND COALESCE(a.Servicio,'N') != 'S'
  AND NOT EXISTS (
    SELECT 1 FROM tblkardex k
    WHERE k.Items = d.items AND k.C_D = 1
      AND k.Detalle LIKE CONCAT('NC ', nc.prefix, nc.number, '%')
  );
```

### 4.4 POS puras sin kardex (sanidad flujo tradicional)
```sql
-- Si da > 0, hay un bug en crear-factura.php
SELECT COUNT(DISTINCT v.Factura_N) AS pos_sin_kardex
FROM tblventas v
JOIN tbldetalle_venta d ON d.Factura_N = v.Factura_N
JOIN tblarticulos a ON a.Items = d.Items
WHERE v.EstadoFact = 'Valida'
  AND COALESCE(a.Servicio,'N') != 'S'
  AND NOT EXISTS (
    SELECT 1 FROM tblkardex k WHERE k.Items = d.Items
      AND k.Detalle LIKE CONCAT('%Fra%', v.Factura_N, '%')
      AND DATE(k.Fecha) = DATE(v.Fecha)
  );
```

### 4.5 Compras sin kardex de entrada
```sql
SELECT COUNT(DISTINCT p.Pedido_N) AS compras_sin_kardex
FROM tblpedidos p
JOIN tbldetalle_pedido dp ON dp.Pedido_N = p.Pedido_N
JOIN tblarticulos a ON a.Items = dp.Items
WHERE p.EstadoPed = 'Valido'
  AND COALESCE(a.Servicio,'N') != 'S'
  AND NOT EXISTS (
    SELECT 1 FROM tblkardex k WHERE k.Items = dp.Items
      AND k.Detalle LIKE CONCAT('%Ped%', p.Pedido_N, '%')
  );
```

### 4.6 Reconciliación stock vs kardex (balance)
```sql
-- Para cada producto, suma de kardex debería dar la Existencia (si no hubo ajustes manuales recientes)
SELECT a.Items, a.Nombres_Articulo, a.Existencia AS stock_tabla,
       COALESCE(SUM(k.Cant_Ent), 0) - COALESCE(SUM(k.Cant_Sal), 0) AS stock_calculado_kardex,
       a.Existencia - (COALESCE(SUM(k.Cant_Ent), 0) - COALESCE(SUM(k.Cant_Sal), 0)) AS desvio
FROM tblarticulos a
LEFT JOIN tblkardex k ON k.Items = a.Items
WHERE COALESCE(a.Servicio, 'N') != 'S'
GROUP BY a.Items, a.Nombres_Articulo, a.Existencia
HAVING ABS(desvio) > 0.01
ORDER BY ABS(desvio) DESC
LIMIT 20;
```

---

## 5. Antipatrones conocidos (no repetir)

- ❌ **Modificar `tblarticulos.Existencia` sin agregar fila kardex** —
  el stock queda sin trazabilidad.
- ❌ **Insertar en kardex sin actualizar `Existencia`** — el libro cuenta
  movimientos que no afectan la vista rápida de stock.
  - Excepción válida: **scripts correctivos** idempotentes que solo
    completan kardex histórico sin tocar stock (porque el cliente ya
    compensó con ajustes manuales).
- ❌ **UPDATE Existencia doble** — bajar o subir dos veces por la misma
  operación (p. ej. SQL correctivo sin NOT EXISTS idempotente).
- ❌ **Olvidar la rama Servicio='S'** — los servicios deben saltarse en
  todas las operaciones de inventario.
- ❌ **Flujo FE que no replica el flujo POS** — cualquier regla de negocio
  en POS (validación de negativos, cupo, etc.) debe estar también en FE.

---

## 6. Bugs históricos (para no repetir)

| Versión | Flujo roto | Síntoma | Fix |
|---|---|---|---|
| v4.6.0 – v4.7.11 | FE pura: emitir no baja stock | Reportes de ventas incompletos, stock inflado | v4.7.12 `enviar.php:factura` |
| v4.6.0 – v4.7.11 | FE pura: anular con NC no sube stock | Devoluciones no revertían | v4.7.12 `enviar.php:nota_credito` |
| v4.3.40 | Informes resumen inflaba totales por JOIN con detalle | Totales 2-10x reales | v4.3.41 `api/informes/resumen.php` |
| v4.3.96 | Auto-migrar rompía BDs legacy al arrancar | App no abría tras update | v4.3.97/98 fix defensivo |
| v4.6.0 | FE guardada doble (electronic_documents + tblventas) | POS fantasma por FE fallida | separación v4.6.0 |

---

## 7. Al terminar un fix de inventario — checklist de verificación

- [ ] Query 4.1 sanity check (comparar antes/después)
- [ ] Query 4.6 reconciliación: desvíos nuevos deben estar justificados
- [ ] Si el fix tocó FE: emitir una FE real a DIAN de prueba y validar
      pasos 1-4 de la sección 2.2 (consume 1 consecutivo)
- [ ] Si el fix tocó NC: anular esa FE y validar pasos 1-3 de la sección 2.2
      (consume 1 consecutivo)
- [ ] Si el fix tocó POS: hacer una venta POS de prueba y validar pasos
      1-4 de la sección 2.2
- [ ] Commit incluye actualización de este documento si el contrato cambió
