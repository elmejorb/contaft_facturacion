<?php
/**
 * Respaldo de la base de datos — dump PHP puro (sin exec / mysqldump).
 *
 * Endpoints:
 *   GET   ?estado             → lista backups existentes + info del último
 *   POST  action=generar      → genera un .sql (rota archivos >30 días)
 *   POST  action=eliminar     → borra un backup por nombre de archivo
 *
 * Se implementa como dump PHP puro para funcionar en instalaciones donde
 * `exec/shell_exec/system/proc_open` están deshabilitadas por php.ini.
 * Genera un SQL compatible con `mysql < archivo.sql` para restaurar.
 */
require_once '../config/database.php';

// --- Configuración -------------------------------------------------------
$DEFAULT_DIR = 'C:\\ContaFT-Backups';
$RETENCION_DIAS = 30;
// Cuando se están escribiendo INSERTs muy grandes, evitar el timeout de PHP.
@set_time_limit(600);
@ini_set('memory_limit', '512M');

function backupDir(): string {
    global $DEFAULT_DIR;
    $dir = getenv('CONTAFT_BACKUP_DIR') ?: $DEFAULT_DIR;
    if (!is_dir($dir)) @mkdir($dir, 0777, true);
    return $dir;
}

function listarBackups(string $dir): array {
    if (!is_dir($dir)) return [];
    $archivos = [];
    foreach (glob("$dir\\contaft-*.sql") as $f) {
        $archivos[] = [
            'nombre' => basename($f),
            'ruta'   => $f,
            'tamano' => filesize($f),
            'fecha'  => date('Y-m-d H:i:s', filemtime($f)),
        ];
    }
    usort($archivos, fn($a, $b) => strcmp($b['nombre'], $a['nombre']));
    return $archivos;
}

/**
 * Borra backups con fecha en el nombre anterior a $limite (Y-m-d).
 * NO borra archivos sin fecha en el nombre (por si el usuario metió algo suyo).
 */
function rotarBackups(string $dir, int $dias): int {
    $limite = date('Y-m-d', strtotime("-$dias days"));
    $borrados = 0;
    foreach (glob("$dir\\contaft-*.sql") as $f) {
        if (preg_match('/contaft-(\d{4}-\d{2}-\d{2})/', basename($f), $m)) {
            if ($m[1] < $limite) {
                @unlink($f) && $borrados++;
            }
        }
    }
    return $borrados;
}

/**
 * Escapa un valor para SQL — usa PDO::quote para bytes/UTF-8/NULLs.
 */
function sqlValor(PDO $db, $v): string {
    if ($v === null) return 'NULL';
    if (is_int($v) || is_float($v)) return (string)$v;
    return $db->quote($v);
}

/**
 * Volcado completo de la BD a $archivo. Retorna [ok, filas_totales, error?].
 */
