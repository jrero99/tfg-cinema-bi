import { forwardRef } from 'react';
import DatePicker, { registerLocale } from 'react-datepicker';
import { es } from 'date-fns/locale';
import { Calendar } from 'lucide-react';

registerLocale('es', es);

/**
 * Convierte una fecha ISO "YYYY-MM-DD" en un Date local sin desfase de huso.
 * (new Date("2025-03-15") la interpreta como UTC y suele cambiar de día.)
 */
const isoADate = (iso) => {
  if (!iso) return null;
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d);
};

/** Date → "YYYY-MM-DD" en zona local, sin pasar por UTC. */
const dateAIso = (date) => {
  if (!date) return '';
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

/**
 * Input personalizado que combina el icono de calendario con el campo de
 * texto y los estilos del resto del dashboard. react-datepicker lo invoca
 * con el value/onClick necesarios.
 */
const DateInputBox = forwardRef(function DateInputBox(
  { value, onClick, onChange, disabled, placeholder, hasValue },
  ref,
) {
  return (
    <div className="relative w-full">
      <Calendar
        size={16}
        className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
      />
      <input
        ref={ref}
        type="text"
        readOnly
        value={value ?? ''}
        onClick={onClick}
        onChange={onChange}
        disabled={disabled}
        placeholder={placeholder}
        className="w-full bg-gray-900 border border-gray-700 hover:border-gray-600 focus:border-cyan-500 focus:outline-none rounded-xl pl-9 pr-3 py-2.5 text-sm text-gray-100 cursor-pointer disabled:opacity-60 disabled:cursor-wait transition-colors"
      />
      {hasValue && !disabled && (
        <button
          type="button"
          onMouseDown={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.stopPropagation();
            onChange?.({ target: { value: '' } });
          }}
          className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-200 text-xs px-1"
          aria-label="Limpiar fecha"
          title="Limpiar fecha"
        >
          ×
        </button>
      )}
    </div>
  );
});

/**
 * DateInput
 * ----------
 * Date picker en español con calendario emergente y estilos del dashboard.
 *
 * Props:
 *  - value:    cadena ISO YYYY-MM-DD o '' (sin selección).
 *  - onChange: (iso: string) => void · recibe '' cuando se limpia.
 *  - min/max:  cadenas ISO opcionales para acotar el rango seleccionable.
 *  - disabled: bool.
 *  - placeholder: texto del campo vacío.
 */
function DateInput({ value, onChange, min, max, disabled, placeholder = 'dd/mm/aaaa' }) {
  const handleChange = (date) => {
    onChange?.(dateAIso(date));
  };

  // El input interno necesita devolver '' cuando el usuario clica la "X".
  const handleClear = (event) => {
    if (event?.target && 'value' in event.target && event.target.value === '') {
      onChange?.('');
    }
  };

  return (
    <DatePicker
      selected={isoADate(value)}
      onChange={handleChange}
      minDate={isoADate(min)}
      maxDate={isoADate(max)}
      disabled={disabled}
      locale="es"
      dateFormat="dd/MM/yyyy"
      placeholderText={placeholder}
      showPopperArrow={false}
      popperPlacement="bottom-start"
      customInput={
        <DateInputBox
          disabled={disabled}
          placeholder={placeholder}
          hasValue={!!value}
          onChange={handleClear}
        />
      }
    />
  );
}

export default DateInput;
