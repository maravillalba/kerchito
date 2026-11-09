import { screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  adjustCustomerPoints,
  ApiError,
  cancelOrder,
  createProduct,
  deleteProduct,
  getAdminOrders,
  getAdminProducts,
  getAdminSummary,
  getCustomer,
  getCustomers,
  getMe,
  updateProduct,
  updateProductStock,
  uploadProductImage,
} from '../../services/api';
import {
  guardarSesion,
  renderApp,
  rutaActual,
  usuarioDePrueba,
} from '../../test-utils';
import type {
  AdminOrder,
  Customer,
  CustomerDetail,
  ProductAdmin,
  Summary,
} from '../../types';

vi.mock('../../services/api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../services/api')>();
  return {
    ...actual,
    adjustCustomerPoints: vi.fn(),
    cancelOrder: vi.fn(),
    createProduct: vi.fn(),
    deleteProduct: vi.fn(),
    getAdminOrders: vi.fn(),
    getAdminProducts: vi.fn(),
    getAdminSummary: vi.fn(),
    getCustomer: vi.fn(),
    getCustomers: vi.fn(),
    getMe: vi.fn(),
    updateProduct: vi.fn(),
    updateProductStock: vi.fn(),
    uploadProductImage: vi.fn(),
  };
});

const admin = usuarioDePrueba({ role: 'admin', first_name: 'Equipo' });

function producto(cambios: Partial<ProductAdmin> = {}): ProductAdmin {
  return {
    id: 1,
    brand: 'Coca-Cola',
    name: 'Original',
    unit: '500 ml',
    category: 'bebidas',
    price: 1200,
    offer_price: 1000,
    stock: 25,
    cost: 700,
    description: null,
    image: null,
    ...cambios,
  };
}

const PRODUCTOS = [
  producto(),
  producto({
    id: 2,
    brand: 'Chasqui',
    name: 'Azúcar',
    unit: '1 kg',
    category: 'almacen',
    price: 1390,
    offer_price: null,
    stock: 3,
    cost: 900,
  }),
  producto({
    id: 3,
    brand: 'Ayudín',
    name: 'Lavandina',
    unit: '1 L',
    category: 'limpieza',
    price: 1600,
    offer_price: null,
    stock: 0,
    cost: 960,
    image: '/uploads/products/abc.webp',
  }),
];

function pedido(cambios: Partial<AdminOrder> = {}): AdminOrder {
  return {
    id: 7,
    created_at: new Date().toISOString(),
    status: 'active',
    payment_method: 'tarjeta',
    subtotal: 3000,
    first_purchase_discount: 450,
    points_discount: 0,
    discount_amount: 450,
    total: 2550,
    points_used: 0,
    points_earned: 25,
    items: [
      {
        product_id: 1,
        product_name: 'Coca-Cola Original 500 ml',
        quantity: 2,
        unit_price: 1000,
      },
      {
        product_id: 2,
        product_name: 'Chasqui Azúcar 1 kg',
        quantity: 1,
        unit_price: 1000,
      },
      {
        product_id: 3,
        product_name: 'Ayudín Lavandina 1 L',
        quantity: 1,
        unit_price: 0,
      },
    ],
    customer: {
      id: 5,
      first_name: 'Lucía',
      last_name: 'Gómez',
      email: 'lucia@mail.com',
    },
    ...cambios,
  };
}

function cliente(cambios: Partial<Customer> = {}): Customer {
  return {
    id: 5,
    first_name: 'Lucía',
    last_name: 'Gómez',
    email: 'lucia@mail.com',
    phone: null,
    created_at: '2026-10-28T10:00:00',
    points: 520,
    level: 'Plata',
    orders_count: 9,
    total_spent: 38400,
    last_order_at: '2026-11-09T10:00:00',
    ...cambios,
  };
}

const CLIENTES = [
  cliente(),
  cliente({
    id: 6,
    first_name: 'Martín',
    last_name: 'Ruiz',
    email: 'martin@mail.com',
    points: 0,
    level: 'Bronce',
    orders_count: 0,
    total_spent: 0,
    last_order_at: null,
  }),
];

const DETALLE: CustomerDetail = {
  ...cliente(),
  movements: [
    {
      id: 2,
      order_id: null,
      points: -100,
      reason: 'Corrección',
      created_at: '2026-11-08T10:00:00',
    },
    {
      id: 1,
      order_id: 7,
      points: 620,
      reason: 'Compra del pedido #7',
      created_at: '2026-11-07T10:00:00',
    },
  ],
};

