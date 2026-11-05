import { useState } from 'react';
import type { Product } from '../types';
import { CATEGORY_ICONS } from '../utils/categoryIcons';
import './ProductImage.css';

interface ProductImageProps {
  product: Product;
  size: 'card' | 'detail' | 'thumb';
}

// Foto del producto si tiene `image`; si no tiene o no carga, la foto de su
// categoría. Es decorativa: el nombre del producto ya está en el texto.
function ProductImage({ product, size }: ProductImageProps) {
  // Guarda qué foto falló, así un producto nuevo vuelve a intentar con la suya.
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  const photo =
    product.image && product.image !== failedSrc ? product.image : null;

  if (photo) {
    return (
      <img
        src={photo}
        alt=""
        className={`product-image product-image--product product-image--${size}`}
        onError={() => setFailedSrc(photo)}
      />
    );
  }

  return (
    <img
      src={CATEGORY_ICONS[product.category]}
      alt=""
      className={`product-image product-image--category product-image--${size}`}
    />
  );
}

export default ProductImage;
