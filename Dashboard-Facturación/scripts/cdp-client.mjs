// Cliente CDP mínimo — sin dependencias. Requiere Node 22+ (WebSocket global).
// Se usa desde probar-app.mjs y analizar-perf.mjs.

const DEBUG_HOST = '127.0.0.1';
// 9444 — evita colisión con Present Innova (9333) y otras apps Electron
// del usuario que ya corren con --remote-debugging-port por defecto.
const DEBUG_PORT = 9444;

export const cdpUrl = (path = '/json/list') => `http://${DEBUG_HOST}:${DEBUG_PORT}${path}`;

// Lista las páginas (una por BrowserWindow). Reintenta hasta que aparezcan.
export async function listarPaginas({ intentos = 40, esperaMs = 500 } = {}) {
  for (let i = 0; i < intentos; i++) {
    try {
      const r = await fetch(cdpUrl('/json/list'));
      if (r.ok) {
        const paginas = await r.json();
        const pages = paginas.filter(p => p.type === 'page');
        if (pages.length > 0) return pages;
      }
    } catch { /* aún no arrancó */ }
    await new Promise(res => setTimeout(res, esperaMs));
  }
  throw new Error(`No apareció ninguna página CDP en ${DEBUG_HOST}:${DEBUG_PORT}`);
}

// Conecta al WebSocket de una página y devuelve un objeto con .cmd() y .close()
export async function conectar(pagina) {
  const ws = new WebSocket(pagina.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => {
    ws.addEventListener('open', resolve, { once: true });
    ws.addEventListener('error', reject, { once: true });
  });

  let siguienteId = 1;
  const pendientes = new Map();
  const listenersEvento = new Map();

  ws.addEventListener('message', (ev) => {
    const msg = JSON.parse(ev.data);
    if (msg.id && pendientes.has(msg.id)) {
      const { resolve, reject } = pendientes.get(msg.id);
      pendientes.delete(msg.id);
      if (msg.error) reject(new Error(`${msg.error.code}: ${msg.error.message}`));
      else resolve(msg.result);
    } else if (msg.method) {
      const listeners = listenersEvento.get(msg.method);
      if (listeners) for (const cb of listeners) cb(msg.params);
    }
  });

  return {
    // Envía un comando CDP y espera la respuesta
    async cmd(method, params = {}) {
      const id = siguienteId++;
      return new Promise((resolve, reject) => {
        pendientes.set(id, { resolve, reject });
        ws.send(JSON.stringify({ id, method, params }));
      });
    },
    // Suscribirse a eventos CDP (p.ej. Network.responseReceived)
    on(evento, callback) {
      if (!listenersEvento.has(evento)) listenersEvento.set(evento, new Set());
      listenersEvento.get(evento).add(callback);
      return () => listenersEvento.get(evento).delete(callback);
    },
    // Ejecuta JS en la página y devuelve el valor (serializado)
    async evaluar(expresion) {
      const r = await this.cmd('Runtime.evaluate', {
        expression: expresion, returnByValue: true, awaitPromise: true,
      });
      if (r.exceptionDetails) throw new Error(r.exceptionDetails.text);
      return r.result?.value;
    },
    // Captura de pantalla — devuelve Buffer PNG
    async screenshot() {
      const r = await this.cmd('Page.captureScreenshot', { format: 'png' });
      return Buffer.from(r.data, 'base64');
    },
    cerrar() { ws.close(); },
  };
}

// Encuentra la ventana principal por título parcial (opcional)
export async function primeraVentana({ tituloContiene } = {}) {
  const pages = await listarPaginas();
  if (tituloContiene) {
    const m = pages.find(p => p.title.toLowerCase().includes(tituloContiene.toLowerCase()));
    if (m) return m;
  }
  return pages[0];
}
