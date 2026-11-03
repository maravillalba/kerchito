import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CartProvider, useCart } from '../context/CartContext';
import { ApiError, getProductById } from '../services/api';
import type { Product } from '../types';
import ProductDetail from './ProductDetail';

vi.mock('../services/api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../services/api')>();
  return { ...actual, getProductById: vi.fn() };
});

function makeProduct(overrides: Partial<Product> = {}): Product {
  return {
    id: 1,
    name: 'Coca-Cola 500ml',
    category: 'bebidas',
    price: 1200,
    stock: 22,
    description: 'Gaseosa clásica',
    image: null,
    ...overrides,
  };
}

function CartCount() {
  const { totalItems } = useCart();
  return <p>Carrito: {totalItems}</p>;
}

function renderDetail(url: string) {
  return render(
    <MemoryRouter initialEntries={[url]}>
      <CartProvider>
        <Routes>
          <Route path="/products/:id" element={<ProductDetail />} />
          <Route path="/products" element={<p>Lista de productos</p>} />
        </Routes>
        <CartCount />
      </CartProvider>
    </MemoryRouter>,
  );
}

describe('ProductDetail', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('muestra "Cargando producto…" mientras espera', () => {
    vi.mocked(getProductById).mockReturnValue(new Promise(() => {}));
    renderDetail('/products/1');
    expect(screen.getByRole('status')).toHaveTextContent(
      'Cargando producto…',
    );
  });

  it('muestra el detalle del producto y pide el id de la URL', async () => {
    vi.mocked(getProductById).mockResolvedValue(makeProduct());
    renderDetail('/products/1');
    expect(
      await screen.findByRole('heading', { name: 'Coca-Cola 500ml' }),
    ).toBeInTheDocument();
    expect(getProductById).toHaveBeenCalledWith(1);
    expect(screen.getByText('Gaseosa clásica')).toBeInTheDocument();
    expect(screen.getByText('Stock disponible: 22')).toBeInTheDocument();
  });

  it('con un 404 muestra "Producto no encontrado" y un enlace', async () => {
    vi.mocked(getProductById).mockRejectedValue(
      new ApiError(404, 'Product 999 not found'),
    );
    renderDetail('/products/999');
    expect(
      await screen.findByRole('heading', { name: 'Producto no encontrado' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: 'Volver a productos' }),
    ).toHaveAttribute('href', '/products');
  });

  it.each(['abc', '1.5', '-3', '0'])(
    'con el id "%s" muestra "no encontrado" sin pedir nada al backend',
    (id) => {
      renderDetail(`/products/${id}`);
      expect(
        screen.getByRole('heading', { name: 'Producto no encontrado' }),
      ).toBeInTheDocument();
      expect(getProductById).not.toHaveBeenCalled();
    },
  );

  it('con error de red muestra el mensaje y "Reintentar" vuelve a pedir', async () => {
    const user = userEvent.setup();
    vi.mocked(getProductById)
      .mockRejectedValueOnce(
        new ApiError(0, 'No se pudo conectar con el servidor.', 'network'),
      )
      .mockResolvedValueOnce(makeProduct());
    renderDetail('/products/1');

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'No se pudo conectar con el servidor.',
    );

    await user.click(screen.getByRole('button', { name: 'Reintentar' }));

    expect(
      await screen.findByRole('heading', { name: 'Coca-Cola 500ml' }),
    ).toBeInTheDocument();
    expect(getProductById).toHaveBeenCalledTimes(2);
  });

  it('ante un error HTTP distinto de 404 muestra un texto en español', async () => {
    vi.mocked(getProductById).mockRejectedValue(
      new ApiError(500, 'Internal server error'),
    );
    renderDetail('/products/1');
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'No se pudo cargar el producto.',
    );
    expect(
      screen.queryByRole('heading', { name: 'Producto no encontrado' }),
    ).not.toBeInTheDocument();
  });

  it('sin stock muestra "Sin stock", sin selector y con el botón deshabilitado', async () => {
    vi.mocked(getProductById).mockResolvedValue(makeProduct({ stock: 0 }));
    renderDetail('/products/1');
    expect(await screen.findByText('Sin stock')).toBeInTheDocument();
    expect(screen.queryByRole('spinbutton')).not.toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Agregar al carrito' }),
    ).toBeDisabled();
  });

  it('agrega la cantidad elegida al carrito', async () => {
    const user = userEvent.setup();
    vi.mocked(getProductById).mockResolvedValue(makeProduct({ stock: 30 }));
    renderDetail('/products/1');
    const input = await screen.findByRole('spinbutton');

    fireEvent.change(input, { target: { value: '5' } });
    await user.click(
      screen.getByRole('button', { name: 'Agregar al carrito' }),
    );

    expect(screen.getByText('Carrito: 5')).toBeInTheDocument();
    expect(screen.getByText('Ya tenés 5 en el carrito.')).toBeInTheDocument();
  });

  it('el selector no pasa del stock disponible', async () => {
    vi.mocked(getProductById).mockResolvedValue(makeProduct({ stock: 3 }));
    renderDetail('/products/1');
    const input = await screen.findByRole('spinbutton');

    fireEvent.change(input, { target: { value: '10' } });

    expect(input).toHaveValue(3);
  });

  it('el tope descuenta lo que ya hay en el carrito', async () => {
    const user = userEvent.setup();
    vi.mocked(getProductById).mockResolvedValue(makeProduct({ stock: 30 }));
    renderDetail('/products/1');
    const input = await screen.findByRole('spinbutton');

    fireEvent.change(input, { target: { value: '25' } });
    await user.click(
      screen.getByRole('button', { name: 'Agregar al carrito' }),
    );

    expect(screen.getByText('Ya tenés 25 en el carrito.')).toBeInTheDocument();
    expect(screen.getByRole('spinbutton')).toHaveAttribute('max', '5');
  });

  it('con todo el stock en el carrito avisa y deshabilita el botón', async () => {
    const user = userEvent.setup();
    vi.mocked(getProductById).mockResolvedValue(makeProduct({ stock: 2 }));
    renderDetail('/products/1');
    const input = await screen.findByRole('spinbutton');

    fireEvent.change(input, { target: { value: '2' } });
    await user.click(
      screen.getByRole('button', { name: 'Agregar al carrito' }),
    );

    expect(
      screen.getByText('Ya agregaste todo el stock disponible.'),
    ).toBeInTheDocument();
    expect(screen.queryByRole('spinbutton')).not.toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Agregar al carrito' }),
    ).toBeDisabled();
  });

  it('"Volver" lleva a /products', async () => {
    const user = userEvent.setup();
    vi.mocked(getProductById).mockResolvedValue(makeProduct());
    renderDetail('/products/1');
    await screen.findByRole('heading', { name: 'Coca-Cola 500ml' });

    await user.click(screen.getByRole('button', { name: 'Volver' }));

    expect(screen.getByText('Lista de productos')).toBeInTheDocument();
  });
});