const RESUMEN: Summary = {
  total_revenue: 109000,
  net_profit: 39900,
  stock_units: 1240,
  points_in_circulation: 3480,
  best_sellers: [
    {
      product_id: 1,
      product_name: 'Coca-Cola Original 500 ml',
      units_sold: 48,
    },
    { product_id: 2, product_name: 'Chasqui Azúcar 1 kg', units_sold: 12 },
  ],
  top_customers: [
    {
      id: 5,
      first_name: 'Lucía',
      last_name: 'Gómez',
      points: 520,
      orders_count: 1,
    },
  ],
};

beforeEach(() => {
  vi.resetAllMocks();
  guardarSesion(admin);
  vi.mocked(getMe).mockResolvedValue(admin);
  vi.mocked(getAdminProducts).mockResolvedValue(PRODUCTOS);
  vi.mocked(getAdminOrders).mockResolvedValue([pedido()]);
  vi.mocked(getAdminSummary).mockResolvedValue(RESUMEN);
  vi.mocked(getCustomers).mockResolvedValue(CLIENTES);
  vi.mocked(getCustomer).mockResolvedValue(DETALLE);
});

function fila(texto: string) {
  return within(screen.getByText(texto).closest('tr') as HTMLElement);
}

describe('layout del panel', () => {
  it('tiene las 5 secciones y marca la actual', async () => {
    renderApp('/admin/inventario');
    const nav = within(
      screen.getByRole('navigation', { name: 'Secciones del panel' }),
    );
    for (const nombre of [
      'Resumen',
      'Inventario',
      'Ventas',
      'Clientes y puntos',
      'Ofertas',
    ]) {
      expect(nav.getByRole('link', { name: nombre })).toBeInTheDocument();
    }
    expect(nav.getByRole('link', { name: 'Inventario' })).toHaveAttribute(
      'aria-current',
      'page',
    );
    await screen.findByText('Original');
  });

  it('una ruta desconocida vuelve al Resumen', async () => {
    renderApp('/admin/no-existe');
    expect(
      await screen.findByRole('heading', { name: 'Resumen' }),
    ).toBeVisible();
    expect(rutaActual()).toBe('/admin');
  });

  it('cerrar sesión sale del panel', async () => {
    const user = renderApp('/admin');
    await screen.findByRole('heading', { name: 'Resumen' });
    await user.click(screen.getByRole('button', { name: 'Cerrar sesión' }));
    expect(rutaActual()).toBe('/bienvenida');
  });
});

describe('Resumen', () => {
  it('muestra los datos reales de la API', async () => {
    renderApp('/admin');
    expect(await screen.findByText('$ 109.000')).toBeInTheDocument();
    expect(screen.getByText('$ 39.900')).toBeInTheDocument();
    expect(screen.getByText('1.240 uds.')).toBeInTheDocument();
    expect(screen.getByText('3.480')).toBeInTheDocument();
    expect(screen.getByText('Coca-Cola Original 500 ml')).toBeInTheDocument();
    expect(screen.getByText('Lucía Gómez')).toBeInTheDocument();
    expect(screen.getByText('1 compra')).toBeInTheDocument();
  });

  it('sin ventas lo dice en lugar de mostrar barras vacías', async () => {
    vi.mocked(getAdminSummary).mockResolvedValue({
      ...RESUMEN,
      best_sellers: [],
      top_customers: [],
    });
    renderApp('/admin');
    expect(
      await screen.findByText('Todavía no hay ventas.'),
    ).toBeInTheDocument();
  });

  it('si falla ofrece reintentar', async () => {
    vi.mocked(getAdminSummary)
      .mockRejectedValueOnce(new ApiError(500, 'Internal server error'))
      .mockResolvedValueOnce(RESUMEN);
    const user = renderApp('/admin');
    await user.click(await screen.findByRole('button', { name: 'Reintentar' }));
    expect(await screen.findByText('$ 109.000')).toBeInTheDocument();
  });
});

