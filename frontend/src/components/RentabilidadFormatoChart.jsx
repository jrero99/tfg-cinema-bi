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
 * RentabilidadFormatoChart
 * -------------------------
 * Compara el rendimiento económico de los distintos formatos de proyección
 * (2D, 3D, IMAX, VIP…). Muestra dos gráficos:
 *  1. Barras de ingresos taquilla vs ingresos bar generados por sesiones
 *     en salas de cada formato.
 *  2. Tabla con ticket medio, gasto medio en bar por entrada y margen del
 *     bar atribuible a cada formato — los KPI unitarios que mejor sustentan
 *     una decisión de "rentabilidad" sin contar con coste de proyección.
 *
 * Props:
 *  - data: filas devueltas por /api/operaciones/rentabilidad-formato.
 */
function RentabilidadFormatoChart({ data = [] }) {
  const filas = data
    .filter((r) => r?.formato_proyeccion)
    .map((r) => ({
      formato: r.formato_proyeccion,
      ingresos_taquilla: numero(r, ['ingresos_taquilla']),
      ingresos_bar: numero(r, ['ingresos_bar']),
      margen_bar: numero(r, ['margen_bar']),
      entradas: numero(r, ['entradas']),
      ticket_medio: numero(r, ['ticket_medio']),
      bar_por_entrada: numero(r, ['bar_por_entrada']),
    }))
    .sort((a, b) => b.ingresos_taquilla - a.ingresos_taquilla);

  return (
    <div className="bg-gray-800 border border-gray-700 rounded-2xl p-6 shadow-lg space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-gray-100">
          Rentabilidad por formato de proyección
        </h3>
        <p className="text-xs text-gray-400 mt-1">
          Cruce de <code>Fact_Ventas_Entradas</code> y <code>Fact_Ventas_Bar</code>
          {' '}con el formato de la sala. Como el modelo no recoge coste de
          proyección, se utilizan ticket medio y margen del bar como proxy de
          rentabilidad unitaria.
        </p>
      </div>

      {filas.length === 0 ? (
        <p className="text-sm text-gray-500 italic text-center py-8">
          No hay datos para los filtros aplicados.
        </p>
      ) : (
        <>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={filas}
                margin={{ top: 10, right: 16, left: 8, bottom: 30 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis
                  dataKey="formato"
                  stroke="#9CA3AF"
                  tick={{ fontSize: 11, fill: '#D1D5DB' }}
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
                  formatter={(value, name) => {
                    const etiquetas = {
                      ingresos_taquilla: 'Taquilla',
                      ingresos_bar: 'Bar',
                      margen_bar: 'Margen bar',
                    };
                    return [fmtEUR.format(value), etiquetas[name] ?? name];
                  }}
                />
                <Legend
                  wrapperStyle={{ fontSize: 12, color: '#D1D5DB' }}
                  formatter={(v) =>
                    ({
                      ingresos_taquilla: 'Ingresos taquilla',
                      ingresos_bar: 'Ingresos bar',
                      margen_bar: 'Margen bar',
                    }[v] ?? v)
                  }
                />
                <Bar dataKey="ingresos_taquilla" fill="#3B82F6" radius={[6, 6, 0, 0]} />
                <Bar dataKey="ingresos_bar" fill="#F59E0B" radius={[6, 6, 0, 0]} />
                <Bar dataKey="margen_bar" fill="#10B981" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Tabla con KPIs unitarios */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-[11px] uppercase tracking-wider text-gray-400 border-b border-gray-700">
                  <th className="text-left py-2 pr-3 font-medium">Formato</th>
                  <th className="text-right py-2 px-3 font-medium">Entradas</th>
                  <th className="text-right py-2 px-3 font-medium">Ticket medio</th>
                  <th className="text-right py-2 px-3 font-medium">Bar por entrada</th>
                  <th className="text-right py-2 pl-3 font-medium">Margen bar</th>
                </tr>
              </thead>
              <tbody>
                {filas.map((f) => (
                  <tr key={f.formato} className="border-b border-gray-700/50 last:border-0">
                    <td className="py-2 pr-3 text-gray-100">{f.formato}</td>
                    <td className="py-2 px-3 text-right text-gray-300">
                      {fmtNum.format(f.entradas)}
                    </td>
                    <td className="py-2 px-3 text-right text-cyan-300 font-medium">
                      {fmtEUR2.format(f.ticket_medio)}
                    </td>
                    <td className="py-2 px-3 text-right text-amber-300">
                      {fmtEUR2.format(f.bar_por_entrada)}
                    </td>
                    <td className="py-2 pl-3 text-right text-emerald-300 font-medium">
                      {fmtEUR.format(f.margen_bar)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}

export default RentabilidadFormatoChart;
