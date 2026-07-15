import { useEffect, useState } from 'react';
import { X, Printer, Package, Loader2 } from 'lucide-react';

/**
 * Vista solo-lectura del detalle de una compra a proveedor.
 * Reusa el endpoint `compras/nueva.php?detalle=Pedido_N` que ya alimenta
 * el modo edición de NuevaCompra — aquí lo pintamos sin inputs para que
 * el usuario pueda revisar la compra sin riesgo de tocarla por error.
 */

const API = 'http://localhost:80/conta-app-backend/api/compras/nueva.php';
const fmtMon = (v: number) => {
  if (v === null || v === undefined) return '$ 0';
  const val = Number(v) || 0;
  const hasDec = val % 1 !== 0;
  return '$ ' + val.toLocaleString('es-CO', {
    minimumFractionDigits: hasDec ? 2 : 0,
    maximumFractionDigits: hasDec ? 2 : 0,
  });
};

interface Props {
  pedidoN: number;
  onClose: () => void;
}

export function DetalleCompraModal({ pedidoN, onClose }: Props) {
  const [loading, setLoading] = useState(true);
  const [compra, setCompra] = useState<any>(null);
  const [detalle, setDetalle] = useState<any[]>([]);

  useEffect(() => {
    let cancelado = false;
    fetch(`${API}?detalle=${pedidoN}`)
      .then(r => r.json())
      .then(d => {
        if (cancelado) return;
        if (d.success) {
          setCompra(d.compra);
          setDetalle(d.detalle || []);
        }
      })
      .catch(() => {})
      .finally(() => { if (!cancelado) setLoading(false); });
    return () => { cancelado = true; };
  }, [pedidoN]);

  const total = compra?.Total || 0;
  const flete = compra?.Flete || 0;
  const descuento = compra?.Descuento || 0;
  const retencion = compra?.Retencion || 0;
  const impuesto = compra?.Impuesto || 0;
  const subtotalLineas = detalle.reduce((s, d) => s + Number(d.Subtotal || 0), 0);

  const s = {
    overlay: { position: 'fixed' as const, inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 },
    modal: { background: '#fff', borderRadius: 12, width: '96%', maxWidth: 1000, maxHeight: '90vh', display: 'flex', flexDirection: 'column' as const, overflow: 'hidden', boxShadow: '0 20px 50px rgba(0,0,0,0.3)' },
    header: { background: 'linear-gradient(135deg, #7c3aed, #6d28d9)', color: '#fff', padding: '14px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' },
    body: { padding: 18, overflowY: 'auto' as const, flex: 1 },
    footer: { padding: '12px 20px', borderTop: '1px solid #e5e7eb', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f9fafb' },
    infoBox: { background: '#f9fafb', borderRadius: 8, padding: '10px 14px' },
    label: { fontSize: 10, color: '#6b7280', fontWeight: 600, textTransform: 'uppercase' as const, letterSpacing: 0.5 },
    val: { fontSize: 13, fontWeight: 600, color: '#1f2937', marginTop: 2 },
    thStyle: { textAlign: 'left' as const, padding: '8px 6px', fontSize: 11, fontWeight: 700, color: '#374151', background: '#f3e8ff', borderBottom: '2px solid #d8b4fe' },
    tdStyle: { padding: '6px', fontSize: 12, borderBottom: '1px solid #f3f4f6' },
  };

  return (
    <div style={s.overlay} onClick={onClose}>
      <div style={s.modal} onClick={e => e.stopPropagation()}>
        <div style={s.header}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Package size={20} />
            <div>
              <div style={{ fontSize: 15, fontWeight: 700 }}>Detalle de Compra {compra?.Pedido_N ? `#${compra.Pedido_N}` : ''}</div>
              <div style={{ fontSize: 11, opacity: 0.85, marginTop: 2 }}>
                {compra?.FacturaCompra_N ? `Factura del proveedor: ${compra.FacturaCompra_N}` : '—'}
              </div>
            </div>
          </div>
          <button onClick={onClose}
            style={{ background: 'rgba(255,255,255,0.15)', border: 'none', color: '#fff', borderRadius: 6, width: 30, height: 30, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <X size={16} />
          </button>
        </div>

        <div style={s.body}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: 40, color: '#9ca3af' }}>
              <Loader2 size={24} className="animate-spin" style={{ marginBottom: 8 }} /><br />Cargando…
            </div>
          ) : !compra ? (
            <div style={{ textAlign: 'center', padding: 40, color: '#dc2626' }}>No se pudo cargar la compra</div>
          ) : (
            <>
              {/* Encabezado con datos generales */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 10, marginBottom: 16 }}>
                <div style={s.infoBox}>
                  <div style={s.label}>Fecha</div>
                  <div style={s.val}>{compra.Fecha ? new Date(compra.Fecha).toLocaleDateString('es-CO') : '-'}</div>
                </div>
                <div style={s.infoBox}>
                  <div style={s.label}>Tipo</div>
                  <div style={{ ...s.val, color: compra.TipoPedido === 'Contado' ? '#16a34a' : '#d97706' }}>
                    {compra.TipoPedido}
                  </div>
                </div>
                <div style={s.infoBox}>
                  <div style={s.label}>Días</div>
                  <div style={s.val}>{compra.Dias || 0}</div>
                </div>
                <div style={{ ...s.infoBox, gridColumn: 'span 2' }}>
                  <div style={s.label}>Proveedor</div>
                  <div style={s.val}>{compra.RazonSocial || `#${compra.CodigoPro}`}</div>
                </div>
              </div>

              {/* Detalle de líneas */}
              <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 8, overflow: 'hidden', marginBottom: 14 }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' as const }}>
                  <thead>
                    <tr>
                      <th style={s.thStyle}>Código</th>
                      <th style={s.thStyle}>Artículo</th>
                      <th style={{ ...s.thStyle, textAlign: 'center' }}>Cant.</th>
                      <th style={{ ...s.thStyle, textAlign: 'right' }}>Costo s/IVA</th>
                      <th style={{ ...s.thStyle, textAlign: 'center' }}>IVA%</th>
                      <th style={{ ...s.thStyle, textAlign: 'right' }}>Costo c/IVA</th>
                      <th style={{ ...s.thStyle, textAlign: 'right' }}>Flete/u</th>
                      <th style={{ ...s.thStyle, textAlign: 'right' }}>C. Final</th>
                      <th style={{ ...s.thStyle, textAlign: 'right' }}>Subtotal</th>
                    </tr>
                  </thead>
                  <tbody>
                    {detalle.map((d: any, i: number) => (
                      <tr key={i}>
                        <td style={{ ...s.tdStyle, color: '#7c3aed', fontWeight: 600 }}>{d.Codigo || '-'}</td>
                        <td style={s.tdStyle}>{d.Nombres_Articulo || '-'}</td>
                        <td style={{ ...s.tdStyle, textAlign: 'center', fontWeight: 600 }}>{d.Cantidad}</td>
                        <td style={{ ...s.tdStyle, textAlign: 'right' }}>{fmtMon(d.CostoSinIva)}</td>
                        <td style={{ ...s.tdStyle, textAlign: 'center', color: '#6b7280' }}>{Number(d.IvaPct || 0)}%</td>
                        <td style={{ ...s.tdStyle, textAlign: 'right' }}>{fmtMon(d.CostoConIva)}</td>
                        <td style={{ ...s.tdStyle, textAlign: 'right', color: '#d97706' }}>{d.FleteUnit > 0 ? fmtMon(d.FleteUnit) : '-'}</td>
                        <td style={{ ...s.tdStyle, textAlign: 'right', color: '#16a34a', fontWeight: 700 }}>{fmtMon(d.CostoFinal)}</td>
                        <td style={{ ...s.tdStyle, textAlign: 'right', fontWeight: 700 }}>{fmtMon(d.Subtotal)}</td>
                      </tr>
                    ))}
                    {detalle.length === 0 && (
                      <tr>
                        <td colSpan={9} style={{ padding: 20, textAlign: 'center', color: '#9ca3af' }}>Sin líneas</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Totales */}
              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <div style={{ width: 320, background: '#f9fafb', borderRadius: 10, padding: 14, border: '1px solid #e5e7eb' }}>
                  <Row label="Subtotal líneas" value={fmtMon(subtotalLineas)} />
                  {impuesto > 0 && <Row label="IVA" value={fmtMon(impuesto)} color="#6b7280" />}
                  {flete > 0 && <Row label="Flete" value={fmtMon(flete)} color="#d97706" />}
                  {descuento > 0 && <Row label="Descuento" value={`- ${fmtMon(descuento)}`} color="#16a34a" />}
                  {retencion > 0 && <Row label="Retención" value={`- ${fmtMon(retencion)}`} color="#16a34a" />}
                  <div style={{ borderTop: '2px solid #7c3aed', marginTop: 8, paddingTop: 8, display: 'flex', justifyContent: 'space-between', fontSize: 15, fontWeight: 800, color: '#7c3aed' }}>
                    <span>TOTAL</span>
                    <span>{fmtMon(total)}</span>
                  </div>
                  {compra.TipoPedido !== 'Contado' && (
                    <Row
                      label="Saldo pendiente"
                      value={fmtMon(compra.Saldo || 0)}
                      color={(compra.Saldo || 0) > 0 ? '#dc2626' : '#16a34a'}
                      strong
                    />
                  )}
                </div>
              </div>
            </>
          )}
        </div>

        <div style={s.footer}>
          <div style={{ fontSize: 11, color: '#9ca3af' }}>
            Vista de solo lectura. Para modificar, use el botón <Printer size={11} style={{ display: 'inline', verticalAlign: 'middle' }} /> Editar del listado.
          </div>
          <button onClick={onClose}
            style={{ height: 34, padding: '0 20px', background: '#7c3aed', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value, color, strong }: { label: string; value: string; color?: string; strong?: boolean }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4, color: color || '#374151', fontWeight: strong ? 700 : 500 }}>
      <span>{label}</span>
      <span>{value}</span>
    </div>
  );
}
