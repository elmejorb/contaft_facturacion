import { useState, useEffect, useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { InformeLayout, fmt } from './InformeLayout';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

const API = 'http://localhost:80/conta-app-backend/api/informes/resumen.php';

// Paleta consistente por año — el frontend asigna en orden.
const COLORES = ['#7c3aed', '#2563eb', '#16a34a', '#d97706', '#dc2626', '#0891b2'];

/**
 * Comparativo anual — superpone las ventas mensuales de varios años en un
 * mismo gráfico de líneas + tabla resumen con variación año/año.
 * Backend: ?tipo=comparativo_anual&anios=2024,2025,2026 (default: últimos 3).
 */
export function InformeComparativoAnual() {
  const [aniosDisp, setAniosDisp] = useState<number[]>([]);
  const [aniosSel, setAniosSel] = useState<number[]>([]);
  const [porAnio, setPorAnio] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const cargar = async () => {
    setLoading(true);
    try {
      const url = aniosSel.length > 0
        ? `${API}?tipo=comparativo_anual&anios=${aniosSel.join(',')}`
        : `${API}?tipo=comparativo_anual`;
      const r = await fetch(url);
      const d = await r.json();
      if (d.success) {
        setAniosDisp(d.anios_disponibles || []);
        setPorAnio(d.por_anio || []);
        if (aniosSel.length === 0) setAniosSel(d.anios_analizados || []);
      }
    } catch (e) { /* ignored */ }
    setLoading(false);
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { cargar(); }, [aniosSel.join(',')]);

  // Transformar datos: [{mes: 'Ene', '2024': N, '2025': N, ...}, ...]
  const chartData = useMemo(() => {
    const meses = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
    return meses.map((mes, i) => {
      const fila: any = { mes };
      porAnio.forEach(y => { fila[String(y.anio)] = y.meses[i]?.total || 0; });
      return fila;
    });
  }, [porAnio]);

  const toggleAnio = (a: number) => {
    setAniosSel(prev => prev.includes(a)
      ? prev.filter(x => x !== a)
      : [...prev, a].sort()
    );
  };

  // Tabla resumen con variación vs año anterior
  const filasResumen = useMemo(() => {
    return porAnio.map((y, idx) => {
      const anterior = porAnio[idx - 1];
      const varAbs = anterior ? y.total - anterior.total : 0;
      const varPct = anterior && anterior.total > 0 ? (varAbs / anterior.total) * 100 : 0;
      return { ...y, varAbs, varPct, tieneAnterior: !!anterior };
    });
  }, [porAnio]);

  const card: React.CSSProperties = { background: '#fff', borderRadius: 12, padding: 18, boxShadow: '0 1px 3px rgba(0,0,0,0.08)', marginBottom: 16 };
  const cardTitle: React.CSSProperties = { fontSize: 14, fontWeight: 700, marginBottom: 10, color: '#1f2937' };

  return (
    <InformeLayout
      titulo="Comparativo Anual"
      subtitulo={aniosSel.length > 0 ? `Comparando ${aniosSel.join(' · ')}` : 'Seleccione años'}
      onRefresh={cargar} loading={loading}
      filtros={
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 11, color: '#6b7280', marginRight: 4 }}>AÑOS:</span>
          {aniosDisp.map((a, i) => {
            const activo = aniosSel.includes(a);
            const color = activo ? COLORES[aniosSel.indexOf(a) % COLORES.length] : '#e5e7eb';
            return (
              <button key={a} onClick={() => toggleAnio(a)}
                style={{
                  height: 30, padding: '0 12px', borderRadius: 6, fontSize: 12,
                  fontWeight: 700, cursor: 'pointer',
                  background: activo ? color : '#fff',
                  color: activo ? '#fff' : '#6b7280',
                  border: `1.5px solid ${activo ? color : '#e5e7eb'}`,
                  transition: 'all 0.12s',
                }}>
                {a}
              </button>
            );
          })}
        </div>
      }
    >
      {/* KPIs por año */}
      <div style={{ display: 'grid', gridTemplateColumns: `repeat(${Math.max(porAnio.length, 1)}, 1fr)`, gap: 10, marginBottom: 16 }}>
        {porAnio.map((y, i) => {
          const color = COLORES[i % COLORES.length];
          return (
            <div key={y.anio} style={{ ...card, marginBottom: 0, borderTop: `3px solid ${color}` }}>
              <div style={{ fontSize: 11, color: '#6b7280', fontWeight: 700, textTransform: 'uppercase' }}>Año {y.anio}</div>
              <div style={{ fontSize: 20, fontWeight: 800, color, marginTop: 4 }}>{fmt(y.total)}</div>
              <div style={{ fontSize: 10, color: '#6b7280', marginTop: 6 }}>
                Promedio mensual: <b style={{ color: '#374151' }}>{fmt(y.promedio_mes)}</b>
              </div>
              <div style={{ fontSize: 10, color: '#6b7280' }}>
                Meses con ventas: <b style={{ color: '#374151' }}>{y.meses_activos}</b>
              </div>
              {y.mejor_mes && (
                <div style={{ fontSize: 10, color: '#6b7280', marginTop: 4 }}>
                  Mejor mes: <b style={{ color: '#374151' }}>{y.mejor_mes.nombre}</b> ({fmt(y.mejor_mes.total)})
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Gráfico de líneas superpuestas */}
      <div style={card}>
        <div style={cardTitle}>Ventas mensuales — comparativo</div>
        {porAnio.length === 0 ? (
          <div style={{ textAlign: 'center', color: '#9ca3af', padding: 40 }}>Seleccione al menos un año</div>
        ) : (
          <ResponsiveContainer width="100%" height={340}>
            <LineChart data={chartData} margin={{ top: 5, right: 20, bottom: 5, left: 60 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="mes" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 10 }} tickFormatter={(v: number) => fmt(v)} />
              <Tooltip formatter={(v: any) => fmt(Number(v))}
                contentStyle={{ background: '#fff', border: '1px solid #d1d5db', borderRadius: 8, fontSize: 12 }} />
              <Legend />
              {porAnio.map((y, i) => (
                <Line key={y.anio} type="monotone" dataKey={String(y.anio)}
                      stroke={COLORES[i % COLORES.length]} strokeWidth={2.5}
                      dot={{ r: 3 }} activeDot={{ r: 5 }} />
              ))}
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Tabla comparativa */}
      <div style={card}>
        <div style={cardTitle}>Resumen · variación vs año anterior</div>
        {porAnio.length === 0 ? null : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
            <thead>
              <tr style={{ background: '#f9fafb' }}>
                <th style={{ padding: '8px 10px', textAlign: 'left', fontSize: 10, color: '#6b7280', textTransform: 'uppercase', fontWeight: 700 }}>Año</th>
                <th style={{ padding: '8px 10px', textAlign: 'right', fontSize: 10, color: '#6b7280', textTransform: 'uppercase', fontWeight: 700 }}>Total ventas</th>
                <th style={{ padding: '8px 10px', textAlign: 'right', fontSize: 10, color: '#6b7280', textTransform: 'uppercase', fontWeight: 700 }}>Promedio mes</th>
                <th style={{ padding: '8px 10px', textAlign: 'center', fontSize: 10, color: '#6b7280', textTransform: 'uppercase', fontWeight: 700 }}>Mejor mes</th>
                <th style={{ padding: '8px 10px', textAlign: 'right', fontSize: 10, color: '#6b7280', textTransform: 'uppercase', fontWeight: 700 }}>Variación</th>
              </tr>
            </thead>
            <tbody>
              {filasResumen.map((y, i) => {
                const color = COLORES[i % COLORES.length];
                const positivo = y.varAbs > 0, negativo = y.varAbs < 0;
                const Icon = positivo ? TrendingUp : negativo ? TrendingDown : Minus;
                const colorVar = positivo ? '#16a34a' : negativo ? '#dc2626' : '#6b7280';
                return (
                  <tr key={y.anio} style={{ borderBottom: '1px solid #f3f4f6' }}>
                    <td style={{ padding: '10px', fontWeight: 700, color }}>{y.anio}</td>
                    <td style={{ padding: '10px', textAlign: 'right', fontWeight: 700 }}>{fmt(y.total)}</td>
                    <td style={{ padding: '10px', textAlign: 'right' }}>{fmt(y.promedio_mes)}</td>
                    <td style={{ padding: '10px', textAlign: 'center' }}>
                      {y.mejor_mes ? `${y.mejor_mes.nombre} · ${fmt(y.mejor_mes.total)}` : '-'}
                    </td>
                    <td style={{ padding: '10px', textAlign: 'right' }}>
                      {y.tieneAnterior ? (
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: colorVar, fontWeight: 700 }}>
                          <Icon size={13} />
                          {positivo ? '+' : ''}{fmt(y.varAbs)}
                          <span style={{ fontSize: 10, color: colorVar, marginLeft: 4 }}>
                            ({positivo ? '+' : ''}{y.varPct.toFixed(1)}%)
                          </span>
                        </span>
                      ) : <span style={{ color: '#9ca3af' }}>—</span>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </InformeLayout>
  );
}
