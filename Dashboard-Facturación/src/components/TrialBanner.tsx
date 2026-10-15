import { useEffect, useState } from 'react';
import ActivarLicenciaModal from './ActivarLicenciaModal';

// Banner superior que combina:
//   - Estado real de la suscripción desde el CRM (subscription:check)
//   - Fallback a trial local (trial:getStatus) en modo embebido/offline
//
// Muestra:
//   - Nada: si la suscripción está activa y faltan >=15 días para vencer
//   - Amarillo: faltan <15 días
//   - Rojo: vencida/suspendida
//   - Verde: en trial (modo embebido) con N días restantes
//
// Al clickear "Activar" abre ActivarLicenciaModal (planes + Wompi/comprobante).

type EstadoSuscripcion = {
  allowed: boolean;
  source?: string;
  estado?: string;      // activa | prueba | por_vencer | vencida | suspendida
  fecha_fin?: string;
  empresa?: string;
  plan_nombre?: string;
  dias_restantes?: number;
  reason?: string;
};

type EstadoTrial = {
  activo: boolean;
  iniciado?: boolean;
  dias_restantes?: number;
  vencido?: boolean;
  nivel?: 'verde' | 'amarillo' | 'rojo';
  suscripcion?: boolean;
};

function ipc() {
  return (window as any).require?.('electron')?.ipcRenderer;
}

export function useLicenciaEstado() {
  const [sub, setSub] = useState<EstadoSuscripcion | null>(null);
  const [trial, setTrial] = useState<EstadoTrial | null>(null);

  const refrescar = () => {
    const api = ipc();
    if (!api) return;
    api.invoke('subscription:check').then(setSub).catch(() => {});
    api.invoke('trial:getStatus').then(setTrial).catch(() => {});
  };

  useEffect(() => {
    refrescar();
    // Polling cada 12h — es lo que pide el spec para consulta-vencimiento.
    // Al mismo tiempo lo refrescamos al focus de la ventana para que no quede desactualizado.
    const intervalo = setInterval(refrescar, 12 * 60 * 60 * 1000);
    const alFocus = () => refrescar();
    window.addEventListener('focus', alFocus);
    return () => { clearInterval(intervalo); window.removeEventListener('focus', alFocus); };
  }, []);

  // Resumir: ¿hay que mostrar banner? ¿Está bloqueado?
  const bloqueado = sub?.allowed === false;
  const estadoCrm = sub?.estado;
  const diasRestantes = sub?.dias_restantes ?? null;

  // ¿Mostrar banner?
  let mostrar = false;
  let nivel: 'verde' | 'amarillo' | 'rojo' = 'verde';
  let mensaje = '';

  if (bloqueado) {
    mostrar = true; nivel = 'rojo';
    mensaje = estadoCrm === 'suspendida'
      ? 'Tu suscripción está suspendida. Regularizá el pago para seguir facturando.'
      : 'Tu licencia venció. Activá tu suscripción para seguir facturando — tu información queda intacta.';
  } else if (estadoCrm === 'por_vencer' || (diasRestantes !== null && diasRestantes >= 0 && diasRestantes < 15)) {
    mostrar = true;
    nivel = diasRestantes !== null && diasRestantes < 7 ? 'rojo' : 'amarillo';
    mensaje = `Tu licencia vence en ${diasRestantes ?? '?'} días — renová con descuento pagando ahora`;
  } else if (estadoCrm === 'prueba' && trial?.activo) {
    mostrar = true;
    nivel = (trial.dias_restantes ?? 0) < 7 ? 'amarillo' : 'verde';
    mensaje = `Prueba gratis — ${trial.dias_restantes} días restantes`;
  }

  return { sub, trial, mostrar, nivel, mensaje, bloqueado, refrescar };
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
