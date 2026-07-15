const { app, BrowserWindow, globalShortcut, ipcMain, dialog, Menu } = require('electron');
const path = require('path');
const fs = require('fs');
const os = require('os');
const http = require('http');
const https = require('https');
const crypto = require('crypto');
const { URL } = require('url');

// machine_id estable por equipo: hash de hostname + user + plataforma + CPU.
// Cambia solo si reinstalan el SO o cambian hardware mayor.
function getMachineInfo() {
  const hostname = os.hostname() || 'unknown';
  const username = (os.userInfo() && os.userInfo().username) || 'unknown';
  const platform = os.platform();
  const cpuModel = (os.cpus() && os.cpus()[0] && os.cpus()[0].model) || 'unknown';
  const machineId = crypto.createHash('sha256')
    .update(`${hostname}|${username}|${platform}|${cpuModel}`)
    .digest('hex')
    .substring(0, 32);
  return { machineId, machineName: hostname, username, platform };
}

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
// Auto-updater + Subscription Gate
// Reglas:
//  - validateForUsage  → permisivo: cache vale hasta fecha_fin de la
//    suscripción; si no hay red usa cache; tolera "código offline" HMAC
//  - validateForUpdate → estricto: requiere CRM en línea para descargar
//    actualización (es el flujo actual)
// ============================================================
const SUBS_API_BASE = 'https://crm.innovacion-digital.com/api/public/api/v1';
const ESTADOS_PERMITIDOS = ['activa', 'prueba', 'por_vencer'];
// Secreto compartido con el CRM para firmar/verificar códigos offline.
// Si se rota, el CRM debe generarlo igual y los códigos antiguos quedan inválidos.
const OFFLINE_SECRET = 'CONTA_FT_OFFLINE_2026_INV_DIGITAL';

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

// Verifica un código offline firmado con HMAC. Formato:
//   <BASE64URL(JSON{empresa, fecha_fin, nit?})>.<HMAC_SHA256_HEX>
function verifyOfflineCode(code) {
  if (!code || typeof code !== 'string') return null;
  const parts = code.split('.');
  if (parts.length !== 2) return null;
  const [payloadB64, sig] = parts;
  const expected = crypto.createHmac('sha256', OFFLINE_SECRET).update(payloadB64).digest('hex');
  if (sig !== expected) return { valid: false, reason: 'firma-invalida' };
  try {
    const json = Buffer.from(payloadB64, 'base64').toString('utf8');
    const payload = JSON.parse(json);
    if (!payload.fecha_fin) return { valid: false, reason: 'sin-fecha-fin' };
    const now = Date.now();
    const fin = new Date(payload.fecha_fin).getTime();
    if (isNaN(fin)) return { valid: false, reason: 'fecha-invalida' };
    if (now > fin) return { valid: false, reason: 'expirado', payload };
    return { valid: true, payload };
  } catch {
    return { valid: false, reason: 'payload-corrupto' };
  }
}

// Llama el CRM con el api_token y devuelve la respuesta cruda.
async function consultarCRM() {
  const tokenResult = await getApiTokenFromBackend();
  if (!tokenResult.ok) return { ok: false, reason: tokenResult.reason, message: tokenResult.message };
  if (String(tokenResult.token).length < 10) {
    return { ok: false, reason: 'token-invalido', message: 'api_token inválido en tbldatosempresa' };
  }
  // Enviar versión instalada + datos de la máquina para el heartbeat del CRM
  const appVersion = encodeURIComponent(app.getVersion());
  const m = getMachineInfo();
  const params = `version=${appVersion}` +
    `&machine_id=${encodeURIComponent(m.machineId)}` +
    `&machine_name=${encodeURIComponent(m.machineName)}` +
    `&username=${encodeURIComponent(m.username)}` +
    `&platform=${encodeURIComponent(m.platform)}`;
  const url = `${SUBS_API_BASE}/consulta-plan/${encodeURIComponent(tokenResult.token)}?${params}`;
  try {
    const { body } = await httpGetJson(url);
    if (body?.code === 'OK' && body?.data?.suscripcion) {
      const estado = body.data.suscripcion.estado;
      const allowed = ESTADOS_PERMITIDOS.includes(estado);
      return { ok: true, allowed, estado, data: body.data, fecha_fin: body.data.suscripcion?.fecha_fin };
    }
    if (body?.code === 'SIN_PLAN') return { ok: true, allowed: false, reason: 'sin-plan' };
    if (body?.code === 'TOKEN_NO_ENCONTRADO' || body?.code === 'TOKEN_INVALIDO') {
      return { ok: false, reason: 'token-invalido', message: 'Token no reconocido por el CRM' };
    }
    return { ok: false, reason: 'respuesta-inesperada', message: body?.message };
  } catch (e) {
    return { ok: false, reason: 'sin-red', message: e?.message };
  }
}

