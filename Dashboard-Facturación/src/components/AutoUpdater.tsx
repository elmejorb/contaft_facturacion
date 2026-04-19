import { useEffect, useRef } from 'react';
import toast from 'react-hot-toast';

const getIpc = (): any => {
  try {
    // @ts-ignore
    if (typeof window !== 'undefined' && (window as any).require) {
      // @ts-ignore
      return (window as any).require('electron').ipcRenderer;
    }
  } catch {}
  return null;
};

export function AutoUpdater() {
  const warnedSubRef = useRef(false);

  useEffect(() => {
    const ipc = getIpc();
    if (!ipc) return;

    const onAvailable = (_: any, info: any) => {
      toast(`Descargando actualización ${info?.version ?? ''}...`, { icon: '⬇️', duration: 4000 });
    };

    const onDownloaded = (_: any, info: any) => {
      toast(
        (t) => (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <div style={{ fontWeight: 600 }}>Actualización lista {info?.version ? `(v${info.version})` : ''}</div>
            <div style={{ fontSize: 12, color: '#4b5563' }}>Reinicia para aplicarla.</div>
            <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
              <button
                onClick={() => { ipc.invoke('updater:install'); toast.dismiss(t.id); }}
                style={{ padding: '4px 10px', background: '#7c3aed', color: '#fff', border: 'none', borderRadius: 4, fontSize: 12, cursor: 'pointer' }}
              >
                Reiniciar ahora
              </button>
              <button
                onClick={() => toast.dismiss(t.id)}
                style={{ padding: '4px 10px', background: '#e5e7eb', color: '#111827', border: 'none', borderRadius: 4, fontSize: 12, cursor: 'pointer' }}
              >
                Más tarde
              </button>
            </div>
          </div>
        ),
        { duration: Infinity }
      );
    };

    const onSubscription = (_: any, sub: any) => {
      if (warnedSubRef.current) return;

      if (sub?.estado === 'por_vencer') {
        const dias = sub?.data?.suscripcion?.dias_restantes;
        toast(
          `Tu suscripción vence en ${dias ?? '<7'} día(s). Renuévala para seguir recibiendo actualizaciones.`,
          { icon: '⚠️', duration: 8000, style: { background: '#fef3c7', color: '#92400e' } }
        );
        warnedSubRef.current = true;
      } else if (sub?.estado === 'vencido' || sub?.reason === 'sin-plan') {
        toast(
          'Suscripción vencida. Contacta a Innovación Digital para renovar.',
          { icon: '⛔', duration: 10000, style: { background: '#fee2e2', color: '#991b1b' } }
        );
        warnedSubRef.current = true;
      } else if (sub?.reason === 'no-token') {
        console.warn('[updater] config.json no tiene token_consulta');
      }
    };

    ipc.on('updater:available', onAvailable);
    ipc.on('updater:downloaded', onDownloaded);
    ipc.on('subscription:status', onSubscription);

    return () => {
      ipc.removeListener('updater:available', onAvailable);
      ipc.removeListener('updater:downloaded', onDownloaded);
      ipc.removeListener('subscription:status', onSubscription);
    };
  }, []);

  return null;
}
