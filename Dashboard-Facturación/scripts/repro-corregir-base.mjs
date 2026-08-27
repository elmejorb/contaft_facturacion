// Reproduce el bug del botón "Corregir base": login + navegar a Caja Registradora
// + capturar consola + clickear el botón y ver qué explota.
import { primeraVentana, conectar } from './cdp-client.mjs';

const wait = (ms) => new Promise(r => setTimeout(r, ms));

const cli = await conectar(await primeraVentana({ tituloContiene: 'Conta' }));
await cli.cmd('Runtime.enable');
await cli.cmd('Log.enable');

// Capturar errores runtime y logs
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

// Login si estamos en login
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
      setV(usu, 'juan'); setV(pass, '123');
      const btn = Array.from(document.querySelectorAll('button')).find(b => /ingresar|iniciar|login|entrar/i.test(b.textContent || ''));
      btn?.click();
    })()
  `);
  await wait(5000);
}

console.log('▶ Navegando a Movimientos → Caja...');
// El sidebar tiene "Movimientos" que despliega submenús. Voy a expandirlo primero.
await cli.evaluar(`
  (() => {
    const btns = Array.from(document.querySelectorAll('button'));
    const mov = btns.find(b => b.textContent.trim() === 'Movimientos');
    if (mov) mov.click();
  })()
`);
await wait(1000);

// Ahora click en "Caja" o "Caja Registradora"
const clickCaja = await cli.evaluar(`
  (() => {
    const btns = Array.from(document.querySelectorAll('button, a, [role="button"]'));
    const c = btns.find(b => {
      const t = (b.textContent || '').trim();
      return t === 'Caja' || t === 'Caja Registradora' || t === 'Registradora';
    });
    if (c) { c.click(); return true; }
    return false;
  })()
`);
console.log('  click Caja:', clickCaja);
await wait(4000);

// Ver qué está renderizado
const stateCaja = await cli.evaluar(`
  (() => {
    const h1 = document.querySelector('h1, h2');
    return {
      titulo: h1?.textContent?.trim(),
      hayBotonCorregir: !!Array.from(document.querySelectorAll('button')).find(b => (b.textContent || '').includes('Corregir base')),
    };
  })()
`);
console.log('  Caja Registradora:', stateCaja);

if (!stateCaja.hayBotonCorregir) {
  console.log('  ⚠ no encuentro el botón. Errores hasta ahora:');
  for (const e of errores) console.log('   ·', JSON.stringify(e).slice(0, 300));
  cli.cerrar();
  process.exit(0);
}

// Limpiar errores previos para capturar solo los del click
errores.length = 0;

console.log('\n▶ Clickeando "Corregir base"...');
await cli.evaluar(`
  (() => {
    const b = Array.from(document.querySelectorAll('button')).find(x => (x.textContent || '').includes('Corregir base'));
    if (b) b.click();
    return !!b;
  })()
`);
await wait(2500);

// Estado post-click
const post = await cli.evaluar(`
  (() => {
    const modales = document.querySelectorAll('[style*="fixed"][style*="inset: 0"]');
    const h1 = document.querySelector('h1, h2');
    const rootHijos = document.getElementById('root')?.children?.length || 0;
    return {
      modales: modales.length,
      titulo: h1?.textContent?.trim(),
      rootHijos,
      bodyBlanco: document.body.textContent.trim().length < 20,
      firstChars: document.body.innerText?.slice(0, 200),
    };
  })()
`);
console.log('  Post-click:', post);

console.log('\n▶ Errores capturados tras el click:');
if (errores.length === 0) console.log('  (ninguno)');
for (const e of errores) console.log('  ·', JSON.stringify(e).slice(0, 400));

cli.cerrar();
