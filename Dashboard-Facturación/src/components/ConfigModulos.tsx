import { useState, useMemo, useEffect, useRef } from 'react';
import {
  Package, Check, Loader2, AlertTriangle, Users, FileText,
  Cloud, Smartphone, CreditCard, Wrench, Globe, ShieldCheck,
  Receipt
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useModulos, triggerModulosRefresh } from '../hooks/useModulos';
import { useEntitlements } from '../hooks/useEntitlements';
import toast from 'react-hot-toast';

// Flag legacy en localStorage (ConfiguracionSistema.tsx). Cada módulo que
// antes vivía solo en localStorage queda espejado aquí para unificar la
// pantalla de módulos con la fuente vieja sin romper el código que ya la lee.
const CONFIG_KEY_LEGACY = 'config_sistema';
const LEGACY_KEY_POR_MODULO: Record<string, string> = {
  financiaciones: 'usarFinanciaciones',
};

function leerLegacy(moduloKey: string): boolean | null {
  const campo = LEGACY_KEY_POR_MODULO[moduloKey];
  if (!campo) return null;
  try {
    const raw = localStorage.getItem(CONFIG_KEY_LEGACY);
    if (!raw) return null;
    const cfg = JSON.parse(raw);
    return !!cfg[campo];
  } catch { return null; }
}

function escribirLegacy(moduloKey: string, valor: boolean) {
  const campo = LEGACY_KEY_POR_MODULO[moduloKey];
  if (!campo) return;
  try {
    const raw = localStorage.getItem(CONFIG_KEY_LEGACY);
    const cfg = raw ? JSON.parse(raw) : {};
    cfg[campo] = valor;
    localStorage.setItem(CONFIG_KEY_LEGACY, JSON.stringify(cfg));
  } catch {}
}

const API = 'http://localhost:80/conta-app-backend/api/modulos/estado.php';

type Icon = any;

// Metadata de módulos de MEMBRESÍA (CRM). El estado real viene de useEntitlements.
const META_MEMBRESIA: Array<{
  key: keyof EntitlementKeys;
  label: string;
  icon: Icon;
  color: string;
  descripcion: string;
}> = [
  {
    key: 'facturacion_electronica',
    label: 'Facturación Electrónica',
    icon: FileText,
    color: '#7c3aed',
    descripcion: 'Envío de facturas, notas crédito y notas débito a la DIAN. Incluye documento soporte (DS) y adquirentes extranjeros.',
  },
  {
    key: 'vendedor_movil',
    label: 'Vendedores Móviles',
    icon: Smartphone,
    color: '#2563eb',
    descripcion: 'App móvil para vendedores en ruta: pedidos, cartera, inventario y sincronización bidireccional con el escritorio.',
  },
  {
    // Un solo card unifica "plataforma_web" y "sincronizacion" — van siempre
    // juntos: no tiene sentido vender uno sin el otro.
    key: 'plataforma_web',
    label: 'Plataforma Web + Sincronización',
    icon: Cloud,
    color: '#0ea5e9',
    descripcion: 'Dashboard online desde el navegador + replicación automática a la nube de clientes, productos, ventas, pagos y compras.',
  },
  {
    key: 'dsno',
    label: 'Documento Soporte (DSNO)',
    icon: ShieldCheck,
    color: '#16a34a',
    descripcion: 'Documento Soporte a No Obligados — para compras a proveedores sin facturación electrónica.',
  },
];

type EntitlementKeys = {
  facturacion_electronica: any; vendedor_movil: any; plataforma_web: any;
  sincronizacion: any; dsno: any;
};

// Metadata de módulos LOCALES (tbl_modulos_activos). El estado viene de useModulos.
const META_LOCAL: Record<string, { label: string; icon: Icon; color: string; descripcion: string }> = {
  nomina: {
    label: 'Nómina',
    icon: Users,
    color: '#f59e0b',
    descripcion: 'Empleados, anticipos, préstamos y liquidación mensual de nómina. Al activar se crean las tablas; los datos se conservan al desactivar.',
  },
  financiaciones: {
    label: 'Financiaciones',
    icon: CreditCard,
    color: '#db2777',
    descripcion: 'Crédito con cuotas para ventas financiadas (motos, equipos). Cronograma de cuotas y registro de pagos parciales.',
  },
};

