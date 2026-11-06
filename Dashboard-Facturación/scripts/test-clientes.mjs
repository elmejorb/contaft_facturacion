// Pruebas con BASES REALES DE CLIENTES (npm run test:clientes).
//
// Por cada dump *.sql en C:\ContaFT-pruebas\bases\ (o CONTAFT_BASES_DIR):
//   1. Restaura en una BD MySQL temporal (ctest_<nombre>).
//   2. Métricas ANTES (ventas, FE, inventario por producto, kardex, pagos,
//      cartera POS/FE, caja, egresos, compras).
//   3. Aplica la migración de la versión (sql/actualizacion_completa.sql) SIN
//      --force: cualquier error de SQL hace fallar la prueba.
//   4. Métricas DESPUÉS: deben ser IGUALES salvo lo declarado en
//      tests/clientes/cambios_esperados.json para esta versión (y en la
//      dirección declarada). Se migra una SEGUNDA vez: nada puede cambiar
//      (idempotencia).
//   5. Endpoints principales en MODO LEGACY XAMPP real: copia del backend del
//      repo + el database.php VIEJO que tienen los clientes (nunca se
//      actualiza) + PHP de XAMPP. Ninguno puede responder 5xx, HTML/Fatal, ni
//      un JSON con error SQL.
//   6. Convierte la BD a SQLite con el mismo bootstrap del cliente embebido y
//      el PHP que se empaca (php-portable). Métricas SQLite == MySQL. Tablas o
//      columnas que el esquema SQLite no tiene → falla (salvo
//      tests/clientes/sqlite_exclusiones.json). Mismos endpoints en SQLite,
//      con php -S apuntando al backend DEL REPO.
// Si una sola base falla → exit 1 (pre-build-tests no emite constancia).
//
// Los dumps son datos reales de clientes: viven FUERA del repo y nunca se
// commitean.
//
// Flags: --json-resumen (última línea = JSON para pre-build-tests)
//        --solo=<texto>   (solo bases cuyo nombre contenga el texto)
//        --conservar      (no borra BD/temporales al final, para depurar)

