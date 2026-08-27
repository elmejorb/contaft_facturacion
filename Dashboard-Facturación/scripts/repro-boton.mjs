// Asume que el usuario ya está logueado y en la app.
// Navega a Caja Registradora, clickea "Corregir base" y captura el error.
import { primeraVentana, conectar } from './cdp-client.mjs';

const wait = (ms) => new Promise(r => setTimeout(r, ms));
const cli = await conectar(await primeraVentana({ tituloContiene: 'Conta' }));
await cli.cmd('Runtime.enable');
await cli.cmd('Log.enable');

const errores = [];
cli.on('Runtime.exceptionThrown', (p) => {
  errores.push({ tipo: 'exception', text: p.exceptionDetails?.text, stack: p.exceptionDetails?.exception?.description });
});
cli.on('Runtime.consoleAPICalled', (p) => {
  if (['error', 'warning'].includes(p.type)) {
    errores.push({ tipo: 'console.' + p.type, args: p.args?.map(a => a.value ?? a.description).join(' ') });
  }
});
cli.on('Log.entryAdded', (p) => {
  if (['error', 'warning'].includes(p.entry?.level)) {
    errores.push({ tipo: 'log.' + p.entry.level, text: p.entry.text, url: p.entry.url });
  }
});

// Ver estado actual
const inicial = await cli.evaluar(`
  (() => {
    const h1 = document.querySelector('h1, h2');
    const btns = Array.from(document.querySelectorAll('button')).map(b => (b.textContent || '').trim()).filter(t => t.length > 0 && t.length < 60);
    return { titulo: h1?.textContent?.trim(), botones: btns.slice(0, 40) };
  })()
`);
console.log('Estado actual:');
console.log('  Título:', inicial.titulo);
console.log('  Botones:', JSON.stringify(inicial.botones, null, 2));

// Buscar botón "Corregir base"
let hayCorregir = inicial.botones.some(b => b.includes('Corregir base'));
if (!hayCorregir) {
  console.log('\n▶ Navegando a Movimientos → Caja...');
  await cli.evaluar(`
    (() => {
      const mov = Array.from(document.querySelectorAll('button')).find(b => b.textContent.trim() === 'Movimientos');
      mov?.click();
    })()
  `);
  await wait(700);
  await cli.evaluar(`
    (() => {
      const c = Array.from(document.querySelectorAll('button, a, [role="button"]')).find(b => {
        const t = (b.textContent || '').trim();
        return t === 'Caja' || t.startsWith('Caja Registradora') || t === 'Registradora';
      });
      c?.click();
    })()
  `);
  await wait(3500);
  const chk = await cli.evaluar(`Array.from(document.querySelectorAll('button')).some(b => (b.textContent||'').includes('Corregir base'))`);
  hayCorregir = chk;
  console.log('  Tras navegar, botón presente:', hayCorregir);
}
if (!hayCorregir) {
  console.log('\n⚠ No se encontró el botón Corregir base.');
  cli.cerrar();
  process.exit(0);
}

console.log('\n▶ Clickeando "Corregir base"...');
errores.length = 0;
await cli.evaluar(`
  (() => {
    const b = Array.from(document.querySelectorAll('button')).find(x => (x.textContent || '').includes('Corregir base'));
    if (b) b.click();
    return !!b;
  })()
`);
await wait(2500);

const post = await cli.evaluar(`
  (() => {
    return {
      totalNodos: document.querySelectorAll('*').length,
      bodyTexto: document.body.innerText?.slice(0, 300),
      hayModal: !!document.querySelector('[role="dialog"], [style*="rgba(0,0,0"]'),
      rootHijos: document.getElementById('root')?.children?.length || 0,
    };
  })()
`);
console.log('Post-click:');
console.log('  totalNodos:', post.totalNodos);
console.log('  rootHijos:', post.rootHijos);
console.log('  hayModal:', post.hayModal);
console.log('  bodyTexto:', post.bodyTexto);

console.log('\n▶ Errores capturados tras el click:');
if (errores.length === 0) console.log('  (ninguno)');
for (const e of errores) console.log('  ·', JSON.stringify(e).slice(0, 500));

cli.cerrar();
