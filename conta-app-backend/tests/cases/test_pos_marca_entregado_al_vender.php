<?php
/**
 * Regresión Manos Creativas (bug falso-pendiente en preview de factura):
 *
 * Al vender con Entregado='S' (comportamiento normal), la fila de
 * tbldetalle_venta debe quedar también con:
 *   - CantidadEntregada = Cantidad
 *   - FechaEntrega      != NULL
 *
 * Antes del fix, nueva.php insertaba solo el flag Entregado y dejaba los
 * contadores en 0/NULL. El modal de "Ver factura" miraba CantidadEntregada
 * para decidir si mostrar el botón "Entregar" sobre una línea YA entregada,
 * confundiendo al cliente. Caso real: factura 7589 de Manos Creativas
 * (BLUSA CANDELARIA T 06).
 *
 * También cubre el caso inverso (modo Fabricación v4.7): cuando el frontend
 * manda Entregado='N', CantidadEntregada debe quedar en 0 y FechaEntrega
 * en NULL, para que el botón "Entregar" sí aparezca.
 */
class TestPosMarcaEntregadoAlVender extends TestCase
{
    public function run()
    {
        // 1. Venta normal (default Entregado='S').
        $resp = $this->postJson('/ventas/nueva.php', [
            'tipo' => 'Contado', 'dias' => 0,
            'tipo_documento' => 'pos',
            'cliente_id' => 130500,
            'cliente_nombre' => 'VENTAS AL CONTADO',
            'cliente_identificacion' => '222222222222',
            'cliente_direccion' => '-', 'cliente_telefono' => '0',
            'medio_pago' => 0, 'vendedor' => 1,
            'descuento_global' => 0, 'comentario' => 'test entrega S',
            'efectivo' => 2000, 'valor_pagado' => 0, 'abono' => 0,
            'items' => [
                ['items' => 1, 'cantidad' => 2, 'precio' => 1000, 'precio_costo' => 500,
                 'iva' => 0, 'descuento' => 0, 'es_servicio' => 0, 'entregado' => 'S']
            ],
        ]);
        $this->assertTrue($resp['body']['success'] ?? false, 'venta S guardada');

        $linea = $this->fetchOne("
            SELECT Cantidad, Entregado, CantidadEntregada, FechaEntrega
            FROM tbldetalle_venta ORDER BY Id_DetalleVenta DESC LIMIT 1
        ");
        $this->assertEquals('S', $linea['Entregado'],  "Entregado debe quedar en 'S'");
        $this->assertEquals(2,   (float) $linea['Cantidad'],          'Cantidad');
        $this->assertEquals(2,   (float) $linea['CantidadEntregada'],
            "CantidadEntregada debe igualar a Cantidad al vender con Entregado='S'");
        $this->assertTrue(!empty($linea['FechaEntrega']),
            "FechaEntrega NO debe quedar NULL cuando Entregado='S'");

        // 2. Caso Fabricación (Entregado='N'). CantidadEntregada=0, FechaEntrega=NULL.
        $resp2 = $this->postJson('/ventas/nueva.php', [
            'tipo' => 'Contado', 'dias' => 0,
            'tipo_documento' => 'pos',
            'cliente_id' => 130500,
            'cliente_nombre' => 'VENTAS AL CONTADO',
            'cliente_identificacion' => '222222222222',
            'cliente_direccion' => '-', 'cliente_telefono' => '0',
            'medio_pago' => 0, 'vendedor' => 1,
            'descuento_global' => 0, 'comentario' => 'test fabricacion N',
            'efectivo' => 3000, 'valor_pagado' => 0, 'abono' => 0,
            'items' => [
                ['items' => 1, 'cantidad' => 3, 'precio' => 1000, 'precio_costo' => 500,
                 'iva' => 0, 'descuento' => 0, 'es_servicio' => 0, 'entregado' => 'N']
            ],
        ]);
        $this->assertTrue($resp2['body']['success'] ?? false, 'venta N guardada');

        $pend = $this->fetchOne("
            SELECT Cantidad, Entregado, CantidadEntregada, FechaEntrega
            FROM tbldetalle_venta ORDER BY Id_DetalleVenta DESC LIMIT 1
        ");
        $this->assertEquals('N', $pend['Entregado'],  "Entregado debe quedar 'N'");
        $this->assertEquals(0,   (float) $pend['CantidadEntregada'],
            'CantidadEntregada=0 cuando se vende pendiente');
        $this->assertTrue(empty($pend['FechaEntrega']),
            'FechaEntrega debe ser NULL para línea pendiente de fabricación');
    }
}
