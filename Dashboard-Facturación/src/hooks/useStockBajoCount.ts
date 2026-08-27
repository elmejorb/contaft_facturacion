// Hook aislado para usar en el sidebar/notifs sin arrastrar el bundle completo
// del componente StockBajo (que usa AG Grid).
import { useEffect, useState } from 'react';

const API = 'http://localhost:80/conta-app-backend/api/familias/stock-bajo.php';

export function useStockBajoCount() {
  const [count, setCount] = useState(0);
  useEffect(() => {
    let cancelled = false;
    const cargar = async () => {
      try {
        const r = await fetch(API);
        const d = await r.json();
        if (!cancelled && d.success) setCount(d.total || 0);
      } catch (e) {}
    };
    cargar();
    const timer = setInterval(cargar, 5 * 60 * 1000);
    return () => { cancelled = true; clearInterval(timer); };
  }, []);
  return count;
}
