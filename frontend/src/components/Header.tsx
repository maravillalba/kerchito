import { Link, NavLink, useLocation } from 'react-router-dom';
import logo from '../assets/logo-ker.png';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext.tsx';
import SearchBar from './SearchBar';
import './Header.css';

// Header fijo arriba (sticky) en todas las páginas: el contador del carrito
// queda siempre a la vista al scrollear.
export default function Header() {
  const { totalItems } = useCart();
  const { usuario, logout } = useAuth();
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
          {usuario?.role === 'customer' && (
            <Link
              to="/puntos"
              className="header__saludo"
              title="Cómo funcionan los puntos"
            >
              <span aria-hidden="true">⭐</span> Hola, {usuario.first_name} ·{' '}
              {usuario.points} pts
            </Link>
          )}
          {usuario?.role === 'admin' && (
            <Link to="/admin" className="header__link">
              Panel
            </Link>
          )}
          <NavLink
            to="/cart"
            className={
              usuario ? 'header__cart header__cart--con-sesion' : 'header__cart'
            }
          >
            Carrito ({totalItems})
          </NavLink>
          {usuario && (
            <button type="button" className="header__salir" onClick={logout}>
              Cerrar sesión
            </button>
          )}
        </nav>
      </div>
    </header>
  );
}
