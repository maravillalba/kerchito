export type Category =
  | 'bebidas'
  | 'golosinas_snacks'
  | 'lacteos'
  | 'almacen'
  | 'limpieza'
  | 'cigarrillos';

export interface Product {
  id: number;
  brand: string;
  // Solo el producto, sin la marca ni la presentación: "Original".
  name: string;
  // Capacidad o presentación: "1,5 L", "1 kg", "500 ml".
  unit: string;
  category: Category;
  price: number;
  // Precio de oferta; null o ausente = sin oferta. Siempre menor que price.
  offer_price?: number | null;
  stock: number;
  description?: string | null;
  image?: string | null;
}

// Solo existe en el frontend
export interface CartItem {
  product: Product;
  quantity: number;
}

export interface OrderItemInput {
  product_id: number;
  quantity: number;
}

export type PaymentMethod =
  'efectivo' | 'transferencia' | 'tarjeta' | 'mercado_pago';

export type OrderStatus = 'active' | 'cancelled';

export interface OrderCreate {
  items: OrderItemInput[];
  payment_method: PaymentMethod;
  use_points?: boolean;
}

export interface OrderItemResponse {
  product_id: number;
  product_name: string;
  quantity: number;
  unit_price: number;
}

export interface OrderResponse {
  id: number;
  created_at: string;
  status: OrderStatus;
  payment_method: PaymentMethod;
  subtotal: number;
  first_purchase_discount: number;
  points_discount: number;
  discount_amount: number;
  total: number;
  points_used: number;
  points_earned: number;
  items: OrderItemResponse[];
}

// Respuesta de POST /api/orders: el pedido y el saldo después de la compra.
export interface OrderCreatedResponse extends OrderResponse {
  points_balance: number;
}

export type Role = 'customer' | 'admin';

export interface User {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  phone: string | null;
  role: Role;
  created_at: string;
  points: number;
  first_purchase_available: boolean;
}

export interface RegisterData {
  first_name: string;
  last_name: string;
  email: string;
  phone: string | null;
  password: string;
}

export interface AuthResponse {
  token: string;
  expires_at: string;
  user: User;
}

export interface ChatRequest {
  message: string;
}

export interface ChatResponse {
  reply: string;
}
