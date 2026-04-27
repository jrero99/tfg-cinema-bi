import { useEffect, useMemo, useState } from 'react';
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
  Ticket,
  Users,
  Euro,
  Percent,
  Loader2,
  AlertTriangle,
} from 'lucide-react';

import KpiCard from '../components/KpiCard.jsx';
import { fetchTaquilla } from '../services/api.js';

// Formateadores reutilizables (i18n español, moneda EUR).
const fmtMoney = new Intl.NumberFormat('es-ES', {
  style: 'currency',
  currency: 'EUR',
  maximumFractionDigits: 0,
});
const fmtNum = new Intl.NumberFormat('es-ES');
const fmtPct = (n) => `${(n ?? 0).toFixed(1)}%`;

/**
 * Devuelve el primer valor numérico no nulo entre las claves indicadas.
 * Permite que el Dashboard sea tolerante a pequeñas variaciones de schema
 * en la vista `vw_kpi_taquilla`.
 */
function pickNumber(row, keys) {
  for (const k of keys) {
    const v = row?.[k];
    if (typeof v === 'number' && !Number.isNaN(v)) return v;
    if (typeof v === 'string' && v !== '' && !Number.isNaN(Number(v))) {
      return Number(v);
    }
  }
  return 0;
}

function pickString(row, keys) {
  for (const k of keys) {
    if (row?.[k]) return String(row[k]);
  }
  return null;
}

function Dashboard() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Carga inicial: una sola petición a /api/taquilla al montar el componente.
  useEffect(() => {
    let cancelado = false;

    (async () => {
      try {
        setLoading(true);
        setError(null);
        const rows = await fetchTaquilla();
        if (!cancelado) setData(rows);
      } catch (err) {
        if (!cancelado) setError(err.message);
      } finally {
        if (!cancelado) setLoading(false);
      }
    })();

    return () => {
      cancelado = true;
    };
  }, []);

  // KPIs agregados a partir del array recibido.
  const kpis = useMemo(() => {
    if (!data.length) {
      return { ingresos: 0, espectadores: 0, peliculas: 0, ocupacion: 0 };
    }

    const ingresos = data.reduce(
      (acc, r) => acc + pickNumber(r, ['ingreso_total', 'ingresos', 'total_ingresos']),
      0,
    );
    const espectadores = data.reduce(
      (acc, r) =>
        acc + pickNumber(r, ['total_entradas', 'numero_entradas', 'entradas', 'cantidad_entradas']),
      0,
    );
    const titulos = new Set(
      data.map((r) => pickString(r, ['titulo', 'titulo_pelicula', 'pelicula'])).filter(Boolean),
    );
    const ocupaciones = data
      .map((r) => pickNumber(r, ['porcentaje_ocupacion', 'ocupacion_pct', 'ocupacion']))
      .filter((n) => n > 0);
    const ocupacion =
      ocupaciones.length > 0
        ? ocupaciones.reduce((a, b) => a + b, 0) / ocupaciones.length
        : 0;

    return {
      ingresos,
      espectadores,
      peliculas: titulos.size,
      ocupacion,
    };
  }, [data]);

  // Top 10 películas por ingresos para el gráfico de barras.
  const ingresosPorPelicula = useMemo(() => {
    const mapa = new Map();
    for (const r of data) {
      const titulo = pickString(r, ['titulo', 'titulo_pelicula', 'pelicula']);
      if (!titulo) continue;
      const ingreso = pickNumber(r, ['ingreso_total', 'ingresos', 'total_ingresos']);
      mapa.set(titulo, (mapa.get(titulo) ?? 0) + ingreso);
    }
    return Array.from(mapa.entries())
      .map(([titulo, ingresos]) => ({ titulo, ingresos: Math.round(ingresos) }))
      .sort((a, b) => b.ingresos - a.ingresos)
      .slice(0, 10);
  }, [data]);

  // ----- Renderizado condicional -----
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-gray-300">
        <Loader2 className="animate-spin mr-3" />
        <span>Cargando datos de taquilla…</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center px-6">
        <div className="card p-8 max-w-lg text-center">
          <AlertTriangle className="mx-auto text-bi-danger mb-3" size={36} />
          <h2 className="text-lg font-semibold text-gray-100">
            No se han podido cargar los datos
          </h2>
          <p className="mt-2 text-sm text-gray-400">{error}</p>
          <p className="mt-4 text-xs text-gray-500">
            Comprueba que el backend esté arrancado y que <code>VITE_API_URL</code> apunte a la URL correcta.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen px-6 py-8 max-w-7xl mx-auto">
      {/* Cabecera */}
      <header className="mb-8">
        <p className="text-sm text-bi-accent2 uppercase tracking-wider font-medium">
          Cinema BI
        </p>
        <h1 className="mt-1 text-3xl font-bold text-gray-50">
          Cuadro de mando · Taquilla
        </h1>
        <p className="mt-2 text-sm text-gray-400">
          Visión consolidada de ingresos, ocupación y rendimiento por película.
        </p>
      </header>

      {/* Grid de KPIs */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <KpiCard
          title="Ingresos Totales"
          value={fmtMoney.format(kpis.ingresos)}
          subtitle="Acumulado del periodo"
          icon={Euro}
          accent="text-bi-success"
        />
        <KpiCard
          title="Espectadores"
          value={fmtNum.format(kpis.espectadores)}
          subtitle="Entradas vendidas"
          icon={Users}
          accent="text-bi-accent2"
        />
        <KpiCard
          title="Películas Activas"
          value={fmtNum.format(kpis.peliculas)}
          subtitle="Títulos en cartelera"
          icon={Ticket}
          accent="text-bi-accent"
        />
        <KpiCard
          title="Ocupación Media"
          value={fmtPct(kpis.ocupacion)}
          subtitle="Promedio de aforo"
          icon={Percent}
          accent="text-bi-warning"
        />
      </section>

      {/* Gráfico de barras: Top 10 películas por ingresos */}
      <section className="card p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-lg font-semibold text-gray-100">
              Top 10 películas por ingresos
            </h2>
            <p className="text-xs text-gray-500 mt-1">
              Ingreso total acumulado de cada título.
            </p>
          </div>
        </div>

        <div className="h-96">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={ingresosPorPelicula}
              margin={{ top: 10, right: 16, left: 16, bottom: 80 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#1F2937" />
              <XAxis
                dataKey="titulo"
                stroke="#9CA3AF"
                tick={{ fontSize: 11 }}
                interval={0}
                angle={-30}
                textAnchor="end"
              />
              <YAxis
                stroke="#9CA3AF"
                tick={{ fontSize: 11 }}
                tickFormatter={(v) => fmtMoney.format(v)}
              />
              <Tooltip
                cursor={{ fill: 'rgba(99,102,241,0.08)' }}
                contentStyle={{
                  background: '#0B1120',
                  border: '1px solid #1F2937',
                  borderRadius: 12,
                  color: '#F3F4F6',
                }}
                formatter={(value) => [fmtMoney.format(value), 'Ingresos']}
              />
              <Bar
                dataKey="ingresos"
                fill="#6366F1"
                radius={[6, 6, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>

      {/* Pie de página */}
      <footer className="mt-8 text-center text-xs text-gray-600">
        TFG · Plataforma BI para cines · Datos en tiempo real desde BigQuery.
      </footer>
    </div>
  );
}

export default Dashboard;
