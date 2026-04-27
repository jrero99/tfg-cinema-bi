/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{js,jsx,ts,tsx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Paleta personalizada para el dashboard "dark BI"
        bi: {
          bg: '#0B1120',        // Fondo principal
          panel: '#111827',     // Tarjetas / paneles
          border: '#1F2937',    // Bordes sutiles
          accent: '#6366F1',    // Indigo (acento primario)
          accent2: '#22D3EE',   // Cian (acento secundario)
          success: '#10B981',
          warning: '#F59E0B',
          danger: '#EF4444',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
