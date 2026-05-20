/**
 * Configuración centralizada de la API
 *
 * En Electron: lee/escribe config.json junto al .exe via IPC
 * En navegador: usa localStorage como fallback
 * En desarrollo: usa VITE_API_URL del .env
 */

const LS_KEY = 'api_server_url';
const DEFAULT_URL = import.meta.env.VITE_API_URL || 'http://localhost:80/conta-app-backend/api';

// Patrón hardcodeado que los componentes legacy aún usan. El interceptor
// reescribe estas URLs al apiUrl configurado en config.json.
const HARDCODED_BASE = 'http://localhost:80/conta-app-backend/api';

// Detectar si estamos en Electron
const isElectron = typeof window !== 'undefined' && !!(window as any).require;

let _ipcRenderer: any = null;
if (isElectron) {
  try {
    _ipcRenderer = (window as any).require('electron').ipcRenderer;
  } catch (e) {}
}

// Cache en memoria. En Electron se llena desde config.json en loadConfigFromFile().
// En navegador se llena desde localStorage. Es el ÚNICO fuente de verdad para getApiUrl().
let _cachedUrl: string | null = null;
let _configLoaded = false;

/**
 * Lee la URL de la API
 * - Electron: del config.json (vive junto al .exe → único por instalación)
 * - Navegador: de localStorage
 *
 * Importante: en Electron NO se usa localStorage. Dos instalaciones del mismo
 * app comparten el mismo localStorage (depende de productName), así que usarlo
 * causa que una instalación pise la config de la otra.
 */
export function getApiUrl(): string {
  if (_cachedUrl) return _cachedUrl;

  // En navegador: localStorage es la fuente
  if (!isElectron) {
    const saved = localStorage.getItem(LS_KEY);
    if (saved) {
      _cachedUrl = saved;
      return saved;
    }
  }

  return DEFAULT_URL;
}

/**
 * Guarda la URL de la API
 * - Electron: solo en config.json
 * - Navegador: en localStorage
 */
export async function setApiUrl(url: string) {
  _cachedUrl = url;

  if (_ipcRenderer) {
    try {
      await _ipcRenderer.invoke('config:write', { apiUrl: url });
    } catch (e) {
      console.error('Error writing config file:', e);
    }
  } else {
    localStorage.setItem(LS_KEY, url);
  }
}

/**
 * Verifica si ya hay un servidor configurado
 * - Electron: después de loadConfigFromFile, hay URL en _cachedUrl si config.json lo tenía
 * - Navegador: revisa localStorage
 */
export function isApiConfigured(): boolean {
  if (isElectron) return !!_cachedUrl;
  return !!localStorage.getItem(LS_KEY);
}

/**
 * Indica si el config ya se cargó desde disco. App.tsx debe bloquear
 * el render hasta que esto sea true para evitar que componentes hagan
 * fetch con la URL DEFAULT antes de leer config.json.
 */
export function isConfigLoaded(): boolean {
  return _configLoaded;
}

/**
 * Carga la config desde el archivo JSON (solo Electron)
 * Se llama una vez al inicio de la app
 */
export async function loadConfigFromFile(): Promise<void> {
  if (!_ipcRenderer) { _configLoaded = true; return; }
  try {
    const config = await _ipcRenderer.invoke('config:read');
    if (config?.apiUrl) {
      _cachedUrl = config.apiUrl;
    }
  } catch (e) {
    console.error('Error reading config file:', e);
  } finally {
    _configLoaded = true;
  }
}

/**
 * Reescribe una URL para que use el apiUrl configurado en lugar del hardcoded.
 * Cubre tanto el patrón canónico (http://localhost:80/conta-app-backend/api)
 * como variantes sin puerto explícito.
 */
function rewriteUrl(url: string): string {
  const base = getApiUrl();
  if (url.startsWith(HARDCODED_BASE)) {
    return base + url.slice(HARDCODED_BASE.length);
  }
  // Variante sin :80 explícito
  const noPort = 'http://localhost/conta-app-backend/api';
  if (url.startsWith(noPort)) {
    return base + url.slice(noPort.length);
  }
  return url;
}

