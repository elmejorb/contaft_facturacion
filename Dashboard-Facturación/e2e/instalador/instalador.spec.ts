/**
 * e2e del INSTALADOR REAL (app empaquetada, modo embebido SQLite, como un
 * cliente nuevo). Flujos: abrir sin pantalla blanca → activar licencia con la
 * empresa de prueba del CRM → login → (venta, FE, caja, backup en los
 * siguientes bloques).
 *
 * Aislamiento: --user-data-dir apunta a una carpeta temporal, así que la app
 * crea su conta.db / config.json ahí y NO toca %APPDATA% del equipo.
 */
import { _electron as electron, test, expect, type ElectronApplication, type Page } from '@playwright/test';
import { existsSync, mkdtempSync, readFileSync, readdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { spawnSync } from 'node:child_process';
import { join } from 'node:path';

const RAIZ = join(__dirname, '..', '..');
const EXE = join(RAIZ, 'dist-electron', 'win-unpacked', 'Conta FT 4.3.exe');
const DATOS_E2E = 'C:/ContaFT-pruebas/e2e.json';

let app: ElectronApplication;
let win: Page;
let userData: string;
let backupDir: string;
const erroresConsola: string[] = [];

test.describe.configure({ mode: 'serial' });

test.beforeAll(async () => {
  test.skip(!existsSync(EXE), `No existe ${EXE}. Haz el build local: npm run build && npx electron-builder --dir`);
  test.skip(!existsSync(DATOS_E2E), `Falta ${DATOS_E2E} (token de la empresa de prueba del CRM)`);
  userData = mkdtempSync(join(tmpdir(), 'contaft-e2e-'));
  backupDir = join(userData, 'respaldos');
  const env = { ...process.env, CONTAFT_BACKUP_DIR: backupDir } as Record<string, string>;
  delete env.ELECTRON_RUN_AS_NODE;
  delete env.NODE_ENV;
  app = await electron.launch({
    executablePath: EXE,
    args: [`--user-data-dir=${join(userData, 'datos')}`],
    env,
    timeout: 120_000,
  });
  win = await app.firstWindow();
  win.on('console', m => { if (m.type() === 'error') erroresConsola.push(m.text()); });
  win.on('pageerror', e => erroresConsola.push('pageerror: ' + e.message));
});

test.afterAll(async () => {
  // Con caja abierta la app pregunta antes de cerrar (y espera respuesta);
  // si una prueba falló a mitad, no dejamos que eso cuelgue la corrida.
  if (app) {
    const cerro = await Promise.race([
      app.close().then(() => true).catch(() => true),
      new Promise<boolean>(r => setTimeout(() => r(false), 15_000)),
    ]);
    // taskkill /T: también el php -S embebido (si no, retiene conta.db)
    if (!cerro) spawnSync('taskkill', ['/PID', String(app.process().pid), '/T', '/F'], { stdio: 'ignore' });
  }
  if (userData && !process.env.E2E_CONSERVAR) rmSync(userData, { recursive: true, force: true });
});

test('1. abre sin pantalla blanca', async () => {
  // Una instalación nueva debe mostrar la activación (token) o el login.
  await expect(win.getByPlaceholder('Ingrese su usuario').or(win.getByText(/token de suscripci[oó]n/i)).first()).toBeVisible({ timeout: 90_000 });
  const texto = (await win.locator('body').innerText()).trim();
  expect(texto.length, 'la ventana tiene contenido (no pantalla blanca)').toBeGreaterThan(40);
  expect(erroresConsola.filter(e => /pageerror|Uncaught/i.test(e)), 'sin errores JS no capturados').toEqual([]);
});

test('2. activa la licencia con la empresa de prueba (CRM real)', async () => {
  const { token_crm } = JSON.parse(readFileSync(DATOS_E2E, 'utf-8'));
  const yaLogin = await win.getByPlaceholder('Ingrese su usuario').isVisible().catch(() => false);
  if (!yaLogin) {
    await win.getByRole('button', { name: /Configurar token de suscripci/i }).click();
    await win.getByPlaceholder(/Pega aquí el api_token/i).fill(token_crm);
    await win.getByRole('button', { name: /Guardar y validar/i }).click();
  }
  await expect(win.getByPlaceholder('Ingrese su usuario')).toBeVisible({ timeout: 90_000 });
});

test('3. login como root', async () => {
  const { usuario, clave } = JSON.parse(readFileSync(DATOS_E2E, 'utf-8'));
  await win.getByPlaceholder('Ingrese su usuario').fill(usuario);
  await win.getByPlaceholder('••••••••').fill(clave);
  await win.locator('button[type="submit"]').click();
  await expect(win.getByPlaceholder('Ingrese su usuario')).toBeHidden({ timeout: 60_000 });
  await win.screenshot({ path: join(RAIZ, 'e2e', 'report-instalador', '03-dashboard.png') });
  const texto = await win.locator('body').innerText();
  expect(texto).toMatch(/Inicio|Nueva Venta|Ventas/);
});

// ── Helpers para verificar en la BD real de la app (conta.db del userData) ──
// Solo lectura: node:sqlite abre la misma BD que usa el PHP embebido.
function bd() {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { DatabaseSync } = require('node:sqlite');
  return new DatabaseSync(join(userData, 'datos', 'conta.db'), { readOnly: true });
}
function uno(sql: string, ...p: unknown[]): any {
  const d = bd();
  try { return d.prepare(sql).get(...p); } finally { d.close(); }
}
function apiBase(): string {
  const cfg = JSON.parse(readFileSync(join(userData, 'datos', 'config.json'), 'utf-8'));
  return String(cfg.apiUrlRuntime || '').replace(/\/$/, '');
}
/** Minutos entre una fecha 'Y-m-d H:i:s' (hora Colombia) y ahora. */
function minutosDesdeAhora(fecha: string): number {
  const ms = new Date(fecha.replace(' ', 'T') + '-05:00').getTime();
  return Math.abs(Date.now() - ms) / 60_000;
}
async function irAInicio() {
  await win.getByText('Inicio', { exact: true }).first().click();
  await win.getByText('Nueva Venta', { exact: true }).first().waitFor();
}

const COD = 'E2E001';
const PRECIO = 5000;
const BASE = 100_000;

test('4. abre la caja (hora local, no UTC)', async () => {
  await irAInicio();
  await win.getByText('Caja', { exact: true }).first().click();
  await win.getByRole('button', { name: /Abrir Caja/ }).waitFor();
  await win.locator('input[placeholder="$ 0"]:visible').last().fill(String(BASE));
  await win.getByRole('button', { name: /Abrir Caja/ }).click();
  await expect(win.getByText(/Caja 1 — Abierta/).first()).toBeVisible({ timeout: 20_000 });

  const s = uno("SELECT * FROM tblsesiones_caja WHERE Estado = 'abierta' ORDER BY Id_Sesion DESC LIMIT 1");
  expect(s, 'hay sesión abierta en la BD').toBeTruthy();
  expect(Number(s.BaseInicial)).toBe(BASE);
  // Regresión 4.8.19: en SQLite CURRENT_TIMESTAMP guardaba UTC (+5 h).
  expect(minutosDesdeAhora(s.FechaApertura), `FechaApertura ${s.FechaApertura} en hora de Colombia`).toBeLessThan(5);
});

test('5. vende POS contado: total, stock y kardex', async () => {
  // Una instalación nueva no trae artículos: se crea uno por la API del backend embebido.
  const r = await fetch(`${apiBase()}/inventario/crear-articulo.php`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ Codigo: COD, Nombres_Articulo: 'ARTICULO PRUEBA E2E', Existencia: 10, Precio_Costo: 3000, Precio_Venta: PRECIO, Iva: 0 }),
  });
  const cj = await r.json();
  expect(cj.success, 'artículo creado: ' + JSON.stringify(cj)).toBeTruthy();
  const art = uno('SELECT Items, Existencia FROM tblarticulos WHERE Codigo = ?', COD);
  expect(Number(art.Existencia)).toBe(10);
  const kardexAntes = Number(uno('SELECT COUNT(*) n FROM tblkardex WHERE Items = ?', art.Items).n);
  const ventasAntes = Number(uno('SELECT COUNT(*) n FROM tblventas').n);

  await irAInicio();
  await win.getByText('Nueva Venta', { exact: true }).first().click();
  const codigo = win.locator('[data-venta-codigo-input]');
  await codigo.waitFor();
  await codigo.fill(COD);
  await codigo.press('Enter');
  await expect(win.getByText('ARTICULO PRUEBA E2E').first()).toBeVisible({ timeout: 15_000 });

  await win.keyboard.press('F9');
  const efectivo = win.locator('[data-pago-efectivo]');
  await efectivo.waitFor({ timeout: 15_000 });
  const imprimir = win.getByLabel(/Imprimir al guardar/);
  if (await imprimir.isChecked().catch(() => false)) await imprimir.uncheck();
  await efectivo.fill(String(PRECIO));
  await efectivo.press('Enter');
  await expect(win.getByText(/guardada exitosamente/).first()).toBeVisible({ timeout: 30_000 });

  expect(Number(uno('SELECT COUNT(*) n FROM tblventas').n)).toBe(ventasAntes + 1);
  const v = uno('SELECT * FROM tblventas ORDER BY Factura_N DESC LIMIT 1');
  expect(Number(v.Total)).toBe(PRECIO);
  expect(v.EstadoFact).toBe('Valida');
  expect(Number(v.Saldo)).toBe(0);
  const hoyColombia = new Date(Date.now() - 5 * 3600_000).toISOString().slice(0, 10);
  expect(String(v.Fecha).slice(0, 10), 'la venta queda con la fecha de hoy en Colombia').toBe(hoyColombia);
  expect(Number(uno('SELECT Existencia FROM tblarticulos WHERE Codigo = ?', COD).Existencia), 'stock baja 10 → 9').toBe(9);
  expect(Number(uno('SELECT COUNT(*) n FROM tblkardex WHERE Items = ?', art.Items).n), 'kardex registra la salida').toBe(kardexAntes + 1);
  const k = uno('SELECT Fecha FROM tblkardex WHERE Items = ? ORDER BY Id_kardex DESC LIMIT 1', art.Items);
  expect(String(k.Fecha).slice(0, 10), `kardex ${k.Fecha} con la fecha de hoy en Colombia`).toBe(hoyColombia);
  const trg = Number(uno("SELECT COUNT(*) n FROM sqlite_master WHERE type = 'trigger' AND name LIKE 'trg_hora_local_%'").n);
  expect(trg, 'el arranque instaló los triggers de hora local').toBeGreaterThan(30);
});

