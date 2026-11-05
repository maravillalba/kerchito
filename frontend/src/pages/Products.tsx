import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import ErrorMessage from '../components/ErrorMessage';
import Loading from '../components/Loading';
import Mascota from '../components/Mascota';
import ProductCard from '../components/ProductCard';
import { useCart } from '../context/CartContext';
import { ApiError, getProducts } from '../services/api';
import type { Category, Product } from '../types';
import { CATEGORY_LABELS } from '../utils/format';
import {
  DEFAULT_SORT,
  SORT_OPTIONS,
  parseSortOrder,
  sortProducts,
} from '../utils/sort';
import type { SortOrder } from '../utils/sort';
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
  // El orden se guarda en ?orden=; un valor desconocido usa el orden por defecto.
  const order = parseSortOrder(searchParams.get('orden'));

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

  // Cambia un parámetro de la URL y conserva el resto (categoría y orden van juntos).
  const updateParam = (name: string, value: string | null) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      if (value) {
        next.set(name, value);
      } else {
        next.delete(name);
      }
      return next;
    });
  };

  const handleFilter = (category: Category | null) => {
    updateParam('category', category);
  };

  const handleSort = (value: SortOrder) => {
    updateParam('orden', value === DEFAULT_SORT ? null : value);
  };

  const loaded =
    result !== null && result.key === requestKey && result.error === null
      ? result.products
      : null;

  // "54 productos disponibles"; vacío mientras carga o si hubo un error.
  const countText = () => {
    if (loaded === null) return '';
    return loaded.length === 1
      ? '1 producto disponible'
      : `${loaded.length} productos disponibles`;
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
      return (
        <div className="products__empty">
          <Mascota pose="triste" />
          <p>No hay productos en esta categoría.</p>
        </div>
      );
    }
    return (
      <div className="products__grid">
        {sortProducts(result.products, order).map((product) => (
          <ProductCard key={product.id} product={product} onAdd={addToCart} />
        ))}
      </div>
    );
  };

  return (
    <section>
      <h1 className="products__title">Productos</h1>
      <p className="products__count" aria-live="polite">
        {countText()}
      </p>

      <div className="products__toolbar">
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

        <div className="products__sort">
          <label htmlFor="products-orden">Ordenar por</label>
          <select
            id="products-orden"
            value={order}
            onChange={(e) => handleSort(e.target.value as SortOrder)}
          >
            {SORT_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {renderContent()}
    </section>
  );
}

export default Products;
