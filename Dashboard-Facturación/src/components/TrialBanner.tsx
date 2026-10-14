import { useEffect, useState } from 'react';

// Banner superior que muestra días restantes del trial de 30 días.
// Si la suscripción está activa O no está en modo embebido, no renderiza nada.
// Si el trial venció, muestra banner rojo con botón "Activar ahora".
//
// La lógica de bloqueo de botones (Nueva Venta / Nueva Compra) la maneja
// el componente que use useTrial() preguntando por vencido=true.

export type TrialEstado = {
  activo: boolean;        // ¿Hay trial corriendo?
  iniciado: boolean;      // ¿Se guardó la fecha de inicio?
  suscripcion?: boolean;  // true si ya pagó (y trial ya no aplica)
  dias_transcurridos?: number;
  dias_restantes?: number;
  vencido?: boolean;
  nivel?: 'verde' | 'amarillo' | 'rojo';
};

export function useTrial(): TrialEstado {
  const [estado, setEstado] = useState<TrialEstado>({ activo: false, iniciado: false });

  useEffect(() => {
    const ipc = (window as any).require?.('electron')?.ipcRenderer;
    if (!ipc) return;
    const consultar = () => ipc.invoke('trial:getStatus').then(setEstado).catch(() => {});
    consultar();
    const t = setInterval(consultar, 60_000 * 30); // Cada 30 min
    return () => clearInterval(t);
  }, []);

  return estado;
}

export default function TrialBanner({ onActivar }: { onActivar?: () => void }) {
  const t = useTrial();
  if (!t.activo) return null; // No hay trial o ya está activada la suscripción

  const colores = {
    verde:    { bg: '#dcfce7', border: '#86efac', text: '#166534' },
    amarillo: { bg: '#fef3c7', border: '#fcd34d', text: '#92400e' },
    rojo:     { bg: '#fee2e2', border: '#fca5a5', text: '#991b1b' },
  };
  const c = colores[t.nivel || 'verde'];

  const mensaje = t.vencido
    ? 'Tu prueba de 30 días venció. Activa tu licencia para seguir facturando — tu información queda intacta.'
    : t.dias_restantes === 1
    ? '⚠ Tu prueba vence mañana — activa tu licencia para no perder el acceso a facturación'
    : `Prueba gratis — ${t.dias_restantes} días restantes`;

  return (
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
        onClick={onActivar}
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
        {t.vencido ? 'Activar ahora' : 'Activar licencia'}
      </button>
    </div>
  );
}
