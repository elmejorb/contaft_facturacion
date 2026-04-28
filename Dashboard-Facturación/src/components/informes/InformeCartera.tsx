import { useState, useEffect } from 'react';
import { InformeLayout, fmt } from './InformeLayout';

const API = 'http://localhost:80/conta-app-backend/api/informes/resumen.php';

export function InformeCartera() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [busqueda, setBusqueda] = useState('');

  const cargar = async () => {
    setLoading(true);
    try {
      const r = await fetch(`${API}?tipo=cartera`);
      const d = await r.json();
      if (d.success) setData(d);
    } catch (e) { /* ignored */ }
    setLoading(false);
  };

  useEffect(() => { cargar(); }, []);

  const clientesAll = data?.clientes || [];
  const clientes = busqueda
    ? clientesAll.filter((c: any) =>
        c.Razon_Social?.toLowerCase().includes(busqueda.toLowerCase()) ||
        c.Nit?.includes(busqueda) ||
        String(c.CodigoClien).includes(busqueda))
    : clientesAll;

  const fmtFecha = (f: string) => {
    if (!f) return '-';
    const d = new Date(f);
    return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
  };

  return (
    <InformeLayout
      titulo="Saldos de Clientes"
      subtitulo={`Cierre al ${new Date().toLocaleDateString('es-CO', { day: '2-digit', month: 'long', year: 'numeric' })}`}
      onRefresh={cargar} loading={loading}
      filtros={
        <>
          <label style={{ fontSize: 12, fontWeight: 600 }}>Buscar:</label>
          <input type="text" value={busqueda} onChange={e => setBusqueda(e.target.value)}
            placeholder="Nombre, NIT o código..."
            style={{ height: 30, width: 240, border: '1px solid #d1d5db', borderRadius: 6, padding: '0 8px', fontSize: 13 }} />
          <span style={{ fontSize: 11, color: '#6b7280' }}>{clientes.length} cliente(s) con saldo</span>
        </>
      }>
      {clientes.length === 0 ? (
        <div style={{ padding: 30, textAlign: 'center', color: '#999' }}>Sin clientes con saldo pendiente</div>
      ) : (
        <>
          {clientes.map((c: any) => (
            <div key={c.CodigoClien} style={{ marginBottom: 14, pageBreakInside: 'avoid' }}>
              {/* Encabezado del cliente */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '4px 6px', background: '#f3f4f6', borderTop: '1px solid #000', borderBottom: '1px solid #000' }}>
                <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: 0.5 }}>CLIENTE:</span>
                <span style={{ fontSize: 11, fontWeight: 600, color: '#7c3aed', minWidth: 50 }}>{c.CodigoClien}</span>
                <span style={{ fontSize: 12, fontWeight: 700 }}>{c.Razon_Social}</span>
                {c.Nit && c.Nit !== '0' && <span style={{ fontSize: 10, color: '#6b7280', marginLeft: 'auto' }}>NIT: {c.Nit}</span>}
              </div>

              {/* Tabla de facturas */}
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
                <thead>
                  <tr style={{ background: '#fafafa' }}>
                    <th style={th}>N° factura</th>
                    <th style={th}>Fecha</th>
                    <th style={{ ...th, textAlign: 'center', width: 50 }}>Días</th>
                    <th style={{ ...th, textAlign: 'center', width: 50 }}>Días V.</th>
                    <th style={{ ...th, textAlign: 'right' }}>Total</th>
                    <th style={{ ...th, textAlign: 'right' }}>Sin Vencer</th>
                    <th style={{ ...th, textAlign: 'right' }}>De 1 a 30</th>
                    <th style={{ ...th, textAlign: 'right' }}>De 31 a 60</th>
                    <th style={{ ...th, textAlign: 'right' }}>Mas de 60</th>
                  </tr>
                </thead>
                <tbody>
                  {c.facturas.map((f: any, i: number) => {
                    const diasV = parseInt(f.Dias_Vencidos);
                    const colorDiasV = diasV > 60 ? '#991b1b' : diasV > 30 ? '#dc2626' : diasV > 0 ? '#d97706' : '#16a34a';
                    return (
                      <tr key={i}>
                        <td style={td}>{f.Factura_N}</td>
                        <td style={td}>{fmtFecha(f.Fecha)}</td>
                        <td style={{ ...td, textAlign: 'center' }}>{f.Dias}</td>
                        <td style={{ ...td, textAlign: 'center', fontWeight: 600, color: colorDiasV }}>{diasV}</td>
                        <td style={tdNum}>{fmt(parseFloat(f.Total))}</td>
                        <td style={{ ...tdNum, color: parseFloat(f.sin_vencer) > 0 ? '#16a34a' : '#9ca3af' }}>{fmt(parseFloat(f.sin_vencer))}</td>
                        <td style={{ ...tdNum, color: parseFloat(f.d1_30) > 0 ? '#d97706' : '#9ca3af' }}>{fmt(parseFloat(f.d1_30))}</td>
                        <td style={{ ...tdNum, color: parseFloat(f.d31_60) > 0 ? '#dc2626' : '#9ca3af' }}>{fmt(parseFloat(f.d31_60))}</td>
                        <td style={{ ...tdNum, color: parseFloat(f.mas_60) > 0 ? '#991b1b' : '#9ca3af' }}>{fmt(parseFloat(f.mas_60))}</td>
                      </tr>
                    );
                  })}
                  <tr style={{ borderTop: '1px solid #000', background: '#fafafa' }}>
                    <td colSpan={4} style={{ padding: '6px 8px', fontWeight: 700, textAlign: 'right' }}>TOTAL SALDO</td>
                    <td style={{ ...tdNum, fontWeight: 700 }}>{fmt(parseFloat(c.total_saldo))}</td>
                    <td style={{ ...tdNum, fontWeight: 700, color: parseFloat(c.sin_vencer) > 0 ? '#16a34a' : '#9ca3af' }}>{fmt(parseFloat(c.sin_vencer))}</td>
                    <td style={{ ...tdNum, fontWeight: 700, color: parseFloat(c.d1_30) > 0 ? '#d97706' : '#9ca3af' }}>{fmt(parseFloat(c.d1_30))}</td>
                    <td style={{ ...tdNum, fontWeight: 700, color: parseFloat(c.d31_60) > 0 ? '#dc2626' : '#9ca3af' }}>{fmt(parseFloat(c.d31_60))}</td>
                    <td style={{ ...tdNum, fontWeight: 700, color: parseFloat(c.mas_60) > 0 ? '#991b1b' : '#9ca3af' }}>{fmt(parseFloat(c.mas_60))}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          ))}

          {/* Resumen general */}
          <div style={{ marginTop: 24, padding: '12px 16px', border: '2px solid #000', maxWidth: 380, marginLeft: 'auto', marginRight: 'auto' }}>
            <div style={{ textAlign: 'center', fontWeight: 700, fontSize: 13, marginBottom: 6 }}>RESUMEN GENERAL</div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '3px 0', fontSize: 12 }}><span>Monto Total</span><span style={mono}>{fmt(data.monto_total || 0)}</span></div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '3px 0', fontSize: 12 }}><span>Sin Vencer</span><span style={mono}>{fmt(data.sin_vencer || 0)}</span></div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '3px 0', fontSize: 12 }}><span>De 0 a 30 días</span><span style={mono}>{fmt(data.d1_30 || 0)}</span></div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '3px 0', fontSize: 12 }}><span>De 31 a 60 días</span><span style={mono}>{fmt(data.d31_60 || 0)}</span></div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '3px 0', fontSize: 12 }}><span>Mas de 60 días</span><span style={mono}>{fmt(data.mas_60 || 0)}</span></div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0 3px', borderTop: '1px solid #000', marginTop: 6, fontWeight: 700, fontSize: 14 }}>
              <span>TOTAL CARTERA</span><span style={{ ...mono, fontWeight: 700 }}>{fmt(data.total_cartera || 0)}</span>
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
const mono: React.CSSProperties = { fontFamily: 'monospace' };
