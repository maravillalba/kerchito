import { screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  ApiError,
  getMe,
  getProducts,
  loginUser,
  registerUser,
} from '../services/api';
import {
  guardarSesion,
  renderApp,
  rutaActual,
  usuarioDePrueba,
} from '../test-utils';

vi.mock('../services/api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../services/api')>();
  return {
    ...actual,
    getMe: vi.fn(),
    getProducts: vi.fn(),
    loginUser: vi.fn(),
    registerUser: vi.fn(),
  };
});

const cliente = usuarioDePrueba();
const admin = usuarioDePrueba({ role: 'admin', first_name: 'Admin' });

beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(getProducts).mockResolvedValue([]);
  vi.mocked(getMe).mockResolvedValue(cliente);
});

describe('Entrada', () => {
  it('invita a sumarse con el 15% y lleva a crear cuenta', () => {
    renderApp('/bienvenida');
    expect(
      screen.getByRole('heading', { name: 'Sumate a Kiosko El Rápido' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: /Sumarme y obtener mi 15%/ }),
    ).toHaveAttribute('href', '/registro');
  });

  it('ofrece ingresar y el acceso del personal, los dos al mismo login', () => {
    renderApp('/bienvenida');
    expect(screen.getByRole('link', { name: 'Ingresar' })).toHaveAttribute(
      'href',
      '/ingresar',
    );
    expect(
      screen.getByRole('link', { name: 'Acceso del personal' }),
    ).toHaveAttribute('href', '/ingresar');
  });

  it('no tiene ninguna opción de comprar como invitado', () => {
    renderApp('/bienvenida');
    expect(screen.queryByText(/invitado/i)).not.toBeInTheDocument();
    const destinos = screen
      .getAllByRole('link')
      .map((link) => link.getAttribute('href'));
    expect(destinos).not.toContain('/');
  });
});

describe('Registro', () => {
  async function completar(
    user: ReturnType<typeof renderApp>,
    { clave2 = 'clave-larga', terminos = true } = {},
  ) {
    await user.type(screen.getByLabelText('Nombre'), ' Ana ');
    await user.type(screen.getByLabelText('Apellido'), 'Pérez');
    await user.type(
      screen.getByLabelText('Correo electrónico'),
      'ana@mail.com',
    );
    await user.type(screen.getByLabelText('Contraseña'), 'clave-larga');
    await user.type(screen.getByLabelText('Repetir contraseña'), clave2);
    if (terminos) {
      await user.click(screen.getByRole('checkbox'));
    }
  }

  function enviar(user: ReturnType<typeof renderApp>) {
    return user.click(screen.getByRole('button', { name: 'Crear mi cuenta' }));
  }

  it('con datos válidos crea la cuenta y pasa a la tienda', async () => {
    vi.mocked(registerUser).mockResolvedValue({
      token: 't',
      expires_at: '',
      user: cliente,
    });
    const user = renderApp('/registro');

    await completar(user);
    await enviar(user);

    await waitFor(() => expect(rutaActual()).toBe('/'));
    expect(registerUser).toHaveBeenCalledWith({
      first_name: 'Ana',
      last_name: 'Pérez',
      email: 'ana@mail.com',
      phone: null,
      password: 'clave-larga',
    });
  });

  it('la casilla de datos dice el texto acordado y no viene marcada', () => {
    renderApp('/registro');
    const casilla = screen.getByRole('checkbox', {
      name: 'Acepto que usen mis datos para el programa de puntos',
    });
    expect(casilla).not.toBeChecked();
  });

  it('sin completar nada marca los campos y lleva el foco al primero', async () => {
    const user = renderApp('/registro');

    await enviar(user);

    expect(screen.getByText('Ingresá tu nombre.')).toBeInTheDocument();
    expect(screen.getByText('Ingresá tu apellido.')).toBeInTheDocument();
    expect(screen.getByText(/Ingresá un correo válido/)).toBeInTheDocument();
    expect(screen.getByText(/al menos 8 caracteres/)).toBeInTheDocument();
    expect(screen.getByText(/aceptar el uso de tus datos/)).toBeInTheDocument();
    expect(screen.getByLabelText('Nombre')).toHaveFocus();
    expect(screen.getByLabelText('Nombre')).toHaveAttribute(
      'aria-invalid',
      'true',
    );
    expect(registerUser).not.toHaveBeenCalled();
  });

  it('avisa si las contraseñas no coinciden', async () => {
    const user = renderApp('/registro');
    await completar(user, { clave2: 'otra-clave-larga' });
    await enviar(user);
    expect(
      screen.getByText('Las contraseñas no coinciden.'),
    ).toBeInTheDocument();
    expect(registerUser).not.toHaveBeenCalled();
  });

  it('sin aceptar el uso de los datos no envía', async () => {
    const user = renderApp('/registro');
    await completar(user, { terminos: false });
    await enviar(user);
    expect(screen.getByText(/aceptar el uso de tus datos/)).toBeInTheDocument();
    expect(registerUser).not.toHaveBeenCalled();
  });

  it('un correo ya registrado se muestra en su campo', async () => {
    vi.mocked(registerUser).mockRejectedValue(
      new ApiError(409, 'Ya existe una cuenta con ese correo'),
    );
    const user = renderApp('/registro');

    await completar(user);
    await enviar(user);

    expect(
      await screen.findByText('Ya existe una cuenta con ese correo'),
    ).toBeInTheDocument();
    expect(screen.getByLabelText('Correo electrónico')).toHaveFocus();
    expect(rutaActual()).toBe('/registro');
    expect(
      screen.getByRole('button', { name: 'Crear mi cuenta' }),
    ).toBeEnabled();
  });

  it('sin conexión muestra el motivo', async () => {
    vi.mocked(registerUser).mockRejectedValue(
      new ApiError(0, 'No se pudo conectar con el servidor.', 'network'),
    );
    const user = renderApp('/registro');
    await completar(user);
    await enviar(user);
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'No se pudo conectar con el servidor.',
    );
  });
});

