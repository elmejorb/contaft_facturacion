import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { AgGridReact } from 'ag-grid-react';
import { AllCommunityModule, ModuleRegistry, ColDef } from 'ag-grid-community';
import { Search, Plus, Save, X, Trash2, ClipboardEdit, RefreshCw, Ban } from 'lucide-react';
import toast from 'react-hot-toast';
import { triggerNotifRefresh } from '../hooks/useNotificaciones';
import { confirmar } from './ConfirmDialog';

ModuleRegistry.registerModules([AllCommunityModule]);

const API = 'http://localhost:80/conta-app-backend/api/notas-articulo/index.php';
const API_PROD = 'http://localhost:80/conta-app-backend/api/familias/buscar-producto.php';
const fmt = (v: number) => '$ ' + Math.round(v || 0).toLocaleString('es-CO');

const CONCEPTOS = ['Daño', 'Cambio', 'Vencimiento', 'Otro'];
const TIPOS = ['Entrada', 'Salida'];

export function NotasArticulo() {
  const { user } = useAuth();
  const esAdmin = user?.tipoUsuario === 1 || user?.tipoUsuario === '1';
  const permisos: string[] = (user as any)?.permisos || [];
  const puedeAnular = esAdmin || permisos.includes('inventario_editar');

  const [notas, setNotas] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [showCrear, setShowCrear] = useState(false);
  const [mostrarAnuladas, setMostrarAnuladas] = useState(false);
  const [anularModal, setAnularModal] = useState<{ nota: any; motivo: string; guardando: boolean } | null>(null);

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

  const abrirAnularModal = (nota: any) => setAnularModal({ nota, motivo: '', guardando: false });
  const cerrarAnularModal = () => { if (!anularModal?.guardando) setAnularModal(null); };
  const confirmarAnular = async () => {
    if (!anularModal) return;
    setAnularModal({ ...anularModal, guardando: true });
    try {
      const r = await fetch(API, { method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'anular', id_nota: anularModal.nota.Id_Nota, id_usuario: user?.id || null, motivo: anularModal.motivo.trim() }) });
      const d = await r.json();
      if (d.success) { toast.success(d.message); triggerNotifRefresh(); setAnularModal(null); cargar(); }
      else { toast.error(d.message); setAnularModal({ ...anularModal, guardando: false }); }
    } catch (e) { toast.error('Error'); setAnularModal({ ...anularModal, guardando: false }); }
  };

  const notasFiltradas = mostrarAnuladas ? notas : notas.filter(n => (n.Estado ?? 'Valida') !== 'Anulada');

  const cellStyleSm: React.CSSProperties = { fontSize: 12, display: 'flex', alignItems: 'center' };
  const estiloAnulada = (p: any): React.CSSProperties =>
    (p.data?.Estado === 'Anulada') ? { textDecoration: 'line-through', color: '#9ca3af', opacity: 0.75 } : {};
  const cellSm = (p: any) => ({ ...cellStyleSm, ...estiloAnulada(p) });
  const cellSmR = (p: any) => ({ ...cellStyleSm, justifyContent: 'flex-end', ...estiloAnulada(p) });
  const cols: ColDef[] = [
    { headerName: '#', field: 'Id_Nota', width: 55, cellStyle: cellSm,
      cellRenderer: (p: any) => <span style={{ fontWeight: 700, color: p.data.Estado === 'Anulada' ? '#9ca3af' : '#7c3aed' }}>{p.value}</span> },
    { headerName: 'Fecha', field: 'Fecha', width: 100, cellStyle: cellSm,
      cellRenderer: (p: any) => p.value ? new Date(p.value).toLocaleDateString('es-CO') : '-' },
    { headerName: 'Producto', flex: 1, minWidth: 240, cellStyle: cellSm,
      cellRenderer: (p: any) => (
        <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          {p.data.Estado === 'Anulada' && <span style={{ background: '#fee2e2', color: '#991b1b', padding: '1px 6px', borderRadius: 3, fontSize: 9, fontWeight: 700, textDecoration: 'none' }}>ANULADA</span>}
          <span>{`${p.data.Codigo} — ${p.data.Nombres_Articulo}`}</span>
        </span>
      ) },
    { headerName: 'Tipo', field: 'Tipo', width: 80, cellStyle: cellSm,
      cellRenderer: (p: any) => <span style={{ padding: '2px 8px', borderRadius: 4, fontSize: 10, fontWeight: 600,
        background: p.value === 'Entrada' ? '#dcfce7' : '#fee2e2', color: p.value === 'Entrada' ? '#16a34a' : '#dc2626' }}>{p.value}</span> },
    { headerName: 'Concepto', field: 'Concepto', width: 100, cellStyle: cellSm },
    { headerName: 'Cantidad', field: 'Cantidad', width: 80, cellStyle: cellSmR,
      cellRenderer: (p: any) => <span style={{ fontFamily: 'monospace', fontWeight: 600 }}>{Number(p.value).toFixed(2)}</span> },
    { headerName: 'Valor Unit.', field: 'Valor_Unitario', width: 100, cellStyle: cellSmR,
      cellRenderer: (p: any) => <span style={{ fontFamily: 'monospace' }}>{fmt(parseFloat(p.value))}</span> },
    { headerName: 'Descripción', field: 'Descripcion', flex: 1, minWidth: 200, cellStyle: cellSm,
      cellRenderer: (p: any) => <span style={{ color: '#666' }} title={p.data.Estado === 'Anulada' && p.data.Motivo_Anulacion ? `Anulada: ${p.data.Motivo_Anulacion}` : ''}>{p.value || '-'}</span> },
    // La columna Lote solo aparece si al menos una nota tiene lote asignado.
    // Los clientes que no usan lotes (Nutrigranos, motos, etc.) no la ven vacía.
    { headerName: 'Lote', field: 'Numero_Lote', width: 90, cellStyle: cellSm,
      hide: !notas.some(n => n.Numero_Lote) },
    { headerName: 'Usuario', field: 'usuario', width: 130, cellStyle: cellSm },
    { headerName: '', width: 44, sortable: false, cellStyle: cellStyleSm,
      cellRenderer: (p: any) => {
        if (p.data.Estado === 'Anulada' || !puedeAnular) return null;
        return <button title="Anular nota" onClick={() => abrirAnularModal(p.data)}
          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}>
          <Ban size={14} color="#dc2626" />
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
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, cursor: 'pointer', color: '#6b7280' }}>
            <input type="checkbox" checked={mostrarAnuladas} onChange={e => setMostrarAnuladas(e.target.checked)} />
            Mostrar anuladas
          </label>
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
          <AgGridReact rowData={notasFiltradas} columnDefs={cols} loading={loading} animateRows rowHeight={28} headerHeight={30} />
        </div>
      </div>

      {showCrear && <CrearNotaModal onClose={() => setShowCrear(false)} onSaved={() => { setShowCrear(false); cargar(); }} />}

      {anularModal && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
             onClick={cerrarAnularModal}>
          <div style={{ background: '#fff', borderRadius: 12, width: 460, boxShadow: '0 20px 50px rgba(0,0,0,0.25)' }} onClick={e => e.stopPropagation()}>
            <div style={{ padding: '14px 20px', background: 'linear-gradient(135deg,#dc2626,#991b1b)', color: '#fff', borderTopLeftRadius: 12, borderTopRightRadius: 12, display: 'flex', alignItems: 'center', gap: 10 }}>
              <Ban size={20} />
              <div>
                <div style={{ fontSize: 14, fontWeight: 700 }}>Anular Nota #{anularModal.nota.Id_Nota}</div>
                <div style={{ fontSize: 11, opacity: 0.85 }}>Se revertirá el inventario y se compensará el kardex</div>
              </div>
            </div>
            <div style={{ padding: 18 }}>
              <div style={{ background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 8, padding: 10, marginBottom: 14, fontSize: 12 }}>
                <div style={{ color: '#7f1d1d', fontWeight: 600 }}>{anularModal.nota.Codigo} — {anularModal.nota.Nombres_Articulo}</div>
                <div style={{ color: '#991b1b', marginTop: 3 }}>
                  <b>{anularModal.nota.Tipo}</b> · {anularModal.nota.Concepto} · Cantidad: <b>{anularModal.nota.Cantidad}</b>
                </div>
                <div style={{ color: '#991b1b', fontSize: 11, marginTop: 4 }}>
                  Al anular: {anularModal.nota.Tipo === 'Entrada' ? 'saldrán' : 'entrarán'} <b>{anularModal.nota.Cantidad}</b> unidades del inventario.
                </div>
              </div>
              <label style={{ fontSize: 11, color: '#6b7280', fontWeight: 700, textTransform: 'uppercase' }}>Motivo (opcional)</label>
              <textarea value={anularModal.motivo}
                onChange={e => setAnularModal({ ...anularModal, motivo: e.target.value })}
                placeholder="Ej: se cargó doble por error, se registró con precio equivocado…"
                autoFocus rows={3}
                style={{ width: '100%', border: '1px solid #d1d5db', borderRadius: 6, padding: 8, fontSize: 13, resize: 'vertical', fontFamily: 'inherit', marginTop: 4, boxSizing: 'border-box' }} />
            </div>
            <div style={{ padding: '12px 20px 18px', display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              <button onClick={cerrarAnularModal} disabled={anularModal.guardando}
                style={{ height: 34, padding: '0 16px', background: '#f3f4f6', border: '1px solid #e5e7eb', borderRadius: 6, fontSize: 13, cursor: anularModal.guardando ? 'not-allowed' : 'pointer' }}>
                Cancelar
              </button>
              <button onClick={confirmarAnular} disabled={anularModal.guardando}
                style={{ height: 34, padding: '0 18px', background: anularModal.guardando ? '#9ca3af' : '#dc2626', color: '#fff', border: 'none', borderRadius: 6, fontSize: 13, fontWeight: 700, cursor: anularModal.guardando ? 'wait' : 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
                <Ban size={14} /> {anularModal.guardando ? 'Anulando…' : 'Sí, anular'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ==================== Modal Crear Nota ====================
function CrearNotaModal({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const { user } = useAuth();
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
          id_usuario: user?.id || null,
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
