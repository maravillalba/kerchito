import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect, vi } from 'vitest';
import App from './App';
import { CartProvider } from './context/CartContext';

// El Inicio pide los productos destacados: sin backend en los tests.
vi.mock('./services/api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./services/api')>();
  return { ...actual, getProducts: vi.fn().mockResolvedValue([]) };
});

describe('App', () => {
  it('muestra el título del kiosko en la ruta /', () => {
    render(
      <MemoryRouter initialEntries={['/']}>
        <CartProvider>
          <App />
        </CartProvider>
      </MemoryRouter>,
    );
    expect(
      screen.getByRole('link', { name: 'Kiosko El Rápido' }),
    ).toBeInTheDocument();
  });

  it('muestra la página 404 en una ruta inexistente', () => {
    render(
      <MemoryRouter initialEntries={['/no-existe']}>
        <CartProvider>
          <App />
        </CartProvider>
      </MemoryRouter>,
    );
    expect(screen.getByText(/Página no encontrada/i)).toBeInTheDocument();
  });
});
