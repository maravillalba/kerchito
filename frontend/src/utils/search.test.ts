import { describe, expect, it } from 'vitest';
import type { Product } from '../types';
import { matchesSearch, normalizeText } from './search';

const leche: Product = {
  id: 1,
  brand: 'La Serenísima',
  name: 'Leche entera',
  unit: '1 L',
  category: 'lacteos',
  price: 1300,
  stock: 20,
};

describe('normalizeText', () => {
  it('pasa a minúsculas y saca las tildes', () => {
    expect(normalizeText('  Lácteos AZÚCAR  ')).toBe('lacteos azucar');
  });
});

describe('matchesSearch', () => {
  it.each([
    ['leche', true],
    ['LECHE', true],
    ['serenisima', true], // sin tilde encuentra "Serenísima"
    ['SERENÍSIMA', true],
    ['lacteos', true], // por la categoría ("Lácteos")
    ['entera serenísima', true], // todas las palabras, en cualquier orden
    ['leche descremada', false], // falta una palabra
    ['coca', false],
    ['', true], // vacía no filtra
    ['   ', true],
  ])('"%s" -> %s', (query, esperado) => {
    expect(matchesSearch(leche, query)).toBe(esperado);
  });

  it('no busca en la presentación (unit)', () => {
    expect(matchesSearch(leche, '1 L')).toBe(false);
  });
});
