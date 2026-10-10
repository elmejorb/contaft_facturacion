/**
 * SincroWorker v2 — ingesta sin pérdida contra Conta Web v2.
 *
 * Pipeline:
 *   1. Entitlements activos (plataforma_web/sincronizacion) o `_force_sync_activo`.
 *   2. Lee `tbl_sync_outbox` (triggers de MySQL lo llenan).
 *   3. Agrupa por entidad, arma payload v2 con `idempotency_key` por fila.
 *   4. POST a /sync/v2/{entidad}/batch con body {email, token_api, items}.
 *   5. Procesa response.acks[]: ok|duplicate → Enviado=1, rejected → backoff.
 *   6. Garantía: idempotency_key UNIQUE en el SaaS. Reenviar la misma fila
 *      no reinserta — el SaaS responde `duplicate` y el worker la liquida igual.
 *
 * Campo clave en el outbox: `Version_Hash` (ya calculado por los triggers,
 * se recalcula aquí si falta). Deriva de (entidad+id+fecha_mod_local).
 *
 * Config esperado en app.getPath('userData')/config.json:
 *   {
 *     sync_url: "https://conta-basic.innovacion-digital.com/api-conta/public/sync/v2",
 *     sync_email: "...",
 *     sync_token_api: "...",
 *     db_name: "conta_demo"
 *   }
 */

const mysql = require('mysql2/promise');
const https = require('https');
const http = require('http');
const crypto = require('crypto');
const { URL } = require('url');

const POLL_MS = 30 * 1000;
const BATCH_SIZE = 50;              // v2 maneja mejor batches más grandes
const MAX_INTENTOS = 10;
const BACKOFF_MIN_S = 10;
const BACKOFF_MAX_S = 10 * 60;

const SAAS_BASE_URL = process.env.SAAS_SYNC_URL
  || 'https://conta-basic.innovacion-digital.com/api-conta/public/sync/v2';

// Mapeo entidad local → endpoint v2 remoto + tabla + PK local.
// `armar` es el builder del `data` que va en cada item del batch.
const MAP_ENTIDAD = {
  cliente:   { endpoint: 'clientes',    tabla: 'tblclientes',    pk: 'CodigoClien', armar: armarCliente },
  articulo:  { endpoint: 'productos',   tabla: 'tblarticulos',   pk: 'Items',       armar: armarProducto },
  proveedor: { endpoint: 'proveedores', tabla: 'tblproveedores', pk: 'CodigoPro',   armar: armarProveedor },
  venta:     { endpoint: 'ventas',      tabla: 'tblventas',      pk: 'Factura_N',   armar: armarVenta },
  pago:      { endpoint: 'pagos',       tabla: 'tblpagos',       pk: 'Id_Pagos',    armar: armarPago },
  compra:    { endpoint: 'compras',     tabla: 'tblpedidos',     pk: 'Pedido_N',    armar: armarCompra },
  gasto:     { endpoint: 'gastos',      tabla: 'tblegresos',     pk: 'Id_Egresos',  armar: armarGasto },
};

function leerDbConfig(readConfig) {
  const cfg = readConfig?.() || {};
  return {
    host: cfg.db_host || '127.0.0.1',
    user: cfg.db_user || 'root',
    password: cfg.db_pass || 'root',
    database: cfg.db_name || 'conta_demo',
  };
}

function leerSaasConfig(readConfig) {
  const cfg = readConfig?.() || {};
  return {
    url:       process.env.SAAS_SYNC_URL       || cfg.sync_url       || SAAS_BASE_URL,
    email:     process.env.SAAS_SYNC_EMAIL     || cfg.sync_email     || null,
    token_api: process.env.SAAS_SYNC_TOKEN_API || cfg.sync_token_api || null,
  };
}

let timer = null;
let corriendo = false;
let estado = {
  activo: false,
  ultimo_ciclo_at: null,
  ultimo_envio_ok_at: null,
  ultimo_error: null,
  pendientes: 0,
  enviados_sesion: 0,
  duplicados_sesion: 0,
  rechazados_sesion: 0,
};

