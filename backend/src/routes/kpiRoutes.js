const express = require('express');
const {
  getTaquilla,
  getRetail,
  getSocios,
  getCines,
  getPeliculas,
  getComparativaPelicula,
  getDetallePelicula,
  getDetalleCine,
  getOcupacionCines,
  getActividadHoraria,
  getRentabilidadFormatos,
  getCrossSellingGeneroBar,
  getSegmentacionSocios,
} = require('../controllers/kpiController');

const router = express.Router();

// Listados auxiliares para los selectores del dashboard
router.get('/cines', getCines);
router.get('/peliculas', getPeliculas);

// Comparativa de una misma película entre cines (definida antes que /taquilla
// para que Express priorice la ruta más específica).
router.get('/taquilla/comparar', getComparativaPelicula);

// Fichas de detalle (drill-down)
router.get('/peliculas/:titulo/detalle', getDetallePelicula);
router.get('/cines/:nombre/detalle', getDetalleCine);

// Operaciones de sala
router.get('/operaciones/ocupacion', getOcupacionCines);
router.get('/operaciones/actividad-horaria', getActividadHoraria);
router.get('/operaciones/rentabilidad-formato', getRentabilidadFormatos);

// Cross-selling: cruces entre tipología de contenido y consumo en bar.
router.get('/cross-selling/genero-bar', getCrossSellingGeneroBar);

// Segmentación demográfica de los socios.
router.get('/socios/segmentacion', getSegmentacionSocios);

// KPIs · admiten ?cine=NOMBRE_CINE (taquilla y retail)
router.get('/taquilla', getTaquilla);
router.get('/retail', getRetail);
router.get('/socios', getSocios);

module.exports = router;
