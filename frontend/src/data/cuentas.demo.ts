import type { Rol } from '../types';

interface CuentaDemo {
  nombre: string;
  email: string;
  password: string;
  rol: Rol;
}

// SOLO DEMOSTRACIÓN: estas contraseñas viajan en el código que descarga el
// navegador. Cuando exista el login real, este archivo se borra.
export const CUENTAS_DEMO: CuentaDemo[] = [
  {
    nombre: 'Admin',
    email: 'admin@kiosko.com',
    password: 'kerchi123',
    rol: 'admin',
  },
  {
    nombre: 'Cliente',
    email: 'cliente@kiosko.com',
    password: 'kerchi123',
    rol: 'cliente',
  },
];
