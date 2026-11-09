import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { OrderCreate, Product } from '../types';
import {
  ApiError,
  createOrder,
  getMe,
  getProductById,
  getProducts,
  loginUser,
  logoutUser,
  registerUser,
  sendChatMessage,
  setAuthToken,
  setUnauthorizedHandler,
} from './api';

// fetch falso: ningún test sale a la red.
const fetchMock = vi.fn<typeof fetch>();

const BASE = 'http://localhost:8000';

const coca: Product = {
  id: 1,
  brand: 'Coca-Cola',
  name: 'Original',
  unit: '500 ml',
  category: 'bebidas',
  price: 1200,
  stock: 25,
  description: 'Gaseosa clásica',
  image: null,
};

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

// Lo que recibió fetch en la llamada número n (empieza en 0).
function fetchCall(n = 0) {
  const [url, init] = fetchMock.mock.calls[n];
  return { url: String(url), init: init ?? {} };
}

beforeEach(() => {
  fetchMock.mockReset();
  vi.stubGlobal('fetch', fetchMock);
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe('pedidos que arma cada función', () => {
  it('getProducts sin categoría pide /api/products sin query string', async () => {
    fetchMock.mockResolvedValue(jsonResponse([coca]));
    await getProducts();
    expect(fetchCall().url).toBe(`${BASE}/api/products`);
    expect(fetchCall().init.method).toBeUndefined(); // GET por defecto
  });

  it('getProducts con categoría agrega ?category=', async () => {
    fetchMock.mockResolvedValue(jsonResponse([coca]));
    await getProducts('golosinas_snacks');
    expect(fetchCall().url).toBe(
      `${BASE}/api/products?category=golosinas_snacks`,
    );
  });

  it('getProductById pide /api/products/{id}', async () => {
    fetchMock.mockResolvedValue(jsonResponse(coca));
    await getProductById(7);
    expect(fetchCall().url).toBe(`${BASE}/api/products/7`);
  });

  it('createOrder hace POST con cuerpo JSON y Content-Type', async () => {
    const order: OrderCreate = {
      items: [
        { product_id: 1, quantity: 2 },
        { product_id: 4, quantity: 1 },
      ],
      payment_method: 'efectivo',
      use_points: true,
    };
    fetchMock.mockResolvedValue(
      jsonResponse({ id: 7, created_at: '', total: 3500, items: [] }, 201),
    );
    await createOrder(order);

    const { url, init } = fetchCall();
    expect(url).toBe(`${BASE}/api/orders`);
    expect(init.method).toBe('POST');
    expect(init.headers).toEqual({ 'Content-Type': 'application/json' });
    expect(JSON.parse(init.body as string)).toEqual(order);
  });

  it('sendChatMessage hace POST a /api/chat con { message }', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ reply: '¡Hola!' }));
    await sendChatMessage('¿Cuánto sale la Coca?');

    const { url, init } = fetchCall();
    expect(url).toBe(`${BASE}/api/chat`);
    expect(init.method).toBe('POST');
    expect(init.headers).toEqual({ 'Content-Type': 'application/json' });
    expect(JSON.parse(init.body as string)).toEqual({
      message: '¿Cuánto sale la Coca?',
    });
  });

  it('todas las llamadas mandan un AbortSignal para el timeout', async () => {
    fetchMock.mockResolvedValue(jsonResponse([]));
    await getProducts();
    expect(fetchCall().init.signal).toBeInstanceOf(AbortSignal);
  });
});

describe('respuesta ok', () => {
  it('getProducts devuelve el JSON', async () => {
    fetchMock.mockResolvedValue(jsonResponse([coca]));
    await expect(getProducts()).resolves.toEqual([coca]);
  });

  it('getProductById devuelve el JSON', async () => {
    fetchMock.mockResolvedValue(jsonResponse(coca));
    await expect(getProductById(1)).resolves.toEqual(coca);
  });

  it('createOrder devuelve el JSON del 201', async () => {
    const created = {
      id: 7,
      created_at: '2026-11-02T15:30:00',
      total: 2400,
      items: [{ product_id: 1, quantity: 2, unit_price: 1200 }],
    };
    fetchMock.mockResolvedValue(jsonResponse(created, 201));
    await expect(
      createOrder({
        items: [{ product_id: 1, quantity: 2 }],
        payment_method: 'efectivo',
      }),
    ).resolves.toEqual(created);
  });

  it('sendChatMessage devuelve el JSON', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ reply: 'línea 1\nlínea 2' }));
    await expect(sendChatMessage('Hola')).resolves.toEqual({
      reply: 'línea 1\nlínea 2',
    });
  });

  it('cancela el timer del timeout al terminar', async () => {
    vi.useFakeTimers();
    fetchMock.mockResolvedValue(jsonResponse([]));
    await getProducts();
    expect(vi.getTimerCount()).toBe(0);
  });
});

