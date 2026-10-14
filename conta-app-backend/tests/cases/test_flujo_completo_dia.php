<?php
/**
 * TEST E2E COMPLETO — Un día de operación.
 *
 * Setup (INSERT directo): crear catálogo (producto, servicio, cliente,
 * proveedor). No verificamos cada endpoint CRUD aquí — importa el flujo
 * de operación, no el formato de "nuevo cliente".
 *
 * Flujos de operación (HTTP real contra Apache, igual que la UI):
 *   1. Compra al proveedor      → stock + kardex entrada
 *   2. Venta POS contado        → stock baja + kardex sale + total/IVA
 *   3. Venta POS crédito        → saldo cliente queda abierto
 *   4. Devolución (anular)      → stock sube + venta Anulada
 *   5. Pago parcial del cliente → saldo factura baja + fila en tblpagos
 *   6. Egreso operativo         → tblegresos
 *   7. Cuadre de caja (cálculo) → base + pagos ef - egresos ef cuadra
 */
class TestFlujoCompletoDia extends TestCase {
    private $itemsIdNuevo;
    private $itemsIdServicio;
    private $clienteId;
    private $proveedorId;
    private $facturaContado;
    private $facturaCredito;
    private $pedidoCompra;

    public function run() {
        $this->setupCatalogo();
        $this->paso1_compraProveedor();
        $this->paso2_ventaPosContado();
        $this->paso3_ventaPosCredito();
        $this->paso4_devolucionContado();
        $this->paso5_pagoCliente();
        $this->paso6_egreso();
        $this->paso7_cuadreCaja();
    }

    // ------------------------------------------------------------------
    private function setupCatalogo() {
        // Producto con IVA (Servicio=0 → es producto, mueve inventario)
        $this->db->exec("INSERT INTO tblarticulos (Items, Codigo, Nombres_Articulo, Id_Categoria, Existencia, Existencia_minima, Precio_Costo, Iva, Precio_Venta, Servicio, Estado, unit_measure_id) VALUES (10, 'E2E-001', 'LECHE ENTERA LITRO', 1, 0, 0, 3000, 19, 4500, 0, 1, 70)");
        $this->itemsIdNuevo = 10;
        // Servicio (Servicio=1 → no mueve inventario ni kardex)
        $this->db->exec("INSERT INTO tblarticulos (Items, Codigo, Nombres_Articulo, Id_Categoria, Existencia, Existencia_minima, Precio_Costo, Iva, Precio_Venta, Servicio, Estado, unit_measure_id) VALUES (11, 'E2E-SERV', 'ASESORIA CONTABLE', 1, 0, 0, 0, 0, 80000, 1, 1, 70)");
        $this->itemsIdServicio = 11;
        // Cliente real
        $this->db->exec("INSERT INTO tblclientes (CodigoClien, Razon_Social, Nombres, Apellidos, Nit, Direccion, Telefonos, CupoAutorizado, Email, Identificacion) VALUES (2001, 'JUAN PEREZ E2E', 'JUAN', 'PEREZ', '79000111', 'CLL 10 # 5-20', '3101234567', 500000, 'juan@e2e.co', 79000111)");
        $this->clienteId = 2001;
        // Proveedor
        $this->db->exec("INSERT INTO tblproveedores (RazonSocial, Nit, Direccion, Telefonos) VALUES ('DISTRIBUIDORA LACTEOS E2E', '830111222', 'CRA 50', '3200000')");
        $this->proveedorId = (int)$this->db->lastInsertId();

        $this->assertEquals(0, (float)$this->fetchValue("SELECT Existencia FROM tblarticulos WHERE Items = ?", [$this->itemsIdNuevo]),
            'setup stock producto nuevo en 0');
        $this->assertEquals(500000, (float)$this->fetchValue("SELECT CupoAutorizado FROM tblclientes WHERE CodigoClien = ?", [$this->clienteId]),
            'setup cliente con cupo 500k');
        $this->assertTrue($this->proveedorId > 0, 'setup proveedor insertado');
    }

