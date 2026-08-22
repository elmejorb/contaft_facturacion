/**
 * URL de producción (Hostinger). El APK release apunta acá.
 */
const PROD_API = 'https://api-movil-contaft.innovacion-digital.com';

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
};
