import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import type { Rol } from '../types';

// Esto solo oculta pantallas: el rol sale de localStorage y se puede editar a
// mano. La protección real se hará en el backend en una etapa posterior.
function RutaProtegida({ rol }: { rol: Rol }) {
  const { usuario } = useAuth();

  if (usuario?.rol !== rol) {
    return <Navigate to="/login" replace />;
  }
  return <Outlet />;
}

export default RutaProtegida;