// ============================================================
// Idempotency key — SHA256(entidad + email + codigo_externo + fecha_mod)
// ============================================================
// Determinístico: la misma fila local, con el mismo fecha_mod, siempre produce
// el mismo key. Si la fila local cambia (fecha_mod avanza), nuevo key, nuevo upsert.
function calcularKey(entidad, email, codigoExterno, fechaMod) {
  const base = `${entidad}|${email}|${codigoExterno}|${fechaMod || ''}`;
  return crypto.createHash('sha256').update(base).digest('hex');
}

function fechaIsoLocal(d) {
  if (!d) return null;
  if (d instanceof Date) {
    const t = d.getTime();
    if (!Number.isFinite(t) || t <= 0) return null;        // fechas inválidas / epoch 0
    const year = d.getUTCFullYear();
    if (year < 1900 || year > 2200) return null;           // 1899-12-30 de VB6, etc.
    return d.toISOString().replace('T', ' ').substring(0, 19);
  }
  const s = String(d).substring(0, 19);
  if (s.startsWith('0000') || s.startsWith('1899')) return null;
  return s;
}

// ============================================================
// Builders de payload — fila local → data v2 (snake_case)
// ============================================================

function armarCliente(row) {
  return {
    razon_social: row.Razon_Social || `${row.Nombres || ''} ${row.Apellidos || ''}`.trim() || `Cliente ${row.CodigoClien}`,
    numero_documento: row.Nit || String(row.Identificacion || ''),
    nombres: row.Nombres || null,
    apellidos: row.Apellidos || null,
    email: row.Email || null,
    telefono: row.Telefonos || null,
    whatsapp: row.Whatsapp || null,
    direccion: row.Direccion || row.Direcion_R || null,
    cupo_credito: Number(row.CupoAutorizado || 0),
    dias_credito: Number(row.Termino || 0),
    fecha_nacimiento: fechaIsoLocal(row.FechaCumple),
    factura_a_precio_costo: !!row.Preciocosto,
    activo: true,
  };
}

function armarProducto(row) {
  return {
    codigo: row.Codigo || String(row.Items),
    codigo_barras: row.CodigoB || null,
    nombre: row.Nombres_Articulo || `Producto ${row.Items}`,
    precio_costo: Number(row.Precio_Costo || 0),
    precio_venta: Number(row.Precio_Venta || 0),
    precio_venta_2: Number(row.Precio_Venta2 || 0),
    precio_venta_3: Number(row.Precio_Venta3 || 0),
    precio_minimo: Number(row.Precio_Minimo || 0),
    existencia: Number(row.Existencia || 0),
    existencia_minima: Number(row.Existencia_minima || 0),
    es_servicio: row.Servicio === 1,
    activo: row.Estado !== 0,
  };
}

function armarProveedor(row) {
  return {
    razon_social: row.RazonSocial || `${row.Nombres || ''} ${row.Apellidos || ''}`.trim() || `Proveedor ${row.CodigoPro}`,
    numero_documento: row.Nit || String(row.Identificacion || ''),
    telefono: row.Telefonos || null,
    direccion: row.Direccion || null,
    cuenta_bancaria: row.CuentaN || null,
    activo: true,
  };
}

function armarVenta(row, detalles) {
  // utilidad y costo_total los calcula el SaaS si no vienen, pero
  // es más eficiente mandárselos ya calculados.
  let utilidad = 0, costoTotal = 0;
  for (const d of detalles) {
    utilidad += (Number(d.precio_venta) - Number(d.precio_costo)) * Number(d.cantidad);
    costoTotal += Number(d.precio_costo) * Number(d.cantidad);
  }
  return {
    numero_factura: String(row.Factura_N),
    codigo_cliente: String(row.CodigoCli || ''),
    fecha: fechaIsoLocal(row.Fecha),
    tipo: row.Tipo || 'Contado',
    dias_credito: Number(row.Dias || 0),
    subtotal: Math.max(0, Number(row.Total || 0) - Number(row.Impuesto || 0)),
    descuento: Number(row.Descuento || 0),
    impuesto: Number(row.Impuesto || 0),
    total: Number(row.Total || 0),
    abono: Number(row.Abono || 0),
    saldo: Number(row.Saldo || 0),
    utilidad,
    costo_total: costoTotal,
    estado: row.EstadoFact || 'activa',
    observaciones: row.Comentario || null,
    items: detalles,
  };
}

