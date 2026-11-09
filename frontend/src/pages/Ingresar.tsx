import { useState } from 'react';
import type { FormEvent } from 'react';
import { Link } from 'react-router-dom';
import Campo from '../components/Campo';
import KerButton from '../components/KerButton';
import Mascota from '../components/Mascota';
import { useAuth } from '../context/AuthContext';
import { ApiError } from '../services/api';
import { enfocarPrimerError, validarIngreso } from '../utils/validaciones';
import type { CampoIngreso, Errores } from '../utils/validaciones';
import './Acceso.css';

// Clientes y personal entran por acá: el rol de la cuenta decide adónde siguen.
function Ingresar() {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errores, setErrores] = useState<Errores<CampoIngreso>>({});
  const [errorGeneral, setErrorGeneral] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  const enviar = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const encontrados = validarIngreso(email, password);
    setErrores(encontrados);
    setErrorGeneral(null);
    if (Object.keys(encontrados).length > 0) {
      enfocarPrimerError(event.currentTarget, encontrados);
      return;
    }

    setEnviando(true);
    try {
      // Al quedar con sesión, RutaSinSesion lleva a cada uno a su inicio.
      await login(email.trim(), password);
    } catch (error) {
      // El 401 y el 429 traen el motivo en español; sin conexión, también.
      setErrorGeneral(
        error instanceof ApiError &&
          (error.status === 401 ||
            error.status === 429 ||
            error.kind !== 'http')
          ? error.message
          : 'No se pudo ingresar. Intentá de nuevo.',
      );
      setEnviando(false);
    }
  };

  return (
    <main className="acceso">
      <div className="acceso__panel">
        <h1 className="acceso__titulo">¡Qué bueno verte de nuevo!</h1>
        <p className="acceso__texto">
          Ingresá para ver tus puntos y seguir comprando.
        </p>
        <div className="acceso__kerchi">
          <Mascota pose="saludando" size="grande" />
        </div>
      </div>

      <div className="acceso__contenido">
        <div className="acceso__tarjeta">
          <h2>Ingresar</h2>
          <p className="acceso__bajada">Usá el correo de tu cuenta.</p>

          <form onSubmit={enviar} noValidate>
            <Campo
              id="ingreso-correo"
              name="email"
              label="Correo electrónico"
              type="email"
              placeholder="tucorreo@mail.com"
              autoComplete="email"
              value={email}
              onCambio={setEmail}
              error={errores.email}
            />
            <Campo
              id="ingreso-contrasena"
              name="password"
              label="Contraseña"
              type="password"
              autoComplete="current-password"
              value={password}
              onCambio={setPassword}
              error={errores.password}
            />

            {errorGeneral && (
              <p className="acceso__error" role="alert">
                {errorGeneral}
              </p>
            )}

            <KerButton
              type="submit"
              className="acceso__boton"
              disabled={enviando}
            >
              {enviando ? 'Ingresando…' : 'Ingresar'}
            </KerButton>
          </form>

          <p className="acceso__pie">
            ¿Todavía no tenés cuenta? <Link to="/registro">Creala gratis</Link>
          </p>
          <p className="acceso__pie">
            <Link to="/bienvenida">Volver al inicio</Link>
          </p>
        </div>
      </div>
    </main>
  );
}

export default Ingresar;
