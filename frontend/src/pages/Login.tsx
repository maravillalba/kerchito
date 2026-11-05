import { useState } from 'react';
import type { FormEvent, KeyboardEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Campo from '../components/Campo';
import ErrorMessage from '../components/ErrorMessage';
import KerButton from '../components/KerButton';
import Mascota from '../components/Mascota';
import { useAuth } from '../context/AuthContext';
import { marcarBienvenidaVista } from '../utils/primeraVisita';
import { enfocarPrimerError, validarAcceso } from '../utils/validaciones';
import type { CampoAcceso, Errores } from '../utils/validaciones';
import './Login.css';

type Modo = 'ingresar' | 'crear';

const PESTANAS: { modo: Modo; texto: string }[] = [
  { modo: 'ingresar', texto: 'Ingresar' },
  { modo: 'crear', texto: 'Crear cuenta' },
];

const PASOS = [
  'Hacé tus compras como siempre',
  'Sumás puntos en cada pedido',
  'Los canjeás por descuentos',
];

function Login() {
  const { login, registrar } = useAuth();
  const navigate = useNavigate();
  const [modo, setModo] = useState<Modo>('ingresar');
  const [valores, setValores] = useState({
    nombre: '',
    email: '',
    password: '',
  });
  const [errores, setErrores] = useState<Errores<CampoAcceso>>({});
  const [errorGeneral, setErrorGeneral] = useState<string | null>(null);

  const cambiarModo = (nuevo: Modo) => {
    setModo(nuevo);
    setErrores({});
    setErrorGeneral(null);
  };

  const cambiarCampo = (campo: CampoAcceso, valor: string) => {
    setValores((prev) => ({ ...prev, [campo]: valor }));
    setErrores((prev) => ({ ...prev, [campo]: undefined }));
    setErrorGeneral(null);
  };

  // Pestañas según el patrón de ARIA: con las flechas se pasa a la otra.
  const moverConFlechas = (e: KeyboardEvent<HTMLButtonElement>) => {
    if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') {
      return;
    }
    const otra = modo === 'ingresar' ? 'crear' : 'ingresar';
    cambiarModo(otra);
    document.getElementById(`login-pestana-${otra}`)?.focus();
  };

  const enviar = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const encontrados = validarAcceso(valores, modo === 'crear');
    setErrores(encontrados);
    if (Object.keys(encontrados).length > 0) {
      enfocarPrimerError(e.currentTarget, encontrados);
      return;
    }

    const resultado =
      modo === 'crear'
        ? registrar(valores.nombre, valores.email)
        : login(valores.email, valores.password);
    if (!resultado.ok) {
      setErrorGeneral(resultado.error);
      return;
    }
    navigate(resultado.usuario.rol === 'admin' ? '/admin' : '/');
  };

  return (
    <main className="login">
      <div className="login__panel">
        <div className="login__kerchi">
          <Mascota pose="aprobado" size="grande" />
        </div>
        <h1 className="login__titulo">Cada pedido te suma puntos</h1>
        <p className="login__texto">
          Creá tu cuenta y canjeá tus puntos por descuentos en tu próxima
          compra.
        </p>
        <ol className="login__pasos">
          {PASOS.map((paso) => (
            <li key={paso}>{paso}</li>
          ))}
        </ol>
      </div>

      <div className="login__lado">
        <div className="login__card">
          <div className="login__pestanas" role="tablist" aria-label="Acceso">
            {PESTANAS.map((pestana) => (
              <button
                key={pestana.modo}
                id={`login-pestana-${pestana.modo}`}
                type="button"
                role="tab"
                className="login__pestana"
                aria-selected={modo === pestana.modo}
                aria-controls="login-formulario"
                tabIndex={modo === pestana.modo ? 0 : -1}
                onClick={() => cambiarModo(pestana.modo)}
                onKeyDown={moverConFlechas}
              >
                {pestana.texto}
              </button>
            ))}
          </div>

          <form
            id="login-formulario"
            role="tabpanel"
            aria-labelledby={`login-pestana-${modo}`}
            noValidate
            onSubmit={enviar}
          >
            {modo === 'crear' && (
              <Campo
                id="login-nombre"
                name="nombre"
                label="Nombre"
                autoComplete="name"
                value={valores.nombre}
                onCambio={(valor) => cambiarCampo('nombre', valor)}
                error={errores.nombre}
              />
            )}
            <Campo
              id="login-email"
              name="email"
              label="Correo electrónico"
              type="email"
              autoComplete="email"
              placeholder="tucorreo@mail.com"
              value={valores.email}
              onCambio={(valor) => cambiarCampo('email', valor)}
              error={errores.email}
            />
            <Campo
              id="login-password"
              name="password"
              label="Contraseña"
              type="password"
              autoComplete={
                modo === 'crear' ? 'new-password' : 'current-password'
              }
              placeholder="••••••••"
              value={valores.password}
              onCambio={(valor) => cambiarCampo('password', valor)}
              error={errores.password}
            />

            {errorGeneral && (
              <div className="login__error">
                <ErrorMessage message={errorGeneral} />
              </div>
            )}

            <KerButton type="submit" className="login__enviar">
              {modo === 'crear' ? 'Crear cuenta' : 'Ingresar'}
            </KerButton>
          </form>

          {/* Decorativo por ahora: recuperar la contraseña necesita backend. */}
          <p className="login__nota">
            ¿Olvidaste tu contraseña? <span>Recuperarla</span>
          </p>
          <p className="login__nota login__nota--pegada">
            <Link to="/" onClick={marcarBienvenidaVista}>
              Seguir como invitado
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}

export default Login;
