import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import ala from '../assets/banners/banner-ala.webp';
import aquarius from '../assets/banners/banner-aquarius.webp';
import ayudinGel from '../assets/banners/banner-ayudin-gel.webp';
import azucar from '../assets/banners/banner-azucar.webp';
import cif from '../assets/banners/banner-cif.webp';
import cocaCola from '../assets/banners/banner-coca-cola.webp';
import sprite from '../assets/banners/banner-sprite.webp';
import yerba from '../assets/banners/banner-yerba.webp';
import logo from '../assets/logo.png';
import Mascota from '../components/Mascota';
import ProductCard from '../components/ProductCard';
import { useCart } from '../context/CartContext';
import { getProducts } from '../services/api';
import type { Category, Product } from '../types';
import { CATEGORY_ICONS } from '../utils/categoryIcons';
import { pickFeatured } from '../utils/featured';
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

interface BannerPhoto {
  src: string;
  width: number;
  height: number;
}

interface Banner {
  id: string;
  variant: 'grande' | 'amarillo' | 'naranja';
  category: Category;
  title: string;
  subtitle: string;
  action: string;
  photos: BannerPhoto[];
}

// Atajos de navegación a una categoría (no son ofertas).
const BANNERS: Banner[] = [
  {
    id: 'almacen',
    variant: 'grande',
    category: 'almacen',
    title: 'Para el mate de la tarde',
    subtitle: 'Yerba, azúcar y todo lo del almacén.',
    action: 'Ver almacén',
    photos: [
      { src: yerba, width: 242, height: 413 },
      { src: azucar, width: 408, height: 304 },
    ],
  },
  {
    id: 'bebidas',
    variant: 'amarillo',
    category: 'bebidas',
    title: 'Bebidas',
    subtitle: 'Frescas y a un clic.',
    action: 'Ver bebidas',
    photos: [
      { src: sprite, width: 112, height: 408 },
      { src: cocaCola, width: 122, height: 432 },
      { src: aquarius, width: 131, height: 415 },
    ],
  },
  {
    id: 'limpieza',
    variant: 'naranja',
    category: 'limpieza',
    title: 'Limpieza del hogar',
    subtitle: 'Todo para dejar la casa impecable.',
    action: 'Ver limpieza',
    photos: [
      { src: cif, width: 206, height: 418 },
      { src: ayudinGel, width: 125, height: 411 },
      { src: ala, width: 334, height: 409 },
    ],
  },
];

function HomeBanner({ banner }: { banner: Banner }) {
  const titleId = `home-banner-${banner.id}-titulo`;
  const subtitleId = `home-banner-${banner.id}-texto`;
  return (
    // El nombre accesible es el título; el subtítulo queda como descripción.
    <Link
      to={`/products?category=${banner.category}`}
      className={`home-banner home-banner--${banner.variant}`}
      aria-labelledby={titleId}
      aria-describedby={subtitleId}
    >
      <span className="home-banner__text">
        <span id={titleId} className="home-banner__title">
          {banner.title}
        </span>
        <span id={subtitleId} className="home-banner__subtitle">
          {banner.subtitle}
        </span>
        <span className="home-banner__action" aria-hidden="true">
          {banner.action}
        </span>
      </span>
      <span className="home-banner__photos">
        {banner.photos.map((photo) => (
          <img
            key={photo.src}
            src={photo.src}
            alt=""
            aria-hidden="true"
            width={photo.width}
            height={photo.height}
            className="home-banner__photo"
          />
        ))}
      </span>
    </Link>
  );
}

// 3 productos fijos del catálogo. Si la carga falla, la sección no se muestra.
function FeaturedProducts() {
  const { addToCart } = useCart();
  const [featured, setFeatured] = useState<Product[]>([]);

  useEffect(() => {
    let cancelled = false;
    getProducts()
      .then((products) => {
        if (!cancelled) {
          setFeatured(pickFeatured(products));
        }
      })
      .catch(() => {
        // Es contenido extra del Inicio: ante un error, simplemente no se muestra.
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (featured.length === 0) {
    return null;
  }

  return (
    <section className="home__featured" aria-labelledby="home-destacados">
      <h2 id="home-destacados">Productos destacados</h2>
      <div className="home__featured-grid">
        {featured.map((product) => (
          <ProductCard key={product.id} product={product} onAdd={addToCart} />
        ))}
      </div>
    </section>
  );
}

function Home() {
  return (
    <div className="home">
      <section className="home__hero">
        <img src={logo} alt="" className="home__logo" />
        {/* El logo ya muestra el nombre: el título queda solo para lectores de pantalla. */}
        <h1 className="home__sr-only">Kiosko El Rápido</h1>
        <div className="home__welcome">
          <Mascota pose="saludando" />
          <p className="home__tagline">
            Bienvenido, todo lo que necesitás en un solo clic
          </p>
        </div>
        <Link to="/products" className="home__cta">
          Ver productos
        </Link>
      </section>

      <nav className="home__banners" aria-label="Atajos por categoría">
        {BANNERS.map((banner) => (
          <HomeBanner key={banner.id} banner={banner} />
        ))}
      </nav>

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

      <FeaturedProducts />

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
