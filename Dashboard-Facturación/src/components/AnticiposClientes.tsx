import { useState, useEffect } from 'react';
import { Plus, RefreshCw, Search, Eye, Ban, Undo2, Loader2, User, Save, X, Wallet, Banknote, Landmark, Smartphone, CreditCard } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../contexts/AuthContext';
import { confirmar } from './ConfirmDialog';

const API = 'http://localhost:80/conta-app-backend/api/anticipos/index.php';
const API_CLIENTES = 'http://localhost:80/conta-app-backend/api/clientes/buscar.php';
const fmt = (v: number) => '$ ' + Math.round(v || 0).toLocaleString('es-CO');
const fmtDate = (s: string | null) => s ? new Date(s + 'T12:00:00').toLocaleDateString('es-CO') : '-';

const MEDIOS = [
  { id: 0, label: 'Efectivo',    Icon: Banknote,   color: '#16a34a' },
  { id: 1, label: 'Tarjeta',     Icon: CreditCard, color: '#2563eb' },
  { id: 2, label: 'Bancolombia', Icon: Landmark,   color: '#d97706' },
  { id: 3, label: 'Nequi',       Icon: Smartphone, color: '#7c3aed' },
];

const badge = (bg: string, fg: string): React.CSSProperties =>
  ({ background: bg, color: fg, padding: '2px 8px', borderRadius: 4, fontSize: 10, fontWeight: 700 });

/**
 * Módulo Anticipos de Clientes.
 * Vistas: listado / crear / detalle.
 */
