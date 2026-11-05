import { useEffect, useId, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import ErrorMessage from '../components/ErrorMessage';
import KerButton from '../components/KerButton';
import Loading from '../components/Loading';
import { useCart } from '../context/CartContext';
import { ApiError, getProductById, getProducts } from '../services/api';
import type { Product } from '../types';
import ProductImage from '../components/ProductImage';
import Price, { OfferBadge } from '../components/Price';
import { CATEGORY_LABELS } from '../utils/format';
import './ProductDetail.css';

// Resultado de un pedido al backend. "key" identifica qué pedido lo produjo:
// si no coincide con el pedido actual, todavía estamos cargando.
type DetailResult =
  | { key: string; status: 'ok'; product: Product }
  | { key: string; status: 'not-found' }
  | { key: string; status: 'error'; message: string };

// Con 5 unidades o menos se avisa que quedan pocas.
const LOW_STOCK = 5;
// Cuántos productos de la misma categoría se muestran abajo.
const RELATED_LIMIT = 4;

// Solo enteros positivos: "abc", "1.5" o "-3" se tratan como no encontrado.
function parseProductId(id: string | undefined): number | null {
  return id && /^[1-9]\d*$/.test(id) ? Number(id) : null;
}

function errorText(err: unknown): string {
  if (err instanceof ApiError && err.kind !== 'http') {
    return err.message;
  }
  return 'No se pudo cargar el producto.';
}

function ProductNotFound({ id }: { id: string | undefined }) {
  return (
    <section>
      <h1>Producto no encontrado</h1>
      <p>No existe un producto con el id «{id}».</p>
      <Link to="/products">Volver a productos</Link>
    </section>
  );
}

// Punto de color + texto. El color acompaña, pero el texto dice el estado.
function StockIndicator({ stock }: { stock: number }) {
  if (stock === 0) {
    return (
      <p className="product-detail__stock product-detail__stock--out">
        <span className="product-detail__dot" aria-hidden="true" />
        Sin stock
      </p>
    );
  }
  if (stock <= LOW_STOCK) {
    return (
      <p className="product-detail__stock product-detail__stock--low">
        <span className="product-detail__dot" aria-hidden="true" />
        Últimas unidades · {stock}
      </p>
    );
  }
  return (
    <p className="product-detail__stock">
      <span className="product-detail__dot" aria-hidden="true" />
      En stock · {stock} unidades
    </p>
  );
}

// Hasta 4 productos de la misma categoría, sin el actual. Si la carga falla o
// no hay otros, la sección no se muestra.
function RelatedProducts({ product }: { product: Product }) {
  const [related, setRelated] = useState<Product[]>([]);

  useEffect(() => {
    let cancelled = false;
    getProducts(product.category)
      .then((products) => {
        if (!cancelled) {
          setRelated(
            products.filter((p) => p.id !== product.id).slice(0, RELATED_LIMIT),
          );
        }
      })
      .catch(() => {
        // Es información extra: ante un error, simplemente no se muestra.
      });
    return () => {
      cancelled = true;
    };
  }, [product.category, product.id]);

  if (related.length === 0) {
    return null;
  }

  return (
    <section
      className="product-detail__related"
      aria-labelledby="product-detail-related"
    >
      <h2 id="product-detail-related">
        Más de {CATEGORY_LABELS[product.category]}
      </h2>
      <ul className="product-detail__related-list">
        {related.map((item) => (
          <li key={item.id}>
            <Link
              to={`/products/${item.id}`}
              className="product-detail__related-card"
            >
              <span className="product-detail__related-media">
                <ProductImage product={item} size="card" />
                <span className="product-detail__related-badge">
                  <OfferBadge product={item} />
                </span>
              </span>
              <span className="product-detail__related-brand">
                {item.brand}
              </span>
              <span className="product-detail__related-name">{item.name}</span>
              <span className="product-detail__related-unit">{item.unit}</span>
              <Price product={item} />
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

function ProductInfo({ product }: { product: Product }) {
  const navigate = useNavigate();
  const { items, addToCart } = useCart();
  const [quantity, setQuantity] = useState(1);
  const quantityId = useId();

  // El tope es lo que queda después de lo que ya está en el carrito.
  const inCart =
    items.find((item) => item.product.id === product.id)?.quantity ?? 0;
  const available = Math.max(0, product.stock - inCart);
  const selected = Math.min(quantity, Math.max(available, 1));
  const categoryLabel = CATEGORY_LABELS[product.category];

  const handleQuantityChange = (value: string) => {
    const parsed = Number(value);
    if (Number.isNaN(parsed)) return;
    setQuantity(Math.min(Math.max(1, Math.trunc(parsed)), available));
  };

  const handleAdd = () => {
    addToCart(product, selected);
    setQuantity(1);
  };

  return (
    <div className="product-detail">
      <nav className="product-detail__breadcrumb" aria-label="Migas de pan">
        <ol>
          <li>
            {/* La flecha hace lo mismo que el antiguo botón "Volver". */}
            <button
              type="button"
              className="product-detail__back"
              aria-label="Volver"
              onClick={() => navigate('/products')}
            >
              <span aria-hidden="true">←</span>
            </button>
            <Link to="/">Inicio</Link>
          </li>
          <li>
            <Link to="/products">Productos</Link>
          </li>
          <li>
            <Link
              to={`/products?category=${product.category}`}
              className="product-detail__breadcrumb-category"
            >
              {categoryLabel}
            </Link>
          </li>
        </ol>
      </nav>

      <section className="product-detail__card">
        <div className="product-detail__media">
          <ProductImage product={product} size="detail" />
          <span className="product-detail__badge">
            <OfferBadge product={product} />
          </span>
        </div>

        <div className="product-detail__info">
          <span className="product-detail__category">{categoryLabel}</span>
          {/* La marca se ve aparte; dentro del título va solo para lectores de
              pantalla, así el h1 se anuncia "Coca-Cola Original". */}
          <p className="product-detail__brand" aria-hidden="true">
            {product.brand}
          </p>
          <h1 className="product-detail__name">
            <span className="sr-only">{product.brand}</span> {product.name}
          </h1>
          <p className="product-detail__unit">{product.unit}</p>
          {product.description && (
            <p className="product-detail__description">{product.description}</p>
          )}
          <Price product={product} size="detail" />
          <StockIndicator stock={product.stock} />
          {inCart > 0 && (
            <p className="product-detail__in-cart">
              Ya tenés {inCart} en el carrito.
            </p>
          )}
          {product.stock > 0 && available === 0 && (
            <p className="product-detail__in-cart">
              Ya agregaste todo el stock disponible.
            </p>
          )}

          <div className="product-detail__buy">
            {available > 0 && (
              <div className="product-detail__quantity">
                <label htmlFor={quantityId} className="product-detail__sr-only">
                  Cantidad
                </label>
                <button
                  type="button"
                  className="product-detail__step"
                  aria-label="Disminuir cantidad"
                  onClick={() => setQuantity(Math.max(1, selected - 1))}
                  disabled={selected <= 1}
                >
                  <span aria-hidden="true">−</span>
                </button>
                <input
                  id={quantityId}
                  type="number"
                  min={1}
                  max={available}
                  value={selected}
                  onChange={(e) => handleQuantityChange(e.target.value)}
                />
                <button
                  type="button"
                  className="product-detail__step"
                  aria-label="Aumentar cantidad"
                  onClick={() => setQuantity(Math.min(available, selected + 1))}
                  disabled={selected >= available}
                >
                  <span aria-hidden="true">+</span>
                </button>
              </div>
            )}
            <KerButton
              className="product-detail__add"
              onClick={handleAdd}
              disabled={available === 0}
            >
              Agregar al carrito
            </KerButton>
          </div>

          <p className="product-detail__note">
            El stock puede cambiar hasta que confirmes el pedido.
          </p>
        </div>
      </section>

      <RelatedProducts key={product.id} product={product} />
    </div>
  );
}

function ProductDetail() {
  const { id } = useParams();
  const productId = parseProductId(id);

  const [reloadCount, setReloadCount] = useState(0);
  const [result, setResult] = useState<DetailResult | null>(null);
  const requestKey = `${productId}|${reloadCount}`;

  useEffect(() => {
    if (productId === null) return;
    // Si cambia el id antes de que llegue la respuesta, se ignora.
    let cancelled = false;
    getProductById(productId)
      .then((product) => {
        if (!cancelled) {
          setResult({ key: requestKey, status: 'ok', product });
        }
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        if (err instanceof ApiError && err.status === 404) {
          setResult({ key: requestKey, status: 'not-found' });
        } else {
          setResult({
            key: requestKey,
            status: 'error',
            message: errorText(err),
          });
        }
      });
    return () => {
      cancelled = true;
    };
  }, [productId, requestKey]);

  if (productId === null) {
    return <ProductNotFound id={id} />;
  }
  if (result === null || result.key !== requestKey) {
    return <Loading message="Cargando producto…" />;
  }
  if (result.status === 'not-found') {
    return <ProductNotFound id={id} />;
  }
  if (result.status === 'error') {
    return (
      <ErrorMessage
        message={result.message}
        onRetry={() => setReloadCount((n) => n + 1)}
      />
    );
  }
  // key: al pasar a otro producto, la cantidad vuelve a 1.
  return <ProductInfo key={result.product.id} product={result.product} />;
}

export default ProductDetail;
