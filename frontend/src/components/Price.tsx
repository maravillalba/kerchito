import type { Product } from '../types';
import {
  discountPercent,
  effectivePrice,
  formatAmount,
  hasOffer,
} from '../utils/pricing';
import './Price.css';

interface PriceProps {
  product: Product;
  size?: 'card' | 'detail';
}

// Precio con el signo $ chico arriba. Con oferta: el normal tachado arriba y el
// de oferta grande. Los lectores de pantalla escuchan "Precio normal" / "Precio de oferta".
function Price({ product, size = 'card' }: PriceProps) {
  const offer = hasOffer(product);
  return (
    <p className={`price price--${size}`}>
      {offer && (
        <del className="price__regular">
          <span className="sr-only">Precio normal: </span>${' '}
          {formatAmount(product.price)}
        </del>
      )}
      <span className="price__current">
        {offer && <span className="sr-only">Precio de oferta: </span>}
        <span className="price__sign">$</span>
        {formatAmount(effectivePrice(product))}
      </span>
    </p>
  );
}

// Etiqueta naranja "-15%" para poner sobre la foto. No se muestra sin oferta.
export function OfferBadge({ product }: { product: Product }) {
  const percent = discountPercent(product);
  if (percent === null) {
    return null;
  }
  return (
    <span className="offer-badge">
      <span aria-hidden="true">-{percent}%</span>
      <span className="sr-only">{percent}% de descuento</span>
    </span>
  );
}

export default Price;
