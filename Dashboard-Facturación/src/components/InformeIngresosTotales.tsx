import { useState, useEffect, useMemo } from 'react';
import { TrendingUp, Download, Printer, Calendar, DollarSign, CreditCard, Wallet, Receipt } from 'lucide-react';
import toast from 'react-hot-toast';

const API = 'http://localhost:80/conta-app-backend/api/informes/ingresos-totales.php';

const fmtMon = (v: number) => '$ ' + Math.round(v || 0).toLocaleString('es-CO');
const hoyIso = () => new Date().toISOString().slice(0, 10);
const inicioMesIso = () => { const d = new Date(); d.setDate(1); return d.toISOString().slice(0, 10); };
const inicioAnioIso = () => { const d = new Date(); return `${d.getFullYear()}-01-01`; };

type Agr = 'dia' | 'mes';

interface Fila {
  periodo: string;
  v_contado: number;
  v_credito: number;
  pagos_cartera: number;
  retenciones: number;
  ingreso_real: number;
  devengado: number;
  n_ventas: number;
  n_pagos: number;
  n_ret: number;
}

const fmtPeriodo = (p: string, agr: Agr) => {
  if (agr === 'mes') {
    const [y, m] = p.split('-');
    const nombres = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
    return `${nombres[parseInt(m) - 1]} ${y}`;
  }
  const d = new Date(p);
  return d.toLocaleDateString('es-CO', { day: '2-digit', month: 'short' });
};

