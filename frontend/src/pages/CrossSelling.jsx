import { useEffect, useMemo, useState } from 'react';
import { Building2, Loader2, AlertTriangle, RotateCcw } from 'lucide-react';

import DateInput from '../components/DateInput.jsx';
import {
  fetchCines,
  fetchCrossSellingGeneroBar,
} from '../services/api.js';

const fmtEUR2 = new Intl.NumberFormat('es-ES', {
  style: 'currency',
  currency: 'EUR',
  maximumFractionDigits: 2,
});
const fmtEUR = new Intl.NumberFormat('es-ES', {
  style: 'currency',
  currency: 'EUR',
  maximumFractionDigits: 0,
});
const fmtNum = new Intl.NumberFormat('es-ES');

const HOY_ISO = new Date().toISOString().slice(0, 10);
const TODOS_LOS_CINES = '';

const numero = (row, keys) => {
  for (const k of keys) {
    const v = row?.[k];
    if (typeof v === 'number' && Number.isFinite(v)) return v;
    if (v !== null && v !== undefined && v !== '' && !Number.isNaN(Number(v))) {
      return Number(v);
    }
  }
  return 0;
};

/**
 * Página de análisis de Cross-Selling.
 *
 * Cumple con el objetivo del TFG de "encontrar patrones ocultos y
 * correlaciones directas entre la tipología del contenido y el
 * comportamiento de compra en el área de restauración" (Fact_Ventas_Bar
 * cruzado con Dim_Pelicula a través de id_pelicula).
 *
 * Visualización principal: heatmap género × categoría_producto con el
 * gasto medio en bar por entrada vendida — el espectador medio de cada
 * género gasta X € en cada tipo de producto.
 */
