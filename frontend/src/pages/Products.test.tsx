import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CartProvider, useCart } from '../context/CartContext';
import { ApiError, getProducts } from '../services/api';
import type { Product } from '../types';
import Products from './Products';

vi.mock('../services/api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../services/api')>();
  return { ...actual, getProducts: vi.fn() };
});

const coca: Product = {
  id: 1,
  name: 'Coca-Cola 500ml',
  category: 'bebidas',
  price: 1200,
  stock: 25,
  description: null,
  image: null,
};
const yogur: Product = {
  id: 2,
  name: 'Yogur frutilla',
  category: 'lacteos',
  price: 900,
  stock: 10,
  description: null,
  image: null,
};
const lavandina: Product = {
  id: 3,
  name: 'Lavandina 1L',
  category: 'limpieza',
  price: 900,
  stock: 0,
  description: null,
  image: null,
};

function CartCount() {
  const { totalItems } = useCart();
  return <p>Carrito: {totalItems}</p>;
}

function renderProducts(url = '/products') {
  return render(
    <MemoryRouter initialEntries={[url]}>
      <CartProvider>
        <Products />
        <CartCount />
      </CartProvider>
    </MemoryRouter>,
  );
}

describe('Products', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('muestra "Cargando productos…" mientras espera la respuesta', () => {
    vi.mocked(getProducts).mockReturnValue(new Promise(() => {}));
    renderProducts();
    expect(screen.getByRole('status')).toHaveTextContent(
      'Cargando productos…',
    );
  });

  it('muestra los productos y pide la lista sin filtro', async () => {
    vi.mocked(getProducts).mockResolvedValue([coca, yogur]);
    renderProducts();
    expect(await screen.findByText('Coca-Cola 500ml')).toBeInTheDocument();
    expect(screen.getByText('Yogur frutilla')).toBeInTheDocument();
    expect(getProducts).toHaveBeenCalledWith(undefined);
    expect(screen.getByRole('button', { name: 'Todos' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
  });

  it('con ?category=bebidas pide al backend esa categoría', async () => {
    vi.mocked(getProducts).mockResolvedValue([coca]);
    renderProducts('/products?category=bebidas');
    expect(await screen.findByText('Coca-Cola 500ml')).toBeInTheDocument();
    expect(getProducts).toHaveBeenCalledWith('bebidas');
    expect(screen.getByRole('button', { name: /bebidas/i })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
  });

  it('al tocar un filtro pide esa categoría al backend', async () => {
    const user = userEvent.setup();
    vi.mocked(getProducts).mockResolvedValue([coca, yogur]);
    renderProducts();
    await screen.findByText('Coca-Cola 500ml');

    vi.mocked(getProducts).mockResolvedValue([coca]);
    await user.click(screen.getByRole('button', { name: /bebidas/i }));

    await waitFor(() => expect(getProducts).toHaveBeenCalledWith('bebidas'));
    expect(screen.getByRole('button', { name: /bebidas/i })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    await waitFor(() =>
      expect(screen.queryByText('Yogur frutilla')).not.toBeInTheDocument(),
    );
  });

  it('con una categoría inválida pide todos y deja "Todos" marcado', async () => {
    vi.mocked(getProducts).mockResolvedValue([coca, yogur]);
    renderProducts('/products?category=xyz');
    await screen.findByText('Coca-Cola 500ml');
    expect(getProducts).toHaveBeenCalledWith(undefined);
    expect(getProducts).not.toHaveBeenCalledWith('xyz');
    expect(screen.getByRole('button', { name: 'Todos' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
  });

  it('muestra un mensaje si la lista viene vacía', async () => {
    vi.mocked(getProducts).mockResolvedValue([]);
    renderProducts();
    expect(
      await screen.findByText('No hay productos en esta categoría.'),
    ).toBeInTheDocument();
  });

  it('muestra el error de red con "Reintentar" y vuelve a pedir', async () => {
    const user = userEvent.setup();
    vi.mocked(getProducts)
      .mockRejectedValueOnce(
        new ApiError(0, 'No se pudo conectar con el servidor.', 'network'),
      )
      .mockResolvedValueOnce([coca]);
    renderProducts();

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'No se pudo conectar con el servidor.',
    );

    await user.click(screen.getByRole('button', { name: 'Reintentar' }));

    expect(await screen.findByText('Coca-Cola 500ml')).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(getProducts).toHaveBeenCalledTimes(2);
  });

  it('ante un error HTTP muestra un texto en español, no el detail', async () => {
    vi.mocked(getProducts).mockRejectedValue(
      new ApiError(500, 'Internal server error'),
    );
    renderProducts();
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'No se pudieron cargar los productos.',
    );
    expect(screen.queryByText(/Internal server error/)).not.toBeInTheDocument();
  });

  it('un producto sin stock muestra "Sin stock" y su botón está deshabilitado', async () => {
    vi.mocked(getProducts).mockResolvedValue([lavandina]);
    renderProducts();
    expect(await screen.findByText('Sin stock')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Agregar al carrito' }),
    ).toBeDisabled();
  });

  it('"Agregar al carrito" suma el producto al carrito', async () => {
    const user = userEvent.setup();
    vi.mocked(getProducts).mockResolvedValue([coca]);
    renderProducts();
    await screen.findByText('Coca-Cola 500ml');

    await user.click(
      screen.getByRole('button', { name: 'Agregar al carrito' }),
    );

    expect(screen.getByText('Carrito: 1')).toBeInTheDocument();
  });

  it('cada producto enlaza a su detalle', async () => {
    vi.mocked(getProducts).mockResolvedValue([coca]);
    renderProducts();
    const link = await screen.findByRole('link', { name: 'Coca-Cola 500ml' });
    expect(link).toHaveAttribute('href', '/products/1');
  });
});
