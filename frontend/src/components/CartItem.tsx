import type { CartItem as CartItemType } from '../types';
import { formatPrice } from '../utils/format';
import { effectivePrice, fullName, hasOffer } from '../utils/pricing';
import ProductImage from './ProductImage';
import './CartItem.css';

interface CartItemProps {
  item: CartItemType;
  onChangeQuantity: (productId: number, quantity: number) => void;
  onRemove: (productId: number) => void;
}

function CartItem({ item, onChangeQuantity, onRemove }: CartItemProps) {
  const { product, quantity } = item;
  // Se cobra el precio efectivo: el de oferta si existe (igual que el backend).
  const unitPrice = effectivePrice(product);
  const label = fullName(product);

  const handleDecrease = () => {
    if (quantity <= 1) {
      onRemove(product.id);
    } else {
      onChangeQuantity(product.id, quantity - 1);
    }
  };

  return (
    <li className="cart-item">
      {/* Foto decorativa (alt=""): el nombre del producto ya está en el texto. */}
      <div className="cart-item__thumb">
        <ProductImage product={product} size="thumb" />
      </div>
      <div className="cart-item__info">
        <p className="cart-item__brand">{product.brand}</p>
        <h3 className="cart-item__name">{product.name}</h3>
        <p className="cart-item__unit">{product.unit}</p>
        <p className="cart-item__unit-price">
          {hasOffer(product) && (
            <del className="cart-item__regular">
              <span className="sr-only">Precio normal: </span>
              {formatPrice(product.price)}
            </del>
          )}{' '}
          {formatPrice(unitPrice)} c/u
        </p>
      </div>
      <div className="cart-item__quantity">
        <button
          type="button"
          aria-label={`Restar una unidad de ${label}`}
          onClick={handleDecrease}
        >
          −
        </button>
        <span aria-live="polite">{quantity}</span>
        <button
          type="button"
          aria-label={`Sumar una unidad de ${label}`}
          onClick={() => onChangeQuantity(product.id, quantity + 1)}
          disabled={quantity >= product.stock}
        >
          +
        </button>
      </div>
      <p className="cart-item__subtotal">{formatPrice(unitPrice * quantity)}</p>
      <button
        type="button"
        className="cart-item__remove"
        onClick={() => onRemove(product.id)}
      >
        Quitar
      </button>
    </li>
  );
}

export default CartItem;
