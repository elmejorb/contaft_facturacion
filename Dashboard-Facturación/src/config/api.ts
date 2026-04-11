/**
 * Configuración centralizada de la API
 *
 * En Electron: lee/escribe config.json junto al .exe via IPC
 * En navegador: usa localStorage como fallback
 * En desarrollo: usa VITE_API_URL del .env
 */

const LS_KEY = 'api_server_url';
const DEFAULT_URL = import.meta.env.VITE_API_URL || 'http://localhost:80/conta-app-backend/api';

// Detectar si estamos en Electron
const isElectron = typeof window !== 'undefined' && !!(window as any).require;

let _ipcRenderer: any = null;
if (isElectron) {
  try {
    _ipcRenderer = (window as any).require('electron').ipcRenderer;
  } catch (e) {}
}

// Cache en memoria para no leer el archivo cada vez
let _cachedUrl: string | null = null;

/**
 * Lee la URL de la API
 * - Electron: del config.json
 * - Navegador: de localStorage
 */
export function getApiUrl(): string {
  if (_cachedUrl) return _cachedUrl;

  // Intentar leer de localStorage primero (funciona en ambos)
  const saved = localStorage.getItem(LS_KEY);
  if (saved) {
    _cachedUrl = saved;
    return saved;
  }

  return DEFAULT_URL;
}

/**
 * Guarda la URL de la API
 * - Electron: en config.json + localStorage
 * - Navegador: solo en localStorage
 */
export async function setApiUrl(url: string) {
  _cachedUrl = url;
  localStorage.setItem(LS_KEY, url);

  // Si es Electron, también guardar en config.json
  if (_ipcRenderer) {
    try {
      await _ipcRenderer.invoke('config:write', { apiUrl: url });
    } catch (e) {
      console.error('Error writing config file:', e);
    }
  }
}

/**
 * Verifica si ya hay un servidor configurado
 */
export function isApiConfigured(): boolean {
  return !!localStorage.getItem(LS_KEY);
}

/**
 * Carga la config desde el archivo JSON (solo Electron)
 * Se llama una vez al inicio de la app
 */
export async function loadConfigFromFile(): Promise<void> {
  if (!_ipcRenderer) return;
  try {
    const config = await _ipcRenderer.invoke('config:read');
    if (config?.apiUrl) {
      _cachedUrl = config.apiUrl;
      localStorage.setItem(LS_KEY, config.apiUrl);
    }
  } catch (e) {
    console.error('Error reading config file:', e);
  }
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
