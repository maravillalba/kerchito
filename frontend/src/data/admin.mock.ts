// Datos de ejemplo del Resumen del panel. El backend todavía no tiene reportes:
// el único número real del Resumen es el de stock bajo.

export const RESUMEN_HOY = {
  ventas: 184300,
  variacionVentas: 12,
  pedidos: 37,
  pedidosPendientes: 5,
  ticketPromedio: 4980,
};

export const MAS_VENDIDOS = [
  { nombre: 'Coca-Cola', cantidad: 48 },
  { nombre: 'Yerba', cantidad: 35 },
  { nombre: 'Alfajor Jorgito', cantidad: 29 },
  { nombre: 'Leche entera', cantidad: 22 },
  { nombre: 'Cif', cantidad: 14 },
];

export const PEDIDOS_RECIENTES = [
  { numero: 37, total: 3100, estado: 'Nuevo' },
  { numero: 36, total: 6450, estado: 'Preparando' },
  { numero: 35, total: 2200, estado: 'Entregado' },
  { numero: 34, total: 8900, estado: 'Entregado' },
];
