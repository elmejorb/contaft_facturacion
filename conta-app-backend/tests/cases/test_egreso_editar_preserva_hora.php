<?php
/**
 * Regresión 4.7.14 (bug Manos Creativas 13-oct-2026):
 *
 * Ruth creó un gasto a las 17:22:33, lo editó 11s después para corregir
 * un dato. El flujo "editar" aceptaba fecha YYYY-MM-DD y la guardaba como
 * "YYYY-MM-DD 00:00:00". Resultado: el gasto quedaba ANTES de la apertura
 * de caja (08:00) y NO sumaba al cuadre (reportó $410k en vez de $510k).
 *
 * Este test crea un gasto con hora normal, lo edita cambiando solo el
 * valor, y verifica que la hora SE PRESERVA.
 */
class TestEgresoEditarPreservaHora extends TestCase {
    public function run() {
        // 1. Insertar un gasto a las 10:30 del día (fecha fija para simular caso real)
        $horaOriginal = date('Y-m-d') . ' 10:30:45';
        $this->db->exec("
            INSERT INTO tblegresos (N_Comprobante, Fecha, Orden, Concepto, Valor, Estado, Cuentas, FactN, id_usuario, id_mediopago)
            VALUES (999, '$horaOriginal', 'TEST', 'gasto pre-edit', 100000, 'Valida', '51 1305', '-1', 1, 0)
        ");
        $id = $this->db->lastInsertId();

        // 2. Editar con el payload típico del frontend: fecha solo YYYY-MM-DD
        $resp = $this->postJson('/movimientos/gastos.php', [
            'action' => 'editar', 'id' => (int)$id,
            'concepto' => 'gasto post-edit', 'valor' => 150000,
            'beneficiario' => 'TEST',
            'cedula' => '123',
            'fecha' => date('Y-m-d'),      // ← solo fecha, como lo manda <input type=date>
            'categoria' => 'Servicios',
            'id_usuario' => 1,
        ]);
        $this->assertTrue($resp['body']['success'] ?? false,
            'editar gasto success: ' . ($resp['body']['message'] ?? ''));

        // 3. CORE: la hora NO debe caer a 00:00:00
        $gasto = $this->fetchOne("SELECT Fecha, Valor FROM tblegresos WHERE Id_Egresos = ?", [$id]);
        $horaFinal = substr($gasto['Fecha'], 11, 8);
        $this->assertEquals('10:30:45', $horaFinal, "hora preservada después de editar (encontró '$horaFinal')");
        $this->assertEquals('150000.0000', $gasto['Valor'], 'valor actualizado');

        // 4. Verifica que entra al cuadre (hora >= 08:00 apertura)
        $totalCuadre = $this->fetchValue(
            "SELECT COALESCE(SUM(Valor),0) FROM tblegresos WHERE Fecha >= ? AND Estado='Valida' AND COALESCE(TipoPago,0)=0",
            [date('Y-m-d') . ' 08:00:00']
        );
        $this->assertEquals(150000, (float)$totalCuadre, 'gasto editado entra al cuadre');
    }
}
