import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CartProvider, useCart } from '../context/CartContext';
import { ApiError, getProductById, getProducts } from '../services/api';
import type { Product } from '../types';
import ProductDetail from './ProductDetail';

vi.mock('../services/api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../services/api')>();
  return { ...actual, getProductById: vi.fn(), getProducts: vi.fn() };
});

function makeProduct(overrides: Partial<Product> = {}): Product {
  return {
    id: 1,
    brand: 'Coca-Cola',
    name: 'Original',
    unit: '500 ml',
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
    // Por defecto no hay otros productos de la categoría.
    vi.mocked(getProducts).mockResolvedValue([]);
  });

  it('muestra "Cargando producto…" mientras espera', () => {
    vi.mocked(getProductById).mockReturnValue(new Promise(() => {}));
    renderDetail('/products/1');
    expect(screen.getByRole('status')).toHaveTextContent('Cargando producto…');
  });

  it('muestra el detalle del producto y pide el id de la URL', async () => {
    vi.mocked(getProductById).mockResolvedValue(makeProduct());
    renderDetail('/products/1');
    expect(
      await screen.findByRole('heading', { name: 'Coca-Cola Original' }),
    ).toBeInTheDocument();
    expect(getProductById).toHaveBeenCalledWith(1);
    expect(screen.getByText('Gaseosa clásica')).toBeInTheDocument();
    expect(screen.getByText('En stock · 22 unidades')).toBeInTheDocument();
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
      await screen.findByRole('heading', { name: 'Coca-Cola Original' }),
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
    await screen.findByRole('heading', { name: 'Coca-Cola Original' });

    await user.click(screen.getByRole('button', { name: 'Volver' }));

    expect(screen.getByText('Lista de productos')).toBeInTheDocument();
  });

  describe('indicador de stock', () => {
    it.each([
      [22, 'En stock · 22 unidades', ''],
      [6, 'En stock · 6 unidades', ''],
      [5, 'Últimas unidades · 5', 'product-detail__stock--low'],
      [1, 'Últimas unidades · 1', 'product-detail__stock--low'],
      [0, 'Sin stock', 'product-detail__stock--out'],
    ])('con stock %i muestra "%s"', async (stock, text, modifier) => {
      vi.mocked(getProductById).mockResolvedValue(makeProduct({ stock }));
      renderDetail('/products/1');

      const indicator = await screen.findByText(text);
      expect(indicator).toHaveClass('product-detail__stock');
      if (modifier) {
        expect(indicator).toHaveClass(modifier);
      } else {
        expect(indicator).not.toHaveClass(
          'product-detail__stock--low',
          'product-detail__stock--out',
        );
      }
    });
  });

  describe('selector de cantidad', () => {
    it('la etiqueta "Cantidad" sigue asociada al campo', async () => {
      vi.mocked(getProductById).mockResolvedValue(makeProduct());
      renderDetail('/products/1');
      expect(await screen.findByLabelText('Cantidad')).toHaveValue(1);
    });

    it('"−" no baja de 1 y "+" no pasa del stock disponible', async () => {
      const user = userEvent.setup();
      vi.mocked(getProductById).mockResolvedValue(makeProduct({ stock: 3 }));
      renderDetail('/products/1');
      const input = await screen.findByRole('spinbutton');
      const minus = screen.getByRole('button', { name: 'Disminuir cantidad' });
      const plus = screen.getByRole('button', { name: 'Aumentar cantidad' });

      expect(input).toHaveValue(1);
      expect(minus).toBeDisabled();

      await user.click(plus);
      await user.click(plus);
      expect(input).toHaveValue(3);
      expect(plus).toBeDisabled();
      expect(minus).toBeEnabled();

      await user.click(minus);
      expect(input).toHaveValue(2);
    });

    it('"+" respeta lo que ya está en el carrito y agrega lo elegido', async () => {
      const user = userEvent.setup();
      vi.mocked(getProductById).mockResolvedValue(makeProduct({ stock: 4 }));
      renderDetail('/products/1');
      const plus = await screen.findByRole('button', {
        name: 'Aumentar cantidad',
      });

      await user.click(plus);
      await user.click(
        screen.getByRole('button', { name: 'Agregar al carrito' }),
      );
      expect(screen.getByText('Carrito: 2')).toBeInTheDocument();

      // Quedan 2 disponibles: el "+" se frena en 2.
      await user.click(plus);
      expect(screen.getByRole('spinbutton')).toHaveValue(2);
      expect(plus).toBeDisabled();
    });
  });

  describe('sección "Más de…"', () => {
    it('muestra hasta 4 productos de la categoría, sin el actual', async () => {
      vi.mocked(getProductById).mockResolvedValue(makeProduct());
      vi.mocked(getProducts).mockResolvedValue([
        makeProduct(),
        makeProduct({ id: 2, name: 'Sprite 500ml', price: 1100 }),
        makeProduct({ id: 3, name: 'Fanta 500ml' }),
        makeProduct({ id: 4, name: 'Agua 500ml' }),
        makeProduct({ id: 5, name: 'Soda 1,5L' }),
        makeProduct({ id: 6, name: 'Jugo 1L' }),
      ]);
      renderDetail('/products/1');

      const section = await screen.findByRole('region', {
        name: 'Más de Bebidas',
      });
      expect(getProducts).toHaveBeenCalledWith('bebidas');

      const links = within(section).getAllByRole('link');
      expect(links).toHaveLength(4);
      expect(within(section).queryByText('Original')).not.toBeInTheDocument();
      expect(links[0]).toHaveAttribute('href', '/products/2');
      expect(links[0]).toHaveTextContent('Sprite 500ml');
      expect(links[0]).toHaveTextContent('$');
      // Sin foto propia, usa la de la categoría (ProductImage).
      expect(links[0].querySelector('img')).toHaveClass(
        'product-image--category',
      );
    });

    it('no se muestra si no hay otros productos de la categoría', async () => {
      vi.mocked(getProductById).mockResolvedValue(makeProduct());
      vi.mocked(getProducts).mockResolvedValue([makeProduct()]);
      renderDetail('/products/1');

      await screen.findByRole('heading', { name: 'Coca-Cola Original' });
      await waitFor(() => expect(getProducts).toHaveBeenCalled());
      expect(screen.queryByText(/Más de/)).not.toBeInTheDocument();
    });

    it('si falla la carga no se muestra ni aparece un error', async () => {
      vi.mocked(getProductById).mockResolvedValue(makeProduct());
      vi.mocked(getProducts).mockRejectedValue(
        new ApiError(0, 'No se pudo conectar con el servidor.', 'network'),
      );
      renderDetail('/products/1');

      await screen.findByRole('heading', { name: 'Coca-Cola Original' });
      await waitFor(() => expect(getProducts).toHaveBeenCalled());
      expect(screen.queryByText(/Más de/)).not.toBeInTheDocument();
      expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    });
  });
});