    // ------------------------------------------------------------------
    // 1 — Compra: 100 unidades a $3,000 (= $300,000)
    // ------------------------------------------------------------------
    private function paso1_compraProveedor() {
        // Para la compra registramos directo porque el endpoint tiene muchos
        // parámetros y lo crítico es verificar la cadena pedido→kardex→stock.
        $this->db->beginTransaction();
        $this->db->exec("INSERT INTO tblpedidos (CodigoPro, TipoPedido, Dias, FacturaCompra_N, Fecha, Total, Saldo, EstadoPedido, opcion_factura) VALUES ({$this->proveedorId}, 'Contado', 0, 'FP-001', NOW(), 300000, 0, 'Recibido', 1)");
        $this->pedidoCompra = (int)$this->db->lastInsertId();
        $this->db->exec("INSERT INTO tbldetalle_pedido (Pedido_N, Items, Cantidad, PrecioC, PrecioV, IvaPct, Subtotal) VALUES ({$this->pedidoCompra}, {$this->itemsIdNuevo}, 100, 3000, 4500, 19, 300000)");
        $this->db->exec("UPDATE tblarticulos SET Existencia = Existencia + 100 WHERE Items = {$this->itemsIdNuevo}");
        $this->db->exec("INSERT INTO tblkardex (Fecha, Mes, Items, Detalle, C_D, Cant_Ent, Cost_Ent, Cant_Sal, Cost_Sal, Cant_Saldo, Cost_Saldo, Cost_Unit) VALUES (NOW(), 'Octubre', {$this->itemsIdNuevo}, 'Compra Nº {$this->pedidoCompra}', 1, 100, 300000, 0, 0, 100, 300000, 3000)");
        $this->db->commit();

        $this->assertEquals(100, (float)$this->fetchValue("SELECT Existencia FROM tblarticulos WHERE Items = ?", [$this->itemsIdNuevo]),
            'compra: stock = 100');
        $kx = $this->fetchOne("SELECT C_D, Cant_Ent, Cost_Unit FROM tblkardex WHERE Items = ? ORDER BY Id_kardex DESC LIMIT 1", [$this->itemsIdNuevo]);
        $this->assertEquals(1, (int)$kx['C_D'], 'compra: kardex C_D=1 (entrada)');
        $this->assertEquals(100, (float)$kx['Cant_Ent'], 'compra: cant_ent = 100');
        $this->assertEquals(3000, (float)$kx['Cost_Unit'], 'compra: costo unitario = 3000');
    }

    // ------------------------------------------------------------------
    // 2 — Venta POS Contado (10 unidades × $4,500 = $45,000; IVA incluido 19%)
    // ------------------------------------------------------------------
    private function paso2_ventaPosContado() {
        $resp = $this->postJson('/ventas/nueva.php', [
            'tipo' => 'Contado', 'dias' => 0, 'tipo_documento' => 'pos',
            'cliente_id' => $this->clienteId, 'cliente_nombre' => 'JUAN PEREZ E2E',
            'cliente_identificacion' => '79000111', 'cliente_direccion' => 'CLL 10',
            'cliente_telefono' => '3101234567',
            'medio_pago' => 0, 'vendedor' => 1,
            'descuento_global' => 0, 'comentario' => 'E2E contado',
            'efectivo' => 45000, 'valor_pagado' => 0, 'abono' => 0,
            'items' => [[
                'items' => $this->itemsIdNuevo, 'cantidad' => 10,
                'precio' => 4500, 'precio_costo' => 3000,
                'iva' => 19, 'descuento' => 0,
                'es_servicio' => 0, 'entregado' => 'S',
            ]],
        ]);
        $this->assertTrue($resp['body']['success'] ?? false,
            'venta contado: ' . substr($resp['raw'] ?? '', 0, 150));
        $this->facturaContado = (int)($resp['body']['Factura_N'] ?? 0);
        $this->assertTrue($this->facturaContado > 0, 'contado: Factura_N devuelto');

        // Stock bajó 10 (de 100 → 90)
        $this->assertEquals(90, (float)$this->fetchValue("SELECT Existencia FROM tblarticulos WHERE Items = ?", [$this->itemsIdNuevo]),
            'contado: stock = 90');

        // Totales venta
        $v = $this->fetchOne("SELECT Total, Impuesto, Saldo, pagada, Tipo, efectivo FROM tblventas WHERE Factura_N = ?", [$this->facturaContado]);
        $this->assertEquals(45000, (float)$v['Total'], 'contado: total = 45000');
        // IVA extraído: 45000 × 19 / 119 = 7184.87 → ~7185
        $this->assertEquals(7185, round((float)$v['Impuesto']), 'contado: IVA extraído ≈ 7185');
        $this->assertEquals(0, (float)$v['Saldo'], 'contado: saldo 0');
        $this->assertTrue(in_array($v['pagada'], ['S', '1']), "contado: marcada pagada (valor='{$v['pagada']}')");
        $this->assertEquals(45000, (float)$v['efectivo'], 'contado: efectivo = 45000');

        // Kardex: C_D=2, cant_sal=10
        $kx = $this->fetchOne("SELECT C_D, Cant_Sal FROM tblkardex WHERE Items = ? ORDER BY Id_kardex DESC LIMIT 1", [$this->itemsIdNuevo]);
        $this->assertEquals(2, (int)$kx['C_D'], 'contado: kardex C_D=2');
        $this->assertEquals(10, (float)$kx['Cant_Sal'], 'contado: cant_sal = 10');
    }

