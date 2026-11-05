import type { Product } from '../types';

// Precio que se cobra: el de oferta si existe, si no el normal (igual que el backend).
export function effectivePrice(product: Product): number {
  return product.offer_price ?? product.price;
}

export function hasOffer(product: Product): boolean {
  return product.offer_price != null && product.offer_price < product.price;
}

// Descuento redondeado a entero ("-15%"), o null si no hay oferta.
export function discountPercent(product: Product): number | null {
  if (!hasOffer(product)) {
    return null;
  }
  return Math.round((1 - effectivePrice(product) / product.price) * 100);
}

// Número sin el signo: 1200 -> "1.200" (el signo $ se muestra aparte).
export function formatAmount(amount: number): string {
  return amount.toLocaleString('es-AR', { maximumFractionDigits: 0 });
}

// Marca + nombre + presentación: "Coca-Cola Original 500 ml".
export function fullName(product: Product): string {
  return `${product.brand} ${product.name} ${product.unit}`;
}
