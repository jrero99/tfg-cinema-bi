const { BigQuery } = require('@google-cloud/bigquery');

let instance = null;

function getBigQueryClient() {
  if (!instance) {
    if (!process.env.PROJECT_ID) {
      throw new Error('La variable de entorno PROJECT_ID no está definida.');
    }
    if (!process.env.GOOGLE_APPLICATION_CREDENTIALS) {
      throw new Error('La variable de entorno GOOGLE_APPLICATION_CREDENTIALS no está definida.');
    }

    instance = new BigQuery({
      projectId: process.env.PROJECT_ID,
    });

    console.log(`[BigQuery] Cliente inicializado para el proyecto: ${process.env.PROJECT_ID}`);
  }

  return instance;
}

module.exports = { getBigQueryClient };
