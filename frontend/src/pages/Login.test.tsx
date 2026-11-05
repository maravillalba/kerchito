import { screen, within } from '@testing-library/react';
import type { UserEvent } from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getProducts } from '../services/api';
import { renderApp, rutaActual } from '../test-utils';
import { yaVioBienvenida } from '../utils/primeraVisita';

vi.mock('../services/api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../services/api')>();
  return { ...actual, getProducts: vi.fn() };
});

beforeEach(() => {
  vi.mocked(getProducts).mockReset().mockResolvedValue([]);
});

async function completar(user: UserEvent, email: string, password: string) {
  await user.type(screen.getByLabelText('Correo electrónico'), email);
  await user.type(screen.getByLabelText('Contraseña'), password);
}

const botonIngresar = () => screen.getByRole('button', { name: 'Ingresar' });

describe('Login: pantalla', () => {
  it('muestra el panel con los 3 pasos, sin Header ni Footer', () => {
    renderApp('/login');
    expect(
      screen.getByRole('heading', { name: 'Cada pedido te suma puntos' }),
    ).toBeInTheDocument();
    expect(
      within(screen.getByRole('list')).getAllByRole('listitem'),
    ).toHaveLength(3);
    expect(screen.queryByRole('banner')).not.toBeInTheDocument();
    expect(screen.queryByRole('contentinfo')).not.toBeInTheDocument();
  });

  it('"¿Olvidaste tu contraseña?" es decorativo: sin link ni botón', () => {
    renderApp('/login');
    expect(screen.getByText(/¿Olvidaste tu contraseña\?/)).toBeInTheDocument();
    expect(
      screen.queryByRole('link', { name: /Recuperarla/ }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: /Recuperarla/ }),
    ).not.toBeInTheDocument();
  });

  it('"Seguir como invitado" entra a la tienda sin rebotar a /bienvenida', async () => {
    const user = renderApp('/login');
    await user.click(
      screen.getByRole('link', { name: 'Seguir como invitado' }),
    );
    expect(yaVioBienvenida()).toBe(true);
    expect(rutaActual()).toBe('/');
  });
});

describe('Login: pestañas', () => {
  it('"Crear cuenta" agrega el campo nombre', async () => {
    const user = renderApp('/login');
    expect(screen.queryByLabelText('Nombre')).not.toBeInTheDocument();

    await user.click(screen.getByRole('tab', { name: 'Crear cuenta' }));

    expect(screen.getByLabelText('Nombre')).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Crear cuenta' })).toHaveAttribute(
      'aria-selected',
      'true',
    );
    expect(screen.getByRole('tabpanel')).toHaveAccessibleName('Crear cuenta');
  });

  it('con las flechas se cambia de pestaña y el foco la acompaña', async () => {
    const user = renderApp('/login');
    screen.getByRole('tab', { name: 'Ingresar' }).focus();
    await user.keyboard('{ArrowRight}');
    expect(screen.getByRole('tab', { name: 'Crear cuenta' })).toHaveFocus();
    await user.keyboard('{ArrowLeft}');
    expect(screen.getByRole('tab', { name: 'Ingresar' })).toHaveFocus();
  });

  it('cambiar de pestaña borra los errores', async () => {
    const user = renderApp('/login');
    await user.click(botonIngresar());
    expect(screen.getByLabelText('Correo electrónico')).toBeInvalid();

    await user.click(screen.getByRole('tab', { name: 'Crear cuenta' }));

    expect(screen.getByLabelText('Correo electrónico')).toBeValid();
  });
});

