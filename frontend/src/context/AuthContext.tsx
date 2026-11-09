import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react';
import type { ReactNode } from 'react';
import {
  getMe,
  loginUser,
  logoutUser,
  registerUser,
  setAuthToken,
  setUnauthorizedHandler,
} from '../services/api';
import type { AuthResponse, RegisterData, User } from '../types';

export const CLAVE_SESION = 'kiosko.sesion';

interface Sesion {
  token: string;
  usuario: User;
}

interface AuthContextValue {
  usuario: User | null;
  token: string | null;
  login: (email: string, password: string) => Promise<User>;
  register: (data: RegisterData) => Promise<User>;
  logout: () => void;
  // Trae de nuevo el usuario del backend, por si cambió su saldo.
  refrescarUsuario: () => Promise<void>;
  // Saldo que devolvió una compra. Con una compra activa ya no corresponde el 15%.
  actualizarSaldo: (points: number) => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

function esSesion(valor: unknown): valor is Sesion {
  const sesion = valor as Partial<Sesion> | null;
  return (
    typeof sesion?.token === 'string' &&
    typeof sesion.usuario?.first_name === 'string' &&
    typeof sesion.usuario.points === 'number' &&
    (sesion.usuario.role === 'admin' || sesion.usuario.role === 'customer')
  );
}

function leerSesion(): Sesion | null {
  try {
    const guardado: unknown = JSON.parse(
      localStorage.getItem(CLAVE_SESION) ?? 'null',
    );
    return esSesion(guardado) ? guardado : null;
  } catch {
    return null;
  }
}

function guardarSesion(sesion: Sesion | null) {
  try {
    if (sesion) {
      localStorage.setItem(CLAVE_SESION, JSON.stringify(sesion));
    } else {
      localStorage.removeItem(CLAVE_SESION);
    }
  } catch {
    // Sin acceso al almacenamiento la sesión dura hasta recargar la página.
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [sesion, setSesion] = useState<Sesion | null>(() => {
    const guardada = leerSesion();
    // Acá y no en un efecto: los pedidos que hacen las páginas al montarse ya
    // tienen que salir con el token.
    setAuthToken(guardada?.token ?? null);
    return guardada;
  });

  useEffect(() => {
    guardarSesion(sesion);
  }, [sesion]);

  const cerrarLocal = useCallback(() => {
    setAuthToken(null);
    setSesion(null);
  }, []);

  useEffect(() => {
    setUnauthorizedHandler(cerrarLocal);
    return () => setUnauthorizedHandler(null);
  }, [cerrarLocal]);

  const iniciar = ({ token, user }: AuthResponse) => {
    setAuthToken(token);
    setSesion({ token, usuario: user });
    return user;
  };

  const login = async (email: string, password: string) =>
    iniciar(await loginUser(email, password));

  const register = async (data: RegisterData) =>
    iniciar(await registerUser(data));

  const logout = () => {
    // El pedido sale con el token actual; la sesión se cierra acá aunque falle.
    logoutUser().catch(() => {});
    cerrarLocal();
  };

  const token = sesion?.token ?? null;

  const refrescarUsuario = useCallback(async () => {
    if (!token) {
      return;
    }
    await getMe()
      .then((usuario) =>
        // Si la sesión cambió mientras llegaba la respuesta, no se pisa la nueva.
        setSesion((actual) =>
          actual?.token === token ? { token, usuario } : actual,
        ),
      )
      .catch(() => {
        // Un 401 ya cerró la sesión en api.ts. Sin conexión sigue lo guardado.
      });
  }, [token]);

  // Al abrir la app: el rol y el saldo guardados pueden estar viejos o editados a mano.
  useEffect(() => {
    if (token) {
      getMe()
        .then((usuario) =>
          setSesion((actual) =>
            actual?.token === token ? { token, usuario } : actual,
          ),
        )
        .catch(() => {});
    }
  }, [token]);

  const actualizarSaldo = useCallback((points: number) => {
    setSesion(
      (actual) =>
        actual && {
          ...actual,
          usuario: {
            ...actual.usuario,
            points,
            first_purchase_available: false,
          },
        },
    );
  }, []);

  return (
    <AuthContext.Provider
      value={{
        usuario: sesion?.usuario ?? null,
        token,
        login,
        register,
        logout,
        refrescarUsuario,
        actualizarSaldo,
      }}
    >
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
