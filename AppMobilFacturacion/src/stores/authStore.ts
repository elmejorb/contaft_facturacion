import { create } from 'zustand';
import { storage } from '../services/storage';
import { STORAGE_KEYS } from '../config/env';
import type { VendorDTO, CompanyDTO } from '../services/api';

/**
 * Pareo persistente APK ↔ empresa. Vive separado de la sesión: al hacer
 * logout, el pairing se mantiene y el usuario NO tiene que re-ingresar el
 * código de la empresa. Solo "Cambiar empresa" lo borra.
 */
export interface EmpresaPairing {
  id_empresa: number;
  nombre_empresa: string;
  nit: string | null;
  token_api: string;
}

interface AuthState {
  token: string | null;
  vendor: VendorDTO | null;
  company: CompanyDTO | null;
  pairing: EmpresaPairing | null;
  hydrated: boolean;

  setSession: (token: string, vendor: VendorDTO, company: CompanyDTO | null) => Promise<void>;
  clearSession: () => Promise<void>;
  setPairing: (p: EmpresaPairing) => Promise<void>;
  clearPairing: () => Promise<void>;
  hydrate: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  token: null,
  vendor: null,
  company: null,
  pairing: null,
  hydrated: false,

  setSession: async (token, vendor, company) => {
    set({ token, vendor, company });
    await Promise.all([
      storage.setItem(STORAGE_KEYS.token, token),
      storage.setItem(STORAGE_KEYS.vendor, JSON.stringify(vendor)),
      company
        ? storage.setItem(STORAGE_KEYS.company, JSON.stringify(company))
        : storage.removeItem(STORAGE_KEYS.company),
    ]);
  },

  clearSession: async () => {
    // Nota: NO borra el pairing — el vendedor solo vuelve a la pantalla de login,
    // no a la de "Vincular empresa". Para eso está clearPairing().
    set({ token: null, vendor: null, company: null });
    await Promise.all([
      storage.removeItem(STORAGE_KEYS.token),
      storage.removeItem(STORAGE_KEYS.vendor),
      storage.removeItem(STORAGE_KEYS.company),
    ]);
  },

  setPairing: async (p) => {
    set({ pairing: p });
    await storage.setItem(STORAGE_KEYS.pairing, JSON.stringify(p));
  },

  clearPairing: async () => {
    // "Cambiar empresa" — borra pairing Y sesión (obliga a re-vincular y re-login).
    set({ token: null, vendor: null, company: null, pairing: null });
    await Promise.all([
      storage.removeItem(STORAGE_KEYS.token),
      storage.removeItem(STORAGE_KEYS.vendor),
      storage.removeItem(STORAGE_KEYS.company),
      storage.removeItem(STORAGE_KEYS.pairing),
    ]);
  },

  hydrate: async () => {
    const [token, vendorRaw, companyRaw, pairingRaw] = await Promise.all([
      storage.getItem(STORAGE_KEYS.token),
      storage.getItem(STORAGE_KEYS.vendor),
      storage.getItem(STORAGE_KEYS.company),
      storage.getItem(STORAGE_KEYS.pairing),
    ]);

    const vendor = vendorRaw ? (JSON.parse(vendorRaw) as VendorDTO) : null;
    const company = companyRaw ? (JSON.parse(companyRaw) as CompanyDTO) : null;
    const pairing = pairingRaw ? (JSON.parse(pairingRaw) as EmpresaPairing) : null;

    set({
      token: token ?? null,
      vendor,
      company,
      pairing,
      hydrated: true,
    });
  },
}));
