// Verifica que el instalador NO lleve datos ni nombres de clientes.
//
// Revisa:
//   - archivos prohibidos (scripts *_rescate_*, SQL fuera de la lista
//     permitida, backups-contaft-server, tests, tools, uploads, .db, secrets...)
//   - nombres de clientes o personas dentro de cualquier archivo de texto
//     (lista en conta-app-backend/tests/clientes/nombres_prohibidos.json).
//
// Modos:
//   node scripts/verificar-paquete.mjs            → paquete REAL ya construido:
//        dist-electron/win-unpacked/resources/backend + app.asar (lo corre
//        electron:build DESPUÉS de electron-builder).
//   node scripts/verificar-paquete.mjs --simular  → sin build: aplica el
//        filtro extraResources de package.json sobre conta-app-backend del
//        repo + electron/ (lo corre pre-build-tests antes de la constancia).
//   --dir=<ruta>  → revisar otra carpeta resources/ (p.ej. un build viejo).
//
// Si falla: BORRA la constancia (dist-electron/verificacion-build.json) para
// que el script de publicación se niegue a publicar, y sale con exit 1.

import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { minimatch } from 'minimatch';
import { borrarConstancia } from './constancia.mjs';

const RAIZ = dirname(dirname(fileURLToPath(import.meta.url)));
const BACKEND = join(RAIZ, '..', 'conta-app-backend');
const args = process.argv.slice(2);
const SIMULAR = args.includes('--simular');
const DIR = (args.find(a => a.startsWith('--dir=')) || '').slice(6);

const reglas = JSON.parse(readFileSync(join(BACKEND, 'tests', 'clientes', 'nombres_prohibidos.json'), 'utf-8'));
const reNombres = new RegExp([...reglas.empresas, ...reglas.personas].join('|'), 'i');
const reArchivos = new RegExp(reglas.archivos_prohibidos.join('|'), 'i');
const TEXTO = /\.(php|sql|md|txt|js|mjs|cjs|json|html|css|ts|tpl|ini|bat|ps1|yml|yaml|xml|csv)$/i;

const pkg = JSON.parse(readFileSync(join(RAIZ, 'package.json'), 'utf-8'));
const recursoBackend = pkg.build.extraResources.find(r => /conta-app-backend/.test(r.from));
const filtro = recursoBackend.filter;
const sqlPermitidos = filtro.filter(p => /^sql\/[^*!]+\.sql$/.test(p)).map(p => p.slice(4));

const fallas = [];
let revisados = 0;

function caminar(dir, base = dir, out = []) {
  for (const n of readdirSync(dir)) {
    const p = join(dir, n);
    const st = statSync(p);
    if (st.isDirectory()) caminar(p, base, out);
    else out.push({ abs: p, rel: relative(base, p).split(sep).join('/'), size: st.size });
  }
  return out;
}
// Mismo criterio que electron-builder: incluido si matchea algún patrón
// positivo y ninguno negativo (minimatch, dot:true).
function pasaFiltro(rel) {
  const pos = filtro.filter(p => !p.startsWith('!'));
  const neg = filtro.filter(p => p.startsWith('!')).map(p => p.slice(1));
  return pos.some(p => minimatch(rel, p, { dot: true })) && !neg.some(p => minimatch(rel, p, { dot: true }));
}
function revisarContenido(etiqueta, rel, contenido) {
  revisados++;
  if (reArchivos.test('/' + rel)) fallas.push(`${etiqueta}: archivo prohibido en el paquete → ${rel}`);
  if (/\.sql$/i.test(rel) && /(^|\/)sql\//.test(rel) && !/(^|\/)api\//.test(rel)) {
    const nombre = rel.split('/').pop();
    if (!sqlPermitidos.includes(nombre)) fallas.push(`${etiqueta}: SQL fuera de la lista permitida → ${rel}`);
  }
  if (contenido !== null) {
    const lineas = contenido.split(/\r?\n/);
    for (let i = 0; i < lineas.length; i++) {
      const m = reNombres.exec(lineas[i]);
      if (m) { fallas.push(`${etiqueta}: nombre de cliente/persona "${m[0]}" en ${rel}:${i + 1}`); break; }
    }
  }
}

// --- Backend --------------------------------------------------------------------
let backendDir, simulado = false;
if (SIMULAR) {
  backendDir = BACKEND;
  simulado = true;
} else {
  const resources = DIR || join(RAIZ, 'dist-electron', 'win-unpacked', 'resources');
  backendDir = join(resources, 'backend');
  if (!existsSync(backendDir)) {
    console.error(`[paquete] No existe ${backendDir}. ¿Corriste electron-builder? (o usa --simular)`);
    borrarConstancia();
    process.exit(1);
  }
}
for (const f of caminar(backendDir)) {
  if (simulado && !pasaFiltro(f.rel)) continue;
  revisarContenido('backend', f.rel, TEXTO.test(f.rel) ? readFileSync(f.abs, 'utf-8') : null);
}

// --- App (asar) -----------------------------------------------------------------
if (SIMULAR) {
  // electron/ se empaca tal cual (con comentarios). El bundle de build/ aún no
  // existe en pre-build: lo cubre la verificación real después del build.
  for (const f of caminar(join(RAIZ, 'electron'))) revisarContenido('app', 'electron/' + f.rel, TEXTO.test(f.rel) ? readFileSync(f.abs, 'utf-8') : null);
} else {
  const resources = DIR || join(RAIZ, 'dist-electron', 'win-unpacked', 'resources');
  const asarPath = join(resources, 'app.asar');
  if (existsSync(asarPath)) {
    const require = createRequire(import.meta.url);
    const asar = require('@electron/asar');
    for (const entrada of asar.listPackage(asarPath, { isPack: false })) {
      const rel = entrada.replace(/^[\\/]/, '').split(sep).join('/');
      if (rel.startsWith('node_modules/')) continue; // dependencias de terceros
      let st;
      try { st = asar.statFile(asarPath, rel, true); } catch { continue; }
      if (!st || st.files || st.link) continue;
      const buf = TEXTO.test(rel) ? asar.extractFile(asarPath, rel).toString('utf-8') : null;
      revisarContenido('app.asar', rel, buf);
    }
  } else {
    fallas.push(`No encontré ${asarPath}`);
  }
}

// --- Resultado ---------------------------------------------------------------------
const modo = SIMULAR ? 'simulado (filtro de package.json sobre el repo)' : 'paquete real';
if (fallas.length) {
  borrarConstancia();
  console.error(`\n\x1b[31m[paquete] ✗ ${fallas.length} problema(s) — ${modo}. Constancia BORRADA:\x1b[0m`);
  fallas.slice(0, 80).forEach(f => console.error('   - ' + f));
  if (fallas.length > 80) console.error(`   ... y ${fallas.length - 80} más`);
  process.exit(1);
}
console.log(`\x1b[32m[paquete] ✓ Sin datos ni nombres de clientes — ${revisados} archivos revisados (${modo}).\x1b[0m`);
