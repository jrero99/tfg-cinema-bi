const express = require('express');
const {
  getTaquilla,
  getRetail,
  getSocios,
  getCines,
  getPeliculas,
  getComparativaPelicula,
} = require('../controllers/kpiController');

const router = express.Router();

// Listados auxiliares para los selectores del dashboard
router.get('/cines', getCines);
router.get('/peliculas', getPeliculas);

// Comparativa de una misma película entre cines (definida antes que /taquilla
// para que Express priorice la ruta más específica).
router.get('/taquilla/comparar', getComparativaPelicula);

// KPIs · admiten ?cine=NOMBRE_CINE (taquilla y retail)
router.get('/taquilla', getTaquilla);
router.get('/retail', getRetail);
router.get('/socios', getSocios);

module.exports = router;