function CrossSelling() {
  const [cines, setCines] = useState([]);
  const [cineSeleccionado, setCineSeleccionado] = useState(TODOS_LOS_CINES);
  const [fechaDesde, setFechaDesde] = useState('');
  const [fechaHasta, setFechaHasta] = useState('');
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchCines()
      .then(setCines)
      .catch((err) => console.warn('No se pudo cargar el listado de cines:', err.message));
  }, []);

  useEffect(() => {
    let cancelado = false;

    if (fechaDesde && fechaHasta && fechaDesde > fechaHasta) {
      setError('La fecha "Desde" no puede ser posterior a la fecha "Hasta".');
      setLoading(false);
      return;
    }

    (async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await fetchCrossSellingGeneroBar({
          cine: cineSeleccionado || undefined,
          desde: fechaDesde || undefined,
          hasta: fechaHasta || undefined,
        });
        if (!cancelado) setRows(data);
      } catch (err) {
        if (!cancelado) setError(err.message);
      } finally {
        if (!cancelado) setLoading(false);
      }
    })();

    return () => {
      cancelado = true;
    };
  }, [cineSeleccionado, fechaDesde, fechaHasta]);

  const limpiar = () => {
    setCineSeleccionado(TODOS_LOS_CINES);
    setFechaDesde('');
    setFechaHasta('');
  };
  const hayFiltros = cineSeleccionado || fechaDesde || fechaHasta;

  // Dimensiones únicas presentes en los datos.
  const generos = useMemo(() => {
    const set = new Set(rows.map((r) => r.genero).filter(Boolean));
    return Array.from(set).sort();
  }, [rows]);

  const categorias = useMemo(() => {
    const set = new Set(rows.map((r) => r.categoria).filter(Boolean));
    return Array.from(set).sort();
  }, [rows]);

  // Mapas para acceso O(1) en el heatmap.
  const mapaCelda = useMemo(() => {
    const m = new Map();
    for (const r of rows) {
      m.set(`${r.genero}|${r.categoria}`, r);
    }
    return m;
  }, [rows]);

  // Máximo de la métrica principal para el degradado de color.
  const maxGasto = useMemo(() => {
    let max = 0;
    for (const r of rows) {
      const v = numero(r, ['gasto_medio_por_entrada']);
      if (v > max) max = v;
    }
    return max || 1;
  }, [rows]);

  const colorCelda = (valor) => {
    const intensidad = Math.min(1, valor / maxGasto);
    return `rgba(245, 158, 11, ${0.10 + intensidad * 0.75})`;
  };

  // Resumen por género: gasto medio combinado y categoría preferida.
  const resumenGeneros = useMemo(() => {
    return generos.map((g) => {
      const filas = rows.filter((r) => r.genero === g);
      const ingresos = filas.reduce((a, r) => a + numero(r, ['ingresos_bar']), 0);
      const entradas = numero(filas[0], ['entradas_genero']); // mismo valor en todas
      const top = [...filas].sort(
        (a, b) =>
          numero(b, ['gasto_medio_por_entrada']) -
          numero(a, ['gasto_medio_por_entrada']),
      )[0];
      return {
        genero: g,
        entradas,
        ingresos_bar_total: ingresos,
        gasto_medio: entradas > 0 ? ingresos / entradas : 0,
        categoria_top: top?.categoria ?? '—',
        gasto_top: numero(top, ['gasto_medio_por_entrada']),
      };
    }).sort((a, b) => b.gasto_medio - a.gasto_medio);
  }, [rows, generos]);

  return (
    <div className="max-w-7xl mx-auto p-6">
      <header className="mb-6">
        <p className="text-sm text-cyan-400 uppercase tracking-wider font-medium">
          Cross-Selling
        </p>
        <h1 className="mt-1 text-3xl md:text-4xl font-bold text-gray-50">
          Película × Bar · patrones de compra
        </h1>
        <p className="mt-2 text-sm text-gray-400">
          Cruza <code>Fact_Ventas_Bar</code> con <code>Dim_Pelicula</code> vía
          {' '}<code>id_pelicula</code>. Detecta qué géneros generan más consumo en
          el bar y a qué tipo de producto se inclinan sus espectadores.
        </p>
      </header>

      {/* Filtros */}
      <section className="mb-6 bg-gray-800/60 border border-gray-700 rounded-2xl p-4 shadow-lg">
        <div className="flex flex-col md:flex-row md:items-end md:flex-wrap gap-4">
          <div className="flex flex-col flex-1 min-w-[220px]">
            <label className="text-xs uppercase tracking-wider text-gray-400 font-medium mb-2">
              Cine
            </label>
            <div className="relative">
              <Building2
                size={16}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
              />
              <select
                value={cineSeleccionado}
                onChange={(e) => setCineSeleccionado(e.target.value)}
                disabled={loading}
                className="w-full bg-gray-900 border border-gray-700 hover:border-gray-600 focus:border-cyan-500 focus:outline-none rounded-xl pl-9 pr-8 py-2.5 text-sm text-gray-100 cursor-pointer disabled:opacity-60 disabled:cursor-wait transition-colors"
              >
                <option value={TODOS_LOS_CINES}>Todos los cines</option>
                {cines.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex flex-col w-44">
            <label className="text-xs uppercase tracking-wider text-gray-400 font-medium mb-2">
              Desde
            </label>
            <DateInput
              value={fechaDesde}
              max={fechaHasta && fechaHasta < HOY_ISO ? fechaHasta : HOY_ISO}
              onChange={setFechaDesde}
              disabled={loading}
            />
          </div>

          <div className="flex flex-col w-44">
            <label className="text-xs uppercase tracking-wider text-gray-400 font-medium mb-2">
              Hasta
            </label>
            <DateInput
              value={fechaHasta}
              min={fechaDesde || undefined}
              max={HOY_ISO}
              onChange={setFechaHasta}
              disabled={loading}
            />
          </div>

          {hayFiltros && (
            <button
              onClick={limpiar}
              disabled={loading}
              className="self-end flex items-center gap-2 px-4 py-2.5 bg-gray-900 hover:bg-gray-700 border border-gray-700 hover:border-gray-600 rounded-xl text-sm text-gray-300 transition-colors disabled:opacity-60"
            >
              <RotateCcw size={14} />
              <span>Limpiar</span>
            </button>
          )}
        </div>
      </section>

      {loading && (
        <div className="mb-4 flex items-center text-sm text-gray-400">
          <Loader2 size={16} className="animate-spin mr-2" />
          Calculando correlaciones…
        </div>
      )}

      {error && (
        <div className="mb-4 bg-gray-800 border border-gray-700 rounded-2xl p-4 flex items-center gap-3 text-red-300">
          <AlertTriangle size={18} />
          <span className="text-sm">{error}</span>
        </div>
      )}

      <div className={`space-y-6 ${loading ? 'opacity-60' : ''}`}>
        {/* Heatmap principal · género × categoría */}
        <section className="bg-gray-800 border border-gray-700 rounded-2xl p-6 shadow-lg">
          <h3 className="text-lg font-semibold text-gray-100">
            Gasto medio en bar por entrada
          </h3>
          <p className="text-xs text-gray-400 mt-1 mb-4">
            Cada celda es <code>ingresos_bar / entradas</code> del género de la
            película. Tonos más oscuros = el público de ese género gasta más en
            esa categoría del bar.
          </p>

          {rows.length === 0 ? (
            <p className="text-sm text-gray-500 italic text-center py-8">
              No hay datos para los filtros aplicados.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-separate border-spacing-1 text-sm">
                <thead>
                  <tr>
                    <th className="text-left text-[11px] uppercase tracking-wider text-gray-500 font-medium px-2">
                      Género ↓ · Categoría →
                    </th>
                    {categorias.map((c) => (
                      <th
                        key={c}
                        className="text-[11px] uppercase tracking-wider text-gray-400 font-medium text-center px-2 py-1"
                      >
                        {c}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {generos.map((g) => (
                    <tr key={g}>
                      <th className="text-[11px] uppercase tracking-wider text-gray-400 font-medium text-right pr-2 whitespace-nowrap">
                        {g}
                      </th>
                      {categorias.map((c) => {
                        const row = mapaCelda.get(`${g}|${c}`);
                        const gasto = numero(row, ['gasto_medio_por_entrada']);
                        return (
                          <td
                            key={c}
                            className="rounded-lg border border-gray-700/60 px-2 py-3 text-center text-gray-100"
                            style={{ backgroundColor: colorCelda(gasto) }}
                            title={
                              row
                                ? `Ingresos bar: ${fmtEUR.format(numero(row, ['ingresos_bar']))}\nUnidades: ${fmtNum.format(numero(row, ['cantidad_productos']))}\nEntradas del género: ${fmtNum.format(numero(row, ['entradas_genero']))}`
                                : 'Sin datos'
                            }
                          >
                            <span className="text-xs font-medium">
                              {gasto > 0 ? fmtEUR2.format(gasto) : '—'}
                            </span>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* Resumen por género · ranking + categoría preferida */}
        <section className="bg-gray-800 border border-gray-700 rounded-2xl p-6 shadow-lg">
          <h3 className="text-lg font-semibold text-gray-100">
            Ranking de géneros por propensión al bar
          </h3>
          <p className="text-xs text-gray-400 mt-1 mb-4">
            Géneros ordenados por gasto medio total en bar por entrada vendida.
            La última columna identifica la categoría del bar a la que más se
            inclinan sus espectadores.
          </p>

          {resumenGeneros.length === 0 ? (
            <p className="text-sm text-gray-500 italic text-center py-8">
              No hay datos para los filtros aplicados.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-[11px] uppercase tracking-wider text-gray-400 border-b border-gray-700">
                    <th className="text-left py-2 pr-3 font-medium">Género</th>
                    <th className="text-right py-2 px-3 font-medium">Entradas</th>
                    <th className="text-right py-2 px-3 font-medium">Ingresos bar</th>
                    <th className="text-right py-2 px-3 font-medium">Gasto medio</th>
                    <th className="text-left py-2 pl-3 font-medium">Categoría preferida</th>
                  </tr>
                </thead>
                <tbody>
                  {resumenGeneros.map((g) => (
                    <tr key={g.genero} className="border-b border-gray-700/50 last:border-0">
                      <td className="py-2 pr-3 text-gray-100">{g.genero}</td>
                      <td className="py-2 px-3 text-right text-gray-300">
                        {fmtNum.format(g.entradas)}
                      </td>
                      <td className="py-2 px-3 text-right text-amber-300">
                        {fmtEUR.format(g.ingresos_bar_total)}
                      </td>
                      <td className="py-2 px-3 text-right text-emerald-300 font-medium">
                        {fmtEUR2.format(g.gasto_medio)}
                      </td>
                      <td className="py-2 pl-3 text-gray-100">
                        <span className="text-cyan-300">{g.categoria_top}</span>
                        <span className="text-gray-500 ml-2">
                          ({fmtEUR2.format(g.gasto_top)})
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

export default CrossSelling;
