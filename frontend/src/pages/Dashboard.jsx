import { useEffect, useState } from 'react';
import { Euro, Users, Ticket } from 'lucide-react';

import TaquillaChart from '../components/TaquillaChart.jsx';
import RetailChart from '../components/RetailChart.jsx';
import SociosChart from '../components/SociosChart.jsx';

// Formateadores reutilizables (i18n español, moneda EUR).
const fmtEUR = new Intl.NumberFormat('es-ES', {
  style: 'currency',
  currency: 'EUR',
  maximumFractionDigits: 0,
});
const fmtNum = new Intl.NumberFormat('es-ES');

/**
 * Tarjeta KPI estática integrada (versión Tailwind directa para no
 * depender del componente externo). Permite que el Dashboard sea
 * autocontenido y fácil de revisar visualmente.
 */
function KpiCardSimple({ title, value, subtitle, icon: Icon, color = 'text-blue-400' }) {
  return (
    <div className="bg-gray-800 border border-gray-700 rounded-2xl p-5 shadow-lg flex items-start justify-between gap-4">
      <div className="flex-1 min-w-0">
        <p className="text-xs uppercase tracking-wider text-gray-400 font-medium">
          {title}
        </p>
        <p className="mt-2 text-2xl font-semibold text-gray-50 truncate">
          {value}
        </p>
        {subtitle && (
          <p className="mt-1 text-xs text-gray-500">{subtitle}</p>
        )}
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

  // ----- Carga de datos (mock) -----
  // Nota: cuando se conecte al backend real, sustituir por:
  //   import { fetchTaquilla, fetchRetail, fetchSocios } from '../services/api.js';
  //   Promise.all([fetchTaquilla(), fetchRetail(), fetchSocios()])
  //     .then(([t, r, s]) => { setTaquilla(t); setRetail(r); setSocios(s); });
  useEffect(() => {
    // Mock taquilla: ingresos por película
    setTaquilla([
      { titulo: 'Dune: Parte Dos',           ingresos_taquilla: 152340 },
      { titulo: 'Oppenheimer',                ingresos_taquilla: 138210 },
      { titulo: 'Barbie',                     ingresos_taquilla: 129870 },
      { titulo: 'Inside Out 2',               ingresos_taquilla: 118430 },
      { titulo: 'Deadpool y Wolverine',       ingresos_taquilla: 110200 },
      { titulo: 'Wonka',                      ingresos_taquilla:  92500 },
      { titulo: 'The Batman',                 ingresos_taquilla:  84120 },
    ]);

    // Mock retail: ingresos del bar por categoría
    setRetail([
      { categoria: 'Palomitas', ingresos_bar: 48230 },
      { categoria: 'Bebida',    ingresos_bar: 36120 },
      { categoria: 'Combo',     ingresos_bar: 52400 },
      { categoria: 'Snack',     ingresos_bar: 18950 },
      { categoria: 'Dulces',    ingresos_bar: 12780 },
    ]);

    // Mock socios: gasto medio por nivel
    setSocios([
      { nivel_fidelidad: 'Estándar', gasto_medio: 14.20 },
      { nivel_fidelidad: 'Bronce',   gasto_medio: 18.75 },
      { nivel_fidelidad: 'Plata',    gasto_medio: 24.40 },
      { nivel_fidelidad: 'Oro',      gasto_medio: 32.60 },
    ]);
  }, []);

  return (
    <div className="bg-gray-900 min-h-screen p-6 text-gray-100">
      {/* Cabecera */}
      <header className="max-w-7xl mx-auto mb-8">
        <p className="text-sm text-cyan-400 uppercase tracking-wider font-medium">
          Cinema BI
        </p>
        <h1 className="mt-1 text-3xl md:text-4xl font-bold text-gray-50">
          Cinema BI · Cuadro de Mando Estratégico
        </h1>
        <p className="mt-2 text-sm text-gray-400">
          Visión consolidada de taquilla, retail y fidelización.
        </p>
      </header>

      <main className="max-w-7xl mx-auto space-y-6">
        {/* Grid superior · Tarjetas KPI */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <KpiCardSimple
            title="Ingresos Totales"
            value={fmtEUR.format(995430)}
            subtitle="Taquilla + Retail (último trimestre)"
            icon={Euro}
            color="text-emerald-400"
          />
          <KpiCardSimple
            title="Espectadores"
            value={fmtNum.format(124320)}
            subtitle="Entradas vendidas en el periodo"
            icon={Users}
            color="text-cyan-400"
          />
          <KpiCardSimple
            title="Ticket Medio"
            value={fmtEUR.format(8)}
            subtitle="Gasto promedio por entrada"
            icon={Ticket}
            color="text-violet-400"
          />
        </section>

        {/* Grid inferior · Gráficos
            - Taquilla ocupa todo el ancho (col-span-2 en lg)
            - Retail y Socios se sitúan uno al lado del otro */}
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
