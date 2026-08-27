import { useState, useMemo } from 'react';
import { X, Inbox, PackageCheck, ThumbsUp, ThumbsDown, Clock, CheckCircle, AlertTriangle } from 'lucide-react';
import toast from 'react-hot-toast';
import type { FacturaRecibida } from './FacturasRecibidas';

const API = 'http://localhost:80/conta-app-backend/api/facturas-recibidas';

// Metadata de los 5 eventos DIAN — colores y descripciones coincide con el
// timeline del listado para que el usuario aprenda el sistema visual.
const EVENTOS = [
  { code: '030', label: 'Acuse de recibo',      desc: 'Confirmar que recibiste la factura por correo. Obligatorio en 3 días hábiles.', icon: Inbox,         color: '#a16207', bg: '#fef3c7' },
  { code: '032', label: 'Recibo del bien/servicio', desc: 'Confirmar que ya te llegó el producto o se prestó el servicio.',            icon: PackageCheck,  color: '#1d4ed8', bg: '#dbeafe' },
  { code: '033', label: 'Aceptación expresa',   desc: 'Aceptar formalmente. La factura se convierte en título valor negociable.',      icon: ThumbsUp,      color: '#15803d', bg: '#dcfce7' },
  { code: '034', label: 'Aceptación tácita',    desc: '3 días hábiles sin rechazar → aceptación automática. Requiere nota oficial.',   icon: Clock,         color: '#0891b2', bg: '#cffafe' },
  { code: '031', label: 'Reclamo (rechazo)',    desc: 'Rechazar la factura por inconsistencias. Requiere motivo.',                     icon: ThumbsDown,    color: '#b91c1c', bg: '#fee2e2' },
] as const;

// Códigos oficiales de rechazo DIAN (más comunes).
// Lista completa en el anexo técnico; el usuario puede tipear otros si necesita.
const REJECTION_CODES = [
  { code: '01', desc: 'Documento con inconsistencias' },
  { code: '02', desc: 'Mercancía no recibida en su totalidad' },
  { code: '03', desc: 'Servicio no prestado' },
  { code: '04', desc: 'Precios incorrectos' },
];

interface Props {
  factura: FacturaRecibida;
  onCerrar: () => void;
  onExito: () => void;
}

