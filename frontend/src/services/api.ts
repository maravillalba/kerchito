import type {
  AdminOrder,
  AuthResponse,
  Category,
  ChatRequest,
  ChatResponse,
  Customer,
  CustomerDetail,
  OrderCreate,
  OrderCreatedResponse,
  Product,
  ProductAdmin,
  ProductAdminInput,
  RegisterData,
  Summary,
  User,
} from '../types';

const API_URL: string = import.meta.env.VITE_API_URL ?? 'http://localhost:8000';

const TIMEOUT_MS = 10_000;

// La sesión la maneja AuthContext; acá solo se guarda lo que necesita cada pedido.
let authToken: string | null = null;
let onUnauthorized: (() => void) | null = null;

// Las fotos que sube el admin las sirve el backend; las del seed, el frontend.
export function imageUrl(path: string): string {
  return path.startsWith('/uploads/') ? `${API_URL}${path}` : path;
}

export function setAuthToken(token: string | null) {
  authToken = token;
}

export function setUnauthorizedHandler(handler: (() => void) | null) {
  onUnauthorized = handler;
}

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
  const usedToken = authToken;

  try {
    const response = await fetch(`${API_URL}${path}`, {
      ...init,
      ...(usedToken && {
        headers: {
          ...(init.headers as Record<string, string> | undefined),
          Authorization: `Bearer ${usedToken}`,
        },
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      // La sesión venció. Un login fallido no entra acá porque no lleva token, y un
      // 401 que llega tarde de una sesión anterior no cierra la sesión nueva.
      if (response.status === 401 && usedToken && usedToken === authToken) {
        onUnauthorized?.();
      }
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

    if (response.status === 204) {
      return undefined as T;
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

export function createOrder(order: OrderCreate): Promise<OrderCreatedResponse> {
  return request<OrderCreatedResponse>('/api/orders', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(order),
  });
}

export function registerUser(data: RegisterData): Promise<AuthResponse> {
  return request<AuthResponse>('/api/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
}

export function loginUser(
  email: string,
  password: string,
): Promise<AuthResponse> {
  return request<AuthResponse>('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
}

export function getMe(): Promise<User> {
  return request<User>('/api/auth/me');
}

export function logoutUser(): Promise<void> {
  return request<void>('/api/auth/logout', { method: 'POST' });
}

function jsonBody(method: string, body: unknown): RequestInit {
  return {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  };
}

export function getAdminProducts(): Promise<ProductAdmin[]> {
  return request<ProductAdmin[]>('/api/admin/products');
}

export function createProduct(data: ProductAdminInput): Promise<ProductAdmin> {
  return request<ProductAdmin>('/api/products', jsonBody('POST', data));
}

export function updateProduct(
  id: number,
  data: ProductAdminInput,
): Promise<ProductAdmin> {
  return request<ProductAdmin>(`/api/products/${id}`, jsonBody('PUT', data));
}

export function deleteProduct(id: number): Promise<void> {
  return request<void>(`/api/products/${id}`, { method: 'DELETE' });
}

export function updateProductStock(
  id: number,
  stock: number,
): Promise<ProductAdmin> {
  return request<ProductAdmin>(
    `/api/products/${id}/stock`,
    jsonBody('PATCH', { stock }),
  );
}

// Sin Content-Type: el navegador lo arma con el límite del multipart.
export function uploadProductImage(
  id: number,
  file: File,
): Promise<ProductAdmin> {
  const body = new FormData();
  body.append('file', file);
  return request<ProductAdmin>(`/api/products/${id}/image`, {
    method: 'POST',
    body,
  });
}

export function getAdminOrders(): Promise<AdminOrder[]> {
  return request<AdminOrder[]>('/api/admin/orders');
}

export function cancelOrder(id: number): Promise<AdminOrder> {
  return request<AdminOrder>(`/api/orders/${id}/cancel`, { method: 'PATCH' });
}

export function getAdminSummary(): Promise<Summary> {
  return request<Summary>('/api/admin/summary');
}

export function getCustomers(): Promise<Customer[]> {
  return request<Customer[]>('/api/admin/customers');
}

export function getCustomer(id: number): Promise<CustomerDetail> {
  return request<CustomerDetail>(`/api/admin/customers/${id}`);
}

export function adjustCustomerPoints(
  id: number,
  points: number,
  reason: string,
): Promise<CustomerDetail> {
  return request<CustomerDetail>(
    `/api/admin/customers/${id}/points`,
    jsonBody('POST', { points, reason }),
  );
}

export function sendChatMessage(message: string): Promise<ChatResponse> {
  const body: ChatRequest = { message };
  return request<ChatResponse>('/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}
