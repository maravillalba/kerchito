// Secciones del sidebar. La de "ruta" vacía es la portada del panel.
export const SECCIONES = [
  { ruta: '', texto: 'Resumen', icono: '📊' },
  { ruta: 'productos', texto: 'Productos', icono: '📦' },
  { ruta: 'pedidos', texto: 'Pedidos', icono: '🧾' },
  { ruta: 'stock', texto: 'Stock', icono: '📉' },
  { ruta: 'ofertas', texto: 'Ofertas', icono: '🏷️' },
  { ruta: 'clientes', texto: 'Clientes y puntos', icono: '👥' },
];

// Las que todavía no están hechas: muestran "Próximamente".
export const SECCIONES_PENDIENTES = SECCIONES.slice(2);
