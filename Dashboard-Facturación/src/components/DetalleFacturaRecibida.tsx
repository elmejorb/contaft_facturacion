import { useState, useEffect } from 'react';
import { X, Download, CheckCircle, XCircle, Clock, Inbox, PackageCheck, ThumbsUp, ThumbsDown, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { confirmar } from './ConfirmDialog';
import type { FacturaRecibida } from './FacturasRecibidas';

const API = 'http://localhost:80/conta-app-backend/api/facturas-recibidas';
const fmtMon = (v: number) => '$ ' + Math.round(v).toLocaleString('es-CO');

interface Linea {
  id: number;
  linea_num: number;
  codigo: string;
  descripcion: string;
  unidad_medida: string;
  cantidad: number;
  precio_unitario: number;
  descuento: number;
  iva_pct: number;
  iva_monto: number;
  subtotal: number;
  total_linea: number;
}

interface Evento {
  id: number;
  event_code: string;
  event_label: string;
  cude_evento: string | null;
  dian_status: string | null;
  dian_message: string | null;
  rejection_code: string | null;
  rejection_description: string | null;
  estado: 'pendiente' | 'aprobado' | 'rechazado';
  enviado_at: string | null;
  created_at: string;
}

interface Props {
  id: number;
  onCerrar: () => void;
  onAplicarEvento?: (factura: FacturaRecibida) => void;
}

const EVENT_ICONS: Record<string, any> = {
  '030': Inbox, '031': ThumbsDown, '032': PackageCheck, '033': ThumbsUp, '034': Clock,
};
const EVENT_COLORS: Record<string, string> = {
  '030': '#a16207', '031': '#b91c1c', '032': '#1d4ed8', '033': '#15803d', '034': '#0891b2',
};

export function DetalleFacturaRecibida({ id, onCerrar, onAplicarEvento }: Props) {
  const [factura, setFactura] = useState<any>(null);
  const [lineas, setLineas] = useState<Linea[]>([]);
  const [eventos, setEventos] = useState<Evento[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const r = await fetch(`${API}/detalle.php?id=${id}`);
        const d = await r.json();
        if (d.success) {
          setFactura(d.factura);
          setLineas(d.lineas || []);
          setEventos(d.eventos || []);
        } else toast.error(d.message);
      } catch (e) { toast.error('Error al cargar'); }
      setLoading(false);
    })();
  }, [id]);

  const recargar = async () => {
    const r = await fetch(`${API}/detalle.php?id=${id}`);
    const d = await r.json();
    if (d.success) { setFactura(d.factura); setLineas(d.lineas || []); setEventos(d.eventos || []); }
  };

  const eliminarEvento = async (ev: Evento) => {
    if (ev.estado === 'aprobado') { toast.error('No se pueden eliminar eventos aprobados (trazabilidad DIAN)'); return; }
    const ok = await confirmar({
      title: `Eliminar evento ${ev.event_code}`,
      message: `¿Eliminar este intento ${ev.estado}? No afecta a DIAN — solo limpia el historial local.`,
      type: 'danger', confirmText: 'Eliminar',
    });
    if (!ok) return;
    try {
      const r = await fetch(`${API}/evento-eliminar.php?id=${ev.id}`, { method: 'DELETE' });
      const d = await r.json();
      if (d.success) { toast.success('Eliminado'); recargar(); }
      else toast.error(d.message, { duration: 6000 });
    } catch (e) { toast.error('Error de conexión'); }
  };

  const limpiarNoAprobados = async () => {
    const noAprobados = eventos.filter(e => e.estado !== 'aprobado').length;
    if (noAprobados === 0) { toast('No hay eventos rechazados o pendientes que limpiar'); return; }
    const ok = await confirmar({
      title: 'Limpiar historial',
      message: `¿Eliminar los ${noAprobados} intento(s) rechazado(s) o pendiente(s)? Los aprobados por DIAN se conservan.`,
      type: 'warning', confirmText: 'Limpiar',
    });
    if (!ok) return;
    try {
      const r = await fetch(`${API}/evento-eliminar.php`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'limpiar_no_aprobados', factura_recibida_id: id }),
      });
      const d = await r.json();
      if (d.success) { toast.success(`${d.eliminados} evento(s) eliminado(s)`); recargar(); }
      else toast.error(d.message, { duration: 6000 });
    } catch (e) { toast.error('Error de conexión'); }
  };

  if (loading || !factura) return null;

  const aprobadosArr = eventos.filter(e => e.estado === 'aprobado').map(e => e.event_code);
  const facturaParaEvento: FacturaRecibida = {
    ...factura,
    eventos_aprobados_arr: aprobadosArr,
    tiene_030: aprobadosArr.includes('030'),
    tiene_031: aprobadosArr.includes('031'),
    tiene_032: aprobadosArr.includes('032'),
    tiene_033: aprobadosArr.includes('033'),
    tiene_034: aprobadosArr.includes('034'),
  };

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 99998, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.5)' }} onClick={onCerrar} />
      <div style={{ position: 'relative', background: '#fff', borderRadius: 14, width: 780, maxHeight: '90vh', display: 'flex', flexDirection: 'column', boxShadow: '0 20px 60px rgba(0,0,0,0.3)', overflow: 'hidden' }}>

        {/* Header */}
        <div style={{ padding: '12px 20px', background: '#f8fafc', borderBottom: '1px solid #e5e7eb', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 17, fontWeight: 800, color: '#7c3aed' }}>{factura.prefijo}{factura.numero}</span>
            <span style={{ fontSize: 12, color: '#6b7280' }}>Factura Recibida</span>
          </div>
          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            {onAplicarEvento && (
              <button onClick={() => onAplicarEvento(facturaParaEvento)}
                style={{ height: 28, padding: '0 10px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: 6, fontSize: 11, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
                <CheckCircle size={13} /> Aplicar evento
              </button>
            )}
            <button onClick={() => window.open(`${API}/xml.php?id=${id}`, '_blank')}
              style={{ height: 28, padding: '0 10px', background: '#7c3aed', color: '#fff', border: 'none', borderRadius: 6, fontSize: 11, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
              <Download size={13} /> XML
            </button>
            <button onClick={onCerrar} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={20} /></button>
          </div>
        </div>

        <div style={{ flex: 1, overflow: 'auto', padding: 18 }}>
          {/* Info emisor + receptor */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14, fontSize: 12 }}>
            <div style={{ background: '#f9fafb', borderRadius: 8, padding: 10 }}>
              <div style={{ fontSize: 10, color: '#6b7280', marginBottom: 4 }}>PROVEEDOR (EMISOR)</div>
              <div style={{ fontWeight: 700 }}>{factura.emisor_nombre || '-'}</div>
              <div>NIT: {factura.emisor_nit || '-'}{factura.emisor_dv ? `-${factura.emisor_dv}` : ''}</div>
            </div>
            <div style={{ background: '#f9fafb', borderRadius: 8, padding: 10 }}>
              <div style={{ fontSize: 10, color: '#6b7280', marginBottom: 4 }}>DOCUMENTO</div>
              <div>Fecha emisión: <b>{factura.fecha_emision ? new Date(factura.fecha_emision).toLocaleDateString('es-CO') : '-'}</b></div>
              <div>Total: <b style={{ color: '#16a34a', fontSize: 15 }}>{fmtMon(factura.total)}</b></div>
              <div style={{ display: 'flex', gap: 4, marginTop: 4, fontSize: 9, color: '#6b7280' }}>
                <span>CUFE:</span>
                <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontFamily: 'monospace', cursor: 'pointer' }}
                  title={factura.cufe} onClick={() => { navigator.clipboard.writeText(factura.cufe); toast.success('CUFE copiado'); }}>
                  {factura.cufe}
                </span>
              </div>
            </div>
          </div>

          {/* Líneas */}
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11, marginBottom: 14 }}>
            <thead>
              <tr style={{ background: '#f3f4f6', borderBottom: '2px solid #e5e7eb' }}>
                <th style={{ padding: '6px 8px', textAlign: 'left' }}>Código</th>
                <th style={{ padding: '6px 8px', textAlign: 'left' }}>Descripción</th>
                <th style={{ padding: '6px 8px', textAlign: 'center', width: 45 }}>Cant.</th>
                <th style={{ padding: '6px 8px', textAlign: 'right', width: 85 }}>Precio</th>
                <th style={{ padding: '6px 8px', textAlign: 'center', width: 42 }}>IVA %</th>
                <th style={{ padding: '6px 8px', textAlign: 'right', width: 75 }}>IVA $</th>
                <th style={{ padding: '6px 8px', textAlign: 'right', width: 90 }}>Total</th>
              </tr>
            </thead>
            <tbody>
              {lineas.map(l => (
                <tr key={l.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                  <td style={{ padding: '4px 8px', color: '#6b7280' }}>{l.codigo || '-'}</td>
                  <td style={{ padding: '4px 8px' }}>{l.descripcion || '-'}</td>
                  <td style={{ padding: '4px 8px', textAlign: 'center' }}>{l.cantidad}</td>
                  <td style={{ padding: '4px 8px', textAlign: 'right' }}>{fmtMon(l.precio_unitario)}</td>
                  <td style={{ padding: '4px 8px', textAlign: 'center', color: l.iva_pct > 0 ? '#d97706' : '#9ca3af' }}>{l.iva_pct}%</td>
                  <td style={{ padding: '4px 8px', textAlign: 'right', color: '#d97706' }}>{l.iva_monto > 0 ? fmtMon(l.iva_monto) : '-'}</td>
                  <td style={{ padding: '4px 8px', textAlign: 'right', fontWeight: 700 }}>{fmtMon(l.total_linea)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Totales */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 14 }}>
            <div style={{ border: '1px solid #e5e7eb', borderRadius: 8, padding: '8px 14px', minWidth: 200, fontSize: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 20 }}><span>Subtotal:</span><span>{fmtMon(factura.subtotal)}</span></div>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 20 }}><span>IVA:</span><span>{fmtMon(factura.total_iva)}</span></div>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 20, fontWeight: 800, borderTop: '2px solid #000', paddingTop: 4, marginTop: 4 }}>
                <span>TOTAL:</span><span>{fmtMon(factura.total)}</span>
              </div>
            </div>
          </div>

          {/* Historial de eventos */}
          <div style={{ border: '1px solid #e5e7eb', borderRadius: 10, overflow: 'hidden' }}>
            <div style={{ padding: '8px 12px', background: '#f9fafb', fontSize: 12, fontWeight: 700, borderBottom: '1px solid #e5e7eb', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span>Eventos DIAN aplicados ({eventos.length})</span>
              {eventos.some(e => e.estado !== 'aprobado') && (
                <button onClick={limpiarNoAprobados}
                  title="Elimina intentos rechazados o pendientes (los aprobados se conservan)"
                  style={{ height: 24, padding: '0 8px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 4, cursor: 'pointer', fontSize: 10, fontWeight: 600, color: '#b91c1c', display: 'flex', alignItems: 'center', gap: 4 }}>
                  <Trash2 size={11} /> Limpiar rechazados
                </button>
              )}
            </div>
            <div style={{ padding: 8 }}>
              {eventos.length === 0 ? (
                <div style={{ fontSize: 11, color: '#9ca3af', textAlign: 'center', padding: 10 }}>
                  Aún no se ha aplicado ningún evento. Recuerda: 030 (acuse) es obligatorio en 3 días hábiles.
                </div>
              ) : (
                eventos.map(ev => {
                  const Icon = EVENT_ICONS[ev.event_code] || Inbox;
                  const color = EVENT_COLORS[ev.event_code] || '#6b7280';
                  const est = ev.estado === 'aprobado'
                    ? { bg: '#dcfce7', fg: '#15803d', label: 'Aprobado' }
                    : ev.estado === 'rechazado' ? { bg: '#fee2e2', fg: '#b91c1c', label: 'Rechazado' }
                    : { bg: '#fef3c7', fg: '#a16207', label: 'Pendiente' };
                  return (
                    <div key={ev.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '6px 8px', fontSize: 11, borderBottom: '1px solid #f3f4f6' }}>
                      <div style={{ width: 28, height: 28, borderRadius: 6, background: color + '22', color, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Icon size={13} />
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 700, color: '#1f2937' }}>{ev.event_code} — {ev.event_label}</div>
                        <div style={{ fontSize: 10, color: '#6b7280' }}>
                          {ev.enviado_at ? new Date(ev.enviado_at).toLocaleString('es-CO') : new Date(ev.created_at).toLocaleString('es-CO')}
                          {ev.cude_evento && <> · CUDE: <span style={{ fontFamily: 'monospace' }}>{ev.cude_evento.substring(0, 20)}…</span></>}
                          {ev.rejection_code && <> · <b>{ev.rejection_code}</b>: {ev.rejection_description}</>}
                          {ev.estado === 'rechazado' && ev.dian_message && <span style={{ color: '#b91c1c' }}> — {ev.dian_message}</span>}
                        </div>
                      </div>
                      <span style={{ padding: '2px 8px', borderRadius: 4, fontSize: 10, fontWeight: 700, background: est.bg, color: est.fg }}>
                        {est.label}
                      </span>
                      {ev.estado !== 'aprobado' && (
                        <button onClick={() => eliminarEvento(ev)}
                          title="Eliminar este intento (no afecta a DIAN)"
                          style={{ width: 22, height: 22, background: 'transparent', border: 'none', cursor: 'pointer', color: '#9ca3af', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <X size={14} />
                        </button>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
