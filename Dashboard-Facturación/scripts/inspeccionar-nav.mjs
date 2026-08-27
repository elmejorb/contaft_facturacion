// Inspecciona la estructura DOM actual para saber cómo navegar programáticamente.
import { primeraVentana, conectar } from './cdp-client.mjs';

const cli = await conectar(await primeraVentana({ tituloContiene: 'Conta' }));

const info = await cli.evaluar(`
  (() => {
    const clickeables = document.querySelectorAll('button, a, [role="button"], [onclick]');
    const items = [];
    clickeables.forEach(el => {
      const tag = el.tagName.toLowerCase();
      const txt = (el.textContent || '').trim().slice(0, 60);
      const cls = String(el.className || '').slice(0, 80);
      const aria = el.getAttribute('aria-label') || '';
      if (txt || aria) items.push({ tag, txt, cls, aria });
    });
    return items.slice(0, 80);
  })()
`);

for (const i of info) {
  console.log(i.tag.padEnd(6) + ' | "' + i.txt.padEnd(40).slice(0,40) + '" | aria="' + i.aria.slice(0,20).padEnd(20) + '" | class="' + i.cls.slice(0,40) + '"');
}

cli.cerrar();
