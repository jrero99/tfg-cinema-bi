import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';

// La métrica se interpreta como "veces que se llena el aforo por franja
// horaria" (rotación), no como porcentaje literal de butacas vendidas.
const fmtRot = (v) => `${(v ?? 0).toFixed(1)}×`;
const fmtNum = new Intl.NumberFormat('es-ES');

/**
 * OcupacionChart
 * --------------
 * Rotación media de aforo. Se calcula como media de
 * (entradas vendidas / capacidad) agrupando por (sala, franja). Valores
 * por encima de 1× indican que el aforo se renovó varias veces en la franja.
 *
 * Props:
 *  - data:  Array de filas con `ocupacion_media`, `num_funciones`,
 *           `nombre_cine` y opcionalmente `nombre_sala`.
 *  - modo:  'cine' (default) o 'sala'. Determina la dimensión del eje X.
 */
function OcupacionChart({ data = [], modo = 'cine' }) {
  const porSala = modo === 'sala';
  const claveDim = porSala ? 'nombre_sala' : 'nombre_cine';

  const ordenada = [...data].sort((a, b) => (b.ocupacion_media ?? 0) - (a.ocupacion_media ?? 0));
  const mediaGlobal =
    ordenada.length > 0
      ? ordenada.reduce((a, c) => a + (c.ocupacion_media ?? 0), 0) / ordenada.length
      : 0;
  const maxValor = ordenada.reduce((m, c) => Math.max(m, c.ocupacion_media ?? 0), 0);

  const titulo = porSala
    ? 'Rotación media de aforo por sala'
    : 'Rotación media de aforo por cine';

  return (
    <div className="bg-gray-800 border border-gray-700 rounded-2xl p-6 shadow-lg">
      <div className="mb-4 flex flex-col md:flex-row md:items-end md:justify-between gap-2">
        <div>
          <h3 className="text-lg font-semibold text-gray-100">
            {titulo}
          </h3>
          <p className="text-xs text-gray-400 mt-1">
            Veces que se llena el aforo de cada sala durante una franja horaria
            (entradas vendidas / capacidad). Un valor de 2× significa que el
            aforo se rotó dos veces en esa franja.
          </p>
        </div>
        <p className="text-xs text-gray-400">
          Media {porSala ? 'del cine' : 'de la red'}:{' '}
          <span className="text-cyan-300 font-medium">{fmtRot(mediaGlobal)}</span>
        </p>
      </div>

      <div className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={ordenada}
            margin={{ top: 10, right: 24, left: 8, bottom: 30 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
            <XAxis
              dataKey={claveDim}
              stroke="#9CA3AF"
              tick={{ fontSize: 11, fill: '#D1D5DB' }}
              interval={0}
              angle={-15}
              textAnchor="end"
            />
            <YAxis
              stroke="#9CA3AF"
              tick={{ fontSize: 11, fill: '#D1D5DB' }}
              tickFormatter={fmtRot}
              domain={[0, Math.max(1, Math.ceil(maxValor))]}
            />
            <Tooltip
              cursor={{ fill: 'rgba(16,185,129,0.08)' }}
              contentStyle={{
                background: '#111827',
                border: '1px solid #374151',
                borderRadius: 12,
                color: '#F3F4F6',
              }}
              formatter={(value, name, props) => {
                const row = props?.payload;
                return [
                  fmtRot(value),
                  `Rotación · ${fmtNum.format(row?.num_funciones ?? 0)} franjas`,
                ];
              }}
            />
            <ReferenceLine
              y={mediaGlobal}
              stroke="#22D3EE"
              strokeDasharray="4 4"
              label={{
                value: porSala ? 'Media cine' : 'Media red',
                fill: '#22D3EE',
                fontSize: 10,
                position: 'insideTopRight',
              }}
            />
            <Bar dataKey="ocupacion_media" fill="#10B981" radius={[6, 6, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

export default OcupacionChart;
