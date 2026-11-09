import { CATEGORY_LABELS } from './format';

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
    errores.terms =
      'Para crear la cuenta tenés que aceptar el uso de tus datos.';
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

// Los valores del formulario de producto, tal como están en los inputs.
export interface ValoresProducto {
  brand: string;
  name: string;
  unit: string;
  category: string;
  stock: string;
  cost: string;
  price: string;
  offer_price: string;
  description: string;
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

  const stock = aNumero(valores.stock);
  if (!Number.isSafeInteger(stock) || stock < 0) {
    errores.stock = 'El stock debe ser un número entero, 0 o más.';
  }

  const costo = aNumero(valores.cost);
  if (!Number.isFinite(costo) || costo < 0) {
    errores.cost = 'El costo debe ser un número, 0 o más.';
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
  return errores;
}

export const TIPOS_DE_FOTO = ['image/jpeg', 'image/png', 'image/webp'];
export const TAMANO_MAXIMO_FOTO = 2 * 1024 * 1024;

// El backend vuelve a validar, y mirando el contenido real del archivo.
export function validarFoto(file: File): string | null {
  if (!TIPOS_DE_FOTO.includes(file.type)) {
    return 'La foto tiene que ser JPG, PNG o WebP.';
  }
  if (file.size > TAMANO_MAXIMO_FOTO) {
    return 'La foto no puede pesar más de 2 MB.';
  }
  return null;
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
