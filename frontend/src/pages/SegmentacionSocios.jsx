import { useEffect, useMemo, useState } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { Loader2, AlertTriangle, RotateCcw } from 'lucide-react';

import DateInput from '../components/DateInput.jsx';
import { fetchSegmentacionSocios } from '../services/api.js';

const fmtEUR = new Intl.NumberFormat('es-ES', {
  style: 'currency',
  currency: 'EUR',
  maximumFractionDigits: 0,
});
const fmtEUR2 = new Intl.NumberFormat('es-ES', {
  style: 'currency',
  currency: 'EUR',
  maximumFractionDigits: 2,
});
const fmtNum = new Intl.NumberFormat('es-ES');

const HOY_ISO = new Date().toISOString().slice(0, 10);

const DIMENSIONES = [
  { id: 'edad', label: 'Edad' },
  { id: 'genero', label: 'Género' },
  { id: 'fidelidad', label: 'Fidelidad' },
];

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
 * Página de segmentación demográfica de socios.
 * Permite alternar entre tres dimensiones (edad, género, nivel de fidelidad)
 * y muestra para cada segmento: número de socios, entradas, gasto en taquilla
 * y bar, ticket medio, gasto medio en bar por entrada y LTV unitario en el
 * periodo (gasto_total / num_socios).
 */