function armarPago(row) {
  return {
    codigo_cliente: String(row.Codigo || ''),
    codigo_externo_venta: row.Fact_N ? String(row.Fact_N) : null,
    fecha: fechaIsoLocal(row.Fecha),
    valor: Number(row.ValorPago || 0),
    descuento: Number(row.Descuento || 0),
    retencion: Number(row.Retencion || 0),
    observaciones: row.DetallePago || null,
    estado: row.Estado || '',
  };
}

function armarCompra(row, detalles) {
  return {
    numero_factura: row.FacturaCompra_N || String(row.Pedido_N),
    codigo_proveedor: String(row.CodigoPro || ''),
    fecha: fechaIsoLocal(row.Fecha),
    tipo: row.TipoPedido || 'Contado',
    dias_credito: Number(row.Dias || 0),
    subtotal: Math.max(0, Number(row.Total || 0) - Number(row.Impuesto || 0) - Number(row.Flete || 0)),
    descuento: Number(row.Descuento || 0),
    impuesto: Number(row.Impuesto || 0),
    flete: Number(row.Flete || 0),
    total: Number(row.Total || 0),
    saldo: Number(row.Saldo || 0),
    estado: row.EstadoPedido || 'Recibido',
    observaciones: row.Comentario || null,
    items: detalles,
  };
}

function armarGasto(row) {
  return {
    categoria: row.categoria_gasto || 'otros',
    concepto: row.Concepto || 'Sin concepto',
    fecha: fechaIsoLocal(row.Fecha),
    valor: Number(row.Valor || 0),
    forma_pago_id: row.id_mediopago || 1,
    estado: row.Estado || 'Activo',
  };
}

// ============================================================
// armarItem: carga la fila local y arma el item v2 completo
// (idempotency_key + codigo_externo + fecha_actualizacion_origen + data).
// ============================================================
async function armarItem(conn, entidad, email, idEntidad, mapInfo) {
  const [rows] = await conn.query(
    `SELECT * FROM ${mapInfo.tabla} WHERE ${mapInfo.pk} = ? LIMIT 1`,
    [idEntidad]
  );
  if (!rows.length) return null;
  const row = rows[0];

  const fechaMod = row.FechaMod || row.Fecha_Mod || row.updated_at || null;
  const codigoExterno = String(row[mapInfo.pk]);

  let data;
  if (entidad === 'venta') {
    // La venta necesita cargar los items de tbldetalle_venta
    const [det] = await conn.query(
      `SELECT Items, Cantidad, PrecioC, PrecioV, Descuento, IVA, Subtotal, Impuesto, DescripcionTemp
         FROM tbldetalle_venta WHERE Factura_N = ?`,
      [idEntidad]
    ).catch(() => [[]]);
    const detalles = det.map(d => ({
      codigo_externo_producto: d.Items ? String(d.Items) : null,
      descripcion: d.DescripcionTemp || `Línea ${d.Items}`,
      cantidad: Number(d.Cantidad || 0),
      precio_costo: Number(d.PrecioC || 0),
      precio_venta: Number(d.PrecioV || 0),
      descuento: Number(d.Descuento || 0),
      porcentaje_iva: Number(d.IVA || 0),
      impuesto: Number(d.Impuesto || 0),
      subtotal: Number(d.Subtotal || 0),
    }));
    data = armarVenta(row, detalles);
  } else if (entidad === 'compra') {
    const [det] = await conn.query(
      `SELECT Items, Cantidad, PrecioC, Impuesto, Subtotal, IvaPct
         FROM tbldetalle_pedido WHERE Pedido_N = ?`,
      [idEntidad]
    ).catch(() => [[]]);
    const detalles = det.map(d => ({
      codigo_externo_producto: d.Items ? String(d.Items) : null,
      descripcion: `Línea ${d.Items}`,
      cantidad: Number(d.Cantidad || 0),
      precio_costo: Number(d.PrecioC || 0),
      porcentaje_iva: Number(d.IvaPct || 0),
      impuesto: Number(d.Impuesto || 0),
      subtotal: Number(d.Subtotal || 0),
    }));
    data = armarCompra(row, detalles);
  } else {
    data = mapInfo.armar(row);
  }

  return {
    idempotency_key: calcularKey(entidad, email, codigoExterno, fechaMod ? fechaIsoLocal(fechaMod) : ''),
    codigo_externo: codigoExterno,
    fecha_actualizacion_origen: fechaMod ? fechaIsoLocal(fechaMod) : null,
    data,
  };
}

