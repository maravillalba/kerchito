import { screen, waitFor, within } from '@testing-library/react';
import type { UserEvent } from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError, getProducts } from '../../services/api';
import { guardarSesion, renderApp, rutaActual } from '../../test-utils';
import type { Product } from '../../types';

vi.mock('../../services/api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../services/api')>();
  return { ...actual, getProducts: vi.fn() };
});

const coca: Product = {
  id: 1,
  brand: 'Coca-Cola',
  name: 'Original',
  unit: '500 ml',
  category: 'bebidas',
  price: 1200,
  offer_price: 1000,
  stock: 25,
  description: 'Gaseosa clásica',
  image: '/productos/coca.webp',
};

const cif: Product = {
  id: 2,
  brand: 'Cif',
  name: 'Detergente limón',
  unit: '500 ml',
  category: 'limpieza',
  price: 1400,
  offer_price: null,
  stock: 3,
  image: null,
};

const harina: Product = {
  id: 7,
  brand: 'Favorita',
  name: 'Harina 000',
  unit: '1 kg',
  category: 'almacen',
  price: 1500,
  stock: 40,
};

beforeEach(() => {
  vi.mocked(getProducts).mockReset().mockResolvedValue([coca, cif, harina]);
  guardarSesion('admin');
});

async function abrirProductos() {
  const user = renderApp('/admin/productos');
  await screen.findByRole('table');
  return user;
}

const filas = () => screen.getAllByRole('row').slice(1);
const fila = (nombre: string) =>
  screen.getByRole('cell', { name: nombre }).closest('tr') as HTMLElement;

async function abrirNuevo(user: UserEvent) {
  await user.click(screen.getByRole('button', { name: '+ Nuevo producto' }));
  return screen.getByRole('dialog', { name: 'Nuevo producto' });
}

async function abrirEdicion(user: UserEvent, nombre: string) {
  await user.click(screen.getByRole('button', { name: `Editar ${nombre}` }));
  return screen.getByRole('dialog', { name: 'Editar producto' });
}

async function reemplazar(user: UserEvent, label: string, valor: string) {
  const campo = screen.getByLabelText(label);
  await user.clear(campo);
  if (valor) {
    await user.type(campo, valor);
  }
}

async function completarNuevo(user: UserEvent) {
  await user.type(screen.getByLabelText('Marca'), 'Arcor');
  await user.type(screen.getByLabelText('Nombre'), 'Bon o Bon');
  await user.type(screen.getByLabelText('Unidad'), '15 g');
  await user.selectOptions(screen.getByLabelText('Categoría'), 'Almacén');
  await user.type(screen.getByLabelText('Precio'), '500');
  await user.type(screen.getByLabelText('Stock'), '10');
}

const guardar = (user: UserEvent) =>
  user.click(screen.getByRole('button', { name: 'Guardar' }));

describe('Panel: navegación', () => {
  it('muestra las 6 secciones y marca la actual', async () => {
    renderApp('/admin');
    const nav = screen.getByRole('navigation', { name: 'Secciones del panel' });
    expect(within(nav).getAllByRole('link')).toHaveLength(6);
    expect(within(nav).getByRole('link', { name: /Resumen/ })).toHaveAttribute(
      'aria-current',
      'page',
    );
    await screen.findByText('1 producto con stock bajo');
  });

  it('el botón Menú indica si está abierto y se cierra al elegir', async () => {
    const user = renderApp('/admin');
    const menu = screen.getByRole('button', { name: 'Menú' });
    expect(menu).toHaveAttribute('aria-expanded', 'false');

    await user.click(menu);
    expect(menu).toHaveAttribute('aria-expanded', 'true');

    await user.click(screen.getByRole('link', { name: /Productos/ }));
    expect(menu).toHaveAttribute('aria-expanded', 'false');
    expect(rutaActual()).toBe('/admin/productos');
    await screen.findByRole('table');
  });

  it.each([
    ['/admin/pedidos', 'Pedidos'],
    ['/admin/stock', 'Stock'],
    ['/admin/ofertas', 'Ofertas'],
    ['/admin/clientes', 'Clientes y puntos'],
  ])('%s muestra "Próximamente" con Kerchi pensando', async (path, titulo) => {
    renderApp(path);
    expect(screen.getByRole('heading', { name: titulo })).toBeInTheDocument();
    expect(screen.getByText('Próximamente')).toBeInTheDocument();
    expect(document.querySelector('.mascota--pensando')).toBeInTheDocument();
    await waitFor(() => expect(getProducts).toHaveBeenCalled());
  });

  it('una sección que no existe vuelve al Resumen', async () => {
    renderApp('/admin/no-existe');
    expect(
      await screen.findByRole('heading', { name: '¡Buen día, equipo!' }),
    ).toBeInTheDocument();
    expect(rutaActual()).toBe('/admin');
  });
});

