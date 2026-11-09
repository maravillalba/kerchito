import { describe, expect, it } from 'vitest';
import { calcularResumen } from './puntos';

// Los mismos casos que test_calculo en backend/tests/test_points.py: si una regla
// cambia de un solo lado, falla uno de los dos.
describe('calcularResumen', () => {
  it.each([
    [1000, false, 0, false, 0, 0, 1000, 0, 10],
    [1000, true, 0, false, 150, 0, 850, 0, 8],
    [5000, false, 350, true, 0, 1500, 3500, 300, 35],
    [5000, false, 99, true, 0, 0, 5000, 0, 50],
    [5000, false, 350, false, 0, 0, 5000, 0, 50],
    [700, false, 1000, true, 0, 500, 200, 100, 2],
    [400, false, 1000, true, 0, 0, 400, 0, 4],
    [1000, false, 200, true, 0, 1000, 0, 200, 0],
    [1000, true, 300, true, 150, 500, 350, 100, 3],
    [1000, false, -50, true, 0, 0, 1000, 0, 10],
    [33.33, true, 0, false, 5, 0, 28.33, 0, 0],
    [199.99, false, 0, false, 0, 0, 199.99, 0, 1],
  ])(
    'subtotal %d, primera %s, saldo %d, usar %s',
    (
      subtotal,
      primera,
      saldo,
      usar,
      descuentoPrimeraCompra,
      descuentoPuntos,
      total,
      puntosUsados,
      puntosGanados,
    ) => {
      expect(calcularResumen(subtotal, primera, saldo, usar)).toEqual({
        subtotal,
        descuentoPrimeraCompra,
        descuentoPuntos,
        total,
        puntosUsados,
        puntosGanados,
      });
    },
  );
});
