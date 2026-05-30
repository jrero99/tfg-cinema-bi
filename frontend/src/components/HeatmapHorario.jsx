import { useMemo } from 'react';

const fmtEUR = new Intl.NumberFormat('es-ES', {
  style: 'currency',
  currency: 'EUR',
  maximumFractionDigits: 0,
});
const fmtNum = new Intl.NumberFormat('es-ES');

// Orden canónico de los días de la semana.
const ORDEN_DIAS = [
  'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo',
];

// Orden canónico de las franjas. Se compara por prefijo de modo que admita
// las variantes que genera el ETL (p.ej. "Tarde (16-19)").
const ORDEN_FRANJAS = ['Madrugada', 'Mañana', 'Tarde', 'Noche'];

// Normalización tolerante para casar etiquetas con variaciones de mayúsculas/tildes.
const normaliza = (s) =>
  (s ?? '')
    .toString()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .trim()
    .toLowerCase();

const indiceDia = (s) => {
  const n = normaliza(s);
  return ORDEN_DIAS.findIndex((d) => normaliza(d) === n);
};

const indiceFranja = (s) => {
  const n = normaliza(s);
  return ORDEN_FRANJAS.findIndex((f) => n.startsWith(normaliza(f)));
};

/**
 * HeatmapHorario
 * ---------------
 * Tabla calor con la actividad por día de la semana × franja horaria.
 * El color se interpola linealmente sobre los ingresos del periodo.
 *
 * Props:
 *  - data: Array<{ dia_semana, franja_horaria, ingresos, entradas, num_tickets }>
 *  - metrica: 'ingresos' | 'entradas' (campo a colorear; por defecto ingresos)
 */
function HeatmapHorario({ data = [], metrica = 'ingresos' }) {
  // Mapa { "dia|franja" -> row } para acceso O(1).
  // Usamos las cadenas tal cual vienen del backend para preservar las
  // etiquetas exactas (p.ej. "Mañana (10-14)") al pintarlas.
  const mapa = useMemo(() => {
    const m = new Map();
    for (const r of data) {
      const clave = `${normaliza(r.dia_semana)}|${normaliza(r.franja_horaria)}`;
      m.set(clave, r);
    }
    return m;
  }, [data]);

  // Días y franjas realmente presentes en los datos, ordenados canónicamente.
  const dias = useMemo(() => {
    const vistos = new Map();
    for (const r of data) {
      const k = normaliza(r.dia_semana);
      if (k && !vistos.has(k)) vistos.set(k, r.dia_semana);
    }
    const lista = Array.from(vistos.values());
    lista.sort((a, b) => {
      const ia = indiceDia(a);
      const ib = indiceDia(b);
      return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib);
    });
    return lista;
  }, [data]);

  const franjas = useMemo(() => {
    const vistos = new Map();
    for (const r of data) {
      const k = normaliza(r.franja_horaria);
      if (k && !vistos.has(k)) vistos.set(k, r.franja_horaria);
    }
    const lista = Array.from(vistos.values());
    lista.sort((a, b) => {
      const ia = indiceFranja(a);
      const ib = indiceFranja(b);
      return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib);
    });
    return lista;
  }, [data]);

  // Eje de color: máximo de la métrica seleccionada (mínimo 1 para evitar /0).
  const maxValor = useMemo(() => {
    let max = 0;
    for (const r of data) {
      const v = Number(r[metrica]) || 0;
      if (v > max) max = v;
    }
    return max || 1;
  }, [data, metrica]);

  const colorCelda = (valor) => {
    const intensidad = Math.min(1, valor / maxValor);
    // Verde cinema-BI · variable de opacidad para crear el degradado.
    return `rgba(16, 185, 129, ${0.10 + intensidad * 0.75})`;
  };

  const fmt = metrica === 'ingresos' ? fmtEUR.format : fmtNum.format;

  return (
    <div className="bg-gray-800 border border-gray-700 rounded-2xl p-4 sm:p-6 shadow-lg">
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-gray-100">
          Actividad por día y franja horaria
        </h3>
        <p className="text-xs text-gray-400 mt-1">
          Mapa de calor de {metrica === 'ingresos' ? 'ingresos' : 'entradas vendidas'}.
          Tonos más oscuros = mayor volumen.
        </p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full border-separate border-spacing-1 text-sm">
          <thead>
            <tr>
              <th className="text-left text-[11px] uppercase tracking-wider text-gray-500 font-medium px-2">
                {/* esquina vacía */}
              </th>
              {franjas.map((f) => (
                <th
                  key={f}
                  className="text-[11px] uppercase tracking-wider text-gray-400 font-medium text-center px-2 py-1"
                >
                  {f}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {dias.map((dia) => (
              <tr key={dia}>
                <th className="text-[11px] uppercase tracking-wider text-gray-400 font-medium text-right pr-2 whitespace-nowrap">
                  {dia}
                </th>
                {franjas.map((franja) => {
                  const row = mapa.get(`${normaliza(dia)}|${normaliza(franja)}`);
                  const valor = Number(row?.[metrica]) || 0;
                  return (
                    <td
                      key={franja}
                      className="rounded-lg border border-gray-700/60 px-2 py-3 text-center text-gray-100"
                      style={{ backgroundColor: colorCelda(valor) }}
                      title={
                        row
                          ? `Ingresos: ${fmtEUR.format(Number(row.ingresos) || 0)}\nEntradas: ${fmtNum.format(Number(row.entradas) || 0)}`
                          : 'Sin datos'
                      }
                    >
                      <span className="text-xs font-medium">
                        {valor > 0 ? fmt(valor) : '—'}
                      </span>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="text-[11px] text-gray-500 italic mt-3">
        Pasa el cursor sobre una celda para ver ingresos y entradas exactos.
      </p>
    </div>
  );
}

export default HeatmapHorario;