describe('Panel: Resumen', () => {
  it('muestra los indicadores de ejemplo y las dos cajas', async () => {
    renderApp('/admin');
    await screen.findByText('1 producto con stock bajo');
    expect(screen.getByText('Ventas de hoy')).toBeInTheDocument();
    expect(screen.getByText('Ventas de hoy').closest('div')).toHaveTextContent(
      /184\.300/,
    );
    expect(screen.getByText('Ticket promedio')).toBeInTheDocument();
    expect(
      within(
        screen
          .getByRole('heading', { name: 'Más vendidos de la semana' })
          .closest('section') as HTMLElement,
      ).getAllByRole('listitem'),
    ).toHaveLength(5);
    expect(
      screen.getByRole('table', { name: 'Pedidos recientes' }),
    ).toHaveTextContent('#37');
  });

  it('el stock bajo sale de los productos reales', async () => {
    vi.mocked(getProducts).mockResolvedValue([
      { ...cif, id: 1 },
      { ...cif, id: 2, stock: 0 },
      harina,
    ]);
    renderApp('/admin');
    expect(
      await screen.findByText('2 productos con stock bajo'),
    ).toBeInTheDocument();
    const indicador = screen.getByText('Stock bajo').closest('div');
    expect(indicador).toHaveTextContent('2');
    expect(indicador).toHaveTextContent('Reponer pronto');
  });

  it('sin stock bajo lo dice y no pide reponer', async () => {
    vi.mocked(getProducts).mockResolvedValue([harina]);
    renderApp('/admin');
    expect(
      await screen.findByText('Sin productos con stock bajo'),
    ).toBeInTheDocument();
    expect(screen.getByText('Todo en orden')).toBeInTheDocument();
    expect(screen.queryByText('Reponer pronto')).not.toBeInTheDocument();
  });

  it('si falla el backend, el resto del Resumen sigue en pie', async () => {
    vi.mocked(getProducts).mockRejectedValue(new ApiError(500, 'error'));
    renderApp('/admin');
    expect(
      await screen.findByText('No se pudo revisar el stock'),
    ).toBeInTheDocument();
    expect(screen.getByText('Stock bajo').closest('div')).toHaveTextContent(
      '—',
    );
    expect(screen.getByText('Ventas de hoy')).toBeInTheDocument();
  });
});

describe('Panel: tabla de productos', () => {
  it('muestra una fila por producto real', async () => {
    await abrirProductos();
    expect(filas()).toHaveLength(3);
    expect(fila('Coca-Cola Original 500 ml')).toHaveTextContent('Bebidas');
    expect(fila('Cif Detergente limón 500 ml')).toHaveTextContent('Limpieza');
  });

  it('avisa que es una demostración', async () => {
    await abrirProductos();
    expect(
      screen.getByText('Modo demostración: los cambios no se guardan'),
    ).toBeInTheDocument();
  });

  it('con oferta muestra los dos precios y la etiqueta; sin oferta, uno', async () => {
    await abrirProductos();
    const conOferta = fila('Coca-Cola Original 500 ml');
    expect(conOferta.querySelector('del')).toHaveTextContent('1.200');
    expect(conOferta).toHaveTextContent('1.000');
    expect(within(conOferta).getByText('OFERTA')).toBeInTheDocument();

    const sinOferta = fila('Favorita Harina 000 1 kg');
    expect(sinOferta.querySelector('del')).not.toBeInTheDocument();
    expect(within(sinOferta).queryByText('OFERTA')).not.toBeInTheDocument();
  });

  it('marca en rojo solo el stock menor a 5', async () => {
    await abrirProductos();
    expect(
      within(fila('Cif Detergente limón 500 ml')).getByText('(stock bajo)'),
    ).toBeInTheDocument();
    expect(
      within(fila('Favorita Harina 000 1 kg')).queryByText('(stock bajo)'),
    ).not.toBeInTheDocument();
  });

  it('si falla la carga muestra el error y permite reintentar', async () => {
    vi.mocked(getProducts).mockRejectedValueOnce(
      new ApiError(0, 'No se pudo conectar.', 'network'),
    );
    const user = renderApp('/admin/productos');
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'No se pudo conectar.',
    );
    expect(
      screen.getByRole('button', { name: '+ Nuevo producto' }),
    ).toBeDisabled();

    await user.click(screen.getByRole('button', { name: 'Reintentar' }));

    expect(await screen.findByRole('table')).toBeInTheDocument();
  });
});

