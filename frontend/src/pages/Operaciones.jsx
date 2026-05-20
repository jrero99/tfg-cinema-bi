import { useEffect, useState } from 'react';
import { Building2, Loader2, AlertTriangle, RotateCcw } from 'lucide-react';

import OcupacionChart from '../components/OcupacionChart.jsx';
import HeatmapHorario from '../components/HeatmapHorario.jsx';
import RentabilidadFormatoChart from '../components/RentabilidadFormatoChart.jsx';
import DateInput from '../components/DateInput.jsx';
import {
  fetchCines,
  fetchOcupacion,
  fetchActividadHoraria,
  fetchRentabilidadFormatos,
} from '../services/api.js';

const HOY_ISO = new Date().toISOString().slice(0, 10);
const TODOS_LOS_CINES = '';

/**
 * Página de Operaciones: KPIs operativos del cine (ocupación de aforo y mapa
 * horario). Reutiliza la barra de filtros del dashboard principal y permite
 * acotar por cine y rango de fechas.
 */
function Operaciones() {
  const [cines, setCines] = useState([]);
  const [cineSeleccionado, setCineSeleccionado] = useState(TODOS_LOS_CINES);
  const [fechaDesde, setFechaDesde] = useState('');
  const [fechaHasta, setFechaHasta] = useState('');
  const [metricaHeatmap, setMetricaHeatmap] = useState('ingresos');

  const [ocupacion, setOcupacion] = useState([]);
  const [actividad, setActividad] = useState([]);
  const [rentabilidad, setRentabilidad] = useState([]);
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
        const filtros = {
          cine: cineSeleccionado || undefined,
          desde: fechaDesde || undefined,
          hasta: fechaHasta || undefined,
        };
        // Cuando el usuario filtra un cine, descendemos a granularidad de
        // sala — el gráfico "por cine" se vuelve inútil con una sola barra.
        const filtrosOcupacion = cineSeleccionado
          ? { ...filtros, groupBy: 'sala' }
          : filtros;
        const [oc, ac, rt] = await Promise.all([
          fetchOcupacion(filtrosOcupacion),
          fetchActividadHoraria(filtros),
          fetchRentabilidadFormatos(filtros),
        ]);
        if (cancelado) return;
        setOcupacion(oc);
        setActividad(ac);
        setRentabilidad(rt);
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

  return (
    <div className="max-w-7xl mx-auto p-6">
      <header className="mb-6">
        <p className="text-sm text-cyan-400 uppercase tracking-wider font-medium">
          Operaciones de sala
        </p>
        <h1 className="mt-1 text-3xl md:text-4xl font-bold text-gray-50">
          Rotación de aforo y mapa horario
        </h1>
        <p className="mt-2 text-sm text-gray-400">
          KPIs operativos calculados directamente sobre <code>Fact_Ventas_Entradas</code>,
          cruzando con <code>Dim_Sala</code> y <code>Dim_Tiempo</code>.
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
          Calculando KPIs operativos…
        </div>
      )}

      {error && (
        <div className="mb-4 bg-gray-800 border border-gray-700 rounded-2xl p-4 flex items-center gap-3 text-red-300">
          <AlertTriangle size={18} />
          <span className="text-sm">{error}</span>
        </div>
      )}

      <div className={`space-y-6 ${loading ? 'opacity-60' : ''}`}>
        <OcupacionChart
          data={ocupacion}
          modo={cineSeleccionado ? 'sala' : 'cine'}
        />

        <RentabilidadFormatoChart data={rentabilidad} />

        <div className="bg-gray-800/60 border border-gray-700 rounded-2xl p-3 inline-flex items-center gap-2">
          <span className="text-xs uppercase tracking-wider text-gray-400 mr-2">
            Métrica del mapa
          </span>
          {['ingresos', 'entradas'].map((m) => (
            <button
              key={m}
              onClick={() => setMetricaHeatmap(m)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                metricaHeatmap === m
                  ? 'bg-cyan-500/15 border border-cyan-500/40 text-cyan-200'
                  : 'bg-gray-900 border border-gray-700 text-gray-400 hover:text-gray-100'
              }`}
            >
              {m === 'ingresos' ? 'Ingresos' : 'Entradas'}
            </button>
          ))}
        </div>

        <HeatmapHorario data={actividad} metrica={metricaHeatmap} />
      </div>
    </div>
  );
}

export default Operaciones;
