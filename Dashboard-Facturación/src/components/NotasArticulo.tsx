import { useState, useEffect, useRef } from 'react';
import { AgGridReact } from 'ag-grid-react';
import { AllCommunityModule, ModuleRegistry, ColDef } from 'ag-grid-community';
import { Search, Plus, Save, X, Trash2, ClipboardEdit, RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';
import { triggerNotifRefresh } from '../hooks/useNotificaciones';

ModuleRegistry.registerModules([AllCommunityModule]);

const API = 'http://localhost:80/conta-app-backend/api/notas-articulo/index.php';
const API_PROD = 'http://localhost:80/conta-app-backend/api/familias/buscar-producto.php';
const fmt = (v: number) => '$ ' + Math.round(v || 0).toLocaleString('es-CO');

const CONCEPTOS = ['Daño', 'Cambio', 'Vencimiento', 'Otro'];
const TIPOS = ['Entrada', 'Salida'];

export function NotasArticulo() {
  const [notas, setNotas] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [showCrear, setShowCrear] = useState(false);

  const cargar = async () => {
    setLoading(true);
    try {
      const r = await fetch(API);
      const d = await r.json();
      if (d.success) setNotas(d.notas || []);
    } catch (e) { toast.error('Error al cargar'); }
    setLoading(false);
  };

  useEffect(() => { cargar(); }, []);

  const eliminar = async (id: number) => {
    if (!confirm('¿Eliminar esta nota? El kardex será compensado.')) return;
    try {
      const r = await fetch(API, { method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'eliminar', id_nota: id }) });
      const d = await r.json();
      if (d.success) { toast.success(d.message); triggerNotifRefresh(); cargar(); }
      else toast.error(d.message);
    } catch (e) { toast.error('Error'); }
  };

  const cols: ColDef[] = [
    { headerName: '#', field: 'Id_Nota', width: 60, cellRenderer: (p: any) => <span style={{ fontWeight: 700, color: '#7c3aed' }}>{p.value}</span> },
    { headerName: 'Fecha', field: 'Fecha', width: 130, cellRenderer: (p: any) => p.value ? new Date(p.value).toLocaleString('es-CO') : '-' },
    { headerName: 'Producto', flex: 1, minWidth: 240,
      valueGetter: (p: any) => `${p.data.Codigo} — ${p.data.Nombres_Articulo}` },
    { headerName: 'Tipo', field: 'Tipo', width: 90,
      cellRenderer: (p: any) => <span style={{ padding: '2px 8px', borderRadius: 4, fontSize: 11, fontWeight: 600,
        background: p.value === 'Entrada' ? '#dcfce7' : '#fee2e2', color: p.value === 'Entrada' ? '#16a34a' : '#dc2626' }}>{p.value}</span> },
    { headerName: 'Concepto', field: 'Concepto', width: 110 },
    { headerName: 'Cantidad', field: 'Cantidad', width: 90, cellRenderer: (p: any) => <span style={{ fontFamily: 'monospace', fontWeight: 600 }}>{Number(p.value).toFixed(2)}</span> },
    { headerName: 'Valor Unit.', field: 'Valor_Unitario', width: 110, cellRenderer: (p: any) => <span style={{ fontFamily: 'monospace' }}>{fmt(parseFloat(p.value))}</span> },
    { headerName: 'Descripción', field: 'Descripcion', flex: 1, minWidth: 200, cellRenderer: (p: any) => <span style={{ fontSize: 11, color: '#666' }}>{p.value || '-'}</span> },
    { headerName: 'Lote', field: 'Numero_Lote', width: 100 },
    { headerName: 'Usuario', field: 'usuario', width: 110, cellRenderer: (p: any) => <span style={{ fontSize: 11 }}>{p.value}</span> },
    { headerName: '', width: 50, sortable: false,
      cellRenderer: (p: any) => {
        const esHoy = p.data.Fecha && new Date(p.data.Fecha).toDateString() === new Date().toDateString();
        if (!esHoy) return null;
        return <button title="Eliminar (solo notas de hoy)" onClick={() => eliminar(p.data.Id_Nota)}
          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}>
          <Trash2 size={14} color="#dc2626" />
        </button>;
      } },
  ];

  return (
    <div style={{ padding: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
        <div>
          <h2 style={{ fontSize: 18, fontWeight: 700, margin: 0, color: '#1f2937', display: 'flex', alignItems: 'center', gap: 8 }}>
            <ClipboardEdit size={20} color="#7c3aed" /> Notas de Artículo
          </h2>
          <p style={{ fontSize: 12, color: '#6b7280', margin: '2px 0 0' }}>
            Entradas y salidas de inventario por concepto (Daño, Cambio, Vencimiento, Otro). No afecta gastos — solo inventario y kardex.
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={cargar} style={{ height: 32, padding: '0 12px', background: '#f3f4f6', border: '1px solid #e5e7eb', borderRadius: 8, fontSize: 12, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5 }}>
            <RefreshCw size={14} /> Refrescar
          </button>
          <button onClick={() => setShowCrear(true)} style={{ height: 32, padding: '0 14px', background: '#7c3aed', color: '#fff', border: 'none', borderRadius: 8, fontSize: 12, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5, fontWeight: 600 }}>
            <Plus size={14} /> Nueva Nota
          </button>
        </div>
      </div>

      <div style={{ background: '#fff', borderRadius: 10, padding: 12, boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
        <div className="ag-theme-quartz" style={{ height: 560 }}>
          <AgGridReact rowData={notas} columnDefs={cols} loading={loading} animateRows rowHeight={34} headerHeight={36} />
        </div>
      </div>

      {showCrear && <CrearNotaModal onClose={() => setShowCrear(false)} onSaved={() => { setShowCrear(false); cargar(); }} />}
    </div>
  );
}

// ==================== Modal Crear Nota ====================
function CrearNotaModal({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const [busqueda, setBusqueda] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [seleccionado, setSeleccionado] = useState<any>(null);
  const [tipo, setTipo] = useState<'Entrada' | 'Salida'>('Salida');
  const [concepto, setConcepto] = useState('Daño');
  const [descripcion, setDescripcion] = useState('');
  const [cantidad, setCantidad] = useState('');
  const [valorUnit, setValorUnit] = useState('');
  const [guardando, setGuardando] = useState(false);
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

  const seleccionar = (art: any) => {
    setSeleccionado(art);
    setValorUnit(String(parseFloat(art.Precio_Costo) || 0));
    setBusqueda('');
    setResults([]);
  };

  const guardar = async () => {
    if (!seleccionado) { toast.error('Selecciona un producto'); return; }
    const cant = parseFloat(cantidad) || 0;
    if (cant <= 0) { toast.error('Cantidad debe ser mayor a 0'); return; }
    if (tipo === 'Salida' && parseFloat(seleccionado.Existencia) < cant) {
      toast.error(`Stock insuficiente. Existencia actual: ${seleccionado.Existencia}`);
      return;
    }
    setGuardando(true);
    try {
      const r = await fetch(API, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'crear', items: seleccionado.Items, tipo, concepto,
          descripcion, cantidad: cant, valor_unitario: parseFloat(valorUnit) || 0,
        })
      });
      const d = await r.json();
      if (d.success) { toast.success(d.message); triggerNotifRefresh(); onSaved(); }
      else toast.error(d.message);
    } catch (e) { toast.error('Error'); }
    setGuardando(false);
  };

  const totalLinea = (parseFloat(cantidad) || 0) * (parseFloat(valorUnit) || 0);

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 99999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.4)' }} onClick={onClose} />
      <div style={{ position: 'relative', background: '#fff', borderRadius: 12, width: 560, boxShadow: '0 20px 60px rgba(0,0,0,0.25)' }}>
        <div style={{ padding: '12px 18px', borderBottom: '1px solid #e5e7eb', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: 14, fontWeight: 700 }}>Nota de Artículo</span>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={18} /></button>
        </div>
        <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
          {/* Producto */}
          {!seleccionado ? (
            <>
              <div>
                <label style={lbl}>Datos del Artículo</label>
                <div style={{ position: 'relative', marginTop: 4 }}>
                  <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }} />
                  <input autoFocus type="text" placeholder="Buscar por código o nombre..." value={busqueda}
                    onChange={e => buscar(e.target.value)}
                    style={{ width: '100%', height: 34, paddingLeft: 32, border: '1px solid #d1d5db', borderRadius: 8, fontSize: 13, outline: 'none' }} />
                </div>
              </div>
              {results.length > 0 && (
                <div style={{ maxHeight: 200, overflow: 'auto', border: '1px solid #e5e7eb', borderRadius: 6 }}>
                  {results.map(r => (
                    <div key={r.Items} onClick={() => seleccionar(r)}
                      style={{ padding: '6px 10px', cursor: 'pointer', fontSize: 12, borderBottom: '1px solid #f3f4f6', display: 'flex', gap: 10, alignItems: 'center' }}
                      onMouseOver={e => (e.currentTarget.style.background = '#f5f3ff')}
                      onMouseOut={e => (e.currentTarget.style.background = '')}>
                      <span style={{ color: '#7c3aed', fontWeight: 600, width: 130, flexShrink: 0, fontFamily: 'monospace', fontSize: 11, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={r.Codigo}>{r.Codigo}</span>
                      <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={r.Nombres_Articulo}>{r.Nombres_Articulo}</span>
                      <span style={{ color: '#6b7280', flexShrink: 0, fontSize: 11 }}>Stock: <b>{Number(r.Existencia).toFixed(2)}</b></span>
                    </div>
                  ))}
                </div>
              )}
            </>
          ) : (
            <div style={{ padding: 10, background: '#f5f3ff', borderRadius: 8, fontSize: 13 }}>
              <div style={{ display: 'flex', gap: 8 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 11, color: '#7c3aed', fontWeight: 600 }}>CÓDIGO</div>
                  <div style={{ fontWeight: 700 }}>{seleccionado.Codigo}</div>
                </div>
                <div style={{ flex: 2 }}>
                  <div style={{ fontSize: 11, color: '#7c3aed', fontWeight: 600 }}>ARTÍCULO</div>
                  <div style={{ fontWeight: 600 }}>{seleccionado.Nombres_Articulo}</div>
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 11, color: '#7c3aed', fontWeight: 600 }}>EXISTENCIA</div>
                  <div style={{ fontWeight: 700, color: '#16a34a', fontFamily: 'monospace' }}>{Number(seleccionado.Existencia).toFixed(2)}</div>
                </div>
              </div>
              <button onClick={() => setSeleccionado(null)} style={{ marginTop: 6, background: 'none', border: 'none', color: '#7c3aed', fontSize: 11, cursor: 'pointer', padding: 0, textDecoration: 'underline' }}>Cambiar producto</button>
            </div>
          )}

          {seleccionado && (
            <>
              <div style={{ display: 'flex', gap: 10 }}>
                <div style={{ flex: 1 }}>
                  <label style={lbl}>Tipo Nota *</label>
                  <select value={tipo} onChange={e => setTipo(e.target.value as any)} style={inp}>
                    {TIPOS.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div style={{ flex: 1 }}>
                  <label style={lbl}>Tipo Concepto *</label>
                  <select value={concepto} onChange={e => setConcepto(e.target.value)} style={inp}>
                    {CONCEPTOS.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label style={lbl}>Por Concepto de</label>
                <textarea value={descripcion} onChange={e => setDescripcion(e.target.value)} rows={2}
                  placeholder="Descripción opcional..."
                  style={{ width: '100%', border: '1px solid #d1d5db', borderRadius: 6, padding: '6px 8px', fontSize: 12, resize: 'vertical', fontFamily: 'inherit', marginTop: 2 }} />
              </div>
              <div style={{ display: 'flex', gap: 10 }}>
                <div style={{ flex: 1 }}>
                  <label style={lbl}>Cantidad *</label>
                  <input type="text" value={cantidad} onChange={e => setCantidad(e.target.value)}
                    style={{ ...inp, fontFamily: 'monospace', textAlign: 'right' }} />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={lbl}>Valor Unit.</label>
                  <input type="text" value={valorUnit} onChange={e => setValorUnit(e.target.value)}
                    style={{ ...inp, fontFamily: 'monospace', textAlign: 'right' }} />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={lbl}>Total Línea</label>
                  <div style={{ ...inp, display: 'flex', alignItems: 'center', justifyContent: 'flex-end', fontFamily: 'monospace', fontWeight: 700, color: '#7c3aed', background: '#f9fafb' }}>{fmt(totalLinea)}</div>
                </div>
              </div>
            </>
          )}
        </div>
        <div style={{ padding: '10px 18px', borderTop: '1px solid #e5e7eb', display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <button onClick={onClose} disabled={guardando}
            style={{ height: 32, padding: '0 14px', background: '#f3f4f6', border: '1px solid #e5e7eb', borderRadius: 6, fontSize: 12, cursor: 'pointer' }}>Salir</button>
          <button onClick={guardar} disabled={!seleccionado || guardando}
            style={{ height: 32, padding: '0 16px', background: !seleccionado || guardando ? '#9ca3af' : '#7c3aed', color: '#fff', border: 'none', borderRadius: 6, fontSize: 12, cursor: !seleccionado || guardando ? 'not-allowed' : 'pointer', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 5 }}>
            <Save size={12} /> Guardar
          </button>
        </div>
      </div>
    </div>
  );
}

const lbl: React.CSSProperties = { fontSize: 11, color: '#6b7280', fontWeight: 700 };
const inp: React.CSSProperties = { width: '100%', height: 32, border: '1px solid #d1d5db', borderRadius: 6, padding: '0 8px', fontSize: 13, marginTop: 2 };