describe('Ingresar', () => {
  async function ingresar(user: ReturnType<typeof renderApp>) {
    await user.type(
      screen.getByLabelText('Correo electrónico'),
      'ana@mail.com',
    );
    await user.type(screen.getByLabelText('Contraseña'), 'clave-larga');
    await user.click(screen.getByRole('button', { name: 'Ingresar' }));
  }

  it('un cliente pasa a la tienda', async () => {
    vi.mocked(loginUser).mockResolvedValue({
      token: 't',
      expires_at: '',
      user: cliente,
    });
    const user = renderApp('/ingresar');
    await ingresar(user);
    await waitFor(() => expect(rutaActual()).toBe('/'));
  });

  it('un admin pasa al panel', async () => {
    vi.mocked(getMe).mockResolvedValue(admin);
    vi.mocked(loginUser).mockResolvedValue({
      token: 't',
      expires_at: '',
      user: admin,
    });
    const user = renderApp('/ingresar');
    await ingresar(user);
    await waitFor(() => expect(rutaActual()).toBe('/admin'));
  });

  it('con datos incorrectos muestra el mensaje del backend y se queda', async () => {
    vi.mocked(loginUser).mockRejectedValue(
      new ApiError(401, 'Correo o contraseña incorrectos'),
    );
    const user = renderApp('/ingresar');
    await ingresar(user);
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Correo o contraseña incorrectos',
    );
    expect(rutaActual()).toBe('/ingresar');
  });

  it('sin completar no llama al backend', async () => {
    const user = renderApp('/ingresar');
    await user.click(screen.getByRole('button', { name: 'Ingresar' }));
    expect(screen.getByText('Ingresá tu correo.')).toBeInTheDocument();
    expect(screen.getByText('Ingresá tu contraseña.')).toBeInTheDocument();
    expect(loginUser).not.toHaveBeenCalled();
  });
});

describe('Header con sesión', () => {
  it('saluda, muestra los puntos y cierra la sesión volviendo a la Entrada', async () => {
    guardarSesion(usuarioDePrueba({ points: 120 }));
    vi.mocked(getMe).mockResolvedValue(usuarioDePrueba({ points: 120 }));
    const user = renderApp('/');

    const banner = within(screen.getByRole('banner'));
    expect(await banner.findByText(/Hola, Ana · 120 pts/)).toBeInTheDocument();

    await user.click(banner.getByRole('button', { name: 'Cerrar sesión' }));

    expect(rutaActual()).toBe('/bienvenida');
  });

  it('el admin en la tienda ve el acceso al panel y no puntos', async () => {
    guardarSesion(admin);
    vi.mocked(getMe).mockResolvedValue(admin);
    renderApp('/products');

    const banner = within(screen.getByRole('banner'));
    expect(banner.getByRole('link', { name: 'Panel' })).toHaveAttribute(
      'href',
      '/admin',
    );
    expect(banner.queryByText(/pts/)).not.toBeInTheDocument();
    await waitFor(() => expect(getMe).toHaveBeenCalled());
  });
});
