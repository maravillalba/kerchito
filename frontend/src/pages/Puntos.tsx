import { Link } from 'react-router-dom';
import Mascota from '../components/Mascota';
import { useAuth } from '../context/AuthContext';
import { formatPrice } from '../utils/format';
import {
  DESCUENTO_PRIMERA_COMPRA,
  NIVELES,
  PESOS_POR_BLOQUE,
  PESOS_POR_PUNTO,
  PUNTOS_POR_BLOQUE,
} from '../utils/puntos';
import './Puntos.css';

const PASOS = [
  {
    icono: '🎁',
    titulo: `${DESCUENTO_PRIMERA_COMPRA}% en tu primera compra`,
    texto:
      'Se aplica solo al finalizar el pedido, sobre el subtotal con las ofertas ya aplicadas. Si se anula tu única compra, lo volvés a tener.',
  },
  {
    icono: '⭐',
    titulo: 'Sumás en cada pedido',
    texto: `Ganás 1 punto cada ${formatPrice(PESOS_POR_PUNTO)} del total final, redondeando hacia abajo.`,
  },
  {
    icono: '🛒',
    titulo: 'Canjeás en el carrito',
    texto: `Cada ${PUNTOS_POR_BLOQUE} puntos valen ${formatPrice(PESOS_POR_BLOQUE)} de descuento. Activá "Usar mis puntos" y se canjean todos los que alcancen, sin pasarse del total.`,
  },
  {
    icono: '↩️',
    titulo: 'Si se anula una compra',
    texto:
      'Se descuentan los puntos que te dio y se devuelven los que usaste. Si ya los gastaste, tu saldo puede quedar en negativo hasta que vuelvas a sumar.',
  },
];

function Puntos() {
  const { usuario } = useAuth();
  return (
    <section className="puntos">
      <div className="puntos__encabezado">
        <Mascota pose="aprobado" />
        <div>
          <h1>Cómo funcionan los puntos</h1>
          {usuario?.role === 'customer' && (
            <p className="puntos__saldo">
              Hoy tenés <strong>{usuario.points} puntos</strong>.
            </p>
          )}
        </div>
      </div>

      <ul className="puntos__pasos">
        {PASOS.map(({ icono, titulo, texto }) => (
          <li key={titulo} className="puntos__paso">
            <span className="puntos__icono" aria-hidden="true">
              {icono}
            </span>
            <h2>{titulo}</h2>
            <p>{texto}</p>
          </li>
        ))}
      </ul>

      <h2 className="puntos__subtitulo">Niveles</h2>
      <p>Dependen de tu saldo actual. Por ahora son solo informativos.</p>
      <ul className="puntos__niveles">
        {NIVELES.map(({ nombre, desde }) => (
          <li key={nombre}>
            <strong>{nombre}</strong>:{' '}
            {desde === 0 ? 'hasta llegar a Plata' : `desde ${desde} puntos`}
          </li>
        ))}
      </ul>

      <Link to="/products">Ver productos</Link>
    </section>
  );
}

export default Puntos;
