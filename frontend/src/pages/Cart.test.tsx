import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CartProvider, useCart } from '../context/CartContext';
import { ApiError, createOrder, getProducts } from '../services/api';
import type { OrderResponse, Product } from '../types';
import { formatPrice } from '../utils/format';
import Cart from './Cart';

vi.mock('../services/api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../services/api')>();
  return { ...actual, createOrder: vi.fn(), getProducts: vi.fn() };
});

function makeProduct(overrides: Partial<Product> = {}): Product {
  return {
    id: 1,
    brand: 'Coca-Cola',
    name: 'Original',
    unit: '500 ml',
    category: 'bebidas',
    price: 1200,
    stock: 5,
    ...overrides,
  };
}

const coca = makeProduct();
const alfajor = makeProduct({
  id: 4,
  brand: 'Jorgito',
  name: 'Alfajor',
  unit: '55 g',
  category: 'golosinas_snacks',
  price: 1100,
  stock: 10,
});

const order: OrderResponse = {
  id: 7,
  created_at: '2026-11-03T10:00:00',
  total: 5800,
  items: [
    { product_id: 1, quantity: 3, unit_price: 1200 },
    { product_id: 4, quantity: 2, unit_price: 1100 },
  ],
};

// Botón auxiliar de test: carga 3 Coca-Cola y 2 alfajores.
function FillCart() {
  const { addToCart } = useCart();
  return (
    <button
      type="button"
      onClick={() => {
        addToCart(coca, 3);
        addToCart(alfajor, 2);
      }}
    >
      Cargar carrito de prueba
    </button>
  );
}

// Muestra el contenido del carrito como "id x cantidad".
function CartContents() {
  const { items } = useCart();
  const text = items
    .map((item) => `${item.product.id}x${item.quantity}`)
    .join(', ');
  return <p>En el carrito: {text || 'nada'}</p>;
}

async function renderCart({ fill = true } = {}) {
  const user = userEvent.setup();
  render(
    <MemoryRouter>
      <CartProvider>
        <FillCart />
        <Cart />
        <CartContents />
      </CartProvider>
    </MemoryRouter>,
  );
  if (fill) {
    await user.click(
      screen.getByRole('button', { name: 'Cargar carrito de prueba' }),
    );
  }
  return user;
}

function checkoutButton() {
  return screen.getByRole('button', { name: /Finalizar pedido|Enviando…/ });
}

function itemRow(name: string) {
  return within(screen.getByText(name).closest('li') as HTMLElement);
}

