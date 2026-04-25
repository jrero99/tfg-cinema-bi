# TFG Cinema BI — Backend API

API REST en Node.js/Express que expone los KPIs del Data Warehouse de BigQuery (`tfg-cinema-bi.dwh_cinema`) al frontend de React.

## Estructura del proyecto

```
backend/
├── src/
│   ├── config/
│   │   └── bigquery.js         # Singleton del cliente BigQuery
│   ├── controllers/
│   │   └── kpiController.js    # Lógica de consulta de las vistas
│   ├── middleware/
│   │   └── errorHandler.js     # Manejo global de errores y 404
│   └── routes/
│       └── kpiRoutes.js        # Definición de rutas /api/*
├── server.js                   # Punto de entrada de Express
├── package.json
├── .env.example
└── .gitignore
```

## Endpoints

| Método | Ruta            | Vista consultada       |
| ------ | --------------- | ---------------------- |
| GET    | `/api/taquilla` | `vw_kpi_taquilla`      |
| GET    | `/api/retail`   | `vw_kpi_retail`        |
| GET    | `/api/socios`   | `vw_kpi_fidelizacion`  |

Respuesta estándar:

```json
{
  "success": true,
  "count": 123,
  "data": [ ... ]
}
```

## Ejecución en local

1. Instalar dependencias:

   ```bash
   cd backend
   npm install
   ```

2. Copiar el archivo de variables de entorno y ajustarlo:

   ```bash
   cp .env.example .env
   ```

3. Situar el archivo `credenciales_gcp.json` (Service Account con permisos sobre BigQuery) en la ruta indicada por `GOOGLE_APPLICATION_CREDENTIALS` (por defecto, `./credenciales_gcp.json` dentro de `backend/`).

4. Arrancar el servidor:

   ```bash
   npm run dev     # con recarga automática (nodemon)
   npm start       # modo producción
   ```

5. Probar la API:

   ```bash
   curl http://localhost:4000/api/taquilla
   ```

## Variables de entorno

| Variable                         | Descripción                                       |
| -------------------------------- | ------------------------------------------------- |
| `PORT`                           | Puerto del servidor Express (por defecto 4000).   |
| `PROJECT_ID`                     | ID del proyecto GCP (`tfg-cinema-bi`).            |
| `DATASET_ID`                     | Dataset de BigQuery (`dwh_cinema`).               |
| `GOOGLE_APPLICATION_CREDENTIALS` | Ruta al JSON de la Service Account.               |
