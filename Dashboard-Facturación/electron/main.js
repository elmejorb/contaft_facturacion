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

// Llave pública RS256 del CRM para verificar los JWT de entitlements.
// Ver: C:\Users\LUIS_FDO\Documents\proyectos\InnovacionDg\CRM InnovacionDG\INTEGRACION_ENTITLEMENTS.md
const CRM_PUBLIC_KEY = `-----BEGIN PUBLIC KEY-----
MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA1corQr4nwAWsCj3++R8I
joGiOYkAr4Tvf5GwVY11LzIHFk30f+PEfjlXTaXoB3bynXqDxBZ2pAnzquYuUTnH
QzoRyq/S42q5AUAL62NHvVKlsqFvNNZXaP7bKymM6SfLcgVeZIc4xc7ylhCWOtR4
lKTfva41ZqV776KtVYD6ZrOJfZFdc6E4wpDOSg/0p0igKE696a1zBrX2LT9AIWkB
aK9EtO+IVaaTicJsnJOkWQjO7AwkuzxUgl5MJS740w53ATQeTmdoEYAk/+5DFE8A
Oll6J0ohQDVPJQP2Sg+pb0EPjIbO5zyVQZ2MIIkwbJ/h0Xkl0pKjuHMPCYEfYXcu
6QIDAQAB
-----END PUBLIC KEY-----`;

// Verifica un JWT firmado con RS256 usando la llave pública del CRM.
// Retorna el payload si es válido, o lanza si la firma o exp fallan.
function verifyEntitlementsJwt(jwt) {
  if (!jwt || typeof jwt !== 'string') throw new Error('JWT vacío');
  const parts = jwt.split('.');
  if (parts.length !== 3) throw new Error('JWT malformado');
  const [headerB64, payloadB64, sigB64] = parts;

  // base64url → base64 estándar
  const b64urlDecode = (s) => Buffer.from(s.replace(/-/g, '+').replace(/_/g, '/'), 'base64');
  const signature = b64urlDecode(sigB64);

  const verifier = crypto.createVerify('RSA-SHA256');
  verifier.update(`${headerB64}.${payloadB64}`);
  verifier.end();
  if (!verifier.verify(CRM_PUBLIC_KEY, signature)) {
    throw new Error('Firma inválida');
  }

  const payload = JSON.parse(b64urlDecode(payloadB64).toString('utf8'));
  const now = Math.floor(Date.now() / 1000);
  if (payload.exp && now > payload.exp) {
    throw new Error('JWT expirado');
  }
  return payload;
}

