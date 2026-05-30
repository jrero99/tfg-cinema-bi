import { useEffect, useMemo, useState } from 'react';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { Film, Loader2, AlertTriangle } from 'lucide-react';

import { fetchComparativaPelicula } from '../services/api.js';

const fmtEUR = new Intl.NumberFormat('es-ES', {
  style: 'currency',
  currency: 'EUR',
  maximumFractionDigits: 0,
});
const fmtNum = new Intl.NumberFormat('es-ES');

// Paleta cíclica para asignar un color estable a cada cine.
const PALETA = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899'];

const NOMBRE_MES = [
  'ene', 'feb', 'mar', 'abr', 'may', 'jun',
  'jul', 'ago', 'sep', 'oct', 'nov', 'dic',
];

// Tolerante a variaciones de columnas en la vista BigQuery.
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

const cadena = (row, keys, fallback = 'Sin dato') => {
  for (const k of keys) {
    if (row?.[k]) return String(row[k]);
  }
  return fallback;
};

/**
 * ComparadorPelicula
 * -------------------
 * Permite seleccionar una película del catálogo y comparar su rendimiento
 * entre los cines de la cadena. Muestra dos gráficos:
 *  1. Barras horizontales con ingresos totales por cine.
 *  2. Líneas con la evolución mensual de ingresos por cine.
 *
 * Props:
 *  - titulos: Array<string> · catálogo de películas para el desplegable.
 *  - filters: { desde?: string, hasta?: string } · rango de fechas heredado
 *    de los filtros globales del dashboard (formato ISO YYYY-MM-DD).
 */
