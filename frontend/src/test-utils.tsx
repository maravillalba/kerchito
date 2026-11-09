import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, useLocation } from 'react-router-dom';
import App from './App';
import CarritoDeLaSesion from './components/CarritoDeLaSesion';
import { AuthProvider, CLAVE_SESION } from './context/AuthContext';
import type { User } from './types';

export function usuarioDePrueba(cambios: Partial<User> = {}): User {
  return {
    id: 1,
    first_name: 'Ana',
    last_name: 'Pérez',
    email: 'ana@mail.com',
    phone: null,
    role: 'customer',
    created_at: '2026-11-02T10:00:00',
    points: 0,
    first_purchase_available: true,
    ...cambios,
  };
}

// Deja guardada una sesión, como si ya hubiera ingresado antes de abrir la app.
export function guardarSesion(usuario: User = usuarioDePrueba()) {
  localStorage.setItem(
    CLAVE_SESION,
    JSON.stringify({ token: 'token-de-prueba', usuario }),
  );
}

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
        <CarritoDeLaSesion>
          <App />
          <Ubicacion />
        </CarritoDeLaSesion>
      </AuthProvider>
    </MemoryRouter>,
  );
  return user;
}

export function rutaActual() {
  return screen.getByTestId('ubicacion').textContent;
}
