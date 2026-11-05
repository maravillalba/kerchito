import { Link } from 'react-router-dom';
import type { Product } from '../types';
import Price, { OfferBadge } from './Price';
import ProductImage from './ProductImage';
import './ProductCard.css';

interface ProductCardProps {
  product: Product;
  onAdd?: (product: Product) => void;
}

// Card sin borde ni fondo: la foto se apoya sobre el fondo de la página. El
// bloque de precio + botón va al fondo para que las cards de una fila queden parejas.
function ProductCard({ product, onAdd }: ProductCardProps) {
  return (
    <article className="product-card">
      <div className="product-card__media">
        <ProductImage product={product} size="card" />
        <span className="product-card__badge">
          <OfferBadge product={product} />
        </span>
      </div>
      {/* La marca se ve aparte; dentro del link va solo para lectores de
          pantalla, así el link se anuncia "Coca-Cola Original" y no solo "Original". */}
      <p className="product-card__brand" aria-hidden="true">
        {product.brand}
      </p>
      <h3 className="product-card__name">
        <Link to={`/products/${product.id}`}>
          <span className="sr-only">{product.brand}</span> {product.name}
        </Link>
      </h3>
      <p className="product-card__unit">{product.unit}</p>
      <div className="product-card__bottom">
        <Price product={product} />
        {product.stock === 0 && (
          <p className="product-card__stock product-card__stock--out">
            Sin stock
          </p>
        )}
        {onAdd && (
          <button
            type="button"
            className="product-card__add"
            onClick={() => onAdd(product)}
            disabled={product.stock === 0}
          >
            Agregar al carrito
          </button>
        )}
      </div>
    </article>
  );
}

export default ProductCard;
