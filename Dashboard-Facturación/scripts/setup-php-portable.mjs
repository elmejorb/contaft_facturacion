// Descarga PHP portable para Windows la primera vez.
// Lo deja en Dashboard-Facturación/php-portable/ y lo configura.
// Se encadena en npm run electron:build para que esté disponible al empacar.
//
// NO se commitea el binario (es ~40MB sin comprimir); va en .gitignore.
// Cada dev lo baja la primera vez. El build final de Electron sí lo incluye
// como extraResources — ahí es cuando viaja al cliente final.

import { createWriteStream, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { pipeline } from 'node:stream/promises';
import { spawnSync } from 'node:child_process';
import { Readable } from 'node:stream';

const RAIZ = dirname(dirname(fileURLToPath(import.meta.url)));
const PHP_DIR = join(RAIZ, 'php-portable');

// Versión LTS (PHP 8.3 x64 NTS). NTS = Non Thread Safe, el que corresponde al
// built-in server. El endpoint `latest/` apunta siempre a la última estable
// de cada rama, así no se desactualiza este script cada release.
const PHP_URL = `https://windows.php.net/downloads/releases/latest/php-8.3-nts-Win32-vs16-x64-latest.zip`;
const EXT_NECESARIAS = ['pdo_sqlite', 'sqlite3', 'pdo_mysql', 'mysqli', 'openssl', 'curl', 'mbstring', 'fileinfo'];

function info(msg) { console.log('\x1b[36m[php-setup]\x1b[0m ' + msg); }
function warn(msg) { console.log('\x1b[33m[php-setup]\x1b[0m ' + msg); }

if (existsSync(join(PHP_DIR, 'php.exe'))) {
  info(`PHP portable ya está en ${PHP_DIR}. Si querés reinstalar, borra la carpeta y volvé a correr.`);
  process.exit(0);
}

info(`Descargando PHP 8.3 portable (último de la rama)...`);
mkdirSync(PHP_DIR, { recursive: true });
const zipPath = join(PHP_DIR, 'php.zip');

const resp = await fetch(PHP_URL);
if (!resp.ok) {
  console.error(`\x1b[31m[php-setup] Falló la descarga (HTTP ${resp.status}). URL: ${PHP_URL}\x1b[0m`);
  process.exit(1);
}
await pipeline(Readable.fromWeb(resp.body), createWriteStream(zipPath));
info(`Descarga OK (${(await resp.headers.get('content-length') / 1024 / 1024).toFixed(1)} MB)`);

info('Descomprimiendo...');
// Expand-Archive de PowerShell — nativo en Windows, no requiere herramientas extra
const unzip = spawnSync('powershell', ['-NoProfile', '-Command',
  `Expand-Archive -Force -LiteralPath "${zipPath}" -DestinationPath "${PHP_DIR}"`
], { stdio: 'inherit' });
if (unzip.status !== 0) {
  console.error('\x1b[31m[php-setup] Falló Expand-Archive.\x1b[0m');
  process.exit(1);
}

// Borrar el zip
try { spawnSync('cmd', ['/c', 'del', '/q', zipPath]); } catch {}

// Configurar php.ini: copiar el development y habilitar las extensiones que necesitamos
info('Configurando php.ini con extensiones habilitadas...');
const iniSrc = join(PHP_DIR, 'php.ini-development');
const iniDst = join(PHP_DIR, 'php.ini');
if (!existsSync(iniSrc)) {
  warn('No se encontró php.ini-development — PHP arrancará con defaults. Pueden faltar extensiones.');
} else {
  let ini = readFileSync(iniSrc, 'utf-8');
  // extension_dir: en Windows usa ./ext
  ini = ini.replace(/^;?\s*extension_dir\s*=\s*".*"/m, 'extension_dir = "ext"');
  // Habilitar extensiones
  for (const ext of EXT_NECESARIAS) {
    const regex = new RegExp(`^;\\s*extension\\s*=\\s*${ext}\\b`, 'm');
    if (regex.test(ini)) {
      ini = ini.replace(regex, `extension=${ext}`);
    } else if (!new RegExp(`^extension\\s*=\\s*${ext}\\b`, 'm').test(ini)) {
      // Si no está ni comentada ni habilitada, la agrego
      ini += `\nextension=${ext}\n`;
    }
  }
  // Timezone Colombia
  ini = ini.replace(/^;?\s*date\.timezone\s*=.*/m, 'date.timezone = "America/Bogota"');
  // Logging para debugging local — en producción Electron redirige stderr
  ini = ini.replace(/^;?\s*log_errors\s*=.*/m, 'log_errors = On');
  writeFileSync(iniDst, ini);
  info(`php.ini configurado (${EXT_NECESARIAS.length} extensiones).`);
}

// Verificar que arranca y tiene las extensions
info('Verificando binario...');
const phpExe = join(PHP_DIR, 'php.exe');
const check = spawnSync(phpExe, ['-r', `
  $exts = get_loaded_extensions();
  $need = ['pdo_sqlite','sqlite3','pdo_mysql','openssl','curl','mbstring'];
  foreach ($need as $e) echo $e . ": " . (in_array($e, $exts) ? 'OK' : 'MISSING') . PHP_EOL;
`], { encoding: 'utf-8' });

console.log(check.stdout || '');
if (check.stderr) warn(check.stderr);

if (check.stdout?.includes('MISSING')) {
  warn('Algunas extensiones no cargaron — revisá php.ini manualmente.');
}

info('\x1b[32m✓ PHP portable listo en ' + PHP_DIR + '\x1b[0m');