function ComparadorPelicula({ titulos = [], filters = {} }) {
  const [titulo, setTitulo] = useState('');
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const { desde, hasta } = filters;

  // Cargar datos cada vez que cambia el título o el rango de fechas.
  useEffect(() => {
    if (!titulo) {
      setRows([]);
      setError(null);
      return;
    }

    let cancelado = false;
    (async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await fetchComparativaPelicula(titulo, { desde, hasta });
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
  }, [titulo, desde, hasta]);

  // Normaliza una fila al esquema interno { cine, anio, mes, ingresos, entradas }.
  const normalizadas = useMemo(
    () =>
      rows.map((r) => ({
        cine: cadena(r, ['nombre_cine', 'cine']),
        anio: numero(r, ['anio']),
        mes: numero(r, ['mes']),
        ingresos: numero(r, [
          'ingresos_taquilla',
          'ingreso_total',
          'ingresos',
          'total_ingresos',
        ]),
        entradas: numero(r, [
          'total_entradas',
          'numero_entradas',
          'entradas',
          'cantidad_entradas',
        ]),
      })),
    [rows],
  );

  // Agregado por cine para el gráfico de barras.
  const totalesPorCine = useMemo(() => {
    const mapa = new Map();
    for (const r of normalizadas) {
      const acc = mapa.get(r.cine) ?? { cine: r.cine, ingresos: 0, entradas: 0 };
      acc.ingresos += r.ingresos;
      acc.entradas += r.entradas;
      mapa.set(r.cine, acc);
    }
    return Array.from(mapa.values()).sort((a, b) => b.ingresos - a.ingresos);
  }, [normalizadas]);

  // Lista estable y ordenada de cines presentes en los datos.
  const cinesPresentes = useMemo(
    () => totalesPorCine.map((c) => c.cine),
    [totalesPorCine],
  );

  // Pivot: cada elemento es un mes (YYYY-MM) con una clave por cine.
  const evolucionMensual = useMemo(() => {
    const mapa = new Map();
    for (const r of normalizadas) {
      if (!r.anio || !r.mes) continue;
      const clave = `${r.anio}-${String(r.mes).padStart(2, '0')}`;
      const acc = mapa.get(clave) ?? {
        periodo: clave,
        etiqueta: `${NOMBRE_MES[r.mes - 1]} ${String(r.anio).slice(2)}`,
        _orden: r.anio * 100 + r.mes,
      };
      acc[r.cine] = (acc[r.cine] ?? 0) + r.ingresos;
      mapa.set(clave, acc);
    }
    return Array.from(mapa.values()).sort((a, b) => a._orden - b._orden);
  }, [normalizadas]);

  // KPI auxiliares: cine líder e ingresos totales de la película en el rango.
  const totalGlobal = totalesPorCine.reduce((a, c) => a + c.ingresos, 0);
  const lider = totalesPorCine[0];

  return (
    <div className="bg-gray-800 border border-gray-700 rounded-2xl p-4 sm:p-6 shadow-lg">
      <div className="mb-4 flex flex-col md:flex-row md:items-end md:justify-between gap-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-100">
            Comparativa de una película entre cines
          </h3>
          <p className="text-xs text-gray-400 mt-1">
            Selecciona un título para ver su rendimiento en cada local y su
            evolución mes a mes.
          </p>
        </div>

        <div className="flex flex-col w-full md:w-auto md:min-w-[260px]">
          <label
            htmlFor="comparador-titulo"
            className="text-xs uppercase tracking-wider text-gray-400 font-medium mb-2"
          >
            Película
          </label>
          <div className="relative">
            <Film
              size={16}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
            />
            <select
              id="comparador-titulo"
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
              disabled={loading || titulos.length === 0}
              className="w-full bg-gray-900 border border-gray-700 hover:border-gray-600 focus:border-cyan-500 focus:outline-none rounded-xl pl-9 pr-8 py-2.5 text-sm text-gray-100 cursor-pointer disabled:opacity-60 disabled:cursor-wait transition-colors"
            >
              <option value="">— Elige una película —</option>
              {titulos.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Mensaje inicial: aún no se ha elegido película */}
      {!titulo && (
        <div className="text-sm text-gray-500 italic text-center py-10">
          Elige una película del desplegable para comenzar la comparativa.
        </div>
      )}

      {/* Aviso de carga */}
      {titulo && loading && (
        <div className="flex items-center text-sm text-gray-400 py-10 justify-center">
          <Loader2 size={16} className="animate-spin mr-2" />
          <span>Cargando datos de “{titulo}”…</span>
        </div>
      )}

      {/* Error puntual del fetch */}
      {titulo && !loading && error && (
        <div className="flex items-center gap-2 text-sm text-red-300 py-10 justify-center">
          <AlertTriangle size={16} />
          <span>{error}</span>
        </div>
      )}

      {/* Datos cargados pero vacíos */}
      {titulo && !loading && !error && normalizadas.length === 0 && (
        <div className="text-sm text-gray-500 italic text-center py-10">
          No hay registros de “{titulo}” en el rango seleccionado.
        </div>
      )}

      {/* Visualización de los datos */}
      {titulo && !loading && !error && normalizadas.length > 0 && (
        <div className="space-y-6">
          {/* Tarjetas resumen */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="bg-gray-900/60 border border-gray-700 rounded-xl p-3">
              <p className="text-[11px] uppercase tracking-wider text-gray-400">
                Ingresos totales
              </p>
              <p className="mt-1 text-lg font-semibold text-emerald-400">
                {fmtEUR.format(totalGlobal)}
              </p>
            </div>
            <div className="bg-gray-900/60 border border-gray-700 rounded-xl p-3">
              <p className="text-[11px] uppercase tracking-wider text-gray-400">
                Cine líder
              </p>
              <p className="mt-1 text-lg font-semibold text-cyan-300 truncate">
                {lider?.cine ?? '—'}
              </p>
              <p className="text-[11px] text-gray-500">
                {lider ? fmtEUR.format(lider.ingresos) : ''}
              </p>
            </div>
            <div className="bg-gray-900/60 border border-gray-700 rounded-xl p-3">
              <p className="text-[11px] uppercase tracking-wider text-gray-400">
                Cines con proyecciones
              </p>
              <p className="mt-1 text-lg font-semibold text-violet-300">
                {cinesPresentes.length}
              </p>
            </div>
          </div>

          {/* Bar chart · totales por cine */}
          <div>
            <h4 className="text-sm font-semibold text-gray-200 mb-2">
              Ingresos y entradas por cine
            </h4>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  layout="vertical"
                  data={totalesPorCine}
                  margin={{ top: 10, right: 24, left: 16, bottom: 10 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis
                    type="number"
                    stroke="#9CA3AF"
                    tick={{ fontSize: 11, fill: '#D1D5DB' }}
                    tickFormatter={(v) => fmtEUR.format(v)}
                  />
                  <YAxis
                    type="category"
                    dataKey="cine"
                    stroke="#9CA3AF"
                    tick={{ fontSize: 12, fill: '#D1D5DB' }}
                    width={110}
                  />
                  <Tooltip
                    cursor={{ fill: 'rgba(59,130,246,0.08)' }}
                    contentStyle={{
                      background: '#111827',
                      border: '1px solid #374151',
                      borderRadius: 12,
                      color: '#F3F4F6',
                    }}
                    formatter={(value, name) => {
                      if (name === 'ingresos') return [fmtEUR.format(value), 'Ingresos'];
                      if (name === 'entradas') return [fmtNum.format(value), 'Entradas'];
                      return [value, name];
                    }}
                  />
                  <Legend
                    wrapperStyle={{ fontSize: 12, color: '#D1D5DB' }}
                    formatter={(v) => (v === 'ingresos' ? 'Ingresos' : 'Entradas')}
                  />
                  <Bar dataKey="ingresos" fill="#3B82F6" radius={[0, 6, 6, 0]} />
                  <Bar dataKey="entradas" fill="#10B981" radius={[0, 6, 6, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Line chart · evolución mensual por cine */}
          <div>
            <h4 className="text-sm font-semibold text-gray-200 mb-2">
              Evolución mensual de ingresos por cine
            </h4>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={evolucionMensual}
                  margin={{ top: 10, right: 16, left: 8, bottom: 30 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis
                    dataKey="etiqueta"
                    stroke="#9CA3AF"
                    tick={{ fontSize: 11, fill: '#D1D5DB' }}
                    interval={0}
                    angle={-25}
                    textAnchor="end"
                  />
                  <YAxis
                    stroke="#9CA3AF"
                    tick={{ fontSize: 11, fill: '#D1D5DB' }}
                    tickFormatter={(v) => fmtEUR.format(v)}
                  />
                  <Tooltip
                    contentStyle={{
                      background: '#111827',
                      border: '1px solid #374151',
                      borderRadius: 12,
                      color: '#F3F4F6',
                    }}
                    formatter={(value, name) => [fmtEUR.format(value), name]}
                  />
                  <Legend wrapperStyle={{ fontSize: 12, color: '#D1D5DB' }} />
                  {cinesPresentes.map((cine, idx) => (
                    <Line
                      key={cine}
                      type="monotone"
                      dataKey={cine}
                      stroke={PALETA[idx % PALETA.length]}
                      strokeWidth={2}
                      dot={{ r: 3 }}
                      activeDot={{ r: 5 }}
                      connectNulls
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ComparadorPelicula;
