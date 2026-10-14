<?php
/**
 * Regresión 4.7.8+: crear un gasto mandando solo YYYY-MM-DD (input type=date
 * del frontend) debe guardarse con la hora actual, NO con 00:00:00.
 *
 * Si quedaba a las 00:00:00 el gasto caía ANTES de la apertura de caja y
 * NO sumaba al cuadre (bug reportado como "mi gasto no suma al cuadre").
 */
class TestEgresoCrearSinHoraUsaNow extends TestCase {
    public function run() {
        $resp = $this->postJson('/movimientos/gastos.php', [
            'action' => 'crear',
            'concepto' => 'TEST gasto sin hora',
            'valor' => 50000,
            'beneficiario' => 'TEST',
            'cedula' => '123',
            'origen' => 'caja',
            'caja_id' => 1,
            'fecha' => date('Y-m-d'),   // solo YYYY-MM-DD, igual que el <input type=date>
            'categoria' => 'Servicios',
            'id_usuario' => 1,
        ]);
        $this->assertTrue($resp['body']['success'] ?? false, 'gasto creado');

        $gasto = $this->fetchOne("SELECT Fecha, Valor FROM tblegresos ORDER BY Id_Egresos DESC LIMIT 1");
        $hora = substr($gasto['Fecha'], 11, 8);
        $this->assertTrue($hora !== '00:00:00', "Fecha tiene hora real (encontró: '$hora')");
        $this->assertEquals('50000.0000', $gasto['Valor'], 'valor correcto');

        // Verifica que entra al cuadre: hora >= 08:00 (apertura de la sesión en el fixture)
        $totalEgresosCuadre = $this->fetchValue(
            "SELECT COALESCE(SUM(Valor),0) FROM tblegresos WHERE Fecha >= ? AND Estado='Valida' AND COALESCE(TipoPago,0)=0",
            [date('Y-m-d') . ' 08:00:00']
        );
        $this->assertEquals(50000, (float)$totalEgresosCuadre, 'gasto entra al cuadre');
    }
}
