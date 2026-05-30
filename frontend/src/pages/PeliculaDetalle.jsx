import { useEffect, useMemo, useState } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
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
import {
  ArrowLeft,
  Loader2,
  AlertTriangle,
  Film,
  Euro,
  Users,
  Ticket,
  Clock,
} from 'lucide-react';

import { fetchDetallePelicula } from '../services/api.js';

const fmtEUR = new Intl.NumberFormat('es-ES', {
  style: 'currency',
  currency: 'EUR',
  maximumFractionDigits: 0,
});
const fmtNum = new Intl.NumberFormat('es-ES');

const NOMBRE_MES = [
  'ene', 'feb', 'mar', 'abr', 'may', 'jun',
  'jul', 'ago', 'sep', 'oct', 'nov', 'dic',
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

const cadena = (row, keys, fallback = 'Sin dato') => {
  for (const k of keys) {
    if (row?.[k]) return String(row[k]);
  }
  return fallback;
};

function MiniKpi({ icon: Icon, label, value, color = 'text-cyan-300' }) {
  return (
    <div className="bg-gray-900/60 border border-gray-700 rounded-xl p-4">
      <div className="flex items-center justify-between">
        <p className="text-[11px] uppercase tracking-wider text-gray-400 font-medium">
          {label}
        </p>
        {Icon && <Icon size={14} className={color} />}
      </div>
      <p className={`mt-1 text-xl font-semibold ${color}`}>{value}</p>
    </div>
  );
}

function PeliculaDetalle() {
  const { titulo } = useParams();
  const navigate = useNavigate();
  const tituloDecoded = decodeURIComponent(titulo ?? '');

  const [info, setInfo] = useState(null);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelado = false;
    (async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await fetchDetallePelicula(tituloDecoded);
        if (cancelado) return;
        setInfo(data.info);
        setRows(data.taquilla ?? []);
      } catch (err) {
        if (!cancelado) setError(err.message);
      } finally {
        if (!cancelado) setLoading(false);
      }
    })();
    return () => {
      cancelado = true;
    };
  }, [tituloDecoded]);

  const normalizadas = useMemo(
    () =>
      rows.map((r) => ({
        cine: cadena(r, ['nombre_cine', 'cine']),
        anio: numero(r, ['anio']),
        mes: numero(r, ['mes']),
        ingresos: numero(r, ['ingresos_taquilla', 'ingreso_total', 'ingresos']),
        entradas: numero(r, ['total_entradas', 'numero_entradas', 'entradas']),
      })),
    [rows],
  );

  const totales = useMemo(() => {
    return normalizadas.reduce(
      (acc, r) => {
        acc.ingresos += r.ingresos;
        acc.entradas += r.entradas;
        return acc;
      },
      { ingresos: 0, entradas: 0 },
    );
  }, [normalizadas]);

  const ticketMedio = totales.entradas > 0 ? totales.ingresos / totales.entradas : 0;

  const porCine = useMemo(() => {
    const mapa = new Map();
    for (const r of normalizadas) {
      const acc = mapa.get(r.cine) ?? { cine: r.cine, ingresos: 0, entradas: 0 };
      acc.ingresos += r.ingresos;
      acc.entradas += r.entradas;
      mapa.set(r.cine, acc);
    }
    return Array.from(mapa.values()).sort((a, b) => b.ingresos - a.ingresos);
  }, [normalizadas]);

  const evolucion = useMemo(() => {
    const mapa = new Map();
    for (const r of normalizadas) {
      if (!r.anio || !r.mes) continue;
      const clave = `${r.anio}-${String(r.mes).padStart(2, '0')}`;
      const acc = mapa.get(clave) ?? {
        periodo: clave,
        etiqueta: `${NOMBRE_MES[r.mes - 1]} ${String(r.anio).slice(2)}`,
        _orden: r.anio * 100 + r.mes,
        ingresos: 0,
        entradas: 0,
      };
      acc.ingresos += r.ingresos;
      acc.entradas += r.entradas;
      mapa.set(clave, acc);
    }
    return Array.from(mapa.values()).sort((a, b) => a._orden - b._orden);
  }, [normalizadas]);

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 flex items-center text-sm text-gray-400">
        <Loader2 size={16} className="animate-spin mr-2" />
        Cargando ficha de “{tituloDecoded}”…
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        <div className="bg-gray-800 border border-gray-700 rounded-2xl p-6 flex items-center gap-3 text-red-300">
          <AlertTriangle size={20} />
          <span>{error}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-sm text-gray-400 hover:text-gray-100"
        >
          <ArrowLeft size={16} />
          <span>Volver</span>
        </button>
        <Link to="/" className="text-xs text-cyan-400 hover:text-cyan-200">
          Ir al resumen
        </Link>
      </div>

      {/* Cabecera con metadatos */}
      <div className="bg-gray-800 border border-gray-700 rounded-2xl p-6 shadow-lg">
        <div className="flex items-start gap-3">
          <div className="p-3 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-300">
            <Film size={22} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs text-cyan-400 uppercase tracking-wider">Ficha de película</p>
            <h1 className="mt-1 text-2xl md:text-3xl font-bold text-gray-50 truncate">
              {info?.titulo ?? tituloDecoded}
            </h1>
            {info && (
              <div className="mt-3 flex flex-wrap gap-2 text-xs">
                {info.genero && (
                  <span className="bg-gray-900 border border-gray-700 rounded-full px-3 py-1 text-gray-300">
                    {info.genero}
                  </span>
                )}
                {info.clasificacion_edad && (
                  <span className="bg-gray-900 border border-gray-700 rounded-full px-3 py-1 text-gray-300">
                    {info.clasificacion_edad}
                  </span>
                )}
                {info.distribuidora && (
                  <span className="bg-gray-900 border border-gray-700 rounded-full px-3 py-1 text-gray-300">
                    {info.distribuidora}
                  </span>
                )}
                {info.idioma_formato && (
                  <span className="bg-gray-900 border border-gray-700 rounded-full px-3 py-1 text-gray-300">
                    {info.idioma_formato}
                  </span>
                )}
                {info.duracion_minutos != null && (
                  <span className="bg-gray-900 border border-gray-700 rounded-full px-3 py-1 text-gray-300 flex items-center gap-1">
                    <Clock size={12} /> {info.duracion_minutos} min
                  </span>
                )}
                {info.es_reestreno && (
                  <span className="bg-amber-500/10 border border-amber-500/40 rounded-full px-3 py-1 text-amber-300">
                    Reestreno
                  </span>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <MiniKpi
          icon={Euro}
          label="Ingresos acumulados"
          value={fmtEUR.format(totales.ingresos)}
          color="text-emerald-400"
        />
        <MiniKpi
          icon={Users}
          label="Entradas vendidas"
          value={fmtNum.format(totales.entradas)}
          color="text-cyan-300"
        />
        <MiniKpi
          icon={Ticket}
          label="Ticket medio"
          value={fmtEUR.format(ticketMedio)}
          color="text-violet-300"
        />
      </div>

      {/* Ranking de cines */}
      <div className="bg-gray-800 border border-gray-700 rounded-2xl p-6 shadow-lg">
        <h3 className="text-lg font-semibold text-gray-100 mb-1">
          Recaudación por cine
        </h3>
        <p className="text-xs text-gray-400 mb-4">
          Ordenado de mayor a menor — clic en una barra para abrir la ficha del cine.
        </p>
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              layout="vertical"
              data={porCine}
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
              <Bar
                dataKey="ingresos"
                fill="#3B82F6"
                radius={[0, 6, 6, 0]}
                cursor="pointer"
                onClick={(data) => {
                  if (data?.cine) navigate(`/cines/${encodeURIComponent(data.cine)}`);
                }}
              />
              <Bar dataKey="entradas" fill="#10B981" radius={[0, 6, 6, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Evolución mensual */}
      <div className="bg-gray-800 border border-gray-700 rounded-2xl p-6 shadow-lg">
        <h3 className="text-lg font-semibold text-gray-100 mb-4">
          Evolución mensual
        </h3>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={evolucion}
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
              <Line
                type="monotone"
                dataKey="ingresos"
                stroke="#3B82F6"
                strokeWidth={2}
                dot={{ r: 3 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

export default PeliculaDetalle;
