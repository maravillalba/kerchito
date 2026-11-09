import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  ApiError,
  getMe,
  loginUser,
  logoutUser,
  registerUser,
  setAuthToken,
  setUnauthorizedHandler,
} from '../services/api';
import { guardarSesion, usuarioDePrueba } from '../test-utils';
import { AuthProvider, CLAVE_SESION, useAuth } from './AuthContext';

vi.mock('../services/api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../services/api')>();
  return {
    ...actual,
    getMe: vi.fn(),
    loginUser: vi.fn(),
    logoutUser: vi.fn(),
    registerUser: vi.fn(),
    setAuthToken: vi.fn(),
    setUnauthorizedHandler: vi.fn(),
  };
});

const ana = usuarioDePrueba();
const sesion = { token: 'nuevo', expires_at: '', user: ana };
const registro = {
  first_name: 'Ana',
  last_name: 'Pérez',
  email: 'ana@mail.com',
  phone: null,
  password: 'clave-larga',
};

function Prueba() {
  const { usuario, token, login, register, logout, actualizarSaldo } =
    useAuth();
  return (
    <div>
      <p>
        {usuario ? `${usuario.first_name}: ${usuario.points}` : 'sin sesión'}
      </p>
      <p>token: {token ?? 'ninguno'}</p>
      <p>15%: {String(usuario?.first_purchase_available)}</p>
      <button onClick={() => void login('ana@mail.com', 'clave-larga')}>
        Login
      </button>
      <button onClick={() => void register(registro)}>Registrar</button>
      <button onClick={logout}>Salir</button>
      <button onClick={() => actualizarSaldo(42)}>Comprar</button>
    </div>
  );
}

function renderizar() {
  render(
    <AuthProvider>
      <Prueba />
    </AuthProvider>,
  );
  return userEvent.setup();
}

function sesionGuardada() {
  return JSON.parse(localStorage.getItem(CLAVE_SESION) ?? 'null') as {
    token: string;
    usuario: { points: number };
  } | null;
}

describe('AuthContext', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(getMe).mockResolvedValue(ana);
    vi.mocked(logoutUser).mockResolvedValue();
  });

  it('sin nada guardado arranca sin sesión y no consulta al backend', () => {
    renderizar();
    expect(screen.getByText('sin sesión')).toBeInTheDocument();
    expect(setAuthToken).toHaveBeenCalledWith(null);
    expect(getMe).not.toHaveBeenCalled();
  });

  it('login guarda la sesión, el token y el usuario', async () => {
    vi.mocked(loginUser).mockResolvedValue(sesion);
    const user = renderizar();

    await user.click(screen.getByRole('button', { name: 'Login' }));

    expect(await screen.findByText('Ana: 0')).toBeInTheDocument();
    expect(screen.getByText('token: nuevo')).toBeInTheDocument();
    expect(setAuthToken).toHaveBeenLastCalledWith('nuevo');
    expect(sesionGuardada()?.token).toBe('nuevo');
  });

  it('register abre la sesión igual que login', async () => {
    vi.mocked(registerUser).mockResolvedValue(sesion);
    const user = renderizar();

    await user.click(screen.getByRole('button', { name: 'Registrar' }));

    expect(await screen.findByText('Ana: 0')).toBeInTheDocument();
    expect(registerUser).toHaveBeenCalledWith(registro);
  });

  it('recupera la sesión guardada, manda el token y trae el saldo actual', async () => {
    guardarSesion(usuarioDePrueba({ points: 5 }));
    vi.mocked(getMe).mockResolvedValue(usuarioDePrueba({ points: 80 }));
    renderizar();

    // Antes de la respuesta ya se ve lo guardado, sin parpadeo.
    expect(screen.getByText('Ana: 5')).toBeInTheDocument();
    expect(setAuthToken).toHaveBeenCalledWith('token-de-prueba');
    expect(await screen.findByText('Ana: 80')).toBeInTheDocument();
    await waitFor(() => expect(sesionGuardada()?.usuario.points).toBe(80));
  });

  it('sin conexión mantiene la sesión guardada', async () => {
    guardarSesion();
    vi.mocked(getMe).mockRejectedValue(new ApiError(0, 'sin red', 'network'));
    renderizar();

    await waitFor(() => expect(getMe).toHaveBeenCalled());
    expect(screen.getByText('Ana: 0')).toBeInTheDocument();
  });

  it('logout borra la sesión aunque falle el pedido al backend', async () => {
    guardarSesion();
    vi.mocked(logoutUser).mockRejectedValue(new ApiError(500, 'error'));
    const user = renderizar();

    await user.click(screen.getByRole('button', { name: 'Salir' }));

    expect(screen.getByText('sin sesión')).toBeInTheDocument();
    expect(logoutUser).toHaveBeenCalledTimes(1);
    expect(sesionGuardada()).toBeNull();
    expect(setAuthToken).toHaveBeenLastCalledWith(null);
  });

  it('el aviso de 401 de api.ts cierra la sesión', () => {
    guardarSesion();
    renderizar();
    const aviso = vi
      .mocked(setUnauthorizedHandler)
      .mock.calls.at(-1)?.[0] as () => void;

    act(() => aviso());

    expect(screen.getByText('sin sesión')).toBeInTheDocument();
    expect(sesionGuardada()).toBeNull();
  });

  it('actualizarSaldo cambia los puntos y apaga el 15%', async () => {
    guardarSesion();
    const user = renderizar();
    await waitFor(() => expect(getMe).toHaveBeenCalled());

    await user.click(screen.getByRole('button', { name: 'Comprar' }));

    expect(screen.getByText('Ana: 42')).toBeInTheDocument();
    expect(screen.getByText('15%: false')).toBeInTheDocument();
  });

  it.each([
    ['JSON roto', '{no es json'],
    ['sin token', '{"usuario":{"first_name":"Ana","points":1,"role":"admin"}}'],
    [
      'rol desconocido',
      '{"token":"t","usuario":{"first_name":"Ana","points":1,"role":"root"}}',
    ],
  ])('ignora lo guardado si es inválido (%s)', (_caso, guardado) => {
    localStorage.setItem(CLAVE_SESION, guardado);
    renderizar();
    expect(screen.getByText('sin sesión')).toBeInTheDocument();
  });

  it('si localStorage falla, la sesión funciona igual', async () => {
    const getItem = vi
      .spyOn(Storage.prototype, 'getItem')
      .mockImplementation(() => {
        throw new Error('bloqueado');
      });
    const setItem = vi
      .spyOn(Storage.prototype, 'setItem')
      .mockImplementation(() => {
        throw new Error('bloqueado');
      });
    vi.mocked(loginUser).mockResolvedValue(sesion);

    const user = renderizar();
    await user.click(screen.getByRole('button', { name: 'Login' }));
    expect(await screen.findByText('Ana: 0')).toBeInTheDocument();

    getItem.mockRestore();
    setItem.mockRestore();
  });

  it('useAuth fuera del provider avisa con un error claro', () => {
    const consola = vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => render(<Prueba />)).toThrow(
      'useAuth debe usarse dentro de un <AuthProvider>',
    );
    consola.mockRestore();
  });
});
