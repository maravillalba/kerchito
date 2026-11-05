import type { Product } from '../types';
import { discountPercent, hasOffer } from './pricing';

// Productos para "Ofertas de la semana" del Inicio: los que tienen offer_price,
// del mayor descuento al menor (a igual descuento, en el orden del catálogo).
export function getOfertas(products: Product[], limit = 3): Product[] {
  return products
    .filter(hasOffer)
    .sort((a, b) => (discountPercent(b) ?? 0) - (discountPercent(a) ?? 0))
    .slice(0, limit);
}
