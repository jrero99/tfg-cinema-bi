# TFG Cinema BI — Frontend

Dashboard analítico construido con **React + Vite + Tailwind CSS** que consume la API REST del backend (Express + BigQuery).

## Stack

- React 18 (componentes funcionales + Hooks)
- Vite como bundler/dev server
- Tailwind CSS (con paleta personalizada Dark BI)
- Recharts (gráficos)
- Axios (cliente HTTP)
- Lucide React (iconografía)

## Estructura

```
frontend/
├── src/
│   ├── components/
│   │   └── KpiCard.jsx          # Tarjeta de KPI reutilizable
│   ├── pages/
│   │   └── Dashboard.jsx        # Cuadro de mando principal
│   ├── services/
│   │   └── api.js               # Cliente Axios + endpoints
│   ├── App.jsx                  # Componente raíz
│   ├── main.jsx                 # Punto de entrada React
│   └── index.css                # Tailwind + estilos base
├── index.html
├── vite.config.js
├── tailwind.config.js
├── postcss.config.js
├── package.json
└── .env.example
```

## Ejecución en local

```bash
cd frontend
npm install
cp .env.example .env       # ajustar VITE_API_URL si es necesario
npm run dev                # arranca en http://localhost:3000
```

> **Importante:** el backend debe estar arrancado previamente
> (`cd backend && npm run dev`). Por defecto se espera en
> `http://localhost:4000/api`.

## Variables de entorno

| Variable        | Descripción                                          | Por defecto                  |
| --------------- | ---------------------------------------------------- | ---------------------------- |
| `VITE_API_URL`  | URL base del backend Express.                        | `http://localhost:4000/api`  |
