import { useState, useEffect } from 'react';
import { InformeLayout, fmt } from './InformeLayout';
import { TrendingUp, TrendingDown, Wallet, Package, AlertTriangle, Info, DollarSign } from 'lucide-react';

const API = 'http://localhost:80/conta-app-backend/api/informes/resumen.php';
const MESES = ['', 'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

/**
 * Panel Gerencial "Mi Negocio en 1 vista"
 * Responde la pregunta del dueño: ¿cómo va el negocio?
 */
export function PanelGerencial() {
  const [anio, setAnio] = useState(new Date().getFullYear());
  const [mes, setMes] = useState(new Date().getMonth() + 1);
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const cargar = async () => {
    setLoading(true);
    setError(null);
    try {
      const r = await fetch(`${API}?tipo=panel_gerencial&anio=${anio}&mes=${mes}`);
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const d = await r.json();
      if (d.success) setData(d);
      else throw new Error(d.message || 'El servidor rechazó la consulta');
    } catch (e: any) {
      setError(e?.message || String(e));
      setData(null);
    }
    setLoading(false);
  };

  useEffect(() => { cargar(); }, [anio, mes]);

  const pyg = data?.pyg;
  const pat = data?.patrimonio;
  const kpi = data?.kpis;
  const alertas = data?.alertas || [];

  const Delta = ({ pct }: { pct: number | null }) => {
    if (pct === null || pct === undefined) return null;
    const Icon = pct >= 0 ? TrendingUp : TrendingDown;
    const color = pct >= 0 ? '#16a34a' : '#dc2626';
    return (
      <span style={{ color, fontSize: 11, fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 3, marginLeft: 6 }}>
        <Icon size={11} /> {pct >= 0 ? '+' : ''}{pct}%
      </span>
    );
  };

  return (
    <InformeLayout
      titulo="Panel Gerencial"
      subtitulo={`${MESES[mes]} de ${anio} · ¿Cómo va el negocio?`}
      onRefresh={cargar} loading={loading}
      filtros={
        <>
          <label style={{ fontSize: 12, fontWeight: 600 }}>Mes:</label>
          <select value={mes} onChange={e => setMes(parseInt(e.target.value))}
            style={{ height: 30, border: '1px solid #d1d5db', borderRadius: 6, padding: '0 8px', fontSize: 13 }}>
            {MESES.slice(1).map((m, i) => <option key={i + 1} value={i + 1}>{m}</option>)}
          </select>
          <label style={{ fontSize: 12, fontWeight: 600 }}>Año:</label>
          <select value={anio} onChange={e => setAnio(parseInt(e.target.value))}
            style={{ height: 30, border: '1px solid #d1d5db', borderRadius: 6, padding: '0 8px', fontSize: 13 }}>
            {[anio + 1, anio, anio - 1, anio - 2].map(a => <option key={a} value={a}>{a}</option>)}
          </select>
        </>
      }>
      {error ? (
        <div style={errBox}>
          <b>Error al cargar el informe:</b> {error}
        </div>
      ) : !data ? (
        <div style={{ padding: 30, textAlign: 'center', color: '#999' }}>Cargando...</div>
      ) : (
        <>
          {/* BLOQUE 1 — P&G del mes */}
          <div style={seccion}><DollarSign size={14} style={{ verticalAlign: 'middle', marginRight: 4 }} />RESULTADO DEL MES</div>
          <table style={tableStyle}>
            <tbody>
              <tr>
                <td style={td}>Ventas ({pyg.ventas_num_fact} facturas)</td>
                <td style={tdNum}>
                  {fmt(pyg.ventas)}
                  <Delta pct={pyg.ventas_pct_vs_ant} />
                </td>
              </tr>
              <tr>
                <td style={td}>(–) Costo de mercancía vendida</td>
                <td style={{ ...tdNum, color: '#dc2626' }}>-{fmt(pyg.costo)}</td>
              </tr>
              <tr style={{ background: '#f0f9ff', borderTop: '1px solid #0284c7', borderBottom: '1px solid #0284c7' }}>
                <td style={tdSub}>═ UTILIDAD BRUTA</td>
                <td style={{ ...tdNum, fontWeight: 700, color: '#0284c7' }}>
                  {fmt(pyg.utilidad_bruta)} <span style={{ fontSize: 11, color: '#666', marginLeft: 4 }}>({pyg.margen_bruto_pct}%)</span>
                </td>
              </tr>
              <tr>
                <td style={td}>(–) Gastos operacionales</td>
                <td style={{ ...tdNum, color: '#dc2626' }}>-{fmt(pyg.gastos)}</td>
              </tr>
              <tr style={{
                background: pyg.utilidad_neta >= 0 ? '#dcfce7' : '#fee2e2',
                borderTop: '2px solid #000', borderBottom: '2px solid #000',
              }}>
                <td style={tdTotal}>═ UTILIDAD DEL MES</td>
                <td style={{ ...tdNum, fontWeight: 700, fontSize: 16, color: pyg.utilidad_neta >= 0 ? '#16a34a' : '#dc2626' }}>
                  {fmt(pyg.utilidad_neta)}
                  <span style={{ fontSize: 11, color: '#666', marginLeft: 4 }}>({pyg.margen_neto_pct}%)</span>
                  <Delta pct={pyg.utilidad_neta_pct_vs_ant} />
                </td>
              </tr>
            </tbody>
          </table>

          {/* BLOQUE 2 — PATRIMONIO */}
          <div style={seccion}><Wallet size={14} style={{ verticalAlign: 'middle', marginRight: 4 }} />¿CUÁNTO VALE EL NEGOCIO HOY?</div>
          <table style={tableStyle}>
            <tbody>
              <tr><td style={td}>Caja (efectivo acumulado)</td><td style={tdNum}>{fmt(pat.caja)}</td></tr>
              <tr><td style={td}>Bancos</td><td style={tdNum}>{fmt(pat.bancos)}</td></tr>
              <tr><td style={td}>Inventario (al costo)</td><td style={tdNum}>{fmt(pat.inventario)}</td></tr>
              <tr><td style={td}>Cartera (clientes me deben)</td><td style={tdNum}>{fmt(pat.cartera)}</td></tr>
              <tr><td style={td}>(–) Debo a proveedores</td><td style={{ ...tdNum, color: '#dc2626' }}>-{fmt(pat.deuda_proveedores)}</td></tr>
              <tr style={{ background: '#dcfce7', borderTop: '2px solid #000' }}>
                <td style={tdTotal}>═ PATRIMONIO NETO</td>
                <td style={{ ...tdNum, fontWeight: 700, fontSize: 16, color: '#16a34a' }}>{fmt(pat.total)}</td>
              </tr>
            </tbody>
          </table>

          {/* BLOQUE 3 — KPIs */}
          <div style={seccion}><Package size={14} style={{ verticalAlign: 'middle', marginRight: 4 }} />INDICADORES DE SALUD DEL NEGOCIO</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 10 }}>
            <Kpi label="Margen bruto" valor={`${kpi.margen_bruto_pct}%`} comentario={kpi.margen_bruto_pct < 20 ? 'Bajo — revisar costos' : kpi.margen_bruto_pct < 35 ? 'Sano' : 'Excelente'} tono={kpi.margen_bruto_pct < 20 ? 'amber' : 'green'} />
            <Kpi label="Margen neto" valor={`${kpi.margen_neto_pct}%`} comentario={kpi.margen_neto_pct <= 0 ? 'Pérdida' : kpi.margen_neto_pct < 5 ? 'Ajustado' : 'Sano'} tono={kpi.margen_neto_pct <= 0 ? 'red' : kpi.margen_neto_pct < 5 ? 'amber' : 'green'} />
            <Kpi label="Rotación inventario" valor={`${kpi.rotacion_inventario}×/mes`} comentario={kpi.rotacion_inventario < 1 ? 'Lento' : 'Normal'} tono={kpi.rotacion_inventario < 1 ? 'amber' : 'green'} />
            <Kpi label="Días en cartera" valor={`${kpi.dias_cartera} días`} comentario={kpi.dias_cartera > 60 ? 'Alto' : kpi.dias_cartera > 30 ? 'Normal' : 'Rápido'} tono={kpi.dias_cartera > 60 ? 'amber' : 'green'} />
            <Kpi label="Crecimiento 3 meses" valor={kpi.crecimiento_3m_pct !== null ? `${kpi.crecimiento_3m_pct > 0 ? '+' : ''}${kpi.crecimiento_3m_pct}%` : 'N/D'} comentario={kpi.crecimiento_3m_pct > 0 ? 'Creciendo' : kpi.crecimiento_3m_pct < 0 ? 'Decreciendo' : 'Estable'} tono={kpi.crecimiento_3m_pct > 0 ? 'green' : kpi.crecimiento_3m_pct < 0 ? 'red' : 'gray'} />
          </div>

          {/* BLOQUE 4 — ALERTAS */}
          {alertas.length > 0 && (
            <>
              <div style={seccion}><AlertTriangle size={14} style={{ verticalAlign: 'middle', marginRight: 4 }} />ALERTAS Y RECOMENDACIONES</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {alertas.map((a: any, i: number) => (
                  <div key={i} style={{
                    display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px',
                    background: a.nivel === 'warning' ? '#fef3c7' : '#dbeafe',
                    border: `1px solid ${a.nivel === 'warning' ? '#f59e0b' : '#3b82f6'}`,
                    borderRadius: 6, fontSize: 13,
                  }}>
                    {a.nivel === 'warning' ? <AlertTriangle size={14} color="#b45309" /> : <Info size={14} color="#1e40af" />}
                    <span style={{ flex: 1 }}>{a.mensaje}</span>
                    {a.valor !== null && <b style={{ color: a.nivel === 'warning' ? '#b45309' : '#1e40af' }}>{fmt(a.valor)}</b>}
                  </div>
                ))}
              </div>
            </>
          )}
        </>
      )}
    </InformeLayout>
  );
}