describe('Inventario: tabla', () => {
  it('muestra costo, venta con oferta, ganancia y estado de stock', async () => {
    renderApp('/admin/inventario');
    await screen.findByText('Original');

    const coca = fila('Original');
    expect(coca.getByText('Coca-Cola')).toBeInTheDocument();
    expect(coca.getByText('500 ml')).toBeInTheDocument();
    expect(coca.getByText('Bebidas')).toBeInTheDocument();
    expect(coca.getByText('$ 700')).toBeInTheDocument();
    expect(coca.getByText('$ 1.000')).toBeInTheDocument();
    expect(coca.getByText('$ 1.200').tagName).toBe('DEL');
    expect(coca.getByText('$ 300')).toBeInTheDocument();
    expect(coca.getByText('25')).toBeInTheDocument();

    expect(fila('Azúcar').getByText('3 · bajo')).toBeInTheDocument();
    expect(fila('Lavandina').getByText('Sin stock')).toBeInTheDocument();
  });

  it('la foto subida se pide al backend', async () => {
    renderApp('/admin/inventario');
    await screen.findByText('Lavandina');
    const foto = screen
      .getByText('Lavandina')
      .closest('tr')
      ?.querySelector('img');
    expect(foto).toHaveAttribute(
      'src',
      'http://localhost:8000/uploads/products/abc.webp',
    );
  });

  it('borrar pide confirmación y un 409 muestra el motivo sin quitar la fila', async () => {
    vi.mocked(deleteProduct).mockRejectedValue(
      new ApiError(
        409,
        'No se puede borrar: el producto ya está en un pedido.',
      ),
    );
    const user = renderApp('/admin/inventario');
    await screen.findByText('Original');

    await user.click(
      screen.getByRole('button', {
        name: 'Borrar Coca-Cola Original 500 ml',
      }),
    );
    expect(deleteProduct).not.toHaveBeenCalled();
    await user.click(screen.getByRole('button', { name: 'Sí, borrar' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'ya está en un pedido',
    );
    await user.click(screen.getByRole('button', { name: 'Cancelar' }));
    expect(screen.getByText('Original')).toBeInTheDocument();
  });

  it('borrar con éxito quita la fila', async () => {
    vi.mocked(deleteProduct).mockResolvedValue();
    const user = renderApp('/admin/inventario');
    await screen.findByText('Original');
    await user.click(
      screen.getByRole('button', {
        name: 'Borrar Coca-Cola Original 500 ml',
      }),
    );
    await user.click(screen.getByRole('button', { name: 'Sí, borrar' }));
    await waitFor(() =>
      expect(screen.queryByText('Original')).not.toBeInTheDocument(),
    );
    expect(deleteProduct).toHaveBeenCalledWith(1);
  });

  it('"Ajustar stock" guarda el valor elegido', async () => {
    vi.mocked(updateProductStock).mockResolvedValue(producto({ stock: 40 }));
    const user = renderApp('/admin/inventario');
    await screen.findByText('Original');

    await user.click(screen.getByRole('button', { name: 'Ajustar stock' }));
    const campo = screen.getByLabelText('Stock real');
    expect(campo).toHaveValue(25);
    await user.clear(campo);
    await user.type(campo, '40');
    await user.click(screen.getByRole('button', { name: 'Guardar stock' }));

    await waitFor(() => expect(updateProductStock).toHaveBeenCalledWith(1, 40));
    expect(await screen.findByText('40')).toBeInTheDocument();
  });
});

describe('Inventario: buscador en tiempo real', () => {
  const buscador = () =>
    screen.getByRole('searchbox', { name: 'Buscar en el inventario' });

  it('filtra en cada tecla, sin botón ni Enter, y muestra "X de Y"', async () => {
    const user = renderApp('/admin/inventario');
    await screen.findByText('Original');
    expect(screen.getByText('3 de 3 productos')).toBeInTheDocument();

    await user.type(buscador(), 'a');
    expect(screen.getByText('3 de 3 productos')).toBeInTheDocument();
    await user.type(buscador(), 'y');

    expect(screen.getByText('1 de 3 productos')).toBeInTheDocument();
    expect(screen.getByText('Lavandina')).toBeInTheDocument();
    expect(screen.queryByText('Original')).not.toBeInTheDocument();
  });

  it('no distingue mayúsculas ni tildes', async () => {
    const user = renderApp('/admin/inventario');
    await screen.findByText('Original');
    await user.type(buscador(), 'AZUCAR');
    expect(screen.getByText('Azúcar')).toBeInTheDocument();
    expect(screen.getByText('1 de 3 productos')).toBeInTheDocument();
  });

  it('busca también por categoría', async () => {
    const user = renderApp('/admin/inventario');
    await screen.findByText('Original');
    await user.type(buscador(), 'almacén');
    expect(screen.getByText('Azúcar')).toBeInTheDocument();
    expect(screen.queryByText('Original')).not.toBeInTheDocument();
  });

  it('se combina con los filtros', async () => {
    const user = renderApp('/admin/inventario');
    await screen.findByText('Original');

    await user.click(screen.getByRole('button', { name: /Stock bajo \(2\)/ }));
    expect(screen.getByText('2 de 3 productos')).toBeInTheDocument();
    expect(screen.queryByText('Original')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Limpieza' }));
    expect(screen.getByText('1 de 3 productos')).toBeInTheDocument();
    expect(screen.getByText('Lavandina')).toBeInTheDocument();

    await user.type(buscador(), 'azucar');
    expect(screen.getByText('0 de 3 productos')).toBeInTheDocument();
  });

  it('sin resultados muestra el estado vacío y "Limpiar búsqueda" vuelve todo', async () => {
    const user = renderApp('/admin/inventario');
    await screen.findByText('Original');
    await user.click(screen.getByRole('button', { name: /Stock bajo/ }));
    await user.type(buscador(), 'nada que coincida');

    expect(screen.getByText(/No encontramos nada/)).toBeInTheDocument();
    expect(document.querySelector('.mascota--triste')).toBeInTheDocument();
    expect(screen.queryByRole('table')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Limpiar búsqueda' }));

    expect(buscador()).toHaveValue('');
    expect(screen.getByText('3 de 3 productos')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Stock bajo/ })).toHaveAttribute(
      'aria-pressed',
      'false',
    );
  });
});

describe('formulario de producto con foto', () => {
  const crearUrl = vi.fn(() => 'blob:vista-previa');
  const revocarUrl = vi.fn();

  beforeEach(() => {
    crearUrl.mockClear();
    revocarUrl.mockClear();
    vi.stubGlobal(
      'URL',
      Object.assign(URL, {
        createObjectURL: crearUrl,
        revokeObjectURL: revocarUrl,
      }),
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  function archivo(nombre: string, tipo: string, bytes = 100) {
    const file = new File(['x'], nombre, { type: tipo });
    Object.defineProperty(file, 'size', { value: bytes });
    return file;
  }

  const inputFoto = () => screen.getByTestId('input-foto') as HTMLInputElement;

  async function abrirNuevo() {
    const user = renderApp('/admin/inventario');
    await screen.findByText('Original');
    await user.click(screen.getByRole('button', { name: /Nuevo producto/ }));
    return user;
  }

  async function completar(user: Awaited<ReturnType<typeof abrirNuevo>>) {
    await user.type(screen.getByLabelText('Marca'), 'Marolio');
    await user.type(screen.getByLabelText('Nombre del producto'), 'Aceite');
    await user.type(screen.getByLabelText('Unidad / presentación'), '900 ml');
    await user.selectOptions(screen.getByLabelText('Categoría'), 'almacen');
    await user.type(screen.getByLabelText('Stock inicial'), '10');
    await user.type(screen.getByLabelText('Costo ($)'), '1300');
    await user.type(screen.getByLabelText('Precio de venta ($)'), '2100');
  }

  const creado = producto({ id: 9, brand: 'Marolio', name: 'Aceite' });
  const guardar = () =>
    screen.getByRole('button', { name: 'Guardar producto' });

  it('el input acepta solo JPG, PNG y WebP y el botón es el que se ve', async () => {
    await abrirNuevo();
    expect(inputFoto()).toHaveAttribute(
      'accept',
      'image/jpeg,image/png,image/webp',
    );
    expect(inputFoto()).not.toBeVisible();
    expect(
      screen.getByRole('button', { name: /Elegir foto de mi computadora/ }),
    ).toBeVisible();
  });

  it('una foto válida muestra la vista previa, el nombre y el peso', async () => {
    const user = await abrirNuevo();
    await user.upload(
      inputFoto(),
      archivo('coca.png', 'image/png', 180 * 1024),
    );
    expect(
      screen.getByRole('img', { name: 'Vista previa de la foto' }),
    ).toHaveAttribute('src', 'blob:vista-previa');
    expect(screen.getByText('coca.png')).toBeInTheDocument();
    expect(screen.getByText(/180 KB/)).toBeInTheDocument();
  });

  it.each([
    ['tipo inválido', archivo('foto.gif', 'image/gif'), 'JPG, PNG o WebP'],
    ['un PDF', archivo('foto.pdf', 'application/pdf'), 'JPG, PNG o WebP'],
    [
      'más de 2 MB',
      archivo('grande.png', 'image/png', 2 * 1024 * 1024 + 1),
      'más de 2 MB',
    ],
  ])(
    'rechaza %s con un mensaje claro y sin vista previa',
    async (_caso, file, texto) => {
      const user = userEventSinFiltro(await abrirNuevo());
      await user.upload(inputFoto(), file);
      expect(await screen.findByRole('alert')).toHaveTextContent(texto);
      expect(crearUrl).not.toHaveBeenCalled();
      expect(
        screen.queryByRole('img', { name: 'Vista previa de la foto' }),
      ).not.toBeInTheDocument();
    },
  );

  it('acepta una foto de exactamente 2 MB', async () => {
    const user = await abrirNuevo();
    await user.upload(
      inputFoto(),
      archivo('justa.png', 'image/png', 2 * 1024 * 1024),
    );
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(screen.getByText('justa.png')).toBeInTheDocument();
  });

  it('"Quitar" saca la foto y revoca la URL temporal', async () => {
    const user = await abrirNuevo();
    await user.upload(inputFoto(), archivo('coca.png', 'image/png'));
    await user.click(screen.getByRole('button', { name: 'Quitar' }));
    expect(revocarUrl).toHaveBeenCalledWith('blob:vista-previa');
    expect(screen.queryByText('coca.png')).not.toBeInTheDocument();
    expect(screen.getByText('Sin foto')).toBeInTheDocument();
  });

  it('al cerrar revoca la URL temporal', async () => {
    const user = await abrirNuevo();
    await user.upload(inputFoto(), archivo('coca.png', 'image/png'));
    await user.click(screen.getByRole('button', { name: 'Cancelar' }));
    expect(revocarUrl).toHaveBeenCalledWith('blob:vista-previa');
  });

  it('crea el producto y después sube la foto', async () => {
    vi.mocked(createProduct).mockResolvedValue(creado);
    vi.mocked(uploadProductImage).mockResolvedValue({
      ...creado,
      image: '/uploads/products/x.png',
    });
    const user = await abrirNuevo();
    await completar(user);
    const file = archivo('aceite.png', 'image/png');
    await user.upload(inputFoto(), file);

    await user.click(guardar());

    await waitFor(() =>
      expect(uploadProductImage).toHaveBeenCalledWith(9, file),
    );
    expect(createProduct).toHaveBeenCalledWith({
      brand: 'Marolio',
      name: 'Aceite',
      unit: '900 ml',
      category: 'almacen',
      stock: 10,
      cost: 1300,
      price: 2100,
      offer_price: null,
      description: null,
    });
    await waitFor(() =>
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument(),
    );
    expect(screen.getByText('Aceite')).toBeInTheDocument();
  });

  it('sin foto el producto se crea igual', async () => {
    vi.mocked(createProduct).mockResolvedValue(creado);
    const user = await abrirNuevo();
    await completar(user);
    await user.click(guardar());
    await waitFor(() =>
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument(),
    );
    expect(uploadProductImage).not.toHaveBeenCalled();
  });

  it('si falla la foto avisa y el reintento edita, no crea otro producto', async () => {
    vi.mocked(createProduct).mockResolvedValue(creado);
    vi.mocked(updateProduct).mockResolvedValue(creado);
    vi.mocked(uploadProductImage)
      .mockRejectedValueOnce(
        new ApiError(415, 'La foto tiene que ser JPG, PNG o WebP'),
      )
      .mockResolvedValueOnce(creado);
    const user = await abrirNuevo();
    await completar(user);
    await user.upload(inputFoto(), archivo('falsa.png', 'image/png'));

    await user.click(guardar());

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'El producto se guardó, pero la foto no.',
    );
    expect(
      screen.getByRole('heading', { name: 'Editar producto' }),
    ).toBeVisible();

    await user.click(guardar());
    await waitFor(() =>
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument(),
    );
    expect(createProduct).toHaveBeenCalledTimes(1);
    expect(updateProduct).toHaveBeenCalledWith(9, expect.anything());
  });

  it('valida los campos y lleva el foco al primero con error', async () => {
    const user = await abrirNuevo();
    await user.click(guardar());
    expect(screen.getByText('Ingresá la marca.')).toBeInTheDocument();
    expect(screen.getByText('Elegí una categoría.')).toBeInTheDocument();
    expect(screen.getByText(/El costo debe ser/)).toBeInTheDocument();
    expect(screen.getByLabelText('Marca')).toHaveFocus();
    expect(createProduct).not.toHaveBeenCalled();
  });

  it('la oferta tiene que ser menor al precio', async () => {
    const user = await abrirNuevo();
    await completar(user);
    await user.type(
      screen.getByLabelText('Precio de oferta ($), opcional'),
      '2100',
    );
    await user.click(guardar());
    expect(
      screen.getByText('El precio de oferta debe ser menor al precio.'),
    ).toBeInTheDocument();
    expect(createProduct).not.toHaveBeenCalled();
  });

  it('al editar muestra los datos y la foto actual, y permite reemplazarla', async () => {
    vi.mocked(updateProduct).mockResolvedValue(PRODUCTOS[2]);
    vi.mocked(uploadProductImage).mockResolvedValue(PRODUCTOS[2]);
    const user = renderApp('/admin/inventario');
    await screen.findByText('Lavandina');
    await user.click(
      screen.getByRole('button', { name: 'Editar Ayudín Lavandina 1 L' }),
    );

    expect(screen.getByLabelText('Marca')).toHaveValue('Ayudín');
    expect(screen.getByLabelText('Costo ($)')).toHaveValue(960);
    expect(screen.getByRole('img', { name: 'Foto actual' })).toHaveAttribute(
      'src',
      'http://localhost:8000/uploads/products/abc.webp',
    );
    expect(
      screen.getByRole('button', { name: /Reemplazar foto/ }),
    ).toBeInTheDocument();

    const file = archivo('nueva.webp', 'image/webp');
    await user.upload(inputFoto(), file);
    await user.click(guardar());

    await waitFor(() =>
      expect(uploadProductImage).toHaveBeenCalledWith(3, file),
    );
    expect(updateProduct).toHaveBeenCalledWith(3, expect.anything());
    expect(createProduct).not.toHaveBeenCalled();
  });

  it('el diálogo se cierra con Escape y devuelve el foco al botón', async () => {
    const user = await abrirNuevo();
    const abrir = screen.getByRole('button', {
      name: /Nuevo producto/,
      hidden: true,
    });
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(abrir).toHaveFocus();
  });

  // user.upload respeta "accept" por defecto: para probar la validación propia hay
  // que dejar pasar los archivos que el selector no ofrecería.
  function userEventSinFiltro(user: Awaited<ReturnType<typeof abrirNuevo>>) {
    inputFoto().removeAttribute('accept');
    return user;
  }
});

describe('Ventas', () => {
  it('muestra cliente, medio, ítems, total, puntos y estado', async () => {
    renderApp('/admin/ventas');
    const venta = within(
      (await screen.findByText('Lucía Gómez')).closest('tr') as HTMLElement,
    );
    expect(venta.getByText('Tarjeta')).toBeInTheDocument();
    expect(venta.getByText(/Coca-Cola Original 500 ml ×2/)).toHaveTextContent(
      '+1 más',
    );
    expect(venta.getByText('$ 2.550')).toBeInTheDocument();
    expect(venta.getByText('+25 pts')).toBeInTheDocument();
    expect(venta.getByText('Activa')).toBeInTheDocument();
  });

  it('expande el detalle con el teclado y los descuentos', async () => {
    const user = renderApp('/admin/ventas');
    await screen.findByText('Lucía Gómez');
    const boton = screen.getByRole('button', {
      name: 'Detalle de la venta 7',
    });
    expect(boton).toHaveAttribute('aria-expanded', 'false');

    boton.focus();
    await user.keyboard('{Enter}');

    expect(boton).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByText(/Ayudín Lavandina 1 L ×1/)).toBeInTheDocument();
    expect(screen.getByText(/15% de primera compra/)).toBeInTheDocument();
  });

  it('anular pide confirmación, llama al endpoint y la venta queda tachada', async () => {
    vi.mocked(cancelOrder).mockResolvedValue(pedido({ status: 'cancelled' }));
    const user = renderApp('/admin/ventas');
    await screen.findByText('Lucía Gómez');

    await user.click(screen.getByRole('button', { name: 'Anular la venta 7' }));
    expect(cancelOrder).not.toHaveBeenCalled();
    expect(screen.getByRole('dialog')).toHaveTextContent(
      'se descuentan los 25 puntos',
    );
    await user.click(screen.getByRole('button', { name: 'Sí, anular' }));

    await waitFor(() => expect(cancelOrder).toHaveBeenCalledWith(7));
    const venta = within(
      (await screen.findByText('Anulada')).closest('tr') as HTMLElement,
    );
    expect(venta.getByText('$ 2.550').tagName).toBe('DEL');
    expect(
      venta.queryByRole('button', { name: 'Anular la venta 7' }),
    ).not.toBeInTheDocument();
    expect(venta.queryByText('+25 pts')).not.toBeInTheDocument();
  });

  it('"Volver" no anula', async () => {
    const user = renderApp('/admin/ventas');
    await screen.findByText('Lucía Gómez');
    await user.click(screen.getByRole('button', { name: 'Anular la venta 7' }));
    await user.click(screen.getByRole('button', { name: 'Volver' }));
    expect(cancelOrder).not.toHaveBeenCalled();
    expect(screen.getByText('Activa')).toBeInTheDocument();
  });

  it('si otra sesión ya la anuló, avisa y la marca como anulada', async () => {
    vi.mocked(cancelOrder).mockRejectedValue(
      new ApiError(409, 'El pedido ya está anulado'),
    );
    const user = renderApp('/admin/ventas');
    await screen.findByText('Lucía Gómez');
    await user.click(screen.getByRole('button', { name: 'Anular la venta 7' }));
    await user.click(screen.getByRole('button', { name: 'Sí, anular' }));
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'El pedido ya está anulado',
    );
    expect(screen.getByText('Anulada')).toBeInTheDocument();
  });

  it('filtra por estado y por fecha', async () => {
    vi.mocked(getAdminOrders).mockResolvedValue([
      pedido(),
      pedido({
        id: 8,
        status: 'cancelled',
        created_at: '2020-01-01T10:00:00',
        customer: { ...pedido().customer, first_name: 'Vieja' },
      }),
    ]);
    const user = renderApp('/admin/ventas');
    await screen.findByText('Lucía Gómez');
    expect(screen.getByText('2 de 2 ventas')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Anuladas' }));
    expect(screen.getByText('Vieja Gómez')).toBeInTheDocument();
    expect(screen.queryByText('Lucía Gómez')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Hoy' }));
    expect(screen.getByText('Lucía Gómez')).toBeInTheDocument();
    expect(screen.queryByText('Vieja Gómez')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Esta semana' }));
    expect(screen.getByText('1 de 2 ventas')).toBeInTheDocument();
  });

  it('busca por cliente o producto sin distinguir tildes, y limpia', async () => {
    const user = renderApp('/admin/ventas');
    await screen.findByText('Lucía Gómez');
    const buscador = screen.getByRole('searchbox', {
      name: 'Buscar en las ventas',
    });

    await user.type(buscador, 'azucar');
    expect(screen.getByText('Lucía Gómez')).toBeInTheDocument();

    await user.clear(buscador);
    await user.type(buscador, 'no existe');
    expect(screen.getByText(/No encontramos nada/)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Limpiar búsqueda' }));
    expect(screen.getByText('Lucía Gómez')).toBeInTheDocument();
  });

  it('con ?q= en la URL arranca filtrado', async () => {
    vi.mocked(getAdminOrders).mockResolvedValue([
      pedido(),
      pedido({
        id: 8,
        customer: {
          id: 6,
          first_name: 'Martín',
          last_name: 'Ruiz',
          email: 'martin@mail.com',
        },
      }),
    ]);
    renderApp('/admin/ventas?q=lucia@mail.com');
    expect(await screen.findByText('Lucía Gómez')).toBeInTheDocument();
    expect(screen.queryByText('Martín Ruiz')).not.toBeInTheDocument();
  });
});

describe('Clientes y puntos', () => {
  const buscador = () =>
    screen.getByRole('searchbox', { name: 'Buscar clientes' });

  it('muestra las tarjetas y la tabla con datos de la API', async () => {
    vi.mocked(getAdminOrders).mockResolvedValue([pedido({ points_used: 300 })]);
    renderApp('/admin/clientes');
    const lucia = fila(
      (await screen.findByText('lucia@mail.com')).textContent as string,
    );
    expect(lucia.getByText('520 pts')).toBeInTheDocument();
    expect(lucia.getByText('Plata')).toBeInTheDocument();
    expect(lucia.getByText('$ 38.400')).toBeInTheDocument();

    const tarjeta = (titulo: string) =>
      within(
        screen
          .getByRole('heading', { name: titulo })
          .closest('section') as HTMLElement,
      );
    expect(tarjeta('Clientes registrados').getByText('2')).toBeInTheDocument();
    expect(
      tarjeta('Puntos en circulación').getByText('520'),
    ).toBeInTheDocument();
    expect(tarjeta('Puntos canjeados').getByText('300')).toBeInTheDocument();
    expect(tarjeta('15% sin usar').getByText('1')).toBeInTheDocument();
  });

  it('el buscador filtra en cada tecla por nombre y por correo, sin tildes', async () => {
    const user = renderApp('/admin/clientes');
    await screen.findByText('Lucía Gómez');
    expect(screen.getByText('2 de 2 clientes')).toBeInTheDocument();

    await user.type(buscador(), 'LUCIA');
    expect(screen.getByText('Lucía Gómez')).toBeInTheDocument();
    expect(screen.queryByText('Martín Ruiz')).not.toBeInTheDocument();
    expect(screen.getByText('1 de 2 clientes')).toBeInTheDocument();

    await user.clear(buscador());
    await user.type(buscador(), 'martin@');
    expect(screen.getByText('Martín Ruiz')).toBeInTheDocument();
    expect(screen.queryByText('Lucía Gómez')).not.toBeInTheDocument();
  });

  it('sin resultados muestra a Kerchi triste y "Limpiar búsqueda"', async () => {
    const user = renderApp('/admin/clientes');
    await screen.findByText('Lucía Gómez');
    await user.type(buscador(), 'zzz');
    expect(document.querySelector('.mascota--triste')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Limpiar búsqueda' }));
    expect(buscador()).toHaveValue('');
    expect(screen.getByText('Lucía Gómez')).toBeInTheDocument();
  });

  it('al elegir un cliente muestra el saldo, los movimientos y sus compras', async () => {
    const user = renderApp('/admin/clientes');
    await user.click(
      await screen.findByRole('button', { name: /Lucía Gómez/ }),
    );

    const panel = within(
      await screen.findByRole('region', { name: 'Detalle del cliente' }),
    );
    expect(await panel.findByText('Corrección')).toBeInTheDocument();
    expect(panel.getByText('Compra del pedido #7')).toBeInTheDocument();
    expect(panel.getByText('−100')).toBeInTheDocument();
    expect(panel.getByText('+620')).toBeInTheDocument();
    expect(panel.getByText(/Cliente desde 28\/10\/2026/)).toBeInTheDocument();
    expect(
      panel.getByRole('link', { name: 'Ver todas sus compras' }),
    ).toHaveAttribute('href', '/admin/ventas?q=lucia%40mail.com');
  });

  it('ajustar puntos exige motivo y actualiza el saldo', async () => {
    vi.mocked(adjustCustomerPoints).mockResolvedValue({
      ...DETALLE,
      points: 570,
      movements: [
        {
          id: 3,
          order_id: null,
          points: 50,
          reason: 'Compensación',
          created_at: '2026-11-09T10:00:00',
        },
        ...DETALLE.movements,
      ],
    });
    const user = renderApp('/admin/clientes');
    await user.click(
      await screen.findByRole('button', { name: /Lucía Gómez/ }),
    );
    await user.click(
      await screen.findByRole('button', { name: 'Ajustar puntos' }),
    );

    await user.type(screen.getByLabelText(/^Puntos/), '50');
    await user.click(screen.getByRole('button', { name: 'Guardar ajuste' }));
    expect(screen.getByText('El motivo es obligatorio.')).toBeInTheDocument();
    expect(adjustCustomerPoints).not.toHaveBeenCalled();

    await user.type(screen.getByLabelText('Motivo'), ' Compensación ');
    await user.click(screen.getByRole('button', { name: 'Guardar ajuste' }));

    await waitFor(() =>
      expect(adjustCustomerPoints).toHaveBeenCalledWith(5, 50, 'Compensación'),
    );
    expect(await screen.findByText('570 pts')).toBeInTheDocument();
    expect(screen.getByText('Compensación')).toBeInTheDocument();
  });

  it.each(['0', '1.5', ''])('rechaza "%s" puntos', async (valor) => {
    const user = renderApp('/admin/clientes');
    await user.click(
      await screen.findByRole('button', { name: /Lucía Gómez/ }),
    );
    await user.click(
      await screen.findByRole('button', { name: 'Ajustar puntos' }),
    );
    if (valor) {
      await user.type(screen.getByLabelText(/^Puntos/), valor);
    }
    await user.type(screen.getByLabelText('Motivo'), 'Prueba');
    await user.click(screen.getByRole('button', { name: 'Guardar ajuste' }));
    expect(screen.getByText(/número entero distinto de 0/)).toBeInTheDocument();
    expect(adjustCustomerPoints).not.toHaveBeenCalled();
  });
});

describe('Ofertas', () => {
  it('lista solo los productos en oferta con su descuento', async () => {
    renderApp('/admin/ofertas');
    expect(await screen.findByText('Original')).toBeInTheDocument();
    expect(screen.queryByText('Azúcar')).not.toBeInTheDocument();
    expect(screen.getByText('17%')).toBeInTheDocument();
    expect(screen.getByText('1 en oferta')).toBeInTheDocument();
  });

  it('"Quitar oferta" manda offer_price null y conserva el resto', async () => {
    vi.mocked(updateProduct).mockResolvedValue(producto({ offer_price: null }));
    const user = renderApp('/admin/ofertas');
    await screen.findByText('Original');
    await user.click(
      screen.getByRole('button', {
        name: 'Quitar la oferta de Coca-Cola Original 500 ml',
      }),
    );
    await waitFor(() =>
      expect(updateProduct).toHaveBeenCalledWith(
        1,
        expect.objectContaining({ offer_price: null, cost: 700, stock: 25 }),
      ),
    );
    expect(
      await screen.findByText('No hay productos en oferta.'),
    ).toBeInTheDocument();
  });
});
