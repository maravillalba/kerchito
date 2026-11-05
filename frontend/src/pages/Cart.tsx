import { useState } from 'react';
import { Link } from 'react-router-dom';
import CartItem from '../components/CartItem';
import ErrorMessage from '../components/ErrorMessage';
import KerButton from '../components/KerButton';
import Mascota from '../components/Mascota';
import { useCart } from '../context/CartContext';
import { useCheckout } from '../hooks/useCheckout';
import { getProducts } from '../services/api';
import type { CartItem as CartItemType, Product } from '../types';
import { formatPrice } from '../utils/format';
import './Cart.css';

// Compara el carrito con el stock actual y cuenta qué se va a ajustar.
function describeStockChanges(
  items: CartItemType[],
  fresh: Product[],
): string | null {
  const changes: string[] = [];
  for (const { product, quantity } of items) {
    const current = fresh.find((p) => p.id === product.id);
    if (!current || current.stock <= 0) {
      changes.push(`"${product.name}" se quitó porque ya no hay stock.`);
    } else if (quantity > current.stock) {
      changes.push(
        `"${product.name}" bajó de ${quantity} a ${current.stock} unidades.`,
      );
    }
  }
  return changes.length > 0 ? changes.join(' ') : null;
}

function Cart() {
  const {
    items,
    updateQuantity,
    removeFromCart,
    clearCart,
    syncStock,
    totalItems,
    totalPrice,
  } = useCart();
  const { submitting, error, success, submit, reset } = useCheckout();
  const [notice, setNotice] = useState<string | null>(null);

  // Trae el stock actual y ajusta el carrito. Si falla, el error del pedido
  // ya está en pantalla y el carrito queda como estaba.
  const refreshStock = async () => {
    try {
      const fresh = await getProducts();
      setNotice(describeStockChanges(items, fresh));
      syncStock(fresh);
    } catch {
      setNotice(null);
    }
  };

  // Solo se vacía el carrito si el backend confirmó el pedido.
  const handleCheckout = async () => {
    setNotice(null);
    const result = await submit(items);
    if (result === 'success') {
      clearCart();
    } else if (result === 'outdated') {
      await refreshStock();
    }
  };

  // Si el usuario cambia el carrito, el error y el aviso anteriores ya no corresponden.
  const clearMessages = () => {
    reset();
    setNotice(null);
  };

  const handleChangeQuantity = (productId: number, quantity: number) => {
    clearMessages();
    updateQuantity(productId, quantity);
  };

  const handleRemove = (productId: number) => {
    clearMessages();
    removeFromCart(productId);
  };

  const handleClear = () => {
    clearMessages();
    clearCart();
  };

  // Va antes que el carrito vacío: después de confirmar, items ya está en 0.
  if (success) {
    return (
      <section className="cart">
        <h1>Carrito</h1>
        <div className="cart__confirmation" role="status">
          <Mascota pose="festejando" />
          <div>
            <p>
              ¡Pedido confirmado! Pedido N° {success.orderId}. Productos:{' '}
              {success.totalItems}. Total: {formatPrice(success.total)}.
            </p>
            <Link to="/products">Seguir comprando</Link>
          </div>
        </div>
      </section>
    );
  }

  if (items.length === 0) {
    return (
      <section className="cart">
        <h1>Carrito</h1>
        {notice && (
          <p className="cart__notice" role="status">
            {notice}
          </p>
        )}
        <div className="cart__empty">
          <Mascota pose="con-productos" />
          <p>Tu carrito está vacío</p>
          <Link to="/products">Ver productos</Link>
        </div>
      </section>
    );
  }

  return (
    <section className="cart">
      <h1>Carrito</h1>
      {/* Escritorio: lista a la izquierda y resumen fijo a la derecha; celular: resumen debajo. */}
      <div className="cart__layout">
        <ul className="cart__list">
          {items.map((item) => (
            <CartItem
              key={item.product.id}
              item={item}
              onChangeQuantity={handleChangeQuantity}
              onRemove={handleRemove}
            />
          ))}
        </ul>
        <aside className="cart__summary" aria-labelledby="cart-resumen">
          <h2 id="cart-resumen">Resumen</h2>
          <p className="cart__count">Productos: {totalItems}</p>
          <p className="cart__total">Total: {formatPrice(totalPrice)}</p>
          {error && <ErrorMessage message={error} onRetry={handleCheckout} />}
          {notice && (
            <p className="cart__notice" role="status">
              {notice}
            </p>
          )}
          <div className="cart__actions">
            <KerButton
              className="cart__checkout"
              onClick={handleCheckout}
              disabled={submitting}
            >
              {submitting ? 'Enviando…' : 'Finalizar pedido'}
            </KerButton>
            <button
              type="button"
              className="cart__clear"
              onClick={handleClear}
              disabled={submitting}
            >
              Vaciar carrito
            </button>
          </div>
        </aside>
      </div>
    </section>
  );
}

export default Cart;
