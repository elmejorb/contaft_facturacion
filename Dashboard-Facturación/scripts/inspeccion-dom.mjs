// Analiza QUÉ componentes están acumulados en el DOM al final del tour.
import { primeraVentana, conectar } from './cdp-client.mjs';

const cli = await conectar(await primeraVentana({ tituloContiene: 'Conta' }));

const info = await cli.evaluar(`
  (() => {
    const total = document.querySelectorAll('*').length;
    const stats = {
      total,
      body_hijos_directos: document.body.children.length,
      portals: document.querySelectorAll('[data-radix-portal], [data-radix-popper-content-wrapper]').length,
      toasts: document.querySelectorAll('[class*="toast"], [class*="Toaster"], [data-sonner-toast]').length,
      modales: document.querySelectorAll('[role="dialog"], [data-radix-dialog-content], [aria-modal="true"]').length,
      selectRadix: document.querySelectorAll('[data-radix-select-content], [data-radix-select-viewport]').length,
      popovers: document.querySelectorAll('[data-radix-popover-content], [data-radix-hover-card-content]').length,
      overlays: document.querySelectorAll('[data-radix-focus-guard]').length,
      ariaHidden: document.querySelectorAll('[aria-hidden="true"]').length,
      scriptTags: document.querySelectorAll('script').length,
      styleTags: document.querySelectorAll('style').length,
      // Contar divs directos hijos de body
    };
    // Info de hijos de body
    const bodyHijos = Array.from(document.body.children).map((el, i) => ({
      i, tag: el.tagName, id: el.id, cls: String(el.className || '').slice(0, 60),
      hijos_recursivos: el.querySelectorAll('*').length,
    }));
    return { stats, bodyHijos };
  })()
`);

console.log('╭─ DOM total: ' + info.stats.total + ' nodos');
console.log('│');
console.log('│ Hijos directos de <body>: ' + info.stats.body_hijos_directos);
for (const h of info.bodyHijos) {
  console.log(`│   [${h.i}] <${h.tag} id="${h.id}" class="${h.cls}"> — ${h.hijos_recursivos} nodos`);
}
console.log('│');
console.log('│ Detalles por categoría:');
console.log(`│   Radix portals:      ${info.stats.portals}`);
console.log(`│   Toasts:             ${info.stats.toasts}`);
console.log(`│   Modales (dialog):   ${info.stats.modales}`);
console.log(`│   Radix Selects:      ${info.stats.selectRadix}`);
console.log(`│   Radix Popovers:     ${info.stats.popovers}`);
console.log(`│   Focus guards:       ${info.stats.overlays}`);
console.log(`│   aria-hidden=true:   ${info.stats.ariaHidden}`);
console.log(`│   <script>:           ${info.stats.scriptTags}`);
console.log(`│   <style>:            ${info.stats.styleTags}`);
console.log('╰─');

// Ver los primeros N nodos con más profundidad
const top = await cli.evaluar(`
  (() => {
    const nodos = document.querySelectorAll('*');
    // Buscar nodos con muchos hijos
    const conteo = [];
    for (const n of nodos) {
      const total = n.querySelectorAll('*').length;
      if (total > 30) {
        conteo.push({ tag: n.tagName, id: n.id, cls: String(n.className || '').slice(0, 60), total });
      }
    }
    return conteo.slice(0, 20);
  })()
`);
console.log('\nNodos con >30 descendientes:');
for (const t of top) console.log(`  <${t.tag} id="${t.id}" class="${t.cls}"> — ${t.total}`);

cli.cerrar();