describe('Login: validaciones', () => {
  it('asocia los errores a cada campo y enfoca el primero', async () => {
    const user = renderApp('/login');
    await user.click(botonIngresar());

    const correo = screen.getByLabelText('Correo electrónico');
    const clave = screen.getByLabelText('Contraseña');
    expect(correo).toHaveAccessibleDescription(/correo válido/);
    expect(clave).toHaveAccessibleDescription(/al menos 6 caracteres/);
    expect(correo).toHaveFocus();
    expect(rutaActual()).toBe('/login');
  });

  it('rechaza un correo sin formato válido', async () => {
    const user = renderApp('/login');
    await completar(user, 'ana@mail', 'secreta1');
    await user.click(botonIngresar());
    expect(screen.getByLabelText('Correo electrónico')).toBeInvalid();
    expect(screen.getByLabelText('Contraseña')).toBeValid();
  });

  it('acepta justo 6 caracteres y rechaza 5', async () => {
    const user = renderApp('/login');
    await completar(user, 'nadie@mail.com', '12345');
    await user.click(botonIngresar());
    expect(screen.getByLabelText('Contraseña')).toBeInvalid();

    await user.type(screen.getByLabelText('Contraseña'), '6');
    await user.click(botonIngresar());
    expect(screen.getByLabelText('Contraseña')).toBeValid();
  });

  it('corregir un campo quita su error', async () => {
    const user = renderApp('/login');
    await user.click(botonIngresar());
    await user.type(screen.getByLabelText('Correo electrónico'), 'a');
    expect(screen.getByLabelText('Correo electrónico')).not.toHaveAttribute(
      'aria-invalid',
    );
    expect(screen.getByLabelText('Contraseña')).toBeInvalid();
  });

  it('en Crear cuenta el nombre es obligatorio', async () => {
    const user = renderApp('/login');
    await user.click(screen.getByRole('tab', { name: 'Crear cuenta' }));
    await completar(user, 'nueva@mail.com', 'secreta1');
    await user.type(screen.getByLabelText('Nombre'), '   ');
    await user.click(screen.getByRole('button', { name: 'Crear cuenta' }));
    expect(screen.getByLabelText('Nombre')).toHaveAccessibleDescription(
      'Ingresá tu nombre.',
    );
    expect(rutaActual()).toBe('/login');
  });
});

describe('Login: ingreso', () => {
  it('la cuenta admin va a /admin', async () => {
    const user = renderApp('/login');
    await completar(user, 'admin@kiosko.com', 'kerchi123');
    await user.click(botonIngresar());
    expect(
      await screen.findByRole('heading', { name: '¡Buen día, equipo!' }),
    ).toBeInTheDocument();
    expect(rutaActual()).toBe('/admin');
  });

  it('la cuenta cliente va a / y no rebota a /bienvenida', async () => {
    const user = renderApp('/login');
    await completar(user, 'cliente@kiosko.com', 'kerchi123');
    await user.click(botonIngresar());
    expect(await screen.findByRole('banner')).toHaveTextContent('Cliente');
    expect(rutaActual()).toBe('/');
  });

  it('ignora mayúsculas y espacios en el correo', async () => {
    const user = renderApp('/login');
    await completar(user, ' Admin@Kiosko.com ', 'kerchi123');
    await user.click(botonIngresar());
    expect(rutaActual()).toBe('/admin');
  });

  it.each([
    ['admin@kiosko.com', 'otra-clave'],
    ['nadie@mail.com', 'kerchi123'],
  ])('rechaza %s con una contraseña incorrecta', async (email, password) => {
    const user = renderApp('/login');
    await completar(user, email, password);
    await user.click(botonIngresar());
    expect(screen.getByRole('alert')).toHaveTextContent(
      'El correo o la contraseña no son correctos.',
    );
    expect(rutaActual()).toBe('/login');
  });
});

describe('Login: crear cuenta', () => {
  it('un correo nuevo queda como cliente y va a /', async () => {
    const user = renderApp('/login');
    await user.click(screen.getByRole('tab', { name: 'Crear cuenta' }));
    await user.type(screen.getByLabelText('Nombre'), 'Ana');
    await completar(user, 'ana@mail.com', 'secreta1');
    await user.click(screen.getByRole('button', { name: 'Crear cuenta' }));

    expect(await screen.findByRole('banner')).toHaveTextContent('Ana');
    expect(rutaActual()).toBe('/');
    expect(JSON.parse(localStorage.getItem('kiosko.sesion') ?? '')).toEqual({
      nombre: 'Ana',
      email: 'ana@mail.com',
      rol: 'cliente',
    });
  });

  it('no deja registrarse con el correo de una cuenta existente', async () => {
    const user = renderApp('/login');
    await user.click(screen.getByRole('tab', { name: 'Crear cuenta' }));
    await user.type(screen.getByLabelText('Nombre'), 'Ana');
    await completar(user, 'admin@kiosko.com', 'secreta1');
    await user.click(screen.getByRole('button', { name: 'Crear cuenta' }));

    expect(screen.getByRole('alert')).toHaveTextContent(
      'Ya existe una cuenta con ese correo.',
    );
    expect(localStorage.getItem('kiosko.sesion')).toBeNull();
  });
});