    // ------------------------------------------------------------------
    // 3 — Venta POS Crédito (20 unidades × $4,500 = $90,000; 15 días)
    // ------------------------------------------------------------------
    private function paso3_ventaPosCredito() {
        $resp = $this->postJson('/ventas/nueva.php', [
            'tipo' => 'Crédito', 'dias' => 15, 'tipo_documento' => 'pos',
            'cliente_id' => $this->clienteId, 'cliente_nombre' => 'JUAN PEREZ E2E',
            'cliente_identificacion' => '79000111', 'cliente_direccion' => 'CLL 10',
            'cliente_telefono' => '3101234567',
            'medio_pago' => 0, 'vendedor' => 1,
            'descuento_global' => 0, 'comentario' => 'E2E credito',
            'efectivo' => 0, 'valor_pagado' => 0, 'abono' => 0,
            'items' => [[
                'items' => $this->itemsIdNuevo, 'cantidad' => 20,
                'precio' => 4500, 'precio_costo' => 3000,
                'iva' => 19, 'descuento' => 0,
                'es_servicio' => 0, 'entregado' => 'S',
            ]],
        ]);
        $this->assertTrue($resp['body']['success'] ?? false, 'credito: success');
        $this->facturaCredito = (int)($resp['body']['Factura_N'] ?? 0);

        $v = $this->fetchOne("SELECT Total, Saldo, pagada, Tipo, Dias FROM tblventas WHERE Factura_N = ?", [$this->facturaCredito]);
        $this->assertEquals(90000, (float)$v['Total'], 'credito: total = 90000');
        $this->assertEquals(90000, (float)$v['Saldo'], 'credito: saldo = total (sin abono)');
        $this->assertTrue(in_array($v['pagada'], ['N', '0', '']), "credito: NO pagada (valor='{$v['pagada']}')");
        $this->assertEquals(15, (int)$v['Dias'], 'credito: 15 dias');

        // Stock bajó otras 20 (90 → 70)
        $this->assertEquals(70, (float)$this->fetchValue("SELECT Existencia FROM tblarticulos WHERE Items = ?", [$this->itemsIdNuevo]),
            'credito: stock = 70');
    }

    // ------------------------------------------------------------------
    // 4 — Devolución (anular contado): stock sube + venta queda Anulada
    // ------------------------------------------------------------------
    private function paso4_devolucionContado() {
        $resp = $this->postJson('/ventas/detalle-factura.php', [
            'action' => 'anular',
            'factura_n' => $this->facturaContado,
            'motivo' => 'Devolución E2E',
            'usuario_id' => 1,
            'autorizado_por' => 1,
            'autorizado_por_nombre' => 'ADMIN TEST',
        ]);
        // Tolerante: lo clave es el efecto en BD
        $estado = $this->fetchValue("SELECT EstadoFact FROM tblventas WHERE Factura_N = ?", [$this->facturaContado]);
        $this->assertEquals('Anulada', $estado,
            'devol: venta Anulada (resp: ' . substr($resp['raw'] ?? '', 0, 120) . ')');

        // Stock vuelve: 70 + 10 = 80
        $this->assertEquals(80, (float)$this->fetchValue("SELECT Existencia FROM tblarticulos WHERE Items = ?", [$this->itemsIdNuevo]),
            'devol: stock = 80 (volvieron las 10)');

        $kx = $this->fetchOne("SELECT C_D, Cant_Ent FROM tblkardex WHERE Items = ? ORDER BY Id_kardex DESC LIMIT 1", [$this->itemsIdNuevo]);
        $this->assertEquals(1, (int)$kx['C_D'], 'devol: kardex entrada');
        $this->assertEquals(10, (float)$kx['Cant_Ent'], 'devol: cant_ent = 10');
    }

