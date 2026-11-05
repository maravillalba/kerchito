import { render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import Footer from './Footer';

function renderFooter() {
  render(
    <MemoryRouter>
      <Footer />
    </MemoryRouter>,
  );
  return screen.getByRole('contentinfo');
}

describe('Footer', () => {
  it('tiene el logo, la frase y a Kerchi como imagen decorativa', () => {
    const footer = renderFooter();
    expect(
      within(footer).getByRole('img', { name: 'Kiosko El Rápido' }),
    ).toBeInTheDocument();
    expect(footer).toHaveTextContent('Todo lo del kiosko, sin salir de casa');
    const kerchi = footer.querySelector('img.mascota');
    expect(kerchi).toHaveAttribute('alt', '');
    expect(kerchi).toHaveAttribute('aria-hidden', 'true');
  });

  it('los enlaces van en un <nav aria-label="Pie de página">', () => {
    const footer = renderFooter();
    const nav = within(footer).getByRole('navigation', {
      name: 'Pie de página',
    });

    expect(within(nav).getByRole('link', { name: 'Inicio' })).toHaveAttribute(
      'href',
      '/',
    );
    expect(
      within(nav).getByRole('link', { name: 'Productos' }),
    ).toHaveAttribute('href', '/products');
    expect(within(nav).getByRole('link', { name: 'Carrito' })).toHaveAttribute(
      'href',
      '/cart',
    );
  });

  it('las categorías llevan a /products con el filtro de la app (?category=)', () => {
    const footer = renderFooter();
    const nav = within(footer).getByRole('navigation', {
      name: 'Pie de página',
    });

    expect(within(nav).getByRole('link', { name: 'Bebidas' })).toHaveAttribute(
      'href',
      '/products?category=bebidas',
    );
    expect(
      within(nav).getByRole('link', { name: 'Golosinas y snacks' }),
    ).toHaveAttribute('href', '/products?category=golosinas_snacks');
    // Inicio, Productos, Carrito y las 6 categorías.
    expect(within(nav).getAllByRole('link')).toHaveLength(9);
  });

  it('"Atención" muestra los mismos horarios y medios de pago que KioscoBot', () => {
    const footer = renderFooter();
    const atencion = within(footer)
      .getByRole('heading', { name: 'Atención' })
      .closest('section') as HTMLElement;

    // Texto exacto de backend/routers/chat.py (HORARIOS y MEDIOS_DE_PAGO).
    expect(atencion).toHaveTextContent(
      'Atendemos de lunes a sábado de 8:00 a 22:00 y los domingos de 9:00 a 13:00.',
    );
    expect(atencion).toHaveTextContent(
      'Aceptamos efectivo, tarjeta de débito y crédito, transferencia y Mercado Pago.',
    );
  });

  it('no inventa datos de contacto', () => {
    const footer = renderFooter();
    expect(footer).not.toHaveTextContent(
      /@|tel[eé]fono|whatsapp|instagram|direcci[oó]n/i,
    );
    expect(
      within(footer).queryByRole('link', {
        name: /instagram|facebook|tiktok/i,
      }),
    ).toBeNull();
  });

  it('tiene la barra inferior con el crédito del proyecto', () => {
    const footer = renderFooter();
    expect(footer).toHaveTextContent(
      '© 2026 Kiosko El Rápido · Proyecto UTN – Programación IV',
    );
  });
});