export function AnticiposClientes() {
  const { user } = useAuth();
  const esAdmin = user?.tipoUsuario === 1 || user?.tipoUsuario === '1';

  const [vista, setVista] = useState<'listado' | 'crear' | 'detalle'>('listado');
  const [idSelected, setIdSelected] = useState<number | null>(null);
  const [anticipos, setAnticipos] = useState<any[]>([]);
  const [anios, setAnios] = useState<number[]>([]);
  const [loading, setLoading] = useState(false);
  const [anio, setAnio] = useState(new Date().getFullYear());
  const [mes, setMes] = useState(0);
  const [estado, setEstado] = useState('Vigente');
  const [busqueda, setBusqueda] = useState('');

  const cargar = async () => {
    setLoading(true);
    try {
      let url = `${API}?listar=1&anio=${anio}`;
      if (mes > 0) url += `&mes=${mes}`;
      if (estado) url += `&estado=${estado}`;
      if (busqueda) url += `&q=${encodeURIComponent(busqueda)}`;
      const r = await fetch(url);
      const d = await r.json();
      if (d.success) { setAnticipos(d.anticipos || []); setAnios(d.anios || []); }
    } catch { toast.error('Error cargando anticipos'); }
    setLoading(false);
  };

  useEffect(() => {
    if (vista === 'listado') {
      const t = setTimeout(cargar, 250);
      return () => clearTimeout(t);
    }
    // eslint-disable-next-line
  }, [vista, anio, mes, estado, busqueda]);

  const anular = async (a: any) => {
    const ok = await confirmar({
      title: 'Anular anticipo',
      message: `¿Anular ${a.Consecutivo} de ${a.cliente_nombre}?\n\nValor: ${fmt(Number(a.Valor))}\n\nSolo se anulan anticipos sin consumo. Si ya se aplicó parcialmente, use "Devolver saldo restante".`,
      type: 'danger',
      confirmText: 'Sí, anular',
    });
    if (!ok) return;
    try {
      const r = await fetch(API, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'anular', id_anticipo: a.Id_Anticipo, id_usuario: user?.id || null }),
      });
      const d = await r.json();
      if (d.success) { toast.success(d.message); cargar(); }
      else toast.error(d.message);
    } catch { toast.error('Error de conexión'); }
  };

  // ---- Rutas internas ----
  if (vista === 'crear') {
    return <NuevoAnticipo
      onCreado={(id) => { setIdSelected(id); setVista('detalle'); }}
      onCancelar={() => setVista('listado')} />;
  }
  if (vista === 'detalle' && idSelected !== null) {
    return <DetalleAnticipo
      id={idSelected}
      onVolver={() => { setVista('listado'); setIdSelected(null); }} />;
  }

  // ---- Listado ----
  const meses = ['Todos','Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
  const totalSaldo = anticipos.filter(a => a.Estado === 'Vigente').reduce((s, a) => s + Number(a.Saldo || 0), 0);
  const totalValor = anticipos.reduce((s, a) => s + Number(a.Valor || 0), 0);

  const inp: React.CSSProperties = { height: 28, border: '1px solid #d1d5db', borderRadius: 6, fontSize: 12, padding: '0 8px', outline: 'none' };
  const th: React.CSSProperties = { padding: '8px 10px', textAlign: 'left', fontSize: 10, color: '#6b7280', textTransform: 'uppercase', fontWeight: 700, borderBottom: '2px solid #e5e7eb' };
  const td: React.CSSProperties = { padding: '10px', fontSize: 12 };

  return (
    <div style={{ padding: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <div>
          <h2 style={{ fontSize: 20, fontWeight: 700, margin: 0 }}>Anticipos de Clientes</h2>
          <p style={{ fontSize: 12, color: '#6b7280', margin: 0 }}>
            Saldos a favor entregados por adelantado para compras futuras
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <div style={{ background: '#eff6ff', padding: '6px 12px', borderRadius: 8 }}>
            <span style={{ fontSize: 10, color: '#1e40af', fontWeight: 600, textTransform: 'uppercase' }}>Saldo total</span>
            <div style={{ fontSize: 15, fontWeight: 800, color: '#2563eb' }}>{fmt(totalSaldo)}</div>
          </div>
          <button onClick={() => setVista('crear')}
            style={{ height: 34, padding: '0 16px', background: '#7c3aed', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5 }}>
            <Plus size={14} /> Nuevo Anticipo
          </button>
        </div>
      </div>

      {/* Filtros */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 10, background: '#fff', padding: '8px 12px', borderRadius: 10, boxShadow: '0 1px 3px rgba(0,0,0,0.05)', alignItems: 'center', flexWrap: 'wrap' }}>
        <select value={anio} onChange={e => setAnio(parseInt(e.target.value))} style={{ ...inp, width: 80 }}>
          {(anios.length > 0 ? anios : [new Date().getFullYear()]).map(a => <option key={a} value={a}>{a}</option>)}
        </select>
        <select value={mes} onChange={e => setMes(parseInt(e.target.value))} style={{ ...inp, width: 90 }}>
          {meses.map((m, i) => <option key={i} value={i}>{m}</option>)}
        </select>
        <select value={estado} onChange={e => setEstado(e.target.value)} style={{ ...inp, width: 110 }}>
          <option value="">Todos</option>
          <option value="Vigente">Vigentes</option>
          <option value="Aplicado">Aplicados</option>
          <option value="Devuelto">Devueltos</option>
          <option value="Anulado">Anulados</option>
        </select>
        <div style={{ position: 'relative', flex: 1, maxWidth: 320 }}>
          <Search size={13} style={{ position: 'absolute', left: 8, top: 8, color: '#9ca3af' }} />
          <input type="text" placeholder="Buscar cliente, NIT o consecutivo..." value={busqueda}
            onChange={e => setBusqueda(e.target.value)}
            style={{ ...inp, width: '100%', paddingLeft: 28 }} />
        </div>
        <div style={{ flex: 1 }} />
        <button onClick={cargar}
          style={{ height: 28, padding: '0 12px', background: '#7c3aed', color: '#fff', border: 'none', borderRadius: 6, fontSize: 12, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
          <RefreshCw size={12} /> Refrescar
        </button>
      </div>

      {/* Tabla */}
      <div style={{ background: '#fff', borderRadius: 10, overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
        {loading ? (
          <div style={{ padding: 40, textAlign: 'center', color: '#9ca3af' }}>
            <Loader2 size={24} className="animate-spin" /><br />Cargando…
          </div>
        ) : anticipos.length === 0 ? (
          <div style={{ padding: 40, textAlign: 'center', color: '#9ca3af', fontSize: 13 }}>Sin anticipos para mostrar</div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#f9fafb' }}>
                <th style={th}>Consecutivo</th>
                <th style={th}>Fecha</th>
                <th style={th}>Cliente</th>
                <th style={th}>Concepto</th>
                <th style={{ ...th, textAlign: 'right' }}>Valor</th>
                <th style={{ ...th, textAlign: 'right' }}>Saldo</th>
                <th style={{ ...th, textAlign: 'center' }}>Estado</th>
                <th style={{ ...th, width: 100 }}></th>
              </tr>
            </thead>
            <tbody>
              {anticipos.map(a => {
                const saldo = Number(a.Saldo);
                const consumo = Number(a.Valor) - saldo;
                return (
                  <tr key={a.Id_Anticipo} style={{ borderBottom: '1px solid #f3f4f6', opacity: ['Anulado','Devuelto'].includes(a.Estado) ? 0.7 : 1 }}>
                    <td style={{ ...td, fontWeight: 700, color: '#7c3aed' }}>{a.Consecutivo}</td>
                    <td style={td}>{fmtDate(a.Fecha)}</td>
                    <td style={td}>
                      <div style={{ fontWeight: 500 }}>{a.cliente_nombre || '-'}</div>
                      <div style={{ fontSize: 10, color: '#6b7280' }}>{a.cliente_nit}</div>
                    </td>
                    <td style={{ ...td, color: '#6b7280', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={a.Concepto}>
                      {a.Concepto || '-'}
                    </td>
                    <td style={{ ...td, textAlign: 'right', fontWeight: 600 }}>{fmt(Number(a.Valor))}</td>
                    <td style={{ ...td, textAlign: 'right', fontWeight: 700, color: saldo > 0 ? '#2563eb' : '#9ca3af' }}>
                      {fmt(saldo)}
                      {consumo > 0 && saldo > 0 && (
                        <div style={{ fontSize: 9, color: '#6b7280', fontWeight: 400 }}>(-{fmt(consumo)} usado)</div>
                      )}
                    </td>
                    <td style={{ ...td, textAlign: 'center' }}>
                      {a.Estado === 'Vigente' && <span style={badge('#dbeafe', '#1d4ed8')}>Vigente</span>}
                      {a.Estado === 'Aplicado' && <span style={badge('#dcfce7', '#166534')}>Aplicado</span>}
                      {a.Estado === 'Devuelto' && <span style={badge('#fef3c7', '#92400e')}>Devuelto</span>}
                      {a.Estado === 'Anulado'  && <span style={badge('#fee2e2', '#991b1b')}>Anulado</span>}
                    </td>
                    <td style={td}>
                      <div style={{ display: 'flex', gap: 4, justifyContent: 'center' }}>
                        <button onClick={() => { setIdSelected(a.Id_Anticipo); setVista('detalle'); }} title="Ver detalle"
                          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2 }}>
                          <Eye size={14} color="#2563eb" />
                        </button>
                        {esAdmin && a.Estado === 'Vigente' && consumo <= 0.01 && (
                          <button onClick={() => anular(a)} title="Anular"
                            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2 }}>
                            <Ban size={14} color="#dc2626" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      <div style={{ fontSize: 11, color: '#6b7280', textAlign: 'right', marginTop: 8 }}>
        {anticipos.length} anticipos · Suma valor original: <b>{fmt(totalValor)}</b>
      </div>
    </div>
  );
}

// ==================== Nuevo Anticipo ====================
function NuevoAnticipo({ onCreado, onCancelar }: { onCreado: (id: number) => void; onCancelar: () => void }) {
  const { user } = useAuth();
  const [cliente, setCliente] = useState<{ id: number; nombre: string; nit: string } | null>(null);
  const [busq, setBusq] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [showDrop, setShowDrop] = useState(false);
  const [valor, setValor] = useState(0);
  const [valorFocused, setValorFocused] = useState(false);
  const [medio, setMedio] = useState(0);
  const [concepto, setConcepto] = useState('');
  const [fecha, setFecha] = useState(new Date().toISOString().slice(0, 10));
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    if (busq.length < 2) { setResults([]); return; }
    const t = setTimeout(async () => {
      try {
        const r = await fetch(`${API_CLIENTES}?q=${encodeURIComponent(busq)}`);
        const d = await r.json();
        if (d.success) setResults(d.clientes || []);
      } catch {}
    }, 250);
    return () => clearTimeout(t);
  }, [busq]);

  const guardar = async () => {
    if (!cliente) { toast.error('Seleccione un cliente'); return; }
    if (valor <= 0) { toast.error('Ingrese un valor'); return; }
    setGuardando(true);
    try {
      const r = await fetch(API, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'crear',
          codigo_cli: cliente.id, valor, id_mediopago: medio,
          concepto: concepto.trim(), fecha, id_usuario: user?.id || null,
        }),
      });
      const d = await r.json();
      if (d.success) { toast.success(d.message); onCreado(d.id_anticipo); }
      else toast.error(d.message);
    } catch { toast.error('Error de conexión'); }
    setGuardando(false);
  };

  const inp: React.CSSProperties = { width: '100%', height: 34, border: '1px solid #d1d5db', borderRadius: 6, padding: '0 10px', fontSize: 13, outline: 'none', boxSizing: 'border-box' };
  const label: React.CSSProperties = { fontSize: 10, color: '#6b7280', fontWeight: 700, textTransform: 'uppercase', display: 'block', marginBottom: 4 };
  const card: React.CSSProperties = { background: '#fff', borderRadius: 12, padding: 18, boxShadow: '0 1px 3px rgba(0,0,0,0.08)', marginBottom: 14 };

  return (
    <div style={{ padding: 16, maxWidth: 720, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
        <Wallet size={24} color="#7c3aed" />
        <div>
          <h2 style={{ fontSize: 18, fontWeight: 700, margin: 0 }}>Nuevo Anticipo</h2>
          <p style={{ fontSize: 11, color: '#6b7280', margin: 0 }}>Registrar dinero entregado por adelantado</p>
        </div>
      </div>

      <div style={card}>
        {/* Cliente */}
        <label style={label}>Cliente</label>
        {cliente ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', background: '#f5f3ff', border: '1px solid #c4b5fd', borderRadius: 8, marginBottom: 12 }}>
            <User size={16} color="#7c3aed" />
            <span style={{ fontSize: 13, fontWeight: 700, flex: 1 }}>{cliente.nombre}</span>
            <span style={{ fontSize: 11, color: '#6b7280' }}>NIT {cliente.nit}</span>
            <button onClick={() => setCliente(null)}
              style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={14} color="#6b7280" /></button>
          </div>
        ) : (
          <div style={{ position: 'relative', marginBottom: 12 }}>
            <input type="text" placeholder="Buscar cliente por nombre o NIT..." value={busq}
              onChange={e => { setBusq(e.target.value); setShowDrop(true); }}
              onFocus={() => setShowDrop(true)}
              style={inp} />
            {showDrop && results.length > 0 && (
              <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: '#fff', border: '1px solid #d1d5db', borderRadius: 6, maxHeight: 220, overflow: 'auto', zIndex: 10, boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
                {results.slice(0, 10).map((c: any) => {
                  const nombre = c.Nombre_Cliente || c.Razon_Social || '';
                  const nit = c.Identificacion || c.Nit || '';
                  return (
                    <div key={c.CodigoClien}
                      onClick={() => { setCliente({ id: c.CodigoClien, nombre, nit }); setBusq(''); setShowDrop(false); }}
                      style={{ padding: '8px 12px', cursor: 'pointer', fontSize: 12, borderBottom: '1px solid #f3f4f6' }}
                      onMouseOver={e => (e.currentTarget.style.background = '#f9fafb')}
                      onMouseOut={e => (e.currentTarget.style.background = '')}>
                      <div style={{ fontWeight: 600 }}>{nombre}</div>
                      <div style={{ fontSize: 10, color: '#6b7280' }}>NIT {nit}</div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Valor + Fecha */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
          <div>
            <label style={label}>Valor recibido</label>
            <input type="text"
              value={valorFocused ? (valor || '') : (valor ? fmt(valor) : '')}
              onFocus={() => setValorFocused(true)}
              onBlur={() => setValorFocused(false)}
              onChange={e => setValor(parseInt(e.target.value.replace(/\D/g, '')) || 0)}
              placeholder="$ 0"
              style={{ ...inp, textAlign: 'right', fontWeight: 800, fontSize: 18, color: '#7c3aed' }} />
          </div>
          <div>
            <label style={label}>Fecha</label>
            <input type="date" value={fecha} onChange={e => setFecha(e.target.value)} style={inp} />
          </div>
        </div>

        {/* Medio */}
        <label style={label}>Medio de pago</label>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6, marginBottom: 12 }}>
          {MEDIOS.map(m => {
            const active = medio === m.id;
            const Icon = m.Icon;
            return (
              <button key={m.id} onClick={() => setMedio(m.id)}
                style={{ padding: '8px 6px', borderRadius: 6, cursor: 'pointer', textAlign: 'center',
                  border: `2px solid ${active ? m.color : '#e5e7eb'}`,
                  background: active ? `${m.color}15` : '#fff' }}>
                <Icon size={16} color={active ? m.color : '#9ca3af'} />
                <div style={{ fontSize: 10, fontWeight: 700, color: active ? m.color : '#6b7280', marginTop: 3 }}>{m.label}</div>
              </button>
            );
          })}
        </div>

        {/* Concepto */}
        <label style={label}>Concepto (opcional)</label>
        <textarea value={concepto} onChange={e => setConcepto(e.target.value)} rows={2}
          placeholder="Ej: Adelanto para pedido de talla 8, abono para muebles..."
          style={{ ...inp, height: 'auto', padding: 8, resize: 'vertical', fontFamily: 'inherit' }} />
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
        <button onClick={onCancelar} disabled={guardando}
          style={{ height: 36, padding: '0 16px', background: '#f3f4f6', border: '1px solid #e5e7eb', borderRadius: 8, fontSize: 13, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          <X size={14} /> Cancelar
        </button>
        <button onClick={guardar} disabled={guardando || !cliente || valor <= 0}
          style={{ height: 36, padding: '0 20px', background: '#7c3aed', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: guardando ? 'wait' : 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6, opacity: (!cliente || valor <= 0) ? 0.5 : 1 }}>
          <Save size={14} /> {guardando ? 'Guardando…' : 'Registrar Anticipo'}
        </button>
      </div>
    </div>
  );
}

// ==================== Detalle ====================
function DetalleAnticipo({ id, onVolver }: { id: number; onVolver: () => void }) {
  const { user } = useAuth();
  const esAdmin = user?.tipoUsuario === 1 || user?.tipoUsuario === '1';
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showDevolver, setShowDevolver] = useState(false);
  const [devValor, setDevValor] = useState(0);
  const [devMedio, setDevMedio] = useState(0);
  const [devConcepto, setDevConcepto] = useState('');
  const [guardando, setGuardando] = useState(false);

  const cargar = async () => {
    setLoading(true);
    try {
      const r = await fetch(`${API}?detalle=${id}`);
      const d = await r.json();
      if (d.success) setData(d);
    } catch {}
    setLoading(false);
  };
  useEffect(() => { cargar(); /* eslint-disable-next-line */ }, [id]);

  const abrirDevolver = () => {
    if (!data?.anticipo) return;
    setDevValor(Math.round(Number(data.anticipo.Saldo)));
    setDevMedio(Number(data.anticipo.id_mediopago) || 0);
    setDevConcepto('');
    setShowDevolver(true);
  };

  const confirmarDevolucion = async () => {
    if (devValor <= 0) { toast.error('Ingrese un valor'); return; }
    setGuardando(true);
    try {
      const r = await fetch(API, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'devolver', id_anticipo: id, valor: devValor,
          id_mediopago: devMedio, concepto: devConcepto.trim(), id_usuario: user?.id || null,
        }),
      });
      const d = await r.json();
      if (d.success) { toast.success(d.message); setShowDevolver(false); cargar(); }
      else toast.error(d.message);
    } catch { toast.error('Error'); }
    setGuardando(false);
  };

  if (loading) return <div style={{ padding: 40, textAlign: 'center', color: '#9ca3af' }}><Loader2 size={22} className="animate-spin" /><br />Cargando…</div>;
  if (!data?.anticipo) return <div style={{ padding: 20 }}>No encontrado. <button onClick={onVolver}>Volver</button></div>;

  const a = data.anticipo;
  const movs = data.movimientos || [];
  const saldo = Number(a.Saldo);
  const consumo = Number(a.Valor) - saldo;
  const puedeDevolver = esAdmin && a.Estado === 'Vigente' && saldo > 0;

  const card: React.CSSProperties = { background: '#fff', borderRadius: 12, padding: 18, boxShadow: '0 1px 3px rgba(0,0,0,0.08)', marginBottom: 14 };
  const th: React.CSSProperties = { padding: '8px 10px', textAlign: 'left', fontSize: 10, color: '#6b7280', textTransform: 'uppercase', fontWeight: 700, borderBottom: '2px solid #e5e7eb' };
  const td: React.CSSProperties = { padding: '10px', fontSize: 12 };
  const label: React.CSSProperties = { fontSize: 10, color: '#6b7280', fontWeight: 700, textTransform: 'uppercase', display: 'block', marginBottom: 4 };

  return (
    <div style={{ padding: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
        <button onClick={onVolver}
          style={{ height: 32, padding: '0 12px', background: '#fff', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 12, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5 }}>
          ← Volver
        </button>
        <h2 style={{ fontSize: 18, fontWeight: 700, margin: 0, flex: 1 }}>
          Anticipo {a.Consecutivo}
          <span style={{ marginLeft: 8, ...badge(
            a.Estado === 'Vigente' ? '#dbeafe' : a.Estado === 'Aplicado' ? '#dcfce7' : a.Estado === 'Devuelto' ? '#fef3c7' : '#fee2e2',
            a.Estado === 'Vigente' ? '#1d4ed8' : a.Estado === 'Aplicado' ? '#166534' : a.Estado === 'Devuelto' ? '#92400e' : '#991b1b'
          )}}>{a.Estado}</span>
        </h2>
        {puedeDevolver && (
          <button onClick={abrirDevolver}
            style={{ height: 34, padding: '0 14px', background: '#d97706', color: '#fff', border: 'none', borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5 }}>
            <Undo2 size={13} /> Devolver saldo
          </button>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: 12, marginBottom: 14 }}>
        <div style={card}>
          <label style={label}>Cliente</label>
          <div style={{ fontSize: 14, fontWeight: 700 }}>{a.cliente_nombre || '-'}</div>
          <div style={{ fontSize: 11, color: '#6b7280' }}>NIT {a.cliente_nit || '-'} · Tel {a.cliente_telefono || '-'}</div>
          <div style={{ fontSize: 10, color: '#9ca3af', marginTop: 4 }}>
            Recibido por: <b>{a.usuario_nombre || 'Sistema'}</b> · {fmtDate(a.Fecha)}
          </div>
          {a.Concepto && <div style={{ fontSize: 11, color: '#4b5563', marginTop: 6, padding: 6, background: '#f9fafb', borderRadius: 4 }}>{a.Concepto}</div>}
        </div>
        <div style={{ ...card, borderTop: '3px solid #7c3aed' }}>
          <label style={label}>Valor original</label>
          <div style={{ fontSize: 20, fontWeight: 800, color: '#7c3aed' }}>{fmt(Number(a.Valor))}</div>
          <div style={{ fontSize: 10, color: '#6b7280', marginTop: 4 }}>
            Medio: <b>{MEDIOS.find(m => m.id === Number(a.id_mediopago))?.label || 'Efectivo'}</b>
          </div>
        </div>
        <div style={{ ...card, borderTop: `3px solid ${saldo > 0 ? '#2563eb' : '#16a34a'}` }}>
          <label style={label}>Saldo disponible</label>
          <div style={{ fontSize: 20, fontWeight: 800, color: saldo > 0 ? '#2563eb' : '#16a34a' }}>{fmt(saldo)}</div>
          <div style={{ fontSize: 10, color: '#6b7280', marginTop: 4 }}>
            Consumido: <b>{fmt(consumo)}</b>
          </div>
        </div>
      </div>

      {/* Movimientos */}
      <div style={card}>
        <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 10 }}>Movimientos</div>
        {movs.length === 0 ? (
          <div style={{ color: '#9ca3af', fontSize: 12, textAlign: 'center', padding: 20 }}>Sin movimientos aún</div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={th}>Fecha</th>
                <th style={th}>Tipo</th>
                <th style={th}>Factura</th>
                <th style={th}>Concepto</th>
                <th style={{ ...th, textAlign: 'right' }}>Valor</th>
              </tr>
            </thead>
            <tbody>
              {movs.map((m: any) => (
                <tr key={m.Id_Mov} style={{ borderBottom: '1px solid #f3f4f6' }}>
                  <td style={td}>{fmtDate(m.Fecha)}</td>
                  <td style={td}>
                    {m.Tipo === 'Aplicacion' && <span style={badge('#dcfce7', '#166534')}>Aplicación</span>}
                    {m.Tipo === 'Devolucion' && <span style={badge('#fef3c7', '#92400e')}>Devolución</span>}
                    {m.Tipo === 'Reverso'    && <span style={badge('#fee2e2', '#991b1b')}>Reverso</span>}
                  </td>
                  <td style={{ ...td, color: '#7c3aed', fontWeight: 600 }}>{m.Factura_N ? `#${m.Factura_N}` : '-'}</td>
                  <td style={{ ...td, color: '#6b7280' }}>{m.Concepto || '-'}</td>
                  <td style={{ ...td, textAlign: 'right', fontWeight: 700, color: m.Tipo === 'Aplicacion' ? '#16a34a' : m.Tipo === 'Devolucion' ? '#d97706' : '#dc2626' }}>
                    {m.Tipo === 'Aplicacion' ? '-' : ''}{fmt(Number(m.Valor))}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Modal Devolver */}
      {showDevolver && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 100, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
             onClick={() => !guardando && setShowDevolver(false)}>
          <div style={{ background: '#fff', borderRadius: 12, width: 440, boxShadow: '0 20px 50px rgba(0,0,0,0.25)' }} onClick={e => e.stopPropagation()}>
            <div style={{ padding: '12px 18px', background: 'linear-gradient(135deg,#d97706,#b45309)', color: '#fff', borderTopLeftRadius: 12, borderTopRightRadius: 12, display: 'flex', alignItems: 'center', gap: 10 }}>
              <Undo2 size={20} />
              <div>
                <div style={{ fontSize: 14, fontWeight: 700 }}>Devolver saldo</div>
                <div style={{ fontSize: 11, opacity: 0.85 }}>Saldo actual: {fmt(saldo)}</div>
              </div>
            </div>
            <div style={{ padding: 18 }}>
              <label style={label}>Valor a devolver</label>
              <input type="text" value={devValor || ''} onChange={e => setDevValor(parseInt(e.target.value.replace(/\D/g,'')) || 0)}
                autoFocus placeholder="0"
                style={{ width: '100%', height: 40, padding: '0 12px', border: '1px solid #d1d5db', borderRadius: 8, fontSize: 20, fontWeight: 700, color: '#d97706', textAlign: 'right', boxSizing: 'border-box', marginBottom: 12 }} />
              <label style={label}>Medio (por dónde le devuelve)</label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6, marginBottom: 12 }}>
                {MEDIOS.map(m => {
                  const Icon = m.Icon;
                  const active = devMedio === m.id;
                  return (
                    <button key={m.id} onClick={() => setDevMedio(m.id)}
                      style={{ padding: '8px 6px', borderRadius: 6, cursor: 'pointer', textAlign: 'center',
                        border: `2px solid ${active ? m.color : '#e5e7eb'}`, background: active ? `${m.color}15` : '#fff' }}>
                      <Icon size={16} color={active ? m.color : '#9ca3af'} />
                      <div style={{ fontSize: 10, fontWeight: 700, color: active ? m.color : '#6b7280', marginTop: 3 }}>{m.label}</div>
                    </button>
                  );
                })}
              </div>
              <label style={label}>Concepto (opcional)</label>
              <textarea rows={2} value={devConcepto} onChange={e => setDevConcepto(e.target.value)}
                placeholder="Ej: Cliente pidió retirar el saldo"
                style={{ width: '100%', border: '1px solid #d1d5db', borderRadius: 6, padding: 8, fontSize: 13, resize: 'vertical', fontFamily: 'inherit', boxSizing: 'border-box' }} />
            </div>
            <div style={{ padding: '12px 18px', display: 'flex', justifyContent: 'flex-end', gap: 8, borderTop: '1px solid #f3f4f6' }}>
              <button onClick={() => setShowDevolver(false)} disabled={guardando}
                style={{ height: 34, padding: '0 16px', background: '#f3f4f6', border: '1px solid #e5e7eb', borderRadius: 6, fontSize: 13, cursor: 'pointer' }}>Cancelar</button>
              <button onClick={confirmarDevolucion} disabled={guardando || devValor <= 0}
                style={{ height: 34, padding: '0 18px', background: '#d97706', color: '#fff', border: 'none', borderRadius: 6, fontSize: 13, fontWeight: 700, cursor: guardando ? 'wait' : 'pointer' }}>
                {guardando ? 'Devolviendo…' : 'Devolver'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
