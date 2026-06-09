import { useEffect, useRef } from 'react';
import toast from 'react-hot-toast';

const API = 'http://localhost:80/conta-app-backend/api/vendedores';
const PULL_URL = `${API}/pull.php`;
const CONFIG_URL = `${API}/config.php`;
const MIN_INTERVAL_MIN = 1;
const DEFAULT_INTERVAL_MIN = 5;

// Auto-sync silencioso del módulo Vendedores Móviles.
// Cada N minutos (config sync_intervalo_pull_min) llama al pull si el módulo
// está habilitado. Solo muestra toast cuando hay cambios reales que reportar;
// errores de conexión son silenciosos para no spamear al usuario cuando el
// hub no esté disponible.
export function useAutoSyncVendedores() {
  const timerRef = useRef<any>(null);
  const ejecutando = useRef(false);

  useEffect(() => {
    let cancelado = false;

    const tickPull = async () => {
      if (ejecutando.current) return;
      ejecutando.current = true;
      try {
        const r = await fetch(PULL_URL);
        const d = await r.json();
        if (cancelado) return;
        if (d?.success) {
          const partes: string[] = [];
          if ((d.pedidos_nuevos ?? 0) > 0) partes.push(`${d.pedidos_nuevos} pedido(s)`);
          if ((d.fe_nuevas ?? 0) > 0) partes.push(`${d.fe_nuevas} FE`);
          if ((d.clientes_nuevos_creados ?? 0) > 0) partes.push(`${d.clientes_nuevos_creados} cliente(s) nuevo(s)`);
          if ((d.ediciones_clientes_aplicadas ?? 0) > 0) partes.push(`${d.ediciones_clientes_aplicadas} cliente(s) actualizado(s)`);
          if (partes.length > 0) {
            toast.success(`📲 Móvil sincronizado: ${partes.join(' + ')}`, { duration: 6000 });
          }
        }
      } catch (e) {
        // silencio — el hub puede estar caído, sin red, etc. No alertar.
      } finally {
        ejecutando.current = false;
      }
    };

    const arrancar = async () => {
      try {
        const r = await fetch(CONFIG_URL);
        const d = await r.json();
        if (cancelado) return;
        const cfg = d?.config;
        if (!d?.success || !cfg || cfg.habilitado !== 1) {
          return; // módulo apagado — no se programa nada
        }
        if (!cfg.api_url || !cfg.api_email || !cfg.api_token_empresa) {
          return; // sin credenciales
        }

        const minutos = Math.max(MIN_INTERVAL_MIN, parseInt(cfg.sync_intervalo_pull_min) || DEFAULT_INTERVAL_MIN);
        const ms = minutos * 60 * 1000;

        // Primer pull a los 15s del login (no en el instante 0 para no
        // golpear el servidor mientras se carga el Dashboard).
        const primero = setTimeout(tickPull, 15000);
        timerRef.current = { primero, intervalo: null };

        // Luego cada N minutos
        const intervalo = setInterval(tickPull, ms);
        timerRef.current = { primero, intervalo };
      } catch (e) {
        // backend principal no responde — nada que hacer
      }
    };

    arrancar();

    return () => {
      cancelado = true;
      if (timerRef.current?.primero) clearTimeout(timerRef.current.primero);
      if (timerRef.current?.intervalo) clearInterval(timerRef.current.intervalo);
    };
  }, []);
}
