import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

const fmtEUR = new Intl.NumberFormat('es-ES', {
  style: 'currency',
  currency: 'EUR',
  maximumFractionDigits: 2,
});

// Orden lógico de los niveles de fidelidad
const ORDEN_NIVELES = ['Estándar', 'Bronce', 'Plata', 'Oro'];

/**
 * SociosChart
 * ------------
 * Gráfico de barras horizontales con el gasto medio por nivel de fidelidad.
 *
 * Props:
 *  - data: Array<{ nivel_fidelidad: string, gasto_medio: number, ... }>
 */
function SociosChart({ data = [] }) {
  // Ordenar siguiendo la jerarquía del programa de fidelización
  const ordenada = [...data].sort((a, b) => {
    const ia = ORDEN_NIVELES.indexOf(a.nivel_fidelidad);
    const ib = ORDEN_NIVELES.indexOf(b.nivel_fidelidad);
    return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib);
  });

  return (
    <div className="bg-gray-800 border border-gray-700 rounded-2xl p-6 shadow-lg">
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-gray-100">
          Gasto Medio por Nivel de Fidelidad
        </h3>
        <p className="text-xs text-gray-400 mt-1">
          Ticket medio según el segmento de socios.
        </p>
      </div>

      <div className="h-80">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            layout="vertical"
            data={ordenada}
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
              dataKey="nivel_fidelidad"
              stroke="#9CA3AF"
              tick={{ fontSize: 12, fill: '#D1D5DB' }}
              width={80}
            />
            <Tooltip
              cursor={{ fill: 'rgba(139,92,246,0.08)' }}
              contentStyle={{
                background: '#111827',
                border: '1px solid #374151',
                borderRadius: 12,
                color: '#F3F4F6',
              }}
              formatter={(value) => [fmtEUR.format(value), 'Gasto medio']}
            />
            <Bar dataKey="gasto_medio" fill="#8B5CF6" radius={[0, 6, 6, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

export default SociosChart;
