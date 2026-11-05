import type { Product } from '../types';

// Con menos unidades que esto, el producto se marca para reponer.
export const STOCK_MINIMO = 5;

export function tieneStockBajo(product: Product): boolean {
  return product.stock < STOCK_MINIMO;
}

export function contarStockBajo(products: Product[]): number {
  return products.filter(tieneStockBajo).length;
}
