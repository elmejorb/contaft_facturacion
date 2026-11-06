// Pre-build gate: corre la suite de tests del backend antes de permitir el
// build de electron. Si algún test falla, bloquea el build con exit 1.
//
// Encadenado en package.json → "electron:build":
//   "npm run test:backend && npm run build && electron-builder"
//
// La suite habla HTTP con un php -S levantado aquí sobre el backend DEL REPO
// (no con Apache/htdocs), así se prueba exactamente el commit. Requiere el
// MySQL de XAMPP arriba. Después corre test-clientes.mjs (bases reales).
//
// CONSTANCIA (desde 4.8.19): al terminar bien escribe
//   dist-electron/verificacion-build.json
// con versión + commit HEAD + resultado de las suites. scripts/publicar-version.ps1
// (servidor Vultr) se niega a publicar sin esa constancia, si es de otra
// versión/commit, o si el repo tiene cambios sin commit.
// Al empezar se BORRA la constancia anterior: un build fallido o sin pruebas
// nunca puede reutilizar una constancia vieja.

import { spawn, spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { borrarConstancia, RUTA_CONSTANCIA } from './constancia.mjs';

const RAIZ    = dirname(dirname(fileURLToPath(import.meta.url)));
const REPO    = join(RAIZ, '..');
const BACKEND = join(REPO, 'conta-app-backend');
const PHP     = 'C:/xampp/php/php.exe';
const MYSQL   = 'C:/xampp/mysql/bin/mysql.exe';

function fatal(msg) {
  console.error('\n\x1b[31m[pre-build] ' + msg + '\x1b[0m');
  process.exit(1);
}

function info(msg) {
  console.log('\x1b[36m[pre-build]\x1b[0m ' + msg);
}

function git(args) {
  const r = spawnSync('git', args, { cwd: REPO, encoding: 'utf-8' });
  if (r.status !== 0) fatal(`git ${args.join(' ')} falló: ${(r.stderr || '').trim()}`);
  return r.stdout.replace(/\s+$/, '');
}

// 0. Constancia: borrar la anterior ANTES de cualquier otra cosa.
borrarConstancia();
info(`Constancia anterior eliminada (${RUTA_CONSTANCIA})`);

// 0b. Repo limpio: la constancia certifica un commit exacto. Si hay cambios
//     sin commit, lo que se prueba no es lo que dice el commit.
const sucio = git(['status', '--porcelain', '--untracked-files=no']);
if (sucio) {
  fatal(`El repo tiene cambios sin commit — no se puede certificar el build:\n${sucio}\n` +
        `Haz commit (y push) antes de buildear.`);
}
const commit  = git(['rev-parse', 'HEAD']);
const version = JSON.parse(readFileSync(join(RAIZ, 'package.json'), 'utf-8')).version;
info(`Versión ${version} — commit ${commit}`);

// 1. Verificar servicios locales — sin ellos la suite no corre
if (!existsSync(PHP))   fatal(`No encontré PHP en ${PHP}. ¿Está instalado XAMPP?`);
if (!existsSync(MYSQL)) fatal(`No encontré mysql.exe en ${MYSQL}. ¿Está instalado XAMPP?`);

const runnerPath = join(BACKEND, 'tests', 'run.php');
if (!existsSync(runnerPath)) fatal(`No encontré el runner de tests en ${runnerPath}`);

// 2. MySQL respondiendo. (Apache ya NO se usa: la suite corre contra un
//    php -S sobre el backend DEL REPO — se prueba exactamente el commit, no
//    la copia sincronizada en htdocs.)
const PHP_PORTABLE = join(RAIZ, 'php-portable', 'php.exe');
const PHP_PORTABLE_INI = join(RAIZ, 'php-portable', 'php.ini');
if (!existsSync(PHP_PORTABLE)) fatal(`No encontré ${PHP_PORTABLE}. Corre "npm run setup:php".`);

info('Verificando MySQL...');
const mysqlCheck = spawnSync(MYSQL, ['-uroot', '-proot', '-e', 'SELECT 1'], { encoding: 'utf-8' });
if (mysqlCheck.status !== 0) {
  fatal(`MySQL no responde. Arrancalo desde XAMPP Control Panel. (${mysqlCheck.stderr?.trim() || 'sin stderr'})`);
}

// 3. Correr la suite contra AMBOS drivers (MySQL legacy + SQLite nuevo).
//    Si cualquiera falla, el build se cancela — así clientes actuales (MySQL)
//    y clientes nuevos (SQLite) ambos reciben código que funciona.
// Backend bajo prueba: php -S sobre conta-app-backend del repo.
//   mysql  → PHP de XAMPP (el que usan los clientes MySQL) + BD conta_test
//   sqlite → php-portable (el que se EMPACA para embebidos) + fixtures/conta_test.db
const TMP_CFG = join(tmpdir(), 'contaft-prebuild');
mkdirSync(TMP_CFG, { recursive: true });
async function levantarBackend(driver, port) {
  const cfgPath = join(TMP_CFG, `config-${driver}.json`);
  const cfg = driver === 'sqlite'
    ? { driver: 'sqlite', sqlite: { path: join(BACKEND, 'tests', 'fixtures', 'conta_test.db').replace(/\\/g, '/') } }
    : { driver: 'mysql', mysql: { host: '127.0.0.1', database: 'conta_test', username: 'root', password: 'root' } };
  writeFileSync(cfgPath, JSON.stringify(cfg));
  const bin = driver === 'sqlite' ? PHP_PORTABLE : PHP;
  const a = driver === 'sqlite' ? ['-c', PHP_PORTABLE_INI] : [];
  a.push('-d', `auto_prepend_file=${join(BACKEND, 'prepend.php')}`, '-S', `127.0.0.1:${port}`, '-t', join(BACKEND, 'api'));
  const p = spawn(bin, a, { cwd: join(BACKEND, 'api'), env: { ...process.env, CONTA_CONFIG_PATH: cfgPath, CONTAFT_BACKUP_DIR: TMP_CFG }, stdio: 'ignore' });
  for (let i = 0; i < 50; i++) {
    try { await fetch(`http://127.0.0.1:${port}/__ping_no_existe__`, { signal: AbortSignal.timeout(2000) }); return p; } // 404 sin tocar la BD
    catch { await new Promise(r => setTimeout(r, 200)); }
  }
  spawnSync('taskkill', ['/PID', String(p.pid), '/T', '/F'], { stdio: 'ignore' });
  fatal(`No pude levantar php -S (${driver}) en el puerto ${port}.`);
}

const pruebas = {};
let totalPruebas = 0;
const drivers = ['mysql', 'sqlite'];
for (const driver of drivers) {
  info(`Corriendo suite [driver=${driver}] contra php -S del repo...`);
  console.log('');
  const port = driver === 'sqlite' ? 8291 : 8290;
  const srv = await levantarBackend(driver, port);
  const result = spawnSync(PHP, [runnerPath, `--driver=${driver}`], {
    cwd: BACKEND,
    encoding: 'utf-8',
    maxBuffer: 64 * 1024 * 1024,
    env: { ...process.env, TEST_BACKEND_URL: `http://127.0.0.1:${port}` },
  });
  spawnSync('taskkill', ['/PID', String(srv.pid), '/T', '/F'], { stdio: 'ignore' });
  process.stdout.write(result.stdout || '');
  process.stderr.write(result.stderr || '');
  if (result.status !== 0) {
    console.error('');
    fatal(`La suite de tests falló para driver=${driver} (exit ${result.status}). El build fue CANCELADO para proteger a los clientes.`);
  }
  const m = /RESUMEN:\s*(\d+)\s+aserciones OK,\s*(\d+)\s+fallidas/.exec(result.stdout || '');
  if (!m) fatal(`No pude leer el RESUMEN de la suite driver=${driver}; no se emite constancia.`);
  if (Number(m[2]) !== 0) fatal(`La suite driver=${driver} reporta ${m[2]} aserciones fallidas.`);
  totalPruebas += Number(m[1]);
  pruebas[driver] = 'ok';
  console.log('');
}

// 4. Pruebas con bases reales de clientes (scripts/test-clientes.mjs).
//    Mientras no exista el script la constancia lo declara explícitamente.
let basesProbadas = 0;
const testClientes = join(RAIZ, 'scripts', 'test-clientes.mjs');
if (existsSync(testClientes)) {
  info('Corriendo pruebas con bases reales de clientes...');
  const rc = spawnSync(process.execPath, [testClientes, '--json-resumen'], {
    cwd: RAIZ, encoding: 'utf-8', maxBuffer: 256 * 1024 * 1024,
  });
  process.stderr.write(rc.stderr || '');
  const lineas = (rc.stdout || '').trim().split(/\r?\n/);
  let resumen = null;
  try { resumen = JSON.parse(lineas[lineas.length - 1]); } catch { /* abajo */ }
  process.stdout.write(lineas.slice(0, -1).join('\n') + '\n');
  if (rc.status !== 0 || !resumen || resumen.ok !== true) {
    fatal('Las pruebas con bases de clientes fallaron. El build fue CANCELADO.');
  }
  basesProbadas = resumen.bases_probadas;
  totalPruebas += resumen.total_pruebas;
  pruebas.clientes = 'ok';
} else {
  pruebas.clientes = 'no_implementado';
  info('\x1b[33mscripts/test-clientes.mjs no existe todavía — constancia con clientes="no_implementado".\x1b[0m');
}

// 5. Re-verificar que nada cambió durante las pruebas (mismo HEAD, repo limpio).
if (git(['rev-parse', 'HEAD']) !== commit) fatal('El HEAD cambió mientras corrían las pruebas.');
if (git(['status', '--porcelain', '--untracked-files=no'])) fatal('El repo quedó con cambios sin commit durante las pruebas.');

// 6. Emitir constancia.
mkdirSync(dirname(RUTA_CONSTANCIA), { recursive: true });
const constancia = {
  version,
  commit,
  fecha: new Date().toISOString(),
  pruebas,
  bases_probadas: basesProbadas,
  total_pruebas: totalPruebas,
};
writeFileSync(RUTA_CONSTANCIA, JSON.stringify(constancia, null, 2) + '\n', 'utf-8');
info(`Constancia escrita: ${RUTA_CONSTANCIA}`);
info('\x1b[32m✓ Todos los tests pasan en MySQL Y SQLite — se autoriza continuar con el build.\x1b[0m');