describe('errores http', () => {
  it.each([
    [404, 'Product 99 not found'],
    [409, 'Insufficient stock for product 1'],
    [500, 'Internal server error'],
  ])(
    '%i con detail de texto levanta ApiError con ese mensaje',
    async (status, detail) => {
      fetchMock.mockResolvedValue(jsonResponse({ detail }, status));

      const error = await getProductById(99).catch((err: unknown) => err);

      expect(error).toBeInstanceOf(ApiError);
      expect(error).toMatchObject({
        name: 'ApiError',
        status,
        kind: 'http',
        message: detail,
      });
    },
  );

  it('422 con lista de errores une los "msg" con "; "', async () => {
    fetchMock.mockResolvedValue(
      jsonResponse(
        {
          detail: [
            {
              type: 'greater_than_equal',
              loc: ['body', 'items', 0, 'quantity'],
              msg: 'Input should be greater than or equal to 1',
            },
            {
              type: 'missing',
              loc: ['body', 'items', 1, 'product_id'],
              msg: 'Field required',
            },
          ],
        },
        422,
      ),
    );

    await expect(
      createOrder({
        items: [{ product_id: 1, quantity: 0 }],
        payment_method: 'efectivo',
      }),
    ).rejects.toMatchObject({
      status: 422,
      kind: 'http',
      message: 'Input should be greater than or equal to 1; Field required',
    });
  });

  it('422 con una lista sin "msg" usa el mensaje genérico', async () => {
    fetchMock.mockResolvedValue(
      jsonResponse({ detail: [{ x: 1 }, null] }, 422),
    );
    await expect(getProducts()).rejects.toMatchObject({
      status: 422,
      kind: 'http',
      message: 'Error 422 del servidor',
    });
  });

  it('detail vacío o ausente usa el mensaje genérico', async () => {
    fetchMock
      .mockResolvedValueOnce(jsonResponse({ detail: '' }, 404))
      .mockResolvedValueOnce(jsonResponse({}, 500));
    await expect(getProductById(1)).rejects.toMatchObject({
      message: 'Error 404 del servidor',
    });
    await expect(getProductById(1)).rejects.toMatchObject({
      message: 'Error 500 del servidor',
    });
  });

  it('cuerpo que no es JSON usa el mensaje genérico', async () => {
    fetchMock.mockResolvedValue(new Response('Bad gateway', { status: 502 }));
    await expect(getProducts()).rejects.toMatchObject({
      status: 502,
      kind: 'http',
      message: 'Error 502 del servidor',
    });
  });
});

describe('sin respuesta del servidor', () => {
  it('a los 10 s aborta y levanta ApiError kind "timeout"', async () => {
    vi.useFakeTimers();
    // Como el fetch real: queda pendiente y rechaza cuando se aborta la señal.
    fetchMock.mockImplementation(
      (_url, init) =>
        new Promise<Response>((_resolve, reject) => {
          init?.signal?.addEventListener('abort', () =>
            reject(
              new DOMException('The operation was aborted.', 'AbortError'),
            ),
          );
        }),
    );

    let settled = false;
    const result = getProducts()
      .catch((err: unknown) => err)
      .finally(() => {
        settled = true;
      });

    await vi.advanceTimersByTimeAsync(9_999);
    expect(settled).toBe(false);

    await vi.advanceTimersByTimeAsync(1);
    const error = await result;
    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({
      status: 0,
      kind: 'timeout',
      message: 'El servidor tardó demasiado en responder. Probá de nuevo.',
    });
    expect(fetchCall().init.signal?.aborted).toBe(true);
  });

  it('fetch que rechaza levanta ApiError kind "network"', async () => {
    fetchMock.mockRejectedValue(new TypeError('Failed to fetch'));

    const error = await sendChatMessage('Hola').catch((err: unknown) => err);

    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({
      status: 0,
      kind: 'network',
      message:
        'No se pudo conectar con el servidor. Revisá que el backend esté funcionando.',
    });
  });
});

