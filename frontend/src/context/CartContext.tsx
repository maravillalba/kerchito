import { createContext, useContext, useState } from 'react';
import type { ReactNode } from 'react';
import type { CartItem, Product } from '../types';

interface CartContextValue {
  items: CartItem[];
  addToCart: (product: Product, quantity?: number) => void;
  removeFromCart: (productId: number) => void;
  updateQuantity: (productId: number, quantity: number) => void;
  clearCart: () => void;
  syncStock: (products: Product[]) => void;
  totalItems: number;
  totalPrice: number;
  
}

const CartContext = createContext<CartContextValue | undefined>(undefined);

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);

  const addToCart = (product: Product, quantity: number = 1) => {
    setItems((prev) => {
      const existing = prev.find((item) => item.product.id === product.id);
      if (existing) {
        return prev.map((item) =>
          item.product.id === product.id
            ? {
                ...item,
                quantity: Math.min(item.quantity + quantity, product.stock),
              }
            : item,
        );
      }
      // Sin stock no se crea el renglón (quedaría con cantidad 0).
      if (product.stock <= 0) {
        return prev;
      }
      return [
        ...prev,
        { product, quantity: Math.min(quantity, product.stock) },
      ];
    });
  };

  const removeFromCart = (productId: number) => {
    setItems((prev) => prev.filter((item) => item.product.id !== productId));
  };

  const updateQuantity = (productId: number, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(productId);
      return;
    }
    setItems((prev) =>
      prev.map((item) =>
        item.product.id === productId
          ? { ...item, quantity: Math.min(quantity, item.product.stock) }
          : item,
      ),
    );
  };

  const clearCart = () => setItems([]);

  // Reemplaza el producto de cada ítem por el actual del backend: baja la
  // cantidad al stock real y quita los productos que ya no existen o no tienen stock.
  const syncStock = (fresh: Product[]) => {
    setItems((prev) =>
      prev.flatMap((item) => {
        const current = fresh.find((p) => p.id === item.product.id);
        if (!current || current.stock <= 0) {
          return [];
        }
        return [
          {
            product: current,
            quantity: Math.min(item.quantity, current.stock),
          },
        ];
      }),
    );
  };

  const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);
  const totalPrice = items.reduce(
    (sum, item) => sum + item.product.price * item.quantity,
    0,
  );

  return (
    <CartContext.Provider
      value={{
        items,
        addToCart,
        removeFromCart,
        updateQuantity,
        clearCart,
        syncStock,
        totalItems,
        totalPrice,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useCart() {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error('useCart debe usarse dentro de un <CartProvider>');
  }
  return context;
}
