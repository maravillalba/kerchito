import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthProvider } from '../context/AuthContext';
import { CartProvider, useCart } from '../context/CartContext';
import { ApiError, createOrder, getMe, getProducts } from '../services/api';
import { guardarSesion, usuarioDePrueba } from '../test-utils';
import type { OrderCreatedResponse, Product, User } from '../types';
import { formatPrice } from '../utils/format';
import Cart from './Cart';

vi.mock('../services/api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../services/api')>();
  return {
    ...actual,
    createOrder: vi.fn(),
    getMe: vi.fn(),
    getProducts: vi.fn(),
  };
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

const order: OrderCreatedResponse = {
  id: 7,
  created_at: '2026-11-03T10:00:00',
  status: 'active',
  payment_method: 'efectivo',
  subtotal: 5800,
  first_purchase_discount: 0,
  points_discount: 0,
  discount_amount: 0,
  total: 5800,
  points_used: 0,
  points_earned: 58,
  points_balance: 58,
  items: [
    {
      product_id: 1,
      product_name: 'Coca-Cola Original 500 ml',
      quantity: 3,
      unit_price: 1200,
    },
    {
      product_id: 4,
      product_name: 'Jorgito Alfajor 55 g',
      quantity: 2,
      unit_price: 1100,
    },
  ],
};

// Sin 15% ni saldo: los totales son la suma de los renglones. Los tests de puntos
// eligen su propio cliente.
const clienteSinDescuentos = usuarioDePrueba({
  first_purchase_available: false,
});

function iniciarSesion(usuario: User = clienteSinDescuentos) {
  guardarSesion(usuario);
  vi.mocked(getMe).mockResolvedValue(usuario);
}

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
      <AuthProvider>
        <CartProvider>
          <FillCart />
          <Cart />
          <CartContents />
        </CartProvider>
      </AuthProvider>
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

// La caja verde del resumen: la palabra "Total" y el monto.
function totalMostrado() {
  return screen.getByText('Total').parentElement as HTMLElement;
}

function itemRow(name: string) {
  return within(screen.getByText(name).closest('li') as HTMLElement);
}