describe('sesión', () => {
  afterEach(() => {
    setAuthToken(null);
    setUnauthorizedHandler(null);
  });

  it('sin sesión no manda el header Authorization', async () => {
    fetchMock.mockResolvedValue(jsonResponse([]));
    await getProducts();
    expect(fetchCall().init.headers).toBeUndefined();
  });

  it('con sesión manda el token y conserva los otros headers', async () => {
    setAuthToken('abc');
    fetchMock.mockResolvedValue(jsonResponse({ reply: 'ok' }));
    await sendChatMessage('Hola');
    expect(fetchCall().init.headers).toEqual({
      'Content-Type': 'application/json',
      Authorization: 'Bearer abc',
    });
  });

  it('un 401 con sesión avisa para cerrarla y levanta el error', async () => {
    const aviso = vi.fn();
    setAuthToken('abc');
    setUnauthorizedHandler(aviso);
    fetchMock.mockResolvedValue(
      jsonResponse({ detail: 'Iniciá sesión para continuar' }, 401),
    );

    await expect(getMe()).rejects.toMatchObject({ status: 401 });
    expect(aviso).toHaveBeenCalledTimes(1);
  });

  it('un 401 del login (sin sesión) no avisa', async () => {
    const aviso = vi.fn();
    setUnauthorizedHandler(aviso);
    fetchMock.mockResolvedValue(
      jsonResponse({ detail: 'Correo o contraseña incorrectos' }, 401),
    );

    await expect(loginUser('a@b.c', 'x')).rejects.toMatchObject({
      status: 401,
      message: 'Correo o contraseña incorrectos',
    });
    expect(aviso).not.toHaveBeenCalled();
  });

  it('un 401 tardío de una sesión anterior no cierra la sesión nueva', async () => {
    const aviso = vi.fn();
    setAuthToken('vieja');
    setUnauthorizedHandler(aviso);
    let responder!: (value: Response) => void;
    fetchMock.mockReturnValue(
      new Promise((resolve) => {
        responder = resolve;
      }),
    );

    const pedido = getMe().catch((err: unknown) => err);
    setAuthToken('nueva');
    responder(jsonResponse({ detail: 'x' }, 401));
    await pedido;

    expect(aviso).not.toHaveBeenCalled();
  });

  it('un 403 no cierra la sesión', async () => {
    const aviso = vi.fn();
    setAuthToken('abc');
    setUnauthorizedHandler(aviso);
    fetchMock.mockResolvedValue(jsonResponse({ detail: 'x' }, 403));
    await expect(getMe()).rejects.toMatchObject({ status: 403 });
    expect(aviso).not.toHaveBeenCalled();
  });

  it('logoutUser resuelve con un 204 sin cuerpo', async () => {
    setAuthToken('abc');
    fetchMock.mockResolvedValue(new Response(null, { status: 204 }));
    await expect(logoutUser()).resolves.toBeUndefined();
    expect(fetchCall().url).toBe(`${BASE}/api/auth/logout`);
    expect(fetchCall().init.method).toBe('POST');
  });

  it('registerUser hace POST con los datos', async () => {
    const datos = {
      first_name: 'Ana',
      last_name: 'Pérez',
      email: 'a@b.c',
      phone: null,
      password: 'clave-larga',
    };
    fetchMock.mockResolvedValue(jsonResponse({ token: 't' }, 201));
    await registerUser(datos);
    expect(fetchCall().url).toBe(`${BASE}/api/auth/register`);
    expect(JSON.parse(fetchCall().init.body as string)).toEqual(datos);
  });
});

describe('URL base', () => {
  // API_URL se lee al importar el módulo: hay que volver a importarlo.
  async function importApi() {
    vi.resetModules();
    return import('./api');
  }

  it('usa VITE_API_URL si está definida', async () => {
    vi.stubEnv('VITE_API_URL', 'http://api.ejemplo.test:9000');
    const api = await importApi();
    fetchMock.mockResolvedValue(jsonResponse([]));

    await api.getProducts('lacteos');

    expect(fetchCall().url).toBe(
      'http://api.ejemplo.test:9000/api/products?category=lacteos',
    );
  });

  it('sin VITE_API_URL usa http://localhost:8000', async () => {
    vi.stubEnv('VITE_API_URL', undefined);
    const api = await importApi();
    fetchMock.mockResolvedValue(jsonResponse({ reply: 'ok' }));

    await api.sendChatMessage('Hola');

    expect(fetchCall().url).toBe('http://localhost:8000/api/chat');
  });
});
