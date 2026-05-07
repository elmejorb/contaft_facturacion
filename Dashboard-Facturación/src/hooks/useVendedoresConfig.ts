import { useState, useEffect, useCallback } from 'react';

const API = 'http://localhost:80/conta-app-backend/api/vendedores';

export interface VendedoresConfig {
  id: number;
  habilitado: number;
  api_url: string;
  api_email: string;
  api_token_empresa: string;
  sync_intervalo_pull_min: number;
  ultimo_pull_ventas: string | null;
  ultimo_pull_id: number;
  fecha_mod: string;
}

export function useVendedoresConfig() {
  const [config, setConfig] = useState<VendedoresConfig | null>(null);
  const [loading, setLoading] = useState(false);
  const [pedidosPendientes, setPedidosPendientes] = useState(0);
  const [feVendedores, setFeVendedores] = useState(0);

  const fetchConfig = useCallback(async () => {
    try {
      const r = await fetch(`${API}/config.php`);
      const d = await r.json();
      if (d.success) {
        setConfig(d.config);
        setPedidosPendientes(d.pedidos_pendientes || 0);
        setFeVendedores(d.fe_vendedores || 0);
      }
    } catch (e) {}
  }, []);

  useEffect(() => {
    fetchConfig();
  }, [fetchConfig]);

  const guardar = async (data: Partial<VendedoresConfig>) => {
    try {
      const r = await fetch(`${API}/config.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'guardar', ...data }),
      });
      const d = await r.json();
      if (d.success) {
        await fetchConfig();
        return { success: true, message: d.message };
      }
      return { success: false, message: d.message };
    } catch (e) {
      return { success: false, message: 'Error de conexión' };
    }
  };

  const probarConexion = async (apiUrl: string, apiEmail: string, apiToken: string) => {
    try {
      const r = await fetch(`${API}/config.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'probar', api_url: apiUrl, api_email: apiEmail, api_token_empresa: apiToken }),
      });
      const d = await r.json();
      return { success: d.success, message: d.message };
    } catch (e) {
      return { success: false, message: 'Error de conexión' };
    }
  };

  const pullAhora = async () => {
    setLoading(true);
    try {
      const r = await fetch(`${API}/config.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'pull_ahora' }),
      });
      const d = await r.json();
      if (d.success) {
        await fetchConfig();
      }
      setLoading(false);
      return d;
    } catch (e) {
      setLoading(false);
      return { success: false, message: 'Error de conexión' };
    }
  };

  return {
    config,
    loading,
    pedidosPendientes,
    feVendedores,
    habilitado: config?.habilitado === 1,
    refetch: fetchConfig,
    guardar,
    probarConexion,
    pullAhora,
  };
}
