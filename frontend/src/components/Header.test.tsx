import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { guardarSesion, renderApp, rutaActual } from '../test-utils';
import { AuthProvider } from '../context/AuthContext';
import { CartProvider, useCart } from '../context/CartContext';
import type { Product } from '../types';
import Header from './Header';

const coca: Product = {
  id: 1,
  brand: 'Coca-Cola',
  name: 'Original',
  unit: '500 ml',
  category: 'bebidas',
  price: 1200,
  stock: 5,
};

// Botón auxiliar de test: agrega 2 unidades al carrito.
function AddTwo() {
  const { addToCart } = useCart();
  return (
    <button type="button" onClick={() => addToCart(coca, 2)}>
      Agregar de prueba
    </button>
  );
}

function renderHeader(path = '/') {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <AuthProvider>
        <CartProvider>
          <Header />
          <AddTwo />
        </CartProvider>
      </AuthProvider>
    </MemoryRouter>,
  );
}

describe('Header', () => {
  it('muestra los links Inicio, Productos y Carrito', () => {
    renderHeader();
    expect(screen.getByRole('link', { name: 'Inicio' })).toHaveAttribute(
      'href',
      '/',
    );
    expect(screen.getByRole('link', { name: 'Productos' })).toHaveAttribute(
      'href',
      '/products',
    );
    expect(screen.getByRole('link', { name: /Carrito/ })).toHaveAttribute(
      'href',
      '/cart',
    );
  });

  it('el logo es un link a la página de inicio', () => {
    renderHeader('/products');
    expect(
      screen.getByRole('link', { name: 'Kiosko El Rápido' }),
    ).toHaveAttribute('href', '/');
  });

  it('el carrito muestra (N) y se actualiza al agregar un producto', async () => {
    const user = userEvent.setup();
    renderHeader();
    expect(screen.getByRole('link', { name: 'Carrito (0)' })).toBeVisible();
    await user.click(screen.getByRole('button', { name: 'Agregar de prueba' }));
    expect(screen.getByRole('link', { name: 'Carrito (2)' })).toBeVisible();
  });

  it.each([
    ['/', 'Inicio'],
    ['/products', 'Productos'],
    ['/cart', 'Carrito (0)'],
  ])('en %s marca como activo el link %s', (path, activo) => {
    renderHeader(path);
    const links = ['Inicio', 'Productos', 'Carrito (0)'];
    for (const name of links) {
      const link = screen.getByRole('link', { name });
      if (name === activo) {
        expect(link).toHaveAttribute('aria-current', 'page');
        expect(link).toHaveClass('active');
      } else {
        expect(link).not.toHaveAttribute('aria-current');
      }
    }
  });

  it('es fijo arriba (sticky) y el contador del carrito siempre está a la vista', async () => {
    const user = userEvent.setup();
    renderHeader('/products');
    // La clase header--fijo aplica position: sticky; top: 0 (Header.css).
    expect(screen.getByRole('banner')).toHaveClass('header', 'header--fijo');

    const carrito = screen.getByRole('link', { name: 'Carrito (0)' });
    expect(carrito).toBeVisible();
    expect(carrito).toHaveClass('header__cart');
    await user.click(screen.getByRole('button', { name: 'Agregar de prueba' }));
    expect(screen.getByRole('link', { name: 'Carrito (2)' })).toBeVisible();
  });

  it('sin sesión muestra el link Ingresar', () => {
    renderHeader();
    expect(screen.getByRole('link', { name: 'Ingresar' })).toHaveAttribute(
      'href',
      '/login',
    );
    expect(
      screen.queryByRole('button', { name: 'Salir' }),
    ).not.toBeInTheDocument();
  });

  it('con sesión de cliente muestra el nombre y Salir en lugar de Ingresar', () => {
    guardarSesion('cliente', 'Ana');
    renderHeader();
    expect(screen.getByText('Ana')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Salir' })).toBeInTheDocument();
    expect(
      screen.queryByRole('link', { name: 'Ingresar' }),
    ).not.toBeInTheDocument();
  });

  it('Salir cierra la sesión y vuelve a /bienvenida', async () => {
    guardarSesion('cliente');
    const user = renderApp('/cart');
    await user.click(screen.getByRole('button', { name: 'Salir' }));
    expect(rutaActual()).toBe('/bienvenida');
    expect(localStorage.getItem('kiosko.sesion')).toBeNull();
  });

  it('en el detalle de un producto sigue activo Productos', () => {
    renderHeader('/products/1');
    expect(screen.getByRole('link', { name: 'Productos' })).toHaveAttribute(
      'aria-current',
      'page',
    );
    expect(screen.getByRole('link', { name: 'Inicio' })).not.toHaveAttribute(
      'aria-current',
    );
  });
});
