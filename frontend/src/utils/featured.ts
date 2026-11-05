import type { Product } from '../types';

// Productos fijos del Inicio, para que la demo se vea siempre igual. Se buscan
// en marca + nombre (sin importar mayúsculas), en el orden del catálogo.
export const FEATURED_NAMES = ['Coca-Cola', 'Alfajor Jorgito', 'Leche entera'];

// Todas las palabras de la búsqueda tienen que estar en marca + nombre, en
// cualquier orden: "Alfajor Jorgito" encuentra brand "Jorgito" + name "Alfajor".
function matches(product: Product, search: string): boolean {
  const text = `${product.brand} ${product.name}`.toLowerCase();
  return search
    .toLowerCase()
    .split(/\s+/)
    .every((word) => text.includes(word));
}

// Devuelve hasta 3 productos: los de FEATURED_NAMES que existan, y si alguno
// falta, en su lugar va el siguiente producto del catálogo que no esté elegido.
export function pickFeatured(products: Product[]): Product[] {
  const byName = FEATURED_NAMES.map((name) =>
    products.find((p) => matches(p, name)),
  );

  const used = new Set(
    byName.flatMap((product) => (product ? [product.id] : [])),
  );
  const rest = products.filter((p) => !used.has(p.id));

  return byName
    .map((product) => product ?? rest.shift())
    .filter((product): product is Product => product !== undefined);
}