// ------- Componentes auxiliares -------

function BadgeOrigen({ tipo }: { tipo: 'membresia' | 'local' }) {
  const s = tipo === 'membresia'
    ? { bg: '#f3e8ff', fg: '#7c3aed', label: 'Membresía' }
    : { bg: '#dbeafe', fg: '#2563eb', label: 'Local' };
  return (
    <span style={{ padding: '2px 8px', borderRadius: 10, fontSize: 10, fontWeight: 700, letterSpacing: 0.3, background: s.bg, color: s.fg, whiteSpace: 'nowrap' }}>
      {s.label}
    </span>
  );
}

function BadgeEstado({ activo, vencido }: { activo: boolean; vencido?: boolean }) {
  if (vencido) return <span style={estadoBase('#fef2f2', '#dc2626')}>VENCIDO</span>;
  if (activo)  return <span style={estadoBase('#dcfce7', '#16a34a')}><Check size={10} /> ACTIVO</span>;
  return <span style={estadoBase('#f3f4f6', '#6b7280')}>INACTIVO</span>;
}
function estadoBase(bg: string, fg: string): React.CSSProperties {
  return { display: 'inline-flex', alignItems: 'center', gap: 3, padding: '2px 8px', borderRadius: 10, background: bg, color: fg, fontSize: 10, fontWeight: 700, letterSpacing: 0.3 };
}

function Card({
  icono: Icono, color, label, descripcion, origen, activo, vencido,
  extra, boton,
}: {
  icono: Icon; color: string; label: string; descripcion: string;
  origen: 'membresia' | 'local'; activo: boolean; vencido?: boolean;
  extra?: React.ReactNode; boton?: React.ReactNode;
}) {
  const bordeActivo = activo && !vencido;
  return (
    <div style={{
      background: '#fff',
      border: `2px solid ${bordeActivo ? color : '#e5e7eb'}`,
      borderRadius: 12, padding: 14, display: 'flex', flexDirection: 'column', gap: 10,
      boxShadow: bordeActivo ? `0 1px 2px ${color}22` : 'none'
    }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
        <div style={{
          width: 40, height: 40, borderRadius: 10,
          background: bordeActivo ? `${color}18` : '#f3f4f6',
          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
        }}>
          <Icono size={20} color={bordeActivo ? color : '#9ca3af'} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: '#0f172a' }}>{label}</div>
            <BadgeOrigen tipo={origen} />
            <BadgeEstado activo={activo} vencido={vencido} />
          </div>
        </div>
      </div>
      <div style={{ fontSize: 12, color: '#4b5563', lineHeight: 1.45 }}>
        {descripcion}
      </div>
      {extra}
      {boton}
    </div>
  );
}

// ------- Pantalla -------

