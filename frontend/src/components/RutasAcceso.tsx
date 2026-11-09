import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import type { User } from '../types';
import { RUTA_ENTRADA, TIENDA_REQUIERE_SESION } from '../utils/acceso';

// Estos guards solo ordenan la navegación: el rol sale de localStorage y se puede
// editar a mano. Quien protege los datos es el backend (401 y 403).

function inicioDe(usuario: User) {
  return usuario.role === 'admin' ? '/admin' : '/';
}

// La tienda: sin sesión lleva a la Entrada (ver TIENDA_REQUIERE_SESION).
export function RutaTienda() {
  const { usuario } = useAuth();
  if (TIENDA_REQUIERE_SESION && !usuario) {
    return <Navigate to={RUTA_ENTRADA} replace />;
  }
  return <Outlet />;
}

export function RutaAdmin() {
  const { usuario } = useAuth();
  if (!usuario) {
    return <Navigate to={RUTA_ENTRADA} replace />;
  }
  if (usuario.role !== 'admin') {
    return <Navigate to="/" replace />;
  }
  return <Outlet />;
}

// Entrada, registro e ingreso: con sesión no tienen sentido. Al registrarse o
// ingresar, este guard es el que lleva a cada uno a su inicio.
export function RutaSinSesion() {
  const { usuario } = useAuth();
  if (usuario) {
    return <Navigate to={inicioDe(usuario)} replace />;
  }
  return <Outlet />;
}
