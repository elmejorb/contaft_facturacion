/**
 * URL de producción (Hostinger). El APK release apunta acá.
 * El subdominio api-movil-contaft.* está eliminado en DNS; la ruta correcta
 * es innovacion-digital.com/api-movil-contaft/public.
 */
const PROD_API = 'https://innovacion-digital.com/api-movil-contaft/public';

/**
 * En dev también apuntamos a la nube por defecto — los datos demo viven allí,
 * y así el celular no necesita estar en la LAN del PC.
 * Para volver a servidor local, descomentar la línea de abajo.
 */
const DEV_API = PROD_API;
// const DEV_API = 'http://192.168.101.79:8000';

export const API_BASE_URL = __DEV__ ? DEV_API : PROD_API;

export const API_TIMEOUT_MS = 15000;

export const STORAGE_KEYS = {
  token: 'auth.token',
  vendor: 'auth.vendor',
  company: 'auth.company',
  // Pareo empresa ↔ APK (se guarda al primer arranque via código WhatsApp / QR).
  // Persiste separado de la sesión: al hacer logout, la empresa vinculada
  // se mantiene; solo "Cambiar empresa" la borra.
  pairing: 'empresa.pairing',
};
