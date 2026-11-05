const CLAVE = 'kiosko.bienvenida-vista';

// Respaldo si no se puede escribir en sessionStorage: sin esto, "Quiero comprar"
// volvería siempre a /bienvenida y no se podría entrar a la tienda.
let vistaEnMemoria = false;

export function yaVioBienvenida(): boolean {
  if (vistaEnMemoria) {
    return true;
  }
  try {
    return sessionStorage.getItem(CLAVE) === '1';
  } catch {
    return false;
  }
}

export function marcarBienvenidaVista() {
  try {
    sessionStorage.setItem(CLAVE, '1');
  } catch {
    vistaEnMemoria = true;
  }
}
