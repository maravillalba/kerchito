import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import Mascota from './Mascota';
import type { MascotaPose } from './Mascota';

const POSES: MascotaPose[] = [
  'saludando',
  'pensando',
  'triste',
  'festejando',
  'con-productos',
  'aprobado',
];

describe('Mascota', () => {
  it.each(POSES)('la pose "%s" renderiza una imagen decorativa', (pose) => {
    const { container } = render(<Mascota pose={pose} />);
    const images = container.querySelectorAll('img');

    expect(images).toHaveLength(1);
    const [img] = images;
    expect(img).toHaveAttribute('alt', '');
    expect(img).toHaveAttribute('aria-hidden', 'true');
    expect(img.getAttribute('src')).toContain(`kerchi-${pose}`);
    expect(img).toHaveClass(`mascota--${pose}`);
  });

  it('queda fuera del árbol de accesibilidad', () => {
    render(<Mascota pose="saludando" />);

    expect(screen.queryByRole('img')).not.toBeInTheDocument();
    expect(screen.queryByRole('presentation')).not.toBeInTheDocument();
  });

  it('usa el tamaño mediano por defecto y acepta otro', () => {
    const { container, rerender } = render(<Mascota pose="triste" />);
    expect(container.querySelector('img')).toHaveClass('mascota--mediano');

    rerender(<Mascota pose="triste" size="grande" />);
    expect(container.querySelector('img')).toHaveClass('mascota--grande');
  });
});
