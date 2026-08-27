// Hook aislado para usar en el sidebar/badges sin arrastrar el bundle completo
// del componente CumpleanosClientes.
import { useEffect, useState } from 'react';

const API = 'http://localhost:80/conta-app-backend/api/clientes/cumpleanos.php';

export function useCumpleanosHoy() {
  const [cumpleHoy, setCumpleHoy] = useState<any[]>([]);
  useEffect(() => {
    fetch(`${API}?rango=7`)
      .then(r => r.json())
      .then(d => { if (d.success) setCumpleHoy(d.clientes); })
      .catch(() => {});
  }, []);
  return cumpleHoy;
}
