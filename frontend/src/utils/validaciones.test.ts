import { describe, expect, it } from 'vitest';
import { validarProducto } from './validaciones';
import type { ValoresProducto } from './validaciones';

const VALIDO: ValoresProducto = {
  brand: 'Coca-Cola',
  name: 'Original',
  unit: '500 ml',
  category: 'bebidas',
  price: '1200',
  offer_price: '',
  stock: '25',
};

describe('validarProducto', () => {
  it('sin errores si todo está bien y sin oferta', () => {
    expect(validarProducto(VALIDO)).toEqual({});
  });

  it.each(['brand', 'name', 'unit'] as const)(
    '%s no puede estar vacío ni ser solo espacios',
    (campo) => {
      expect(
        validarProducto({ ...VALIDO, [campo]: '   ' })[campo],
      ).toBeDefined();
    },
  );

  it.each(['', 'bebida', 'toString'])(
    'rechaza la categoría "%s"',
    (category) => {
      expect(validarProducto({ ...VALIDO, category }).category).toBeDefined();
    },
  );

  it.each(['', '0', '-1', 'abc', '1e999'])(
    'rechaza el precio "%s"',
    (price) => {
      expect(validarProducto({ ...VALIDO, price }).price).toBeDefined();
    },
  );

  it('acepta un precio con decimales', () => {
    expect(validarProducto({ ...VALIDO, price: '99.5' })).toEqual({});
  });

  it.each(['1200', '1500'])(
    'rechaza una oferta de %s: no es menor al precio',
    (offer_price) => {
      expect(validarProducto({ ...VALIDO, offer_price }).offer_price).toBe(
        'El precio de oferta debe ser menor al precio.',
      );
    },
  );

  it.each(['0', '-5', 'abc'])('rechaza la oferta "%s"', (offer_price) => {
    expect(validarProducto({ ...VALIDO, offer_price }).offer_price).toBe(
      'El precio de oferta debe ser mayor a 0.',
    );
  });

  it('acepta una oferta menor al precio', () => {
    expect(validarProducto({ ...VALIDO, offer_price: '1199' })).toEqual({});
  });

  it('con un precio inválido, el error va solo en el precio', () => {
    const errores = validarProducto({
      ...VALIDO,
      price: '',
      offer_price: '10',
    });
    expect(errores.price).toBeDefined();
    expect(errores.offer_price).toBeUndefined();
  });

  it.each(['', '-1', '2.5', 'abc'])('rechaza el stock "%s"', (stock) => {
    expect(validarProducto({ ...VALIDO, stock }).stock).toBeDefined();
  });

  it('acepta stock 0', () => {
    expect(validarProducto({ ...VALIDO, stock: '0' })).toEqual({});
  });
});
