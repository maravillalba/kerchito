import { createContext, useContext, useState } from 'react';
import type { ReactNode } from 'react';
import { CUENTAS_DEMO } from '../data/cuentas.demo';
import type { Usuario } from '../types';

// Sesión SIMULADA, sin backend: las cuentas salen de data/cuentas.demo.ts y el
// usuario se guarda en localStorage, donde cualquiera puede editarlo.

const CLAVE_SESION = 'kiosko.sesion';

export type ResultadoAuth =
  | { ok: true; usuario: Usuario }
  | { ok: false; error: string };

interface AuthContextValue {
  usuario: Usuario | null;
  login: (email: string, password: string) => ResultadoAuth;
  registrar: (nombre: string, email: string) => ResultadoAuth;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

function esUsuario(valor: unknown): valor is Usuario {
  const usuario = valor as Partial<Usuario> | null;
  return (
    typeof usuario?.nombre === 'string' &&
    typeof usuario.email === 'string' &&
    (usuario.rol === 'admin' || usuario.rol === 'cliente')
  );
}

function leerSesion(): Usuario | null {
  try {
    const guardado: unknown = JSON.parse(
      localStorage.getItem(CLAVE_SESION) ?? 'null',
    );
    return esUsuario(guardado) ? guardado : null;
  } catch {
    return null;
  }
}

function guardarSesion(usuario: Usuario | null) {
  try {
    if (usuario) {
      localStorage.setItem(CLAVE_SESION, JSON.stringify(usuario));
    } else {
      localStorage.removeItem(CLAVE_SESION);
    }
  } catch {
    // Sin acceso al almacenamiento la sesión dura hasta recargar la página.
  }
}

function buscarCuenta(email: string) {
  const buscado = email.trim().toLowerCase();
  return CUENTAS_DEMO.find((cuenta) => cuenta.email === buscado);
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [usuario, setUsuario] = useState<Usuario | null>(leerSesion);

  const iniciar = (nuevo: Usuario): ResultadoAuth => {
    guardarSesion(nuevo);
    setUsuario(nuevo);
    return { ok: true, usuario: nuevo };
  };

  const login = (email: string, password: string): ResultadoAuth => {
    const cuenta = buscarCuenta(email);
    if (!cuenta || cuenta.password !== password) {
      return {
        ok: false,
        error: 'El correo o la contraseña no son correctos.',
      };
    }
    return iniciar({
      nombre: cuenta.nombre,
      email: cuenta.email,
      rol: cuenta.rol,
    });
  };

  // Cualquier correo nuevo queda como cliente. No se guarda ninguna contraseña:
  // la cuenta dura lo que dura la sesión.
  const registrar = (nombre: string, email: string): ResultadoAuth => {
    if (buscarCuenta(email)) {
      return { ok: false, error: 'Ya existe una cuenta con ese correo.' };
    }
    return iniciar({
      nombre: nombre.trim(),
      email: email.trim().toLowerCase(),
      rol: 'cliente',
    });
  };

  const logout = () => {
    guardarSesion(null);
    setUsuario(null);
  };

  return (
    <AuthContext.Provider value={{ usuario, login, registrar, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth debe usarse dentro de un <AuthProvider>');
  }
  return context;
}
