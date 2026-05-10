import axios from 'axios';

// URL base del backend. Se puede sobreescribir con la variable de entorno
// VITE_API_URL definida en `.env` durante el desarrollo.
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000/api';

// Instancia de Axios reutilizable con timeout y cabeceras por defecto.
const api = axios.create({
  baseURL: API_URL,
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
});

// Interceptor: estandariza el formato de error para los componentes.
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const mensaje =
      error.response?.data?.error?.message ||
      error.message ||
      'Error desconocido al consultar el backend.';
    return Promise.reject(new Error(mensaje));
  },
);

/**
 * Construye los query params eliminando claves vacías para no ensuciar
 * la URL con parámetros sin valor (ej. desde=, hasta=).
 */
const buildParams = ({ cine, desde, hasta } = {}) => {
  const params = {};
  if (cine) params.cine = cine;
  if (desde) params.desde = desde;
  if (hasta) params.hasta = hasta;
  return params;
};

// --- Endpoints expuestos por el backend ---

export const fetchCines = async () => {
  const { data } = await api.get('/cines');
  return data.data ?? [];
};

export const fetchTaquilla = async (filters) => {
  const { data } = await api.get('/taquilla', { params: buildParams(filters) });
  return data.data ?? [];
};

export const fetchRetail = async (filters) => {
  const { data } = await api.get('/retail', { params: buildParams(filters) });
  return data.data ?? [];
};

// Socios siempre devuelve datos globales (no filtra por cine).
// Sí acepta filtro por rango de meses derivado de las fechas.
export const fetchSocios = async (filters) => {
  const { data } = await api.get('/socios', { params: buildParams(filters) });
  return data.data ?? [];
};

export default api;
