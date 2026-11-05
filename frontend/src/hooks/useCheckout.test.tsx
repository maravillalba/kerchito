import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError, createOrder } from '../services/api';
import type { CartItem, OrderResponse, Product } from '../types';
import { useCheckout } from './useCheckout';

vi.mock('../services/api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../services/api')>();
  return { ...actual, createOrder: vi.fn() };
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

const items: CartItem[] = [
  { product: coca, quantity: 2 },
  { product: alfajor, quantity: 3 },
];

const order: OrderResponse = {
  id: 7,
  created_at: '2026-11-03T10:00:00',
  total: 5700,
  items: [
    { product_id: 1, quantity: 2, unit_price: 1200 },
    { product_id: 4, quantity: 3, unit_price: 1100 },
  ],
};

describe('useCheckout', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('arranca sin enviar, sin error y sin éxito', () => {
    const { result } = renderHook(() => useCheckout());
    expect(result.current.submitting).toBe(false);
    expect(result.current.error).toBeNull();
    expect(result.current.success).toBeNull();
  });

  it('manda a createOrder solo product_id y quantity de cada ítem', async () => {
    vi.mocked(createOrder).mockResolvedValue(order);
    const { result } = renderHook(() => useCheckout());

    await act(() => result.current.submit(items));

    expect(createOrder).toHaveBeenCalledWith({
      items: [
        { product_id: 1, quantity: 2 },
        { product_id: 4, quantity: 3 },
      ],
    });
  });

  it('con éxito devuelve "success" y el resumen con orderId, totalItems y total', async () => {
    vi.mocked(createOrder).mockResolvedValue(order);
    const { result } = renderHook(() => useCheckout());

    let outcome: string | undefined;
    await act(async () => {
      outcome = await result.current.submit(items);
    });

    expect(outcome).toBe('success');
    expect(result.current.success).toEqual({
      orderId: 7,
      totalItems: 5,
      total: 5700,
    });
    expect(result.current.error).toBeNull();
    expect(result.current.submitting).toBe(false);
  });

  it('mientras espera la respuesta marca submitting y después lo apaga', async () => {
    let resolveOrder!: (value: OrderResponse) => void;
    vi.mocked(createOrder).mockReturnValue(
      new Promise((resolve) => {
        resolveOrder = resolve;
      }),
    );
    const { result } = renderHook(() => useCheckout());

    let pending!: Promise<unknown>;
    act(() => {
      pending = result.current.submit(items);
    });
    expect(result.current.submitting).toBe(true);

    await act(async () => {
      resolveOrder(order);
      await pending;
    });
    expect(result.current.submitting).toBe(false);
  });

  it('dos envíos seguidos antes de re-renderizar mandan un solo pedido', async () => {
    vi.mocked(createOrder).mockResolvedValue(order);
    const { result } = renderHook(() => useCheckout());

    await act(async () => {
      const submit = result.current.submit;
      await Promise.all([submit(items), submit(items)]);
    });

    expect(createOrder).toHaveBeenCalledTimes(1);
  });

  it('con el carrito vacío no manda ningún pedido', async () => {
    const { result } = renderHook(() => useCheckout());

    await act(() => result.current.submit([]));

    expect(createOrder).not.toHaveBeenCalled();
  });

  it.each([
    [
      409,
      'Insufficient stock for product 1',
      'No hay stock suficiente de "Original". Ajustá la cantidad e intentá de nuevo.',
    ],
    [
      404,
      'Product 4 not found',
      '"Alfajor" ya no está disponible. Quitalo del carrito e intentá de nuevo.',
    ],
  ])(
    'con un %i devuelve "outdated" y nombra al producto del mensaje del backend',
    async (status, detail, expected) => {
      vi.mocked(createOrder).mockRejectedValue(new ApiError(status, detail));
      const { result } = renderHook(() => useCheckout());

      let outcome: string | undefined;
      await act(async () => {
        outcome = await result.current.submit(items);
      });

      expect(outcome).toBe('outdated');
      expect(result.current.error).toBe(expected);
      expect(result.current.success).toBeNull();
    },
  );

  it.each([
    [
      409,
      'Insufficient stock for product 99',
      'No hay stock suficiente para algún producto. Ajustá las cantidades e intentá de nuevo.',
    ],
    [
      404,
      'Product 99 not found',
      'Algún producto ya no está disponible. Revisá el carrito e intentá de nuevo.',
    ],
  ])(
    'con un %i de un producto que no está en el carrito usa un mensaje genérico',
    async (status, detail, expected) => {
      vi.mocked(createOrder).mockRejectedValue(new ApiError(status, detail));
      const { result } = renderHook(() => useCheckout());

      await act(() => result.current.submit(items));

      expect(result.current.error).toBe(expected);
    },
  );

  it.each([
    [
      'un 422',
      new ApiError(422, 'Input should be greater than or equal to 1'),
      'El pedido tiene datos inválidos. Revisá las cantidades e intentá de nuevo.',
    ],
    [
      'un 500',
      new ApiError(500, 'Internal server error'),
      'El servidor tuvo un problema al procesar el pedido. Intentá de nuevo más tarde.',
    ],
    [
      'un timeout',
      new ApiError(
        0,
        'El servidor tardó demasiado en responder. Probá de nuevo.',
        'timeout',
      ),
      'El servidor tardó demasiado en responder. Probá de nuevo.',
    ],
    [
      'un error de red',
      new ApiError(
        0,
        'No se pudo conectar con el servidor. Revisá que el backend esté funcionando.',
        'network',
      ),
      'No se pudo conectar con el servidor. Revisá que el backend esté funcionando.',
    ],
    [
      'un error que no es de la API',
      new TypeError('algo falló'),
      'No se pudo enviar el pedido. Intentá de nuevo.',
    ],
  ])(
    'con %s devuelve "error" y el mensaje en español que corresponde',
    async (_caso, failure, expected) => {
      vi.mocked(createOrder).mockRejectedValue(failure);
      const { result } = renderHook(() => useCheckout());

      let outcome: string | undefined;
      await act(async () => {
        outcome = await result.current.submit(items);
      });

      expect(outcome).toBe('error');
      expect(result.current.error).toBe(expected);
      expect(result.current.success).toBeNull();
      expect(result.current.submitting).toBe(false);
    },
  );

  it('un envío nuevo borra el error anterior', async () => {
    vi.mocked(createOrder)
      .mockRejectedValueOnce(new ApiError(500, 'Internal server error'))
      .mockResolvedValueOnce(order);
    const { result } = renderHook(() => useCheckout());

    await act(() => result.current.submit(items));
    expect(result.current.error).not.toBeNull();

    await act(() => result.current.submit(items));
    expect(result.current.error).toBeNull();
    expect(result.current.success?.orderId).toBe(7);
  });

  it('reset borra el error y el éxito', async () => {
    vi.mocked(createOrder).mockRejectedValue(
      new ApiError(500, 'Internal server error'),
    );
    const { result } = renderHook(() => useCheckout());
    await act(() => result.current.submit(items));

    act(() => result.current.reset());

    expect(result.current.error).toBeNull();
    expect(result.current.success).toBeNull();
  });
});
