import type { Product } from '../types';

// Con menos unidades que esto, el producto se marca para reponer.
export const STOCK_MINIMO = 5;

export type EstadoStock = 'ok' | 'bajo' | 'sin-stock';

export function estadoStock(product: Product): EstadoStock {
  if (product.stock <= 0) {
    return 'sin-stock';
  }
  return product.stock < STOCK_MINIMO ? 'bajo' : 'ok';
}

// "Stock bajo" incluye a los que ya no tienen stock: también hay que reponerlos.
export function tieneStockBajo(product: Product): boolean {
  return estadoStock(product) !== 'ok';
}