// Consulta el nuevo endpoint del CRM que devuelve el JWT de entitlements
// (módulos por cliente). Valida la firma localmente y devuelve los módulos.
// Cachea el token en config.json bajo _entitlements_cache para operar offline
// hasta que expire (7 días de gracia si no hay red).
async function consultarEntitlements() {
  console.log('[entitlements] arrancando consulta al CRM');
  const tokenResult = await getApiTokenFromBackend();
  if (!tokenResult.ok) {
    console.log('[entitlements] fallo getApiTokenFromBackend:', tokenResult.reason);
    return { ok: false, reason: tokenResult.reason };
  }
  const apiToken = String(tokenResult.token || '');
  if (apiToken.length < 10) {
    console.log('[entitlements] token demasiado corto:', apiToken.length);
    return { ok: false, reason: 'token-invalido' };
  }
  console.log('[entitlements] api_token OK (len=' + apiToken.length + '), pegando al CRM…');

  const url = `${SUBS_API_BASE}/suscripcion-token/${encodeURIComponent(apiToken)}`;
  try {
    const { body } = await httpGetJson(url);
    console.log('[entitlements] respuesta CRM code=' + body?.code + ' tiene_token=' + !!body?.token);
    if (body?.code !== 'OK' || !body?.token) {
      return { ok: false, reason: body?.code || 'sin-token' };
    }
    // Verifica la firma cripto antes de confiar en el payload
    const payload = verifyEntitlementsJwt(body.token);
    console.log('[entitlements] JWT válido — módulos:', Object.entries(payload.modulos).map(([k,v]) => `${k}=${v.activo?'SI':'no'}`).join(' '));
    // Guardar el JWT completo (no solo el payload) para revalidar offline
    writeConfig({
      _entitlements_cache: {
        jwt: body.token,
        checked_at: Date.now(),
        empresa: payload.empresa,
        cliente_id: payload.cliente_id,
        modulos: payload.modulos,
        vigencia_del_token: payload.vigencia_del_token,
      },
    });
    return { ok: true, source: 'online', payload, modulos: payload.modulos };
  } catch (e) {
    // Falla de red o firma inválida — caemos a cache
    const cfg = readConfig();
    const cache = cfg._entitlements_cache;
    if (cache?.jwt) {
      try {
        const payload = verifyEntitlementsJwt(cache.jwt);
        // Período de gracia 7 días desde el último check exitoso
        const graceEndMs = (cache.checked_at || 0) + 7 * 24 * 60 * 60 * 1000;
        if (Date.now() < graceEndMs) {
          return { ok: true, source: 'cache', payload, modulos: payload.modulos };
        }
      } catch (_) {}
    }
    // Modo emergencia — sin JWT válido ni cache. Solo núcleo activo.
    return {
      ok: false,
      source: 'emergency',
      reason: e?.message || 'sin-red',
      modulos: {
        nucleo:                  { activo: true },
        facturacion_electronica: { activo: false },
        dsno:                    { activo: false },
        plataforma_web:          { activo: false },
        vendedor_movil:          { activo: false },
        instalacion:             { activo: false },
      },
    };
  }
}

ipcMain.handle('entitlements:get', async () => {
  return consultarEntitlements();
});

// HTTP con Bearer JWT — para llamar a endpoints de Lumen que exigen
// autenticación por entitlements del CRM. Acepta método (GET/POST/PUT).
function httpJsonBearer(method, url, jwt, timeoutMs = 15000) {
  return new Promise((resolve, reject) => {
    const isHttps = new URL(url).protocol === 'https:';
    const client = isHttps ? https : http;
    const headers = {
      'Accept': 'application/json',
      'Authorization': 'Bearer ' + jwt,
    };
    // Solo mandar Content-Type/Length si va a haber body. Un GET con
    // Content-Length: 0 puede ser rechazado por proxies/LiteSpeed/Cloudflare.
    if (method !== 'GET' && method !== 'HEAD') {
      headers['Content-Type'] = 'application/json';
      headers['Content-Length'] = 0;
    }
    console.log('[lumen] ' + method + ' ' + url + ' (jwt.len=' + (jwt ? jwt.length : 0) + ')');
    const req = client.request(url, { method, headers }, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        console.log('[lumen] ← ' + res.statusCode + ' (' + data.length + ' bytes)');
        try {
          const clean = stripBom(data);
          resolve({ status: res.statusCode, body: clean ? JSON.parse(clean) : null });
        } catch (e) {
          // Body no es JSON — devolvemos el status y el body crudo (útil para
          // detectar respuestas HTML de error del servidor).
          resolve({ status: res.statusCode, body: { _raw: String(data).slice(0, 400) } });
        }
      });
    });
    req.on('error', (err) => {
      console.error('[lumen] ✗ ' + method + ' ' + url + ' → ' + (err?.code || '') + ' ' + (err?.message || err));
      reject(err);
    });
    req.setTimeout(timeoutMs, () => req.destroy(new Error('Timeout tras ' + timeoutMs + 'ms')));
    req.end();
  });
}
function httpPostJsonBearer(url, jwt, timeoutMs = 15000) {
  return httpJsonBearer('POST', url, jwt, timeoutMs);
}

