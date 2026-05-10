import { useEffect, useState } from 'react';
import {
  Euro,
  Users,
  Ticket,
  Loader2,
  AlertTriangle,
  Building2,
  Calendar,
  RotateCcw,
} from 'lucide-react';

import TaquillaChart from '../components/TaquillaChart.jsx';
import RetailChart from '../components/RetailChart.jsx';
import SociosChart from '../components/SociosChart.jsx';
import {
  fetchTaquilla,
  fetchRetail,
  fetchSocios,
  fetchCines,
} from '../services/api.js';

// Formateadores reutilizables (i18n español, moneda EUR).
const fmtEUR = new Intl.NumberFormat('es-ES', {
  style: 'currency',
  currency: 'EUR',
  maximumFractionDigits: 0,
});
const fmtNum = new Intl.NumberFormat('es-ES');
const fmtFecha = new Intl.DateTimeFormat('es-ES', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
});

// Valor centinela del desplegable cuando no hay filtro aplicado.
const TODOS_LOS_CINES = '';

// Fecha máxima permitida en los date pickers: el día actual.
// Se calcula una sola vez al cargar la página (formato ISO YYYY-MM-DD).
const HOY_ISO = new Date().toISOString().slice(0, 10);

/**
 * Devuelve el primer valor numérico no nulo entre las claves indicadas.
 * Tolera variaciones de schema entre vistas BigQuery.
 */
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

/** Convierte "2025-03-15" en una fecha legible "15 mar 2025". */
const formateaIso = (iso) => {
  if (!iso) return null;
  const [y, m, d] = iso.split('-').map(Number);
  return fmtFecha.format(new Date(y, m - 1, d));
};

/**
 * Tarjeta KPI estática integrada con Tailwind.
 */
function KpiCardSimple({ title, value, subtitle, icon: Icon, color = 'text-blue-400' }) {
  return (
    <div className="bg-gray-800 border border-gray-700 rounded-2xl p-5 shadow-lg flex items-start justify-between gap-4">
      <div className="flex-1 min-w-0">
        <p className="text-xs uppercase tracking-wider text-gray-400 font-medium">{title}</p>
        <p className="mt-2 text-2xl font-semibold text-gray-50 truncate">{value}</p>
        {subtitle && <p className="mt-1 text-xs text-gray-500">{subtitle}</p>}
      </div>
      {Icon && (
        <div className={`p-3 rounded-xl bg-gray-900/60 border border-gray-700 ${color}`}>
          <Icon size={22} strokeWidth={2} />
        </div>
      )}
    </div>
  );
}

