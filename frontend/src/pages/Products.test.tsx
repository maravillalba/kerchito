import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, useLocation } from 'react-router-dom';
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
  brand: 'Coca-Cola',
  name: 'Original',
  unit: '500 ml',
  category: 'bebidas',
  price: 1200,
  stock: 25,
  description: null,
  image: null,
};
const yogur: Product = {
  id: 2,
  brand: 'La Serenísima',
  name: 'Yogur frutilla',
  unit: '1 u.',
  category: 'lacteos',
  price: 900,
  stock: 10,
  description: null,
  image: null,
};
const lavandina: Product = {
  id: 3,
  brand: 'Ayudín',
  name: 'Lavandina',
  unit: '1 L',
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
    expect(screen.getByRole('status')).toHaveTextContent('Cargando productos…');
  });

  it('muestra los productos y pide la lista sin filtro', async () => {
    vi.mocked(getProducts).mockResolvedValue([coca, yogur]);
    renderProducts();
    expect(await screen.findByText('Original')).toBeInTheDocument();
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
    expect(await screen.findByText('Original')).toBeInTheDocument();
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
    await screen.findByText('Original');

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
    await screen.findByText('Original');
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

    expect(await screen.findByText('Original')).toBeInTheDocument();
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
    await screen.findByText('Original');

    await user.click(
      screen.getByRole('button', { name: 'Agregar al carrito' }),
    );

    expect(screen.getByText('Carrito: 1')).toBeInTheDocument();
  });

  it('cada producto enlaza a su detalle', async () => {
    vi.mocked(getProducts).mockResolvedValue([coca]);
    renderProducts();
    const link = await screen.findByRole('link', {
      name: 'Coca-Cola Original',
    });
    expect(link).toHaveAttribute('href', '/products/1');
  });

  it('muestra cuántos productos hay disponibles', async () => {
    vi.mocked(getProducts).mockResolvedValue([coca, yogur, lavandina]);
    renderProducts();
    expect(
      await screen.findByText('3 productos disponibles'),
    ).toBeInTheDocument();
  });

  describe('ordenar', () => {
    // Precios efectivos: Fanta 900 (oferta; normal 1500), Sprite 1000, Agua 800.
    // Sin tener en cuenta la oferta, Fanta sería la más cara.
    const fanta: Product = {
      ...coca,
      id: 10,
      brand: 'Fanta',
      name: 'Naranja',
      price: 1500,
      offer_price: 900,
    };
    const sprite: Product = {
      ...coca,
      id: 11,
      brand: 'Sprite',
      name: 'Lima limón',
      price: 1000,
    };
    const agua: Product = {
      ...coca,
      id: 12,
      brand: 'Villa del Sur',
      name: 'Agua mineral',
      price: 800,
    };
    const BEBIDAS = [fanta, sprite, agua];

    function brandsInOrder() {
      return screen
        .getAllByRole('article')
        .map((card) => card.querySelector('.product-card__brand')?.textContent);
    }

    function Ubicacion() {
      const location = useLocation();
      return <p data-testid="ubicacion">{location.search}</p>;
    }

    function renderWithLocation(url: string) {
      return render(
        <MemoryRouter initialEntries={[url]}>
          <CartProvider>
            <Products />
            <Ubicacion />
          </CartProvider>
        </MemoryRouter>,
      );
    }

    it('"Ordenar por" es un select con label y arranca en Relevancia (orden del backend)', async () => {
      vi.mocked(getProducts).mockResolvedValue(BEBIDAS);
      renderProducts();
      await screen.findAllByRole('article');

      const select = screen.getByLabelText('Ordenar por');
      expect(select.tagName).toBe('SELECT');
      expect(select).toHaveValue('relevancia');
      expect(brandsInOrder()).toEqual(['Fanta', 'Sprite', 'Villa del Sur']);
    });

    it('precio menor a mayor usa el precio efectivo (oferta si hay)', async () => {
      const user = userEvent.setup();
      vi.mocked(getProducts).mockResolvedValue(BEBIDAS);
      renderProducts();
      await screen.findAllByRole('article');

      await user.selectOptions(
        screen.getByLabelText('Ordenar por'),
        'precio-asc',
      );
      // Agua 800, Fanta 900 (en oferta), Sprite 1000.
      expect(brandsInOrder()).toEqual(['Villa del Sur', 'Fanta', 'Sprite']);
    });

    it('precio mayor a menor usa el precio efectivo (oferta si hay)', async () => {
      const user = userEvent.setup();
      vi.mocked(getProducts).mockResolvedValue(BEBIDAS);
      renderProducts();
      await screen.findAllByRole('article');

      await user.selectOptions(
        screen.getByLabelText('Ordenar por'),
        'precio-desc',
      );
      expect(brandsInOrder()).toEqual(['Sprite', 'Fanta', 'Villa del Sur']);
    });

    it('nombre A–Z ordena por nombre del producto', async () => {
      const user = userEvent.setup();
      vi.mocked(getProducts).mockResolvedValue(BEBIDAS);
      renderProducts();
      await screen.findAllByRole('article');

      await user.selectOptions(screen.getByLabelText('Ordenar por'), 'nombre');
      // Agua mineral, Lima limón, Naranja.
      expect(brandsInOrder()).toEqual(['Villa del Sur', 'Sprite', 'Fanta']);
    });

    it('guarda el orden en ?orden= y Relevancia lo saca de la URL', async () => {
      const user = userEvent.setup();
      vi.mocked(getProducts).mockResolvedValue(BEBIDAS);
      renderWithLocation('/products');
      await screen.findAllByRole('article');

      await user.selectOptions(
        screen.getByLabelText('Ordenar por'),
        'precio-asc',
      );
      expect(screen.getByTestId('ubicacion')).toHaveTextContent(
        '?orden=precio-asc',
      );

      await user.selectOptions(
        screen.getByLabelText('Ordenar por'),
        'relevancia',
      );
      expect(screen.getByTestId('ubicacion')).toBeEmptyDOMElement();
    });

    it('respeta la categoría: ordena lo filtrado y la conserva al cambiar el orden', async () => {
      const user = userEvent.setup();
      vi.mocked(getProducts).mockResolvedValue(BEBIDAS);
      renderWithLocation('/products?category=bebidas&orden=precio-desc');
      await screen.findAllByRole('article');

      expect(getProducts).toHaveBeenCalledWith('bebidas');
      expect(screen.getByLabelText('Ordenar por')).toHaveValue('precio-desc');
      expect(brandsInOrder()).toEqual(['Sprite', 'Fanta', 'Villa del Sur']);

      await user.selectOptions(
        screen.getByLabelText('Ordenar por'),
        'precio-asc',
      );
      expect(screen.getByTestId('ubicacion')).toHaveTextContent(
        '?category=bebidas&orden=precio-asc',
      );
      expect(brandsInOrder()).toEqual(['Villa del Sur', 'Fanta', 'Sprite']);
    });

    it('al cambiar de categoría se conserva el orden elegido', async () => {
      const user = userEvent.setup();
      vi.mocked(getProducts).mockResolvedValue(BEBIDAS);
      renderWithLocation('/products?orden=precio-asc');
      await screen.findAllByRole('article');

      vi.mocked(getProducts).mockResolvedValue([yogur]);
      await user.click(screen.getByRole('button', { name: 'Lácteos' }));

      expect(screen.getByTestId('ubicacion')).toHaveTextContent(
        'orden=precio-asc',
      );
      expect(screen.getByTestId('ubicacion')).toHaveTextContent(
        'category=lacteos',
      );
      expect(getProducts).toHaveBeenLastCalledWith('lacteos');
    });

    it('un ?orden= desconocido usa Relevancia', async () => {
      vi.mocked(getProducts).mockResolvedValue(BEBIDAS);
      renderProducts('/products?orden=cualquiera');
      await screen.findAllByRole('article');
      expect(screen.getByLabelText('Ordenar por')).toHaveValue('relevancia');
      expect(brandsInOrder()).toEqual(['Fanta', 'Sprite', 'Villa del Sur']);
    });
  });

  describe('buscar (?q=)', () => {
    const lecheEntera: Product = {
      ...yogur,
      id: 20,
      brand: 'La Serenísima',
      name: 'Leche entera',
      price: 1300,
    };
    const lecheZero: Product = {
      ...yogur,
      id: 21,
      brand: 'La Serenísima',
      name: 'Leche zero lactosa',
      price: 2960,
    };
    const dulce: Product = {
      ...yogur,
      id: 22,
      brand: 'Vacalin',
      name: 'Dulce de leche',
      price: 2400,
    };
    const CATALOGO = [coca, lecheEntera, lecheZero, dulce, lavandina];

    function Ubicacion() {
      const location = useLocation();
      return <p data-testid="ubicacion">{location.search}</p>;
    }

    function renderWithLocation(url: string) {
      const user = userEvent.setup();
      render(
        <MemoryRouter initialEntries={[url]}>
          <CartProvider>
            <Products />
            <Ubicacion />
          </CartProvider>
        </MemoryRouter>,
      );
      return user;
    }

    function names() {
      return screen
        .getAllByRole('article')
        .map((card) => card.querySelector('.product-card__name')?.textContent);
    }

    it('filtra por marca, nombre y categoría sin importar mayúsculas ni tildes', async () => {
      vi.mocked(getProducts).mockResolvedValue(CATALOGO);
      renderWithLocation('/products?q=SERENISIMA');

      expect(
        await screen.findByText('2 resultados para «SERENISIMA»'),
      ).toBeInTheDocument();
      expect(names()).toEqual([
        'La Serenísima Leche entera',
        'La Serenísima Leche zero lactosa',
      ]);
    });

    it('busca también por el nombre de la categoría', async () => {
      vi.mocked(getProducts).mockResolvedValue(CATALOGO);
      renderWithLocation('/products?q=l%C3%A1cteos');
      // "lácteos" encuentra los 3 lácteos (no la Coca ni la lavandina).
      expect(
        await screen.findByText('3 resultados para «lácteos»'),
      ).toBeInTheDocument();
    });

    it('se combina con la categoría y con el orden', async () => {
      vi.mocked(getProducts).mockResolvedValue([lecheEntera, lecheZero, dulce]);
      renderWithLocation(
        '/products?category=lacteos&q=leche&orden=precio-desc',
      );

      expect(
        await screen.findByText('3 resultados para «leche»'),
      ).toBeInTheDocument();
      expect(getProducts).toHaveBeenCalledWith('lacteos');
      // Precio mayor a menor: 2960, 2400, 1300.
      expect(names()).toEqual([
        'La Serenísima Leche zero lactosa',
        'Vacalin Dulce de leche',
        'La Serenísima Leche entera',
      ]);
    });

    it('al cambiar de categoría conserva la búsqueda', async () => {
      vi.mocked(getProducts).mockResolvedValue(CATALOGO);
      const user = renderWithLocation('/products?q=leche');
      await screen.findAllByRole('article');

      await user.click(screen.getByRole('button', { name: 'Lácteos' }));
      expect(screen.getByTestId('ubicacion')).toHaveTextContent('q=leche');
      expect(screen.getByTestId('ubicacion')).toHaveTextContent(
        'category=lacteos',
      );
    });

    it('un resultado se dice en singular', async () => {
      vi.mocked(getProducts).mockResolvedValue(CATALOGO);
      renderWithLocation('/products?q=vacalin');
      expect(
        await screen.findByText('1 resultado para «vacalin»'),
      ).toBeInTheDocument();
    });

    it('sin resultados muestra a Kerchi triste y "Limpiar búsqueda"', async () => {
      vi.mocked(getProducts).mockResolvedValue(CATALOGO);
      renderWithLocation('/products?q=champagne');

      expect(
        await screen.findByText('No encontramos productos para «champagne».'),
      ).toBeInTheDocument();
      expect(
        screen.getByText('0 resultados para «champagne»'),
      ).toBeInTheDocument();
      expect(screen.queryAllByRole('article')).toHaveLength(0);
      const kerchi = document.querySelector('.products__empty img');
      expect(kerchi?.getAttribute('src')).toContain('kerchi-triste');
      expect(kerchi).toHaveAttribute('alt', '');
    });

    it('"Limpiar búsqueda" saca ?q= y vuelve a mostrar todo, conservando la categoría', async () => {
      vi.mocked(getProducts).mockResolvedValue(CATALOGO);
      const user = renderWithLocation('/products?category=lacteos&q=champagne');
      await screen.findByText('No encontramos productos para «champagne».');

      await user.click(
        screen.getByRole('button', { name: 'Limpiar búsqueda' }),
      );

      expect(screen.getByTestId('ubicacion')).toHaveTextContent(
        '?category=lacteos',
      );
      expect(screen.getByTestId('ubicacion')).not.toHaveTextContent('q=');
      expect(
        await screen.findByText('5 productos disponibles'),
      ).toBeInTheDocument();
      expect(
        screen.queryByRole('button', { name: 'Limpiar búsqueda' }),
      ).not.toBeInTheDocument();
    });

    it('con resultados también ofrece "Limpiar búsqueda"', async () => {
      vi.mocked(getProducts).mockResolvedValue(CATALOGO);
      const user = renderWithLocation('/products?q=coca');
      await screen.findByText('1 resultado para «coca»');

      await user.click(
        screen.getByRole('button', { name: 'Limpiar búsqueda' }),
      );
      expect(
        await screen.findByText('5 productos disponibles'),
      ).toBeInTheDocument();
    });
  });
});
