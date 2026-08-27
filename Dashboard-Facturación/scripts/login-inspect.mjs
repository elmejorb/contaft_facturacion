// Login + inspección del dashboard en un solo run.
import { primeraVentana, conectar } from './cdp-client.mjs';

const wait = (ms) => new Promise(r => setTimeout(r, ms));

const cli = await conectar(await primeraVentana({ tituloContiene: 'Conta' }));

// Ver estado actual: hay input password? entonces está en login
const enLogin = await cli.evaluar(`document.querySelectorAll('input[type="password"]').length > 0`);
console.log('En login:', enLogin);

if (enLogin) {
  console.log('▶ Haciendo login root/elmejorb...');
  await cli.evaluar(`
    (() => {
      const setNative = (el, val) => {
        const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
        setter.call(el, val);
        el.dispatchEvent(new Event('input', { bubbles: true }));
      };
      const inputs = document.querySelectorAll('input');
      const usu = Array.from(inputs).find(i => i.type !== 'password' && i.type !== 'hidden');
      const pass = document.querySelector('input[type="password"]');
      if (usu) setNative(usu, 'root');
      if (pass) setNative(pass, 'elmejorb');
    })()
  `);
  await wait(400);

  // Buscar botón submit
  await cli.evaluar(`
    (() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const submit = btns.find(b => /ingresar|iniciar|login|entrar/i.test(b.textContent || ''));
      if (submit) submit.click();
      return { clicked: !!submit, texto: submit?.textContent };
    })()
  `);
  await wait(5000);
}

// Inspeccionar DOM actual
const nav = await cli.evaluar(`
  (() => {
    const clickeables = document.querySelectorAll('button, a, [role="button"], [onclick]');
    return Array.from(clickeables).slice(0, 100).map(el => ({
      tag: el.tagName.toLowerCase(),
      txt: (el.textContent || '').trim().slice(0, 50),
      cls: String(el.className || '').slice(0, 60),
    }));
  })()
`);

console.log('\nElementos clickeables (' + nav.length + '):');
for (const i of nav) {
  if (i.txt) console.log(i.tag.padEnd(6) + ' | ' + i.txt.padEnd(45).slice(0,45) + ' | ' + i.cls.slice(0,50));
}

// Info del root
const root = await cli.evaluar(`
  (() => {
    const r = document.getElementById('root');
    const total = document.querySelectorAll('*').length;
    return { rootHijos: r ? r.children.length : 0, totalNodos: total };
  })()
`);
console.log('\nEstado DOM:', root);

cli.cerrar();