// PERMISIVO — para abrir y usar el sistema.
// Prioridad: (1) CRM en línea, (2) cache mientras fecha_fin no expire, (3) código offline HMAC.
async function validateForUsage() {
  if (process.env.NODE_ENV === 'development') {
    return { allowed: true, source: 'dev', estado: 'dev' };
  }
  const cfg = readConfig();

  // 1. Intentar CRM
  const live = await consultarCRM();
  if (live.ok) {
    if (live.allowed) {
      writeConfig({
        _subscription_cache: {
          allowed: true,
          estado: live.estado,
          fecha_fin: live.fecha_fin,
          checked_at: Date.now(),
          empresa: live.data.cliente?.empresa,
          dias_restantes: live.data.suscripcion?.dias_restantes,
          plan_nombre: live.data.plan?.nombre,
        },
      });
      return {
        allowed: true,
        source: 'online',
        estado: live.estado,
        fecha_fin: live.fecha_fin,
        empresa: live.data.cliente?.empresa,
        dias_restantes: live.data.suscripcion?.dias_restantes,
        plan_nombre: live.data.plan?.nombre,
      };
    }
    // CRM respondió pero la suscripción NO está vigente (vencida / sin_plan)
    return { allowed: false, source: 'online', estado: live.estado, reason: live.reason || 'no-activa' };
  }

  // 2. Cache vigente hasta fecha_fin
  const cache = cfg._subscription_cache;
  if (cache?.allowed && cache.fecha_fin) {
    const fin = new Date(cache.fecha_fin).getTime();
    if (!isNaN(fin) && Date.now() < fin) {
      return {
        allowed: true,
        source: 'cache',
        estado: cache.estado,
        fecha_fin: cache.fecha_fin,
        empresa: cache.empresa,
        plan_nombre: cache.plan_nombre,
      };
    }
  }

  // 3. Código de activación offline
  if (cfg.offline_activation) {
    const r = verifyOfflineCode(cfg.offline_activation);
    if (r?.valid) {
      return {
        allowed: true,
        source: 'offline-code',
        estado: 'offline',
        fecha_fin: r.payload.fecha_fin,
        empresa: r.payload.empresa,
      };
    }
  }

  return { allowed: false, source: 'none', reason: live.reason || 'sin-validacion', message: live.message };
}

// ESTRICTO — para descargar actualización. Requiere CRM en línea.
async function validateForUpdate() {
  if (process.env.NODE_ENV === 'development') return { allowed: false, reason: 'dev' };
  const live = await consultarCRM();
  if (live.ok && live.allowed) return { allowed: true, estado: live.estado };
  return { allowed: false, reason: live.reason || 'no-activa', message: live.message };
}

// Compatibilidad con código existente
async function validateSubscription() { return validateForUsage(); }

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

  const sub = await validateForUpdate();
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
ipcMain.handle('subscription:check', () => validateForUsage());
ipcMain.handle('subscription:checkUpdate', () => validateForUpdate());
ipcMain.handle('subscription:setOfflineCode', (_, code) => {
  const r = verifyOfflineCode(code);
  if (r?.valid) {
    writeConfig({ offline_activation: code });
    return { ok: true, payload: r.payload };
  }
  return { ok: false, reason: r?.reason || 'invalido' };
});
ipcMain.handle('subscription:clearOfflineCode', () => {
  writeConfig({ offline_activation: null });
  return { ok: true };
});

// Configurar el api_token de la empresa (instalación inicial).
// Llama al backend local para guardar el token en tbldatosempresa.api_token.
ipcMain.handle('subscription:setApiToken', async (_, token) => {
  const cfg = readConfig();
  const apiUrl = cfg.apiUrl;
  if (!apiUrl) return { ok: false, reason: 'no-api-url', message: 'apiUrl no configurada en config.json' };
  if (!token || String(token).trim().length < 32) {
    return { ok: false, reason: 'token-corto', message: 'El token debe tener al menos 32 caracteres' };
  }

  return new Promise((resolve) => {
    const url = `${apiUrl.replace(/\/$/, '')}/empresa/configurar-token.php`;
    const body = JSON.stringify({ api_token: String(token).trim() });
    const u = new URL(url);
    const client = u.protocol === 'https:' ? https : http;
    const req = client.request(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) },
    }, (res) => {
      let data = '';
      res.on('data', (c) => { data += c; });
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data || '{}');
          resolve(parsed.success ? { ok: true } : { ok: false, reason: 'rechazado', message: parsed.message || 'Backend rechazó el token' });
        } catch {
          resolve({ ok: false, reason: 'parse-error', message: 'Respuesta inválida del backend' });
        }
      });
    });
    req.on('error', (e) => resolve({ ok: false, reason: 'sin-red', message: e?.message }));
    req.setTimeout(8000, () => req.destroy(new Error('Timeout')));
    req.write(body);
    req.end();
  });
});

