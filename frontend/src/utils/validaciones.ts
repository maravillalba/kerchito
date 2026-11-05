import { CATEGORY_LABELS } from './format';

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

// Los valores del formulario de producto, tal como están en los inputs.
export interface ValoresProducto {
  brand: string;
  name: string;
  unit: string;
  category: string;
  price: string;
  offer_price: string;
  stock: string;
}

export type CampoProducto = keyof ValoresProducto;

// Number('') da 0: un campo vacío tiene que contar como "no es un número".
function aNumero(texto: string): number {
  return texto.trim() === '' ? NaN : Number(texto);
}

// Mismas reglas que el backend (backend/schemas.py).
export function validarProducto(
  valores: ValoresProducto,
): Errores<CampoProducto> {
  const errores: Errores<CampoProducto> = {};
  if (!valores.brand.trim()) {
    errores.brand = 'Ingresá la marca.';
  }
  if (!valores.name.trim()) {
    errores.name = 'Ingresá el nombre.';
  }
  if (!valores.unit.trim()) {
    errores.unit = 'Ingresá la unidad, como 500 ml.';
  }
  if (!Object.hasOwn(CATEGORY_LABELS, valores.category)) {
    errores.category = 'Elegí una categoría.';
  }

  const precio = aNumero(valores.price);
  const precioValido = Number.isFinite(precio) && precio > 0;
  if (!precioValido) {
    errores.price = 'El precio debe ser mayor a 0.';
  }

  if (valores.offer_price.trim() !== '') {
    const oferta = aNumero(valores.offer_price);
    if (!Number.isFinite(oferta) || oferta <= 0) {
      errores.offer_price = 'El precio de oferta debe ser mayor a 0.';
    } else if (precioValido && oferta >= precio) {
      errores.offer_price = 'El precio de oferta debe ser menor al precio.';
    }
  }

  const stock = aNumero(valores.stock);
  if (!Number.isSafeInteger(stock) || stock < 0) {
    errores.stock = 'El stock debe ser un número entero, 0 o más.';
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
