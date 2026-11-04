import { Link } from 'react-router-dom';
import logo from '../assets/logo.png';
import type { Category } from '../types';
import { CATEGORY_LABELS } from '../utils/format';
import './Home.css';

const CATEGORIES = Object.keys(CATEGORY_LABELS) as Category[];

function Home() {
  return (
    <div className="home">
      <section className="home__hero">
        <img src={logo} alt="" className="home__logo" />
        <h1>Kiosko El Rápido</h1>
        <p className="home__tagline">
          Bebidas, golosinas, almacén y más, a un par de clics. ¡Bienvenido!
        </p>
        <Link to="/products" className="home__cta">
          Ver productos
        </Link>
      </section>

      <section className="home__categories" aria-labelledby="home-categorias">
        <h2 id="home-categorias">Categorías</h2>
        <ul className="home__category-grid">
          {CATEGORIES.map((category) => (
            <li key={category}>
              <Link to={`/products?category=${category}`}>
                {CATEGORY_LABELS[category]}
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

export default Home;
