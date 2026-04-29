import { useEffect, useState, useCallback } from 'react';

export interface Notificaciones {
  vencidos: number;       // Lotes ya vencidos con stock
  porVencer30: number;    // Lotes que vencen en ≤30 días
  stockBajo: number;      // Productos por debajo de mínimo
  cumpleanosHoy: number;  // Clientes que cumplen años hoy
  cumpleanosProx: number; // Clientes que cumplen en próximos 7 días
  total: number;
  loading: boolean;
  refresh: () => void;
}

/** Disparar este evento desde cualquier componente para forzar refresh del badge:
 *  window.dispatchEvent(new CustomEvent('notificaciones:refresh'));
 */
export const triggerNotifRefresh = () => {
  window.dispatchEvent(new CustomEvent('notificaciones:refresh'));
};

const API_LOTES = 'http://localhost:80/conta-app-backend/api/lotes/index.php';
const API_STOCK = 'http://localhost:80/conta-app-backend/api/familias/stock-bajo.php';
const API_CUMPLE = 'http://localhost:80/conta-app-backend/api/clientes/cumpleanos.php';

export function useNotificaciones(): Notificaciones {
  const [vencidos, setVencidos] = useState(0);
  const [porVencer30, setPorVencer30] = useState(0);
  const [stockBajo, setStockBajo] = useState(0);
  const [cumpleanosHoy, setCumpleanosHoy] = useState(0);
  const [cumpleanosProx, setCumpleanosProx] = useState(0);
  const [loading, setLoading] = useState(true);

  const cargar = useCallback(async () => {
    try {
      const [lotesRes, stockRes, cumpleRes] = await Promise.allSettled([
        fetch(`${API_LOTES}?por_vencer=1`).then(r => r.json()),
        fetch(API_STOCK).then(r => r.json()),
        fetch(API_CUMPLE).then(r => r.json()),
      ]);

      if (lotesRes.status === 'fulfilled' && lotesRes.value.success) {
        const r = lotesRes.value.resumen || {};
        setVencidos(r.vencidos || 0);
        setPorVencer30(r.d_30 || 0);
      }
      if (stockRes.status === 'fulfilled' && stockRes.value.success) {
        setStockBajo(stockRes.value.total || 0);
      }
      if (cumpleRes.status === 'fulfilled' && cumpleRes.value.success) {
        const cumples = cumpleRes.value.cumpleanos || [];
        setCumpleanosHoy(cumples.filter((c: any) => c.dias_para_cumple === 0).length);
        setCumpleanosProx(cumples.filter((c: any) => c.dias_para_cumple > 0 && c.dias_para_cumple <= 7).length);
      }
    } catch (e) {} finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    cargar();
    const timer = setInterval(cargar, 5 * 60 * 1000); // refresca cada 5 min
    const onFocus = () => cargar();
    const onCustom = () => cargar();
    window.addEventListener('focus', onFocus);
    window.addEventListener('notificaciones:refresh', onCustom);
    return () => {
      clearInterval(timer);
      window.removeEventListener('focus', onFocus);
      window.removeEventListener('notificaciones:refresh', onCustom);
    };
  }, [cargar]);

  const total = vencidos + porVencer30 + stockBajo + cumpleanosHoy + cumpleanosProx;
  return { vencidos, porVencer30, stockBajo, cumpleanosHoy, cumpleanosProx, total, loading, refresh: cargar };
}
