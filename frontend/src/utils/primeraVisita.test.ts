import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// Cada test carga el módulo de cero: el respaldo en memoria es estado del módulo.
async function cargarModulo() {
  vi.resetModules();
  return import('./primeraVisita');
}

describe('primeraVisita', () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('guarda la marca en sessionStorage', async () => {
    const { marcarBienvenidaVista, yaVioBienvenida } = await cargarModulo();
    expect(yaVioBienvenida()).toBe(false);
    marcarBienvenidaVista();
    expect(yaVioBienvenida()).toBe(true);
    expect(sessionStorage.length).toBe(1);
  });

  it('si no se puede escribir, la marca queda en memoria y no hay bucle', async () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('sin espacio');
    });
    const { marcarBienvenidaVista, yaVioBienvenida } = await cargarModulo();

    expect(() => marcarBienvenidaVista()).not.toThrow();
    expect(yaVioBienvenida()).toBe(true);
  });

  it('si no se puede leer, cuenta como primera visita sin romper', async () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('bloqueado');
    });
    const { yaVioBienvenida } = await cargarModulo();
    expect(yaVioBienvenida()).toBe(false);
  });
});