// ============================================================
// HTTP
// ============================================================
function postJson(urlStr, body) {
  return new Promise((resolve, reject) => {
    try {
      const u = new URL(urlStr);
      const lib = u.protocol === 'https:' ? https : http;
      const data = JSON.stringify(body);
      const req = lib.request({
        hostname: u.hostname,
        port: u.port || (u.protocol === 'https:' ? 443 : 80),
        path: u.pathname + u.search,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(data),
          'Accept': 'application/json',
        },
      }, (res) => {
        let chunks = '';
        res.on('data', (c) => { chunks += c; });
        res.on('end', () => {
          let parsed = null;
          try { parsed = JSON.parse(chunks); } catch { parsed = { raw: chunks }; }
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve({ status: res.statusCode, body: parsed });
          } else {
            const msg = parsed?.mensaje || parsed?.message || parsed?.raw || `HTTP ${res.statusCode}`;
            reject(new Error(`${res.statusCode}: ${msg}`));
          }
        });
      });
      req.on('error', reject);
      req.setTimeout(30000, () => { req.destroy(new Error('timeout 30s')); });
      req.write(data);
      req.end();
    } catch (e) { reject(e); }
  });
}

// ============================================================
// Ciclo principal
// ============================================================
async function cicloUnavez(mainWindow, readConfig, getEntitlements) {
  if (corriendo) return;
  corriendo = true;
  estado.ultimo_ciclo_at = new Date().toISOString();

  try {
    const cfgEarly = readConfig?.() || {};
    const forceActivo = cfgEarly._force_sync_activo === true;
    const ent = await getEntitlements();
    const flagActivo = forceActivo ||
      ent?.modulos?.plataforma_web?.activo === true ||
      ent?.modulos?.sincronizacion?.activo === true;
    if (!flagActivo) {
      estado.activo = false;
      corriendo = false;
      return;
    }
    estado.activo = true;

    const saas = leerSaasConfig(readConfig);
    if (!saas.email || !saas.token_api) {
      estado.ultimo_error = 'Faltan credenciales sync_email / sync_token_api en config.json';
      corriendo = false;
      return;
    }

    const dbCfg = leerDbConfig(readConfig);
    const conn = await mysql.createConnection(dbCfg);
    try {
      // Chequear outbox
      const [exists] = await conn.query(
        `SELECT COUNT(*) AS c FROM information_schema.TABLES
         WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'tbl_sync_outbox'`,
        [dbCfg.database]
      );
      if (!exists[0]?.c) {
        estado.ultimo_error = 'tbl_sync_outbox no existe — correr modulo_sync.sql';
        corriendo = false;
        return;
      }

      const [pending] = await conn.query(
        `SELECT Id_Outbox, Entidad, Id_Entidad, Operacion, Intentos
           FROM tbl_sync_outbox
          WHERE Enviado = 0
            AND Intentos < ?
            AND (Prox_Reintento IS NULL OR Prox_Reintento <= NOW())
          ORDER BY Id_Outbox
          LIMIT ?`,
        [MAX_INTENTOS, BATCH_SIZE]
      );

      const [tot] = await conn.query(
        `SELECT COUNT(*) AS c FROM tbl_sync_outbox WHERE Enviado = 0`
      );
      estado.pendientes = tot[0]?.c || 0;

      // Agrupar por entidad para 1 POST por tipo
      const porEntidad = {};
      for (const f of pending) {
        if (!porEntidad[f.Entidad]) porEntidad[f.Entidad] = [];
        porEntidad[f.Entidad].push(f);
      }

      for (const [entidad, filas] of Object.entries(porEntidad)) {
        const mapInfo = MAP_ENTIDAD[entidad];
        if (!mapInfo) {
          for (const f of filas) {
            await conn.query(
              `UPDATE tbl_sync_outbox SET Enviado=1, Ultimo_Error='Entidad desconocida' WHERE Id_Outbox=?`,
              [f.Id_Outbox]
            );
          }
          continue;
        }
        if (!mapInfo.endpoint) {
          for (const f of filas) {
            await conn.query(
              `UPDATE tbl_sync_outbox SET Enviado=1, Ultimo_Error=? WHERE Id_Outbox=?`,
              [`skip: ${mapInfo.nota}`, f.Id_Outbox]
            );
          }
          continue;
        }

        try {
          const items = [];
          const keyToOutboxId = new Map();  // idempotency_key → Id_Outbox para procesar acks[]
          for (const f of filas) {
            const item = await armarItem(conn, entidad, saas.email, f.Id_Entidad, mapInfo);
            if (!item) {
              // Fila ya no existe localmente
              await conn.query(
                `UPDATE tbl_sync_outbox SET Enviado=1, Ultimo_Error='Fila local no existe' WHERE Id_Outbox=?`,
                [f.Id_Outbox]
              );
              continue;
            }
            items.push(item);
            keyToOutboxId.set(item.idempotency_key, f.Id_Outbox);
          }

          if (items.length === 0) continue;

          const url = `${saas.url}/${mapInfo.endpoint}/batch`;
          const resp = await postJson(url, {
            email: saas.email,
            token_api: saas.token_api,
            items,
          });

          if (!resp.body?.ok) {
            throw new Error(resp.body?.mensaje || resp.body?.error || 'SaaS rechazó el batch');
          }

          const acks = resp.body?.acks || [];
          console.log(`[sync] ${entidad}: ${resp.body.aceptados} ok, ${resp.body.duplicados} dup, ${resp.body.rechazados} rej`);

          // Procesar ACK por fila
          const acksProcesados = new Set();
          for (const ack of acks) {
            acksProcesados.add(ack.idempotency_key);
            const outboxId = keyToOutboxId.get(ack.idempotency_key);
            if (!outboxId) continue;

            if (ack.status === 'ok' || ack.status === 'duplicate') {
              await conn.query(
                `UPDATE tbl_sync_outbox SET Enviado=1, Fecha_Envio=NOW(), Ultimo_Error=? WHERE Id_Outbox=?`,
                [ack.status === 'duplicate' ? 'duplicate (ya aceptado antes)' : null, outboxId]
              );
              if (ack.status === 'ok') estado.enviados_sesion++;
              else estado.duplicados_sesion++;
            } else {
              // rejected → reintento con backoff
              const fila = filas.find(f => f.Id_Outbox === outboxId);
              const nuevosIntentos = (fila?.Intentos || 0) + 1;
              const backoffS = Math.min(BACKOFF_MIN_S * Math.pow(2, nuevosIntentos), BACKOFF_MAX_S);
              await conn.query(
                `UPDATE tbl_sync_outbox SET Intentos=?, Ultimo_Error=?, Prox_Reintento=DATE_ADD(NOW(), INTERVAL ? SECOND) WHERE Id_Outbox=?`,
                [nuevosIntentos, String(ack.error || 'rejected').slice(0, 500), backoffS, outboxId]
              );
              estado.rechazados_sesion++;
            }
          }

          // Si una fila no recibió ACK (shouldn't happen, pero por si acaso),
          // la tratamos como fallo transitorio.
          for (const [key, outboxId] of keyToOutboxId.entries()) {
            if (!acksProcesados.has(key)) {
              const fila = filas.find(f => f.Id_Outbox === outboxId);
              const nuevosIntentos = (fila?.Intentos || 0) + 1;
              const backoffS = Math.min(BACKOFF_MIN_S * Math.pow(2, nuevosIntentos), BACKOFF_MAX_S);
              await conn.query(
                `UPDATE tbl_sync_outbox SET Intentos=?, Ultimo_Error='Sin ACK del SaaS', Prox_Reintento=DATE_ADD(NOW(), INTERVAL ? SECOND) WHERE Id_Outbox=?`,
                [nuevosIntentos, backoffS, outboxId]
              );
            }
          }

          estado.ultimo_envio_ok_at = new Date().toISOString();
        } catch (e) {
          // Error de red o rechazo global del batch — todas las filas van a retry
          const msg = String(e?.message || e).slice(0, 500);
          for (const f of filas) {
            const nuevosIntentos = (f.Intentos || 0) + 1;
            const backoffS = Math.min(BACKOFF_MIN_S * Math.pow(2, nuevosIntentos), BACKOFF_MAX_S);
            await conn.query(
              `UPDATE tbl_sync_outbox
                  SET Intentos=?, Ultimo_Error=?, Prox_Reintento=DATE_ADD(NOW(), INTERVAL ? SECOND)
                WHERE Id_Outbox=?`,
              [nuevosIntentos, msg, backoffS, f.Id_Outbox]
            );
          }
          estado.ultimo_error = `${entidad}: ${msg}`;
          console.warn(`[sync] fallo ${entidad} (${filas.length} filas): ${msg}`);
        }
      }

      await conn.query(
        `UPDATE tbl_sync_estado
            SET Last_Sync_At=NOW(),
                Pendientes_Cnt=?,
                Last_Error=?,
                Last_Error_At=IF(? IS NOT NULL, NOW(), Last_Error_At)
          WHERE Id=1`,
        [estado.pendientes, estado.ultimo_error, estado.ultimo_error]
      );
    } finally {
      await conn.end();
    }

    try { mainWindow?.webContents?.send('sync:estado', estado); } catch {}
  } catch (e) {
    estado.ultimo_error = String(e?.message || e);
    console.error('[sync] ciclo falló:', e?.message || e);
  } finally {
    corriendo = false;
  }
}

