import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import type { Product } from '../types';
import { CATEGORY_ICONS } from '../utils/categoryIcons';
import ProductCard from './ProductCard';

const alfajor: Product = {
  id: 4,
  name: 'Alfajor Jorgito',
  category: 'golosinas_snacks',
  price: 1100,
  stock: 50,
  description: null,
  image: null,
};

function renderCard(product: Product) {
  render(
    <MemoryRouter>
      <ProductCard product={product} />
    </MemoryRouter>,
  );
  return screen.getByRole('article').querySelector('img');
}

describe('ProductCard', () => {
  it('sin image muestra la foto de su categoría, decorativa', () => {
    const img = renderCard(alfajor);
    expect(CATEGORY_ICONS.golosinas_snacks).toMatch(/golosinas\.webp$/);
    expect(img).toHaveAttribute('src', CATEGORY_ICONS.golosinas_snacks);
    expect(img).toHaveAttribute('alt', '');
    expect(img).toHaveClass('product-image--category');
  });

  it('con image muestra la foto del producto en lugar de la de la categoría', () => {
    const img = renderCard({
      ...alfajor,
      image: '/productos/alfajor-jorgito.webp',
    });
    expect(img).toHaveAttribute('src', '/productos/alfajor-jorgito.webp');
    expect(img).toHaveAttribute('alt', '');
    expect(img).toHaveClass('product-image--product');
  });

  it('si la foto del producto no carga, muestra la de su categoría', () => {
    const img = renderCard({ ...alfajor, image: '/productos/no-existe.webp' });
    fireEvent.error(img as HTMLImageElement);

    const fallback = screen.getByRole('article').querySelector('img');
    expect(fallback).toHaveAttribute('src', CATEGORY_ICONS.golosinas_snacks);
    expect(fallback).toHaveClass('product-image--category');
    expect(fallback).toHaveAttribute('alt', '');
  });
});
