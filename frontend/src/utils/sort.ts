import type { Product } from '../types';
import { effectivePrice } from './pricing';

// Valores del parámetro ?orden= de /products. "relevancia" es el orden del backend.
export const SORT_OPTIONS = [
  { value: 'relevancia', label: 'Relevancia' },
  { value: 'precio-asc', label: 'Precio: menor a mayor' },
  { value: 'precio-desc', label: 'Precio: mayor a menor' },
  { value: 'nombre', label: 'Nombre A–Z' },
] as const;

export type SortOrder = (typeof SORT_OPTIONS)[number]['value'];

export const DEFAULT_SORT: SortOrder = 'relevancia';

// Un valor desconocido en la URL se trata como el orden por defecto.
export function parseSortOrder(value: string | null): SortOrder {
  return (
    SORT_OPTIONS.find((option) => option.value === value)?.value ?? DEFAULT_SORT
  );
}

const byName = (a: Product, b: Product) =>
  a.name.localeCompare(b.name, 'es', { sensitivity: 'base' }) ||
  a.brand.localeCompare(b.brand, 'es', { sensitivity: 'base' });

// Devuelve una copia ordenada. Los precios usan el precio efectivo (oferta si hay);
// ante un empate se mantiene el orden original (sort es estable).
export function sortProducts(products: Product[], order: SortOrder): Product[] {
  const copy = [...products];
  switch (order) {
    case 'precio-asc':
      return copy.sort((a, b) => effectivePrice(a) - effectivePrice(b));
    case 'precio-desc':
      return copy.sort((a, b) => effectivePrice(b) - effectivePrice(a));
    case 'nombre':
      return copy.sort(byName);
    default:
      return copy;
  }
}
