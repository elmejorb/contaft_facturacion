import { useState, useEffect } from 'react';
import { InformeLayout, fmt } from './InformeLayout';

const API = 'http://localhost:80/conta-app-backend/api/informes/resumen.php';

export function InformeSaldosProveedores() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const cargar = async () => {
    setLoading(true);
    try {
      const r = await fetch(`${API}?tipo=proveedores_saldos`);
      const d = await r.json();
      if (d.success) setData(d);
    } catch (e) { /* ignored */ }
    setLoading(false);
  };

  useEffect(() => { cargar(); }, []);

  const provs = data?.proveedores || [];
  const fmtFecha = (f: string) => {
    if (!f) return '-';
    const d = new Date(f);
    return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
  };

  return (
    <InformeLayout
      titulo="Saldos a Proveedores"
      subtitulo={`Cierre al ${new Date().toLocaleDateString('es-CO', { day: '2-digit', month: 'long', year: 'numeric' })}`}
      onRefresh={cargar} loading={loading}>
      {provs.length === 0 ? <div style={{ padding: 30, textAlign: 'center', color: '#999' }}>Sin proveedores con saldo pendiente</div> : (
        <>
          {provs.map((p: any) => (
            <div key={p.CodigoPro} style={{ marginBottom: 14, pageBreakInside: 'avoid' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '4px 6px', background: '#fef3c7', borderTop: '1px solid #000', borderBottom: '1px solid #000' }}>
                <span style={{ fontSize: 11, fontWeight: 700 }}>PROVEEDOR:</span>
                <span style={{ fontSize: 11, fontWeight: 600, color: '#d97706', minWidth: 50 }}>{p.CodigoPro}</span>
                <span style={{ fontSize: 12, fontWeight: 700 }}>{p.RazonSocial}</span>
                {p.Nit && p.Nit !== '0' && <span style={{ fontSize: 10, color: '#6b7280', marginLeft: 'auto' }}>NIT: {p.Nit}</span>}
              </div>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
                <thead>
                  <tr style={{ background: '#fafafa' }}>
                    <th style={th}>N° factura</th>
                    <th style={th}>Fecha</th>
                    <th style={{ ...th, textAlign: 'center', width: 50 }}>Días</th>
                    <th style={{ ...th, textAlign: 'center', width: 50 }}>Días V.</th>
                    <th style={{ ...th, textAlign: 'right' }}>Valor</th>
                    <th style={{ ...th, textAlign: 'right' }}>Sin Vencer</th>
                    <th style={{ ...th, textAlign: 'right' }}>De 1 a 30</th>
                    <th style={{ ...th, textAlign: 'right' }}>De 31 a 60</th>
                    <th style={{ ...th, textAlign: 'right' }}>Mas de 60</th>
                  </tr>
                </thead>
                <tbody>
                  {p.facturas.map((f: any, i: number) => {
                    const diasV = parseInt(f.Dias_Vencidos);
                    const colorDiasV = diasV > 60 ? '#991b1b' : diasV > 30 ? '#dc2626' : diasV > 0 ? '#d97706' : '#16a34a';
                    return (
                      <tr key={i}>
                        <td style={td}>{f.FacturaN}</td>
                        <td style={td}>{fmtFecha(f.Fecha)}</td>
                        <td style={{ ...td, textAlign: 'center' }}>{f.Dias}</td>
                        <td style={{ ...td, textAlign: 'center', fontWeight: 600, color: colorDiasV }}>{diasV}</td>
                        <td style={tdNum}>{fmt(parseFloat(f.Valor))}</td>
                        <td style={{ ...tdNum, color: parseFloat(f.sin_vencer) > 0 ? '#16a34a' : '#9ca3af' }}>{fmt(parseFloat(f.sin_vencer))}</td>
                        <td style={{ ...tdNum, color: parseFloat(f.d1_30) > 0 ? '#d97706' : '#9ca3af' }}>{fmt(parseFloat(f.d1_30))}</td>
                        <td style={{ ...tdNum, color: parseFloat(f.d31_60) > 0 ? '#dc2626' : '#9ca3af' }}>{fmt(parseFloat(f.d31_60))}</td>
                        <td style={{ ...tdNum, color: parseFloat(f.mas_60) > 0 ? '#991b1b' : '#9ca3af' }}>{fmt(parseFloat(f.mas_60))}</td>
                      </tr>
                    );
                  })}
                  <tr style={{ borderTop: '1px solid #000', background: '#fafafa' }}>
                    <td colSpan={4} style={{ padding: '6px 8px', fontWeight: 700, textAlign: 'right' }}>TOTAL SALDO</td>
                    <td style={{ ...tdNum, fontWeight: 700 }}>{fmt(parseFloat(p.total_saldo))}</td>
                    <td style={{ ...tdNum, fontWeight: 700, color: '#16a34a' }}>{fmt(parseFloat(p.sin_vencer))}</td>
                    <td style={{ ...tdNum, fontWeight: 700, color: '#d97706' }}>{fmt(parseFloat(p.d1_30))}</td>
                    <td style={{ ...tdNum, fontWeight: 700, color: '#dc2626' }}>{fmt(parseFloat(p.d31_60))}</td>
                    <td style={{ ...tdNum, fontWeight: 700, color: '#991b1b' }}>{fmt(parseFloat(p.mas_60))}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          ))}

          <div style={{ marginTop: 20, padding: '12px 16px', border: '2px solid #000', maxWidth: 380, marginLeft: 'auto', marginRight: 'auto' }}>
            <div style={{ textAlign: 'center', fontWeight: 700, fontSize: 13, marginBottom: 6 }}>RESUMEN GENERAL</div>
            <div style={row}><span>Sin Vencer</span><span style={mono}>{fmt(data.sin_vencer || 0)}</span></div>
            <div style={row}><span>De 1 a 30 días</span><span style={mono}>{fmt(data.d1_30 || 0)}</span></div>
            <div style={row}><span>De 31 a 60 días</span><span style={mono}>{fmt(data.d31_60 || 0)}</span></div>
            <div style={row}><span>Mas de 60 días</span><span style={mono}>{fmt(data.mas_60 || 0)}</span></div>
            <div style={{ ...row, borderTop: '1px solid #000', marginTop: 6, paddingTop: 6, fontWeight: 700, fontSize: 14 }}>
              <span>TOTAL POR PAGAR</span><span style={{ ...mono, fontWeight: 700 }}>{fmt(data.total_general || 0)}</span>
            </div>
          </div>
        </>
      )}
    </InformeLayout>
  );
}

const th: React.CSSProperties = { textAlign: 'left', padding: '5px 8px', borderBottom: '1px solid #000', fontWeight: 700, fontSize: 11 };
const td: React.CSSProperties = { padding: '4px 8px', borderBottom: '1px solid #f3f4f6' };
const tdNum: React.CSSProperties = { padding: '4px 8px', borderBottom: '1px solid #f3f4f6', textAlign: 'right', fontFamily: 'monospace' };
const row: React.CSSProperties = { display: 'flex', justifyContent: 'space-between', padding: '3px 0', fontSize: 12 };
const mono: React.CSSProperties = { fontFamily: 'monospace' };
