// Analizador de performance para Conta FT vía CDP.
// Requiere que la app esté corriendo con --remote-debugging-port=9222
// (arrancada por `npm run dev:cdp`).
//
// Modos:
//   node scripts/analizar-perf.mjs              → snapshot puntual + network monitor 30s
//   node scripts/analizar-perf.mjs --watch      → snapshot cada 5s hasta Ctrl+C
//   node scripts/analizar-perf.mjs --screenshot → toma PNG y guarda en scripts/tmp/

import { writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { primeraVentana, conectar } from './cdp-client.mjs';

const AQUI = dirname(fileURLToPath(import.meta.url));

const args = process.argv.slice(2);
const watch = args.includes('--watch');
const soloScreenshot = args.includes('--screenshot');

const fmtBytes = (n) => {
  if (n == null) return '—';
  const mb = n / 1048576;
  return mb >= 1 ? `${mb.toFixed(1)} MB` : `${(n / 1024).toFixed(0)} KB`;
};

async function snapshot(cli) {
  // Métricas de la página
  const { metrics } = await cli.cmd('Performance.getMetrics');
  const m = Object.fromEntries(metrics.map(x => [x.name, x.value]));

  // Memoria JS del renderer
  const jsHeap = await cli.evaluar(`
    (() => {
      const m = performance.memory || {};
      return {
        usado: m.usedJSHeapSize || 0,
        total: m.totalJSHeapSize || 0,
        limite: m.jsHeapSizeLimit || 0,
      };
    })()
  `);

  // Info React / render count si hay
  const react = await cli.evaluar(`
    (() => {
      const root = document.getElementById('root');
      if (!root) return null;
      const contarNodos = (el) => {
        let n = 1;
        for (const c of el.children) n += contarNodos(c);
        return n;
      };
      return {
        nodosRoot: contarNodos(root),
        listeners: (window.getEventListeners ? 'devtools-only' : 'n/a'),
      };
    })()
  `);

  return {
    ts: new Date().toISOString(),
    dom: {
      nodos: m.Nodes || 0,
      listeners: m.JSEventListeners || 0,
      documentos: m.Documents || 0,
    },
    memoria: {
      jsHeapUsado: jsHeap?.usado || 0,
      jsHeapTotal: jsHeap?.total || 0,
      procesoResidente: (m.ProcessMemoryUsage || 0) * 1024, // reportado en KB
    },
    react,
    tiempos: {
      cpuScript: m.ScriptDuration || 0,
      cpuLayout: m.LayoutDuration || 0,
      cpuRecalcStyle: m.RecalcStyleDuration || 0,
    },
  };
}

function imprimirSnapshot(s) {
  console.log(`\n╭─ Snapshot ${s.ts}`);
  console.log(`│ Memoria`);
  console.log(`│   JS heap usado:       ${fmtBytes(s.memoria.jsHeapUsado)}  / total ${fmtBytes(s.memoria.jsHeapTotal)}`);
  console.log(`│ DOM`);
  console.log(`│   Nodos:               ${s.dom.nodos.toLocaleString()}`);
  console.log(`│   Event listeners:     ${s.dom.listeners.toLocaleString()}`);
  console.log(`│   Documentos:          ${s.dom.documentos}`);
  if (s.react?.nodosRoot) {
    console.log(`│   Nodos bajo #root:    ${s.react.nodosRoot.toLocaleString()}`);
  }
  console.log(`│ CPU acumulada`);
  console.log(`│   Script:              ${(s.tiempos.cpuScript * 1000).toFixed(0)} ms`);
  console.log(`│   Layout:              ${(s.tiempos.cpuLayout * 1000).toFixed(0)} ms`);
  console.log(`│   Recalc style:        ${(s.tiempos.cpuRecalcStyle * 1000).toFixed(0)} ms`);
  console.log(`╰─`);
}

async function monitorNetwork(cli, seg = 30) {
  console.log(`\n▶ Escuchando network ${seg}s… (interactúa con la app para ver requests)`);

  await cli.cmd('Network.enable');
  const requests = new Map();
  const resultados = [];

  const offReq = cli.on('Network.requestWillBeSent', (p) => {
    requests.set(p.requestId, { url: p.request.url, method: p.request.method, t0: p.timestamp });
  });
  const offRes = cli.on('Network.responseReceived', (p) => {
    const req = requests.get(p.requestId);
    if (!req) return;
    req.status = p.response.status;
    req.mime = p.response.mimeType;
    req.duracion = (p.timestamp - req.t0) * 1000;
    req.tamano = p.response.encodedDataLength || 0;
  });
  const offFin = cli.on('Network.loadingFinished', (p) => {
    const req = requests.get(p.requestId);
    if (!req) return;
    if (p.encodedDataLength) req.tamano = p.encodedDataLength;
    resultados.push(req);
    requests.delete(p.requestId);
  });

  await new Promise(res => setTimeout(res, seg * 1000));
  offReq(); offRes(); offFin();

  // Filtrar solo API (localhost + no assets)
  const api = resultados
    .filter(r => /localhost.*\/(api|conta-app)/.test(r.url) || /\/api\//.test(r.url))
    .filter(r => !/\.(css|js|png|svg|jpg|woff|woff2)/.test(r.url));

  if (api.length === 0) {
    console.log('  (no hubo llamadas a la API en ese lapso)');
    return;
  }

  // Agrupar por endpoint
  const porEndpoint = new Map();
  for (const r of api) {
    const url = new URL(r.url);
    const clave = `${r.method} ${url.pathname}`;
    if (!porEndpoint.has(clave)) porEndpoint.set(clave, []);
    porEndpoint.get(clave).push(r);
  }

  console.log(`\n╭─ Requests API (${api.length} totales, ${porEndpoint.size} endpoints)`);
  const filas = [];
  for (const [clave, reqs] of porEndpoint) {
    const durs = reqs.map(r => r.duracion || 0);
    const tams = reqs.map(r => r.tamano || 0);
    filas.push({
      endpoint: clave,
      llamadas: reqs.length,
      duracion_prom_ms: Math.round(durs.reduce((a, b) => a + b, 0) / durs.length),
      duracion_max_ms: Math.round(Math.max(...durs)),
      tamano_prom: fmtBytes(tams.reduce((a, b) => a + b, 0) / tams.length),
    });
  }
  filas.sort((a, b) => b.llamadas - a.llamadas);

  const anchoEnd = Math.max(...filas.map(f => f.endpoint.length), 20);
  console.log(`│ ${'Endpoint'.padEnd(anchoEnd)}  ${'#'.padStart(4)}  ${'prom'.padStart(8)}  ${'max'.padStart(8)}  ${'tamaño'.padStart(9)}`);
  for (const f of filas) {
    console.log(`│ ${f.endpoint.padEnd(anchoEnd)}  ${String(f.llamadas).padStart(4)}  ${(f.duracion_prom_ms + 'ms').padStart(8)}  ${(f.duracion_max_ms + 'ms').padStart(8)}  ${f.tamano_prom.padStart(9)}`);
  }
  console.log(`╰─`);

  // Alertas
  const duplicadas = filas.filter(f => f.llamadas >= 5);
  if (duplicadas.length > 0) {
    console.log('\n⚠ Endpoints con muchas llamadas — posible falta de caché o loop:');
    for (const d of duplicadas) console.log(`   · ${d.endpoint} × ${d.llamadas}`);
  }
  const lentas = filas.filter(f => f.duracion_max_ms > 500);
  if (lentas.length > 0) {
    console.log('\n⚠ Endpoints lentos (>500ms):');
    for (const l of lentas) console.log(`   · ${l.endpoint}: max ${l.duracion_max_ms}ms`);
  }
}

(async () => {
  console.log('▶ Conectando a la app en 127.0.0.1:9444…');
  const pagina = await primeraVentana({ tituloContiene: 'Conta' });
  console.log(`✓ Conectado: ${pagina.title}`);
  const cli = await conectar(pagina);
  await cli.cmd('Performance.enable');

  if (soloScreenshot) {
    const png = await cli.screenshot();
    mkdirSync(join(AQUI, 'tmp'), { recursive: true });
    const out = join(AQUI, 'tmp', `snap-${Date.now()}.png`);
    writeFileSync(out, png);
    console.log(`✓ Screenshot en ${out}`);
    cli.cerrar();
    return;
  }

  if (watch) {
    console.log('Modo watch — snapshot cada 5s. Ctrl+C para salir.');
    while (true) {
      imprimirSnapshot(await snapshot(cli));
      await new Promise(res => setTimeout(res, 5000));
    }
  }

  imprimirSnapshot(await snapshot(cli));
  await monitorNetwork(cli, 30);
  imprimirSnapshot(await snapshot(cli));
  cli.cerrar();
})().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
