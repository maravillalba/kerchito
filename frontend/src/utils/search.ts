import type { Product } from '../types';
import { CATEGORY_LABELS } from './format';

// Minúsculas y sin tildes: "Lácteos" -> "lacteos", "AZÚCAR" -> "azucar".
export function normalizeText(text: string): string {
  return text
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .trim();
}

// Todas las palabras de la búsqueda tienen que aparecer en la marca, el nombre o
// la categoría del producto, en cualquier orden. Una búsqueda vacía no filtra.
export function matchesSearch(product: Product, query: string): boolean {
  const words = normalizeText(query).split(/\s+/).filter(Boolean);
  if (words.length === 0) {
    return true;
  }
  const text = normalizeText(
    `${product.brand} ${product.name} ${CATEGORY_LABELS[product.category]}`,
  );
  return words.every((word) => text.includes(word));
}
