import { useEffect, useState, useCallback } from 'react';

export interface ModuloInfo {
  Nombre: string;
  Activo: number;
  Descripcion: string;
  Fecha_Activacion: string | null;
}

const API = 'http://localhost:80/conta-app-backend/api/modulos/estado.php';

/**
 * Devuelve el estado de los módulos opcionales (activos/inactivos).
 * Usado por el Dashboard para ocultar módulos no activados en el menú lateral.
 *
 * Dispara `window.dispatchEvent(new CustomEvent('modulos:refresh'))` desde
 * cualquier parte para forzar un re-fetch (ej. tras activar/desactivar).
 */
export function useModulos() {
  const [modulos, setModulos] = useState<ModuloInfo[]>([]);
  const [loading, setLoading] = useState(true);

  const cargar = useCallback(async () => {
    try {
      const r = await fetch(API);
      const d = await r.json();
      if (d.success) setModulos(d.modulos || []);
    } catch { /* fallback silencioso: módulos vacíos → nada activo */ }
    setLoading(false);
  }, []);

  useEffect(() => {
    cargar();
    const onRefresh = () => cargar();
    window.addEventListener('modulos:refresh', onRefresh);
    return () => window.removeEventListener('modulos:refresh', onRefresh);
  }, [cargar]);

  const esActivo = (nombre: string) => modulos.some(m => m.Nombre === nombre && Number(m.Activo) === 1);
  return { modulos, loading, esActivo, refresh: cargar };
}

export const triggerModulosRefresh = () =>
  window.dispatchEvent(new CustomEvent('modulos:refresh'));
