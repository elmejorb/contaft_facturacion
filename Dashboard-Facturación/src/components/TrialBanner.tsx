import { useEffect, useState } from 'react';
import ActivarLicenciaModal from './ActivarLicenciaModal';

// Banner superior que muestra el estado real del ciclo de suscripción del
// cliente, leído desde /consulta-vencimiento del CRM (campo canónico
// estado_suscripcion).
//
// IMPORTANTE: NO confundir con el estado de licencia del software que usa
// SubscriptionGate (/consulta-plan). Este banner es sobre el ciclo
// comercial: trial / activa / por vencer / vencida / suspendida.
//
// Niveles:
//   - verde: trial con >=7 días o activa sin urgencia
//   - amarillo: trial <7 días o faltan <15 días de la suscripción
//   - rojo: vencida, suspendida, cancelada o urgente

type Datos = {
  empresa?: string;
  estado?: string;              // viejo (software licencia) — no usar aquí
  estado_suscripcion?: string;  // CANÓNICO: activa | prueba | suspendida | cancelada | vencida | sin_suscripcion
  fecha_fin?: string;
  dias_restantes?: number | null;
  en_trial?: boolean;
  urgente?: boolean;
  pago_al_dia?: boolean;
  pagos_pendientes_revision?: number;
  ultimo_rechazo?: { fecha: string; motivo: string } | null;
};

type Respuesta = { ok: boolean; source?: string; data?: Datos; reason?: string };

function ipc() {
  return (window as any).require?.('electron')?.ipcRenderer;
}

export function useLicenciaEstado() {
  const [resp, setResp] = useState<Respuesta | null>(null);

  const refrescar = () => {
    const api = ipc();
    if (!api) return;
    api.invoke('subscription:getVencimiento').then(setResp).catch(() => {});
  };

  useEffect(() => {
    refrescar();
    // Spec: cada 12 h. Y además al focus para no quedar desactualizado.
    const intervalo = setInterval(refrescar, 12 * 60 * 60 * 1000);
    const alFocus = () => refrescar();
    window.addEventListener('focus', alFocus);
    return () => { clearInterval(intervalo); window.removeEventListener('focus', alFocus); };
  }, []);

  const d = resp?.data || {};
  const estado = (d.estado_suscripcion || '').toLowerCase();
  const dias = d.dias_restantes ?? null;

  const esActiva = estado === 'activa';
  const esTrial = estado === 'prueba' || d.en_trial === true;
  const esVencida = estado === 'vencida';
  const esSuspendida = estado === 'suspendida';
  const esCancelada = estado === 'cancelada';
  const esSinSuscripcion = estado === 'sin_suscripcion';

  const bloqueado = esVencida || esSuspendida || esCancelada || esSinSuscripcion;
  const urgente = d.urgente === true || (esActiva && dias !== null && dias < 15);

  let mostrar = false;
  let nivel: 'verde' | 'amarillo' | 'rojo' = 'verde';
  let mensaje = '';

  if (bloqueado) {
    mostrar = true;
    nivel = 'rojo';
    mensaje = esSuspendida
      ? 'Tu suscripción está suspendida. Regularizá el pago para seguir facturando.'
      : esCancelada
      ? 'Tu suscripción fue cancelada. Activá una nueva para seguir facturando.'
      : esSinSuscripcion
      ? 'No tenés suscripción activa. Activá para seguir facturando.'
      : 'Tu licencia venció. Activá tu suscripción — tu información queda intacta.';
  } else if (esTrial) {
    mostrar = true;
    nivel = (dias ?? 0) < 7 ? 'amarillo' : 'verde';
    mensaje = `Prueba gratis — ${dias ?? '?'} días restantes`;
  } else if (urgente) {
    mostrar = true;
    nivel = (dias ?? 0) < 7 ? 'rojo' : 'amarillo';
    mensaje = `Tu suscripción vence en ${dias ?? '?'} días — renová ahora`;
  } else if (d.pagos_pendientes_revision && d.pagos_pendientes_revision > 0) {
    mostrar = true;
    nivel = 'amarillo';
    mensaje = 'Tu comprobante de pago está en revisión. Te avisaremos por email.';
  } else if (d.ultimo_rechazo) {
    mostrar = true;
    nivel = 'rojo';
    mensaje = `Comprobante rechazado: ${d.ultimo_rechazo.motivo}. Volvé a subir uno nuevo.`;
  }

  return { data: d, mostrar, nivel, mensaje, bloqueado, esTrial, refrescar };
}

export default function TrialBanner() {
  const { mostrar, nivel, mensaje, bloqueado, refrescar } = useLicenciaEstado();
  const [modalAbierto, setModalAbierto] = useState(false);

  if (!mostrar && !modalAbierto) return null;

  const colores = {
    verde:    { bg: '#dcfce7', border: '#86efac', text: '#166534' },
    amarillo: { bg: '#fef3c7', border: '#fcd34d', text: '#92400e' },
    rojo:     { bg: '#fee2e2', border: '#fca5a5', text: '#991b1b' },
  };
  const c = colores[nivel];

  return (
    <>
      {mostrar && (
        <div style={{
          background: c.bg,
          borderBottom: `1px solid ${c.border}`,
          color: c.text,
          padding: '6px 16px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          fontSize: 13,
          fontWeight: 500,
        }}>
          <span>{mensaje}</span>
          <button
            onClick={() => setModalAbierto(true)}
            style={{
              background: c.text,
              color: '#fff',
              border: 'none',
              padding: '4px 12px',
              borderRadius: 4,
              fontSize: 12,
              fontWeight: 600,
              cursor: 'pointer',
            }}>
            {bloqueado ? 'Activar ahora' : 'Activar licencia'}
          </button>
        </div>
      )}
      {modalAbierto && (
        <ActivarLicenciaModal onClose={() => { setModalAbierto(false); refrescar(); }} />
      )}
    </>
  );
}