// Handshake de activación con Lumen: el desktop envía su JWT del CRM,
// Lumen valida el módulo `vendedor_movil`, provisiona la empresa si no
// existe y devuelve `id_empresa` + `token_api` que el desktop usará para
// autenticar los siguientes push/pull.
ipcMain.handle('empresas:activar', async (_e, { apiUrlLumen }) => {
  console.log('[activar-empresa] inicio, url=' + apiUrlLumen);
  const ent = await consultarEntitlements();
  if (!ent.ok) {
    console.log('[activar-empresa] entitlements falló:', ent.reason);
    return { ok: false, reason: 'crm-inaccesible', message: 'No se pudo verificar la suscripción con el CRM: ' + (ent.reason || 'sin razón') };
  }
  if (!ent.modulos?.vendedor_movil?.activo) {
    console.log('[activar-empresa] vendedor_movil NO activo en CRM');
    return { ok: false, reason: 'modulo-no-activo-crm' };
  }
  const cfg = readConfig();
  const jwt = cfg._entitlements_cache?.jwt;
  if (!jwt) {
    console.log('[activar-empresa] JWT no está en cache');
    return { ok: false, reason: 'jwt-no-en-cache' };
  }
  console.log('[activar-empresa] módulo activo + JWT en cache (' + jwt.length + ' chars) → pegando al hub');

  const url = (apiUrlLumen || '').replace(/\/$/, '') + '/api/empresas/activar';
  try {
    // El hub Lumen (api-movil-contaft) expone /api/empresas/activar como POST
    // con middleware `entitlement:vendedor_movil` que valida el JWT del CRM
    // y auto-provisiona la empresa si no existe (ver EntitlementsAuth.php).
    const { status, body } = await httpJsonBearer('POST', url, jwt);
    console.log('[activar-empresa] status=' + status + ' body=', body);
    if (status !== 200 || body?.error) {
      const rawSample = body?._raw || (body ? JSON.stringify(body).slice(0, 300) : '(sin body)');
      const message = body?.mensaje || body?.message || body?.error || rawSample;
      return {
        ok: false,
        reason: body?.code || 'error-lumen',
        status,
        message,
        body_debug: rawSample,
      };
    }
    return {
      ok: true,
      id_empresa: body.id_empresa,
      token_api: body.token_api,
      empresa: body.empresa,
      nit: body.nit,
      modulo: body.modulo,
      cliente_id_crm: body.cliente_id_crm,
    };
  } catch (e) {
    return { ok: false, reason: 'sin-red', message: (e?.code ? '[' + e.code + '] ' : '') + (e?.message || String(e)) };
  }
});

// Renovación del código_pairing en el hub. Como es una acción admin, el hub
// exige el JWT del CRM (mismo middleware que empresas:activar). Devuelve el
// nuevo `codigo_pairing` que el desktop mostrará al admin para compartir por
// WhatsApp al vendedor.
ipcMain.handle('empresas:renovarCodigoPairing', async (_e, { apiUrlLumen }) => {
  console.log('[renovar-codigo] inicio, url=' + apiUrlLumen);
  const ent = await consultarEntitlements();
  if (!ent.ok) return { ok: false, reason: 'crm-inaccesible', message: ent.reason };
  if (!ent.modulos?.vendedor_movil?.activo) return { ok: false, reason: 'modulo-no-activo-crm' };
  const cfg = readConfig();
  const jwt = cfg._entitlements_cache?.jwt;
  if (!jwt) return { ok: false, reason: 'jwt-no-en-cache' };

  const url = (apiUrlLumen || '').replace(/\/$/, '') + '/api/empresa/renovar-codigo';
  try {
    const { status, body } = await httpJsonBearer('POST', url, jwt);
    console.log('[renovar-codigo] status=' + status + ' body=', body);
    if (status !== 200 || body?.error) {
      return { ok: false, reason: body?.code || 'error-lumen', status, message: body?.mensaje || body?.message };
    }
    return {
      ok: true,
      codigo_pairing: body.codigo_pairing,
      codigo_pairing_expira: body.codigo_pairing_expira,
    };
  } catch (e) {
    return { ok: false, reason: 'sin-red', message: e?.message };
  }
});

// Secreto compartido con el CRM para firmar/verificar códigos offline.
// Si se rota, el CRM debe generarlo igual y los códigos antiguos quedan inválidos.
const OFFLINE_SECRET = 'CONTA_FT_OFFLINE_2026_INV_DIGITAL';

