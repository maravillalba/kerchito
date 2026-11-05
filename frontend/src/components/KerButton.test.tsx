import type { ReactNode } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import KerButton from './KerButton';

function renderInRouter(ui: ReactNode) {
  return render(<MemoryRouter>{ui}</MemoryRouter>);
}

describe('KerButton', () => {
  it('sin "to" es un <button type="button"> real, naranja por defecto', async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    renderInRouter(<KerButton onClick={onClick}>Finalizar pedido</KerButton>);

    const button = screen.getByRole('button', { name: 'Finalizar pedido' });
    expect(button.tagName).toBe('BUTTON');
    expect(button).toHaveAttribute('type', 'button');
    expect(button).toHaveClass('ker-btn', 'ker-btn--naranja');
    // El texto va dentro de los spans de la animación.
    expect(button.querySelector('.ker-btn__text')).toHaveTextContent(
      'Finalizar pedido',
    );

    await user.click(button);
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('acepta type="submit" y los demás atributos de un botón', () => {
    renderInRouter(
      <KerButton type="submit" aria-describedby="ayuda">
        Enviar
      </KerButton>,
    );
    const button = screen.getByRole('button', { name: 'Enviar' });
    expect(button).toHaveAttribute('type', 'submit');
    expect(button).toHaveAttribute('aria-describedby', 'ayuda');
  });

  it('con "to" es un link que navega, no un botón', () => {
    renderInRouter(
      <KerButton to="/products" variant="verde">
        Ver productos
      </KerButton>,
    );
    const link = screen.getByRole('link', { name: 'Ver productos' });
    expect(link).toHaveAttribute('href', '/products');
    expect(link).toHaveClass('ker-btn', 'ker-btn--verde');
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('deshabilitado no responde al clic', async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    renderInRouter(
      <KerButton onClick={onClick} disabled>
        Agregar al carrito
      </KerButton>,
    );
    const button = screen.getByRole('button', { name: 'Agregar al carrito' });
    expect(button).toBeDisabled();
    await user.click(button);
    expect(onClick).not.toHaveBeenCalled();
  });

  it('se puede enfocar con Tab (como botón y como link)', async () => {
    const user = userEvent.setup();
    renderInRouter(
      <>
        <KerButton>Primero</KerButton>
        <KerButton to="/cart">Segundo</KerButton>
      </>,
    );
    await user.tab();
    expect(screen.getByRole('button', { name: 'Primero' })).toHaveFocus();
    await user.tab();
    expect(screen.getByRole('link', { name: 'Segundo' })).toHaveFocus();
  });

  it('el tamaño chico se aplica en verde y se ignora en naranja (AA)', () => {
    renderInRouter(
      <>
        <KerButton variant="verde" size="chico">
          Verde chico
        </KerButton>
        <KerButton size="chico">Naranja chico</KerButton>
      </>,
    );
    expect(screen.getByRole('button', { name: 'Verde chico' })).toHaveClass(
      'ker-btn--chico',
    );
    // Blanco sobre el naranja del logo necesita texto grande: queda en tamaño normal.
    expect(
      screen.getByRole('button', { name: 'Naranja chico' }),
    ).not.toHaveClass('ker-btn--chico');
  });

  it('suma la clase extra sin perder las propias', () => {
    renderInRouter(<KerButton className="cart__checkout">Pagar</KerButton>);
    expect(screen.getByRole('button', { name: 'Pagar' })).toHaveClass(
      'ker-btn',
      'ker-btn--naranja',
      'cart__checkout',
    );
  });
});
