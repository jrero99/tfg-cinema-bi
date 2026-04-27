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

// --- Endpoints expuestos por el backend ---
// Cada función desempaqueta el campo `data` del envoltorio { success, count, data }.

export const fetchTaquilla = async () => {
  const { data } = await api.get('/taquilla');
  return data.data ?? [];
};

export const fetchRetail = async () => {
  const { data } = await api.get('/retail');
  return data.data ?? [];
};

export const fetchSocios = async () => {
  const { data } = await api.get('/socios');
  return data.data ?? [];
};

export default api;
