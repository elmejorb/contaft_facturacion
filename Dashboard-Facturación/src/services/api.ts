import axios from 'axios';
import { getApiUrl } from '../config/api';

// baseURL inicial — el interceptor lo recalcula dinámicamente en cada request
// usando getApiUrl() (que lee el config.json cargado).
const api = axios.create({
  baseURL: getApiUrl(),
  headers: {
    'Content-Type': 'application/json',
  },
});

// Reescribir baseURL en cada request para reflejar el config.json actual
api.interceptors.request.use((config) => {
  config.baseURL = getApiUrl();
  return config;
});

// Interceptor para agregar el token a cada petición
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Interceptor para manejar errores de autenticación
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;