// ============================================================
// Config file: config.json en userData
//
// HISTORIA: hasta 4.3.63 se guardaba junto al .exe. En Windows con NSIS,
// eso es `C:\Program Files\Conta FT 4.3\` que Windows protege — el proceso
// normal NO puede escribir ahí y writeConfig fallaba silenciosamente. Al
// hacer reload el config.json quedaba con los defaults del instalador
// (o vacío) y la app volvía a pedir "Configurar Servidor" indefinidamente.
//
// FIX 4.3.65: guardar en app.getPath('userData') = %APPDATA%/Roaming/<app>/
// que es la carpeta del usuario, siempre escribible. Se migra el config
// viejo automáticamente la primera vez.
// ============================================================
function getConfigPath() {
  if (process.env.NODE_ENV === 'development') {
    return path.join(__dirname, '..', 'config.json');
  }
  return path.join(app.getPath('userData'), 'config.json');
}

// Path del config antiguo (junto al .exe) — solo para migrar una vez.
function getLegacyConfigPath() {
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
    // Asegurar carpeta padre (userData suele existir, pero por si acaso)
    fs.mkdirSync(path.dirname(configPath), { recursive: true });
    const existing = readConfig();
    const merged = { ...existing, ...data };
    fs.writeFileSync(configPath, JSON.stringify(merged, null, 2), 'utf8');
    return true;
  } catch (e) {
    console.error('Error writing config:', e);
    return false;
  }
}

// Crea config.json con valores por defecto si no existe. Si hay uno legacy
// junto al .exe (instalaciones previas a 4.3.65), lo copia a userData
// para que el cliente NO pierda su apiUrl al actualizar.
function ensureConfigExists() {
  try {
    const configPath = getConfigPath();
    if (fs.existsSync(configPath)) return; // ya existe, nada que hacer

    // Migración: intentar leer el config viejo del path junto al .exe.
    // Si el usuario ya tenía apiUrl configurado allí, lo respetamos.
    const legacyPath = getLegacyConfigPath();
    if (fs.existsSync(legacyPath)) {
      try {
        const legacy = JSON.parse(fs.readFileSync(legacyPath, 'utf8'));
        fs.mkdirSync(path.dirname(configPath), { recursive: true });
        fs.writeFileSync(configPath, JSON.stringify(legacy, null, 2), 'utf8');
        console.log('[config] Migrado config.json legacy →', configPath);
        return;
      } catch (e) {
        console.warn('[config] no se pudo migrar legacy config:', e);
      }
    }

    const defaults = {
      apiUrl: 'http://localhost:80/conta-app-backend/api',
      backendPath: 'C:\\xampp\\htdocs\\conta-app-backend',
    };
    fs.mkdirSync(path.dirname(configPath), { recursive: true });
    fs.writeFileSync(configPath, JSON.stringify(defaults, null, 2), 'utf8');
    console.log('[config] config.json creado con defaults en:', configPath);
  } catch (e) {
    console.error('[config] no se pudo crear config.json:', e);
  }
}

// ============================================================
// Auto-deploy del backend PHP a htdocs del Apache local.
// Incluido como `extraResources` en el build → process.resourcesPath/backend.
// En cada inicio se copia al htdocs del cliente, preservando database.php
// (la config de BD del cliente nunca se sobreescribe).
// ============================================================
function copyDirRecursive(src, dest, opts = {}) {
  const { skipPaths = [], baseSrc = src, stats = { copiados: 0, omitidos: 0 } } = opts;
  if (!fs.existsSync(dest)) fs.mkdirSync(dest, { recursive: true });
  for (const item of fs.readdirSync(src)) {
    const srcPath = path.join(src, item);
    const destPath = path.join(dest, item);
    const relPath = path.relative(baseSrc, srcPath).replace(/\\/g, '/');
    if (skipPaths.includes(relPath)) { stats.omitidos++; continue; }
    const stat = fs.statSync(srcPath);
    if (stat.isDirectory()) {
      copyDirRecursive(srcPath, destPath, { skipPaths, baseSrc, stats });
    } else {
      try { fs.copyFileSync(srcPath, destPath); stats.copiados++; }
      catch (e) { console.warn('[backend] no se pudo copiar', relPath, '-', e.message); }
    }
  }
  return stats;
}