export function AplicarEventoModal({ factura, onCerrar, onExito }: Props) {
  const [enviando, setEnviando] = useState(false);
  const [eventCode, setEventCode] = useState<string>('');
  const [rejectionCode, setRejectionCode] = useState('01');
  const [rejectionDesc, setRejectionDesc] = useState('');
  const [note, setNote] = useState('');

  // Reglas de bloqueo por evento — misma lógica que el backend, aplicada acá
  // para dar UX (mostrar deshabilitado con explicación en vez de esperar el 422).
  const aplicados = new Set(factura.eventos_aprobados_arr || []);
  const tiene032 = aplicados.has('032');
  const tiene033 = aplicados.has('033');
  const tiene031 = aplicados.has('031');

  const opciones = useMemo(() => EVENTOS.map(op => {
    const yaAplicado = aplicados.has(op.code);
    // Regla LGC12: 033 y 031 requieren 032 previo
    const requiere032 = (op.code === '033' || op.code === '031') && !tiene032;
    // Exclusión mutua
    const mutex = (op.code === '033' && tiene031) || (op.code === '031' && tiene033);
    // 034 no chequea rol acá — el backend lo valida contra el certificado
    const disabled = yaAplicado || requiere032 || mutex;
    const badgeText = yaAplicado ? '✓ Ya registrado'
                    : requiere032 ? 'Requiere 032 previo'
                    : mutex ? `Excluye ${tiene031 ? '031' : '033'}`
                    : null;
    return { ...op, yaAplicado, disabled, badgeText };
  }), [aplicados, tiene032, tiene033, tiene031]);

  // Auto-seleccionar el primer evento disponible al abrir (típicamente 030)
  useMemo(() => {
    if (!eventCode) {
      const primero = opciones.find(o => !o.disabled);
      if (primero) setEventCode(primero.code);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [opciones]);

  const enviar = async () => {
    if (!eventCode) return;
    if (eventCode === '031' && (!rejectionCode.trim() || !rejectionDesc.trim())) {
      toast.error('Reclamo (031) requiere código y descripción');
      return;
    }
    if (eventCode === '034' && !note.trim()) {
      toast.error('Aceptación Tácita (034) requiere el texto oficial DIAN');
      return;
    }

    setEnviando(true);
    toast.loading('Firmando y enviando a DIAN...', { id: 'evt' });
    try {
      const body: any = {
        factura_recibida_id: factura.id,
        event_code: eventCode,
      };
      if (eventCode === '031') {
        body.rejection_code = rejectionCode.trim();
        body.rejection_description = rejectionDesc.trim();
      }
      if (eventCode === '034') {
        body.note = note.trim();
      }
      const r = await fetch(`${API}/evento-emitir.php`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const d = await r.json();
      if (d.success) {
        toast.success(`Evento ${eventCode} registrado en DIAN`, { id: 'evt', duration: 5000 });
        onExito();
      } else {
        toast.error(d.message || 'DIAN no aceptó el evento', { id: 'evt', duration: 10000 });
      }
    } catch (e) {
      toast.error('Error de conexión', { id: 'evt' });
    }
    setEnviando(false);
  };

  const sel = opciones.find(o => o.code === eventCode);

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 99999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.5)' }} onClick={onCerrar} />
      <div style={{ position: 'relative', background: '#fff', borderRadius: 14, width: 620, maxHeight: '90vh', display: 'flex', flexDirection: 'column', boxShadow: '0 20px 60px rgba(0,0,0,0.3)', overflow: 'hidden' }}>

        {/* Header */}
        <div style={{ padding: '14px 20px', background: '#f8fafc', borderBottom: '1px solid #e5e7eb', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: 15, fontWeight: 700 }}>Aplicar evento DIAN</div>
            <div style={{ fontSize: 12, color: '#6b7280' }}>
              {factura.prefijo}{factura.numero} · {factura.emisor_nombre}
            </div>
          </div>
          <button onClick={onCerrar} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflow: 'auto', padding: 16 }}>
          <div style={{ fontSize: 11, color: '#6b7280', marginBottom: 8, fontWeight: 600, textTransform: 'uppercase' }}>Selecciona el evento</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 6, marginBottom: 12 }}>
            {opciones.map(op => {
              const Icon = op.icon;
              const active = eventCode === op.code && !op.disabled;
              return (
                <button
                  key={op.code}
                  disabled={op.disabled || enviando}
                  onClick={() => setEventCode(op.code)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    padding: '10px 12px', borderRadius: 8,
                    border: active ? `2px solid ${op.color}` : '1px solid #e5e7eb',
                    background: active ? op.bg : op.disabled ? '#f9fafb' : '#fff',
                    cursor: op.disabled ? 'not-allowed' : 'pointer',
                    opacity: op.disabled ? 0.5 : 1,
                    textAlign: 'left', width: '100%',
                  }}>
                  <div style={{ width: 32, height: 32, borderRadius: 8, background: op.bg, color: op.color, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Icon size={16} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: op.color }}>
                      {op.code} · {op.label}
                    </div>
                    <div style={{ fontSize: 11, color: '#6b7280', marginTop: 2 }}>{op.desc}</div>
                  </div>
                  {op.badgeText && (
                    <span style={{
                      padding: '3px 8px', borderRadius: 4, fontSize: 10, fontWeight: 600,
                      background: op.yaAplicado ? '#dcfce7' : '#fef3c7',
                      color: op.yaAplicado ? '#15803d' : '#a16207',
                      whiteSpace: 'nowrap',
                    }}>{op.badgeText}</span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Campos adicionales según evento */}
          {eventCode === '031' && (
            <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: 12, marginBottom: 8 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#b91c1c', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                <AlertTriangle size={14} /> Motivo del reclamo
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '110px 1fr', gap: 8, marginBottom: 8 }}>
                <label style={{ fontSize: 11, alignSelf: 'center' }}>Código *</label>
                <select value={rejectionCode} onChange={e => setRejectionCode(e.target.value)}
                  style={{ height: 30, border: '1px solid #d1d5db', borderRadius: 6, fontSize: 12, padding: '0 8px' }}>
                  {REJECTION_CODES.map(rc => (
                    <option key={rc.code} value={rc.code}>{rc.code} — {rc.desc}</option>
                  ))}
                </select>
                <label style={{ fontSize: 11 }}>Descripción *</label>
                <textarea value={rejectionDesc} onChange={e => setRejectionDesc(e.target.value)}
                  placeholder="Motivo detallado del rechazo…" rows={2}
                  style={{ border: '1px solid #d1d5db', borderRadius: 6, fontSize: 12, padding: 6, resize: 'vertical' }} />
              </div>
            </div>
          )}

          {eventCode === '034' && (
            <div style={{ background: '#ecfeff', border: '1px solid #a5f3fc', borderRadius: 8, padding: 12, marginBottom: 8 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#0891b2', marginBottom: 6 }}>
                Nota oficial (formato DIAN sec 6.5.5.7)
              </div>
              <div style={{ fontSize: 10, color: '#6b7280', marginBottom: 6 }}>
                Debe declarar bajo gravedad de juramento la aceptación tácita por silencio del adquirente en 3 días hábiles. Consulta el anexo técnico DIAN para el texto exacto.
              </div>
              <textarea value={note} onChange={e => setNote(e.target.value)}
                placeholder="Bajo la gravedad de juramento…" rows={4}
                style={{ width: '100%', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 12, padding: 6, resize: 'vertical', boxSizing: 'border-box' }} />
            </div>
          )}

          {/* Resumen antes de enviar */}
          {sel && !sel.disabled && (
            <div style={{ background: '#f9fafb', borderRadius: 8, padding: 10, fontSize: 11, color: '#374151' }}>
              <div><b>CUFE:</b> <span style={{ fontFamily: 'monospace', fontSize: 10 }}>{factura.cufe.substring(0, 40)}…</span></div>
              <div><b>Emisor:</b> {factura.emisor_nombre} ({factura.emisor_nit})</div>
              <div><b>Total:</b> $ {Math.round(factura.total).toLocaleString('es-CO')}</div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ padding: '10px 16px', borderTop: '1px solid #e5e7eb', display: 'flex', justifyContent: 'flex-end', gap: 6 }}>
          <button onClick={onCerrar} disabled={enviando}
            style={{ height: 32, padding: '0 14px', background: '#f3f4f6', border: '1px solid #e5e7eb', borderRadius: 6, cursor: 'pointer', fontSize: 12 }}>
            Cancelar
          </button>
          <button onClick={enviar} disabled={enviando || !eventCode || sel?.disabled}
            style={{
              height: 32, padding: '0 16px',
              background: sel && !sel.disabled ? sel.color : '#d1d5db',
              color: '#fff', border: 'none', borderRadius: 6,
              fontSize: 12, fontWeight: 700,
              cursor: (enviando || !eventCode || sel?.disabled) ? 'default' : 'pointer',
              display: 'flex', alignItems: 'center', gap: 6,
              opacity: enviando ? 0.6 : 1,
            }}>
            <CheckCircle size={13} /> {enviando ? 'Enviando…' : `Registrar ${eventCode || 'evento'}`}
          </button>
        </div>
      </div>
    </div>
  );
}
