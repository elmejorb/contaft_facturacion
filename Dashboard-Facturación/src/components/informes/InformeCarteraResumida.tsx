import { useState, useEffect } from 'react';
import { InformeLayout, fmt } from './InformeLayout';

const API = 'http://localhost:80/conta-app-backend/api/informes/resumen.php';

export function InformeCarteraResumida() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [busqueda, setBusqueda] = useState('');
  const [orden, setOrden] = useState<'nombre' | 'saldo'>('saldo');

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

  let clientes = (data?.clientes || []).slice();
  if (busqueda) {
    const b = busqueda.toLowerCase();
    clientes = clientes.filter((c: any) =>
      c.Razon_Social?.toLowerCase().includes(b) ||
      c.Nit?.includes(busqueda) ||
      String(c.CodigoClien).includes(busqueda));
  }
  if (orden === 'saldo') clientes.sort((a: any, b: any) => parseFloat(b.total_saldo) - parseFloat(a.total_saldo));
  else clientes.sort((a: any, b: any) => (a.Razon_Social || '').localeCompare(b.Razon_Social || ''));

  const totalFiltrado = clientes.reduce((s: number, c: any) => s + parseFloat(c.total_saldo), 0);

  return (
    <InformeLayout
      titulo="Cartera de Clientes — Resumida"
      subtitulo={`Cierre al ${new Date().toLocaleDateString('es-CO', { day: '2-digit', month: 'long', year: 'numeric' })}`}
      onRefresh={cargar} loading={loading}
      filtros={
        <>
          <label style={{ fontSize: 12, fontWeight: 600 }}>Buscar:</label>
          <input type="text" value={busqueda} onChange={e => setBusqueda(e.target.value)}
            placeholder="Nombre, NIT o código..."
            style={{ height: 30, width: 240, border: '1px solid #d1d5db', borderRadius: 6, padding: '0 8px', fontSize: 13 }} />
          <label style={{ fontSize: 12, fontWeight: 600 }}>Ordenar por:</label>
          <select value={orden} onChange={e => setOrden(e.target.value as any)}
            style={{ height: 30, border: '1px solid #d1d5db', borderRadius: 6, padding: '0 8px', fontSize: 13 }}>
            <option value="saldo">Mayor saldo primero</option>
            <option value="nombre">Nombre A-Z</option>
          </select>
          <span style={{ fontSize: 11, color: '#6b7280' }}>{clientes.length} cliente(s)</span>
        </>
      }>
      {clientes.length === 0 ? (
        <div style={{ padding: 30, textAlign: 'center', color: '#999' }}>Sin clientes con saldo pendiente</div>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
          <thead>
            <tr>
              <th style={th}>Código</th>
              <th style={th}>Cliente</th>
              <th style={th}>NIT</th>
              <th style={{ ...th, textAlign: 'center' }}>Facturas</th>
              <th style={{ ...th, textAlign: 'right' }}>Saldo Pendiente</th>
            </tr>
          </thead>
          <tbody>
            {clientes.map((c: any) => (
              <tr key={c.CodigoClien}>
                <td style={{ ...td, color: '#7c3aed', fontWeight: 600 }}>{c.CodigoClien}</td>
                <td style={td}>{c.Razon_Social}</td>
                <td style={td}>{c.Nit}</td>
                <td style={{ ...td, textAlign: 'center' }}>{c.facturas?.length || 0}</td>
                <td style={{ ...td, textAlign: 'right', fontFamily: 'monospace', fontWeight: 700, color: '#dc2626' }}>{fmt(parseFloat(c.total_saldo))}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr style={{ borderTop: '2px solid #000', fontWeight: 700, background: '#f9fafb' }}>
              <td colSpan={4} style={{ padding: '10px 8px', fontSize: 13 }}>TOTAL CARTERA{busqueda ? ' (FILTRADO)' : ''}</td>
              <td style={{ padding: '10px 8px', textAlign: 'right', fontFamily: 'monospace', fontSize: 14, color: '#7c3aed' }}>{fmt(totalFiltrado)}</td>
            </tr>
          </tfoot>
        </table>
      )}
    </InformeLayout>
  );
}

const th: React.CSSProperties = { textAlign: 'left', padding: '6px 8px', borderBottom: '2px solid #000', background: '#f3f4f6', fontWeight: 700 };
const td: React.CSSProperties = { padding: '6px 8px', borderBottom: '1px solid #e5e7eb' };
