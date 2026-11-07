<?php
/**
 * Regresión 4.8.19 — hora local en SQLite.
 *
 * Bug: en SQLite `CURRENT_TIMESTAMP` / `CURRENT_DATE` son palabras reservadas
 * que devuelven UTC (Colombia = UTC-5). Los endpoints las usan (108 + 51
 * sitios), así que en el instalador embebido una caja abierta a las 8 a.m.
 * quedaba a la 1 p.m. y lo hecho después de las 7 p.m. caía al día siguiente.
 * Encontrado en el e2e del instalador: caja abierta 20:05 → '01:05' del día
 * siguiente. En MySQL siempre fue hora local.
 *
 * Regla: lo que un endpoint guarda con CURRENT_TIMESTAMP queda en hora de
 * Colombia (±5 min de la hora de PHP en America/Bogota), en ambos motores.
 */
class TestSqliteHoraLocal extends TestCase {
    public function run() {
        $this->db->exec("UPDATE tblsesiones_caja SET Estado = 'cerrada' WHERE Estado = 'abierta'");

        $resp = $this->postJson('/caja/sesion.php', ['action' => 'abrir', 'caja_id' => 1, 'usuario_id' => 1, 'base' => 1000]);
        $this->assertTrue($resp['body']['success'] ?? false, 'abrir caja OK — raw: ' . substr($resp['raw'], 0, 300));
        $idSesion = intval($resp['body']['id_sesion'] ?? 0);
        $this->assertTrue($idSesion > 0, 'devolvió id_sesion — raw: ' . substr($resp['raw'], 0, 300));

        $fecha = $this->fetchValue("SELECT FechaApertura FROM tblsesiones_caja WHERE Id_Sesion = ?", [$idSesion]);
        $ahoraBogota = new DateTime('now', new DateTimeZone('America/Bogota'));
        $guardada = DateTime::createFromFormat('Y-m-d H:i:s', substr((string)$fecha, 0, 19), new DateTimeZone('America/Bogota'));
        $this->assertTrue($guardada !== false, "FechaApertura legible ($fecha)");
        $difMin = $guardada ? abs($ahoraBogota->getTimestamp() - $guardada->getTimestamp()) / 60 : 999;
        $this->assertTrue($difMin < 5,
            sprintf('FechaApertura en hora de Colombia (guardada %s, ahora %s, diferencia %.0f min)',
                $fecha, $ahoraBogota->format('Y-m-d H:i:s'), $difMin));

        // DEFAULT CURRENT_TIMESTAMP: el retiro NO manda Fecha (tblmov_caja.Fecha
        // sale del DEFAULT). En SQLite el DEFAULT es UTC → trigger de hora local
        // (api/config/sqlite_hora_local.php). Lo que filtra por día
        // (DATE(Fecha) = hoy) debe ver el movimiento también de 7 p.m. a 12.
        $r2 = $this->postJson('/caja/sesion.php', ['action' => 'retiro', 'sesion_id' => $idSesion, 'valor' => 100, 'usuario_id' => 1, 'descripcion' => 'test hora local']);
        $this->assertTrue($r2['body']['success'] ?? false, 'retiro OK — raw: ' . substr($r2['raw'], 0, 300));
        $fm = (string)$this->fetchValue("SELECT Fecha FROM tblmov_caja WHERE Id_Sesion = ? AND Tipo = 'retiro_parcial' ORDER BY Id_Mov DESC LIMIT 1", [$idSesion]);
        $gm = DateTime::createFromFormat('Y-m-d H:i:s', substr($fm, 0, 19), new DateTimeZone('America/Bogota'));
        $difMov = $gm ? abs((new DateTime('now', new DateTimeZone('America/Bogota')))->getTimestamp() - $gm->getTimestamp()) / 60 : 999;
        $this->assertTrue($difMov < 5, sprintf('tblmov_caja.Fecha (DEFAULT) en hora de Colombia (guardada %s, diferencia %.0f min)', $fm, $difMov));
        $this->assertEquals($ahoraBogota->format('Y-m-d'), substr($fm, 0, 10), 'el movimiento cae en el día de hoy en Colombia');

        $this->db->prepare("UPDATE tblsesiones_caja SET Estado = 'cerrada' WHERE Id_Sesion = ?")->execute([$idSesion]);
    }
}
