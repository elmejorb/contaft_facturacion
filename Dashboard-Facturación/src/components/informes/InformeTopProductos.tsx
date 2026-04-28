import { useState, useEffect } from 'react';
import { InformeLayout, fmt, fmtCant } from './InformeLayout';

const API = 'http://localhost:80/conta-app-backend/api/informes/resumen.php';

export function InformeTopProductos() {
  const [desde, setDesde] = useState(new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]);
  const [hasta, setHasta] = useState(new Date().toISOString().split('T')[0]);
  const [limite, setLimite] = useState(30);
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const cargar = async () => {
    setLoading(true);
    try {
      const r = await fetch(`${API}?tipo=top_productos&desde=${desde}&hasta=${hasta}&limite=${limite}`);
      const d = await r.json();
      if (d.success) setData(d);
    } catch (e) { /* ignored */ }
    setLoading(false);
  };

  useEffect(() => { cargar(); }, []);

  const productos = data?.productos || [];
  const totalMonto = productos.reduce((s: number, p: any) => s + parseFloat(p.monto_ventas), 0);
  const totalUtilidad = productos.reduce((s: number, p: any) => s + parseFloat(p.utilidad), 0);
  const totalCant = productos.reduce((s: number, p: any) => s + parseFloat(p.cant_total), 0);

  const fmtFecha = (f: string) => new Date(f + 'T00:00').toLocaleDateString('es-CO', { day: '2-digit', month: 'long', year: 'numeric' });

  return (
    <InformeLayout
      titulo="Artículos Más Vendidos"
      subtitulo={`Período: ${fmtFecha(desde)} al ${fmtFecha(hasta)} · Top ${limite}`}
      onRefresh={cargar} loading={loading}
      filtros={
        <>
          <label style={{ fontSize: 12, color: '#374151', fontWeight: 600 }}>Desde:</label>
          <input type="date" value={desde} onChange={e => setDesde(e.target.value)}
            style={{ height: 30, border: '1px solid #d1d5db', borderRadius: 6, padding: '0 8px', fontSize: 13 }} />
          <label style={{ fontSize: 12, color: '#374151', fontWeight: 600 }}>Hasta:</label>
          <input type="date" value={hasta} onChange={e => setHasta(e.target.value)}
            style={{ height: 30, border: '1px solid #d1d5db', borderRadius: 6, padding: '0 8px', fontSize: 13 }} />
          <label style={{ fontSize: 12, color: '#374151', fontWeight: 600 }}>Top:</label>
          <select value={limite} onChange={e => setLimite(parseInt(e.target.value))}
            style={{ height: 30, border: '1px solid #d1d5db', borderRadius: 6, padding: '0 8px', fontSize: 13 }}>
            {[10, 20, 30, 50, 100].map(n => <option key={n} value={n}>{n}</option>)}
          </select>
        </>
      }>
      {productos.length === 0 ? <div style={{ padding: 30, textAlign: 'center', color: '#999' }}>Sin datos en el rango seleccionado</div> : (
        <>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
            <thead>
              <tr>
                <th style={{ ...th, width: 30 }}>#</th>
                <th style={{ ...th, width: 80 }}>Código</th>
                <th style={th}>Producto</th>
                <th style={{ ...th, textAlign: 'right' }}>Cantidad</th>
                <th style={{ ...th, textAlign: 'right' }}>Facturas</th>
                <th style={{ ...th, textAlign: 'right' }}>Monto Ventas</th>
                <th style={{ ...th, textAlign: 'right' }}>Costo</th>
                <th style={{ ...th, textAlign: 'right' }}>Utilidad</th>
                <th style={{ ...th, textAlign: 'right' }}>%</th>
              </tr>
            </thead>
            <tbody>
              {productos.map((p: any, i: number) => {
                const margen = parseFloat(p.monto_ventas) > 0 ? (parseFloat(p.utilidad) / parseFloat(p.monto_ventas) * 100) : 0;
                return (
                  <tr key={p.Items}>
                    <td style={{ ...td, fontWeight: 700, color: '#7c3aed' }}>{i + 1}</td>
                    <td style={td}>{p.Codigo}</td>
                    <td style={td}>{p.Nombres_Articulo}</td>
                    <td style={{ ...td, textAlign: 'right', fontFamily: 'monospace', fontWeight: 600 }}>{fmtCant(parseFloat(p.cant_total))}</td>
                    <td style={{ ...td, textAlign: 'right', fontFamily: 'monospace' }}>{p.facturas}</td>
                    <td style={{ ...td, textAlign: 'right', fontFamily: 'monospace', fontWeight: 600 }}>{fmt(parseFloat(p.monto_ventas))}</td>
                    <td style={{ ...td, textAlign: 'right', fontFamily: 'monospace', color: '#666' }}>{fmt(parseFloat(p.costo_total))}</td>
                    <td style={{ ...td, textAlign: 'right', fontFamily: 'monospace', fontWeight: 600, color: parseFloat(p.utilidad) >= 0 ? '#16a34a' : '#dc2626' }}>{fmt(parseFloat(p.utilidad))}</td>
                    <td style={{ ...td, textAlign: 'right', fontFamily: 'monospace' }}>{margen.toFixed(1)}%</td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr style={{ borderTop: '2px solid #000', fontWeight: 700 }}>
                <td colSpan={3} style={{ padding: '8px', textTransform: 'uppercase' }}>TOTALES</td>
                <td style={{ padding: '8px', textAlign: 'right', fontFamily: 'monospace' }}>{fmtCant(totalCant)}</td>
                <td style={td}></td>
                <td style={{ padding: '8px', textAlign: 'right', fontFamily: 'monospace' }}>{fmt(totalMonto)}</td>
                <td style={td}></td>
                <td style={{ padding: '8px', textAlign: 'right', fontFamily: 'monospace', color: totalUtilidad >= 0 ? '#16a34a' : '#dc2626' }}>{fmt(totalUtilidad)}</td>
                <td style={{ padding: '8px', textAlign: 'right', fontFamily: 'monospace' }}>{totalMonto > 0 ? (totalUtilidad / totalMonto * 100).toFixed(1) : '0.0'}%</td>
              </tr>
            </tfoot>
          </table>
        </>
      )}
    </InformeLayout>
  );
}

const th: React.CSSProperties = { textAlign: 'left', padding: '6px 8px', borderBottom: '2px solid #000', background: '#f3f4f6', fontWeight: 700, fontSize: 11 };
const td: React.CSSProperties = { padding: '5px 8px', borderBottom: '1px solid #e5e7eb' };
