<?php
/**
 * Auto-prepend ejecutado ANTES de cada script PHP cuando corre bajo el
 * built-in server del modo embebido en Electron.
 *
 * El built-in server mantiene su CWD en el document root y no lo cambia
 * al directorio del script como hace Apache. Eso rompe los
 * `require_once '../config/database.php'` relativos del backend.
 *
 * Este archivo se inyecta vía `-d auto_prepend_file=prepend.php` al
 * arrancar el server. Cambia el CWD al directorio del script actual
 * antes de que corra, para que los requires relativos resuelvan igual
 * que en Apache.
 */
if (isset($_SERVER['SCRIPT_FILENAME']) && is_file($_SERVER['SCRIPT_FILENAME'])) {
    chdir(dirname($_SERVER['SCRIPT_FILENAME']));
}
