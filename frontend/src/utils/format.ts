import type { Category, PaymentMethod } from '../types';

export const PAYMENT_LABELS: Record<PaymentMethod, string> = {
  efectivo: 'Efectivo',
  transferencia: 'Transferencia',
  tarjeta: 'Tarjeta',
  mercado_pago: 'Mercado Pago',
};

export const CATEGORY_LABELS: Record<Category, string> = {
  bebidas: 'Bebidas',
  golosinas_snacks: 'Golosinas y snacks',
  lacteos: 'Lácteos',
  almacen: 'Almacén',
  limpieza: 'Limpieza',
  cigarrillos: 'Cigarrillos',
};

// Sin centavos si es un monto entero. Con descuentos puede no serlo, y lo que se
// muestra tiene que ser exactamente lo que se cobra.
export function formatPrice(price: number): string {
  const digitos = Number.isInteger(price) ? 0 : 2;
  return price.toLocaleString('es-AR', {
    style: 'currency',
    currency: 'ARS',
    minimumFractionDigits: digitos,
    maximumFractionDigits: digitos,
  });
}

// "nov 2026": sin el punto que agrega el mes abreviado en español.
export function formatMonthYear(isoDate: string): string {
  const date = new Date(isoDate);
  const month = date.toLocaleDateString('es-AR', { month: 'short' });
  return `${month.replace('.', '')} ${date.getFullYear()}`;
}
