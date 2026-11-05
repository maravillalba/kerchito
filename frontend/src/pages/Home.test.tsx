import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CartProvider } from '../context/CartContext';
import { ApiError, getProducts } from '../services/api';
import type { Product } from '../types';
import { CATEGORY_ICONS } from '../utils/categoryIcons';
import { OPEN_KIOSCOBOT_EVENT } from '../utils/kioscobot';
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

// Catálogo con ofertas: Coca -15%, Alfajor -20%, Cif -15%, Mayonesa -16%.
const CON_OFERTAS: Product[] = [
  makeProduct({
    id: 1,
    brand: 'Coca-Cola',
    name: 'Original',
    unit: '500 ml',
    price: 1200,
    offer_price: 1020,
  }),
  makeProduct({
    id: 2,
    brand: 'Villa del Sur',
    name: 'Agua mineral',
    unit: '500 ml',
    price: 800,
  }),
  makeProduct({
    id: 4,
    brand: 'Jorgito',
    name: 'Alfajor',
    unit: '55 g',
    price: 1100,
    offer_price: 880,
  }),
  makeProduct({
    id: 6,
    brand: 'Cif',
    name: 'Detergente limón',
    unit: '500 ml',
    price: 1400,
    offer_price: 1190,
  }),
  makeProduct({
    id: 7,
    brand: "Hellmann's",
    name: 'Mayonesa clásica',
    unit: '475 g',
    price: 3100,
    offer_price: 2600,
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

  it('el hero tiene la bienvenida con Kerchi y la tarjeta de KioscoBot', async () => {
    const user = userEvent.setup();
    const abrir = vi.fn();
    window.addEventListener(OPEN_KIOSCOBOT_EVENT, abrir);
    renderHome();

    expect(
      screen.getByRole('heading', {
        level: 1,
        name: 'Bienvenido, ¿qué necesitás hoy?',
      }),
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Ver productos' })).toHaveAttribute(
      'href',
      '/products',
    );

    const bot = screen
      .getByRole('heading', { name: 'Preguntale a KioscoBot' })
      .closest('section') as HTMLElement;
    await user.click(within(bot).getByRole('button', { name: 'Abrir chat' }));
    expect(abrir).toHaveBeenCalledTimes(1);
    window.removeEventListener(OPEN_KIOSCOBOT_EVENT, abrir);
  });

  it('ordena las secciones: hero, Cómo comprar, categorías, Ofertas y banners', async () => {
    vi.mocked(getProducts).mockResolvedValue(CON_OFERTAS);
    renderHome();
    const ofertas = await screen.findByRole('heading', {
      name: 'Ofertas de la semana',
    });
    const orden = [
      screen.getByRole('heading', { level: 1 }),
      screen.getByRole('heading', { name: 'Cómo comprar' }),
      screen.getByRole('heading', { name: 'Comprá por categoría' }),
      ofertas,
      getBanners(),
    ];
    for (let i = 1; i < orden.length; i++) {
      expect(
        orden[i - 1].compareDocumentPosition(orden[i]) &
          Node.DOCUMENT_POSITION_FOLLOWING,
      ).toBeTruthy();
    }
    expect(
      screen.queryByRole('heading', { name: 'Productos destacados' }),
    ).not.toBeInTheDocument();
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

  describe('ofertas de la semana', () => {
    it('muestra hasta 3 productos con oferta, del mayor descuento al menor', async () => {
      vi.mocked(getProducts).mockResolvedValue(CON_OFERTAS);
      renderHome();
      const section = (
        await screen.findByRole('heading', { name: 'Ofertas de la semana' })
      ).closest('section') as HTMLElement;

      expect(within(section).getByText('Ofertas del día')).toBeInTheDocument();
      expect(
        within(section).getByText('Aprobadas por Kerchi'),
      ).toBeInTheDocument();
      const kerchi = section.querySelector('img.mascota--aprobado');
      expect(kerchi).toHaveAttribute('alt', '');
      expect(kerchi).toHaveAttribute('aria-hidden', 'true');

      const cards = within(section).getAllByRole('article');
      expect(cards).toHaveLength(3);
      // Alfajor -20%, Mayonesa -16%, Coca-Cola -15% (Cif -15% queda afuera: va después en el catálogo).
      expect(cards[0]).toHaveTextContent('Alfajor');
      expect(cards[0]).toHaveTextContent('-20%');
      expect(cards[1]).toHaveTextContent('Mayonesa');
      expect(cards[2]).toHaveTextContent('Original');
      expect(
        within(cards[0]).getByRole('button', { name: 'Agregar al carrito' }),
      ).toBeInTheDocument();
    });

    it('no aparece si ningún producto tiene oferta', async () => {
      renderHome();

      await waitFor(() => expect(getProducts).toHaveBeenCalled());
      expect(
        screen.queryByRole('heading', { name: 'Ofertas de la semana' }),
      ).not.toBeInTheDocument();
    });

    it('si falla la carga no se muestra ni aparece un error', async () => {
      vi.mocked(getProducts).mockRejectedValue(
        new ApiError(0, 'No se pudo conectar con el servidor.', 'network'),
      );
      renderHome();

      await waitFor(() => expect(getProducts).toHaveBeenCalled());
      expect(
        screen.queryByRole('heading', { name: 'Ofertas de la semana' }),
      ).not.toBeInTheDocument();
      expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    });
  });
});
