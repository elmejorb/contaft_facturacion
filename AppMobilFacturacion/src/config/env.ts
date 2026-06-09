import { Platform } from 'react-native';

/**
 * En dev, Android emulator usa 10.0.2.2 para hablar con localhost del host.
 * Si pruebas en un dispositivo físico, debes poner la IP LAN de tu PC
 * (p.ej. http://192.168.1.20:8000).
 */
const DEV_LOCAL_ANDROID = 'http://10.0.2.2:8000';
const DEV_LOCAL_DEFAULT = 'http://localhost:8000';

// IP LAN de tu PC. Se usa cuando pruebes en un dispositivo físico.
// El teléfono y el PC deben estar en la MISMA red Wi-Fi.
const DEV_LAN_IP: string | null = 'http://192.168.101.73:8000';

export const API_BASE_URL =
  DEV_LAN_IP ??
  (Platform.OS === 'android' ? DEV_LOCAL_ANDROID : DEV_LOCAL_DEFAULT);

export const API_TIMEOUT_MS = 15000;

export const STORAGE_KEYS = {
  token: 'auth.token',
  vendor: 'auth.vendor',
  company: 'auth.company',
};
