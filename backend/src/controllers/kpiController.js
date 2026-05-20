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
 * Devuelve la lista de títulos de película presentes en la vista de taquilla.
 * Alimenta el desplegable del comparador entre cines en el frontend.
 */
async function getPeliculas(req, res, next) {
  try {
    const bigquery = getBigQueryClient();
    const projectId = process.env.PROJECT_ID;
    const datasetId = process.env.DATASET_ID;

    const query = `
      SELECT DISTINCT titulo
      FROM \`${projectId}.${datasetId}.vw_kpi_taquilla\`
      WHERE titulo IS NOT NULL
      ORDER BY titulo
    `;

    const [rows] = await bigquery.query({
      query,
      location: 'europe-west1',
    });

    res.status(200).json({
      success: true,
      count: rows.length,
      data: rows.map((r) => r.titulo),
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Devuelve la taquilla de una película desglosada por cine y mes,
 * para alimentar la vista comparativa entre cines del dashboard.
 *
 * Query params:
 *   - titulo (obligatorio): título exacto de la película.
 *   - desde / hasta (opcionales): rango ISO YYYY-MM-DD para acotar meses.
 */
async function getComparativaPelicula(req, res, next) {
  try {
    const { titulo, desde, hasta } = req.query;

    if (!titulo) {
      return res.status(400).json({
        success: false,
        error: { message: "El parámetro 'titulo' es obligatorio." },
      });
    }

    const bigquery = getBigQueryClient();
    const projectId = process.env.PROJECT_ID;
    const datasetId = process.env.DATASET_ID;

    const wheres = ['titulo = @titulo'];
    const params = { titulo };
    const types = {};

    if (desde) {
      wheres.push('anio * 100 + mes >= @desde_ym');
      params.desde_ym = fechaAYearMonth(desde);
      types.desde_ym = 'INT64';
    }
    if (hasta) {
      wheres.push('anio * 100 + mes <= @hasta_ym');
      params.hasta_ym = fechaAYearMonth(hasta);
      types.hasta_ym = 'INT64';
    }

    const query = `
      SELECT *
      FROM \`${projectId}.${datasetId}.vw_kpi_taquilla\`
      WHERE ${wheres.join(' AND ')}
      ORDER BY nombre_cine, anio, mes
    `;

    const [rows] = await bigquery.query({
      query,
      location: 'europe-west1',
      params,
      types,
    });

    res.status(200).json({
      success: true,
      count: rows.length,
      filtros: {
        titulo,
        desde: desde ?? null,
        hasta: hasta ?? null,
      },
      data: rows,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Detalle completo de una película: metadatos de Dim_Pelicula + todas las
 * filas de la vista de taquilla con esa misma película. El frontend agrega
 * los datos para producir totales globales, evolución mensual y ranking de
 * cines en su ficha de detalle.
 */
async function getDetallePelicula(req, res, next) {
  try {
    const titulo = req.params.titulo;
    const { desde, hasta } = req.query;

    if (!titulo) {
      return res.status(400).json({
        success: false,
        error: { message: "Falta el parámetro 'titulo' en la ruta." },
      });
    }

    const bigquery = getBigQueryClient();
    const projectId = process.env.PROJECT_ID;
    const datasetId = process.env.DATASET_ID;

    // Consultamos en paralelo metadatos + filas de taquilla.
    const infoQuery = `
      SELECT *
      FROM \`${projectId}.${datasetId}.Dim_Pelicula\`
      WHERE titulo = @titulo
      LIMIT 1
    `;

    const wheres = ['titulo = @titulo'];
    const params = { titulo };
    const types = {};

    if (desde) {
      wheres.push('anio * 100 + mes >= @desde_ym');
      params.desde_ym = fechaAYearMonth(desde);
      types.desde_ym = 'INT64';
    }
    if (hasta) {
      wheres.push('anio * 100 + mes <= @hasta_ym');
      params.hasta_ym = fechaAYearMonth(hasta);
      types.hasta_ym = 'INT64';
    }

    const taquillaQuery = `
      SELECT *
      FROM \`${projectId}.${datasetId}.vw_kpi_taquilla\`
      WHERE ${wheres.join(' AND ')}
      ORDER BY nombre_cine, anio, mes
    `;

    const [[infoRows], [taquillaRows]] = await Promise.all([
      bigquery.query({ query: infoQuery, location: 'europe-west1', params: { titulo } }),
      bigquery.query({ query: taquillaQuery, location: 'europe-west1', params, types }),
    ]);

    res.status(200).json({
      success: true,
      filtros: { titulo, desde: desde ?? null, hasta: hasta ?? null },
      data: {
        info: infoRows[0] ?? null,
        taquilla: taquillaRows,
      },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Detalle de un cine: capacidades agregadas de sus salas, taquilla acumulada
 * y retail del bar. El frontend reconstruye en su página los KPIs y rankings.
 */
async function getDetalleCine(req, res, next) {
  try {
    const nombre = req.params.nombre;
    const { desde, hasta } = req.query;

    if (!nombre) {
      return res.status(400).json({
        success: false,
        error: { message: "Falta el parámetro 'nombre' en la ruta." },
      });
    }

    const bigquery = getBigQueryClient();
    const projectId = process.env.PROJECT_ID;
    const datasetId = process.env.DATASET_ID;

    // Resumen estructural del cine: nº de salas, capacidad total, butacas VIP.
    const infoQuery = `
      SELECT
        nombre_cine,
        ANY_VALUE(ciudad)         AS ciudad,
        COUNT(*)                  AS num_salas,
        SUM(capacidad_total)      AS capacidad_total,
        SUM(num_butacas_vip)      AS butacas_vip
      FROM \`${projectId}.${datasetId}.Dim_Sala\`
      WHERE nombre_cine = @nombre
      GROUP BY nombre_cine
      LIMIT 1
    `;

    // Filtros opcionales de mes en las vistas KPI.
    const wheresKpi = ['nombre_cine = @nombre'];
    const paramsKpi = { nombre };
    const typesKpi = {};

    if (desde) {
      wheresKpi.push('anio * 100 + mes >= @desde_ym');
      paramsKpi.desde_ym = fechaAYearMonth(desde);
      typesKpi.desde_ym = 'INT64';
    }
    if (hasta) {
      wheresKpi.push('anio * 100 + mes <= @hasta_ym');
      paramsKpi.hasta_ym = fechaAYearMonth(hasta);
      typesKpi.hasta_ym = 'INT64';
    }

    const taquillaQuery = `
      SELECT *
      FROM \`${projectId}.${datasetId}.vw_kpi_taquilla\`
      WHERE ${wheresKpi.join(' AND ')}
    `;

    const retailQuery = `
      SELECT *
      FROM \`${projectId}.${datasetId}.vw_kpi_retail\`
      WHERE ${wheresKpi.join(' AND ')}
    `;

    const [[infoRows], [taquillaRows], [retailRows]] = await Promise.all([
      bigquery.query({ query: infoQuery, location: 'europe-west1', params: { nombre } }),
      bigquery.query({ query: taquillaQuery, location: 'europe-west1', params: paramsKpi, types: typesKpi }),
      bigquery.query({ query: retailQuery, location: 'europe-west1', params: paramsKpi, types: typesKpi }),
    ]);

    res.status(200).json({
      success: true,
      filtros: { cine: nombre, desde: desde ?? null, hasta: hasta ?? null },
      data: {
        info: infoRows[0] ?? null,
        taquilla: taquillaRows,
        retail: retailRows,
      },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Ocupación media por cine: porcentaje promedio de aforo lleno calculado
 * a nivel de función (sala × franja). Las filas de Fact_Ventas_Entradas se
 * agrupan primero por (sala, id_tiempo) para reconstruir cada función y
 * después se promedian las ratios entradas/capacidad. Soporta filtro por
 * rango de fechas (cruzando Dim_Tiempo).
 */
async function getOcupacionCines(req, res, next) {
  try {
    const { desde, hasta, cine, groupBy } = req.query;
    // Por defecto agregamos por cine; cuando se filtra a un cine concreto
    // tiene sentido descender al nivel de sala para detectar diferencias
    // dentro del mismo complejo.
    const porSala = groupBy === 'sala';

    const bigquery = getBigQueryClient();
    const projectId = process.env.PROJECT_ID;
    const datasetId = process.env.DATASET_ID;

    const wheres = [];
    const params = {};
    const types = {};

    if (cine) {
      wheres.push('s.nombre_cine = @cine');
      params.cine = cine;
    }
    if (desde) {
      wheres.push('t.fecha >= @desde');
      params.desde = desde;
      types.desde = 'DATE';
    }
    if (hasta) {
      wheres.push('t.fecha <= @hasta');
      params.hasta = hasta;
      types.hasta = 'DATE';
    }

    const whereClause = wheres.length ? `WHERE ${wheres.join(' AND ')}` : '';
    const dimensiones = porSala ? 'nombre_cine, nombre_sala' : 'nombre_cine';

    const query = `
      WITH funciones AS (
        SELECT
          s.nombre_cine,
          s.nombre_sala,
          s.capacidad_total,
          f.id_tiempo,
          SUM(f.cantidad_entradas) AS entradas_funcion
        FROM \`${projectId}.${datasetId}.Fact_Ventas_Entradas\` f
        JOIN \`${projectId}.${datasetId}.Dim_Sala\`   s ON f.id_sala   = s.id_sala
        JOIN \`${projectId}.${datasetId}.Dim_Tiempo\` t ON f.id_tiempo = t.id_tiempo
        ${whereClause}
        GROUP BY s.nombre_cine, s.nombre_sala, s.capacidad_total, f.id_tiempo
      )
      SELECT
        ${dimensiones},
        COUNT(*)                                              AS num_funciones,
        SUM(entradas_funcion)                                 AS entradas_totales,
        AVG(SAFE_DIVIDE(entradas_funcion, capacidad_total))   AS ocupacion_media,
        AVG(capacidad_total)                                  AS capacidad_media
      FROM funciones
      GROUP BY ${dimensiones}
      ORDER BY ocupacion_media DESC
    `;

    const [rows] = await bigquery.query({
      query,
      location: 'europe-west1',
      params,
      types,
    });

    res.status(200).json({
      success: true,
      count: rows.length,
      filtros: {
        cine: cine ?? null,
        desde: desde ?? null,
        hasta: hasta ?? null,
        groupBy: porSala ? 'sala' : 'cine',
      },
      data: rows,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Cruce día de la semana × franja horaria sobre Fact_Ventas_Entradas.
 * Alimenta el heatmap de actividad operativa del cine.
 */
async function getActividadHoraria(req, res, next) {
  try {
    const { desde, hasta, cine } = req.query;

    const bigquery = getBigQueryClient();
    const projectId = process.env.PROJECT_ID;
    const datasetId = process.env.DATASET_ID;

    const wheres = [];
    const params = {};
    const types = {};

    if (cine) {
      wheres.push('s.nombre_cine = @cine');
      params.cine = cine;
    }
    if (desde) {
      wheres.push('t.fecha >= @desde');
      params.desde = desde;
      types.desde = 'DATE';
    }
    if (hasta) {
      wheres.push('t.fecha <= @hasta');
      params.hasta = hasta;
      types.hasta = 'DATE';
    }

    const whereClause = wheres.length ? `WHERE ${wheres.join(' AND ')}` : '';

    const query = `
      SELECT
        t.dia_semana,
        t.franja_horaria,
        SUM(f.ingreso_total)      AS ingresos,
        SUM(f.cantidad_entradas)  AS entradas,
        COUNT(*)                  AS num_tickets
      FROM \`${projectId}.${datasetId}.Fact_Ventas_Entradas\` f
      JOIN \`${projectId}.${datasetId}.Dim_Tiempo\` t ON f.id_tiempo = t.id_tiempo
      JOIN \`${projectId}.${datasetId}.Dim_Sala\`   s ON f.id_sala   = s.id_sala
      ${whereClause}
      GROUP BY t.dia_semana, t.franja_horaria
      ORDER BY t.dia_semana, t.franja_horaria
    `;

    const [rows] = await bigquery.query({
      query,
      location: 'europe-west1',
      params,
      types,
    });

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

/**
 * Rentabilidad por formato de proyección.
 *
 * Para cada formato (2D, 3D, IMAX, VIP…) cruza:
 *  - Fact_Ventas_Entradas → ingresos de taquilla y entradas vendidas.
 *  - Fact_Ventas_Bar      → ingresos del bar generados en salas de ese
 *    formato y su margen (ingresos − coste_proveedor·cantidad).
 *
 * Como `Dim_Sala` no aporta coste de proyección de la película, el margen
 * "puro" de taquilla no se calcula; lo que sí se ofrece es el ticket medio
 * por formato, que es la mejor proxy de rentabilidad unitaria con el
 * modelo actual.
 */
async function getRentabilidadFormatos(req, res, next) {
  try {
    const { desde, hasta, cine } = req.query;

    const bigquery = getBigQueryClient();
    const projectId = process.env.PROJECT_ID;
    const datasetId = process.env.DATASET_ID;

    const wheres = [];
    const params = {};
    const types = {};

    if (cine) {
      wheres.push('s.nombre_cine = @cine');
      params.cine = cine;
    }
    if (desde) {
      wheres.push('t.fecha >= @desde');
      params.desde = desde;
      types.desde = 'DATE';
    }
    if (hasta) {
      wheres.push('t.fecha <= @hasta');
      params.hasta = hasta;
      types.hasta = 'DATE';
    }

    const whereClause = wheres.length ? `WHERE ${wheres.join(' AND ')}` : '';

    const query = `
      WITH taq AS (
        SELECT
          s.formato_proyeccion,
          SUM(f.ingreso_total)     AS ingresos_taquilla,
          SUM(f.cantidad_entradas) AS entradas
        FROM \`${projectId}.${datasetId}.Fact_Ventas_Entradas\` f
        JOIN \`${projectId}.${datasetId}.Dim_Sala\`   s ON f.id_sala   = s.id_sala
        JOIN \`${projectId}.${datasetId}.Dim_Tiempo\` t ON f.id_tiempo = t.id_tiempo
        ${whereClause}
        GROUP BY s.formato_proyeccion
      ),
      bar AS (
        SELECT
          s.formato_proyeccion,
          SUM(b.ingreso_total)                                            AS ingresos_bar,
          SUM(b.ingreso_total - b.cantidad_productos * p.coste_proveedor) AS margen_bar
        FROM \`${projectId}.${datasetId}.Fact_Ventas_Bar\`        b
        JOIN \`${projectId}.${datasetId}.Dim_Sala\`               s ON b.id_sala     = s.id_sala
        JOIN \`${projectId}.${datasetId}.Dim_Producto_Bar\`       p ON b.id_producto = p.id_producto
        JOIN \`${projectId}.${datasetId}.Dim_Tiempo\`             t ON b.id_tiempo   = t.id_tiempo
        ${whereClause}
        GROUP BY s.formato_proyeccion
      )
      SELECT
        COALESCE(taq.formato_proyeccion, bar.formato_proyeccion)      AS formato_proyeccion,
        taq.ingresos_taquilla,
        taq.entradas,
        SAFE_DIVIDE(taq.ingresos_taquilla, taq.entradas)              AS ticket_medio,
        bar.ingresos_bar,
        bar.margen_bar,
        SAFE_DIVIDE(bar.ingresos_bar, taq.entradas)                   AS bar_por_entrada
      FROM taq
      FULL OUTER JOIN bar USING (formato_proyeccion)
      ORDER BY ingresos_taquilla DESC NULLS LAST
    `;

    const [rows] = await bigquery.query({
      query,
      location: 'europe-west1',
      params,
      types,
    });

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

/**
 * Cross-selling género de película × categoría de producto del bar.
 *
 * Para cada combinación (género, categoría) devuelve:
 *   - ingresos_bar         · ingresos brutos del bar generados por compras
 *                            asociadas a entradas de películas de ese género.
 *   - cantidad_productos   · unidades vendidas.
 *   - entradas_genero      · entradas totales vendidas del género en el filtro.
 *   - gasto_medio_por_entrada · ingresos_bar / entradas_genero, la métrica
 *                            que mejor refleja la "propensión a comprar en el
 *                            bar" de los espectadores del género.
 */
async function getCrossSellingGeneroBar(req, res, next) {
  try {
    const { desde, hasta, cine } = req.query;

    const bigquery = getBigQueryClient();
    const projectId = process.env.PROJECT_ID;
    const datasetId = process.env.DATASET_ID;

    const wheres = [];
    const params = {};
    const types = {};

    if (cine) {
      wheres.push('s.nombre_cine = @cine');
      params.cine = cine;
    }
    if (desde) {
      wheres.push('t.fecha >= @desde');
      params.desde = desde;
      types.desde = 'DATE';
    }
    if (hasta) {
      wheres.push('t.fecha <= @hasta');
      params.hasta = hasta;
      types.hasta = 'DATE';
    }

    const whereClause = wheres.length ? `WHERE ${wheres.join(' AND ')}` : '';

    const query = `
      WITH entradas_genero AS (
        SELECT
          pe.genero,
          SUM(f.cantidad_entradas) AS entradas
        FROM \`${projectId}.${datasetId}.Fact_Ventas_Entradas\` f
        JOIN \`${projectId}.${datasetId}.Dim_Pelicula\` pe ON f.id_pelicula = pe.id_pelicula
        JOIN \`${projectId}.${datasetId}.Dim_Sala\`    s  ON f.id_sala     = s.id_sala
        JOIN \`${projectId}.${datasetId}.Dim_Tiempo\`  t  ON f.id_tiempo   = t.id_tiempo
        ${whereClause}
        GROUP BY pe.genero
      ),
      bar_cruzado AS (
        SELECT
          pe.genero,
          pb.categoria,
          SUM(b.ingreso_total)        AS ingresos_bar,
          SUM(b.cantidad_productos)   AS cantidad_productos
        FROM \`${projectId}.${datasetId}.Fact_Ventas_Bar\`   b
        JOIN \`${projectId}.${datasetId}.Dim_Pelicula\`      pe ON b.id_pelicula = pe.id_pelicula
        JOIN \`${projectId}.${datasetId}.Dim_Producto_Bar\`  pb ON b.id_producto = pb.id_producto
        JOIN \`${projectId}.${datasetId}.Dim_Sala\`          s  ON b.id_sala     = s.id_sala
        JOIN \`${projectId}.${datasetId}.Dim_Tiempo\`        t  ON b.id_tiempo   = t.id_tiempo
        ${whereClause}
        GROUP BY pe.genero, pb.categoria
      )
      SELECT
        bc.genero,
        bc.categoria,
        bc.ingresos_bar,
        bc.cantidad_productos,
        eg.entradas                                          AS entradas_genero,
        SAFE_DIVIDE(bc.ingresos_bar, eg.entradas)            AS gasto_medio_por_entrada
      FROM bar_cruzado bc
      LEFT JOIN entradas_genero eg ON bc.genero = eg.genero
      ORDER BY bc.genero, bc.categoria
    `;

    const [rows] = await bigquery.query({
      query,
      location: 'europe-west1',
      params,
      types,
    });

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

/**
 * Segmentación demográfica de la base de socios.
 *
 * Para cada segmento (rango de edad, género o nivel de fidelidad) calcula:
 *  - num_socios:        socios distintos del segmento.
 *  - entradas:          entradas compradas atribuidas al segmento.
 *  - gasto_taquilla:    € en taquilla generados por el segmento.
 *  - gasto_bar:         € en bar generados por el segmento.
 *  - gasto_total:       suma de los dos anteriores.
 *  - ticket_medio:      gasto_taquilla / entradas.
 *  - bar_por_entrada:   gasto_bar / entradas.
 *  - gasto_por_socio:   gasto_total / num_socios (LTV unitario en el periodo).
 *
 * Soporta filtrado por rango de fechas (Dim_Tiempo). No se filtra por cine
 * porque la fidelización es a nivel de cadena.
 */
async function getSegmentacionSocios(req, res, next) {
  try {
    const { desde, hasta } = req.query;
    const dimension = (req.query.dimension || 'edad').toLowerCase();

    if (!['edad', 'genero', 'fidelidad'].includes(dimension)) {
      return res.status(400).json({
        success: false,
        error: { message: "Parámetro 'dimension' inválido. Usa edad | genero | fidelidad." },
      });
    }

    const bigquery = getBigQueryClient();
    const projectId = process.env.PROJECT_ID;
    const datasetId = process.env.DATASET_ID;

    const wheresTiempo = [];
    const params = {};
    const types = {};

    if (desde) {
      wheresTiempo.push('t.fecha >= @desde');
      params.desde = desde;
      types.desde = 'DATE';
    }
    if (hasta) {
      wheresTiempo.push('t.fecha <= @hasta');
      params.hasta = hasta;
      types.hasta = 'DATE';
    }
    const whereTiempo = wheresTiempo.length ? `WHERE ${wheresTiempo.join(' AND ')}` : '';

    // Lógica de segmentación por dimensión.
    // `orden` se usa solo para ordenar el resultado de forma estable.
    let segmentoExpr;
    let ordenExpr;
    switch (dimension) {
      case 'edad':
        segmentoExpr = `
          CASE
            WHEN s.edad < 18 THEN '< 18'
            WHEN s.edad < 25 THEN '18-24'
            WHEN s.edad < 35 THEN '25-34'
            WHEN s.edad < 45 THEN '35-44'
            WHEN s.edad < 55 THEN '45-54'
            WHEN s.edad < 65 THEN '55-64'
            ELSE '65+'
          END`;
        ordenExpr = `
          CASE
            WHEN s.edad < 18 THEN 1
            WHEN s.edad < 25 THEN 2
            WHEN s.edad < 35 THEN 3
            WHEN s.edad < 45 THEN 4
            WHEN s.edad < 55 THEN 5
            WHEN s.edad < 65 THEN 6
            ELSE 7
          END`;
        break;
      case 'genero':
        segmentoExpr = 's.genero';
        ordenExpr = '0';
        break;
      case 'fidelidad':
        segmentoExpr = 's.nivel_fidelidad';
        ordenExpr = `
          CASE s.nivel_fidelidad
            WHEN 'Bronce' THEN 1
            WHEN 'Plata'  THEN 2
            WHEN 'Oro'    THEN 3
            ELSE 99
          END`;
        break;
    }

    const query = `
      WITH socios_segmentados AS (
        SELECT
          s.id_socio,
          ${segmentoExpr} AS segmento,
          ${ordenExpr}    AS orden
        FROM \`${projectId}.${datasetId}.Dim_Socio\` s
      ),
      taquilla AS (
        SELECT
          ss.segmento,
          ANY_VALUE(ss.orden)       AS orden,
          SUM(f.ingreso_total)      AS gasto_taquilla,
          SUM(f.cantidad_entradas)  AS entradas
        FROM \`${projectId}.${datasetId}.Fact_Ventas_Entradas\` f
        JOIN socios_segmentados ss ON f.id_socio = ss.id_socio
        JOIN \`${projectId}.${datasetId}.Dim_Tiempo\` t ON f.id_tiempo = t.id_tiempo
        ${whereTiempo}
        GROUP BY ss.segmento
      ),
      bar AS (
        SELECT
          ss.segmento,
          SUM(b.ingreso_total) AS gasto_bar
        FROM \`${projectId}.${datasetId}.Fact_Ventas_Bar\` b
        JOIN socios_segmentados ss ON b.id_socio = ss.id_socio
        JOIN \`${projectId}.${datasetId}.Dim_Tiempo\` t ON b.id_tiempo = t.id_tiempo
        ${whereTiempo}
        GROUP BY ss.segmento
      ),
      socios_por_segmento AS (
        SELECT segmento, ANY_VALUE(orden) AS orden, COUNT(*) AS num_socios
        FROM socios_segmentados
        GROUP BY segmento
      )
      SELECT
        sps.segmento,
        sps.num_socios,
        COALESCE(t.entradas, 0)                                       AS entradas,
        COALESCE(t.gasto_taquilla, 0)                                 AS gasto_taquilla,
        COALESCE(b.gasto_bar, 0)                                      AS gasto_bar,
        COALESCE(t.gasto_taquilla, 0) + COALESCE(b.gasto_bar, 0)      AS gasto_total,
        SAFE_DIVIDE(t.gasto_taquilla, t.entradas)                     AS ticket_medio,
        SAFE_DIVIDE(b.gasto_bar,      t.entradas)                     AS bar_por_entrada,
        SAFE_DIVIDE(
          COALESCE(t.gasto_taquilla, 0) + COALESCE(b.gasto_bar, 0),
          sps.num_socios
        )                                                             AS gasto_por_socio
      FROM socios_por_segmento sps
      LEFT JOIN taquilla t USING (segmento)
      LEFT JOIN bar      b USING (segmento)
      ORDER BY sps.orden, sps.segmento
    `;

    const [rows] = await bigquery.query({
      query,
      location: 'europe-west1',
      params,
      types,
    });

    res.status(200).json({
      success: true,
      count: rows.length,
      filtros: {
        dimension,
        desde: desde ?? null,
        hasta: hasta ?? null,
      },
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
  getPeliculas,
  getComparativaPelicula,
  getDetallePelicula,
  getDetalleCine,
  getOcupacionCines,
  getActividadHoraria,
  getRentabilidadFormatos,
  getCrossSellingGeneroBar,
  getSegmentacionSocios,
};
