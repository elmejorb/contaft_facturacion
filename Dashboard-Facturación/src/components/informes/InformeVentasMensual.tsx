import { useState, useEffect } from 'react';
import { InformeLayout, fmt } from './InformeLayout';

const API = 'http://localhost:80/conta-app-backend/api/informes/resumen.php';

export function InformeVentasMensual() {
  const [anio, setAnio] = useState(new Date().getFullYear());
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const cargar = async () => {
    setLoading(true);
    try {
      const r = await fetch(`${API}?tipo=ventas_mensual&anio=${anio}`);
      const d = await r.json();
      if (d.success) setData(d);
    } catch (e) { /* ignored */ }
    setLoading(false);
  };

  useEffect(() => { cargar(); }, [anio]);

  const meses = data?.meses || [];
  const t = data?.totales || {};

  return (
    <InformeLayout
      titulo="Ventas Mensuales"
      subtitulo={`Año ${anio} · Costo y Utilidad`}
      onRefresh={cargar} loading={loading}
      filtros={
        <>
          <label style={{ fontSize: 12, fontWeight: 600 }}>Año:</label>
          <select value={anio} onChange={e => setAnio(parseInt(e.target.value))}
            style={{ height: 30, border: '1px solid #d1d5db', borderRadius: 6, padding: '0 8px', fontSize: 13 }}>
            {[anio + 1, anio, anio - 1, anio - 2, anio - 3].map(a => <option key={a} value={a}>{a}</option>)}
          </select>
        </>
      }>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
        <thead>
          <tr>
            <th style={th}>Mes</th>
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
          {meses.map((m: any) => {
            const margen = m.total > 0 ? (m.utilidad / m.total * 100) : 0;
            const sinVentas = m.total === 0;
            return (
              <tr key={m.mes} style={{ opacity: sinVentas ? 0.4 : 1 }}>
                <td style={{ ...td, fontWeight: 600 }}>{m.mes_nombre}</td>
                <td style={{ ...td, textAlign: 'center' }}>{m.num_facturas}</td>
                <td style={tdNum}>{fmt(m.contado)}</td>
                <td style={tdNum}>{fmt(m.credito)}</td>
                <td style={{ ...tdNum, fontWeight: 600 }}>{fmt(m.total)}</td>
                <td style={{ ...tdNum, color: '#666' }}>{fmt(m.costo)}</td>
                <td style={{ ...tdNum, fontWeight: 600, color: m.utilidad >= 0 ? '#16a34a' : '#dc2626' }}>{fmt(m.utilidad)}</td>
                <td style={tdNum}>{margen.toFixed(1)}%</td>
              </tr>
            );
          })}
        </tbody>
        <tfoot>
          <tr style={{ borderTop: '2px solid #000', fontWeight: 700, background: '#dcfce7' }}>
            <td style={{ padding: '10px', textTransform: 'uppercase' }}>TOTAL AÑO {anio}</td>
            <td style={{ ...td, textAlign: 'center', fontWeight: 700 }}>{t.num_facturas || 0}</td>
            <td style={{ ...tdNum, fontWeight: 700 }}>{fmt(t.contado || 0)}</td>
            <td style={{ ...tdNum, fontWeight: 700 }}>{fmt(t.credito || 0)}</td>
            <td style={{ ...tdNum, fontWeight: 700, fontSize: 14 }}>{fmt(t.total || 0)}</td>
            <td style={{ ...tdNum, fontWeight: 700 }}>{fmt(t.costo || 0)}</td>
            <td style={{ ...tdNum, fontWeight: 700, fontSize: 14, color: '#16a34a' }}>{fmt(t.utilidad || 0)}</td>
            <td style={{ ...tdNum, fontWeight: 700 }}>{t.total > 0 ? (t.utilidad / t.total * 100).toFixed(1) : '0.0'}%</td>
          </tr>
        </tfoot>
      </table>
    </InformeLayout>
  );
}

const th: React.CSSProperties = { textAlign: 'left', padding: '6px 8px', borderBottom: '2px solid #000', background: '#f3f4f6', fontWeight: 700 };
const td: React.CSSProperties = { padding: '6px 8px', borderBottom: '1px solid #f3f4f6' };
const tdNum: React.CSSProperties = { padding: '6px 8px', borderBottom: '1px solid #f3f4f6', textAlign: 'right', fontFamily: 'monospace' };
