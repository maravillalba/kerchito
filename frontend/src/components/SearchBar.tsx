import { useId, useState } from 'react';
import type { FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import './SearchBar.css';

interface SearchBarProps {
  // Texto que ya está buscado (?q= de /products). El Header monta de nuevo el
  // componente cuando cambia, así el campo refleja la búsqueda actual.
  initialQuery: string;
}

// Buscador del Header: al enviar (Enter o botón) va a /products?q=<texto>.
function SearchBar({ initialQuery }: SearchBarProps) {
  const navigate = useNavigate();
  const [query, setQuery] = useState(initialQuery);
  const inputId = useId();

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const text = query.trim();
    navigate(text ? `/products?q=${encodeURIComponent(text)}` : '/products');
  };

  return (
    <form className="search-bar" role="search" onSubmit={handleSubmit}>
      <label htmlFor={inputId} className="sr-only">
        Buscar productos
      </label>
      <input
        id={inputId}
        className="search-bar__input"
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Buscar productos"
        autoComplete="off"
        enterKeyHint="search"
      />
      <button type="submit" className="search-bar__button" aria-label="Buscar">
        <svg
          aria-hidden="true"
          focusable="false"
          viewBox="0 0 24 24"
          width="20"
          height="20"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
        >
          <circle cx="11" cy="11" r="7" />
          <path d="m20 20-3.5-3.5" />
        </svg>
      </button>
    </form>
  );
}

export default SearchBar;