function syncBackend() {
  if (process.env.NODE_ENV === 'development') {
    console.log('[backend] dev mode — sync omitido');
    return;
  }
  try {
    const cfg = readConfig();
    const targetRoot = cfg.backendPath || 'C:\\xampp\\htdocs\\conta-app-backend';
    const sourceRoot = path.join(process.resourcesPath, 'backend');

    if (!fs.existsSync(sourceRoot)) {
      console.warn('[backend] no hay backend bundled en resources, sync saltado');
      return;
    }

    // Asegurar que la carpeta de destino existe (Apache debe estar instalado)
    const htdocsParent = path.dirname(targetRoot);
    if (!fs.existsSync(htdocsParent)) {
      console.warn('[backend] htdocs no existe en', htdocsParent, '— Apache no instalado o ruta incorrecta. Configura backendPath en config.json');
      return;
    }

    // Preservar database.php del cliente (config específica de su BD)
    const stats = copyDirRecursive(sourceRoot, targetRoot, {
      skipPaths: ['api/config/database.php'],
    });
    console.log(`[backend] sync OK → ${targetRoot} | copiados: ${stats.copiados}, preservados: ${stats.omitidos}`);
  } catch (e) {
    console.error('[backend] error en sync:', e?.message || e);
  }
}

// ============================================================
// IPC handlers para config
// ============================================================
ipcMain.handle('config:read', () => readConfig());
ipcMain.handle('config:write', (_, data) => writeConfig(data));
ipcMain.handle('config:getPath', () => getConfigPath());

// ============================================================
// IPC handlers para impresión directa (silenciosa) a la térmica
// ============================================================
// Lista de impresoras instaladas para que el usuario elija la térmica.
ipcMain.handle('print:listPrinters', async () => {
  try {
    if (!mainWindow) return [];
    const printers = await mainWindow.webContents.getPrintersAsync();
    return printers.map(p => ({
      name: p.name,
      displayName: p.displayName || p.name,
      isDefault: !!p.isDefault,
      status: p.status,
    }));
  } catch (e) {
    console.error('[print] listPrinters error:', e?.message);
    return [];
  }
});

// Imprime un HTML directo a una impresora, SIN diálogo. Usa una ventana
// oculta que carga el HTML y dispara print({silent:true, deviceName}).
ipcMain.handle('print:silent', async (_, { html, deviceName }) => {
  return new Promise((resolve) => {
    let printWin = new BrowserWindow({
      show: false,
      webPreferences: { nodeIntegration: false, contextIsolation: true },
    });
    const cerrar = () => { try { if (printWin && !printWin.isDestroyed()) printWin.close(); } catch {} printWin = null; };

    printWin.webContents.once('did-finish-load', () => {
      // Pequeño respiro para asegurar render de fuentes/estilos antes de imprimir.
      setTimeout(() => {
        try {
          printWin.webContents.print(
            {
              silent: true,
              deviceName: deviceName || '',
              printBackground: true,
              margins: { marginType: 'none' },
            },
            (success, reason) => {
              cerrar();
              resolve({ success, reason: reason || null });
            }
          );
        } catch (e) {
          cerrar();
          resolve({ success: false, reason: e?.message || 'print exception' });
        }
      }, 250);
    });

    printWin.webContents.once('did-fail-load', (_e, code, desc) => {
      cerrar();
      resolve({ success: false, reason: `load failed ${code}: ${desc}` });
    });

    printWin.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(html));
  });
});

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    title: 'Conta FT 4.3',
    autoHideMenuBar: true,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
    },
    icon: path.join(__dirname, '../icon.png'),
  });
  mainWindow.setMenuBarVisibility(false);

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

  // Interceptar el cierre de la ventana: antes de cerrar le preguntamos al
  // renderer si hay una caja abierta. El renderer decide (consulta el backend
  // y muestra la confirmación) y, si el usuario acepta, responde para cerrar.
  // Salvaguarda: si el renderer no responde (pantalla colgada) y el usuario
  // vuelve a dar X, forzamos el cierre.
  mainWindow.on('close', (e) => {
    if (cierreConfirmado) return; // ya confirmado → dejar cerrar
    if (cierreEnProceso) return;  // 2º intento sin respuesta → dejar cerrar (escape)
    e.preventDefault();
    cierreEnProceso = true;
    if (mainWindow) mainWindow.webContents.send('app:intento-cierre');
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// Banderas del flujo de cierre.
let cierreConfirmado = false; // el usuario aceptó cerrar (o no había caja)
let cierreEnProceso = false;  // se preguntó al renderer y se espera respuesta
ipcMain.on('app:cerrar-confirmado', () => {
  cierreConfirmado = true;
  if (mainWindow) mainWindow.close();
});
ipcMain.on('app:cierre-cancelado', () => {
  cierreEnProceso = false; // el usuario canceló → la próxima X vuelve a preguntar
});

app.whenReady().then(() => {
  Menu.setApplicationMenu(null);
  ensureConfigExists();
  syncBackend();
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
