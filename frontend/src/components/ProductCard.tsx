import { Link } from 'react-router-dom';
import type { Product } from '../types';
import { CATEGORY_LABELS, formatPrice } from '../utils/format';
import './ProductCard.css';

interface ProductCardProps {
  product: Product;
  onAdd?: (product: Product) => void;
}

function ProductCard({ product, onAdd }: ProductCardProps) {
  return (
    <article className="product-card">
      <span className="product-card__category">
        {CATEGORY_LABELS[product.category]}
      </span>
      <h3 className="product-card__name">
        <Link to={`/products/${product.id}`}>{product.name}</Link>
      </h3>
      <p className="product-card__price">{formatPrice(product.price)}</p>
      {product.stock === 0 ? (
        <p className="product-card__stock product-card__stock--out">
          Sin stock
        </p>
      ) : (
        <p className="product-card__stock">Stock: {product.stock}</p>
      )}
      {onAdd && (
        <button
          type="button"
          onClick={() => onAdd(product)}
          disabled={product.stock === 0}
        >
          Agregar al carrito
        </button>
      )}
    </article>
  );
}

export default ProductCard;
