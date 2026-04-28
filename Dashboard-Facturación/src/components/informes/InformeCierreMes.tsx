import { useState, useEffect } from 'react';
import { InformeLayout, fmt } from './InformeLayout';

const API = 'http://localhost:80/conta-app-backend/api/informes/resumen.php';
const MESES = ['','Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];

export function InformeCierreMes() {
  const [anio, setAnio] = useState(new Date().getFullYear());
  const [mes, setMes] = useState(new Date().getMonth() + 1);
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const cargar = async () => {
    setLoading(true);
    try {
      const r = await fetch(`${API}?tipo=cierre_mes&anio=${anio}&mes=${mes}`);
      const d = await r.json();
      if (d.success) setData(d);
    } catch (e) { /* ignored */ }
    setLoading(false);
  };

  useEffect(() => { cargar(); }, [anio, mes]);

  const ing = data?.ingresos || {};
  const egr = data?.egresos || {};
  const util = data?.utilidad || {};
  const ventasPos = ing.ventas_pos || {};
  const ventasFe = ing.ventas_fe || {};

  return (
    <InformeLayout
      titulo="Cierre de Mes"
      subtitulo={`${MESES[mes]} de ${anio}`}
      onRefresh={cargar} loading={loading}
      filtros={
        <>
          <label style={{ fontSize: 12, fontWeight: 600 }}>Mes:</label>
          <select value={mes} onChange={e => setMes(parseInt(e.target.value))}
            style={{ height: 30, border: '1px solid #d1d5db', borderRadius: 6, padding: '0 8px', fontSize: 13 }}>
            {MESES.slice(1).map((m, i) => <option key={i+1} value={i+1}>{m}</option>)}
          </select>
          <label style={{ fontSize: 12, fontWeight: 600 }}>Año:</label>
          <select value={anio} onChange={e => setAnio(parseInt(e.target.value))}
            style={{ height: 30, border: '1px solid #d1d5db', borderRadius: 6, padding: '0 8px', fontSize: 13 }}>
            {[anio + 1, anio, anio - 1, anio - 2].map(a => <option key={a} value={a}>{a}</option>)}
          </select>
        </>
      }>
      {/* INGRESOS */}
      <div style={seccion}>INGRESOS</div>
      <table style={tableStyle}>
        <tbody>
          <tr><td style={td}>Ventas POS — Efectivo (contado)</td><td style={tdNum}>{fmt(ventasPos.contado_efectivo || 0)}</td></tr>
          <tr><td style={td}>Ventas POS — Tarjeta</td><td style={tdNum}>{fmt(ventasPos.contado_tarjeta || 0)}</td></tr>
          <tr><td style={td}>Ventas POS — Transferencia</td><td style={tdNum}>{fmt(ventasPos.contado_transferencia || 0)}</td></tr>
          <tr><td style={td}>Ventas POS — Crédito</td><td style={tdNum}>{fmt(ventasPos.credito || 0)}</td></tr>
          <tr style={{ background: '#f9fafb' }}><td style={tdSub}>Subtotal POS ({ventasPos.num || 0} facturas)</td><td style={{ ...tdNum, fontWeight: 700 }}>{fmt(ventasPos.total || 0)}</td></tr>
          {(ventasFe.total > 0) && <>
            <tr><td style={td}>Facturación Electrónica — Efectivo</td><td style={tdNum}>{fmt(ventasFe.efectivo || 0)}</td></tr>
            <tr><td style={td}>Facturación Electrónica — Otros medios</td><td style={tdNum}>{fmt((ventasFe.tarjeta || 0) + (ventasFe.otros || 0))}</td></tr>
            <tr><td style={td}>Facturación Electrónica — Crédito</td><td style={tdNum}>{fmt(ventasFe.credito || 0)}</td></tr>
            <tr style={{ background: '#f9fafb' }}><td style={tdSub}>Subtotal FE ({ventasFe.num || 0} facturas)</td><td style={{ ...tdNum, fontWeight: 700 }}>{fmt(ventasFe.total || 0)}</td></tr>
          </>}
          <tr style={{ borderTop: '2px solid #000' }}><td style={tdTotal}>TOTAL VENTAS DEL MES</td><td style={{ ...tdNum, fontWeight: 700, fontSize: 14, color: '#16a34a' }}>{fmt(ing.ventas_total || 0)}</td></tr>
          <tr><td style={td}>Pagos recibidos de clientes (cartera)</td><td style={tdNum}>{fmt(ing.pagos_clientes || 0)}</td></tr>
        </tbody>
      </table>

      {/* COSTOS */}
      <div style={seccion}>COSTO DE VENTAS</div>
      <table style={tableStyle}>
        <tbody>
          <tr><td style={td}>Costo de mercancía vendida</td><td style={{ ...tdNum, color: '#dc2626' }}>-{fmt(egr.costo_ventas || 0)}</td></tr>
          <tr style={{ background: '#dcfce7' }}><td style={tdSub}>UTILIDAD BRUTA</td><td style={{ ...tdNum, fontWeight: 700, color: '#16a34a' }}>{fmt(util.bruta || 0)}</td></tr>
        </tbody>
      </table>

      {/* GASTOS */}
      <div style={seccion}>GASTOS Y EGRESOS</div>
      <table style={tableStyle}>
        <tbody>
          <tr><td style={td}>Gastos operativos del mes</td><td style={{ ...tdNum, color: '#dc2626' }}>-{fmt(egr.gastos || 0)}</td></tr>
          <tr><td style={td}>Pagos a proveedores (egresos por cuentas por pagar)</td><td style={tdNum}>{fmt(egr.pagos_proveedores || 0)}</td></tr>
          <tr><td style={td}>Compras del mes (al contado)</td><td style={tdNum}>{fmt(egr.compras?.contado || 0)}</td></tr>
          <tr><td style={td}>Compras del mes (a crédito)</td><td style={tdNum}>{fmt(egr.compras?.credito || 0)}</td></tr>
        </tbody>
      </table>

      {/* UTILIDAD */}
      <div style={seccion}>RESULTADO</div>
      <table style={tableStyle}>
        <tbody>
          <tr><td style={td}>Ventas brutas</td><td style={tdNum}>{fmt(ing.ventas_total || 0)}</td></tr>
          <tr><td style={td}>(-) Costo de ventas</td><td style={{ ...tdNum, color: '#dc2626' }}>-{fmt(egr.costo_ventas || 0)}</td></tr>
          <tr style={{ background: '#dcfce7' }}><td style={tdSub}>= Utilidad Bruta</td><td style={{ ...tdNum, fontWeight: 700, color: '#16a34a' }}>{fmt(util.bruta || 0)}</td></tr>
          <tr><td style={td}>(-) Gastos operativos</td><td style={{ ...tdNum, color: '#dc2626' }}>-{fmt(egr.gastos || 0)}</td></tr>
          <tr style={{ background: util.neta >= 0 ? '#dcfce7' : '#fee2e2', borderTop: '2px solid #000' }}>
            <td style={tdTotal}>UTILIDAD NETA DEL MES</td>
            <td style={{ ...tdNum, fontWeight: 700, fontSize: 16, color: util.neta >= 0 ? '#16a34a' : '#dc2626' }}>{fmt(util.neta || 0)}</td>
          </tr>
          <tr><td style={td}>Margen neto sobre ventas</td><td style={tdNum}>{(util.margen_neto_pct || 0).toFixed(2)}%</td></tr>
        </tbody>
      </table>
    </InformeLayout>
  );
}

const seccion: React.CSSProperties = { fontSize: 12, fontWeight: 700, background: '#e5e7eb', padding: '4px 8px', margin: '14px 0 4px', borderLeft: '4px solid #7c3aed' };
const tableStyle: React.CSSProperties = { width: '100%', borderCollapse: 'collapse', fontSize: 11 };
const td: React.CSSProperties = { padding: '5px 10px', borderBottom: '1px solid #e5e7eb' };
const tdNum: React.CSSProperties = { padding: '5px 10px', borderBottom: '1px solid #e5e7eb', textAlign: 'right', fontFamily: 'monospace' };
const tdSub: React.CSSProperties = { padding: '6px 10px', borderBottom: '1px solid #d1d5db', fontWeight: 600 };
const tdTotal: React.CSSProperties = { padding: '8px 10px', fontWeight: 700, textTransform: 'uppercase' };
