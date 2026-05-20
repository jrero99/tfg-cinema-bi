import { NavLink, Outlet } from 'react-router-dom';
import { LayoutDashboard, Activity, Shuffle, UsersRound } from 'lucide-react';

/**
 * Layout principal con cabecera de navegación común a todas las páginas.
 * Cualquier ruta hija se renderiza en el <Outlet />.
 */
function Layout() {
  const linkBase =
    'flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium transition-colors';
  const linkActivo = 'bg-cyan-500/15 border border-cyan-500/40 text-cyan-200';
  const linkInactivo =
    'text-gray-400 hover:text-gray-100 border border-transparent hover:bg-gray-800';

  return (
    <div className="bg-gray-900 min-h-screen text-gray-100">
      <header className="sticky top-0 z-20 bg-gray-900/90 backdrop-blur border-b border-gray-800">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center md:justify-between gap-3 px-6 py-3">
          <div className="flex items-center gap-3">
            <span className="text-sm text-cyan-400 uppercase tracking-wider font-semibold">
              Cinema BI
            </span>
            <span className="text-xs text-gray-500 hidden md:inline">
              · Plataforma de Business Intelligence para cines
            </span>
          </div>

          <nav className="flex items-center gap-2">
            <NavLink
              to="/"
              end
              className={({ isActive }) =>
                `${linkBase} ${isActive ? linkActivo : linkInactivo}`
              }
            >
              <LayoutDashboard size={16} />
              <span>Resumen</span>
            </NavLink>
            <NavLink
              to="/operaciones"
              className={({ isActive }) =>
                `${linkBase} ${isActive ? linkActivo : linkInactivo}`
              }
            >
              <Activity size={16} />
              <span>Operaciones</span>
            </NavLink>
            <NavLink
              to="/cross-selling"
              className={({ isActive }) =>
                `${linkBase} ${isActive ? linkActivo : linkInactivo}`
              }
            >
              <Shuffle size={16} />
              <span>Cross-Selling</span>
            </NavLink>
            <NavLink
              to="/socios"
              className={({ isActive }) =>
                `${linkBase} ${isActive ? linkActivo : linkInactivo}`
              }
            >
              <UsersRound size={16} />
              <span>Socios</span>
            </NavLink>
          </nav>
        </div>
      </header>

      <Outlet />

      <footer className="max-w-7xl mx-auto py-6 px-6 text-center text-xs text-gray-600">
        TFG · Plataforma BI para cines · Datos en tiempo real desde BigQuery.
      </footer>
    </div>
  );
}

export default Layout;