function dumpearBD(PDO $db, string $archivo, string $nombreBD): array {
    $fp = fopen($archivo, 'wb');
    if (!$fp) return [false, 0, "No se pudo abrir $archivo"];

    $head  = "-- Respaldo Conta FT — $nombreBD\n";
    $head .= "-- Generado: " . date('Y-m-d H:i:s') . "\n";
    $head .= "-- Para restaurar: mysql -uroot -p $nombreBD < este_archivo.sql\n\n";
    $head .= "SET NAMES utf8mb4;\n";
    $head .= "SET FOREIGN_KEY_CHECKS = 0;\n";
    $head .= "SET UNIQUE_CHECKS = 0;\n";
    $head .= "SET SQL_MODE = 'NO_AUTO_VALUE_ON_ZERO';\n\n";
    fwrite($fp, $head);

    $filasTotales = 0;

    // 1) Tablas base (no vistas)
    $tablas = $db->query("SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES
                          WHERE TABLE_SCHEMA = DATABASE() AND TABLE_TYPE = 'BASE TABLE'
                          ORDER BY TABLE_NAME")->fetchAll(PDO::FETCH_COLUMN);

    foreach ($tablas as $t) {
        fwrite($fp, "\n-- ----------------------------------------\n");
        fwrite($fp, "-- Tabla: $t\n");
        fwrite($fp, "-- ----------------------------------------\n");
        fwrite($fp, "DROP TABLE IF EXISTS `$t`;\n");

        $create = $db->query("SHOW CREATE TABLE `$t`")->fetch();
        fwrite($fp, $create['Create Table'] . ";\n\n");

        // Datos — leer en streaming para no cargar tabla completa a memoria
        $stmt = $db->prepare("SELECT * FROM `$t`");
        $stmt->execute();
        $cols = null;
        $lote = [];
        $LOTE_MAX = 200;    // filas por INSERT multi-value

        while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
            if ($cols === null) {
                $cols = array_keys($row);
                $colList = '`' . implode('`,`', $cols) . '`';
            }
            $vals = [];
            foreach ($cols as $c) $vals[] = sqlValor($db, $row[$c]);
            $lote[] = '(' . implode(',', $vals) . ')';
            $filasTotales++;

            if (count($lote) >= $LOTE_MAX) {
                fwrite($fp, "INSERT INTO `$t` ($colList) VALUES\n" . implode(",\n", $lote) . ";\n");
                $lote = [];
            }
        }
        if (!empty($lote)) {
            fwrite($fp, "INSERT INTO `$t` ($colList) VALUES\n" . implode(",\n", $lote) . ";\n");
        }
    }

    // 2) Vistas
    $vistas = $db->query("SELECT TABLE_NAME FROM INFORMATION_SCHEMA.VIEWS
                          WHERE TABLE_SCHEMA = DATABASE()
                          ORDER BY TABLE_NAME")->fetchAll(PDO::FETCH_COLUMN);
    foreach ($vistas as $v) {
        $c = $db->query("SHOW CREATE VIEW `$v`")->fetch();
        if ($c && !empty($c['Create View'])) {
            fwrite($fp, "\n-- Vista: $v\n");
            fwrite($fp, "DROP VIEW IF EXISTS `$v`;\n");
            fwrite($fp, $c['Create View'] . ";\n");
        }
    }

    // 3) Triggers
    $trigs = $db->query("SELECT TRIGGER_NAME FROM INFORMATION_SCHEMA.TRIGGERS
                         WHERE TRIGGER_SCHEMA = DATABASE()")->fetchAll(PDO::FETCH_COLUMN);
    foreach ($trigs as $tr) {
        $c = $db->query("SHOW CREATE TRIGGER `$tr`")->fetch();
        if ($c && !empty($c['SQL Original Statement'])) {
            fwrite($fp, "\n-- Trigger: $tr\n");
            fwrite($fp, "DROP TRIGGER IF EXISTS `$tr`;\n");
            fwrite($fp, "DELIMITER $$\n");
            fwrite($fp, $c['SQL Original Statement'] . "$$\n");
            fwrite($fp, "DELIMITER ;\n");
        }
    }

    fwrite($fp, "\nSET FOREIGN_KEY_CHECKS = 1;\nSET UNIQUE_CHECKS = 1;\n");
    fclose($fp);
    return [true, $filasTotales, null];
}

// -------------------------------------------------------------------------
try {
    $dir = backupDir();
    $database = new Database();
    $db = $database->getConnection();
    $nombreBD = $db->query("SELECT DATABASE()")->fetchColumn();

    if ($_SERVER['REQUEST_METHOD'] === 'GET') {
        $archivos = listarBackups($dir);
        $hoy = date('Y-m-d');
        $backupHoy = null;
        foreach ($archivos as $a) {
            if (strpos($a['nombre'], "contaft-$hoy") === 0) { $backupHoy = $a; break; }
        }
        echo json_encode([
            'success'    => true,
            'directorio' => $dir,
            'archivos'   => $archivos,
            'total'      => count($archivos),
            'backup_hoy' => $backupHoy,
            'tiene_hoy'  => $backupHoy !== null,
            'base_datos' => $nombreBD,
        ], JSON_UNESCAPED_UNICODE);
        exit;
    }

    // POST
    $data = json_decode(file_get_contents('php://input'), true) ?: [];
    $action = $data['action'] ?? '';

    if ($action === 'generar') {
        $forzar = !empty($data['forzar']);
        $hoy = date('Y-m-d');

        if (!$forzar) {
            foreach (listarBackups($dir) as $a) {
                if (strpos($a['nombre'], "contaft-$hoy") === 0) {
                    echo json_encode([
                        'success' => true,
                        'ya_existe' => true,
                        'archivo' => $a,
                        'message' => 'Ya existe un respaldo de hoy',
                    ]);
                    exit;
                }
            }
        }

        $ts = date('Y-m-d_His');
        $nombre = "contaft-$ts.sql";
        $ruta = $dir . DIRECTORY_SEPARATOR . $nombre;

        $inicio = microtime(true);
        [$ok, $filas, $err] = dumpearBD($db, $ruta, $nombreBD);
        $duracion = round(microtime(true) - $inicio, 2);

        if (!$ok || !file_exists($ruta) || filesize($ruta) < 100) {
            @unlink($ruta);
            echo json_encode([
                'success' => false,
                'message' => 'Fallo al generar respaldo: ' . ($err ?? 'archivo vacío'),
            ]);
            exit;
        }

        $borrados = rotarBackups($dir, $RETENCION_DIAS);

        echo json_encode([
            'success' => true,
            'archivo' => [
                'nombre' => $nombre,
                'ruta'   => $ruta,
                'tamano' => filesize($ruta),
                'fecha'  => date('Y-m-d H:i:s', filemtime($ruta)),
            ],
            'filas_totales' => $filas,
            'duracion_seg'  => $duracion,
            'rotados'       => $borrados,
            'message'       => "Respaldo creado en $duracion s ($filas filas)",
        ], JSON_UNESCAPED_UNICODE);
        exit;
    }

    if ($action === 'eliminar') {
        $nombre = $data['nombre'] ?? '';
        if (!$nombre || strpos($nombre, '..') !== false || !preg_match('/^contaft-.*\.sql$/', $nombre)) {
            echo json_encode(['success' => false, 'message' => 'Nombre inválido']); exit;
        }
        $ruta = $dir . DIRECTORY_SEPARATOR . $nombre;
        if (!file_exists($ruta)) {
            echo json_encode(['success' => false, 'message' => 'Archivo no encontrado']); exit;
        }
        @unlink($ruta);
        echo json_encode(['success' => true, 'message' => 'Respaldo eliminado']);
        exit;
    }

    echo json_encode(['success' => false, 'message' => "Acción no soportada: $action"]);

} catch (\Throwable $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => $e->getMessage()]);
}
