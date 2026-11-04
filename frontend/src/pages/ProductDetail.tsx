import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import ErrorMessage from '../components/ErrorMessage';
import Loading from '../components/Loading';
import { useCart } from '../context/CartContext';
import { ApiError, getProductById } from '../services/api';
import type { Product } from '../types';
import { CATEGORY_LABELS, formatPrice } from '../utils/format';
import './ProductDetail.css';

// Resultado de un pedido al backend. "key" identifica qué pedido lo produjo:
// si no coincide con el pedido actual, todavía estamos cargando.
type DetailResult =
  | { key: string; status: 'ok'; product: Product }
  | { key: string; status: 'not-found' }
  | { key: string; status: 'error'; message: string };

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

function ProductInfo({ product }: { product: Product }) {
  const navigate = useNavigate();
  const { items, addToCart } = useCart();
  const [quantity, setQuantity] = useState(1);

  // El tope es lo que queda después de lo que ya está en el carrito.
  const inCart =
    items.find((item) => item.product.id === product.id)?.quantity ?? 0;
  const available = Math.max(0, product.stock - inCart);
  const selected = Math.min(quantity, Math.max(available, 1));

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
    <section className="product-detail">
      <button
        type="button"
        className="product-detail__back"
        onClick={() => navigate('/products')}
      >
        Volver
      </button>
      <span className="product-detail__category">
        {CATEGORY_LABELS[product.category]}
      </span>
      <h1>{product.name}</h1>
      {product.description && <p>{product.description}</p>}
      <p className="product-detail__price">{formatPrice(product.price)}</p>
      {product.stock === 0 ? (
        <p className="product-detail__out">Sin stock</p>
      ) : (
        <p>Stock disponible: {product.stock}</p>
      )}
      {inCart > 0 && <p>Ya tenés {inCart} en el carrito.</p>}
      {product.stock > 0 && available === 0 && (
        <p>Ya agregaste todo el stock disponible.</p>
      )}
      {available > 0 && (
        <label className="product-detail__quantity">
          Cantidad
          <input
            type="number"
            min={1}
            max={available}
            value={selected}
            onChange={(e) => handleQuantityChange(e.target.value)}
          />
        </label>
      )}
      <button
        type="button"
        className="product-detail__add"
        onClick={handleAdd}
        disabled={available === 0}
      >
        Agregar al carrito
      </button>
    </section>
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
