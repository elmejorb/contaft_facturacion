import { useEffect, useState } from 'react';

/**
 * Módulos que el CRM emite en el JWT firmado. Todos aparecen siempre;
 * uno no contratado va con `activo: false`.
 * Ver: CRM InnovacionDG/INTEGRACION_ENTITLEMENTS.md
 */
export interface EntitlementModulo {
  activo: boolean;
  vigencia_hasta?: string;   // YYYY-MM-DD
  cantidad?: number;         // solo módulos con unidad variable (vendedor_movil)
}

export interface Entitlements {
  nucleo: EntitlementModulo;
  facturacion_electronica: EntitlementModulo;
  dsno: EntitlementModulo;
  plataforma_web: EntitlementModulo;
  vendedor_movil: EntitlementModulo;
  instalacion: EntitlementModulo;
}

export interface EntitlementsState {
  loading: boolean;
  source: 'online' | 'cache' | 'emergency' | null;
  cliente_id?: number;
  empresa?: string;
  modulos: Entitlements | null;
  error?: string;
  refetch: () => void;
}

const MODULOS_INACTIVOS: Entitlements = {
  nucleo:                  { activo: true },
  facturacion_electronica: { activo: false },
  dsno:                    { activo: false },
  plataforma_web:          { activo: false },
  vendedor_movil:          { activo: false },
  instalacion:             { activo: false },
};

export function useEntitlements(): EntitlementsState {
  const [state, setState] = useState<EntitlementsState>({
    loading: true,
    source: null,
    modulos: null,
    refetch: () => {},
  });

  const fetchEntitlements = async () => {
    let ipcRenderer: any;
    try {
      ipcRenderer = (window as any).require?.('electron')?.ipcRenderer;
    } catch { /* fuera de electron */ }

    if (!ipcRenderer) {
      // Web/dev sin Electron — asumir todo activo para no bloquear desarrollo
      setState({
        loading: false,
        source: null,
        modulos: {
          nucleo:                  { activo: true },
          facturacion_electronica: { activo: true },
          dsno:                    { activo: true },
          plataforma_web:          { activo: true },
          vendedor_movil:          { activo: true, cantidad: 99 },
          instalacion:             { activo: true },
        },
        refetch: fetchEntitlements,
      });
      return;
    }

    try {
      const r = await ipcRenderer.invoke('entitlements:get');
      if (r?.modulos) {
        setState({
          loading: false,
          source: r.source ?? null,
          cliente_id: r.payload?.cliente_id,
          empresa: r.payload?.empresa,
          modulos: r.modulos,
          error: r.ok === false ? r.reason : undefined,
          refetch: fetchEntitlements,
        });
      } else {
        setState({
          loading: false,
          source: 'emergency',
          modulos: MODULOS_INACTIVOS,
          error: r?.reason || 'sin-datos',
          refetch: fetchEntitlements,
        });
      }
    } catch (e: any) {
      setState({
        loading: false,
        source: 'emergency',
        modulos: MODULOS_INACTIVOS,
        error: e?.message || 'error',
        refetch: fetchEntitlements,
      });
    }
  };

  useEffect(() => {
    fetchEntitlements();
    // Revalidación oportunista cada 15 min mientras la app está abierta
    const iv = setInterval(fetchEntitlements, 15 * 60 * 1000);
    return () => clearInterval(iv);
  }, []);

  return { ...state, refetch: fetchEntitlements };
}
