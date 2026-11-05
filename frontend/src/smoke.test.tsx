import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, it, expect, vi } from 'vitest';
import App from './App';
import { AuthProvider } from './context/AuthContext';
import { CartProvider } from './context/CartContext';
import type { Product } from './types';
import { marcarBienvenidaVista } from './utils/primeraVisita';

// El Inicio pide los productos para "Ofertas de la semana": sin backend en los tests.
const PRODUCTOS: Product[] = [
  {
    id: 1,
    brand: 'Coca-Cola',
    name: 'Original',
    unit: '500 ml',
    category: 'bebidas',
    price: 1200,
    offer_price: 1000,
    stock: 25,
    description: 'Gaseosa clásica',
    image: null,
  },
  {
    id: 2,
    brand: 'Villa del Sur',
    name: 'Agua mineral',
    unit: '500 ml',
    category: 'bebidas',
    price: 800,
    offer_price: null,
    stock: 40,
    description: null,
    image: null,
  },
];

vi.mock('./services/api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./services/api')>();
  return { ...actual, getProducts: vi.fn(() => Promise.resolve(PRODUCTOS)) };
});

describe('App', () => {
  // Sin la marca, / redirige a /bienvenida.
  beforeEach(() => {
    marcarBienvenidaVista();
  });

  it('muestra el título del kiosko en la ruta /', () => {
    render(
      <MemoryRouter initialEntries={['/']}>
        <AuthProvider>
          <CartProvider>
            <App />
          </CartProvider>
        </AuthProvider>
      </MemoryRouter>,
    );
    expect(
      screen.getByRole('link', { name: 'Kiosko El Rápido' }),
    ).toBeInTheDocument();
  });

  it('en / muestra las ofertas con el precio de oferta y el normal tachado', async () => {
    render(
      <MemoryRouter initialEntries={['/']}>
        <AuthProvider>
          <CartProvider>
            <App />
          </CartProvider>
        </AuthProvider>
      </MemoryRouter>,
    );
    const section = (
      await screen.findByRole('heading', { name: 'Ofertas de la semana' })
    ).closest('section') as HTMLElement;
    const cards = section.querySelectorAll('article');

    expect(cards).toHaveLength(1);
    expect(cards[0]).toHaveTextContent('Coca-Cola');
    expect(cards[0]).toHaveTextContent('500 ml');
    expect(cards[0]).toHaveTextContent('-17%');
    expect(cards[0].querySelector('del')).toHaveTextContent('$ 1.200');
  });

  it('muestra la página 404 en una ruta inexistente', () => {
    render(
      <MemoryRouter initialEntries={['/no-existe']}>
        <AuthProvider>
          <CartProvider>
            <App />
          </CartProvider>
        </AuthProvider>
      </MemoryRouter>,
    );
    expect(screen.getByText(/Página no encontrada/i)).toBeInTheDocument();
  });
});
