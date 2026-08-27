// Analiza performance mientras navega la app: login + tour por pantallas.
// Toma snapshot antes/después de cada pantalla y detecta leaks (heap que no baja).
import { primeraVentana, conectar } from './cdp-client.mjs';

const CREDS = { usuario: 'root', password: 'elmejorb' };

const fmt = (n) => n >= 1048576 ? `${(n/1048576).toFixed(1)}MB` : `${(n/1024).toFixed(0)}KB`;
const wait = (ms) => new Promise(r => setTimeout(r, ms));

async function snap(cli) {
  const { metrics } = await cli.cmd('Performance.getMetrics');
  const m = Object.fromEntries(metrics.map(x => [x.name, x.value]));
  const heap = await cli.evaluar(`performance.memory ? performance.memory.usedJSHeapSize : 0`);
  return {
    heap: heap || 0,
    nodos: m.Nodes || 0,
    listeners: m.JSEventListeners || 0,
    scriptMs: Math.round((m.ScriptDuration || 0) * 1000),
    layoutMs: Math.round((m.LayoutDuration || 0) * 1000),
  };
}

function delta(a, b) {
  return {
    heap: `${fmt(a.heap)} → ${fmt(b.heap)} (${b.heap > a.heap ? '+' : ''}${fmt(b.heap - a.heap)})`,
    nodos: `${a.nodos} → ${b.nodos} (${b.nodos > a.nodos ? '+' : ''}${b.nodos - a.nodos})`,
    listeners: `${a.listeners} → ${b.listeners} (${b.listeners > a.listeners ? '+' : ''}${b.listeners - a.listeners})`,
    script: `+${b.scriptMs - a.scriptMs}ms`,
    layout: `+${b.layoutMs - a.layoutMs}ms`,
  };
}

async function clickPorTexto(cli, texto) {
  const ok = await cli.evaluar(`
    (() => {
      const nodos = Array.from(document.querySelectorAll('button, a, [role="button"], div[onclick]'));
      const encontrado = nodos.find(n => (n.textContent || '').trim().toLowerCase().includes(${JSON.stringify(texto.toLowerCase())}));
      if (!encontrado) return false;
      encontrado.click();
      return true;
    })()
  `);
  return ok;
}

async function login(cli) {
  await cli.evaluar(`
    (() => {
      const inputs = document.querySelectorAll('input');
      const usu = Array.from(inputs).find(i => i.type !== 'password');
      const pass = Array.from(inputs).find(i => i.type === 'password');
      if (usu) { const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set; setter.call(usu, ${JSON.stringify(CREDS.usuario)}); usu.dispatchEvent(new Event('input', {bubbles: true})); }
      if (pass) { const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set; setter.call(pass, ${JSON.stringify(CREDS.password)}); pass.dispatchEvent(new Event('input', {bubbles: true})); }
      return { usu: !!usu, pass: !!pass };
    })()
  `);
  await wait(200);
  await clickPorTexto(cli, 'Ingresar');
}

async function contarRequests(cli, ms) {
  await cli.cmd('Network.enable');
  const requests = [];
  const off1 = cli.on('Network.responseReceived', (p) => {
    const url = p.response.url;
    if (/\/api\//.test(url) || /localhost.*(nueva|listar|buscar|estado|resumen)/.test(url)) {
      requests.push({ url, status: p.response.status, mime: p.response.mimeType, tamano: p.response.encodedDataLength || 0 });
    }
  });
  await wait(ms);
  off1();
  return requests;
}

(async () => {
  const p = await primeraVentana({ tituloContiene: 'Conta' });
  console.log(`✓ Ventana: ${p.title}`);
  const cli = await conectar(p);
  await cli.cmd('Performance.enable');

  const resultados = [];
  const inicial = await snap(cli);
  resultados.push({ pantalla: 'LOGIN', ...inicial });
  console.log(`\n▶ LOGIN: heap=${fmt(inicial.heap)} nodos=${inicial.nodos} listeners=${inicial.listeners}`);

  console.log('\n▶ Login programático (root/elmejorb)...');
  await login(cli);
  await wait(3500);

  const postLogin = await snap(cli);
  resultados.push({ pantalla: 'DASHBOARD (post-login)', ...postLogin });
  console.log(`\nDashboard: heap=${fmt(postLogin.heap)} nodos=${postLogin.nodos} listeners=${postLogin.listeners}`);
  console.log(`Δ desde login: ${JSON.stringify(delta(inicial, postLogin), null, 2)}`);

  const pantallas = [
    { nombre: 'Facturación', click: 'Facturación' },
    { nombre: 'Inventario', click: 'Inventario' },
    { nombre: 'Clientes', click: 'Clientes' },
    { nombre: 'Proveedores', click: 'Proveedores' },
    { nombre: 'Compras', click: 'Compras' },
    { nombre: 'Cuentas por Cobrar', click: 'Cuentas por Cobrar' },
    { nombre: 'Informes', click: 'Informes' },
    { nombre: 'Volver Dashboard', click: 'Inicio' },
  ];

  for (const pantalla of pantallas) {
    const antes = await snap(cli);
    console.log(`\n▶ Navegando a: ${pantalla.nombre}...`);
    const clickeado = await clickPorTexto(cli, pantalla.click);
    if (!clickeado) { console.log(`  ⚠ no encontré botón "${pantalla.click}"`); continue; }

    // Contar requests durante la navegación (2s)
    const reqs = await contarRequests(cli, 2500);
    const despues = await snap(cli);
    resultados.push({ pantalla: pantalla.nombre, ...despues });

    const d = delta(antes, despues);
    console.log(`  heap: ${d.heap}`);
    console.log(`  nodos: ${d.nodos}`);
    console.log(`  listeners: ${d.listeners}`);
    console.log(`  requests API (2.5s): ${reqs.length}`);
    if (reqs.length > 0) {
      const porUrl = new Map();
      for (const r of reqs) {
        const u = r.url.replace(/^http:\/\/localhost:\d+/, '').replace(/\?.*$/, '');
        porUrl.set(u, (porUrl.get(u) || 0) + 1);
      }
      for (const [u, n] of porUrl) console.log(`    · ${u}${n > 1 ? ' ×' + n : ''}`);
    }
  }

  console.log(`\n╭─ RESUMEN`);
  console.log(`│ Pantalla                          heap        nodos    listeners`);
  for (const r of resultados) {
    console.log(`│ ${r.pantalla.padEnd(34)} ${fmt(r.heap).padStart(8)}    ${String(r.nodos).padStart(5)}    ${String(r.listeners).padStart(5)}`);
  }
  console.log(`╰─`);

  cli.cerrar();
})().catch(err => { console.error('Error:', err.message, err.stack); process.exit(1); });
