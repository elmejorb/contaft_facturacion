import { useState, useEffect } from 'react';
import { Receipt, Download, Printer, Calendar } from 'lucide-react';
import toast from 'react-hot-toast';

const API = 'http://localhost:80/conta-app-backend/api/retenciones/informe.php';

const fmtMon = (v: number) => '$ ' + Math.round(v || 0).toLocaleString('es-CO');
const fmtFecha = (s: string) => new Date(s).toLocaleDateString('es-CO');

const hoyIso = () => new Date().toISOString().slice(0, 10);
const inicioMesIso = () => { const d = new Date(); d.setDate(1); return d.toISOString().slice(0, 10); };

type DetalleRet = {
  id: number;
  concepto_label: string;
  tipo_codigo: string;
  base: number;
  tarifa: number;
  monto: number;
  Fecha: string;
  recibo?: number;
  factura?: number | string;
  cliente_nombre?: string;
  cliente_nit?: string;
  origen: 'abono' | 'contado';
};

export function InformeRetencionesRecibidas() {
  const [desde, setDesde] = useState(inicioMesIso());
  const [hasta, setHasta] = useState(hoyIso());
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const cargar = async () => {
    setLoading(true);
    try {
      const r = await fetch(`${API}?desde=${desde}&hasta=${hasta}`);
      const d = await r.json();
      if (d.success) setData(d);
      else toast.error(d.message || 'Error');
    } catch { toast.error('Error de red'); }
    setLoading(false);
  };

  useEffect(() => { cargar(); }, []);

  const exportCsv = () => {
    if (!data?.detalle?.length) return;
    const header = ['Fecha', 'Tipo', 'Concepto', 'Cliente', 'NIT', 'Factura/Recibo', 'Base', 'Tarifa %', 'Monto'];
    const rows = data.detalle.map((r: DetalleRet) => [
      r.Fecha, r.tipo_codigo === '05' ? 'ReteIVA' : r.tipo_codigo === '07' ? 'ReteICA' : 'ReteFuente',
      r.concepto_label, r.cliente_nombre || '-', r.cliente_nit || '-',
      r.recibo ? 'Rec ' + r.recibo : (r.factura || '-'),
      r.base, r.tarifa, r.monto
    ]);
    const csv = [header, ...rows].map(line => line.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `retenciones_${desde}_${hasta}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  const tipos = ['06', '05', '07'] as const;
  const tipoLabel = (t: string) => t === '05' ? 'ReteIVA' : t === '07' ? 'ReteICA' : 'ReteFuente';
  const tipoColor = (t: string) => t === '05' ? '#2563eb' : t === '07' ? '#d97706' : '#7c3aed';
  const tipoBg = (t: string) => t === '05' ? '#dbeafe' : t === '07' ? '#fef3c7' : '#f3e8ff';

  return (
    <div style={{ padding: '12px 20px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
        <Receipt size={22} color="#7c3aed" />
        <div>
          <h2 style={{ fontSize: 18, fontWeight: 700, margin: 0 }}>Retenciones Recibidas</h2>
          <div style={{ fontSize: 11, color: '#6b7280', marginTop: 2 }}>
            Base para el Formulario 350 (DIAN) o la imputación al Anticipo del Simple. Muestra las retenciones que clientes te aplicaron al pagar.
          </div>
        </div>
      </div>

      {/* Filtros */}
      <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 10, padding: 12, marginBottom: 14, display: 'flex', gap: 12, alignItems: 'end', flexWrap: 'wrap' }}>
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
          style={{ height: 32, padding: '0 14px', background: '#7c3aed', color: '#fff', border: 'none', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
          {loading ? 'Cargando…' : 'Consultar'}
        </button>
        <div style={{ flex: 1 }} />
        <button onClick={() => window.print()} title="Imprimir"
          style={{ height: 32, padding: '0 12px', background: '#fff', color: '#374151', border: '1px solid #d1d5db', borderRadius: 8, fontSize: 12, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5 }}>
          <Printer size={13} /> Imprimir
        </button>
        <button onClick={exportCsv} disabled={!data?.detalle?.length}
          style={{ height: 32, padding: '0 12px', background: '#16a34a', color: '#fff', border: 'none', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5, opacity: !data?.detalle?.length ? 0.5 : 1 }}>
          <Download size={13} /> Exportar CSV
        </button>
      </div>

      {/* KPIs por tipo */}
      {data && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: 10, marginBottom: 14 }}>
          {tipos.map(t => {
            const info = data.totales?.[t];
            if (!info) return null;
            return (
              <div key={t} style={{ background: tipoBg(t), border: `1px solid ${tipoColor(t)}44`, borderRadius: 10, padding: 12 }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: tipoColor(t), letterSpacing: 0.5 }}>{tipoLabel(t)}</div>
                <div style={{ fontSize: 20, fontWeight: 800, color: tipoColor(t), marginTop: 3 }}>{fmtMon(info.total)}</div>
                <div style={{ fontSize: 10, color: tipoColor(t), opacity: 0.75 }}>{info.count} aplicación(es)</div>
              </div>
            );
          })}
          <div style={{ background: '#111827', color: '#fff', borderRadius: 10, padding: 12 }}>
            <div style={{ fontSize: 10, fontWeight: 700, opacity: 0.7, letterSpacing: 0.5 }}>TOTAL GENERAL</div>
            <div style={{ fontSize: 22, fontWeight: 800, marginTop: 3 }}>{fmtMon(data.total_general || 0)}</div>
            <div style={{ fontSize: 10, opacity: 0.7 }}>Imputable al impuesto / solicitar reintegro</div>
          </div>
        </div>
      )}

      {/* Agrupado por concepto */}
      {data?.por_concepto?.length > 0 && (
        <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 10, overflow: 'hidden', marginBottom: 14 }}>
          <div style={{ padding: '10px 14px', background: '#f9fafb', borderBottom: '1px solid #e5e7eb', fontSize: 12, fontWeight: 700 }}>
            Por concepto (para armar el Formulario 350)
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
            <thead style={{ background: '#f9fafb' }}>
              <tr>
                <th style={{ padding: '8px 12px', textAlign: 'left' }}>Concepto</th>
                <th style={{ padding: '8px 12px', textAlign: 'center' }}>Tipo</th>
                <th style={{ padding: '8px 12px', textAlign: 'right' }}>Cant.</th>
                <th style={{ padding: '8px 12px', textAlign: 'right' }}>Base acumulada</th>
                <th style={{ padding: '8px 12px', textAlign: 'right' }}>Retención total</th>
              </tr>
            </thead>
            <tbody>
              {data.por_concepto.map((c: any, i: number) => (
                <tr key={i} style={{ borderTop: '1px solid #f3f4f6' }}>
                  <td style={{ padding: '7px 12px' }}>{c.concepto_label}</td>
                  <td style={{ padding: '7px 12px', textAlign: 'center' }}>
                    <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 6px', borderRadius: 6, background: tipoBg(c.tipo_codigo), color: tipoColor(c.tipo_codigo) }}>
                      {tipoLabel(c.tipo_codigo)}
                    </span>
                  </td>
                  <td style={{ padding: '7px 12px', textAlign: 'right', color: '#6b7280' }}>{c.cantidad}</td>
                  <td style={{ padding: '7px 12px', textAlign: 'right', color: '#6b7280' }}>{fmtMon(c.base_total)}</td>
                  <td style={{ padding: '7px 12px', textAlign: 'right', fontWeight: 700, color: '#dc2626' }}>{fmtMon(c.monto_total)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Detalle */}
      <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 10, overflow: 'hidden' }}>
        <div style={{ padding: '10px 14px', background: '#f9fafb', borderBottom: '1px solid #e5e7eb', fontSize: 12, fontWeight: 700 }}>
          Detalle ({data?.detalle?.length || 0})
        </div>
        {!data?.detalle?.length ? (
          <div style={{ padding: 40, textAlign: 'center', color: '#9ca3af', fontSize: 13 }}>
            Sin retenciones en el período seleccionado
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
            <thead style={{ background: '#f9fafb' }}>
              <tr>
                <th style={{ padding: '8px 10px', textAlign: 'left' }}>Fecha</th>
                <th style={{ padding: '8px 10px', textAlign: 'left' }}>Tipo</th>
                <th style={{ padding: '8px 10px', textAlign: 'left' }}>Concepto</th>
                <th style={{ padding: '8px 10px', textAlign: 'left' }}>Cliente</th>
                <th style={{ padding: '8px 10px', textAlign: 'left' }}>Documento</th>
                <th style={{ padding: '8px 10px', textAlign: 'right' }}>Base</th>
                <th style={{ padding: '8px 10px', textAlign: 'right' }}>%</th>
                <th style={{ padding: '8px 10px', textAlign: 'right' }}>Monto</th>
              </tr>
            </thead>
            <tbody>
              {data.detalle.map((r: DetalleRet) => (
                <tr key={r.origen + r.id} style={{ borderTop: '1px solid #f3f4f6' }}>
                  <td style={{ padding: '6px 10px' }}>{fmtFecha(r.Fecha)}</td>
                  <td style={{ padding: '6px 10px' }}>
                    <span style={{ fontSize: 9, fontWeight: 700, padding: '2px 5px', borderRadius: 5, background: tipoBg(r.tipo_codigo), color: tipoColor(r.tipo_codigo) }}>
                      {tipoLabel(r.tipo_codigo)}
                    </span>
                  </td>
                  <td style={{ padding: '6px 10px' }}>{r.concepto_label}</td>
                  <td style={{ padding: '6px 10px', color: '#374151' }}>
                    {r.cliente_nombre || '-'}
                    {r.cliente_nit && <div style={{ fontSize: 9, color: '#9ca3af' }}>NIT: {r.cliente_nit}</div>}
                  </td>
                  <td style={{ padding: '6px 10px', color: '#6b7280' }}>
                    {r.recibo ? `Rec #${r.recibo}` : (r.factura ? `Fact ${r.factura}` : '-')}
                    <div style={{ fontSize: 9, color: '#9ca3af' }}>{r.origen}</div>
                  </td>
                  <td style={{ padding: '6px 10px', textAlign: 'right', color: '#6b7280' }}>{fmtMon(r.base)}</td>
                  <td style={{ padding: '6px 10px', textAlign: 'right', color: '#6b7280' }}>{r.tarifa}%</td>
                  <td style={{ padding: '6px 10px', textAlign: 'right', fontWeight: 700, color: '#dc2626' }}>{fmtMon(r.monto)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
