import { useState, useEffect } from 'react';
import { InformeLayout, fmt } from './InformeLayout';

const API = 'http://localhost:80/conta-app-backend/api/informes/resumen.php';

export function InformeProveedoresListado() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [busqueda, setBusqueda] = useState('');

  const cargar = async () => {
    setLoading(true);
    try {
      const r = await fetch(`${API}?tipo=proveedores_listado`);
      const d = await r.json();
      if (d.success) setData(d);
    } catch (e) { /* ignored */ }
    setLoading(false);
  };

  useEffect(() => { cargar(); }, []);

  let provs = data?.proveedores || [];
  if (busqueda) {
    const b = busqueda.toLowerCase();
    provs = provs.filter((p: any) =>
      p.RazonSocial?.toLowerCase().includes(b) ||
      p.Nit?.includes(busqueda) ||
      String(p.CodigoPro).includes(busqueda));
  }

  return (
    <InformeLayout
      titulo="Listado de Proveedores"
      subtitulo={`${data?.proveedores?.length || 0} proveedores activos`}
      onRefresh={cargar} loading={loading}
      filtros={
        <>
          <label style={{ fontSize: 12, fontWeight: 600 }}>Buscar:</label>
          <input type="text" value={busqueda} onChange={e => setBusqueda(e.target.value)}
            placeholder="Razón social, NIT o código..."
            style={{ height: 30, width: 280, border: '1px solid #d1d5db', borderRadius: 6, padding: '0 8px', fontSize: 13 }} />
        </>
      }>
      {provs.length === 0 ? <div style={{ padding: 30, textAlign: 'center', color: '#999' }}>Sin proveedores</div> : (
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
          <thead>
            <tr>
              <th style={th}>Código</th>
              <th style={th}>Razón Social</th>
              <th style={th}>NIT</th>
              <th style={th}>Teléfono</th>
              <th style={th}>Dirección</th>
              <th style={{ ...th, textAlign: 'center' }}>Compras</th>
              <th style={{ ...th, textAlign: 'right' }}>Monto Total</th>
              <th style={{ ...th, textAlign: 'right' }}>Saldo Actual</th>
            </tr>
          </thead>
          <tbody>
            {provs.map((p: any) => (
              <tr key={p.CodigoPro}>
                <td style={{ ...td, color: '#7c3aed', fontWeight: 600 }}>{p.CodigoPro}</td>
                <td style={{ ...td, fontWeight: 600 }}>{p.RazonSocial}</td>
                <td style={td}>{p.Nit}</td>
                <td style={td}>{p.Telefonos !== '0' ? p.Telefonos : '-'}</td>
                <td style={{ ...td, fontSize: 10, color: '#6b7280' }}>{p.Direccion}</td>
                <td style={{ ...td, textAlign: 'center' }}>{p.num_compras || 0}</td>
                <td style={tdNum}>{fmt(parseFloat(p.total_compras))}</td>
                <td style={{ ...tdNum, color: parseFloat(p.saldo_actual) > 0 ? '#dc2626' : '#9ca3af', fontWeight: parseFloat(p.saldo_actual) > 0 ? 700 : 400 }}>{fmt(parseFloat(p.saldo_actual))}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr style={{ borderTop: '2px solid #000', fontWeight: 700, background: '#f9fafb' }}>
              <td colSpan={5} style={{ padding: '8px' }}>{provs.length} proveedor(es){busqueda ? ' (filtrado)' : ''}</td>
              <td style={td}></td>
              <td style={tdNum}>{fmt(provs.reduce((s: number, p: any) => s + parseFloat(p.total_compras), 0))}</td>
              <td style={{ ...tdNum, color: '#dc2626' }}>{fmt(provs.reduce((s: number, p: any) => s + parseFloat(p.saldo_actual), 0))}</td>
            </tr>
          </tfoot>
        </table>
      )}
    </InformeLayout>
  );
}

const th: React.CSSProperties = { textAlign: 'left', padding: '6px 8px', borderBottom: '2px solid #000', background: '#f3f4f6', fontWeight: 700, fontSize: 11 };
const td: React.CSSProperties = { padding: '4px 8px', borderBottom: '1px solid #f3f4f6' };
const tdNum: React.CSSProperties = { padding: '4px 8px', borderBottom: '1px solid #f3f4f6', textAlign: 'right', fontFamily: 'monospace' };
