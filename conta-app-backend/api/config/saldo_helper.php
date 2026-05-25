<?php
/**
 * Helper de saldos — fuente de verdad: tblpagos + tblventas.Total.
 *
 * Filosofía: tblventas.Saldo es un CACHE desechable. Nunca calcular saldo
 * incremental (Saldo = Saldo - :pago), porque eso compone errores. Siempre
 * recalcular desde la fuente real después de cualquier operación que
 * afecte pagos o devoluciones.
 *
 * Llamar a recalcularSaldoFactura() después de:
 *   - Insertar / anular / editar un pago
 *   - Editar el Total de una factura
 *   - Cualquier devolución parcial
 *
 * NO usar para devolución total / anulación: esas setean Saldo = 0 directo.
 */

if (!function_exists('recalcularSaldoFactura')) {
    /**
     * Recalcula tblventas.Saldo y tblventas.pagada de una factura específica
     * desde tblpagos (filtrando defensivamente ValorPago > 0, Estado='Valida').
     * Devuelve el nuevo saldo persistido.
     *
     * @param PDO $db        Conexión activa
     * @param int $facturaN  Factura_N
     * @return float         Saldo real persistido
     */
    function recalcularSaldoFactura(PDO $db, int $facturaN): float {
        // 1. Total de la factura (fuente: tblventas.Total)
        $stmt = $db->prepare("SELECT Total FROM tblventas WHERE Factura_N = ?");
        $stmt->execute([$facturaN]);
        $total = floatval($stmt->fetchColumn() ?: 0);
        if ($total <= 0) return 0.0;

        // 2. Suma real de pagos + descuentos válidos
        // Filtros defensivos: ValorPago > 0 (ignora valores negativos por reversos
        // mal hechos) y Estado='Valida' (ignora anulados).
        $stmt = $db->prepare("
            SELECT COALESCE(SUM(ValorPago + COALESCE(Descuento, 0)), 0)
            FROM tblpagos
            WHERE Fact_N = ?
              AND COALESCE(Estado, 'Valida') = 'Valida'
              AND ValorPago > 0
        ");
        $stmt->execute([$facturaN]);
        $pagado = floatval($stmt->fetchColumn() ?: 0);

        $saldoReal = max($total - $pagado, 0);
        $pagada    = $saldoReal <= 0.001 ? '1' : '';

        // 3. Persistir
        $db->prepare("UPDATE tblventas SET Saldo = ?, pagada = ? WHERE Factura_N = ?")
           ->execute([$saldoReal, $pagada, $facturaN]);

        return $saldoReal;
    }
}
