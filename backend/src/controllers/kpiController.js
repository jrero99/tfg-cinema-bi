const { getBigQueryClient } = require('../config/bigquery');

/**
 * Convierte una fecha YYYY-MM-DD en un entero YYYYMM (ej. "2025-03-15" -> 202503).
 * Útil para filtrar la vista de fidelización, que está agregada por anio y mes.
 */
function fechaAYearMonth(fechaIso) {
  if (!fechaIso) return null;
  const [y, m] = fechaIso.split('-');
  return Number(y) * 100 + Number(m);
}

/**
 * Ejecuta SELECT * sobre una vista aplicando filtros opcionales:
 *   - cine:   nombre exacto del cine (campo nombre_cine).
 *   - desde:  fecha mínima ISO (YYYY-MM-DD). Se traduce a YYYYMM
 *             y se filtra por anio*100+mes — las tres vistas KPI están
 *             agregadas por mes y no tienen columna `fecha`.
 *   - hasta:  fecha máxima ISO (YYYY-MM-DD).
 *
 * Usa query parameters de BigQuery para evitar SQL injection.
 */
async function queryView(viewName, filters = {}) {
  const bigquery = getBigQueryClient();
  const projectId = process.env.PROJECT_ID;
  const datasetId = process.env.DATASET_ID;

  const wheres = [];
  const params = {};
  const types = {};

  if (filters.cine) {
    wheres.push('nombre_cine = @cine');
    params.cine = filters.cine;
  }

  if (filters.desde) {
    wheres.push('anio * 100 + mes >= @desde_ym');
    params.desde_ym = fechaAYearMonth(filters.desde);
    types.desde_ym = 'INT64';
  }
  if (filters.hasta) {
    wheres.push('anio * 100 + mes <= @hasta_ym');
    params.hasta_ym = fechaAYearMonth(filters.hasta);
    types.hasta_ym = 'INT64';
  }

  let query = `SELECT * FROM \`${projectId}.${datasetId}.${viewName}\``;
  if (wheres.length > 0) query += ` WHERE ${wheres.join(' AND ')}`;

  const [rows] = await bigquery.query({
    query,
    location: 'europe-west1',
    params,
    types,
  });

  return rows;
}

async function getTaquilla(req, res, next) {
  try {
    const { cine, desde, hasta } = req.query;
    const rows = await queryView('vw_kpi_taquilla', { cine, desde, hasta });
    res.status(200).json({
      success: true,
      count: rows.length,
      filtros: { cine: cine ?? null, desde: desde ?? null, hasta: hasta ?? null },
      data: rows,
    });
  } catch (error) {
    next(error);
  }
}

async function getRetail(req, res, next) {
  try {
    const { cine, desde, hasta } = req.query;
    const rows = await queryView('vw_kpi_retail', { cine, desde, hasta });
    res.status(200).json({
      success: true,
      count: rows.length,
      filtros: { cine: cine ?? null, desde: desde ?? null, hasta: hasta ?? null },
      data: rows,
    });
  } catch (error) {
    next(error);
  }
}

async function getSocios(req, res, next) {
  try {
    // La vista vw_kpi_fidelizacion no incluye nombre_cine (los socios pueden
    // ir a cualquier cine de la cadena), por lo que el filtro de cine se ignora.
    // Sí filtramos por rango de meses si se proporcionan desde/hasta.
    const { desde, hasta } = req.query;
    const rows = await queryView('vw_kpi_fidelizacion', { desde, hasta });
    res.status(200).json({
      success: true,
      count: rows.length,
      filtros: { cine: null, desde: desde ?? null, hasta: hasta ?? null },
      data: rows,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Devuelve la lista de cines disponibles consultando Dim_Sala.
 */
async function getCines(req, res, next) {
  try {
    const bigquery = getBigQueryClient();
    const projectId = process.env.PROJECT_ID;
    const datasetId = process.env.DATASET_ID;

    const query = `
      SELECT DISTINCT nombre_cine
      FROM \`${projectId}.${datasetId}.Dim_Sala\`
      ORDER BY nombre_cine
    `;

    const [rows] = await bigquery.query({
      query,
      location: 'europe-west1',
    });

    res.status(200).json({
      success: true,
      count: rows.length,
      data: rows.map((r) => r.nombre_cine),
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getTaquilla,
  getRetail,
  getSocios,
  getCines,
};
