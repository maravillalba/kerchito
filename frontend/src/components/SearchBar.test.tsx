import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { AuthProvider } from '../context/AuthContext';
import { CartProvider } from '../context/CartContext';
import Header from './Header';

function Ubicacion() {
  const location = useLocation();
  return (
    <p data-testid="ubicacion">
      {location.pathname}
      {location.search}
    </p>
  );
}

function renderHeader(path = '/') {
  const user = userEvent.setup();
  render(
    <MemoryRouter initialEntries={[path]}>
      <AuthProvider>
        <CartProvider>
          <Header />
          <Routes>
            <Route path="*" element={<Ubicacion />} />
          </Routes>
        </CartProvider>
      </AuthProvider>
    </MemoryRouter>,
  );
  return user;
}

const campo = () => screen.getByRole('searchbox', { name: 'Buscar productos' });
const ubicacion = () => screen.getByTestId('ubicacion');

describe('Buscador del Header', () => {
  it('está dentro de un form role="search" con un label accesible', () => {
    renderHeader();
    const form = screen.getByRole('search');
    expect(form).toContainElement(campo());
    expect(campo()).toHaveAttribute('placeholder', 'Buscar productos');
    expect(screen.getByRole('button', { name: 'Buscar' })).toHaveAttribute(
      'type',
      'submit',
    );
  });

  it('con Enter navega a /products?q=<texto>', async () => {
    const user = renderHeader('/');
    await user.type(campo(), 'coca cola{Enter}');
    expect(ubicacion()).toHaveTextContent('/products?q=coca%20cola');
  });

  it('con el botón de la lupa también busca, sin los espacios de los costados', async () => {
    const user = renderHeader('/cart');
    await user.type(campo(), '  yerba  ');
    await user.click(screen.getByRole('button', { name: 'Buscar' }));
    expect(ubicacion()).toHaveTextContent('/products?q=yerba');
  });

  it('una búsqueda vacía lleva a /products sin filtro', async () => {
    const user = renderHeader('/');
    await user.type(campo(), '   {Enter}');
    expect(ubicacion().textContent).toBe('/products');
  });

  it('en /products el campo muestra el texto buscado (?q=)', () => {
    renderHeader('/products?q=leche&category=lacteos');
    expect(campo()).toHaveValue('leche');
  });

  it('fuera de /products el campo arranca vacío', () => {
    renderHeader('/cart?q=leche');
    expect(campo()).toHaveValue('');
  });

  it('después de buscar, el campo conserva el texto', async () => {
    const user = renderHeader('/');
    await user.type(campo(), 'Sprite{Enter}');
    expect(campo()).toHaveValue('Sprite');
  });
});
