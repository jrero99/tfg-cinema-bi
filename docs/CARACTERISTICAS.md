# Cinema BI · Catálogo de funcionalidades

Documento de referencia para la memoria del TFG. Recoge, agrupadas por capa
arquitectónica y por objetivo, todas las capacidades implementadas en la
plataforma de Business Intelligence para la cadena de cines.

---

## 1. Arquitectura general

La plataforma sigue una arquitectura clásica de tres capas:

```
┌──────────────────────┐    HTTP/JSON     ┌──────────────────────┐    SQL    ┌────────────────────┐
│  Frontend (React)    │ ───────────────► │ Backend (Node/Express)│ ────────► │ BigQuery (DWH      │
│  Vite + Tailwind +   │                  │ + cliente BigQuery    │           │ esquema en estrella)│
│  Recharts + Router   │ ◄─────────────── │                       │ ◄──────── │                    │
└──────────────────────┘                  └──────────────────────┘           └────────────────────┘
```

- **Capa de datos**: Data Warehouse en BigQuery con esquema en estrella
  (5 dimensiones + 2 tablas de hechos), alimentado desde CSVs sintéticos
  generados por un script Python (`data_generator/`).
- **Capa de aplicación**: API REST en Node.js + Express que expone los
  KPIs en endpoints versionados. Todas las consultas usan parámetros
  tipados de BigQuery (defensa contra SQL injection).
- **Capa de presentación**: SPA en React con React Router, gráficos
  Recharts, estilos Tailwind y selectores de fecha en español
  (react-datepicker con locale `es`).

---

## 2. Modelo de datos (esquema en estrella)

### Dimensiones
- **Dim_Tiempo**: fecha, año, mes, día de semana, fin de semana, franja
  horaria (Mañana / Tarde / Noche).
- **Dim_Pelicula**: título, género, clasificación por edad, distribuidora,
  duración, idioma/formato, indicador de reestreno.
- **Dim_Sala**: cine, ciudad, sala, capacidad total, butacas VIP,
  formato de proyección (2D / 3D / IMAX).
- **Dim_Socio**: edad, género, fecha de alta, nivel de fidelidad
  (Bronce / Plata / Oro).
- **Dim_Producto_Bar**: nombre, categoría, coste proveedor, precio venta.

### Tablas de hechos
- **Fact_Ventas_Entradas**: tickets vendidos. Granularidad
  `(id_tiempo, id_sala, id_pelicula, id_socio?)`.
- **Fact_Ventas_Bar**: compras en el bar enlazadas opcionalmente con la
  película que generó la visita (cross-selling explícito).

### Vistas KPI (capa semántica)
- `vw_kpi_taquilla` · ingresos y entradas agregados por (cine, mes,
  película).
- `vw_kpi_retail` · ingresos del bar agregados por (cine, mes, categoría).
- `vw_kpi_fidelizacion` · KPIs de socios agregados por (mes, nivel).

---

## 3. Páginas de la aplicación

La SPA expone cinco vistas principales más dos fichas de detalle
accesibles por *drill-down*:

### 3.1 Resumen ejecutivo · `/`
Vista de entrada para dirección. Concentra los KPIs estratégicos de la
cadena con filtros globales (cine + rango de fechas).

- **3 tarjetas KPI** ─ ingresos totales (taquilla + bar), espectadores
  acumulados y ticket medio.
- **Top 5 películas por ingresos** ─ ranking con barras verticales;
  cada barra es *clicable* y abre la ficha de la película (drill-down).
- **Comparador de una película entre cines** ─ desplegable con el
  catálogo; al seleccionar muestra:
  - Mini-KPIs (ingresos totales del título, cine líder, número de cines
    con proyecciones).
  - Barras horizontales con ingresos + entradas por cine.
  - Gráfico de líneas con la evolución mensual por cine (una serie por
    complejo).
- **Bar por categoría** ─ ingresos del bar acumulados por tipo de
  producto.
- **Gasto medio por nivel de fidelidad** ─ barras horizontales para los
  niveles Bronce / Plata / Oro.
- **Atajo "Ver ficha del cine"** ─ cuando hay un cine seleccionado en
  el filtro, aparece un botón que abre su ficha de detalle.

### 3.2 Ficha de película · `/peliculas/:titulo`
Drill-down al seleccionar una película desde cualquier ranking.

- Cabecera con metadatos: género, clasificación de edad, distribuidora,
  formato/idioma, duración, indicador de reestreno.
- 3 KPIs: ingresos acumulados, entradas, ticket medio.
- Ranking horizontal de cines con barras *clicables* (drill-down al
  cine).
- Evolución mensual de ingresos en serie temporal.

### 3.3 Ficha de cine · `/cines/:nombre`
Drill-down al seleccionar un cine.

