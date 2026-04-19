const { app, BrowserWindow, globalShortcut, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const http = require('http');
const https = require('https');
const { URL } = require('url');

// Hot reload en desarrollo
if (process.env.NODE_ENV === 'development') {
  try {
    require('electron-reload')(__dirname, {
      electron: path.join(__dirname, '..', 'node_modules', '.bin', 'electron'),
      hardResetMethod: 'exit'
    });
  } catch (err) {
    console.log('Error loading electron-reload:', err);
  }
}

// ============================================================
// Auto-updater (solo producción). Falla silenciosa si no hay red.
// Valida suscripción activa contra API de Innovación Digital antes
// de permitir la descarga.
// ============================================================
const SUBS_API_BASE = 'https://crm.innovacion-digital.com/api/public/api/v1';
const SUBS_CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 días de gracia offline
const ESTADOS_PERMITIDOS = ['activa', 'prueba', 'por_vencer'];

function httpGetJson(url, timeoutMs = 10000) {
  return new Promise((resolve, reject) => {
    const client = new URL(url).protocol === 'https:' ? https : http;
    const req = client.get(url, { headers: { Accept: 'application/json' } }, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, body: data ? JSON.parse(data) : null });
        } catch (e) {
          reject(new Error('JSON inválido: ' + String(data).slice(0, 200)));
        }
      });
    });
    req.on('error', reject);
    req.setTimeout(timeoutMs, () => req.destroy(new Error('Timeout')));
  });
}

async function getApiTokenFromBackend() {
  const cfg = readConfig();
  const apiUrl = cfg.apiUrl;
  if (!apiUrl) return { ok: false, reason: 'no-api-url' };
  try {
    const url = `${apiUrl.replace(/\/$/, '')}/empresa/datos.php`;
    const { body } = await httpGetJson(url, 8000);
    const token = body?.empresa?.api_token;
    if (!token) return { ok: false, reason: 'token-vacio' };
    return { ok: true, token };
  } catch (e) {
    return { ok: false, reason: 'backend-inaccesible', message: e?.message };
  }
}

async function validateSubscription() {
  if (process.env.NODE_ENV === 'development') {
    return { allowed: false, reason: 'dev', message: 'Modo desarrollo — sin validación' };
  }
  const cfg = readConfig();

  const tokenResult = await getApiTokenFromBackend();
  if (!tokenResult.ok) {
    // Sin backend local → usar caché si es reciente
    const cache = cfg._subscription_cache;
    if (cache && typeof cache.checked_at === 'number' && (Date.now() - cache.checked_at) < SUBS_CACHE_TTL_MS) {
      return { allowed: !!cache.allowed, estado: cache.estado, cached: true };
    }
    return { allowed: false, reason: tokenResult.reason, message: tokenResult.message || 'No se pudo obtener el api_token del backend' };
  }
  const token = tokenResult.token;
  if (String(token).length < 10) {
    return { allowed: false, reason: 'token-invalido', message: 'api_token inválido en tbldatosempresa' };
  }

  const url = `${SUBS_API_BASE}/consulta-plan/${encodeURIComponent(token)}`;

  try {
    const { body } = await httpGetJson(url);
    if (body?.code === 'OK' && body?.data?.suscripcion) {
      const estado = body.data.suscripcion.estado;
      const allowed = ESTADOS_PERMITIDOS.includes(estado);
      writeConfig({
        _subscription_cache: {
          allowed,
          estado,
          checked_at: Date.now(),
          empresa: body.data.cliente?.empresa,
          fecha_fin: body.data.suscripcion?.fecha_fin,
          dias_restantes: body.data.suscripcion?.dias_restantes,
          plan_nombre: body.data.plan?.nombre,
        },
      });
      return { allowed, estado, data: body.data };
    }
    if (body?.code === 'SIN_PLAN') {
      writeConfig({ _subscription_cache: { allowed: false, estado: 'sin_plan', checked_at: Date.now() } });
      return { allowed: false, reason: 'sin-plan', message: 'El cliente no tiene suscripción activa' };
    }
    if (body?.code === 'TOKEN_NO_ENCONTRADO' || body?.code === 'TOKEN_INVALIDO') {
      return { allowed: false, reason: 'token-invalido', message: 'Token de consulta inválido' };
    }
    return { allowed: false, reason: 'respuesta-inesperada', message: body?.message || 'Respuesta no reconocida' };
  } catch (e) {
    // Sin red → usar caché si es reciente (tolerancia offline)
    const cache = cfg._subscription_cache;
    if (cache && typeof cache.checked_at === 'number' && (Date.now() - cache.checked_at) < SUBS_CACHE_TTL_MS) {
      return { allowed: !!cache.allowed, estado: cache.estado, cached: true };
    }
    return { allowed: false, reason: 'sin-red', message: e?.message || 'No se pudo contactar el servidor de suscripciones' };
  }
}