describe('Panel: modal de producto', () => {
  it('es un diálogo modal con el foco en el primer campo', async () => {
    const user = await abrirProductos();
    const dialogo = await abrirNuevo(user);
    expect(dialogo).toHaveAttribute('aria-modal', 'true');
    expect(screen.getByLabelText('Marca')).toHaveFocus();
  });

  it('atrapa el foco en los dos sentidos', async () => {
    const user = await abrirProductos();
    await abrirNuevo(user);

    await user.tab({ shift: true });
    expect(screen.getByRole('button', { name: 'Guardar' })).toHaveFocus();

    await user.tab();
    expect(screen.getByLabelText('Marca')).toHaveFocus();
  });

  it('recupera el foco si un clic lo sacó del diálogo', async () => {
    const user = await abrirProductos();
    await abrirNuevo(user);
    (document.activeElement as HTMLElement).blur();

    await user.tab();

    expect(screen.getByLabelText('Marca')).toHaveFocus();
  });

  it('Escape cierra sin guardar y devuelve el foco al botón', async () => {
    const user = await abrirProductos();
    await abrirEdicion(user, 'Favorita Harina 000 1 kg');
    await reemplazar(user, 'Stock', '1');

    await user.keyboard('{Escape}');

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Editar Favorita Harina 000 1 kg' }),
    ).toHaveFocus();
    expect(fila('Favorita Harina 000 1 kg')).toHaveTextContent('40');
  });

  it('Cancelar cierra sin guardar', async () => {
    const user = await abrirProductos();
    await abrirNuevo(user);
    await user.click(screen.getByRole('button', { name: 'Cancelar' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(filas()).toHaveLength(3);
  });

  it('bloquea el scroll de la página mientras está abierto', async () => {
    const user = await abrirProductos();
    await abrirNuevo(user);
    expect(document.body.style.overflow).toBe('hidden');
    await user.keyboard('{Escape}');
    expect(document.body.style.overflow).toBe('');
  });

  it('con el formulario vacío marca los errores y no guarda', async () => {
    const user = await abrirProductos();
    await abrirNuevo(user);
    await guardar(user);

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByLabelText('Marca')).toHaveAccessibleDescription(
      'Ingresá la marca.',
    );
    expect(screen.getByLabelText('Categoría')).toHaveAccessibleDescription(
      'Elegí una categoría.',
    );
    expect(screen.getByLabelText('Precio')).toHaveAccessibleDescription(
      'El precio debe ser mayor a 0.',
    );
    expect(screen.getByLabelText('Stock')).toBeInvalid();
    expect(screen.getByLabelText('Marca')).toHaveFocus();
    expect(screen.getByLabelText('Precio de oferta (opcional)')).toBeValid();
  });

  it('la categoría ofrece las 6 existentes', async () => {
    const user = await abrirProductos();
    await abrirNuevo(user);
    const opciones = within(screen.getByLabelText('Categoría'))
      .getAllByRole('option')
      .map((opcion) => opcion.textContent);
    expect(opciones).toEqual([
      'Elegí una categoría',
      'Bebidas',
      'Golosinas y snacks',
      'Lácteos',
      'Almacén',
      'Limpieza',
      'Cigarrillos',
    ]);
  });

  it('rechaza una oferta que no es menor al precio', async () => {
    const user = await abrirProductos();
    await abrirEdicion(user, 'Favorita Harina 000 1 kg');
    await reemplazar(user, 'Precio de oferta (opcional)', '1500');
    await guardar(user);

    const oferta = screen.getByLabelText('Precio de oferta (opcional)');
    expect(oferta).toHaveAccessibleDescription(
      'El precio de oferta debe ser menor al precio.',
    );
    expect(oferta).toHaveFocus();
  });

  it('rechaza un stock con decimales', async () => {
    const user = await abrirProductos();
    await abrirEdicion(user, 'Favorita Harina 000 1 kg');
    await reemplazar(user, 'Stock', '2.5');
    await guardar(user);
    expect(screen.getByLabelText('Stock')).toBeInvalid();
  });

  it('el alta agrega el producto primero y sin pedir nada al backend', async () => {
    const user = await abrirProductos();
    const pedidos = vi.mocked(getProducts).mock.calls.length;
    await abrirNuevo(user);
    await completarNuevo(user);
    await guardar(user);

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(filas()).toHaveLength(4);
    expect(filas()[0]).toHaveTextContent('Arcor Bon o Bon 15 g');
    expect(filas()[0]).toHaveTextContent('Almacén');
    expect(vi.mocked(getProducts).mock.calls.length).toBe(pedidos);
  });

  it('dos altas seguidas tienen ids distintos', async () => {
    const user = await abrirProductos();
    await abrirNuevo(user);
    await completarNuevo(user);
    await guardar(user);
    await abrirNuevo(user);
    await completarNuevo(user);
    await guardar(user);

    // Con el mismo id, editar uno cambiaría a los dos.
    const [primero] = screen.getAllByRole('button', {
      name: 'Editar Arcor Bon o Bon 15 g',
    });
    await user.click(primero);
    await reemplazar(user, 'Stock', '33');
    await guardar(user);
    expect(filas()[0]).toHaveTextContent('33');
    expect(filas()[1]).not.toHaveTextContent('33');
  });

  it('la edición arranca con los datos y cambia solo esa fila', async () => {
    const user = await abrirProductos();
    await abrirEdicion(user, 'Coca-Cola Original 500 ml');
    expect(screen.getByLabelText('Marca')).toHaveValue('Coca-Cola');
    expect(screen.getByLabelText('Categoría')).toHaveValue('bebidas');
    expect(screen.getByLabelText('Precio')).toHaveValue(1200);
    expect(screen.getByLabelText('Precio de oferta (opcional)')).toHaveValue(
      1000,
    );

    await reemplazar(user, 'Stock', '2');
    await guardar(user);

    expect(filas()).toHaveLength(3);
    expect(
      within(fila('Coca-Cola Original 500 ml')).getByText('(stock bajo)'),
    ).toBeInTheDocument();
    expect(fila('Favorita Harina 000 1 kg')).toHaveTextContent('40');
  });

  it('vaciar la oferta la quita, y la foto se conserva', async () => {
    const user = await abrirProductos();
    await abrirEdicion(user, 'Coca-Cola Original 500 ml');
    await reemplazar(user, 'Precio de oferta (opcional)', '');
    await guardar(user);

    const coca = fila('Coca-Cola Original 500 ml');
    expect(within(coca).queryByText('OFERTA')).not.toBeInTheDocument();
    expect(coca.querySelector('img')).toHaveAttribute(
      'src',
      '/productos/coca.webp',
    );
  });

  it('los cambios duran al cambiar de sección y el Resumen los refleja', async () => {
    const user = await abrirProductos();
    await abrirEdicion(user, 'Favorita Harina 000 1 kg');
    await reemplazar(user, 'Stock', '1');
    await guardar(user);

    await user.click(screen.getByRole('link', { name: /Resumen/ }));
    expect(
      await screen.findByText('2 productos con stock bajo'),
    ).toBeInTheDocument();

    await user.click(screen.getByRole('link', { name: /Productos/ }));
    expect(fila('Favorita Harina 000 1 kg')).toHaveTextContent('1');
  });
});