- Cabecera con ciudad del cine.
- 4 KPIs: ingresos totales (con desglose taquilla/bar como subtítulo),
  entradas vendidas, capacidad instalada (nº salas + butacas + butacas
  VIP), película líder en ese cine.
- Top 10 películas en ese cine, con barras *clicables* (drill-up a la
  ficha de cada película).
- Distribución del bar por categoría.

### 3.4 Operaciones · `/operaciones`
KPIs operativos para gestores de sala. Filtros propios (cine + fechas).

- **Rotación media de aforo** ─ veces que se llena el aforo de cada
  sala durante una franja horaria. Por defecto agrega por cine;
  cuando el filtro selecciona un cine concreto, el gráfico baja
  automáticamente a granularidad de sala. Línea de referencia con la
  media de la red / del cine.
- **Rentabilidad por formato de proyección** ─ cruza
  `Fact_Ventas_Entradas` y `Fact_Ventas_Bar` con `formato_proyeccion`
  de `Dim_Sala`. Por formato (2D, 3D, IMAX, VIP…) muestra:
  - Gráfico de barras agrupado con ingresos taquilla, ingresos bar y
    margen del bar (ingresos − coste_proveedor × cantidad).
  - Tabla con entradas, ticket medio, gasto medio en bar por entrada y
    margen del bar atribuible al formato.
- **Mapa de calor día × franja horaria** ─ tabla calor 7 días × N
  franjas con intensidad cromática proporcional a los ingresos /
  entradas (toggle de métrica). Tooltip por celda con cifras exactas.

### 3.5 Cross-Selling · `/cross-selling`
Análisis de correlación entre el contenido proyectado y el
comportamiento de compra en el bar. Filtros propios.

- **Heatmap género × categoría de producto** ─ cada celda muestra el
  gasto medio en bar por entrada de espectadores de cada género.
  Tonos más oscuros = mayor propensión.
- **Ranking de géneros por propensión al bar** ─ tabla ordenada por
  gasto medio total en bar por entrada, con identificación de la
  categoría preferida y su ticket asociado.

### 3.6 Segmentación demográfica de socios · `/socios`
Análisis del comportamiento de la base de socios. Filtros: rango de
fechas (no se filtra por cine porque la fidelización es a nivel de
cadena). Permite alternar entre tres dimensiones de análisis:

- **Edad** ─ tramos `<18`, `18-24`, `25-34`, `35-44`, `45-54`, `55-64`,
  `65+`.
- **Género** ─ M / F / etc.
- **Nivel de fidelidad** ─ Bronce / Plata / Oro.

Para cada segmento devuelve y visualiza:

- Tarjetas resumen: número total de socios, entradas, gasto en taquilla
  y gasto en bar en el periodo.
- Gráfico de gasto medio por socio (LTV unitario en el periodo).
- Gráfico apilado con la composición taquilla vs bar de cada segmento
  (detecta perfiles "cinéfilos puros" vs "experienciales").
- Tabla con todos los KPIs: ticket medio, gasto en bar por entrada y
  gasto por socio.

---

## 4. Mapeo a los objetivos declarados del TFG

### Objetivo 1 — Definición de KPIs

| KPI declarado | Implementación |
|---|---|
| Gasto por espectador | Tarjeta "Ticket Medio" del Resumen + sección de ticket medio en cada ficha de detalle (`ingresos / entradas`). |
| Ratios de ocupación por sala | Página *Operaciones* → "Rotación media de aforo"; al filtrar un cine, se descompone por sala. |
| Rentabilidad por formato de proyección | Página *Operaciones* → "Rentabilidad por formato": ingresos taquilla + bar + margen del bar y tabla con ticket medio, gasto en bar por entrada y margen por formato. |

### Objetivo 2 — Análisis de Cross-Selling

| Requisito declarado | Implementación |
|---|---|
| Herramienta visual de correlación entre tipología de contenido y compra en restauración | Página *Cross-Selling* → heatmap género × categoría de producto + ranking de géneros con su categoría preferida. |

### Extras añadidos sobre los objetivos

- Arquitectura multi-página con React Router (5 vistas).
- Drill-down jerárquico (Top 5 → Película → Cine → Top 10 películas del
  cine → otra película → …).
- Comparador "misma película entre cines" con evolución mensual por cine.
- Mapa de calor operativo (día × franja horaria).
- Segmentación demográfica de socios con tres dimensiones de análisis.
- API REST documentada y consultas parametrizadas.
- Selectores de fecha en español con calendario emergente y rango
  válido acotado.

---

## 5. API REST

Endpoints expuestos por el backend (`http://localhost:4000/api`):