let _fetchInterceptorInstalled = false;

/**
 * Intercepta window.fetch y window.XMLHttpRequest para reescribir URLs
 * hardcodeadas que apuntan al backend. Es un workaround temporal mientras
 * los ~90 componentes que llaman fetch() con URLs hardcodeadas se refactorizan
 * para usar getApiUrl(). Llamar UNA vez al inicio de la app, antes del render.
 */
export function installFetchInterceptor(): void {
  if (_fetchInterceptorInstalled) return;
  _fetchInterceptorInstalled = true;

  const origFetch = window.fetch.bind(window);
  window.fetch = function (input: RequestInfo | URL, init?: RequestInit) {
    if (typeof input === 'string') {
      return origFetch(rewriteUrl(input), init);
    }
    if (input instanceof URL) {
      return origFetch(rewriteUrl(input.toString()), init);
    }
    if (input instanceof Request) {
      const newUrl = rewriteUrl(input.url);
      if (newUrl !== input.url) {
        return origFetch(new Request(newUrl, input), init);
      }
    }
    return origFetch(input, init);
  };

  // XMLHttpRequest — por si alguna lib (axios incluido en algunos casos) lo usa
  const OrigOpen = window.XMLHttpRequest.prototype.open;
  window.XMLHttpRequest.prototype.open = function (
    method: string,
    url: string | URL,
    async?: boolean,
    user?: string | null,
    password?: string | null
  ): void {
    const urlStr = typeof url === 'string' ? url : url.toString();
    const newUrl = rewriteUrl(urlStr);
    return OrigOpen.call(this, method, newUrl, async ?? true, user, password);
  } as typeof XMLHttpRequest.prototype.open;

  // window.open — para previews de PDF y similares que abren ventana nueva
  const OrigWindowOpen = window.open.bind(window);
  window.open = function (
    url?: string | URL,
    target?: string,
    features?: string
  ): Window | null {
    if (url) {
      const urlStr = typeof url === 'string' ? url : url.toString();
      return OrigWindowOpen(rewriteUrl(urlStr), target, features);
    }
    return OrigWindowOpen(url, target, features);
  } as typeof window.open;
}

/**
 * Lee toda la configuración del archivo
 */
export async function readFullConfig(): Promise<any> {
  if (_ipcRenderer) {
    try {
      return await _ipcRenderer.invoke('config:read');
    } catch (e) {}
  }
  // Fallback: reconstruir desde localStorage
  return { apiUrl: getApiUrl() };
}

/**
 * Escribe configuración adicional al archivo
 */
export async function writeConfig(data: Record<string, any>): Promise<boolean> {
  if (_ipcRenderer) {
    try {
      return await _ipcRenderer.invoke('config:write', data);
    } catch (e) {}
  }
  // Fallback: localStorage
  Object.entries(data).forEach(([k, v]) => localStorage.setItem(`config_${k}`, JSON.stringify(v)));
  return true;
}

/**
 * Obtiene la ruta del archivo de configuración (solo Electron)
 */
export async function getConfigFilePath(): Promise<string> {
  if (_ipcRenderer) {
    try {
      return await _ipcRenderer.invoke('config:getPath');
    } catch (e) {}
  }
  return 'localStorage (navegador)';
}

/**
 * Prueba la conexión con el servidor
 */
export async function testConnection(url: string): Promise<{ success: boolean; message: string }> {
  try {
    const r = await fetch(`${url}/auth/login.php`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: '', password: '' }),
      signal: AbortSignal.timeout(5000)
    });
    if (r.status) return { success: true, message: 'Conexión exitosa' };
    return { success: false, message: 'Sin respuesta' };
  } catch (e: any) {
    if (e.name === 'TimeoutError') return { success: false, message: 'Tiempo de espera agotado' };
    return { success: false, message: 'No se pudo conectar: ' + (e.message || 'Error desconocido') };
  }
}
