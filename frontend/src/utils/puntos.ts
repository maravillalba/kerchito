// Copia de las reglas de backend/points.py, SOLO para la vista previa del carrito.
// El total oficial es el que devuelve el backend. Si cambia una regla, va en los dos.
export const PESOS_POR_PUNTO = 100;
export const PUNTOS_POR_BLOQUE = 100;
export const PESOS_POR_BLOQUE = 500;
export const DESCUENTO_PRIMERA_COMPRA = 15;

export interface ResumenCompra {
  subtotal: number;
  descuentoPrimeraCompra: number;
  descuentoPuntos: number;
  total: number;
  puntosUsados: number;
  puntosGanados: number;
}

// Orden del cálculo: subtotal, 15%, canje, total y puntos ganados.
export function calcularResumen(
  subtotal: number,
  primeraCompra: boolean,
  saldo: number,
  usarPuntos: boolean,
): ResumenCompra {
  // En centavos enteros, para redondear exactamente igual que el backend.
  const subtotalCentavos = Math.round(subtotal * 100);
  const primeraCentavos = primeraCompra
    ? Math.floor((subtotalCentavos * DESCUENTO_PRIMERA_COMPRA + 50) / 100)
    : 0;
  const aPagarCentavos = subtotalCentavos - primeraCentavos;

  const bloques =
    usarPuntos && saldo > 0
      ? Math.min(
          Math.floor(saldo / PUNTOS_POR_BLOQUE),
          Math.floor(aPagarCentavos / (PESOS_POR_BLOQUE * 100)),
        )
      : 0;
  const puntosCentavos = bloques * PESOS_POR_BLOQUE * 100;
  const totalCentavos = aPagarCentavos - puntosCentavos;

  return {
    subtotal: subtotalCentavos / 100,
    descuentoPrimeraCompra: primeraCentavos / 100,
    descuentoPuntos: puntosCentavos / 100,
    total: totalCentavos / 100,
    puntosUsados: bloques * PUNTOS_POR_BLOQUE,
    puntosGanados: Math.floor(totalCentavos / (PESOS_POR_PUNTO * 100)),
  };
}
