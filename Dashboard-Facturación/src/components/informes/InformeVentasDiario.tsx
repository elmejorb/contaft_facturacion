import { useState, useEffect } from 'react';
import { InformeLayout, fmt } from './InformeLayout';

const API = 'http://localhost:80/conta-app-backend/api/informes/resumen.php';

export function InformeVentasDiario() {
  const [desde, setDesde] = useState(new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]);
  const [hasta, setHasta] = useState(new Date().toISOString().split('T')[0]);
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const cargar = async () => {
    setLoading(true);
    try {
      const r = await fetch(`${API}?tipo=ventas_diario&desde=${desde}&hasta=${hasta}`);
      const d = await r.json();
      if (d.success) setData(d);
    } catch (e) { /* ignored */ }
    setLoading(false);
  };

  useEffect(() => { cargar(); }, []);

  const dias = data?.dias || [];
  const t = data?.totales || {};
  const fmtFecha = (f: string) => {
    const d = new Date(f);
    const dn = ['Dom','Lun','Mar','Mié','Jue','Vie','Sáb'][d.getDay()];
    return `${dn} ${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
  };
  const fmtFechaTit = (f: string) => new Date(f + 'T00:00').toLocaleDateString('es-CO', { day: '2-digit', month: 'long', year: 'numeric' });

  return (
    <InformeLayout
      titulo="Ventas Diarias"
      subtitulo={`Período: ${fmtFechaTit(desde)} al ${fmtFechaTit(hasta)} · Costo y Utilidad`}
      onRefresh={cargar} loading={loading}
      filtros={
        <>
          <label style={{ fontSize: 12, fontWeight: 600 }}>Desde:</label>
          <input type="date" value={desde} onChange={e => setDesde(e.target.value)} style={inp} />
          <label style={{ fontSize: 12, fontWeight: 600 }}>Hasta:</label>
          <input type="date" value={hasta} onChange={e => setHasta(e.target.value)} style={inp} />
        </>
      }>
      {dias.length === 0 ? <div style={{ padding: 30, textAlign: 'center', color: '#999' }}>Sin ventas en el período</div> : (
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
          <thead>
            <tr>
              <th style={th}>Día</th>
              <th style={{ ...th, textAlign: 'center' }}>Facturas</th>
              <th style={{ ...th, textAlign: 'right' }}>Contado</th>
              <th style={{ ...th, textAlign: 'right' }}>Crédito</th>
              <th style={{ ...th, textAlign: 'right' }}>Total Ventas</th>
              <th style={{ ...th, textAlign: 'right' }}>Costo</th>
              <th style={{ ...th, textAlign: 'right' }}>Utilidad</th>
              <th style={{ ...th, textAlign: 'right' }}>Margen %</th>
            </tr>
          </thead>
          <tbody>
            {dias.map((d: any) => {
              const margen = d.total > 0 ? (d.utilidad / d.total * 100) : 0;
              return (
                <tr key={d.dia}>
                  <td style={td}>{fmtFecha(d.dia)}</td>
                  <td style={{ ...td, textAlign: 'center' }}>{d.num_facturas}</td>
                  <td style={tdNum}>{fmt(d.contado)}</td>
                  <td style={tdNum}>{fmt(d.credito)}</td>
                  <td style={{ ...tdNum, fontWeight: 600 }}>{fmt(d.total)}</td>
                  <td style={{ ...tdNum, color: '#666' }}>{fmt(d.costo)}</td>
                  <td style={{ ...tdNum, fontWeight: 600, color: d.utilidad >= 0 ? '#16a34a' : '#dc2626' }}>{fmt(d.utilidad)}</td>
                  <td style={tdNum}>{margen.toFixed(1)}%</td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr style={{ borderTop: '2px solid #000', fontWeight: 700, background: '#dcfce7' }}>
              <td style={{ padding: '8px' }}>{dias.length} día(s)</td>
              <td style={{ ...td, textAlign: 'center', fontWeight: 700 }}>{t.num_facturas || 0}</td>
              <td style={{ ...tdNum, fontWeight: 700 }}>{fmt(t.contado || 0)}</td>
              <td style={{ ...tdNum, fontWeight: 700 }}>{fmt(t.credito || 0)}</td>
              <td style={{ ...tdNum, fontWeight: 700, fontSize: 13 }}>{fmt(t.total || 0)}</td>
              <td style={{ ...tdNum, fontWeight: 700 }}>{fmt(t.costo || 0)}</td>
              <td style={{ ...tdNum, fontWeight: 700, fontSize: 13, color: '#16a34a' }}>{fmt(t.utilidad || 0)}</td>
              <td style={{ ...tdNum, fontWeight: 700 }}>{t.total > 0 ? (t.utilidad / t.total * 100).toFixed(1) : '0.0'}%</td>
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
