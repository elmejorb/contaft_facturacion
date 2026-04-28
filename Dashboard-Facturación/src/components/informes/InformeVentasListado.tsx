import { useState, useEffect } from 'react';
import { InformeLayout, fmt } from './InformeLayout';

const API = 'http://localhost:80/conta-app-backend/api/informes/resumen.php';

export function InformeVentasListado() {
  const [desde, setDesde] = useState(new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]);
  const [hasta, setHasta] = useState(new Date().toISOString().split('T')[0]);
  const [estado, setEstado] = useState('Valida');
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const cargar = async () => {
    setLoading(true);
    try {
      const r = await fetch(`${API}?tipo=ventas_listado&desde=${desde}&hasta=${hasta}&estado=${estado}`);
      const d = await r.json();
      if (d.success) setData(d);
    } catch (e) { /* ignored */ }
    setLoading(false);
  };

  useEffect(() => { cargar(); }, []);

  const ventas = data?.ventas || [];
  const r = data?.resumen || {};
  const fmtFecha = (f: string) => f ? new Date(f).toLocaleDateString('es-CO') : '-';
  const fmtFechaTit = (f: string) => new Date(f + 'T00:00').toLocaleDateString('es-CO', { day: '2-digit', month: 'long', year: 'numeric' });

  return (
    <InformeLayout
      titulo="Listado de Ventas"
      subtitulo={`Período: ${fmtFechaTit(desde)} al ${fmtFechaTit(hasta)} · Estado: ${estado}`}
      onRefresh={cargar} loading={loading}
      filtros={
        <>
          <label style={{ fontSize: 12, fontWeight: 600 }}>Desde:</label>
          <input type="date" value={desde} onChange={e => setDesde(e.target.value)} style={inp} />
          <label style={{ fontSize: 12, fontWeight: 600 }}>Hasta:</label>
          <input type="date" value={hasta} onChange={e => setHasta(e.target.value)} style={inp} />
          <label style={{ fontSize: 12, fontWeight: 600 }}>Estado:</label>
          <select value={estado} onChange={e => setEstado(e.target.value)} style={inp}>
            <option value="Valida">Solo válidas</option>
            <option value="Anulada">Solo anuladas</option>
            <option value="todos">Todas</option>
          </select>
        </>
      }>
      {/* Resumen */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, marginBottom: 12 }}>
        {[
          { lbl: 'Total Vendido', val: fmt(r.total_general || 0), color: '#7c3aed' },
          { lbl: 'Contado', val: fmt(r.contado || 0), color: '#16a34a' },
          { lbl: 'Crédito', val: fmt(r.credito || 0), color: '#d97706' },
          { lbl: 'Saldo Pendiente', val: fmt(r.saldo_pendiente || 0), color: '#dc2626' },
        ].map((s, i) => (
          <div key={i} style={{ padding: 8, border: '1px solid #e5e7eb', borderRadius: 6, textAlign: 'center' }}>
            <div style={{ fontSize: 10, color: '#6b7280' }}>{s.lbl}</div>
            <div style={{ fontSize: 13, fontWeight: 700, color: s.color, fontFamily: 'monospace' }}>{s.val}</div>
          </div>
        ))}
      </div>

      {ventas.length === 0 ? <div style={{ padding: 30, textAlign: 'center', color: '#999' }}>Sin ventas en el período</div> : (
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
          <thead>
            <tr>
              <th style={th}>Factura</th>
              <th style={th}>Fecha</th>
              <th style={th}>Cliente</th>
              <th style={th}>NIT</th>
              <th style={th}>Tipo</th>
              <th style={th}>Medio Pago</th>
              <th style={{ ...th, textAlign: 'right' }}>Total</th>
              <th style={{ ...th, textAlign: 'right' }}>Saldo</th>
              <th style={{ ...th, textAlign: 'center' }}>Estado</th>
            </tr>
          </thead>
          <tbody>
            {ventas.map((v: any) => (
              <tr key={v.Factura_N} style={{ background: v.EstadoFact === 'Anulada' ? '#fef2f2' : undefined }}>
                <td style={{ ...td, color: '#7c3aed', fontWeight: 600 }}>{v.Factura_N}</td>
                <td style={td}>{fmtFecha(v.Fecha)}</td>
                <td style={td}>{v.cliente}</td>
                <td style={td}>{v.nit}</td>
                <td style={td}>{v.Tipo}</td>
                <td style={td}>{v.medio_pago}</td>
                <td style={tdNum}>{fmt(parseFloat(v.Total))}</td>
                <td style={{ ...tdNum, color: parseFloat(v.Saldo) > 0 ? '#dc2626' : '#16a34a' }}>{fmt(parseFloat(v.Saldo))}</td>
                <td style={{ ...td, textAlign: 'center', fontSize: 10, fontWeight: 600, color: v.EstadoFact === 'Anulada' ? '#dc2626' : '#16a34a' }}>{v.EstadoFact}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr style={{ borderTop: '2px solid #000', fontWeight: 700, background: '#f9fafb' }}>
              <td colSpan={6} style={{ padding: '8px' }}>{ventas.length} ventas</td>
              <td style={{ ...tdNum, fontWeight: 700, fontSize: 13 }}>{fmt(r.total_general || 0)}</td>
              <td style={{ ...tdNum, fontWeight: 700 }}>{fmt(r.saldo_pendiente || 0)}</td>
              <td></td>
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
