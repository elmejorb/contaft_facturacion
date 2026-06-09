import NetInfo, { NetInfoState } from '@react-native-community/netinfo';
import { create } from 'zustand';

interface NetworkState {
  online: boolean;
  type: string | null;
  initialized: boolean;
  init: () => () => void;
  setOnline: (v: boolean, type?: string | null) => void;
}

export const useNetworkStore = create<NetworkState>((set, get) => ({
  online: true,
  type: null,
  initialized: false,

  setOnline: (online, type) => set({ online, type: type ?? null }),

  init: () => {
    if (get().initialized) return () => {};

    const unsub = NetInfo.addEventListener((state: NetInfoState) => {
      const isOnline = !!state.isConnected && state.isInternetReachable !== false;
      set({
        online: isOnline,
        type: state.type,
        initialized: true,
      });
    });

    // Inicial
    NetInfo.fetch().then((state: NetInfoState) => {
      const isOnline = !!state.isConnected && state.isInternetReachable !== false;
      set({
        online: isOnline,
        type: state.type,
        initialized: true,
      });
    });

    return unsub;
  },
}));
