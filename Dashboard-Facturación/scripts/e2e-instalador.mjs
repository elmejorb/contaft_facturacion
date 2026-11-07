// e2e contra la app EMPAQUETADA (dist-electron/win-unpacked) y registro en la
// constancia de pruebas (pruebas.e2e). Corre DESPUÉS de electron-builder y de
// verificar-paquete (necesita el .exe). Lo encadena `npm run electron:build`.
//
// Uso directo: node scripts/e2e-instalador.mjs
//   Requiere C:\ContaFT-pruebas\e2e.json (token de la empresa de PRUEBA del
//   CRM, fuera del repo). Si algo falla, BORRA la constancia: sin e2e no se
//   publica.

import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { RUTA_CONSTANCIA, borrarConstancia } from './constancia.mjs';

const RAIZ = dirname(dirname(fileURLToPath(import.meta.url)));
const REPORTE = join(RAIZ, 'e2e', 'report-instalador', 'resultado.json');

function fallar(msg) {
  borrarConstancia();
  console.error(`\n[e2e-instalador] ✗ ${msg}\n[e2e-instalador] Constancia eliminada: este build NO se puede publicar.`);
  process.exit(1);
}

if (!existsSync(RUTA_CONSTANCIA)) fallar('No hay constancia de pre-build (corre el build completo: npm run electron:build).');
const constancia = JSON.parse(readFileSync(RUTA_CONSTANCIA, 'utf-8'));
const head = spawnSync('git', ['rev-parse', 'HEAD'], { cwd: RAIZ, encoding: 'utf-8' }).stdout.trim();
if (constancia.commit !== head) fallar(`La constancia es del commit ${constancia.commit}, HEAD es ${head}.`);
if (!existsSync(join(RAIZ, 'dist-electron', 'win-unpacked', 'Conta FT 4.3.exe'))) fallar('No existe dist-electron/win-unpacked (falta el build).');
if (!existsSync('C:/ContaFT-pruebas/e2e.json')) fallar('Falta C:\\ContaFT-pruebas\\e2e.json (token de la empresa de prueba del CRM).');

console.log('[e2e-instalador] Corriendo Playwright contra la app empaquetada...');
const r = spawnSync('npx', ['playwright', 'test', '-c', 'playwright.instalador.config.ts'], {
  cwd: RAIZ, stdio: 'inherit', shell: true,
});
if (!existsSync(REPORTE)) fallar('Playwright no dejó reporte.');
const rep = JSON.parse(readFileSync(REPORTE, 'utf-8'));
const st = rep.stats || {};
if (r.status !== 0 || (st.unexpected ?? 1) > 0 || (st.flaky ?? 0) > 0) fallar(`e2e con fallas (inesperadas: ${st.unexpected}, inestables: ${st.flaky}).`);

// Títulos de las omitidas (fixme), para que la constancia diga qué falta cubrir.
const omitidas = [];
const recorrer = (s) => {
  for (const sp of s.specs || []) for (const t of sp.tests || []) if (t.status === 'skipped') omitidas.push(sp.title);
  for (const h of s.suites || []) recorrer(h);
};
for (const s of rep.suites || []) recorrer(s);

constancia.pruebas = { ...(constancia.pruebas || {}), e2e: 'ok' };
constancia.e2e = { pasadas: st.expected, omitidas, fecha: new Date().toISOString() };
writeFileSync(RUTA_CONSTANCIA, JSON.stringify(constancia, null, 2));
console.log(`[e2e-instalador] ✓ ${st.expected} pasadas, ${omitidas.length} omitidas → pruebas.e2e = "ok" en la constancia.`);