function SegmentacionSocios() {
  const [dimension, setDimension] = useState('edad');
  const [fechaDesde, setFechaDesde] = useState('');
  const [fechaHasta, setFechaHasta] = useState('');
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

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
        const data = await fetchSegmentacionSocios(dimension, {
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
  }, [dimension, fechaDesde, fechaHasta]);

  const limpiar = () => {
    setFechaDesde('');
    setFechaHasta('');
  };
  const hayFiltros = fechaDesde || fechaHasta;

  // Normaliza los campos numéricos para los componentes.
  const filas = useMemo(
    () =>
      rows.map((r) => ({
        segmento: r.segmento ?? 'Sin dato',
        num_socios: numero(r, ['num_socios']),
        entradas: numero(r, ['entradas']),
        gasto_taquilla: numero(r, ['gasto_taquilla']),
        gasto_bar: numero(r, ['gasto_bar']),
        gasto_total: numero(r, ['gasto_total']),
        ticket_medio: numero(r, ['ticket_medio']),
        bar_por_entrada: numero(r, ['bar_por_entrada']),
        gasto_por_socio: numero(r, ['gasto_por_socio']),
      })),
    [rows],
  );

  const totales = useMemo(() => {
    return filas.reduce(
      (acc, r) => {
        acc.num_socios += r.num_socios;
        acc.entradas += r.entradas;
        acc.gasto_taquilla += r.gasto_taquilla;
        acc.gasto_bar += r.gasto_bar;
        acc.gasto_total += r.gasto_total;
        return acc;
      },
      { num_socios: 0, entradas: 0, gasto_taquilla: 0, gasto_bar: 0, gasto_total: 0 },
    );
  }, [filas]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
      <header className="mb-6">
        <p className="text-sm text-cyan-400 uppercase tracking-wider font-medium">
          Socios
        </p>
        <h1 className="mt-1 text-2xl sm:text-3xl md:text-4xl font-bold text-gray-50">
          Segmentación demográfica
        </h1>
        <p className="mt-2 text-sm text-gray-400">
          Cruza <code>Dim_Socio</code> con las dos tablas de hechos para
          analizar el comportamiento de compra de cada segmento. La
          fidelización es a nivel cadena, por eso no hay filtro de cine.
        </p>
      </header>

      {/* Filtros */}
      <section className="mb-6 bg-gray-800/60 border border-gray-700 rounded-2xl p-4 shadow-lg">
        <div className="flex flex-col md:flex-row md:items-end md:flex-wrap gap-4">
          <div className="flex flex-col w-full sm:flex-1">
            <label className="text-xs uppercase tracking-wider text-gray-400 font-medium mb-2">
              Dimensión
            </label>
            <div className="flex flex-wrap gap-2">
              {DIMENSIONES.map((d) => (
                <button
                  key={d.id}
                  onClick={() => setDimension(d.id)}
                  disabled={loading}
                  className={`flex-1 sm:flex-none px-4 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                    dimension === d.id
                      ? 'bg-cyan-500/15 border border-cyan-500/40 text-cyan-200'
                      : 'bg-gray-900 border border-gray-700 text-gray-400 hover:text-gray-100 hover:border-gray-600'
                  } disabled:opacity-60`}
                >
                  {d.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-col w-full sm:w-44">
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

          <div className="flex flex-col w-full sm:w-44">
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
              className="w-full sm:w-auto sm:self-end flex items-center justify-center gap-2 px-4 py-2.5 bg-gray-900 hover:bg-gray-700 border border-gray-700 hover:border-gray-600 rounded-xl text-sm text-gray-300 transition-colors disabled:opacity-60"
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
          Calculando segmentación…
        </div>
      )}

      {error && (
        <div className="mb-4 bg-gray-800 border border-gray-700 rounded-2xl p-4 flex items-center gap-3 text-red-300">
          <AlertTriangle size={18} />
          <span className="text-sm">{error}</span>
        </div>
      )}

      <div className={`space-y-6 ${loading ? 'opacity-60' : ''}`}>
        {/* Mini KPIs de la base de socios filtrada */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="bg-gray-900/60 border border-gray-700 rounded-xl p-3">
            <p className="text-[11px] uppercase tracking-wider text-gray-400">Socios</p>
            <p className="mt-1 text-lg font-semibold text-cyan-300">
              {fmtNum.format(totales.num_socios)}
            </p>
          </div>
          <div className="bg-gray-900/60 border border-gray-700 rounded-xl p-3">
            <p className="text-[11px] uppercase tracking-wider text-gray-400">Entradas</p>
            <p className="mt-1 text-lg font-semibold text-cyan-300">
              {fmtNum.format(totales.entradas)}
            </p>
          </div>
          <div className="bg-gray-900/60 border border-gray-700 rounded-xl p-3">
            <p className="text-[11px] uppercase tracking-wider text-gray-400">Gasto taquilla</p>
            <p className="mt-1 text-lg font-semibold text-blue-300">
              {fmtEUR.format(totales.gasto_taquilla)}
            </p>
          </div>
          <div className="bg-gray-900/60 border border-gray-700 rounded-xl p-3">
            <p className="text-[11px] uppercase tracking-wider text-gray-400">Gasto bar</p>
            <p className="mt-1 text-lg font-semibold text-amber-300">
              {fmtEUR.format(totales.gasto_bar)}
            </p>
          </div>
        </div>

        {/* Bar chart: gasto medio por socio en cada segmento */}
        <div className="bg-gray-800 border border-gray-700 rounded-2xl p-6 shadow-lg">
          <h3 className="text-lg font-semibold text-gray-100 mb-1">
            Gasto medio por socio (LTV en el periodo)
          </h3>
          <p className="text-xs text-gray-400 mb-4">
            Suma de taquilla + bar dividida entre el número de socios del
            segmento. Mide cuánto vale en € cada socio del grupo.
          </p>
          {filas.length === 0 ? (
            <p className="text-sm text-gray-500 italic text-center py-8">
              No hay datos para los filtros aplicados.
            </p>
          ) : (
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={filas}
                  margin={{ top: 10, right: 16, left: 8, bottom: 20 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis
                    dataKey="segmento"
                    stroke="#9CA3AF"
                    tick={{ fontSize: 11, fill: '#D1D5DB' }}
                  />
                  <YAxis
                    stroke="#9CA3AF"
                    tick={{ fontSize: 11, fill: '#D1D5DB' }}
                    tickFormatter={(v) => fmtEUR.format(v)}
                  />
                  <Tooltip
                    cursor={{ fill: 'rgba(139,92,246,0.08)' }}
                    contentStyle={{
                      background: '#111827',
                      border: '1px solid #374151',
                      borderRadius: 12,
                      color: '#F3F4F6',
                    }}
                    formatter={(value) => [fmtEUR.format(value), 'Gasto por socio']}
                  />
                  <Bar dataKey="gasto_por_socio" fill="#8B5CF6" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* Bar chart agrupado: descomposición taquilla vs bar */}
        <div className="bg-gray-800 border border-gray-700 rounded-2xl p-6 shadow-lg">
          <h3 className="text-lg font-semibold text-gray-100 mb-1">
            Composición del gasto: taquilla vs bar
          </h3>
          <p className="text-xs text-gray-400 mb-4">
            Cuánto contribuye cada canal de ingreso al total de cada
            segmento. Útil para detectar perfiles "cinéfilos puros" vs
            perfiles "experienciales" que invierten más en bar.
          </p>
          {filas.length === 0 ? (
            <p className="text-sm text-gray-500 italic text-center py-8">
              No hay datos para los filtros aplicados.
            </p>
          ) : (
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={filas}
                  margin={{ top: 10, right: 16, left: 8, bottom: 20 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis
                    dataKey="segmento"
                    stroke="#9CA3AF"
                    tick={{ fontSize: 11, fill: '#D1D5DB' }}
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
                    formatter={(value, name) => [
                      fmtEUR.format(value),
                      name === 'gasto_taquilla' ? 'Taquilla' : 'Bar',
                    ]}
                  />
                  <Legend
                    wrapperStyle={{ fontSize: 12, color: '#D1D5DB' }}
                    formatter={(v) => (v === 'gasto_taquilla' ? 'Taquilla' : 'Bar')}
                  />
                  <Bar dataKey="gasto_taquilla" stackId="a" fill="#3B82F6" />
                  <Bar dataKey="gasto_bar" stackId="a" fill="#F59E0B" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* Tabla detallada con todos los KPIs */}
        <div className="bg-gray-800 border border-gray-700 rounded-2xl p-6 shadow-lg">
          <h3 className="text-lg font-semibold text-gray-100 mb-4">
            Detalle por segmento
          </h3>
          {filas.length === 0 ? (
            <p className="text-sm text-gray-500 italic text-center py-8">
              No hay datos para los filtros aplicados.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-[11px] uppercase tracking-wider text-gray-400 border-b border-gray-700">
                    <th className="text-left py-2 pr-3 font-medium">Segmento</th>
                    <th className="text-right py-2 px-3 font-medium">Socios</th>
                    <th className="text-right py-2 px-3 font-medium">Entradas</th>
                    <th className="text-right py-2 px-3 font-medium">Ticket medio</th>
                    <th className="text-right py-2 px-3 font-medium">Bar por entrada</th>
                    <th className="text-right py-2 px-3 font-medium">Gasto total</th>
                    <th className="text-right py-2 pl-3 font-medium">Gasto / socio</th>
                  </tr>
                </thead>
                <tbody>
                  {filas.map((r) => (
                    <tr key={r.segmento} className="border-b border-gray-700/50 last:border-0">
                      <td className="py-2 pr-3 text-gray-100">{r.segmento}</td>
                      <td className="py-2 px-3 text-right text-gray-300">
                        {fmtNum.format(r.num_socios)}
                      </td>
                      <td className="py-2 px-3 text-right text-gray-300">
                        {fmtNum.format(r.entradas)}
                      </td>
                      <td className="py-2 px-3 text-right text-cyan-300 font-medium">
                        {fmtEUR2.format(r.ticket_medio)}
                      </td>
                      <td className="py-2 px-3 text-right text-amber-300">
                        {fmtEUR2.format(r.bar_por_entrada)}
                      </td>
                      <td className="py-2 px-3 text-right text-blue-300">
                        {fmtEUR.format(r.gasto_total)}
                      </td>
                      <td className="py-2 pl-3 text-right text-violet-300 font-medium">
                        {fmtEUR2.format(r.gasto_por_socio)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default SegmentacionSocios;
