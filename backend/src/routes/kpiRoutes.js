const express = require('express');
const { getTaquilla, getRetail, getSocios } = require('../controllers/kpiController');

const router = express.Router();

router.get('/taquilla', getTaquilla);
router.get('/retail', getRetail);
router.get('/socios', getSocios);

module.exports = router;
