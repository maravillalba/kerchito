import { screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, it, expect, vi } from 'vitest';
import { getMe } from './services/api';
import { guardarSesion, renderApp, usuarioDePrueba } from './test-utils';
import type { Product } from './types';

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
  return {
    ...actual,
    getMe: vi.fn(),
    getProducts: vi.fn(() => Promise.resolve(PRODUCTOS)),
  };
});

describe('App', () => {
  beforeEach(() => {
    // La tienda pide una sesión: estos tests entran como cliente.
    guardarSesion();
    vi.mocked(getMe).mockResolvedValue(usuarioDePrueba());
  });

  it('muestra el título del kiosko en la ruta /', async () => {
    renderApp('/');
    expect(
      screen.getByRole('link', { name: 'Kiosko El Rápido' }),
    ).toBeInTheDocument();
    await waitFor(() => expect(getMe).toHaveBeenCalled());
  });

  it('en / muestra las ofertas con el precio de oferta y el normal tachado', async () => {
    renderApp('/');
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

  it('muestra la página 404 en una ruta inexistente', async () => {
    renderApp('/no-existe');
    expect(screen.getByText(/Página no encontrada/i)).toBeInTheDocument();
    await waitFor(() => expect(getMe).toHaveBeenCalled());
  });
});
