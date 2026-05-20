import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';

import Layout from './components/Layout.jsx';
import Dashboard from './pages/Dashboard.jsx';
import PeliculaDetalle from './pages/PeliculaDetalle.jsx';
import CineDetalle from './pages/CineDetalle.jsx';
import Operaciones from './pages/Operaciones.jsx';
import CrossSelling from './pages/CrossSelling.jsx';
import SegmentacionSocios from './pages/SegmentacionSocios.jsx';

/**
 * Componente raíz: arma el router con un Layout común y las páginas hijas.
 * El Dashboard sigue siendo la home (`/`). Las fichas de detalle se generan
 * por drill-down desde el resumen.
 */
function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/peliculas/:titulo" element={<PeliculaDetalle />} />
          <Route path="/cines/:nombre" element={<CineDetalle />} />
          <Route path="/operaciones" element={<Operaciones />} />
          <Route path="/cross-selling" element={<CrossSelling />} />
          <Route path="/socios" element={<SegmentacionSocios />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
