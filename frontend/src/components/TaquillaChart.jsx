import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

// Formateador EUR (sin decimales) para los ejes y tooltip
const fmtEUR = new Intl.NumberFormat('es-ES', {
  style: 'currency',
  currency: 'EUR',
  maximumFractionDigits: 0,
});

/**
 * TaquillaChart
 * --------------
 * Gráfico de barras verticales con el TOP 5 de películas por ingresos de taquilla.
 *
 * Props:
 *  - data: Array<{ titulo: string, ingresos_taquilla: number, ... }>
 */
function TaquillaChart({ data = [] }) {
  // Top 5 películas por ingresos
  const top5 = [...data]
    .sort((a, b) => (b.ingresos_taquilla ?? 0) - (a.ingresos_taquilla ?? 0))
    .slice(0, 5);

  return (
    <div className="bg-gray-800 border border-gray-700 rounded-2xl p-6 shadow-lg">
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-gray-100">
          Top 5 Películas por Ingresos
        </h3>
        <p className="text-xs text-gray-400 mt-1">
          Recaudación de taquilla acumulada por título.
        </p>
      </div>

      <div className="h-80">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={top5}
            margin={{ top: 10, right: 16, left: 8, bottom: 60 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
            <XAxis
              dataKey="titulo"
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
              cursor={{ fill: 'rgba(59,130,246,0.08)' }}
              contentStyle={{
                background: '#111827',
                border: '1px solid #374151',
                borderRadius: 12,
                color: '#F3F4F6',
              }}
              formatter={(value) => [fmtEUR.format(value), 'Ingresos']}
            />
            <Bar dataKey="ingresos_taquilla" fill="#3B82F6" radius={[6, 6, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

export default TaquillaChart;
