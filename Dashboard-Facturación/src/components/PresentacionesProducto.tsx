import { useState, useEffect } from 'react';
import { Plus, Trash2, Save, Package } from 'lucide-react';
import toast from 'react-hot-toast';

const API = 'http://localhost:80/conta-app-backend/api/inventario/presentaciones.php';
const fmtMon = (v: number) => '$ ' + Math.round(v).toLocaleString('es-CO');

interface Props { items: number; onClose?: () => void; }

const unidadesBase = ['Unidad', 'Kilo', 'Gramo', 'Litro', 'Mililitro', 'Metro', 'Centímetro', 'Libra', 'Arroba', 'Bulto', 'Caja', 'Paquete', 'Docena'];

export function PresentacionesProducto({ items, onClose }: Props) {
  const [producto, setProducto] = useState<any>(null);
  const [presentaciones, setPresentaciones] = useState<any[]>([]);
  const [unidadBase, setUnidadBase] = useState('Unidad');
  const [nombre, setNombre] = useState('');
  const [factor, setFactor] = useState('');
  const [precio, setPrecio] = useState('');
  const [codigoBarras, setCodigoBarras] = useState('');
  const [editando, setEditando] = useState<number | null>(null);

  const cargar = async () => {
    try {
      const r = await fetch(`${API}?items=${items}`);
      const d = await r.json();
      if (d.success) {
        setProducto(d.producto);
        setPresentaciones(d.presentaciones || []);
        setUnidadBase(d.producto?.unidad_base || 'Unidad');
      }
    } catch (e) {}
  };

  useEffect(() => { cargar(); }, [items]);

  const guardarUnidadBase = async (u: string) => {
    setUnidadBase(u);
    await fetch(API, { method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'actualizar_unidad_base', items, unidad_base: u }) });
  };

  const crear = async () => {
    if (!nombre || !factor || parseFloat(factor) <= 0) { toast.error('Nombre y factor requeridos'); return; }
    const r = await fetch(API, { method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'crear', items, nombre, factor: parseFloat(factor), precio_venta: parseFloat(precio) || 0, codigo_barras: codigoBarras || null }) });
    const d = await r.json();
    if (d.success) { toast.success(d.message); setNombre(''); setFactor(''); setPrecio(''); setCodigoBarras(''); cargar(); }
    else toast.error(d.message);
  };

  const editar = async (id: number, data: any) => {
    const r = await fetch(API, { method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'editar', id, ...data }) });
    const d = await r.json();
    if (d.success) { toast.success(d.message); setEditando(null); cargar(); }
    else toast.error(d.message);
  };

  const eliminar = async (id: number) => {
    if (!confirm('¿Desactivar esta presentación?')) return;
    const r = await fetch(API, { method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'eliminar', id }) });
    const d = await r.json();
    if (d.success) { toast.success(d.message); cargar(); }
  };

  if (!producto) return null;

  return (
    <div>
      {/* Header producto */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12, padding: '10px 14px', background: '#f9fafb', borderRadius: 10 }}>
        <Package size={20} color="#7c3aed" />
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 14, fontWeight: 700 }}>{producto.Nombres_Articulo}</div>
          <div style={{ fontSize: 11, color: '#6b7280' }}>Código: {producto.Codigo} | Existencia: {producto.Existencia} {unidadBase}(s)</div>
        </div>
        <div>
          <label style={{ fontSize: 10, fontWeight: 600, color: '#6b7280', display: 'block', marginBottom: 2 }}>UNIDAD BASE</label>
          <select value={unidadBase} onChange={e => guardarUnidadBase(e.target.value)}
            style={{ height: 28, border: '1px solid #d1d5db', borderRadius: 6, fontSize: 12, padding: '0 6px' }}>
            {unidadesBase.map(u => <option key={u} value={u}>{u}</option>)}
          </select>
        </div>
      </div>

      {/* Lista de presentaciones */}
      {presentaciones.length > 0 && (
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12, marginBottom: 12 }}>
          <thead>
            <tr style={{ background: '#f3f4f6', borderBottom: '2px solid #e5e7eb' }}>
              <th style={{ padding: '5px 8px', textAlign: 'left' }}>Presentación</th>
              <th style={{ padding: '5px 8px', textAlign: 'center', width: 80 }}>Factor</th>
              <th style={{ padding: '5px 8px', textAlign: 'center', width: 70 }}>Equivale</th>
              <th style={{ padding: '5px 8px', textAlign: 'right', width: 100 }}>Precio</th>
              <th style={{ padding: '5px 8px', textAlign: 'left', width: 100 }}>Cód. Barras</th>
              <th style={{ padding: '5px 8px', width: 60 }}></th>
            </tr>
          </thead>
          <tbody>
            {presentaciones.filter(p => p.Activa).map(p => (
              <tr key={p.Id_Presentacion} style={{ borderBottom: '1px solid #f3f4f6' }}>
                {editando === p.Id_Presentacion ? (
                  <>
                    <td style={{ padding: '3px 4px' }}>
                      <input type="text" defaultValue={p.Nombre} id={`pn-${p.Id_Presentacion}`}
                        style={{ width: '100%', height: 26, border: '1px solid #7c3aed', borderRadius: 4, fontSize: 12, padding: '0 6px' }} />
                    </td>
                    <td style={{ padding: '3px 4px' }}>
                      <input type="text" defaultValue={p.Factor} id={`pf-${p.Id_Presentacion}`}
                        style={{ width: 60, height: 26, textAlign: 'center', border: '1px solid #7c3aed', borderRadius: 4, fontSize: 12 }} />
                    </td>
                    <td style={{ padding: '3px 8px', textAlign: 'center', fontSize: 10, color: '#6b7280' }}>
                      1 = {p.Factor} {unidadBase}
                    </td>
                    <td style={{ padding: '3px 4px' }}>
                      <input type="text" defaultValue={p.Precio_Venta} id={`pp-${p.Id_Presentacion}`}
                        style={{ width: 80, height: 26, textAlign: 'right', border: '1px solid #7c3aed', borderRadius: 4, fontSize: 12 }} />
                    </td>
                    <td style={{ padding: '3px 4px' }}>
                      <input type="text" defaultValue={p.Codigo_Barras || ''} id={`pc-${p.Id_Presentacion}`}
                        style={{ width: 80, height: 26, border: '1px solid #7c3aed', borderRadius: 4, fontSize: 11 }} />
                    </td>
                    <td style={{ padding: '3px 4px', display: 'flex', gap: 2 }}>
                      <button onClick={() => {
                        const n = (document.getElementById(`pn-${p.Id_Presentacion}`) as HTMLInputElement)?.value;
                        const f = (document.getElementById(`pf-${p.Id_Presentacion}`) as HTMLInputElement)?.value;
                        const pr = (document.getElementById(`pp-${p.Id_Presentacion}`) as HTMLInputElement)?.value;
                        const c = (document.getElementById(`pc-${p.Id_Presentacion}`) as HTMLInputElement)?.value;
                        editar(p.Id_Presentacion, { nombre: n, factor: parseFloat(f), precio_venta: parseFloat(pr), codigo_barras: c || null });
                      }} style={{ height: 26, padding: '0 8px', background: '#7c3aed', color: '#fff', border: 'none', borderRadius: 4, fontSize: 11, cursor: 'pointer' }}>
                        <Save size={12} />
                      </button>
                      <button onClick={() => setEditando(null)} style={{ height: 26, padding: '0 6px', background: '#f3f4f6', border: '1px solid #e5e7eb', borderRadius: 4, fontSize: 11, cursor: 'pointer' }}>X</button>
                    </td>
                  </>
                ) : (
                  <>
                    <td style={{ padding: '5px 8px', fontWeight: 600 }}>{p.Nombre}</td>
                    <td style={{ padding: '5px 8px', textAlign: 'center', fontWeight: 700, color: '#7c3aed' }}>{parseFloat(p.Factor)}</td>
                    <td style={{ padding: '5px 8px', textAlign: 'center', fontSize: 10, color: '#6b7280' }}>
                      1 {p.Nombre} = {parseFloat(p.Factor)} {unidadBase}
                    </td>
                    <td style={{ padding: '5px 8px', textAlign: 'right', fontWeight: 600, color: '#16a34a' }}>{fmtMon(parseFloat(p.Precio_Venta) || 0)}</td>
                    <td style={{ padding: '5px 8px', fontSize: 11, color: '#6b7280' }}>{p.Codigo_Barras || '-'}</td>
                    <td style={{ padding: '3px 4px', display: 'flex', gap: 2 }}>
                      <button title="Editar" onClick={() => setEditando(p.Id_Presentacion)}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 13 }}>✏️</button>
                      <button title="Eliminar" onClick={() => eliminar(p.Id_Presentacion)}
                        style={{ background: 'none', border: 'none', cursor: 'pointer' }}><Trash2 size={14} color="#dc2626" /></button>
                    </td>
                  </>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {presentaciones.filter(p => p.Activa).length === 0 && (
        <div style={{ padding: 16, textAlign: 'center', color: '#9ca3af', fontSize: 13, background: '#f9fafb', borderRadius: 8, marginBottom: 12 }}>
          Sin presentaciones. Este producto se vende solo en {unidadBase}.
        </div>
      )}

      {/* Agregar nueva */}
      <div style={{ border: '1px solid #e5e7eb', borderRadius: 8, padding: 10 }}>
        <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 8, color: '#374151' }}>Agregar presentación</div>
        <div style={{ display: 'flex', gap: 6, alignItems: 'flex-end' }}>
          <div style={{ flex: 1 }}>
            <label style={{ fontSize: 9, color: '#6b7280', display: 'block', marginBottom: 2 }}>NOMBRE</label>
            <input type="text" value={nombre} onChange={e => setNombre(e.target.value)} placeholder="Ej: Bulto x 50kg"
              style={{ width: '100%', height: 28, border: '1px solid #d1d5db', borderRadius: 6, fontSize: 12, padding: '0 8px', boxSizing: 'border-box' }} />
          </div>
          <div style={{ width: 70 }}>
            <label style={{ fontSize: 9, color: '#6b7280', display: 'block', marginBottom: 2 }}>FACTOR</label>
            <input type="text" value={factor} onChange={e => setFactor(e.target.value.replace(/[^0-9.]/g, ''))} placeholder="50"
              style={{ width: '100%', height: 28, textAlign: 'center', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 12, boxSizing: 'border-box' }} />
          </div>
          <div style={{ width: 90 }}>
            <label style={{ fontSize: 9, color: '#6b7280', display: 'block', marginBottom: 2 }}>PRECIO</label>
            <input type="text" value={precio} onChange={e => setPrecio(e.target.value.replace(/[^0-9]/g, ''))} placeholder="$ 0"
              style={{ width: '100%', height: 28, textAlign: 'right', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 12, padding: '0 6px', boxSizing: 'border-box' }} />
          </div>
          <div style={{ width: 90 }}>
            <label style={{ fontSize: 9, color: '#6b7280', display: 'block', marginBottom: 2 }}>CÓD. BARRAS</label>
            <input type="text" value={codigoBarras} onChange={e => setCodigoBarras(e.target.value)} placeholder="Opcional"
              style={{ width: '100%', height: 28, border: '1px solid #d1d5db', borderRadius: 6, fontSize: 11, padding: '0 6px', boxSizing: 'border-box' }} />
          </div>
          <button onClick={crear}
            style={{ height: 28, padding: '0 12px', background: '#7c3aed', color: '#fff', border: 'none', borderRadius: 6, fontSize: 11, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, whiteSpace: 'nowrap' }}>
            <Plus size={13} /> Agregar
          </button>
        </div>
        {factor && parseFloat(factor) > 0 && (
          <div style={{ fontSize: 11, color: '#6b7280', marginTop: 4 }}>
            1 {nombre || 'presentación'} = <b style={{ color: '#7c3aed' }}>{factor}</b> {unidadBase}(s)
            {producto?.Existencia && ` → Stock: ${(parseFloat(producto.Existencia) / parseFloat(factor)).toFixed(1)} ${nombre || 'presentación'}(es)`}
          </div>
        )}
      </div>
    </div>
  );
}
