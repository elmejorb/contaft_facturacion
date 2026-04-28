import { useState, useEffect } from 'react';
import { InformeLayout, fmt, fmtCant } from './InformeLayout';

const API = 'http://localhost:80/conta-app-backend/api/informes/resumen.php';

export function InformeProductosAgotados() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [filtro, setFiltro] = useState<'todos' | 'agotado' | 'bajo_minimo'>('todos');

  const cargar = async () => {
    setLoading(true);
    try {
      const r = await fetch(`${API}?tipo=productos_agotados`);
      const d = await r.json();
      if (d.success) setData(d);
    } catch (e) { /* ignored */ }
    setLoading(false);
  };

  useEffect(() => { cargar(); }, []);

  let items = data?.items || [];
  if (filtro !== 'todos') items = items.filter((i: any) => i.estado === filtro);
  const r = data?.resumen || {};

  return (
    <InformeLayout
      titulo="Productos Agotados / Stock Bajo"
      subtitulo={`Cierre al ${new Date().toLocaleDateString('es-CO', { day: '2-digit', month: 'long', year: 'numeric' })}`}
      onRefresh={cargar} loading={loading}
      filtros={
        <>
          <label style={{ fontSize: 12, fontWeight: 600 }}>Filtro:</label>
          {[
            { id: 'todos' as const, label: `Todos (${r.total || 0})` },
            { id: 'agotado' as const, label: `Agotados (${r.agotados || 0})` },
            { id: 'bajo_minimo' as const, label: `Bajo mínimo (${r.bajo_minimo || 0})` },
          ].map(f => (
            <button key={f.id} onClick={() => setFiltro(f.id)}
              style={{ height: 28, padding: '0 10px', fontSize: 12, borderRadius: 6, cursor: 'pointer',
                border: filtro === f.id ? '1px solid #7c3aed' : '1px solid #e5e7eb',
                background: filtro === f.id ? '#f3e8ff' : '#fff',
                color: filtro === f.id ? '#7c3aed' : '#374151',
                fontWeight: filtro === f.id ? 600 : 400 }}>{f.label}</button>
          ))}
        </>
      }>
      {items.length === 0 ? <div style={{ padding: 30, textAlign: 'center', color: '#16a34a', fontSize: 13 }}>✓ No hay productos en este estado</div> : (
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
          <thead>
            <tr>
              <th style={th}>Código</th>
              <th style={th}>Producto</th>
              <th style={th}>Categoría</th>
              <th style={th}>Proveedor</th>
              <th style={{ ...th, textAlign: 'right' }}>Existencia</th>
              <th style={{ ...th, textAlign: 'right' }}>Mínimo</th>
              <th style={{ ...th, textAlign: 'right' }}>Faltante</th>
              <th style={{ ...th, textAlign: 'right' }}>Costo Unit.</th>
              <th style={{ ...th, textAlign: 'center' }}>Estado</th>
            </tr>
          </thead>
          <tbody>
            {items.map((it: any) => {
              const exist = parseFloat(it.Existencia);
              const min = parseFloat(it.minimo);
              const faltante = Math.max(min - exist, exist <= 0 ? 1 : 0);
              const colorEstado = it.estado === 'agotado' ? '#dc2626' : '#d97706';
              const labelEstado = it.estado === 'agotado' ? 'AGOTADO' : 'BAJO MÍN';
              return (
                <tr key={it.Items} style={{ background: it.estado === 'agotado' ? '#fef2f2' : undefined }}>
                  <td style={{ ...td, color: '#7c3aed', fontWeight: 600 }}>{it.Codigo}</td>
                  <td style={td}>{it.Nombres_Articulo}</td>
                  <td style={{ ...td, fontSize: 10, color: '#6b7280' }}>{it.categoria}</td>
                  <td style={{ ...td, fontSize: 10, color: '#6b7280' }}>{it.proveedor}</td>
                  <td style={{ ...tdNum, color: exist <= 0 ? '#dc2626' : '#d97706', fontWeight: 700 }}>{fmtCant(exist)}</td>
                  <td style={tdNum}>{min > 0 ? fmtCant(min) : '-'}</td>
                  <td style={{ ...tdNum, color: '#dc2626', fontWeight: 600 }}>{faltante > 0 ? fmtCant(faltante) : '-'}</td>
                  <td style={tdNum}>{fmt(parseFloat(it.Precio_Costo))}</td>
                  <td style={{ ...td, textAlign: 'center', fontSize: 10, fontWeight: 700, color: colorEstado }}>{labelEstado}</td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr style={{ borderTop: '2px solid #000', fontWeight: 700, background: '#f9fafb' }}>
              <td colSpan={9} style={{ padding: '8px' }}>{items.length} producto(s) requiere(n) atención</td>
            </tr>
          </tfoot>
        </table>
      )}
    </InformeLayout>
  );
}

const th: React.CSSProperties = { textAlign: 'left', padding: '6px 8px', borderBottom: '2px solid #000', background: '#f3f4f6', fontWeight: 700, fontSize: 11 };
const td: React.CSSProperties = { padding: '4px 8px', borderBottom: '1px solid #f3f4f6' };
const tdNum: React.CSSProperties = { padding: '4px 8px', borderBottom: '1px solid #f3f4f6', textAlign: 'right', fontFamily: 'monospace' };
