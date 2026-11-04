import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect } from 'vitest';
import App from './App';
import { CartProvider } from './context/CartContext';

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
