require('dotenv').config();

const express = require('express');
const cors = require('cors');
const morgan = require('morgan');

const kpiRoutes = require('./src/routes/kpiRoutes');
const { errorHandler, notFoundHandler } = require('./src/middleware/errorHandler');

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors({
  origin: 'http://localhost:3000',
  methods: ['GET'],
}));

app.use(morgan('dev'));
app.use(express.json());

app.get('/', (req, res) => {
  res.json({
    name: 'TFG Cinema BI - API',
    version: '1.0.0',
    endpoints: [
      'GET /api/taquilla',
      'GET /api/retail',
      'GET /api/socios',
    ],
  });
});

app.use('/api', kpiRoutes);

app.use(notFoundHandler);
app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`[Server] API escuchando en http://localhost:${PORT}`);
  console.log(`[Server] CORS habilitado para http://localhost:3000`);
});
