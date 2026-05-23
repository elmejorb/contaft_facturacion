-- ============================================================
-- Fix retroactivo: limpiar IVA cargado por error en empresas
-- de Régimen Simplificado / Simple (no Responsables de IVA).
--
-- El sistema versiones anteriores a 4.3.30 sumaba el IVA del
-- producto al total de venta aunque la empresa no debiera
-- generarlo, dejando facturas con Saldo = IVA aún después de
-- pagadas y Totales inflados.
--
-- Este script SOLO debe correrse si tbldatosempresa.Regimen
-- indica Simplificado/Simple (NO si es Común/Responsable IVA).
--
-- USO:
--   mysql -u root -p <base_de_datos> < fix_iva_regimen_simplificado.sql
--
-- Idempotente: tras correr una vez, ningún Impuesto > 0 queda.
-- ============================================================

-- 1. Detectar régimen y abortar si es Responsable de IVA
SET @regimen = (SELECT LOWER(Regimen) FROM tbldatosempresa LIMIT 1);
SET @es_responsable = (
  @regimen LIKE '%común%' OR @regimen LIKE '%comun%' OR @regimen LIKE '%responsable%'
);

-- Mensaje si la empresa SÍ es responsable de IVA — no debe ejecutarse
SELECT
  IF(@es_responsable,
     '⚠ ABORTADO: empresa es Responsable de IVA. No se debe limpiar el IVA. Verifica el campo tbldatosempresa.Regimen.',
     '✓ OK: empresa es Régimen Simplificado/Simple. Procediendo con la limpieza.')
  AS validacion;

-- Si es responsable, salimos sin tocar nada
-- (workaround MariaDB: usamos prepared statements condicionales)

-- 2. Recalcular Total y Saldo de las facturas afectadas
--    Total_nuevo = Total_actual - Impuesto_actual
--    Saldo_nuevo = max(Saldo_actual - Impuesto_actual, 0)
SET @sql_ventas = IF(NOT @es_responsable, '
  UPDATE tblventas
  SET Total = Total - Impuesto,
      Saldo = GREATEST(Saldo - Impuesto, 0),
      Impuesto = 0
  WHERE Impuesto > 0
', 'SELECT 1');
PREPARE s1 FROM @sql_ventas; EXECUTE s1; DEALLOCATE PREPARE s1;

-- 3. Limpiar Impuesto del detalle (no afecta inventario ni costos —
--    solo era un valor informativo del IVA pagado en la línea)
SET @sql_det = IF(NOT @es_responsable, '
  UPDATE tbldetalle_venta SET Impuesto = 0 WHERE Impuesto > 0
', 'SELECT 1');
PREPARE s2 FROM @sql_det; EXECUTE s2; DEALLOCATE PREPARE s2;

-- 4. Marcar como pagadas las facturas que ya tenían saldo == impuesto
--    (el "saldo" eran centavos de IVA que el cliente nunca debía pagar)
SET @sql_pag = IF(NOT @es_responsable, "
  UPDATE tblventas
  SET pagada = '1'
  WHERE Saldo <= 0 AND Tipo = 'Crédito' AND pagada <> '1'
", 'SELECT 1');
PREPARE s3 FROM @sql_pag; EXECUTE s3; DEALLOCATE PREPARE s3;

-- 5. Verificación final
SELECT
  (SELECT COUNT(*) FROM tblventas WHERE Impuesto > 0)        AS facturas_con_iva_residual,
  (SELECT COUNT(*) FROM tbldetalle_venta WHERE Impuesto > 0) AS lineas_con_iva_residual,
  (SELECT SUM(Saldo) FROM tblventas WHERE EstadoFact='Valida' AND Tipo='Crédito') AS saldo_total_credito_post
;
