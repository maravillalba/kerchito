import { act, renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { Product } from '../types';
import { CartProvider, useCart } from './CartContext';

const coca: Product = {
  id: 1,
  name: 'Coca-Cola 500ml',
  category: 'bebidas',
  price: 1200,
  stock: 5,
};

const alfajor: Product = {
  id: 4,
  name: 'Alfajor Jorgito',
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
});
