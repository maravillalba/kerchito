import { render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { CATEGORY_ICONS } from '../utils/categoryIcons';
import Home from './Home';

function renderHome() {
  return render(
    <MemoryRouter>
      <Home />
    </MemoryRouter>,
  );
}

describe('Home', () => {
  it('cada categoría tiene su foto decorativa y su link de siempre', () => {
    renderHome();
    const link = screen.getByRole('link', { name: 'Golosinas y snacks' });
    expect(link).toHaveAttribute('href', '/products?category=golosinas_snacks');
    const image = link.querySelector('img');
    expect(CATEGORY_ICONS.golosinas_snacks).toMatch(/golosinas\.webp$/);
    expect(image).toHaveAttribute('src', CATEGORY_ICONS.golosinas_snacks);
    expect(image).toHaveAttribute('alt', '');
  });

  it('muestra los 3 pasos de "Cómo comprar" en orden', () => {
    renderHome();
    const section = screen
      .getByRole('heading', { name: 'Cómo comprar' })
      .closest('section') as HTMLElement;
    const steps = within(section).getAllByRole('listitem');

    expect(steps).toHaveLength(3);
    expect(steps[0]).toHaveTextContent(
      '1Elegí tus productosMirá el catálogo o filtrá por categoría.',
    );
    expect(steps[1]).toHaveTextContent(
      '2Sumalos al carritoVes el total y el stock disponible.',
    );
    expect(steps[2]).toHaveTextContent(
      '3Confirmá tu pedidoTe damos el número y el detalle al instante.',
    );
  });

  it('muestra el banner de KioscoBot, solo con texto', () => {
    renderHome();
    const banner = screen
      .getByRole('heading', { name: '¿Dudas? Preguntale a KioscoBot' })
      .closest('section') as HTMLElement;

    expect(banner).toHaveTextContent(
      'Precios, stock, horarios y medios de pago, siempre a mano. Abrí el chat con el botón naranja de abajo a la derecha.',
    );
    expect(within(banner).queryByRole('button')).not.toBeInTheDocument();
    expect(within(banner).queryByRole('link')).not.toBeInTheDocument();
  });
});
