import axios, { AxiosError, AxiosInstance, InternalAxiosRequestConfig } from 'axios';
import { API_BASE_URL, API_TIMEOUT_MS } from '../config/env';

export class ApiError extends Error {
  status: number;
  data: any;
  constructor(message: string, status: number, data?: any) {
    super(message);
    this.status = status;
    this.data = data;
  }
}

interface HttpClientOpts {
  getToken: () => string | null;
  onUnauthorized: () => void;
}

export const createHttpClient = ({ getToken, onUnauthorized }: HttpClientOpts): AxiosInstance => {
  const client = axios.create({
    baseURL: API_BASE_URL,
    timeout: API_TIMEOUT_MS,
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
  });

  client.interceptors.request.use((config: InternalAxiosRequestConfig) => {
    const token = getToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  });

  client.interceptors.response.use(
    (r) => r,
    (error: AxiosError<any>) => {
      if (error.response?.status === 401) {
        onUnauthorized();
      }

      const status = error.response?.status ?? 0;
      const data = error.response?.data;

      // Construye un mensaje útil combinando mensaje + detalle del servidor,
      // o el primer error de validación si existe.
      let message =
        data?.mensaje ||
        data?.message ||
        (status === 0 ? 'No hay conexión al servidor' : `Error HTTP ${status}`);

      if (data?.errores && typeof data.errores === 'object') {
        const firstField = Object.keys(data.errores)[0];
        const firstMsg = data.errores[firstField]?.[0];
        if (firstMsg) message = `${message}: ${firstMsg}`;
      } else if (data?.detalle && typeof data.detalle === 'string') {
        // Truncamos para que quepa en una línea de UI
        const truncated =
          data.detalle.length > 120
            ? data.detalle.slice(0, 120) + '...'
            : data.detalle;
        message = `${message} · ${truncated}`;
      }

      return Promise.reject(new ApiError(message, status, data));
    },
  );

  return client;
};
