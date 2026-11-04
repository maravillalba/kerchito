import type { CartItem as CartItemType } from '../types';
import { formatPrice } from '../utils/format';
import './CartItem.css';

interface CartItemProps {
  item: CartItemType;
  onChangeQuantity: (productId: number, quantity: number) => void;
  onRemove: (productId: number) => void;
}

function CartItem({ item, onChangeQuantity, onRemove }: CartItemProps) {
  const { product, quantity } = item;

  const handleDecrease = () => {
    if (quantity <= 1) {
      onRemove(product.id);
    } else {
      onChangeQuantity(product.id, quantity - 1);
    }
  };

  return (
    <li className="cart-item">
      <div className="cart-item__info">
        <h3 className="cart-item__name">{product.name}</h3>
        <p className="cart-item__unit-price">
          {formatPrice(product.price)} c/u
        </p>
      </div>
      <div className="cart-item__quantity">
        <button
          type="button"
          aria-label={`Restar una unidad de ${product.name}`}
          onClick={handleDecrease}
        >
          −
        </button>
        <span aria-live="polite">{quantity}</span>
        <button
          type="button"
          aria-label={`Sumar una unidad de ${product.name}`}
          onClick={() => onChangeQuantity(product.id, quantity + 1)}
          disabled={quantity >= product.stock}
        >
          +
        </button>
      </div>
      <p className="cart-item__subtotal">
        {formatPrice(product.price * quantity)}
      </p>
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
