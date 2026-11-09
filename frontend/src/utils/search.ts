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

// Todas las palabras de la búsqueda tienen que aparecer en el texto, en cualquier
// orden, sin distinguir mayúsculas ni tildes. Una búsqueda vacía no filtra.
export function matchesWords(text: string, query: string): boolean {
  const normalized = normalizeText(text);
  return normalizeText(query)
    .split(/\s+/)
    .filter(Boolean)
    .every((word) => normalized.includes(word));
}

// Busca en la marca, el nombre y la categoría del producto.
export function matchesSearch(product: Product, query: string): boolean {
  return matchesWords(
    `${product.brand} ${product.name} ${CATEGORY_LABELS[product.category]}`,
    query,
  );
}
