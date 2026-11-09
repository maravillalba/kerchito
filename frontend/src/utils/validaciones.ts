// Errores de un formulario: un mensaje por campo que no pasó la validación.
export type Errores<Campo extends string> = Partial<Record<Campo, string>>;

// Mismas reglas que el backend (backend/schemas.py).
export const LARGO_MINIMO_CONTRASENA = 8;
export const LARGO_MAXIMO_CONTRASENA = 128;

const FORMATO_CORREO = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export interface ValoresRegistro {
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  password: string;
  password2: string;
  terms: boolean;
}

export type CampoRegistro = keyof ValoresRegistro;

function errorContrasena(password: string): string | undefined {
  if (password.length < LARGO_MINIMO_CONTRASENA) {
    return `La contraseña debe tener al menos ${LARGO_MINIMO_CONTRASENA} caracteres.`;
  }
  if (password.length > LARGO_MAXIMO_CONTRASENA) {
    return `La contraseña puede tener hasta ${LARGO_MAXIMO_CONTRASENA} caracteres.`;
  }
  return undefined;
}

// Los errores van en el orden de los campos: el primero recibe el foco.
export function validarRegistro(
  valores: ValoresRegistro,
): Errores<CampoRegistro> {
  const errores: Errores<CampoRegistro> = {};
  if (!valores.first_name.trim()) {
    errores.first_name = 'Ingresá tu nombre.';
  }
  if (!valores.last_name.trim()) {
    errores.last_name = 'Ingresá tu apellido.';
  }
  if (!FORMATO_CORREO.test(valores.email.trim())) {
    errores.email = 'Ingresá un correo válido, como nombre@mail.com.';
  }
  const contrasena = errorContrasena(valores.password);
  if (contrasena) {
    errores.password = contrasena;
  }
  if (valores.password2 !== valores.password) {
    errores.password2 = 'Las contraseñas no coinciden.';
  }
  if (!valores.terms) {
    errores.terms = 'Para crear la cuenta tenés que aceptar los términos.';
  }
  return errores;
}

export type CampoIngreso = 'email' | 'password';

export function validarIngreso(
  email: string,
  password: string,
): Errores<CampoIngreso> {
  const errores: Errores<CampoIngreso> = {};
  if (!email.trim()) {
    errores.email = 'Ingresá tu correo.';
  }
  if (!password) {
    errores.password = 'Ingresá tu contraseña.';
  }
  return errores;
}

// Lleva el foco al primer campo con error.
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