describe('Cart', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    iniciarSesion();
  });

  it('cada fila muestra marca, unidad y el precio efectivo; el total usa la oferta', async () => {
    const user = userEvent.setup();
    const cocaEnOferta = { ...coca, offer_price: 1000 };
    function FillOferta() {
      const { addToCart } = useCart();
      return (
        <button
          type="button"
          onClick={() => {
            addToCart(cocaEnOferta, 2);
            addToCart(alfajor, 1);
          }}
        >
          Cargar con oferta
        </button>
      );
    }
    render(
      <MemoryRouter>
        <AuthProvider>
          <CartProvider>
            <FillOferta />
            <Cart />
          </CartProvider>
        </AuthProvider>
      </MemoryRouter>,
    );
    await user.click(screen.getByRole('button', { name: 'Cargar con oferta' }));

    const fila = itemRow('Original');
    // Miniatura decorativa: el nombre ya está en el texto. Sin image usa la de la categoría.
    const foto = screen
      .getByText('Original')
      .closest('li')
      ?.querySelector('.cart-item__thumb img');
    expect(foto).toHaveAttribute('alt', '');
    expect(foto).toHaveClass('product-image--thumb');
    expect(fila.getByText('Coca-Cola')).toBeInTheDocument();
    expect(fila.getByText('500 ml')).toBeInTheDocument();
    // Precio normal tachado y precio de oferta por unidad; subtotal 2 x 1000.
    expect(fila.getByText(/Precio normal:/).closest('del')).toHaveTextContent(
      '$ 1.200',
    );
    expect(fila.getByText(/1\.000 c\/u/)).toBeInTheDocument();
    expect(fila.getByText('$ 2.000')).toBeInTheDocument();

    const sinOferta = itemRow('Alfajor');
    expect(sinOferta.getByText('55 g')).toBeInTheDocument();
    expect(sinOferta.queryByText(/Precio normal:/)).not.toBeInTheDocument();

    // Total: 2 x 1000 + 1100 = 3100 (no 2 x 1200 + 1100).
    expect(totalMostrado()).toHaveTextContent('$ 3.100');
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
          name: 'Restar una unidad de Coca-Cola Original 500 ml',
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

describe('Cart con puntos', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  const switchPuntos = () =>
    screen.getByRole('switch', { name: /Usar mis puntos/ });

  function pedidoHecho() {
    return vi.mocked(createOrder).mock.calls[0][0];
  }

  // El carrito de prueba suma 5800: 3 x 1200 + 2 x 1100.
  it('muestra el cliente con sus iniciales, su antigüedad y su saldo', async () => {
    iniciarSesion(
      usuarioDePrueba({ points: 120, created_at: '2026-11-02T10:00:00' }),
    );
    await renderCart();
    expect(screen.getByText('Ana Pérez')).toBeInTheDocument();
    expect(screen.getByText('AP')).toBeInTheDocument();
    expect(screen.getByText(/Cliente desde nov 2026/)).toBeInTheDocument();
    expect(screen.getByText('120 pts')).toBeInTheDocument();
  });

  it('en la primera compra muestra el 15%, el total y los puntos a sumar', async () => {
    iniciarSesion(usuarioDePrueba());
    await renderCart();
    expect(
      screen.getByText(/Subtotal \(5 productos\)/).parentElement,
    ).toHaveTextContent('$ 5.800');
    expect(
      screen.getByText(/Descuento 1ª compra/).closest('p'),
    ).toHaveTextContent('− $ 870');
    expect(totalMostrado()).toHaveTextContent('$ 4.930');
    expect(screen.getByText(/Con esta compra sumás/)).toHaveTextContent(
      '+49 puntos',
    );
  });

  it('si ya compró no muestra el 15%', async () => {
    iniciarSesion();
    await renderCart();
    expect(screen.queryByText(/Descuento 1ª compra/)).not.toBeInTheDocument();
    expect(totalMostrado()).toHaveTextContent('$ 5.800');
  });

  it('el interruptor aplica el canje en la vista previa y lo manda al backend', async () => {
    iniciarSesion(
      usuarioDePrueba({ points: 350, first_purchase_available: false }),
    );
    vi.mocked(createOrder).mockResolvedValue(order);
    const user = await renderCart();

    expect(switchPuntos()).not.toBeChecked();
    await user.click(switchPuntos());

    expect(switchPuntos()).toBeChecked();
    expect(screen.getByText(/Canje de 300/).closest('p')).toHaveTextContent(
      '− $ 1.500',
    );
    expect(totalMostrado()).toHaveTextContent('$ 4.300');
    expect(screen.getByText(/Con esta compra sumás/)).toHaveTextContent(
      '+43 puntos',
    );

    await user.click(checkoutButton());
    expect(pedidoHecho().use_points).toBe(true);
  });

  it('sin el interruptor no canjea', async () => {
    iniciarSesion(
      usuarioDePrueba({ points: 350, first_purchase_available: false }),
    );
    vi.mocked(createOrder).mockResolvedValue(order);
    const user = await renderCart();
    await user.click(checkoutButton());
    expect(pedidoHecho().use_points).toBe(false);
  });

  it('con pocos puntos el interruptor está deshabilitado y dice cuántos faltan', async () => {
    iniciarSesion(
      usuarioDePrueba({ points: 30, first_purchase_available: false }),
    );
    await renderCart();
    expect(switchPuntos()).toBeDisabled();
    expect(
      screen.getByText('Te faltan 70 puntos para tu primer canje.'),
    ).toBeInTheDocument();
  });

  it('el pedido manda solo ids, cantidades, medio y use_points, sin ningún monto', async () => {
    iniciarSesion();
    vi.mocked(createOrder).mockResolvedValue(order);
    const user = await renderCart();

    await user.click(screen.getByRole('radio', { name: /Mercado Pago/ }));
    await user.click(checkoutButton());

    expect(pedidoHecho()).toEqual({
      items: [
        { product_id: 1, quantity: 3 },
        { product_id: 4, quantity: 2 },
      ],
      payment_method: 'mercado_pago',
      use_points: false,
    });
  });

  it('ofrece los 4 medios de pago, con efectivo elegido y sin "pendiente"', async () => {
    iniciarSesion();
    await renderCart();
    expect(screen.getAllByRole('radio')).toHaveLength(4);
    expect(screen.getByRole('radio', { name: /Efectivo/ })).toBeChecked();
    expect(screen.queryByText(/pendiente/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/nombre/i)).not.toBeInTheDocument();
  });

  it('al confirmar muestra lo que devolvió el backend, no la vista previa', async () => {
    iniciarSesion(usuarioDePrueba());
    vi.mocked(createOrder).mockResolvedValue({
      ...order,
      total: 1234,
      points_earned: 12,
      points_balance: 62,
    });
    const user = await renderCart();
    expect(totalMostrado()).toHaveTextContent('$ 4.930');

    await user.click(checkoutButton());

    const confirmacion = await screen.findByRole('status');
    expect(confirmacion).toHaveTextContent('Total: $ 1.234.');
    expect(confirmacion).toHaveTextContent(
      'Sumaste +12 puntos. Tu saldo: 62 puntos.',
    );
    expect(screen.getByText('En el carrito: nada')).toBeInTheDocument();
  });

  it('si el pedido falla el carrito no se vacía y se mantiene lo elegido', async () => {
    iniciarSesion(
      usuarioDePrueba({ points: 350, first_purchase_available: false }),
    );
    vi.mocked(createOrder).mockRejectedValue(
      new ApiError(500, 'Internal server error'),
    );
    const user = await renderCart();
    await user.click(switchPuntos());
    await user.click(screen.getByRole('radio', { name: /Tarjeta/ }));

    await user.click(checkoutButton());

    await screen.findByRole('alert');
    expect(screen.getByText('En el carrito: 1x3, 4x2')).toBeInTheDocument();
    expect(switchPuntos()).toBeChecked();
    expect(screen.getByRole('radio', { name: /Tarjeta/ })).toBeChecked();
  });

  it('el admin ve el carrito pero no puede finalizar', async () => {
    iniciarSesion(usuarioDePrueba({ role: 'admin' }));
    await renderCart();
    expect(
      screen.queryByRole('button', { name: 'Finalizar pedido' }),
    ).not.toBeInTheDocument();
    expect(screen.getByText(/cuenta de cliente/)).toBeInTheDocument();
    expect(screen.queryByRole('switch')).not.toBeInTheDocument();
  });

  it('sin sesión (tienda abierta) pide ingresar para finalizar', async () => {
    await renderCart();
    expect(
      screen.queryByRole('button', { name: 'Finalizar pedido' }),
    ).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'ingresá' })).toHaveAttribute(
      'href',
      '/ingresar',
    );
  });
});