export function InformeIngresosTotales() {
  const [agr, setAgr] = useState<Agr>('mes');
  const [desde, setDesde] = useState(inicioAnioIso());
  const [hasta, setHasta] = useState(hoyIso());
  const [data, setData] = useState<{ filas: Fila[]; totales: any } | null>(null);
  const [loading, setLoading] = useState(false);

  const cargar = async () => {
    setLoading(true);
    try {
      const r = await fetch(`${API}?desde=${desde}&hasta=${hasta}&agrupacion=${agr}`);
      const d = await r.json();
      if (d.success) setData(d);
      else toast.error(d.message || 'Error');
    } catch { toast.error('Error de red'); }
    setLoading(false);
  };

  useEffect(() => { cargar(); }, [agr]);

  const exportCsv = () => {
    if (!data?.filas?.length) return;
    const header = ['Periodo', 'Ventas Contado', 'Ventas Crédito', 'Pagos Cartera', 'Retenciones', 'Ingreso Real', 'Devengado', 'N° Ventas', 'N° Pagos'];
    const rows = data.filas.map((f: Fila) => [
      f.periodo, f.v_contado, f.v_credito, f.pagos_cartera, f.retenciones, f.ingreso_real, f.devengado, f.n_ventas, f.n_pagos
    ]);
    const csv = [header, ...rows].map(line => line.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `ingresos_${agr}_${desde}_${hasta}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  // Para el mini-gráfico de barras
  const maxReal = useMemo(() => {
    if (!data?.filas) return 1;
    return Math.max(1, ...data.filas.map(f => f.ingreso_real));
  }, [data]);

  const t = data?.totales || {};

  return (
    <div style={{ padding: '12px 20px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
        <TrendingUp size={22} color="#16a34a" />
        <div>
          <h2 style={{ fontSize: 18, fontWeight: 700, margin: 0 }}>Ingresos Totales por Período</h2>
          <div style={{ fontSize: 11, color: '#6b7280', marginTop: 2 }}>
            Suma de todos los ingresos agrupados por día o mes: ventas contado + crédito + cobros de cartera + retenciones recibidas.
          </div>
        </div>
      </div>

      {/* Filtros */}
      <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 10, padding: 12, marginBottom: 14, display: 'flex', gap: 12, alignItems: 'end', flexWrap: 'wrap' }}>
        <div>
          <label style={{ fontSize: 10, color: '#6b7280', display: 'block', marginBottom: 2 }}>AGRUPAR POR</label>
          <div style={{ display: 'flex', gap: 2, background: '#f3f4f6', borderRadius: 8, padding: 2 }}>
            {(['dia', 'mes'] as Agr[]).map(a => (
              <button key={a} onClick={() => setAgr(a)}
                style={{ height: 28, padding: '0 14px', background: agr === a ? '#16a34a' : 'transparent', color: agr === a ? '#fff' : '#374151', border: 'none', borderRadius: 6, fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>
                {a === 'dia' ? 'Día' : 'Mes'}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label style={{ fontSize: 10, color: '#6b7280', display: 'block', marginBottom: 2 }}><Calendar size={10} style={{ verticalAlign: -1 }} /> DESDE</label>
          <input type="date" value={desde} onChange={e => setDesde(e.target.value)}
            style={{ height: 32, border: '1px solid #d1d5db', borderRadius: 6, padding: '0 8px', fontSize: 12 }} />
        </div>
        <div>
          <label style={{ fontSize: 10, color: '#6b7280', display: 'block', marginBottom: 2 }}><Calendar size={10} style={{ verticalAlign: -1 }} /> HASTA</label>
          <input type="date" value={hasta} onChange={e => setHasta(e.target.value)}
            style={{ height: 32, border: '1px solid #d1d5db', borderRadius: 6, padding: '0 8px', fontSize: 12 }} />
        </div>
        <button onClick={cargar} disabled={loading}
          style={{ height: 32, padding: '0 14px', background: '#16a34a', color: '#fff', border: 'none', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
          {loading ? 'Cargando…' : 'Consultar'}
        </button>
        <div style={{ flex: 1 }} />
        <div style={{ display: 'flex', gap: 6 }}>
          <button onClick={() => { setDesde(inicioMesIso()); setHasta(hoyIso()); setAgr('dia'); }}
            style={{ height: 28, padding: '0 10px', background: '#f3f4f6', color: '#374151', border: '1px solid #e5e7eb', borderRadius: 6, fontSize: 11, cursor: 'pointer' }}>Este mes</button>
          <button onClick={() => { setDesde(inicioAnioIso()); setHasta(hoyIso()); setAgr('mes'); }}
            style={{ height: 28, padding: '0 10px', background: '#f3f4f6', color: '#374151', border: '1px solid #e5e7eb', borderRadius: 6, fontSize: 11, cursor: 'pointer' }}>Este año</button>
        </div>
        <button onClick={() => window.print()} title="Imprimir"
          style={{ height: 32, padding: '0 12px', background: '#fff', color: '#374151', border: '1px solid #d1d5db', borderRadius: 8, fontSize: 12, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5 }}>
          <Printer size={13} /> Imprimir
        </button>
        <button onClick={exportCsv} disabled={!data?.filas?.length}
          style={{ height: 32, padding: '0 12px', background: '#16a34a', color: '#fff', border: 'none', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5, opacity: !data?.filas?.length ? 0.5 : 1 }}>
          <Download size={13} /> CSV
        </button>
      </div>

      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 10, marginBottom: 14 }}>
        <KPI color="#2563eb" bg="#dbeafe" icon={DollarSign} label="VENTAS CONTADO" valor={t.v_contado} />
        <KPI color="#d97706" bg="#fef3c7" icon={CreditCard} label="VENTAS CRÉDITO" valor={t.v_credito} />
        <KPI color="#16a34a" bg="#dcfce7" icon={Wallet} label="PAGOS CARTERA" valor={t.pagos} />
        <KPI color="#dc2626" bg="#fee2e2" icon={Receipt} label="RETENCIONES" valor={t.retenciones} />
        <div style={{ background: '#111827', color: '#fff', borderRadius: 10, padding: 12 }}>
          <div style={{ fontSize: 10, fontWeight: 700, opacity: 0.75, letterSpacing: 0.5 }}>INGRESO REAL</div>
          <div style={{ fontSize: 20, fontWeight: 800, marginTop: 3 }}>{fmtMon(t.ingreso_real)}</div>
          <div style={{ fontSize: 10, opacity: 0.7, marginTop: 2 }}>Contado + Cobros + Retenciones</div>
        </div>
        <div style={{ background: '#4c1d95', color: '#fff', borderRadius: 10, padding: 12 }}>
          <div style={{ fontSize: 10, fontWeight: 700, opacity: 0.75, letterSpacing: 0.5 }}>DEVENGADO</div>
          <div style={{ fontSize: 20, fontWeight: 800, marginTop: 3 }}>{fmtMon(t.devengado)}</div>
          <div style={{ fontSize: 10, opacity: 0.7, marginTop: 2 }}>Base IVA / Formulario DIAN</div>
        </div>
      </div>

      {/* Gráfico de barras simple */}
      {data?.filas?.length ? (
        <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 10, padding: 14, marginBottom: 14 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: '#374151', marginBottom: 10 }}>Ingreso Real por Período</div>
          <div style={{ display: 'flex', alignItems: 'end', gap: 4, height: 180, borderBottom: '1px solid #e5e7eb', paddingBottom: 4 }}>
            {data.filas.map((f, i) => {
              const alto = Math.max(2, (f.ingreso_real / maxReal) * 160);
              return (
                <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
                  <div style={{ fontSize: 9, color: '#6b7280' }}>{fmtMon(f.ingreso_real).replace('$', '').trim()}</div>
                  <div title={fmtMon(f.ingreso_real)}
                    style={{ width: '85%', height: alto, background: 'linear-gradient(180deg, #16a34a 0%, #15803d 100%)', borderRadius: '4px 4px 0 0', transition: 'all 0.2s' }} />
                  <div style={{ fontSize: 9, color: '#374151', fontWeight: 600, transform: data.filas.length > 20 ? 'rotate(-45deg)' : undefined, whiteSpace: 'nowrap' }}>
                    {fmtPeriodo(f.periodo, agr)}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : null}

      {/* Tabla detalle */}
      <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 10, overflow: 'hidden' }}>
        <div style={{ padding: '10px 14px', background: '#f9fafb', borderBottom: '1px solid #e5e7eb', fontSize: 12, fontWeight: 700 }}>
          Detalle por {agr === 'mes' ? 'mes' : 'día'} ({data?.filas?.length || 0})
        </div>
        {!data?.filas?.length ? (
          <div style={{ padding: 40, textAlign: 'center', color: '#9ca3af', fontSize: 13 }}>
            Sin movimientos en el período seleccionado
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
            <thead style={{ background: '#f9fafb' }}>
              <tr>
                <th style={{ padding: '8px 10px', textAlign: 'left' }}>Período</th>
                <th style={{ padding: '8px 10px', textAlign: 'right' }}>Contado</th>
                <th style={{ padding: '8px 10px', textAlign: 'right' }}>Crédito</th>
                <th style={{ padding: '8px 10px', textAlign: 'right' }}>Pagos Cartera</th>
                <th style={{ padding: '8px 10px', textAlign: 'right' }}>Retenciones</th>
                <th style={{ padding: '8px 10px', textAlign: 'right', borderLeft: '2px solid #e5e7eb' }}>Ingreso Real</th>
                <th style={{ padding: '8px 10px', textAlign: 'right' }}>Devengado</th>
                <th style={{ padding: '8px 10px', textAlign: 'center' }}>Mov.</th>
              </tr>
            </thead>
            <tbody>
              {data.filas.map((f: Fila, i: number) => (
                <tr key={i} style={{ borderTop: '1px solid #f3f4f6' }}>
                  <td style={{ padding: '7px 10px', fontWeight: 600 }}>{fmtPeriodo(f.periodo, agr)}</td>
                  <td style={{ padding: '7px 10px', textAlign: 'right' }}>{fmtMon(f.v_contado)}</td>
                  <td style={{ padding: '7px 10px', textAlign: 'right', color: '#d97706' }}>{fmtMon(f.v_credito)}</td>
                  <td style={{ padding: '7px 10px', textAlign: 'right', color: '#16a34a' }}>{fmtMon(f.pagos_cartera)}</td>
                  <td style={{ padding: '7px 10px', textAlign: 'right', color: '#dc2626' }}>{fmtMon(f.retenciones)}</td>
                  <td style={{ padding: '7px 10px', textAlign: 'right', fontWeight: 700, borderLeft: '2px solid #e5e7eb', background: '#f9fafb' }}>{fmtMon(f.ingreso_real)}</td>
                  <td style={{ padding: '7px 10px', textAlign: 'right', color: '#6b7280' }}>{fmtMon(f.devengado)}</td>
                  <td style={{ padding: '7px 10px', textAlign: 'center', color: '#9ca3af', fontSize: 10 }}>
                    {f.n_ventas}v · {f.n_pagos}p{f.n_ret ? ` · ${f.n_ret}r` : ''}
                  </td>
                </tr>
              ))}
              {/* Totales */}
              <tr style={{ borderTop: '2px solid #111827', background: '#f9fafb', fontWeight: 700 }}>
                <td style={{ padding: '10px' }}>TOTAL</td>
                <td style={{ padding: '10px', textAlign: 'right' }}>{fmtMon(t.v_contado)}</td>
                <td style={{ padding: '10px', textAlign: 'right', color: '#d97706' }}>{fmtMon(t.v_credito)}</td>
                <td style={{ padding: '10px', textAlign: 'right', color: '#16a34a' }}>{fmtMon(t.pagos)}</td>
                <td style={{ padding: '10px', textAlign: 'right', color: '#dc2626' }}>{fmtMon(t.retenciones)}</td>
                <td style={{ padding: '10px', textAlign: 'right', borderLeft: '2px solid #e5e7eb', background: '#111827', color: '#fff' }}>{fmtMon(t.ingreso_real)}</td>
                <td style={{ padding: '10px', textAlign: 'right', color: '#6b7280' }}>{fmtMon(t.devengado)}</td>
                <td style={{ padding: '10px', textAlign: 'center', color: '#6b7280', fontSize: 10 }}>
                  {t.n_ventas}v · {t.n_pagos}p{t.n_ret ? ` · ${t.n_ret}r` : ''}
                </td>
              </tr>
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

function KPI({ color, bg, icon: Icon, label, valor }: { color: string; bg: string; icon: any; label: string; valor: number }) {
  return (
    <div style={{ background: bg, border: `1px solid ${color}44`, borderRadius: 10, padding: 12 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <Icon size={13} color={color} />
        <span style={{ fontSize: 10, fontWeight: 700, color, letterSpacing: 0.5 }}>{label}</span>
      </div>
      <div style={{ fontSize: 17, fontWeight: 800, color, marginTop: 3 }}>{fmtMon(valor || 0)}</div>
    </div>
  );
}
