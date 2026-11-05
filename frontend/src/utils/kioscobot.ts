// Evento para abrir KioscoBot desde cualquier parte de la app (por ejemplo, el
// botón "Abrir chat" del Inicio) sin acoplar ese componente al widget.
export const OPEN_KIOSCOBOT_EVENT = 'kioscobot:open';

export function openKioscoBot(): void {
  window.dispatchEvent(new Event(OPEN_KIOSCOBOT_EVENT));
}
