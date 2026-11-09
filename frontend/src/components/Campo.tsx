import type { InputHTMLAttributes } from 'react';
import './Campo.css';

interface CampoProps extends Omit<
  InputHTMLAttributes<HTMLInputElement>,
  'id' | 'value' | 'onChange' | 'name'
> {
  id: string;
  // También identifica al campo en el objeto de errores del formulario.
  name: string;
  label: string;
  value: string;
  onCambio: (valor: string) => void;
  error?: string;
  // Con opciones se dibuja un <select> en lugar de un <input>.
  opciones?: { value: string; label: string }[];
}

// Campo de formulario con su <label> y el error asociado por aria-describedby.
function Campo({
  id,
  name,
  label,
  value,
  onCambio,
  error,
  opciones,
  ...inputProps
}: CampoProps) {
  const errorId = `${id}-error`;
  const control = {
    id,
    name,
    value,
    className: 'campo__control',
    'aria-invalid': error ? true : undefined,
    'aria-describedby': error ? errorId : undefined,
  };

  return (
    <div className="campo">
      <label className="campo__label" htmlFor={id}>
        {label}
      </label>
      {opciones ? (
        <select {...control} onChange={(e) => onCambio(e.target.value)}>
          {opciones.map((opcion) => (
            <option key={opcion.value} value={opcion.value}>
              {opcion.label}
            </option>
          ))}
        </select>
      ) : (
        <input
          {...inputProps}
          {...control}
          onChange={(e) => onCambio(e.target.value)}
        />
      )}
      {error && (
        <p id={errorId} className="campo__error">
          {error}
        </p>
      )}
    </div>
  );
}

export default Campo;
