import { useEffect, useState } from 'react';
import {
  Euro,
  Users,
  Ticket,
  Loader2,
  AlertTriangle,
} from 'lucide-react';

import TaquillaChart from '../components/TaquillaChart.jsx';
import RetailChart from '../components/RetailChart.jsx';
import SociosChart from '../components/SociosChart.jsx';
import { fetchTaquilla, fetchRetail, fetchSocios } from '../services/api.js';

// Formateadores reutilizables (i18n español, moneda EUR).
const fmtEUR = new Intl.NumberFormat('es-ES', {
  style: 'currency',
  currency: 'EUR',
  maximumFractionDigits: 0,
});
const fmtNum = new Intl.NumberFormat('es-ES');

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
  const [taquilla, setTaquilla] = useState([]);
  const [retail, setRetail] = useState([]);
  const [socios, setSocios] = useState([]);
  const [kpis, setKpis] = useState({ ingresos: 0, espectadores: 0, ticketMedio: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Carga en paralelo de los 3 endpoints + transformación al shape que esperan los gráficos.
  useEffect(() => {
    let cancelado = false;

    (async () => {
      try {
        setLoading(true);
        setError(null);

        const [tRows, rRows, sRows] = await Promise.all([
          fetchTaquilla(),
          fetchRetail(),
          fetchSocios(),
        ]);
        if (cancelado) return;

        // ---- TAQUILLA: agregar ingresos y entradas por título de película ----
        // Tolera múltiples nombres porque las vistas BigQuery aún no están
        // unificadas (vw_kpi_taquilla devuelve hoy campos de bar).
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
            'ingresos_bar', // fallback si la vista mezcla retail
          ]);
          const entradas = numero(row, [
            'total_entradas',
            'numero_entradas',
            'entradas',
            'cantidad_entradas',
            'volumen_productos_vendidos', // proxy si solo hay datos de bar
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

        // ---- SOCIOS: gasto medio por nivel de fidelidad (ticket promedio) ----
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
  }, []);

  // ----- Estados de carga / error -----
  if (loading) {
    return (
      <div className="bg-gray-900 min-h-screen flex items-center justify-center text-gray-300">
        <Loader2 className="animate-spin mr-3" />
        <span>Cargando datos del backend…</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-gray-900 min-h-screen flex items-center justify-center px-6">
        <div className="bg-gray-800 border border-gray-700 rounded-2xl p-8 max-w-lg text-center shadow-lg">
          <AlertTriangle className="mx-auto text-red-400 mb-3" size={36} />
          <h2 className="text-lg font-semibold text-gray-100">No se han podido cargar los datos</h2>
          <p className="mt-2 text-sm text-gray-400">{error}</p>
          <p className="mt-4 text-xs text-gray-500">
            Comprueba que el backend Express esté arrancado en el puerto configurado por
            <code className="mx-1 px-1 py-0.5 bg-gray-900 rounded">VITE_API_URL</code>.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-900 min-h-screen p-6 text-gray-100">
      {/* Cabecera */}
      <header className="max-w-7xl mx-auto mb-8">
        <p className="text-sm text-cyan-400 uppercase tracking-wider font-medium">Cinema BI</p>
        <h1 className="mt-1 text-3xl md:text-4xl font-bold text-gray-50">
          Cinema BI · Cuadro de Mando Estratégico
        </h1>
        <p className="mt-2 text-sm text-gray-400">
          Visión consolidada de taquilla, retail y fidelización · datos en vivo desde BigQuery.
        </p>
      </header>

      <main className="max-w-7xl mx-auto space-y-6">
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
      </main>

      <footer className="max-w-7xl mx-auto mt-10 text-center text-xs text-gray-600">
        TFG · Plataforma BI para cines · Datos en tiempo real desde BigQuery.
      </footer>
    </div>
  );
}

export default Dashboard;
