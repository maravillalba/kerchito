import { act, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AuthProvider, useAuth } from './AuthContext';

function renderAuth() {
  return renderHook(() => useAuth(), { wrapper: AuthProvider }).result;
}

describe('AuthContext', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('arranca sin usuario', () => {
    expect(renderAuth().current.usuario).toBeNull();
  });

  it('el login guarda la sesión y logout la borra', () => {
    const auth = renderAuth();
    act(() => {
      auth.current.login('admin@kiosko.com', 'kerchi123');
    });
    expect(auth.current.usuario).toEqual({
      nombre: 'Admin',
      email: 'admin@kiosko.com',
      rol: 'admin',
    });
    expect(localStorage.getItem('kiosko.sesion')).toContain('admin@kiosko.com');

    act(() => auth.current.logout());
    expect(auth.current.usuario).toBeNull();
    expect(localStorage.getItem('kiosko.sesion')).toBeNull();
  });

  it('nunca guarda la contraseña', () => {
    const auth = renderAuth();
    act(() => {
      auth.current.login('admin@kiosko.com', 'kerchi123');
    });
    expect(localStorage.getItem('kiosko.sesion')).not.toContain('kerchi123');
  });

  it('recupera la sesión guardada', () => {
    const usuario = { nombre: 'Ana', email: 'a@b.co', rol: 'cliente' };
    localStorage.setItem('kiosko.sesion', JSON.stringify(usuario));
    expect(renderAuth().current.usuario).toEqual(usuario);
  });

  it.each([
    ['JSON roto', '{roto'],
    ['rol desconocido', '{"nombre":"A","email":"a@b.co","rol":"dueño"}'],
    ['sin nombre', '{"email":"a@b.co","rol":"admin"}'],
  ])('ignora una sesión guardada inválida: %s', (_caso, guardado) => {
    localStorage.setItem('kiosko.sesion', guardado);
    expect(renderAuth().current.usuario).toBeNull();
  });

  it('sin acceso a localStorage la sesión sigue en memoria', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('bloqueado');
    });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('bloqueado');
    });
    const auth = renderAuth();
    expect(auth.current.usuario).toBeNull();
    act(() => {
      auth.current.login('cliente@kiosko.com', 'kerchi123');
    });
    expect(auth.current.usuario?.rol).toBe('cliente');
  });

  it('useAuth fuera del provider avisa con un error', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => renderHook(() => useAuth())).toThrow(/AuthProvider/);
  });
});