import { spawn, spawnSync } from 'node:child_process';
import { createReadStream, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync, cpSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const RAIZ      = dirname(dirname(fileURLToPath(import.meta.url)));
const REPO      = join(RAIZ, '..');
const BACKEND   = join(REPO, 'conta-app-backend');
const TESTS     = join(BACKEND, 'tests', 'clientes');
const BASES_DIR = process.env.CONTAFT_BASES_DIR || 'C:/ContaFT-pruebas/bases';
const MYSQL     = 'C:/xampp/mysql/bin/mysql.exe';
const PHP_XAMPP = 'C:/xampp/php/php.exe';
const PHP_PORT  = join(RAIZ, 'php-portable', 'php.exe');
const PHP_PORT_INI = join(RAIZ, 'php-portable', 'php.ini');
const TMP       = join(tmpdir(), 'contaft-test-clientes');

const args = process.argv.slice(2);
const JSON_RESUMEN = args.includes('--json-resumen');
const CONSERVAR = args.includes('--conservar');
const SOLO = (args.find(a => a.startsWith('--solo=')) || '').slice(7).toLowerCase();

const version = JSON.parse(readFileSync(join(RAIZ, 'package.json'), 'utf-8')).version;
const esperados = (JSON.parse(readFileSync(join(TESTS, 'cambios_esperados.json'), 'utf-8'))[version]) || {};
const exclusiones = JSON.parse(readFileSync(join(TESTS, 'sqlite_exclusiones.json'), 'utf-8'));

const log = (m) => console.log(m);
let totalPruebas = 0;

// ---------------------------------------------------------------------------
function mysql(argsSql, opts = {}) {
  return spawnSync(MYSQL, ['-uroot', '-proot', ...argsSql], { encoding: 'utf-8', maxBuffer: 64 << 20, ...opts });
}
function mysqlArchivo(db, archivo) {
  // Importa un .sql grande por stdin (stream) sin --force.
  return new Promise((resolve) => {
    const p = spawn(MYSQL, ['-uroot', '-proot', '--default-character-set=utf8mb4', db], { stdio: ['pipe', 'ignore', 'pipe'] });
    let err = '';
    p.stderr.on('data', d => { err += d; });
    createReadStream(archivo).pipe(p.stdin);
    p.on('close', code => resolve({ code, err: err.replace(/.*Using a password.*\n?/g, '').trim() }));
  });
}
function php(bin, ini, script, scriptArgs) {
  const a = ini ? ['-c', ini] : [];
  const r = spawnSync(bin, [...a, '-d', 'memory_limit=2G', script, ...scriptArgs], { encoding: 'utf-8', maxBuffer: 64 << 20 });
  return r;
}
function metricas(bin, ini, flag) {
  const r = php(bin, ini, join(TESTS, 'metricas.php'), [flag]);
  if (r.status !== 0) throw new Error('metricas.php falló: ' + (r.stderr || r.stdout));
  return JSON.parse(r.stdout);
}
async function dumpSeguro(archivo) {
  // Un dump con USE/CREATE DATABASE podría escribir en la BD real del cliente.
  return new Promise((resolve) => {
    let resto = '', malo = null;
    const s = createReadStream(archivo, { encoding: 'utf-8', highWaterMark: 1 << 20 });
    s.on('data', chunk => {
      const t = resto + chunk;
      const m = /^\s*(USE\s+`?\w+|CREATE\s+DATABASE|DROP\s+DATABASE)/im.exec(t);
      if (m) { malo = m[0].trim(); s.destroy(); }
      resto = t.slice(-200);
    });
    s.on('close', () => resolve(malo));
    s.on('end', () => resolve(malo));
  });
}
const valorComparable = (v) => (v && typeof v === 'object' && 'total' in v) ? v.total : (typeof v === 'number' ? v : null);

// Entre motores (MySQL legacy vs SQLite) una métrica {n,total} puede no tener
// 'total' de un lado porque la COLUMNA no existe en el esquema viejo; eso ya
// lo reporta la conversión. Aquí se comparan solo los campos de ambos lados.
function soloComunes(a, b) {
  if (!a || !b || typeof a !== 'object' || typeof b !== 'object' || Array.isArray(a)) return [a, b];
  const ks = Object.keys(a).filter(k => k in b);
  return [Object.fromEntries(ks.map(k => [k, a[k]])), Object.fromEntries(ks.map(k => [k, b[k]]))];
}
function compararMetricas(antes, despues, permitidos, etiqueta, entreMotores = false) {
  const fallas = [];
  for (const k of new Set([...Object.keys(antes), ...Object.keys(despues)])) {
    if (k === 'motor') continue;
    totalPruebas++;
    const [x, y] = entreMotores && k !== 'fe_por_estado' ? soloComunes(antes[k], despues[k]) : [antes[k], despues[k]];
    const a = JSON.stringify(x), d = JSON.stringify(y);
    if (a === d) continue;
    const regla = permitidos[k];
    if (!regla) { fallas.push(`${etiqueta}: '${k}' cambió y no está permitido → antes=${a} después=${d}`); continue; }
    const va = valorComparable(antes[k]), vd = valorComparable(despues[k]);
    if (regla.direccion === 'baja' && !(vd <= va)) fallas.push(`${etiqueta}: '${k}' debía BAJAR (${regla.motivo}) → antes=${a} después=${d}`);
    else if (regla.direccion === 'sube' && !(vd >= va)) fallas.push(`${etiqueta}: '${k}' debía SUBIR (${regla.motivo}) → antes=${a} después=${d}`);
    else log(`      · ${k} cambió (permitido ${version}: ${regla.motivo}) ${va} → ${vd}`);
  }
  return fallas;
}

// --- Servidor PHP de prueba --------------------------------------------------------
function arrancarPhp({ bin, ini, docRoot, prepend, port, env }) {
  const a = [];
  if (ini) a.push('-c', ini);
  if (prepend) a.push('-d', `auto_prepend_file=${prepend}`);
  a.push('-d', 'display_errors=1', '-S', `127.0.0.1:${port}`, '-t', docRoot);
  const p = spawn(bin, a, { cwd: docRoot, env: { ...process.env, ...env }, stdio: 'ignore' });
  return p;
}
async function esperarPuerto(port) {
  for (let i = 0; i < 50; i++) {
    try { await fetch(`http://127.0.0.1:${port}/empresa/datos.php`, { signal: AbortSignal.timeout(2000) }); return; } catch { await new Promise(r => setTimeout(r, 200)); }
  }
  throw new Error(`php -S no levantó en el puerto ${port}`);
}
function matarProceso(p) {
  if (!p || p.exitCode !== null) return;
  spawnSync('taskkill', ['/PID', String(p.pid), '/T', '/F'], { stdio: 'ignore' });
}

const codificar = (s) => [...s].map(c => c.charCodeAt(0).toString(2).padStart(7, '0')).join('');

function endpoints(anio) {
  const tiposInforme = ['cierre_mes', 'estado_resultados', 'cuadre_caja', 'top_productos', 'cartera', 'ventas_listado',
    'compras_listado', 'inventario_valorizado', 'productos_agotados', 'gastos_listado', 'top_clientes',
    'ventas_por_categoria', 'pagos_proveedores', 'graficos', 'comparativo_anual', 'proveedores_listado',
    'proveedores_saldos', 'ventas_mensual', 'ventas_diario', 'iva', 'facturas_vendedor', 'panel_gerencial'];
  return [
    ['GET', '/empresa/datos.php'],
    ['GET', '/modulos/estado.php'],
    ['GET', '/inventario/articulos.php'],
    ['GET', '/familias/stock-bajo.php'],
    ['GET', '/lotes/index.php?por_vencer=1'],
    ['GET', '/clientes/listar.php'],
    ['GET', '/clientes/cartera.php'],
    ['GET', '/clientes/cumpleanos.php'],
    ['GET', '/ventas/listar.php'],
    ['GET', '/caja/sesion.php?cajas=1&usuario=1'],
    ['GET', '/caja/sesion.php?usuario=1'],
    ['GET', `/movimientos/pagos-clientes.php?anio=${anio}`],
    ['GET', `/facturacion-electronica/listar.php?anio=${anio}`],
    ['GET', '/dashboard/resumen.php'],
    ['GET', `/informes/ingresos-totales.php?desde=${anio}-01-01&hasta=${anio}-12-31`],
    ['GET', '/vendedores/config.php'],
    ['GET', '/backup/?estado'],
    ...tiposInforme.map(t => ['GET', `/informes/resumen.php?tipo=${t}&anio=${anio}&desde=${anio}-01-01&hasta=${anio}-12-31`]),
  ];
}
async function probarEndpoints(port, etiqueta, anio) {
  const fallas = [];
  const base = `http://127.0.0.1:${port}`;
  const revisar = (nombre, status, txt) => {
    totalPruebas++;
    let json = null;
    try { json = JSON.parse(txt); } catch { /* abajo */ }
    if (status >= 500) return fallas.push(`${etiqueta} ${nombre}: HTTP ${status} ${txt.slice(0, 160)}`);
    if (/Fatal error|Uncaught|Parse error/i.test(txt)) return fallas.push(`${etiqueta} ${nombre}: error PHP ${txt.slice(0, 200)}`);
    if (json === null) return fallas.push(`${etiqueta} ${nombre}: respuesta no es JSON (¿warning PHP?) ${txt.slice(0, 200)}`);
    if (/SQLSTATE|no such table|no such column|Unknown column|doesn't exist|syntax error/i.test(txt))
      return fallas.push(`${etiqueta} ${nombre}: error SQL ${txt.slice(0, 220)}`);
  };
  // Login con el usuario de prueba creado en la BD temporal
  try {
    const r = await fetch(`${base}/auth/login.php`, { method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'ctest', password: codificar('ctest123') }) });
    const txt = await r.text();
    revisar('POST /auth/login.php', r.status, txt);
    totalPruebas++;
    if (!/"success"\s*:\s*true/.test(txt)) fallas.push(`${etiqueta} login: no autenticó al usuario de prueba → ${txt.slice(0, 160)}`);
  } catch (e) { fallas.push(`${etiqueta} login: ${e.message}`); }
  for (const [metodo, ruta] of endpoints(anio)) {
    try {
      const r = await fetch(base + ruta, { method: metodo, signal: AbortSignal.timeout(120000) });
      revisar(`${metodo} ${ruta}`, r.status, await r.text());
    } catch (e) { totalPruebas++; fallas.push(`${etiqueta} ${metodo} ${ruta}: ${e.message}`); }
  }
  return fallas;
}

// ---------------------------------------------------------------------------
async function probarBase(archivo, indice) {
  const nombre = basename(archivo, '.sql');
  const slug = nombre.toLowerCase().replace(/[^a-z0-9]+/g, '_').slice(0, 40);
  const db = `ctest_${slug}`;
  const dir = join(TMP, slug);
  const fallas = [];
  const procesos = [];
  log(`\n▶ ${nombre}  (${(statSync(archivo).size / 1048576).toFixed(1)} MB)`);
  rmSync(dir, { recursive: true, force: true });
  mkdirSync(dir, { recursive: true });

  try {
    const malo = await dumpSeguro(archivo);
    if (malo) throw new Error(`el dump contiene "${malo}" — podría escribir en otra BD. Quítalo del archivo.`);

    // 1. Restaurar
    mysql(['-e', `DROP DATABASE IF EXISTS \`${db}\`; CREATE DATABASE \`${db}\` CHARACTER SET utf8mb4`]);
    let t = Date.now();
    const imp = await mysqlArchivo(db, archivo);
    if (imp.code !== 0) throw new Error(`no se pudo restaurar el dump: ${imp.err.slice(0, 300)}`);
    const verRow = mysql(['-N', db, '-e', 'SELECT version_sql_aplicada FROM tbldatosempresa LIMIT 1']);
    log(`   restaurada en ${((Date.now() - t) / 1000).toFixed(0)}s — versión SQL de la base: ${(verRow.stdout || '?').trim() || '?'}`);

    // 2-4. Migración: antes / después / idempotencia
    const antes = metricas(PHP_XAMPP, null, `--mysql=${db}`);
    t = Date.now();
    const mig = await mysqlArchivo(db, join(BACKEND, 'sql', 'actualizacion_completa.sql'));
    totalPruebas++;
    if (mig.code !== 0) { fallas.push(`migración actualizacion_completa.sql falló: ${mig.err.slice(0, 400)}`); throw new Error('migración'); }
    log(`   migración aplicada en ${((Date.now() - t) / 1000).toFixed(1)}s`);
    const despues = metricas(PHP_XAMPP, null, `--mysql=${db}`);
    fallas.push(...compararMetricas(antes, despues, esperados, 'migración'));
    const mig2 = await mysqlArchivo(db, join(BACKEND, 'sql', 'actualizacion_completa.sql'));
    totalPruebas++;
    if (mig2.code !== 0) fallas.push(`segunda migración (idempotencia) falló: ${mig2.err.slice(0, 300)}`);
    fallas.push(...compararMetricas(despues, metricas(PHP_XAMPP, null, `--mysql=${db}`), {}, 'idempotencia'));

    // Usuario de prueba (solo en la BD temporal)
    const maxId = mysql(['-N', db, '-e', 'SELECT COALESCE(MAX(Id_Usuario),0)+1 FROM tblusuarios']).stdout.trim();
    mysql([db, '-e', `DELETE FROM tblusuarios WHERE Usuario='ctest'; INSERT INTO tblusuarios (Id_Usuario, Usuario, Nombre, contrasena, Id_TiposUsuario) VALUES (${maxId}, 'ctest', 'Prueba automatica', '${codificar('ctest123')}', 1)`]);
    const anioRow = mysql(['-N', db, '-e', 'SELECT YEAR(MAX(Fecha)) FROM tblventas']).stdout.trim();
    const anio = /^\d{4}$/.test(anioRow) ? anioRow : String(new Date().getFullYear());

    // 5. Endpoints MySQL en modo legacy XAMPP real
    const legacy = join(dir, 'backend');
    cpSync(BACKEND, legacy, { recursive: true, filter: (s) => !/[\\/](tests|uploads|backups-contaft-server)([\\/]|$)/.test(s.slice(BACKEND.length)) });
    writeFileSync(join(legacy, 'api', 'config', 'database.php'),
      readFileSync(join(TESTS, 'database_legacy.php.tpl'), 'utf-8').replace('__DB__', db));
    rmSync(join(legacy, 'api', 'config', 'config.json'), { force: true });
    const portMy = 8300 + indice * 2;
    const pMy = arrancarPhp({ bin: PHP_XAMPP, docRoot: join(legacy, 'api'), prepend: join(legacy, 'prepend.php'), port: portMy,
      env: { CONTA_CONFIG_PATH: '', CONTAFT_BACKUP_DIR: join(dir, 'backups') } });
    procesos.push(pMy);
    await esperarPuerto(portMy);
    fallas.push(...await probarEndpoints(portMy, 'mysql-legacy', anio));
    matarProceso(pMy);

    // 6. SQLite (php-portable = el PHP que se empaca)
    const dbSqlite = join(dir, 'conta.db');
    const conv = php(PHP_PORT, PHP_PORT_INI, join(TESTS, 'mysql_a_sqlite.php'), [`--mysql=${db}`, `--sqlite=${dbSqlite}`]);
    let res = null;
    try { res = JSON.parse((conv.stdout || '').trim().split(/\r?\n/).pop()); } catch { /* abajo */ }
    totalPruebas++;
    if (!res) { fallas.push(`conversión a SQLite falló: ${(conv.stderr || conv.stdout || '').slice(0, 300)}`); throw new Error('sqlite'); }
    if (res.errores?.length) fallas.push(`SQLite: ${res.filas_fallidas} filas no se pudieron copiar: ${res.errores.slice(0, 3).join(' | ')}`);
    for (const t of res.solo_mysql) {
      totalPruebas++;
      const tabla = t.split(' ')[0];
      if (!exclusiones.tablas[tabla]) fallas.push(`SQLite: el esquema embebido no tiene la tabla ${t}`);
    }
    for (const [tabla, cols] of Object.entries(res.columnas_omitidas || {})) {
      for (const c of cols) {
        totalPruebas++;
        if (!(exclusiones.columnas[tabla] || []).includes(c)) fallas.push(`SQLite: el esquema embebido no tiene la columna ${tabla}.${c}`);
      }
    }
    const mSq = metricas(PHP_PORT, PHP_PORT_INI, `--sqlite=${dbSqlite}`);
    const mMy = metricas(PHP_XAMPP, null, `--mysql=${db}`);
    fallas.push(...compararMetricas(mMy, mSq, {}, 'mysql-vs-sqlite', true));

    const cfg = join(dir, 'config.json');
    writeFileSync(cfg, JSON.stringify({ driver: 'sqlite', sqlite: { path: dbSqlite.replace(/\\/g, '/') } }));
    const portSq = portMy + 1;
    const pSq = arrancarPhp({ bin: PHP_PORT, ini: PHP_PORT_INI, docRoot: join(BACKEND, 'api'), prepend: join(BACKEND, 'prepend.php'), port: portSq,
      env: { CONTA_CONFIG_PATH: cfg, CONTAFT_BACKUP_DIR: join(dir, 'backups') } });
    procesos.push(pSq);
    await esperarPuerto(portSq);
    fallas.push(...await probarEndpoints(portSq, 'sqlite', anio));
    matarProceso(pSq);
  } catch (e) {
    if (!fallas.length || !/^(migración|sqlite)$/.test(e.message)) fallas.push(String(e.message || e));
  } finally {
    procesos.forEach(matarProceso);
    if (!CONSERVAR) {
      mysql(['-e', `DROP DATABASE IF EXISTS \`${db}\``]);
      rmSync(dir, { recursive: true, force: true });
    }
  }

  if (fallas.length) {
    log(`   \x1b[31m✗ ${fallas.length} falla(s):\x1b[0m`);
    fallas.forEach(f => log('     - ' + f));
  } else {
    log('   \x1b[32m✓ OK\x1b[0m');
  }
  return fallas.length === 0;
}

// ---------------------------------------------------------------------------
async function main() {
  log(`=== test:clientes — Conta FT ${version} — bases en ${BASES_DIR}`);
  for (const [bin, n] of [[MYSQL, 'mysql.exe (XAMPP)'], [PHP_XAMPP, 'php.exe (XAMPP)'], [PHP_PORT, 'php-portable']]) {
    if (!existsSync(bin)) { log(`✗ No encontré ${n} en ${bin}`); return { ok: false, bases_probadas: 0, total_pruebas: 0 }; }
  }
  if (!existsSync(BASES_DIR)) { log(`✗ No existe ${BASES_DIR}. Copia ahí los dumps .sql de clientes (fuera del repo).`); return { ok: false, bases_probadas: 0, total_pruebas: 0 }; }
  const archivos = readdirSync(BASES_DIR).filter(f => f.toLowerCase().endsWith('.sql'))
    .filter(f => !SOLO || f.toLowerCase().includes(SOLO)).sort().map(f => join(BASES_DIR, f));
  if (!archivos.length) { log(`✗ No hay dumps .sql en ${BASES_DIR}.`); return { ok: false, bases_probadas: 0, total_pruebas: 0 }; }
  mkdirSync(TMP, { recursive: true });

  let ok = true, i = 0;
  const t0 = Date.now();
  for (const a of archivos) { if (!(await probarBase(a, i++))) ok = false; }
  log(`\n=== ${ok ? '\x1b[32m✓ TODAS LAS BASES OK' : '\x1b[31m✗ HAY BASES CON FALLAS'}\x1b[0m — ${archivos.length} base(s), ${totalPruebas} verificaciones, ${((Date.now() - t0) / 60000).toFixed(1)} min`);
  return { ok, bases_probadas: archivos.length, total_pruebas: totalPruebas };
}

const resumen = await main();
if (JSON_RESUMEN) console.log(JSON.stringify(resumen));
process.exit(resumen.ok ? 0 : 1);
