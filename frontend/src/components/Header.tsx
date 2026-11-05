import { Link, NavLink } from 'react-router-dom';
import logo from '../assets/logo-ker.png';
import { useCart } from '../context/CartContext.tsx';
import './Header.css';

// Header fijo arriba (sticky) en todas las páginas: el contador del carrito
// queda siempre a la vista al scrollear.
export default function Header() {
  const { totalItems } = useCart();

  return (
    <header className="header header--fijo">
      <div className="header__inner container">
        <Link to="/" className="header__brand">
          <img src={logo} alt="Kiosko El Rápido" />
        </Link>
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
