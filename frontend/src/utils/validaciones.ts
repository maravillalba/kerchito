// Errores de un formulario: un mensaje por campo que no pasó la validación.
export type Errores<Campo extends string> = Partial<Record<Campo, string>>;

export const LARGO_MINIMO_CONTRASENA = 6;

const FORMATO_CORREO = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export type CampoAcceso = 'nombre' | 'email' | 'password';

interface DatosAcceso {
  nombre: string;
  email: string;
  password: string;
}

// El nombre solo se pide al crear la cuenta.
export function validarAcceso(
  { nombre, email, password }: DatosAcceso,
  pedirNombre: boolean,
): Errores<CampoAcceso> {
  const errores: Errores<CampoAcceso> = {};
  if (pedirNombre && !nombre.trim()) {
    errores.nombre = 'Ingresá tu nombre.';
  }
  if (!FORMATO_CORREO.test(email.trim())) {
    errores.email = 'Ingresá un correo válido, como nombre@mail.com.';
  }
  if (password.length < LARGO_MINIMO_CONTRASENA) {
    errores.password = `La contraseña debe tener al menos ${LARGO_MINIMO_CONTRASENA} caracteres.`;
  }
  return errores;
}

// Lleva el foco al primer campo con error (los errores están en orden de campo).
export function enfocarPrimerError(
  form: HTMLFormElement,
  errores: Errores<string>,
) {
  const [primero] = Object.keys(errores);
  const campo = form.elements.namedItem(primero);
  if (campo instanceof HTMLElement) {
    campo.focus();
  }
}