test.fixme('6. factura electrónica (requiere mock de la API DIAN)', async () => {
  // Pendiente: enviar.php tiene la URL de la API DIAN fija. Se habilita cuando
  // exista el mock local (variable de entorno para la base de la API).
});

test('7. cierra la caja y cuadra', async () => {
  await irAInicio();
  await win.getByText('Caja', { exact: true }).first().click();
  // La pestaña de Caja (abierta en el paso 4) debe recargarse sola al volver,
  // sin pulsar Refrescar: el cajero no puede cerrar viendo cifras viejas.
  await expect(win.getByText('Ventas Contado (1)'), 'al volver a Caja el resumen ya incluye la venta').toBeVisible({ timeout: 15_000 });
  await win.getByRole('button', { name: 'Cerrar', exact: true }).click();
  await expect(win.getByText('Cierre de Caja')).toBeVisible();
  await win.locator('input[placeholder="$ 0"]:visible').last().fill(String(BASE + PRECIO));
  await expect(win.getByText('Cuadra')).toBeVisible();
  await win.getByRole('button', { name: /Cerrar Caja/ }).last().click();
  // Diálogo de confirmación propio de la app
  await win.getByRole('button', { name: /^Cerrar caja$/ }).click();
  await expect.poll(() => uno('SELECT Estado FROM tblsesiones_caja ORDER BY Id_Sesion DESC LIMIT 1').Estado, { timeout: 20_000 }).toBe('cerrada');

  const s = uno('SELECT * FROM tblsesiones_caja ORDER BY Id_Sesion DESC LIMIT 1');
  expect(Number(s.ConteoFinal)).toBe(BASE + PRECIO);
  expect(Number(s.DiferenciaFinal), 'la venta de contado entra al cuadre').toBe(0);
  expect(minutosDesdeAhora(s.FechaCierre), `FechaCierre ${s.FechaCierre} en hora de Colombia`).toBeLessThan(5);
});

