import { useState, useEffect, useRef } from 'react';
import { AgGridReact } from 'ag-grid-react';
import { AllCommunityModule, ModuleRegistry, ColDef } from 'ag-grid-community';
import { CalendarClock, AlertTriangle, RefreshCw, X, Save, Trash2, Plus, Search } from 'lucide-react';
import toast from 'react-hot-toast';
import { triggerNotifRefresh } from '../hooks/useNotificaciones';
import { useAuth } from '../contexts/AuthContext';

ModuleRegistry.registerModules([AllCommunityModule]);

const API = 'http://localhost:80/conta-app-backend/api/lotes';
const API_PROD = 'http://localhost:80/conta-app-backend/api/familias/buscar-producto.php';
const fmtCant = (n: any) => { const v = parseFloat(n) || 0; return v % 1 === 0 ? String(v) : v.toFixed(2); };
const fmt = (v: number) => '$ ' + Math.round(v || 0).toLocaleString('es-CO');

type Lote = {
  Id_Lote: number;
  Items: number;
  Codigo: string;
  Nombres_Articulo: string;
  Numero_Lote: string | null;
  Fecha_Vencimiento: string;
  Fecha_Ingreso: string;
  Cantidad_Inicial: number;
  Cantidad_Actual: number;
  dias_restantes: number;
  Precio_Costo: number;
  valor_costo: number;
};

type Resumen = {
  total: number;
  vencidos: number;
  d_30: number;
  d_60: number;
  d_90: number;
  mas_90: number;
  valor_total: number;
};

const colorPorDias = (d: number) => {
  if (d < 0) return { bg: '#fee2e2', fg: '#991b1b', border: '#dc2626', label: 'VENCIDO' };
  if (d <= 30) return { bg: '#ffedd5', fg: '#9a3412', border: '#ea580c', label: '≤30 días' };
  if (d <= 60) return { bg: '#fef9c3', fg: '#854d0e', border: '#ca8a04', label: '≤60 días' };
  if (d <= 90) return { bg: '#dbeafe', fg: '#1e40af', border: '#2563eb', label: '≤90 días' };
  return { bg: '#dcfce7', fg: '#166534', border: '#16a34a', label: '>90 días' };
};