export function ConfigModulos() {
  const { user } = useAuth();
  const { modulos: modulosLocales, loading: loadingLocales } = useModulos();
  const { modulos: ent, loading: loadingEnt, source, empresa } = useEntitlements();
  const [procesando, setProcesando] = useState<string | null>(null);

  const esRoot = user?.username === 'root';

  const toggleModuloLocal = async (nombre: string, activar: boolean) => {
    if (!esRoot) { toast.error('Solo el usuario root puede activar/desactivar módulos'); return; }
    const confirmMsg = activar
      ? `¿Activar el módulo "${META_LOCAL[nombre]?.label || nombre}"? Se crearán las tablas necesarias si no existen.`
      : `¿Desactivar el módulo "${META_LOCAL[nombre]?.label || nombre}"? Los datos se conservan — podés reactivarlo luego.`;
    if (!confirm(confirmMsg)) return;

    setProcesando(nombre);
    try {
      const r = await fetch(API, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: activar ? 'activar' : 'desactivar', modulo: nombre, usuario: user?.username || '' }),
      });
      const d = await r.json();
      if (d.success) {
        escribirLegacy(nombre, activar);
        toast.success(d.message, { duration: 5000 });
        triggerModulosRefresh();
      } else {
        toast.error(d.message || 'Error', { duration: 7000 });
      }
    } catch { toast.error('Error de red'); }
    setProcesando(null);
  };

  const localesMap = useMemo(() => {
    const m: Record<string, { activo: boolean; fecha?: string | null }> = {};
    for (const row of modulosLocales) {
      m[row.Nombre] = { activo: Number(row.Activo) === 1, fecha: row.Fecha_Activacion || null };
    }
    // Overlay con el flag legacy de localStorage: si el usuario tiene el
    // módulo prendido en el sistema viejo (ConfiguracionSistema.tsx →
    // usarFinanciaciones) pero la BD aún no lo refleja, lo mostramos como
    // ACTIVO para no confundirlo — y abajo en el useEffect disparamos el
    // POST de activación una sola vez para que ambas fuentes converjan.
    for (const key of Object.keys(META_LOCAL)) {
      const legacy = leerLegacy(key);
      if (legacy === true) {
        const act = m[key]?.activo;
        if (!act) m[key] = { activo: true, fecha: m[key]?.fecha ?? null };
      }
    }
    return m;
  }, [modulosLocales]);

  // Sincronización silenciosa una sola vez por sesión: si localStorage dice
  // "activo" pero la BD dice "inactivo", disparamos un activar sin confirmar.
  const sincronizado = useRef<Set<string>>(new Set());
  useEffect(() => {
    if (loadingLocales || !esRoot) return;
    for (const row of modulosLocales) {
      const key = row.Nombre;
      if (sincronizado.current.has(key)) continue;
      const bdActivo = Number(row.Activo) === 1;
      const legacyActivo = leerLegacy(key);
      if (legacyActivo === true && !bdActivo) {
        sincronizado.current.add(key);
        fetch(API, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'activar', modulo: key, usuario: user?.username || '' }),
        }).then(r => r.json()).then(d => {
          if (d?.success) triggerModulosRefresh();
        }).catch(() => {});
      }
    }
  }, [modulosLocales, loadingLocales, esRoot, user]);

  const loading = loadingLocales || loadingEnt;

  if (loading) {
    return <div style={{ padding: 30, textAlign: 'center', color: '#9ca3af' }}>Cargando módulos…</div>;
  }

  // Mensaje para no-root cuando llegó a la vista pero no puede togglear
  const warnNoRoot = !esRoot && (
    <div style={{ background: '#fef3c7', border: '1px solid #fcd34d', borderRadius: 8, padding: 10, color: '#92400e', fontSize: 12, display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
      <AlertTriangle size={16} />
      <div>Solo el usuario <b>root</b> puede activar o desactivar módulos locales. Los módulos de membresía los administra Innovación Digital.</div>
    </div>
  );

  return (
    <div style={{ padding: '12px 20px' }}>
      {/* Encabezado */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
        <Package size={22} color="#7c3aed" />
        <div>
          <h2 style={{ fontSize: 18, fontWeight: 700, margin: 0 }}>Módulos del sistema</h2>
          <div style={{ fontSize: 11, color: '#6b7280', marginTop: 2 }}>
            Membresía: contratados en el CRM (Innovación Digital). · Locales: los activa o desactiva el usuario <b>root</b> en esta pantalla.
          </div>
        </div>
      </div>

      {empresa && (
        <div style={{ fontSize: 11, color: '#6b7280', marginBottom: 10 }}>
          Empresa: <b>{empresa}</b>{source && <> · Fuente: <code style={{ fontSize: 10 }}>{source}</code></>}
        </div>
      )}

      {warnNoRoot}

      {/* MEMBRESÍA */}
      <SeccionTitulo icono={ShieldCheck} color="#7c3aed" title="Membresía" subtitulo="Contratados en el CRM" />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 12, marginBottom: 20 }}>
        {META_MEMBRESIA.map(m => {
          const info = ent?.[m.key];
          const activo = !!info?.activo;
          const vigencia = info?.vigencia_hasta;
          const vencido = !!vigencia && vigencia < new Date().toISOString().slice(0, 10);
          const cantidad = (info as any)?.cantidad;
          return (
            <Card
              key={m.key}
              icono={m.icon} color={m.color}
              label={m.label} descripcion={m.descripcion}
              origen="membresia" activo={activo} vencido={vencido}
              extra={
                <div style={{ fontSize: 11, color: '#64748b', display: 'flex', flexDirection: 'column', gap: 2 }}>
                  {vigencia && <div>Vigencia hasta: <b>{vigencia}</b></div>}
                  {typeof cantidad === 'number' && cantidad > 0 && <div>Cupos contratados: <b>{cantidad}</b></div>}
                  {!activo && !vencido && (
                    <div style={{ color: '#9ca3af', fontStyle: 'italic', marginTop: 2 }}>
                      No incluido en tu plan — contactá a Innovación Digital para contratar.
                    </div>
                  )}
                  {vencido && (
                    <div style={{ color: '#dc2626', fontWeight: 600, marginTop: 2 }}>
                      Membresía vencida. Renová para seguir usándolo.
                    </div>
                  )}
                </div>
              }
            />
          );
        })}
      </div>

      {/* LOCALES */}
      <SeccionTitulo icono={Wrench} color="#2563eb" title="Módulos locales" subtitulo="Solo root puede activar/desactivar" />
      {Object.keys(META_LOCAL).length === 0 ? (
        <div style={{ fontSize: 12, color: '#6b7280' }}>No hay módulos locales configurados.</div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 12 }}>
          {Object.entries(META_LOCAL).map(([key, meta]) => {
            const st = localesMap[key] || { activo: false, fecha: null };
            const procesandoEste = procesando === key;
            return (
              <Card
                key={key}
                icono={meta.icon} color={meta.color}
                label={meta.label} descripcion={meta.descripcion}
                origen="local" activo={st.activo}
                extra={
                  st.fecha ? (
                    <div style={{ fontSize: 11, color: '#64748b' }}>
                      Activado: <b>{new Date(st.fecha).toLocaleString('es-CO', { dateStyle: 'medium', timeStyle: 'short' })}</b>
                    </div>
                  ) : null
                }
                boton={
                  <button
                    onClick={() => toggleModuloLocal(key, !st.activo)}
                    disabled={procesandoEste || !esRoot}
                    title={!esRoot ? 'Solo root puede togglear' : undefined}
                    style={{
                      height: 34, borderRadius: 8, cursor: procesandoEste ? 'wait' : (esRoot ? 'pointer' : 'not-allowed'),
                      background: st.activo ? '#fef2f2' : meta.color,
                      color: st.activo ? '#dc2626' : '#fff',
                      fontWeight: 700, fontSize: 13,
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                      border: st.activo ? '1px solid #fecaca' : 'none',
                      opacity: esRoot ? 1 : 0.6,
                    }}
                  >
                    {procesandoEste ? <><Loader2 size={14} className="animate-spin" /> Procesando…</> : (st.activo ? 'Desactivar' : 'Activar módulo')}
                  </button>
                }
              />
            );
          })}
        </div>
      )}

      {/* Sin match en tbl_modulos_activos — avisar que falta migración */}
      {!loadingLocales && modulosLocales.length === 0 && (
        <div style={{ background: '#fef3c7', border: '1px solid #fcd34d', borderRadius: 8, padding: 10, color: '#92400e', fontSize: 12, marginTop: 12 }}>
          <Receipt size={14} style={{ marginRight: 6, verticalAlign: -2 }} />
          No se encontró la tabla <code>tbl_modulos_activos</code>. Corré <code>actualizacion_completa.sql</code> para habilitar los módulos locales.
        </div>
      )}
    </div>
  );
}

function SeccionTitulo({ icono: Icon, color, title, subtitulo }: { icono: Icon; color: string; title: string; subtitulo: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10, paddingBottom: 6, borderBottom: `2px solid ${color}22` }}>
      <Icon size={16} color={color} />
      <div style={{ fontSize: 13, fontWeight: 700, color }}>{title}</div>
      <div style={{ fontSize: 11, color: '#9ca3af' }}>· {subtitulo}</div>
    </div>
  );
}
