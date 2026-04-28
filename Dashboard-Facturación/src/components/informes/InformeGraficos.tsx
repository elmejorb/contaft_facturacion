import { useState, useEffect } from 'react';
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { InformeLayout, fmt } from './InformeLayout';

const API = 'http://localhost:80/conta-app-backend/api/informes/resumen.php';
const COLORES_PIE = ['#7c3aed', '#2563eb', '#16a34a', '#d97706', '#dc2626', '#0891b2', '#db2777', '#65a30d', '#9333ea', '#ea580c'];

export function InformeGraficos() {
  const [anio, setAnio] = useState(new Date().getFullYear());
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const cargar = async () => {
    setLoading(true);
    try {
      const r = await fetch(`${API}?tipo=graficos&anio=${anio}`);
      const d = await r.json();
      if (d.success) setData(d);
    } catch (e) { /* ignored */ }
    setLoading(false);
  };

  useEffect(() => { cargar(); }, [anio]);

  if (!data) return <InformeLayout titulo="Gráficos" loading={loading}><div /></InformeLayout>;

  const ventasMes = data.ventas_mes || [];
  const topProductos = (data.top_productos || []).map((p: any) => ({
    nombre: (p.nombre || '').length > 30 ? (p.nombre || '').substring(0, 30) + '...' : p.nombre,
    monto: parseFloat(p.monto) || 0
  }));
  const gastosCat = (data.gastos_categoria || []).map((g: any) => ({
    nombre: g.categoria,
    valor: parseFloat(g.total) || 0
  }));
  const tendencia = (data.tendencia_30d || []).map((t: any) => ({
    fecha: new Date(t.dia).toLocaleDateString('es-CO', { day: '2-digit', month: '2-digit' }),
    total: parseFloat(t.total) || 0,
    cant: parseInt(t.cant) || 0
  }));

  const totalVentasAnio = ventasMes.reduce((s: number, v: any) => s + v.total, 0);
  const totalGastos = gastosCat.reduce((s: number, g: any) => s + g.valor, 0);

  return (
    <InformeLayout
      titulo="Análisis Gráfico"
      subtitulo={`Año ${anio}`}
      onRefresh={cargar} loading={loading}
      filtros={
        <>
          <label style={{ fontSize: 12, fontWeight: 600 }}>Año:</label>
          <select value={anio} onChange={e => setAnio(parseInt(e.target.value))}
            style={{ height: 30, border: '1px solid #d1d5db', borderRadius: 6, padding: '0 8px', fontSize: 13 }}>
            {[anio + 1, anio, anio - 1, anio - 2].map(a => <option key={a} value={a}>{a}</option>)}
          </select>
        </>
      }>
      {/* KPIs arriba */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 16 }}>
        <Kpi label={`Ventas ${anio}`} valor={fmt(totalVentasAnio)} color="#16a34a" />
        <Kpi label={`Gastos ${anio}`} valor={fmt(totalGastos)} color="#dc2626" />
        <Kpi label="Margen" valor={totalVentasAnio > 0 ? `${((totalVentasAnio - totalGastos) / totalVentasAnio * 100).toFixed(1)}%` : '0%'} color="#7c3aed" />
      </div>

      {/* Ventas por mes */}
      <div style={card}>
        <div style={cardTitle}>Ventas por mes — {anio}</div>
        <div style={{ width: '100%', height: 280 }}>
          <ResponsiveContainer>
            <BarChart data={ventasMes} margin={{ top: 5, right: 10, bottom: 5, left: 60 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="mes" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => '$' + (v / 1000).toFixed(0) + 'k'} />
              <Tooltip formatter={(v: any) => fmt(v as number)} cursor={{ fill: '#f3f4f6' }} />
              <Bar dataKey="total" fill="#7c3aed" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Tendencia 30d + Top productos lado a lado */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <div style={card}>
          <div style={cardTitle}>Tendencia diaria (últimos 30 días)</div>
          <div style={{ width: '100%', height: 240 }}>
            <ResponsiveContainer>
              <LineChart data={tendencia} margin={{ top: 5, right: 10, bottom: 5, left: 50 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="fecha" tick={{ fontSize: 9 }} />
                <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => '$' + (v / 1000).toFixed(0) + 'k'} />
                <Tooltip formatter={(v: any) => fmt(v as number)} />
                <Line type="monotone" dataKey="total" stroke="#16a34a" strokeWidth={2} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div style={card}>
          <div style={cardTitle}>Top 10 productos del año</div>
          <div style={{ width: '100%', height: 240 }}>
            <ResponsiveContainer>
              <BarChart data={topProductos} layout="vertical" margin={{ top: 5, right: 10, bottom: 5, left: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis type="number" tick={{ fontSize: 9 }} tickFormatter={(v) => '$' + (v / 1000).toFixed(0) + 'k'} />
                <YAxis type="category" dataKey="nombre" tick={{ fontSize: 9 }} width={140} />
                <Tooltip formatter={(v: any) => fmt(v as number)} />
                <Bar dataKey="monto" fill="#2563eb" radius={[0, 6, 6, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Distribución de gastos */}
      {gastosCat.length > 0 && (
        <div style={card}>
          <div style={cardTitle}>Distribución de gastos por categoría — {anio}</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div style={{ width: '100%', height: 280 }}>
              <ResponsiveContainer>
                <PieChart>
                  <Pie data={gastosCat} dataKey="valor" nameKey="nombre" cx="50%" cy="50%" outerRadius={100}
                    label={(e: any) => `${e.nombre}: ${(e.percent * 100).toFixed(0)}%`}>
                    {gastosCat.map((_: any, i: number) => <Cell key={i} fill={COLORES_PIE[i % COLORES_PIE.length]} />)}
                  </Pie>
                  <Tooltip formatter={(v: any) => fmt(v as number)} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div>
              <table style={{ width: '100%', fontSize: 12, borderCollapse: 'collapse' }}>
                <thead>
                  <tr><th style={{ textAlign: 'left', padding: 6, borderBottom: '2px solid #000' }}>Categoría</th>
                      <th style={{ textAlign: 'right', padding: 6, borderBottom: '2px solid #000' }}>Total</th>
                      <th style={{ textAlign: 'right', padding: 6, borderBottom: '2px solid #000' }}>%</th></tr>
                </thead>
                <tbody>
                  {gastosCat.map((g: any, i: number) => (
                    <tr key={i}>
                      <td style={{ padding: 6, borderBottom: '1px solid #f3f4f6' }}>
                        <span style={{ display: 'inline-block', width: 10, height: 10, background: COLORES_PIE[i % COLORES_PIE.length], borderRadius: 2, marginRight: 6 }} />
                        {g.nombre}
                      </td>
                      <td style={{ padding: 6, textAlign: 'right', fontFamily: 'monospace', borderBottom: '1px solid #f3f4f6' }}>{fmt(g.valor)}</td>
                      <td style={{ padding: 6, textAlign: 'right', borderBottom: '1px solid #f3f4f6' }}>{((g.valor / totalGastos) * 100).toFixed(1)}%</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr style={{ fontWeight: 700, background: '#fef2f2' }}>
                    <td style={{ padding: 6 }}>TOTAL</td>
                    <td style={{ padding: 6, textAlign: 'right', fontFamily: 'monospace' }}>{fmt(totalGastos)}</td>
                    <td style={{ padding: 6, textAlign: 'right' }}>100%</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </div>
      )}
    </InformeLayout>
  );
}

function Kpi({ label, valor, color }: { label: string; valor: string; color: string }) {
  return (
    <div style={{ padding: 14, background: '#fff', border: '1px solid #e5e7eb', borderRadius: 10, borderLeft: `4px solid ${color}` }}>
      <div style={{ fontSize: 11, color: '#6b7280', textTransform: 'uppercase', fontWeight: 600 }}>{label}</div>
      <div style={{ fontSize: 22, fontWeight: 800, color, fontFamily: 'monospace', marginTop: 4 }}>{valor}</div>
    </div>
  );
}

const card: React.CSSProperties = { background: '#fff', border: '1px solid #e5e7eb', borderRadius: 10, padding: 14, marginBottom: 12 };
const cardTitle: React.CSSProperties = { fontSize: 13, fontWeight: 700, marginBottom: 10, color: '#374151' };
