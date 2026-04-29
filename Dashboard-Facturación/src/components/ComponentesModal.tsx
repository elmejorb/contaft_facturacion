import { useState, useEffect, useRef } from 'react';
import { Layers, Plus, Trash2, X, Save, Search, Calculator } from 'lucide-react';
import toast from 'react-hot-toast';

const API = 'http://localhost:80/conta-app-backend/api/componentes/index.php';
const API_PROD = 'http://localhost:80/conta-app-backend/api/familias/buscar-producto.php';

const fmt = (v: number) => '$ ' + Math.round(v || 0).toLocaleString('es-CO');
const fmtCant = (n: any) => { const v = parseFloat(n) || 0; return v % 1 === 0 ? String(v) : v.toFixed(2); };

interface Props {
  itemsPadre: number;
  codigoPadre: string;
  nombrePadre: string;
  onClose: () => void;
}

export function ComponentesModal({ itemsPadre, codigoPadre, nombrePadre, onClose }: Props) {
  const [componentes, setComponentes] = useState<any[]>([]);
  const [costoTotal, setCostoTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [showAgregar, setShowAgregar] = useState(false);

  const cargar = async () => {
    setLoading(true);
    try {
      const r = await fetch(`${API}?items=${itemsPadre}`);
      const d = await r.json();
      if (d.success) {
        setComponentes(d.componentes || []);
        setCostoTotal(parseFloat(d.costo_total) || 0);
      }
    } catch (e) { toast.error('Error al cargar componentes'); }
    setLoading(false);
  };

  useEffect(() => { cargar(); }, [itemsPadre]);

  const eliminar = async (id: number, nombre: string) => {
    if (!confirm(`¿Eliminar "${nombre}" como componente?`)) return;
    try {
      const r = await fetch(API, { method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'eliminar', id_componente: id }) });
      const d = await r.json();
      if (d.success) { toast.success(d.message); cargar(); }
      else toast.error(d.message);
    } catch (e) { toast.error('Error'); }
  };

  const recalcularCosto = async () => {
    if (!confirm(`Esto va a actualizar el Precio_Costo del producto a la suma de costos de sus componentes (${fmt(costoTotal)}). ¿Continuar?`)) return;
    try {
      const r = await fetch(API, { method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'recalcular_costo', items_padre: itemsPadre }) });
      const d = await r.json();
      if (d.success) toast.success(d.message);
      else toast.error(d.message);
    } catch (e) { toast.error('Error'); }
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 99999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ background: '#fff', width: 720, maxHeight: '88vh', borderRadius: 10, overflow: 'hidden', boxShadow: '0 25px 60px rgba(0,0,0,0.4)', display: 'flex', flexDirection: 'column' }}>
        <div style={{ background: 'linear-gradient(135deg, #7c3aed, #2563eb)', color: '#fff', padding: '12px 18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>
              <Layers size={18} /> Componentes / Receta
            </div>
            <div style={{ fontSize: 11, opacity: 0.85, marginTop: 2 }}>
              {codigoPadre} — {nombrePadre}
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer' }}>
            <X size={20} />
          </button>
        </div>

        <div style={{ padding: '10px 18px', background: '#f9fafb', borderBottom: '1px solid #e5e7eb', fontSize: 11, color: '#6b7280', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>Al vender este producto se descontará automáticamente la cantidad de cada componente del inventario.</span>
          <button onClick={() => setShowAgregar(true)}
            style={{ height: 28, padding: '0 12px', background: '#7c3aed', color: '#fff', border: 'none', borderRadius: 6, fontSize: 11, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5 }}>
            <Plus size={13} /> Agregar componente
          </button>
        </div>

        <div style={{ flex: 1, overflow: 'auto' }}>
          {loading ? (
            <div style={{ padding: 40, textAlign: 'center', color: '#9ca3af' }}>Cargando...</div>
          ) : componentes.length === 0 ? (
            <div style={{ padding: 40, textAlign: 'center', color: '#9ca3af' }}>
              <Layers size={36} color="#d1d5db" style={{ margin: '0 auto 8px' }} />
              <p style={{ margin: 0, fontSize: 13 }}>Aún no hay componentes definidos.</p>
              <p style={{ margin: '4px 0 0', fontSize: 11 }}>Click en "Agregar componente" para empezar.</p>
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
              <thead>
                <tr style={{ background: '#fafafa', borderBottom: '2px solid #7c3aed', fontSize: 10, color: '#6b7280', textTransform: 'uppercase' }}>
                  <th style={{ padding: '8px 12px', textAlign: 'left' }}>Código</th>
                  <th style={{ padding: '8px 12px', textAlign: 'left' }}>Componente</th>
                  <th style={{ padding: '8px 8px', textAlign: 'right' }}>Cant. Receta</th>
                  <th style={{ padding: '8px 8px', textAlign: 'right' }}>Stock</th>
                  <th style={{ padding: '8px 8px', textAlign: 'right' }}>Costo Unit.</th>
                  <th style={{ padding: '8px 8px', textAlign: 'right' }}>Aporte costo</th>
                  <th style={{ width: 40 }}></th>
                </tr>
              </thead>
              <tbody>
                {componentes.map(c => (
                  <tr key={c.Id_Componente} style={{ borderBottom: '1px solid #f3f4f6' }}>
                    <td style={{ padding: '8px 12px', fontFamily: 'monospace', fontSize: 11, color: '#7c3aed' }}>{c.Codigo_Componente}</td>
                    <td style={{ padding: '8px 12px' }}>
                      <div style={{ fontWeight: 600 }}>{c.Nombre_Componente}</div>
                      {c.Comentario && <div style={{ fontSize: 10, color: '#9ca3af', marginTop: 1 }}>{c.Comentario}</div>}
                    </td>
                    <td style={{ padding: '8px 8px', textAlign: 'right', fontFamily: 'monospace', fontWeight: 600 }}>{fmtCant(c.Cantidad)}</td>
                    <td style={{ padding: '8px 8px', textAlign: 'right', fontFamily: 'monospace',
                      color: parseFloat(c.Stock_Componente) < parseFloat(c.Cantidad) ? '#dc2626' : '#16a34a' }}>
                      {fmtCant(c.Stock_Componente)}
                    </td>
                    <td style={{ padding: '8px 8px', textAlign: 'right', fontFamily: 'monospace', color: '#6b7280' }}>{fmt(parseFloat(c.Costo_Unit_Componente))}</td>
                    <td style={{ padding: '8px 8px', textAlign: 'right', fontFamily: 'monospace', fontWeight: 700, color: '#0891b2' }}>{fmt(parseFloat(c.Costo_Aporte))}</td>
                    <td style={{ padding: '8px 4px', textAlign: 'center' }}>
                      <button onClick={() => eliminar(c.Id_Componente, c.Nombre_Componente)}
                        title="Eliminar componente"
                        style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}>
                        <Trash2 size={14} color="#dc2626" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div style={{ padding: '10px 18px', background: '#f9fafb', borderTop: '1px solid #e5e7eb', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontSize: 12, color: '#1f2937' }}>
            Costo total receta: <b style={{ color: '#0891b2', fontSize: 14 }}>{fmt(costoTotal)}</b>
            <span style={{ marginLeft: 8, fontSize: 11, color: '#9ca3af' }}>({componentes.length} componente(s))</span>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            {componentes.length > 0 && (
              <button onClick={recalcularCosto}
                style={{ height: 30, padding: '0 12px', background: '#0891b2', color: '#fff', border: 'none', borderRadius: 6, fontSize: 11, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5 }}>
                <Calculator size={13} /> Aplicar costo al producto
              </button>
            )}
            <button onClick={onClose}
              style={{ height: 30, padding: '0 14px', background: '#7c3aed', color: '#fff', border: 'none', borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
              Cerrar
            </button>
          </div>
        </div>
      </div>

      {showAgregar && (
        <AgregarComponenteModal
          itemsPadre={itemsPadre}
          excluir={[itemsPadre, ...componentes.map(c => c.Items_Componente)]}
          onClose={() => setShowAgregar(false)}
          onAgregado={() => { setShowAgregar(false); cargar(); }}
        />
      )}
    </div>
  );
}

// ----- Modal anidado: agregar un componente -----
function AgregarComponenteModal({ itemsPadre, excluir, onClose, onAgregado }: {
  itemsPadre: number; excluir: number[]; onClose: () => void; onAgregado: () => void;
}) {
  const [busqueda, setBusqueda] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [seleccionado, setSeleccionado] = useState<any>(null);
  const [cantidad, setCantidad] = useState('');
  const [comentario, setComentario] = useState('');
  const [saving, setSaving] = useState(false);
  const timer = useRef<any>(null);

  const buscar = (q: string) => {
    setBusqueda(q);
    if (q.length < 2) { setResults([]); return; }
    clearTimeout(timer.current);
    timer.current = setTimeout(async () => {
      try {
        const r = await fetch(`${API_PROD}?q=${encodeURIComponent(q)}&exclude_familia=0`);
        const d = await r.json();
        if (d.success) setResults((d.articulos || []).filter((a: any) => !excluir.includes(a.Items)));
      } catch (e) {}
    }, 250);
  };

  const guardar = async () => {
    if (!seleccionado) { toast.error('Selecciona un componente'); return; }
    const c = parseFloat(cantidad);
    if (!c || c <= 0) { toast.error('Cantidad inválida'); return; }
    setSaving(true);
    try {
      const r = await fetch(API, { method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'agregar', items_padre: itemsPadre,
          items_componente: seleccionado.Items, cantidad: c, comentario,
        }) });
      const d = await r.json();
      if (d.success) { toast.success(d.message); onAgregado(); }
      else toast.error(d.message);
    } catch (e) { toast.error('Error'); }
    setSaving(false);
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 999999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ background: '#fff', width: 460, borderRadius: 10, overflow: 'hidden', boxShadow: '0 20px 50px rgba(0,0,0,0.3)' }}>
        <div style={{ background: '#7c3aed', color: '#fff', padding: '10px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: 13, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>
            <Plus size={16} /> Agregar componente
          </span>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer' }}><X size={18} /></button>
        </div>
        <div style={{ padding: 14 }}>
          {!seleccionado ? (
            <>
              <label style={{ fontSize: 11, fontWeight: 600, color: '#374151' }}>Producto componente *</label>
              <div style={{ position: 'relative', marginTop: 4 }}>
                <Search size={14} style={{ position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }} />
                <input autoFocus type="text" placeholder="Buscar por código o nombre…" value={busqueda}
                  onChange={e => buscar(e.target.value)}
                  style={{ width: '100%', padding: '6px 8px 6px 28px', border: '1px solid #d1d5db', borderRadius: 4, fontSize: 13, boxSizing: 'border-box' }} />
              </div>
              {results.length > 0 && (
                <div style={{ maxHeight: 200, overflow: 'auto', border: '1px solid #e5e7eb', borderRadius: 6, marginTop: 6 }}>
                  {results.map(r => (
                    <div key={r.Items} onClick={() => setSeleccionado(r)}
                      style={{ padding: '6px 10px', cursor: 'pointer', fontSize: 12, borderBottom: '1px solid #f3f4f6', display: 'flex', gap: 10, alignItems: 'center' }}
                      onMouseOver={e => (e.currentTarget.style.background = '#f5f3ff')}
                      onMouseOut={e => (e.currentTarget.style.background = '')}>
                      <span style={{ color: '#7c3aed', fontWeight: 600, width: 130, fontFamily: 'monospace', fontSize: 11, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.Codigo}</span>
                      <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.Nombres_Articulo}</span>
                      <span style={{ color: '#6b7280', fontSize: 11 }}>Stock: <b>{fmtCant(r.Existencia)}</b></span>
                    </div>
                  ))}
                </div>
              )}
              {busqueda.length >= 2 && results.length === 0 && (
                <div style={{ padding: 16, textAlign: 'center', color: '#9ca3af', fontSize: 12 }}>Sin resultados</div>
              )}
            </>
          ) : (
            <>
              <div style={{ background: '#f5f3ff', border: '1px solid #ddd6fe', borderRadius: 6, padding: 10, marginBottom: 10 }}>
                <div style={{ fontSize: 12, fontWeight: 700 }}>{seleccionado.Codigo} — {seleccionado.Nombres_Articulo}</div>
                <div style={{ fontSize: 11, color: '#6b7280', marginTop: 2 }}>Costo: <b>{fmt(parseFloat(seleccionado.Precio_Costo) || 0)}</b> · Stock: <b>{fmtCant(seleccionado.Existencia)}</b></div>
                <button onClick={() => setSeleccionado(null)} style={{ marginTop: 4, background: 'none', border: 'none', color: '#7c3aed', fontSize: 11, cursor: 'pointer', textDecoration: 'underline', padding: 0 }}>Cambiar producto</button>
              </div>
              <label style={{ fontSize: 11, fontWeight: 600, color: '#374151' }}>Cantidad por unidad del padre *</label>
              <input value={cantidad} onChange={e => setCantidad(e.target.value)}
                placeholder="Ej. 0.2 (kilos), 1 (unidades), 0.5 (litros)" autoFocus
                style={{ width: '100%', padding: '6px 8px', border: '1px solid #d1d5db', borderRadius: 4, fontSize: 13, fontFamily: 'monospace', marginTop: 2, marginBottom: 10, boxSizing: 'border-box' }} />
              <label style={{ fontSize: 11, fontWeight: 600, color: '#374151' }}>Comentario (opcional)</label>
              <input value={comentario} onChange={e => setComentario(e.target.value)}
                placeholder="Ej. picado fino, al gusto, etc."
                style={{ width: '100%', padding: '6px 8px', border: '1px solid #d1d5db', borderRadius: 4, fontSize: 13, marginTop: 2, boxSizing: 'border-box' }} />
            </>
          )}
        </div>
        <div style={{ padding: '10px 14px', background: '#f9fafb', borderTop: '1px solid #e5e7eb', display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <button onClick={onClose}
            style={{ padding: '6px 14px', background: '#fff', border: '1px solid #d1d5db', borderRadius: 4, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>Cancelar</button>
          <button onClick={guardar} disabled={saving || !seleccionado || !cantidad}
            style={{ padding: '6px 14px', background: (seleccionado && cantidad) ? '#7c3aed' : '#d1d5db', color: '#fff', border: 'none', borderRadius: 4, fontSize: 12, fontWeight: 600, cursor: (seleccionado && cantidad) ? 'pointer' : 'not-allowed', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <Save size={12} /> {saving ? 'Guardando…' : 'Agregar'}
          </button>
        </div>
      </div>
    </div>
  );
}
