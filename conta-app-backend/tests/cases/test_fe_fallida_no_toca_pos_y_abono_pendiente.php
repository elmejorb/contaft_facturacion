<?php
/**
 * Regresión 4.8.19 (caso Nutrigranos FV-276 / FV-457, oct-2026).
 *
 * Bug: desde 4.6.0 la FE vive solo en electronic_documents, pero "Guardar
 * como borrador" / "Aceptar contingencia" recibían el id de la FE como
 * factura_n y actuaban sobre la venta POS de tblventas con ESE número:
 * la anulaban, devolvían su stock con kardex "Conversion FV-N a borrador FE"
 * y creaban un borrador copiándola.
 *
 * Además: el abono inicial de una FE a crédito nacía 'Valida' (sumaba en caja
 * aunque la FE nunca se autorizara) y se guardaba como "PREFIJO-id"
 * (CAST = 0 → no descontaba la factura → deuda falsa).
 *
 * Reglas verificadas:
 *  1. Abono inicial de FE borrador = 'Pendiente', Nfact_electronica = id.
 *  2. convertir_a_borrador / marcar_contingencia con el id de la FE NO tocan
 *     la venta POS que tenga ese mismo número (ni estado, ni stock, ni kardex).
 *  3. Camino legacy sin doc_local_id se niega a convertir una POS vieja.
 *  4. eliminar_borrador deja el abono 'Anulada' (no lo borra).
 */
