import type { ReactNode } from 'react';
import Mascota from '../../components/Mascota';

interface BuscadorProps {
  valor: string;
  onCambio: (valor: string) => void;
  etiqueta: string;
  placeholder: string;
}

// Filtra en cada tecla: no hace falta botón ni Enter.
export function Buscador({
  valor,
  onCambio,
  etiqueta,
  placeholder,
}: BuscadorProps) {
  return (
    <div className="panel-buscador" role="search">
      <span className="panel-buscador__icono" aria-hidden="true">
        🔍
      </span>
      <input
        type="search"
        aria-label={etiqueta}
        placeholder={placeholder}
        value={valor}
        onChange={(event) => onCambio(event.target.value)}
      />
    </div>
  );
}

interface ChipProps {
  activo: boolean;
  onClick: () => void;
  children: ReactNode;
}

export function Chip({ activo, onClick, children }: ChipProps) {
  return (
    <button
      type="button"
      className="panel-chip"
      aria-pressed={activo}
      onClick={onClick}
    >
      {children}
    </button>
  );
}

interface ContadorProps {
  visibles: number;
  total: number;
  // En singular: "producto", "venta", "cliente".
  nombre: string;
}

// "X de Y", anunciado a los lectores de pantalla al cambiar.
export function Contador({ visibles, total, nombre }: ContadorProps) {
  return (
    <p className="panel-contador" aria-live="polite">
      {visibles} de {total} {total === 1 ? nombre : `${nombre}s`}
    </p>
  );
}

export function SinResultados({ onLimpiar }: { onLimpiar: () => void }) {
  return (
    <div className="panel-vacio">
      <Mascota pose="triste" />
      <p>No encontramos nada con esa búsqueda.</p>
      <button type="button" className="panel-boton" onClick={onLimpiar}>
        Limpiar búsqueda
      </button>
    </div>
  );
}
