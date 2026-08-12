// Stress test — navegación repetitiva para detectar leaks reales.
import { primeraVentana, conectar } from './cdp-client.mjs';

const wait = (ms) => new Promise(r => setTimeout(r, ms));
const fmt = (n) => `${(n/1048576).toFixed(1)}MB`;

const cli = await conectar(await primeraVentana({ tituloContiene: 'Conta' }));
await cli.cmd('Performance.enable');
await cli.cmd('Network.enable');

async function snap() {
  const { metrics } = await cli.cmd('Performance.getMetrics');
  const m = Object.fromEntries(metrics.map(x => [x.name, x.value]));
  const heap = await cli.evaluar(`performance.memory ? performance.memory.usedJSHeapSize : 0`);
  return { heap, nodos: m.Nodes || 0, listeners: m.JSEventListeners || 0 };
}

async function click(texto) {
  return await cli.evaluar(`
    (() => {
      const btn = Array.from(document.querySelectorAll('button, [role="button"]')).find(b => (b.textContent || '').trim() === ${JSON.stringify(texto)});
      if (!btn) return false;
      btn.click();
      return true;
    })()
  `);
}

const requests = new Set();
cli.on('Network.responseReceived', (p) => {
  const url = p.response.url;
  if (/conta-app-backend/.test(url)) {
    requests.add(url.replace(/^http:\/\/localhost:?\d*/, '').replace(/\?.*/, ''));
  }
});

console.log('▶ Estado inicial:');
const base = await snap();
console.log(`  heap=${fmt(base.heap)} nodos=${base.nodos} listeners=${base.listeners}\n`);

// Login si es necesario
const enLogin = await cli.evaluar(`document.querySelectorAll('input[type="password"]').length > 0`);
if (enLogin) {
  console.log('▶ Login root/elmejorb...');
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
  const postLogin = await snap();
  console.log(`  post-login: heap=${fmt(postLogin.heap)} nodos=${postLogin.nodos} listeners=${postLogin.listeners}\n`);
}

// Ir a Inventario primero para asegurar que cargue datos
console.log('▶ Warm-up: entrando 1× a Inventario para carga inicial...');
await click('Inventario');
await wait(4000);
await click('Inicio');
await wait(2500);

const post = await snap();
console.log(`  heap post-warmup=${fmt(post.heap)} nodos=${post.nodos} listeners=${post.listeners}\n`);

console.log('▶ Stress: 5× Inventario ↔ Inicio (5s cada)');
const trayectoria = [];
for (let i = 1; i <= 5; i++) {
  await click('Inventario');
  await wait(2500);
  const a = await snap();
  await click('Inicio');
  await wait(2000);
  const b = await snap();
  trayectoria.push({ i, invHeap: a.heap, invNodos: a.nodos, invList: a.listeners, iniHeap: b.heap, iniNodos: b.nodos, iniList: b.listeners });
  console.log(`  Ronda ${i}: Inventario ${fmt(a.heap)}/${a.nodos}n/${a.listeners}l → Inicio ${fmt(b.heap)}/${b.nodos}n/${b.listeners}l`);
}

// Forzar GC final
try { await cli.cmd('HeapProfiler.collectGarbage'); } catch {}
await wait(1000);
const gc = await snap();
console.log(`\n▶ Post-GC final: heap=${fmt(gc.heap)} nodos=${gc.nodos} listeners=${gc.listeners}`);

// Análisis
const primero = trayectoria[0];
const ultimo = trayectoria[trayectoria.length - 1];
console.log(`\n╭─ VEREDICTO`);
console.log(`│ Heap Inventario:  ronda1=${fmt(primero.invHeap)} → ronda5=${fmt(ultimo.invHeap)} (${((ultimo.invHeap - primero.invHeap)/1024).toFixed(0)} KB drift)`);
console.log(`│ Heap Inicio:      ronda1=${fmt(primero.iniHeap)} → ronda5=${fmt(ultimo.iniHeap)} (${((ultimo.iniHeap - primero.iniHeap)/1024).toFixed(0)} KB drift)`);
console.log(`│ Listeners Inicio: ronda1=${primero.iniList} → ronda5=${ultimo.iniList} (${ultimo.iniList - primero.iniList} drift)`);
console.log(`│ Nodos Inicio:     ronda1=${primero.iniNodos} → ronda5=${ultimo.iniNodos} (${ultimo.iniNodos - primero.iniNodos} drift)`);
const heapDriftKb = (ultimo.iniHeap - primero.iniHeap) / 1024;
if (heapDriftKb > 1000) console.log(`│ ⚠ POSIBLE LEAK: heap creció más de 1MB en 5 rondas`);
else console.log(`│ ✓ Sin leak significativo (${heapDriftKb.toFixed(0)} KB en 5 rondas)`);
if (ultimo.iniList - primero.iniList > 20) console.log(`│ ⚠ Listeners crecen: posible leak de suscripciones`);
console.log(`╰─`);

console.log(`\n▶ Endpoints únicos consultados en la sesión: ${requests.size}`);
for (const u of [...requests].sort()) console.log(`  · ${u}`);

cli.cerrar();