class TestFeFallidaNoTocaPosYAbonoPendiente extends TestCase {
    public function run() {
        $validasAntes = $this->fetchValue("SELECT COUNT(*) FROM tblpagos WHERE Estado = 'Valida'");

        // --- FE a crédito con abono inicial ---------------------------------
        $resp = $this->postJson('/ventas/nueva.php', [
            'tipo' => 'Credito', 'dias' => 30,
            'tipo_documento' => 'electronica',
            'cliente_id' => 1001,
            'cliente_nombre' => 'CLIENTE TEST SAS',
            'cliente_identificacion' => '901000001',
            'cliente_direccion' => 'CLL 1',
            'cliente_telefono' => '3100000001',
            'medio_pago' => 0, 'vendedor' => 1,
            'descuento_global' => 0, 'comentario' => 'test regresion 4.8.19',
            'efectivo' => 0, 'valor_pagado' => 0, 'abono' => 500,
            'items' => [
                ['items' => 1, 'cantidad' => 1, 'precio' => 1000, 'precio_costo' => 500,
                 'iva' => 0, 'descuento' => 0, 'es_servicio' => 0, 'entregado' => 'S']
            ],
        ]);
        $this->assertTrue($resp['body']['success'] ?? false,
            'nueva.php FE crédito OK — raw: ' . substr($resp['raw'], 0, 300));
        $docId = intval($resp['body']['doc_elec_id'] ?? 0);
        $this->assertTrue($docId > 0, 'devolvió doc_elec_id');

        $abono = $this->fetchOne(
            "SELECT Estado, Nfact_electronica FROM tblpagos WHERE DetallePago LIKE 'Abono inicial FE%' AND Codigo = 1001 ORDER BY Id_Pagos DESC LIMIT 1");
        $this->assertEquals('Pendiente', $abono['Estado'] ?? null, 'abono inicial de FE borrador nace Pendiente');
        $this->assertEquals((string)$docId, (string)($abono['Nfact_electronica'] ?? ''), 'abono enlazado por id numérico');
        $this->assertEquals($validasAntes,
            $this->fetchValue("SELECT COUNT(*) FROM tblpagos WHERE Estado = 'Valida'"),
            'el abono de un borrador NO suma como pago válido');

        // --- Trampa: venta POS vieja con el MISMO número que el id de la FE ---
        $this->db->prepare("DELETE FROM tblventas WHERE Factura_N = ?")->execute([$docId]);
        $this->db->prepare("
            INSERT INTO tblventas (Factura_N, Fecha, Tipo, Dias, CodigoCli, A_nombre, Total, Saldo, EstadoFact, Descuento, Impuesto, pagada, id_mediopago, efectivo, valorpagado1)
            VALUES (?, '2026-05-16', 'Contado', 0, 1001, 'CLIENTE TEST SAS', 2000, 0, 'Valida', 0, 0, 'S', 0, 2000, 0)
        ")->execute([$docId]);
        $this->db->prepare("
            INSERT INTO tbldetalle_venta (Factura_N, Items, Cantidad, PrecioV, PrecioC, Subtotal, Impuesto, IVA, Descuento, CantidadEntregada)
            VALUES (?, 1, 2, 1000, 500, 2000, 0, 0, 0, 2)
        ")->execute([$docId]);
        $stock  = $this->fetchValue("SELECT Existencia FROM tblarticulos WHERE Items = 1");
        $kardex = $this->fetchValue("SELECT COUNT(*) FROM tblkardex");

        $posIntacta = function ($paso) use ($docId, $stock, $kardex) {
            $v = $this->fetchOne("SELECT EstadoFact, COALESCE(en_contingencia, 0) AS c FROM tblventas WHERE Factura_N = ?", [$docId]);
            $this->assertEquals('Valida', $v['EstadoFact'] ?? null, "$paso: la POS FV-$docId sigue Valida");
            $this->assertEquals(0, intval($v['c'] ?? 0), "$paso: la POS no quedó en contingencia");
            $this->assertEquals($stock, $this->fetchValue("SELECT Existencia FROM tblarticulos WHERE Items = 1"), "$paso: stock sin cambio");
            $this->assertEquals($kardex, $this->fetchValue("SELECT COUNT(*) FROM tblkardex"), "$paso: sin kardex nuevo");
        };

        // FE rechazada → "Guardar como borrador" (frontend 4.8.19 manda doc_local_id)
        $this->db->prepare("UPDATE electronic_documents SET status = 'rechazado' WHERE id = ?")->execute([$docId]);
        $r = $this->postJson('/facturacion-electronica/enviar.php',
            ['action' => 'convertir_a_borrador', 'factura_n' => $docId, 'doc_local_id' => $docId]);
        $this->assertTrue($r['body']['success'] ?? false, 'convertir_a_borrador OK — raw: ' . substr($r['raw'], 0, 300));
        $this->assertEquals('borrador', $this->fetchValue("SELECT status FROM electronic_documents WHERE id = ?", [$docId]), 'FE volvió a borrador');
        $posIntacta('convertir_a_borrador');
        $this->assertEquals(0, intval($this->fetchValue("SELECT COUNT(*) FROM electronic_documents WHERE id > ?", [$docId])),
            'no se creó un borrador copia de la POS');

        // "Aceptar contingencia" con el id de la FE
        $this->db->prepare("UPDATE electronic_documents SET status = 'rechazado' WHERE id = ?")->execute([$docId]);
        $r = $this->postJson('/facturacion-electronica/enviar.php',
            ['action' => 'marcar_contingencia', 'factura_n' => $docId, 'motivo' => 'test', 'doc_elec_id' => $docId]);
        $this->assertTrue($r['body']['success'] ?? false, 'marcar_contingencia OK');
        $posIntacta('marcar_contingencia');

        // Frontend viejo (sin doc_local_id) → el freno legacy debe negarse
        $r = $this->postJson('/facturacion-electronica/enviar.php',
            ['action' => 'convertir_a_borrador', 'factura_n' => $docId, 'doc_local_id' => 0]);
        $this->assertFalse($r['body']['success'] ?? true, 'legacy se niega a convertir una POS vieja');
        $posIntacta('legacy sin doc_local_id');

        // Eliminar borrador → abono Anulada (no se borra)
        $r = $this->postJson('/facturacion-electronica/enviar.php', ['action' => 'eliminar_borrador', 'id' => $docId]);
        $this->assertTrue($r['body']['success'] ?? false, 'eliminar_borrador OK — raw: ' . substr($r['raw'], 0, 200));
        $this->assertEquals('Anulada',
            $this->fetchValue("SELECT Estado FROM tblpagos WHERE Nfact_electronica = ? AND DetallePago LIKE 'Abono inicial FE%'", [(string)$docId]),
            'abono del borrador eliminado queda Anulada');
    }
}
