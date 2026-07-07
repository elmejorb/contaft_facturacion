import { useState, useEffect } from 'react';
import { X, CheckCircle, XCircle, Clock, Send, Copy, FileText, AlertTriangle, Printer, RefreshCw, Inbox, PackageCheck, ThumbsUp, ThumbsDown, Ban } from 'lucide-react';
import toast from 'react-hot-toast';
import { getConfigImpresion } from './ConfiguracionSistema';
import { AutorizacionAdminModal, AdminAutorizado } from './AutorizacionAdminModal';

const API = 'http://localhost:80/conta-app-backend/api/facturacion-electronica';
const fmtMon = (v: number) => '$ ' + v.toLocaleString('es-CO', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

interface Props {
  docId: number;
  onClose: () => void;
  onUpdate?: () => void;
  /** Callback opcional para copiar este doc a Nueva Venta. Lo proporciona el listado FE. */
  onCopiar?: (id: number, label: string) => void;
}

export function DetalleDocElectronico({ docId, onClose, onUpdate, onCopiar }: Props) {
  const [doc, setDoc] = useState<any>(null);
  const [items, setItems] = useState<any[]>([]);
  const [notas, setNotas] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNC, setShowNC] = useState(false);
  const [showND, setShowND] = useState(false);
  const [ncMotivo, setNcMotivo] = useState('Anulación de factura electrónica');
  const [ncItems, setNcItems] = useState<Record<number, string>>({});
  const [ncValorDesc, setNcValorDesc] = useState('');
  const [ndMotivo, setNdMotivo] = useState('Cobro de intereses');
  const [ndValor, setNdValor] = useState('');
  const [ndDescripcion, setNdDescripcion] = useState('');
  const [autDevolucion, setAutDevolucion] = useState<{ motivo: string } | null>(null);
  const [autAnulacion, setAutAnulacion] = useState<{ motivo: string } | null>(null);
  // Eventos DIAN (aplica solo a facturas a crédito autorizadas).
  // Se carga al abrir el modal via /eventos-estado (rápido, lee BD Lumen).
  // El botón "Consultar DIAN" fuerza /eventos que actualiza el estado en
  // tiempo real contra la DIAN.
  const [eventos, setEventos] = useState<any>(null);
  const [eventosLoading, setEventosLoading] = useState(false);

  // Calculate total a devolver en NC parcial
  const ncTotalDev = Object.entries(ncItems).reduce((s, [idx, val]) => {
    const cant = parseFloat(val) || 0;
    const item = items[parseInt(idx)];
    return s + (item ? cant * item.price_amount : 0);
  }, 0);

  const cargar = async () => {
    setLoading(true);
    try {
      const r = await fetch(`${API}/detalle.php?id=${docId}`);
      const d = await r.json();
      if (d.success) {
        setDoc(d.documento);
        setItems(d.items);
        setNotas(d.notas || []);
      } else toast.error(d.message);
    } catch (e) { toast.error('Error al cargar'); }
    setLoading(false);
  };

  useEffect(() => { cargar(); }, [docId]);

  // Consulta el estado actual de los eventos del CUFE. Modo `refresh=false`
  // (default) usa /eventos-estado (BD Lumen, rápido). Modo refresh=true usa
  // /eventos que consulta a DIAN en tiempo real y actualiza la BD remota.
  const consultarEventos = async (refresh: boolean = false) => {
    if (!doc?.cufe) return;
    setEventosLoading(true);
    if (refresh) toast.loading('Consultando DIAN...', { id: 'evt-modal' });
    try {
      const url = `${API}/eventos.php?cufe=${encodeURIComponent(doc.cufe)}${refresh ? '&refresh=1' : ''}`;
      const r = await fetch(url);
      const d = await r.json();
      if (d.success !== false) {
        setEventos(d);
        if (refresh) toast.success('Estado actualizado', { id: 'evt-modal' });
      } else if (refresh) {
        toast.error(d.message || 'No se pudo consultar', { id: 'evt-modal' });
      }
    } catch (e) {
      if (refresh) toast.error('Error de conexión', { id: 'evt-modal' });
    }
    setEventosLoading(false);
  };

  // Auto-cargar eventos al abrir el modal si la factura es crédito autorizada.
  useEffect(() => {
    if (doc && doc.cufe && doc.status === 'autorizado' && parseInt(doc.payment_form_id) === 2) {
      consultarEventos(false);
    } else {
      setEventos(null);
    }
  }, [doc?.cufe, doc?.status, doc?.payment_form_id]);

  const enviarNC = async (adminAuth?: AdminAutorizado) => {
    // Verificar autorización admin antes de procesar — el motivo determina qué casilla aplica
    const cfg = getConfigImpresion();
    const esDevolucion = ncMotivo === 'Devolución parcial de mercancía' || ncMotivo === 'Devolución de mercancía';
    const esAnulacion  = ncMotivo === 'Anulación de factura electrónica';
    if (esDevolucion && cfg.autorizarDevoluciones && !adminAuth) {
      setAutDevolucion({ motivo: `${ncMotivo} de FE-${doc.number}` });
      return;
    }
    if (esAnulacion && cfg.autorizarAnulaciones && !adminAuth) {
      setAutAnulacion({ motivo: `Anulación de FE-${doc.number}` });
      return;
    }

    toast.loading('Enviando Nota Crédito...', { id: 'nc' });
    try {
      const body: any = { action: 'nota_credito', factura_n: doc.number, motivo: ncMotivo };
      if (adminAuth) { body.admin_auth = { id: adminAuth.id, username: adminAuth.username }; }

      if (ncMotivo === 'Devolución parcial de mercancía') {
        // Solo enviar items con cantidad > 0
        const itemsDev = Object.entries(ncItems)
          .filter(([, val]) => parseFloat(val) > 0)
          .map(([idx, val]) => {
            const item = items[parseInt(idx)];
            return {
              items: item.items,
              cantidad: parseFloat(val),
              precio: item.price_amount,
              iva: item.tax_percent,
              descripcion: item.description || item.Nombres_Articulo
            };
          });
        body.items = itemsDev;
      } else if (ncMotivo === 'Rebaja o bonificación' || ncMotivo === 'Descuento comercial' || ncMotivo === 'Ajuste de precio') {
        body.valor_descuento = parseInt(ncValorDesc) || 0;
      }
      // Anulación total y Devolución total envían todos los items (el backend los toma de la factura original)

      const r = await fetch(`${API}/enviar.php`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      const d = await r.json();
      if (d.success) { toast.success(d.message, { id: 'nc', duration: 6000 }); setShowNC(false); setNcItems({}); setNcValorDesc(''); cargar(); onUpdate?.(); }
      else toast.error(d.message, { id: 'nc', duration: 10000 });
    } catch (e) { toast.error('Error de conexión', { id: 'nc' }); }
  };

  const enviarND = async () => {
    const val = parseInt(ndValor) || 0;
    if (val <= 0) return;
    toast.loading('Enviando Nota Débito...', { id: 'nd' });
    try {
      const r = await fetch(`${API}/enviar.php`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'nota_debito', factura_n: doc.number, motivo: ndMotivo, valor: val, descripcion: ndDescripcion })
      });
      const d = await r.json();
      if (d.success) { toast.success(d.message, { id: 'nd', duration: 6000 }); setShowND(false); cargar(); onUpdate?.(); }
      else toast.error(d.message, { id: 'nd', duration: 10000 });
    } catch (e) { toast.error('Error de conexión', { id: 'nd' }); }
  };

  if (loading || !doc) return null;

  const statusColors: Record<string, { bg: string; fg: string; icon: any }> = {
    'autorizado': { bg: '#dcfce7', fg: '#16a34a', icon: CheckCircle },
    'enviado': { bg: '#dbeafe', fg: '#2563eb', icon: Send },
    'rechazado': { bg: '#fee2e2', fg: '#dc2626', icon: XCircle },
    'anulada': { bg: '#f3f4f6', fg: '#6b7280', icon: XCircle },
  };
  const sc = statusColors[doc.status] || statusColors['enviado'];
  const StatusIcon = sc.icon;

  const totalBase = items.reduce((s, i) => s + i.line_extension_amount, 0);
  const totalIva = items.reduce((s, i) => s + i.tax_amount, 0);
  // NO leemos doc.total del backend: en BDs con facturas viejas emitidas
  // antes de 4.3.61 ese campo quedaba inflado (cuando IvaIncluido=1 se
  // sumaba IVA encima del precio que ya lo tenía dentro). Recalculamos
  // siempre desde las líneas para que la vista previa cuadre con DIAN.
  const totalDoc = totalBase + totalIva - (parseFloat(doc.descuento) || 0);
  const isFactura = parseInt(doc.type_document_id) === 1;
  const isAutorizado = doc.status === 'autorizado';
  const esCredito = parseInt(doc.payment_form_id) === 2;
  const puedeConsultarEventos = isFactura && isAutorizado && esCredito && !!doc.cufe;

  // Descripción y color por event_status
  const eventoStyle = (status: string | null | undefined) => {
    switch (status) {
      case 'aceptada':   return { bg: '#dcfce7', fg: '#15803d', label: 'Aceptada', desc: 'Cliente aceptó formalmente (033) — es título valor' };
      case 'tacita':     return { bg: '#d1fae5', fg: '#047857', label: 'Aceptación Tácita', desc: '3 días hábiles sin rechazo — título valor automático' };
      case 'recibido':   return { bg: '#dbeafe', fg: '#1d4ed8', label: 'Recibido', desc: 'Cliente confirmó recibo del bien/servicio (032)' };
      case 'acuse':      return { bg: '#fef3c7', fg: '#a16207', label: 'Acuse recibo', desc: 'Cliente recibió el correo (030)' };
      case 'rechazada':  return { bg: '#fee2e2', fg: '#b91c1c', label: 'Rechazada', desc: 'Cliente rechazó (031)' };
      default:           return { bg: '#f3f4f6', fg: '#6b7280', label: 'Pendiente', desc: 'Sin eventos aún' };
    }
  };

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 99999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.4)' }} onClick={onClose} />
      <div style={{ position: 'relative', background: '#fff', borderRadius: 14, width: 700, maxHeight: '85vh', display: 'flex', flexDirection: 'column', boxShadow: '0 20px 60px rgba(0,0,0,0.25)', overflow: 'hidden' }}>

        {/* Header */}
        <div style={{ padding: '12px 20px', background: '#f8fafc', borderBottom: '1px solid #e5e7eb', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 18, fontWeight: 800 }}>{doc.prefix}{doc.number}</span>
            <span style={{ fontSize: 12, color: '#6b7280' }}>{doc.tipo_documento || 'Factura Electrónica'}</span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '2px 8px', borderRadius: 6, fontSize: 11, fontWeight: 600, background: sc.bg, color: sc.fg }}>
              <StatusIcon size={13} /> {doc.status}
            </span>
          </div>
          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            {puedeConsultarEventos && (
              <button onClick={() => consultarEventos(true)} disabled={eventosLoading}
                title="Consultar estado de aceptación en la DIAN en tiempo real"
                style={{ height: 28, padding: '0 10px', background: '#0ea5e9', color: '#fff', border: 'none', borderRadius: 6, fontSize: 11, fontWeight: 600, cursor: eventosLoading ? 'default' : 'pointer', display: 'flex', alignItems: 'center', gap: 4, opacity: eventosLoading ? 0.6 : 1 }}>
                <RefreshCw size={13} style={eventosLoading ? { animation: 'spin 1s linear infinite' } : undefined} /> Consultar eventos
              </button>
            )}
            <button onClick={() => window.open(`${API}/pdf.php?id=${docId}`, 'PDF_Viewer', 'width=900,height=700,menubar=no,toolbar=no,location=no,status=no')} title="Imprimir PDF"
              style={{ height: 28, padding: '0 10px', background: '#7c3aed', color: '#fff', border: 'none', borderRadius: 6, fontSize: 11, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
              <Printer size={13} /> PDF
            </button>
            {onCopiar && (
              <button onClick={() => onCopiar(docId, `FE-${doc.prefix || ''}${doc.number}`)} title="Copiar a Nueva Venta"
                style={{ height: 28, padding: '0 10px', background: '#16a34a', color: '#fff', border: 'none', borderRadius: 6, fontSize: 11, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
                <Copy size={13} /> Copiar
              </button>
            )}
            <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={20} /></button>
          </div>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflow: 'auto', padding: 20 }}>

          {/* Info */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16, fontSize: 12 }}>
            <div style={{ background: '#f9fafb', borderRadius: 8, padding: 10 }}>
              <div style={{ fontSize: 10, color: '#6b7280', marginBottom: 4 }}>CLIENTE</div>
              <div style={{ fontWeight: 700 }}>{doc.Razon_Social || '-'}</div>
              <div>NIT: {doc.customer_identification || doc.Nit || '-'}</div>
              <div>{doc.Direccion || ''} {doc.Telefonos ? `| Tel: ${doc.Telefonos}` : ''}</div>
            </div>
            <div style={{ background: '#f9fafb', borderRadius: 8, padding: 10 }}>
              <div style={{ fontSize: 10, color: '#6b7280', marginBottom: 4 }}>DOCUMENTO</div>
              <div>Fecha: <b>{new Date(doc.fecha).toLocaleDateString('es-CO')}</b></div>
              {/* Forma de pago — solo se muestra si viene definida. Ayuda al
                  usuario a distinguir de un vistazo cuándo aplica Consultar
                  eventos DIAN (solo aplica a créditos). */}
              {parseInt(doc.payment_form_id) > 0 && (
                <div>Término:{' '}
                  <b style={{ color: esCredito ? '#1d4ed8' : '#16a34a' }}>
                    {esCredito ? 'Crédito' : 'Contado'}
                  </b>
                  {esCredito && doc.payment_due_days ? <span style={{ fontSize: 11, color: '#6b7280' }}> · {doc.payment_due_days} días</span> : null}
                </div>
              )}
              <div>Total: <b style={{ color: '#16a34a', fontSize: 16 }}>{fmtMon(totalDoc)}</b></div>
              {doc.cufe && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 4 }}>
                  <span style={{ fontSize: 10, color: '#6b7280' }}>CUFE:</span>
                  <span style={{ fontSize: 9, color: '#6b7280', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{doc.cufe}</span>
                  <button onClick={() => { navigator.clipboard.writeText(doc.cufe); toast.success('CUFE copiado'); }}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}><Copy size={12} color="#7c3aed" /></button>
                </div>
              )}
            </div>
          </div>

          {/* Items */}
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12, marginBottom: 16 }}>
            <thead>
              <tr style={{ background: '#f3f4f6', borderBottom: '2px solid #e5e7eb' }}>
                <th style={{ padding: '6px 8px', textAlign: 'left' }}>Código</th>
                <th style={{ padding: '6px 8px', textAlign: 'left' }}>Descripción</th>
                <th style={{ padding: '6px 8px', textAlign: 'center', width: 50 }}>Cant.</th>
                <th style={{ padding: '6px 8px', textAlign: 'right', width: 90 }}>Precio</th>
                <th style={{ padding: '6px 8px', textAlign: 'center', width: 50 }}>IVA %</th>
                <th style={{ padding: '6px 8px', textAlign: 'right', width: 80 }}>IVA $</th>
                <th style={{ padding: '6px 8px', textAlign: 'right', width: 100 }}>Subtotal</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, i) => (
                <tr key={i} style={{ borderBottom: '1px solid #f3f4f6' }}>
                  <td style={{ padding: '4px 8px', color: '#6b7280' }}>{item.Codigo || item.items}</td>
                  <td style={{ padding: '4px 8px', fontWeight: 500 }}>{item.description || item.Nombres_Articulo || '-'}</td>
                  <td style={{ padding: '4px 8px', textAlign: 'center' }}>{item.invoiced_quantity}</td>
                  <td style={{ padding: '4px 8px', textAlign: 'right' }}>{fmtMon(item.price_amount)}</td>
                  <td style={{ padding: '4px 8px', textAlign: 'center', color: item.tax_percent > 0 ? '#d97706' : '#9ca3af' }}>{item.tax_percent}%</td>
                  <td style={{ padding: '4px 8px', textAlign: 'right', color: '#d97706' }}>{item.tax_amount > 0 ? fmtMon(item.tax_amount) : '-'}</td>
                  <td style={{ padding: '4px 8px', textAlign: 'right', fontWeight: 700 }}>{fmtMon(item.line_extension_amount)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Totales */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
            <div style={{ border: '1px solid #e5e7eb', borderRadius: 10, padding: '10px 16px', minWidth: 200 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 20, fontSize: 12, marginBottom: 4 }}><span>Subtotal:</span><span>{fmtMon(totalBase)}</span></div>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 20, fontSize: 12, marginBottom: 4 }}><span>IVA:</span><span>{fmtMon(totalIva)}</span></div>
              {parseFloat(doc.descuento) > 0 && <div style={{ display: 'flex', justifyContent: 'space-between', gap: 20, fontSize: 12, marginBottom: 4 }}><span>Descuento:</span><span>-{fmtMon(parseFloat(doc.descuento))}</span></div>}
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 20, fontSize: 14, fontWeight: 800, borderTop: '2px solid #000', paddingTop: 4 }}><span>TOTAL:</span><span>{fmtMon(totalDoc)}</span></div>
            </div>
          </div>

          {/* Eventos DIAN — solo facturas a crédito autorizadas */}
          {puedeConsultarEventos && (() => {
            const s = eventoStyle(eventos?.event_status);
            const ev = eventos?.eventos || {};
            const items: { key: string; label: string; icon: any; fecha: string | null; color: string }[] = [
              { key: 'acuse_recibo', label: 'Acuse de recibo (030)', icon: Inbox, fecha: ev.acuse_recibo || null, color: '#a16207' },
              { key: 'recibo_bien',  label: 'Recibo del bien/servicio (032)', icon: PackageCheck, fecha: ev.recibo_bien || null, color: '#1d4ed8' },
              { key: 'aceptacion',   label: eventos?.event_status === 'tacita' ? 'Aceptación tácita' : 'Aceptación (033)', icon: ThumbsUp, fecha: ev.aceptacion || null, color: '#15803d' },
              { key: 'rechazo',      label: 'Rechazo (031)', icon: ThumbsDown, fecha: ev.rechazo || null, color: '#b91c1c' },
            ];
            return (
              <div style={{ marginBottom: 16, border: '1px solid #e5e7eb', borderRadius: 10, overflow: 'hidden' }}>
                <div style={{ padding: '10px 14px', background: '#f9fafb', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #e5e7eb' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: '#1f2937' }}>Eventos DIAN — Factura a crédito</span>
                    <span title={s.desc} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '2px 10px', borderRadius: 6, fontSize: 11, fontWeight: 700, background: s.bg, color: s.fg }}>
                      {s.label}
                    </span>
                  </div>
                  {eventos?.ultima_consulta && (
                    <span style={{ fontSize: 10, color: '#9ca3af' }}>Última consulta: {new Date(eventos.ultima_consulta).toLocaleString('es-CO')}</span>
                  )}
                </div>
                <div style={{ padding: '10px 14px' }}>
                  {/* Timeline visual de eventos */}
                  {items.map(it => {
                    const IconEl = it.icon;
                    const activo = !!it.fecha;
                    return (
                      <div key={it.key} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '4px 0', opacity: activo ? 1 : 0.4 }}>
                        <div style={{ width: 26, height: 26, borderRadius: 6, background: activo ? it.color + '22' : '#f3f4f6', color: activo ? it.color : '#9ca3af', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <IconEl size={14} />
                        </div>
                        <div style={{ flex: 1, fontSize: 12 }}>
                          <div style={{ fontWeight: activo ? 600 : 500, color: activo ? '#1f2937' : '#9ca3af' }}>{it.label}</div>
                          {activo && <div style={{ fontSize: 10, color: '#6b7280' }}>{new Date(it.fecha!).toLocaleString('es-CO')}</div>}
                        </div>
                        {activo ? <CheckCircle size={14} color={it.color} /> : <Clock size={13} color="#d1d5db" />}
                      </div>
                    );
                  })}
                  {/* Motivo del rechazo si aplica */}
                  {eventos?.eventos?.rechazo_motivo && (
                    <div style={{ marginTop: 8, padding: '8px 10px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 6, fontSize: 11, color: '#b91c1c', display: 'flex', gap: 6, alignItems: 'flex-start' }}>
                      <Ban size={13} style={{ flexShrink: 0, marginTop: 1 }} />
                      <div><b>Motivo del rechazo:</b> {eventos.eventos.rechazo_motivo}</div>
                    </div>
                  )}
                  {!eventos && !eventosLoading && (
                    <div style={{ fontSize: 11, color: '#9ca3af', textAlign: 'center', padding: 6 }}>Consulta el estado con el botón del encabezado.</div>
                  )}
                </div>
              </div>
            );
          })()}

          {/* Notas Crédito / Débito asociadas */}
          {notas.length > 0 && (
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                <FileText size={16} color="#d97706" /> Notas asociadas a esta factura
              </div>
              {notas.map((n, i) => {
                const nsc = statusColors[n.status] || statusColors['enviado'];
                const NIcon = nsc.icon;
                return (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', background: '#f9fafb', borderRadius: 8, marginBottom: 4, fontSize: 12, border: '1px solid #e5e7eb' }}>
                    <span style={{ fontWeight: 700, color: n.type_document_id === 2 ? '#d97706' : '#dc2626' }}>{n.prefix}{n.number}</span>
                    <span style={{ color: '#6b7280' }}>{n.tipo}</span>
                    <span>{new Date(n.fecha).toLocaleDateString('es-CO')}</span>
                    <span style={{ fontWeight: 700 }}>{fmtMon(parseFloat(n.total) || 0)}</span>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, padding: '1px 6px', borderRadius: 4, fontSize: 10, fontWeight: 600, background: nsc.bg, color: nsc.fg }}>
                      <NIcon size={11} /> {n.status}
                    </span>
                  </div>
                );
              })}
            </div>
          )}

          {/* Formulario Nota Crédito inline */}
          {showNC && (
            <div style={{ border: '2px solid #d97706', borderRadius: 10, padding: 14, marginBottom: 12, background: '#fffbeb' }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: '#d97706', marginBottom: 10 }}>Nueva Nota Crédito</div>
              <div style={{ marginBottom: 10 }}>
                <label style={{ fontSize: 11, fontWeight: 600, display: 'block', marginBottom: 4 }}>Motivo</label>
                <select value={ncMotivo} onChange={e => { setNcMotivo(e.target.value); setNcItems({}); }}
                  style={{ width: '100%', height: 32, border: '1px solid #d1d5db', borderRadius: 8, fontSize: 13, padding: '0 8px' }}>
                  <option value="Anulación de factura electrónica">Anulación total de factura</option>
                  <option value="Devolución parcial de mercancía">Devolución parcial de productos</option>
                  <option value="Devolución de mercancía">Devolución total de mercancía</option>
                  <option value="Rebaja o bonificación">Rebaja o bonificación</option>
                  <option value="Descuento comercial">Descuento comercial</option>
                  <option value="Ajuste de precio">Ajuste de precio</option>
                </select>
              </div>

              {/* Si es devolución parcial, mostrar productos para seleccionar */}
              {ncMotivo === 'Devolución parcial de mercancía' && (
                <div style={{ marginBottom: 10 }}>
                  <label style={{ fontSize: 11, fontWeight: 600, display: 'block', marginBottom: 6 }}>Seleccione productos y cantidad a devolver</label>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
                    <thead>
                      <tr style={{ background: '#fef3c7', borderBottom: '1px solid #fde68a' }}>
                        <th style={{ padding: '4px 6px', textAlign: 'left' }}>Producto</th>
                        <th style={{ padding: '4px 6px', textAlign: 'center', width: 60 }}>Cant.</th>
                        <th style={{ padding: '4px 6px', textAlign: 'right', width: 80 }}>Precio</th>
                        <th style={{ padding: '4px 6px', textAlign: 'center', width: 70 }}>Devolver</th>
                        <th style={{ padding: '4px 6px', textAlign: 'right', width: 80 }}>Valor</th>
                      </tr>
                    </thead>
                    <tbody>
                      {items.map((item, i) => {
                        const cantDev = parseFloat(ncItems[i] || '0') || 0;
                        const valorDev = cantDev * item.price_amount;
                        return (
                          <tr key={i} style={{ borderBottom: '1px solid #fef3c7' }}>
                            <td style={{ padding: '4px 6px', fontWeight: 500 }}>{item.description || item.Nombres_Articulo || '-'}</td>
                            <td style={{ padding: '4px 6px', textAlign: 'center' }}>{item.invoiced_quantity}</td>
                            <td style={{ padding: '4px 6px', textAlign: 'right' }}>{fmtMon(item.price_amount)}</td>
                            <td style={{ padding: '2px 4px', textAlign: 'center' }}>
                              <input type="text" value={ncItems[i] || ''}
                                onChange={e => {
                                  const v = e.target.value.replace(/[^0-9.]/g, '');
                                  const num = parseFloat(v) || 0;
                                  if (num <= item.invoiced_quantity) setNcItems({ ...ncItems, [i]: v });
                                }}
                                placeholder="0"
                                style={{ width: 50, height: 24, textAlign: 'center', border: '2px solid #d97706', borderRadius: 4, fontSize: 12, fontWeight: 700 }} />
                            </td>
                            <td style={{ padding: '4px 6px', textAlign: 'right', fontWeight: 700, color: cantDev > 0 ? '#d97706' : '#9ca3af' }}>
                              {cantDev > 0 ? fmtMon(valorDev) : '-'}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                  {ncTotalDev > 0 && (
                    <div style={{ textAlign: 'right', marginTop: 6, fontSize: 13, fontWeight: 700, color: '#d97706' }}>
                      Total a devolver: {fmtMon(ncTotalDev)}
                    </div>
                  )}
                </div>
              )}

              {/* Si es rebaja/descuento, campo de valor */}
              {(ncMotivo === 'Rebaja o bonificación' || ncMotivo === 'Descuento comercial' || ncMotivo === 'Ajuste de precio') && (
                <div style={{ marginBottom: 10 }}>
                  <label style={{ fontSize: 11, fontWeight: 600, display: 'block', marginBottom: 4 }}>Valor del descuento/ajuste</label>
                  <input type="text" value={ncValorDesc} onChange={e => setNcValorDesc(e.target.value.replace(/[^0-9]/g, ''))}
                    placeholder="$ 0"
                    style={{ width: '100%', height: 32, border: '1px solid #d1d5db', borderRadius: 8, fontSize: 13, padding: '0 10px', fontWeight: 700, boxSizing: 'border-box' }} />
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 10 }}>
                <button onClick={() => setShowNC(false)} style={{ height: 30, padding: '0 14px', background: '#fff', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 12, cursor: 'pointer' }}>Cancelar</button>
                <button onClick={enviarNC}
                  disabled={ncMotivo === 'Devolución parcial de mercancía' && ncTotalDev <= 0}
                  style={{ height: 30, padding: '0 14px', background: (ncMotivo === 'Devolución parcial de mercancía' && ncTotalDev <= 0) ? '#d1d5db' : '#d97706', color: '#fff', border: 'none', borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: (ncMotivo === 'Devolución parcial de mercancía' && ncTotalDev <= 0) ? 'default' : 'pointer' }}>
                  Enviar Nota Crédito a DIAN
                </button>
              </div>
            </div>
          )}

          {/* Formulario Nota Débito inline */}
          {showND && (
            <div style={{ border: '2px solid #dc2626', borderRadius: 10, padding: 14, marginBottom: 12, background: '#fef2f2' }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: '#dc2626', marginBottom: 10 }}>Nueva Nota Débito</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 600, display: 'block', marginBottom: 4 }}>Motivo</label>
                  <select value={ndMotivo} onChange={e => setNdMotivo(e.target.value)}
                    style={{ width: '100%', height: 32, border: '1px solid #d1d5db', borderRadius: 8, fontSize: 13, padding: '0 8px' }}>
                    <option value="Cobro de intereses">Cobro de intereses</option>
                    <option value="Gastos por cobrar">Gastos por cobrar</option>
                    <option value="Cambio de valor">Cambio de valor</option>
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 600, display: 'block', marginBottom: 4 }}>Valor</label>
                  <input type="text" value={ndValor} onChange={e => setNdValor(e.target.value.replace(/[^0-9]/g, ''))} placeholder="$ 0"
                    style={{ width: '100%', height: 32, border: '1px solid #d1d5db', borderRadius: 8, fontSize: 13, padding: '0 10px', fontWeight: 700, boxSizing: 'border-box' }} />
                </div>
              </div>
              <div style={{ marginBottom: 10 }}>
                <label style={{ fontSize: 11, fontWeight: 600, display: 'block', marginBottom: 4 }}>Descripción</label>
                <input type="text" value={ndDescripcion} onChange={e => setNdDescripcion(e.target.value)} placeholder="Descripción del cobro"
                  style={{ width: '100%', height: 32, border: '1px solid #d1d5db', borderRadius: 8, fontSize: 13, padding: '0 10px', boxSizing: 'border-box' }} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                <button onClick={() => setShowND(false)} style={{ height: 30, padding: '0 14px', background: '#fff', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 12, cursor: 'pointer' }}>Cancelar</button>
                <button onClick={enviarND} disabled={!ndValor || parseInt(ndValor) <= 0}
                  style={{ height: 30, padding: '0 14px', background: parseInt(ndValor) > 0 ? '#dc2626' : '#d1d5db', color: '#fff', border: 'none', borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: parseInt(ndValor) > 0 ? 'pointer' : 'default' }}>Enviar a DIAN</button>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ padding: '10px 20px', borderTop: '1px solid #e5e7eb', background: '#f9fafb', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
          <div style={{ display: 'flex', gap: 6 }}>
            {isFactura && isAutorizado && !showNC && !showND && (
              <>
                <button onClick={() => { setShowNC(true); setShowND(false); }}
                  style={{ height: 30, padding: '0 12px', background: '#fffbeb', color: '#d97706', border: '1px solid #d97706', borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                  Nota Crédito
                </button>
                <button onClick={() => { setShowND(true); setShowNC(false); setNdValor(''); setNdDescripcion(''); }}
                  style={{ height: 30, padding: '0 12px', background: '#fef2f2', color: '#dc2626', border: '1px solid #dc2626', borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                  Nota Débito
                </button>
              </>
            )}
          </div>
          <button onClick={onClose}
            style={{ height: 30, padding: '0 16px', background: '#f3f4f6', border: '1px solid #e5e7eb', borderRadius: 6, fontSize: 12, cursor: 'pointer' }}>
            Cerrar
          </button>
        </div>
      </div>

      {autDevolucion && (
        <AutorizacionAdminModal
          motivo={autDevolucion.motivo}
          onAutorizado={(admin) => { setAutDevolucion(null); enviarNC(admin); }}
          onCancelar={() => setAutDevolucion(null)}
        />
      )}
      {autAnulacion && (
        <AutorizacionAdminModal
          motivo={autAnulacion.motivo}
          onAutorizado={(admin) => { setAutAnulacion(null); enviarNC(admin); }}
          onCancelar={() => setAutAnulacion(null)}
        />
      )}
    </div>
  );
}