function Kpi({ label, valor, comentario, tono }: { label: string; valor: string; comentario: string; tono: 'green' | 'amber' | 'red' | 'gray' }) {
  const colors = {
    green: { bg: '#dcfce7', text: '#166534', border: '#16a34a' },
    amber: { bg: '#fef3c7', text: '#92400e', border: '#f59e0b' },
    red:   { bg: '#fee2e2', text: '#991b1b', border: '#dc2626' },
    gray:  { bg: '#f3f4f6', text: '#374151', border: '#9ca3af' },
  }[tono];
  return (
    <div style={{ background: colors.bg, border: `1px solid ${colors.border}`, borderRadius: 8, padding: 10 }}>
      <div style={{ fontSize: 10, color: colors.text, fontWeight: 700, textTransform: 'uppercase' }}>{label}</div>
      <div style={{ fontSize: 20, fontWeight: 800, color: colors.text, marginTop: 2 }}>{valor}</div>
      <div style={{ fontSize: 10, color: colors.text, opacity: 0.75, marginTop: 2 }}>{comentario}</div>
    </div>
  );
}

const seccion: React.CSSProperties = { fontSize: 12, fontWeight: 700, background: '#e5e7eb', padding: '6px 10px', margin: '14px 0 6px', borderLeft: '4px solid #7c3aed' };
const tableStyle: React.CSSProperties = { width: '100%', borderCollapse: 'collapse', fontSize: 13 };
const td: React.CSSProperties = { padding: '7px 10px', borderBottom: '1px solid #e5e7eb' };
const tdNum: React.CSSProperties = { padding: '7px 10px', borderBottom: '1px solid #e5e7eb', textAlign: 'right', fontFamily: 'monospace' };
const tdSub: React.CSSProperties = { padding: '8px 10px', borderBottom: '1px solid #d1d5db', fontWeight: 700 };
const tdTotal: React.CSSProperties = { padding: '10px', fontWeight: 700, textTransform: 'uppercase' };
const errBox: React.CSSProperties = { padding: 15, background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 6, color: '#b91c1c', fontSize: 13 };