let autoUpdater = null;
if (process.env.NODE_ENV !== 'development') {
  try {
    autoUpdater = require('electron-updater').autoUpdater;
    autoUpdater.autoDownload = true;
    autoUpdater.autoInstallOnAppQuit = true;

    autoUpdater.on('error', (err) => {
      console.error('[updater] error:', err?.message || err);
    });
    autoUpdater.on('update-available', (info) => {
      console.log('[updater] update disponible:', info?.version);
      if (mainWindow) mainWindow.webContents.send('updater:available', info);
    });
    autoUpdater.on('update-not-available', () => {
      console.log('[updater] ya estás en la última versión');
    });
    autoUpdater.on('download-progress', (p) => {
      if (mainWindow) mainWindow.webContents.send('updater:progress', p);
    });
    autoUpdater.on('update-downloaded', (info) => {
      console.log('[updater] descargada:', info?.version);
      if (mainWindow) mainWindow.webContents.send('updater:downloaded', info);
    });
  } catch (e) {
    console.warn('[updater] electron-updater no disponible:', e?.message);
    autoUpdater = null;
  }
}

async function checkUpdatesGuarded() {
  if (!autoUpdater) return { ok: false, reason: 'dev-or-unavailable' };

  const sub = await validateSubscription();
  if (mainWindow) mainWindow.webContents.send('subscription:status', sub);

  if (!sub.allowed) {
    console.warn('[updater] bloqueado por suscripción:', sub.reason || sub.estado);
    return { ok: false, reason: 'subscription', estado: sub.estado, message: sub.message };
  }

  try {
    const r = await autoUpdater.checkForUpdates();
    return { ok: true, version: r?.updateInfo?.version, estado: sub.estado };
  } catch (e) {
    return { ok: false, reason: e?.message };
  }
}

ipcMain.handle('updater:check', () => checkUpdatesGuarded());
ipcMain.handle('updater:install', () => {
  if (autoUpdater) autoUpdater.quitAndInstall();
});
ipcMain.handle('subscription:check', () => validateSubscription());

// ============================================================
// Config file: config.json en la carpeta de instalación
// ============================================================
function getConfigPath() {
  if (process.env.NODE_ENV === 'development') {
    return path.join(__dirname, '..', 'config.json');
  }
  // En producción: junto al .exe
  return path.join(path.dirname(app.getPath('exe')), 'config.json');
}

function readConfig() {
  try {
    const configPath = getConfigPath();
    if (fs.existsSync(configPath)) {
      return JSON.parse(fs.readFileSync(configPath, 'utf8'));
    }
  } catch (e) {
    console.error('Error reading config:', e);
  }
  return {};
}

function writeConfig(data) {
  try {
    const configPath = getConfigPath();
    const existing = readConfig();
    const merged = { ...existing, ...data };
    fs.writeFileSync(configPath, JSON.stringify(merged, null, 2), 'utf8');
    return true;
  } catch (e) {
    console.error('Error writing config:', e);
    return false;
  }
}

// ============================================================
// IPC handlers para config
// ============================================================
ipcMain.handle('config:read', () => readConfig());
ipcMain.handle('config:write', (_, data) => writeConfig(data));
ipcMain.handle('config:getPath', () => getConfigPath());

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    title: 'Conta FT 4.1',
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
    },
    icon: path.join(__dirname, '../icon.png'),
  });

  // En desarrollo, carga desde Vite dev server
  if (process.env.NODE_ENV === 'development') {
    mainWindow.loadURL('http://localhost:3000');
    mainWindow.webContents.openDevTools();

    mainWindow.webContents.on('before-input-event', (event, input) => {
      if (input.control && input.key.toLowerCase() === 'r') {
        mainWindow.reload();
        event.preventDefault();
      }
      if (input.key === 'F5') {
        mainWindow.reload();
        event.preventDefault();
      }
    });
  } else {
    // En producción, carga el HTML compilado
    const indexPath = path.join(__dirname, '../build/index.html');
    mainWindow.loadFile(indexPath).catch(err => {
      console.error('Error loading file:', err);
      const altPath = path.join(process.resourcesPath, 'app', 'build', 'index.html');
      mainWindow.loadFile(altPath);
    });
  }

  globalShortcut.register('F5', () => {
    if (mainWindow) mainWindow.reload();
  });

  globalShortcut.register('CommandOrControl+R', () => {
    if (mainWindow) mainWindow.reload();
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });

  // Chequeo automático al arrancar (solo producción, silencioso)
  if (autoUpdater) {
    setTimeout(() => {
      checkUpdatesGuarded().catch((e) => {
        console.warn('[updater] check inicial falló:', e?.message);
      });
    }, 5000);
  }
});

app.on('window-all-closed', () => {
  globalShortcut.unregisterAll();
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('will-quit', () => {
  globalShortcut.unregisterAll();
});
