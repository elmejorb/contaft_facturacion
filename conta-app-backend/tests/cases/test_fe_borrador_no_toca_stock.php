<?php
/**
 * Regresión de 4.7.14: nueva.php con tipo_documento='electronica' NO debe
 * descontar stock ni insertar kardex. El stock solo se mueve cuando DIAN
 * autoriza, dentro de enviar.php (igual que el flujo del sistema VB6
 * original).
 *
 * Bug detectado: nueva.php bajaba stock al crear el borrador, y enviar.php
 * volvía a bajarlo al autorizar → doble descuento (32 pares detectados en
 * Nutrigranos antes del fix).
 */
class TestFeBorradorNoTocaStock extends TestCase {
    public function run() {
        $stockInicial = $this->fetchValue("SELECT Existencia FROM tblarticulos WHERE Items=1");
        $kardexInicial = $this->fetchValue("SELECT COUNT(*) FROM tblkardex WHERE Items=1");

        $resp = $this->postJson('/ventas/nueva.php', [
            'tipo' => 'Contado', 'dias' => 0,
            'tipo_documento' => 'electronica',
            'cliente_id' => 1001,
            'cliente_nombre' => 'CLIENTE TEST SAS',
            'cliente_identificacion' => '901000001',
            'cliente_direccion' => 'CLL 1',
            'cliente_telefono' => '3100000001',
            'medio_pago' => 0, 'vendedor' => 1,
            'descuento_global' => 0, 'comentario' => 'test regresion 4.7.14',
            'efectivo' => 3000, 'valor_pagado' => 0, 'abono' => 0,
            'items' => [
                ['items' => 1, 'cantidad' => 3, 'precio' => 1000, 'precio_costo' => 500,
                 'iva' => 0, 'descuento' => 0, 'es_servicio' => 0, 'entregado' => 'S']
            ],
        ]);

        $this->assertTrue($resp['body']['success'] ?? false,
            'nueva.php respondió success — raw: ' . substr($resp['raw'], 0, 300));
        $this->assertEquals('FE', $resp['body']['origen'] ?? null, 'origen es FE');
        $this->assertTrue(!empty($resp['body']['doc_elec_id']), 'devolvió doc_elec_id');

        // CORE: stock y kardex no cambiaron
        $stockPost = $this->fetchValue("SELECT Existencia FROM tblarticulos WHERE Items=1");
        $kardexPost = $this->fetchValue("SELECT COUNT(*) FROM tblkardex WHERE Items=1");
        $this->assertEquals($stockInicial, $stockPost, 'nueva.php NO movió stock del borrador FE');
        $this->assertEquals($kardexInicial, $kardexPost, 'nueva.php NO insertó kardex para FE');

        // Pero sí dejó el borrador y el detalle
        $docId = $resp['body']['doc_elec_id'];
        $ed = $this->fetchOne("SELECT status, prefix FROM electronic_documents WHERE id = ?", [$docId]);
        $this->assertEquals('borrador', $ed['status'], 'electronic_documents status=borrador');
        $this->assertEquals('FCON', $ed['prefix'], 'prefix provisional FCON');

        $detCount = $this->fetchValue("SELECT COUNT(*) FROM detalle_document_electronic WHERE factura_n = ?", [$docId]);
        $this->assertEquals(1, $detCount, 'detalle_document_electronic insertado');
    }
}
