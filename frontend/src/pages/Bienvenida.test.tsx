import { screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getProducts } from '../services/api';
import { guardarSesion, renderApp, rutaActual } from '../test-utils';
import { marcarBienvenidaVista, yaVioBienvenida } from '../utils/primeraVisita';

vi.mock('../services/api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../services/api')>();
  return { ...actual, getProducts: vi.fn() };
});

beforeEach(() => {
  vi.mocked(getProducts).mockReset().mockResolvedValue([]);
});

describe('Bienvenida', () => {
  it('muestra el título, las dos opciones y el acceso del personal', () => {
    renderApp('/bienvenida');
    expect(
      screen.getByRole('heading', {
        name: '¡Bienvenido! ¿Cómo querés seguir?',
      }),
    ).toBeInTheDocument();
    expect(screen.getByText(/¡Hola! Soy Kerchi/)).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: /Quiero comprar/ }),
    ).toHaveAttribute('href', '/');
    expect(
      screen.getByRole('link', { name: /Iniciar sesión.*SUMÁ PUNTOS/ }),
    ).toHaveAttribute('href', '/login');
    expect(
      screen.getByRole('link', { name: 'Acceso del personal' }),
    ).toHaveAttribute('href', '/login');
  });

  it('no muestra el Header ni el Footer de la tienda', () => {
    renderApp('/bienvenida');
    expect(screen.queryByRole('banner')).not.toBeInTheDocument();
    expect(screen.queryByRole('contentinfo')).not.toBeInTheDocument();
  });

  it('"Iniciar sesión" lleva al login', async () => {
    const user = renderApp('/bienvenida');
    await user.click(screen.getByRole('link', { name: /Iniciar sesión/ }));
    expect(rutaActual()).toBe('/login');
  });
});

describe('primera visita', () => {
  it('sin la marca, / redirige a /bienvenida sin pedir productos', () => {
    renderApp('/');
    expect(rutaActual()).toBe('/bienvenida');
    expect(getProducts).not.toHaveBeenCalled();
  });

  it('"Quiero comprar" guarda la marca y entra a la tienda', async () => {
    const user = renderApp('/');
    expect(yaVioBienvenida()).toBe(false);

    await user.click(screen.getByRole('link', { name: /Quiero comprar/ }));

    expect(yaVioBienvenida()).toBe(true);
    expect(rutaActual()).toBe('/');
    expect(await screen.findByRole('banner')).toBeInTheDocument();
  });

  it('con la marca, / muestra la tienda', () => {
    marcarBienvenidaVista();
    renderApp('/');
    expect(rutaActual()).toBe('/');
  });

  it('con sesión iniciada, / muestra la tienda aunque no haya marca', () => {
    guardarSesion('cliente');
    renderApp('/');
    expect(rutaActual()).toBe('/');
  });

  it.each(['/products', '/cart', '/no-existe'])(
    'la ruta %s no se redirige',
    async (path) => {
      renderApp(path);
      expect(await screen.findByRole('banner')).toBeInTheDocument();
      expect(rutaActual()).toBe(path);
    },
  );
});
