import { useState, useEffect, useRef } from 'react';
import { Search, Trash2, Save, X, ArrowLeft } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../contexts/AuthContext';

const API_COMPRAS = 'http://localhost:80/conta-app-backend/api/compras/nueva.php';
const API_OC = 'http://localhost:80/conta-app-backend/api/ordenes-compra';

const fmtMon = (v: number) => '$ ' + Math.round(v).toLocaleString('es-CO');

interface LineaOC {
  id: number;
  Items: number;
  Codigo: string;
  Nombre: string;
  Existencia: number;
  Cantidad: number;
  PrecioC: number;
  Iva: number;
  Descuento: number;
  Subtotal: number;
}

let lid = Date.now();
const LS_KEY = 'oc_actual';

function loadSaved() {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {}
  return null;
}

export function NuevaOrdenCompra({ onClose }: { onClose?: () => void } = {}) {
  const { user } = useAuth();
  const saved = loadSaved();
  const [fecha, setFecha] = useState<string>(saved?.fecha || new Date().toISOString().slice(0, 10));
  const [fechaEntrega, setFechaEntrega] = useState<string>(saved?.fechaEntrega || '');
  const [proveedor, setProveedor] = useState(saved?.proveedor || { id: 0, nombre: '', nit: '' });
  const [proveedores, setProveedores] = useState<any[]>([]);
  const [showProvModal, setShowProvModal] = useState(false);
  const [provBusqueda, setProvBusqueda] = useState('');
  const [lineas, setLineas] = useState<LineaOC[]>(saved?.lineas || []);
  const [flete, setFlete] = useState(saved?.flete || 0);
  const [descuento, setDescuento] = useState(saved?.descuento || 0);
  const [retencion, setRetencion] = useState(saved?.retencion || 0);
  const [comentario, setComentario] = useState(saved?.comentario || '');
  const [buscarProd, setBuscarProd] = useState('');
  const [prodResults, setProdResults] = useState<any[]>([]);
  const [showProdDrop, setShowProdDrop] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const searchTimer = useRef<any>(null);
  const buscarInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    localStorage.setItem(LS_KEY, JSON.stringify({ fecha, fechaEntrega, proveedor, lineas, flete, descuento, retencion, comentario }));
  }, [fecha, fechaEntrega, proveedor, lineas, flete, descuento, retencion, comentario]);

  useEffect(() => {
    fetch(`${API_COMPRAS}?proveedores=1`).then(r => r.json())
      .then(d => { if (d.success) setProveedores(d.proveedores); });
  }, []);

  const buscarProducto = (q: string) => {
    setBuscarProd(q);
    if (q.length < 1) { setProdResults([]); setShowProdDrop(false); return; }
    clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(async () => {
      const r = await fetch(`${API_COMPRAS}?buscar=${encodeURIComponent(q)}`);
      const d = await r.json();
      if (d.success) { setProdResults(d.articulos); setShowProdDrop(true); }
    }, 200);
  };

  const agregarProducto = (art: any) => {
    const existe = lineas.find(l => l.Items === art.Items);
    if (existe) {
      setLineas(prev => prev.map(l =>
        l.Items === art.Items
          ? { ...l, Cantidad: l.Cantidad + 1, Subtotal: (l.Cantidad + 1) * l.PrecioC - l.Descuento }
          : l
      ));
      setBuscarProd(''); setShowProdDrop(false);
      return;
    }
    const precioC = art.Precio_Costo || 0;
    const ivaPct = art.last_iva_compra ?? art.Iva ?? 0;
    const nueva: LineaOC = {
      id: ++lid, Items: art.Items, Codigo: art.Codigo, Nombre: art.Nombres_Articulo,
      Existencia: art.Existencia, Cantidad: 1,
      PrecioC: precioC, Iva: ivaPct, Descuento: 0, Subtotal: precioC,
    };
    setLineas(prev => [...prev, nueva]);
    setBuscarProd(''); setShowProdDrop(false);
    setTimeout(() => buscarInputRef.current?.focus(), 50);
  };

  const actualizarLinea = (id: number, field: keyof LineaOC, value: number) => {
    setLineas(prev => prev.map(l => {
      if (l.id !== id) return l;
      const u = { ...l, [field]: value };
      u.Subtotal = u.Cantidad * u.PrecioC - u.Descuento;
      return u;
    }));
  };

  const eliminarLinea = (id: number) => setLineas(prev => prev.filter(l => l.id !== id));

  const subtotal = lineas.reduce((s, l) => s + l.Subtotal, 0);
  const totalIva = lineas.reduce((s, l) => s + l.Subtotal * (l.Iva / 100), 0);
  const total = subtotal + totalIva - descuento + flete - retencion;

  const guardar = async () => {
    if (!proveedor.id) { toast.error('Seleccione un proveedor'); return; }
    if (lineas.length === 0) { toast.error('Agregue al menos un producto'); return; }
    setGuardando(true);
    try {
      const body = {
        CodigoPro: proveedor.id, fecha,
        fecha_entrega: fechaEntrega || null,
        Descuento: descuento, Flete: flete, Retencion: retencion,
        Comentario: comentario,
        Id_Usuario: (user as any)?.Id_Usuario ?? (user as any)?.id,
        items: lineas.map(l => ({
          Items: l.Items, Cantidad: l.Cantidad, PrecioC: l.PrecioC,
          Iva: l.Iva, Descuento: l.Descuento,
        })),
      };
      const r = await fetch(`${API_OC}/crear.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const d = await r.json();
      if (!d.success) throw new Error(d.message || 'Error al guardar');
      toast.success(`${d.numero_oc} creada — ${fmtMon(d.total)}`);
      localStorage.removeItem(LS_KEY);
      onClose?.();
    } catch (e: any) {
      toast.error(e.message);
    }
    setGuardando(false);
  };

  const cancelar = () => {
    if (lineas.length > 0 && !confirm('¿Descartar la orden en curso?')) return;
    localStorage.removeItem(LS_KEY);
    onClose?.();
  };

  const provFiltrados = proveedores.filter(p =>
    !provBusqueda ||
    (p.RazonSocial || '').toLowerCase().includes(provBusqueda.toLowerCase()) ||
    (p.Nit || '').includes(provBusqueda)
  );

  const inp: React.CSSProperties = { height: 28, border: '1px solid #d1d5db', borderRadius: 6, fontSize: 12, padding: '0 8px', outline: 'none', width: '100%' };
  const lbl: React.CSSProperties = { fontSize: 10, color: '#6b7280', display: 'block', marginBottom: 2, fontWeight: 500 };

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button onClick={cancelar}
            style={{ height: 30, width: 30, background: '#f3f4f6', border: '1px solid #d1d5db', borderRadius: 6, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <ArrowLeft size={16} color="#374151" />
          </button>
          <div>
            <h2 style={{ fontSize: 20, fontWeight: 700, margin: 0 }}>Nueva Orden de Compra</h2>
            <p style={{ fontSize: 12, color: '#6b7280', margin: 0 }}>Registre el pedido antes de que llegue la mercancía</p>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={cancelar}
            style={{ height: 30, padding: '0 14px', background: '#fff', color: '#374151', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 12, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
            <X size={14} /> Cancelar
          </button>
          <button onClick={guardar} disabled={guardando}
            style={{ height: 30, padding: '0 14px', background: '#7c3aed', color: '#fff', border: 'none', borderRadius: 6, fontSize: 12, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, fontWeight: 600, opacity: guardando ? 0.6 : 1 }}>
            <Save size={14} /> Guardar OC
          </button>
        </div>
      </div>

      {/* Cabecera */}
      <div style={{ background: '#fff', padding: 12, borderRadius: 10, boxShadow: '0 1px 3px rgba(0,0,0,0.06)', marginBottom: 10 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '150px 150px 1fr', gap: 12 }}>
          <div>
            <label style={lbl}>Fecha</label>
            <input type="date" value={fecha} onChange={e => setFecha(e.target.value)} style={inp} />
          </div>
          <div>
            <label style={lbl}>Fecha entrega esperada</label>
            <input type="date" value={fechaEntrega} onChange={e => setFechaEntrega(e.target.value)} style={inp} />
          </div>
          <div>
            <label style={lbl}>Proveedor</label>
            <div style={{ display: 'flex', gap: 4 }}>
              <input value={proveedor.nombre} readOnly placeholder="Seleccione proveedor..."
                style={{ ...inp, background: '#f9fafb', cursor: 'pointer' }}
                onClick={() => setShowProvModal(true)} />
              <button onClick={() => setShowProvModal(true)}
                style={{ height: 28, width: 32, background: '#7c3aed', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Search size={13} />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Buscar producto */}
      <div style={{ background: '#fff', padding: 10, borderRadius: 10, boxShadow: '0 1px 3px rgba(0,0,0,0.06)', marginBottom: 10, position: 'relative' }}>
        <div style={{ position: 'relative' }}>
          <Search size={14} style={{ position: 'absolute', left: 10, top: 8, color: '#9ca3af' }} />
          <input ref={buscarInputRef} value={buscarProd}
            onChange={e => buscarProducto(e.target.value)}
            placeholder="Buscar producto por código o nombre..."
            style={{ ...inp, height: 30, paddingLeft: 30 }} />
        </div>
        {showProdDrop && prodResults.length > 0 && (
          <div style={{
            position: 'absolute', top: '100%', left: 10, right: 10, background: '#fff',
            border: '1px solid #d1d5db', borderRadius: 6, maxHeight: 260, overflowY: 'auto',
            zIndex: 20, boxShadow: '0 4px 12px rgba(0,0,0,0.12)', marginTop: 4,
          }}>
            {prodResults.map(art => (
              <div key={art.Items} onClick={() => agregarProducto(art)}
                style={{ padding: '8px 10px', cursor: 'pointer', borderBottom: '1px solid #f3f4f6', display: 'flex', justifyContent: 'space-between', fontSize: 12 }}
                onMouseEnter={e => e.currentTarget.style.background = '#f5f3ff'}
                onMouseLeave={e => e.currentTarget.style.background = '#fff'}>
                <span><strong style={{ color: '#7c3aed' }}>{art.Codigo}</strong> — {art.Nombres_Articulo}</span>
                <span style={{ color: '#6b7280' }}>Ex: {art.Existencia} · {fmtMon(art.Precio_Costo || 0)}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Grid de líneas */}
      <div style={{ background: '#fff', borderRadius: 10, boxShadow: '0 1px 3px rgba(0,0,0,0.06)', overflow: 'hidden', marginBottom: 10 }}>
        <table style={{ width: '100%', fontSize: 12, borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#f3e8ff', color: '#7c3aed' }}>
              <th style={{ padding: 8, textAlign: 'left', width: 90, fontWeight: 600 }}>Código</th>
              <th style={{ padding: 8, textAlign: 'left', fontWeight: 600 }}>Producto</th>
              <th style={{ padding: 8, textAlign: 'right', width: 70, fontWeight: 600 }}>Existencia</th>
              <th style={{ padding: 8, textAlign: 'right', width: 80, fontWeight: 600 }}>Cantidad</th>
              <th style={{ padding: 8, textAlign: 'right', width: 100, fontWeight: 600 }}>Precio</th>
              <th style={{ padding: 8, textAlign: 'right', width: 65, fontWeight: 600 }}>IVA %</th>
              <th style={{ padding: 8, textAlign: 'right', width: 90, fontWeight: 600 }}>Descuento</th>
              <th style={{ padding: 8, textAlign: 'right', width: 110, fontWeight: 600 }}>Subtotal</th>
              <th style={{ padding: 8, width: 34 }}></th>
            </tr>
          </thead>
          <tbody>
            {lineas.length === 0 && (
              <tr>
                <td colSpan={9} style={{ padding: 30, textAlign: 'center', color: '#9ca3af', fontSize: 13 }}>
                  Busque productos arriba para agregarlos a la orden
                </td>
              </tr>
            )}
            {lineas.map(l => (
              <tr key={l.id} style={{ borderTop: '1px solid #f3f4f6' }}>
                <td style={{ padding: 4, fontWeight: 500 }}>{l.Codigo}</td>
                <td style={{ padding: 4 }}>{l.Nombre}</td>
                <td style={{ padding: 4, textAlign: 'right', color: '#6b7280' }}>{l.Existencia}</td>
                <td style={{ padding: 2 }}>
                  <input type="text" inputMode="decimal" value={l.Cantidad}
                    onChange={e => actualizarLinea(l.id, 'Cantidad', Number(e.target.value.replace(',', '.')) || 0)}
                    style={{ width: '100%', height: 24, textAlign: 'right', border: '1px solid #d1d5db', padding: '0 4px', fontSize: 12, borderRadius: 4, outline: 'none' }} />
                </td>
                <td style={{ padding: 2 }}>
                  <input type="text" inputMode="decimal" value={l.PrecioC}
                    onChange={e => actualizarLinea(l.id, 'PrecioC', Number(e.target.value.replace(',', '.')) || 0)}
                    style={{ width: '100%', height: 24, textAlign: 'right', border: '1px solid #d1d5db', padding: '0 4px', fontSize: 12, borderRadius: 4, outline: 'none' }} />
                </td>
                <td style={{ padding: 2 }}>
                  <input type="text" inputMode="decimal" value={l.Iva}
                    onChange={e => actualizarLinea(l.id, 'Iva', Number(e.target.value.replace(',', '.')) || 0)}
                    style={{ width: '100%', height: 24, textAlign: 'right', border: '1px solid #d1d5db', padding: '0 4px', fontSize: 12, borderRadius: 4, outline: 'none' }} />
                </td>
                <td style={{ padding: 2 }}>
                  <input type="text" inputMode="decimal" value={l.Descuento}
                    onChange={e => actualizarLinea(l.id, 'Descuento', Number(e.target.value.replace(',', '.')) || 0)}
                    style={{ width: '100%', height: 24, textAlign: 'right', border: '1px solid #d1d5db', padding: '0 4px', fontSize: 12, borderRadius: 4, outline: 'none' }} />
                </td>
                <td style={{ padding: 4, textAlign: 'right', fontWeight: 700, color: '#7c3aed' }}>{fmtMon(l.Subtotal)}</td>
                <td style={{ padding: 4, textAlign: 'center' }}>
                  <button onClick={() => eliminarLinea(l.id)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#dc2626', padding: 2 }}
                    title="Eliminar">
                    <Trash2 size={14} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Comentario + totales */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 10 }}>
        <div style={{ background: '#fff', padding: 12, borderRadius: 10, boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
          <label style={lbl}>Comentario / Observaciones</label>
          <textarea value={comentario} onChange={e => setComentario(e.target.value)} rows={5}
            style={{ width: '100%', padding: '6px 8px', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 12, resize: 'vertical', outline: 'none' }} />
        </div>
        <div style={{ background: '#fff', padding: 14, borderRadius: 10, boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
          <div style={rowT}><span>Subtotal:</span><span style={{ fontWeight: 600 }}>{fmtMon(subtotal)}</span></div>
          <div style={rowT}><span>IVA:</span><span style={{ fontWeight: 600 }}>{fmtMon(totalIva)}</span></div>
          <div style={{ ...rowT, alignItems: 'center' }}>
            <span>Descuento:</span>
            <input type="text" inputMode="decimal" value={descuento}
              onChange={e => setDescuento(Number(e.target.value.replace(',', '.')) || 0)}
              style={{ width: 100, height: 24, textAlign: 'right', border: '1px solid #d1d5db', padding: '0 6px', fontSize: 12, borderRadius: 4, outline: 'none' }} />
          </div>
          <div style={{ ...rowT, alignItems: 'center' }}>
            <span>Flete:</span>
            <input type="text" inputMode="decimal" value={flete}
              onChange={e => setFlete(Number(e.target.value.replace(',', '.')) || 0)}
              style={{ width: 100, height: 24, textAlign: 'right', border: '1px solid #d1d5db', padding: '0 6px', fontSize: 12, borderRadius: 4, outline: 'none' }} />
          </div>
          <div style={{ ...rowT, alignItems: 'center' }}>
            <span>Retención:</span>
            <input type="text" inputMode="decimal" value={retencion}
              onChange={e => setRetencion(Number(e.target.value.replace(',', '.')) || 0)}
              style={{ width: 100, height: 24, textAlign: 'right', border: '1px solid #d1d5db', padding: '0 6px', fontSize: 12, borderRadius: 4, outline: 'none' }} />
          </div>
          <div style={{ ...rowT, borderTop: '2px solid #7c3aed', paddingTop: 8, marginTop: 6, fontSize: 16, fontWeight: 700, color: '#7c3aed' }}>
            <span>TOTAL:</span><span>{fmtMon(total)}</span>
          </div>
        </div>
      </div>

      {/* Modal proveedores */}
      {showProvModal && (
        <div style={overlay}>
          <div style={{ background: '#fff', borderRadius: 10, padding: 16, width: 540, maxHeight: '80vh', display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10, paddingBottom: 8, borderBottom: '1px solid #e5e7eb' }}>
              <h3 style={{ margin: 0, fontSize: 16, color: '#7c3aed', fontWeight: 700 }}>Seleccionar Proveedor</h3>
              <button onClick={() => setShowProvModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 22, color: '#6b7280' }}>×</button>
            </div>
            <div style={{ position: 'relative', marginBottom: 8 }}>
              <Search size={14} style={{ position: 'absolute', left: 10, top: 8, color: '#9ca3af' }} />
              <input autoFocus placeholder="Buscar por nombre o NIT..."
                value={provBusqueda} onChange={e => setProvBusqueda(e.target.value)}
                style={{ ...inp, height: 30, paddingLeft: 30 }} />
            </div>
            <div style={{ overflowY: 'auto', flex: 1, border: '1px solid #e5e7eb', borderRadius: 6 }}>
              {provFiltrados.map(p => (
                <div key={p.CodigoPro}
                  onClick={() => { setProveedor({ id: p.CodigoPro, nombre: p.RazonSocial, nit: p.Nit }); setShowProvModal(false); setProvBusqueda(''); }}
                  style={{ padding: '8px 10px', cursor: 'pointer', borderBottom: '1px solid #f3f4f6', fontSize: 12 }}
                  onMouseEnter={e => e.currentTarget.style.background = '#f5f3ff'}
                  onMouseLeave={e => e.currentTarget.style.background = '#fff'}>
                  <div style={{ fontWeight: 600 }}>{p.RazonSocial}</div>
                  <div style={{ color: '#6b7280', fontSize: 11 }}>NIT: {p.Nit}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const overlay: React.CSSProperties = {
  position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 100,
  display: 'flex', alignItems: 'center', justifyContent: 'center',
};
const rowT: React.CSSProperties = { display: 'flex', justifyContent: 'space-between', padding: '4px 0', fontSize: 12 };
