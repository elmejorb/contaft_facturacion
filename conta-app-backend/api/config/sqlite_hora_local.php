<?php
/**
 * SQLite: `DEFAULT CURRENT_TIMESTAMP` guarda UTC (Colombia = UTC-5). Afecta 43
 * columnas (tblkardex.Fecha, tblmov_caja.Fecha, tblegresos.Fecha,
 * electronic_documents.created_at, ...) en todo INSERT que no manda la fecha:
 * lo hecho después de las 7 p.m. caía al día siguiente.
 *
 * SQLite no permite cambiar un DEFAULT sin reconstruir la tabla, así que se
 * instala por cada columna un trigger AFTER INSERT que pasa a hora de Colombia
 * SOLO el valor que vino del DEFAULT (= UTC de este instante, ±5 s). Un valor
 * explícito (NOW() de PHP, hora de Bogotá) difiere 5 h y no se toca.
 *
 * Recorre el esquema real: tablas/columnas nuevas quedan cubiertas al próximo
 * arranque. Idempotente (CREATE TRIGGER IF NOT EXISTS).
 *
 * Lo llaman: electron/main.js al arrancar (después de migraciones_sqlite.sql),
 * tests/setup_db.php (suite SQLite) y tests/clientes/mysql_a_sqlite.php.
 */
function conta_sqlite_triggers_hora_local(PDO $pdo): int {
    $creados = 0;
    $tablas = $pdo->query("SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%'")
                  ->fetchAll(PDO::FETCH_COLUMN);
    foreach ($tablas as $t) {
        $cols = $pdo->query('PRAGMA table_xinfo("' . str_replace('"', '""', $t) . '")')->fetchAll(PDO::FETCH_ASSOC);
        foreach ($cols as $c) {
            $def = strtoupper(trim((string)($c['dflt_value'] ?? ''), " ()'\""));
            if (!in_array($def, ['CURRENT_TIMESTAMP', 'CURRENT_DATE'], true)) continue;
            if (!empty($c['hidden'])) continue; // columnas generadas
            $col = $c['name'];
            $trg = 'trg_hora_local_' . preg_replace('~[^A-Za-z0-9_]~', '_', $t . '_' . $col);
            $qt = '"' . str_replace('"', '""', $t) . '"';
            $qc = '"' . str_replace('"', '""', $col) . '"';
            if ($def === 'CURRENT_TIMESTAMP') {
                // Vino del DEFAULT si es el UTC de este instante.
                $cuando = "abs(strftime('%s', NEW.$qc) - strftime('%s', 'now')) <= 5";
                $nuevo  = "datetime(NEW.$qc, '-5 hours')";
            } else {
                // Fecha UTC de hoy distinta de la de Colombia (7 p.m.–medianoche).
                $cuando = "NEW.$qc = date('now') AND date('now') <> date('now', '-5 hours')";
                $nuevo  = "date('now', '-5 hours')";
            }
            $pdo->exec("CREATE TRIGGER IF NOT EXISTS $trg AFTER INSERT ON $qt
                WHEN NEW.$qc IS NOT NULL AND $cuando
                BEGIN
                  UPDATE $qt SET $qc = $nuevo WHERE rowid = NEW.rowid;
                END");
            $creados++;
        }
    }
    return $creados;
}
