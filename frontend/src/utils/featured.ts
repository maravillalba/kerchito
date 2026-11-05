import type { Product } from '../types';

// Productos fijos del Inicio, para que la demo se vea siempre igual. Se buscan
// por nombre (sin importar mayúsculas), en el orden del catálogo.
export const FEATURED_NAMES = ['Coca-Cola', 'Alfajor Jorgito', 'Leche entera'];

// Devuelve hasta 3 productos: los de FEATURED_NAMES que existan, y si alguno
// falta, en su lugar va el siguiente producto del catálogo que no esté elegido.
export function pickFeatured(products: Product[]): Product[] {
  const byName = FEATURED_NAMES.map((name) =>
    products.find((p) => p.name.toLowerCase().includes(name.toLowerCase())),
  );

  const used = new Set(
    byName.flatMap((product) => (product ? [product.id] : [])),
  );
  const rest = products.filter((p) => !used.has(p.id));

  return byName
    .map((product) => product ?? rest.shift())
    .filter((product): product is Product => product !== undefined);
}
