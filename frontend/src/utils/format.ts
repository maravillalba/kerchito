import type { Category } from '../types';

export const CATEGORY_LABELS: Record<Category, string> = {
  bebidas: 'Bebidas',
  golosinas_snacks: 'Golosinas y snacks',
  lacteos: 'Lácteos',
  almacen: 'Almacén',
  limpieza: 'Limpieza',
  cigarrillos: 'Cigarrillos',
};

export function formatPrice(price: number): string {
  return price.toLocaleString('es-AR', {
    style: 'currency',
    currency: 'ARS',
    maximumFractionDigits: 0,
  });
}
