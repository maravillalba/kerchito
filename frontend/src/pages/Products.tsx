import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import ErrorMessage from '../components/ErrorMessage';
import Loading from '../components/Loading';
import ProductCard from '../components/ProductCard';
import { useCart } from '../context/CartContext';
import { ApiError, getProducts } from '../services/api';
import type { Category, Product } from '../types';
import { CATEGORY_LABELS } from '../utils/format';
import './Products.css';

const CATEGORIES = Object.keys(CATEGORY_LABELS) as Category[];

// Resultado de un pedido al backend. "key" identifica qué pedido lo produjo:
// si no coincide con el pedido actual, todavía estamos cargando.
type ProductsResult =
  | { key: string; products: Product[]; error: null }
  | { key: string; products: null; error: string };

function errorText(err: unknown): string {
  if (err instanceof ApiError && err.kind !== 'http') {
    return err.message;
  }
  return 'No se pudieron cargar los productos.';
}

function Products() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { addToCart } = useCart();
  const categoryParam = searchParams.get('category');
  // Una categoría inválida se ignora: se piden todos los productos sin filtro.
  const selected = CATEGORIES.find((c) => c === categoryParam) ?? null;

  const [reloadCount, setReloadCount] = useState(0);
  const [result, setResult] = useState<ProductsResult | null>(null);
  const requestKey = `${selected ?? ''}|${reloadCount}`;

  useEffect(() => {
    // Si cambia la categoría antes de que llegue la respuesta, se ignora.
    let cancelled = false;
    getProducts(selected ?? undefined)
      .then((products) => {
        if (!cancelled) {
          setResult({ key: requestKey, products, error: null });
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setResult({ key: requestKey, products: null, error: errorText(err) });
        }
      });
    return () => {
      cancelled = true;
    };
  }, [selected, requestKey]);

  const handleFilter = (category: Category | null) => {
    if (category) {
      setSearchParams({ category });
    } else {
      setSearchParams({});
    }
  };

  const renderContent = () => {
    if (result === null || result.key !== requestKey) {
      return <Loading message="Cargando productos…" />;
    }
    if (result.error !== null) {
      return (
        <ErrorMessage
          message={result.error}
          onRetry={() => setReloadCount((n) => n + 1)}
        />
      );
    }
    if (result.products.length === 0) {
      return <p>No hay productos en esta categoría.</p>;
    }
    return (
      <div className="products__grid">
        {result.products.map((product) => (
          <ProductCard key={product.id} product={product} onAdd={addToCart} />
        ))}
      </div>
    );
  };

  return (
    <section>
      <h1>Productos</h1>

      <div className="products__filters">
        <button
          type="button"
          aria-pressed={selected === null}
          onClick={() => handleFilter(null)}
        >
          Todos
        </button>
        {CATEGORIES.map((category) => (
          <button
            key={category}
            type="button"
            aria-pressed={selected === category}
            onClick={() => handleFilter(category)}
          >
            {CATEGORY_LABELS[category]}
          </button>
        ))}
      </div>

      {renderContent()}
    </section>
  );
}

export default Products;
