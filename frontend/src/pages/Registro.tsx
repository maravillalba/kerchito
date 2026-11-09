import { useState } from 'react';
import type { FormEvent } from 'react';
import { Link } from 'react-router-dom';
import Campo from '../components/Campo';
import KerButton from '../components/KerButton';
import Mascota from '../components/Mascota';
import { useAuth } from '../context/AuthContext';
import { ApiError } from '../services/api';
import { enfocarPrimerError, validarRegistro } from '../utils/validaciones';
import type {
  CampoRegistro,
  Errores,
  ValoresRegistro,
} from '../utils/validaciones';
import './Acceso.css';

const VACIO: ValoresRegistro = {
  first_name: '',
  last_name: '',
  email: '',
  phone: '',
  password: '',
  password2: '',
  terms: false,
};

const PASOS = [
  'Creás tu cuenta',
  'Hacés tu primera compra con 15% off',
  'Sumás puntos en cada pedido',
];

function Registro() {
  const { register } = useAuth();
  const [valores, setValores] = useState(VACIO);
  const [errores, setErrores] = useState<Errores<CampoRegistro>>({});
  const [errorGeneral, setErrorGeneral] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  const cambiar = <C extends CampoRegistro>(
    campo: C,
    valor: ValoresRegistro[C],
  ) => {
    setValores((actuales) => ({ ...actuales, [campo]: valor }));
    setErrores((actuales) => ({ ...actuales, [campo]: undefined }));
  };

  const enviar = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    const encontrados = validarRegistro(valores);
    setErrores(encontrados);
    setErrorGeneral(null);
    if (Object.keys(encontrados).length > 0) {
      enfocarPrimerError(form, encontrados);
      return;
    }

    setEnviando(true);
    try {
      // Al quedar con sesión, RutaSinSesion lleva a la tienda.
      await register({
        first_name: valores.first_name.trim(),
        last_name: valores.last_name.trim(),
        email: valores.email.trim(),
        phone: valores.phone.trim() || null,
        password: valores.password,
      });
    } catch (error) {
      if (error instanceof ApiError && error.status === 409) {
        const conflicto = { email: error.message };
        setErrores(conflicto);
        enfocarPrimerError(form, conflicto);
      } else if (error instanceof ApiError && error.kind !== 'http') {
        setErrorGeneral(error.message);
      } else {
        setErrorGeneral('No se pudo crear la cuenta. Intentá de nuevo.');
      }
      setEnviando(false);
    }
  };

  return (
    <main className="acceso">
      <div className="acceso__panel">
        <p className="acceso__sello">
          <span aria-hidden="true">🎁</span> 15% OFF en tu primera compra
        </p>
        <h1 className="acceso__titulo">
          Creá tu cuenta y empezá a sumar puntos
        </h1>
        <p className="acceso__texto">
          Es gratis y tarda un minuto. Después de registrarte pasás directo a la
          tienda.
        </p>
        <ol className="acceso__pasos">
          {PASOS.map((paso, indice) => (
            <li key={paso} className="acceso__paso">
              <span className="acceso__numero" aria-hidden="true">
                {indice + 1}
              </span>
              {paso}
            </li>
          ))}
        </ol>
        <div className="acceso__kerchi">
          <Mascota pose="aprobado" size="grande" />
        </div>
      </div>

      <div className="acceso__contenido">
        <div className="acceso__tarjeta">
          <h2>Crear cuenta</h2>
          <p className="acceso__bajada">
            Completá tus datos para sumarte como cliente.
          </p>

          <form onSubmit={enviar} noValidate>
            <div className="acceso__fila">
              <Campo
                id="registro-nombre"
                name="first_name"
                label="Nombre"
                placeholder="Mara"
                autoComplete="given-name"
                value={valores.first_name}
                onCambio={(valor) => cambiar('first_name', valor)}
                error={errores.first_name}
              />
              <Campo
                id="registro-apellido"
                name="last_name"
                label="Apellido"
                placeholder="Villalba"
                autoComplete="family-name"
                value={valores.last_name}
                onCambio={(valor) => cambiar('last_name', valor)}
                error={errores.last_name}
              />
            </div>
            <Campo
              id="registro-correo"
              name="email"
              label="Correo electrónico"
              type="email"
              placeholder="tucorreo@mail.com"
              autoComplete="email"
              value={valores.email}
              onCambio={(valor) => cambiar('email', valor)}
              error={errores.email}
            />
            <Campo
              id="registro-telefono"
              name="phone"
              label="Teléfono (opcional)"
              type="tel"
              placeholder="381 000 0000"
              autoComplete="tel"
              value={valores.phone}
              onCambio={(valor) => cambiar('phone', valor)}
            />
            <div className="acceso__fila">
              <Campo
                id="registro-contrasena"
                name="password"
                label="Contraseña"
                type="password"
                autoComplete="new-password"
                value={valores.password}
                onCambio={(valor) => cambiar('password', valor)}
                error={errores.password}
              />
              <Campo
                id="registro-contrasena2"
                name="password2"
                label="Repetir contraseña"
                type="password"
                autoComplete="new-password"
                value={valores.password2}
                onCambio={(valor) => cambiar('password2', valor)}
                error={errores.password2}
              />
            </div>

            <div className="acceso__terminos">
              <label className="acceso__check">
                <input
                  type="checkbox"
                  name="terms"
                  checked={valores.terms}
                  onChange={(event) => cambiar('terms', event.target.checked)}
                  aria-invalid={errores.terms ? true : undefined}
                  aria-describedby={
                    errores.terms ? 'registro-terminos-error' : undefined
                  }
                />
                Acepto que usen mis datos para el programa de puntos
              </label>
              {errores.terms && (
                <p id="registro-terminos-error" className="campo__error">
                  {errores.terms}
                </p>
              )}
            </div>

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
              {enviando ? 'Creando…' : 'Crear mi cuenta'}
            </KerButton>
          </form>

          <p className="acceso__aviso">
            <span className="acceso__icono" aria-hidden="true">
              🎁
            </span>
            <span>
              Tu <strong>15% de descuento</strong> se aplica solo en tu primera
              compra.
            </span>
          </p>
          <p className="acceso__pie">
            ¿Ya tenés cuenta? <Link to="/ingresar">Ingresar</Link>
          </p>
        </div>
      </div>
    </main>
  );
}

export default Registro;
