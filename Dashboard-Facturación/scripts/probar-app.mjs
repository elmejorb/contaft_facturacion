// Launcher dev para Conta FT con puerto CDP abierto — sin afectar el build de producción.
//
// Hace tres cosas:
//   1. Elimina ELECTRON_RUN_AS_NODE del entorno (VS Code lo exporta y rompe Electron).
//   2. Arranca Vite en localhost:3000.
//   3. Arranca Electron con --remote-debugging-port=9222 para permitir inspección/pruebas por CDP.
//
// Uso:  npm run dev:cdp
// Para pruebas: mientras corre, ejecutar analizar-perf.mjs u otro cliente CDP.
//
// El proceso queda vivo hasta Ctrl+C, momento en el que mata Vite y Electron.

import { spawn } from 'node:child_process';
import { platform } from 'node:os';
import { existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { listarPaginas } from './cdp-client.mjs';

// fileURLToPath decodifica correctamente rutas con acentos (ó, á, ñ)
// que URL.pathname deja como %C3%B3.
const RAIZ = dirname(dirname(fileURLToPath(import.meta.url)));
const esWin = platform() === 'win32';

// Resuelve un binario del node_modules/.bin local — más confiable que
// pasar por npm/npx en Windows con distintos shells (git-bash, PowerShell).
function binLocal(nombre) {
  const ext = esWin ? '.cmd' : '';
  const p = join(RAIZ, 'node_modules', '.bin', nombre + ext);
  if (!existsSync(p)) throw new Error(`No se encontró binario ${p}`);
  return p;
}

// Entorno limpio — sin ELECTRON_RUN_AS_NODE que VS Code fuga a las terminales.
const entorno = { ...process.env };
delete entorno.ELECTRON_RUN_AS_NODE;
entorno.NODE_ENV = 'development';

const procesos = [];

function lanzar(nombre, cmd, args) {
  // En Windows los .cmd necesitan shell:true por seguridad Node 20+,
  // pero SIN pasar por cmd.exe manual (que fallaba con ENOENT).
  const child = spawn(cmd, args, {
    stdio: 'inherit',
    shell: esWin && cmd.endsWith('.cmd'),
    cwd: RAIZ,
    env: entorno,
  });
  child._nombre = nombre;
  child.on('exit', (code, signal) => {
    if (!cerrando) {
      console.log(`\n[${nombre}] terminó (code=${code}, signal=${signal})`);
      cerrar();
    }
  });
  procesos.push(child);
  return child;
}

let cerrando = false;
function cerrar() {
  if (cerrando) return;
  cerrando = true;
  for (const p of procesos) {
    if (!p.killed) {
      try { esWin ? spawn('taskkill', ['/pid', p.pid, '/f', '/t']) : p.kill('SIGTERM'); } catch {}
    }
  }
  setTimeout(() => process.exit(0), 300);
}
process.on('SIGINT', cerrar);
process.on('SIGTERM', cerrar);

async function esperaVite(url = 'http://localhost:3000', intentos = 60) {
  for (let i = 0; i < intentos; i++) {
    try {
      const r = await fetch(url);
      if (r.ok || r.status === 200) return true;
    } catch {}
    await new Promise(res => setTimeout(res, 500));
  }
  throw new Error(`Vite no respondió en ${url}`);
}

(async () => {
  console.log('▶ Arrancando Vite (localhost:3000)…');
  lanzar('vite', binLocal('vite'), []);

  await esperaVite();
  console.log('✓ Vite listo');

  console.log('▶ Arrancando Electron con --remote-debugging-port=9444…');
  lanzar('electron', binLocal('electron'), ['.', '--remote-debugging-port=9444']);

  console.log('▶ Esperando ventana CDP…');
  const pages = await listarPaginas();
  console.log(`✓ ${pages.length} página(s) disponible(s) en http://127.0.0.1:9222/json/list`);
  for (const p of pages) console.log(`   · ${p.title || '(sin título)'} — ${p.url}`);

  console.log('\nApp lista. Ctrl+C para salir.');
  console.log('Para analizar performance en otra terminal:\n   node scripts/analizar-perf.mjs\n');
})().catch(err => {
  console.error('Error arrancando:', err.message);
  cerrar();
});
