import { Link } from 'react-router-dom';
import logo from '../assets/logo-ker.png';
import KerButton from '../components/KerButton';
import Mascota from '../components/Mascota';
import './Entrada.css';

const BENEFICIOS = [
  { icono: '🎁', titulo: '15% de bienvenida', texto: 'En tu primera compra' },
  { icono: '⭐', titulo: 'Puntos', texto: 'En cada pedido' },
  { icono: '🧾', titulo: 'Tu historial', texto: 'Todas tus compras' },
];

// Primera pantalla de quien no tiene sesión.
function Entrada() {
  return (
    <main className="entrada">
      <div className="entrada__panel">
        <img
          className="entrada__logo"
          src={logo}
          alt="Kiosko El Rápido"
          width={640}
          height={427}
        />
        <p className="entrada__sello">
          <span className="entrada__sello-numero">15%</span>
          <span className="entrada__sello-texto">off en tu 1ª compra</span>
        </p>
        <p className="entrada__globo">
          ¡Hola! Soy Kerchi <span aria-hidden="true">👋</span>
        </p>
        <div className="entrada__kerchi">
          <Mascota pose="saludando" size="grande" />
        </div>
      </div>

      <div className="entrada__contenido">
        <p className="entrada__marca">KIOSKO EL RÁPIDO</p>
        <h1 className="entrada__titulo">Sumate a Kiosko El Rápido</h1>
        <p className="entrada__texto">
          Creá tu cuenta gratis, <strong>sumá puntos</strong> con cada compra y
          obtené un <strong>15% de descuento en tu primera compra</strong>.
        </p>

        <KerButton to="/registro" className="entrada__boton">
          Sumarme y obtener mi 15%&nbsp;<span aria-hidden="true">→</span>
        </KerButton>

        <ul className="entrada__beneficios">
          {BENEFICIOS.map(({ icono, titulo, texto }) => (
            <li key={titulo} className="entrada__beneficio">
              <span className="entrada__icono" aria-hidden="true">
                {icono}
              </span>
              <span className="entrada__beneficio-titulo">{titulo}</span>
              <span className="entrada__beneficio-texto">{texto}</span>
            </li>
          ))}
        </ul>

        <p className="entrada__cliente">
          ¿Ya sos cliente? <Link to="/ingresar">Ingresar</Link>
        </p>
        <p className="entrada__personal">
          ¿Sos parte del equipo? <Link to="/ingresar">Acceso del personal</Link>
        </p>
      </div>
    </main>
  );
}

export default Entrada;
