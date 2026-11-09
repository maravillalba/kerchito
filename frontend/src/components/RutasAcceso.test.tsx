import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthProvider, useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { getMe, getProducts } from '../services/api';
import {
  guardarSesion,
  renderApp,
  rutaActual,
  usuarioDePrueba,
} from '../test-utils';
import type { Product } from '../types';
import CarritoDeLaSesion from './CarritoDeLaSesion';

vi.mock('../services/api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../services/api')>();
  return { ...actual, getMe: vi.fn(), getProducts: vi.fn() };
});

// La constante arranca en true; un test la cambia para probar la tienda abierta.
const acceso = vi.hoisted(() => ({ requiere: true }));
vi.mock('../utils/acceso', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../utils/acceso')>();
  return {
    ...actual,
    get TIENDA_REQUIERE_SESION() {
      return acceso.requiere;
    },
  };
});

const cliente = usuarioDePrueba();
const admin = usuarioDePrueba({ role: 'admin' });

beforeEach(() => {
  vi.resetAllMocks();
  acceso.requiere = true;
  vi.mocked(getProducts).mockResolvedValue([]);
  vi.mocked(getMe).mockResolvedValue(cliente);
});

describe('sin sesión', () => {
  it.each(['/', '/products', '/products/1', '/cart', '/no-existe'])(
    '%s redirige a la Entrada',
    (ruta) => {
      renderApp(ruta);
      expect(rutaActual()).toBe('/bienvenida');
    },
  );

  it.each(['/admin', '/admin/inventario'])(
    '%s redirige a la Entrada',
    (ruta) => {
      renderApp(ruta);
      expect(rutaActual()).toBe('/bienvenida');
    },
  );

  it.each(['/bienvenida', '/registro', '/ingresar'])(
    '%s se puede ver',
    (ruta) => {
      renderApp(ruta);
      expect(rutaActual()).toBe(ruta);
    },
  );

  it('con TIENDA_REQUIERE_SESION en false la tienda queda abierta', () => {
    acceso.requiere = false;
    renderApp('/products');
    expect(rutaActual()).toBe('/products');
  });
});

describe('con sesión de cliente', () => {
  beforeEach(() => guardarSesion(cliente));

  it('entra a la tienda', async () => {
    renderApp('/products');
    expect(rutaActual()).toBe('/products');
    await waitFor(() => expect(getMe).toHaveBeenCalled());
  });

  it.each(['/bienvenida', '/registro', '/ingresar'])(
    '%s lleva a la tienda',
    async (ruta) => {
      renderApp(ruta);
      expect(rutaActual()).toBe('/');
      await waitFor(() => expect(getMe).toHaveBeenCalled());
    },
  );

  it('no puede entrar al panel', async () => {
    renderApp('/admin');
    expect(rutaActual()).toBe('/');
    await waitFor(() => expect(getMe).toHaveBeenCalled());
  });
});

describe('con sesión de admin', () => {
  beforeEach(() => {
    guardarSesion(admin);
    vi.mocked(getMe).mockResolvedValue(admin);
  });

  it('entra al panel', async () => {
    renderApp('/admin');
    expect(rutaActual()).toBe('/admin');
    await waitFor(() => expect(getMe).toHaveBeenCalled());
  });

  it.each(['/bienvenida', '/ingresar'])('%s lleva al panel', async (ruta) => {
    renderApp(ruta);
    expect(rutaActual()).toBe('/admin');
    await waitFor(() => expect(getMe).toHaveBeenCalled());
  });
});

describe('rol editado a mano en localStorage', () => {
  it('el backend manda: al confirmar el usuario real, pierde el panel', async () => {
    guardarSesion(admin);
    vi.mocked(getMe).mockResolvedValue(cliente);
    renderApp('/admin');
    await waitFor(() => expect(rutaActual()).toBe('/'));
  });
});

describe('CarritoDeLaSesion', () => {
  const coca: Product = {
    id: 1,
    brand: 'Coca-Cola',
    name: 'Original',
    unit: '500 ml',
    category: 'bebidas',
    price: 1200,
    stock: 5,
  };

  function Prueba() {
    const { totalItems, addToCart } = useCart();
    const { logout } = useAuth();
    return (
      <>
        <p>Unidades: {totalItems}</p>
        <button onClick={() => addToCart(coca, 2)}>Agregar</button>
        <button onClick={logout}>Salir</button>
      </>
    );
  }

  it('al cerrar sesión el carrito queda vacío', async () => {
    guardarSesion(cliente);
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <AuthProvider>
          <CarritoDeLaSesion>
            <Prueba />
          </CarritoDeLaSesion>
        </AuthProvider>
      </MemoryRouter>,
    );

    await user.click(screen.getByRole('button', { name: 'Agregar' }));
    expect(screen.getByText('Unidades: 2')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Salir' }));
    expect(screen.getByText('Unidades: 0')).toBeInTheDocument();
  });
});
