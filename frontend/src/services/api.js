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

// Catálogo de títulos de película presentes en la vista de taquilla.
// Alimenta el desplegable del comparador entre cines.
export const fetchPeliculas = async () => {
  const { data } = await api.get('/peliculas');
  return data.data ?? [];
};

// Taquilla de una película desglosada por cine y mes.
// El backend exige el parámetro `titulo`; las fechas son opcionales.
export const fetchComparativaPelicula = async (titulo, filters = {}) => {
  const params = { ...buildParams(filters), titulo };
  const { data } = await api.get('/taquilla/comparar', { params });
  return data.data ?? [];
};

// Ficha completa de una película (metadatos + taquilla agregable por mes y cine).
export const fetchDetallePelicula = async (titulo, filters = {}) => {
  const url = `/peliculas/${encodeURIComponent(titulo)}/detalle`;
  const { data } = await api.get(url, { params: buildParams(filters) });
  return data.data ?? { info: null, taquilla: [] };
};

// Ficha completa de un cine (info estructural + taquilla + retail).
export const fetchDetalleCine = async (nombre, filters = {}) => {
  const url = `/cines/${encodeURIComponent(nombre)}/detalle`;
  const { data } = await api.get(url, { params: buildParams(filters) });
  return data.data ?? { info: null, taquilla: [], retail: [] };
};

// Ocupación media de aforo. Si `groupBy='sala'`, devuelve filas por sala
// del cine filtrado; en caso contrario, agrega por cine.
export const fetchOcupacion = async (filters = {}) => {
  const { groupBy, ...rest } = filters;
  const params = buildParams(rest);
  if (groupBy) params.groupBy = groupBy;
  const { data } = await api.get('/operaciones/ocupacion', { params });
  return data.data ?? [];
};

// Cruce día de semana × franja horaria para el heatmap operativo.
export const fetchActividadHoraria = async (filters = {}) => {
  const { data } = await api.get('/operaciones/actividad-horaria', { params: buildParams(filters) });
  return data.data ?? [];
};

// Rentabilidad por formato de proyección (2D, 3D, IMAX, VIP…).
export const fetchRentabilidadFormatos = async (filters = {}) => {
  const { data } = await api.get('/operaciones/rentabilidad-formato', { params: buildParams(filters) });
  return data.data ?? [];
};

// Cross-selling: cruce género de película × categoría de bar.
export const fetchCrossSellingGeneroBar = async (filters = {}) => {
  const { data } = await api.get('/cross-selling/genero-bar', { params: buildParams(filters) });
  return data.data ?? [];
};

// Segmentación demográfica de socios por edad, género o nivel de fidelidad.
export const fetchSegmentacionSocios = async (dimension, filters = {}) => {
  const params = { ...buildParams(filters), dimension };
  const { data } = await api.get('/socios/segmentacion', { params });
  return data.data ?? [];
};

export default api;
