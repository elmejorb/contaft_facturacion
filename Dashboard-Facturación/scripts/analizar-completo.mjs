// Análisis completo — login + navegación + medición de heap/DOM/listeners/network
// en cada pantalla, con detección automática de posibles leaks y endpoints
// duplicados.
import { primeraVentana, conectar } from './cdp-client.mjs';

const wait = (ms) => new Promise(r => setTimeout(r, ms));
const fmt = (n) => n >= 1048576 ? `${(n/1048576).toFixed(1)}MB` : `${(n/1024).toFixed(0)}KB`;
const arrow = (a, b) => `${b > a ? '↑' : b < a ? '↓' : '·'}${b > a ? '+' : ''}${b - a}`;

const cli = await conectar(await primeraVentana({ tituloContiene: 'Conta' }));
await cli.cmd('Performance.enable');
await cli.cmd('Network.enable');

async function snap() {
  const { metrics } = await cli.cmd('Performance.getMetrics');
  const m = Object.fromEntries(metrics.map(x => [x.name, x.value]));
  const heap = await cli.evaluar(`performance.memory ? performance.memory.usedJSHeapSize : 0`);
  return { heap, nodos: m.Nodes || 0, listeners: m.JSEventListeners || 0 };
}

const requestsGlobal = [];
cli.on('Network.responseReceived', (p) => {
  const url = p.response.url;
  if (/localhost.*conta-app-backend/.test(url)) {
    requestsGlobal.push({
      url: url.replace(/^http:\/\/localhost:\d+/, '').replace(/\?.*/, ''),
      status: p.response.status,
      tamano: p.response.encodedDataLength || 0,
      ts: p.timestamp,
    });
  }
});

async function clickPorTexto(texto) {
  return await cli.evaluar(`
    (() => {
      const btns = Array.from(document.querySelectorAll('button, [role="button"]'));
      const btn = btns.find(b => (b.textContent || '').trim() === ${JSON.stringify(texto)});
      if (!btn) return false;
      btn.click();
      return true;
    })()
  `);
}

// Fase 0: asegurar login
const enLogin = await cli.evaluar(`document.querySelectorAll('input[type="password"]').length > 0`);
if (enLogin) {
  console.log('▶ Login programático root/elmejorb...');
  await cli.evaluar(`
    (() => {
      const setV = (el, v) => {
        const s = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
        s.call(el, v); el.dispatchEvent(new Event('input', { bubbles: true }));
      };
      const usu = Array.from(document.querySelectorAll('input')).find(i => i.type !== 'password' && i.type !== 'hidden');
      const pass = document.querySelector('input[type="password"]');
      setV(usu, 'root'); setV(pass, 'elmejorb');
      const btn = Array.from(document.querySelectorAll('button')).find(b => /ingresar|iniciar|login|entrar/i.test(b.textContent || ''));
      btn?.click();
    })()
  `);
  await wait(5000);
}

console.log('\n═══ ANÁLISIS DE NAVEGACIÓN ═══\n');
const historial = [];

// Snapshot inicial: dashboard
const inicio = await snap();
historial.push({ pantalla: 'Inicio (dashboard)', ...inicio });
console.log(`▶ Inicio (dashboard): heap=${fmt(inicio.heap)} nodos=${inicio.nodos} listeners=${inicio.listeners}`);

const pantallas = [
  'Inventario',
  'Clientes',
  'Proveedores',
  'Ventas',
  'Compras',
  'Cartera',
  'Informes',
];

for (const pantalla of pantallas) {
  console.log(`\n▶ Navegando a: ${pantalla}...`);
  const requestsAntesN = requestsGlobal.length;
  const antes = await snap();
  const ok = await clickPorTexto(pantalla);
  if (!ok) { console.log(`  ⚠ no se encontró botón "${pantalla}"`); continue; }
  await wait(3500);
  const despues = await snap();
  historial.push({ pantalla, ...despues });
  const reqs = requestsGlobal.slice(requestsAntesN);
  console.log(`  heap    : ${fmt(antes.heap).padStart(8)} → ${fmt(despues.heap).padStart(8)}  (${arrow(antes.heap, despues.heap)})`);
  console.log(`  nodos   : ${String(antes.nodos).padStart(8)} → ${String(despues.nodos).padStart(8)}  (${arrow(antes.nodos, despues.nodos)})`);
  console.log(`  listen  : ${String(antes.listeners).padStart(8)} → ${String(despues.listeners).padStart(8)}  (${arrow(antes.listeners, despues.listeners)})`);
  console.log(`  requests API: ${reqs.length}`);
  const porUrl = new Map();
  for (const r of reqs) porUrl.set(r.url, (porUrl.get(r.url) || 0) + 1);
  for (const [u, n] of porUrl) console.log(`    · ${u}${n > 1 ? ' ×' + n : ''}`);
}

// Regresar a Inicio para comparar (detectar leaks al desmontar)
console.log(`\n▶ Regresando a Inicio (comparar leak)...`);
const antesInicio = await snap();
await clickPorTexto('Inicio');
await wait(2500);
const inicioFinal = await snap();
historial.push({ pantalla: 'Inicio (final)', ...inicioFinal });
console.log(`  heap final: ${fmt(inicioFinal.heap)} (arranque: ${fmt(inicio.heap)}, ${arrow(inicio.heap, inicioFinal.heap)})`);
console.log(`  listeners final: ${inicioFinal.listeners} (arranque: ${inicio.listeners}, ${arrow(inicio.listeners, inicioFinal.listeners)})`);
console.log(`  nodos final: ${inicioFinal.nodos} (arranque: ${inicio.nodos}, ${arrow(inicio.nodos, inicioFinal.nodos)})`);

// Forzar GC para ver el heap "real"
console.log(`\n▶ Forzando GC...`);
try { await cli.cmd('HeapProfiler.collectGarbage'); } catch {}
await wait(1000);
const postGC = await snap();
console.log(`  heap post-GC: ${fmt(postGC.heap)} (vs arranque ${fmt(inicio.heap)}, ${arrow(inicio.heap, postGC.heap)})`);

// Resumen
console.log('\n╭─ RESUMEN\n│ Pantalla                            heap    nodos    listeners');
for (const r of historial) {
  console.log(`│ ${r.pantalla.padEnd(32)}   ${fmt(r.heap).padStart(7)}   ${String(r.nodos).padStart(5)}   ${String(r.listeners).padStart(5)}`);
}
console.log('╰─');

// Endpoints duplicados globales
console.log('\n▶ Endpoints API — llamadas totales:');
const globals = new Map();
for (const r of requestsGlobal) globals.set(r.url, (globals.get(r.url) || 0) + 1);
const sorted = [...globals.entries()].sort((a, b) => b[1] - a[1]);
for (const [u, n] of sorted.slice(0, 25)) console.log(`  ${String(n).padStart(3)}× ${u}`);

const dups = sorted.filter(([, n]) => n >= 3);
if (dups.length > 0) {
  console.log(`\n⚠ ${dups.length} endpoints se llamaron 3+ veces — candidatos a caché:`);
  for (const [u, n] of dups) console.log(`  · ${u} × ${n}`);
}

cli.cerrar();
