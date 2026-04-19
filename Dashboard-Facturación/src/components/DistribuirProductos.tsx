import { useState, useEffect, useRef } from 'react';
import { AgGridReact } from 'ag-grid-react';
import { AllCommunityModule, ModuleRegistry, ColDef } from 'ag-grid-community';
import { Search, Layers, ArrowRight, Save, RefreshCw, History } from 'lucide-react';
import toast from 'react-hot-toast';

ModuleRegistry.registerModules([AllCommunityModule]);

const API = 'http://localhost:80/conta-app-backend/api/familias';

export function DistribuirProductos() {
  const [busqueda, setBusqueda] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [origen, setOrigen] = useState<any>(null);
  const [hermanos, setHermanos] = useState<any[]>([]);
  const [factorOrigen, setFactorOrigen] = useState<number>(0);
  const [destinoId, setDestinoId] = useState<number | null>(null);
  const [cantOrigen, setCantOrigen] = useState('1');
  const [comentario, setComentario] = useState('');
  const [guardando, setGuardando] = useState(false);
  const [showHist, setShowHist] = useState(false);
  const [movimientos, setMovimientos] = useState<any[]>([]);
  const timerRef = useRef<any>(null);

  const buscarProducto = (q: string) => {
    setBusqueda(q);
    if (q.length < 2) { setResults([]); return; }
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(async () => {
      try {
        const r = await fetch(`${API}/buscar-producto.php?q=${encodeURIComponent(q)}&exclude_familia=0`);
        const d = await r.json();
        if (d.success) setResults(d.articulos || []);
      } catch (e) {}
    }, 250);
  };

  const seleccionarOrigen = async (art: any) => {
    setOrigen(art);
    setBusqueda('');
    setResults([]);
    setDestinoId(null);
    try {
      const r = await fetch(`${API}/distribuir.php?items=${art.Items}`);
      const d = await r.json();
      if (!d.success || !d.id_familia) { toast.error('Este producto no pertenece a ninguna familia'); setOrigen(null); return; }
      setFactorOrigen(parseFloat(d.factor_self));
      // Solo los hermanos con factor MENOR (a los que puede distribuir)
      const inferior = (d.hermanos || []).filter((h: any) => parseFloat(h.Factor) < parseFloat(d.factor_self));
      if (inferior.length === 0) { toast.error('No hay unidades menores en la familia a las cuales distribuir'); setOrigen(null); return; }
      setHermanos(inferior);
      setDestinoId(inferior[0].Items);
    } catch (e) { toast.error('Error'); }
  };

  const distribuir = async () => {
    if (!origen || !destinoId) return;
    const cant = parseFloat(cantOrigen) || 0;
    if (cant <= 0) { toast.error('Cantidad inválida'); return; }
    if (cant > origen.Existencia) { toast.error(`No hay tanto stock. Existencia: ${origen.Existencia}`); return; }

    setGuardando(true);
    try {
      const r = await fetch(`${API}/distribuir.php`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'manual', items_origen: origen.Items, items_destino: destinoId, cant_origen: cant, comentario })
      });
      const d = await r.json();
      if (d.success) {
        toast.success(d.message, { duration: 5000 });
        setOrigen(null); setCantOrigen('1'); setComentario('');
        if (showHist) cargarHistorial();
      } else toast.error(d.message);
    } catch (e) { toast.error('Error'); }
    setGuardando(false);
  };

  const cargarHistorial = async () => {
    try {
      const r = await fetch(`${API}/movimientos.php?motivo=manual`);
      const d = await r.json();
      if (d.success) setMovimientos(d.movimientos || []);
    } catch (e) {}
  };
  useEffect(() => { if (showHist) cargarHistorial(); }, [showHist]);

  const destino = hermanos.find(h => h.Items === destinoId);
  const cantDestino = destino && factorOrigen > 0 ? (parseFloat(cantOrigen) || 0) * factorOrigen / parseFloat(destino.Factor) : 0;

  const colsHist: ColDef[] = [
    { headerName: 'Fecha', field: 'Fecha', width: 150, cellRenderer: (p: any) => p.value ? new Date(p.value).toLocaleString('es-CO') : '' },
    { headerName: 'Origen', width: 250, valueGetter: (p: any) => `${p.data.cod_origen} — ${p.data.nom_origen}` },
    { headerName: 'Cant. Origen', field: 'Cant_Origen', width: 110, cellRenderer: (p: any) => <span style={{ fontFamily: 'monospace', color: '#dc2626' }}>-{parseFloat(p.value).toFixed(2)}</span> },
    { headerName: 'Destino', width: 250, valueGetter: (p: any) => `${p.data.cod_destino} — ${p.data.nom_destino}` },
    { headerName: 'Cant. Destino', field: 'Cant_Destino', width: 110, cellRenderer: (p: any) => <span style={{ fontFamily: 'monospace', color: '#16a34a' }}>+{parseFloat(p.value).toFixed(2)}</span> },
    { headerName: 'Motivo', field: 'Motivo', width: 100, cellRenderer: (p: any) => <span style={{ padding: '2px 6px', borderRadius: 4, fontSize: 10, fontWeight: 600, background: p.value === 'manual' ? '#dbeafe' : '#fef3c7', color: p.value === 'manual' ? '#2563eb' : '#d97706' }}>{p.value}</span> },
    { headerName: 'Comentario', field: 'Comentario', flex: 1 },
  ];

  return (
    <div style={{ padding: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div>
          <h2 style={{ fontSize: 18, fontWeight: 700, margin: 0, color: '#1f2937' }}>Distribuir Productos</h2>
          <p style={{ fontSize: 13, color: '#6b7280', margin: '2px 0 0' }}>Abre una unidad mayor y reparte su contenido a una menor de la misma familia (ej. 1 Bulto → 50 Kilos)</p>
        </div>
        <button onClick={() => setShowHist(v => !v)}
          style={{ height: 30, padding: '0 12px', background: showHist ? '#7c3aed' : '#f3f4f6', color: showHist ? '#fff' : '#374151', border: '1px solid #e5e7eb', borderRadius: 8, fontSize: 12, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5 }}>
          <History size={14} /> Historial
        </button>
      </div>

      {!showHist ? (
        <div style={{ display: 'grid', gridTemplateColumns: origen ? '1fr 1fr' : '1fr', gap: 16 }}>
          <div style={{ background: '#fff', borderRadius: 10, padding: 16, boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
              <Layers size={15} color="#7c3aed" /> Producto origen (unidad mayor)
            </div>
            {!origen ? (
              <>
                <div style={{ position: 'relative' }}>
                  <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }} />
                  <input autoFocus type="text" placeholder="Buscar por código o nombre..." value={busqueda}
                    onChange={e => buscarProducto(e.target.value)}
                    style={{ width: '100%', height: 34, paddingLeft: 32, border: '1px solid #d1d5db', borderRadius: 8, fontSize: 13, outline: 'none' }} />
                </div>
                <div style={{ marginTop: 10, maxHeight: 350, overflow: 'auto' }}>
                  {results.map(r => (
                    <div key={r.Items} onClick={() => seleccionarOrigen(r)}
                      style={{ padding: '8px 10px', cursor: 'pointer', fontSize: 12, borderBottom: '1px solid #f3f4f6', display: 'flex', gap: 8 }}
                      onMouseOver={e => (e.currentTarget.style.background = '#f5f3ff')}
                      onMouseOut={e => (e.currentTarget.style.background = '')}>
                      <span style={{ color: '#7c3aed', fontWeight: 600, width: 70, flexShrink: 0 }}>{r.Codigo}</span>
                      <span style={{ flex: 1, fontWeight: 500 }}>{r.Nombres_Articulo}</span>
                      <span style={{ color: r.Existencia > 0 ? '#16a34a' : '#9ca3af', fontWeight: 600 }}>Stock: {Number(r.Existencia).toFixed(2)}</span>
                    </div>
                  ))}
                  {busqueda.length >= 2 && results.length === 0 && (
                    <div style={{ padding: 20, textAlign: 'center', color: '#9ca3af', fontSize: 12 }}>Sin resultados</div>
                  )}
                </div>
              </>
            ) : (
              <div style={{ padding: 12, background: '#f5f3ff', borderRadius: 8 }}>
                <div style={{ fontSize: 11, color: '#7c3aed', fontWeight: 600 }}>ORIGEN</div>
                <div style={{ fontWeight: 600, marginTop: 2, fontSize: 14 }}>{origen.Codigo} — {origen.Nombres_Articulo}</div>
                <div style={{ fontSize: 11, color: '#6b7280', marginTop: 4 }}>Existencia: <b style={{ color: '#16a34a' }}>{Number(origen.Existencia).toFixed(2)}</b> · Factor: <b>{factorOrigen}</b></div>
                <button onClick={() => setOrigen(null)} style={{ marginTop: 8, background: 'none', border: 'none', color: '#7c3aed', fontSize: 11, cursor: 'pointer', padding: 0, textDecoration: 'underline' }}>Cambiar producto</button>
              </div>
            )}
          </div>

          {origen && destino && (
            <div style={{ background: '#fff', borderRadius: 10, padding: 16, boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                <ArrowRight size={15} color="#16a34a" /> Distribuir a
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div>
                  <label style={{ fontSize: 11, color: '#6b7280', fontWeight: 600 }}>PRODUCTO DESTINO</label>
                  <select value={destinoId || ''} onChange={e => setDestinoId(parseInt(e.target.value) || null)}
                    style={{ width: '100%', height: 34, border: '1px solid #d1d5db', borderRadius: 6, padding: '0 8px', fontSize: 13, marginTop: 2 }}>
                    {hermanos.map(h => <option key={h.Items} value={h.Items}>{h.Codigo} — {h.Nombres_Articulo} (Factor {h.Factor})</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: 11, color: '#6b7280', fontWeight: 600 }}>CANTIDAD A ROMPER</label>
                  <input type="text" value={cantOrigen}
                    onChange={e => setCantOrigen(e.target.value)}
                    style={{ width: '100%', height: 34, border: '1px solid #d1d5db', borderRadius: 6, padding: '0 8px', fontSize: 14, fontFamily: 'monospace', marginTop: 2 }} />
                  <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 4 }}>Unidades de <b>{origen.Codigo}</b> que se van a abrir</div>
                </div>
                <div style={{ padding: 12, background: '#ecfdf5', border: '1px solid #a7f3d0', borderRadius: 8 }}>
                  <div style={{ fontSize: 11, color: '#16a34a', fontWeight: 600 }}>RESULTADO</div>
                  <div style={{ marginTop: 4, fontSize: 13 }}>
                    <b style={{ color: '#dc2626' }}>-{parseFloat(cantOrigen) || 0}</b> {origen.Codigo}
                    {' → '}
                    <b style={{ color: '#16a34a' }}>+{cantDestino.toFixed(2)}</b> {destino.Codigo}
                  </div>
                </div>
                <div>
                  <label style={{ fontSize: 11, color: '#6b7280', fontWeight: 600 }}>COMENTARIO (opcional)</label>
                  <input type="text" value={comentario} onChange={e => setComentario(e.target.value)} placeholder="ej. Apertura para pedido del cliente X"
                    style={{ width: '100%', height: 34, border: '1px solid #d1d5db', borderRadius: 6, padding: '0 8px', fontSize: 13, marginTop: 2 }} />
                </div>
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 4 }}>
                  <button onClick={() => { setOrigen(null); setCantOrigen('1'); setComentario(''); }}
                    style={{ height: 34, padding: '0 14px', background: '#f3f4f6', border: '1px solid #e5e7eb', borderRadius: 6, fontSize: 13, cursor: 'pointer' }}>Cancelar</button>
                  <button onClick={distribuir} disabled={guardando || !destinoId}
                    style={{ height: 34, padding: '0 18px', background: guardando ? '#9ca3af' : '#16a34a', color: '#fff', border: 'none', borderRadius: 6, fontSize: 13, cursor: guardando ? 'wait' : 'pointer', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}>
                    {guardando ? <RefreshCw size={14} className="spin" /> : <Save size={14} />}
                    Distribuir
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div style={{ background: '#fff', borderRadius: 10, padding: 12, boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
          <div className="ag-theme-quartz" style={{ height: 560 }}>
            <AgGridReact rowData={movimientos} columnDefs={colsHist} rowHeight={32} headerHeight={32} animateRows />
          </div>
        </div>
      )}
    </div>
  );
}
