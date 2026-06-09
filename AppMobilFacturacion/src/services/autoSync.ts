import { useNetworkStore } from '../stores/networkStore';
import { useAuthStore } from '../stores/authStore';
import { useSyncStore } from '../stores/syncStore';
import { flushPendingSales, flushPendingClients, syncCatalogsFromApi } from './syncService';
import { pendingSalesRepo } from '../db/pendingSalesRepo';
import { pendingClientsRepo } from '../db/pendingClientsRepo';

/**
 * AutoSync:
 * 1) Escucha cambios de red (NetInfo vía networkStore). Cuando detecta transición
 *    offline→online, intenta enviar pendientes.
 * 2) Además, polling de respaldo cada 30s. Si hay red y hay pendientes, los envía.
 *    Esto cubre casos donde NetInfo no detecta bien el cambio (especialmente en Android).
 */

let previousOnline: boolean | null = null;
let running = false;
let pollTimer: ReturnType<typeof setInterval> | null = null;

export const initAutoSync = (): (() => void) => {
  // 1) Reaccionar a cambios de red
  const unsubNet = useNetworkStore.subscribe((state) => {
    const isOnline = state.online;
    const wasOffline = previousOnline === false;
    previousOnline = isOnline;

    if (isOnline && wasOffline) {
      void tryRun('network-change');
    }
  });

  // 2) Polling periódico como respaldo
  pollTimer = setInterval(() => {
    void tryRun('poll');
  }, 30_000);

  return () => {
    unsubNet();
    if (pollTimer) {
      clearInterval(pollTimer);
      pollTimer = null;
    }
  };
};

/**
 * Dispara una sync si hay: red + sesión + pendientes + no hay otra corriendo.
 */
export const tryRun = async (source: 'network-change' | 'poll' | 'manual' = 'manual'): Promise<void> => {
  if (running) return;
  const online = useNetworkStore.getState().online;
  if (!online) return;
  const vendor = useAuthStore.getState().vendor;
  const company = useAuthStore.getState().company;
  if (!vendor || !company) return;

  const pendingSalesCount = await pendingSalesRepo.countPending(vendor.id);
  const pendingClientsCount = await pendingClientsRepo.countPending(vendor.id);
  if (pendingSalesCount === 0 && pendingClientsCount === 0) return;

  running = true;
  useSyncStore.getState().startSync();
  try {
    // Enviar clientes PRIMERO — así, si una venta referencia un cliente
    // que también quedó pendiente, ya estará en el servidor cuando intentemos subirla.
    if (pendingClientsCount > 0) {
      await flushPendingClients(vendor.id);
    }
    if (pendingSalesCount > 0) {
      await flushPendingSales(vendor.id);
    }
    // Refresca catálogos en background (no bloquea, si falla no importa)
    syncCatalogsFromApi(company.id).catch(() => {});
  } catch (e) {
    if (__DEV__) console.warn(`[autoSync:${source}] error:`, e);
  } finally {
    useSyncStore.getState().finishSync();
    running = false;
  }
};
