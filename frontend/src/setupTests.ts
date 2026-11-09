import '@testing-library/jest-dom/vitest';
import { afterEach, beforeEach, vi } from 'vitest';
import { cleanup } from '@testing-library/react';

// Ningún test sale a la red, aunque haya un backend levantado. Los que necesitan
// respuestas mockean la función de la API o ponen su propio fetch.
beforeEach(() => {
  vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('sin red')));
});

afterEach(() => {
  cleanup();
  localStorage.clear();
});
