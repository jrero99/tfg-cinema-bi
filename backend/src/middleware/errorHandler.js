function errorHandler(err, req, res, next) {
  console.error('[ERROR]', err.message);
  if (err.stack) console.error(err.stack);

  const statusCode = err.statusCode || 500;

  res.status(statusCode).json({
    success: false,
    error: {
      message: err.message || 'Error interno del servidor al consultar BigQuery.',
      code: err.code || 'INTERNAL_ERROR',
    },
  });
}

function notFoundHandler(req, res) {
  res.status(404).json({
    success: false,
    error: {
      message: `Ruta no encontrada: ${req.method} ${req.originalUrl}`,
      code: 'NOT_FOUND',
    },
  });
}

module.exports = { errorHandler, notFoundHandler };
