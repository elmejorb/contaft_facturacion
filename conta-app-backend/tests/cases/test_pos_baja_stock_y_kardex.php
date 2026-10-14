<?php
/**
 * Flujo POS (venta clásica): nueva.php con tipo_documento='pos' DEBE
 * bajar stock + insertar kardex en el mismo turno. Esto SIEMPRE fue así
 * en el sistema VB6 original y no cambió — pero conviene tenerlo blindado
 * para no romper el flujo POS por accidente cuando toquemos el FE.
 */
class TestPosBajaStockYKardex extends TestCase {
    public function run() {
        $resp = $this->postJson('/ventas/nueva.php', [
            'tipo' => 'Contado', 'dias' => 0,
            'tipo_documento' => 'pos',
            'cliente_id' => 130500,
            'cliente_nombre' => 'VENTAS AL CONTADO',
            'cliente_identificacion' => '222222222222',
            'cliente_direccion' => '-', 'cliente_telefono' => '0',
            'medio_pago' => 0, 'vendedor' => 1,
            'descuento_global' => 0, 'comentario' => 'test POS',
            'efectivo' => 5000, 'valor_pagado' => 0, 'abono' => 0,
            'items' => [
                ['items' => 1, 'cantidad' => 5, 'precio' => 1000, 'precio_costo' => 500,
                 'iva' => 0, 'descuento' => 0, 'es_servicio' => 0, 'entregado' => 'S']
            ],
        ]);
        $this->assertTrue($resp['body']['success'] ?? false, 'POS creado');

        // Stock: bajó 5
        $stock = $this->fetchValue("SELECT Existencia FROM tblarticulos WHERE Items=1");
        $this->assertEquals(95, (float)$stock, 'stock bajó 5 unidades (100→95)');

        // Kardex: 1 fila C_D=2
        $kardex = $this->fetchAll("SELECT Detalle, C_D, Cant_Sal FROM tblkardex WHERE Items=1 ORDER BY Id_kardex DESC");
        $this->assertCount(1, $kardex, 'exactamente 1 fila kardex');
        $this->assertEquals(2, (int)$kardex[0]['C_D'], 'C_D=2 (salida)');
        $this->assertEquals(5, (float)$kardex[0]['Cant_Sal'], 'cantidad en kardex');

        // Venta en tblventas
        $vent = $this->fetchOne("SELECT Factura_N, Total, Tipo FROM tblventas ORDER BY Factura_N DESC LIMIT 1");
        $this->assertEquals(5000, (float)$vent['Total'], 'total venta correcto');
        $this->assertEquals('Contado', $vent['Tipo'], 'tipo Contado');
    }
}