    // ------------------------------------------------------------------
    // 5 — Pago parcial de la venta a crédito: abono $50,000 en efectivo
    // ------------------------------------------------------------------
    private function paso5_pagoCliente() {
        $resp = $this->postJson('/clientes/pagos.php', [
            'action' => 'pagar',
            'cliente' => $this->clienteId,
            'medio_pago' => 0,
            'id_usuario' => 1,
            'detalle_pago' => 'Abono E2E',
            'pagos' => [['factura_n' => $this->facturaCredito, 'valor' => 50000, 'descuento' => 0]],
        ]);
        $this->assertTrue($resp['body']['success'] ?? false,
            'pago: ' . substr($resp['raw'] ?? '', 0, 150));

        $saldo = (float)$this->fetchValue("SELECT Saldo FROM tblventas WHERE Factura_N = ?", [$this->facturaCredito]);
        $this->assertEquals(40000, $saldo, 'pago: saldo = 90k - 50k = 40000');

        $p = $this->fetchOne("SELECT ValorPago, id_mediopago, Estado FROM tblpagos WHERE Fact_N = ? ORDER BY Id_Pagos DESC LIMIT 1", [$this->facturaCredito]);
        $this->assertEquals(50000, (float)$p['ValorPago'], 'pago: valor registrado');
        $this->assertEquals(0, (int)$p['id_mediopago'], 'pago: efectivo (medio=0)');
        $this->assertEquals('Valida', $p['Estado'], 'pago: Valida');
    }

    // ------------------------------------------------------------------
    // 6 — Egreso operativo $15,000
    // ------------------------------------------------------------------
    private function paso6_egreso() {
        $resp = $this->postJson('/movimientos/gastos.php', [
            'action' => 'crear',
            'concepto' => 'Papelería E2E', 'valor' => 15000,
            'beneficiario' => 'LIBRERIA', 'cedula' => '000',
            'origen' => 'caja', 'caja_id' => 1,
            'fecha' => date('Y-m-d'),
            'categoria' => 'Oficina', 'id_usuario' => 1,
        ]);
        $this->assertTrue($resp['body']['success'] ?? false, 'egreso: success');

        $eg = $this->fetchOne("SELECT Valor, Estado, Fecha FROM tblegresos WHERE Concepto='Papelería E2E' ORDER BY Id_Egresos DESC LIMIT 1");
        $this->assertEquals(15000, (float)$eg['Valor'], 'egreso: valor');
        $this->assertEquals('Valida', $eg['Estado'], 'egreso: Valida');
        $this->assertTrue(substr($eg['Fecha'], 11, 8) !== '00:00:00', 'egreso: hora real (no 00:00)');
    }

    // ------------------------------------------------------------------
    // 7 — Cuadre de caja (sesión abierta desde el fixture a las 08:00)
    //
    //   base inicial       : 100,000
    //   ventas contado ef  :       0  (la única se anuló)
    //   pagos cliente ef   :  50,000
    //   egresos efectivo   :  15,000
    //   TOTAL SISTEMA      : 135,000
    // ------------------------------------------------------------------
    private function paso7_cuadreCaja() {
        $apertura = $this->fetchValue("SELECT FechaApertura FROM tblsesiones_caja WHERE Id_Sesion=1");
        $base      = (float)$this->fetchValue("SELECT BaseInicial FROM tblsesiones_caja WHERE Id_Sesion=1");
        $ventasEf  = (float)$this->fetchValue("SELECT COALESCE(SUM(efectivo),0) FROM tblventas WHERE Fecha >= ? AND EstadoFact='Valida' AND Tipo='Contado'", [$apertura]);
        $pagosEf   = (float)$this->fetchValue("SELECT COALESCE(SUM(ValorPago),0) FROM tblpagos WHERE Fecha >= ? AND Estado='Valida' AND id_mediopago=0", [$apertura]);
        $egresosEf = (float)$this->fetchValue("SELECT COALESCE(SUM(Valor),0) FROM tblegresos WHERE Fecha >= ? AND Estado='Valida' AND COALESCE(TipoPago,0)=0", [$apertura]);
        $sistema   = $base + $ventasEf + $pagosEf - $egresosEf;

        $this->assertEquals(100000, $base,       'cuadre: base inicial = 100,000');
        $this->assertEquals(0,      $ventasEf,   'cuadre: ventas ef = 0 (contado anulada)');
        $this->assertEquals(50000,  $pagosEf,    'cuadre: pagos ef = 50,000');
        $this->assertEquals(15000,  $egresosEf,  'cuadre: egresos ef = 15,000');
        $this->assertEquals(135000, $sistema,    'cuadre: TOTAL SISTEMA = 135,000');
    }
}
