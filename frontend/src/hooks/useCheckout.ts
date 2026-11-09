import { useCallback, useRef, useState } from 'react';
import { ApiError, createOrder } from '../services/api';
import type { CartItem, OrderCreatedResponse, PaymentMethod } from '../types';

// Resumen que se muestra al confirmar el pedido. Son los valores del backend,
// no los de la vista previa del carrito.
export interface OrderSummary {
  orderId: number;
  totalItems: number;
  total: number;
  pointsEarned: number;
  pointsBalance: number;
}

export interface CheckoutOptions {
  paymentMethod: PaymentMethod;
  usePoints: boolean;
}

// 'outdated': el pedido falló por stock (409) o producto inexistente (404).
export type SubmitResult = 'success' | 'outdated' | 'error';

// Convierte el error de la API en un texto en español para el usuario.
function messageFromError(error: unknown, items: CartItem[]): string {
  if (!(error instanceof ApiError)) {
    return 'No se pudo enviar el pedido. Intentá de nuevo.';
  }

  // timeout y network ya traen un mensaje en español desde api.ts.
  if (error.kind !== 'http') {
    return error.message;
  }

  // El backend responde en inglés ("... product 4"): buscamos el id para dar el nombre.
  const productId = Number(/product (\d+)/i.exec(error.message)?.[1]);
  const name = items.find((item) => item.product.id === productId)?.product
    .name;

  switch (error.status) {
    case 409:
      return name
        ? `No hay stock suficiente de "${name}". Ajustá la cantidad e intentá de nuevo.`
        : 'No hay stock suficiente para algún producto. Ajustá las cantidades e intentá de nuevo.';
    case 404:
      return name
        ? `"${name}" ya no está disponible. Quitalo del carrito e intentá de nuevo.`
        : 'Algún producto ya no está disponible. Revisá el carrito e intentá de nuevo.';
    case 422:
      return 'El pedido tiene datos inválidos. Revisá las cantidades e intentá de nuevo.';
    case 403:
      return 'Solo las cuentas de cliente pueden hacer pedidos.';
    default:
      return 'El servidor tuvo un problema al procesar el pedido. Intentá de nuevo más tarde.';
  }
}

// onCreated recibe el pedido confirmado, por ejemplo para actualizar el saldo.
export function useCheckout(onCreated?: (order: OrderCreatedResponse) => void) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<OrderSummary | null>(null);
  // El ref evita un doble envío aunque el usuario toque dos veces antes de re-renderizar.
  const inFlight = useRef(false);

  // Vaciar el carrito lo decide quien llama, solo si el resultado es 'success'.
  // Solo viajan ids, cantidades, el medio de pago y use_points: los montos los
  // calcula el backend.
  const submit = useCallback(
    async (
      items: CartItem[],
      { paymentMethod, usePoints }: CheckoutOptions,
    ): Promise<SubmitResult> => {
      if (inFlight.current || items.length === 0) {
        return 'error';
      }
      inFlight.current = true;
      setSubmitting(true);
      setError(null);
      setSuccess(null);

      try {
        const order = await createOrder({
          items: items.map((item) => ({
            product_id: item.product.id,
            quantity: item.quantity,
          })),
          payment_method: paymentMethod,
          use_points: usePoints,
        });
        setSuccess({
          orderId: order.id,
          totalItems: items.reduce((sum, item) => sum + item.quantity, 0),
          total: order.total,
          pointsEarned: order.points_earned,
          pointsBalance: order.points_balance,
        });
        onCreated?.(order);
        return 'success';
      } catch (err) {
        setError(messageFromError(err, items));
        const outdated =
          err instanceof ApiError && (err.status === 409 || err.status === 404);
        return outdated ? 'outdated' : 'error';
      } finally {
        inFlight.current = false;
        setSubmitting(false);
      }
    },
    [onCreated],
  );

  const reset = useCallback(() => {
    setError(null);
    setSuccess(null);
  }, []);

  return { submitting, error, success, submit, reset };
}