function Dashboard() {
  // Catálogo de cines disponibles + cine seleccionado en el desplegable.
  const [cines, setCines] = useState([]);
  const [cineSeleccionado, setCineSeleccionado] = useState(TODOS_LOS_CINES);

  // Filtro temporal · ambos en formato ISO YYYY-MM-DD ("" = sin filtro).
  const [fechaDesde, setFechaDesde] = useState('');
  const [fechaHasta, setFechaHasta] = useState('');

  // Datos derivados para los gráficos.
  const [taquilla, setTaquilla] = useState([]);
  const [retail, setRetail] = useState([]);
  const [socios, setSocios] = useState([]);
  const [kpis, setKpis] = useState({ ingresos: 0, espectadores: 0, ticketMedio: 0 });

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // ----- Carga inicial del catálogo de cines (una sola vez) -----
  useEffect(() => {
    fetchCines()
      .then(setCines)
      .catch((err) => console.warn('No se pudo cargar el listado de cines:', err.message));
  }, []);

  // ----- Carga de datos cada vez que cambian los filtros -----
  useEffect(() => {
    let cancelado = false;

    // Validación: si las dos fechas están puestas, "desde" no puede ser
    // posterior a "hasta". Si lo es, mostramos error y no llamamos a la API.
    if (fechaDesde && fechaHasta && fechaDesde > fechaHasta) {
      setError('La fecha "Desde" no puede ser posterior a la fecha "Hasta".');
      setLoading(false);
      return;
    }

    (async () => {
      try {
        setLoading(true);
        setError(null);

        const filters = {
          cine: cineSeleccionado || undefined,
          desde: fechaDesde || undefined,
          hasta: fechaHasta || undefined,
        };

        // Socios no se filtra por cine, pero sí por rango temporal.
        const filtersSocios = {
          desde: filters.desde,
          hasta: filters.hasta,
        };

        const [tRows, rRows, sRows] = await Promise.all([
          fetchTaquilla(filters),
          fetchRetail(filters),
          fetchSocios(filtersSocios),
        ]);
        if (cancelado) return;

        // ---- TAQUILLA: agregar ingresos y entradas por título de película ----
        const mapaTaq = new Map();
        for (const row of tRows) {
          const titulo = cadena(row, [
            'titulo',
            'titulo_pelicula',
            'pelicula',
            'pelicula_asociada',
          ]);
          const ingresos = numero(row, [
            'ingresos_taquilla',
            'ingreso_total',
            'ingresos',
            'total_ingresos',
            'ingresos_bar',
          ]);
          const entradas = numero(row, [
            'total_entradas',
            'numero_entradas',
            'entradas',
            'cantidad_entradas',
            'volumen_productos_vendidos',
          ]);
          const acc = mapaTaq.get(titulo) ?? { titulo, ingresos_taquilla: 0, entradas: 0 };
          acc.ingresos_taquilla += ingresos;
          acc.entradas += entradas;
          mapaTaq.set(titulo, acc);
        }
        const taquillaAgg = Array.from(mapaTaq.values());

        // ---- RETAIL: agregar ingresos del bar por categoría ----
        const mapaRet = new Map();
        for (const row of rRows) {
          const categoria = cadena(row, ['categoria', 'categoria_producto']);
          const ingresos = numero(row, [
            'ingresos_bar',
            'ingreso_total',
            'ingresos',
            'total_ingresos',
          ]);
          const acc = mapaRet.get(categoria) ?? { categoria, ingresos_bar: 0 };
          acc.ingresos_bar += ingresos;
          mapaRet.set(categoria, acc);
        }
        const retailNorm = Array.from(mapaRet.values());

        // ---- SOCIOS: gasto medio por nivel de fidelidad ----
        const mapaSoc = new Map();
        for (const row of sRows) {
          const nivel = cadena(row, ['nivel_fidelidad', 'nivel']);
          const valor = numero(row, ['valor_generado', 'ingreso_total', 'ingresos']);
          const trans = numero(row, ['numero_transacciones', 'transacciones', 'count']);
          const acc = mapaSoc.get(nivel) ?? { nivel, valor: 0, trans: 0 };
          acc.valor += valor;
          acc.trans += trans;
          mapaSoc.set(nivel, acc);
        }
        const sociosAgg = Array.from(mapaSoc.values()).map((s) => ({
          nivel_fidelidad: s.nivel,
          gasto_medio: s.trans > 0 ? +(s.valor / s.trans).toFixed(2) : 0,
        }));

        // ---- KPIs ----
        const ingresosTaquilla = taquillaAgg.reduce((a, r) => a + r.ingresos_taquilla, 0);
        const ingresosRetail = retailNorm.reduce((a, r) => a + r.ingresos_bar, 0);
        const espectadores = taquillaAgg.reduce((a, r) => a + r.entradas, 0);
        const ingresosTotal = ingresosTaquilla + ingresosRetail;
        const ticketMedio = espectadores > 0 ? ingresosTotal / espectadores : 0;

        setTaquilla(taquillaAgg);
        setRetail(retailNorm);
        setSocios(sociosAgg);
        setKpis({ ingresos: ingresosTotal, espectadores, ticketMedio });
      } catch (err) {
        if (!cancelado) setError(err.message);
      } finally {
        if (!cancelado) setLoading(false);
      }
    })();

    return () => {
      cancelado = true;
    };
  }, [cineSeleccionado, fechaDesde, fechaHasta]);

  const limpiarFiltros = () => {
    setCineSeleccionado(TODOS_LOS_CINES);
    setFechaDesde('');
    setFechaHasta('');
  };

  const hayFiltros = cineSeleccionado || fechaDesde || fechaHasta;

  // Subtítulo dinámico que describe los filtros activos.
  const subtituloFiltro = (() => {
    const partes = [];
    if (cineSeleccionado) partes.push(cineSeleccionado);
    else partes.push('Todos los cines');
    if (fechaDesde && fechaHasta) {
      partes.push(`del ${formateaIso(fechaDesde)} al ${formateaIso(fechaHasta)}`);
    } else if (fechaDesde) {
      partes.push(`desde ${formateaIso(fechaDesde)}`);
    } else if (fechaHasta) {
      partes.push(`hasta ${formateaIso(fechaHasta)}`);
    }
    return partes.join(' · ');
  })();

  // ----- Estado de error -----
  if (error) {
    return (
      <div className="bg-gray-900 min-h-screen flex items-center justify-center px-6">
        <div className="bg-gray-800 border border-gray-700 rounded-2xl p-8 max-w-lg text-center shadow-lg">
          <AlertTriangle className="mx-auto text-red-400 mb-3" size={36} />
          <h2 className="text-lg font-semibold text-gray-100">No se han podido cargar los datos</h2>
          <p className="mt-2 text-sm text-gray-400">{error}</p>
          <button
            onClick={limpiarFiltros}
            className="mt-5 px-4 py-2 bg-cyan-500/10 border border-cyan-500/30 hover:bg-cyan-500/20 text-cyan-300 rounded-xl text-sm transition-colors"
          >
            Reiniciar filtros
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-900 min-h-screen p-6 text-gray-100">
      {/* Cabecera */}
      <header className="max-w-7xl mx-auto mb-6">
        <p className="text-sm text-cyan-400 uppercase tracking-wider font-medium">Cinema BI</p>
        <h1 className="mt-1 text-3xl md:text-4xl font-bold text-gray-50">
          Cinema BI · Cuadro de Mando Estratégico
        </h1>
        <p className="mt-2 text-sm text-gray-400">{subtituloFiltro}</p>
      </header>

      {/* Barra de filtros */}
      <section className="max-w-7xl mx-auto mb-6 bg-gray-800/60 border border-gray-700 rounded-2xl p-4 shadow-lg">
        <div className="flex flex-col md:flex-row md:items-end md:flex-wrap gap-4">
          {/* Selector de cine */}
          <div className="flex flex-col flex-1 min-w-[220px]">
            <label
              htmlFor="filtro-cine"
              className="text-xs uppercase tracking-wider text-gray-400 font-medium mb-2"
            >
              Cine
            </label>
            <div className="relative">
              <Building2
                size={16}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
              />
              <select
                id="filtro-cine"
                value={cineSeleccionado}
                onChange={(e) => setCineSeleccionado(e.target.value)}
                disabled={loading}
                className="w-full bg-gray-900 border border-gray-700 hover:border-gray-600 focus:border-cyan-500 focus:outline-none rounded-xl pl-9 pr-8 py-2.5 text-sm text-gray-100 cursor-pointer disabled:opacity-60 disabled:cursor-wait transition-colors"
              >
                <option value={TODOS_LOS_CINES}>Todos los cines</option>
                {cines.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Fecha desde */}
          <div className="flex flex-col">
            <label
              htmlFor="filtro-desde"
              className="text-xs uppercase tracking-wider text-gray-400 font-medium mb-2"
            >
              Desde
            </label>
            <div className="relative">
              <Calendar
                size={16}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
              />
              <input
                id="filtro-desde"
                type="date"
                value={fechaDesde}
                max={fechaHasta && fechaHasta < HOY_ISO ? fechaHasta : HOY_ISO}
                onChange={(e) => setFechaDesde(e.target.value)}
                disabled={loading}
                className="bg-gray-900 border border-gray-700 hover:border-gray-600 focus:border-cyan-500 focus:outline-none rounded-xl pl-9 pr-3 py-2.5 text-sm text-gray-100 disabled:opacity-60 disabled:cursor-wait transition-colors"
              />
            </div>
          </div>

          {/* Fecha hasta */}
          <div className="flex flex-col">
            <label
              htmlFor="filtro-hasta"
              className="text-xs uppercase tracking-wider text-gray-400 font-medium mb-2"
            >
              Hasta
            </label>
            <div className="relative">
              <Calendar
                size={16}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
              />
              <input
                id="filtro-hasta"
                type="date"
                value={fechaHasta}
                min={fechaDesde || undefined}
                max={HOY_ISO}
                onChange={(e) => setFechaHasta(e.target.value)}
                disabled={loading}
                className="bg-gray-900 border border-gray-700 hover:border-gray-600 focus:border-cyan-500 focus:outline-none rounded-xl pl-9 pr-3 py-2.5 text-sm text-gray-100 disabled:opacity-60 disabled:cursor-wait transition-colors"
              />
            </div>
          </div>

          {/* Botón limpiar (solo aparece si hay algún filtro activo) */}
          {hayFiltros && (
            <button
              onClick={limpiarFiltros}
              disabled={loading}
              className="self-end flex items-center gap-2 px-4 py-2.5 bg-gray-900 hover:bg-gray-700 border border-gray-700 hover:border-gray-600 rounded-xl text-sm text-gray-300 transition-colors disabled:opacity-60"
              title="Quitar todos los filtros"
            >
              <RotateCcw size={14} />
              <span>Limpiar</span>
            </button>
          )}
        </div>
      </section>

      {/* Aviso de carga inline */}
      {loading && (
        <div className="max-w-7xl mx-auto mb-4 flex items-center text-sm text-gray-400">
          <Loader2 size={16} className="animate-spin mr-2" />
          <span>Cargando datos del backend…</span>
        </div>
      )}

      <main className={`max-w-7xl mx-auto space-y-6 ${loading ? 'opacity-60' : ''}`}>
        {/* Grid superior · Tarjetas KPI */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <KpiCardSimple
            title="Ingresos Totales"
            value={fmtEUR.format(kpis.ingresos)}
            subtitle="Taquilla + Retail acumulado"
            icon={Euro}
            color="text-emerald-400"
          />
          <KpiCardSimple
            title="Espectadores"
            value={fmtNum.format(kpis.espectadores)}
            subtitle="Entradas vendidas en el periodo"
            icon={Users}
            color="text-cyan-400"
          />
          <KpiCardSimple
            title="Ticket Medio"
            value={fmtEUR.format(kpis.ticketMedio)}
            subtitle="Gasto promedio por entrada"
            icon={Ticket}
            color="text-violet-400"
          />
        </section>

        {/* Grid inferior · Gráficos */}
        <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="lg:col-span-2">
            <TaquillaChart data={taquilla} />
          </div>
          <RetailChart data={retail} />
          <SociosChart data={socios} />
        </section>

        {/* Aviso sobre socios cuando hay un cine filtrado */}
        {cineSeleccionado && (
          <p className="text-xs text-gray-500 italic text-center">
            Nota: el bloque de fidelización muestra siempre datos de toda la cadena —
            la vista <code>vw_kpi_fidelizacion</code> no incluye dimensión de cine
            porque los socios pueden visitar cualquiera de los locales.
          </p>
        )}
      </main>

      <footer className="max-w-7xl mx-auto mt-10 text-center text-xs text-gray-600">
        TFG · Plataforma BI para cines · Datos en tiempo real desde BigQuery.
      </footer>
    </div>
  );
}

export default Dashboard;
