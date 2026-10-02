-- =====================================================================
-- MIGRACIÓN v4.6 — Separar FE de tblventas → electronic_documents
-- =====================================================================
-- Propósito: en versiones <4.6, las Facturas Electrónicas se guardaban
-- tanto en tblventas (como si fueran POS) como en electronic_documents.
-- Resultado: consecutivo POS gastado, informes mostrando "POS fantasma".
--
-- Desde v4.6, FE y POS viven en TABLAS SEPARADAS (como modelo VB6).
-- Esta migración ANULA (NO borra) las FE que quedaron en tblventas
-- cuando ya tienen counterpart autorizado en electronic_documents.
--
-- IMPORTANTE: NO se borra nada. NO se mueve inventario. NO se toca caja.
--   - EstadoFact → 'Anulada' (deja hueco visible pero no cuenta en reportes)
--   - Comentario → "MIGRADO_FE_V46 → electronic_documents.id=X"
--   - Consecutivo tblventas se preserva (ningún Factura_N se recicla)
--
-- Idempotente: ejecutar varias veces no causa daño.
-- =====================================================================

-- 0. Diagnóstico ANTES
SELECT 'ANTES' AS momento,
       (SELECT COUNT(*) FROM tblventas WHERE Enviada_dian = 1 AND EstadoFact = 'Valida') AS fe_vigentes_en_tblventas,
       (SELECT COUNT(*) FROM tblventas WHERE Enviada_dian = 1 AND Comentario LIKE 'MIGRADO_FE_V46%') AS ya_migradas,
       (SELECT COUNT(*) FROM electronic_documents WHERE status = 'autorizado') AS fe_en_electronic_documents;

-- 1. Identificar FE a anular: tienen Enviada_dian=1 + CUFE + counterpart autorizado
--    y aún NO están marcadas como migradas (idempotencia).
DROP TABLE IF EXISTS _migra46_fe_a_anular;
CREATE TABLE _migra46_fe_a_anular AS
SELECT v.Factura_N, v.cufe, v.Total, v.CodigoCli, v.Fecha, ed.id AS ed_id,
       CONCAT(COALESCE(ed.prefix, 'FCON'), ed.number) AS nfe_numero
FROM tblventas v
INNER JOIN electronic_documents ed
   ON ed.cufe = v.cufe
  AND ed.cufe IS NOT NULL AND ed.cufe <> ''
WHERE v.Enviada_dian = 1
  AND v.cufe IS NOT NULL AND v.cufe <> ''
  AND ed.status = 'autorizado'
  AND v.EstadoFact = 'Valida'
  AND (v.Comentario IS NULL OR v.Comentario NOT LIKE 'MIGRADO_FE_V46%');

SELECT 'A anular (preservando consecutivo):' AS info, COUNT(*) AS cantidad
FROM _migra46_fe_a_anular;

-- 2. Reasignar pagos: Fact_N → Nfact_electronica
--    Los pagos que apuntaban a la "ex-POS" ahora apuntan a la FE real.
--    No se duplica pago. No se modifica el valor.
UPDATE tblpagos p
INNER JOIN _migra46_fe_a_anular a ON p.Fact_N = a.Factura_N
SET p.Nfact_electronica = a.nfe_numero,
    p.Fact_N = NULL
WHERE (p.Nfact_electronica IS NULL OR p.Nfact_electronica = '');

-- 3. Marcar como anulada en tblventas (NO BORRAR). El consecutivo queda
--    como hueco visible pero el filtro 'Válidas' las excluye de reportes.
--    Comentario lleva marca MIGRADO_FE_V46 para trazabilidad y para que
--    la idempotencia funcione (no las vuelve a procesar).
UPDATE tblventas v
INNER JOIN _migra46_fe_a_anular a ON v.Factura_N = a.Factura_N
SET v.EstadoFact = 'Anulada',
    v.Comentario = CONCAT('MIGRADO_FE_V46 → electronic_documents.id=', a.ed_id, ' / ', a.nfe_numero);

-- 4. Diagnóstico DESPUÉS
SELECT 'DESPUÉS' AS momento,
       (SELECT COUNT(*) FROM tblventas WHERE Enviada_dian = 1 AND EstadoFact = 'Valida') AS fe_vigentes_restantes,
       (SELECT COUNT(*) FROM tblventas WHERE Comentario LIKE 'MIGRADO_FE_V46%') AS marcadas_migradas,
       (SELECT COUNT(*) FROM electronic_documents WHERE status = 'autorizado') AS fe_en_electronic_documents;

-- 5. FE sin counterpart (Enviada_dian=1 pero sin match por CUFE)
--    NO se tocan. Requieren revisión manual del cliente.
SELECT 'FE con Enviada_dian=1 sin counterpart (revisar manual):' AS alerta,
       COUNT(*) AS cantidad
FROM tblventas v
LEFT JOIN electronic_documents ed ON ed.cufe = v.cufe AND v.cufe IS NOT NULL AND v.cufe <> ''
WHERE v.Enviada_dian = 1 AND v.EstadoFact = 'Valida' AND ed.id IS NULL;

-- Tabla _migra46_fe_a_anular queda para auditoría.
-- Para desecharla: DROP TABLE _migra46_fe_a_anular;
