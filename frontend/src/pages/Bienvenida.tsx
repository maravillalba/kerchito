import { Link } from 'react-router-dom';
import logo from '../assets/logo-ker.png';
import Mascota from '../components/Mascota';
import { marcarBienvenidaVista } from '../utils/primeraVisita';
import './Bienvenida.css';

// Pantalla de entrada: se ve una vez por sesión (ver PrimeraVisita).
function Bienvenida() {
  return (
    <main className="bienvenida">
      <div className="bienvenida__panel">
        <img
          className="bienvenida__logo"
          src={logo}
          alt="Kiosko El Rápido"
          width={640}
          height={427}
        />
        <p className="bienvenida__globo">
          ¡Hola! Soy Kerchi <span aria-hidden="true">👋</span>
        </p>
        <div className="bienvenida__kerchi">
          <Mascota pose="saludando" size="grande" />
        </div>
      </div>

      <div className="bienvenida__contenido">
        <p className="bienvenida__marca">KIOSKO EL RÁPIDO</p>
        <h1 className="bienvenida__titulo">
          ¡Bienvenido! ¿Cómo querés seguir?
        </h1>
        <p className="bienvenida__texto">
          Comprá en un minuto, o ingresá para sumar puntos con cada pedido.
        </p>

        <Link
          to="/"
          className="bienvenida__opcion bienvenida__opcion--principal"
          onClick={marcarBienvenidaVista}
        >
          <span
            className="bienvenida__icono bienvenida__icono--verde"
            aria-hidden="true"
          >
            🛒
          </span>
          <span>
            <span className="bienvenida__opcion-titulo">Quiero comprar</span>
            <span className="bienvenida__opcion-texto">
              Sin cuenta, como invitado
            </span>
          </span>
          <span className="bienvenida__flecha" aria-hidden="true">
            →
          </span>
        </Link>

        <Link to="/login" className="bienvenida__opcion">
          <span
            className="bienvenida__icono bienvenida__icono--amarillo"
            aria-hidden="true"
          >
            ⭐
          </span>
          <span>
            <span className="bienvenida__opcion-titulo">
              Iniciar sesión
              <span className="bienvenida__puntos">SUMÁ PUNTOS</span>
            </span>
            <span className="bienvenida__opcion-texto">
              Ingresá o creá tu cuenta gratis
            </span>
          </span>
          <span className="bienvenida__flecha" aria-hidden="true">
            →
          </span>
        </Link>

        <p className="bienvenida__personal">
          ¿Sos parte del equipo? <Link to="/login">Acceso del personal</Link>
        </p>
      </div>
    </main>
  );
}

export default Bienvenida;
