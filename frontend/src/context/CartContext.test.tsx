import { act, renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { Product } from '../types';
import { CartProvider, useCart } from './CartContext';

const coca: Product = {
  id: 1,
  brand: 'Coca-Cola',
  name: 'Original',
  unit: '500 ml',
  category: 'bebidas',
  price: 1200,
  stock: 5,
};

const alfajor: Product = {
  id: 4,
  brand: 'Jorgito',
  name: 'Alfajor',
  unit: '55 g',
  category: 'golosinas_snacks',
  price: 1100,
  stock: 10,
};

function renderCart() {
  return renderHook(() => useCart(), { wrapper: CartProvider });
}

describe('CartContext', () => {
  it('arranca vacío', () => {
    const { result } = renderCart();
    expect(result.current.items).toEqual([]);
    expect(result.current.totalItems).toBe(0);
    expect(result.current.totalPrice).toBe(0);
  });

  it('addToCart agrega un producto', () => {
    const { result } = renderCart();
    act(() => result.current.addToCart(coca, 2));
    expect(result.current.items).toEqual([{ product: coca, quantity: 2 }]);
  });

  it('addToCart usa cantidad 1 por defecto', () => {
    const { result } = renderCart();
    act(() => result.current.addToCart(coca));
    expect(result.current.items[0].quantity).toBe(1);
  });

  it('agregar el mismo producto suma la cantidad', () => {
    const { result } = renderCart();
    act(() => result.current.addToCart(coca, 2));
    act(() => result.current.addToCart(coca, 1));
    expect(result.current.items).toHaveLength(1);
    expect(result.current.items[0].quantity).toBe(3);
  });

  it('la cantidad nunca supera el stock', () => {
    const { result } = renderCart();
    act(() => result.current.addToCart(coca, 10));
    expect(result.current.items[0].quantity).toBe(5);
    act(() => result.current.addToCart(coca, 3));
    expect(result.current.items[0].quantity).toBe(5);
  });

  it('addToCart con un producto sin stock no crea ningún renglón', () => {
    const { result } = renderCart();
    act(() => result.current.addToCart({ ...coca, stock: 0 }));
    expect(result.current.items).toEqual([]);
    expect(result.current.totalItems).toBe(0);
    expect(result.current.totalPrice).toBe(0);
  });

  it('updateQuantity cambia la cantidad sin pasar del stock', () => {
    const { result } = renderCart();
    act(() => result.current.addToCart(coca, 1));
    act(() => result.current.updateQuantity(coca.id, 4));
    expect(result.current.items[0].quantity).toBe(4);
    act(() => result.current.updateQuantity(coca.id, 99));
    expect(result.current.items[0].quantity).toBe(5);
  });

  it('updateQuantity con 0 saca el producto', () => {
    const { result } = renderCart();
    act(() => result.current.addToCart(coca, 2));
    act(() => result.current.updateQuantity(coca.id, 0));
    expect(result.current.items).toEqual([]);
  });

  it('removeFromCart saca solo ese producto', () => {
    const { result } = renderCart();
    act(() => result.current.addToCart(coca, 1));
    act(() => result.current.addToCart(alfajor, 1));
    act(() => result.current.removeFromCart(coca.id));
    expect(result.current.items).toEqual([{ product: alfajor, quantity: 1 }]);
  });

  it('clearCart vacía el carrito', () => {
    const { result } = renderCart();
    act(() => result.current.addToCart(coca, 1));
    act(() => result.current.addToCart(alfajor, 2));
    act(() => result.current.clearCart());
    expect(result.current.items).toEqual([]);
    expect(result.current.totalItems).toBe(0);
    expect(result.current.totalPrice).toBe(0);
  });

  it('calcula totalItems y totalPrice con 2 productos', () => {
    const { result } = renderCart();
    act(() => result.current.addToCart(coca, 2));
    act(() => result.current.addToCart(alfajor, 3));
    expect(result.current.totalItems).toBe(5);
    expect(result.current.totalPrice).toBe(2 * 1200 + 3 * 1100);
  });

  it('totalPrice usa el precio de oferta si el producto tiene offer_price', () => {
    const { result } = renderCart();
    act(() => result.current.addToCart({ ...coca, offer_price: 1000 }, 2));
    act(() => result.current.addToCart(alfajor, 1));
    // Coca en oferta: 2 x 1000 (no 2 x 1200); alfajor sin oferta: 1100.
    expect(result.current.totalPrice).toBe(2 * 1000 + 1100);
  });
});

describe('CartContext.syncStock', () => {
  const leche: Product = {
    id: 5,
    brand: 'La Serenísima',
    name: 'Leche entera',
    unit: '1 L',
    category: 'lacteos',
    price: 1300,
    stock: 20,
  };

  // Carrito con 4 Coca-Cola, 3 alfajores y 2 leches.
  function renderFilledCart() {
    const rendered = renderCart();
    act(() => rendered.result.current.addToCart(coca, 4));
    act(() => rendered.result.current.addToCart(alfajor, 3));
    act(() => rendered.result.current.addToCart(leche, 2));
    return rendered;
  }

  it('baja la cantidad al stock disponible', () => {
    const { result } = renderFilledCart();
    act(() =>
      result.current.syncStock([{ ...coca, stock: 2 }, alfajor, leche]),
    );
    expect(result.current.items[0]).toEqual({
      product: { ...coca, stock: 2 },
      quantity: 2,
    });
  });

  it('quita los productos con stock 0', () => {
    const { result } = renderFilledCart();
    act(() =>
      result.current.syncStock([coca, { ...alfajor, stock: 0 }, leche]),
    );
    expect(result.current.items.map((item) => item.product.id)).toEqual([1, 5]);
  });

  it('quita los productos que ya no existen', () => {
    const { result } = renderFilledCart();
    act(() => result.current.syncStock([coca, leche]));
    expect(result.current.items.map((item) => item.product.id)).toEqual([1, 5]);
  });

  it('deja intactos los productos que siguen con stock suficiente', () => {
    const { result } = renderFilledCart();
    act(() =>
      result.current.syncStock([{ ...coca, stock: 1 }, alfajor, leche]),
    );
    expect(result.current.items.slice(1)).toEqual([
      { product: alfajor, quantity: 3 },
      { product: leche, quantity: 2 },
    ]);
  });

  it('reemplaza el producto por el del backend, con el precio actual', () => {
    const { result } = renderFilledCart();
    act(() =>
      result.current.syncStock([coca, alfajor, { ...leche, price: 1500 }]),
    );
    expect(result.current.items[2].product.price).toBe(1500);
    expect(result.current.totalPrice).toBe(4 * 1200 + 3 * 1100 + 2 * 1500);
  });

  it('actualiza totalItems y totalPrice después de ajustar', () => {
    const { result } = renderFilledCart();
    act(() =>
      result.current.syncStock([
        { ...coca, stock: 1 },
        { ...alfajor, stock: 0 },
      ]),
    );
    expect(result.current.totalItems).toBe(1);
    expect(result.current.totalPrice).toBe(1200);
  });
});
