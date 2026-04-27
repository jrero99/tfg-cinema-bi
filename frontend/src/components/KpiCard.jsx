/**
 * KpiCard
 * --------
 * Tarjeta reutilizable para mostrar un indicador clave de negocio (KPI).
 *
 * Props:
 *  - title:    string     · Etiqueta superior (p. ej. "Ingresos Totales").
 *  - value:    string|num · Valor principal ya formateado.
 *  - subtitle: string     · Texto secundario opcional (p. ej. variación, periodo).
 *  - icon:     Component  · Componente de icono de Lucide React.
 *  - accent:   string     · Clase Tailwind para el color del icono ("text-bi-accent" por defecto).
 */
function KpiCard({
  title,
  value,
  subtitle,
  icon: Icon,
  accent = 'text-bi-accent',
}) {
  return (
    <div className="card p-5 flex items-start justify-between gap-4 hover:border-bi-accent/40 transition-colors">
      {/* Columna textual */}
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

      {/* Icono decorativo */}
      {Icon && (
        <div className={`p-3 rounded-xl bg-bi-bg/60 border border-bi-border ${accent}`}>
          <Icon size={22} strokeWidth={2} />
        </div>
      )}
    </div>
  );
}

export default KpiCard;
