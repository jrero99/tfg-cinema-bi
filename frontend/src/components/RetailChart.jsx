import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

const fmtEUR = new Intl.NumberFormat('es-ES', {
  style: 'currency',
  currency: 'EUR',
  maximumFractionDigits: 0,
});

// Paleta diferenciada para las categorías del bar
const COLORS = ['#22D3EE', '#6366F1', '#F59E0B', '#10B981', '#EC4899', '#8B5CF6'];

/**
 * RetailChart
 * ------------
 * Donut chart con el reparto de ingresos del bar agrupados por `categoria`.
 *
 * Props:
 *  - data: Array<{ categoria: string, ingresos_bar: number, ... }>
 */
function RetailChart({ data = [] }) {
  // Agrupar ingresos por categoría
  const mapa = new Map();
  for (const fila of data) {
    const cat = fila?.categoria ?? 'Sin categoría';
    const ingresos = Number(fila?.ingresos_bar ?? 0);
    mapa.set(cat, (mapa.get(cat) ?? 0) + ingresos);
  }
  const grouped = Array.from(mapa.entries())
    .map(([categoria, ingresos]) => ({ name: categoria, value: Math.round(ingresos) }))
    .sort((a, b) => b.value - a.value);

  return (
    <div className="bg-gray-800 border border-gray-700 rounded-2xl p-6 shadow-lg">
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-gray-100">
          Ingresos del Bar por Categoría
        </h3>
        <p className="text-xs text-gray-400 mt-1">
          Distribución del consumo en el área de retail.
        </p>
      </div>

      <div className="h-80">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={grouped}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="50%"
              innerRadius={70}
              outerRadius={110}
              paddingAngle={2}
              stroke="#111827"
              strokeWidth={2}
            >
              {grouped.map((entry, index) => (
                <Cell key={entry.name} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{
                background: '#111827',
                border: '1px solid #374151',
                borderRadius: 12,
                color: '#F3F4F6',
              }}
              itemStyle={{ color: '#F3F4F6' }}
              labelStyle={{ color: '#9CA3AF' }}
              formatter={(value, name) => [fmtEUR.format(value), name]}
            />
            <Legend
              verticalAlign="bottom"
              height={36}
              iconType="circle"
              wrapperStyle={{ color: '#D1D5DB', fontSize: 12 }}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

export default RetailChart;