### Catálogos auxiliares
- `GET /cines` · listado de cines.
- `GET /peliculas` · catálogo de títulos.

### KPIs base (filtros: `cine?`, `desde?`, `hasta?`)
- `GET /taquilla` · ingresos y entradas por película y mes.
- `GET /retail` · ingresos del bar por categoría.
- `GET /socios` · KPIs de fidelización (global; no admite `cine`).

### Drill-down y comparativas
- `GET /taquilla/comparar?titulo=…` · taquilla de una película
  desglosada por cine y mes (alimenta el comparador).
- `GET /peliculas/:titulo/detalle` · metadatos de la película +
  todas sus filas de taquilla.
- `GET /cines/:nombre/detalle` · resumen estructural del cine +
  taquilla + retail.

### Operaciones de sala
- `GET /operaciones/ocupacion?groupBy=cine|sala` · rotación media
  de aforo. Cuando `groupBy=sala`, requiere `cine`.
- `GET /operaciones/actividad-horaria` · cruce día × franja horaria.
- `GET /operaciones/rentabilidad-formato` · KPIs por formato de
  proyección.

### Cross-Selling
- `GET /cross-selling/genero-bar` · matriz género × categoría de
  producto con gasto medio en bar por entrada.

### Socios
- `GET /socios/segmentacion?dimension=edad|genero|fidelidad` ·
  segmentación demográfica.

Todas las respuestas siguen el formato estándar:

```json
{
  "success": true,
  "count": 12,
  "filtros": { "cine": null, "desde": "2026-01-01", "hasta": "2026-03-31" },
  "data": [ ... ]
}
```

---

## 6. Funcionalidades transversales de UX

- **Filtros globales coherentes** entre páginas (cine + fechas) con
  validación: la fecha "Desde" no puede ser posterior a la fecha
  "Hasta"; la fecha máxima seleccionable es hoy.
- **Date pickers en español** con calendario emergente, formato
  `dd/MM/yyyy` y botón "limpiar" por campo.
- **Estados de carga, error y vacío** explícitos en cada vista (spinner
  + mensajes).
- **Tema oscuro coherente** con overrides para react-datepicker y
  Recharts.
- **Tooltips ricos** en todos los gráficos con cifras formateadas en
  euros (i18n `es-ES`) y separadores de miles.
- **Rutas catch-all** en el router que redirigen al dashboard si la
  URL no existe.

---

## 7. Calidad del código y robustez

- Backend modularizado en `controllers/`, `routes/`, `config/`,
  `middleware/`.
- Manejo de errores centralizado (`errorHandler.js`) con respuesta
  JSON consistente.
- Cliente BigQuery como singleton para reutilizar la conexión.
- Frontend tolerante a variaciones de schema: los normalizadores
  (`numero`, `cadena`) aceptan varias claves alternativas (`titulo` /
  `titulo_pelicula`, `ingresos_taquilla` / `ingreso_total`, etc.).
- Componentes desacoplados (charts puros) que reciben datos por
  props, sin estado propio innecesario.

---

## 8. Limitaciones conocidas y decisiones de diseño

Se documentan para anticipar preguntas del tribunal:

- **Los datos son sintéticos.** El generador no respeta de forma
  estricta el límite físico de aforo por franja, por lo que la
  "ocupación" puede superar el 100 %. Se modela y se etiqueta
  intencionadamente como **"rotación de aforo"** (veces que se
  llena el aforo en una franja horaria), que es una métrica real
  del sector.
- **Rentabilidad de taquilla sin coste real.** El esquema no
  almacena coste de proyección de película; se utiliza el ticket
  medio y el margen del bar como proxy de rentabilidad unitaria
  por formato.
- **Socios no filtrables por cine.** La fidelización es a nivel
  cadena: un socio puede visitar cualquier complejo. Las páginas
  que cruzan socios ignoran el filtro de cine intencionadamente.
- **Granularidad mensual en las vistas KPI.** Las tres vistas
  pre-agregadas (`vw_kpi_*`) trabajan a nivel `(anio, mes)` para
  acelerar las consultas del dashboard. Las páginas que requieren
  granularidad fina (Operaciones, Cross-Selling, Segmentación) van
  directamente contra las tablas de hechos.

---

## 9. Cómo arrancar la plataforma

```bash
# 1. Backend
cd backend
npm install
cp .env.example .env   # rellenar PROJECT_ID, DATASET_ID y credenciales
npm run dev            # http://localhost:4000/api

# 2. Frontend
cd frontend
pnpm install
pnpm dev               # http://localhost:5173

# 3. Datos (opcional, regenerar el dataset)
cd data_generator
python data_generator.py --modo historico --inicio 2026-01-01 --fin 2026-03-31
python load_to_bigquery.py --mode full
```
