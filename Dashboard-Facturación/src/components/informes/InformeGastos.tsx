import { useState, useEffect } from 'react';
import { InformeLayout, fmt } from './InformeLayout';

const API = 'http://localhost:80/conta-app-backend/api/informes/resumen.php';

export function InformeGastos() {
  const [desde, setDesde] = useState(new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]);
  const [hasta, setHasta] = useState(new Date().toISOString().split('T')[0]);
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const cargar = async () => {
    setLoading(true);
    try {
      const r = await fetch(`${API}?tipo=gastos_listado&desde=${desde}&hasta=${hasta}`);
      const d = await r.json();
      if (d.success) setData(d);
    } catch (e) { /* ignored */ }
    setLoading(false);
  };

  useEffect(() => { cargar(); }, []);

  const gastos = data?.gastos || [];
  const porCat = data?.por_categoria || [];
  const total = data?.total_general || 0;
  const fmtFecha = (f: string) => f ? new Date(f).toLocaleDateString('es-CO') : '-';
  const fmtFechaTit = (f: string) => new Date(f + 'T00:00').toLocaleDateString('es-CO', { day: '2-digit', month: 'long', year: 'numeric' });

  return (
    <InformeLayout
      titulo="Gastos del Período"
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
      {/* Resumen por categoría */}
      <div style={{ fontSize: 12, fontWeight: 700, background: '#e5e7eb', padding: '4px 8px', margin: '0 0 8px', borderLeft: '4px solid #dc2626' }}>RESUMEN POR CATEGORÍA</div>
      {porCat.length === 0 ? <div style={{ padding: 20, textAlign: 'center', color: '#999' }}>Sin gastos en el período</div> : (
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12, marginBottom: 18 }}>
          <thead>
            <tr>
              <th style={th}>Categoría</th>
              <th style={{ ...th, textAlign: 'center' }}>Cantidad</th>
              <th style={{ ...th, textAlign: 'right' }}>Total</th>
              <th style={{ ...th, textAlign: 'right' }}>%</th>
            </tr>
          </thead>
          <tbody>
            {porCat.map((c: any, i: number) => (
              <tr key={i}>
                <td style={td}>{c.categoria}</td>
                <td style={{ ...td, textAlign: 'center' }}>{c.cantidad}</td>
                <td style={tdNum}>{fmt(parseFloat(c.total))}</td>
                <td style={{ ...tdNum, color: '#6b7280' }}>{total > 0 ? ((parseFloat(c.total) / total) * 100).toFixed(1) : '0'}%</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr style={{ borderTop: '2px solid #000', fontWeight: 700, background: '#fef2f2' }}>
              <td style={{ padding: '8px' }}>TOTAL GASTOS</td>
              <td style={{ ...td, textAlign: 'center', fontWeight: 700 }}>{gastos.length}</td>
              <td style={{ ...tdNum, fontWeight: 700, fontSize: 14, color: '#dc2626' }}>{fmt(total)}</td>
              <td style={{ ...tdNum, fontWeight: 700 }}>100%</td>
            </tr>
          </tfoot>
        </table>
      )}

      {/* Detalle */}
      <div style={{ fontSize: 12, fontWeight: 700, background: '#e5e7eb', padding: '4px 8px', margin: '0 0 8px', borderLeft: '4px solid #7c3aed' }}>DETALLE DE GASTOS ({gastos.length})</div>
      {gastos.length > 0 && (
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
          <thead>
            <tr>
              <th style={th}>Comp.</th>
              <th style={th}>Fecha</th>
              <th style={th}>Categoría</th>
              <th style={th}>Concepto</th>
              <th style={{ ...th, textAlign: 'right' }}>Valor</th>
            </tr>
          </thead>
          <tbody>
            {gastos.map((g: any) => (
              <tr key={g.Id_Egresos}>
                <td style={{ ...td, color: '#7c3aed', fontWeight: 600 }}>{g.N_Comprobante}</td>
                <td style={td}>{fmtFecha(g.Fecha)}</td>
                <td style={{ ...td, fontSize: 10 }}>{g.categoria}</td>
                <td style={td}>{g.Concepto}</td>
                <td style={{ ...tdNum, color: '#dc2626' }}>{fmt(parseFloat(g.Valor))}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </InformeLayout>
  );
}

const inp: React.CSSProperties = { height: 30, border: '1px solid #d1d5db', borderRadius: 6, padding: '0 8px', fontSize: 13 };
const th: React.CSSProperties = { textAlign: 'left', padding: '6px 8px', borderBottom: '2px solid #000', background: '#f3f4f6', fontWeight: 700, fontSize: 11 };
const td: React.CSSProperties = { padding: '4px 8px', borderBottom: '1px solid #f3f4f6' };
const tdNum: React.CSSProperties = { padding: '4px 8px', borderBottom: '1px solid #f3f4f6', textAlign: 'right', fontFamily: 'monospace' };
