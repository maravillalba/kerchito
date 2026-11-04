import { Link, NavLink } from 'react-router-dom';
import logo from '../assets/logo.png';
import { useCart } from '../context/CartContext.tsx';
import './Header.css';

export default function Header() {
  const { totalItems } = useCart();

  return (
    <header className="header">
      <div className="header__inner container">
        <Link to="/" className="header__brand">
          <img src={logo} alt="Kiosko El Rápido" />
        </Link>
        <nav className="header__nav">
          <NavLink to="/" end>
            Inicio
          </NavLink>
          <NavLink to="/products">Productos</NavLink>
          <NavLink to="/cart">Carrito ({totalItems})</NavLink>
        </nav>
      </div>
    </header>
  );
}
