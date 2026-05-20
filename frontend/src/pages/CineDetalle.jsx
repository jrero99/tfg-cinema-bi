import { useEffect, useMemo, useState } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import {
  ArrowLeft,
  Loader2,
  AlertTriangle,
  Building2,
  Euro,
  Users,
  LayoutGrid,
  Crown,
} from 'lucide-react';

import { fetchDetalleCine } from '../services/api.js';

const fmtEUR = new Intl.NumberFormat('es-ES', {
  style: 'currency',
  currency: 'EUR',
  maximumFractionDigits: 0,
});
const fmtNum = new Intl.NumberFormat('es-ES');

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

function MiniKpi({ icon: Icon, label, value, hint, color = 'text-cyan-300' }) {
  return (
    <div className="bg-gray-900/60 border border-gray-700 rounded-xl p-4">
      <div className="flex items-center justify-between">
        <p className="text-[11px] uppercase tracking-wider text-gray-400 font-medium">
          {label}
        </p>
        {Icon && <Icon size={14} className={color} />}
      </div>
      <p className={`mt-1 text-xl font-semibold ${color}`}>{value}</p>
      {hint && <p className="text-[11px] text-gray-500 mt-1">{hint}</p>}
    </div>
  );
}

function CineDetalle() {
  const { nombre } = useParams();
  const navigate = useNavigate();
  const nombreDecoded = decodeURIComponent(nombre ?? '');

  const [info, setInfo] = useState(null);
  const [taquilla, setTaquilla] = useState([]);
  const [retail, setRetail] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelado = false;
    (async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await fetchDetalleCine(nombreDecoded);
        if (cancelado) return;
        setInfo(data.info);
        setTaquilla(data.taquilla ?? []);
        setRetail(data.retail ?? []);
      } catch (err) {
        if (!cancelado) setError(err.message);
      } finally {
        if (!cancelado) setLoading(false);
      }
    })();
    return () => {
      cancelado = true;
    };
  }, [nombreDecoded]);

  // Top 10 películas en este cine.
  const topPeliculas = useMemo(() => {
    const mapa = new Map();
    for (const r of taquilla) {
      const titulo = cadena(r, ['titulo', 'titulo_pelicula', 'pelicula']);
      const acc = mapa.get(titulo) ?? { titulo, ingresos: 0, entradas: 0 };
      acc.ingresos += numero(r, ['ingresos_taquilla', 'ingreso_total', 'ingresos']);
      acc.entradas += numero(r, ['total_entradas', 'numero_entradas', 'entradas']);
      mapa.set(titulo, acc);
    }
    return Array.from(mapa.values())
      .sort((a, b) => b.ingresos - a.ingresos)
      .slice(0, 10);
  }, [taquilla]);

  // Ingresos del bar por categoría.
  const retailPorCategoria = useMemo(() => {
    const mapa = new Map();
    for (const r of retail) {
      const cat = cadena(r, ['categoria', 'categoria_producto']);
      const acc = mapa.get(cat) ?? { categoria: cat, ingresos_bar: 0 };
      acc.ingresos_bar += numero(r, ['ingresos_bar', 'ingreso_total', 'ingresos']);
      mapa.set(cat, acc);
    }
    return Array.from(mapa.values()).sort((a, b) => b.ingresos_bar - a.ingresos_bar);
  }, [retail]);

  // KPIs agregados del cine.
  const totales = useMemo(() => {
    const ingresosTaq = taquilla.reduce(
      (acc, r) => acc + numero(r, ['ingresos_taquilla', 'ingreso_total', 'ingresos']),
      0,
    );
    const entradas = taquilla.reduce(
      (acc, r) => acc + numero(r, ['total_entradas', 'numero_entradas', 'entradas']),
      0,
    );
    const ingresosBar = retail.reduce(
      (acc, r) => acc + numero(r, ['ingresos_bar', 'ingreso_total', 'ingresos']),
      0,
    );
    return { ingresosTaq, entradas, ingresosBar, ingresosTotal: ingresosTaq + ingresosBar };
  }, [taquilla, retail]);

  const peliLider = topPeliculas[0];

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto p-6 flex items-center text-sm text-gray-400">
        <Loader2 size={16} className="animate-spin mr-2" />
        Cargando ficha del cine “{nombreDecoded}”…
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-7xl mx-auto p-6">
        <div className="bg-gray-800 border border-gray-700 rounded-2xl p-6 flex items-center gap-3 text-red-300">
          <AlertTriangle size={20} />
          <span>{error}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
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

      {/* Cabecera */}
      <div className="bg-gray-800 border border-gray-700 rounded-2xl p-6 shadow-lg">
        <div className="flex items-start gap-3">
          <div className="p-3 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-300">
            <Building2 size={22} />
          </div>
          <div className="flex-1">
            <p className="text-xs text-cyan-400 uppercase tracking-wider">Ficha de cine</p>
            <h1 className="mt-1 text-2xl md:text-3xl font-bold text-gray-50">
              {nombreDecoded}
            </h1>
            {info?.ciudad && (
              <p className="text-sm text-gray-400 mt-1">{info.ciudad}</p>
            )}
          </div>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MiniKpi
          icon={Euro}
          label="Ingresos totales"
          value={fmtEUR.format(totales.ingresosTotal)}
          hint={`Taquilla ${fmtEUR.format(totales.ingresosTaq)} · Bar ${fmtEUR.format(totales.ingresosBar)}`}
          color="text-emerald-400"
        />
        <MiniKpi
          icon={Users}
          label="Entradas vendidas"
          value={fmtNum.format(totales.entradas)}
          color="text-cyan-300"
        />
        <MiniKpi
          icon={LayoutGrid}
          label="Capacidad instalada"
          value={info ? `${fmtNum.format(info.num_salas)} salas` : '—'}
          hint={
            info
              ? `${fmtNum.format(info.capacidad_total)} butacas · ${fmtNum.format(info.butacas_vip ?? 0)} VIP`
              : ''
          }
          color="text-violet-300"
        />
        <MiniKpi
          icon={Crown}
          label="Película líder"
          value={peliLider?.titulo ?? '—'}
          hint={peliLider ? fmtEUR.format(peliLider.ingresos) : ''}
          color="text-amber-300"
        />
      </div>

      {/* Top películas en este cine */}
      <div className="bg-gray-800 border border-gray-700 rounded-2xl p-6 shadow-lg">
        <h3 className="text-lg font-semibold text-gray-100 mb-1">
          Top 10 películas en este cine
        </h3>
        <p className="text-xs text-gray-400 mb-4">
          Clic en una barra para abrir la ficha de la película.
        </p>
        <div className="h-96">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              layout="vertical"
              data={topPeliculas}
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
                dataKey="titulo"
                stroke="#9CA3AF"
                tick={{ fontSize: 11, fill: '#D1D5DB' }}
                width={160}
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
                  return [fmtNum.format(value), 'Entradas'];
                }}
              />
              <Bar
                dataKey="ingresos"
                fill="#3B82F6"
                radius={[0, 6, 6, 0]}
                cursor="pointer"
                onClick={(data) => {
                  if (data?.titulo) navigate(`/peliculas/${encodeURIComponent(data.titulo)}`);
                }}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Retail */}
      <div className="bg-gray-800 border border-gray-700 rounded-2xl p-6 shadow-lg">
        <h3 className="text-lg font-semibold text-gray-100 mb-4">
          Bar · ingresos por categoría
        </h3>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={retailPorCategoria}
              margin={{ top: 10, right: 24, left: 8, bottom: 40 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis
                dataKey="categoria"
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
                formatter={(value) => [fmtEUR.format(value), 'Ingresos']}
              />
              <Bar dataKey="ingresos_bar" fill="#F59E0B" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

export default CineDetalle;
