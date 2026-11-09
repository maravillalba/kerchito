import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import CartItem from '../components/CartItem';
import ErrorMessage from '../components/ErrorMessage';
import KerButton from '../components/KerButton';
import Mascota from '../components/Mascota';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { useCheckout } from '../hooks/useCheckout';
import { getProducts } from '../services/api';
import type {
  CartItem as CartItemType,
  PaymentMethod,
  Product,
} from '../types';
import {
  formatMonthYear,
  formatPrice,
  initials,
  PAYMENT_LABELS,
} from '../utils/format';
import {
  calcularResumen,
  DESCUENTO_PRIMERA_COMPRA,
  PESOS_POR_BLOQUE,
  PUNTOS_POR_BLOQUE,
} from '../utils/puntos';
import './Cart.css';

const MEDIOS_DE_PAGO: { value: PaymentMethod; icono: string }[] = [
  { value: 'efectivo', icono: '💵' },
  { value: 'transferencia', icono: '🔁' },
  { value: 'tarjeta', icono: '💳' },
  { value: 'mercado_pago', icono: '📱' },
];

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

// Por qué no se puede usar el interruptor de puntos todavía.
function motivoSinCanje(saldo: number) {
  return saldo < PUNTOS_POR_BLOQUE
    ? `Te faltan ${PUNTOS_POR_BLOQUE - saldo} puntos para tu primer canje.`
    : `Tu compra tiene que llegar a ${formatPrice(PESOS_POR_BLOQUE)} para canjear.`;
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
  const { usuario, refrescarUsuario, actualizarSaldo } = useAuth();
  const { submitting, error, success, submit, reset } = useCheckout((order) =>
    actualizarSaldo(order.points_balance),
  );
  const [notice, setNotice] = useState<string | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('efectivo');
  const [usePoints, setUsePoints] = useState(false);

  // El admin pudo ajustar los puntos o anular un pedido desde que se abrió la app.
  useEffect(() => {
    void refrescarUsuario();
  }, [refrescarUsuario]);

  const esCliente = usuario?.role === 'customer';
  const saldo = esCliente ? usuario.points : 0;
  const primeraCompra = esCliente && usuario.first_purchase_available;

  // Vista previa con las mismas reglas del backend. Lo oficial es lo que él devuelve.
  const puedeCanjear =
    calcularResumen(totalPrice, primeraCompra, saldo, true).puntosUsados > 0;
  const usandoPuntos = usePoints && puedeCanjear;
  const resumen = calcularResumen(
    totalPrice,
    primeraCompra,
    saldo,
    usandoPuntos,
  );

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
    const result = await submit(items, {
      paymentMethod,
      usePoints: usandoPuntos,
    });
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
            <p>
              Sumaste +{success.pointsEarned} puntos. Tu saldo:{' '}
              {success.pointsBalance} puntos.
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
          <h2 id="cart-resumen">
            <span aria-hidden="true">🛒</span> Resumen
          </h2>

          {esCliente && (
            <div>
              <h3 className="cart__section-title">Cliente</h3>
              <div className="cart__customer">
                <span className="cart__initials" aria-hidden="true">
                  {initials(usuario)}
                </span>
                <div className="cart__customer-data">
                  <p className="cart__customer-name">
                    {usuario.first_name} {usuario.last_name}
                  </p>
                  <p className="cart__customer-since">
                    Cliente desde {formatMonthYear(usuario.created_at)}
                  </p>
                </div>
                <p className="cart__customer-points">{saldo} pts</p>
              </div>
            </div>
          )}

          {esCliente && (
            <fieldset className="cart__payment" disabled={submitting}>
              <legend className="cart__section-title">Medio de pago</legend>
              <div className="cart__payment-options">
                {MEDIOS_DE_PAGO.map(({ value, icono }) => (
                  <label key={value} className="cart__payment-option">
                    <input
                      type="radio"
                      name="medio-de-pago"
                      value={value}
                      checked={paymentMethod === value}
                      onChange={() => setPaymentMethod(value)}
                    />
                    <span className="cart__payment-card">
                      <span aria-hidden="true">{icono}</span>
                      {PAYMENT_LABELS[value]}
                    </span>
                  </label>
                ))}
              </div>
            </fieldset>
          )}

          <p className="cart__row">
            <span>
              Subtotal ({totalItems}{' '}
              {totalItems === 1 ? 'producto' : 'productos'})
            </span>
            <strong>{formatPrice(resumen.subtotal)}</strong>
          </p>

          {resumen.descuentoPrimeraCompra > 0 && (
            <p className="cart__row cart__row--discount">
              <span>
                <span aria-hidden="true">🎁</span> Descuento 1ª compra (
                {DESCUENTO_PRIMERA_COMPRA}%)
              </span>
              <strong>− {formatPrice(resumen.descuentoPrimeraCompra)}</strong>
            </p>
          )}

          {esCliente && (
            <label className="cart__points">
              <span className="cart__points-text">
                <span className="cart__points-title">Usar mis puntos</span>
                <span className="cart__points-hint">
                  {puedeCanjear
                    ? `${PUNTOS_POR_BLOQUE} pts = ${formatPrice(PESOS_POR_BLOQUE)} de descuento`
                    : motivoSinCanje(saldo)}
                </span>
              </span>
              <input
                type="checkbox"
                role="switch"
                className="cart__switch"
                checked={usandoPuntos}
                disabled={!puedeCanjear || submitting}
                onChange={(event) => setUsePoints(event.target.checked)}
              />
            </label>
          )}

          {resumen.descuentoPuntos > 0 && (
            <p className="cart__row cart__row--discount">
              <span>
                <span aria-hidden="true">⭐</span> Canje de{' '}
                {resumen.puntosUsados} puntos
              </span>
              <strong>− {formatPrice(resumen.descuentoPuntos)}</strong>
            </p>
          )}

          <p className="cart__total">
            <span>Total</span>
            <span className="cart__total-amount">
              {formatPrice(resumen.total)}
            </span>
          </p>

          {esCliente && resumen.puntosGanados > 0 && (
            <p className="cart__earn">
              <span aria-hidden="true">⭐</span> Con esta compra sumás{' '}
              <strong>+{resumen.puntosGanados} puntos</strong>
            </p>
          )}

          {error && <ErrorMessage message={error} onRetry={handleCheckout} />}
          {notice && (
            <p className="cart__notice" role="status">
              {notice}
            </p>
          )}

          {!esCliente && (
            <p className="cart__notice">
              {usuario ? (
                'Los pedidos se hacen desde una cuenta de cliente.'
              ) : (
                <>
                  Para finalizar el pedido, <Link to="/ingresar">ingresá</Link>{' '}
                  o <Link to="/registro">creá tu cuenta</Link>.
                </>
              )}
            </p>
          )}

          <div className="cart__actions">
            {esCliente && (
              <KerButton
                className="cart__checkout"
                onClick={handleCheckout}
                disabled={submitting}
              >
                {submitting ? 'Enviando…' : 'Finalizar pedido'}
              </KerButton>
            )}
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
