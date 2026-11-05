import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import type { Product } from '../types';
import { CATEGORY_ICONS } from '../utils/categoryIcons';
import ProductCard from './ProductCard';

const alfajor: Product = {
  id: 4,
  brand: 'Jorgito',
  name: 'Alfajor',
  unit: '55 g',
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

  it('muestra marca, nombre y unidad en elementos separados, en ese orden', () => {
    renderCard(alfajor);
    const card = screen.getByRole('article');
    const brand = card.querySelector('.product-card__brand');
    const name = card.querySelector('.product-card__name');
    const unit = card.querySelector('.product-card__unit');

    expect(brand).toHaveTextContent(/^Jorgito$/);
    expect(name).toHaveTextContent(/Alfajor$/);
    expect(unit).toHaveTextContent(/^55 g$/);
    expect(brand?.compareDocumentPosition(name!)).toBe(
      Node.DOCUMENT_POSITION_FOLLOWING,
    );
    expect(name?.compareDocumentPosition(unit!)).toBe(
      Node.DOCUMENT_POSITION_FOLLOWING,
    );
    // El link se anuncia con la marca: "Jorgito Alfajor".
    expect(
      screen.getByRole('link', { name: 'Jorgito Alfajor' }),
    ).toHaveAttribute('href', '/products/4');
  });

  it('sin oferta muestra solo el precio, sin tachado ni etiqueta', () => {
    renderCard(alfajor);
    const card = screen.getByRole('article');

    expect(card.querySelector('.price__current')).toHaveTextContent('$1.100');
    expect(card.querySelector('del')).not.toBeInTheDocument();
    expect(card.querySelector('.offer-badge')).not.toBeInTheDocument();
  });

  it('con offer_price tacha el precio normal y muestra la etiqueta de descuento', () => {
    renderCard({ ...alfajor, price: 1100, offer_price: 880 });
    const card = screen.getByRole('article');

    const tachado = card.querySelector('del');
    expect(tachado).toHaveTextContent('Precio normal: $ 1.100');
    expect(card.querySelector('.price__current')).toHaveTextContent(
      'Precio de oferta: $880',
    );
    const badge = card.querySelector('.offer-badge');
    expect(badge).toHaveTextContent('-20%');
    expect(badge).toHaveTextContent('20% de descuento');
  });

  it('el porcentaje de descuento se redondea', () => {
    // 1 - 1190 / 1400 = 15 %; 1 - 2600 / 3100 = 16,1 % -> 16 %.
    renderCard({ ...alfajor, price: 3100, offer_price: 2600 });
    expect(screen.getByText('-16%')).toBeInTheDocument();
  });

  it('"Agregar al carrito" usa el botón KerButton verde chico, a todo el ancho', () => {
    render(
      <MemoryRouter>
        <ProductCard product={alfajor} onAdd={vi.fn()} />
      </MemoryRouter>,
    );
    const button = screen.getByRole('button', { name: 'Agregar al carrito' });
    expect(button).toHaveClass(
      'ker-btn',
      'ker-btn--verde',
      'ker-btn--chico',
      'product-card__add',
    );
    expect(button).toHaveAttribute('type', 'button');
  });

  it('el botón "Agregar al carrito" llama a onAdd y se deshabilita sin stock', async () => {
    const user = userEvent.setup();
    const onAdd = vi.fn();
    const { rerender } = render(
      <MemoryRouter>
        <ProductCard product={alfajor} onAdd={onAdd} />
      </MemoryRouter>,
    );
    await user.click(
      screen.getByRole('button', { name: 'Agregar al carrito' }),
    );
    expect(onAdd).toHaveBeenCalledWith(alfajor);

    rerender(
      <MemoryRouter>
        <ProductCard product={{ ...alfajor, stock: 0 }} onAdd={onAdd} />
      </MemoryRouter>,
    );
    expect(
      screen.getByRole('button', { name: 'Agregar al carrito' }),
    ).toBeDisabled();
    expect(screen.getByText('Sin stock')).toBeInTheDocument();
  });
});
