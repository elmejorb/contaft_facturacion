-- ============================================================================
-- FIX: Ventas convertidas de Crédito a Contado que no aparecen en la caja
-- ============================================================================
--
-- CONTEXTO
--   Bug en detalle-factura.php action=editar: al cambiar el Tipo de una
--   factura de Crédito → Contado, se actualizaba Tipo/Saldo/pagada pero NO
--   se registraba ningún ingreso en tblpagos. Como la caja del día lee
--   tblpagos + tblventas WHERE Fecha >= aperturaSesion, la venta "convertida"
--   quedaba invisible en la caja del día del cambio.
--
--   Este SQL detecta las facturas ya convertidas y les crea el registro de
--   cobro en tblpagos con Fecha=NOW(), para que aparezcan en la caja
--   actualmente activa del cliente.
--
-- CÓMO CORRERLO EN EL COMPUTADOR DEL CLIENTE
--   1. Abre XAMPP/WebServer → phpMyAdmin (o mysql CLI).
--   2. Selecciona la BD del cliente (ej: conta_distribuidoraed, o la que sea).
--   3. Ejecuta paso 1 (SELECT) — te muestra la lista de facturas a arreglar.
--      Verifica visualmente que son las correctas.
--   4. Ejecuta paso 2 (INSERT) — inserta los registros en tblpagos.
--   5. Ejecuta paso 3 (verificación) — confirma que se crearon los pagos.
--
--   IMPORTANTE: hacer BACKUP de tblpagos ANTES de correr el paso 2, por si
--   hay que revertir. Ejemplo:
--     CREATE TABLE tblpagos_backup_20260806 AS SELECT * FROM tblpagos;
--
-- CRITERIO DE DETECCIÓN
--   Una factura fue convertida (no creada como Contado normal) si:
--     - Tipo = 'Contado' Y EstadoFact = 'Valida'
--     - Saldo = 0 Y pagada = '1'
--     - efectivo = 0 AND valorpagado1 = 0  ← esto la diferencia de una
--       venta Contado creada normalmente (que tendría efectivo > 0)
--     - No existe ningún registro en tblpagos.Fact_N con Estado='Valida'
--
--   Opcionalmente se filtra por rango de fechas si solo quieres las de los
--   últimos días (ajustar la línea `AND v.Fecha >= '2026-08-05'`).
-- ============================================================================


-- ----------------------------------------------------------------------------
-- PASO 1 — VER las facturas que serán arregladas (dry-run, no modifica nada)
-- ----------------------------------------------------------------------------
-- Ajusta la fecha desde cuándo revisar (por defecto últimos 7 días).
SELECT
    v.Factura_N,
    DATE(v.Fecha) AS fecha_factura,
    v.CodigoCli,
    v.A_nombre,
    v.Tipo,
    v.Total,
    v.efectivo,
    v.valorpagado1,
    v.Saldo,
    v.pagada,
    (SELECT COUNT(*) FROM tblpagos p WHERE p.Fact_N = v.Factura_N AND p.Estado='Valida') AS pagos_existentes
FROM tblventas v
WHERE v.Tipo = 'Contado'
  AND v.EstadoFact = 'Valida'
  AND v.Saldo = 0
  AND v.pagada = '1'
  AND COALESCE(v.efectivo, 0) = 0
  AND COALESCE(v.valorpagado1, 0) = 0
  AND v.Total > 0
  AND v.Fecha >= '2026-08-05'  -- ← AJUSTA esta fecha según necesites
  AND NOT EXISTS (
      SELECT 1 FROM tblpagos p WHERE p.Fact_N = v.Factura_N AND p.Estado = 'Valida'
  )
ORDER BY v.Factura_N;


-- ----------------------------------------------------------------------------
-- PASO 2 — INSERTAR los registros de cobro en tblpagos
-- ----------------------------------------------------------------------------
-- Fecha usada: NOW() → aparecen en la caja del día actual del cliente.
-- Medio de pago: 0 (Efectivo) — si algún cobro fue por transferencia,
-- ajústalo manualmente después.
-- CodigoCli se copia de la factura.
-- id_usuario: se deja en 0 (usuario desconocido). Si quieres asignarlo a
-- alguien específico, cambia el 0 por el Id_Usuario correspondiente.

INSERT INTO tblpagos (
    RecCajaN, Codigo, Fact_N, ValorPago, Fecha, DetallePago,
    ValorFact, SaldoAct, Descuento, Retencion, Estado, Afectada, id_mediopago,
    NFactAnt, Nfact_electronica, FechaMod, id_usuario
)
SELECT
    -- Genera RecCajaN incremental para cada nueva fila. Base = max actual.
    (SELECT COALESCE(MAX(RecCajaN), 0) FROM tblpagos)
        + ROW_NUMBER() OVER (ORDER BY v.Factura_N) AS RecCajaN,
    v.CodigoCli AS Codigo,
    v.Factura_N AS Fact_N,
    v.Total AS ValorPago,
    NOW() AS Fecha,
    CONCAT('Backfill: pago total al convertir a Contado - Fra ', v.Factura_N) AS DetallePago,
    v.Total AS ValorFact,
    0 AS SaldoAct,
    0 AS Descuento,
    0 AS Retencion,
    'Valida' AS Estado,
    '1110' AS Afectada,
    0 AS id_mediopago,       -- 0 = Efectivo
    '' AS NFactAnt,
    '' AS Nfact_electronica,
    NOW() AS FechaMod,
    0 AS id_usuario           -- ajusta si sabes qué usuario hizo el cambio
FROM tblventas v
WHERE v.Tipo = 'Contado'
  AND v.EstadoFact = 'Valida'
  AND v.Saldo = 0
  AND v.pagada = '1'
  AND COALESCE(v.efectivo, 0) = 0
  AND COALESCE(v.valorpagado1, 0) = 0
  AND v.Total > 0
  AND v.Fecha >= '2026-08-05'  -- ← MISMA fecha que en paso 1
  AND NOT EXISTS (
      SELECT 1 FROM tblpagos p WHERE p.Fact_N = v.Factura_N AND p.Estado = 'Valida'
  );


-- ----------------------------------------------------------------------------
-- PASO 3 — VERIFICACIÓN (los pagos recién creados)
-- ----------------------------------------------------------------------------
SELECT p.RecCajaN, p.Fact_N, p.Codigo, p.ValorPago, p.Fecha, p.DetallePago
FROM tblpagos p
WHERE p.DetallePago LIKE 'Backfill:%'
ORDER BY p.RecCajaN DESC;


-- ----------------------------------------------------------------------------
-- ROLLBACK (si algo salió mal)
-- ----------------------------------------------------------------------------
-- DELETE FROM tblpagos WHERE DetallePago LIKE 'Backfill: pago total al convertir%';
