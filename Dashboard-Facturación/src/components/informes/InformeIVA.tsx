import { useState, useEffect } from 'react';
import { InformeLayout, fmt } from './InformeLayout';

const API = 'http://localhost:80/conta-app-backend/api/informes/resumen.php';

export function InformeIVA() {
  const [desde, setDesde] = useState(new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]);
  const [hasta, setHasta] = useState(new Date().toISOString().split('T')[0]);
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const cargar = async () => {
    setLoading(true);
    try {
      const r = await fetch(`${API}?tipo=iva&desde=${desde}&hasta=${hasta}`);
      const d = await r.json();
      if (d.success) setData(d);
    } catch (e) { /* ignored */ }
    setLoading(false);
  };

  useEffect(() => { cargar(); }, []);

  const fmtFechaTit = (f: string) => new Date(f + 'T00:00').toLocaleDateString('es-CO', { day: '2-digit', month: 'long', year: 'numeric' });
  const v = data?.ventas || {};
  const c = data?.compras || {};
  const ivaPagar = data?.iva_a_pagar || 0;

  return (
    <InformeLayout
      titulo="Informe de IVA"
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
      {/* IVA en VENTAS (generado) */}
      <div style={seccion}>IVA GENERADO EN VENTAS</div>
      <table style={tableStyle}>
        <tbody>
          <tr><td style={td}>Ventas gravadas (con IVA)</td><td style={tdNum}>{fmt(v.gravable || 0)}</td></tr>
          <tr><td style={td}>Ventas excluidas (sin IVA)</td><td style={tdNum}>{fmt(v.excluido || 0)}</td></tr>
          <tr style={{ background: '#f9fafb' }}><td style={tdSub}>Total Ventas</td><td style={{ ...tdNum, fontWeight: 700 }}>{fmt(v.total || 0)}</td></tr>
          <tr style={{ background: '#dcfce7', borderTop: '1px solid #16a34a', borderBottom: '1px solid #16a34a' }}>
            <td style={tdSub}>IVA generado (a favor de DIAN)</td>
            <td style={{ ...tdNum, fontWeight: 700, color: '#16a34a', fontSize: 14 }}>{fmt(v.iva || 0)}</td>
          </tr>
        </tbody>
      </table>

      {/* Desglose por tasa */}
      {data?.por_tasa && data.por_tasa.length > 0 && (
        <>
          <div style={{ ...seccion, fontSize: 11 }}>DESGLOSE POR TARIFA DE IVA</div>
          <table style={tableStyle}>
            <thead>
              <tr><th style={th}>Tarifa</th><th style={{ ...th, textAlign: 'right' }}>Base Gravable</th><th style={{ ...th, textAlign: 'right' }}>IVA</th></tr>
            </thead>
            <tbody>
              {data.por_tasa.map((t: any, i: number) => (
                <tr key={i}>
                  <td style={td}>{parseFloat(t.tasa).toFixed(0)}%</td>
                  <td style={tdNum}>{fmt(parseFloat(t.base))}</td>
                  <td style={tdNum}>{fmt(parseFloat(t.iva))}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}

      {/* IVA en COMPRAS (descontable) */}
      <div style={seccion}>IVA DESCONTABLE EN COMPRAS</div>
      <table style={tableStyle}>
        <tbody>
          <tr><td style={td}>Total compras (con IVA)</td><td style={tdNum}>{fmt(c.total || 0)}</td></tr>
          <tr style={{ background: '#fef2f2', borderTop: '1px solid #dc2626', borderBottom: '1px solid #dc2626' }}>
            <td style={tdSub}>IVA pagado en compras (descontable)</td>
            <td style={{ ...tdNum, fontWeight: 700, color: '#dc2626', fontSize: 14 }}>{fmt(c.iva || 0)}</td>
          </tr>
        </tbody>
      </table>

      {/* Resultado IVA */}
      <div style={seccion}>SALDO IVA DEL PERÍODO</div>
      <table style={tableStyle}>
        <tbody>
          <tr><td style={td}>IVA generado en ventas</td><td style={{ ...tdNum, color: '#16a34a' }}>+{fmt(v.iva || 0)}</td></tr>
          <tr><td style={td}>(-) IVA descontable en compras</td><td style={{ ...tdNum, color: '#dc2626' }}>-{fmt(c.iva || 0)}</td></tr>
          <tr style={{ background: ivaPagar >= 0 ? '#fee2e2' : '#dcfce7', borderTop: '2px solid #000' }}>
            <td style={tdTotal}>{ivaPagar >= 0 ? 'IVA POR PAGAR A DIAN' : 'SALDO A FAVOR (sigue con la próxima declaración)'}</td>
            <td style={{ ...tdNum, fontWeight: 700, fontSize: 16, color: ivaPagar >= 0 ? '#dc2626' : '#16a34a' }}>{fmt(Math.abs(ivaPagar))}</td>
          </tr>
        </tbody>
      </table>
    </InformeLayout>
  );
}

const inp: React.CSSProperties = { height: 30, border: '1px solid #d1d5db', borderRadius: 6, padding: '0 8px', fontSize: 13 };
const seccion: React.CSSProperties = { fontSize: 12, fontWeight: 700, background: '#e5e7eb', padding: '4px 8px', margin: '14px 0 4px', borderLeft: '4px solid #2563eb' };
const tableStyle: React.CSSProperties = { width: '100%', borderCollapse: 'collapse', fontSize: 12 };
const th: React.CSSProperties = { textAlign: 'left', padding: '6px 8px', borderBottom: '2px solid #000', background: '#f3f4f6', fontWeight: 700, fontSize: 11 };
const td: React.CSSProperties = { padding: '6px 10px', borderBottom: '1px solid #e5e7eb' };
const tdNum: React.CSSProperties = { padding: '6px 10px', borderBottom: '1px solid #e5e7eb', textAlign: 'right', fontFamily: 'monospace' };
const tdSub: React.CSSProperties = { padding: '8px 10px', fontWeight: 600 };
const tdTotal: React.CSSProperties = { padding: '10px', fontWeight: 700, textTransform: 'uppercase' };
