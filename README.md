# 🎬 Cinema BI Platform - Trabajo de Fin de Grado (TFG)

## 📌 Descripción del Proyecto

Este repositorio contiene el código fuente para el diseño e implementación de una **Plataforma integral de Business Intelligence (BI)** orientada a la gestión estratégica y operativa de una cadena de exhibición cinematográfica.

El proyecto resuelve el problema de la fragmentación de datos en el sector (taquilla, bar y fidelización) mediante la creación de un ecosistema que simula todo el ciclo de vida del dato: desde la generación de datos sintéticos coherentes, pasando por un almacén de datos en la nube, hasta su visualización en un cuadro de mando interactivo a medida.

## 🏗️ Arquitectura y Stack Tecnológico

El proyecto está dividido en tres capas principales:

1. **Ingeniería de Datos (Generación e Ingesta):**
   - **Python 3:** Uso de librerías como `Faker` y `pandas` para la creación algorítmica de un dataset relacional sintético que emula 12 meses de operativa.
2. **Data Warehouse (Almacenamiento y Modelado):**
   - **Google BigQuery (GCP):** Almacén de datos analítico (_Serverless_) estructurado bajo un modelo dimensional (Esquema en Estrella).
3. **Aplicación Web (Backend & Frontend):**
   - **Node.js & Express:** API REST que actúa como puente seguro entre la base de datos y la interfaz de usuario.
   - **React:** _Single Page Application_ (SPA) para el dashboard interactivo.
   - **Recharts / Chart.js:** Librerías de visualización de datos.

## 📂 Estructura del Repositorio

```text
tfg-cinema-bi/
├── data_generator/   # Scripts en Python para crear datos falsos coherentes (ETL/ELT)
├── backend/          # API REST en Node.js para conectar con Google BigQuery
├── frontend/         # Código fuente de la interfaz gráfica en React
└── docs/             # Documentación técnica, diagramas, esquemas SQL y bibliografía
```
