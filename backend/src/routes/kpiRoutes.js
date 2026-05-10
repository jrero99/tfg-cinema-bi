const express = require('express');
const {
  getTaquilla,
  getRetail,
  getSocios,
  getCines,
} = require('../controllers/kpiController');

const router = express.Router();

// Listado de cines disponibles (alimenta el desplegable del frontend)
router.get('/cines', getCines);

// KPIs · admiten ?cine=NOMBRE_CINE (taquilla y retail)
router.get('/taquilla', getTaquilla);
router.get('/retail', getRetail);
router.get('/socios', getSocios);

module.exports = router;
