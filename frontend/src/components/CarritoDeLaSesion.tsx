import type { ReactNode } from 'react';
import { useAuth } from '../context/AuthContext';
import { CartProvider } from '../context/CartContext';

// Un carrito por sesión: con la key, al cerrar sesión o cambiar de usuario el
// carrito arranca vacío y nadie ve lo que eligió otra persona.
function CarritoDeLaSesion({ children }: { children: ReactNode }) {
  const { usuario } = useAuth();
  return (
    <CartProvider key={usuario?.id ?? 'sin-sesion'}>{children}</CartProvider>
  );
}

export default CarritoDeLaSesion;
