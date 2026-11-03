export type Category =
  | 'bebidas'
  | 'golosinas_snacks'
  | 'lacteos'
  | 'almacen'
  | 'limpieza'
  | 'cigarrillos';

export interface Product {
  id: number;
  name: string;
  category: Category;
  price: number;
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

export interface OrderCreate {
  items: OrderItemInput[];
}

export interface OrderItemResponse {
  product_id: number;
  quantity: number;
  unit_price: number;
}

export interface OrderResponse {
  id: number;
  created_at: string;
  total: number;
  items: OrderItemResponse[];
}

export interface ChatRequest {
  message: string;
}

export interface ChatResponse {
  reply: string;
}
