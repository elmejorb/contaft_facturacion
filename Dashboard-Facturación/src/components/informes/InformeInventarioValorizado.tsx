import { useState, useEffect } from 'react';
import { InformeLayout, fmt, fmtCant } from './InformeLayout';

const API = 'http://localhost:80/conta-app-backend/api/informes/resumen.php';

export function InformeInventarioValorizado() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [busqueda, setBusqueda] = useState('');
  const [orden, setOrden] = useState<'nombre' | 'valor'>('valor');

  const cargar = async () => {
    setLoading(true);
    try {
      const r = await fetch(`${API}?tipo=inventario_valorizado`);
      const d = await r.json();
      if (d.success) setData(d);
    } catch (e) { /* ignored */ }
    setLoading(false);
  };

  useEffect(() => { cargar(); }, []);

  let items = (data?.items || []).slice();
  if (busqueda) {
    const b = busqueda.toLowerCase();
    items = items.filter((i: any) =>
      i.Nombres_Articulo?.toLowerCase().includes(b) ||
      i.Codigo?.toLowerCase().includes(b) ||
      i.categoria?.toLowerCase().includes(b));
  }
  if (orden === 'valor') items.sort((a: any, b: any) => parseFloat(b.valor_costo) - parseFloat(a.valor_costo));
  else items.sort((a: any, b: any) => (a.Nombres_Articulo || '').localeCompare(b.Nombres_Articulo || ''));

  const r = data?.resumen || {};
  const totalCostoFiltrado = items.reduce((s: number, i: any) => s + parseFloat(i.valor_costo), 0);

  return (
    <InformeLayout
      titulo="Inventario Valorizado"
      subtitulo={`Cierre al ${new Date().toLocaleDateString('es-CO', { day: '2-digit', month: 'long', year: 'numeric' })}`}
      onRefresh={cargar} loading={loading}
      filtros={
        <>
          <label style={{ fontSize: 12, fontWeight: 600 }}>Buscar:</label>
          <input type="text" value={busqueda} onChange={e => setBusqueda(e.target.value)}
            placeholder="Producto, código o categoría..."
            style={{ ...inp, width: 240 }} />
          <label style={{ fontSize: 12, fontWeight: 600 }}>Ordenar:</label>
          <select value={orden} onChange={e => setOrden(e.target.value as any)} style={inp}>
            <option value="valor">Mayor valor primero</option>
            <option value="nombre">Nombre A-Z</option>
          </select>
        </>
      }>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, marginBottom: 12 }}>
        {[
          { lbl: 'Productos', val: String(r.productos || 0), color: '#7c3aed' },
          { lbl: 'Unidades Total', val: fmtCant(r.unidades_total || 0), color: '#2563eb' },
          { lbl: 'Valor a Costo', val: fmt(r.valor_costo || 0), color: '#dc2626' },
          { lbl: 'Valor a Precio Venta', val: fmt(r.valor_venta || 0), color: '#16a34a' },
        ].map((s, i) => (
          <div key={i} style={{ padding: 8, border: '1px solid #e5e7eb', borderRadius: 6, textAlign: 'center' }}>
            <div style={{ fontSize: 10, color: '#6b7280' }}>{s.lbl}</div>
            <div style={{ fontSize: 13, fontWeight: 700, color: s.color, fontFamily: 'monospace' }}>{s.val}</div>
          </div>
        ))}
      </div>
      <div style={{ marginBottom: 12, padding: 8, background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 6, fontSize: 12 }}>
        <b>Utilidad potencial</b> (al vender todo el inventario): <span style={{ fontFamily: 'monospace', fontWeight: 700, color: '#16a34a' }}>{fmt(r.utilidad_potencial || 0)}</span>
        {r.valor_costo > 0 && <span style={{ marginLeft: 12, color: '#6b7280' }}>· Margen sobre costo: <b>{((r.utilidad_potencial / r.valor_costo) * 100).toFixed(1)}%</b></span>}
      </div>

      {items.length === 0 ? <div style={{ padding: 30, textAlign: 'center', color: '#999' }}>Sin productos con existencia</div> : (
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
          <thead>
            <tr>
              <th style={th}>Código</th>
              <th style={th}>Producto</th>
              <th style={th}>Categoría</th>
              <th style={{ ...th, textAlign: 'right' }}>Existencia</th>
              <th style={{ ...th, textAlign: 'right' }}>Costo Unit.</th>
              <th style={{ ...th, textAlign: 'right' }}>Valor Costo</th>
              <th style={{ ...th, textAlign: 'right' }}>Precio Venta</th>
              <th style={{ ...th, textAlign: 'right' }}>Valor Venta</th>
              <th style={{ ...th, textAlign: 'right' }}>Utilidad</th>
            </tr>
          </thead>
          <tbody>
            {items.map((it: any) => (
              <tr key={it.Items}>
                <td style={{ ...td, color: '#7c3aed', fontWeight: 600 }}>{it.Codigo}</td>
                <td style={td}>{it.Nombres_Articulo}</td>
                <td style={{ ...td, fontSize: 10, color: '#6b7280' }}>{it.categoria}</td>
                <td style={tdNum}>{fmtCant(parseFloat(it.Existencia))}</td>
                <td style={tdNum}>{fmt(parseFloat(it.Precio_Costo))}</td>
                <td style={{ ...tdNum, fontWeight: 600 }}>{fmt(parseFloat(it.valor_costo))}</td>
                <td style={tdNum}>{fmt(parseFloat(it.Precio_Venta))}</td>
                <td style={{ ...tdNum, fontWeight: 600, color: '#16a34a' }}>{fmt(parseFloat(it.valor_venta))}</td>
                <td style={{ ...tdNum, color: parseFloat(it.utilidad_potencial) >= 0 ? '#16a34a' : '#dc2626' }}>{fmt(parseFloat(it.utilidad_potencial))}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr style={{ borderTop: '2px solid #000', fontWeight: 700, background: '#f9fafb' }}>
              <td colSpan={5} style={{ padding: '8px' }}>{items.length} producto(s){busqueda ? ' (filtrado)' : ''}</td>
              <td style={{ ...tdNum, fontWeight: 700, fontSize: 13 }}>{fmt(totalCostoFiltrado)}</td>
              <td colSpan={3}></td>
            </tr>
          </tfoot>
        </table>
      )}
    </InformeLayout>
  );
}

const inp: React.CSSProperties = { height: 30, border: '1px solid #d1d5db', borderRadius: 6, padding: '0 8px', fontSize: 13 };
const th: React.CSSProperties = { textAlign: 'left', padding: '6px 8px', borderBottom: '2px solid #000', background: '#f3f4f6', fontWeight: 700, fontSize: 11 };
const td: React.CSSProperties = { padding: '4px 8px', borderBottom: '1px solid #f3f4f6' };
const tdNum: React.CSSProperties = { padding: '4px 8px', borderBottom: '1px solid #f3f4f6', textAlign: 'right', fontFamily: 'monospace' };
