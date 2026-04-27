import Dashboard from './pages/Dashboard.jsx';

/**
 * Componente raíz de la aplicación.
 * Por ahora solo monta el Dashboard principal; cuando se incorporen rutas
 * adicionales (retail, socios), aquí se introducirá React Router.
 */
function App() {
  return (
    <div className="bg-bi-bg min-h-screen">
      <Dashboard />
    </div>
  );
}

export default App;