// Quita el BOM UTF-8 (U+FEFF) que algunos PHPs devuelven cuando un archivo
// del backend fue guardado con BOM (típico si se editó con Notepad de Windows).
// Sin este strip, JSON.parse revienta con "Unexpected character" en la posición 0.
function stripBom(s) {
  if (typeof s !== 'string') return s;
  return s.charCodeAt(0) === 0xFEFF ? s.slice(1) : s;
}

function httpGetJson(url, timeoutMs = 10000) {
  return new Promise((resolve, reject) => {
    const client = new URL(url).protocol === 'https:' ? https : http;
    const req = client.get(url, { headers: { Accept: 'application/json' } }, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          const clean = stripBom(data);
          resolve({ status: res.statusCode, body: clean ? JSON.parse(clean) : null });
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
  if (!autoUpdater) return;
  // Marcar el cierre como aceptado ANTES de disparar quitAndInstall.
  // Sin esto, el 'close' handler pregunta por caja abierta y si el usuario
  // cancela por error, la actualización queda a medio aplicar y el proceso
  // sigue vivo — típico de "actualicé y no cambió nada".
  cierreConfirmado = true;
  autoUpdater.quitAndInstall();
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

// Migrar userData desde versiones anteriores del producto.
// Bug histórico: el `productName` en package.json cambió DOS veces desde el
// primer release (4.1 → 4.2 → 4.3), y en Electron ese nombre define la ruta
// donde vive `userData` (localStorage, cookies, cache, IndexedDB). Cada
// cambio dejó a los clientes existentes con su config en la carpeta vieja,
// mientras la nueva instalación creaba una carpeta vacía y arrancaba con
// defaults. Por eso reportan "se desconfiguró todo al actualizar".
//
// Cambios detectados en git:
//   4.1.1  → productName="Conta FT 4.1"
//   4.2    → cambió a "Conta FT 4.2"
//   4.3.4  → cambió a "Conta FT 4.3"
//
// Este migrador se ejecuta al arrancar y copia el contenido de la carpeta
// vieja a la nueva UNA sola vez, solo si la nueva está vacía. Preferimos
// la versión más reciente si hay varias (ej: un cliente que pasó por 4.1 y
// 4.2 antes de llegar a 4.3, debe migrar desde 4.2, no desde 4.1).
function migrarUserDataDesdeVersionesViejas() {
  try {
    const userDataActual = app.getPath('userData');
    const parent = path.dirname(userDataActual);
    const nombreActual = path.basename(userDataActual);

    // Si ya tenemos Local Storage, no migramos (la carpeta ya está en uso)
    const lsActual = path.join(userDataActual, 'Local Storage');
    if (fs.existsSync(lsActual)) return;

    // Ordenado de más nuevo a más antiguo. Si hay varias carpetas viejas,
    // migramos desde la más reciente (la que tiene la config más actual).
    const posibles = ['Conta FT 4.3', 'Conta FT 4.2', 'Conta FT 4.1', 'Conta FT', 'ContaFT'];
    for (const nombreViejo of posibles) {
      if (nombreViejo === nombreActual) continue;
      const rutaVieja = path.join(parent, nombreViejo);
      const lsViejo = path.join(rutaVieja, 'Local Storage');
      if (fs.existsSync(lsViejo)) {
        console.log(`[migracion] Copiando userData desde "${nombreViejo}" → "${nombreActual}"`);
        try {
          if (!fs.existsSync(userDataActual)) fs.mkdirSync(userDataActual, { recursive: true });
          fs.cpSync(rutaVieja, userDataActual, { recursive: true, force: false, errorOnExist: false });
          console.log('[migracion] Migración completada');
        } catch (e) {
          console.log('[migracion] Error copiando:', e.message);
        }
        return; // solo migrar de la primera versión vieja encontrada (la más nueva)
      }
    }
  } catch (e) {
    console.log('[migracion] Error:', e.message);
  }
}

app.whenReady().then(() => {
  Menu.setApplicationMenu(null);
  migrarUserDataDesdeVersionesViejas();
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
