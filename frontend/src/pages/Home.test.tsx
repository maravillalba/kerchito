import { render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CartProvider } from '../context/CartContext';
import { ApiError, getProducts } from '../services/api';
import type { Product } from '../types';
import { CATEGORY_ICONS } from '../utils/categoryIcons';
import Home from './Home';

vi.mock('../services/api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../services/api')>();
  return { ...actual, getProducts: vi.fn() };
});

function makeProduct(overrides: Partial<Product>): Product {
  return {
    id: 1,
    brand: 'Marca',
    name: 'Producto',
    unit: '1 u.',
    category: 'almacen',
    price: 1000,
    stock: 10,
    description: null,
    image: null,
    ...overrides,
  };
}

const CATALOG: Product[] = [
  makeProduct({
    id: 1,
    brand: 'Coca-Cola',
    name: 'Original',
    unit: '500 ml',
    category: 'bebidas',
  }),
  makeProduct({
    id: 2,
    brand: 'Villa del Sur',
    name: 'Agua mineral',
    unit: '500 ml',
    category: 'bebidas',
  }),
  makeProduct({
    id: 3,
    brand: "Lay's",
    name: 'Papas fritas clásicas',
    unit: '1 u.',
    category: 'golosinas_snacks',
  }),
  makeProduct({
    id: 4,
    brand: 'Jorgito',
    name: 'Alfajor',
    unit: '55 g',
    category: 'golosinas_snacks',
  }),
  makeProduct({
    id: 5,
    brand: 'La Serenísima',
    name: 'Leche entera',
    unit: '1 L',
    category: 'lacteos',
  }),
];

function renderHome() {
  return render(
    <MemoryRouter>
      <CartProvider>
        <Home />
      </CartProvider>
    </MemoryRouter>,
  );
}

function getBanners() {
  return screen.getByRole('navigation', { name: 'Atajos por categoría' });
}

describe('Home', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(getProducts).mockResolvedValue(CATALOG);
  });

  it('cada categoría tiene su foto decorativa y su link de siempre', () => {
    renderHome();
    const link = screen.getByRole('link', { name: 'Golosinas y snacks' });
    expect(link).toHaveAttribute('href', '/products?category=golosinas_snacks');
    const image = link.querySelector('img');
    expect(CATEGORY_ICONS.golosinas_snacks).toMatch(/golosinas\.webp$/);
    expect(image).toHaveAttribute('src', CATEGORY_ICONS.golosinas_snacks);
    expect(image).toHaveAttribute('alt', '');
  });

  it('muestra los 3 pasos de "Cómo comprar" en orden', () => {
    renderHome();
    const section = screen
      .getByRole('heading', { name: 'Cómo comprar' })
      .closest('section') as HTMLElement;
    const steps = within(section).getAllByRole('listitem');

    expect(steps).toHaveLength(3);
    expect(steps[0]).toHaveTextContent(
      '1Elegí tus productosMirá el catálogo o filtrá por categoría.',
    );
    expect(steps[1]).toHaveTextContent(
      '2Sumalos al carritoVes el total y el stock disponible.',
    );
    expect(steps[2]).toHaveTextContent(
      '3Confirmá tu pedidoTe damos el número y el detalle al instante.',
    );
  });

  it('muestra el banner de KioscoBot, solo con texto', () => {
    renderHome();
    const banner = screen
      .getByRole('heading', { name: '¿Dudas? Preguntale a KioscoBot' })
      .closest('section') as HTMLElement;

    expect(banner).toHaveTextContent(
      'Precios, stock, horarios y medios de pago, siempre a mano. Abrí el chat con el botón naranja de abajo a la derecha.',
    );
    expect(within(banner).queryByRole('button')).not.toBeInTheDocument();
    expect(within(banner).queryByRole('link')).not.toBeInTheDocument();
  });

  describe('franja de banners', () => {
    it.each([
      [
        'Para el mate de la tarde',
        'Yerba, azúcar y todo lo del almacén.',
        'Ver almacén',
        'almacen',
        2,
      ],
      ['Bebidas', 'Frescas y a un clic.', 'Ver bebidas', 'bebidas', 3],
      [
        'Limpieza del hogar',
        'Todo para dejar la casa impecable.',
        'Ver limpieza',
        'limpieza',
        3,
      ],
    ])(
      '"%s" lleva a su categoría y tiene fotos decorativas',
      (title, subtitle, action, category, photos) => {
        renderHome();
        const banner = within(getBanners()).getByRole('link', { name: title });

        expect(banner).toHaveAttribute(
          'href',
          `/products?category=${category}`,
        );
        expect(banner).toHaveAccessibleDescription(subtitle);
        expect(banner).toHaveTextContent(action);

        const images = banner.querySelectorAll('img');
        expect(images).toHaveLength(photos);
        images.forEach((img) => {
          expect(img).toHaveAttribute('alt', '');
          expect(img).toHaveAttribute('aria-hidden', 'true');
        });
      },
    );

    it('son 3 links, en orden y sin hablar de ofertas', () => {
      renderHome();
      const links = within(getBanners()).getAllByRole('link');

      expect(links.map((link) => link.getAttribute('href'))).toEqual([
        '/products?category=almacen',
        '/products?category=bebidas',
        '/products?category=limpieza',
      ]);
      expect(getBanners()).not.toHaveTextContent(/descuento|oferta|%/i);
    });
  });

  describe('productos destacados', () => {
    it('muestra 3 tarjetas fijas: Coca-Cola, Alfajor y Leche entera', async () => {
      renderHome();
      const section = (
        await screen.findByRole('heading', { name: 'Productos destacados' })
      ).closest('section') as HTMLElement;
      const cards = within(section).getAllByRole('article');

      expect(cards).toHaveLength(3);
      expect(cards[0]).toHaveTextContent('Original');
      expect(cards[1]).toHaveTextContent('Alfajor');
      expect(cards[2]).toHaveTextContent('Leche entera');
      expect(
        within(cards[0]).getByRole('button', { name: 'Agregar al carrito' }),
      ).toBeInTheDocument();
    });

    it('si falta uno, usa el siguiente del catálogo', async () => {
      vi.mocked(getProducts).mockResolvedValue(
        CATALOG.filter((p) => p.name !== 'Alfajor'),
      );
      renderHome();
      const section = (
        await screen.findByRole('heading', { name: 'Productos destacados' })
      ).closest('section') as HTMLElement;
      const cards = within(section).getAllByRole('article');

      expect(cards).toHaveLength(3);
      expect(cards[1]).toHaveTextContent('Agua mineral');
    });

    it('si falla la carga no se muestra ni aparece un error', async () => {
      vi.mocked(getProducts).mockRejectedValue(
        new ApiError(0, 'No se pudo conectar con el servidor.', 'network'),
      );
      renderHome();

      await waitFor(() => expect(getProducts).toHaveBeenCalled());
      expect(
        screen.queryByRole('heading', { name: 'Productos destacados' }),
      ).not.toBeInTheDocument();
      expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    });
  });
});
