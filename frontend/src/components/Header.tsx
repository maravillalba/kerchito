import { Link, NavLink, useLocation } from 'react-router-dom';
import logo from '../assets/logo-ker.png';
import { useCart } from '../context/CartContext.tsx';
import SearchBar from './SearchBar';
import './Header.css';

// Header fijo arriba (sticky) en todas las páginas: el contador del carrito
// queda siempre a la vista al scrollear.
export default function Header() {
  const { totalItems } = useCart();
  const location = useLocation();
  // En /products el buscador muestra lo que se está buscando (?q=); en otras
  // páginas arranca vacío.
  const currentQuery =
    location.pathname === '/products'
      ? (new URLSearchParams(location.search).get('q') ?? '')
      : '';

  return (
    <header className="header header--fijo">
      <div className="header__inner container">
        <Link to="/" className="header__brand">
          <img src={logo} alt="Kiosko El Rápido" />
        </Link>
        <div className="header__search">
          {/* key: al cambiar la búsqueda de la URL, el campo arranca con ese texto. */}
          <SearchBar key={currentQuery} initialQuery={currentQuery} />
        </div>
        <nav className="header__nav" aria-label="Principal">
          <NavLink to="/" end className="header__link">
            Inicio
          </NavLink>
          <NavLink to="/products" className="header__link">
            Productos
          </NavLink>
          <NavLink to="/cart" className="header__cart">
            Carrito ({totalItems})
          </NavLink>
        </nav>
      </div>
    </header>
  );
}
