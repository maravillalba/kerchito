import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, useLocation } from 'react-router-dom';
import App from './App';
import { AuthProvider } from './context/AuthContext';
import { CartProvider } from './context/CartContext';
import type { Rol } from './types';

// eslint-disable-next-line react-refresh/only-export-components
function Ubicacion() {
  const { pathname } = useLocation();
  return <p data-testid="ubicacion">{pathname}</p>;
}

// La app completa con su router, y la ruta actual a la vista de los tests.
export function renderApp(path = '/') {
  // Sin espera entre teclas: los formularios se completan letra por letra.
  const user = userEvent.setup({ delay: null });
  render(
    <MemoryRouter initialEntries={[path]}>
      <AuthProvider>
        <CartProvider>
          <App />
          <Ubicacion />
        </CartProvider>
      </AuthProvider>
    </MemoryRouter>,
  );
  return user;
}

export function rutaActual() {
  return screen.getByTestId('ubicacion').textContent;
}

// Deja guardada una sesión, como si ya hubiera ingresado antes de abrir la app.
export function guardarSesion(rol: Rol, nombre = 'Ana') {
  localStorage.setItem(
    'kiosko.sesion',
    JSON.stringify({ nombre, email: 'ana@mail.com', rol }),
  );
}
