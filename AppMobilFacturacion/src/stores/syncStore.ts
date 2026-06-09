import { create } from 'zustand';

interface SyncState {
  /** Si hay una sync en curso (auto o manual). */
  syncing: boolean;
  /** Timestamp en ms de la última vez que terminó una sync (auto o manual). */
  lastSyncAt: number | null;
  /** Última estadística de envío (para mostrar toasts si se desea). */
  lastResult: { sent: number; failed: number; total: number } | null;

  startSync: () => void;
  finishSync: (result?: { sent: number; failed: number; total: number }) => void;
}

export const useSyncStore = create<SyncState>((set) => ({
  syncing: false,
  lastSyncAt: null,
  lastResult: null,
  startSync: () => set({ syncing: true }),
  finishSync: (result) =>
    set({
      syncing: false,
      lastSyncAt: Date.now(),
      lastResult: result ?? null,
    }),
}));
