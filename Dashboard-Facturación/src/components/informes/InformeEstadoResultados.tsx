import { useState, useEffect } from 'react';
import { InformeLayout, fmt } from './InformeLayout';

const API = 'http://localhost:80/conta-app-backend/api/informes/resumen.php';

export function InformeEstadoResultados() {
  const [desde, setDesde] = useState(new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]);
  const [hasta, setHasta] = useState(new Date().toISOString().split('T')[0]);
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const cargar = async () => {
    setLoading(true);
    try {
      const r = await fetch(`${API}?tipo=estado_resultados&desde=${desde}&hasta=${hasta}`);
      const d = await r.json();
      if (d.success) setData(d);
    } catch (e) { /* ignored */ }
    setLoading(false);
  };

  useEffect(() => { cargar(); }, []);

  const fmtFecha = (f: string) => new Date(f + 'T00:00').toLocaleDateString('es-CO', { day: '2-digit', month: 'long', year: 'numeric' });

  return (
    <InformeLayout
      titulo="Estado de Resultados"
      subtitulo={`Período: ${fmtFecha(desde)} al ${fmtFecha(hasta)}`}
      onRefresh={cargar} loading={loading}
      filtros={
        <>
          <label style={{ fontSize: 12, fontWeight: 600 }}>Desde:</label>
          <input type="date" value={desde} onChange={e => setDesde(e.target.value)}
            style={{ height: 30, border: '1px solid #d1d5db', borderRadius: 6, padding: '0 8px', fontSize: 13 }} />
          <label style={{ fontSize: 12, fontWeight: 600 }}>Hasta:</label>
          <input type="date" value={hasta} onChange={e => setHasta(e.target.value)}
            style={{ height: 30, border: '1px solid #d1d5db', borderRadius: 6, padding: '0 8px', fontSize: 13 }} />
        </>
      }>
      {!data ? <div style={{ padding: 30, textAlign: 'center', color: '#999' }}>Cargando...</div> : (
        <>
          <table style={tableStyle}>
            <tbody>
              <tr><td style={td}><b>Ventas brutas</b> ({data.num_ventas || 0} facturas)</td><td style={tdNum}>{fmt(data.ventas)}</td></tr>
              <tr><td style={td}>(-) Costo de ventas</td><td style={{ ...tdNum, color: '#dc2626' }}>-{fmt(data.costo_ventas)}</td></tr>
              <tr style={{ background: '#dcfce7', borderTop: '1px solid #16a34a', borderBottom: '1px solid #16a34a' }}>
                <td style={tdSub}>= UTILIDAD BRUTA</td>
                <td style={{ ...tdNum, fontWeight: 700, color: '#16a34a' }}>{fmt(data.utilidad_bruta)}</td>
              </tr>
              <tr><td style={{ ...td, fontStyle: 'italic', color: '#666' }}>Margen bruto</td><td style={{ ...tdNum, color: '#666' }}>{(data.margen_bruto_pct || 0).toFixed(2)}%</td></tr>
            </tbody>
          </table>

          <div style={seccion}>GASTOS POR CATEGORÍA</div>
          {(data.gastos_por_categoria || []).length === 0 ? (
            <div style={{ padding: 20, textAlign: 'center', color: '#999' }}>Sin gastos registrados en el período</div>
          ) : (
            <table style={tableStyle}>
              <tbody>
                {data.gastos_por_categoria.map((g: any, i: number) => (
                  <tr key={i}>
                    <td style={td}>{g.Categoria || 'Sin categoría'}</td>
                    <td style={{ ...tdNum, color: '#dc2626' }}>-{fmt(parseFloat(g.total))}</td>
                  </tr>
                ))}
                <tr style={{ background: '#fef2f2', borderTop: '1px solid #dc2626' }}>
                  <td style={tdSub}>TOTAL GASTOS</td>
                  <td style={{ ...tdNum, fontWeight: 700, color: '#dc2626' }}>-{fmt(data.gastos_total)}</td>
                </tr>
              </tbody>
            </table>
          )}

          <div style={seccion}>RESULTADO FINAL</div>
          <table style={tableStyle}>
            <tbody>
              <tr><td style={td}>Utilidad Bruta</td><td style={tdNum}>{fmt(data.utilidad_bruta)}</td></tr>
              <tr><td style={td}>(-) Total Gastos</td><td style={{ ...tdNum, color: '#dc2626' }}>-{fmt(data.gastos_total)}</td></tr>
              <tr style={{ background: data.utilidad_neta >= 0 ? '#dcfce7' : '#fee2e2', borderTop: '2px solid #000' }}>
                <td style={tdTotal}>UTILIDAD NETA DEL PERÍODO</td>
                <td style={{ ...tdNum, fontWeight: 700, fontSize: 16, color: data.utilidad_neta >= 0 ? '#16a34a' : '#dc2626' }}>{fmt(data.utilidad_neta)}</td>
              </tr>
              <tr><td style={{ ...td, fontStyle: 'italic', color: '#666' }}>Margen neto sobre ventas</td><td style={{ ...tdNum, color: '#666' }}>{(data.margen_neto_pct || 0).toFixed(2)}%</td></tr>
            </tbody>
          </table>
        </>
      )}
    </InformeLayout>
  );
}

const seccion: React.CSSProperties = { fontSize: 12, fontWeight: 700, background: '#e5e7eb', padding: '4px 8px', margin: '14px 0 4px', borderLeft: '4px solid #7c3aed' };
const tableStyle: React.CSSProperties = { width: '100%', borderCollapse: 'collapse', fontSize: 12 };
const td: React.CSSProperties = { padding: '6px 10px', borderBottom: '1px solid #e5e7eb' };
const tdNum: React.CSSProperties = { padding: '6px 10px', borderBottom: '1px solid #e5e7eb', textAlign: 'right', fontFamily: 'monospace' };
const tdSub: React.CSSProperties = { padding: '8px 10px', borderBottom: '1px solid #d1d5db', fontWeight: 700 };
const tdTotal: React.CSSProperties = { padding: '10px', fontWeight: 700, textTransform: 'uppercase' };
