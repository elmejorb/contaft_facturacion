import { useState, useEffect } from 'react';
import { InformeLayout, fmt } from './InformeLayout';
import { hoyLocal, inicioMesLocal } from '../../utils/fecha';

const API = 'http://localhost:80/conta-app-backend/api/informes/resumen.php';

export function InformeTopClientes() {
  const [desde, setDesde] = useState(inicioMesLocal());
  const [hasta, setHasta] = useState(hoyLocal());
  const [limite, setLimite] = useState(30);
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const cargar = async () => {
    setLoading(true);
    try {
      const r = await fetch(`${API}?tipo=top_clientes&desde=${desde}&hasta=${hasta}&limite=${limite}`);
      const d = await r.json();
      if (d.success) setData(d);
    } catch (e) { /* ignored */ }
    setLoading(false);
  };

  useEffect(() => { cargar(); }, []);

  const clientes = data?.clientes || [];
  const total = data?.total_general || 0;
  const fmtFecha = (f: string) => f ? new Date(f).toLocaleDateString('es-CO') : '-';
  const fmtFechaTit = (f: string) => new Date(f + 'T00:00').toLocaleDateString('es-CO', { day: '2-digit', month: 'long', year: 'numeric' });

  return (
    <InformeLayout
      titulo="Top Clientes"
      subtitulo={`Período: ${fmtFechaTit(desde)} al ${fmtFechaTit(hasta)} · Top ${limite}`}
      onRefresh={cargar} loading={loading}
      filtros={
        <>
          <label style={{ fontSize: 12, fontWeight: 600 }}>Desde:</label>
          <input type="date" value={desde} onChange={e => setDesde(e.target.value)} style={inp} />
          <label style={{ fontSize: 12, fontWeight: 600 }}>Hasta:</label>
          <input type="date" value={hasta} onChange={e => setHasta(e.target.value)} style={inp} />
          <label style={{ fontSize: 12, fontWeight: 600 }}>Top:</label>
          <select value={limite} onChange={e => setLimite(parseInt(e.target.value))} style={inp}>
            {[10, 20, 30, 50, 100].map(n => <option key={n} value={n}>{n}</option>)}
          </select>
        </>
      }>
      {clientes.length === 0 ? <div style={{ padding: 30, textAlign: 'center', color: '#999' }}>Sin clientes en el período</div> : (
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
          <thead>
            <tr>
              <th style={{ ...th, width: 30 }}>#</th>
              <th style={th}>Código</th>
              <th style={th}>Cliente</th>
              <th style={th}>NIT</th>
              <th style={{ ...th, textAlign: 'center' }}>Facturas</th>
              <th style={{ ...th, textAlign: 'right' }}>Ticket Prom.</th>
              <th style={{ ...th, textAlign: 'right' }}>Monto Total</th>
              <th style={{ ...th, textAlign: 'right' }}>% Total</th>
              <th style={{ ...th, textAlign: 'right' }}>Saldo</th>
              <th style={th}>Última Compra</th>
            </tr>
          </thead>
          <tbody>
            {clientes.map((c: any, i: number) => (
              <tr key={c.CodigoClien}>
                <td style={{ ...td, fontWeight: 700, color: '#7c3aed' }}>{i + 1}</td>
                <td style={td}>{c.CodigoClien}</td>
                <td style={{ ...td, fontWeight: 600 }}>{c.Razon_Social}</td>
                <td style={td}>{c.Nit}</td>
                <td style={{ ...td, textAlign: 'center' }}>{c.num_facturas}</td>
                <td style={tdNum}>{fmt(parseFloat(c.ticket_promedio))}</td>
                <td style={{ ...tdNum, fontWeight: 700, color: '#16a34a' }}>{fmt(parseFloat(c.monto_total))}</td>
                <td style={{ ...tdNum, color: '#6b7280' }}>{total > 0 ? ((parseFloat(c.monto_total) / total) * 100).toFixed(1) : '0'}%</td>
                <td style={{ ...tdNum, color: parseFloat(c.saldo_actual) > 0 ? '#dc2626' : '#9ca3af' }}>{fmt(parseFloat(c.saldo_actual))}</td>
                <td style={td}>{fmtFecha(c.ultima_compra)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr style={{ borderTop: '2px solid #000', fontWeight: 700, background: '#f9fafb' }}>
              <td colSpan={6} style={{ padding: '8px' }}>{clientes.length} clientes</td>
              <td style={{ ...tdNum, fontWeight: 700, fontSize: 13, color: '#16a34a' }}>{fmt(total)}</td>
              <td style={tdNum}>100%</td>
              <td colSpan={2}></td>
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