test('8. backup local contiene la venta', async () => {
  const antes = new Set(existsSync(backupDir) ? readdirSync(backupDir) : []);
  await irAInicio();
  await win.getByText(/Sin backup|Backup /).first().click();
  await win.getByRole('button', { name: /Respaldar Ahora/ }).click();
  await expect.poll(() => (existsSync(backupDir) ? readdirSync(backupDir) : []).filter(f => /\.db$/.test(f) && !antes.has(f)).length, { timeout: 60_000 }).toBeGreaterThan(0);

  const nuevo = readdirSync(backupDir).filter(f => /\.db$/.test(f) && !antes.has(f)).sort().pop()!;
  const { DatabaseSync } = require('node:sqlite');
  const copia = new DatabaseSync(join(backupDir, nuevo), { readOnly: true });
  try {
    expect(copia.prepare('PRAGMA integrity_check').get().integrity_check).toBe('ok');
    const n = Number(copia.prepare('SELECT COUNT(*) n FROM tblventas WHERE Total = ?').get(PRECIO).n);
    expect(n, 'la copia incluye la venta recién hecha (WAL volcado)').toBeGreaterThan(0);
    expect(Number(copia.prepare('SELECT Existencia FROM tblarticulos WHERE Codigo = ?').get(COD).Existencia)).toBe(9);
  } finally { copia.close(); }
});
