import { useEffect, useId, useRef } from 'react';
import type { ReactNode } from 'react';
import './Modal.css';

const ENFOCABLES =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

interface ModalProps {
  titulo: string;
  onCerrar: () => void;
  children: ReactNode;
}

// Diálogo accesible: el foco entra al abrir, queda atrapado adentro, Escape
// cierra y al cerrar vuelve al botón que lo abrió.
function Modal({ titulo, onCerrar, children }: ModalProps) {
  const dialogo = useRef<HTMLDivElement>(null);
  const tituloId = useId();

  useEffect(() => {
    const anterior = document.activeElement;
    const overflowAnterior = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    dialogo.current?.querySelector<HTMLElement>(ENFOCABLES)?.focus();

    return () => {
      document.body.style.overflow = overflowAnterior;
      if (anterior instanceof HTMLElement) {
        anterior.focus();
      }
    };
  }, []);

  // En document y no en el diálogo: sigue andando si un clic sacó el foco afuera.
  useEffect(() => {
    const alTeclear = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onCerrar();
        return;
      }
      if (e.key !== 'Tab' || !dialogo.current) {
        return;
      }
      const enfocables =
        dialogo.current.querySelectorAll<HTMLElement>(ENFOCABLES);
      const primero = enfocables[0];
      const ultimo = enfocables[enfocables.length - 1];
      const activo = document.activeElement;

      if (!dialogo.current.contains(activo)) {
        e.preventDefault();
        primero.focus();
      } else if (e.shiftKey && activo === primero) {
        e.preventDefault();
        ultimo.focus();
      } else if (!e.shiftKey && activo === ultimo) {
        e.preventDefault();
        primero.focus();
      }
    };

    document.addEventListener('keydown', alTeclear);
    return () => document.removeEventListener('keydown', alTeclear);
  }, [onCerrar]);

  return (
    <div className="modal">
      <div
        ref={dialogo}
        className="modal__dialogo"
        role="dialog"
        aria-modal="true"
        aria-labelledby={tituloId}
      >
        <h2 id={tituloId} className="modal__titulo">
          {titulo}
        </h2>
        {children}
      </div>
    </div>
  );
}

export default Modal;
