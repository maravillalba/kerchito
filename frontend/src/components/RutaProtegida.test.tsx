import { screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getProducts } from '../services/api';
import { guardarSesion, renderApp, rutaActual } from '../test-utils';

vi.mock('../services/api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../services/api')>();
  return { ...actual, getProducts: vi.fn() };
});

beforeEach(() => {
  vi.mocked(getProducts).mockReset().mockResolvedValue([]);
});

describe('ruta protegida /admin', () => {
  it.each(['/admin', '/admin/productos', '/admin/pedidos'])(
    'sin sesión, %s redirige a /login',
    (path) => {
      renderApp(path);
      expect(rutaActual()).toBe('/login');
      expect(getProducts).not.toHaveBeenCalled();
    },
  );

  it('con sesión de cliente redirige a /login', () => {
    guardarSesion('cliente');
    renderApp('/admin');
    expect(rutaActual()).toBe('/login');
  });

  it('con sesión de admin muestra el panel, sin Header ni Footer', async () => {
    guardarSesion('admin');
    renderApp('/admin');
    expect(
      await screen.findByRole('heading', { name: '¡Buen día, equipo!' }),
    ).toBeInTheDocument();
    expect(rutaActual()).toBe('/admin');
    expect(screen.queryByRole('banner')).not.toBeInTheDocument();
    expect(screen.queryByRole('contentinfo')).not.toBeInTheDocument();
  });

  it('"Cerrar sesión" vuelve a /bienvenida y no a /login', async () => {
    guardarSesion('admin');
    const user = renderApp('/admin');
    await user.click(screen.getByRole('button', { name: 'Cerrar sesión' }));

    expect(
      await screen.findByRole('heading', {
        name: '¡Bienvenido! ¿Cómo querés seguir?',
      }),
    ).toBeInTheDocument();
    expect(rutaActual()).toBe('/bienvenida');
    expect(localStorage.getItem('kiosko.sesion')).toBeNull();
  });
});
