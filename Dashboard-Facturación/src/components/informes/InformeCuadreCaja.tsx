import { useState, useEffect } from 'react';
import { InformeLayout, fmt } from './InformeLayout';

const API = 'http://localhost:80/conta-app-backend/api/informes/resumen.php';

export function InformeCuadreCaja() {
  const [fecha, setFecha] = useState(new Date().toISOString().split('T')[0]);
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const cargar = async () => {
    setLoading(true);
    try {
      const r = await fetch(`${API}?tipo=cuadre_caja&fecha=${fecha}`);
      const d = await r.json();
      if (d.success) setData(d);
    } catch (e) { /* ignored */ }
    setLoading(false);
  };

  useEffect(() => { cargar(); }, [fecha]);

  const ventasValidas = (data?.ventas || []).filter((v: any) => v.EstadoFact === 'Valida');
  const ventasContado = ventasValidas.filter((v: any) => v.Tipo === 'Contado');
  const ventasCredito = ventasValidas.filter((v: any) => v.Tipo === 'Crédito');

  const sumaEfectivo = ventasContado.filter((v: any) => v.id_mediopago === 0).reduce((s: number, v: any) => s + parseFloat(v.Total), 0);
  const sumaTarjeta = ventasContado.filter((v: any) => v.id_mediopago === 1).reduce((s: number, v: any) => s + parseFloat(v.Total), 0);
  const sumaTransf = ventasContado.filter((v: any) => v.id_mediopago >= 2).reduce((s: number, v: any) => s + parseFloat(v.Total), 0);
  const sumaCredito = ventasCredito.reduce((s: number, v: any) => s + parseFloat(v.Total), 0);
  const sumaTotal = ventasValidas.reduce((s: number, v: any) => s + parseFloat(v.Total), 0);

  const sumaPagosCli = (data?.pagos || []).reduce((s: number, p: any) => s + parseFloat(p.ValorPago), 0);
  const sumaEgresosTotal = (data?.egresos || []).reduce((s: number, e: any) => s + parseFloat(e.Valor), 0);

  return (
    <InformeLayout
      titulo="Cuadre de Caja"
      subtitulo={`Fecha: ${new Date(fecha + 'T00:00').toLocaleDateString('es-CO', { day: '2-digit', month: 'long', year: 'numeric' })}`}
      onRefresh={cargar} loading={loading}
      filtros={
        <>
          <label style={{ fontSize: 12, color: '#374151', fontWeight: 600 }}>Fecha:</label>
          <input type="date" value={fecha} onChange={e => setFecha(e.target.value)}
            style={{ height: 30, border: '1px solid #d1d5db', borderRadius: 6, padding: '0 8px', fontSize: 13 }} />
        </>
      }>
      {/* Resumen */}
      <div className="seccion-titulo" style={{ fontSize: 12, fontWeight: 700, background: '#e5e7eb', padding: '4px 8px', margin: '12px 0 4px', borderLeft: '4px solid #7c3aed' }}>RESUMEN DEL DÍA</div>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11, marginBottom: 12 }}>
        <tbody>
          <tr><td style={{ padding: '5px 8px', borderBottom: '1px solid #e5e7eb' }}>Ventas en Efectivo (contado)</td><td style={{ padding: '5px 8px', borderBottom: '1px solid #e5e7eb', textAlign: 'right', fontFamily: 'monospace' }}>{fmt(sumaEfectivo)}</td></tr>
          <tr><td style={{ padding: '5px 8px', borderBottom: '1px solid #e5e7eb' }}>Ventas con Tarjeta</td><td style={{ padding: '5px 8px', borderBottom: '1px solid #e5e7eb', textAlign: 'right', fontFamily: 'monospace' }}>{fmt(sumaTarjeta)}</td></tr>
          <tr><td style={{ padding: '5px 8px', borderBottom: '1px solid #e5e7eb' }}>Ventas por Transferencia / Bancos</td><td style={{ padding: '5px 8px', borderBottom: '1px solid #e5e7eb', textAlign: 'right', fontFamily: 'monospace' }}>{fmt(sumaTransf)}</td></tr>
          <tr><td style={{ padding: '5px 8px', borderBottom: '1px solid #e5e7eb' }}>Ventas a Crédito (cartera)</td><td style={{ padding: '5px 8px', borderBottom: '1px solid #e5e7eb', textAlign: 'right', fontFamily: 'monospace' }}>{fmt(sumaCredito)}</td></tr>
          <tr><td style={{ padding: '5px 8px', borderBottom: '1px solid #e5e7eb' }}>Pagos recibidos de clientes</td><td style={{ padding: '5px 8px', borderBottom: '1px solid #e5e7eb', textAlign: 'right', fontFamily: 'monospace' }}>{fmt(sumaPagosCli)}</td></tr>
          <tr><td style={{ padding: '5px 8px', borderBottom: '1px solid #e5e7eb' }}>Egresos del día (gastos + pagos prov.)</td><td style={{ padding: '5px 8px', borderBottom: '1px solid #e5e7eb', textAlign: 'right', fontFamily: 'monospace', color: '#dc2626' }}>-{fmt(sumaEgresosTotal)}</td></tr>
          <tr style={{ borderTop: '2px solid #000' }}><td style={{ padding: '8px', fontWeight: 700, fontSize: 13 }}>TOTAL VENTAS DEL DÍA</td><td style={{ padding: '8px', textAlign: 'right', fontFamily: 'monospace', fontWeight: 700, fontSize: 13 }}>{fmt(sumaTotal)}</td></tr>
          <tr><td style={{ padding: '4px 8px', fontWeight: 700, color: '#16a34a' }}>EFECTIVO NETO ESPERADO EN CAJA</td><td style={{ padding: '4px 8px', textAlign: 'right', fontFamily: 'monospace', fontWeight: 700, color: '#16a34a' }}>{fmt(sumaEfectivo + sumaPagosCli - sumaEgresosTotal)}</td></tr>
        </tbody>
      </table>

      {/* Ventas */}
      <div className="seccion-titulo" style={{ fontSize: 12, fontWeight: 700, background: '#e5e7eb', padding: '4px 8px', margin: '12px 0 4px', borderLeft: '4px solid #7c3aed' }}>VENTAS DEL DÍA ({ventasValidas.length})</div>
      {ventasValidas.length === 0 ? <div style={{ padding: 20, textAlign: 'center', color: '#999' }}>Sin ventas</div> : (
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
          <thead><tr><th style={th}>Factura</th><th style={th}>Cliente</th><th style={th}>Tipo</th><th style={th}>Medio</th><th style={{ ...th, textAlign: 'right' }}>Total</th></tr></thead>
          <tbody>
            {ventasValidas.map((v: any) => (
              <tr key={v.Factura_N}>
                <td style={td}>{v.Factura_N}</td>
                <td style={td}>{v.A_nombre}</td>
                <td style={td}>{v.Tipo}</td>
                <td style={td}>{v.medio_pago || 'Efectivo'}</td>
                <td style={{ ...td, textAlign: 'right', fontFamily: 'monospace' }}>{fmt(parseFloat(v.Total))}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {/* Pagos clientes */}
      {data?.pagos && data.pagos.length > 0 && (
        <>
          <div className="seccion-titulo" style={{ fontSize: 12, fontWeight: 700, background: '#e5e7eb', padding: '4px 8px', margin: '12px 0 4px', borderLeft: '4px solid #16a34a' }}>PAGOS RECIBIDOS DE CLIENTES ({data.pagos.length})</div>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
            <thead><tr><th style={th}>Recibo</th><th style={th}>Cliente</th><th style={th}>Factura</th><th style={{ ...th, textAlign: 'right' }}>Valor</th></tr></thead>
            <tbody>
              {data.pagos.map((p: any) => (
                <tr key={p.RecCajaN}>
                  <td style={td}>{p.RecCajaN}</td>
                  <td style={td}>{p.Razon_Social}</td>
                  <td style={td}>{p.NFactAnt}</td>
                  <td style={{ ...td, textAlign: 'right', fontFamily: 'monospace', color: '#16a34a' }}>{fmt(parseFloat(p.ValorPago))}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}

      {/* Egresos */}
      {data?.egresos && data.egresos.length > 0 && (
        <>
          <div className="seccion-titulo" style={{ fontSize: 12, fontWeight: 700, background: '#e5e7eb', padding: '4px 8px', margin: '12px 0 4px', borderLeft: '4px solid #dc2626' }}>EGRESOS DEL DÍA ({data.egresos.length})</div>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
            <thead><tr><th style={th}>Comp.</th><th style={th}>Proveedor / Concepto</th><th style={th}>Detalle</th><th style={{ ...th, textAlign: 'right' }}>Valor</th></tr></thead>
            <tbody>
              {data.egresos.map((e: any) => (
                <tr key={e.N_Comprobante}>
                  <td style={td}>{e.N_Comprobante}</td>
                  <td style={td}>{e.proveedor || '-'}</td>
                  <td style={{ ...td, fontSize: 10, color: '#666' }}>{e.Concepto}</td>
                  <td style={{ ...td, textAlign: 'right', fontFamily: 'monospace', color: '#dc2626' }}>{fmt(parseFloat(e.Valor))}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}
    </InformeLayout>
  );
}

const th: React.CSSProperties = { textAlign: 'left', padding: '6px 8px', borderBottom: '2px solid #000', background: '#f3f4f6', fontWeight: 700, fontSize: 11 };
const td: React.CSSProperties = { padding: '5px 8px', borderBottom: '1px solid #e5e7eb' };