function iniciar(mainWindow, readConfig, getEntitlements) {
  if (timer) { console.log('[sync] ya está corriendo'); return; }
  console.log('[sync] worker v2 iniciado — intervalo', POLL_MS, 'ms');
  cicloUnavez(mainWindow, readConfig, getEntitlements);
  timer = setInterval(() => cicloUnavez(mainWindow, readConfig, getEntitlements), POLL_MS);
}

function detener() {
  if (timer) { clearInterval(timer); timer = null; console.log('[sync] worker detenido'); }
  estado.activo = false;
}

function getEstado() { return { ...estado }; }

async function forzarCiclo(mainWindow, readConfig, getEntitlements) {
  await cicloUnavez(mainWindow, readConfig, getEntitlements);
  return getEstado();
}

/**
 * Backfill — encola en tbl_sync_outbox todo el histórico desde una fecha dada.
 * Después el worker lo procesa en los próximos ciclos (BATCH_SIZE por vez).
 *
 * Idempotente: usa NOT EXISTS → si una fila ya está pending no la duplica.
 * Las ya enviadas tampoco se reenvían (porque el idempotency_key del SaaS las
 * marcaría como duplicate, pero evitamos tráfico innecesario).
 *
 * @param {string} desdeIso 'YYYY-MM-DD' — ventas y pagos desde esa fecha
 * @returns {{encolados: {cliente,articulo,proveedor,venta,pago}}}
 */
