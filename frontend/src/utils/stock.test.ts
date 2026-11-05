import { describe, expect, it } from 'vitest';
import type { Product } from '../types';
import { contarStockBajo, tieneStockBajo } from './stock';

function conStock(stock: number): Product {
  return {
    id: stock,
    brand: 'Marca',
    name: 'Producto',
    unit: '1 u.',
    category: 'almacen',
    price: 100,
    stock,
  };
}

describe('stock bajo', () => {
  it.each([
    [0, true],
    [4, true],
    [5, false],
    [40, false],
  ])('con %i unidades: %s', (stock, esperado) => {
    expect(tieneStockBajo(conStock(stock))).toBe(esperado);
  });

  it('cuenta solo los productos con menos de 5', () => {
    expect(contarStockBajo([0, 3, 4, 5, 25].map(conStock))).toBe(3);
  });

  it('sin productos da 0', () => {
    expect(contarStockBajo([])).toBe(0);
  });
});
