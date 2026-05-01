import { useState, useEffect } from 'react';
import { InformeLayout, fmt, fmtCant } from './InformeLayout';
import { hoyLocal, inicioMesLocal } from '../../utils/fecha';

const API = 'http://localhost:80/conta-app-backend/api/informes/resumen.php';

export function InformeVentasPorCategoria() {
  const [desde, setDesde] = useState(inicioMesLocal());
  const [hasta, setHasta] = useState(hoyLocal());
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const cargar = async () => {
    setLoading(true);
    try {
      const r = await fetch(`${API}?tipo=ventas_por_categoria&desde=${desde}&hasta=${hasta}`);
      const d = await r.json();
      if (d.success) setData(d);
    } catch (e) { /* ignored */ }
    setLoading(false);
  };

  useEffect(() => { cargar(); }, []);

  const cats = data?.categorias || [];
  const total = data?.total_general || 0;
  const fmtFechaTit = (f: string) => new Date(f + 'T00:00').toLocaleDateString('es-CO', { day: '2-digit', month: 'long', year: 'numeric' });
  const maxMonto = Math.max(...cats.map((c: any) => parseFloat(c.monto_ventas) || 0), 1);

  return (
    <InformeLayout
      titulo="Ventas por Categoría"
      subtitulo={`Período: ${fmtFechaTit(desde)} al ${fmtFechaTit(hasta)}`}
      onRefresh={cargar} loading={loading}
      filtros={
        <>
          <label style={{ fontSize: 12, fontWeight: 600 }}>Desde:</label>
          <input type="date" value={desde} onChange={e => setDesde(e.target.value)} style={inp} />
          <label style={{ fontSize: 12, fontWeight: 600 }}>Hasta:</label>
          <input type="date" value={hasta} onChange={e => setHasta(e.target.value)} style={inp} />
        </>
      }>
      {cats.length === 0 ? <div style={{ padding: 30, textAlign: 'center', color: '#999' }}>Sin ventas en el período</div> : (
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
          <thead>
            <tr>
              <th style={th}>Categoría</th>
              <th style={{ ...th, textAlign: 'center' }}>Productos</th>
              <th style={{ ...th, textAlign: 'center' }}>Facturas</th>
              <th style={{ ...th, textAlign: 'right' }}>Unidades</th>
              <th style={{ ...th, textAlign: 'right' }}>Monto Ventas</th>
              <th style={th}>Participación</th>
              <th style={{ ...th, textAlign: 'right' }}>Costo</th>
              <th style={{ ...th, textAlign: 'right' }}>Utilidad</th>
              <th style={{ ...th, textAlign: 'right' }}>Margen %</th>
            </tr>
          </thead>
          <tbody>
            {cats.map((c: any, i: number) => {
              const pct = total > 0 ? (parseFloat(c.monto_ventas) / total * 100) : 0;
              const margen = parseFloat(c.monto_ventas) > 0 ? (parseFloat(c.utilidad) / parseFloat(c.monto_ventas) * 100) : 0;
              return (
                <tr key={i}>
                  <td style={{ ...td, fontWeight: 600 }}>{c.categoria}</td>
                  <td style={{ ...td, textAlign: 'center' }}>{c.num_productos}</td>
                  <td style={{ ...td, textAlign: 'center' }}>{c.num_facturas}</td>
                  <td style={tdNum}>{fmtCant(parseFloat(c.unidades))}</td>
                  <td style={{ ...tdNum, fontWeight: 600 }}>{fmt(parseFloat(c.monto_ventas))}</td>
                  <td style={td}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <div style={{ flex: 1, height: 8, background: '#f3f4f6', borderRadius: 4, overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${(parseFloat(c.monto_ventas) / maxMonto) * 100}%`, background: '#7c3aed' }} />
                      </div>
                      <span style={{ fontSize: 10, fontFamily: 'monospace', minWidth: 40, textAlign: 'right' }}>{pct.toFixed(1)}%</span>
                    </div>
                  </td>
                  <td style={{ ...tdNum, color: '#666' }}>{fmt(parseFloat(c.costo))}</td>
                  <td style={{ ...tdNum, fontWeight: 600, color: parseFloat(c.utilidad) >= 0 ? '#16a34a' : '#dc2626' }}>{fmt(parseFloat(c.utilidad))}</td>
                  <td style={tdNum}>{margen.toFixed(1)}%</td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr style={{ borderTop: '2px solid #000', fontWeight: 700, background: '#f9fafb' }}>
              <td colSpan={4} style={{ padding: '8px' }}>{cats.length} categoría(s)</td>
              <td style={{ ...tdNum, fontWeight: 700, fontSize: 13, color: '#7c3aed' }}>{fmt(total)}</td>
              <td style={{ padding: '8px' }}>100%</td>
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
