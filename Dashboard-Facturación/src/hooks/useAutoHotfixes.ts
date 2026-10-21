import { useEffect } from 'react';
import toast from 'react-hot-toast';
import { getApiUrl } from '../config/api';

/**
 * Descarga y aplica hotfixes SQL remotos a la BD local del cliente.
 *
 * Problema que resuelve: cuando sale un bug tipo "TipoPago en egresos" (reporte
 * Nutrigranos 2026-10-21, tercera iteración del mismo problema), hoy toca pasar
 * el .sql a cada cliente manualmente. Semanas de rollout. Este hook automatiza:
 * la app chequea 1 vez al día si hay fixes nuevos en innovacion-digital.com,
 * los descarga y los aplica contra el MySQL local vía endpoint PHP.
 *
 * Flujo:
 *   1. Fetch https://innovacion-digital.com/hotfixes-contaft/index.json
 *   2. Para cada fix cuyo id no está en localStorage(`hotfix_${id}`):
 *      a) Descargar el .sql.
 *      b) POST a /api/migraciones/aplicar.php con { id, sha256, sql }.
 *      c) El backend verifica el hash + lo aplica si no estaba.
 *      d) Guardar en localStorage para no reintentar en la misma máquina.
 *   3. Toast silencioso: solo mostramos si HUBO algún fix nuevo aplicado.
 *
 * Reglas respetadas:
 *   - Dev no llama servicios externos (feedback_dev_mode): salimos temprano
 *     si `isDev === true`.
 *   - No corre más de 1 vez cada 6 horas por sesión (localStorage timestamp).
 *   - Errores silenciosos — si el fetch falla por red, no molestamos al cajero.
 *   - El SQL verifica su hash SHA-256 en el backend antes de ejecutar.
 */

const INDEX_URL = 'https://innovacion-digital.com/hotfixes-contaft/index.json';
const applyEndpoint = () => `${getApiUrl()}/migraciones/aplicar.php`;
const CHECK_INTERVAL_MS = 6 * 60 * 60 * 1000; // 6 horas
const LAST_CHECK_KEY = 'hotfix_last_check';
const APPLIED_KEY_PREFIX = 'hotfix_applied_';

interface HotfixEntry {
  id: string;
  descripcion: string;
  url: string;
  sha256: string;
  critico?: boolean;
  min_version?: string;
}

interface HotfixIndex {
  fixes: HotfixEntry[];
}

const yaAplicadoLocal = (id: string): boolean =>
  localStorage.getItem(APPLIED_KEY_PREFIX + id) === '1';

const marcarAplicadoLocal = (id: string) =>
  localStorage.setItem(APPLIED_KEY_PREFIX + id, '1');

const deboCorrer = (): boolean => {
  const last = parseInt(localStorage.getItem(LAST_CHECK_KEY) || '0', 10);
  return Date.now() - last > CHECK_INTERVAL_MS;
};

const marcarCorrido = () =>
  localStorage.setItem(LAST_CHECK_KEY, String(Date.now()));

async function aplicarHotfix(fix: HotfixEntry): Promise<boolean> {
  try {
    const resSql = await fetch(fix.url, { cache: 'no-store' });
    if (!resSql.ok) return false;
    const sql = await resSql.text();

    const res = await fetch(applyEndpoint(), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: fix.id, sha256: fix.sha256, sql }),
    });
    const d = await res.json();
    if (d.success || d.ya_aplicado) {
      marcarAplicadoLocal(fix.id);
      return !!d.success && !d.ya_aplicado;
    }
    console.warn(`[hotfix] ${fix.id} falló:`, d.message);
    return false;
  } catch (e) {
    console.warn(`[hotfix] ${fix.id} error red:`, e);
    return false;
  }
}

export function useAutoHotfixes(isDev: boolean) {
  useEffect(() => {
    if (isDev) return;
    if (!deboCorrer()) return;

    const run = async () => {
      try {
        const r = await fetch(INDEX_URL, { cache: 'no-store' });
        if (!r.ok) return;
        const idx: HotfixIndex = await r.json();
        const pendientes = (idx.fixes ?? []).filter((f) => !yaAplicadoLocal(f.id));
        if (pendientes.length === 0) {
          marcarCorrido();
          return;
        }
        let aplicadosNuevos = 0;
        for (const fix of pendientes) {
          const nuevo = await aplicarHotfix(fix);
          if (nuevo) aplicadosNuevos++;
        }
        if (aplicadosNuevos > 0) {
          toast.success(
            aplicadosNuevos === 1
              ? 'Mantenimiento aplicado: 1 fix de BD'
              : `Mantenimiento aplicado: ${aplicadosNuevos} fixes de BD`,
            { duration: 4000 },
          );
        }
        marcarCorrido();
      } catch (e) {
        console.warn('[hotfix] no se pudo chequear index:', e);
      }
    };

    // Pequeño delay para no competir con el arranque pesado del login.
    const t = setTimeout(run, 8000);
    return () => clearTimeout(t);
  }, [isDev]);
}
