import { Link } from 'react-router-dom';
import logo from '../assets/logo-ker.png';
import type { Category } from '../types';
import { CATEGORY_LABELS } from '../utils/format';
import { HORARIOS, MEDIOS_DE_PAGO } from '../utils/tienda';
import Mascota from './Mascota';
import './Footer.css';

const CATEGORIES = Object.keys(CATEGORY_LABELS) as Category[];

// Pie de página: marca y frase, navegación, categorías y atención (horarios y
// medios de pago, los mismos que informa KioscoBot). Sin datos de contacto
// inventados: el kiosko no tiene teléfono, dirección ni redes cargados.
export default function Footer() {
  return (
    <footer className="footer">
      <div className="footer__inner container">
        <div className="footer__brand">
          <span className="footer__logo">
            <img src={logo} alt="Kiosko El Rápido" width={120} height={80} />
          </span>
          <p className="footer__phrase">
            Todo lo del kiosko, sin salir de casa
          </p>
          <Mascota pose="saludando" size="chico" />
        </div>

        <nav className="footer__nav" aria-label="Pie de página">
          <div className="footer__col">
            <h2 className="footer__title">Navegación</h2>
            <ul className="footer__list">
              <li>
                <Link to="/">Inicio</Link>
              </li>
              <li>
                <Link to="/products">Productos</Link>
              </li>
              <li>
                <Link to="/cart">Carrito</Link>
              </li>
            </ul>
          </div>

          <div className="footer__col">
            <h2 className="footer__title">Categorías</h2>
            <ul className="footer__list">
              {CATEGORIES.map((category) => (
                <li key={category}>
                  <Link to={`/products?category=${category}`}>
                    {CATEGORY_LABELS[category]}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </nav>

        <section className="footer__col" aria-labelledby="footer-atencion">
          <h2 id="footer-atencion" className="footer__title">
            Atención
          </h2>
          <h3 className="footer__subtitle">Horarios</h3>
          <p className="footer__text">{HORARIOS}</p>
          <h3 className="footer__subtitle">Medios de pago</h3>
          <p className="footer__text">{MEDIOS_DE_PAGO}</p>
        </section>
      </div>

      <div className="footer__bottom">
        <p className="footer__copy container">
          © 2026 Kiosko El Rápido · Proyecto UTN – Programación IV
        </p>
      </div>
    </footer>
  );
}
