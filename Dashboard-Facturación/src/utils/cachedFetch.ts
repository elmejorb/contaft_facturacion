// Cache TTL en sessionStorage para endpoints GET que se re-montan
// frecuentemente (paneles del Dashboard, notificaciones, etc.)
//
// Uso:
//   const data = await cachedFetch(URL, { ttlMs: 60_000 })
//   const data = await cachedFetch(URL, { ttlMs: 60_000, forceFresh: true })
//
// Solo cachea 200 OK con JSON. Cualquier error refetch.

type Opciones = {
  ttlMs?: number;
  forceFresh?: boolean;
  init?: RequestInit;
};

const PREFIJO = '__cf__';

function keyDe(url: string) {
  return PREFIJO + url;
}

export async function cachedFetch<T = any>(url: string, opts: Opciones = {}): Promise<T> {
  const { ttlMs = 60_000, forceFresh = false, init } = opts;
  const key = keyDe(url);

  if (!forceFresh) {
    try {
      const raw = sessionStorage.getItem(key);
      if (raw) {
        const { data, ts } = JSON.parse(raw);
        if (Date.now() - ts < ttlMs) return data as T;
      }
    } catch { /* cache corrupto → ignorar */ }
  }

  const r = await fetch(url, init);
  if (!r.ok) throw new Error(`${r.status} ${r.statusText}`);
  const data = await r.json();

  try {
    sessionStorage.setItem(key, JSON.stringify({ data, ts: Date.now() }));
  } catch { /* quota lleno → ignorar, la próxima refetchará */ }

  return data as T;
}

// Invalidar manualmente (después de un POST que cambie datos)
export function invalidarCache(url: string) {
  try { sessionStorage.removeItem(keyDe(url)); } catch { /* ignore */ }
}

// Invalidar todo lo que matchee un patrón (ej: todos los endpoints de inicio)
export function invalidarPatron(patron: string | RegExp) {
  try {
    const re = typeof patron === 'string' ? new RegExp(patron) : patron;
    const claves = [];
    for (let i = 0; i < sessionStorage.length; i++) {
      const k = sessionStorage.key(i);
      if (k?.startsWith(PREFIJO) && re.test(k.slice(PREFIJO.length))) claves.push(k);
    }
    for (const k of claves) sessionStorage.removeItem(k);
  } catch { /* ignore */ }
}
