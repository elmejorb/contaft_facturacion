# Fix sincronización — Utilidad de ventas

Kit para aplicar/corregir los triggers de sincronización que suben las ventas al servidor con la utilidad ya calculada del detalle.

## Cuándo usar este kit

- Cliente **nuevo** en el que se va a activar el módulo de sincronización por primera vez.
- Cliente **con los triggers viejos** que estaba subiendo la utilidad como registro separado (`venta_utilidad`) o con `utilidad = 0` en el JSON de `tblventas`.

En ambos casos se usa el mismo script — es **idempotente** (se puede correr múltiples veces sin problemas).

## Qué hace

- Crea la tabla cola `tbl_cambios_sincronizar` si no existe.
- Elimina cualquier trigger viejo relacionado (`trg_ventas_*`, `trg_detalle_venta_*`).
- Crea 6 triggers nuevos con `DEFINER = CURRENT_USER` (compatible con cualquier usuario MySQL — evita el bug histórico `root@localhost doesn't exist`).
- Limpia registros basura de `venta_utilidad` y `tbldetalle_venta` que hayan quedado sin sincronizar.
- Backfill: para ventas ya en la cola con `utilidad = 0`, recalcula desde el detalle y actualiza el JSON in-place.

## Diseño de la sincronización

- Solo la tabla **`tblventas`** va a la cola. NUNCA se registra `tbldetalle_venta` — no se satura el servidor con líneas.
- Los triggers de detalle solo **actualizan el JSON** del registro pendiente de `tblventas` para incluir la utilidad correcta.
- Fórmula utilidad (sin IVA, contablemente correcta): `SUM((PrecioV − PrecioC) / (1 + IVA/100) × (Cantidad − Dev))`.

## Archivos

| Archivo | Cuándo usar |
|---|---|
| `SYNC_01_diagnostico.sql` | Correr PRIMERO para ver qué hay en la BD antes de tocar nada |
| `SYNC_02_aplicar.sql` | Aplicar desde CMD/terminal con `mysql -u ...` (para PCs con XAMPP) |
| `SYNC_02_aplicar_phpMyAdmin.sql` | Copia lista para pegar en phpMyAdmin del cliente |

## Uso desde CMD (XAMPP)

```cmd
cd C:\xampp\mysql\bin
mysql -u root -p BD_DEL_CLIENTE < SYNC_01_diagnostico.sql
:: revisar resultado
mysql -u root -p BD_DEL_CLIENTE < SYNC_02_aplicar.sql
```

## Uso desde phpMyAdmin (sin acceso a CMD)

1. Entrar a phpMyAdmin del cliente.
2. Seleccionar la BD (columna izquierda).
3. Pestaña **SQL**.
4. Al pie del cuadro de texto: campo **"Delimitador"** → cambiar a `$$`.
5. Pegar el contenido de `SYNC_02_aplicar_phpMyAdmin.sql`.
6. Click **Continuar**.

## Prueba de que quedó funcionando

Después de aplicar, en la app del cliente:

1. Crear una venta contado con 2-3 líneas.
2. Ejecutar en la BD:
   ```sql
   SELECT id_cambio, tabla_nombre, operacion,
          JSON_EXTRACT(datos_json, '$.utilidad') AS utilidad,
          JSON_EXTRACT(datos_json, '$.Total') AS total
     FROM tbl_cambios_sincronizar
    WHERE sincronizado = 0;
   ```

**Esperado**:
- **UN solo registro** de `tblventas` (no dos).
- Campo `utilidad` **mayor a 0** (no queda en `"0.00"`).
- Cero registros de `tbldetalle_venta` o `venta_utilidad`.

Si aparecen registros de esas dos últimas tablas o la utilidad quedó en 0, algo está mal — abrir issue.

## Diagnóstico rápido de un cliente ya en producción

Para verificar si otros clientes necesitan el fix (síntomas del bug viejo):

```sql
-- Cuántas ventas ya subidas tienen utilidad = 0
SELECT COUNT(*) AS ventas_con_utilidad_0
  FROM tbl_cambios_sincronizar
 WHERE tabla_nombre = 'tblventas'
   AND sincronizado = 1
   AND CAST(JSON_UNQUOTE(JSON_EXTRACT(datos_json, '$.utilidad')) AS DECIMAL(18,2)) = 0;

-- ¿Hay registros de venta_utilidad en la cola?
SELECT COUNT(*) AS registros_venta_utilidad
  FROM tbl_cambios_sincronizar
 WHERE tabla_nombre = 'venta_utilidad';
```

Si alguno de los dos > 0 → aplicar el fix.
