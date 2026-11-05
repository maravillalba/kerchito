import { useEffect, useState } from 'react';
import { ApiError, getProducts } from '../services/api';
import type { Product } from '../types';

// Lo que se edita en el formulario: todo el producto menos su id.
export type DatosProducto = Omit<Product, 'id'>;

export interface PanelAdmin {
  // null mientras carga o si falló el pedido.
  productos: Product[] | null;
  error: string | null;
  recargar: () => void;
  guardarProducto: (datos: DatosProducto, id?: number) => void;
}

// "pedido" identifica la carga que produjo el resultado, como en Products.tsx.
type Resultado =
  | { pedido: number; productos: Product[]; error: null }
  | { pedido: number; productos: null; error: string };

function textoDeError(err: unknown): string {
  if (err instanceof ApiError && err.kind !== 'http') {
    return err.message;
  }
  return 'No se pudieron cargar los productos.';
}

// Los productos del panel: se leen del backend, pero los cambios viven solo en
// este estado. Está en el layout para que duren al cambiar de sección.
export function useProductosAdmin(): PanelAdmin {
  const [pedido, setPedido] = useState(0);
  const [resultado, setResultado] = useState<Resultado | null>(null);

  useEffect(() => {
    let cancelado = false;
    getProducts()
      .then((productos) => {
        if (!cancelado) {
          setResultado({ pedido, productos, error: null });
        }
      })
      .catch((err: unknown) => {
        if (!cancelado) {
          setResultado({ pedido, productos: null, error: textoDeError(err) });
        }
      });
    return () => {
      cancelado = true;
    };
  }, [pedido]);

  const guardarProducto = (datos: DatosProducto, id?: number) => {
    setResultado((prev) => {
      if (prev?.productos == null) {
        return prev;
      }
      if (id !== undefined) {
        const productos = prev.productos.map((producto) =>
          producto.id === id ? { ...datos, id } : producto,
        );
        return { ...prev, productos };
      }
      const nuevoId = Math.max(0, ...prev.productos.map((p) => p.id)) + 1;
      // Primero en la lista: con 54 productos, al final no se vería.
      return {
        ...prev,
        productos: [{ ...datos, id: nuevoId }, ...prev.productos],
      };
    });
  };

  const actual = resultado?.pedido === pedido ? resultado : null;
  return {
    productos: actual?.productos ?? null,
    error: actual?.error ?? null,
    recargar: () => setPedido((n) => n + 1),
    guardarProducto,
  };
}
