import { useEffect, useState } from 'react';

export interface SincroEstado {
  activo: boolean;
  ultimo_ciclo_at: string | null;
  ultimo_envio_ok_at: string | null;
  ultimo_error: string | null;
  pendientes: number;
  enviados_sesion: number;
}

export interface BackfillResult {
  ok: boolean;
  desde?: string;
  total?: number;
  encolados?: { cliente?: number; articulo?: number; proveedor?: number; venta?: number; pago?: number };
  error?: string;
}

const ESTADO_INICIAL: SincroEstado = {
  activo: false,
  ultimo_ciclo_at: null,
  ultimo_envio_ok_at: null,
  ultimo_error: null,
  pendientes: 0,
  enviados_sesion: 0,
};

export interface SincroHook extends SincroEstado {
  forzarCiclo: () => Promise<SincroEstado | null>;
  backfill: (desdeIso: string) => Promise<BackfillResult>;
}

/**
 * Lee el estado del SincroWorker (main process). Pollea cada 10s +
 * también escucha pushes del main cuando algo cambia (`sync:estado` event).
 */
export function useSincronizacion(): SincroHook {
  const [estado, setEstado] = useState<SincroEstado>(ESTADO_INICIAL);

  useEffect(() => {
    let ipc: any = null;
    try { ipc = (window as any).require?.('electron')?.ipcRenderer; } catch {}
    if (!ipc) return;

    let vivo = true;
    const pull = async () => {
      try {
        const r = await ipc.invoke('sync:estado');
        if (vivo && r) setEstado(r);
      } catch { /* worker aún no iniciado */ }
    };

    pull();
    const t = setInterval(pull, 10 * 1000);

    const onPush = (_e: any, r: SincroEstado) => { if (vivo) setEstado(r); };
    ipc.on('sync:estado', onPush);

    return () => {
      vivo = false;
      clearInterval(t);
      ipc.removeListener?.('sync:estado', onPush);
    };
  }, []);

  const forzarCiclo = async (): Promise<SincroEstado | null> => {
    try {
      const ipc = (window as any).require?.('electron')?.ipcRenderer;
      if (!ipc) return null;
      const r = await ipc.invoke('sync:forzar');
      if (r) setEstado(r);
      return r;
    } catch { return null; }
  };

  const backfill = async (desdeIso: string): Promise<BackfillResult> => {
    try {
      const ipc = (window as any).require?.('electron')?.ipcRenderer;
      if (!ipc) return { ok: false, error: 'no-electron' };
      return await ipc.invoke('sync:backfill', { desde: desdeIso });
    } catch (e: any) {
      return { ok: false, error: String(e?.message || e) };
    }
  };

  return { ...estado, forzarCiclo, backfill };
}