describe('Cart', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('con el carrito vacío muestra el aviso y no ofrece finalizar el pedido', async () => {
    await renderCart({ fill: false });
    expect(screen.getByText('Tu carrito está vacío')).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Finalizar pedido' }),
    ).not.toBeInTheDocument();
    expect(createOrder).not.toHaveBeenCalled();
  });

  it('con éxito muestra "¡Pedido confirmado!" con el número, los productos y el total', async () => {
    vi.mocked(createOrder).mockResolvedValue(order);
    const user = await renderCart();

    await user.click(checkoutButton());

    const confirmation = await screen.findByRole('status');
    expect(confirmation).toHaveTextContent('¡Pedido confirmado! Pedido N° 7.');
    expect(confirmation).toHaveTextContent('Productos: 5.');
    // formatPrice usa un espacio duro; toHaveTextContent lo lee como espacio común.
    const total = formatPrice(5800).replace(/\s/g, ' ');
    expect(confirmation).toHaveTextContent(`Total: ${total}.`);
    expect(
      screen.getByRole('link', { name: 'Seguir comprando' }),
    ).toHaveAttribute('href', '/products');
  });

  it('con éxito vacía el carrito', async () => {
    vi.mocked(createOrder).mockResolvedValue(order);
    const user = await renderCart();
    expect(screen.getByText('En el carrito: 1x3, 4x2')).toBeInTheDocument();

    await user.click(checkoutButton());

    expect(await screen.findByText('En el carrito: nada')).toBeInTheDocument();
    expect(getProducts).not.toHaveBeenCalled();
  });

  it('mientras envía muestra "Enviando…" y deshabilita los dos botones', async () => {
    vi.mocked(createOrder).mockReturnValue(new Promise(() => {}));
    const user = await renderCart();

    await user.click(checkoutButton());

    expect(checkoutButton()).toHaveTextContent('Enviando…');
    expect(checkoutButton()).toBeDisabled();
    expect(
      screen.getByRole('button', { name: 'Vaciar carrito' }),
    ).toBeDisabled();
  });

  it('un doble clic en "Finalizar pedido" manda un solo pedido', async () => {
    vi.mocked(createOrder).mockReturnValue(new Promise(() => {}));
    const user = await renderCart();

    await user.dblClick(checkoutButton());

    expect(createOrder).toHaveBeenCalledTimes(1);
  });

  it('con un 409 muestra el error con el nombre y no vacía el carrito', async () => {
    vi.mocked(createOrder).mockRejectedValue(
      new ApiError(409, 'Insufficient stock for product 1'),
    );
    vi.mocked(getProducts).mockResolvedValue([coca, alfajor]);
    const user = await renderCart();

    await user.click(checkoutButton());

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'No hay stock suficiente de "Original".',
    );
    expect(screen.getByText('En el carrito: 1x3, 4x2')).toBeInTheDocument();
    expect(screen.queryByText(/¡Pedido confirmado!/)).not.toBeInTheDocument();
  });

  it('con un 409 pide el stock actual y ajusta el carrito con un aviso', async () => {
    vi.mocked(createOrder).mockRejectedValue(
      new ApiError(409, 'Insufficient stock for product 1'),
    );
    vi.mocked(getProducts).mockResolvedValue([
      { ...coca, stock: 1 },
      { ...alfajor, stock: 0 },
    ]);
    const user = await renderCart();

    await user.click(checkoutButton());

    expect(await screen.findByRole('status')).toHaveTextContent(
      '"Original" bajó de 3 a 1 unidades. "Alfajor" se quitó porque ya no hay stock.',
    );
    expect(getProducts).toHaveBeenCalledTimes(1);
    expect(getProducts).toHaveBeenCalledWith();
    expect(screen.getByText('En el carrito: 1x1')).toBeInTheDocument();
  });

  it('con un 404 nombra el producto y quita del carrito el que ya no existe', async () => {
    vi.mocked(createOrder).mockRejectedValue(
      new ApiError(404, 'Product 4 not found'),
    );
    vi.mocked(getProducts).mockResolvedValue([coca]);
    const user = await renderCart();

    await user.click(checkoutButton());

    expect(await screen.findByRole('alert')).toHaveTextContent(
      '"Alfajor" ya no está disponible.',
    );
    expect(await screen.findByRole('status')).toHaveTextContent(
      '"Alfajor" se quitó porque ya no hay stock.',
    );
    expect(screen.getByText('En el carrito: 1x3')).toBeInTheDocument();
  });

  it('si después de un 409 falla getProducts, el carrito queda igual y sin aviso', async () => {
    vi.mocked(createOrder).mockRejectedValue(
      new ApiError(409, 'Insufficient stock for product 1'),
    );
    vi.mocked(getProducts).mockRejectedValue(
      new ApiError(0, 'No se pudo conectar con el servidor.', 'network'),
    );
    const user = await renderCart();

    await user.click(checkoutButton());

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'No hay stock suficiente de "Original".',
    );
    expect(getProducts).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
    expect(screen.getByText('En el carrito: 1x3, 4x2')).toBeInTheDocument();
  });

  it.each([
    [
      'un 422',
      new ApiError(422, 'Input should be greater than or equal to 1'),
      'El pedido tiene datos inválidos.',
    ],
    [
      'un 500',
      new ApiError(500, 'Internal server error'),
      'El servidor tuvo un problema al procesar el pedido.',
    ],
    [
      'un timeout',
      new ApiError(
        0,
        'El servidor tardó demasiado en responder. Probá de nuevo.',
        'timeout',
      ),
      'El servidor tardó demasiado en responder.',
    ],
    [
      'un error de red',
      new ApiError(
        0,
        'No se pudo conectar con el servidor. Revisá que el backend esté funcionando.',
        'network',
      ),
      'No se pudo conectar con el servidor.',
    ],
  ])(
    'con %s muestra el error con "Reintentar", no vacía el carrito ni pide stock',
    async (_caso, failure, expected) => {
      vi.mocked(createOrder).mockRejectedValue(failure);
      const user = await renderCart();

      await user.click(checkoutButton());

      const alert = await screen.findByRole('alert');
      expect(alert).toHaveTextContent(expected);
      expect(
        within(alert).getByRole('button', { name: 'Reintentar' }),
      ).toBeInTheDocument();
      expect(screen.getByText('En el carrito: 1x3, 4x2')).toBeInTheDocument();
      expect(getProducts).not.toHaveBeenCalled();
      expect(checkoutButton()).toBeEnabled();
    },
  );

  it('"Reintentar" vuelve a mandar el pedido y con éxito confirma', async () => {
    vi.mocked(createOrder)
      .mockRejectedValueOnce(new ApiError(500, 'Internal server error'))
      .mockResolvedValueOnce(order);
    const user = await renderCart();

    await user.click(checkoutButton());
    await user.click(await screen.findByRole('button', { name: 'Reintentar' }));

    expect(await screen.findByRole('status')).toHaveTextContent(
      '¡Pedido confirmado! Pedido N° 7.',
    );
    expect(createOrder).toHaveBeenCalledTimes(2);
    expect(screen.getByText('En el carrito: nada')).toBeInTheDocument();
  });

  describe('al cambiar el carrito se borran el error y el aviso anteriores', () => {
    // Deja en pantalla un error 409 y el aviso de "bajó de 3 a 2 unidades".
    async function renderWithErrorAndNotice() {
      vi.mocked(createOrder).mockRejectedValue(
        new ApiError(409, 'Insufficient stock for product 1'),
      );
      vi.mocked(getProducts).mockResolvedValue([
        { ...coca, stock: 2 },
        alfajor,
      ]);
      const user = await renderCart();
      await user.click(checkoutButton());
      await screen.findByRole('status');
      expect(screen.getByRole('alert')).toBeInTheDocument();
      return user;
    }

    it('al cambiar una cantidad', async () => {
      const user = await renderWithErrorAndNotice();

      await user.click(
        itemRow('Original').getByRole('button', {
          name: 'Restar una unidad de Original',
        }),
      );

      expect(screen.queryByRole('alert')).not.toBeInTheDocument();
      expect(screen.queryByRole('status')).not.toBeInTheDocument();
      expect(screen.getByText('En el carrito: 1x1, 4x2')).toBeInTheDocument();
    });

    it('al quitar un producto', async () => {
      const user = await renderWithErrorAndNotice();

      await user.click(
        itemRow('Alfajor').getByRole('button', { name: 'Quitar' }),
      );

      expect(screen.queryByRole('alert')).not.toBeInTheDocument();
      expect(screen.queryByRole('status')).not.toBeInTheDocument();
      expect(screen.getByText('En el carrito: 1x2')).toBeInTheDocument();
    });

    it('al vaciar el carrito', async () => {
      const user = await renderWithErrorAndNotice();

      await user.click(screen.getByRole('button', { name: 'Vaciar carrito' }));

      expect(screen.getByText('Tu carrito está vacío')).toBeInTheDocument();
      expect(screen.queryByRole('alert')).not.toBeInTheDocument();
      expect(screen.queryByRole('status')).not.toBeInTheDocument();
    });
  });
});
