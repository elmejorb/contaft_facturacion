// Pre-build gate: corre la suite de tests del backend antes de permitir el
// build de electron. Si algún test falla, bloquea el build con exit 1.
//
// Encadenado en package.json → "electron:build":
//   "npm run test:backend && npm run build && electron-builder"
//
// Chequea también que Apache+MySQL de XAMPP estén arriba — si no, no tiene
// sentido correr tests que hablan HTTP contra Apache.

import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const RAIZ    = dirname(dirname(fileURLToPath(import.meta.url)));
const BACKEND = join(RAIZ, '..', 'conta-app-backend');
const PHP     = 'C:/xampp/php/php.exe';
const MYSQL   = 'C:/xampp/mysql/bin/mysql.exe';

function fatal(msg) {
  console.error('\n\x1b[31m[pre-build] ' + msg + '\x1b[0m');
  process.exit(1);
}

function info(msg) {
  console.log('\x1b[36m[pre-build]\x1b[0m ' + msg);
}

// 1. Verificar servicios locales — sin ellos la suite no corre
if (!existsSync(PHP))   fatal(`No encontré PHP en ${PHP}. ¿Está instalado XAMPP?`);
if (!existsSync(MYSQL)) fatal(`No encontré mysql.exe en ${MYSQL}. ¿Está instalado XAMPP?`);

const runnerPath = join(BACKEND, 'tests', 'run.php');
if (!existsSync(runnerPath)) fatal(`No encontré el runner de tests en ${runnerPath}`);

// 2. Chequeo rápido: Apache y MySQL respondiendo
info('Verificando Apache en localhost:80...');
try {
  const r = await fetch('http://localhost:80/conta-app-backend/api/health.php', { signal: AbortSignal.timeout(3000) });
  if (!r.ok && r.status !== 404) info(`  Apache responde HTTP ${r.status}`);
} catch (e) {
  fatal(`Apache no responde en localhost:80. Arrancalo desde XAMPP Control Panel.`);
}

info('Verificando MySQL...');
const mysqlCheck = spawnSync(MYSQL, ['-uroot', '-proot', '-e', 'SELECT 1'], { encoding: 'utf-8' });
if (mysqlCheck.status !== 0) {
  fatal(`MySQL no responde. Arrancalo desde XAMPP Control Panel. (${mysqlCheck.stderr?.trim() || 'sin stderr'})`);
}

// 3. Correr la suite contra AMBOS drivers (MySQL legacy + SQLite nuevo).
//    Si cualquiera falla, el build se cancela — así clientes actuales (MySQL)
//    y clientes nuevos (SQLite) ambos reciben código que funciona.
const drivers = ['mysql', 'sqlite'];
for (const driver of drivers) {
  info(`Corriendo suite [driver=${driver}]...`);
  console.log('');
  const result = spawnSync(PHP, [runnerPath, `--driver=${driver}`], {
    stdio: 'inherit',
    cwd: BACKEND,
  });
  if (result.status !== 0) {
    console.error('');
    fatal(`La suite de tests falló para driver=${driver} (exit ${result.status}). El build fue CANCELADO para proteger a los clientes.`);
  }
  console.log('');
}

info('\x1b[32m✓ Todos los tests pasan en MySQL Y SQLite — se autoriza continuar con el build.\x1b[0m');