export function LotesPorVencer() {
  const [lotes, setLotes] = useState<Lote[]>([]);
  const [resumen, setResumen] = useState<Resumen | null>(null);
  const [loading, setLoading] = useState(false);
  const [filtro, setFiltro] = useState<'todos' | 'vencidos' | '30' | '60' | '90' | 'mas'>('todos');
  const [loteBaja, setLoteBaja] = useState<Lote | null>(null);
  const [showCrear, setShowCrear] = useState(false);

  const cargar = async () => {
    setLoading(true);
    try {
      const r = await fetch(API + '/index.php?por_vencer=1');
      const d = await r.json();
      if (d.success) {
        setLotes(d.lotes || []);
        setResumen(d.resumen || null);
      }
    } catch (e) { toast.error('Error al cargar lotes'); }
    setLoading(false);
  };

  useEffect(() => { cargar(); }, []);

  const filtrados = lotes.filter(l => {
    const d = Number(l.dias_restantes);
    if (filtro === 'vencidos') return d < 0;
    if (filtro === '30') return d >= 0 && d <= 30;
    if (filtro === '60') return d > 30 && d <= 60;
    if (filtro === '90') return d > 60 && d <= 90;
    if (filtro === 'mas') return d > 90;
    return true;
  });

  const cols: ColDef[] = [
    { headerName: '#', field: 'Id_Lote', width: 60, cellRenderer: (p: any) => <span style={{ fontWeight: 700, color: '#7c3aed' }}>{p.value}</span> },
    { headerName: 'Código', field: 'Codigo', width: 110 },
    { headerName: 'Producto', field: 'Nombres_Articulo', flex: 1, minWidth: 240, cellRenderer: (p: any) => <span style={{ fontWeight: 600 }}>{p.value}</span> },
    { headerName: 'N° Lote', field: 'Numero_Lote', width: 110, cellRenderer: (p: any) => p.value || <span style={{ color: '#9ca3af' }}>—</span> },
    { headerName: 'Vencimiento', field: 'Fecha_Vencimiento', width: 130,
      cellRenderer: (p: any) => p.value ? new Date(p.value + 'T00:00').toLocaleDateString('es-CO') : '-' },
    { headerName: 'Días restantes', field: 'dias_restantes', width: 140,
      cellRenderer: (p: any) => {
        const c = colorPorDias(Number(p.value));
        return <span style={{ padding: '3px 10px', borderRadius: 4, fontSize: 11, fontWeight: 700, background: c.bg, color: c.fg, border: `1px solid ${c.border}` }}>
          {Number(p.value) < 0 ? `Vencido ${Math.abs(Number(p.value))}d` : `${p.value} días`}
        </span>;
      } },
    { headerName: 'Cant. Actual', field: 'Cantidad_Actual', width: 110,
      cellRenderer: (p: any) => <span style={{ fontFamily: 'monospace', fontWeight: 600 }}>{fmtCant(p.value)}</span> },
    { headerName: 'Costo Unit.', field: 'Precio_Costo', width: 110,
      cellRenderer: (p: any) => <span style={{ fontFamily: 'monospace' }}>{fmt(parseFloat(p.value))}</span> },
    { headerName: 'Valor Total', field: 'valor_costo', width: 120,
      cellRenderer: (p: any) => <span style={{ fontFamily: 'monospace', fontWeight: 600, color: '#0891b2' }}>{fmt(parseFloat(p.value))}</span> },
    { headerName: 'Acciones', width: 130, sortable: false,
      cellRenderer: (p: any) => (
        <button onClick={() => setLoteBaja(p.data)}
          style={{ background: '#fee2e2', color: '#991b1b', border: '1px solid #fca5a5', borderRadius: 4, padding: '3px 10px', fontSize: 11, fontWeight: 600, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
          <Trash2 size={12} /> Dar de baja
        </button>
      ) },
  ];

  const card = (label: string, valor: number | string, color: string, activo: boolean, onClick: () => void, sub?: string) => (
    <button onClick={onClick}
      style={{ flex: 1, background: activo ? color : '#fff', color: activo ? '#fff' : '#1f2937', border: `2px solid ${color}`, borderRadius: 8, padding: '10px 12px', cursor: 'pointer', textAlign: 'left', transition: 'all .15s' }}>
      <div style={{ fontSize: 11, fontWeight: 600, opacity: activo ? 0.9 : 0.7, textTransform: 'uppercase' }}>{label}</div>
      <div style={{ fontSize: 22, fontWeight: 800, marginTop: 2 }}>{valor}</div>
      {sub && <div style={{ fontSize: 10, opacity: 0.8, marginTop: 2 }}>{sub}</div>}
    </button>
  );

  return (
    <div style={{ padding: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
        <div>
          <h2 style={{ fontSize: 18, fontWeight: 700, margin: 0, color: '#1f2937', display: 'flex', alignItems: 'center', gap: 8 }}>
            <CalendarClock size={20} color="#dc2626" /> Productos por Vencer
          </h2>
          <p style={{ fontSize: 12, color: '#6b7280', margin: '2px 0 0' }}>
            Lotes activos con stock — agrupados por urgencia. Da de baja los vencidos para descontarlos del inventario y registrarlos en kardex.
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={cargar} disabled={loading}
            style={{ background: '#f3f4f6', color: '#374151', border: '1px solid #e5e7eb', borderRadius: 6, padding: '7px 12px', fontSize: 12, fontWeight: 600, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <RefreshCw size={14} className={loading ? 'spin' : ''} /> Refrescar
          </button>
          <button onClick={() => setShowCrear(true)}
            style={{ background: '#7c3aed', color: '#fff', border: 'none', borderRadius: 6, padding: '7px 14px', fontSize: 12, fontWeight: 600, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <Plus size={14} /> Nuevo Lote
          </button>
        </div>
      </div>

      {resumen && (
        <div style={{ display: 'flex', gap: 10, marginBottom: 14 }}>
          {card('Todos', resumen.total, '#6b7280', filtro === 'todos', () => setFiltro('todos'), fmt(resumen.valor_total))}
          {card('Vencidos', resumen.vencidos, '#dc2626', filtro === 'vencidos', () => setFiltro('vencidos'))}
          {card('≤ 30 días', resumen.d_30, '#ea580c', filtro === '30', () => setFiltro('30'))}
          {card('31–60 días', resumen.d_60, '#ca8a04', filtro === '60', () => setFiltro('60'))}
          {card('61–90 días', resumen.d_90, '#2563eb', filtro === '90', () => setFiltro('90'))}
          {card('> 90 días', resumen.mas_90, '#16a34a', filtro === 'mas', () => setFiltro('mas'))}
        </div>
      )}

      {filtro === 'vencidos' && resumen && resumen.vencidos > 0 && (
        <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 6, padding: 10, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
          <AlertTriangle size={18} color="#dc2626" />
          <span style={{ fontSize: 12, color: '#7f1d1d' }}>
            <b>Atención:</b> Hay {resumen.vencidos} lote(s) vencido(s) con stock. Da de baja para que no afecten el inventario disponible.
          </span>
        </div>
      )}

      <div className="ag-theme-quartz" style={{ height: 'calc(100vh - 270px)', width: '100%' }}>
        <AgGridReact
          rowData={filtrados}
          columnDefs={cols}
          defaultColDef={{ sortable: true, filter: true, resizable: true }}
          rowHeight={32}
          headerHeight={34}
        />
      </div>

      {loteBaja && <DarDeBajaModal lote={loteBaja} onClose={() => setLoteBaja(null)} onOk={() => { setLoteBaja(null); cargar(); }} />}
      {showCrear && <CrearLoteModal onClose={() => setShowCrear(false)} onOk={() => { setShowCrear(false); cargar(); }} />}

      <style>{`
        .spin { animation: spin 1s linear infinite; }
        @keyframes spin { from { transform: rotate(0); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}

function DarDeBajaModal({ lote, onClose, onOk }: { lote: Lote; onClose: () => void; onOk: () => void }) {
  const { user } = useAuth();
  const [cantidad, setCantidad] = useState<string>(fmtCant(lote.Cantidad_Actual));
  const [motivo, setMotivo] = useState('Producto vencido');
  const [saving, setSaving] = useState(false);

  const guardar = async () => {
    const c = parseFloat(cantidad);
    if (!c || c <= 0) { toast.error('Cantidad inválida'); return; }
    if (c > Number(lote.Cantidad_Actual)) { toast.error(`El lote solo tiene ${lote.Cantidad_Actual} unidades`); return; }
    if (!motivo.trim()) { toast.error('Indica el motivo'); return; }
    setSaving(true);
    try {
      const r = await fetch(API + '/index.php', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'dar_de_baja', id_lote: lote.Id_Lote, cantidad: c, motivo, id_usuario: user?.id || 0 })
      });
      const d = await r.json();
      if (d.success) { toast.success(d.message); triggerNotifRefresh(); onOk(); }
      else toast.error(d.message);
    } catch (e) { toast.error('Error al dar de baja'); }
    setSaving(false);
  };

  const c = colorPorDias(Number(lote.dias_restantes));
  const valorBaja = parseFloat(cantidad || '0') * Number(lote.Precio_Costo);

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ background: '#fff', width: 460, borderRadius: 8, overflow: 'hidden', boxShadow: '0 20px 50px rgba(0,0,0,0.3)' }}>
        <div style={{ background: '#dc2626', color: '#fff', padding: '10px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: 14, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>
            <Trash2 size={16} /> Dar de baja lote
          </span>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer' }}><X size={18} /></button>
        </div>
        <div style={{ padding: 14 }}>
          <div style={{ background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 6, padding: 10, marginBottom: 10 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#1f2937', marginBottom: 4 }}>{lote.Codigo} — {lote.Nombres_Articulo}</div>
            {lote.Numero_Lote && <div style={{ fontSize: 11, color: '#6b7280' }}>N° Lote: <b>{lote.Numero_Lote}</b></div>}
            <div style={{ fontSize: 11, color: '#6b7280', display: 'flex', gap: 12, marginTop: 4 }}>
              <span>Vence: <b>{new Date(lote.Fecha_Vencimiento + 'T00:00').toLocaleDateString('es-CO')}</b></span>
              <span style={{ padding: '1px 8px', borderRadius: 4, background: c.bg, color: c.fg, fontWeight: 700 }}>
                {Number(lote.dias_restantes) < 0 ? `Vencido ${Math.abs(Number(lote.dias_restantes))}d` : `${lote.dias_restantes}d`}
              </span>
            </div>
            <div style={{ fontSize: 11, color: '#6b7280', marginTop: 4 }}>Stock del lote: <b>{fmtCant(lote.Cantidad_Actual)}</b> · Costo unit: <b>{fmt(Number(lote.Precio_Costo))}</b></div>
          </div>

          <label style={{ fontSize: 11, fontWeight: 600, color: '#374151' }}>Cantidad a dar de baja</label>
          <input value={cantidad} onChange={e => setCantidad(e.target.value)} autoFocus
            style={{ width: '100%', padding: '6px 8px', border: '1px solid #d1d5db', borderRadius: 4, fontSize: 13, marginTop: 2, marginBottom: 8, fontFamily: 'monospace' }} />

          <label style={{ fontSize: 11, fontWeight: 600, color: '#374151' }}>Motivo</label>
          <input value={motivo} onChange={e => setMotivo(e.target.value)}
            style={{ width: '100%', padding: '6px 8px', border: '1px solid #d1d5db', borderRadius: 4, fontSize: 13, marginTop: 2, marginBottom: 8 }} />

          <div style={{ background: '#fef9c3', border: '1px solid #fde047', borderRadius: 6, padding: 8, fontSize: 11, color: '#713f12' }}>
            Se registrará una <b>Nota de Salida — Vencimiento</b> por <b>{fmt(valorBaja)}</b> y se descontará del inventario y kardex.
            <br /><b>No afecta gastos ni utilidad</b> — es solo un movimiento de inventario.
          </div>
        </div>
        <div style={{ padding: '10px 14px', background: '#f9fafb', borderTop: '1px solid #e5e7eb', display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <button onClick={onClose} disabled={saving}
            style={{ padding: '6px 14px', background: '#fff', border: '1px solid #d1d5db', borderRadius: 4, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>Cancelar</button>
          <button onClick={guardar} disabled={saving}
            style={{ padding: '6px 14px', background: '#dc2626', color: '#fff', border: 'none', borderRadius: 4, fontSize: 12, fontWeight: 600, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <Save size={12} /> {saving ? 'Guardando…' : 'Confirmar baja'}
          </button>
        </div>
      </div>
    </div>
  );
}

function CrearLoteModal({ onClose, onOk }: { onClose: () => void; onOk: () => void }) {
  const [busqueda, setBusqueda] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [seleccionado, setSeleccionado] = useState<any>(null);
  const [fecha, setFecha] = useState('');
  const [cantidad, setCantidad] = useState('');
  const [numeroLote, setNumeroLote] = useState('');
  const [comentario, setComentario] = useState('Inventario / Conteo');
  const [saving, setSaving] = useState(false);
  const [stockInfo, setStockInfo] = useState<{ existencia: number; lotes_activos: number; disponible: number } | null>(null);
  const timer = useRef<any>(null);

  const buscar = (q: string) => {
    setBusqueda(q);
    if (q.length < 2) { setResults([]); return; }
    clearTimeout(timer.current);
    timer.current = setTimeout(async () => {
      try {
        const r = await fetch(`${API_PROD}?q=${encodeURIComponent(q)}&exclude_familia=0`);
        const d = await r.json();
        if (d.success) setResults(d.articulos || []);
      } catch (e) {}
    }, 250);
  };

  const seleccionar = async (art: any) => {
    setSeleccionado(art); setBusqueda(''); setResults([]); setStockInfo(null);
    try {
      const r = await fetch(`${API}/index.php?stock_disponible=${art.Items}`);
      const d = await r.json();
      if (d.success) setStockInfo({ existencia: d.existencia, lotes_activos: d.lotes_activos, disponible: d.disponible });
    } catch (e) {}
  };

  const guardar = async () => {
    if (!seleccionado) { toast.error('Selecciona un producto'); return; }
    if (!fecha) { toast.error('Indica la fecha de vencimiento'); return; }
    const c = parseFloat(cantidad);
    if (!c || c <= 0) { toast.error('Cantidad inválida'); return; }
    if (stockInfo && c > stockInfo.disponible + 0.0001) {
      toast.error(`No hay existencia suficiente. Disponible para etiquetar: ${fmtCant(stockInfo.disponible)}`, { duration: 5000 });
      return;
    }
    setSaving(true);
    try {
      const r = await fetch(API + '/index.php', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'crear',
          items: seleccionado.Items,
          fecha_vencimiento: fecha,
          cantidad: c,
          numero_lote: numeroLote || null,
          comentario: comentario || null,
        })
      });
      const d = await r.json();
      if (d.success) { toast.success('Lote registrado'); triggerNotifRefresh(); onOk(); }
      else toast.error(d.message);
    } catch (e) { toast.error('Error al crear lote'); }
    setSaving(false);
  };

  const lbl: React.CSSProperties = { fontSize: 11, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 2 };
  const inp: React.CSSProperties = { width: '100%', padding: '6px 8px', border: '1px solid #d1d5db', borderRadius: 4, fontSize: 13 };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ background: '#fff', width: 520, borderRadius: 8, overflow: 'hidden', boxShadow: '0 20px 50px rgba(0,0,0,0.3)' }}>
        <div style={{ background: '#7c3aed', color: '#fff', padding: '10px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: 14, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>
            <CalendarClock size={16} /> Registrar Lote / Fecha de Vencimiento
          </span>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer' }}><X size={18} /></button>
        </div>
        <div style={{ padding: 14 }}>
          <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 6, padding: 8, fontSize: 11, color: '#1e40af', marginBottom: 12 }}>
            Útil para registrar fechas de vencimiento de stock <b>existente</b> (inventario inicial, conteos, productos sin lote previo).
            <br />Este registro <b>NO modifica la existencia</b> — solo etiqueta unidades ya contadas con su fecha de vencimiento.
          </div>

          {!seleccionado ? (
            <>
              <label style={lbl}>Producto *</label>
              <div style={{ position: 'relative' }}>
                <Search size={14} style={{ position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }} />
                <input autoFocus type="text" placeholder="Buscar por código o nombre…" value={busqueda}
                  onChange={e => buscar(e.target.value)}
                  style={{ ...inp, paddingLeft: 28 }} />
              </div>
              {results.length > 0 && (
                <div style={{ maxHeight: 180, overflow: 'auto', border: '1px solid #e5e7eb', borderRadius: 6, marginTop: 6 }}>
                  {results.map(r => (
                    <div key={r.Items} onClick={() => seleccionar(r)}
                      style={{ padding: '6px 10px', cursor: 'pointer', fontSize: 12, borderBottom: '1px solid #f3f4f6', display: 'flex', gap: 10, alignItems: 'center' }}
                      onMouseOver={e => (e.currentTarget.style.background = '#f5f3ff')}
                      onMouseOut={e => (e.currentTarget.style.background = '')}>
                      <span style={{ color: '#7c3aed', fontWeight: 600, width: 130, flexShrink: 0, fontFamily: 'monospace', fontSize: 11, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={r.Codigo}>{r.Codigo}</span>
                      <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={r.Nombres_Articulo}>{r.Nombres_Articulo}</span>
                      <span style={{ color: '#6b7280', flexShrink: 0, fontSize: 11 }}>Stock: <b>{fmtCant(r.Existencia)}</b></span>
                    </div>
                  ))}
                </div>
              )}
            </>
          ) : (
            <>
              <div style={{ background: '#f5f3ff', border: '1px solid #ddd6fe', borderRadius: 6, padding: 10, marginBottom: 10 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: '#1f2937' }}>{seleccionado.Codigo} — {seleccionado.Nombres_Articulo}</div>
                {stockInfo ? (
                  <div style={{ fontSize: 11, color: '#374151', marginTop: 4, display: 'flex', gap: 14 }}>
                    <span>Stock total: <b style={{ color: '#16a34a' }}>{fmtCant(stockInfo.existencia)}</b></span>
                    <span>Ya en lotes: <b style={{ color: '#d97706' }}>{fmtCant(stockInfo.lotes_activos)}</b></span>
                    <span>Disponible: <b style={{ color: stockInfo.disponible > 0 ? '#7c3aed' : '#dc2626' }}>{fmtCant(stockInfo.disponible)}</b></span>
                  </div>
                ) : (
                  <div style={{ fontSize: 11, color: '#6b7280', marginTop: 2 }}>Stock total: <b style={{ color: '#16a34a' }}>{fmtCant(seleccionado.Existencia)}</b></div>
                )}
                {stockInfo && stockInfo.disponible <= 0 && (
                  <div style={{ marginTop: 6, padding: 6, background: '#fee2e2', border: '1px solid #fca5a5', borderRadius: 4, fontSize: 11, color: '#991b1b' }}>
                    ⚠ No hay stock disponible para etiquetar. Realiza una compra o una nota de entrada primero.
                  </div>
                )}
                <button onClick={() => { setSeleccionado(null); setStockInfo(null); }} style={{ marginTop: 4, background: 'none', border: 'none', color: '#7c3aed', fontSize: 11, cursor: 'pointer', textDecoration: 'underline', padding: 0 }}>Cambiar producto</button>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
                <div>
                  <label style={lbl}>Fecha de Vencimiento *</label>
                  <input type="date" value={fecha} onChange={e => setFecha(e.target.value)} style={inp} />
                </div>
                <div>
                  <label style={lbl}>Cantidad *</label>
                  <input value={cantidad} onChange={e => setCantidad(e.target.value)} placeholder="0"
                    style={{ ...inp, fontFamily: 'monospace' }} />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div>
                  <label style={lbl}>N° Lote (opcional)</label>
                  <input value={numeroLote} onChange={e => setNumeroLote(e.target.value)} placeholder="Código del fabricante" style={inp} />
                </div>
                <div>
                  <label style={lbl}>Comentario</label>
                  <input value={comentario} onChange={e => setComentario(e.target.value)} style={inp} />
                </div>
              </div>
            </>
          )}
        </div>
        <div style={{ padding: '10px 14px', background: '#f9fafb', borderTop: '1px solid #e5e7eb', display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <button onClick={onClose} disabled={saving}
            style={{ padding: '6px 14px', background: '#fff', border: '1px solid #d1d5db', borderRadius: 4, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>Cancelar</button>
          {(() => {
            const sinStock = !!(stockInfo && stockInfo.disponible <= 0);
            const habilitado = !!seleccionado && !sinStock;
            return (
              <button onClick={guardar} disabled={saving || !habilitado}
                style={{ padding: '6px 14px', background: habilitado ? '#7c3aed' : '#d1d5db', color: '#fff', border: 'none', borderRadius: 4, fontSize: 12, fontWeight: 600, cursor: habilitado ? 'pointer' : 'not-allowed', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                <Save size={12} /> {saving ? 'Guardando…' : 'Registrar lote'}
              </button>
            );
          })()}
        </div>
      </div>
    </div>
  );
}
