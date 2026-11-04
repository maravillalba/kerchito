import { Link } from 'react-router-dom';
import logo from '../assets/logo.png';
import type { Category } from '../types';
import { CATEGORY_ICONS } from '../utils/categoryIcons';
import { CATEGORY_LABELS } from '../utils/format';
import './Home.css';

const CATEGORIES = Object.keys(CATEGORY_LABELS) as Category[];

const STEPS = [
  {
    title: 'Elegí tus productos',
    text: 'Mirá el catálogo o filtrá por categoría.',
  },
  {
    title: 'Sumalos al carrito',
    text: 'Ves el total y el stock disponible.',
  },
  {
    title: 'Confirmá tu pedido',
    text: 'Te damos el número y el detalle al instante.',
  },
];

function Home() {
  return (
    <div className="home">
      <section className="home__hero">
        <img src={logo} alt="" className="home__logo" />
        {/* El logo ya muestra el nombre: el título queda solo para lectores de pantalla. */}
        <h1 className="home__sr-only">Kiosko El Rápido</h1>
        <p className="home__tagline">
          Bienvenido, todo lo que necesitás en un solo clic
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
                <img
                  src={CATEGORY_ICONS[category]}
                  alt=""
                  width={92}
                  height={92}
                  className="home__category-icon"
                />
                {CATEGORY_LABELS[category]}
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section className="home__steps" aria-labelledby="home-como-comprar">
        <h2 id="home-como-comprar">Cómo comprar</h2>
        <ol className="home__step-list">
          {STEPS.map((step, index) => (
            <li key={step.title} className="home__step">
              <span className="home__step-number" aria-hidden="true">
                {index + 1}
              </span>
              <h3>{step.title}</h3>
              <p>{step.text}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="home__bot" aria-labelledby="home-kioscobot">
        <h2 id="home-kioscobot">¿Dudas? Preguntale a KioscoBot</h2>
        <p>
          Precios, stock, horarios y medios de pago, siempre a mano. Abrí el
          chat con el botón naranja de abajo a la derecha.
        </p>
      </section>
    </div>
  );
}

export default Home;
