import { create } from 'zustand';
import { storage } from '../services/storage';
import { STORAGE_KEYS } from '../config/env';
import type { VendorDTO, CompanyDTO } from '../services/api';

interface AuthState {
  token: string | null;
  vendor: VendorDTO | null;
  company: CompanyDTO | null;
  hydrated: boolean;

  setSession: (token: string, vendor: VendorDTO, company: CompanyDTO | null) => Promise<void>;
  clearSession: () => Promise<void>;
  hydrate: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  token: null,
  vendor: null,
  company: null,
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
    set({ token: null, vendor: null, company: null });
    await Promise.all([
      storage.removeItem(STORAGE_KEYS.token),
      storage.removeItem(STORAGE_KEYS.vendor),
      storage.removeItem(STORAGE_KEYS.company),
    ]);
  },

  hydrate: async () => {
    const [token, vendorRaw, companyRaw] = await Promise.all([
      storage.getItem(STORAGE_KEYS.token),
      storage.getItem(STORAGE_KEYS.vendor),
      storage.getItem(STORAGE_KEYS.company),
    ]);

    const vendor = vendorRaw ? (JSON.parse(vendorRaw) as VendorDTO) : null;
    const company = companyRaw ? (JSON.parse(companyRaw) as CompanyDTO) : null;

    set({
      token: token ?? null,
      vendor,
      company,
      hydrated: true,
    });
  },
}));
