const { getBigQueryClient } = require('../config/bigquery');

async function queryView(viewName) {
  const bigquery = getBigQueryClient();
  const projectId = process.env.PROJECT_ID;
  const datasetId = process.env.DATASET_ID;

  const query = `SELECT * FROM \`${projectId}.${datasetId}.${viewName}\``;

  const [rows] = await bigquery.query({
    query,
    location: 'europe-west1',
  });

  return rows;
}

async function getTaquilla(req, res, next) {
  try {
    const rows = await queryView('vw_kpi_taquilla');
    res.status(200).json({
      success: true,
      count: rows.length,
      data: rows,
    });
  } catch (error) {
    next(error);
  }
}

async function getRetail(req, res, next) {
  try {
    const rows = await queryView('vw_kpi_retail');
    res.status(200).json({
      success: true,
      count: rows.length,
      data: rows,
    });
  } catch (error) {
    next(error);
  }
}

async function getSocios(req, res, next) {
  try {
    const rows = await queryView('vw_kpi_fidelizacion');
    res.status(200).json({
      success: true,
      count: rows.length,
      data: rows,
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getTaquilla,
  getRetail,
  getSocios,
};