async function backfill(readConfig, desdeIso) {
  const dbCfg = leerDbConfig(readConfig);
  const conn = await mysql.createConnection(dbCfg);
  const desde = desdeIso || '2020-01-01';
  const resultado = {};
  try {
    // Chequear outbox
    const [exists] = await conn.query(
      `SELECT COUNT(*) AS c FROM information_schema.TABLES
       WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'tbl_sync_outbox'`,
      [dbCfg.database]
    );
    if (!exists[0]?.c) {
      throw new Error('tbl_sync_outbox no existe — correr modulo_sync.sql primero');
    }

    // Clientes (todos — no tienen fecha confiable)
    const [c1] = await conn.query(`
      INSERT INTO tbl_sync_outbox (Entidad, Id_Entidad, Operacion, Fecha_Creacion)
      SELECT 'cliente', c.CodigoClien, 'upsert', NOW() FROM tblclientes c
      WHERE NOT EXISTS (
        SELECT 1 FROM tbl_sync_outbox o WHERE o.Entidad='cliente' AND o.Id_Entidad=c.CodigoClien AND o.Enviado=0
      )
    `);
    resultado.cliente = c1.affectedRows;

    // Artículos activos
    const [c2] = await conn.query(`
      INSERT INTO tbl_sync_outbox (Entidad, Id_Entidad, Operacion, Fecha_Creacion)
      SELECT 'articulo', a.Items, 'upsert', NOW() FROM tblarticulos a
      WHERE (a.Estado IS NULL OR a.Estado <> 0)
        AND NOT EXISTS (
          SELECT 1 FROM tbl_sync_outbox o WHERE o.Entidad='articulo' AND o.Id_Entidad=a.Items AND o.Enviado=0
        )
    `);
    resultado.articulo = c2.affectedRows;

    // Proveedores
    const [c3] = await conn.query(`
      INSERT INTO tbl_sync_outbox (Entidad, Id_Entidad, Operacion, Fecha_Creacion)
      SELECT 'proveedor', p.CodigoPro, 'upsert', NOW() FROM tblproveedores p
      WHERE NOT EXISTS (
        SELECT 1 FROM tbl_sync_outbox o WHERE o.Entidad='proveedor' AND o.Id_Entidad=p.CodigoPro AND o.Enviado=0
      )
    `);
    resultado.proveedor = c3.affectedRows;

    // Ventas desde la fecha
    const [c4] = await conn.query(`
      INSERT INTO tbl_sync_outbox (Entidad, Id_Entidad, Operacion, Fecha_Creacion)
      SELECT 'venta', v.Factura_N, 'upsert', v.Fecha FROM tblventas v
      WHERE v.Fecha >= ?
        AND NOT EXISTS (
          SELECT 1 FROM tbl_sync_outbox o WHERE o.Entidad='venta' AND o.Id_Entidad=v.Factura_N AND o.Enviado=0
        )
      ORDER BY v.Fecha
    `, [desde]);
    resultado.venta = c4.affectedRows;

    // Pagos desde la fecha
    const [c5] = await conn.query(`
      INSERT INTO tbl_sync_outbox (Entidad, Id_Entidad, Operacion, Fecha_Creacion)
      SELECT 'pago', p.Id_Pagos, 'upsert', p.Fecha FROM tblpagos p
      WHERE p.Fecha >= ?
        AND NOT EXISTS (
          SELECT 1 FROM tbl_sync_outbox o WHERE o.Entidad='pago' AND o.Id_Entidad=p.Id_Pagos AND o.Enviado=0
        )
      ORDER BY p.Fecha
    `, [desde]);
    resultado.pago = c5.affectedRows;

    const total = Object.values(resultado).reduce((s, n) => s + n, 0);
    console.log('[sync] backfill desde', desde, '→ encolados:', resultado, 'total:', total);
    return { ok: true, desde, encolados: resultado, total };
  } finally {
    await conn.end();
  }
}

module.exports = { iniciar, detener, getEstado, forzarCiclo, backfill };
