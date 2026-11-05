import { startTransition } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

// Cierra la sesión y vuelve a /bienvenida. Las dos cosas van en la misma
// transición porque el router cambia de ruta dentro de una: si el logout se
// aplicara antes, RutaProtegida vería "sin usuario" en /admin y mandaría a /login.
export function useCerrarSesion() {
  const { logout } = useAuth();
  const navigate = useNavigate();

  return () => {
    startTransition(() => {
      navigate('/bienvenida');
      logout();
    });
  };
}
