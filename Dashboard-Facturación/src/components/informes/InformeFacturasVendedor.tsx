import { useState, useEffect } from 'react';
import { InformeLayout, fmt } from './InformeLayout';
import { hoyLocal, inicioMesLocal } from '../../utils/fecha';

const API = 'http://localhost:80/conta-app-backend/api/informes/resumen.php';

export function InformeFacturasVendedor() {
  const [desde, setDesde] = useState(inicioMesLocal());
  const [hasta, setHasta] = useState(hoyLocal());
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const cargar = async () => {
    setLoading(true);
    try {
      const r = await fetch(`${API}?tipo=facturas_vendedor&desde=${desde}&hasta=${hasta}`);
      const d = await r.json();
      if (d.success) setData(d);
    } catch (e) { /* ignored */ }
    setLoading(false);
  };

  useEffect(() => { cargar(); }, []);

  const vendedores = data?.vendedores || [];
  const total = data?.total_general || 0;
  const fmtFechaTit = (f: string) => new Date(f + 'T00:00').toLocaleDateString('es-CO', { day: '2-digit', month: 'long', year: 'numeric' });
  const maxTotal = Math.max(...vendedores.map((v: any) => parseFloat(v.total) || 0), 1);

  return (
    <InformeLayout
      titulo="Ventas por Vendedor"
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
      {vendedores.length === 0 ? <div style={{ padding: 30, textAlign: 'center', color: '#999' }}>Sin ventas en el período</div> : (
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
          <thead>
            <tr>
              <th style={{ ...th, width: 30 }}>#</th>
              <th style={th}>Vendedor</th>
              <th style={{ ...th, textAlign: 'center' }}>Facturas</th>
              <th style={{ ...th, textAlign: 'right' }}>Ticket Prom.</th>
              <th style={{ ...th, textAlign: 'right' }}>Contado</th>
              <th style={{ ...th, textAlign: 'right' }}>Crédito</th>
              <th style={{ ...th, textAlign: 'right' }}>Total</th>
              <th style={th}>Participación</th>
            </tr>
          </thead>
          <tbody>
            {vendedores.map((v: any, i: number) => {
              const pct = total > 0 ? (parseFloat(v.total) / total * 100) : 0;
              return (
                <tr key={i}>
                  <td style={{ ...td, fontWeight: 700, color: '#7c3aed' }}>{i + 1}</td>
                  <td style={{ ...td, fontWeight: 600 }}>{v.vendedor}</td>
                  <td style={{ ...td, textAlign: 'center' }}>{v.num_facturas}</td>
                  <td style={tdNum}>{fmt(parseFloat(v.ticket_promedio))}</td>
                  <td style={tdNum}>{fmt(parseFloat(v.contado))}</td>
                  <td style={tdNum}>{fmt(parseFloat(v.credito))}</td>
                  <td style={{ ...tdNum, fontWeight: 700, color: '#16a34a' }}>{fmt(parseFloat(v.total))}</td>
                  <td style={td}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <div style={{ flex: 1, height: 8, background: '#f3f4f6', borderRadius: 4, overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${(parseFloat(v.total) / maxTotal) * 100}%`, background: '#16a34a' }} />
                      </div>
                      <span style={{ fontSize: 10, fontFamily: 'monospace', minWidth: 40, textAlign: 'right' }}>{pct.toFixed(1)}%</span>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr style={{ borderTop: '2px solid #000', fontWeight: 700, background: '#f9fafb' }}>
              <td colSpan={6} style={{ padding: '8px' }}>{vendedores.length} vendedor(es)</td>
              <td style={{ ...tdNum, fontWeight: 700, fontSize: 13, color: '#16a34a' }}>{fmt(total)}</td>
              <td style={{ padding: '8px' }}>100%</td>
            </tr>
          </tfoot>
        </table>
      )}
    </InformeLayout>
  );
}

const inp: React.CSSProperties = { height: 30, border: '1px solid #d1d5db', borderRadius: 6, padding: '0 8px', fontSize: 13 };
const th: React.CSSProperties = { textAlign: 'left', padding: '6px 8px', borderBottom: '2px solid #000', background: '#f3f4f6', fontWeight: 700, fontSize: 11 };
const td: React.CSSProperties = { padding: '6px 8px', borderBottom: '1px solid #f3f4f6' };
const tdNum: React.CSSProperties = { padding: '6px 8px', borderBottom: '1px solid #f3f4f6', textAlign: 'right', fontFamily: 'monospace' };
