import { useState, useEffect } from 'react';
import { InformeLayout, fmt } from './InformeLayout';

const API = 'http://localhost:80/conta-app-backend/api/informes/resumen.php';

export function InformePagosProveedores() {
  const [desde, setDesde] = useState(new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]);
  const [hasta, setHasta] = useState(new Date().toISOString().split('T')[0]);
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const cargar = async () => {
    setLoading(true);
    try {
      const r = await fetch(`${API}?tipo=pagos_proveedores&desde=${desde}&hasta=${hasta}`);
      const d = await r.json();
      if (d.success) setData(d);
    } catch (e) { /* ignored */ }
    setLoading(false);
  };

  useEffect(() => { cargar(); }, []);

  const pagos = data?.pagos || [];
  const porProv = data?.por_proveedor || [];
  const total = data?.total_general || 0;
  const fmtFecha = (f: string) => f ? new Date(f).toLocaleDateString('es-CO') : '-';
  const fmtFechaTit = (f: string) => new Date(f + 'T00:00').toLocaleDateString('es-CO', { day: '2-digit', month: 'long', year: 'numeric' });

  return (
    <InformeLayout
      titulo="Pagos a Proveedores"
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
      <div style={{ fontSize: 12, fontWeight: 700, background: '#e5e7eb', padding: '4px 8px', margin: '0 0 8px', borderLeft: '4px solid #d97706' }}>RESUMEN POR PROVEEDOR</div>
      {porProv.length === 0 ? <div style={{ padding: 20, textAlign: 'center', color: '#999' }}>Sin pagos en el período</div> : (
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12, marginBottom: 18 }}>
          <thead>
            <tr>
              <th style={th}>Proveedor</th>
              <th style={th}>NIT</th>
              <th style={{ ...th, textAlign: 'center' }}>Pagos</th>
              <th style={{ ...th, textAlign: 'right' }}>Monto</th>
              <th style={{ ...th, textAlign: 'right' }}>%</th>
            </tr>
          </thead>
          <tbody>
            {porProv.map((p: any, i: number) => (
              <tr key={i}>
                <td style={{ ...td, fontWeight: 600 }}>{p.proveedor}</td>
                <td style={td}>{p.nit || '-'}</td>
                <td style={{ ...td, textAlign: 'center' }}>{p.cantidad}</td>
                <td style={{ ...tdNum, fontWeight: 600 }}>{fmt(parseFloat(p.total))}</td>
                <td style={{ ...tdNum, color: '#6b7280' }}>{total > 0 ? ((parseFloat(p.total) / total) * 100).toFixed(1) : '0'}%</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr style={{ borderTop: '2px solid #000', fontWeight: 700, background: '#fef3c7' }}>
              <td colSpan={2} style={{ padding: '8px' }}>TOTAL PAGADO</td>
              <td style={{ ...td, textAlign: 'center', fontWeight: 700 }}>{pagos.length}</td>
              <td style={{ ...tdNum, fontWeight: 700, fontSize: 14, color: '#d97706' }}>{fmt(total)}</td>
              <td style={{ ...tdNum, fontWeight: 700 }}>100%</td>
            </tr>
          </tfoot>
        </table>
      )}

      <div style={{ fontSize: 12, fontWeight: 700, background: '#e5e7eb', padding: '4px 8px', margin: '0 0 8px', borderLeft: '4px solid #7c3aed' }}>DETALLE DE PAGOS ({pagos.length})</div>
      {pagos.length > 0 && (
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
          <thead>
            <tr>
              <th style={th}>Comp.</th>
              <th style={th}>Fecha</th>
              <th style={th}>Proveedor</th>
              <th style={th}>Factura</th>
              <th style={th}>Concepto</th>
              <th style={{ ...th, textAlign: 'right' }}>Valor</th>
            </tr>
          </thead>
          <tbody>
            {pagos.map((p: any) => (
              <tr key={p.Id_Egresos}>
                <td style={{ ...td, color: '#7c3aed', fontWeight: 600 }}>{p.N_Comprobante}</td>
                <td style={td}>{fmtFecha(p.Fecha)}</td>
                <td style={td}>{p.proveedor}</td>
                <td style={td}>{p.NFacturaAnt || '-'}</td>
                <td style={{ ...td, fontSize: 10, color: '#6b7280' }}>{p.Concepto}</td>
                <td style={{ ...tdNum, color: '#d97706' }}>{fmt(parseFloat(p.Valor))}</td>
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
