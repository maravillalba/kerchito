import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { Link } from 'react-router-dom';
import './KerButton.css';

// Basado en un componente de Uiverse.io (doniaskima/old-catfish-59), adaptado a
// la paleta del kiosco: sin mix-blend-mode, con texto blanco y foco visible.

export type KerButtonVariant = 'naranja' | 'verde';
// "chico" solo con la variante verde: blanco sobre el naranja del logo necesita
// texto grande (19px en negrita) para llegar a AA.
export type KerButtonSize = 'normal' | 'chico';

interface LinkProps {
  to: string;
  children: ReactNode;
  variant?: KerButtonVariant;
  size?: KerButtonSize;
  className?: string;
}

interface ButtonProps extends Omit<
  ButtonHTMLAttributes<HTMLButtonElement>,
  'className'
> {
  to?: undefined;
  variant?: KerButtonVariant;
  size?: KerButtonSize;
  className?: string;
}

// Como link si navega (to), como <button> real si no.
type KerButtonProps = LinkProps | ButtonProps;

// El texto va dentro de dos spans para la animación de "sube y vuelve a entrar".
// Se exporta para dar el mismo aspecto a un elemento que no es botón (por
// ejemplo, el "Ver almacén" dentro del link de un banner).
export function KerButtonText({ children }: { children: ReactNode }) {
  return (
    <span className="ker-btn__text-container">
      <span className="ker-btn__text">{children}</span>
    </span>
  );
}

function classes(
  variant: KerButtonVariant,
  size: KerButtonSize,
  extra: string,
) {
  // El tamaño chico solo se aplica en verde (ver KerButtonSize).
  const chico =
    size === 'chico' && variant === 'verde' ? ' ker-btn--chico' : '';
  return `ker-btn ker-btn--${variant}${chico} ${extra}`.trim();
}

function KerButton(props: KerButtonProps) {
  if (props.to !== undefined) {
    const {
      to,
      children,
      variant = 'naranja',
      size = 'normal',
      className = '',
    } = props;
    return (
      <Link to={to} className={classes(variant, size, className)}>
        <KerButtonText>{children}</KerButtonText>
      </Link>
    );
  }

  const {
    children,
    variant = 'naranja',
    size = 'normal',
    className = '',
    type = 'button',
    ...buttonProps
  } = props;
  return (
    <button
      type={type}
      className={classes(variant, size, className)}
      {...buttonProps}
    >
      <KerButtonText>{children}</KerButtonText>
    </button>
  );
}

export default KerButton;
