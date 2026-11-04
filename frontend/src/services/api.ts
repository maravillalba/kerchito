import type {
  Category,
  ChatRequest,
  ChatResponse,
  OrderCreate,
  OrderResponse,
  Product,
} from '../types';

const API_URL: string = import.meta.env.VITE_API_URL ?? 'http://localhost:8000';

const TIMEOUT_MS = 10_000;

// http: el servidor respondió con un error; timeout y network: no hubo respuesta.
export type ApiErrorKind = 'http' | 'timeout' | 'network';

// Error de la API. status es el código HTTP, o 0 si no hubo respuesta.
export class ApiError extends Error {
  status: number;
  kind: ApiErrorKind;

  constructor(status: number, message: string, kind: ApiErrorKind = 'http') {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.kind = kind;
  }
}

// En 404, 409 y 500 "detail" es un texto; en 422 es una lista de objetos con "msg".
function messageFromDetail(detail: unknown, status: number): string {
  if (typeof detail === 'string' && detail) {
    return detail;
  }
  if (Array.isArray(detail)) {
    const messages = detail
      .map((item) => (item as { msg?: unknown } | null)?.msg)
      .filter((msg): msg is string => typeof msg === 'string');
    if (messages.length > 0) {
      return messages.join('; ');
    }
  }
  return `Error ${status} del servidor`;
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const response = await fetch(`${API_URL}${path}`, {
      ...init,
      signal: controller.signal,
    });

    if (!response.ok) {
      let detail: unknown;
      try {
        detail = ((await response.json()) as { detail?: unknown }).detail;
      } catch {
        detail = undefined;
      }
      throw new ApiError(
        response.status,
        messageFromDetail(detail, response.status),
      );
    }

    return (await response.json()) as T;
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    // El timeout aborta el pedido; cualquier otro fallo de fetch es de red.
    if (controller.signal.aborted) {
      throw new ApiError(
        0,
        'El servidor tardó demasiado en responder. Probá de nuevo.',
        'timeout',
      );
    }
    throw new ApiError(
      0,
      'No se pudo conectar con el servidor. Revisá que el backend esté funcionando.',
      'network',
    );
  } finally {
    clearTimeout(timeoutId);
  }
}

export function getProducts(category?: Category): Promise<Product[]> {
  const query = category ? `?category=${encodeURIComponent(category)}` : '';
  return request<Product[]>(`/api/products${query}`);
}

export function getProductById(id: number): Promise<Product> {
  return request<Product>(`/api/products/${id}`);
}

export function createOrder(order: OrderCreate): Promise<OrderResponse> {
  return request<OrderResponse>('/api/orders', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(order),
  });
}

export function sendChatMessage(message: string): Promise<ChatResponse> {
  const body: ChatRequest = { message };
  return request<ChatResponse>('/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}
